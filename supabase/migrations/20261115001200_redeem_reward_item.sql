-- 報酬ショップの交換の流れを変更する
--   変更前：報酬ショップで「交換する」→ その場でポイント消費 → 商品一覧
--   変更後：報酬ショップで「交換する」→ 商品一覧を表示（ポイントは消費しない）
--           → 商品ごとの「使用する」でポイントを消費（報酬に設定されたポイント）
--   交換記録には、どの商品に使ったかも残す

alter table public.reward_redemptions
  add column reward_item_id text references public.reward_items (id) on delete set null,
  add column item_name      text;

comment on column public.reward_redemptions.reward_item_id is '使用したご褒美商品（商品が削除されると空になる）';
comment on column public.reward_redemptions.item_name      is '使用したご褒美商品の名前（記録時点）';

-- ご褒美商品を「使用する」：報酬に設定されたポイントを消費して記録する
create function public.redeem_reward_item(p_item_id text) returns public.reward_redemptions
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_item    public.reward_items;
  v_reward  public.rewards;
  v_balance int;
  v_row     public.reward_redemptions;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_item from reward_items where id = p_item_id and is_active;
  if not found then raise exception 'reward item not found'; end if;

  select * into v_reward from rewards where id = v_item.reward_id and is_active;
  if not found then raise exception 'reward not found'; end if;

  -- 同じユーザーの交換を1件ずつ処理し、残高を超えて使えないようにする
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  select points_balance into v_balance from user_stats where user_id = v_uid;
  if coalesce(v_balance, 0) < v_reward.points then raise exception 'insufficient points'; end if;

  insert into reward_redemptions (user_id, reward_id, reward_name, points, reward_item_id, item_name)
  values (v_uid, v_reward.id, v_reward.name, v_reward.points, v_item.id, v_item.name)
  returning * into v_row;
  return v_row;
end $$;

revoke execute on function public.redeem_reward_item(text) from public, anon;
grant execute on function public.redeem_reward_item(text) to authenticated;
