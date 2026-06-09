import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Sliders,
  MapPin,
  Calendar,
  Clock,
  MoreHorizontal,
  FileText,
  ChevronDown,
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
import { GreetingBar } from './dashboard/GreetingBar';
import { CountUp } from './dashboard/CountUp';
import { Sparkline } from './dashboard/Sparkline';
import { RecruitmentFunnel } from './dashboard/RecruitmentFunnel';

interface DashboardProps {
  applicants: Applicant[];
  onSelectApplicant: (id: string) => void;
  onViewAll?: () => void;
  vacancies?: any[];
  adminEmail?: string;
  lastSyncAt?: Date | null;
}

interface TimelinePoint {
  name: string;
  application: number;
  previous: number;
  fullLabel: string;
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
    <div className="bg-slate-800 text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[160px]">
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
        const d = parseSubmissionDate(app.submissionDate);
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

  const todayFormatted = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date();
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }, []);

  // Sparkline data: 7-day daily counts per KPI filter
  const sparklineData = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const computeForFilter = (filter: (a: Applicant) => boolean): number[] => {
      const counts = [0, 0, 0, 0, 0, 0, 0];
      filteredApplicants.forEach((app) => {
        if (!filter(app)) return;
        const date = parseSubmissionDate(app.submissionDate);
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
      male = Math.max(1, Math.floor(applicants.length * 0.55)) || 15;
      female = Math.max(1, Math.floor(applicants.length * 0.45)) || 12;
    }

    const total = male + female;
    const malePercent = total > 0 ? Math.round((male / total) * 100) : 50;
    const femalePercent = total > 0 ? Math.round((female / total) * 100) : 50;

    return [
      { name: 'Laki-laki', value: male, percent: malePercent, color: '#0ea5e9' },
      { name: 'Perempuan', value: female, percent: femalePercent, color: '#ec4899' }
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

  // Dynamic recruitment-driven action alert schedules
  const scheduleList = useMemo(() => {
    const list: Array<{ id: string | number; time: string; title: string; applicantId?: string; isLive: boolean; color: string }> = [];

    // 1. Unreviewed candidates (status === 'Pending') => URGENT ACTION
    applicants.forEach((app) => {
      if (app.status === 'Pending') {
        list.push({
          id: `pending-${app.id}`,
          time: 'Action Required',
          title: `Tinjau berkas baru: ${app.namaLengkap} (${getOfficialPositionName(app.jabatanDituju)})`,
          applicantId: app.id,
          isLive: true,
          color: 'bg-amber-50/85 hover:bg-amber-100/95 text-amber-900 border-l-4 border-amber-500 cursor-pointer transition-all'
        });
      }
    });

    // 2. Shortlisted candidates (status === 'Reviewed') => SCHEDULED FOR INTERVIEW info
    applicants.forEach((app) => {
      if (app.status === 'Reviewed') {
        list.push({
          id: `reviewed-${app.id}`,
          time: 'Interview Scheduled',
          title: `Jadwal wawancara: ${app.namaLengkap} - ${getOfficialPositionName(app.jabatanDituju)}`,
          applicantId: app.id,
          isLive: true,
          color: 'bg-indigo-50/85 hover:bg-indigo-100/95 text-indigo-950 border-l-4 border-indigo-500 cursor-pointer transition-all'
        });
      }
    });

    if (list.length < 3) {
      list.push({
        id: 'sys-1',
        time: 'Penyelarasan Rutin',
        title: 'Sinkronisasi berkas dengan Google Sheets Rekrutmen',
        isLive: false,
        color: 'bg-stone-50 text-stone-600 border-l-4 border-stone-400 font-medium'
      });
      list.push({
        id: 'sys-2',
        time: 'Job Board Maintenance',
        title: 'Review kesesuaian formasi jabatan yang sedang dibuka',
        isLive: false,
        color: 'bg-stone-50 text-stone-600 border-l-4 border-stone-400 font-medium'
      });
    }

    return list.slice(0, 5);
  }, [applicants]);

  return (
    <div className="space-y-8 select-none font-sans grain-overlay" id="admin-dashboard-container">
      {/* 1. Greeting bar with live sync indicator */}
      <GreetingBar adminEmail={adminEmail} lastSyncAt={lastSyncAt} />

      {/* Filter & Kustomisasi trigger (kept as-is, but pulled out of greeting block) */}
      <div className="flex items-center justify-end font-sans text-xs relative -mt-4" style={{ zIndex: 100 }}>
        {(selectedMonth !== 'all' || selectedJob !== 'all' || selectedStatus !== 'all') && (
          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-xl flex items-center space-x-1 mr-2 animate-pulse">
            <span>Filter Aktif</span>
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
            className={`flex items-center space-x-2 px-4 py-2.5 border rounded-xl hover:bg-stone-50 transition-all font-bold cursor-pointer shadow-xs ${
              isCustomizeOpen || selectedMonth !== 'all' || selectedJob !== 'all' || selectedStatus !== 'all'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
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
                  <Filter className="h-3.5 w-3.5 text-indigo-500" />
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
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide">Filter Sesuai Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-semibold focus:ring-2 focus:ring-indigo-100 text-xs"
                >
                  <option value="all">Semua Bulan (Tahun 2026)</option>
                  {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((mName, idx) => (
                    <option key={idx} value={idx.toString()}>{mName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide">Filter Jabatan Posisi</label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-semibold focus:ring-2 focus:ring-indigo-100 text-xs"
                >
                  <option value="all">Semua Formasi Jabatan</option>
                  {dynamicJobs.map((job, idx) => (
                    <option key={idx} value={job}>{job}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide">Filter Status Pelamar</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 font-semibold focus:ring-2 focus:ring-indigo-100 text-xs"
                >
                  <option value="all">Semua Status Pelamar</option>
                  <option value="Pending">Pending Review (Belum Review)</option>
                  <option value="Reviewed">Shortlisted</option>
                  <option value="Interview HR">Wawancara HR (Interview HR)</option>
                  <option value="Interview User">Wawancara User (Interview User)</option>
                  <option value="Accepted">Hired (Diterima)</option>
                  <option value="Rejected">Rejected (Ditolak)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[10px] text-stone-400 font-bold">
                  Ditemukan: <strong className="text-stone-700 font-extrabold">{filteredApplicants.length} Pelamar</strong>
                </span>

                <button
                  onClick={() => setIsCustomizeOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer shadow-xs"
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
        className="dashboard-stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        style={{ counterReset: 'kpi' } as React.CSSProperties}
      >
        {/* Total Application Card */}
        <div
          className="p-5 bg-brand-50 rounded-2xl border border-brand-200 shadow-xs flex flex-col justify-between space-y-3 relative"
          style={{ ['--i' as any]: 0 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Total Application</span>
            <ArrowUpRight className="h-4 w-4 text-stone-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-stone-900">
                <CountUp value={stats.totalApps} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.total.pct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {kpiStats.total.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.total.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.total}
              color="#F97316"
              height={28}
              className="-mx-1"
            />
            <span className="text-[10px] text-stone-400 font-bold block pt-1">
              {kpiStats.total.pct >= 0 ? '+' : ''}{kpiStats.total.pct.toFixed(0)}% from last month
            </span>
            <span className="text-[8px] text-stone-400 font-medium block">Update: {todayFormatted}</span>
          </div>
        </div>

        {/* Pending Review Card */}
        <div
          className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3 relative border-l-4 border-l-amber-400"
          style={{ ['--i' as any]: 1 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Pending Review</span>
            <ArrowUpRight className="h-4 w-4 text-stone-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-stone-900">
                <CountUp value={stats.pending} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.pending.pct >= 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {kpiStats.pending.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.pending.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.pending}
              color="#F59E0B"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-stone-400 font-bold block pt-1">
              {kpiStats.pending.pct >= 0 ? '+' : ''}{kpiStats.pending.pct.toFixed(0)}% from last month
            </span>
            <span className="text-[8px] text-stone-400 font-medium block">Update: {todayFormatted}</span>
          </div>
        </div>

        {/* Sedang di Review Card */}
        <div
          className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3 relative"
          style={{ ['--i' as any]: 2 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Sedang di Review</span>
            <ArrowUpRight className="h-4 w-4 text-stone-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-stone-900">
                <CountUp value={stats.shortlisted} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.shortlisted.pct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {kpiStats.shortlisted.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.shortlisted.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.shortlisted}
              color="#4F46E5"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-stone-400 font-bold block pt-1">
              {kpiStats.shortlisted.pct >= 0 ? '+' : ''}{kpiStats.shortlisted.pct.toFixed(0)}% from last month
            </span>
            <span className="text-[8px] text-stone-400 font-medium block">Update: {todayFormatted}</span>
          </div>
        </div>

        {/* Hired / Accepted Card */}
        <div
          className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3 relative"
          style={{ ['--i' as any]: 3 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Hired / Accepted</span>
            <ArrowUpRight className="h-4 w-4 text-stone-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-stone-900">
                <CountUp value={stats.hired} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.hired.pct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {kpiStats.hired.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.hired.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.hired}
              color="#10B981"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-stone-400 font-bold block pt-1">
              {kpiStats.hired.pct >= 0 ? '+' : ''}{kpiStats.hired.pct.toFixed(0)}% from last month
            </span>
            <span className="text-[8px] text-stone-400 font-medium block">Update: {todayFormatted}</span>
          </div>
        </div>

        {/* Rejected Card */}
        <div
          className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3 relative border-l-4 border-l-rose-400"
          style={{ ['--i' as any]: 4 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">Rejected Candidates</span>
            <ArrowUpRight className="h-4 w-4 text-stone-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="kpi-stat-value text-2xl text-stone-900">
                <CountUp value={stats.rejected} />
              </span>
              <span className={`text-[10px] font-extrabold flex items-center px-1.5 py-0.5 rounded-md ${
                kpiStats.rejected.pct >= 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {kpiStats.rejected.pct >= 0 ? <ArrowUp className="h-3 w-3 mr-0.5 shrink-0" /> : <ArrowDown className="h-3 w-3 mr-0.5 shrink-0" />}
                {Math.abs(kpiStats.rejected.pct).toFixed(1)}%
              </span>
            </div>
            <Sparkline
              data={sparklineData.rejected}
              color="#F43F5E"
              height={24}
              className="-mx-1"
            />
            <span className="text-[10px] text-stone-400 font-bold block pt-1">
              {kpiStats.rejected.pct >= 0 ? '+' : ''}{kpiStats.rejected.pct.toFixed(0)}% from last month
            </span>
            <span className="text-[8px] text-stone-400 font-medium block">Update: {todayFormatted}</span>
          </div>
        </div>
      </div>

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

      {/* 4. Main Split Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        {/* Left Column: Chart & New Applications Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Widget 1: Application Received Time Trend AreaChart with comparison line */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2">
              <div>
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Application Received Time</h3>
                <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                  Tren lamaran masuk dengan perbandingan periode sebelumnya
                </p>
              </div>

              <div className="flex bg-stone-100 p-1 rounded-lg mt-3 sm:mt-0">
                <button
                  onClick={() => setTimeRange('12m')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    timeRange === '12m' ? 'bg-white text-indigo-600 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  12 months
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    timeRange === '30d' ? 'bg-white text-indigo-600 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  30 days
                </button>
                <button
                  onClick={() => setTimeRange('7l')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    timeRange === '7l' ? 'bg-white text-indigo-600 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  7 Days
                </button>
              </div>
            </div>

            <div className="h-64 antialiased">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="glorystatGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.24}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0}/>
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
                    stroke="#4F46E5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#glorystatGradient)"
                    name="Periode ini"
                  />
                  <Area
                    type="monotone"
                    dataKey="previous"
                    stroke="#A5B4FC"
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
                <span className="h-0.5 w-4 bg-indigo-600 rounded-full" />
                <span>Periode ini</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-indigo-300" />
                <span>Periode sebelumnya</span>
              </div>
            </div>
          </div>

          {/* Widget 2: NEW APPLICATIONS Feed */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2">
              <div>
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">New Applications Feed</h3>
                <p className="text-[10px] text-stone-400 font-medium leading-none mt-1">
                  Dynamic recruitment database sync. Filtered view matches your custom parameters.
                </p>
              </div>
              <button
                onClick={onViewAll}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>View All</span>
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
                  className="text-[11px] font-black text-indigo-600 hover:underline"
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
                        'bg-amber-100 text-amber-700',
                        'bg-blue-100 text-blue-700',
                        'bg-purple-100 text-purple-700',
                        'bg-emerald-100 text-emerald-700',
                        'bg-pink-100 text-pink-700'
                      ];
                      const initials = (app.namaLengkap || 'PL').substring(0, 2).toUpperCase();

                      const formattedDate = app.submissionDate
                        ? new Date(parseSubmissionDate(app.submissionDate) || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Beberapa saat yang lalu';

                      let statusBadgeClass = 'bg-stone-100 text-stone-600';
                      let statusLabel = app.status || 'Pending';
                      if (app.status === 'Pending') {
                        statusBadgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
                        statusLabel = 'Pending Review';
                      } else if (app.status === 'Reviewed') {
                        statusBadgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                        statusLabel = 'Sedang di Review';
                      } else if (app.status === 'Interview HR') {
                        statusBadgeClass = 'bg-purple-50 text-purple-600 border border-purple-100';
                        statusLabel = 'Wawancara HR';
                      } else if (app.status === 'Interview User') {
                        statusBadgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                        statusLabel = 'Wawancara User';
                      } else if (app.status === 'Accepted') {
                        statusBadgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                        statusLabel = 'Hired';
                      } else if (app.status === 'Rejected') {
                        statusBadgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
                        statusLabel = 'Rejected';
                      }

                      return (
                        <tr key={app.id || idx} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3 font-bold text-stone-950">
                            <div className="flex items-center space-x-3">
                              <div className={`h-8 w-8 rounded-full ${bgColors[idx % 5]} text-[10px] font-extrabold flex items-center justify-center shadow-xs`}>
                                {initials}
                              </div>
                              <div className="text-left">
                                <span className="block leading-tight font-bold">{app.namaLengkap}</span>
                                <span className="text-[9px] font-medium text-stone-400 mt-0.5 block">{app.id || 'N/A'}</span>
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
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white text-[10px] font-bold rounded-lg inline-flex items-center space-x-1 cursor-pointer"
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

        {/* Right Column: Gender + Today's Schedule */}
        <div className="space-y-6">
          {/* Widget: Jenis Kelamin */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-1">
              <div>
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Jenis Kelamin Pelamar</h3>
                <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
                  Gender comparison feed
                </p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md">Live</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="h-32 w-32 relative shrink-0">
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
                        backgroundColor: '#1E293B',
                        border: 'none',
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
                  <span className="text-[8px] font-black text-stone-400 mt-0.5 uppercase tracking-wider">Total</span>
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
                        <span className="text-[9px] font-bold text-stone-400 block">{item.percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Widget 3: Today's Schedule */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">Today's Schedule</h3>
                <span className="h-5 w-5 bg-indigo-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center">
                  {scheduleList.filter(s => s.isLive).length || scheduleList.length}
                </span>
              </div>
              <button className="text-stone-300 hover:text-stone-600">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {scheduleList.map((sch) => (
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
                      <span className="text-[8px] font-bold bg-indigo-900/10 text-indigo-900 px-1.5 py-0.5 rounded-md uppercase">Action</span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold tracking-tight block leading-normal">{sch.title}</span>
                  {sch.applicantId && (
                    <span className="text-[9px] opacity-80 font-medium block mt-1 underline">Mulai Tinjau Profil &rarr;</span>
                  )}
                </div>
              ))}
            </div>

            <button className="w-full text-center py-2.5 hover:bg-stone-50 border border-dashed border-stone-200 mt-2 text-xs font-bold text-indigo-600 rounded-xl transition-all cursor-pointer">
              View Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
