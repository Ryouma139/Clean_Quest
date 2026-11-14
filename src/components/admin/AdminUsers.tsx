import { useCallback, useEffect, useState } from "react";
import * as admin from "../../api/admin";
import type { AdminUser } from "../../api/admin";
import { toJaError } from "../../lib/errors";
import { useConfirm } from "../ConfirmDialog";
import { useApp } from "../../state/AppContext";
import { formatPoints } from "../../utils/format";

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d) : "—";

/** 管理画面「ユーザー」タブ：一覧と削除（関連レコード・画像も一緒に削除） */
export function AdminUsers({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const { userId, toast } = useApp();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const list = await admin.listUsers();
      setUsers(list);
      onCountChange?.(list.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      if (/admin_list_users|PGRST202|Could not find the function/i.test(msg) || (e as { code?: string })?.code === "PGRST202") setUnavailable(true);
      else toast(toJaError(e));
    }
  }, [toast, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (u: AdminUser) => {
    const ok = await confirm({
      title: "ユーザーの削除",
      danger: true,
      confirmLabel: "削除する",
      message: (
        <>
          <p>
            ユーザー「<strong>{u.name}</strong>」（{u.email}）を削除します。
          </p>
          <p className="confirm-warning">次のデータもすべて削除され、元に戻せません。</p>
          <ul className="confirm-list">
            <li>掃除箇所、掃除の記録（{u.logCount}件）、獲得ポイント（累計 {formatPoints(u.totalEarned)} pt）</li>
            <li>報酬の交換記録、バッジ、掃除の画像、アイコン画像</li>
            <li>管理者の権限{u.isAdmin && <strong>（このユーザーは管理者です）</strong>}</li>
          </ul>
        </>
      ),
      requireText: {
        label: "確認のため、このユーザーのメールアドレスを入力してください",
        expected: u.email,
        placeholder: u.email,
      },
    });
    if (!ok) return;
    setDeletingId(u.id);
    try {
      const r = await admin.deleteUser(u.id);
      toast(`「${u.name}」を削除しました（掃除の記録 ${r.logs}件・掃除箇所 ${r.tasks}件・交換 ${r.redemptions}件・画像 ${r.photos}枚）`);
      await load();
    } catch (e) {
      toast(toJaError(e));
    } finally {
      setDeletingId(null);
    }
  };

  if (unavailable) return <p className="muted">ユーザー管理はまだ準備中です（SQL の実行が必要です）。</p>;
  if (!users) return <p className="muted">読み込み中…</p>;

  const q = query.trim().toLowerCase();
  const filtered = q ? users.filter((u) => (u.name + u.email).toLowerCase().includes(q)) : users;

  return (
    <section>
      <div className="toolbar">
        <input className="search-input" placeholder="ニックネーム・メールアドレスで検索" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="secondary small" onClick={load}>⟳ 更新</button>
      </div>
      <p className="muted admin-note">
        ユーザーを削除すると、そのユーザーの掃除箇所・掃除の記録・ポイント・交換記録・バッジ・画像もすべて削除されます。自分自身は削除できません。
      </p>
      <div className="admin-list">
        {filtered.length === 0 && <p className="muted">該当するユーザーがいません。</p>}
        {filtered.map((u) => {
          const isMe = u.id === userId;
          return (
            <div key={u.id} className="admin-row">
              <div className="admin-thumb">{u.avatar}</div>
              <div className="admin-row-info">
                <strong>{u.name}</strong>
                <span className="muted">{u.email}</span>
                <span className="muted">
                  登録 {fmtDate(u.createdAt)} ・ 最終ログイン {fmtDate(u.lastSignInAt)} ・ 記録 {u.logCount}件 ・ 累計 {formatPoints(u.totalEarned)} pt
                </span>
                <div className="admin-badges">
                  {isMe && <span className="badge done">あなた</span>}
                  {u.isAdmin && <span className="badge">管理者</span>}
                  {!u.emailConfirmed && <span className="badge">メール未確認</span>}
                </div>
              </div>
              <div className="admin-row-actions">
                <button
                  className="secondary small danger"
                  onClick={() => remove(u)}
                  disabled={isMe || deletingId !== null}
                  title={isMe ? "自分自身は削除できません" : undefined}
                >
                  {deletingId === u.id ? "削除中…" : "削除"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
