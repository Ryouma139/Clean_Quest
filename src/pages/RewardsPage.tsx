import { PageHeader } from "../components/ui";
import { useApp } from "../state/AppContext";
import { formatPoints } from "../utils/format";

/**
 * 報酬ショップ：ポイント枠（報酬）の一覧。
 * 「交換する」で、その報酬の商品一覧（ご褒美を選ぶ）を開く。ここではポイントは消費しない。
 * ポイントが足りない報酬の「交換する」はグレーアウトして押せない。
 * ポイントは、商品一覧で商品ごとの「使用する」を押したときに消費する。
 */
export function RewardsPage() {
  const { user, masters, openRewardItems } = useApp();
  const balance = user.stats.pointsBalance;

  return (
    <>
      <PageHeader title="報酬ショップ" sub="掃除で貯めたポイントを、自分へのご褒美に交換しましょう。" />
      <div className="card points-banner">
        <span className="muted" style={{ fontSize: 12 }}>YOUR POINTS</span>
        <div className="stat-value" style={{ color: "#a36e00" }}>{formatPoints(balance)} pt</div>
      </div>
      <p className="muted ad-notice">「交換する」を押すと商品の一覧が開きます。ポイントは、一覧で商品の「使用する」を押したときに使われます。ポイントが足りない報酬は交換できません。</p>
      <div className="shop-grid">
        {masters.rewards.map((r) => {
          const short = r.points - balance;
          return (
            <div key={r.id} className="shop-item">
              <div className="shop-art">{r.emoji}</div>
              <div className="shop-copy">
                <h3>{r.name}</h3>
                <p>{r.desc}</p>
                <div className="price">{formatPoints(r.points)} pt</div>
                <button className="primary" style={{ width: "100%" }} disabled={short > 0} onClick={() => openRewardItems(r.id)}>
                  交換する
                </button>
                {short > 0 && <p className="shop-short">あと {formatPoints(short)} pt で使えます</p>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
