import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as admin from "../api/admin";
import type { RewardItemRow, RewardRow, ToolRow } from "../api/admin";
import { AdminUsers } from "../components/admin/AdminUsers";
import { useConfirm } from "../components/ConfirmDialog";
import { AdminForm, type FieldDef, type FormValues, type Payload } from "../components/admin/AdminForm";
import { PageHeader, ProductImage } from "../components/ui";
import type { TablesInsert, TablesUpdate } from "../lib/database.types";
import { toJaError } from "../lib/errors";
import { useApp } from "../state/AppContext";
import { formatPoints } from "../utils/format";

type Tab = "tools" | "rewards" | "items" | "users";
type EditKind = Exclude<Tab, "users">;
type Editing =
  | { kind: "tools"; row: ToolRow | null; initial: FormValues }
  | { kind: "rewards"; row: RewardRow | null; initial: FormValues }
  | { kind: "items"; row: RewardItemRow | null; initial: FormValues };

// ---------- 入力項目 ----------

const COMMON_TAIL: FieldDef[] = [
  { key: "sort_order", label: "表示順", type: "number", min: 0, help: "小さいほど先に表示されます" },
  { key: "is_active", label: "公開する", type: "checkbox", help: "オフにするとユーザーには表示されません" },
];
const LINK_FIELDS: FieldDef[] = [
  { key: "image_url", label: "画像URL", type: "url", help: "空なら絵文字を表示します" },
  { key: "affiliate_url", label: "アフィリエイトリンク", type: "url", help: "空なら「商品リンク準備中」と表示します" },
];

const TOOL_FIELDS: FieldDef[] = [
  { key: "name", label: "商品名", type: "text", required: true, maxLength: 60 },
  { key: "category", label: "カテゴリー", type: "text", required: true, placeholder: "例：拭き掃除", maxLength: 20 },
  { key: "description", label: "説明", type: "textarea", required: true, maxLength: 100 },
  { key: "emoji", label: "絵文字", type: "emoji", required: true },
  ...LINK_FIELDS,
  ...COMMON_TAIL,
];

const REWARD_FIELDS: FieldDef[] = [
  { key: "points", label: "必要ポイント", type: "number", required: true, min: 1 },
  { key: "name", label: "報酬名", type: "text", required: true, maxLength: 30 },
  { key: "description", label: "説明", type: "textarea", required: true, maxLength: 100 },
  { key: "emoji", label: "絵文字", type: "emoji", required: true },
  ...COMMON_TAIL,
];

const itemFields = (rewards: RewardRow[]): FieldDef[] => [
  {
    key: "reward_id",
    label: "ポイント枠（報酬）",
    type: "select",
    required: true,
    options: rewards.map((r) => ({ value: r.id, label: `${formatPoints(r.points)} pt ・ ${r.emoji} ${r.name}` })),
    help: "交換したときに、この枠の商品として表示されます",
  },
  { key: "name", label: "商品名", type: "text", required: true, maxLength: 60 },
  { key: "description", label: "説明", type: "textarea", maxLength: 100 },
  { key: "emoji", label: "絵文字", type: "emoji", required: true },
  ...LINK_FIELDS,
  ...COMMON_TAIL,
];

const DEFAULTS: Record<EditKind, FormValues> = {
  tools: { emoji: "🧽", sort_order: "0", is_active: true },
  rewards: { emoji: "🎁", sort_order: "0", is_active: true },
  items: { emoji: "🎁", sort_order: "0", is_active: true },
};

/** DB の行をフォームの値にする */
function toValues(fields: FieldDef[], row: Record<string, unknown>): FormValues {
  const v: FormValues = {};
  for (const f of fields) v[f.key] = f.type === "checkbox" ? row[f.key] === true : row[f.key] == null ? "" : String(row[f.key]);
  return v;
}

// ---------- 画面 ----------

