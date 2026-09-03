import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { downloadICS, toGCalUrl, type Interview } from '../lib/interview-links';

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
}

const inputCls =
  'w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400';
const labelCls = 'block text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1';

export const InterviewModal: React.FC<InterviewModalProps> = ({
  open,
  initial,
  applicants,
  onClose,
  onSave,
  onDelete,
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

  if (!open) return null;

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-serif font-black text-sm text-stone-900">
            {isEdit ? 'Ubah Jadwal Wawancara' : 'Jadwalkan Wawancara'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 cursor-pointer" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Kandidat</label>
            <select value={applicantId} onChange={(e) => handleApplicantChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
              <option value="">— Pilih kandidat —</option>
              {(applicants || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.namaLengkap} — {a.jabatanDituju}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Nama kandidat"
              className={`${inputCls} mt-2`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Posisi</label>
              <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls} placeholder="Posisi dilamar" />
            </div>
            <div>
              <label className={labelCls}>Tahap</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="Interview HR">Interview HR</option>
                <option value="Interview User">Interview User</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mulai (08–18)</label>
              <input type="time" value={startTime} min="08:00" max="18:00" onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Selesai (08–18)</label>
              <input type="time" value={endTime} min="08:00" max="18:00" onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Pewawancara</label>
            <input type="text" value={interviewer} onChange={(e) => setInterviewer(e.target.value)} className={inputCls} placeholder="Nama pewawancara" />
          </div>

          <div>
            <label className={labelCls}>Lokasi</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Ruang / alamat interview" />
          </div>

          <div>
            <label className={labelCls}>Link Meeting</label>
            <input type="text" value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} placeholder="https://…" />
          </div>

          <div>
            <label className={labelCls}>Catatan</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Catatan tambahan…" />
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex gap-2">
              {isEdit && (
                <>
                  <button
                    onClick={() => downloadICS(draft)}
                    className="text-[11px] font-bold px-3 py-2 rounded-lg border border-stone-200 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer"
                  >
                    Unduh .ics
                  </button>
                  <a
                    href={toGCalUrl(draft)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold px-3 py-2 rounded-lg border border-stone-200 hover:border-indigo-400 hover:text-indigo-600"
                  >
                    GCal
                  </a>
                  {onDelete && initial?.id && (
                    <button
                      onClick={() => onDelete(initial.id)}
                      className="text-[11px] font-bold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </>
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
