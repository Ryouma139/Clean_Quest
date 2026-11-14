import type { Tables, Views } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import type { CleaningTask, MasterData, Mission, NewTaskInput, UserData, UserStats } from "../types";

/** 画面に出す履歴の件数 */
const HISTORY_LIMIT = 50;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error;
  if (res.data === null) throw new Error("データが見つかりません");
  return res.data;
}

function checkOk(res: { error: { message: string } | null }): void {
  if (res.error) throw res.error;
}

// ---------- 変換（DB の行 → 画面の型） ----------

const toMission = (r: Tables<"missions">): Mission => ({
  id: r.id, name: r.name, area: r.area, comment: r.comment, time: r.time_label,
  points: r.points, emoji: r.emoji, image: r.image_url, steps: r.steps,
});

const toTask = (r: Views<"cleaning_task_status">): CleaningTask => ({
  id: r.id, name: r.name, area: r.area, freq: r.freq, points: r.points, emoji: r.emoji,
  done: r.done_today, lastDoneAt: r.last_done_at ? new Date(r.last_done_at) : null,
});

const toStats = (r: Views<"user_stats"> | null): UserStats => ({
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
  const [missions, rewards, tools, badges, challenges] = await Promise.all([
    supabase.from("missions").select("*").order("sort_order"),
    supabase.from("rewards").select("*").order("sort_order"),
    supabase.from("cleaning_tools").select("*").order("sort_order"),
    supabase.from("badges").select("*").order("sort_order"),
    supabase.from("challenges").select("*").limit(1),
  ]);
  const c = check(challenges)[0];
  return {
    missions: check(missions).map(toMission),
    rewards: check(rewards).map((r) => ({ id: r.id, name: r.name, desc: r.description, points: r.points, emoji: r.emoji })),
    tools: check(tools).map((t) => ({ id: t.id, name: t.name, desc: t.description, emoji: t.emoji, category: t.category, productUrl: t.product_url })),
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
  return {
    profile: { name: p.display_name, avatar: p.avatar },
    tasks: check(tasks).map(toTask),
    history: check(logs).map((l) => ({ id: l.id, name: l.name, points: l.points, completedAt: new Date(l.completed_at) })),
    stats: toStats(stats.data),
    earnedBadgeIds: new Set(check(badges).map((b) => b.badge_id)),
  };
}

// ---------- 書き込み（ポイントが動くものは RPC） ----------

export const completeTask = async (taskId: string) => checkOk(await supabase.rpc("complete_task", { p_task_id: taskId }));
export const undoTask = async (taskId: string) => checkOk(await supabase.rpc("undo_task", { p_task_id: taskId }));
export const completeMission = async (missionId: string) => checkOk(await supabase.rpc("complete_mission", { p_mission_id: missionId }));
export const redeemReward = async (rewardId: string) => checkOk(await supabase.rpc("redeem_reward", { p_reward_id: rewardId }));
export const addTask = async (input: NewTaskInput) => checkOk(await supabase.from("cleaning_tasks").insert(input));
