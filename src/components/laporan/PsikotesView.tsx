import React, { useMemo, useState } from 'react';
import {
  Search,
  Download,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
  Users,
  CheckCircle2,
  FlaskConical,
  Briefcase,
} from 'lucide-react';
import { LaporanPsikotesItem } from '../../types';
import { PsikotesDetailModal, parsePsikotesCatatan } from './PsikotesDetailModal';
import { exportPsikotesToCsv } from './psikotesCsvExport';
import { AdminEmptyState } from '../dashboard/AdminEmptyState';

interface PsikotesViewProps {
  items: LaporanPsikotesItem[];
  panduan: string[];
}

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function shortenAspectList(raw: string, maxItems = 2): string {
  if (!raw) return '—';
  const parts = raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= maxItems) return parts.join(', ');
  return `${parts.slice(0, maxItems).join(', ')} (+${parts.length - maxItems})`;
}

function extractDominantCode(gayaDominan: string): 'D' | 'I' | 'S' | 'C' | null {
  const m = (gayaDominan || '').trim().match(/^([DISC])\b/i);
  return m ? (m[1].toUpperCase() as 'D' | 'I' | 'S' | 'C') : null;
}

function formatShortKesimpulan(catatan: string): { label: string; tone: 'good' | 'warn' | 'neutral' } {
  const parsed = parsePsikotesCatatan(catatan);
  const body = parsed.kesimpulanBody || parsed.profilRingkas || catatan;
  if (!body) return { label: '—', tone: 'neutral' };
  const lower = body.toLowerCase();
  if (lower.startsWith('cocok') || lower.startsWith('sesuai') || lower.includes('sangat cocok')) {
    return { label: body, tone: 'good' };
  }
  if (lower.startsWith('kurang cocok') || lower.includes('tidak dapat dinilai') || lower.startsWith('kurang sesuai')) {
    return { label: body, tone: 'warn' };
  }
  return { label: body, tone: 'neutral' };
}

