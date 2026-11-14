import { useEffect, useRef, useState } from "react";
import * as api from "../../api/cleanQuest";
import { toJaError } from "../../lib/errors";
import type { Profile, ProfileInput } from "../../types";
import { cropSquare } from "../../utils/image";
import { Avatar } from "../Avatar";
import { Modal } from "../ui";

/** 選べるキャラクター（絵文字）。一覧に無いものは自由入力も可 */
const AVATARS = [
  "🐱", "🐶", "🐰", "🐻", "🐼", "🦊", "🐸", "🐧", "🐨", "🐯", "🦁", "🐹",
  "🐭", "🐮", "🐷", "🐵", "🦄", "🐙", "🐳", "🐥", "🌸", "🌻", "🍀", "⭐",
  "🧹", "🧽", "🫧", "✨", "🏠", "👑", "💎", "🔥",
];
const BIO_MAX = 60;
const NAME_MAX = 30;

type Mode = "emoji" | "image";

interface Props {
  open: boolean;
  profile: Profile;
  userId: string;
  onClose: () => void;
  /** 成功したら true */
  onSave: (input: ProfileInput) => Promise<boolean>;
  onError: (message: string) => void;
}

/**
 * プロフィール編集（アイコン・ニックネーム・一言コメント）。
 * アイコンは「キャラクター（絵文字）」か「画像（アップロード）」を選べる。
 * 画像は選んだ時点でアップロードし、保存しなかった画像・使わなくなった画像は削除する。
 */
export function ProfileEditModal({ open, profile, userId, onClose, onSave, onError }: Props) {
  const [mode, setMode] = useState<Mode>(profile.avatarImage ? "image" : "emoji");
  const [avatar, setAvatar] = useState(profile.avatar);
  const [imagePath, setImagePath] = useState<string | null>(profile.avatarImage);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  /** この編集中にアップロードした画像（保存しなければ削除する） */
  const uploaded = useRef<string[]>([]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const selectFile = async (file: File) => {
    setUploading(true);
    try {
      const image = await cropSquare(file);
      const path = await api.uploadAvatar(userId, image);
      uploaded.current.push(path);
      setImagePath(path);
      setPreview(URL.createObjectURL(image));
      setMode("image");
    } catch (e) {
      onError(toJaError(e));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImagePath(null);
    setPreview(null);
  };

  /** キャンセル：この編集中にアップロードした画像を消して閉じる */
  const cancel = () => {
    api.deleteAvatars(uploaded.current).catch(() => {});
    onClose();
  };

  const save = async () => {
    const n = name.trim();
    const a = avatar.trim();
    const b = bio.trim();
    const finalImage = mode === "image" ? imagePath : null;
    if (mode === "image" && !finalImage) return onError("アイコンにする画像を選んでください");
    if (!a) return onError("キャラクターを選んでください（画像が表示できないときに使います）");
    if ([...a].length > 4) return onError("キャラクターは絵文字1つにしてください");
    if (!n) return onError("ニックネームを入力してください");
    if (n.length > NAME_MAX) return onError(`ニックネームは${NAME_MAX}文字までです`);
    if (b.length > BIO_MAX) return onError(`一言コメントは${BIO_MAX}文字までです`);

    setSaving(true);
    const ok = await onSave({ avatar: a, name: n, bio: b, avatarImage: finalImage });
    setSaving(false);
    if (!ok) return;

    // 使わなくなった画像を削除（前の画像、この編集中に試してやめた画像）
    const unused = [...uploaded.current, ...(profile.avatarImage ? [profile.avatarImage] : [])].filter((p) => p !== finalImage);
    api.deleteAvatars(unused).catch(() => {});
    onClose();
  };

  const busy = uploading || saving;

  return (
    <Modal
      open={open}
      title="プロフィール編集"
      onClose={busy ? () => {} : cancel}
      actions={
        <>
          <button className="secondary" onClick={cancel} disabled={busy}>キャンセル</button>
          <button className="primary" onClick={save} disabled={busy}>{saving ? "保存中…" : "保存する"}</button>
        </>
      }
    >
      <div className="profile-edit-preview">
        <span className="big-avatar">
          <Avatar emoji={avatar || "？"} imagePath={mode === "image" ? imagePath : null} previewUrl={mode === "image" ? preview : null} />
        </span>
        <div>
          <strong>{name.trim() || "ニックネーム"}</strong>
          <p className="muted">{bio.trim() || "一言コメント"}</p>
        </div>
      </div>

      <div className="field">
        <label>アイコン</label>
        <div className="filters avatar-mode">
          <button type="button" className={`filter${mode === "emoji" ? " active" : ""}`} onClick={() => setMode("emoji")}>キャラクター</button>
          <button type="button" className={`filter${mode === "image" ? " active" : ""}`} onClick={() => setMode("image")}>画像</button>
        </div>

        {mode === "emoji" ? (
          <>
            <div className="avatar-grid" role="radiogroup" aria-label="キャラクター">
              {AVATARS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={avatar === e}
                  className={`avatar-choice${avatar === e ? " selected" : ""}`}
                  onClick={() => setAvatar(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <span className="field-help">一覧に無い絵文字は、下の欄に入力できます</span>
            <input className="emoji-input" maxLength={8} value={avatar} onChange={(e) => setAvatar(e.target.value)} aria-label="キャラクター（自由入力）" />
          </>
        ) : (
          <div
            className={`avatar-upload${dragging ? " dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f && !uploading) selectFile(f);
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) selectFile(f);
                e.target.value = "";
              }}
            />
            <span className="avatar-upload-circle">
              <Avatar emoji="🖼️" imagePath={imagePath} previewUrl={preview} />
            </span>
            <div className="avatar-upload-actions">
              <button type="button" className="secondary small" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? "アップロード中…" : imagePath ? "画像を変更" : "画像を選択"}
              </button>
              {imagePath && (
                <button type="button" className="secondary small danger" onClick={removeImage} disabled={uploading}>削除</button>
              )}
              <span className="field-help">ドラッグ＆ドロップでも追加できます。中央を正方形に切り抜きます（JPEG / PNG / WebP）</span>
              <span className="field-help">画像が表示できないときは、キャラクター「{avatar}」を表示します</span>
            </div>
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="profile-name">ニックネーム</label>
        <input id="profile-name" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="profile-bio">一言コメント</label>
        <textarea
          id="profile-bio"
          rows={2}
          maxLength={BIO_MAX}
          placeholder="例：毎朝5分の掃除をがんばっています！"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <span className="field-help">{bio.length} / {BIO_MAX} 文字 ・ アイコン・ニックネームとともにランキングにも表示されます</span>
      </div>
    </Modal>
  );
}
