export const formatPoints = (n: number): string => n.toLocaleString("ja-JP");

const pad = (n: number) => String(n).padStart(2, "0");

/** 「たった今 / 今日 08:30 / 昨日 20:15 / 11月3日 10:00」形式 */
export function formatRelativeDate(date: Date, now = new Date()): string {
  if (now.getTime() - date.getTime() < 60_000) return "たった今";
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return `今日 ${time}`;
  if (date.getTime() >= startOfToday - 86_400_000) return `昨日 ${time}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

export const formatToday = (d = new Date()): string =>
  new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(d);

/** 「08:30」形式 */
export const formatTime = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** 「11月15日(日)」形式 */
export const formatMonthDay = (d: Date): string =>
  new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(d);

/** 日付を「2026-11-15」形式のキーにする（端末のローカル時刻＝日本時間を想定） */
export const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
