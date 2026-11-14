import type { PageId } from "../types";

export interface PageMeta {
  id: PageId;
  label: string;
  /** モバイルナビ用の短いラベル（未指定ならモバイルナビに出さない） */
  mobileLabel?: string;
  icon: string;
  breadcrumb: string;
  /** メニューに出さない子画面の場合、メニューで選択中にする親画面 */
  parent?: PageId;
}

/** 画面一覧。並び順がサイドバー / モバイルナビの表示順になる（parent があるものはメニューに出さない） */
export const PAGES: PageMeta[] = [
  { id: "home", label: "ホーム", mobileLabel: "ホーム", icon: "⌂", breadcrumb: "ホーム / 今日のミッション" },
  { id: "cleaning", label: "掃除管理", mobileLabel: "掃除管理", icon: "☷", breadcrumb: "掃除管理" },
  { id: "calendar", label: "カレンダー", mobileLabel: "カレンダー", icon: "▦", breadcrumb: "掃除カレンダー" },
  { id: "history", label: "掃除履歴", icon: "◷", breadcrumb: "掃除履歴" },
  { id: "rewards", label: "報酬ショップ", mobileLabel: "報酬", icon: "♜", breadcrumb: "報酬ショップ" },
  { id: "rewardItems", label: "ご褒美を選ぶ", icon: "🎁", breadcrumb: "報酬ショップ / ご褒美を選ぶ", parent: "rewards" },
  { id: "tools", label: "掃除用品", mobileLabel: "用品", icon: "✧", breadcrumb: "掃除用品" },
  { id: "profile", label: "マイページ", mobileLabel: "マイページ", icon: "♙", breadcrumb: "マイページ" },
];

/** サイドバー / モバイルナビに出す画面 */
export const MENU_PAGES = PAGES.filter((p) => !p.parent);

export const pageMeta = (id: PageId): PageMeta => PAGES.find((p) => p.id === id) ?? PAGES[0];

/** メニューで選択中にする画面ID（子画面なら親） */
export const menuPageOf = (id: PageId): PageId => pageMeta(id).parent ?? id;
