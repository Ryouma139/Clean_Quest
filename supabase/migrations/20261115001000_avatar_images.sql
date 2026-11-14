-- プロフィールアイコンに自分の画像を使えるようにする
--   保存先 : Storage の公開バケット avatars、パスは「<ユーザーID>/<ファイル名>」
--            （ランキングで他のユーザーにも表示するため公開。ファイル名はランダム）
--   記録   : profiles.avatar_image_path（空ならキャラクター＝絵文字を表示）

-- ---------------------------------------------------------------------
-- Storage バケット（公開・2MBまで・JPEG/PNG/WebP のみ）
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 自分のフォルダの中だけ、追加・更新・削除・一覧できる（表示は公開URLで誰でも可）
create policy "avatars: select own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 管理者はユーザー削除のために全員のアイコン画像を一覧・削除できる
create policy "avatars: admin select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_admin());
create policy "avatars: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.is_admin());

-- ---------------------------------------------------------------------
-- profiles にアイコン画像のパスを追加
-- ---------------------------------------------------------------------
alter table public.profiles add column avatar_image_path text;
comment on column public.profiles.avatar_image_path is 'アイコン画像（Storage: avatars 内のパス）。空なら avatar（絵文字）を表示';

-- 自分のフォルダの画像しか設定できないようにする
create function public.check_avatar_image_path() returns trigger
language plpgsql as $$
begin
  if new.avatar_image_path is not null and new.avatar_image_path not like new.id::text || '/%' then
    raise exception 'invalid avatar path';
  end if;
  return new;
end $$;

create trigger profiles_check_avatar_image_path
  before insert or update of avatar_image_path on public.profiles
  for each row execute function public.check_avatar_image_path();

-- ---------------------------------------------------------------------
-- ランキングにもアイコン画像を返す（戻り値の列が変わるので作り直す）
-- ---------------------------------------------------------------------
drop function public.get_rankings(int);

create function public.get_rankings(p_limit int default 50)
returns table (
  display_name      text,
  avatar            text,
  avatar_image_path text,
  bio               text,
  level             int,
  total_earned      int,
  monthly_points    int,
  monthly_rank      int,
  level_rank        int,
  overall_rank      int,
  is_me             boolean
)
language sql stable security definer set search_path = public as $$
  with base as (
    select
      p.id,
      p.display_name,
      p.avatar,
      p.avatar_image_path,
      p.bio,
      coalesce(sum(l.points), 0)::int as total_earned,
      coalesce(sum(l.points) filter (
        where l.completed_at >= date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
      ), 0)::int as monthly_points
    from profiles p
    left join cleaning_logs l on l.user_id = p.id
    group by p.id
  ), ranked as (
    select *,
      (total_earned / 500 + 1)::int                          as level,
      rank() over (order by monthly_points desc)::int        as monthly_rank,
      rank() over (order by total_earned desc)::int          as level_rank
    from base
  ), scored as (
    select *,
      rank() over (order by monthly_rank + level_rank, total_earned desc)::int as overall_rank
    from ranked
  )
  select display_name, avatar, avatar_image_path, bio, level, total_earned, monthly_points,
         monthly_rank, level_rank, overall_rank, id = auth.uid() as is_me
  from scored
  where monthly_rank <= p_limit or level_rank <= p_limit or overall_rank <= p_limit or id = auth.uid()
$$;

revoke execute on function public.get_rankings(int) from public, anon;
grant execute on function public.get_rankings(int) to authenticated;
