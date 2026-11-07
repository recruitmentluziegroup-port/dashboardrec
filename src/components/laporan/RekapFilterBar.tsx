import React from 'react';
import { Calendar, Download, Filter, RotateCcw } from 'lucide-react';

export type DatePreset = 'all' | '30d' | '7d' | 'custom';

interface RekapFilterBarProps {
  fromDate: string;
  toDate: string;
  minDate: string;
  maxDate: string;
  activePreset: DatePreset;
  filteredCount: number;
  totalCount: number;
  onPresetSelect: (preset: 'all' | '30d' | '7d') => void;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onReset: () => void;
  onExportCsv: () => void;
}

export const RekapFilterBar: React.FC<RekapFilterBarProps> = ({
  fromDate,
  toDate,
  minDate,
  maxDate,
  activePreset,
  filteredCount,
  totalCount,
  onPresetSelect,
  onFromChange,
  onToChange,
  onReset,
  onExportCsv,
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Quick Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-bold mr-1">
            <Filter className="h-3.5 w-3.5 text-brand-700" />
            <span>Periode:</span>
          </div>
          <button
            type="button"
            onClick={() => onPresetSelect('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activePreset === 'all'
                ? 'bg-brand-700 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => onPresetSelect('30d')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activePreset === '30d'
                ? 'bg-brand-700 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            30 hari terakhir
          </button>
          <button
            type="button"
            onClick={() => onPresetSelect('7d')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activePreset === '7d'
                ? 'bg-brand-700 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            7 hari terakhir
          </button>
        </div>

        {/* Center/Right: Date Pickers & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-stone-50 border border-editorial-border px-2.5 py-1.5 rounded-xl text-xs">
            <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <input
              type="date"
              aria-label="Tanggal awal periode"
              value={fromDate}
              min={minDate}
              max={toDate || maxDate}
              onChange={(e) => onFromChange(e.target.value)}
              className="bg-transparent font-medium text-stone-800 text-xs focus:outline-none cursor-pointer"
            />
            <span className="text-stone-400 font-bold">—</span>
            <input
              type="date"
              aria-label="Tanggal akhir periode"
              value={toDate}
              min={fromDate || minDate}
              max={maxDate}
              onChange={(e) => onToChange(e.target.value)}
              className="bg-transparent font-medium text-stone-800 text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {(activePreset !== 'all' || fromDate || toDate) && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
              title="Reset filter periode ke Semua"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCsv}
            disabled={filteredCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-editorial-border rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs ml-auto sm:ml-0"
            title="Unduh data tabel rekap yang sedang terfilter dalam format CSV"
          >
            <Download className="h-3.5 w-3.5 text-brand-700" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-label info */}
      <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium pt-1 border-t border-stone-100">
        <span>
          Menampilkan <strong className="text-stone-800 font-bold">{filteredCount}</strong> dari {totalCount} hari laporan
        </span>
        {fromDate && toDate && (
          <span className="text-stone-400 font-mono text-[10px]">
            Rentang: {fromDate} s.d. {toDate}
          </span>
        )}
      </div>
    </div>
  );
};
