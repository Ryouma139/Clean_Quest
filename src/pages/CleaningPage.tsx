import { useState } from "react";
import { AddTaskModal } from "../components/modals/AddTaskModal";
import { PageHeader } from "../components/ui";
import { useApp } from "../state/AppContext";
import { AREAS, type AreaFilter, type CleaningTask } from "../types";

const FILTERS: AreaFilter[] = ["すべて", ...AREAS];

/** 掃除管理：掃除箇所の一覧・完了切替・登録 */
export function CleaningPage() {
  const { user, toggleTask, addTask, toast } = useApp();
  const [filter, setFilter] = useState<AreaFilter>("すべて");
  const [addOpen, setAddOpen] = useState(false);

  const list = user.tasks.filter((t) => filter === "すべて" || t.area === filter);

  const onToggle = async (t: CleaningTask) => {
    if (await toggleTask(t)) toast(t.done ? "未完了に戻しました" : `掃除を記録しました！ +${t.points} pt`);
  };

  return (
    <>
      <PageHeader title="掃除管理" sub="掃除する場所や頻度を、自分の生活に合わせて設定できます。" />
      <div className="toolbar">
        <div className="filters">
          {FILTERS.map((f) => (
            <button key={f} className={`filter${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <button className="primary" onClick={() => setAddOpen(true)}>＋ 掃除箇所を登録</button>
      </div>

      <div className="task-list">
        {list.length === 0 && <p className="muted">掃除箇所がありません。「＋ 掃除箇所を登録」から追加しましょう。</p>}
        {list.map((t) => (
          <div key={t.id} className="task-item">
            <div className="task-icon">{t.emoji}</div>
            <div className="task-info">
              <strong>{t.area} / {t.name}</strong>
              <p>{t.freq} ・ {t.points} pt</p>
            </div>
            <span className={`badge${t.done ? " done" : ""}`}>{t.done ? "✓ 完了" : "未実施"}</span>
            <button className="secondary small" onClick={() => onToggle(t)}>{t.done ? "戻す" : "完了"}</button>
          </div>
        ))}
      </div>

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onError={toast}
        onSubmit={async (input) => {
          const ok = await addTask(input);
          if (ok) {
            setAddOpen(false);
            toast("掃除箇所を登録しました");
          }
          return ok;
        }}
      />
    </>
  );
}
