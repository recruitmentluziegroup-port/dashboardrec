import React from 'react';
import { Eye } from 'lucide-react';

interface TrackerTableProps {
  rows: any[];
  onStatusChange?: (row: any, newStatus: string) => void;
  onSelect?: (row: any) => void;
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
      return 'bg-sky-100 text-sky-700 border border-sky-200';
    default:
      return 'bg-stone-100 text-stone-600 border border-stone-200';
  }
}

function priorityBadge(priority: string): string {
  const p = (priority || 'Normal').toLowerCase();
  if (p === 'high' || p === 'urgent' || p === 'tinggi') {
    return 'bg-red-100 text-red-700 border border-red-200';
  }
  return 'bg-blue-100 text-blue-700 border border-blue-200';
}

const fmtDate = (v: unknown): string => {
  if (!v) return '-';
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('id-ID');
};

export const TrackerTable: React.FC<TrackerTableProps> = ({ rows, onStatusChange, onSelect }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
        <div>
          <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Treker Posisi Rekrutmen</h3>
          <p className="text-[11px] text-stone-400 font-medium mt-0.5">
            {rows.length} posisi terpantau — klik Tinjau untuk melihat pelamar.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-50">
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
                <td colSpan={12} className="py-12 text-center text-stone-500 font-medium">
                  Belum ada posisi rekrutmen. Tambahkan lowongan terlebih dahulu.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const nama = r.title ?? r.nama ?? r.position ?? '-';
                const dept = r.category ?? r.department ?? '-';
                const user = r.user ?? r.hiringManager ?? r.picUser ?? '-';
                const recruiter = r.recruiter ?? '-';
                const tglDibuka = r.openedDate ?? r.tglDibuka ?? r.createdAt ?? null;
                const tglTerakhir = r.lastDate ?? r.tglTerakhir ?? r.deadline ?? null;
                const tglSelesai = r.closedDate ?? r.tglSelesai ?? r.finishedAt ?? null;
                const priority = String(r.priority ?? 'Normal');
                const jumlah = r.headcount ?? r.jumlah ?? r.quota ?? '-';
                const gender = r.gender ?? '-';
                const status = String(r.status ?? 'Open');
                return (
                  <tr key={r.id ?? r.title ?? idx} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-stone-900">{nama}</td>
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
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold w-fit ${statusBadge(status)}`}>
                          {status}
                        </span>
                        {onStatusChange && (
                          <select
                            value={STATUS_OPTIONS.includes(status) ? status : 'Open'}
                            onChange={(e) => onStatusChange(r, e.target.value)}
                            className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[11px] cursor-pointer outline-none focus:border-indigo-400"
                            aria-label={`Ubah status ${nama}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {onSelect && (
                        <button
                          onClick={() => onSelect(r)}
                          className="inline-flex items-center space-x-1 border border-stone-200 hover:border-indigo-400 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Tinjau</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
