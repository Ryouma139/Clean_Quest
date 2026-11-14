import { useState } from "react";
import { AREAS, FREQUENCIES, type Area, type Frequency, type NewTaskInput } from "../../types";
import { Modal } from "../ui";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 成功時 true を返す（成功したらフォームをクリア） */
  onSubmit: (input: NewTaskInput) => Promise<boolean>;
  onError: (message: string) => void;
}

/** 掃除箇所の登録フォーム */
export function AddTaskModal({ open, onClose, onSubmit, onError }: Props) {
  const [name, setName] = useState("");
  const [area, setArea] = useState<Area>("キッチン");
  const [freq, setFreq] = useState<Frequency>("毎日");
  const [points, setPoints] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      onError("掃除箇所名を入力してください");
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit({ name: trimmed, area, freq, points: Math.min(1000, Math.max(1, Number(points) || 30)) });
    setSubmitting(false);
    if (ok) setName("");
  };

  return (
    <Modal
      open={open}
      title="掃除箇所を登録"
      onClose={onClose}
      actions={
        <>
          <button className="secondary" onClick={onClose}>キャンセル</button>
          <button className="primary" onClick={submit} disabled={submitting}>{submitting ? "登録中…" : "登録する"}</button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="newName">掃除箇所名</label>
        <input id="newName" maxLength={50} placeholder="例：電子レンジ" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="newArea">カテゴリー</label>
        <select id="newArea" value={area} onChange={(e) => setArea(e.target.value as Area)}>
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="newFreq">掃除頻度</label>
        <select id="newFreq" value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
          {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="newPoints">獲得ポイント（1〜1000）</label>
        <input id="newPoints" type="number" min={1} max={1000} value={points} onChange={(e) => setPoints(e.target.value)} />
      </div>
    </Modal>
  );
}
