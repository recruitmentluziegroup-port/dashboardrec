import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

type PushToast = (tone: ToastTone, message: string) => void;

const ToastContext = createContext<PushToast>(() => {});

export const useToast = () => useContext(ToastContext);

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'bg-green-50 text-editorial-green border-green-200',
  error: 'bg-red-50 text-editorial-red border-red-200',
  info: 'bg-brand-50 text-brand-700 border-brand-200',
};

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback<PushToast>((tone, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, tone, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="no-print fixed bottom-5 right-5 z-[200] flex flex-col gap-2 w-[calc(100vw-2.5rem)] max-w-xs"
      >
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              className={`berkas-stripe flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg ${TONE_CLASS[t.tone]}`}
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="p-1 -m-1 hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Destructive-only confirm — non-blocking replacement for native confirm()
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirmLabel = 'Hapus',
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/50" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="berkas-stripe relative bg-white rounded-2xl border border-editorial-border shadow-xl p-6 w-full max-w-sm space-y-4 animate-scale-in"
      >
        <div className="space-y-1.5">
          <h3 className="font-serif font-black text-base text-stone-900 tracking-tight">{title}</h3>
          <p className="text-xs text-stone-500 font-medium leading-relaxed">{body}</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            autoFocus
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl bg-editorial-red text-white hover:opacity-90 transition-all cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
