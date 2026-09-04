import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface TrackerModalProps {
  open: boolean;
  initial: any | null;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

const inputCls =
  'w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400';
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

  if (!open) return null;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-serif font-black text-sm text-stone-900">
            {isEdit ? 'Ubah Posisi Tracker' : 'Tambah Posisi Tracker'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 cursor-pointer" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Nama Posisi *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="cth: Staff Admin"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Department</label>
              <input type="text" value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls} placeholder="cth: Operasional" />
            </div>
            <div>
              <label className={labelCls}>User</label>
              <input type="text" value={form.user} onChange={(e) => set('user', e.target.value)} className={inputCls} placeholder="User / hiring manager" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Recruiter</label>
            <input type="text" value={form.recruiter} onChange={(e) => set('recruiter', e.target.value)} className={inputCls} placeholder="Nama recruiter" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tgl Dibuka</label>
              <input type="date" value={form.tanggalDibuka} onChange={(e) => set('tanggalDibuka', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tgl Terakhir</label>
              <input type="date" value={form.tanggalTerakhir} onChange={(e) => set('tanggalTerakhir', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tgl Selesai</label>
              <input type="date" value={form.tanggalSelesai} onChange={(e) => set('tanggalSelesai', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Priority</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className={`${inputCls} cursor-pointer`}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={`${inputCls} cursor-pointer`}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Jumlah</label>
              <input value={form.jumlah} onChange={(e) => set('jumlah', e.target.value)} className={inputCls} inputMode="numeric" placeholder="1" />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <input value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls} placeholder="L / P / Bebas" />
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <div>
              {isEdit && onDelete && (initial?.id ?? initial?.title) && (
                <button
                  onClick={() => onDelete(String(initial.id ?? initial.title))}
                  className="text-[11px] font-bold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  Hapus
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="text-[11px] font-bold px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="text-[11px] font-bold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
