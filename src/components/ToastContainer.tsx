import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { useAppStore, type Toast } from '../store/appStore';

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const isError = toast.type === 'error';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 ${
        isError
          ? 'bg-red-950/95 border-red-500/30 text-red-100'
          : 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100'
      }`}
    >
      {isError
        ? <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
        : <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
      }
      <p className="text-[13px] font-medium leading-snug flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-20 right-4 z-[200] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] pointer-events-none"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
