import React from 'react';

interface AdminEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
  meta?: string;
  compact?: boolean;
}

// Single empty/error kit for admin — stripe + serif title + formal-ID voice
export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  tone = 'neutral',
  meta,
  compact = false,
}) => {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={`berkas-stripe bg-white rounded-2xl border ${
        tone === 'error' ? 'border-red-200' : 'border-editorial-border'
      } shadow-sm text-center space-y-3 ${compact ? 'py-10 px-6' : 'py-14 px-6'}`}
    >
      <div
        className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto border ${
          tone === 'error'
            ? 'bg-red-50 text-editorial-red border-red-200'
            : 'bg-brand-50 text-brand-700 border-brand-200'
        }`}
      >
        {icon}
      </div>
      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="font-serif font-black text-base text-stone-900 tracking-tight">{title}</h3>
        <p className="text-xs text-stone-500 font-medium leading-relaxed">{body}</p>
        {meta && <p className="text-[10px] text-stone-400 font-semibold">{meta}</p>}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2.5 min-h-[44px] bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
