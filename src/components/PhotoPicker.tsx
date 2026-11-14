import { useRef, useState } from "react";

export interface PhotoValue {
  /** Storage 上のパス */
  path: string;
  /** 画面表示用のプレビューURL（端末内） */
  preview: string;
}

interface Props {
  label: string;
  value: PhotoValue | null;
  uploading: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

/** 画像ファイルの追加欄（クリックでファイル選択、またはドラッグ＆ドロップ） */
export function PhotoPicker({ label, value, uploading, onSelect, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = () => input.current?.click();
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !uploading) onSelect(file);
  };

  return (
    <div
      className="photo-picker"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = ""; // 同じファイルを選び直せるように
        }}
      />
      {value ? (
        <div className={`photo-preview${dragging ? " dragging" : ""}`}>
          <img src={value.preview} alt={label} />
          <div className="photo-actions">
            <button type="button" className="secondary small" onClick={pick} disabled={uploading}>
              {uploading ? "アップロード中…" : "画像を変更"}
            </button>
            <button type="button" className="secondary small danger" onClick={onRemove} disabled={uploading}>削除</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`photo-empty${dragging ? " dragging" : ""}`} onClick={pick} disabled={uploading}>
          <span className="photo-empty-icon">🖼️</span>
          <span>{uploading ? "アップロード中…" : `${label}を追加`}</span>
          {!uploading && <span className="photo-empty-hint">クリックしてファイルを選択、またはここにドラッグ＆ドロップ（JPEG / PNG / WebP）</span>}
        </button>
      )}
    </div>
  );
}
