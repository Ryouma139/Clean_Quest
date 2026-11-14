import type { Tables, Views } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import type { CleaningTask, HistoryEntry, MasterData, Mission, MissionPhotos, NewTaskInput, ProfileInput, RankingEntry, UserData, UserStats } from "../types";

/** 画面に出す履歴の件数 */
const HISTORY_LIMIT = 50;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error;
  if (res.data === null) throw new Error("データが見つかりません");
  return res.data;
}

/** テーブルが存在しないエラーか（PostgREST: PGRST205 / Postgres: 42P01） */
const isMissingTable = (e: { code?: string } | null): boolean => !!e && (e.code === "PGRST205" || e.code === "42P01");

function checkOk(res: { error: { message: string } | null }): void {
  if (res.error) throw res.error;
}

// ---------- 変換（DB の行 → 画面の型） ----------

/** https のURLだけを通す（DB でも制約済みだが、画面側でも念のため確認） */
const httpsOnly = (url: string | null): string | null => (url && /^https:\/\//i.test(url.trim()) ? url.trim() : null);

const toMission = (r: Tables<"missions">): Mission => ({
  id: r.id, name: r.name, area: r.area, comment: r.comment, time: r.time_label,
  points: r.points, emoji: r.emoji, image: r.image_url, steps: r.steps,
});

const toTask = (r: Views<"cleaning_task_status">): CleaningTask => ({
  id: r.id, name: r.name, area: r.area, freq: r.freq, points: r.points, emoji: r.emoji,
  done: r.done_today, lastDoneAt: r.last_done_at ? new Date(r.last_done_at) : null,
});

const toHistory = (l: Tables<"cleaning_logs">): HistoryEntry => ({
  id: l.id, name: l.name, points: l.points, completedAt: new Date(l.completed_at),
  taskId: l.task_id, missionId: l.mission_id,
  // 写真の SQL が未実行なら列が無いので null 扱い
  beforePhotoPath: l.before_photo_path ?? null, afterPhotoPath: l.after_photo_path ?? null,
});

const toStats =(r: Views<"user_stats"> | null): UserStats => ({
  pointsBalance: r?.points_balance ?? 0,
  totalEarned: r?.total_earned ?? 0,
  totalCount: r?.total_count ?? 0,
  weeklyCount: r?.weekly_count ?? 0,
  streakDays: r?.streak_days ?? 0,
  level: r?.level ?? 1,
  pointsToNextLevel: r?.points_to_next_level ?? 500,
});

// ---------- 読み込み ----------

export async function fetchMasterData(): Promise<MasterData> {
  const [missions, rewards, rewardItems, tools, badges, challenges] = await Promise.all([
    supabase.from("missions").select("*").order("sort_order"),
    supabase.from("rewards").select("*").order("points").order("sort_order"),
    supabase.from("reward_items").select("*").order("sort_order"),
    supabase.from("cleaning_tools").select("*").order("sort_order"),
    supabase.from("badges").select("*").order("sort_order"),
    supabase.from("challenges").select("*").limit(1),
  ]);
  const c = check(challenges)[0];
  return {
    missions: check(missions).map(toMission),
    rewards: check(rewards).map((r) => ({ id: r.id, name: r.name, desc: r.description, points: r.points, emoji: r.emoji })),
    // reward_items の SQL が未実行でもアプリが動くよう、テーブルが無い場合は空にする
    rewardItems: (isMissingTable(rewardItems.error) ? [] : check(rewardItems)).map((i) => ({
      id: i.id, rewardId: i.reward_id, name: i.name, desc: i.description, emoji: i.emoji,
      imageUrl: httpsOnly(i.image_url), affiliateUrl: httpsOnly(i.affiliate_url),
    })),
    tools: check(tools).map((t) => ({
      id: t.id, name: t.name, desc: t.description, emoji: t.emoji, category: t.category,
      imageUrl: httpsOnly(t.image_url), affiliateUrl: httpsOnly(t.affiliate_url),
    })),
    badges: check(badges).map((b) => ({ id: b.id, emoji: b.emoji, label: b.label })),
    challenge: c ? { id: c.id, title: c.title, target: c.target, bonus: c.bonus } : null,
  };
}

export async function fetchUserData(userId: string): Promise<UserData> {
  const [profile, tasks, logs, stats, badges] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("cleaning_task_status").select("*").order("sort_order").order("created_at"),
    supabase.from("cleaning_logs").select("*").order("completed_at", { ascending: false }).limit(HISTORY_LIMIT),
    supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_badges").select("*"),
  ]);
  if (stats.error) throw stats.error;
  const p = check(profile);
  // is_admin() の SQL が未実行（関数が無い）なら管理者ではない扱い
  const admin = await supabase.rpc("is_admin");
  if (admin.error && admin.error.code !== "PGRST202") throw admin.error;
  return {
    // bio は SQL 0900 未実行なら列が無いので空文字
    profile: { name: p.display_name, avatar: p.avatar, bio: p.bio ?? "" },
    isAdmin: admin.data === true,
    tasks: check(tasks).map(toTask),
    history: check(logs).map(toHistory),
    stats: toStats(stats.data),
    earnedBadgeIds: new Set(check(badges).map((b) => b.badge_id)),
  };
}

