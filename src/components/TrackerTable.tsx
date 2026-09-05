import React from 'react';
import { Eye, TableProperties } from 'lucide-react';
import { AdminEmptyState } from './dashboard/AdminEmptyState';

interface TrackerTableProps {
  rows: any[];
  pipelineCounts?: Record<string, { total: number; pending: number }>;
  onStatusChange?: (row: any, newStatus: string) => void;
  onSelect?: (row: any) => void;
  onAdd?: () => void;
  onEdit?: (row: any) => void;
  onDelete?: (id: string) => void;
}

const STATUS_OPTIONS = ['Open', 'Closed-Filled', 'Closed-Unfilled', 'On Hold'];

function statusBadge(status: string): string {
  switch (status) {
    case 'Closed-Filled':
      return 'bg-green-100 text-green-700 border border-green-200';
    case 'Closed-Unfilled':
      return 'bg-stone-100 text-stone-600 border border-stone-200';
    case 'On Hold':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'Open':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    default:
      return 'bg-stone-100 text-stone-600 border border-stone-200';
  }
}

function priorityBadge(priority: string): string {
  const p = (priority || 'Normal').toLowerCase();
  if (p === 'high' || p === 'urgent' || p === 'tinggi') {
    return 'bg-red-100 text-red-700 border border-red-200';
  }
  return 'bg-stone-100 text-editorial-navy border border-editorial-border';
}

const fmtDate = (v: unknown): string => {
  if (!v) return '-';
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('id-ID');
};

// Normalize the many tracker field aliases once — shared by table rows + mobile cards
const normRow = (r: any) => ({
  nama: r.title ?? r.nama ?? r.position ?? '-',
  dept: r.category ?? r.department ?? '-',
  user: r.user ?? r.hiringManager ?? r.picUser ?? '-',
  recruiter: r.recruiter ?? '-',
  tglDibuka: r.openedDate ?? r.tglDibuka ?? r.createdAt ?? null,
  tglTerakhir: r.lastDate ?? r.tglTerakhir ?? r.deadline ?? null,
  tglSelesai: r.closedDate ?? r.tglSelesai ?? r.finishedAt ?? null,
  priority: String(r.priority ?? 'Normal'),
  jumlah: r.headcount ?? r.jumlah ?? r.quota ?? '-',
  gender: r.gender ?? '-',
  status: String(r.status ?? 'Open'),
});

