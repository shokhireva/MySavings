import { useEffect } from "react";

export type ToastType = "success" | "info" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  info: "ℹ",
  error: "✕",
};

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 3000);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  return (
    <div
      className={`toast toast--${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={() => onClose(toast.id)}
        aria-label="Закрыть"
      >
        ×
      </button>
    </div>
  );
}
