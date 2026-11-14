import { useState } from "react";
import { ProfileEditModal } from "../components/modals/ProfileEditModal";
import { PageHeader, ProgressBar, StatCard } from "../components/ui";
import { useApp } from "../state/AppContext";
import { LEVEL_STEP } from "../types";
import { formatPoints } from "../utils/format";

/** マイページ：プロフィール（アイコン・ニックネーム・一言コメント）・レベル・統計・実績バッジ */
export function ProfilePage() {
  const { user, masters, signOut, navigate, updateProfile, toast } = useApp();
  const { profile, stats, earnedBadgeIds } = user;
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(0);

  const openEdit = () => {
    setEditKey((k) => k + 1); // 開くたびに現在の値から始める
    setEditing(true);
  };

  return (
    <>
      <PageHeader title="マイページ" sub="あなたの掃除の記録と成長を確認できます。" />
      <div className="card profile-head">
        <button className="big-avatar avatar-edit" onClick={openEdit} title="アイコンを変更">
          {profile.avatar}
          <span className="avatar-edit-badge">✎</span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="profile-name">{profile.name}</h2>
          <p className={`profile-bio${profile.bio ? "" : " empty"}`}>
            {profile.bio || "一言コメントはまだありません"}
          </p>
          <strong>Lv.{stats.level}</strong>
          <p className="muted" style={{ fontSize: 12 }}>次のレベルまで {stats.pointsToNextLevel} pt</p>
          <ProgressBar value={1 - stats.pointsToNextLevel / LEVEL_STEP} />
        </div>
        <div className="profile-actions">
          <button className="secondary small" onClick={openEdit}>✎ プロフィール編集</button>
          {user.isAdmin && <button className="soft small" onClick={() => navigate("admin")}>⚙ 管理画面</button>}
          <button className="secondary small" onClick={signOut}>ログアウト</button>
        </div>
      </div>
      <div className="stats" style={{ marginTop: 16 }}>
        <StatCard label="連続達成数" value={`${stats.streakDays} 日`} />
        <StatCard label="今週の掃除" value={`${stats.weeklyCount} 回`} />
        <StatCard label="保有ポイント" value={formatPoints(stats.pointsBalance)} />
      </div>
      <div className="card">
        <div className="card-title">実績バッジ</div>
        <div className="badge-list">
          {masters.badges.map((b) => (
            <span key={b.id} className={earnedBadgeIds.has(b.id) ? "" : "badge-locked"} title={earnedBadgeIds.has(b.id) ? "獲得済み" : "未獲得"}>
              {b.emoji} {b.label}
            </span>
          ))}
        </div>
      </div>

      {editing && (
        <ProfileEditModal
          key={editKey}
          open
          profile={profile}
          onClose={() => setEditing(false)}
          onError={toast}
          onSave={async (input) => {
            const ok = await updateProfile(input);
            if (ok) toast("プロフィールを更新しました");
            return ok;
          }}
        />
      )}
    </>
  );
}
