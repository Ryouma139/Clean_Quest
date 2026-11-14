-- ランキングに「交換ポイント総額」を追加する
--   交換ポイント総額 : 報酬ショップでこれまでに交換に使ったポイントの合計（reward_redemptions.points の合計）
--   総合ランキングの計算には含めない（総合は今までどおり 月間順位 + レベル順位）
--   戻り値の列が変わるので get_rankings を作り直す

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
  spent_points      int,
  monthly_rank      int,
  level_rank        int,
  overall_rank      int,
  spent_rank        int,
  is_me             boolean
)
language sql stable security definer set search_path = public as $$
  with earned as (
    select
      l.user_id,
      sum(l.points)::int as total_earned,
      (sum(l.points) filter (
        where l.completed_at >= date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
      ))::int as monthly_points
    from cleaning_logs l
    group by l.user_id
  ), spent as (
    select r.user_id, sum(r.points)::int as spent_points
    from reward_redemptions r
    group by r.user_id
  ), base as (
    select
      p.id,
      p.display_name,
      p.avatar,
      p.avatar_image_path,
      p.bio,
      coalesce(e.total_earned, 0)   as total_earned,
      coalesce(e.monthly_points, 0) as monthly_points,
      coalesce(s.spent_points, 0)   as spent_points
    from profiles p
    left join earned e on e.user_id = p.id
    left join spent  s on s.user_id = p.id
  ), ranked as (
    select *,
      (total_earned / 500 + 1)::int                     as level,
      rank() over (order by monthly_points desc)::int   as monthly_rank,
      rank() over (order by total_earned desc)::int     as level_rank,
      rank() over (order by spent_points desc)::int     as spent_rank
    from base
  ), scored as (
    select *,
      rank() over (order by monthly_rank + level_rank, total_earned desc)::int as overall_rank
    from ranked
  )
  select display_name, avatar, avatar_image_path, bio, level, total_earned, monthly_points, spent_points,
         monthly_rank, level_rank, overall_rank, spent_rank, id = auth.uid() as is_me
  from scored
  where monthly_rank <= p_limit or level_rank <= p_limit or overall_rank <= p_limit or spent_rank <= p_limit
     or id = auth.uid()
$$;

revoke execute on function public.get_rankings(int) from public, anon;
grant execute on function public.get_rankings(int) to authenticated;
