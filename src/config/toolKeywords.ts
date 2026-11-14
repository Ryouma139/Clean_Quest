import type { Area } from "../types";

/**
 * ミッションのカテゴリー（掃除場所）→ 関連する掃除用品の検索キーワード。
 * 先頭のキーワードが、ミッションの「道具」ステップで検索欄に自動で入る。
 * 掃除用品（cleaning_tools）の名前・説明・カテゴリーに含まれる文字で検索する。
 */
export const TOOL_KEYWORDS: Record<Area, string[]> = {
  キッチン: ["キッチン", "拭き掃除"],
  水回り: ["水回り", "拭き掃除"],
  居室: ["居室", "床掃除"],
};

/** 掃除用品をキーワードで絞り込む（名前・説明・カテゴリー、英字の大文字小文字は区別しない） */
export const matchesToolKeyword = (t: { name: string; desc: string; category: string }, keyword: string): boolean =>
  (t.name + t.desc + t.category).toLowerCase().includes(keyword.trim().toLowerCase());
