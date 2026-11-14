-- マイページのプロフィール編集：一言コメント（bio）を追加し、アイコン（avatar）の長さを制限する
--   更新は既存のポリシー「own profile update」（本人の行のみ）で行う

alter table public.profiles
  add column bio text not null default '' check (char_length(bio) <= 60);

-- アイコンは絵文字1つ分（組み合わせ絵文字も入るよう 16 文字まで）
alter table public.profiles
  add constraint profiles_avatar_length check (char_length(avatar) between 1 and 16);

comment on column public.profiles.bio    is '一言コメント（60文字まで）';
comment on column public.profiles.avatar is 'プロフィールアイコン（絵文字）';

-- ---------------------------------------------------------------------
-- ランキングにも一言コメントを返す（戻り値の列が変わるので作り直す）
--   アイコン・ニックネームは profiles を直接読んでいるので、編集するとすぐ反映される
-- ---------------------------------------------------------------------
drop function public.get_rankings(int);

create function public.get_rankings(p_limit int default 50)
returns table (
  display_name   text,
  avatar         text,
  bio            text,
  level          int,
  total_earned   int,
  monthly_points int,
  monthly_rank   int,
  level_rank     int,
  overall_rank   int,
  is_me          boolean
)
language sql stable security definer set search_path = public as $$
  with base as (
    select
      p.id,
      p.display_name,
      p.avatar,
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
  select display_name, avatar, bio, level, total_earned, monthly_points,
         monthly_rank, level_rank, overall_rank, id = auth.uid() as is_me
  from scored
  where monthly_rank <= p_limit or level_rank <= p_limit or overall_rank <= p_limit or id = auth.uid()
$$;

revoke execute on function public.get_rankings(int) from public, anon;
grant execute on function public.get_rankings(int) to authenticated;
