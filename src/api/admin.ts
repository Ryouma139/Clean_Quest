/**
 * 管理画面用 API（掃除用品 / 報酬 / ご褒美商品）。
 * 書き込みの権限は DB の RLS（is_admin()）で確認するので、管理者以外が呼んでもエラーになる。
 */
import type { Tables, TablesInsert, TablesUpdate } from "../lib/database.types";
import { supabase } from "../lib/supabase";

export type ToolRow = Tables<"cleaning_tools">;
export type RewardRow = Tables<"rewards">;
export type RewardItemRow = Tables<"reward_items">;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error;
  return res.data as T;
}
function checkOk(res: { error: { message: string } | null }): void {
  if (res.error) throw res.error;
}

// ---------- 掃除用品 ----------
export const listTools = async () =>
  check(await supabase.from("cleaning_tools").select("*").order("sort_order").order("name"));
export const insertTool = async (v: TablesInsert<"cleaning_tools">) => checkOk(await supabase.from("cleaning_tools").insert(v));
export const updateTool = async (id: string, v: TablesUpdate<"cleaning_tools">) =>
  checkOk(await supabase.from("cleaning_tools").update(v).eq("id", id));
export const deleteTool = async (id: string) => checkOk(await supabase.from("cleaning_tools").delete().eq("id", id));

// ---------- 報酬（ポイント枠） ----------
export const listRewards = async () =>
  check(await supabase.from("rewards").select("*").order("points").order("sort_order"));
export const insertReward = async (v: TablesInsert<"rewards">) => checkOk(await supabase.from("rewards").insert(v));
export const updateReward = async (id: string, v: TablesUpdate<"rewards">) =>
  checkOk(await supabase.from("rewards").update(v).eq("id", id));
/** 報酬を削除すると、紐づくご褒美商品も削除される（交換記録は残り、reward_id が空になる） */
export const deleteReward = async (id: string) => checkOk(await supabase.from("rewards").delete().eq("id", id));

// ---------- ご褒美商品 ----------
export const listRewardItems = async () =>
  check(await supabase.from("reward_items").select("*").order("sort_order").order("name"));
export const insertRewardItem = async (v: TablesInsert<"reward_items">) => checkOk(await supabase.from("reward_items").insert(v));
export const updateRewardItem = async (id: string, v: TablesUpdate<"reward_items">) =>
  checkOk(await supabase.from("reward_items").update(v).eq("id", id));
export const deleteRewardItem = async (id: string) => checkOk(await supabase.from("reward_items").delete().eq("id", id));
