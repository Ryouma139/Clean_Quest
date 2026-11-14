import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal } from "./ui";

/** 確認ダイアログの内容 */
export interface ConfirmOptions {
  title: string;
  /** 本文（改行や強調などの JSX も可） */
  message?: ReactNode;
  /** 確定ボタンの文字（既定：OK） */
  confirmLabel?: string;
  /** キャンセルボタンの文字（既定：キャンセル） */
  cancelLabel?: string;
  /** 削除など取り消せない操作：確定ボタンを赤にする */
  danger?: boolean;
  /** 入力による確認（例：メールアドレスを入力しないと確定できない） */
  requireText?: {
    label: string;
    /** この文字と一致したら確定できる（前後の空白・英字の大文字小文字は無視） */
    expected: string;
    placeholder?: string;
  };
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface Pending {
  id: number;
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

/**
 * アプリ共通の確認ダイアログ。window.confirm / window.prompt の代わりに使う。
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "ログアウト", message: "ログアウトしますか？" }))) return;
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const nextId = useRef(0);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending((prev) => {
          prev?.resolve(false); // 前の確認が残っていればキャンセル扱い
          return { id: ++nextId.current, options, resolve };
        });
      }),
    [],
  );

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmModal key={pending.id} options={pending.options} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

function ConfirmModal({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const { title, message, confirmLabel = "OK", cancelLabel = "キャンセル", danger, requireText } = options;
  const [text, setText] = useState("");
  const confirmButton = useRef<HTMLButtonElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const matched = !requireText || text.trim().toLowerCase() === requireText.expected.trim().toLowerCase();

  // 開いたら入力欄（または確定ボタン）にフォーカス。Esc でキャンセル
  useEffect(() => {
    (requireText ? textInput.current : confirmButton.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // 開いたときに1回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      open
      className="confirm-backdrop"
      title={title}
      onClose={() => onClose(false)}
      actions={
        <>
          <button className="secondary" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button
            ref={confirmButton}
            className={danger ? "primary danger-fill" : "primary"}
            disabled={!matched}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {message && <div className="confirm-message">{message}</div>}
      {requireText && (
        <div className="field">
          <label htmlFor="confirm-text">{requireText.label}</label>
          <input
            id="confirm-text"
            ref={textInput}
            value={text}
            placeholder={requireText.placeholder}
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matched) onClose(true);
            }}
          />
        </div>
      )}
    </Modal>
  );
}
