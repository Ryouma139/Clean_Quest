/**
 * Supabase の型定義（supabase/migrations と対応）。
 * プロジェクト作成後は次のコマンドで自動生成したものに置き換えてください:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type CleaningArea = "キッチン" | "水回り" | "居室";
type CleaningFrequency = "毎日" | "週1回" | "週2回" | "月1回";

type DefaultTaskRow = { template_key: string; name: string; area: CleaningArea; freq: CleaningFrequency; points: number; emoji: string; sort_order: number };
type MissionRow = { id: string; name: string; area: CleaningArea; comment: string; time_label: string; points: number; emoji: string; image_url: string | null; steps: string[]; task_template_key: string | null; sort_order: number; is_active: boolean };
type RewardRow = { id: string; name: string; description: string; points: number; emoji: string; sort_order: number; is_active: boolean };
type RewardItemRow = { id: string; reward_id: string; name: string; description: string; emoji: string; image_url: string | null; affiliate_url: string | null; sort_order: number; is_active: boolean };
type CleaningToolRow = { id: string; name: string; description: string; emoji: string; category: string; image_url: string | null; affiliate_url: string | null; sort_order: number; is_active: boolean };
type BadgeRow = { id: string; emoji: string; label: string; description: string | null; sort_order: number };
type ChallengeRow = { id: string; title: string; kind: "streak"; target: number; bonus: number; is_active: boolean };
type ProfileRow = { id: string; display_name: string; avatar: string; bio: string; created_at: string };
type CleaningTaskRow = { id: string; user_id: string; template_key: string | null; name: string; area: CleaningArea; freq: CleaningFrequency; points: number; emoji: string; sort_order: number; created_at: string; archived_at: string | null };
type CleaningLogRow = { id: string; user_id: string; task_id: string | null; mission_id: string | null; name: string; points: number; completed_at: string; before_photo_path: string | null; after_photo_path: string | null };
type RewardRedemptionRow = { id: string; user_id: string; reward_id: string | null; reward_name: string; points: number; redeemed_at: string };
type UserBadgeRow = { user_id: string; badge_id: string; earned_at: string };

/** マスタ表（クライアントからは読み取り専用） */
type ReadOnlyTable<R> = { Row: R; Insert: never; Update: never; Relationships: [] };

/** 管理者だけが書き込めるマスタ表（RLS で is_admin() を確認。id は DB で自動採番） */
type AdminTable<R extends { id: string }, Required extends keyof R> = {
  Row: R;
  Insert: Pick<R, Required> & Partial<Omit<R, Required>>;
  Update: Partial<Omit<R, "id">>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      default_tasks: ReadOnlyTable<DefaultTaskRow>;
      missions: ReadOnlyTable<MissionRow>;
      rewards: AdminTable<RewardRow, "name" | "description" | "points" | "emoji">;
      reward_items: AdminTable<RewardItemRow, "reward_id" | "name">;
      cleaning_tools: AdminTable<CleaningToolRow, "name" | "description" | "emoji" | "category">;
      badges: ReadOnlyTable<BadgeRow>;
      challenges: ReadOnlyTable<ChallengeRow>;
      profiles: {
        Row: ProfileRow;
        Insert: never;
        Update: Partial<Pick<ProfileRow, "display_name" | "avatar" | "bio">>;
        Relationships: [];
      };
      cleaning_tasks: {
        Row: CleaningTaskRow;
        Insert: Pick<CleaningTaskRow, "name" | "area" | "freq" | "points"> & Partial<Pick<CleaningTaskRow, "emoji" | "sort_order">>;
        Update: Partial<Pick<CleaningTaskRow, "name" | "area" | "freq" | "points" | "emoji" | "sort_order" | "archived_at">>;
        Relationships: [];
      };
      cleaning_logs: ReadOnlyTable<CleaningLogRow>;
      reward_redemptions: ReadOnlyTable<RewardRedemptionRow>;
      user_badges: ReadOnlyTable<UserBadgeRow>;
    };
    Views: {
      cleaning_task_status: {
        Row: Omit<CleaningTaskRow, "archived_at"> & { last_done_at: string | null; done_today: boolean };
        Relationships: [];
      };
      user_streaks: {
        Row: { user_id: string; streak_days: number };
        Relationships: [];
      };
      user_stats: {
        Row: {
          user_id: string;
          total_earned: number;
          total_count: number;
          weekly_count: number;
          points_balance: number;
          streak_days: number;
          level: number;
          points_to_next_level: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      complete_task: { Args: { p_task_id: string }; Returns: CleaningLogRow };
      undo_task: { Args: { p_task_id: string }; Returns: undefined };
      complete_mission: {
        Args: { p_mission_id: string; p_before_photo_path?: string | null; p_after_photo_path?: string | null };
        Returns: CleaningLogRow;
      };
      redeem_reward: { Args: { p_reward_id: string }; Returns: RewardRedemptionRow };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          email: string;
          display_name: string | null;
          avatar: string | null;
          created_at: string;
          last_sign_in_at: string | null;
          email_confirmed: boolean;
          is_admin: boolean;
          log_count: number;
          total_earned: number;
        }[];
      };
      admin_delete_user: {
        Args: { p_user_id: string };
        Returns: { tasks: number; logs: number; redemptions: number; badges: number };
      };
      get_rankings: {
        Args: { p_limit?: number };
        Returns: {
          display_name: string;
          avatar: string;
          /** 一言コメント（SQL 0900 未実行の環境では返らない） */
          bio?: string;
          level: number;
          total_earned: number;
          monthly_points: number;
          monthly_rank: number;
          level_rank: number;
          overall_rank: number;
          is_me: boolean;
        }[];
      };
    };
    Enums: {
      cleaning_area: CleaningArea;
      cleaning_frequency: CleaningFrequency;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];
