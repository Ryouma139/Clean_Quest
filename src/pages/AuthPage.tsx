import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { toJaError } from "../lib/errors";

type Mode = "login" | "signup";

/** ログイン / 新規登録画面 */
export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "signup" && !displayName.trim()) {
      setError("ニックネームを入力してください");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        const { needsEmailConfirmation } = await signUp(email.trim(), password, displayName.trim());
        if (needsEmailConfirmation) {
          setNotice(`${email.trim()} に確認メールを送りました。メール内のリンクを開くと登録が完了します。`);
          setMode("login");
          setPassword("");
        }
      }
    } catch (err) {
      setError(toJaError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brandmark">⌂</div>
          <span>Clean Quest</span>
        </div>
        <p className="sub auth-lead">小さな掃除を、毎日の達成感に。</p>

        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>
            ログイン
          </button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>
            新規登録
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="displayName">ニックネーム</label>
              <input id="displayName" maxLength={30} placeholder="例：そうじねこ" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">パスワード{mode === "signup" && "（6文字以上）"}</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="auth-message error" role="alert">{error}</p>}
          {notice && <p className="auth-message notice" role="status">{notice}</p>}

          <button type="submit" className="primary auth-submit" disabled={submitting || !email || !password}>
            {submitting ? "送信中…" : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>
      </div>
    </div>
  );
}
