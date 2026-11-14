import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 環境変数が未設定のときのエラーメッセージ（設定済みなら null） */
export const supabaseConfigError: string | null =
  url && anonKey ? null : "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が未設定です。.env.example を .env.local にコピーして値を設定し、開発サーバーを再起動してください。";

/**
 * 確認メールのリンクから戻ってきたときのエラー（URL の #error_code=... / ?error_code=...）。
 * Supabase クライアントは起動時に URL を書き換えるので、クライアントを作る「前」に読み取っておく。
 */
export const initialAuthLinkError: { code: string; description: string } | null = (() => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const get = (k: string) => hash.get(k) ?? query.get(k);
  const code = get("error_code") ?? get("error");
  if (!code) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return { code, description: get("error_description") ?? "" };
})();

export const supabase = createClient<Database>(url || "http://localhost:54321", anonKey || "missing-anon-key");