/** 期間内（from 以上 to 未満）の掃除記録を古い順に取得する（カレンダー用） */
export async function fetchLogsInRange(from: Date, to: Date): Promise<HistoryEntry[]> {
  const res = await supabase
    .from("cleaning_logs")
    .select("*")
    .gte("completed_at", from.toISOString())
    .lt("completed_at", to.toISOString())
    .order("completed_at");
  return check(res).map(toHistory);
}

// ---------- 書き込み（ポイントが動くものは RPC） ----------

export const completeTask = async (taskId: string) => checkOk(await supabase.rpc("complete_task", { p_task_id: taskId }));
export const undoTask = async (taskId: string) => checkOk(await supabase.rpc("undo_task", { p_task_id: taskId }));
export const completeMission = async (missionId: string, photos?: MissionPhotos) =>
  checkOk(
    await supabase.rpc("complete_mission", {
      p_mission_id: missionId,
      // 写真が無いときは引数ごと省略する（写真の SQL 未実行の環境でも動くように）
      ...(photos?.before ? { p_before_photo_path: photos.before } : {}),
      ...(photos?.after ? { p_after_photo_path: photos.after } : {}),
    }),
  );

// ---------- 掃除の写真（Storage） ----------

const PHOTO_BUCKET = "cleaning-photos";

/** 写真をアップロードして、保存先のパス（<ユーザーID>/<ファイル名>）を返す */
export async function uploadPhoto(userId: string, image: Blob, kind: "before" | "after"): Promise<string> {
  const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${new Date().toISOString().slice(0, 10)}-${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, image, { contentType: image.type, upsert: false });
  if (error) throw error;
  return path;
}

/** 写真を削除する（ミッションを中断したときなど）。失敗しても画面は止めない */
export async function deletePhotos(paths: string[]): Promise<void> {
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
}

/** 非公開の写真を表示するための、期限付きURL（1時間）を作る */
export async function getPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!paths.length) return map;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  for (const d of data ?? []) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  return map;
}
export const redeemReward = async (rewardId: string) => checkOk(await supabase.rpc("redeem_reward", { p_reward_id: rewardId }));
/** プロフィール（ニックネーム・アイコン・一言コメント）を更新する */
export const updateProfile = async (userId: string, input: ProfileInput) =>
  checkOk(
    await supabase
      .from("profiles")
      .update({ display_name: input.name, avatar: input.avatar, bio: input.bio })
      .eq("id", userId),
  );
export const addTask = async (input: NewTaskInput) => checkOk(await supabase.from("cleaning_tasks").insert(input));

// ---------- ランキング ----------

/** ランキングの SQL が未実行（関数が無い）ときのエラー */
export class RankingUnavailableError extends Error {}

/** ランキングを取得する（いずれかで上位 limit 位以内の人と、自分） */
export async function fetchRankings(limit = 50): Promise<RankingEntry[]> {
  const { data, error } = await supabase.rpc("get_rankings", { p_limit: limit });
  if (error) {
    if (error.code === "PGRST202") throw new RankingUnavailableError("ranking function not found");
    throw error;
  }
  return (data ?? []).map((r) => ({
    name: r.display_name,
    avatar: r.avatar,
    bio: r.bio ?? "",
    level: r.level,
    totalEarned: r.total_earned,
    monthlyPoints: r.monthly_points,
    monthlyRank: r.monthly_rank,
    levelRank: r.level_rank,
    overallRank: r.overall_rank,
    isMe: r.is_me,
  }));
}
