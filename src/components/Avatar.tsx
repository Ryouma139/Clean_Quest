import { useState } from "react";
import { avatarUrl } from "../api/cleanQuest";

interface Props {
  /** キャラクター（絵文字）。画像が無い・読み込めないときに表示 */
  emoji: string;
  /** アイコン画像（Storage: avatars 内のパス） */
  imagePath?: string | null;
  /** 端末内のプレビューURL（アップロード直後の表示用。imagePath より優先） */
  previewUrl?: string | null;
  alt?: string;
}

/** プロフィールアイコン：画像があれば画像、無ければ絵文字。大きさと形は親要素に合わせる */
export function Avatar({ emoji, imagePath, previewUrl, alt = "" }: Props) {
  const src = previewUrl ?? (imagePath ? avatarUrl(imagePath) : null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <span className="avatar-content">{emoji}</span>;
  return (
    <span className="avatar-content">
      <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} />
    </span>
  );
}
