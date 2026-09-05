import React from 'react';

interface AdminSkeletonProps {
  variant?: 'table' | 'cards';
}

// CLS-safe loading placeholders — replaces bare spinners in admin views
export const AdminSkeleton: React.FC<AdminSkeletonProps> = ({ variant = 'table' }) => {
  if (variant === 'cards') {
    return (
      <div role="status" aria-label="Memuat data dasbor" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="p-5 bg-white rounded-2xl border border-editorial-border space-y-3 animate-pulse"
          >
            <div className="h-3 w-2/3 bg-stone-100 rounded" />
            <div className="h-7 w-1/2 bg-stone-100 rounded" />
            <div className="h-6 w-full bg-stone-100 rounded" />
          </div>
        ))}
        <span className="sr-only">Memuat data dasbor…</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Memuat daftar pelamar"
      className="bg-white rounded-2xl border border-editorial-border overflow-hidden berkas-stripe"
    >
      <div className="px-5 py-4 border-b border-editorial-border">
        <div className="h-4 w-48 bg-stone-100 rounded animate-pulse" aria-hidden="true" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="px-5 py-4 border-b border-stone-100 last:border-0 flex items-center gap-4 animate-pulse"
        >
          <div className="h-9 w-9 rounded-full bg-stone-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-stone-100 rounded" />
            <div className="h-2.5 w-1/4 bg-stone-100 rounded" />
          </div>
          <div className="h-6 w-20 bg-stone-100 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Memuat daftar pelamar…</span>
    </div>
  );
};
