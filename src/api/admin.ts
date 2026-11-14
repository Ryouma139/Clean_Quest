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

// ---------- ユーザー ----------
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: Date;
  lastSignInAt: Date | null;
  emailConfirmed: boolean;
  isAdmin: boolean;
  logCount: number;
  totalEarned: number;
}

export interface DeleteUserResult {
  tasks: number;
  logs: number;
  redemptions: number;
  badges: number;
  photos: number;
}

const PHOTO_BUCKET = "cleaning-photos";
const AVATAR_BUCKET = "avatars";

export async function listUsers(): Promise<AdminUser[]> {
  const rows = check(await supabase.rpc("admin_list_users"));
  return rows.map((r) => ({
    id: r.user_id,
    email: r.email,
    name: r.display_name ?? "（プロフィールなし）",
    avatar: r.avatar ?? "👤",
    createdAt: new Date(r.created_at),
    lastSignInAt: r.last_sign_in_at ? new Date(r.last_sign_in_at) : null,
    emailConfirmed: r.email_confirmed,
    isAdmin: r.is_admin,
    logCount: r.log_count,
    totalEarned: r.total_earned,
  }));
}

/** ユーザーの画像フォルダ（<bucket>/<ユーザーID>/）のファイルをすべて削除し、件数を返す */
async function deleteUserFolder(bucket: string, userId: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
    if (error) {
      if (/bucket not found/i.test(error.message)) return deleted; // 画像の SQL 未実行
      throw error;
    }
    const paths = (data ?? []).filter((f) => f.id).map((f) => `${userId}/${f.name}`);
    if (paths.length === 0) return deleted;
    const res = await supabase.storage.from(bucket).remove(paths);
    if (res.error) throw res.error;
    if ((res.data ?? []).length === 0) throw new Error("画像を削除できませんでした（権限を確認してください）");
    deleted += res.data!.length;
  }
}

/**
 * ユーザーを削除する。
 * ① Storage の画像（掃除の画像・アイコン画像）を削除 → ② auth.users を削除（関連レコードは DB の cascade で一緒に削除）
 */
export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  const photos = (await deleteUserFolder(PHOTO_BUCKET, userId)) + (await deleteUserFolder(AVATAR_BUCKET, userId));
  const counts = check(await supabase.rpc("admin_delete_user", { p_user_id: userId }));
  return { ...counts, photos };
}
