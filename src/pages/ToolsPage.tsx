import { useState } from "react";
import { PageHeader } from "../components/ui";
import { useApp } from "../state/AppContext";

/** 掃除用品：検索と商品カード */
export function ToolsPage() {
  const { masters, toast } = useApp();
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const filtered = masters.tools.filter((t) => (t.name + t.desc + t.category).toLowerCase().includes(q));

  return (
    <>
      <PageHeader title="掃除用品を探す" sub="掃除場所に合った道具や、使ってよかったアイテムを見つけましょう。" />
      <div className="toolbar">
        <input className="search-input" placeholder="商品名・掃除場所で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="muted" style={{ fontSize: 11 }}>※ 商品リンクはデモ表示です</div>
      </div>
      <div className="tool-grid">
        {filtered.map((t) => (
          <div key={t.id} className="tool-item">
            <div className="tool-art">{t.emoji}</div>
            <div className="tool-copy">
              <span className="tag">{t.category}</span>
              <h3 style={{ marginTop: 10 }}>{t.name}</h3>
              <p>{t.desc}</p>
              {t.productUrl ? (
                <a className="secondary button-link" href={t.productUrl} target="_blank" rel="noopener noreferrer">商品詳細を見る →</a>
              ) : (
                <button className="secondary" onClick={() => toast("商品詳細・購入リンクは今後実装予定です")}>商品詳細を見る →</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
