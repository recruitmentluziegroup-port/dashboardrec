import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Layers,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info,
} from 'lucide-react';
import { BudgetIklan } from '../../types';
import {
  alokasiBiayaPerBulan,
  hitungPelamarPerBulan,
  gabungkan,
  banding,
  geserBulanMundur,
  PelamarAnalyticsInput,
  formatRupiah,
} from '../../lib/budget-analytics';
import { KesimpulanBanding } from './KesimpulanBanding';
import { TabelPerbandinganKpi } from './TabelPerbandinganKpi';
import { GrafikTrenBanding } from './GrafikTrenBanding';
import { PerbandinganChannel } from './PerbandinganChannel';
import { PerbandinganLoker } from './PerbandinganLoker';

interface PerbandinganTrenProps {
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

export const PerbandinganTren: React.FC<PerbandinganTrenProps> = ({
  items,
  applicants = [],
  knownPositions = [],
  onGoToInput,
}) => {
  const currentJakarta = useMemo(() => getCurrentJakartaMonth(), []);

  // 1. URL State Sync for ?bulan=YYYY-MM & ?mundur=1|2|3
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const urlBulan = p.get('bulan');
      if (urlBulan && /^\d{4}-\d{2}$/.test(urlBulan)) return urlBulan;
    }
    return currentJakarta;
  });

  const [mundurBulan, setMundurBulan] = useState<1 | 2 | 3>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const m = Number(p.get('mundur'));
      if (m === 1 || m === 2 || m === 3) return m as 1 | 2 | 3;
    }
    return 3;
  });

  // Sync state changes with URL query string without reloading page
  const updateUrlParams = useCallback((newMonth: string, newMundur: number) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('bulan', newMonth);
      url.searchParams.set('mundur', String(newMundur));
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    updateUrlParams(newMonth, mundurBulan);
  };

  const handleMundurChange = (newMundur: 1 | 2 | 3) => {
    setMundurBulan(newMundur);
    updateUrlParams(selectedMonth, newMundur);
  };

  // Popstate event handler for browser back/forward buttons
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const b = p.get('bulan');
      if (b && /^\d{4}-\d{2}$/.test(b)) setSelectedMonth(b);
      const m = Number(p.get('mundur'));
      if (m === 1 || m === 2 || m === 3) setMundurBulan(m as 1 | 2 | 3);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 2. Generate list of selectable months from ads and applicants data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();

    monthSet.add(currentJakarta);
    for (let i = 1; i <= 6; i++) {
      monthSet.add(geserBulanMundur(currentJakarta, i));
      monthSet.add(geserBulanMundur(currentJakarta, -i));
    }

    items.forEach((item) => {
      if (item.tanggalMulai) monthSet.add(item.tanggalMulai.slice(0, 7));
      if (item.tanggalSelesai) monthSet.add(item.tanggalSelesai.slice(0, 7));
    });

    applicants.forEach((app) => {
      if (app.submissionDate) monthSet.add(app.submissionDate.slice(0, 7));
    });

    return Array.from(monthSet).sort().reverse();
  }, [items, applicants, currentJakarta]);

  // 3. Analytics Engine Calculations
  const activeAds = useMemo(() => items.filter((item) => !item.diarsipkan), [items]);

  const alokasiRows = useMemo(() => alokasiBiayaPerBulan(activeAds), [activeAds]);
  const pelamarRows = useMemo(() => hitungPelamarPerBulan(applicants), [applicants]);
  const barisAnalisis = useMemo(() => gabungkan(alokasiRows, pelamarRows), [alokasiRows, pelamarRows]);

  const bandingData = useMemo(() => {
    return banding(barisAnalisis, selectedMonth, mundurBulan, activeAds);
  }, [barisAnalisis, selectedMonth, mundurBulan, activeAds]);

  return (
    <div className="space-y-6">
      {/* ─── 1. Top Controls Bar: Bulan Acuan & Tombol Mundur ──────────────── */}
      <div className="bg-white border border-editorial-border rounded-2xl shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Bulan Acuan */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-stone-700">Bulan Acuan:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleMonthChange(geserBulanMundur(selectedMonth, 1))}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              title="Bulan sebelumnya"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="text-xs sm:text-sm font-bold text-stone-900 bg-stone-50/80 hover:bg-stone-100 border border-stone-200 rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)} {ym === currentJakarta ? '(Bulan Berjalan)' : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleMonthChange(geserBulanMundur(selectedMonth, -1))}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
              title="Bulan berikutnya"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tombol Bandingkan dengan 1/2/3 Bulan */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <GitCompare className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-stone-700">Bandingkan dengan:</span>
          </div>

          <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => handleMundurChange(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mundurBulan === 1
                  ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              1 Bulan
            </button>
            <button
              type="button"
              onClick={() => handleMundurChange(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mundurBulan === 2
                  ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              2 Bulan
            </button>
            <button
              type="button"
              onClick={() => handleMundurChange(3)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mundurBulan === 3
                  ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              3 Bulan
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Kesimpulan Otomatis ────────────────────────────────────────── */}
      <KesimpulanBanding
        bandingData={bandingData}
        rows={barisAnalisis}
        selectedMonth={selectedMonth}
        mundurBulan={mundurBulan}
      />

      {/* ─── 3. Tabel Perbandingan KPI ─────────────────────────────────────── */}
      <TabelPerbandinganKpi
        bandingData={bandingData}
        selectedMonth={selectedMonth}
      />

      {/* ─── 4. Grafik Tren Kinerja (Recharts) ──────────────────────────────── */}
      <GrafikTrenBanding
        bandingData={bandingData}
        selectedMonth={selectedMonth}
      />

      {/* ─── 5. Perbandingan per Channel ───────────────────────────────────── */}
      <PerbandinganChannel
        rows={barisAnalisis}
        deretBulan={bandingData.deretBulan}
        selectedMonth={selectedMonth}
      />

      {/* ─── 6. Perbandingan per Loker (Posisi) ─────────────────────────────── */}
      <PerbandinganLoker
        rows={barisAnalisis}
        deretBulan={bandingData.deretBulan}
        selectedMonth={selectedMonth}
      />

      {/* ─── 7. Catatan Pembanding ─────────────────────────────────────────── */}
      <div className="bg-stone-50/70 border border-stone-200 rounded-2xl p-4 sm:p-5 text-xs text-stone-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-stone-800">
          <Info className="h-4 w-4 text-brand-700" />
          <span>Pedoman Evaluasi Tren & Perbandingan</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed text-stone-600">
          <li>
            <strong>Arah Tren Unit Economics:</strong> Pada metrik Biaya per Pelamar, Biaya per Potensial, dan Biaya per Diterima, penurunan nilai bertanda <span className="text-emerald-700 font-semibold">Membaik</span> karena menunjukkan efisiensi pengeluaran anggaran yang lebih hemat untuk hasil yang sama atau lebih baik.
          </li>
          <li>
            <strong>Bulan Tanpa Anggaran:</strong> Bulan historis yang belum memiliki catatan biaya iklan tidak diikutsertakan dalam pembagi rata-rata pembanding agar tidak menurunkan nilai rata-rata historis secara semu.
          </li>
          <li>
            <strong>Atribusi Posisi & Channel:</strong> Data diakumulasikan dari penggabungan alokasi anggaran aktif dan jawaban formulir pelamar yang masuk pada masing-masing bulan kalender.
          </li>
        </ul>
      </div>
    </div>
  );
};
