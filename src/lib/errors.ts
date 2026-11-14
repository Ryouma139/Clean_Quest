/** Supabase（Auth / RPC）のエラーを画面表示用の日本語にする */
const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "メールアドレスまたはパスワードが違います"],
  [/user already registered|already been registered/i, "このメールアドレスは登録済みです"],
  [/email not confirmed/i, "メールアドレスの確認が済んでいません。届いたメールのリンクを開いてください"],
  [/password should be at least|weak password/i, "パスワードは6文字以上にしてください"],
  [/unable to validate email|invalid email|email address .* is invalid/i, "メールアドレスの形式が正しくありません"],
  [/rate limit|too many requests|for security purposes/i, "操作が多すぎます。しばらく待ってからお試しください"],
  [/signups not allowed|signup is disabled/i, "現在、新規登録を受け付けていません"],
  [/already completed today/i, "今日はもう完了しています"],
  [/row-level security|permission denied/i, "この操作をする権限がありません（管理者のみ）"],
  [/_https|violates check constraint/i, "入力内容が正しくありません（URL は https:// で始めてください）"],
  [/duplicate key/i, "同じIDのデータがすでにあります"],
  [/insufficient points/i, "ポイントが足りません"],
  [/not authenticated|jwt/i, "ログインの有効期限が切れました。もう一度ログインしてください"],
  [/failed to fetch|network/i, "サーバーに接続できません。通信環境を確認してください"],
];

export function toJaError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e);
  return MESSAGES.find(([re]) => re.test(msg))?.[1] ?? `エラーが発生しました（${msg}）`;
}
