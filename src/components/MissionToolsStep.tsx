import { useState } from "react";
import { TOOL_KEYWORDS, matchesToolKeyword } from "../config/toolKeywords";
import type { CleaningTool, Mission } from "../types";
import { AffiliateLink, PrLabel, ProductImage } from "./ui";

interface Props {
  mission: Mission;
  tools: CleaningTool[];
}

/** ミッションの「道具」ステップ：カテゴリーから自動でキーワードを入れて、関連する掃除用品を表示する */
export function MissionToolsStep({ mission, tools }: Props) {
  const keywords = TOOL_KEYWORDS[mission.area] ?? [mission.area];
  const [query, setQuery] = useState(keywords[0] ?? "");
  const results = query.trim() ? tools.filter((t) => matchesToolKeyword(t, query)) : tools;

  return (
    <div className="mission-tools">
      <p className="muted">この掃除に使う道具を確認しましょう。（{mission.area}の掃除）</p>

      <div className="mission-tools-keywords">
        <span className="field-help">関連キーワード：</span>
        {keywords.map((k) => (
          <button key={k} type="button" className={`filter small${query === k ? " active" : ""}`} onClick={() => setQuery(k)}>
            {k}
          </button>
        ))}
      </div>

      <input
        className="search-input mission-tools-search"
        placeholder="商品名・掃除場所で検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="掃除用品を検索"
      />

      <div className="mission-tools-list">
        {results.length === 0 && <p className="muted">「{query}」に合う掃除用品が見つかりませんでした。</p>}
        {results.map((t) => (
          <div key={t.id} className="mission-tool">
            <span className="mission-tool-thumb">
              <ProductImage src={t.imageUrl} alt={t.name} emoji={t.emoji} />
            </span>
            <div className="mission-tool-info">
              <strong>{t.name}</strong>
              <span className="muted">{t.category} ・ {t.desc}</span>
            </div>
            {t.affiliateUrl ? (
              <AffiliateLink className="secondary small button-link mission-tool-link" href={t.affiliateUrl}>
                <PrLabel /> 見る
              </AffiliateLink>
            ) : (
              <span className="muted mission-tool-none">準備中</span>
            )}
          </div>
        ))}
      </div>
      {results.some((t) => t.affiliateUrl) && <p className="muted ad-notice">※ 「見る」はアフィリエイト広告のリンクです（新しいタブで開きます）</p>}
    </div>
  );
}
