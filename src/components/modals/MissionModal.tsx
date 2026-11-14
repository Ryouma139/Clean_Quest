import { useState } from "react";
import type { Mission } from "../../types";
import { Modal } from "../ui";

interface Props {
  open: boolean;
  mission: Mission;
  onClose: () => void;
  onComplete: () => void;
}

/** 掃除ミッションのチェックリスト。全項目チェックで完了ボタンが有効になる。 */
export function MissionModal({ open, mission, onClose, onComplete }: Props) {
  const [checked, setChecked] = useState<boolean[]>(() => mission.steps.map(() => false));
  const allDone = checked.length > 0 && checked.every(Boolean);

  return (
    <Modal
      open={open}
      title={mission.name}
      onClose={onClose}
      actions={
        <>
          <button className="secondary" onClick={onClose}>中断する</button>
          <button className="primary" onClick={onComplete} disabled={!allDone}>掃除を完了する</button>
        </>
      }
    >
      <p className="muted">
        {mission.comment}（目安：{mission.time}）
      </p>
      {mission.steps.map((step, i) => (
        <label key={step} className="mission-step">
          <input
            type="checkbox"
            checked={checked[i]}
            onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
          />{" "}
          {step}
        </label>
      ))}
    </Modal>
  );
}
