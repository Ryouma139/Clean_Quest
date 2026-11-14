import { useState } from "react";
import type { Profile, ProfileInput } from "../../types";
import { Modal } from "../ui";

/** 選べるアイコン（絵文字）。一覧に無いものは自由入力も可 */
const AVATARS = [
  "🐱", "🐶", "🐰", "🐻", "🐼", "🦊", "🐸", "🐧", "🐨", "🐯", "🦁", "🐹",
  "🐭", "🐮", "🐷", "🐵", "🦄", "🐙", "🐳", "🐥", "🌸", "🌻", "🍀", "⭐",
  "🧹", "🧽", "🫧", "✨", "🏠", "👑", "💎", "🔥",
];
const BIO_MAX = 60;
const NAME_MAX = 30;

interface Props {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  /** 成功したら true */
  onSave: (input: ProfileInput) => Promise<boolean>;
  onError: (message: string) => void;
}

/** プロフィール編集（アイコン・ニックネーム・一言コメント） */
export function ProfileEditModal({ open, profile, onClose, onSave, onError }: Props) {
  const [avatar, setAvatar] = useState(profile.avatar);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = name.trim();
    const a = avatar.trim();
    const b = bio.trim();
    if (!a) return onError("アイコンを選んでください");
    if ([...a].length > 4) return onError("アイコンは絵文字1つにしてください");
    if (!n) return onError("ニックネームを入力してください");
    if (n.length > NAME_MAX) return onError(`ニックネームは${NAME_MAX}文字までです`);
    if (b.length > BIO_MAX) return onError(`一言コメントは${BIO_MAX}文字までです`);
    setSaving(true);
    const ok = await onSave({ avatar: a, name: n, bio: b });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      title="プロフィール編集"
      onClose={saving ? () => {} : onClose}
      actions={
        <>
          <button className="secondary" onClick={onClose} disabled={saving}>キャンセル</button>
          <button className="primary" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存する"}</button>
        </>
      }
    >
      <div className="profile-edit-preview">
        <span className="big-avatar">{avatar || "？"}</span>
        <div>
          <strong>{name.trim() || "ニックネーム"}</strong>
          <p className="muted">{bio.trim() || "一言コメント"}</p>
        </div>
      </div>

      <div className="field">
        <label>アイコン</label>
        <div className="avatar-grid" role="radiogroup" aria-label="アイコン">
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
        <input className="emoji-input" maxLength={8} value={avatar} onChange={(e) => setAvatar(e.target.value)} aria-label="アイコン（自由入力）" />
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
        <span className="field-help">{bio.length} / {BIO_MAX} 文字 ・ ランキングにも表示されます</span>
      </div>
    </Modal>
  );
}
