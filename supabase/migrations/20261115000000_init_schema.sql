-- =====================================================================
-- Clean Quest 初期スキーマ
--   マスタ   : default_tasks / missions / rewards / cleaning_tools / badges / challenges
--   ユーザー : profiles / cleaning_tasks / cleaning_logs / reward_redemptions / user_badges
--   集計ビュー: cleaning_task_status / user_streaks / user_stats
--   RPC      : complete_task / undo_task / complete_mission / redeem_reward
-- 日付の区切りはすべて Asia/Tokyo 基準
-- =====================================================================

create type public.cleaning_area as enum ('キッチン', '水回り', '居室');
create type public.cleaning_frequency as enum ('毎日', '週1回', '週2回', '月1回');

-- ---------------------------------------------------------------------
-- マスタ
-- ---------------------------------------------------------------------

-- 新規ユーザーに配る初期の掃除箇所
create table public.default_tasks (
  template_key text primary key,
  name         text not null,
  area         public.cleaning_area not null,
  freq         public.cleaning_frequency not null,
  points       int  not null check (points > 0),
  emoji        text not null default '🧹',
  sort_order   int  not null default 0
);

-- ホームのランダムクエスト
create table public.missions (
  id                text primary key,
  name              text not null,
  area              public.cleaning_area not null,
  comment           text not null,
  time_label        text not null,               -- 例: '3〜5分'
  points            int  not null check (points > 0),
  emoji             text not null,
  image_url         text,
  steps             text[] not null default '{}', -- チェックリスト
  task_template_key text references public.default_tasks (template_key) on delete set null,
  sort_order        int  not null default 0,
  is_active         boolean not null default true
);

-- 報酬ショップ
create table public.rewards (
  id          text primary key,
  name        text not null,
  description text not null,
  points      int  not null check (points > 0),
  emoji       text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

-- 掃除用品
create table public.cleaning_tools (
  id          text primary key,
  name        text not null,
  description text not null,
  emoji       text not null,
  category    text not null,
  product_url text,                                -- 将来の購入リンク
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

-- 実績バッジ
create table public.badges (
  id          text primary key,
  emoji       text not null,
  label       text not null,
  description text,
  sort_order  int  not null default 0
);

-- 今週のチャレンジ（kind = 'streak' なら target 日連続）
create table public.challenges (
  id         text primary key,
  title      text not null,
  kind       text not null check (kind in ('streak')),
  target     int  not null check (target > 0),
  bonus      int  not null check (bonus >= 0),
  is_active  boolean not null default true
);

-- ---------------------------------------------------------------------
-- ユーザーデータ
-- ---------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'そうじねこ' check (char_length(display_name) between 1 and 30),
  avatar       text not null default '🐱',
  created_at   timestamptz not null default now()
);

-- 掃除管理の掃除箇所（ユーザーごと）
create table public.cleaning_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  template_key text references public.default_tasks (template_key) on delete set null,
  name         text not null check (char_length(name) between 1 and 50),
  area         public.cleaning_area not null,
  freq         public.cleaning_frequency not null,
  points       int  not null check (points between 1 and 1000),
  emoji        text not null default '🧹',
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  archived_at  timestamptz                         -- 論理削除
);
create index cleaning_tasks_user_idx on public.cleaning_tasks (user_id) where archived_at is null;

-- 掃除履歴（ポイント獲得の記録）。書き込みは RPC 経由のみ
create table public.cleaning_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  task_id      uuid references public.cleaning_tasks (id) on delete set null,
  mission_id   text references public.missions (id) on delete set null,
  name         text not null,                      -- 記録時点の名前を保持
  points       int  not null check (points > 0),
  completed_at timestamptz not null default now()
);
create index cleaning_logs_user_time_idx on public.cleaning_logs (user_id, completed_at desc);
create index cleaning_logs_task_time_idx on public.cleaning_logs (task_id, completed_at desc);

-- 報酬の交換記録。書き込みは RPC 経由のみ
create table public.reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  reward_id   text references public.rewards (id) on delete set null,
  reward_name text not null,
  points      int  not null check (points > 0),
  redeemed_at timestamptz not null default now()
);
create index reward_redemptions_user_idx on public.reward_redemptions (user_id);

