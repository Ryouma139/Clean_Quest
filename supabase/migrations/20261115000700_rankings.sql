-- ランキング（月間ポイント / レベル / 総合）
--   他のユーザーの記録は RLS で読めないため、ランキングに必要な項目だけを返す関数を用意する。
--   返すのはニックネーム・アバター・レベル・ポイント・順位のみ（メールアドレスやユーザーIDは返さない）。
--
--   月間ポイント : 今月（日本時間）に獲得したポイント（交換で使っても減らない）
--   レベル       : 累計獲得ポイント ÷ 500 + 1（user_stats と同じ）。順位は累計獲得ポイントで決める
--   総合         : 月間順位 + レベル順位 が小さい順（同点は累計獲得ポイントが多い順）
--   p_limit      : いずれかのランキングで p_limit 位以内の人と、自分だけを返す

create function public.get_rankings(p_limit int default 50)
returns table (
  display_name   text,
  avatar         text,
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
  select display_name, avatar, level, total_earned, monthly_points,
         monthly_rank, level_rank, overall_rank, id = auth.uid() as is_me
  from scored
  where monthly_rank <= p_limit or level_rank <= p_limit or overall_rank <= p_limit or id = auth.uid()
$$;

revoke execute on function public.get_rankings(int) from public, anon;
grant execute on function public.get_rankings(int) to authenticated;
