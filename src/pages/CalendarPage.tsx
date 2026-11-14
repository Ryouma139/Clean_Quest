import { useEffect, useMemo, useState } from "react";
import * as api from "../api/cleanQuest";
import { PageHeader, StatCard } from "../components/ui";
import { toJaError } from "../lib/errors";
import { useApp } from "../state/AppContext";
import type { HistoryEntry } from "../types";
import { dateKey, formatMonthDay, formatPoints, formatTime } from "../utils/format";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
/** 1日のマスに並べる絵文字の上限 */
const MAX_ICONS = 3;

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** 月曜始まりで、その月を含む週をすべて並べた日付の配列 */
function buildGrid(month: Date): Date[] {
  const first = firstOfMonth(month);
  const start = addDays(first, -((first.getDay() + 6) % 7)); // 直前の月曜
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const end = addDays(last, (7 - last.getDay()) % 7); // 直後の日曜
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/** 掃除カレンダー：掃除の記録を日付ごとに表示する */
export function CalendarPage() {
  const { user, masters, toast } = useApp();
  const today = new Date();
  const [month, setMonth] = useState(() => firstOfMonth(today));
  const [selected, setSelected] = useState(() => dateKey(today));
  const [logs, setLogs] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grid = useMemo(() => buildGrid(month), [month]);

  // 表示中の週すべて（前後の月の端も含む）の記録を取得。
  // 掃除を記録・取り消しすると user.history が更新されるので、そのときも取り直す。
  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .fetchLogsInRange(grid[0], addDays(grid[grid.length - 1], 1))
      .then((rows) => !cancelled && setLogs(rows))
      .catch((e) => {
        if (cancelled) return;
        setError(toJaError(e));
        toast(toJaError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [grid, user.history, toast]);

  const byDay = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const l of logs ?? []) {
      const k = dateKey(l.completedAt);
      map.set(k, [...(map.get(k) ?? []), l]);
    }
    return map;
  }, [logs]);

  /** 記録の絵文字：掃除箇所 → ミッション → 既定 の順に探す */
  const emojiOf = (l: HistoryEntry) =>
    user.tasks.find((t) => t.id === l.taskId)?.emoji ?? masters.missions.find((m) => m.id === l.missionId)?.emoji ?? "🧹";

  const inMonth = (d: Date) => d.getMonth() === month.getMonth();
  const monthLogs = (logs ?? []).filter((l) => l.completedAt.getMonth() === month.getMonth() && l.completedAt.getFullYear() === month.getFullYear());
  const monthDays = new Set(monthLogs.map((l) => dateKey(l.completedAt))).size;
  const monthPoints = monthLogs.reduce((s, l) => s + l.points, 0);

  const moveMonth = (diff: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + diff, 1);
    setMonth(next);
    setSelected(dateKey(next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear() ? today : next));
  };
  const goToday = () => {
    setMonth(firstOfMonth(today));
    setSelected(dateKey(today));
  };
  const selectDay = (d: Date) => {
    setSelected(dateKey(d));
    if (!inMonth(d)) setMonth(firstOfMonth(d));
  };

  const selectedDate = grid.find((d) => dateKey(d) === selected) ?? today;
  const selectedLogs = byDay.get(selected) ?? [];

  return (
    <>
      <PageHeader title="掃除カレンダー" sub="いつ、どこを掃除したかを日付ごとに振り返りましょう。" />

      <div className="stats">
        <StatCard label={`${month.getMonth() + 1}月の掃除回数`} value={`${monthLogs.length} 回`} />
        <StatCard label={`${month.getMonth() + 1}月の獲得ポイント`} value={`${formatPoints(monthPoints)} pt`} />
        <StatCard label={`${month.getMonth() + 1}月に掃除した日数`} value={`${monthDays} 日`} />
      </div>

      <div className="calendar-layout">
        <div className="card">
          <div className="calendar-head">
            <button className="secondary small" onClick={() => moveMonth(-1)} aria-label="前の月">‹</button>
            <span className="card-title">{month.getFullYear()}年{month.getMonth() + 1}月</span>
            <button className="secondary small" onClick={() => moveMonth(1)} aria-label="次の月">›</button>
            <button className="soft small calendar-today" onClick={goToday}>今日</button>
          </div>

          <div className="calendar-grid" role="grid">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`calendar-weekday${i === 5 ? " sat" : i === 6 ? " sun" : ""}`}>{w}</div>
            ))}
            {grid.map((d) => {
              const k = dateKey(d);
              const dayLogs = byDay.get(k) ?? [];
              const level = Math.min(dayLogs.length, 3);
              const cls = [
                "calendar-day",
                `lv${level}`,
                inMonth(d) ? "" : "outside",
                k === dateKey(today) ? "today" : "",
                k === selected ? "selected" : "",
                d.getDay() === 6 ? "sat" : d.getDay() === 0 ? "sun" : "",
              ].filter(Boolean).join(" ");
              return (
                <button key={k} className={cls} onClick={() => selectDay(d)} aria-label={`${formatMonthDay(d)} 掃除 ${dayLogs.length} 回`}>
                  <span className="calendar-date">{d.getDate()}</span>
                  {dayLogs.length > 0 && (
                    <>
                      <span className="calendar-icons">
                        {dayLogs.slice(0, MAX_ICONS).map((l) => <span key={l.id}>{emojiOf(l)}</span>)}
                        {dayLogs.length > MAX_ICONS && <span className="calendar-more">+{dayLogs.length - MAX_ICONS}</span>}
                      </span>
                      <span className="calendar-points">+{dayLogs.reduce((s, l) => s + l.points, 0)}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {logs === null && !error && <p className="muted calendar-note">読み込み中…</p>}
          {error && <p className="muted calendar-note">{error}</p>}
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">{formatMonthDay(selectedDate)}</span>
            {selectedLogs.length > 0 && (
              <span className="history-points">+{selectedLogs.reduce((s, l) => s + l.points, 0)} pt</span>
            )}
          </div>
          {selectedLogs.length === 0 ? (
            <p className="muted">この日の掃除記録はありません。</p>
          ) : (
            selectedLogs.map((l) => (
              <div key={l.id} className="calendar-log">
                <span className="calendar-log-icon">{emojiOf(l)}</span>
                <div className="calendar-log-info">
                  <strong>{l.name}</strong>
                  <span className="muted">{formatTime(l.completedAt)}{l.missionId ? " ・ ミッション" : ""}</span>
                </div>
                <span className="history-points">+{l.points} pt</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
