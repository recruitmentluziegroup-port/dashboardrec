import React, { useEffect, useState } from 'react';
import { AdminModal } from './dashboard/AdminModal';

interface TrackerModalProps {
  open: boolean;
  initial: any | null;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

const inputCls =
  'w-full bg-stone-50 border border-editorial-border rounded-(--radius-input) px-3 py-2.5 min-h-[44px] text-xs outline-none focus:border-brand-700';
const labelCls = 'block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1';

const PRIORITIES = ['Normal', 'High'];
const STATUSES = ['Open', 'Closed-Filled', 'Closed-Unfilled', 'On Hold'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const emptyForm = () => ({
  title: '',
  category: '',
  user: '',
  recruiter: '',
  tanggalDibuka: new Date().toISOString().slice(0, 10),
  tanggalTerakhir: '',
  tanggalSelesai: '',
  priority: 'Normal',
  jumlah: '1',
  gender: '',
  status: 'Open',
});

export const TrackerModal: React.FC<TrackerModalProps> = ({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEdit = Boolean(initial?.id ?? initial?.title);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      const f = emptyForm();
      setForm({
        ...f,
        title: String(initial.title ?? initial.nama ?? ''),
        category: String(initial.category ?? initial.department ?? ''),
        user: String(initial.user ?? ''),
        recruiter: String(initial.recruiter ?? ''),
        tanggalDibuka: String(initial.tanggalDibuka ?? initial.openedDate ?? f.tanggalDibuka).slice(0, 10),
        tanggalTerakhir: String(initial.tanggalTerakhir ?? initial.lastDate ?? '').slice(0, 10),
        tanggalSelesai: String(initial.tanggalSelesai ?? initial.closedDate ?? '').slice(0, 10),
        priority: String(initial.priority ?? 'Normal'),
        jumlah: String(initial.jumlah ?? initial.headcount ?? '1'),
        gender: String(initial.gender ?? ''),
        status: String(initial.status ?? 'Open'),
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initial]);

  const handleSave = () => {
    if (!form.title.trim()) {
      setError('Nama Posisi wajib diisi.');
      return;
    }
    const dateFields: Array<[string, string]> = [
      [form.tanggalDibuka, 'Tgl Dibuka'],
      [form.tanggalTerakhir, 'Tgl Terakhir'],
      [form.tanggalSelesai, 'Tgl Selesai'],
    ];
    for (const [v, label] of dateFields) {
      if (v && !DATE_RE.test(v)) {
        setError(`${label} harus berformat YYYY-MM-DD.`);
        return;
      }
    }
    if (!PRIORITIES.includes(form.priority)) {
      setError('Priority tidak valid.');
      return;
    }
    if (!STATUSES.includes(form.status)) {
      setError('Status tidak valid.');
      return;
    }
    setError(null);
    onSave({ ...(initial ?? {}), ...form, title: form.title.trim() });
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Ubah Posisi Tracker' : 'Tambah Posisi Tracker'}
      subtitle="Treker posisi tersimpan di tab Treker pada Google Sheets."
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="trk-title" className={labelCls}>Nama Posisi *</label>
          <input
            id="trk-title"
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="cth: Staff Admin"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="trk-dept" className={labelCls}>Department</label>
            <input id="trk-dept" type="text" value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls} placeholder="cth: Operasional" />
          </div>
          <div>
            <label htmlFor="trk-user" className={labelCls}>User</label>
            <input id="trk-user" type="text" value={form.user} onChange={(e) => set('user', e.target.value)} className={inputCls} placeholder="User / hiring manager" />
          </div>
        </div>

        <div>
          <label htmlFor="trk-recruiter" className={labelCls}>Recruiter</label>
          <input id="trk-recruiter" type="text" value={form.recruiter} onChange={(e) => set('recruiter', e.target.value)} className={inputCls} placeholder="Nama recruiter" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="trk-open" className={labelCls}>Tgl Dibuka</label>
            <input id="trk-open" type="date" value={form.tanggalDibuka} onChange={(e) => set('tanggalDibuka', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="trk-last" className={labelCls}>Tgl Terakhir</label>
            <input id="trk-last" type="date" value={form.tanggalTerakhir} onChange={(e) => set('tanggalTerakhir', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="trk-done" className={labelCls}>Tgl Selesai</label>
            <input id="trk-done" type="date" value={form.tanggalSelesai} onChange={(e) => set('tanggalSelesai', e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="trk-priority" className={labelCls}>Priority</label>
            <select id="trk-priority" value={form.priority} onChange={(e) => set('priority', e.target.value)} className={`${inputCls} cursor-pointer`}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trk-status" className={labelCls}>Status</label>
            <select id="trk-status" value={form.status} onChange={(e) => set('status', e.target.value)} className={`${inputCls} cursor-pointer`}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="trk-jumlah" className={labelCls}>Jumlah</label>
            <input id="trk-jumlah" value={form.jumlah} onChange={(e) => set('jumlah', e.target.value)} className={inputCls} inputMode="numeric" placeholder="1" />
          </div>
          <div>
            <label htmlFor="trk-gender" className={labelCls}>Gender</label>
            <input id="trk-gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls} placeholder="L / P / Bebas" />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div>
            {isEdit && onDelete && (initial?.id ?? initial?.title) && (
              <button
                onClick={() => onDelete(String(initial.id ?? initial.title))}
                className="text-[11px] font-bold px-4 py-2.5 min-h-[44px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
              >
                Hapus
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-[11px] font-bold px-4 py-2.5 min-h-[44px] rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="text-[11px] font-bold px-4 py-2.5 rounded-lg bg-brand-700 text-white hover:bg-brand-800 cursor-pointer min-h-[44px]"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};
