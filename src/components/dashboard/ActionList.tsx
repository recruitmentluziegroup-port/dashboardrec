import React, { useMemo } from 'react';
import {
  CalendarClock,
  AlertTriangle,
  Inbox,
  Briefcase,
  Calendar,
  ChevronRight,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import { Applicant } from '../../types';
import type { TrackerItem } from '../../lib/sheets';
import type { Interview } from '../../lib/interview-links';
import { AdminEmptyState } from './AdminEmptyState';

interface ScheduleEntry {
  id: string;
  time: string;
  title: string;
  applicantId?: string;
  isLive: boolean;
  color: string;
}

interface ActionListProps {
  applicants: Applicant[];
  trackers: TrackerItem[];
  interviews: Interview[];
  scheduleList: ScheduleEntry[];
  onSelectApplicant: (id: string) => void;
  onOpenTrackers?: () => void;
  onViewCalendar?: () => void;
}

interface ActionRow {
  id: string;
  severity: 'red' | 'amber' | 'neutral';
  icon: React.ReactNode;
  label: string;
  detail?: string;
  count: number;
  onClick: () => void;
}

// Robust date parser for Applicant.submissionDate ("DD/MM/YYYY, HH.mm" or ISO).
function parseSubmissionDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = dateStr.split(',')[0].split('/');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

const SEVERITY_ICON_CLASS: Record<ActionRow['severity'], string> = {
  red: 'bg-red-50 text-editorial-red',
  amber: 'bg-amber-50 text-amber-600',
  neutral: 'bg-stone-100 text-stone-500',
};

// ── Home-tab action rail ────────────────────────────────────────────────────
// Everything is derived client-side from data already passed to the dashboard
// (applicants / trackers / interviews). No new APIs. Rows ≥44px touch target.
export const ActionList: React.FC<ActionListProps> = ({
  applicants,
  trackers,
  interviews,
  scheduleList,
  onSelectApplicant,
  onOpenTrackers,
  onViewCalendar,
}) => {
  const items = useMemo<ActionRow[]>(() => {
    const rows: ActionRow[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const parseDay = (s?: string) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    // 1. Wawancara hari ini (red) — open first candidate with an applicant link
    const todaysInterviews = (interviews || []).filter(
      (ev) => String(ev.date || '').slice(0, 10) === todayStr,
    );
    if (todaysInterviews.length > 0) {
      const firstLinked = todaysInterviews.find((ev) => ev.applicantId);
      rows.push({
        id: 'interviews-today',
        severity: 'red',
        icon: <CalendarClock className="h-4 w-4" />,
        label: 'Wawancara hari ini',
        detail: todaysInterviews[0]?.candidateName
          ? `${todaysInterviews[0].candidateName}${todaysInterviews[0]?.stage ? ` — ${todaysInterviews[0].stage}` : ''}`
          : undefined,
        count: todaysInterviews.length,
        onClick: () => {
          if (firstLinked?.applicantId) onSelectApplicant(String(firstLinked.applicantId));
          else onViewCalendar?.();
        },
      });
    }

    // 2. Posisi tenggat lewat (red) — Open/On-Hold with Tanggal Terakhir in the past
    const overdue = trackers
      .filter((t) => (t.status || 'Open') === 'Open' || t.status === 'On Hold')
      .filter((t) => {
        const terakhir = parseDay(t.tanggalTerakhir);
        return !!terakhir && terakhir < today;
      });
    if (overdue.length > 0) {
      rows.push({
        id: 'positions-overdue',
        severity: 'red',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Posisi tenggat lewat',
        detail: overdue[0].title,
        count: overdue.length,
        onClick: () => onOpenTrackers?.(),
      });
    }

    // 3. Menunggu review > 3 hari (amber) — oldest first, click opens oldest
    const stalePending = applicants
      .filter((a) => a.status === 'Pending')
      .map((a) => ({ a, d: parseSubmissionDate(a.submissionDate) }))
      .filter((x): x is { a: Applicant; d: Date } => x.d !== null)
      .filter((x) => (today.getTime() - x.d.getTime()) / 86400000 > 3)
      .sort((x, y) => x.d.getTime() - y.d.getTime());
    if (stalePending.length > 0) {
      rows.push({
        id: 'stale-pending',
        severity: 'amber',
        icon: <Inbox className="h-4 w-4" />,
        label: 'Menunggu review > 3 hari',
        detail: stalePending[0].a.namaLengkap
          ? `${stalePending[0].a.namaLengkap}${stalePending[0].a.jabatanDituju ? ` — ${stalePending[0].a.jabatanDituju}` : ''}`
          : undefined,
        count: stalePending.length,
        onClick: () => {
          const oldest = stalePending[0].a;
          if (oldest.id) onSelectApplicant(oldest.id);
        },
      });
    }

    // 4. Posisi lewat kuota (amber) — Accepted > kuota per title-string join
    const acceptedByTitle = new Map<string, number>();
    applicants.forEach((a) => {
      if (a.status !== 'Accepted') return;
      const key = (a.jabatanDituju || '').toLowerCase().trim();
      if (!key) return;
      acceptedByTitle.set(key, (acceptedByTitle.get(key) || 0) + 1);
    });
    const overQuota = trackers.filter((t) => {
      const jumlah = parseInt(String(t.jumlah ?? ''), 10) || 0;
      const accepted = acceptedByTitle.get((t.title || '').toLowerCase().trim()) || 0;
      return accepted > jumlah;
    });
    if (overQuota.length > 0) {
      rows.push({
        id: 'positions-over-quota',
        severity: 'amber',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Posisi lewat kuota',
        detail: overQuota[0].title,
        count: overQuota.length,
        onClick: () => onOpenTrackers?.(),
      });
    }

    // 5. Posisi Open tanpa pelamar (neutral) — zero applications for the title
    const applicantTitles = new Set(
      applicants.map((a) => (a.jabatanDituju || '').toLowerCase().trim()).filter(Boolean),
    );
    const zeroApps = trackers.filter(
      (t) =>
        (t.status || 'Open') === 'Open' &&
        (t.title || '').trim() !== '' &&
        !applicantTitles.has((t.title || '').toLowerCase().trim()),
    );
    if (zeroApps.length > 0) {
      rows.push({
        id: 'positions-zero-apps',
        severity: 'neutral',
        icon: <Briefcase className="h-4 w-4" />,
        label: 'Posisi Open tanpa pelamar',
        detail: zeroApps[0].title,
        count: zeroApps.length,
        onClick: () => onOpenTrackers?.(),
      });
    }

    return rows;
  }, [applicants, trackers, interviews, onSelectApplicant, onOpenTrackers, onViewCalendar]);

  return (
    <div className="space-y-6">
      {/* Perlu Tindakan */}
      <section aria-label="Perlu Tindakan">
        <div className="flex items-center justify-between gap-3 pb-2">
          <div>
            <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Perlu Tindakan</h3>
            <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
              Hal yang menunggu tindakan Anda
            </p>
          </div>
          {items.length > 0 && (
            <span className="h-5 min-w-[20px] px-1 bg-editorial-red text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shrink-0">
              {items.length}
            </span>
          )}
        </div>

        <div className="bg-white p-2 rounded-2xl border border-editorial-border shadow-xs">
          {items.length === 0 ? (
            <AdminEmptyState
              compact
              icon={<CheckCircle2 className="h-7 w-7" />}
              title="Tidak ada yang perlu tindakan"
              body="Semua berkas dan posisi sudah tertangani."
            />
          ) : (
            <div className="space-y-0.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 min-h-[44px] px-2.5 py-2 rounded-xl hover:bg-stone-50 transition-colors text-left cursor-pointer group"
                >
                  <span
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${SEVERITY_ICON_CLASS[item.severity]}`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-stone-800 truncate">{item.label}</span>
                    {item.detail && (
                      <span className="block text-[10px] text-stone-400 font-semibold truncate">{item.detail}</span>
                    )}
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 tabular-nums shrink-0">
                    {item.count}
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 text-stone-300 group-hover:text-brand-700 transition-colors shrink-0"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Jadwal Hari Ini — moved from the bottom of the analytics region into the rail */}
      <section aria-label="Jadwal Hari Ini">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-xs space-y-4 berkas-stripe">
          <div className="flex justify-between items-center pb-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Jadwal Hari Ini</h3>
              <span className="h-5 w-5 bg-brand-700 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center">
                {scheduleList.filter((s) => s.isLive).length || scheduleList.length}
              </span>
            </div>
            <span className="text-stone-300">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          </div>

          <div className="space-y-3">
            {scheduleList.length === 0 ? (
              <AdminEmptyState
                compact
                icon={<Calendar className="h-7 w-7" />}
                title="Belum ada jadwal wawancara"
                body="Belum ada jadwal wawancara mendatang. Buka agenda untuk menjadwalkan wawancara pelamar."
                actionLabel="Buka Agenda"
                onAction={onViewCalendar}
              />
            ) : (
              scheduleList.map((sch) => (
                <div
                  key={sch.id}
                  onClick={() => {
                    if (sch.applicantId) {
                      onSelectApplicant(sch.applicantId);
                    }
                  }}
                  className={`p-3 rounded-xl border border-stone-50 flex flex-col space-y-1 ${sch.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-normal uppercase whitespace-nowrap block">{sch.time}</span>
                    {sch.applicantId && (
                      <span className="text-[10px] font-bold bg-editorial-navy/10 text-editorial-navy px-1.5 py-0.5 rounded-md uppercase">Tindakan</span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold tracking-tight block leading-normal">{sch.title}</span>
                  {sch.applicantId && (
                    <span className="text-[10px] opacity-80 font-medium block mt-1 underline">Mulai Tinjau Profil &rarr;</span>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            onClick={onViewCalendar}
            className="w-full text-center py-2.5 hover:bg-stone-50 border border-dashed border-stone-200 mt-2 text-xs font-bold text-brand-700 rounded-xl transition-all cursor-pointer"
          >
            Lihat Agenda
          </button>
        </div>
      </section>
    </div>
  );
};