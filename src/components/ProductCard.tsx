import type { ReactNode } from "react";
import { AffiliateLink, PrLabel, ProductImage } from "./ui";

interface Props {
  name: string;
  desc: string;
  emoji: string;
  imageUrl: string | null;
  affiliateUrl: string | null;
  /** 名前の上に出す小さなラベル（カテゴリーなど） */
  tag?: string;
  /** リンクの上に出す追加のボタンなど（ご褒美商品の「使用する」） */
  actions?: ReactNode;
}

/** 商品カード（画像＋説明＋アフィリエイトリンク）。掃除用品とご褒美商品で共通 */
export function ProductCard({ name, desc, emoji, imageUrl, affiliateUrl, tag, actions }: Props) {
  return (
    <div className="tool-item">
      <div className="tool-art">
        <ProductImage src={imageUrl} alt={name} emoji={emoji} />
      </div>
      <div className="tool-copy">
        {tag && <span className="tag">{tag}</span>}
        <h3 style={tag ? { marginTop: 10 } : undefined}>{name}</h3>
        <p>{desc}</p>
        {actions}
        {affiliateUrl ? (
          <AffiliateLink className="secondary button-link" href={affiliateUrl}>
            <PrLabel /> 商品を見る →
          </AffiliateLink>
        ) : (
          <button className="secondary" disabled>商品リンク準備中</button>
        )}
      </div>
    </div>
  );
}
