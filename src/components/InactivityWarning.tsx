import { useEffect, useState } from "react";
import { useApp } from "../state/AppContext";
import { Modal } from "./ui";

/** この日数以上、掃除の記録が無いと警告する */
export const INACTIVITY_DAYS = 1;

const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/** 2つの日付の「日数の差」（時刻は無視。端末の時刻＝日本時間を想定） */
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);

/** 警告の文章（毎回ランダムに1つ） */
const MESSAGES = [
  "部屋が散らかっていると、お金の運気も逃げていってしまうかも…。",
  "ホコリがたまった部屋には、福の神も寄りつきません…。",
  "お金持ちの家は、いつもスッキリ片付いているそうです…。",
];

/** ブラウザを閉じるまでは同じユーザーに1回だけ表示する（sessionStorage が使えなければ毎回） */
const storageKey = (userId: string) => `cq-inactivity-warning-shown:${userId}`;
const alreadyShown = (userId: string) => {
  try {
    return sessionStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
};
/** ログアウト時に呼ぶ：次のログインでまた判定されるようにする */
export const resetInactivityWarning = (userId: string) => {
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch {
    /* 何もしない */
  }
};
const markShown = (userId: string) => {
  try {
    sessionStorage.setItem(storageKey(userId), "1");
  } catch {
    /* 保存できなくても表示には影響しない */
  }
};

/**
 * ログイン時の警告：最後の掃除から 7日以上（一度も掃除していない場合は登録から 7日以上）経っていたら表示する。
 */
export function InactivityWarning({ accountCreatedAt }: { accountCreatedAt: Date }) {
  const { user, userId, navigate } = useApp();
  const [open, setOpen] = useState(false);
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  // 履歴は新しい順なので先頭が最後の掃除
  const lastCleanedAt = user.history[0]?.completedAt ?? null;
  const today = new Date();
  const daysSince = lastCleanedAt ? daysBetween(lastCleanedAt, today) : daysBetween(accountCreatedAt, today);
  const shouldWarn = daysSince >= INACTIVITY_DAYS;

  // 判定はアプリを開いたときの1回だけ（掃除を記録したら次回からは出ない）
  useEffect(() => {
    if (shouldWarn && !alreadyShown(userId)) {
      setOpen(true);
      markShown(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => setOpen(false);
  const goClean = () => {
    setOpen(false);
    navigate("home");
  };

  return (
    <Modal
      open={open}
      title="💸 このままでは、お金持ちになれません…"
      onClose={close}
      actions={
        <>
          <button className="secondary" onClick={close}>あとで</button>
          <button className="primary" onClick={goClean}>今日のミッションを見る</button>
        </>
      }
    >
      <div className="inactivity-warning">
        <div className="inactivity-days">
          {lastCleanedAt ? (
            <>最後の掃除から <strong>{daysSince}日</strong> が経ちました</>
          ) : (
            <>登録から <strong>{daysSince}日</strong>、まだ掃除の記録がありません</>
          )}
        </div>
        <p>{message}</p>
        <p>今日は5分だけ、どこかひとつ掃除してみませんか？ 小さな一歩が、運気とポイントを呼び込みます。</p>
      </div>
    </Modal>
  );
}
