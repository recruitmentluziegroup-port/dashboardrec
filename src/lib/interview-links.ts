/**
 * Pure helpers for interview scheduling — no dependencies.
 * Local Interview shape (src/types.ts has no Interview type; do not edit it).
 */

export interface Interview {
  id: string;
  applicantId?: string;
  candidateName: string;
  position: string;
  stage: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Aliases accepted for flexibility */
  start?: string;
  end?: string;
  interviewer: string;
  location?: string;
  link?: string;
  notes?: string;
  [key: string]: unknown;
}

type TimeLike = Pick<Interview, 'startTime' | 'endTime' | 'start' | 'end' | 'date' | 'interviewer'> &
  Record<string, unknown>;

const getStart = (e: TimeLike): string =>
  String(e.startTime ?? e.start ?? '').trim();

const getEnd = (e: TimeLike): string =>
  String(e.endTime ?? e.end ?? '').trim();

const getDate = (e: TimeLike): string => String((e.date ?? '') as string).trim();

const getInterviewer = (e: TimeLike): string =>
  String((e.interviewer ?? '') as string).trim().toLowerCase();

/** Same date + same interviewer (trim/lowercase) + time ranges overlap. */
export function isOverlap(a: TimeLike, b: TimeLike): boolean {
  if (a === b) return false;
  if (!a || !b) return false;
  if (getDate(a) !== getDate(b)) return false;
  if (!getDate(a)) return false;
  if (getInterviewer(a) !== getInterviewer(b)) return false;
  if (!getInterviewer(a)) return false;
  const aStart = getStart(a);
  const aEnd = getEnd(a);
  const bStart = getStart(b);
  const bEnd = getEnd(b);
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && bStart < aEnd;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "2026-09-10" + "09:30" -> "20260910T093000" (floating local, no TZ). */
function toLocalStamp(date: string, time: string): string {
  const d = String(date || '').trim().slice(0, 10).replace(/-/g, '');
  const parts = String(time || '').trim().split(':');
  const hh = pad2(parseInt(parts[0] || '0', 10) || 0);
  const mm = pad2(parseInt(parts[1] || '0', 10) || 0);
  const ssRaw = (parts[2] || '00').slice(0, 2);
  const ss = pad2(parseInt(ssRaw, 10) || 0);
  return `${d}T${hh}${mm}${ss}`;
}

function escICS(text: string): string {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function toICS(ev: Interview): string {
  const start = toLocalStamp(ev.date, getStart(ev));
  const end = toLocalStamp(ev.date, getEnd(ev));
  const dtstamp =
    new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const summary = `Wawancara ${ev.stage || ''} - ${ev.candidateName || ''} (${ev.position || ''})`;
  const description = [ev.notes, buildWaInvite(ev)].filter(Boolean).join('\n\n');
  const location = ev.location || '';
  const uid = `${ev.id || `iv-${Date.now()}`}@luzie-group`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luzie Group//Recruitment//ID',
    'BEGIN:VEVENT',
    `UID:${escICS(uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escICS(summary)}`,
    `DESCRIPTION:${escICS(description)}`,
    `LOCATION:${escICS(location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function toGCalUrl(ev: Interview): string {
  const start = toLocalStamp(ev.date, getStart(ev));
  const end = toLocalStamp(ev.date, getEnd(ev));
  const text = `Wawancara ${ev.stage || ''} - ${ev.candidateName || ''} (${ev.position || ''})`;
  const details = [ev.notes, ev.link].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates: `${start}/${end}`,
    details,
    location: ev.location || '',
  });
  // URLSearchParams encodes with + for spaces; spec asks encodeURIComponent form.
  // Rebuild manually to guarantee encodeURIComponent encoding.
  const q =
    `action=TEMPLATE` +
    `&text=${encodeURIComponent(text)}` +
    `&dates=${encodeURIComponent(`${start}/${end}`)}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent(ev.location || '')}`;
  void params;
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function downloadICS(ev: Interview): void {  const blob = new Blob([toICS(ev)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wawancara-${ev.date || 'jadwal'}-${getStart(ev).replace(':', '') || 'ics'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatTanggalID(dateStr: string): string {
  const d = new Date(`${String(dateStr || '').slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return String(dateStr || '-');
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/** Formal-ID WhatsApp invitation text for an interview (channel HR actually uses). */
export function buildWaInvite(ev: Interview): string {
  const lines = [
    `Yth. Sdr/i ${ev.candidateName || 'Bapak/Ibu'},`,
    ``,
    `Anda diundang ${ev.stage || 'wawancara'} untuk posisi ${ev.position || '-'} di Luzie Group:`,
    `Hari/Tanggal: ${formatTanggalID(ev.date)}`,
    `Pukul: ${getStart(ev) || '-'}–${getEnd(ev) || '-'} WIB`,
    `Pewawancara: ${ev.interviewer || '-'}`,
  ];
  if (ev.location) lines.push(`Lokasi: ${ev.location}`);
  if (ev.link) lines.push(`Link meeting: ${ev.link}`);
  lines.push(
    ``,
    `Mohon konfirmasi kehadiran dengan membalas pesan ini. Terima kasih.`,
    `— Tim Rekrutmen Luzie Group`
  );
  return lines.join('\n');
}

/** Monday (00:00) of the week containing a YYYY-MM-DD date; null when invalid. */
export function mondayOfISO(dateStr: string): Date | null {
  const d = new Date(`${String(dateStr || '').slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Interviewer load: schedules on the same day + in the same week (excluding one id). */
export function interviewerLoad(
  list: Interview[],
  interviewer: string,
  dateStr: string,
  excludeId?: string
): { day: number; week: number } {
  const name = String(interviewer || '').trim().toLowerCase();
  const day = String(dateStr || '').slice(0, 10);
  if (!name || !day) return { day: 0, week: 0 };
  const monday = mondayOfISO(day);
  let dayCount = 0;
  let weekCount = 0;
  for (const ev of list || []) {
    if (excludeId && String(ev.id) === String(excludeId)) continue;
    if (String(ev.interviewer || '').trim().toLowerCase() !== name) continue;
    const d = String(ev.date || '').slice(0, 10);
    if (d === day) dayCount++;
    if (monday && d) {
      const evMonday = mondayOfISO(d);
      if (evMonday && evMonday.getTime() === monday.getTime()) weekCount++;
    }
  }
  return { day: dayCount, week: weekCount };
}
