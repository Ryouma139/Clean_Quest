import { useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { PageHeader } from "../components/ui";
import { useApp } from "../state/AppContext";
import type { Reward, RewardItem } from "../types";
import { formatPoints } from "../utils/format";

/**
 * ご褒美を選ぶ：報酬ショップで「交換する」を押したあとの、報酬ごとの商品一覧（アフィリエイトリンク）。
 * 商品ごとの「使用する」で、その報酬に設定されたポイントを消費する。
 */
export function RewardItemsPage() {
  const { user, masters, selectedRewardId, openRewardItems, navigate, consumeRewardItem, toast } = useApp();
  const [usingId, setUsingId] = useState<string | null>(null);
  const balance = user.stats.pointsBalance;
  const selected = masters.rewards.find((r) => r.id === selectedRewardId) ?? null;
  // 選択中の報酬があればその報酬だけ、無ければ全報酬を並べる
  const groups = (selected ? [selected] : masters.rewards).map((r) => ({
    reward: r,
    items: masters.rewardItems.filter((i) => i.rewardId === r.id),
  }));

  const use = async (reward: Reward, item: RewardItem) => {
    if (balance < reward.points) {
      toast("ポイントが足りません");
      return;
    }
    if (!window.confirm(`「${item.name}」を使用します。\n${formatPoints(reward.points)} pt を消費しますか？\n（保有 ${formatPoints(balance)} pt → ${formatPoints(balance - reward.points)} pt）`)) return;
    setUsingId(item.id);
    const ok = await consumeRewardItem(item);
    setUsingId(null);
    if (ok) toast(`「${item.name}」を使用しました（-${formatPoints(reward.points)} pt）`);
  };

  const useButton = (reward: Reward, item: RewardItem) => {
    const short = reward.points - balance;
    return (
      <div className="use-item">
        <button
          className="primary"
          disabled={short > 0 || usingId !== null}
          onClick={() => use(reward, item)}
        >
          {usingId === item.id ? "処理中…" : `使用する（${formatPoints(reward.points)} pt）`}
        </button>
        {short > 0 && <span className="shop-short">あと {formatPoints(short)} pt で使えます</span>}
      </div>
    );
  };

  return (
    <>
      <button className="secondary small back-button" onClick={() => navigate("rewards")}>← 報酬ショップに戻る</button>
      <PageHeader
        title={selected ? `${selected.emoji} ${selected.name}のご褒美を選ぶ` : "ご褒美を選ぶ"}
        sub="がんばった自分に、ご褒美を選びましょう。商品の「使用する」を押すとポイントが使われます。"
      />

      <div className="card points-banner reward-items-balance">
        <span className="muted" style={{ fontSize: 12 }}>YOUR POINTS</span>
        <div className="stat-value" style={{ color: "#a36e00" }}>{formatPoints(balance)} pt</div>
      </div>

      <div className="toolbar">
        <div className="filters">
          <button className={`filter${selected ? "" : " active"}`} onClick={() => openRewardItems(null)}>すべて</button>
          {masters.rewards.map((r) => (
            <button key={r.id} className={`filter${selected?.id === r.id ? " active" : ""}`} onClick={() => openRewardItems(r.id)}>
              {r.emoji} {r.name}（{formatPoints(r.points)} pt）
            </button>
          ))}
        </div>
        <div className="muted ad-notice">※ このページはアフィリエイト広告を含みます</div>
      </div>

      {groups.map(({ reward, items }) => (
        <section key={reward.id} className="reward-group">
          <h2 className="reward-group-title">
            {reward.emoji} {reward.name}<span className="admin-points">{formatPoints(reward.points)} pt</span>
          </h2>
          {items.length === 0 ? (
            <p className="muted">この報酬の商品はまだ登録されていません。</p>
          ) : (
            <div className="tool-grid">
              {items.map((i) => (
                <ProductCard
                  key={i.id}
                  name={i.name}
                  desc={i.desc}
                  emoji={i.emoji}
                  imageUrl={i.imageUrl}
                  affiliateUrl={i.affiliateUrl}
                  actions={useButton(reward, i)}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