export const PsikotesView: React.FC<PsikotesViewProps> = ({ items, panduan }) => {
  const [search, setSearch] = useState('');
  const [posisiFilter, setPosisiFilter] = useState('');
  const [hideUjiCoba, setHideUjiCoba] = useState(false);
  const [showPanduan, setShowPanduan] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LaporanPsikotesItem | null>(null);

  const positions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.posisi) set.add(it.posisi);
    });
    return Array.from(set).sort();
  }, [items]);

  const ujiCobaCount = useMemo(() => items.filter((it) => it.isUjiCoba).length, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (hideUjiCoba && it.isUjiCoba) return false;
      if (posisiFilter && it.posisi !== posisiFilter) return false;
      if (q) {
        const hay = [
          it.nama,
          it.email,
          it.noHp,
          it.posisi,
          it.gayaDominan,
          it.gayaPendukung,
          it.aspekTertinggi,
          it.catatan,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, posisiFilter, hideUjiCoba]);

  const summary = useMemo(() => {
    const total = filteredItems.length;
    const lengkap = filteredItems.filter((it) => (it.kelengkapan || '').toLowerCase().includes('lengkap')).length;
    const discCounts = { D: 0, I: 0, S: 0, C: 0 };
    filteredItems.forEach((it) => {
      const code = extractDominantCode(it.gayaDominan);
      if (code) discCounts[code] += 1;
    });
    return { total, lengkap, discCounts };
  }, [filteredItems]);

  // Split panduan lines from Col R into DISC, PAPI, and Disclaimer
  const groupedPanduan = useMemo(() => {
    const discLines: string[] = [];
    const papiLines: string[] = [];
    const noteLines: string[] = [];
    let section: 'disc' | 'papi' | 'note' = 'disc';

    panduan.forEach((line) => {
      const upper = line.toUpperCase();
      if (upper.startsWith('BAGIAN 1')) {
        section = 'disc';
        return;
      }
      if (upper.startsWith('BAGIAN 2')) {
        section = 'papi';
        return;
      }
      if (line.toLowerCase().startsWith('catatan:') || line.toLowerCase().startsWith('bukan satu-satunya')) {
        section = 'note';
      }
      if (section === 'disc') discLines.push(line);
      else if (section === 'papi') papiLines.push(line);
      else noteLines.push(line);
    });

    return { discLines, papiLines, noteLines };
  }, [panduan]);

  const isFiltered = Boolean(search || posisiFilter || hideUjiCoba);

  if (items.length === 0) {
    return (
      <AdminEmptyState
        icon={<Users className="h-7 w-7" />}
        title="Belum Ada Data Ringkasan Psikotes"
        body='Belum ditemukan peserta di tab "Ringkasan Psikotes" pada spreadsheet sumber.'
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Simple Summary Strip (4 quiet metrics, single elevation) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-editorial-border">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Peserta Ditampilkan
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif font-black text-2xl text-stone-900 tabular-nums">
              {summary.total}
            </span>
            {items.length !== summary.total && (
              <span className="text-xs text-stone-400 tabular-nums">dari {items.length}</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-editorial-border">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Jawaban Lengkap
          </span>
          <div className="mt-1 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-editorial-green shrink-0" />
            <span className="font-serif font-black text-2xl text-stone-900 tabular-nums">
              {summary.lengkap}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-editorial-border">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Sebaran Dominan DISC
          </span>
          <div className="mt-2 flex items-center gap-3 text-xs font-mono tabular-nums text-stone-700">
            <span>
              <strong className="text-stone-900">D</strong> {summary.discCounts.D}
            </span>
            <span className="text-stone-300">·</span>
            <span>
              <strong className="text-stone-900">I</strong> {summary.discCounts.I}
            </span>
            <span className="text-stone-300">·</span>
            <span>
              <strong className="text-stone-900">S</strong> {summary.discCounts.S}
            </span>
            <span className="text-stone-300">·</span>
            <span>
              <strong className="text-stone-900">C</strong> {summary.discCounts.C}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-editorial-border">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Status Data Sumber
          </span>
          <div className="mt-1.5 text-xs text-stone-700">
            {ujiCobaCount > 0 ? (
              <span>
                <strong className="font-mono tabular-nums text-stone-900">{ujiCobaCount}</strong> baris indikasi uji coba
              </span>
            ) : (
              <span className="text-editorial-green font-semibold">Semua data kandidat aktif</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-editorial-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, posisi, gaya DISC, atau catatan..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-editorial-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-700 font-medium text-stone-800 placeholder-stone-400"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            <select
              value={posisiFilter}
              onChange={(e) => setPosisiFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-stone-50 border border-editorial-border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-700 font-medium text-stone-800 cursor-pointer"
            >
              <option value="">Semua Posisi ({positions.length})</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
            {panduan.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPanduan((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                  showPanduan
                    ? 'bg-brand-50 text-brand-700 border-brand-200'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-editorial-border'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Panduan Skor</span>
                {showPanduan ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => exportPsikotesToCsv(filteredItems, posisiFilter ? posisiFilter.replace(/\s+/g, '_') : 'semua')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-editorial-border rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-stone-500" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {(ujiCobaCount > 0 || isFiltered) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
            {ujiCobaCount > 0 ? (
              <label className="inline-flex items-center gap-2 text-stone-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideUjiCoba}
                  onChange={(e) => setHideUjiCoba(e.target.checked)}
                  className="rounded border-stone-300 text-brand-700 focus:ring-brand-600 cursor-pointer"
                />
                <FlaskConical className="h-3.5 w-3.5 text-stone-400" />
                <span>Sembunyikan data indikasi uji coba ({ujiCobaCount})</span>
              </label>
            ) : (
              <span />
            )}

            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPosisiFilter('');
                  setHideUjiCoba(false);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Panduan Baca Skor (from KETERANGAN SINGKAT Col R) */}
      {showPanduan && panduan.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-editorial-border space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-serif font-bold text-sm text-stone-900">
                Panduan Membaca Ringkasan Psikotes
              </h3>
              <p className="text-xs text-stone-500">
                Diambil dari keterangan resmi pada tab Ringkasan Psikotes spreadsheet.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPanduan(false)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
            <div className="lg:col-span-5 space-y-2">
              <h4 className="font-bold text-stone-800">Bagian 1 — DISC (Gaya Perilaku Kerja)</h4>
              <ul className="space-y-1.5 text-stone-600 leading-relaxed">
                {groupedPanduan.discLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
              {groupedPanduan.noteLines.length > 0 && (
                <p className="pt-2 text-[11px] text-stone-500 italic border-t border-stone-100">
                  {groupedPanduan.noteLines.join(' ')}
                </p>
              )}
            </div>

            <div className="lg:col-span-7 space-y-2">
              <h4 className="font-bold text-stone-800">Bagian 2 — PAPI Kostick (Kebutuhan & Kecenderungan Kerja)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-stone-600 leading-relaxed">
                {groupedPanduan.papiLines.map((line, idx) => (
                  <div key={idx} className={idx === 0 ? 'sm:col-span-2 font-semibold text-stone-700 mb-1' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Simple Readable Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-editorial-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100/70 text-stone-600 font-bold border-b border-editorial-border text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Peserta</th>
                <th className="py-3 px-3 whitespace-nowrap">Posisi Dilamar</th>
                <th className="py-3 px-3 whitespace-nowrap">Skor DISC</th>
                <th className="py-3 px-3">Gaya Kerja (Bagian 1)</th>
                <th className="py-3 px-3">Aspek Menonjol (Bagian 2)</th>
                <th className="py-3 px-4">Kesimpulan & Rekomendasi</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-stone-400 italic">
                    Tidak ada peserta psikotes yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const kes = formatShortKesimpulan(it.catatan);
                  const domCode = extractDominantCode(it.gayaDominan);

                  return (
                    <tr
                      key={it.id}
                      onClick={() => setSelectedItem(it)}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer group align-top"
                    >
                      {/* Peserta */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-stone-900 group-hover:text-brand-800">
                          {it.nama || '—'}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono tabular-nums mt-0.5">
                          {it.tanggalSubmit || '—'} WIB
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                          {it.email || '—'}
                        </div>
                      </td>

                      {/* Posisi Dilamar */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-stone-800">{it.posisi || '—'}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {it.kelengkapan || '—'}
                        </div>
                        {it.isUjiCoba && (
                          <div className="text-[11px] font-semibold text-amber-700 mt-0.5">
                            Uji coba
                          </div>
                        )}
                      </td>

                      {/* Skor DISC (compact 4-number tabular layout) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="grid grid-cols-4 gap-2 font-mono text-[11px] tabular-nums bg-stone-50 border border-stone-200/80 rounded-lg px-2.5 py-1.5 text-center">
                          {(
                            [
                              ['D', it.skorD],
                              ['I', it.skorI],
                              ['S', it.skorS],
                              ['C', it.skorC],
                            ] as const
                          ).map(([letter, score]) => {
                            const isDom = domCode === letter;
                            return (
                              <div key={letter}>
                                <div className={`text-[10px] ${isDom ? 'font-bold text-brand-700' : 'text-stone-400'}`}>
                                  {letter}
                                </div>
                                <div className={`${isDom ? 'font-bold text-stone-900' : 'text-stone-700'}`}>
                                  {formatSigned(score)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Gaya Kerja */}
                      <td className="py-3.5 px-3 max-w-[220px]">
                        <div className="font-semibold text-stone-900 leading-snug">
                          {it.gayaDominan || '—'}
                        </div>
                        {it.gayaPendukung && (
                          <div className="text-[11px] text-stone-500 mt-1 leading-snug">
                            Pendukung: {it.gayaPendukung}
                          </div>
                        )}
                      </td>

                      {/* Aspek Menonjol PAPI */}
                      <td className="py-3.5 px-3 max-w-[220px] space-y-1 text-[11px]">
                        <div>
                          <span className="font-semibold text-editorial-green">Tinggi: </span>
                          <span className="text-stone-700">{shortenAspectList(it.aspekTertinggi, 2)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-stone-500">Rendah: </span>
                          <span className="text-stone-500">{shortenAspectList(it.aspekTerendah, 2)}</span>
                        </div>
                      </td>

                      {/* Kesimpulan & Rekomendasi */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p
                          className={`line-clamp-2 text-[11px] leading-relaxed ${
                            kes.tone === 'warn'
                              ? 'text-amber-900 font-medium'
                              : kes.tone === 'good'
                                ? 'text-editorial-green font-medium'
                                : 'text-stone-600'
                          }`}
                        >
                          {kes.label}
                        </p>
                      </td>

                      {/* Detail button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(it);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="block md:hidden space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-editorial-border text-center text-xs text-stone-400 italic">
            Tidak ada peserta psikotes yang cocok dengan filter pencarian.
          </div>
        ) : (
          filteredItems.map((it) => {
            const kes = formatShortKesimpulan(it.catatan);
            return (
              <div
                key={it.id}
                onClick={() => setSelectedItem(it)}
                className="bg-white p-4 rounded-2xl border border-editorial-border space-y-3 cursor-pointer hover:border-brand-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-stone-900 truncate">{it.nama || '—'}</h4>
                    <div className="text-xs text-stone-600 mt-0.5">
                      <span className="font-semibold text-brand-800">{it.posisi || '—'}</span>
                      <span className="mx-1.5 text-stone-300">·</span>
                      <span className="font-mono text-[11px] text-stone-500 tabular-nums">
                        {it.tanggalSubmit}
                      </span>
                    </div>
                  </div>
                  {it.isUjiCoba && (
                    <span className="text-[11px] font-semibold text-amber-700 shrink-0">Uji coba</span>
                  )}
                </div>

                {/* DISC mini bar */}
                <div className="grid grid-cols-4 gap-2 font-mono text-xs tabular-nums bg-stone-50 border border-stone-200 rounded-xl p-2 text-center">
                  <div>
                    <span className="text-[10px] text-stone-400 block">D</span>
                    <strong className="text-stone-900">{formatSigned(it.skorD)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">I</span>
                    <strong className="text-stone-900">{formatSigned(it.skorI)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">S</span>
                    <strong className="text-stone-900">{formatSigned(it.skorS)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">C</span>
                    <strong className="text-stone-900">{formatSigned(it.skorC)}</strong>
                  </div>
                </div>

                <div className="text-xs text-stone-700 space-y-1">
                  <div>
                    <span className="text-stone-500">Dominan: </span>
                    <span className="font-semibold text-stone-900">{it.gayaDominan || '—'}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-2">{kes.label}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer note matching spreadsheet disclaimer */}
      <p className="text-[11px] text-stone-500 text-center pt-1">
        Catatan: hasil psikotes adalah bahan skrining awal & pertanyaan interview, bukan satu-satunya dasar menerima / menolak kandidat.
      </p>

      {/* Detail Modal */}
      <PsikotesDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
};
