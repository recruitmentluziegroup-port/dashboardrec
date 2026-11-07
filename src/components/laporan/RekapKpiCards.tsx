import React from 'react';
import { Mail, CheckCircle, Clock, Percent, TrendingUp } from 'lucide-react';
import { CountUp } from '../dashboard/CountUp';
import { LaporanRekapItem } from '../../types';

interface RekapKpiCardsProps {
  rows: LaporanRekapItem[];
}

export const RekapKpiCards: React.FC<RekapKpiCardsProps> = ({ rows }) => {
  const totalLamaran = rows.reduce((acc, r) => acc + (r.total || 0), 0);
  const sudahDinilai = rows
    .filter((r) => r.dinilai)
    .reduce((acc, r) => acc + (r.total || 0), 0);
  const belumDinilai = rows
    .filter((r) => !r.dinilai)
    .reduce((acc, r) => acc + (r.total || 0), 0);

  const totalSesuai = rows.reduce((acc, r) => acc + (r.dinilai ? r.sesuai || 0 : 0), 0);
  const pctSesuai = sudahDinilai > 0 ? (totalSesuai / sudahDinilai) * 100 : null;

  const activeDaysCount = rows.length;
  const avgPerDay = activeDaysCount > 0 ? (totalLamaran / activeDaysCount).toFixed(1) : '-';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* 1. Total Lamaran */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Total Lamaran
          </span>
          <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <Mail className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="font-serif font-black text-2xl text-stone-900 tracking-tight">
            <CountUp value={totalLamaran} />
          </div>
          <p className="text-[10px] text-stone-400 font-medium">
            Email lamaran periode ini
          </p>
        </div>
      </div>

      {/* 2. Sudah Dinilai */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Sudah Dinilai
          </span>
          <div className="h-7 w-7 rounded-lg bg-green-50 text-editorial-green flex items-center justify-center shrink-0">
            <CheckCircle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="font-serif font-black text-2xl text-editorial-green tracking-tight">
            <CountUp value={sudahDinilai} />
          </div>
          <p className="text-[10px] text-stone-400 font-medium">
            CV telah dievaluasi
          </p>
        </div>
      </div>

      {/* 3. Belum Dinilai */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Belum Dinilai
          </span>
          <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="font-serif font-black text-2xl text-amber-700 tracking-tight">
            <CountUp value={belumDinilai} />
          </div>
          <p className="text-[10px] text-stone-400 font-medium">
            Dari baris belum dinilai
          </p>
        </div>
      </div>

      {/* 4. % Sesuai */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            % Sesuai
          </span>
          <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Percent className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="font-serif font-black text-2xl text-emerald-700 tracking-tight">
            {pctSesuai !== null ? `${pctSesuai.toFixed(1)}%` : '—'}
          </div>
          <p className="text-[10px] text-stone-400 font-medium">
            {totalSesuai} dari {sudahDinilai} dinilai
          </p>
        </div>
      </div>

      {/* 5. Rata-rata per Hari */}
      <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Rata-rata / Hari
          </span>
          <div className="h-7 w-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="font-serif font-black text-2xl text-stone-900 tracking-tight">
            {avgPerDay}
            <span className="text-xs font-sans font-bold text-stone-400 ml-1">/ hari</span>
          </div>
          <p className="text-[10px] text-stone-400 font-medium">
            Dari {activeDaysCount} hari berdata
          </p>
        </div>
      </div>
    </div>
  );
};
