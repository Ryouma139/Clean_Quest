import { useState } from "react";
import { Modal } from "../ui";

/** フォームの1項目の定義 */
export type FieldDef =
  | { key: string; label: string; type: "text" | "textarea" | "emoji"; required?: boolean; placeholder?: string; maxLength?: number; help?: string }
  | { key: string; label: string; type: "url"; placeholder?: string; help?: string }
  | { key: string; label: string; type: "number"; required?: boolean; min?: number; help?: string }
  | { key: string; label: string; type: "select"; required?: boolean; options: { value: string; label: string }[]; help?: string }
  | { key: string; label: string; type: "checkbox"; help?: string };

export type FormValues = Record<string, string | boolean>;
export type Payload = Record<string, string | number | boolean | null>;

/** 入力値を DB に送る形に変換する。エラーがあればメッセージを返す */
export function toPayload(fields: FieldDef[], values: FormValues): { payload: Payload } | { error: string } {
  const payload: Payload = {};
  for (const f of fields) {
    const raw = values[f.key];
    if (f.type === "checkbox") {
      payload[f.key] = raw === true;
      continue;
    }
    const s = String(raw ?? "").trim();
    if ("required" in f && f.required && !s) return { error: `「${f.label}」を入力してください` };
    if (f.type === "url") {
      if (s && !/^https:\/\//i.test(s)) return { error: `「${f.label}」は https:// で始まるURLを入力してください` };
      payload[f.key] = s || null;
    } else if (f.type === "number") {
      const n = Number(s || 0);
      if (!Number.isInteger(n)) return { error: `「${f.label}」は整数で入力してください` };
      if (f.min !== undefined && n < f.min) return { error: `「${f.label}」は ${f.min} 以上にしてください` };
      payload[f.key] = n;
    } else {
      payload[f.key] = s;
    }
  }
  return { payload };
}

interface Props {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initial: FormValues;
  onClose: () => void;
  /** 成功したら true（ダイアログを閉じるのは呼び出し側） */
  onSubmit: (payload: Payload) => Promise<boolean>;
  onError: (message: string) => void;
}

/** 管理画面の追加・編集フォーム（項目定義から自動で作る） */
export function AdminForm({ open, title, fields, initial, onClose, onSubmit, onError }: Props) {
  const [values, setValues] = useState<FormValues>(initial);
  const [saving, setSaving] = useState(false);
  const set = (key: string, v: string | boolean) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    const result = toPayload(fields, values);
    if ("error" in result) {
      onError(result.error);
      return;
    }
    setSaving(true);
    await onSubmit(result.payload);
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="secondary" onClick={onClose}>キャンセル</button>
          <button className="primary" onClick={submit} disabled={saving}>{saving ? "保存中…" : "保存する"}</button>
        </>
      }
    >
      {fields.map((f) => {
        const id = `admin-${f.key}`;
        const v = values[f.key];
        const req = "required" in f && f.required ? <span className="required-mark"> *</span> : null;
        let input;
        switch (f.type) {
          case "checkbox":
            return (
              <label key={f.key} className="admin-check">
                <input type="checkbox" checked={v === true} onChange={(e) => set(f.key, e.target.checked)} /> {f.label}
                {f.help && <span className="field-help">{f.help}</span>}
              </label>
            );
          case "textarea":
            input = <textarea id={id} rows={2} maxLength={f.maxLength} placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />;
            break;
          case "select":
            input = (
              <select id={id} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">選択してください</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
            break;
          case "number":
            input = <input id={id} type="number" min={f.min} step={1} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />;
            break;
          case "url":
            input = <input id={id} type="url" inputMode="url" placeholder={f.placeholder ?? "https://"} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />;
            break;
          default:
            input = (
              <input
                id={id}
                className={f.type === "emoji" ? "emoji-input" : undefined}
                maxLength={f.type === "emoji" ? 8 : f.maxLength}
                placeholder={f.placeholder}
                value={String(v ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            );
        }
        return (
          <div key={f.key} className="field">
            <label htmlFor={id}>{f.label}{req}</label>
            {input}
            {f.help && <span className="field-help">{f.help}</span>}
          </div>
        );
      })}
    </Modal>
  );
}
