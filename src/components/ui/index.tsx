import type { CSSProperties, ReactNode } from "react";

/** 進捗バー（value: 0〜1） */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const style: CSSProperties = { width: `${Math.min(1, Math.max(0, value)) * 100}%` };
  if (color) style.background = color;
  return (
    <div className="bar">
      <span style={style} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  symbol?: string;
  note?: string;
}

export function StatCard({ label, value, symbol, note }: StatCardProps) {
  return (
    <div className="stat">
      <div className="stat-top">
        {label} {symbol && <span className="symbol">{symbol}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h1 className="section-title">{title}</h1>
      <p className="section-sub">{sub}</p>
    </>
  );
}

interface ModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}

export function Modal({ open, title, onClose, children, actions }: ModalProps) {
  return (
    <div className={`modal-backdrop${open ? " show" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {children}
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`toast${visible ? " show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
