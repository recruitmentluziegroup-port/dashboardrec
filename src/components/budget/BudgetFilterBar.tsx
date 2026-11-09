import React from 'react';
import { Search, RotateCcw, Filter, Archive } from 'lucide-react';
import { SUMBER_OPTIONS } from '../../types';

interface BudgetFilterBarProps {
  month: string;
  availableMonths: { value: string; label: string }[];
  onMonthChange: (m: string) => void;
  channel: string;
  onChannelChange: (c: string) => void;
  posisi: string;
  availablePositions: string[];
  onPosisiChange: (p: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tampilkanArsip: boolean;
  onToggleArsip: (val: boolean) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export const BudgetFilterBar: React.FC<BudgetFilterBarProps> = ({
  month,
  availableMonths,
  onMonthChange,
  channel,
  onChannelChange,
  posisi,
  availablePositions,
  onPosisiChange,
  searchQuery,
  onSearchChange,
  tampilkanArsip,
  onToggleArsip,
  onReset,
  hasActiveFilters,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 sm:p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Search */}
        <div>
          <label htmlFor="budget-search" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1.5">
            Cari Iklan
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              id="budget-search"
              type="text"
              placeholder="Nama media, kode lacak, catatan..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-stone-50 border border-editorial-border rounded-(--radius-input) pl-9 pr-3 py-2 text-xs outline-none focus:border-brand-700 min-h-[40px] text-stone-900"
            />
          </div>
        </div>

        {/* Filter Bulan */}
        <div>
          <label htmlFor="budget-month" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1.5">
            Periode Bulan
          </label>
          <select
            id="budget-month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full bg-stone-50 border border-editorial-border rounded-(--radius-input) px-3 py-2 text-xs outline-none focus:border-brand-700 min-h-[40px] text-stone-900 cursor-pointer"
          >
            <option value="all">Semua Bulan</option>
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Channel */}
        <div>
          <label htmlFor="budget-channel" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1.5">
            Channel
          </label>
          <select
            id="budget-channel"
            value={channel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="w-full bg-stone-50 border border-editorial-border rounded-(--radius-input) px-3 py-2 text-xs outline-none focus:border-brand-700 min-h-[40px] text-stone-900 cursor-pointer"
          >
            <option value="">Semua Channel</option>
            {SUMBER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Posisi */}
        <div>
          <label htmlFor="budget-pos" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1.5">
            Posisi Lowongan
          </label>
          <select
            id="budget-pos"
            value={posisi}
            onChange={(e) => onPosisiChange(e.target.value)}
            className="w-full bg-stone-50 border border-editorial-border rounded-(--radius-input) px-3 py-2 text-xs outline-none focus:border-brand-700 min-h-[40px] text-stone-900 cursor-pointer"
          >
            <option value="">Semua Posisi</option>
            {availablePositions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Secondary Bar: Toggle Arsip & Reset Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={tampilkanArsip}
            onChange={(e) => onToggleArsip(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-700 cursor-pointer"
          />
          <span className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5 text-stone-400" />
            Tampilkan iklan yang diarsipkan
          </span>
        </label>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>
    </div>
  );
};
