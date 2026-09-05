import React, { useEffect, useMemo, useState } from 'react';
import { downloadICS, toGCalUrl, buildWaInvite, interviewerLoad, type Interview } from '../lib/interview-links';
import { AdminModal } from './dashboard/AdminModal';
import { useToast } from './ui/Toast';

interface ApplicantOption {
  id: string;
  namaLengkap: string;
  jabatanDituju: string;
}

interface InterviewModalProps {
  open: boolean;
  initial: Interview | null;
  applicants: ApplicantOption[];
  onClose: () => void;
  onSave: (data: Interview) => void;
  onDelete?: (id: string) => void;
  existingInterviews?: Interview[];
}

const inputCls =
  'w-full bg-stone-50 border border-editorial-border rounded-(--radius-input) px-3 py-2.5 min-h-[44px] text-xs outline-none focus:border-brand-700';
const labelCls = 'block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1';

export const InterviewModal: React.FC<InterviewModalProps> = ({
  open,
  initial,
  applicants,
  onClose,
  onSave,
  onDelete,
  existingInterviews = [],
}) => {
  const isEdit = Boolean(initial?.id);
  const [applicantId, setApplicantId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [position, setPosition] = useState('');
  const [stage, setStage] = useState('Interview HR');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [interviewer, setInterviewer] = useState('');
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setApplicantId(String(initial.applicantId || ''));
      setCandidateName(String(initial.candidateName || ''));
      setPosition(String(initial.position || ''));
      setStage(String(initial.stage || 'Interview HR'));
      setDate(String(initial.date || '').slice(0, 10));
      setStartTime(String(initial.startTime ?? initial.start ?? '09:00'));
      setEndTime(String(initial.endTime ?? initial.end ?? '10:00'));
      setInterviewer(String(initial.interviewer || ''));
      setLocation(String(initial.location || ''));
      setLink(String(initial.link || ''));
      setNotes(String(initial.notes || ''));
    } else {
      setApplicantId('');
      setCandidateName('');
      setPosition('');
      setStage('Interview HR');
      setDate(new Date().toISOString().slice(0, 10));
      setStartTime('09:00');
      setEndTime('10:00');
      setInterviewer('');
      setLocation('');
      setLink('');
      setNotes('');
    }
  }, [open, initial]);

  const applicantMap = useMemo(() => {
    const m = new Map<string, ApplicantOption>();
    for (const a of applicants || []) m.set(a.id, a);
    return m;
  }, [applicants]);

  const handleApplicantChange = (id: string) => {
    setApplicantId(id);
    const a = applicantMap.get(id);
    if (a) {
      setCandidateName(a.namaLengkap);
      if (!position) setPosition(a.jabatanDituju || '');
    }
  };

  const handleSave = () => {
    if (!candidateName.trim()) {
      setError('Pilih kandidat terlebih dahulu.');
      return;
    }
    if (!date) {
      setError('Tanggal wawancara wajib diisi.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Jam mulai dan selesai wajib diisi.');
      return;
    }
    if (endTime <= startTime) {
      setError('Jam selesai harus lebih besar dari jam mulai.');
      return;
    }
    if (startTime < '08:00' || endTime > '18:00') {
      setError('Jadwal wawancara hanya dalam jam kerja 08.00–18.00.');
      return;
    }
    if (!interviewer.trim()) {
      setError('Nama pewawancara wajib diisi.');
      return;
    }
    setError(null);
    onSave({
      id: initial?.id || '',
      applicantId,
      candidateName: candidateName.trim(),
      position: position.trim(),
      stage,
      date,
      startTime,
      endTime,
      interviewer: interviewer.trim(),
      location: location.trim(),
      link: link.trim(),
      notes: notes.trim(),
    });
  };

  const draft: Interview = {
    id: initial?.id || 'draft',
    applicantId,
    candidateName,
    position,
    stage,
    date,
    startTime,
    endTime,
    interviewer,
    location,
    link,
    notes,
  };

  // Interviewer load on the chosen day/week (conflict itself is guarded server-side)
  const load = useMemo(
    () => interviewerLoad(existingInterviews, interviewer, date, initial?.id),
    [existingInterviews, interviewer, date, initial?.id]
  );

  const handleCopyWa = async () => {
    try {
      await navigator.clipboard.writeText(buildWaInvite(draft));
      toast('success', 'Undangan WA berhasil disalin ke papan klip.');
    } catch {
      toast('error', 'Gagal menyalin undangan. Salin manual dari kolom isian.');
    }
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Ubah Jadwal Wawancara' : 'Jadwalkan Wawancara'}
      subtitle="Jam kerja 08.00–18.00 · bentrok otomatis terdeteksi per pewawancara."
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="iv-candidate" className={labelCls}>Kandidat</label>
          <select id="iv-candidate" value={applicantId} onChange={(e) => handleApplicantChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">— Pilih kandidat —</option>
            {(applicants || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.namaLengkap} — {a.jabatanDituju}
              </option>
            ))}
          </select>
          <input
            id="iv-candidate-name"
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Nama kandidat"
            className={`${inputCls} mt-2`}
            aria-label="Nama kandidat (isi manual bila tidak ada di daftar)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="iv-position" className={labelCls}>Posisi</label>
            <input id="iv-position" type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls} placeholder="Posisi dilamar" />
          </div>
          <div>
            <label htmlFor="iv-stage" className={labelCls}>Tahap</label>
            <select id="iv-stage" value={stage} onChange={(e) => setStage(e.target.value)} className={`${inputCls} cursor-pointer`}>
              <option value="Interview HR">Interview HR</option>
              <option value="Interview User">Interview User</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="iv-date" className={labelCls}>Tanggal</label>
          <input id="iv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="iv-start" className={labelCls}>Mulai (08–18)</label>
            <input id="iv-start" type="time" value={startTime} min="08:00" max="18:00" onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="iv-end" className={labelCls}>Selesai (08–18)</label>
            <input id="iv-end" type="time" value={endTime} min="08:00" max="18:00" onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="iv-interviewer" className={labelCls}>Pewawancara</label>
          <input id="iv-interviewer" type="text" value={interviewer} onChange={(e) => setInterviewer(e.target.value)} className={inputCls} placeholder="Nama pewawancara" />
          {interviewer.trim() && date && (load.day > 0 || load.week > 0) && (
            <p className={`text-[10px] font-bold mt-1.5 ${load.day >= 3 ? 'text-amber-700' : 'text-stone-500'}`}>
              Beban pewawancara: {load.day} jadwal hari ini · {load.week} minggu ini
              {load.day >= 3 ? ' — pertimbangkan pewawancara lain.' : ''}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="iv-location" className={labelCls}>Lokasi</label>
          <input id="iv-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Ruang / alamat interview" />
        </div>

        <div>
          <label htmlFor="iv-link" className={labelCls}>Link Meeting</label>
          <input id="iv-link" type="text" value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} placeholder="https://…" />
        </div>

        <div>
          <label htmlFor="iv-notes" className={labelCls}>Catatan</label>
          <textarea id="iv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Catatan tambahan…" />
        </div>

        {error && (
          <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadICS(draft)}
              className="text-[11px] font-bold px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-200 hover:border-brand-700 hover:text-brand-700 cursor-pointer"
            >
              Unduh .ics
            </button>
            <a
              href={toGCalUrl(draft)}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-200 hover:border-brand-700 hover:text-brand-700 inline-flex items-center"
            >
              GCal
            </a>
            <button
              onClick={handleCopyWa}
              className="text-[11px] font-bold px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-200 hover:border-brand-700 hover:text-brand-700 cursor-pointer"
              title="Salin teks undangan WhatsApp"
            >
              Salin WA
            </button>
            {isEdit && onDelete && initial?.id && (
              <button
                onClick={() => onDelete(initial.id)}
                className="text-[11px] font-bold px-3 py-2.5 min-h-[44px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
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
              className="text-[11px] font-bold px-4 py-2.5 min-h-[44px] rounded-lg bg-brand-700 text-white hover:bg-brand-800 cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};
