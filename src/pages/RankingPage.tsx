import { useCallback, useEffect, useState } from "react";
import * as api from "../api/cleanQuest";
import { PageHeader, StatCard } from "../components/ui";
import { toJaError } from "../lib/errors";
import { useApp } from "../state/AppContext";
import type { RankingEntry, RankingKind } from "../types";
import { formatPoints } from "../utils/format";

/** 表示する上位の人数 */
const TOP = 50;

const TABS: { id: RankingKind; label: string; note: string }[] = [
  { id: "monthly", label: "月間ポイント", note: "今月獲得したポイントの多い順（交換で使っても減りません）" },
  { id: "level", label: "レベル", note: "レベルの高い順（同じレベルは累計獲得ポイントの多い順）" },
  { id: "overall", label: "総合", note: "月間ポイントの順位とレベルの順位の合計が小さい順" },
];

export const rankOf = (e: RankingEntry, kind: RankingKind) =>
  kind === "monthly" ? e.monthlyRank : kind === "level" ? e.levelRank : e.overallRank;

/** 順位の表示（1〜3位はメダル） */
export const RankBadge = ({ rank }: { rank: number }) => (
  <span className={`rank-badge${rank <= 3 ? ` top${rank}` : ""}`}>{rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}</span>
);

/** ランキング：月間ポイント・レベル・総合 */
export function RankingPage() {
  const { toast } = useApp();
  const [tab, setTab] = useState<RankingKind>("monthly");
  const [entries, setEntries] = useState<RankingEntry[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.fetchRankings(TOP));
      setUnavailable(false);
    } catch (e) {
      if (e instanceof api.RankingUnavailableError) setUnavailable(true);
      else toast(toJaError(e));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const month = new Date().getMonth() + 1;
  const me = entries?.find((e) => e.isMe) ?? null;
  const sorted = [...(entries ?? [])]
    .filter((e) => rankOf(e, tab) <= TOP)
    .sort((a, b) => rankOf(a, tab) - rankOf(b, tab) || b.totalEarned - a.totalEarned);
  const meInList = sorted.some((e) => e.isMe);
  const tabInfo = TABS.find((t) => t.id === tab)!;

  const valueOf = (e: RankingEntry) => {
    if (tab === "monthly") return <><strong>{formatPoints(e.monthlyPoints)}</strong> pt</>;
    if (tab === "level") return <><strong>Lv.{e.level}</strong><span className="muted"> 累計 {formatPoints(e.totalEarned)} pt</span></>;
    return <span className="muted">月間 {e.monthlyRank}位 ・ レベル {e.levelRank}位</span>;
  };

  const row = (e: RankingEntry, i: number) => (
    <div key={`${tab}-${i}-${e.name}`} className={`ranking-row${e.isMe ? " me" : ""}`}>
      <RankBadge rank={rankOf(e, tab)} />
      <span className="ranking-avatar">{e.avatar}</span>
      <span className="ranking-name">
        {e.name}
        {e.isMe && <span className="badge done">あなた</span>}
      </span>
      <span className="ranking-value">{valueOf(e)}</span>
    </div>
  );

  return (
    <>
      <PageHeader title="ランキング" sub="みんなの掃除の頑張りを見てみましょう。" />

      {unavailable ? (
        <div className="card muted">ランキングはまだ準備中です（SQL の実行が必要です）。</div>
      ) : (
        <>
          {me && (
            <div className="stats">
              <StatCard label={`${month}月の月間ポイント`} symbol="📅" value={`${me.monthlyRank} 位`} note={`${formatPoints(me.monthlyPoints)} pt`} />
              <StatCard label="レベル" symbol="🏅" value={`${me.levelRank} 位`} note={`Lv.${me.level}・累計 ${formatPoints(me.totalEarned)} pt`} />
              <StatCard label="総合" symbol="👑" value={`${me.overallRank} 位`} note="月間とレベルの合計" />
            </div>
          )}

          <div className="toolbar">
            <div className="filters">
              {TABS.map((t) => (
                <button key={t.id} className={`filter${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                  {t.id === "monthly" ? `${month}月の${t.label}` : t.label}
                </button>
              ))}
            </div>
            <button className="secondary small" onClick={load} disabled={loading}>{loading ? "更新中…" : "⟳ 更新"}</button>
          </div>

          <div className="card">
            <p className="muted ranking-note">{tabInfo.note}。上位 {TOP} 位まで表示します。</p>
            {entries === null && <p className="muted">読み込み中…</p>}
            {entries && sorted.length === 0 && <p className="muted">まだランキングに参加している人がいません。</p>}
            <div className="ranking-list">
              {sorted.map(row)}
              {me && !meInList && (
                <>
                  <div className="ranking-gap">⋮</div>
                  {row(me, -1)}
                </>
              )}
            </div>
          </div>
          <p className="muted ranking-privacy">※ ランキングには、ニックネーム・アバター・レベル・ポイントだけが表示されます。</p>
        </>
      )}
    </>
  );
}