/** 管理画面：掃除用品・報酬（ポイント枠）・ご褒美商品の追加・編集・削除 */
export function AdminPage() {
  const { user, toast, reloadMasters } = useApp();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("tools");
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [items, setItems] = useState<RewardItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [itemFilter, setItemFilter] = useState<string>("");
  const [userCount, setUserCount] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [t, r, i] = await Promise.all([admin.listTools(), admin.listRewards(), admin.listRewardItems()]);
      setTools(t);
      setRewards(r);
      setItems(i);
    } catch (e) {
      toast(toJaError(e));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user.isAdmin) loadAll();
  }, [user.isAdmin, loadAll]);

  const itemFieldDefs = useMemo(() => itemFields(rewards), [rewards]);

  if (!user.isAdmin) {
    return (
      <>
        <PageHeader title="管理画面" sub="この画面は管理者だけが使えます。" />
        <div className="card muted">管理者として登録されていません。</div>
      </>
    );
  }

  /** 書き込み → 一覧とアプリのマスタを取り直す */
  const run = async (fn: () => Promise<void>, message: string): Promise<boolean> => {
    try {
      await fn();
      await Promise.all([loadAll(), reloadMasters()]);
      toast(message);
      return true;
    } catch (e) {
      toast(toJaError(e));
      return false;
    }
  };

  const open = (e: Editing) => {
    setFormKey((k) => k + 1); // フォームの入力値を作り直す
    setEditing(e);
  };
  const openTool = (row: ToolRow | null) =>
    open({ kind: "tools", row, initial: row ? toValues(TOOL_FIELDS, row) : DEFAULTS.tools });
  const openReward = (row: RewardRow | null) =>
    open({ kind: "rewards", row, initial: row ? toValues(REWARD_FIELDS, row) : DEFAULTS.rewards });
  const openItem = (row: RewardItemRow | null, rewardId = "") =>
    open({ kind: "items", row, initial: row ? toValues(itemFieldDefs, row) : { ...DEFAULTS.items, reward_id: rewardId } });

  const save = async (payload: Payload): Promise<boolean> => {
    if (!editing) return false;
    const p = payload as unknown;
    let ok: boolean;
    switch (editing.kind) {
      case "tools":
        ok = await run(
          () => (editing.row ? admin.updateTool(editing.row.id, p as TablesUpdate<"cleaning_tools">) : admin.insertTool(p as TablesInsert<"cleaning_tools">)),
          editing.row ? "掃除用品を更新しました" : "掃除用品を追加しました",
        );
        break;
      case "rewards":
        ok = await run(
          () => (editing.row ? admin.updateReward(editing.row.id, p as TablesUpdate<"rewards">) : admin.insertReward(p as TablesInsert<"rewards">)),
          editing.row ? "ポイント枠を更新しました" : "ポイント枠を追加しました",
        );
        break;
      case "items":
        ok = await run(
          () => (editing.row ? admin.updateRewardItem(editing.row.id, p as TablesUpdate<"reward_items">) : admin.insertRewardItem(p as TablesInsert<"reward_items">)),
          editing.row ? "ご褒美商品を更新しました" : "ご褒美商品を追加しました",
        );
        break;
    }
    if (ok) setEditing(null);
    return ok;
  };

  const remove = async (label: string, fn: () => Promise<void>, extra = "") => {
    const ok = await confirm({
      title: "削除の確認",
      danger: true,
      confirmLabel: "削除する",
      message: (
        <>
          <p>「<strong>{label}</strong>」を削除しますか？</p>
          {extra && <p className="confirm-warning">{extra.trim()}</p>}
          <p className="muted">この操作は取り消せません。非表示にするだけなら「公開する」をオフにしてください。</p>
        </>
      ),
    });
    if (ok) run(fn, `「${label}」を削除しました`);
  };

  const itemCount = (rewardId: string) => items.filter((i) => i.reward_id === rewardId).length;
  const visibleRewards = itemFilter ? rewards.filter((r) => r.id === itemFilter) : rewards;

  const formFields = editing?.kind === "tools" ? TOOL_FIELDS : editing?.kind === "rewards" ? REWARD_FIELDS : itemFieldDefs;
  const formTitle = editing
    ? `${editing.row ? "編集" : "追加"}：${editing.kind === "tools" ? "掃除用品" : editing.kind === "rewards" ? "ポイント枠（報酬）" : "ご褒美商品"}`
    : "";

  return (
    <>
      <PageHeader title="管理画面" sub="掃除用品・報酬ショップの項目を追加・編集できます。変更はすぐにユーザーの画面に反映されます。" />

      <div className="filters admin-tabs">
        <button className={`filter${tab === "tools" ? " active" : ""}`} onClick={() => setTab("tools")}>掃除用品（{tools.length}）</button>
        <button className={`filter${tab === "rewards" ? " active" : ""}`} onClick={() => setTab("rewards")}>ポイント枠（{rewards.length}）</button>
        <button className={`filter${tab === "items" ? " active" : ""}`} onClick={() => setTab("items")}>ご褒美商品（{items.length}）</button>
        <button className={`filter${tab === "users" ? " active" : ""}`} onClick={() => setTab("users")}>ユーザー{userCount !== null ? `（${userCount}）` : ""}</button>
      </div>

      {loading && <p className="muted">読み込み中…</p>}

      {!loading && tab === "tools" && (
        <section>
          <div className="toolbar">
            <span className="muted admin-note">掃除用品の画面とホームの「おすすめ」に表示されます。</span>
            <button className="primary" onClick={() => openTool(null)}>＋ 掃除用品を追加</button>
          </div>
          <div className="admin-list">
            {tools.length === 0 && <p className="muted">まだ登録されていません。</p>}
            {tools.map((t) => (
              <AdminRow
                key={t.id}
                thumb={<ProductImage src={t.image_url} alt={t.name} emoji={t.emoji} />}
                title={t.name}
                meta={`${t.category} ・ 表示順 ${t.sort_order}`}
                badges={<LinkBadges active={t.is_active} hasImage={!!t.image_url} hasLink={!!t.affiliate_url} />}
                actions={
                  <>
                    <button className="secondary small" onClick={() => openTool(t)}>編集</button>
                    <button className="secondary small danger" onClick={() => remove(t.name, () => admin.deleteTool(t.id))}>削除</button>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "rewards" && (
        <section>
          <div className="toolbar">
            <span className="muted admin-note">報酬ショップに並ぶ交換品です。ポイントの低い順に表示されます。</span>
            <button className="primary" onClick={() => openReward(null)}>＋ ポイント枠を追加</button>
          </div>
          <div className="admin-list">
            {rewards.length === 0 && <p className="muted">まだ登録されていません。</p>}
            {rewards.map((r) => (
              <AdminRow
                key={r.id}
                thumb={r.emoji}
                title={<><span className="admin-points">{formatPoints(r.points)} pt</span>{r.name}</>}
                meta={`${r.description} ・ 商品 ${itemCount(r.id)} 件`}
                badges={!r.is_active && <span className="badge">非公開</span>}
                actions={
                  <>
                    <button className="soft small" onClick={() => openItem(null, r.id)}>＋ 商品</button>
                    <button className="secondary small" onClick={() => openReward(r)}>編集</button>
                    <button
                      className="secondary small danger"
                      onClick={() => remove(r.name, () => admin.deleteReward(r.id), `\nこの枠のご褒美商品（${itemCount(r.id)}件）も一緒に削除されます。`)}
                    >
                      削除
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "items" && (
        <section>
          <div className="toolbar">
            <select className="admin-select" value={itemFilter} onChange={(e) => setItemFilter(e.target.value)}>
              <option value="">すべてのポイント枠</option>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>{formatPoints(r.points)} pt ・ {r.emoji} {r.name}</option>
              ))}
            </select>
            <button className="primary" onClick={() => openItem(null, itemFilter)} disabled={rewards.length === 0}>＋ ご褒美商品を追加</button>
          </div>
          {rewards.length === 0 && <p className="muted">先に「ポイント枠」を追加してください。</p>}
          {visibleRewards.map((r) => {
            const list = items.filter((i) => i.reward_id === r.id);
            return (
              <div key={r.id} className="admin-group">
                <div className="admin-group-head">
                  <h2>
                    <span className="admin-points">{formatPoints(r.points)} pt</span>
                    {r.emoji} {r.name}
                    {!r.is_active && <span className="badge">非公開</span>}
                  </h2>
                  <button className="soft small" onClick={() => openItem(null, r.id)}>＋ この枠に商品を追加</button>
                </div>
                <div className="admin-list">
                  {list.length === 0 && <p className="muted">この枠の商品はまだありません。</p>}
                  {list.map((i) => (
                    <AdminRow
                      key={i.id}
                      thumb={<ProductImage src={i.image_url} alt={i.name} emoji={i.emoji} />}
                      title={i.name}
                      meta={`${i.description || "（説明なし）"} ・ 表示順 ${i.sort_order}`}
                      badges={<LinkBadges active={i.is_active} hasImage={!!i.image_url} hasLink={!!i.affiliate_url} />}
                      actions={
                        <>
                          <button className="secondary small" onClick={() => openItem(i)}>編集</button>
                          <button className="secondary small danger" onClick={() => remove(i.name, () => admin.deleteRewardItem(i.id))}>削除</button>
                        </>
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {tab === "users" && <AdminUsers onCountChange={setUserCount} />}

      {editing && (
        <AdminForm
          key={formKey}
          open
          title={formTitle}
          fields={formFields}
          initial={editing.initial}
          onClose={() => setEditing(null)}
          onSubmit={save}
          onError={toast}
        />
      )}
    </>
  );
}

function AdminRow({ thumb, title, meta, badges, actions }: { thumb: ReactNode; title: ReactNode; meta: string; badges?: ReactNode; actions: ReactNode }) {
  return (
    <div className="admin-row">
      <div className="admin-thumb">{thumb}</div>
      <div className="admin-row-info">
        <strong>{title}</strong>
        <span className="muted">{meta}</span>
        {badges && <div className="admin-badges">{badges}</div>}
      </div>
      <div className="admin-row-actions">{actions}</div>
    </div>
  );
}

function LinkBadges({ active, hasImage, hasLink }: { active: boolean; hasImage: boolean; hasLink: boolean }) {
  return (
    <>
      {!active && <span className="badge">非公開</span>}
      <span className={`badge${hasImage ? " done" : ""}`}>{hasImage ? "画像あり" : "画像なし"}</span>
      <span className={`badge${hasLink ? " done" : ""}`}>{hasLink ? "リンクあり" : "リンク未設定"}</span>
    </>
  );
}
