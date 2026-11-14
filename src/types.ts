/** 画面ID（サイドバー / モバイルナビの遷移先） */
export type PageId = "home" | "cleaning" | "history" | "rewards" | "tools" | "profile";

/** 掃除カテゴリー（DB enum cleaning_area） */
export const AREAS = ["キッチン", "水回り", "居室"] as const;
export type Area = (typeof AREAS)[number];
export type AreaFilter = Area | "すべて";

/** 掃除頻度（DB enum cleaning_frequency） */
export const FREQUENCIES = ["毎日", "週1回", "週2回", "月1回"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** レベルが 1 上がるのに必要な累計ポイント（DB ビュー user_stats と合わせる） */
export const LEVEL_STEP = 500;

/** ホーム画面のランダムクエスト（missions） */
export interface Mission {
  id: string;
  name: string;
  area: Area;
  comment: string;
  time: string;
  points: number;
  emoji: string;
  image: string | null;
  steps: string[];
}

/** 掃除管理画面の掃除箇所（cleaning_task_status） */
export interface CleaningTask {
  id: string;
  name: string;
  area: Area;
  freq: Frequency;
  points: number;
  emoji: string;
  /** 今日（日本時間）完了したか */
  done: boolean;
  lastDoneAt: Date | null;
}

export type NewTaskInput = Pick<CleaningTask, "name" | "area" | "freq" | "points">;

/** 掃除履歴（cleaning_logs） */
export interface HistoryEntry {
  id: string;
  name: string;
  completedAt: Date;
  points: number;
}

/** 報酬ショップの商品（rewards） */
export interface Reward {
  id: string;
  name: string;
  desc: string;
  points: number;
  emoji: string;
}

/** 掃除用品（cleaning_tools） */
export interface CleaningTool {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  category: string;
  productUrl: string | null;
}

/** 実績バッジ（badges + user_badges） */
export interface Badge {
  id: string;
  emoji: string;
  label: string;
}

/** 今週のチャレンジ（challenges） */
export interface Challenge {
  id: string;
  title: string;
  target: number;
  bonus: number;
}

/** プロフィール（profiles） */
export interface Profile {
  name: string;
  avatar: string;
}

/** 集計値（user_stats） */
export interface UserStats {
  pointsBalance: number;
  totalEarned: number;
  totalCount: number;
  weeklyCount: number;
  streakDays: number;
  level: number;
  pointsToNextLevel: number;
}

/** 全ユーザー共通のマスタ */
export interface MasterData {
  missions: Mission[];
  rewards: Reward[];
  tools: CleaningTool[];
  badges: Badge[];
  challenge: Challenge | null;
}

/** ログイン中ユーザーのデータ */
export interface UserData {
  profile: Profile;
  tasks: CleaningTask[];
  history: HistoryEntry[];
  stats: UserStats;
  earnedBadgeIds: Set<string>;
}
