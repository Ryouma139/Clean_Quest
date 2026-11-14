-- 管理画面用：管理者だけが 掃除用品 / 報酬 / ご褒美商品 を追加・編集・削除できるようにする

-- ---------------------------------------------------------------------
-- 管理者
--   アプリからは読み書きできない（ポリシーなし）。登録は SQL Editor で行う：
--   insert into public.app_admins (user_id)
--     select id from auth.users where email = 'あなたのメールアドレス';
-- ---------------------------------------------------------------------
create table public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

-- ログイン中のユーザーが管理者か
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid())
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 新規追加時に ID を自動で振る
-- ---------------------------------------------------------------------
alter table public.cleaning_tools alter column id set default gen_random_uuid()::text;
alter table public.rewards        alter column id set default gen_random_uuid()::text;
alter table public.reward_items   alter column id set default gen_random_uuid()::text;

-- ---------------------------------------------------------------------
-- 管理者用ポリシー（既存の「誰でも読める（有効なもののみ）」に追加される）
--   select: 非表示（is_active = false）のものも見える
-- ---------------------------------------------------------------------
create policy "admin select" on public.cleaning_tools for select to authenticated using (public.is_admin());
create policy "admin insert" on public.cleaning_tools for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.cleaning_tools for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.cleaning_tools for delete to authenticated using (public.is_admin());

create policy "admin select" on public.rewards for select to authenticated using (public.is_admin());
create policy "admin insert" on public.rewards for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.rewards for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.rewards for delete to authenticated using (public.is_admin());

create policy "admin select" on public.reward_items for select to authenticated using (public.is_admin());
create policy "admin insert" on public.reward_items for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.reward_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.reward_items for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 自分を管理者にする（メールアドレスを書き換えてから、この行のコメントを外して実行）
-- ---------------------------------------------------------------------
-- insert into public.app_admins (user_id) select id from auth.users where email = 'you@example.com';