export const TrackerTable: React.FC<TrackerTableProps> = ({ rows, pipelineCounts, onStatusChange, onSelect, onAdd, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl border border-editorial-border shadow-sm overflow-hidden berkas-stripe">
      <div className="px-5 py-4 border-b border-editorial-border flex items-center justify-between">
        <div>
          <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Treker Posisi Rekrutmen</h3>
          <p className="text-[11px] text-stone-400 font-medium mt-0.5">
            {rows.length} posisi terpantau — klik Tinjau untuk melihat pelamar.
          </p>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-3.5 py-2 text-[11px] font-bold bg-brand-700 text-white rounded-xl hover:bg-brand-800 transition-all cursor-pointer"
          >
            + Tambah
          </button>
        )}
      </div>
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="border-b border-editorial-border text-[11px] font-bold uppercase tracking-wider text-stone-500 bg-editorial-cream">
              <th className="py-3 px-4">Nama Posisi</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Recruiter</th>
              <th className="py-3 px-4">Tgl Dibuka</th>
              <th className="py-3 px-4">Tgl Terakhir</th>
              <th className="py-3 px-4">Tgl Selesai</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Jumlah</th>
              <th className="py-3 px-4">Gender</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 px-6">
                  <AdminEmptyState
                    compact
                    icon={<TableProperties className="h-7 w-7" />}
                    title="Belum ada treker posisi"
                    body="Belum ada posisi yang dipantau. Tambahkan posisi baru untuk mulai memantau kebutuhan rekrutmen."
                    actionLabel={onAdd ? 'Tambah Posisi' : undefined}
                    onAction={onAdd}
                  />
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const { nama, dept, user, recruiter, tglDibuka, tglTerakhir, tglSelesai, priority, jumlah, gender, status } = normRow(r);
                const pipe = pipelineCounts?.[String(nama || '').toLowerCase().trim()];
                const quota = parseInt(String(jumlah), 10);
                const overQuota = pipe && !isNaN(quota) && quota > 0 && pipe.total > quota;
                return (
                  <tr key={r.id ?? r.title ?? idx} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 block">{nama}</span>
                      {pipe && pipe.total > 0 && (
                        <span className="text-[10px] text-stone-500 font-semibold block mt-0.5 tabular-nums">
                          {pipe.total} pelamar · {pipe.pending} menunggu
                          {overQuota && <span className="text-amber-700 font-bold"> · melebihi kuota {quota}</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{dept}</td>
                    <td className="py-3 px-4">{user}</td>
                    <td className="py-3 px-4">{recruiter}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{fmtDate(tglDibuka)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{fmtDate(tglTerakhir)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{fmtDate(tglSelesai)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${priorityBadge(priority)}`}>
                        {priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{String(jumlah)}</td>
                    <td className="py-3 px-4">{String(gender)}</td>
                    <td className="py-3 px-4">
                      {onStatusChange ? (
                        <select
                          value={STATUS_OPTIONS.includes(status) ? status : 'Open'}
                          onChange={(e) => onStatusChange(r, e.target.value)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer outline-none border min-h-[36px] ${statusBadge(status)}`}
                          aria-label={`Ubah status ${nama}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-white text-stone-900">{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold w-fit ${statusBadge(status)}`}>
                          {status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onSelect && (
                          <button
                            onClick={() => onSelect(r)}
                            className="inline-flex items-center space-x-1 border border-stone-200 hover:border-brand-700 hover:text-brand-700 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Tinjau</span>
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(r)}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-200 font-bold hover:border-brand-700 hover:text-brand-700 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(String(r.id ?? r.title))}
                            className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stacked cards (<md) — same data, thumb-friendly */}
      <div className="md:hidden divide-y divide-stone-100">
        {rows.length === 0 ? null : (
          rows.map((r, idx) => {
            const { nama, dept, user, recruiter, tglDibuka, priority, jumlah, status } = normRow(r);
            const pipe = pipelineCounts?.[String(nama || '').toLowerCase().trim()];
            return (
              <div key={r.id ?? r.title ?? idx} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{nama}</p>
                    <p className="text-[11px] text-stone-500 font-semibold truncate">{dept} · {user}</p>
                    {pipe && pipe.total > 0 && (
                      <p className="text-[10px] text-stone-500 font-semibold tabular-nums">
                        {pipe.total} pelamar · {pipe.pending} menunggu
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(status)}`}>
                    {status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500 font-semibold">
                  <span>Perekrut: <strong className="text-stone-700">{recruiter}</strong></span>
                  <span>Dibuka: <strong className="text-stone-700 tabular-nums">{fmtDate(tglDibuka)}</strong></span>
                  <span>Jumlah: <strong className="text-stone-700">{String(jumlah)}</strong></span>
                  <span className="inline-flex items-center gap-1">
                    Prioritas: <strong className="text-stone-700">{priority}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {onSelect && (
                    <button
                      onClick={() => onSelect(r)}
                      className="inline-flex items-center space-x-1 border border-stone-200 hover:border-brand-700 hover:text-brand-700 px-3 py-2 min-h-[44px] rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Tinjau</span>
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(r)}
                      className="px-3 py-2 min-h-[44px] rounded-lg border border-stone-200 text-[11px] font-bold hover:border-brand-700 hover:text-brand-700 transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                  {onStatusChange && (
                    <select
                      value={STATUS_OPTIONS.includes(status) ? status : 'Open'}
                      onChange={(e) => onStatusChange(r, e.target.value)}
                      className={`rounded-lg px-2.5 py-2 text-[11px] font-bold cursor-pointer outline-none border min-h-[44px] ${statusBadge(status)}`}
                      aria-label={`Ubah status ${nama}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-white text-stone-900">{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
