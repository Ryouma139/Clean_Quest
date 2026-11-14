import { useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { PageHeader } from "../components/ui";
import { useApp } from "../state/AppContext";

/** 掃除用品：検索と商品カード（アフィリエイトリンク） */
export function ToolsPage() {
  const { masters } = useApp();
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const filtered = masters.tools.filter((t) => (t.name + t.desc + t.category).toLowerCase().includes(q));

  return (
    <>
      <PageHeader title="掃除用品を探す" sub="掃除場所に合った道具や、使ってよかったアイテムを見つけましょう。" />
      <div className="toolbar">
        <input className="search-input" placeholder="商品名・掃除場所で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="muted ad-notice">※ このページはアフィリエイト広告を含みます</div>
      </div>
      {filtered.length === 0 && <p className="muted">該当する商品がありません。</p>}
      <div className="tool-grid">
        {filtered.map((t) => (
          <ProductCard key={t.id} name={t.name} desc={t.desc} emoji={t.emoji} imageUrl={t.imageUrl} affiliateUrl={t.affiliateUrl} tag={t.category} />
        ))}
      </div>
    </>
  );
}
