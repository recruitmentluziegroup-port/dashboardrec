import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { AdminModal } from '../dashboard/AdminModal';
import { BudgetIklan, JenisBiayaIklan, SUMBER_OPTIONS } from '../../types';

interface BudgetModalProps {
  open: boolean;
  initial: BudgetIklan | null;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  existingPositions: string[];
  existingMediaSuggestions: Record<string, string[]>;
}

const inputCls =
  'w-full bg-stone-50 border border-editorial-border rounded-(--radius-input) px-3 py-2 text-xs outline-none focus:border-brand-700 min-h-[40px] text-stone-900';
const labelCls = 'block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1.5';
const errorCls = 'text-[11px] font-medium text-editorial-red mt-1 flex items-center gap-1';

function formatRupiahNumber(val: number | string): string {
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10) || 0;
  return new Intl.NumberFormat('id-ID').format(num);
}

function parseRupiahInput(str: string): number {
  const clean = str.replace(/\D/g, '');
  if (!clean) return 0;
  return parseInt(clean, 10);
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  open,
  initial,
  onClose,
  onSave,
  existingPositions,
  existingMediaSuggestions,
}) => {
  const isEdit = Boolean(initial && initial.id);

  // Form State
  const [posisiList, setPosisiList] = useState<string[]>([]);
  const [newPosisiInput, setNewPosisiInput] = useState('');
  const [selectedPresetPosisi, setSelectedPresetPosisi] = useState('');

  const [channel, setChannel] = useState<string>('Instagram');
  const [namaMedia, setNamaMedia] = useState<string>('');
  const [jenisBiaya, setJenisBiaya] = useState<JenisBiayaIklan>('Berbayar');
  const [biayaDisplay, setBiayaDisplay] = useState<string>('0');
  const [biayaNum, setBiayaNum] = useState<number>(0);
  const [jumlahPostingan, setJumlahPostingan] = useState<number>(1);
  const [tanggalMulai, setTanggalMulai] = useState<string>('');
  const [tanggalSelesai, setTanggalSelesai] = useState<string>('');
  const [linkPostingan, setLinkPostingan] = useState<string>('');
  const [kodeLacak, setKodeLacak] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or initialize form when opening
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    setNewPosisiInput('');
    setSelectedPresetPosisi('');

    if (initial) {
      setPosisiList(Array.isArray(initial.posisi) ? [...initial.posisi] : []);
      setChannel(initial.channel || 'Instagram');
      setNamaMedia(initial.namaMedia || '');
      setJenisBiaya(initial.jenisBiaya || 'Berbayar');
      const b = Number(initial.biaya) || 0;
      setBiayaNum(b);
      setBiayaDisplay(formatRupiahNumber(b));
      setJumlahPostingan(Number(initial.jumlahPostingan) || 1);
      setTanggalMulai(initial.tanggalMulai ? initial.tanggalMulai.slice(0, 10) : '');
      setTanggalSelesai(initial.tanggalSelesai ? initial.tanggalSelesai.slice(0, 10) : '');
      setLinkPostingan(initial.linkPostingan || '');
      setKodeLacak(initial.kodeLacak || '');
      setCatatan(initial.catatan || '');
    } else {
      // Default new entry: starting today for 7 days
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      setPosisiList([]);
      setChannel('Instagram');
      setNamaMedia('');
      setJenisBiaya('Berbayar');
      setBiayaNum(0);
      setBiayaDisplay('0');
      setJumlahPostingan(1);
      setTanggalMulai(today);
      setTanggalSelesai(nextWeek);
      setLinkPostingan('');
      setKodeLacak('');
      setCatatan('');
    }
  }, [open, initial]);

  // Handle jenisBiaya change
  const handleJenisBiayaChange = (val: JenisBiayaIklan) => {
    setJenisBiaya(val);
    if (val === 'Gratis') {
      setBiayaNum(0);
      setBiayaDisplay('0');
      setErrors((prev) => {
        const next = { ...prev };
        delete next.biaya;
        return next;
      });
    }
  };

  // Handle formatted number input for Biaya
  const handleBiayaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (jenisBiaya === 'Gratis') return;
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    setBiayaNum(num);
    setBiayaDisplay(formatRupiahNumber(num));
    if (errors.biaya) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.biaya;
        return next;
      });
    }
  };

  // Handle position adding
  const handleAddPresetPosisi = (pos: string) => {
    const trimmed = pos.trim();
    if (!trimmed) return;
    if (!posisiList.includes(trimmed)) {
      setPosisiList((prev) => [...prev, trimmed]);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.posisi;
        return next;
      });
    }
    setSelectedPresetPosisi('');
  };

  const handleAddCustomPosisi = () => {
    const trimmed = newPosisiInput.trim();
    if (!trimmed) return;
    if (!posisiList.includes(trimmed)) {
      setPosisiList((prev) => [...prev, trimmed]);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.posisi;
        return next;
      });
    }
    setNewPosisiInput('');
  };

  const handleRemovePosisi = (posToRemove: string) => {
    setPosisiList((prev) => prev.filter((p) => p !== posToRemove));
  };

  // Media suggestions for current channel
  const currentSuggestions = useMemo(() => {
    return existingMediaSuggestions[channel] || [];
  }, [channel, existingMediaSuggestions]);

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (posisiList.length === 0) {
      newErrors.posisi = 'Pilih atau ketik minimal 1 posisi lowongan.';
    }

    if (!SUMBER_OPTIONS.includes(channel)) {
      newErrors.channel = 'Pilih channel yang valid.';
    }

    const trimmedMedia = namaMedia.trim();
    if (!trimmedMedia) {
      newErrors.namaMedia = 'Nama Media / Mitra wajib diisi.';
    } else if (trimmedMedia.length > 100) {
      newErrors.namaMedia = 'Maksimal 100 karakter.';
    }

    if (jenisBiaya === 'Berbayar' && biayaNum <= 0) {
      newErrors.biaya = 'Untuk jenis Berbayar, biaya harus lebih dari Rp 0.';
    } else if (jenisBiaya === 'Gratis' && biayaNum !== 0) {
      newErrors.biaya = 'Untuk jenis Gratis, nominal biaya harus Rp 0.';
    } else if (biayaNum > 1_000_000_000) {
      newErrors.biaya = 'Maksimal biaya adalah Rp 1.000.000.000.';
    }

    if (!jumlahPostingan || jumlahPostingan < 1) {
      newErrors.jumlahPostingan = 'Jumlah postingan minimal 1.';
    }

    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_RE.test(tanggalMulai)) {
      newErrors.tanggalMulai = 'Format tanggal mulai harus YYYY-MM-DD.';
    }
    if (!DATE_RE.test(tanggalSelesai)) {
      newErrors.tanggalSelesai = 'Format tanggal selesai harus YYYY-MM-DD.';
    }
    if (tanggalMulai && tanggalSelesai && tanggalSelesai < tanggalMulai) {
      newErrors.tanggalSelesai = 'Tanggal selesai tidak boleh mendahului tanggal mulai.';
    }

    if (linkPostingan.trim() && !/^https?:\/\//i.test(linkPostingan.trim())) {
      newErrors.linkPostingan = 'Link harus diawali http:// atau https://.';
    }

    if (kodeLacak.trim().length > 50) {
      newErrors.kodeLacak = 'Kode lacak maksimal 50 karakter.';
    }

    if (catatan.trim().length > 500) {
      newErrors.catatan = 'Catatan maksimal 500 karakter.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || saving) return;

    setSaving(true);
    try {
      const payload = {
        ...(initial?.id ? { id: initial.id } : {}),
        posisi: posisiList,
        channel,
        namaMedia: namaMedia.trim(),
        jenisBiaya,
        biaya: jenisBiaya === 'Gratis' ? 0 : biayaNum,
        jumlahPostingan: Number(jumlahPostingan) || 1,
        tanggalMulai,
        tanggalSelesai,
        linkPostingan: linkPostingan.trim(),
        kodeLacak: kodeLacak.trim(),
        catatan: catatan.trim(),
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrors({ form: err?.message || 'Gagal menyimpan data anggaran iklan.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={isEdit ? 'Ubah Anggaran Iklan' : 'Tambah Anggaran Iklan Loker'}
      subtitle="Catat rincian alokasi biaya pemasangan lowongan kerja di media mitra atau channel iklan."
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 min-h-[40px] text-xs font-bold rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 min-h-[40px] text-xs font-bold rounded-xl bg-brand-700 hover:bg-brand-800 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Anggaran'}</span>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {errors.form && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-editorial-red">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* 1. Posisi Lowongan (Multi-Select + Custom Input) */}
        <div>
          <label className={labelCls}>
            Posisi Lowongan Kerja yang Diiklankan <span className="text-editorial-red">*</span>
          </label>

          {/* Chips list of selected positions */}
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 bg-stone-50 border border-editorial-border rounded-(--radius-input)">
            {posisiList.length === 0 ? (
              <span className="text-xs text-stone-400 italic">Belum ada posisi dipilih.</span>
            ) : (
              posisiList.map((pos) => (
                <span
                  key={pos}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 text-stone-800 rounded-lg text-xs font-medium shadow-2xs"
                >
                  <span>{pos}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePosisi(pos)}
                    className="text-stone-400 hover:text-editorial-red transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Selection controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <select
                value={selectedPresetPosisi}
                onChange={(e) => handleAddPresetPosisi(e.target.value)}
                className={inputCls}
              >
                <option value="">+ Pilih dari daftar lowongan aktif...</option>
                {existingPositions
                  .filter((p) => !posisiList.includes(p))
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Atau ketik posisi kustom..."
                value={newPosisiInput}
                onChange={(e) => setNewPosisiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomPosisi();
                  }
                }}
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleAddCustomPosisi}
                className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-(--radius-input) text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          {errors.posisi && (
            <p className={errorCls}>
              <AlertCircle className="h-3 w-3" /> {errors.posisi}
            </p>
          )}
        </div>

        {/* 2. Channel & Nama Media/Mitra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-channel" className={labelCls}>
              Channel <span className="text-editorial-red">*</span>
            </label>
            <select
              id="modal-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={inputCls}
            >
              {SUMBER_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.channel && (
              <p className={errorCls}>
                <AlertCircle className="h-3 w-3" /> {errors.channel}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="modal-namaMedia" className={labelCls}>
              Nama Media / Mitra <span className="text-editorial-red">*</span>
            </label>
            <input
              id="modal-namaMedia"
              type="text"
              list="media-suggestions"
              placeholder="Contoh: @infolokerjogja, JobStreet Premium..."
              value={namaMedia}
              onChange={(e) => {
                setNamaMedia(e.target.value);
                if (errors.namaMedia) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.namaMedia;
                    return next;
                  });
                }
              }}
              className={inputCls}
            />
            {currentSuggestions.length > 0 && (
              <datalist id="media-suggestions">
                {currentSuggestions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
            {errors.namaMedia && (
              <p className={errorCls}>
                <AlertCircle className="h-3 w-3" /> {errors.namaMedia}
              </p>
            )}
          </div>
        </div>

        {/* 3. Jenis Biaya & Biaya (Rp) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Jenis Biaya <span className="text-editorial-red">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl">
              {(['Berbayar', 'Gratis', 'Barter'] as JenisBiayaIklan[]).map((jb) => (
                <button
                  key={jb}
                  type="button"
                  onClick={() => handleJenisBiayaChange(jb)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    jenisBiaya === jb ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {jb}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="modal-biaya" className={labelCls}>
              Biaya Anggaran (Rp) <span className="text-editorial-red">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-500">Rp</span>
              <input
                id="modal-biaya"
                type="text"
                disabled={jenisBiaya === 'Gratis'}
                value={biayaDisplay}
                onChange={handleBiayaChange}
                className={`${inputCls} pl-8 text-right font-mono font-semibold ${
                  jenisBiaya === 'Gratis' ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : ''
                }`}
              />
            </div>
            {jenisBiaya === 'Gratis' ? (
              <p className="text-[10px] text-stone-400 mt-1">Biaya dikunci Rp 0 untuk jenis Gratis.</p>
            ) : (
              errors.biaya && (
                <p className={errorCls}>
                  <AlertCircle className="h-3 w-3" /> {errors.biaya}
                </p>
              )
            )}
          </div>
        </div>

        {/* 4. Periode: Tanggal Mulai & Selesai & Jumlah Postingan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="modal-tglMulai" className={labelCls}>
              Tanggal Mulai <span className="text-editorial-red">*</span>
            </label>
            <input
              id="modal-tglMulai"
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className={inputCls}
            />
            {errors.tanggalMulai && (
              <p className={errorCls}>
                <AlertCircle className="h-3 w-3" /> {errors.tanggalMulai}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="modal-tglSelesai" className={labelCls}>
              Tanggal Selesai <span className="text-editorial-red">*</span>
            </label>
            <input
              id="modal-tglSelesai"
              type="date"
              value={tanggalSelesai}
              onChange={(e) => setTanggalSelesai(e.target.value)}
              className={inputCls}
            />
            {errors.tanggalSelesai && (
              <p className={errorCls}>
                <AlertCircle className="h-3 w-3" /> {errors.tanggalSelesai}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="modal-postingan" className={labelCls}>
              Jumlah Postingan <span className="text-editorial-red">*</span>
            </label>
            <input
              id="modal-postingan"
              type="number"
              min="1"
              value={jumlahPostingan}
              onChange={(e) => setJumlahPostingan(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={inputCls}
            />
            {errors.jumlahPostingan && (
              <p className={errorCls}>
                <AlertCircle className="h-3 w-3" /> {errors.jumlahPostingan}
              </p>
            )}
          </div>
        </div>

        {/* 5. Link Postingan & Kode Lacak */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-link" className={labelCls}>
              Link Postingan / Tayangan
            </label>
            <input
              id="modal-link"
              type="text"
              placeholder="https://..."
              value={linkPostingan}
              onChange={(e) => setLinkPostingan(e.target.value)}
              className={inputCls}
            />
            {errors.linkPostingan && (
              <p className={errorCls}>
                <AlertCircle className="h-3 w-3" /> {errors.linkPostingan}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="modal-kodelacak" className={labelCls}>
              Kode Lacak / UTM
            </label>
            <input
              id="modal-kodelacak"
              type="text"
              placeholder="Contoh: IG-NOV-01"
              value={kodeLacak}
              onChange={(e) => setKodeLacak(e.target.value)}
              className={inputCls}
            />
            {errors.kodeLacak && (
              <p className={errorCls}>
                <AlertCircle className="h-3 w-3" /> {errors.kodeLacak}
              </p>
            )}
          </div>
        </div>

        {/* 6. Catatan */}
        <div>
          <label htmlFor="modal-catatan" className={labelCls}>
            Catatan Tambahan
          </label>
          <textarea
            id="modal-catatan"
            rows={2}
            placeholder="Keterangan negosiasi, slot story, ketentuan barter, dsb..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className={`${inputCls} resize-none min-h-[60px]`}
          />
          {errors.catatan && (
            <p className={errorCls}>
              <AlertCircle className="h-3 w-3" /> {errors.catatan}
            </p>
          )}
        </div>
      </form>
    </AdminModal>
  );
};
