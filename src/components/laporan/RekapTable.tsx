import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { LaporanRekapItem } from '../../types';

interface RekapTableProps {
  rows: LaporanRekapItem[];
}

type SortField = 'tanggal' | 'total' | 'contentCreator' | 'spvMarketing' | 'adminInvestasi' | 'sesuai';
type SortOrder = 'asc' | 'desc';

function formatIndoDateLong(isoDate: string): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(`${isoDate}T00:00:00`);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export const RekapTable: React.FC<RekapTableProps> = ({ rows }) => {
  const [sortField, setSortField] = useState<SortField>('tanggal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'tanggal') {
        cmp = a.tanggal.localeCompare(b.tanggal);
      } else {
        const valA = (a as any)[sortField] ?? 0;
        const valB = (b as any)[sortField] ?? 0;
        cmp = valA - valB;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortField, sortOrder]);

  // Totals for summary footer
  const summary = useMemo(() => {
    let totalLamaran = 0;
    let cc = 0;
    let spv = 0;
    let admin = 0;
    let sesuai = 0;
    let kurangSesuai = 0;
    let tidakSesuai = 0;
    let tidakDiverifikasi = 0;

    rows.forEach((r) => {
      totalLamaran += r.total || 0;
      cc += r.contentCreator || 0;
      spv += r.spvMarketing || 0;
      admin += r.adminInvestasi || 0;
      if (r.dinilai) {
        sesuai += r.sesuai || 0;
        kurangSesuai += r.kurangSesuai || 0;
        tidakSesuai += r.tidakSesuai || 0;
        tidakDiverifikasi += r.tidakDiverifikasi || 0;
      }
    });

    return { totalLamaran, cc, spv, admin, sesuai, kurangSesuai, tidakSesuai, tidakDiverifikasi };
  }, [rows]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-stone-300 group-hover:text-stone-500 inline ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-brand-700 inline ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-700 inline ml-1" />
    );
  };

  // Helper for rendering numbers with dimmed zero
  const renderNumber = (val: number | undefined, colorClass = 'text-stone-800 font-semibold') => {
    const num = val || 0;
    if (num === 0) {
      return <span className="text-stone-300 font-normal">0</span>;
    }
    return <span className={colorClass}>{num}</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-editorial-border shadow-xs berkas-stripe overflow-hidden space-y-0">
      {/* Table Header Bar */}
      <div className="p-4 sm:p-5 border-b border-editorial-border bg-stone-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">
              Tabel Rekapitulasi Harian
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {rows.length} tanggal
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Rincian jumlah lamaran per posisi kerja dan hasil penilaian kualifikasi CV
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] text-stone-500 font-medium">Urut:</span>
          <button
            type="button"
            onClick={() => handleSort('tanggal')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white text-stone-700 border border-editorial-border rounded-lg shadow-2xs hover:bg-stone-50 transition-all cursor-pointer"
          >
            <Calendar className="h-3 w-3 text-stone-400" />
            <span>Tanggal ({sortOrder === 'desc' ? 'Terbaru' : 'Terlama'})</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-stone-100/70 text-stone-700 font-bold border-b border-editorial-border uppercase tracking-wider text-[10px]">
              <th
                onClick={() => handleSort('tanggal')}
                className="py-3 px-4 cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Tanggal</span>
                  {renderSortIcon('tanggal')}
                </div>
              </th>
              <th
                onClick={() => handleSort('total')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total</span>
                  {renderSortIcon('total')}
                </div>
              </th>
              <th
                onClick={() => handleSort('contentCreator')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Content Creator</span>
                  {renderSortIcon('contentCreator')}
                </div>
              </th>
              <th
                onClick={() => handleSort('spvMarketing')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>SPV Marketing</span>
                  {renderSortIcon('spvMarketing')}
                </div>
              </th>
              <th
                onClick={() => handleSort('adminInvestasi')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Admin Investasi</span>
                  {renderSortIcon('adminInvestasi')}
                </div>
              </th>
              <th
                onClick={() => handleSort('sesuai')}
                className="py-3 px-3 text-right text-editorial-green cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Sesuai</span>
                  {renderSortIcon('sesuai')}
                </div>
              </th>
              <th className="py-3 px-3 text-right text-amber-700 whitespace-nowrap">
                Kurang Sesuai
              </th>
              <th className="py-3 px-3 text-right text-editorial-red whitespace-nowrap">
                Tidak Sesuai
              </th>
              <th className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                Tidak Diverifikasi
              </th>
              <th className="py-3 px-4 text-center whitespace-nowrap">
                Status Evaluasi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-xs text-stone-400 font-bold italic">
                  Tidak ada baris rekap harian yang sesuai filter.
                </td>
              </tr>
            ) : (
              sortedRows.map((r, i) => (
                <tr
                  key={r.tanggal || i}
                  className={`hover:bg-amber-50/30 transition-colors ${
                    !r.dinilai ? 'bg-stone-50/40' : ''
                  }`}
                >
                  {/* Tanggal (Indo formatted + ISO) */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-stone-900">
                      {formatIndoDateLong(r.tanggal)}
                    </div>
                    <div className="font-mono text-[10px] text-stone-400">
                      {r.tanggal}
                    </div>
                  </td>

                  {/* Total Lamaran */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span className="font-bold text-stone-900 text-sm">
                      {r.total}
                    </span>
                  </td>

                  {/* 3 Positions */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {renderNumber(r.contentCreator)}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {renderNumber(r.spvMarketing)}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {renderNumber(r.adminInvestasi)}
                  </td>

                  {/* 4 Evaluation Categories or "Belum Dinilai" */}
                  {r.dinilai ? (
                    <>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {renderNumber(r.sesuai, 'text-editorial-green font-bold')}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {renderNumber(r.kurangSesuai, 'text-amber-700 font-bold')}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {renderNumber(r.tidakSesuai, 'text-editorial-red font-bold')}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {renderNumber(r.tidakDiverifikasi, 'text-slate-600 font-medium')}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-editorial-green border border-green-200">
                          Sudah Dinilai
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={4} className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block text-[11px] font-medium italic text-stone-400 bg-stone-100/80 px-3 py-1 rounded-lg border border-stone-200/60">
                          Belum dinilai (1–4 Okt 2026)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500 border border-stone-200">
                          Belum Dinilai
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>

          {/* Footer Total Row */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-stone-100/90 font-bold text-stone-900 border-t-2 border-stone-300">
                <td className="py-3 px-4 whitespace-nowrap">
                  <span>TOTAL ({rows.length} HARI)</span>
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap text-sm font-black text-brand-900">
                  {summary.totalLamaran}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  {summary.cc}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  {summary.spv}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  {summary.admin}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap text-editorial-green">
                  {summary.sesuai}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap text-amber-700">
                  {summary.kurangSesuai}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap text-editorial-red">
                  {summary.tidakSesuai}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap text-slate-600">
                  {summary.tidakDiverifikasi}
                </td>
                <td className="py-3 px-4 text-center whitespace-nowrap text-[10px] font-normal text-stone-500">
                  Ringkasan
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
