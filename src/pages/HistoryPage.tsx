import { PageHeader, StatCard } from "../components/ui";
import { useApp } from "../state/AppContext";
import { formatPoints, formatRelativeDate } from "../utils/format";

/** 掃除履歴：累計と最近の記録 */
export function HistoryPage() {
  const { user } = useApp();
  const { stats } = user;

  return (
    <>
      <PageHeader title="掃除履歴" sub="これまでの掃除の記録を振り返りましょう。" />
      <div className="stats">
        <StatCard label="累計掃除回数" value={`${stats.totalCount} 回`} />
        <StatCard label="累計獲得ポイント" value={`${formatPoints(stats.totalEarned)} pt`} />
        <StatCard label="連続達成" value={`${stats.streakDays} 日`} />
      </div>
      <div className="card">
        <div className="card-title">最近の記録</div>
        {user.history.length === 0 && <p className="muted">まだ記録がありません。最初の掃除をしてみましょう！</p>}
        {user.history.map((h) => (
          <div key={h.id} className="history-row">
            <strong>{h.name}</strong>
            <span className="history-points">+{h.points} pt</span>
            <span className="muted date">{formatRelativeDate(h.completedAt)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
