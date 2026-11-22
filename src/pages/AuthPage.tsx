import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { toJaError } from "../lib/errors";

type Mode = "login" | "signup";

/** 確認メールのリンクのエラーを日本語にする */
function linkErrorMessage(code: string, description: string): string {
  if (/otp_expired|expired|invalid/i.test(code + description))
    return "確認リンクの有効期限が切れているか、すでに使われています。確認済みならそのままログインしてください。まだなら下の「確認メールを再送する」から新しいリンクを受け取ってください。";
  if (/access_denied/i.test(code)) return "確認リンクを開けませんでした。もう一度「確認メールを再送する」からお試しください。";
  return `確認リンクでエラーが発生しました（${description || code}）。`;
}

/** ログイン / 新規登録画面 */
export function AuthPage() {
  const { signIn, signUp, resendConfirmation, linkError, clearLinkError } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(() => (linkError ? linkErrorMessage(linkError.code, linkError.description) : null));
  const [notice, setNotice] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(!!linkError);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
    clearLinkError();
  };

  const onResend = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("確認メールを再送するメールアドレスを入力してください");
      return;
    }
    setSubmitting(true);
    try {
      await resendConfirmation(email.trim());
      setNotice(`${email.trim()} に確認メールを再送しました。最新のメールのリンクを開いてください。`);
    } catch (err) {
      setError(toJaError(err));
    } finally {
      setSubmitting(false);
    }
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
          setShowResend(true);
        }
      }
    } catch (err) {
      setError(toJaError(err));
      if (/email not confirmed/i.test(err instanceof Error ? err.message : String(err))) setShowResend(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">
          <img className="brandmark" src="/icon.png" alt="" />
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

          {showResend && mode === "login" && (
            <button type="button" className="secondary auth-submit" onClick={onResend} disabled={submitting}>
              確認メールを再送する
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
