import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts';
import {
  Sliders,
  MapPin,
  Calendar,
  Clock,
  MoreHorizontal,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  Briefcase,
  CheckCircle2,
  XCircle,
  Users,
  Filter,
  X,
  User,
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Applicant } from '../types';
import type { TrackerItem } from '../lib/sheets';
import type { Interview } from '../lib/interview-links';
import { GreetingBar } from './dashboard/GreetingBar';
import { AdminEmptyState } from './dashboard/AdminEmptyState';
import { CountUp } from './dashboard/CountUp';
import { Sparkline } from './dashboard/Sparkline';
import { RecruitmentFunnel } from './dashboard/RecruitmentFunnel';
import { ActionList } from './dashboard/ActionList';

interface DashboardProps {
  applicants: Applicant[];
  onSelectApplicant: (id: string) => void;
  onViewAll?: () => void;
  vacancies?: any[];
  adminEmail?: string;
  lastSyncAt?: Date | null;
  interviews?: Interview[];
  trackers?: TrackerItem[];
  onViewCalendar?: () => void;
  onOpenTrackers?: () => void;
}

interface TimelinePoint {
  name: string;
  application: number;
  previous: number;
  fullLabel: string;
}

// Token-derived multi-hue palette for per-position bars & education bars
const POSITION_BAR_COLORS = ['#C2410C', '#F59E0B', '#2D6A4F', '#1A1F2E', '#9B2226', '#B45309', '#57534E'];

// ── Analitik & Aktivitas collapse persistence (design 2026-09-08 §4) ────────
// Key: luzie_dashboard_collapsed_v1 = { _v: 1, collapsed: boolean }
// Default OPEN (dashboard shown by default per requirement).
const ANALYTICS_STORAGE_KEY = 'luzie_dashboard_collapsed_v1';
const ANALYTICS_WIDGET_COUNT = 13;

function readAnalyticsCollapsed(): boolean | null {
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed._v !== 1 || typeof parsed.collapsed !== 'boolean') return null;
    return parsed.collapsed;
  } catch {
    return null;
  }
}

function writeAnalyticsCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify({ _v: 1, collapsed }));
  } catch {
    // storage full/blocked — collapse state simply won't persist
  }
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload?: TimelinePoint }>;
  label?: string;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const dataPoint = payload[0]?.payload;
  const fullLabel = dataPoint?.fullLabel ?? label ?? '';
  const current = payload.find(p => p.dataKey === 'application')?.value ?? 0;
  const previous = payload.find(p => p.dataKey === 'previous')?.value ?? 0;
  const delta = current - previous;
  const deltaPct = previous === 0
    ? (current > 0 ? 100 : 0)
    : Math.round((delta / previous) * 100);

  return (
    <div className="bg-editorial-navy text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[160px] border border-white/10">
      <div className="font-extrabold text-stone-200 uppercase tracking-wider text-[10px]">
        {fullLabel}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif font-black text-xl leading-none text-white">
          {current}
        </span>
        <span className="text-stone-400 text-[10px]">lamaran</span>
      </div>
      {previous > 0 || current > 0 ? (
        <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-slate-700">
          <span className="text-stone-400">Periode sebelumnya:</span>
          <span className="text-stone-200 font-bold">{previous}</span>
          {previous > 0 && (
            <span className={delta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {delta >= 0 ? '+' : ''}{deltaPct}%
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const AdminDashboard: React.FC<DashboardProps> = ({
  applicants,
  onSelectApplicant,
  onViewAll,
  vacancies = [],
  adminEmail = '',
  lastSyncAt = null,
  interviews = [],
  trackers = [],
  onViewCalendar,
  onOpenTrackers,
}) => {
  const [timeRange, setTimeRange] = useState<'12m' | '30d' | '7l'>('12m');

  // Helper to map search raw position to official vacancy title loaded from backend server
  const getOfficialPositionName = (rawTitle: string) => {
    if (!rawTitle) return '';
    const match = vacancies.find(
      (v) => v.title && v.title.toLowerCase().trim() === rawTitle.toLowerCase().trim()
    );
    return match ? match.title : rawTitle;
  };

  // Multi-filter customizable states
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);

  // Helper to parse dates robustly
  const parseSubmissionDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    }
    const parts = dateStr.split(',')[0].split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Extract list of all positions directly from vacancies dataset
  const dynamicJobs = useMemo(() => {
    const list = vacancies.map(v => (v.title || '').trim()).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [vacancies]);

  // Dynamically filtered applicant database inside dashboard memory
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      // 1. Month Filter
      if (selectedMonth !== 'all') {
        const date = parseSubmissionDate(app.submissionDate);
        if (!date || date.getMonth() !== Number(selectedMonth)) {
          return false;
        }
      }
      // 2. Position Filter
      if (selectedJob !== 'all') {
        const cPosition = getOfficialPositionName(app.jabatanDituju);
        if (cPosition.toLowerCase().trim() !== selectedJob.toLowerCase().trim()) {
          return false;
        }
      }
      // 3. Status Filter
      if (selectedStatus !== 'all') {
        if (app.status !== selectedStatus) {
          return false;
        }
      }
      return true;
    });
  }, [applicants, selectedMonth, selectedJob, selectedStatus]);

  // Compute live synchronized statistics
  const stats = useMemo(() => {
    const totalActual = filteredApplicants.length;
    const pendingActual = filteredApplicants.filter((a) => a.status === 'Pending').length;
    const reviewedActual = filteredApplicants.filter((a) => a.status === 'Reviewed').length;
    const interviewHRActual = filteredApplicants.filter((a) => a.status === 'Interview HR').length;
    const interviewUserActual = filteredApplicants.filter((a) => a.status === 'Interview User').length;
    const acceptedActual = filteredApplicants.filter((a) => a.status === 'Accepted').length;
    const rejectedActual = filteredApplicants.filter((a) => a.status === 'Rejected').length;
    const shortlistedActual = reviewedActual + interviewHRActual + interviewUserActual;

    return {
      totalApps: totalActual,
      pending: pendingActual,
      shortlisted: shortlistedActual,
      reviewedCount: reviewedActual,
      hired: acceptedActual,
      rejected: rejectedActual,
      interviewHR: interviewHRActual,
      interviewUser: interviewUserActual,
    };
  }, [filteredApplicants]);

  // Applications per position (respects dashboard filters) — top 7 for the bar chart
  const positionChartData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredApplicants.forEach((a) => {
      const name = getOfficialPositionName(a.jabatanDituju || '') || 'Tanpa Posisi';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filteredApplicants, vacancies]);

  // Review speed — how long berkas sit in Pending/Reviewed triage
  const reviewSpeed = useMemo(() => {
    const triage = filteredApplicants.filter((a) => a.status === 'Pending' || a.status === 'Reviewed');
    if (triage.length === 0) return { avg: 0, oldest: 0, count: 0 };
    const now = Date.now();
    const days = triage.map((a) => {
      const d = parseSubmissionDate(a.submissionDate);
      return d ? Math.max(0, Math.floor((now - d.getTime()) / 86400000)) : 0;
    });
    return {
      avg: Math.round(days.reduce((s, x) => s + x, 0) / days.length),
      oldest: Math.max(...days),
      count: triage.length,
    };
  }, [filteredApplicants]);

  // Education mix — heuristic level detection from the last formal education row
  const educationStats = useMemo(() => {
    const counts = new Map<string, number>();
    filteredApplicants.forEach((a) => {
      const rows = a.pendidikanFormal || [];
      const raw = (rows[rows.length - 1]?.sekolah || '').toUpperCase();
      let level = 'Lainnya';
      if (/S1|SARJANA|UNIVERS|SEKOLAH TINGGI|INSTITUT|AKADEMI|POLTEK/.test(raw)) level = 'S1';
      else if (/D3|D.III|D-III/.test(raw)) level = 'D3';
      else if (/SMK/.test(raw)) level = 'SMK';
      else if (/SMA|SMP|SEKOLAH MENENGAH|MAN |MAS /.test(raw)) level = 'SMA/SMP';
      counts.set(level, (counts.get(level) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredApplicants]);

  // Compute real period-over-period statistics per KPI (this month vs last month)
  const kpiStats = useMemo(() => {
    const referenceDate = new Date();
    const currentMonthIdx = referenceDate.getMonth();
    const currentYearVal = referenceDate.getFullYear();

    let previousMonthIdx = currentMonthIdx - 1;
    let previousYearVal = currentYearVal;
    if (previousMonthIdx < 0) {
      previousMonthIdx = 11;
      previousYearVal -= 1;
    }

    const calculateKpi = (filterFn: (app: Applicant) => boolean) => {
      let currentMonthCount = 0;
      let previousMonthCount = 0;

      filteredApplicants.forEach((app) => {
        if (!filterFn(app)) return;
        const d = parseSubmissionDate(app.lastUpdated || app.submissionDate);
        if (!d) return;

        const m = d.getMonth();
        const y = d.getFullYear();

        if (m === currentMonthIdx && y === currentYearVal) {
          currentMonthCount++;
        } else if (m === previousMonthIdx && y === previousYearVal) {
          previousMonthCount++;
        }
      });

      let pctChange = 0;
      if (previousMonthCount > 0) {
        pctChange = ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100;
      } else if (currentMonthCount > 0) {
        pctChange = 100;
      }

      return {
        current: currentMonthCount,
        previous: previousMonthCount,
        pct: pctChange
      };
    };

    return {
      total: calculateKpi(() => true),
      pending: calculateKpi((a) => a.status === 'Pending'),
      shortlisted: calculateKpi((a) =>
        a.status === 'Reviewed' || a.status === 'Interview HR' || a.status === 'Interview User'
      ),
      hired: calculateKpi((a) => a.status === 'Accepted'),
      rejected: calculateKpi((a) => a.status === 'Rejected'),
    };
  }, [filteredApplicants]);

  // Sparkline data: 7-day daily counts per KPI filter
  const sparklineData = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const computeForFilter = (filter: (a: Applicant) => boolean): number[] => {
      const counts = [0, 0, 0, 0, 0, 0, 0];
      filteredApplicants.forEach((app) => {
        if (!filter(app)) return;
        const date = parseSubmissionDate(app.lastUpdated || app.submissionDate);
        if (!date || date < sevenDaysAgo || date > now) return;
        const dayIdx = Math.min(6, Math.floor((date.getTime() - sevenDaysAgo.getTime()) / (24 * 60 * 60 * 1000)));
        counts[dayIdx]++;
      });
      return counts;
    };

    return {
      total: computeForFilter(() => true),
      pending: computeForFilter((a) => a.status === 'Pending'),
      shortlisted: computeForFilter((a) =>
        a.status === 'Reviewed' || a.status === 'Interview HR' || a.status === 'Interview User'
      ),
      hired: computeForFilter((a) => a.status === 'Accepted'),
      rejected: computeForFilter((a) => a.status === 'Rejected'),
    };
  }, [filteredApplicants]);

  // Compute gender comparison statistics (Laki-laki vs Perempuan)
  const genderStats = useMemo(() => {
    let male = 0;
    let female = 0;

    filteredApplicants.forEach((app) => {
      const jk = (app.jenisKelamin || '').toLowerCase().trim();
      if (jk === 'laki-laki' || jk === 'laki' || jk === 'pria' || jk === 'l') {
        male++;
      } else if (jk === 'perempuan' || jk === 'wanita' || jk === 'p') {
        female++;
      }
    });

    if (male === 0 && female === 0) {
      return [
        { name: 'Laki-laki', value: 0, percent: 0, color: '#C2410C' },
        { name: 'Perempuan', value: 0, percent: 0, color: '#1A1F2E' },
      ];
    }

    const total = male + female;
    const malePercent = total > 0 ? Math.round((male / total) * 100) : 50;
    const femalePercent = total > 0 ? Math.round((female / total) * 100) : 50;

    return [
      { name: 'Laki-laki', value: male, percent: malePercent, color: '#C2410C' },
      { name: 'Perempuan', value: female, percent: femalePercent, color: '#1A1F2E' }
    ];
  }, [filteredApplicants, applicants]);

  // Aggregated timeline charts counting candidate applications month by month or day by day
  const timelineData = useMemo<TimelinePoint[]>(() => {
    const now = new Date();

    if (timeRange === '7l') {
      const daysAbbr = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      const fourteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      const currentDayCounts = [0, 0, 0, 0, 0, 0, 0];
      const previousDayCounts = [0, 0, 0, 0, 0, 0, 0];
      filteredApplicants.forEach((app) => {
        const date = parseSubmissionDate(app.submissionDate);
        if (!date) return;
        if (date >= sevenDaysAgo && date <= now) {
          const wDay = (date.getDay() + 6) % 7;
          currentDayCounts[wDay]++;
        } else if (date >= fourteenDaysAgo && date < sevenDaysAgo) {
          const wDay = (date.getDay() + 6) % 7;
          previousDayCounts[wDay]++;
        }
      });
      return daysAbbr.map((dName, idx) => {
        const refDate = new Date(sevenDaysAgo);
        refDate.setDate(refDate.getDate() + idx);
        const fullLabel = `${dName}, ${refDate.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][refDate.getMonth()]}`;
        return {
          name: dName,
          application: currentDayCounts[idx],
          previous: previousDayCounts[idx],
          fullLabel,
        };
      });
    }

    if (timeRange === '30d') {
      const weeksAbbr = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      const sixtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
      const currentWeekCounts = [0, 0, 0, 0];
      const previousWeekCounts = [0, 0, 0, 0];
      filteredApplicants.forEach((app) => {
        const date = parseSubmissionDate(app.submissionDate);
        if (!date) return;
        if (date >= thirtyDaysAgo && date <= now) {
          const dayVal = date.getDate();
          const wIdx = Math.min(Math.floor((dayVal - 1) / 7), 3);
          currentWeekCounts[wIdx]++;
        } else if (date >= sixtyDaysAgo && date < thirtyDaysAgo) {
          const dayVal = date.getDate();
          const wIdx = Math.min(Math.floor((dayVal - 1) / 7), 3);
          previousWeekCounts[wIdx]++;
        }
      });
      return weeksAbbr.map((wName, idx) => {
        const startDay = idx * 7 + 1;
        const endDay = Math.min(startDay + 6, 30);
        const fullLabel = `${wName} (${startDay}–${endDay} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][now.getMonth()]} ${now.getFullYear()})`;
        return {
          name: wName,
          application: currentWeekCounts[idx],
          previous: previousWeekCounts[idx],
          fullLabel,
        };
      });
    }

    // 12m mode
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    const currentMonthCounts = Array(12).fill(0);
    const previousMonthCounts = Array(12).fill(0);
    filteredApplicants.forEach((app) => {
      const date = parseSubmissionDate(app.submissionDate);
      if (!date) return;
      const m = date.getMonth();
      if (date.getFullYear() === currentYear) currentMonthCounts[m]++;
      else if (date.getFullYear() === previousYear) previousMonthCounts[m]++;
    });
    return months.map((mName, idx) => ({
      name: mName,
      application: currentMonthCounts[idx],
      previous: previousMonthCounts[idx],
      fullLabel: `${mName} ${currentYear}`,
    }));
  }, [filteredApplicants, timeRange]);

  // Grab the latest 5 applications from filtered list or empty state placeholder
  const latestApplicants = useMemo(() => {
    const sorted = [...filteredApplicants].sort((a, b) => {
      const dateA = parseSubmissionDate(a.submissionDate) || new Date(0);
      const dateB = parseSubmissionDate(b.submissionDate) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    return sorted.slice(0, 5);
  }, [filteredApplicants]);

  // ── Sumber Pelamar (design 2026-09-08 §5a) — volume per source ────────────
  const sourceVolumeData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredApplicants.forEach((app) => {
      const key = (app.sumberInfoLowongan || '').trim() || 'Belum tercatat';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = filteredApplicants.length;
    const entries = Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value,
      label: `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
    }));
    entries.sort((a, b) => b.value - a.value);
    // Top 7 categories; remainder grouped into one bucket (kept separate from
    // the taxonomy's own "Lainnya" value and from "Belum tercatat").
    if (entries.length > 8) {
      const top = entries.slice(0, 7);
      const restValue = entries.slice(7).reduce((s, e) => s + e.value, 0);
      top.push({ name: 'Lainnya (gabungan)', value: restValue, label: `${restValue} (${total > 0 ? Math.round((restValue / total) * 100) : 0}%)` });
      return top;
    }
    return entries;
  }, [filteredApplicants]);

  // ── Kualitas Sumber (§5b) — Diterima vs total per source, n≥3 gate ────────
  const sourceQualityData = useMemo(() => {
    const map = new Map<string, { total: number; accepted: number }>();
    filteredApplicants.forEach((app) => {
      const key = (app.sumberInfoLowongan || '').trim() || 'Belum tercatat';
      const entry = map.get(key) || { total: 0, accepted: 0 };
      entry.total += 1;
      if (app.status === 'Accepted') entry.accepted += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([name, { total, accepted }]) => ({
        name,
        total,
        accepted,
        rate: total >= 3 ? Math.round((accepted / total) * 100) : null,
      }))
      .sort((a, b) => b.accepted - a.accepted || b.total - a.total);
  }, [filteredApplicants]);

  // ── Treker Posisi metrics (§5c–f). Title-string join with applicants —
  // accepted risk inherited from existing tracker behavior (§7). ─────────────
  const trackerStats = useMemo(() => {
    const openReqs = trackers.filter((t) => (t.status || 'Open') === 'Open');
    const target = openReqs.reduce((s, t) => s + (parseInt(String(t.jumlah ?? ''), 10) || 0), 0);

    const acceptedByTitle = new Map<string, number>();
    applicants.forEach((a) => {
      if (a.status !== 'Accepted') return;
      const key = (a.jabatanDituju || '').toLowerCase().trim();
      if (!key) return;
      acceptedByTitle.set(key, (acceptedByTitle.get(key) || 0) + 1);
    });

    const quota = trackers
      .map((t) => {
        const jumlah = parseInt(String(t.jumlah ?? ''), 10) || 0;
        const accepted = acceptedByTitle.get((t.title || '').toLowerCase().trim()) || 0;
        return {
          title: t.title || '(tanpa nama)',
          status: t.status || 'Open',
          jumlah,
          accepted,
          remaining: Math.max(0, jumlah - accepted),
          overQuota: accepted > jumlah,
        };
      })
      .sort((a, b) => b.remaining - a.remaining);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parseDate = (s?: string) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const aging = trackers
      .filter((t) => (t.status || 'Open') === 'Open' || t.status === 'On Hold')
      .map((t) => {
        const dibuka = parseDate(t.tanggalDibuka);
        const terakhir = parseDate(t.tanggalTerakhir);
        return {
          title: t.title || '(tanpa nama)',
          daysOpen: dibuka ? Math.max(0, Math.floor((today.getTime() - dibuka.getTime()) / 86400000)) : null,
          overdue: !!terakhir && terakhir < today,
          onHold: t.status === 'On Hold',
        };
      })
      .sort((a, b) => (b.daysOpen ?? -1) - (a.daysOpen ?? -1));

    const daysToFill: number[] = [];
    trackers.forEach((t) => {
      if (t.status !== 'Closed-Filled' && t.status !== 'Closed-Unfilled') return;
      const d0 = parseDate(t.tanggalDibuka);
      const d1 = parseDate(t.tanggalSelesai);
      if (d0 && d1) daysToFill.push(Math.max(0, Math.floor((d1.getTime() - d0.getTime()) / 86400000)));
    });

    return {
      openCount: openReqs.length,
      target,
      slotsRemaining: quota.reduce((s, q) => s + q.remaining, 0),
      quota,
      filled: trackers.filter((t) => t.status === 'Closed-Filled').length,
      unfilled: trackers.filter((t) => t.status === 'Closed-Unfilled').length,
      avgDaysToFill: daysToFill.length > 0 ? Math.round(daysToFill.reduce((s, d) => s + d, 0) / daysToFill.length) : null,
      aging,
    };
  }, [trackers, applicants]);

  // ── Analitik & Aktivitas collapse state (§4) — default open ───────────────
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(true);
  const [analyticsHydrated, setAnalyticsHydrated] = useState<boolean>(false);
  useEffect(() => {
    const collapsed = readAnalyticsCollapsed();
    if (collapsed !== null) setAnalyticsOpen(!collapsed);
    setAnalyticsHydrated(true);
  }, []);
  const toggleAnalytics = () => {
    setAnalyticsOpen(prev => {
      const next = !prev;
      writeAnalyticsCollapsed(!next);
      return next;
    });
  };

  // Upcoming interviews (real data): today onwards, sorted, max 5
  const scheduleList = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [...(interviews || [])]
      .filter((ev) => String(ev.date || '').slice(0, 10) >= todayStr)
      .sort((a, b) =>
        `${a.date || ''}${a.startTime ?? a.start ?? ''}`.localeCompare(
          `${b.date || ''}${b.startTime ?? b.start ?? ''}`,
        ),
      )
      .slice(0, 5)
      .map((ev) => {
        const isHR = /hr/i.test(String(ev.stage || ''));
        return {
          id: String(ev.id),
          time: `${String(ev.date || '').slice(0, 10)} · ${ev.startTime ?? ev.start ?? ''}`,
          title: `Wawancara ${ev.stage || ''}: ${ev.candidateName || ''} (${ev.position || ''}) — ${ev.interviewer || ''}`,
          applicantId: (ev.applicantId as string) || undefined,
          isLive: true,
          color: isHR
            ? 'bg-amber-50/85 hover:bg-amber-100/95 text-amber-950 border-l-4 border-amber-500 cursor-pointer transition-all'
            : 'bg-brand-50/85 hover:bg-brand-100/95 text-editorial-navy border-l-4 border-brand-700 cursor-pointer transition-all',
        };
      });
  }, [interviews]);

  return (
    <div className="space-y-8 select-none font-sans grain-overlay" id="admin-dashboard-container">
      {/* 1. Greeting bar with live sync indicator */}
      <GreetingBar adminEmail={adminEmail} lastSyncAt={lastSyncAt} />

      {/* 1b. Two-column shell: main content left, Perlu Tindakan rail right (≥lg).
          The rail lives OUTSIDE the analytics collapse region so it stays visible
          when analytics is hidden. Below lg the rail stacks after the content. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
        {/* Left: main column */}
        <div className="space-y-8 min-w-0">

      {/* Filter & Kustomisasi trigger (kept as-is, but pulled out of greeting block) */}
      <div className="flex items-center justify-end font-sans text-xs relative -mt-4" style={{ zIndex: 100 }}>
        {(selectedMonth !== 'all' || selectedJob !== 'all' || selectedStatus !== 'all') && (
          <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1.5 rounded-xl flex items-center space-x-1 mr-2 animate-pulse">
            <span>Filter Aktif</span>
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
            className={`flex items-center space-x-2 px-4 py-2.5 border rounded-xl hover:bg-stone-50 transition-all font-bold cursor-pointer shadow-xs ${
              isCustomizeOpen || selectedMonth !== 'all' || selectedJob !== 'all' || selectedStatus !== 'all'
                ? 'bg-brand-50 border-brand-200 text-brand-700'
                : 'bg-white border-stone-200 text-stone-700'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Filter & Kustomisasi</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isCustomizeOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCustomizeOpen && (
            <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-stone-200 shadow-xl p-5 z-50 space-y-4 text-xs animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <h4 className="font-bold text-stone-900 flex items-center space-x-1.5">
                  <Filter className="h-3.5 w-3.5 text-brand-700" />
                  <span>Konfigurasi Filter</span>
                </h4>
                {(selectedMonth !== 'all' || selectedJob !== 'all' || selectedStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedMonth('all');
                      setSelectedJob('all');
                      setSelectedStatus('all');
                    }}
                    className="text-[10px] font-black text-rose-500 hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dash-month" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide">Filter Sesuai Bulan</label>
                <select
                  id="dash-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-semibold focus:ring-2 focus:ring-brand-200 text-xs"
                >
                  <option value="all">Semua Bulan (Tahun 2026)</option>
                  {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((mName, idx) => (
                    <option key={idx} value={idx.toString()}>{mName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dash-job" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide">Filter Jabatan Posisi</label>
                <select
                  id="dash-job"
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-semibold focus:ring-2 focus:ring-brand-200 text-xs"
                >
                  <option value="all">Semua Formasi Jabatan</option>
                  {dynamicJobs.map((job, idx) => (
                    <option key={idx} value={job}>{job}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dash-status" className="block text-[10px] font-bold text-stone-500 uppercase tracking-wide">Filter Status Pelamar</label>
                <select
                  id="dash-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-semibold focus:ring-2 focus:ring-brand-200 text-xs"
                >
                  <option value="all">Semua Status Pelamar</option>
                  <option value="Pending">Belum Direview (Pending)</option>
                  <option value="Reviewed">Sedang di Review (Reviewed)</option>
                  <option value="Interview HR">Wawancara HR (Interview HR)</option>
                  <option value="Interview User">Wawancara User (Interview User)</option>
                  <option value="Accepted">Lolos Seleksi (Accepted)</option>
                  <option value="Rejected">Gugur Seleksi (Rejected)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[10px] text-stone-400 font-bold">
                  Ditemukan: <strong className="text-stone-700 font-extrabold">{filteredApplicants.length} Pelamar</strong>
                </span>

                <button
                  onClick={() => setIsCustomizeOpen(false)}
                  className="bg-brand-700 hover:bg-brand-800 transition-colors text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer shadow-xs"
                >
                  Tutup & Terapkan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI Row with sparklines, count-up, Playfair numbers, staggered entrance */}
      <div
        className="dashboard-stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4"
        style={{ counterReset: 'kpi' } as React.CSSProperties}
      >
        {/* Total Lamaran Card */}
        <div
          className="p-5 rounded-2xl border border-brand-500/40 shadow-sm flex flex-col justify-between space-y-3 relative bg-linear-to-br from-brand-700 via-brand-600 to-amber-600 text-white"
          style={{ ['--i' as any]: 0 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-100">Total Lamaran</span>
            <ArrowUpRight className="h-4 w-4 text-white/70" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-white">
                <CountUp value={stats.totalApps} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.total.pct >= 0 ? 'bg-white/25 text-white' : 'bg-stone-900/25 text-white'
              }`}>
                {kpiStats.total.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.total.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.total}
              color="#FFEDD5"
              height={28}
              className="-mx-1"
            />
            <span className="text-[10px] text-brand-100 font-bold block pt-1">
              {kpiStats.total.pct >= 0 ? '+' : ''}{kpiStats.total.pct.toFixed(0)}% dari bulan lalu
            </span>
          </div>
        </div>

        {/* Menunggu Review Card */}
        <div
          className="p-5 rounded-2xl border border-amber-500/40 shadow-sm flex flex-col justify-between space-y-3 relative bg-linear-to-br from-amber-700 via-amber-700 to-orange-700 text-white"
          style={{ ['--i' as any]: 1 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-100">Menunggu Review</span>
            <ArrowUpRight className="h-4 w-4 text-white/70" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-white">
                <CountUp value={stats.pending} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.pending.pct >= 0 ? 'bg-white/25 text-white' : 'bg-stone-900/25 text-white'
              }`}>
                {kpiStats.pending.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.pending.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.pending}
              color="#FDE68A"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-amber-100 font-bold block pt-1">
              {kpiStats.pending.pct >= 0 ? '+' : ''}{kpiStats.pending.pct.toFixed(0)}% dari bulan lalu
            </span>
          </div>
        </div>

        {/* Sedang di Review Card */}
        <div
          className="p-5 rounded-2xl border border-slate-500/30 shadow-sm flex flex-col justify-between space-y-3 relative bg-linear-to-br from-editorial-navy via-slate-800 to-slate-700 text-white"
          style={{ ['--i' as any]: 2 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Sedang di Review</span>
            <ArrowUpRight className="h-4 w-4 text-white/70" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-white">
                <CountUp value={stats.shortlisted} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.shortlisted.pct >= 0 ? 'bg-white/25 text-white' : 'bg-stone-900/25 text-white'
              }`}>
                {kpiStats.shortlisted.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.shortlisted.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.shortlisted}
              color="#E2E8F0"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-slate-300 font-bold block pt-1">
              {kpiStats.shortlisted.pct >= 0 ? '+' : ''}{kpiStats.shortlisted.pct.toFixed(0)}% dari bulan lalu
            </span>
          </div>
        </div>

        {/* Lolos Seleksi Card */}
        <div
          className="p-5 rounded-2xl border border-emerald-500/30 shadow-sm flex flex-col justify-between space-y-3 relative bg-linear-to-br from-editorial-green via-emerald-700 to-emerald-600 text-white"
          style={{ ['--i' as any]: 3 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100">Lolos Seleksi</span>
            <ArrowUpRight className="h-4 w-4 text-white/70" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-white">
                <CountUp value={stats.hired} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.hired.pct >= 0 ? 'bg-white/25 text-white' : 'bg-stone-900/25 text-white'
              }`}>
                {kpiStats.hired.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.hired.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.hired}
              color="#D1FAE5"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-emerald-100 font-bold block pt-1">
              {kpiStats.hired.pct >= 0 ? '+' : ''}{kpiStats.hired.pct.toFixed(0)}% dari bulan lalu
            </span>
          </div>
        </div>

        {/* Rejected Card */}
        <div
          className="p-5 rounded-2xl border border-rose-500/30 shadow-sm flex flex-col justify-between space-y-3 relative bg-linear-to-br from-editorial-red via-rose-800 to-rose-700 text-white"
          style={{ ['--i' as any]: 4 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-100">Gugur Seleksi</span>
            <ArrowUpRight className="h-4 w-4 text-white/70" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-white">
                <CountUp value={stats.rejected} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.rejected.pct >= 0 ? 'bg-white/25 text-white' : 'bg-stone-900/25 text-white'
              }`}>
                {kpiStats.rejected.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.rejected.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.rejected}
              color="#FECDD3"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-rose-100 font-bold block pt-1">
              {kpiStats.rejected.pct >= 0 ? '+' : ''}{kpiStats.rejected.pct.toFixed(0)}% dari bulan lalu
            </span>
          </div>
        </div>
      </div>

      {/* 2b. Analitik & Aktivitas — collapse toggle (design 2026-09-08 §4).
          Renders even in the dashboard empty-state; region defaults OPEN. */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Analitik &amp; Aktivitas</h3>
          <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
            Corong, tren, sumber pelamar, dan metrik Treker Posisi
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAnalytics}
          aria-expanded={analyticsOpen}
          aria-controls="analytics-region"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-700 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
          title={analyticsOpen ? 'Sembunyikan analitik' : 'Tampilkan analitik'}
        >
          {analyticsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{analyticsOpen ? 'Sembunyikan Analitik' : 'Tampilkan Analitik'}</span>
        </button>
      </div>

      {analyticsHydrated && !analyticsOpen && (
        <p className="text-[10px] text-stone-400 font-bold text-center border border-dashed border-stone-200 rounded-xl bg-stone-50/50 py-2">
          {ANALYTICS_WIDGET_COUNT} widget analitik disembunyikan
        </p>
      )}

      <div id="analytics-region" className={`funnel-collapse ${analyticsOpen ? 'open' : ''}`}>
        <div>
          <div className="space-y-6 pt-2">

      {/* 3. Recruitment Funnel */}
      <RecruitmentFunnel
        stats={{
          pending: stats.pending,
          reviewed: stats.reviewedCount,
          interviewHR: stats.interviewHR,
          interviewUser: stats.interviewUser,
          accepted: stats.hired,
          rejected: stats.rejected,
        }}
      />

      {/* 3b. Lamaran per Posisi + Kecepatan Triage + Pendidikan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        {/* Bar chart: applications per position */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-4 berkas-stripe">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Lamaran per Posisi</h3>
              <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                Distribusi lamaran pada 7 posisi teratas (mengikuti filter aktif)
              </p>
            </div>
          </div>
          <div className="h-72" role="img" aria-label={`Distribusi lamaran per posisi, total ${positionChartData.reduce((s, p) => s + p.value, 0)} lamaran pada ${positionChartData.length} posisi.`}>
            {positionChartData.length === 0 ? (
              <AdminEmptyState
                compact
                icon={<Briefcase className="h-7 w-7" />}
                title="Belum ada data posisi"
                body="Distribusi lamaran per posisi akan muncul setelah ada berkas masuk."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={positionChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#94A3B8" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} fontSize={10} stroke="#64748B" axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)} />
                  <Tooltip
                    cursor={{ fill: 'rgba(194, 65, 12, 0.06)' }}
                    contentStyle={{ background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                    labelStyle={{ color: '#E7E5E4', fontWeight: 800 }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" name="Lamaran" radius={[0, 6, 6, 0]} barSize={18}>
                    {positionChartData.map((_, i) => (
                      <Cell key={i} fill={POSITION_BAR_COLORS[i % POSITION_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {/* Right column: review speed + education mix */}
        <div className="space-y-6">
          {/* Review speed KPI */}
          <div
            className={`p-6 rounded-2xl border shadow-xs space-y-3 berkas-stripe bg-white ${
              reviewSpeed.avg >= 14 ? 'border-red-200' : reviewSpeed.avg >= 7 ? 'border-amber-200' : 'border-editorial-border'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Kecepatan Triage</h3>
                <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                  Rata-rata berkas menunggu di triage (Belum/Sedang direview)
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`kpi-stat-value text-3xl ${reviewSpeed.avg >= 14 ? 'text-editorial-red' : reviewSpeed.avg >= 7 ? 'text-amber-600' : 'text-editorial-green'}`}>
                {reviewSpeed.avg}
              </span>
              <span className="text-xs font-extrabold text-stone-500 uppercase tracking-wider">hari</span>
              <span className="ml-auto text-[10px] font-extrabold text-stone-400 bg-stone-100 rounded-md px-2 py-1">
                {reviewSpeed.count} berkas
              </span>
            </div>
            {reviewSpeed.count > 0 && (
              <p className={`text-[10px] font-bold ${reviewSpeed.oldest >= 14 ? 'text-editorial-red' : 'text-stone-400'}`}>
                Berkas tertua menunggu {reviewSpeed.oldest} hari
                {reviewSpeed.avg >= 7 ? ' — pertimbangkan review segera.' : '.'}
              </p>
            )}
          </div>

          {/* Education mix */}
          <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-3 berkas-stripe">
            <div>
              <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Komposisi Pendidikan</h3>
              <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                Estimasi jenjang dari riwayat pendidikan terakhir
              </p>
            </div>
            {educationStats.length === 0 ? (
              <p className="text-xs text-stone-400 font-bold italic py-2">Belum ada data pendidikan.</p>
            ) : (
              <div className="space-y-2.5">
                {educationStats.map((edu, idx) => {
                  const pct = Math.round((edu.value / Math.max(1, filteredApplicants.length)) * 100);
                  return (
                    <div key={edu.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-600">{edu.name}</span>
                        <span className="font-black text-stone-900 tabular-nums">{edu.value} <span className="text-stone-400 font-bold">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: POSITION_BAR_COLORS[idx % POSITION_BAR_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3c. Sumber Pelamar — volume (design 2026-09-08 §5a) */}
      <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-4 berkas-stripe">
        <div>
          <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Sumber Pelamar</h3>
          <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
            Volume lamaran per sumber informasi lowongan (mengikuti filter aktif)
          </p>
        </div>
        <div className="h-80" role="img" aria-label={`Sumber pelamar: ${sourceVolumeData.map((s) => `${s.name} ${s.value}`).join(', ')}.`}>
          {sourceVolumeData.length === 0 ? (
            <AdminEmptyState
              compact
              icon={<Users className="h-7 w-7" />}
              title="Belum ada data sumber"
              body="Sumber lamaran akan muncul setelah pelamar mengisi pertanyaan sumber info lowongan."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceVolumeData} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#94A3B8" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={160} fontSize={10} stroke="#64748B" axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
                <Tooltip
                  cursor={{ fill: 'rgba(194, 65, 12, 0.06)' }}
                  contentStyle={{ background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  labelStyle={{ color: '#E7E5E4', fontWeight: 800 }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" name="Lamaran" radius={[0, 6, 6, 0]} barSize={16}>
                  <LabelList dataKey="label" position="right" fontSize={10} fill="#57534E" fontWeight={700} />
                  {sourceVolumeData.map((_, i) => (
                    <Cell key={i} fill={POSITION_BAR_COLORS[i % POSITION_BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>


      {/* 3d. Kualitas Sumber — source-to-hire (§5b) */}
      <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-4 berkas-stripe">
        <div>
          <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Kualitas Sumber</h3>
          <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
            Tingkat penerimaan per sumber — rasio disembunyikan untuk sampel kecil (n &lt; 3)
          </p>
        </div>
        {sourceQualityData.length === 0 ? (
          <AdminEmptyState
            compact
            icon={<Users className="h-7 w-7" />}
            title="Belum ada data"
            body="Kualitas sumber muncul setelah ada berkas dengan sumber tercatat."
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_64px_64px_72px] gap-2 text-[10px] font-extrabold text-stone-400 uppercase tracking-wider border-b border-stone-100 pb-1.5">
              <span>Sumber</span>
              <span className="text-center">Diterima</span>
              <span className="text-center">Total</span>
              <span className="text-center">Rate</span>
            </div>
            {sourceQualityData.map((row) => (
              <div key={row.name} className="grid grid-cols-[1fr_64px_64px_72px] gap-2 items-center text-xs border-b border-stone-50 pb-1.5 last:border-none last:pb-0">
                <span className="font-bold text-stone-700 truncate" title={row.name}>{row.name}</span>
                <span className="text-center font-black text-editorial-green tabular-nums">{row.accepted}</span>
                <span className="text-center font-bold text-stone-600 tabular-nums">{row.total}</span>
                <span className="text-center font-bold tabular-nums">
                  {row.rate === null ? (
                    <span className="text-stone-400 text-[10px]">n={row.total}</span>
                  ) : (
                    <span className={row.rate >= 20 ? 'text-editorial-green' : row.rate > 0 ? 'text-amber-600' : 'text-stone-400'}>{row.rate}%</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* 3e. Headcount strip + Kuota per Posisi + Aging + Fill rate (§5c–f).
          Tracker widgets render an empty state while the Trackers tab has no rows. */}
      {trackers.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs">
          <AdminEmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="Treker Posisi belum diisi"
            body="Metrik kuota, aging posisi, dan fill rate muncul setelah Treker Posisi memiliki data."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Headcount gap summary strip (§5c) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-editorial-border bg-white shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Rekrutmen Terbuka</span>
              <span className="kpi-stat-value text-2xl text-editorial-navy block">{trackerStats.openCount}</span>
              <span className="text-[10px] text-stone-400 font-bold block">posisi berstatus Open</span>
            </div>
            <div className="p-5 rounded-2xl border border-editorial-border bg-white shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Target Headcount</span>
              <span className="kpi-stat-value text-2xl text-editorial-navy block">{trackerStats.target}</span>
              <span className="text-[10px] text-stone-400 font-bold block">total kuota posisi Open</span>
            </div>
            <div className={`p-5 rounded-2xl border bg-white shadow-xs space-y-1 ${trackerStats.slotsRemaining === 0 ? 'border-amber-200' : 'border-editorial-border'}`}>
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">Sisa Kuota</span>
              <span className={`kpi-stat-value text-2xl block ${trackerStats.slotsRemaining === 0 ? 'text-amber-600' : 'text-editorial-green'}`}>{trackerStats.slotsRemaining}</span>
              <span className="text-[10px] text-stone-400 font-bold block">target − Diterima per posisi</span>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kuota per Posisi (§5d) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-4 berkas-stripe">
              <div>
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Kuota per Posisi</h3>
                <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                  Diterima dibanding kuota Treker Posisi — diurutkan dari sisa kuota terbesar
                </p>
              </div>
              <div className="space-y-3">
                {trackerStats.quota.map((q) => {
                  const pct = q.jumlah > 0 ? Math.min(100, Math.round((q.accepted / q.jumlah) * 100)) : 0;
                  return (
                    <div key={q.title} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-stone-700 truncate" title={q.title}>
                          {q.title}
                          {q.status === 'On Hold' && <span className="ml-1.5 text-[9px] bg-stone-100 text-stone-500 font-extrabold px-1.5 py-0.5 rounded-md uppercase align-middle">On Hold</span>}
                        </span>
                        <span className={`font-black tabular-nums shrink-0 ${q.overQuota ? 'text-amber-600' : 'text-stone-900'}`}>
                          {q.accepted}/{q.jumlah || '—'}
                          {q.overQuota && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 font-extrabold px-1.5 py-0.5 rounded-md uppercase">Lewat Kuota</span>}
                        </span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${q.overQuota ? 'bg-amber-500' : 'bg-editorial-green'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Right column: Aging + Fill rate */}
            <div className="space-y-6">
              {/* Aging Posisi (§5e) */}
              <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-3 berkas-stripe">
                <div>
                  <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Aging Posisi</h3>
                  <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                    Lama posisi terbuka — tertua lebih dulu
                  </p>
                </div>
                {trackerStats.aging.length === 0 ? (
                  <p className="text-xs text-stone-400 font-bold italic py-2">Tidak ada posisi berstatus Open / On-Hold.</p>
                ) : (
                  <div className="space-y-2">
                    {trackerStats.aging.slice(0, 6).map((t) => (
                      <div key={t.title} className="flex items-center justify-between text-xs border-b border-stone-50 pb-1.5 last:border-none last:pb-0 gap-2">
                        <span className="font-bold text-stone-700 truncate" title={t.title}>
                          {t.title}
                          {t.onHold && <span className="ml-1.5 text-[9px] bg-stone-100 text-stone-500 font-extrabold px-1.5 py-0.5 rounded-md uppercase align-middle">Hold</span>}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0 font-bold tabular-nums">
                          {t.overdue && <span className="text-[9px] bg-red-50 text-editorial-red font-extrabold px-1.5 py-0.5 rounded-md uppercase">Tenggat Lewat</span>}
                          <span className={t.daysOpen !== null && t.daysOpen >= 14 ? 'text-editorial-red' : t.daysOpen !== null && t.daysOpen >= 7 ? 'text-amber-600' : 'text-stone-500'}>
                            {t.daysOpen === null ? '—' : `${t.daysOpen} hari`}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fill rate & speed (§5f) */}
              <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-3 berkas-stripe">
                <div>
                  <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Fill Rate &amp; Kecepatan</h3>
                  <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                    Posisi terisi penuh vs gagal isi
                  </p>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="kpi-stat-value text-3xl text-editorial-green">{trackerStats.filled}</span>
                  <span className="text-xs font-extrabold text-stone-400">/</span>
                  <span className="kpi-stat-value text-3xl text-editorial-red">{trackerStats.unfilled}</span>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Closed-Filled / Closed-Unfilled</span>
                </div>
                <p className="text-[10px] font-bold text-stone-500">
                  {trackerStats.avgDaysToFill === null
                    ? 'Belum ada posisi closed untuk menghitung kecepatan isi.'
                    : `Rata-rata waktu mengisi posisi: ${trackerStats.avgDaysToFill} hari.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 4. Main Split Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        {/* Left Column: Chart & New Applications Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Widget 1: Tren Lamaran Masuk dengan perbandingan periode sebelumnya */}
          <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-4 berkas-stripe">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2">
              <div>
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Tren Lamaran Masuk</h3>
                <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                  Tren lamaran masuk dengan perbandingan periode sebelumnya
                </p>
              </div>

              <div className="flex bg-stone-100 p-1 rounded-lg mt-3 sm:mt-0">
                <button
                  onClick={() => setTimeRange('12m')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    timeRange === '12m' ? 'bg-white text-brand-700 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  12 Bulan
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    timeRange === '30d' ? 'bg-white text-brand-700 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  30 Hari
                </button>
                <button
                  onClick={() => setTimeRange('7l')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    timeRange === '7l' ? 'bg-white text-brand-700 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  7 Hari
                </button>
              </div>
            </div>

            <div
              className="h-64 antialiased"
              role="img"
              aria-label={`Tren lamaran masuk: total periode ini ${timelineData.reduce((s, p) => s + p.application, 0)} lamaran, periode sebelumnya ${timelineData.reduce((s, p) => s + p.previous, 0)} lamaran.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="glorystatGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C2410C" stopOpacity={0.24}/>
                      <stop offset="95%" stopColor="#C2410C" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} stroke="#94A3B8" axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="application"
                    stroke="#C2410C"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#glorystatGradient)"
                    name="Periode ini"
                  />
                  <Area
                    type="monotone"
                    dataKey="previous"
                    stroke="#D6CFC4"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={0}
                    name="Periode sebelumnya"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 text-[10px] font-bold text-stone-500 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-brand-700 rounded-full" />
                <span>Periode ini</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-stone-400" />
                <span>Periode sebelumnya</span>
              </div>
            </div>
          </div>

          {/* Widget 2: NEW APPLICATIONS Feed */}
          <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-4 berkas-stripe">
            <div className="flex justify-between items-center pb-2">
              <div>
<h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Lamaran Terbaru</h3>
                <p className="text-[10px] text-stone-400 font-medium leading-none mt-1">
                  Sinkronisasi basis data rekrutmen. Tampilan tersaring mengikuti parameter kustom Anda.
                </p>
              </div>
              <button
                onClick={onViewAll}
                className="text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {latestApplicants.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                <Users className="h-8 w-8 text-stone-300" />
                <p className="text-xs text-stone-500 font-bold">Tidak ada pelamar yang cocok dengan kriteria filter.</p>
                <button
                  onClick={() => {
                    setSelectedMonth('all');
                    setSelectedJob('all');
                    setSelectedStatus('all');
                  }}
                  className="text-[11px] font-black text-brand-700 hover:underline"
                >
                  Bersihkan semua filter
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase pb-2">
                      <th className="pb-3 text-stone-500 font-bold">Nama Pelamar</th>
                      <th className="pb-3 text-stone-500 font-bold">Posisi Jabatan</th>
                      <th className="pb-3 text-stone-500 font-bold">Tanggal Kirim</th>
                      <th className="pb-3 text-stone-500 font-bold">Status</th>
                      <th className="pb-3 text-center text-stone-500 font-bold">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {latestApplicants.map((app, idx) => {
                      const bgColors = [
                        'bg-editorial-navy text-white',
                        'bg-bento-sand text-editorial-navy'
                      ];
                      const initials = (app.namaLengkap || 'PL').substring(0, 2).toUpperCase();

                      const formattedDate = app.submissionDate
                        ? new Date(parseSubmissionDate(app.submissionDate) || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Beberapa saat yang lalu';

                      let statusBadgeClass = 'bg-stone-100 text-stone-600';
                      let statusLabel = app.status || 'Pending';
                      if (app.status === 'Pending') {
                        statusBadgeClass = 'bg-amber-100 text-amber-700 border border-amber-200';
                        statusLabel = 'Belum Direview';
                      } else if (app.status === 'Reviewed') {
                        statusBadgeClass = 'bg-stone-100 text-editorial-navy border border-editorial-border';
                        statusLabel = 'Sedang di Review';
                      } else if (app.status === 'Interview HR') {
                        statusBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
                        statusLabel = 'Wawancara HR';
                      } else if (app.status === 'Interview User') {
                        statusBadgeClass = 'bg-orange-50 text-brand-700 border border-brand-200';
                        statusLabel = 'Wawancara User';
                      } else if (app.status === 'Accepted') {
                        statusBadgeClass = 'bg-green-50 text-editorial-green border border-green-200';
                        statusLabel = 'Lolos Seleksi';
                      } else if (app.status === 'Rejected') {
                        statusBadgeClass = 'bg-red-50 text-editorial-red border border-red-200';
                        statusLabel = 'Gugur Seleksi';
                      }

                      return (
                        <tr key={app.id || idx} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3 font-bold text-stone-950">
                            <div className="flex items-center space-x-3">
                              <div className={`h-8 w-8 rounded-full ${bgColors[idx % 2]} text-[10px] font-extrabold flex items-center justify-center shadow-xs`}>
                                {initials}
                              </div>
                              <div className="text-left">
                                <span className="block leading-tight font-bold">{app.namaLengkap}</span>
                                <span className="text-[10px] font-medium text-stone-400 mt-0.5 block">{app.id || 'N/A'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-semibold text-stone-600">{getOfficialPositionName(app.jabatanDituju)}</td>
                          <td className="py-3 text-stone-400 font-medium">{formattedDate}</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => {
                                if (app.id && app.id.startsWith('APP-')) {
                                  onSelectApplicant(app.id);
                                }
                              }}
                              className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 transition-colors text-white text-[10px] font-bold rounded-lg inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <User className="h-3 w-3" />
                              <span>Buka Profil</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Gender */}
        <div className="space-y-6">
          {/* Widget: Jenis Kelamin */}
          <div className="bg-white p-6 rounded-2xl border border-editorial-border shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-1">
              <div>
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Jenis Kelamin Pelamar</h3>
                <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                  Perbandingan komposisi pelamar
                </p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md">Live</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div
                className="h-32 w-32 relative shrink-0"
                role="img"
                aria-label={`Komposisi jenis kelamin: Laki-laki ${genderStats[0].value} pelamar, Perempuan ${genderStats[1].value} pelamar.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={52}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {genderStats.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        backgroundColor: '#1A1F2E',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        padding: '4px 8px'
                      }}
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-lg font-black text-stone-900 leading-none">
                    {(genderStats[0].value + genderStats[1].value).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] font-black text-stone-400 mt-0.5 uppercase tracking-wider">Total</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2.5">
                {genderStats.map((item, idx) => {
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-stone-50 pb-1.5 last:border-none last:pb-0">
                      <div className="flex items-center space-x-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-stone-600">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-stone-900 block">{item.value} Pelamar</span>
                        <span className="text-[10px] font-bold text-stone-400 block">{item.percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

          </div>
        </div>
      </div>

        </div>
        {/* /Left: main column */}

        {/* Right rail: Perlu Tindakan + Jadwal Hari Ini (sticky, outside analytics collapse) */}
        <aside className="lg:sticky lg:top-24 space-y-6" aria-label="Ringkasan tindakan">
          <ActionList
            applicants={applicants}
            trackers={trackers}
            interviews={interviews}
            scheduleList={scheduleList}
            onSelectApplicant={onSelectApplicant}
            onOpenTrackers={onOpenTrackers}
            onViewCalendar={onViewCalendar}
          />
        </aside>
      </div>
    </div>
  );
};
