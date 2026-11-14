import { PageHeader } from "../components/ui";
import { useApp } from "../state/AppContext";
import type { Reward } from "../types";
import { formatPoints } from "../utils/format";

/** 報酬ショップ：ポイントとご褒美の交換 */
export function RewardsPage() {
  const { user, masters, redeem, toast } = useApp();
  const balance = user.stats.pointsBalance;

  const onRedeem = async (r: Reward) => {
    if (balance < r.points) {
      toast("ポイントが足りません");
      return;
    }
    if (window.confirm(`${r.name}を${r.points} ptで交換しますか？`) && (await redeem(r))) {
      toast(`${r.name}と交換しました！`);
    }
  };

  return (
    <>
      <PageHeader title="報酬ショップ" sub="掃除で貯めたポイントを、自分へのご褒美に交換しましょう。" />
      <div className="card points-banner">
        <span className="muted" style={{ fontSize: 12 }}>YOUR POINTS</span>
        <div className="stat-value" style={{ color: "#a36e00" }}>{formatPoints(balance)} pt</div>
      </div>
      <div className="shop-grid">
        {masters.rewards.map((r) => (
          <div key={r.id} className="shop-item">
            <div className="shop-art">{r.emoji}</div>
            <div className="shop-copy">
              <h3>{r.name}</h3>
              <p>{r.desc}</p>
              <div className="price">{formatPoints(r.points)} pt</div>
              <button className="primary" style={{ width: "100%" }} disabled={balance < r.points} onClick={() => onRedeem(r)}>
                交換する
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
