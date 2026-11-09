import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  PlusCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { BudgetIklan } from '../../types';
import {
  alokasiBiayaPerBulan,
  hitungPelamarPerBulan,
  gabungkan,
  ringkasanBulan,
  banding,
  PelamarAnalyticsInput,
} from '../../lib/budget-analytics';
import { AnalisisKpiCards } from './AnalisisKpiCards';
import { PanelPerhatian } from './PanelPerhatian';
import { GrafikAnalisis } from './GrafikAnalisis';
import { TabelPerLoker } from './TabelPerLoker';
import { TabelPerChannel } from './TabelPerChannel';
import { CatatanMetodologi } from './CatatanMetodologi';

interface AnalisisBulananProps {
  items: BudgetIklan[];
  applicants?: PelamarAnalyticsInput[];
  knownPositions?: string[];
  onGoToInput?: () => void;
}

function getCurrentJakartaMonth(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
    });
    return formatter.format(new Date()).slice(0, 7); // "YYYY-MM"
  } catch {
    return new Date().toISOString().slice(0, 7);
  }
}

function formatMonthLabel(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
}

function shiftMonth(ym: string, delta: number): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split('-');
  const y = Number(yearStr);
  const m = Number(monthStr) - 1; // 0-based
  const nextDate = new Date(y, m + delta, 1);
  const nextY = nextDate.getFullYear();
  const nextM = nextDate.getMonth() + 1;
  return `${nextY}-${nextM < 10 ? `0${nextM}` : nextM}`;
}

export const AnalisisBulanan: React.FC<AnalisisBulananProps> = ({
  items,
  applicants = [],
  knownPositions = [],
  onGoToInput,
}) => {
  // 1. Initial Month from URL or current Jakarta month
  const currentJakarta = useMemo(() => getCurrentJakartaMonth(), []);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const urlBulan = p.get('bulan');
      if (urlBulan && /^\d{4}-\d{2}$/.test(urlBulan)) {
        return urlBulan;
      }
    }
    return currentJakarta;
  });

  // Keep URL in sync with selected month without reload
  const handleMonthChange = useCallback((newMonth: string) => {
    setSelectedMonth(newMonth);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('bulan', newMonth);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Listen to popstate for back/forward
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const b = p.get('bulan');
      if (b && /^\d{4}-\d{2}$/.test(b)) {
        setSelectedMonth(b);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 2. Generate list of selectable months from data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();

    // Current month and surrounding 6 months
    monthSet.add(currentJakarta);
    for (let i = 1; i <= 6; i++) {
      monthSet.add(shiftMonth(currentJakarta, -i));
      monthSet.add(shiftMonth(currentJakarta, i));
    }

    // From ads dates
    items.forEach((item) => {
      if (item.tanggalMulai) monthSet.add(item.tanggalMulai.slice(0, 7));
      if (item.tanggalSelesai) monthSet.add(item.tanggalSelesai.slice(0, 7));
    });

    // From applicant submission dates
    applicants.forEach((app) => {
      if (app.submissionDate) monthSet.add(app.submissionDate.slice(0, 7));
    });

    return Array.from(monthSet).sort().reverse();
  }, [items, applicants, currentJakarta]);

  // 3. Hanya gunakan iklan yang TIDAK diarsipkan untuk analitik
  const activeAds = useMemo(() => {
    return items.filter((item) => !item.diarsipkan);
  }, [items]);

  // 4. Kalkulasi Mesin Analitik Murni (budget-analytics.ts)
  const alokasiRows = useMemo(() => {
    return alokasiBiayaPerBulan(activeAds);
  }, [activeAds]);

  const pelamarRows = useMemo(() => {
    return hitungPelamarPerBulan(applicants);
  }, [applicants]);

  const barisAnalisis = useMemo(() => {
    return gabungkan(alokasiRows, pelamarRows);
  }, [alokasiRows, pelamarRows]);

  const kpi = useMemo(() => {
    return ringkasanBulan(barisAnalisis, selectedMonth, activeAds);
  }, [barisAnalisis, selectedMonth, activeAds]);

  const bandingData = useMemo(() => {
    return banding(barisAnalisis, selectedMonth, 1, activeAds);
  }, [barisAnalisis, selectedMonth, activeAds]);

  // Cek apakah bulan ini kosong data sama sekali (belum ada iklan & pelamar)
  const isEmptyMonth = useMemo(() => {
    return kpi.totalAnggaran === 0 && kpi.pelamarMasuk === 0 && kpi.lokerDiiklankan === 0;
  }, [kpi]);

  return (
    <div className="space-y-6">
      {/* ─── 1. Month Navigator Bar ────────────────────────────────────────── */}
      <div className="bg-white border border-editorial-border rounded-2xl shadow-xs p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => handleMonthChange(shiftMonth(selectedMonth, -1))}
            className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Bulan sebelumnya"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg hidden sm:flex">
              <Calendar className="h-4 w-4" />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="text-xs sm:text-sm font-bold text-stone-900 bg-stone-50/80 hover:bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)} {ym === currentJakarta ? '(Bulan Berjalan)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleMonthChange(shiftMonth(selectedMonth, 1))}
            className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Bulan berikutnya"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-500 w-full sm:w-auto justify-between sm:justify-end">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Data live terhubung
          </span>
          {selectedMonth !== currentJakarta && (
            <button
              type="button"
              onClick={() => handleMonthChange(currentJakarta)}
              className="text-brand-700 hover:text-brand-800 font-semibold underline text-[11px] cursor-pointer"
            >
              Kembali ke Bulan Ini
            </button>
          )}
        </div>
      </div>

      {/* ─── Empty State if Month Has No Ads or Applicants ─────────────────── */}
      {isEmptyMonth ? (
        <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-10 sm:p-14 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200/60">
            <Layers className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="font-serif font-black text-lg text-stone-900">
              Belum Ada Data di Periode {formatMonthLabel(selectedMonth)}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Belum terdapat anggaran iklan yang aktif atau pelamar masuk pada bulan ini. Silakan catat iklan baru di tab Input Anggaran untuk mulai memantau efektivitasnya.
            </p>
          </div>
          {onGoToInput && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onGoToInput}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Input Anggaran Sekarang</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ─── 2. KPI Summary Cards ────────────────────────────────────────── */}
          <AnalisisKpiCards kpi={kpi} bandingData={bandingData} />

          {/* ─── 3. Automated Insight / Attention Panel ─────────────────────── */}
          <PanelPerhatian
            rows={barisAnalisis}
            alokasiRows={alokasiRows}
            kpi={kpi}
            selectedMonth={selectedMonth}
            applicants={applicants}
            knownPositions={knownPositions}
          />

          {/* ─── 4. Recharts Visualizations ─────────────────────────────────── */}
          <GrafikAnalisis
            rows={barisAnalisis}
            kpi={kpi}
            selectedMonth={selectedMonth}
          />

          {/* ─── 5. Breakdown Per Loker Table ───────────────────────────────── */}
          <TabelPerLoker
            rows={barisAnalisis}
            alokasiRows={alokasiRows}
            selectedMonth={selectedMonth}
          />

          {/* ─── 6. Breakdown Per Channel Table ─────────────────────────────── */}
          <TabelPerChannel
            rows={barisAnalisis}
            alokasiRows={alokasiRows}
            selectedMonth={selectedMonth}
          />

          {/* ─── 7. Collapsible Methodology Notes ───────────────────────────── */}
          <CatatanMetodologi />
        </>
      )}
    </div>
  );
};
