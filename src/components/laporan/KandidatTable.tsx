import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Eye,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { LaporanKandidatItem } from '../../types';

interface KandidatTableProps {
  candidates: LaporanKandidatItem[];
  onSelectCandidate: (candidate: LaporanKandidatItem) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

type SortField = 'tanggal' | 'nama' | 'posisi' | 'status' | 'rekomendasiPosisi';
type SortOrder = 'asc' | 'desc';

function formatShortIndoDate(isoDate: string): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(`${isoDate}T00:00:00`);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function getStatusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('sesuai') && !s.includes('kurang') && !s.includes('tidak')) {
    return {
      label: status,
      className: 'bg-green-50 text-editorial-green border border-green-200',
    };
  }
  if (s.includes('kurang')) {
    return {
      label: status,
      className: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  if (s.includes('tidak') && s.includes('sesuai')) {
    return {
      label: status,
      className: 'bg-red-50 text-editorial-red border border-red-200',
    };
  }
  if (s.includes('diverifikasi')) {
    return {
      label: status,
      className: 'bg-slate-100 text-slate-700 border border-slate-300',
    };
  }
  return {
    label: status || 'Belum dinilai',
    className: 'bg-stone-100 text-stone-600 border border-stone-200',
  };
}

export const KandidatTable: React.FC<KandidatTableProps> = ({
  candidates,
  onSelectCandidate,
  page,
  onPageChange,
  pageSize = 25,
}) => {
  const [sortField, setSortField] = useState<SortField>('tanggal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'tanggal' ? 'desc' : 'asc');
    }
    onPageChange(1);
  };

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'tanggal') {
        cmp = a.tanggal.localeCompare(b.tanggal);
        if (cmp === 0) {
          // Tie-break by sheet row number: smaller row number is higher up in the sheet (more recent)
          const rowA = parseInt(a.id.split('|')[3] || '0', 10);
          const rowB = parseInt(b.id.split('|')[3] || '0', 10);
          if (rowA && rowB) {
            cmp = rowB - rowA;
          }
        }
      } else if (sortField === 'nama') {
        cmp = (a.nama || '').localeCompare(b.nama || '');
      } else if (sortField === 'posisi') {
        cmp = (a.posisi || '').localeCompare(b.posisi || '');
      } else if (sortField === 'rekomendasiPosisi') {
        cmp = (a.rekomendasiPosisi || '').localeCompare(b.rekomendasiPosisi || '');
      } else if (sortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }

      // Secondary tie-break by date and row number if non-date sort values are equal
      if (cmp === 0 && sortField !== 'tanggal') {
        cmp = a.tanggal.localeCompare(b.tanggal);
        if (cmp === 0) {
          const rowA = parseInt(a.id.split('|')[3] || '0', 10);
          const rowB = parseInt(b.id.split('|')[3] || '0', 10);
          if (rowA && rowB) {
            cmp = rowB - rowA;
          }
        }
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [candidates, sortField, sortOrder]);

  // Pagination calculation
  const totalItems = sortedCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCandidates.slice(start, start + pageSize);
  }, [sortedCandidates, currentPage, pageSize]);

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

  return (
    <div className="space-y-4">
      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-editorial-border shadow-xs berkas-stripe overflow-hidden">
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
                  onClick={() => handleSort('nama')}
                  className="py-3 px-4 cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Kandidat</span>
                    {renderSortIcon('nama')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('posisi')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Posisi</span>
                    {renderSortIcon('posisi')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th className="py-3 px-4 w-72">Alasan / Bukti</th>
                <th className="py-3 px-3">Email</th>
                <th
                  onClick={() => handleSort('rekomendasiPosisi')}
                  className="py-3 px-3 cursor-pointer hover:bg-stone-200/50 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Rekomendasi Posisi</span>
                    {renderSortIcon('rekomendasiPosisi')}
                  </div>
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Ulang</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-stone-400 font-bold italic">
                    Tidak ada kandidat yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedList.map((k) => {
                  const isMissingName =
                    !k.nama ||
                    k.nama.toLowerCase().includes('tidak tercantum') ||
                    k.nama.toLowerCase().includes('(nama tidak tercantum');
                  const badge = getStatusBadge(k.status);

                  return (
                    <tr
                      key={k.id}
                      onClick={() => onSelectCandidate(k)}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Tanggal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-stone-900">
                          {formatShortIndoDate(k.tanggal)}
                        </div>
                        <div className="font-mono text-[10px] text-stone-400">
                          {k.tanggal}
                        </div>
                      </td>

                      {/* Nama Kandidat */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold block ${
                            isMissingName ? 'text-stone-400 italic font-normal' : 'text-stone-900 group-hover:text-brand-800'
                          }`}
                        >
                          {k.nama || '(nama tidak tercantum di subjek)'}
                        </span>
                      </td>

                      {/* Posisi */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-stone-700 font-medium">
                          {k.posisi}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Alasan / Bukti (2 lines clamp with see more) */}
                      <td className="py-3 px-4 max-w-xs">
                        {k.alasan ? (
                          <div className="space-y-1">
                            <p className="text-stone-600 line-clamp-2 leading-relaxed text-[11px]">
                              {k.alasan}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCandidate(k);
                              }}
                              className="text-[10px] text-brand-700 hover:text-brand-900 font-bold hover:underline cursor-pointer"
                            >
                              lihat selengkapnya
                            </button>
                          </div>
                        ) : (
                          <span className="text-stone-400 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-stone-600">
                        {k.email || '—'}
                      </td>

                      {/* Rekomendasi Posisi */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {k.rekomendasiPosisi ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-900 border border-brand-200">
                            <Sparkles className="h-2.5 w-2.5 text-brand-600 shrink-0" />
                            <span>{k.rekomendasiPosisi}</span>
                          </span>
                        ) : (
                          <span className="text-stone-300 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Lamaran Ulang */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {k.lamaranUlang ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Repeat className="h-2.5 w-2.5 text-amber-700" />
                            <span>Ulang</span>
                          </span>
                        ) : (
                          <span className="text-stone-300 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Aksi: Buka Email & Detail */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {k.linkEmail ? (
                            <a
                              href={k.linkEmail}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-all"
                              title="Buka email di Gmail"
                            >
                              <Mail className="h-3 w-3" />
                              <span>Buka email</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-400 bg-stone-100 rounded-lg cursor-not-allowed"
                              title="Link email tidak tersedia"
                            >
                              <Mail className="h-3 w-3" />
                              <span>Buka email</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => onSelectCandidate(k)}
                            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all"
                            title="Lihat detail berkas"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Visible ONLY on mobile, no horizontal scroll) */}
      <div className="block md:hidden space-y-3">
        {paginatedList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-editorial-border text-center text-xs text-stone-400 font-bold italic">
            Tidak ada kandidat yang sesuai dengan filter pencarian.
          </div>
        ) : (
          paginatedList.map((k) => {
            const isMissingName =
              !k.nama ||
              k.nama.toLowerCase().includes('tidak tercantum') ||
              k.nama.toLowerCase().includes('(nama tidak tercantum');
            const badge = getStatusBadge(k.status);

            return (
              <div
                key={k.id}
                onClick={() => onSelectCandidate(k)}
                className="bg-white p-4 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-3 cursor-pointer hover:border-brand-300 transition-colors"
              >
                {/* Header: Name + Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <h4
                      className={`text-sm font-bold truncate ${
                        isMissingName ? 'text-stone-400 italic font-normal' : 'text-stone-900'
                      }`}
                    >
                      {k.nama || '(nama tidak tercantum di subjek)'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="font-semibold text-brand-800">{k.posisi}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-stone-400">
                        <Calendar className="h-3 w-3" />
                        <span>{k.tanggal}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                    {k.lamaranUlang && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Repeat className="h-2.5 w-2.5 text-amber-700" />
                        <span>Ulang</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Rekomendasi Posisi (if available) */}
                {k.rekomendasiPosisi && (
                  <div className="flex items-center gap-1.5 text-xs bg-brand-50/70 border border-brand-200/60 rounded-xl px-2.5 py-1 text-brand-900">
                    <Sparkles className="h-3 w-3 text-brand-600 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Rekomendasi:</span>
                    <span className="font-semibold text-xs text-brand-950 truncate">{k.rekomendasiPosisi}</span>
                  </div>
                )}

                {/* Alasan / Bukti */}
                {k.alasan ? (
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-[11px] text-stone-700 leading-relaxed">
                    <p className="line-clamp-2">{k.alasan}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCandidate(k);
                      }}
                      className="text-[10px] text-brand-700 hover:text-brand-900 font-bold hover:underline cursor-pointer mt-1"
                    >
                      lihat selengkapnya
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 italic">
                    Alasan: -
                  </div>
                )}

                {/* Footer: Email + Actions */}
                <div
                  className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-mono text-[11px] text-stone-600 truncate max-w-[150px]">
                    {k.email || '—'}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {k.linkEmail ? (
                      <a
                        href={k.linkEmail}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-all"
                      >
                        <Mail className="h-3 w-3" />
                        <span>Buka email</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-stone-400 bg-stone-100 rounded-lg">
                        <Mail className="h-3 w-3" />
                        <span>Email</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectCandidate(k)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white text-stone-700 hover:bg-stone-50 border border-editorial-border rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-editorial-border shadow-xs berkas-stripe flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="text-stone-500 font-medium">
            Menampilkan{' '}
            <strong className="text-stone-900 font-bold">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            dari <strong className="text-stone-900 font-bold">{totalItems}</strong> kandidat
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-editorial-border rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Sebelumnya</span>
            </button>

            {/* Page indicator pills */}
            <div className="flex items-center gap-1 px-2 font-bold text-stone-700">
              <span className="px-2.5 py-1 rounded-lg bg-brand-700 text-white text-xs">
                {currentPage}
              </span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-500 text-xs">{totalPages}</span>
            </div>

            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-editorial-border rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
