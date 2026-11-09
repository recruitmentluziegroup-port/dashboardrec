import React from 'react';
import {
  DollarSign,
  Briefcase,
  Megaphone,
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  Award,
  Wallet,
} from 'lucide-react';
import { CountUp } from '../dashboard/CountUp';
import { RingkasanKpiBulan, AnalisisBanding, formatRupiah, formatPersen } from '../../lib/budget-analytics';

interface AnalisisKpiCardsProps {
  kpi: RingkasanKpiBulan;
  bandingData?: AnalisisBanding | null;
}

const TrendBadge: React.FC<{
  item?: { selisihPersen: number | null; arah: 'membaik' | 'memburuk' | 'stabil' } | null;
  higherIsBetter?: boolean;
}> = ({ item, higherIsBetter = true }) => {
  if (!item || item.selisihPersen === null || isNaN(item.selisihPersen)) return null;

  const pct = Math.abs(item.selisihPersen);
  if (item.arah === 'stabil' || pct < 0.1) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
        <Minus className="h-2.5 w-2.5" />
        <span>0%</span>
      </span>
    );
  }

  const isGood = item.arah === 'membaik';
  const isUp = item.selisihPersen > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
        isGood
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-rose-50 text-rose-700 border border-rose-200'
      }`}
      title={`Perubahan dibanding bulan sebelumnya: ${isUp ? '+' : ''}${item.selisihPersen.toFixed(1)}%`}
    >
      {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      <span>{item.selisihPersen > 0 ? `+${item.selisihPersen.toFixed(0)}%` : `${item.selisihPersen.toFixed(0)}%`}</span>
    </span>
  );
};

export const AnalisisKpiCards: React.FC<AnalisisKpiCardsProps> = ({ kpi, bandingData }) => {
  const p = bandingData?.perbandingan;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* 1. Total Anggaran */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Anggaran</span>
          <div className="h-8 w-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-stone-900 tracking-tight">
            {formatRupiah(kpi.totalBiaya)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendBadge item={p?.totalBiaya} higherIsBetter={false} />
            <span className="text-[10px] text-stone-400">vs bln lalu</span>
          </div>
        </div>
      </div>

      {/* 2. Loker Diiklankan */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Loker Diiklankan</span>
          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Briefcase className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-stone-900 tracking-tight flex items-baseline gap-1">
            <CountUp value={kpi.jumlahLokerDiiklankan} />
            <span className="text-xs font-normal text-stone-500">posisi</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">
            {kpi.jumlahIklan} paket iklan aktif
          </p>
        </div>
      </div>

      {/* 3. Jumlah Iklan / Media */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Iklan & Mitra</span>
          <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <Megaphone className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-stone-900 tracking-tight">
            <CountUp value={kpi.jumlahIklan} />
            <span className="text-xs font-normal text-stone-500 mx-1">/</span>
            <CountUp value={kpi.jumlahMedia} />
          </div>
          <p className="text-[10px] text-stone-400 mt-1">iklan / media mitra</p>
        </div>
      </div>

      {/* 4. Pelamar Masuk */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pelamar Masuk</span>
          <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-stone-900 tracking-tight flex items-baseline gap-1">
            <CountUp value={kpi.pelamar} />
            <span className="text-xs font-normal text-stone-500">orang</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendBadge item={p?.pelamar} higherIsBetter={true} />
            <span className="text-[10px] text-stone-400">vs bln lalu</span>
          </div>
        </div>
      </div>

      {/* 5. Pelamar Potensial */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Kandidat Potensial</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-emerald-700 tracking-tight flex items-baseline gap-1.5">
            <CountUp value={kpi.potensial} />
            <span className="text-xs font-bold text-emerald-600">
              ({formatPersen(kpi.persenPotensial)})
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendBadge item={p?.potensial} higherIsBetter={true} />
            <span className="text-[10px] text-stone-400">vs bln lalu</span>
          </div>
        </div>
      </div>

      {/* 6. Tidak Potensial */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Gugur Seleksi</span>
          <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <UserX className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-stone-800 tracking-tight flex items-baseline gap-1">
            <CountUp value={kpi.tidakPotensial} />
            <span className="text-xs font-normal text-stone-500">orang</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">status rejected</p>
        </div>
      </div>

      {/* 7. Belum Diproses (Pending) */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Belum Diproses</span>
          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-stone-800 tracking-tight flex items-baseline gap-1">
            <CountUp value={kpi.pending} />
            <span className="text-xs font-normal text-stone-500">orang</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">menunggu review</p>
        </div>
      </div>

      {/* 8. Biaya per Pelamar */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Cost per Applicant</span>
          <div className="h-8 w-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-stone-900 tracking-tight">
            {formatRupiah(kpi.biayaPerPelamar)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendBadge item={p?.biayaPerPelamar} higherIsBetter={false} />
            <span className="text-[10px] text-stone-400">biaya / total pelamar</span>
          </div>
        </div>
      </div>

      {/* 9. Biaya per Potensial */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Cost per Qualified</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-emerald-800 tracking-tight">
            {formatRupiah(kpi.biayaPerPotensial)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendBadge item={p?.biayaPerPotensial} higherIsBetter={false} />
            <span className="text-[10px] text-stone-400">biaya / kandidat lolos</span>
          </div>
        </div>
      </div>

      {/* 10. Biaya per Diterima */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Cost per Hire</span>
          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Award className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black font-sans text-indigo-900 tracking-tight">
            {formatRupiah(kpi.biayaPerDiterima)}
          </div>
          <p className="text-[10px] text-stone-400 mt-1">
            {kpi.diterima} kandidat diterima
          </p>
        </div>
      </div>
    </div>
  );
};
