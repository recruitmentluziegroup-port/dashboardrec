import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar,
  Sparkles,
  Award,
  Layers,
  Filter,
  Info,
} from 'lucide-react';
import { BudgetIklan } from '../../types';
import {
  PelamarAnalyticsInput,
  atribusiMedia,
  skorMitra,
  geserBulanMundur,
} from '../../lib/budget-analytics';
import { KartuRekomendasiMitra } from './KartuRekomendasiMitra';
import { TabelPeringkatMitra } from './TabelPeringkatMitra';
import { MatriksMediaPosisi } from './MatriksMediaPosisi';
import { SimulasiAlokasiAnggaran } from './SimulasiAlokasiAnggaran';
import { PenjelasanSkorMitra } from './PenjelasanSkorMitra';

interface RekomendasiMitraProps {
  items: BudgetIklan[];
  applicants?: PelamarAnalyticsInput[];
  knownPositions?: string[];
  onGoToInput?: () => void;
}

type PeriodeOpsi = '3' | '2' | '1' | 'all';

function getCurrentJakartaMonth(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
    });
    return formatter.format(new Date()).slice(0, 7);
  } catch {
    return new Date().toISOString().slice(0, 7);
  }
}

export const RekomendasiMitra: React.FC<RekomendasiMitraProps> = ({
  items,
  applicants = [],
  knownPositions = [],
  onGoToInput,
}) => {
  const currentJakarta = useMemo(() => getCurrentJakartaMonth(), []);

  // 1. Sinkronisasi URL query string ?periode=3|2|1|all
  const [periode, setPeriode] = useState<PeriodeOpsi>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const per = p.get('periode');
      if (per === '3' || per === '2' || per === '1' || per === 'all') {
        return per;
      }
    }
    return '3';
  });

  const handlePeriodeChange = useCallback((newPeriode: PeriodeOpsi) => {
    setPeriode(newPeriode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('periode', newPeriode);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const per = p.get('periode');
      if (per === '3' || per === '2' || per === '1' || per === 'all') {
        setPeriode(per);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 2. Daftar bulan yang masuk dalam periode analisis
  const bulanList = useMemo<string[] | undefined>(() => {
    if (periode === 'all') return undefined;

    const count = Number(periode);
    const months: string[] = [];
    for (let i = 0; i < count; i++) {
      months.push(geserBulanMundur(currentJakarta, i));
    }
    return months;
  }, [periode, currentJakarta]);

  const periodeLabel = useMemo(() => {
    if (periode === 'all') return 'Semua Data Historis';
    if (periode === '1') return '1 Bulan Terakhir (Bulan Ini)';
    if (periode === '2') return '2 Bulan Terakhir';
    return '3 Bulan Terakhir';
  }, [periode]);

  // 3. Hitung Atribusi Media & Skor Mitra menggunakan fungsi murni budget-analytics.ts
  const atribusiRows = useMemo(() => {
    return atribusiMedia(items, applicants, bulanList);
  }, [items, applicants, bulanList]);

  const skorList = useMemo(() => {
    return skorMitra(atribusiRows, bulanList);
  }, [atribusiRows, bulanList]);

  // Hitung total anggaran periode ini untuk default simulasi
  const defaultTotalAnggaran = useMemo(() => {
    const total = atribusiRows.reduce((s, a) => s + a.biayaTotal, 0);
    // Jika ada total biaya, gunakan rata-rata per bulan, dibulatkan ke kelipatan 500rb
    const bulanCount = bulanList ? bulanList.length : 1;
    const avg = total > 0 ? Math.round(total / bulanCount / 500000) * 500000 : 5000000;
    return Math.max(1000000, avg);
  }, [atribusiRows, bulanList]);

  return (
    <div className="space-y-6">
      {/* ─── 1. Bilah Kontrol Periode ───────────────────────────────────────── */}
      <div className="bg-white border border-editorial-border rounded-2xl shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-900">Rentang Periode Pengamatan:</h3>
            <span className="text-[11px] text-stone-500">
              {periodeLabel} {bulanList ? `(${bulanList.join(', ')})` : ''}
            </span>
          </div>
        </div>

        {/* Tombol Pilihan Periode */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handlePeriodeChange('3')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periode === '3'
                ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            3 Bulan
          </button>
          <button
            type="button"
            onClick={() => handlePeriodeChange('2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periode === '2'
                ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            2 Bulan
          </button>
          <button
            type="button"
            onClick={() => handlePeriodeChange('1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periode === '1'
                ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            1 Bulan
          </button>
          <button
            type="button"
            onClick={() => handlePeriodeChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periode === 'all'
                ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Semua Data
          </button>
        </div>
      </div>

      {/* ─── 2. Panel 3 Kartu Rekomendasi Kerja Sama ──────────────────────── */}
      <KartuRekomendasiMitra skorList={skorList} />

      {/* ─── 3. Tabel Utama Peringkat Mitra ─────────────────────────────────── */}
      <TabelPeringkatMitra
        skorList={skorList}
        ads={items}
        periodeLabel={periodeLabel}
      />

      {/* ─── 4. Matriks Media x Posisi Lowongan ─────────────────────────────── */}
      <MatriksMediaPosisi
        ads={items}
        applicants={applicants}
        skorList={skorList}
        bulanList={bulanList}
      />

      {/* ─── 5. Simulasi Alokasi Ulang Anggaran Bulan Depan ─────────────────── */}
      <SimulasiAlokasiAnggaran
        skorList={skorList}
        defaultTotalAnggaran={defaultTotalAnggaran}
      />

      {/* ─── 6. Penjelasan Metodologi Skor (Bisa Dilipat) ──────────────────── */}
      <PenjelasanSkorMitra />
    </div>
  );
};
