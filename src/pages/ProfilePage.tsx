import { PageHeader, ProgressBar, StatCard } from "../components/ui";
import { useApp } from "../state/AppContext";
import { LEVEL_STEP } from "../types";
import { formatPoints } from "../utils/format";

/** マイページ：レベル・統計・実績バッジ */
export function ProfilePage() {
  const { user, masters, signOut } = useApp();
  const { profile, stats, earnedBadgeIds } = user;

  return (
    <>
      <PageHeader title="マイページ" sub="あなたの掃除の記録と成長を確認できます。" />
      <div className="card profile-head">
        <div className="big-avatar">{profile.avatar}</div>
        <div style={{ flex: 1 }}>
          <h2 className="profile-name">{profile.name}</h2>
          <strong>Lv.{stats.level}</strong>
          <p className="muted" style={{ fontSize: 12 }}>次のレベルまで {stats.pointsToNextLevel} pt</p>
          <ProgressBar value={1 - stats.pointsToNextLevel / LEVEL_STEP} />
        </div>
        <button className="secondary small" onClick={signOut}>ログアウト</button>
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
    </>
  );
}
