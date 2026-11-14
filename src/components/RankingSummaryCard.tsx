import { useEffect, useState } from "react";
import * as api from "../api/cleanQuest";
import { useApp } from "../state/AppContext";
import type { RankingEntry } from "../types";

/** ホーム用：自分の順位（月間・レベル・総合）と、ランキング画面へのリンク */
export function RankingSummaryCard() {
  const { navigate, user } = useApp();
  const [me, setMe] = useState<RankingEntry | null>(null);
  const [hidden, setHidden] = useState(false);

  // 掃除を記録するとポイントが変わるので、履歴が更新されたら取り直す
  useEffect(() => {
    let cancelled = false;
    api
      .fetchRankings(3)
      .then((rows) => !cancelled && setMe(rows.find((r) => r.isMe) ?? null))
      .catch(() => !cancelled && setHidden(true)); // SQL 未実行などのときはカードを出さない
    return () => {
      cancelled = true;
    };
  }, [user.history]);

  if (hidden) return null;

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">あなたの順位</span>
        <button className="soft small" onClick={() => navigate("ranking")}>ランキングを見る</button>
      </div>
      <div className="ranking-summary">
        <div><span>{new Date().getMonth() + 1}月</span><strong>{me ? `${me.monthlyRank}位` : "—"}</strong></div>
        <div><span>レベル</span><strong>{me ? `${me.levelRank}位` : "—"}</strong></div>
        <div><span>総合</span><strong>{me ? `${me.overallRank}位` : "—"}</strong></div>
      </div>
    </div>
  );
}