create table public.user_badges (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  badge_id  text not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------------------------------------------------------------------
-- 集計ビュー（RLS を効かせるため security_invoker）
-- ---------------------------------------------------------------------

-- 掃除箇所 + 最終実施日時 + 今日やったか
create view public.cleaning_task_status with (security_invoker = true) as
select
  t.id, t.user_id, t.template_key, t.name, t.area, t.freq, t.points, t.emoji, t.sort_order, t.created_at,
  last.completed_at as last_done_at,
  coalesce((last.completed_at at time zone 'Asia/Tokyo')::date = (now() at time zone 'Asia/Tokyo')::date, false) as done_today
from public.cleaning_tasks t
left join lateral (
  select l.completed_at from public.cleaning_logs l
  where l.task_id = t.id
  order by l.completed_at desc
  limit 1
) last on true
where t.archived_at is null;

-- 連続達成日数（今日 or 昨日まで続いている連続記録）
create view public.user_streaks with (security_invoker = true) as
with d as (
  select distinct user_id, (completed_at at time zone 'Asia/Tokyo')::date as day
  from public.cleaning_logs
), g as (
  select user_id, day, day - (row_number() over (partition by user_id order by day))::int as grp
  from d
), runs as (
  select user_id, max(day) as last_day, count(*)::int as len
  from g group by user_id, grp
)
select user_id,
       coalesce(max(len) filter (where last_day >= (now() at time zone 'Asia/Tokyo')::date - 1), 0) as streak_days
from runs
group by user_id;

-- ホーム / 履歴 / マイページの数字
--   レベルは暫定で「累計獲得 500pt ごとに +1」
create view public.user_stats with (security_invoker = true) as
select
  p.id as user_id,
  coalesce(l.total_earned, 0)                                   as total_earned,
  coalesce(l.total_count, 0)                                    as total_count,
  coalesce(l.weekly_count, 0)                                   as weekly_count,
  coalesce(l.total_earned, 0) - coalesce(r.total_spent, 0)      as points_balance,
  coalesce(s.streak_days, 0)                                    as streak_days,
  coalesce(l.total_earned, 0) / 500 + 1                         as level,
  500 - coalesce(l.total_earned, 0) % 500                       as points_to_next_level
from public.profiles p
left join (
  select user_id,
         sum(points)::int as total_earned,
         count(*)::int    as total_count,
         (count(*) filter (
           where completed_at >= date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
         ))::int          as weekly_count
  from public.cleaning_logs group by user_id
) l on l.user_id = p.id
left join (
  select user_id, sum(points)::int as total_spent from public.reward_redemptions group by user_id
) r on r.user_id = p.id
left join public.user_streaks s on s.user_id = p.id;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.default_tasks      enable row level security;
alter table public.missions           enable row level security;
alter table public.rewards            enable row level security;
alter table public.cleaning_tools     enable row level security;
alter table public.badges             enable row level security;
alter table public.challenges         enable row level security;
alter table public.profiles           enable row level security;
alter table public.cleaning_tasks     enable row level security;
alter table public.cleaning_logs      enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.user_badges        enable row level security;

-- マスタ: 誰でも読み取りのみ
create policy "read master" on public.default_tasks  for select to anon, authenticated using (true);
create policy "read master" on public.missions       for select to anon, authenticated using (is_active);
create policy "read master" on public.rewards        for select to anon, authenticated using (is_active);
create policy "read master" on public.cleaning_tools for select to anon, authenticated using (is_active);
create policy "read master" on public.badges         for select to anon, authenticated using (true);
create policy "read master" on public.challenges     for select to anon, authenticated using (is_active);

-- プロフィール: 自分の行のみ閲覧・更新
create policy "own profile select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 掃除箇所: 自分の行のみ CRUD
create policy "own tasks select" on public.cleaning_tasks for select to authenticated using (user_id = auth.uid());
create policy "own tasks insert" on public.cleaning_tasks for insert to authenticated with check (user_id = auth.uid());
create policy "own tasks update" on public.cleaning_tasks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks delete" on public.cleaning_tasks for delete to authenticated using (user_id = auth.uid());

-- ポイントに関わる表は閲覧のみ（書き込みは RPC）
create policy "own logs select"        on public.cleaning_logs      for select to authenticated using (user_id = auth.uid());
create policy "own redemptions select" on public.reward_redemptions for select to authenticated using (user_id = auth.uid());
create policy "own badges select"      on public.user_badges        for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- サインアップ時: プロフィール作成 + 初期掃除箇所をコピー
-- ---------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.cleaning_tasks (user_id, template_key, name, area, freq, points, emoji, sort_order)
    select new.id, template_key, name, area, freq, points, emoji, sort_order from public.default_tasks;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- RPC（ポイント操作はすべてサーバー側で検証する）
-- ---------------------------------------------------------------------

create function public.tokyo_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Tokyo')::date $$;

-- 掃除管理の「完了」
create function public.complete_task(p_task_id uuid) returns public.cleaning_logs
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_task public.cleaning_tasks;
  v_log  public.cleaning_logs;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_task from cleaning_tasks
   where id = p_task_id and user_id = v_uid and archived_at is null
   for update;
  if not found then raise exception 'task not found'; end if;

  if exists (select 1 from cleaning_logs
              where task_id = p_task_id and (completed_at at time zone 'Asia/Tokyo')::date = tokyo_today()) then
    raise exception 'already completed today';
  end if;

  insert into cleaning_logs (user_id, task_id, name, points)
  values (v_uid, v_task.id, v_task.name, v_task.points)
  returning * into v_log;
  return v_log;
end $$;

-- 掃除管理の「戻す」: 今日の最新記録を取り消す
create function public.undo_task(p_task_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from cleaning_logs
   where id = (
     select id from cleaning_logs
      where task_id = p_task_id and user_id = auth.uid()
        and (completed_at at time zone 'Asia/Tokyo')::date = tokyo_today()
      order by completed_at desc
      limit 1
   );
end $$;

-- ホームのミッション完了（同じミッションは 1 日 1 回）
create function public.complete_mission(p_mission_id text) returns public.cleaning_logs
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_mission public.missions;
  v_task_id uuid;
  v_log     public.cleaning_logs;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_mission from missions where id = p_mission_id and is_active;
  if not found then raise exception 'mission not found'; end if;

  if exists (select 1 from cleaning_logs
              where user_id = v_uid and mission_id = p_mission_id
                and (completed_at at time zone 'Asia/Tokyo')::date = tokyo_today()) then
    raise exception 'mission already completed today';
  end if;

  select id into v_task_id from cleaning_tasks
   where user_id = v_uid and template_key = v_mission.task_template_key and archived_at is null
   limit 1;

  insert into cleaning_logs (user_id, task_id, mission_id, name, points)
  values (v_uid, v_task_id, v_mission.id, replace(replace(v_mission.name, '！', ''), '!', ''), v_mission.points)
  returning * into v_log;
  return v_log;
end $$;

-- 報酬ショップの交換（残高チェックを排他で行う）
create function public.redeem_reward(p_reward_id text) returns public.reward_redemptions
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_reward  public.rewards;
  v_balance int;
  v_row     public.reward_redemptions;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_reward from rewards where id = p_reward_id and is_active;
  if not found then raise exception 'reward not found'; end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  select points_balance into v_balance from user_stats where user_id = v_uid;
  if coalesce(v_balance, 0) < v_reward.points then raise exception 'insufficient points'; end if;

  insert into reward_redemptions (user_id, reward_id, reward_name, points)
  values (v_uid, v_reward.id, v_reward.name, v_reward.points)
  returning * into v_row;
  return v_row;
end $$;

revoke execute on function public.complete_task(uuid), public.undo_task(uuid),
                           public.complete_mission(text), public.redeem_reward(text)
  from public, anon;
grant execute on function public.complete_task(uuid), public.undo_task(uuid),
                          public.complete_mission(text), public.redeem_reward(text)
  to authenticated;
