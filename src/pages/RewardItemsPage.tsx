import { ProductCard } from "../components/ProductCard";
import { PageHeader } from "../components/ui";
import { useApp } from "../state/AppContext";

/** ご褒美を選ぶ：報酬ショップで交換したあとに表示する、報酬ごとの商品リンク一覧 */
export function RewardItemsPage() {
  const { masters, selectedRewardId, openRewardItems, navigate } = useApp();
  const selected = masters.rewards.find((r) => r.id === selectedRewardId) ?? null;
  // 選択中の報酬があればその報酬だけ、無ければ全報酬を並べる
  const groups = (selected ? [selected] : masters.rewards).map((r) => ({
    reward: r,
    items: masters.rewardItems.filter((i) => i.rewardId === r.id),
  }));

  return (
    <>
      <button className="secondary small back-button" onClick={() => navigate("rewards")}>← 報酬ショップに戻る</button>
      <PageHeader
        title={selected ? `${selected.emoji} ${selected.name}のご褒美を選ぶ` : "ご褒美を選ぶ"}
        sub="がんばった自分に、ご褒美を選びましょう。"
      />

      <div className="toolbar">
        <div className="filters">
          <button className={`filter${selected ? "" : " active"}`} onClick={() => openRewardItems(null)}>すべて</button>
          {masters.rewards.map((r) => (
            <button key={r.id} className={`filter${selected?.id === r.id ? " active" : ""}`} onClick={() => openRewardItems(r.id)}>
              {r.emoji} {r.name}
            </button>
          ))}
        </div>
        <div className="muted ad-notice">※ このページはアフィリエイト広告を含みます</div>
      </div>

      {groups.map(({ reward, items }) => (
        <section key={reward.id} className="reward-group">
          {!selected && <h2 className="reward-group-title">{reward.emoji} {reward.name}</h2>}
          {items.length === 0 ? (
            <p className="muted">この報酬の商品はまだ登録されていません。</p>
          ) : (
            <div className="tool-grid">
              {items.map((i) => (
                <ProductCard key={i.id} name={i.name} desc={i.desc} emoji={i.emoji} imageUrl={i.imageUrl} affiliateUrl={i.affiliateUrl} />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
