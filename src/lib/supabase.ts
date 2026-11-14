import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 環境変数が未設定のときのエラーメッセージ（設定済みなら null） */
export const supabaseConfigError: string | null =
  url && anonKey ? null : "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が未設定です。.env.example を .env.local にコピーして値を設定し、開発サーバーを再起動してください。";

export const supabase = createClient<Database>(url || "http://localhost:54321", anonKey || "missing-anon-key");
