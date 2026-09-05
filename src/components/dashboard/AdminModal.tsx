import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])';

// Shared admin dialog shell — stripe + serif title, Esc/scrim close,
// focus trap with return-focus, 180ms enter / 120ms exit (off under reduced-motion)
export const AdminModal: React.FC<AdminModalProps> = ({ open, onClose, title, subtitle, children }) => {
  const [render, setRender] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Mount / exit choreography
  useEffect(() => {
    if (open) {
      prevFocus.current = document.activeElement;
      setRender(true);
      setLeaving(false);
      return;
    }
    if (!render) return;
    setLeaving(true);
    const t = window.setTimeout(() => {
      setRender(false);
      setLeaving(false);
    }, 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  // Focus management: autofocus first field, trap Tab, Esc closes, restore on exit
  useEffect(() => {
    if (!render) return;
    const box = boxRef.current;
    if (!box) return;
    const items = () =>
      Array.from<HTMLElement>(box.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
    const first =
      box.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea') ?? items()[0] ?? box;
    first.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      (prevFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [render ]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-stone-950/50 transition-opacity duration-120 ${
          leaving ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`berkas-stripe relative bg-white rounded-2xl border border-editorial-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto outline-none ${
          leaving ? 'opacity-0 scale-[0.97] transition-all duration-120' : 'animate-scale-in'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-editorial-border sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="min-w-0">
            <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-stone-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-all cursor-pointer shrink-0"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
