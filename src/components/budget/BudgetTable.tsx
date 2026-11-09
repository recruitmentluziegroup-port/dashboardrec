import React from 'react';
import {
  ExternalLink,
  Edit2,
  Copy,
  Archive,
  RotateCcw,
  Plus,
  Inbox,
  Link2Off,
  Calendar,
  Layers,
} from 'lucide-react';
import { BudgetIklan } from '../../types';
import { AdminEmptyState } from '../dashboard/AdminEmptyState';

interface BudgetTableProps {
  items: BudgetIklan[];
  onEdit: (item: BudgetIklan) => void;
  onDuplicate: (item: BudgetIklan) => void;
  onArchive: (item: BudgetIklan) => void;
  onRestore?: (item: BudgetIklan) => void;
  onAddNew: () => void;
}

const JENIS_BADGE_STYLE: Record<string, string> = {
  Berbayar: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Gratis: 'bg-stone-100 text-stone-700 border-stone-200',
  Barter: 'bg-amber-50 text-amber-800 border-amber-200',
};

const CHANNEL_BADGE_STYLE: Record<string, string> = {
  Instagram: 'bg-pink-50 text-pink-700 border-pink-200',
  TikTok: 'bg-stone-100 text-stone-900 border-stone-300',
  LinkedIn: 'bg-blue-50 text-blue-700 border-blue-200',
  JobStreet: 'bg-purple-50 text-purple-700 border-purple-200',
  'Glints/Portal Lain': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Google/Website Luzie': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'WhatsApp/Grup Komunitas': 'bg-green-50 text-green-700 border-green-200',
  'Teman/Keluarga/Karyawan Luzie': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kampus/Job Fair': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Lainnya: 'bg-stone-100 text-stone-600 border-stone-200',
};

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.slice(0, 10).split('-');
    if (!y || !m || !d) return dateStr;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  items,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onAddNew,
}) => {
  if (items.length === 0) {
    return (
      <AdminEmptyState
        icon={<Inbox className="h-8 w-8 text-stone-400" />}
        title="Belum ada data anggaran iklan"
        body="Belum ada catatan anggaran iklan yang sesuai dengan filter yang dipilih. Silakan ubah filter atau tambah catatan iklan baru."
        actionLabel="Tambah Anggaran Pertama"
        onAction={onAddNew}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── DESKTOP TABLE VIEW (hidden on small viewports) ───────────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-editorial-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-editorial-border bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-stone-500 select-none">
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Posisi</th>
                <th className="py-3 px-4">Channel & Media</th>
                <th className="py-3 px-3 text-center">Jenis</th>
                <th className="py-3 px-4 text-right">Biaya (Rp)</th>
                <th className="py-3 px-3 text-center">Tayang</th>
                <th className="py-3 px-3 text-center">Link</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {items.map((item) => {
                const isArchived = Boolean(item.diarsipkan);
                const posisiArr = Array.isArray(item.posisi) ? item.posisi : [];
                const displayedPosisi = posisiArr.slice(0, 2);
                const remainingCount = posisiArr.length - 2;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-stone-50/80 ${
                      isArchived ? 'bg-stone-50/60 opacity-60' : ''
                    }`}
                  >
                    {/* Periode */}
                    <td className="py-3.5 px-4 text-stone-700 whitespace-nowrap">
                      <div className="font-semibold text-stone-900 text-xs">
                        {formatDateShort(item.tanggalMulai)}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        s.d. {formatDateShort(item.tanggalSelesai)}
                      </div>
                      {isArchived && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-stone-200 text-stone-700">
                          Diarsipkan
                        </span>
                      )}
                    </td>

                    {/* Posisi (Chips) */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="flex flex-wrap gap-1 items-center">
                        {displayedPosisi.map((pos) => (
                          <span
                            key={pos}
                            className="inline-block px-2 py-0.5 bg-stone-100 text-stone-800 rounded-md text-[11px] font-medium border border-stone-200 truncate max-w-[150px]"
                            title={pos}
                          >
                            {pos}
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span
                            className="inline-block px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded-md text-[10px] font-bold border border-brand-200 cursor-help"
                            title={posisiArr.slice(2).join(', ')}
                          >
                            +{remainingCount}
                          </span>
                        )}
                        {posisiArr.length === 0 && (
                          <span className="text-stone-400 italic text-[11px]">—</span>
                        )}
                      </div>
                    </td>

                    {/* Channel & Media */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900 text-xs truncate max-w-[180px]" title={item.namaMedia}>
                        {item.namaMedia}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            CHANNEL_BADGE_STYLE[item.channel] || 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {item.channel}
                        </span>
                        {item.kodeLacak && (
                          <span
                            className="text-[10px] font-mono text-stone-400 truncate max-w-[80px]"
                            title={`Kode Lacak: ${item.kodeLacak}`}
                          >
                            #{item.kodeLacak}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Jenis Biaya */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          JENIS_BADGE_STYLE[item.jenisBiaya] || 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {item.jenisBiaya}
                      </span>
                    </td>

                    {/* Biaya (Rp) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-stone-900 text-xs">
                        {formatRupiah(item.biaya || 0)}
                      </span>
                    </td>

                    {/* Jumlah Postingan */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap text-stone-700 font-medium">
                      {item.jumlahPostingan || 1}x
                    </td>

                    {/* Link Postingan */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {item.linkPostingan ? (
                        <a
                          href={item.linkPostingan}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-brand-700 hover:text-brand-900 hover:bg-brand-50 transition-colors"
                          title="Buka Link Postingan"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-stone-300">
                          <Link2Off className="h-3.5 w-3.5 mx-auto" />
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Duplikat */}
                        <button
                          type="button"
                          onClick={() => onDuplicate(item)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Duplikat iklan ke bulan depan"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        {/* Ubah */}
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Ubah data iklan"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Arsipkan / Pulihkan */}
                        {isArchived ? (
                          onRestore && (
                            <button
                              type="button"
                              onClick={() => onRestore(item)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Pulihkan iklan dari arsip"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => onArchive(item)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-editorial-red hover:bg-red-50 transition-colors cursor-pointer"
                            title="Arsipkan iklan"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MOBILE CARDS VIEW (stacked, no horizontal overflow) ─────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {items.map((item) => {
          const isArchived = Boolean(item.diarsipkan);
          const posisiArr = Array.isArray(item.posisi) ? item.posisi : [];

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border border-editorial-border shadow-xs p-4 space-y-3 ${
                isArchived ? 'bg-stone-50/70 opacity-75' : ''
              }`}
            >
              {/* Header: Nama Media + Jenis Biaya */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{item.namaMedia}</h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        CHANNEL_BADGE_STYLE[item.channel] || 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {item.channel}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        JENIS_BADGE_STYLE[item.jenisBiaya] || 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {item.jenisBiaya}
                    </span>
                    {isArchived && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-stone-200 text-stone-700">
                        Diarsipkan
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-stone-900 text-sm">
                    {formatRupiah(item.biaya || 0)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-medium">{item.jumlahPostingan || 1} postingan</div>
                </div>
              </div>

              {/* Posisi Lowongan */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wide block">Posisi:</span>
                <div className="flex flex-wrap gap-1">
                  {posisiArr.map((pos) => (
                    <span
                      key={pos}
                      className="inline-block px-2 py-0.5 bg-stone-100 text-stone-800 rounded-md text-[11px] font-medium border border-stone-200"
                    >
                      {pos}
                    </span>
                  ))}
                  {posisiArr.length === 0 && <span className="text-stone-400 text-xs italic">—</span>}
                </div>
              </div>

              {/* Periode & Catatan */}
              <div className="text-xs text-stone-600 flex items-center justify-between pt-1 border-t border-stone-100">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  <span>
                    {formatDateShort(item.tanggalMulai)} – {formatDateShort(item.tanggalSelesai)}
                  </span>
                </div>

                {item.linkPostingan && (
                  <a
                    href={item.linkPostingan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-900"
                  >
                    <span>Buka Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {item.catatan && (
                <p className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg italic">
                  "{item.catatan}"
                </p>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => onDuplicate(item)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplikat</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Ubah</span>
                </button>
                {isArchived ? (
                  onRestore && (
                    <button
                      type="button"
                      onClick={() => onRestore(item)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Pulihkan</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onArchive(item)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg text-editorial-red hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Arsipkan</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
