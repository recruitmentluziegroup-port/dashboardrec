import React from 'react';
import { Search, RotateCcw, Download, Calendar, Repeat, X, Briefcase } from 'lucide-react';

export interface KandidatFilterState {
  search: string;
  posisi: string;
  status: string;
  fromDate: string;
  toDate: string;
  hanyaUlang: boolean;
}

interface KandidatFilterBarProps {
  filter: KandidatFilterState;
  onFilterChange: (updates: Partial<KandidatFilterState>) => void;
  onReset: () => void;
  onExportCsv: () => void;
  positions: string[];
  statusCounts: Record<string, number>;
  totalCount: number;
  filteredCount: number;
  minDate: string;
  maxDate: string;
}

const STATUS_OPTIONS = [
  'Semua',
  'Belum dinilai',
  'Sesuai',
  'Kurang Sesuai',
  'Tidak Sesuai',
  'Tidak Diverifikasi',
];

export const KandidatFilterBar: React.FC<KandidatFilterBarProps> = ({
  filter,
  onFilterChange,
  onReset,
  onExportCsv,
  positions,
  statusCounts,
  totalCount,
  filteredCount,
  minDate,
  maxDate,
}) => {
  const isFiltered =
    Boolean(filter.search) ||
    Boolean(filter.posisi) ||
    (filter.status !== 'Semua' && Boolean(filter.status)) ||
    Boolean(filter.fromDate) ||
    Boolean(filter.toDate) ||
    filter.hanyaUlang;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-4">
      {/* Top Row: Search Input + Position Dropdown + Date Range + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input (5 cols) */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Cari nama, email, alasan, rekomendasi..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 border border-editorial-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-700 font-medium text-stone-800 placeholder-stone-400"
          />
          {filter.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Position Dropdown (3 cols) */}
        <div className="md:col-span-3 relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
          <select
            value={filter.posisi}
            onChange={(e) => onFilterChange({ posisi: e.target.value })}
            aria-label="Filter berdasarkan posisi"
            className="w-full pl-8 pr-7 py-2 text-xs bg-stone-50 border border-editorial-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-700 font-medium text-stone-800 cursor-pointer appearance-none truncate"
          >
            <option value="">Semua Posisi ({positions.length})</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none text-[10px]">
            ▼
          </span>
        </div>

        {/* Date Range Inputs (3 cols) */}
        <div className="md:col-span-3 flex items-center gap-1.5 bg-stone-50 border border-editorial-border px-2.5 py-1.5 rounded-xl text-xs">
          <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <input
            type="date"
            aria-label="Tanggal awal"
            value={filter.fromDate}
            min={minDate}
            max={filter.toDate || maxDate}
            onChange={(e) => onFilterChange({ fromDate: e.target.value })}
            className="bg-transparent font-medium text-stone-800 text-[11px] focus:outline-none cursor-pointer w-full"
          />
          <span className="text-stone-400 font-bold">—</span>
          <input
            type="date"
            aria-label="Tanggal akhir"
            value={filter.toDate}
            min={filter.fromDate || minDate}
            max={maxDate}
            onChange={(e) => onFilterChange({ toDate: e.target.value })}
            className="bg-transparent font-medium text-stone-800 text-[11px] focus:outline-none cursor-pointer w-full"
          />
        </div>

        {/* Actions (2 cols) */}
        <div className="md:col-span-2 flex items-center gap-2 justify-end">
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
              title="Reset semua filter"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCsv}
            disabled={filteredCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-editorial-border rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs whitespace-nowrap"
            title="Ekspor kandidat yang terfilter ke format CSV"
          >
            <Download className="h-3.5 w-3.5 text-brand-700" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Middle Row: Status Chips & "Hanya Lamaran Ulang" Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1 border-t border-stone-100">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-stone-500 mr-1">Status:</span>
          {STATUS_OPTIONS.map((st) => {
            const isSelected = (!filter.status && st === 'Semua') || filter.status === st;
            const count = statusCounts[st] ?? 0;

            let activeClass = 'bg-stone-100 text-stone-600 hover:bg-stone-200';
            if (isSelected) {
              if (st === 'Sesuai') {
                activeClass = 'bg-green-700 text-white shadow-2xs';
              } else if (st === 'Kurang Sesuai') {
                activeClass = 'bg-amber-600 text-white shadow-2xs';
              } else if (st === 'Tidak Sesuai') {
                activeClass = 'bg-red-700 text-white shadow-2xs';
              } else if (st === 'Tidak Diverifikasi') {
                activeClass = 'bg-slate-700 text-white shadow-2xs';
              } else {
                activeClass = 'bg-brand-700 text-white shadow-2xs';
              }
            }

            return (
              <button
                key={st}
                type="button"
                onClick={() => onFilterChange({ status: st === 'Semua' ? '' : st })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeClass}`}
              >
                <span>{st}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-stone-200/80 text-stone-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toggle Hanya Lamaran Ulang */}
        <button
          type="button"
          onClick={() => onFilterChange({ hanyaUlang: !filter.hanyaUlang })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer self-start lg:self-center ${
            filter.hanyaUlang
              ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
              : 'bg-stone-50 text-stone-600 border-editorial-border hover:bg-stone-100'
          }`}
          title="Tampilkan hanya kandidat yang ditandai lamaran ulang"
        >
          <Repeat className={`h-3.5 w-3.5 ${filter.hanyaUlang ? 'text-amber-700' : 'text-stone-400'}`} />
          <span>Hanya Lamaran Ulang</span>
          {statusCounts['ulang'] !== undefined && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                filter.hanyaUlang ? 'bg-amber-700 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {statusCounts['ulang']}
            </span>
          )}
        </button>
      </div>

      {/* Bottom Summary Bar: "Menampilkan X dari Y kandidat" */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-medium pt-2 border-t border-stone-100">
        <div>
          <span>Menampilkan </span>
          <strong className="text-stone-900 font-bold">{filteredCount}</strong>
          <span> dari </span>
          <strong className="text-stone-900 font-bold">{totalCount}</strong>
          <span> kandidat</span>
          {isFiltered && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Filter aktif
            </span>
          )}
        </div>

        {filter.fromDate && filter.toDate && (
          <span className="text-stone-400 font-mono text-[11px] hidden sm:inline">
            Rentang: {filter.fromDate} s.d. {filter.toDate}
          </span>
        )}
      </div>
    </div>
  );
};
