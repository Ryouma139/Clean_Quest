-- 管理画面：ユーザー一覧とユーザー削除
--
-- ユーザー（auth.users）を削除すると、外部キーの on delete cascade により次も自動で削除される：
--   auth.users ─┬─ profiles ─┬─ cleaning_tasks
--               │            ├─ cleaning_logs
--               │            ├─ reward_redemptions
--               │            └─ user_badges
--               └─ app_admins
-- Storage の画像ファイル（cleaning-photos/<ユーザーID>/...）は DB の削除では消えないため、
-- アプリ側で Storage API を使って先に削除する（そのための管理者用ポリシーを追加）。

-- ---------------------------------------------------------------------
-- 管理者は全ユーザーの掃除の画像を一覧・削除できる（削除処理用）
-- ---------------------------------------------------------------------
create policy "cleaning photos: admin select" on storage.objects for select to authenticated
  using (bucket_id = 'cleaning-photos' and public.is_admin());
create policy "cleaning photos: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cleaning-photos' and public.is_admin());

-- ---------------------------------------------------------------------
-- ユーザー一覧（管理者のみ）
-- ---------------------------------------------------------------------
create function public.admin_list_users()
returns table (
  user_id         uuid,
  email           text,
  display_name    text,
  avatar          text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  is_admin        boolean,
  log_count       int,
  total_earned    int
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'not admin'; end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    p.avatar,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at is not null,
    exists (select 1 from public.app_admins a where a.user_id = u.id),
    coalesce(l.cnt, 0)::int,
    coalesce(l.pts, 0)::int
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join (
    select c.user_id as uid, count(*) as cnt, sum(c.points) as pts
    from public.cleaning_logs c
    group by c.user_id
  ) l on l.uid = u.id
  order by u.created_at desc;
end $$;

-- ---------------------------------------------------------------------
-- ユーザー削除（管理者のみ。自分自身は削除できない）
--   削除した件数を返す（画面の完了メッセージ用）
-- ---------------------------------------------------------------------
create function public.admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot delete yourself'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'user not found'; end if;

  select jsonb_build_object(
    'tasks',       (select count(*) from public.cleaning_tasks     where user_id = p_user_id),
    'logs',        (select count(*) from public.cleaning_logs      where user_id = p_user_id),
    'redemptions', (select count(*) from public.reward_redemptions where user_id = p_user_id),
    'badges',      (select count(*) from public.user_badges        where user_id = p_user_id)
  ) into v_result;

  -- 関連するレコードは on delete cascade で一緒に削除される
  delete from auth.users where id = p_user_id;

  return v_result;
end $$;

revoke execute on function public.admin_list_users(), public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_list_users(), public.admin_delete_user(uuid) to authenticated;
