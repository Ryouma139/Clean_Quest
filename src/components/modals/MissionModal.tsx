import { useEffect, useRef, useState } from "react";
import * as api from "../../api/cleanQuest";
import { toJaError } from "../../lib/errors";
import type { Mission, MissionPhotos } from "../../types";
import { resizeImage } from "../../utils/image";
import { PhotoPicker, type PhotoValue } from "../PhotoPicker";
import { Modal } from "../ui";

type Step = "before" | "checklist" | "after";
type Slot = "before" | "after";

const STEPS: { id: Step; label: string }[] = [
  { id: "before", label: "掃除前" },
  { id: "checklist", label: "チェック" },
  { id: "after", label: "掃除後" },
];

interface Props {
  open: boolean;
  mission: Mission;
  userId: string;
  onClose: () => void;
  /** 完了。成功したら true（写真はミッションの記録に紐づく） */
  onComplete: (photos: MissionPhotos) => Promise<boolean>;
  onError: (message: string) => void;
}

/**
 * 掃除ミッションの実行ダイアログ。
 * ① 掃除前の写真 → ② チェックリスト → ③ 掃除後の写真 → 完了
 * 写真は任意。選んだ時点でアップロードし、中断したら削除する。
 */
export function MissionModal({ open, mission, userId, onClose, onComplete, onError }: Props) {
  const [step, setStep] = useState<Step>("before");
  const [checked, setChecked] = useState<boolean[]>(() => mission.steps.map(() => false));
  const [photos, setPhotos] = useState<Record<Slot, PhotoValue | null>>({ before: null, after: null });
  const [uploading, setUploading] = useState<Slot | null>(null);
  const [completing, setCompleting] = useState(false);
  const completed = useRef(false);
  const allChecked = checked.length === 0 || checked.every(Boolean);

  // プレビュー用URLの後片付け
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => {
    for (const p of Object.values(photosRef.current)) if (p) URL.revokeObjectURL(p.preview);
  }, []);

  const selectPhoto = async (slot: Slot, file: File) => {
    setUploading(slot);
    try {
      const image = await resizeImage(file);
      const path = await api.uploadPhoto(userId, image, slot);
      const old = photos[slot];
      if (old) {
        URL.revokeObjectURL(old.preview);
        api.deletePhotos([old.path]).catch(() => {});
      }
      setPhotos((prev) => ({ ...prev, [slot]: { path, preview: URL.createObjectURL(image) } }));
    } catch (e) {
      onError(toJaError(e));
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = (slot: Slot) => {
    const p = photos[slot];
    if (!p) return;
    URL.revokeObjectURL(p.preview);
    api.deletePhotos([p.path]).catch(() => {});
    setPhotos((prev) => ({ ...prev, [slot]: null }));
  };

  /** 中断：アップロード済みの写真は消してから閉じる */
  const abort = () => {
    if (!completed.current) {
      const paths = [photos.before?.path, photos.after?.path].filter((p): p is string => !!p);
      api.deletePhotos(paths).catch(() => {});
    }
    onClose();
  };

  const complete = async () => {
    setCompleting(true);
    const ok = await onComplete({ before: photos.before?.path ?? null, after: photos.after?.path ?? null });
    setCompleting(false);
    if (ok) completed.current = true;
  };

  const busy = uploading !== null || completing;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const actions = {
    before: (
      <>
        <button className="secondary" onClick={abort} disabled={busy}>中断する</button>
        <button className="primary" onClick={() => setStep("checklist")} disabled={busy}>
          {photos.before ? "掃除をはじめる" : "画像なしで進む"}
        </button>
      </>
    ),
    checklist: (
      <>
        <button className="secondary" onClick={() => setStep("before")} disabled={busy}>戻る</button>
        <button className="primary" onClick={() => setStep("after")} disabled={!allChecked}>次へ</button>
      </>
    ),
    after: (
      <>
        <button className="secondary" onClick={() => setStep("checklist")} disabled={busy}>戻る</button>
        <button className="primary" onClick={complete} disabled={busy}>
          {completing ? "記録中…" : "掃除を完了する"}
        </button>
      </>
    ),
  }[step];

  return (
    <Modal open={open} title={mission.name} onClose={busy ? () => {} : abort} actions={actions}>
      <ol className="mission-steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={i === stepIndex ? "current" : i < stepIndex ? "done" : ""}>
            <span>{i < stepIndex ? "✓" : i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {step === "before" && (
        <>
          <p className="muted">掃除前の様子の画像を追加しましょう。あとで掃除後と見比べられます。（任意）</p>
          <PhotoPicker
            label="掃除前の画像"
            value={photos.before}
            uploading={uploading === "before"}
            onSelect={(f) => selectPhoto("before", f)}
            onRemove={() => removePhoto("before")}
          />
        </>
      )}

      {step === "checklist" && (
        <>
          <p className="muted">{mission.comment}（目安：{mission.time}）</p>
          {mission.steps.map((s, i) => (
            <label key={s} className="mission-step">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
              />{" "}
              {s}
            </label>
          ))}
        </>
      )}

      {step === "after" && (
        <>
          <p className="muted">おつかれさまでした！ きれいになった様子の画像を追加しましょう。（任意）</p>
          <div className={photos.before ? "photo-compare" : undefined}>
            {photos.before && (
              <figure className="photo-figure">
                <img src={photos.before.preview} alt="掃除前" />
                <figcaption>掃除前</figcaption>
              </figure>
            )}
            <PhotoPicker
              label="掃除後の画像"
              value={photos.after}
              uploading={uploading === "after"}
              onSelect={(f) => selectPhoto("after", f)}
              onRemove={() => removePhoto("after")}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
