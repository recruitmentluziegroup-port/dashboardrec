import React from 'react';
import { DollarSign, Megaphone, Briefcase, Users2 } from 'lucide-react';
import { BudgetIklan } from '../../types';

interface BudgetKpiSummaryProps {
  items: BudgetIklan[];
}

export const BudgetKpiSummary: React.FC<BudgetKpiSummaryProps> = ({ items }) => {
  const totalBiaya = items.reduce((acc, curr) => acc + (Number(curr.biaya) || 0), 0);
  const totalIklan = items.length;

  const uniquePositions = new Set<string>();
  items.forEach((item) => {
    (item.posisi || []).forEach((p) => {
      if (p.trim()) uniquePositions.add(p.trim());
    });
  });

  const uniqueMedia = new Set<string>();
  items.forEach((item) => {
    if (item.namaMedia.trim()) uniqueMedia.add(item.namaMedia.trim().toLowerCase());
  });

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Biaya */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Anggaran</p>
          <p className="text-lg sm:text-2xl font-black font-sans text-stone-900 tracking-tight">
            {formatRupiah(totalBiaya)}
          </p>
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* Jumlah Iklan */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Jumlah Iklan</p>
          <p className="text-lg sm:text-2xl font-black font-sans text-stone-900 tracking-tight">
            {totalIklan} <span className="text-xs font-normal text-stone-500">paket</span>
          </p>
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <Megaphone className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* Posisi Berbeda */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Posisi Diiklankan</p>
          <p className="text-lg sm:text-2xl font-black font-sans text-stone-900 tracking-tight">
            {uniquePositions.size} <span className="text-xs font-normal text-stone-500">posisi</span>
          </p>
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
          <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* Media / Mitra Berbeda */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Mitra Media</p>
          <p className="text-lg sm:text-2xl font-black font-sans text-stone-900 tracking-tight">
            {uniqueMedia.size} <span className="text-xs font-normal text-stone-500">mitra</span>
          </p>
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
          <Users2 className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
};
