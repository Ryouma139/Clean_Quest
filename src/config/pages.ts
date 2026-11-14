import type { PageId } from "../types";

export interface PageMeta {
  id: PageId;
  label: string;
  /** モバイルナビ用の短いラベル（未指定ならモバイルナビに出さない） */
  mobileLabel?: string;
  icon: string;
  breadcrumb: string;
}

/** 画面一覧。並び順がサイドバー / モバイルナビの表示順になる */
export const PAGES: PageMeta[] = [
  { id: "home", label: "ホーム", mobileLabel: "ホーム", icon: "⌂", breadcrumb: "ホーム / 今日のミッション" },
  { id: "cleaning", label: "掃除管理", mobileLabel: "掃除管理", icon: "☷", breadcrumb: "掃除管理" },
  { id: "history", label: "掃除履歴", icon: "◷", breadcrumb: "掃除履歴" },
  { id: "rewards", label: "報酬ショップ", mobileLabel: "報酬", icon: "♜", breadcrumb: "報酬ショップ" },
  { id: "tools", label: "掃除用品", mobileLabel: "用品", icon: "✧", breadcrumb: "掃除用品" },
  { id: "profile", label: "マイページ", mobileLabel: "マイページ", icon: "♙", breadcrumb: "マイページ" },
];

export const pageMeta = (id: PageId): PageMeta => PAGES.find((p) => p.id === id) ?? PAGES[0];
