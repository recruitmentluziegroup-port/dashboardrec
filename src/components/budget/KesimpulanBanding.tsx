import React, { useMemo } from 'react';
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Award,
  DollarSign,
  Users,
  CheckCircle2,
} from 'lucide-react';
import {
  AnalisisBanding,
  BarisAnalisis,
  perChannel,
  perPosisi,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface KesimpulanBandingProps {
  bandingData: AnalisisBanding;
  rows: BarisAnalisis[];
  selectedMonth: string;
  mundurBulan: number;
}

interface ButirKesimpulan {
  id: string;
  teks: string;
  tipe: 'positif' | 'peringatan' | 'netral';
  icon: React.ReactNode;
}

export const KesimpulanBanding: React.FC<KesimpulanBandingProps> = ({
  bandingData,
  rows,
  selectedMonth,
  mundurBulan,
}) => {
  const bullets = useMemo<ButirKesimpulan[]>(() => {
    const list: ButirKesimpulan[] = [];
    const { perbandingan, rataRataPembanding, deretBulan, jumlahBulanBerdata } = bandingData;
    const kpiAcuan = deretBulan[deretBulan.length - 1];
    const deretKeys = deretBulan.map((d) => d.bulan);

    const hasComparison = (jumlahBulanBerdata ?? 0) > 0;

    // 1. Biaya per Pelamar Potensial
    const cppTrend = perbandingan.biayaPerPotensial;
    if (kpiAcuan.biayaPerPotensial !== null) {
      if (hasComparison && cppTrend.nilaiPembanding !== null && cppTrend.selisihPersen !== null) {
        const isBetter = cppTrend.arah === 'membaik';
        const isWorse = cppTrend.arah === 'memburuk';
        const diffAbs = Math.abs(cppTrend.selisihPersen);
        const arahTeks = cppTrend.selisihPersen < 0 ? 'turun' : 'naik';

        list.push({
          id: 'cpp',
          teks: `Biaya per pelamar potensial bulan ini ${formatRupiah(kpiAcuan.biayaPerPotensial)}, ${arahTeks} ${diffAbs.toFixed(1)}% dibanding rata-rata ${jumlahBulanBerdata} bulan sebelumnya (${formatRupiah(cppTrend.nilaiPembanding)}) — performa efisiensi ${isBetter ? 'membaik secara signifikan' : isWorse ? 'memburuk (lebih mahal)' : 'relatif stabil'}.`,
          tipe: isBetter ? 'positif' : isWorse ? 'peringatan' : 'netral',
          icon: isBetter ? (
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          ) : isWorse ? (
            <TrendingUp className="h-4 w-4 text-rose-600" />
          ) : (
            <Minus className="h-4 w-4 text-stone-500" />
          ),
        });
      } else {
        list.push({
          id: 'cpp',
          teks: `Biaya per pelamar potensial bulan ini tercatat sebesar ${formatRupiah(kpiAcuan.biayaPerPotensial)} dengan ${kpiAcuan.potensial} kandidat potensial masuk.`,
          tipe: 'netral',
          icon: <DollarSign className="h-4 w-4 text-brand-600" />,
        });
      }
    } else if (kpiAcuan.potensial === 0 && kpiAcuan.totalBiaya > 0) {
      list.push({
        id: 'cpp-zero',
        teks: `Bulan ini telah dialokasikan anggaran ${formatRupiah(kpiAcuan.totalBiaya)}, namun belum menghasilkan pelamar berstatus potensial.`,
        tipe: 'peringatan',
        icon: <AlertTriangle className="h-4 w-4 text-rose-600" />,
      });
    }

    // 2. Channel Paling Efisien
    const channelAgg = perChannel(rows, deretKeys);
    const channelsWithPotensial = channelAgg.filter(
      (c) => c.potensial > 0 && c.biayaPerPotensial !== null
    );

    if (channelsWithPotensial.length > 0) {
      channelsWithPotensial.sort((a, b) => (a.biayaPerPotensial ?? 0) - (b.biayaPerPotensial ?? 0));
      const bestChannel = channelsWithPotensial[0];
      list.push({
        id: 'best-channel',
        teks: `Channel "${bestChannel.kunci}" menjadi yang paling efisien selama periode ${mundurBulan + 1} bulan terakhir dengan rata-rata biaya ${formatRupiah(bestChannel.biayaPerPotensial)} per kandidat potensial (${bestChannel.potensial} orang potensial).`,
        tipe: 'positif',
        icon: <Award className="h-4 w-4 text-emerald-600" />,
      });
    }

    // 3. Alokasi Anggaran & Volume
    const biayaTrend = perbandingan.totalBiaya;
    if (hasComparison && biayaTrend.nilaiPembanding !== null && biayaTrend.selisihPersen !== null) {
      const isUp = biayaTrend.selisihPersen > 0;
      const diffPct = Math.abs(biayaTrend.selisihPersen);
      list.push({
        id: 'budget-trend',
        teks: `Total anggaran dialokasikan sebesar ${formatRupiah(kpiAcuan.totalBiaya)} (${isUp ? 'meningkat' : 'berkurang'} ${diffPct.toFixed(1)}% vs rata-rata ${jumlahBulanBerdata} bulan sebelumnya sebesar ${formatRupiah(rataRataPembanding.totalBiaya)}).`,
        tipe: 'netral',
        icon: <DollarSign className="h-4 w-4 text-brand-700" />,
      });
    } else {
      list.push({
        id: 'budget-trend',
        teks: `Total anggaran iklan aktif untuk bulan ini adalah ${formatRupiah(kpiAcuan.totalBiaya)} pada ${kpiAcuan.jumlahLokerDiiklankan} posisi loker.`,
        tipe: 'netral',
        icon: <DollarSign className="h-4 w-4 text-stone-600" />,
      });
    }

    // 4. Kualitas & Rasio Potensial
    const pctTrend = perbandingan.persenPotensial;
    if (kpiAcuan.pelamar > 0) {
      if (hasComparison && pctTrend.nilaiPembanding !== null) {
        const isHigher = (pctTrend.selisihPersen ?? 0) > 0;
        list.push({
          id: 'quality-trend',
          teks: `Tingkat kelayakan pelamar (${formatPersen(kpiAcuan.persenPotensial)}) ${isHigher ? 'lebih tinggi' : 'lebih rendah'} dibandingkan rata-rata pembanding (${formatPersen(rataRataPembanding.persenPotensial)}), menghasilkan ${kpiAcuan.potensial} kandidat potensial dari ${kpiAcuan.pelamar} lamaran.`,
          tipe: isHigher ? 'positif' : 'netral',
          icon: <Users className="h-4 w-4 text-blue-600" />,
        });
      } else {
        list.push({
          id: 'quality-trend',
          teks: `Rasio kandidat potensial tercatat ${formatPersen(kpiAcuan.persenPotensial)} (${kpiAcuan.potensial} potensial dari ${kpiAcuan.pelamar} pelamar masuk).`,
          tipe: 'netral',
          icon: <Users className="h-4 w-4 text-stone-600" />,
        });
      }
    }

    // 5. Peringatan Anomali Loker (Anggaran naik tapi potensial turun)
    const posisiAcuan = perPosisi(rows, [selectedMonth]);
    const comparisonMonths = deretKeys.slice(0, -1);
    const posisiPembanding = perPosisi(rows, comparisonMonths);

    for (const pA of posisiAcuan) {
      const pComp = posisiPembanding.find(
        (p) => p.kunci.toLowerCase().trim() === pA.kunci.toLowerCase().trim()
      );
      if (pComp && comparisonMonths.length > 0) {
        const compAvgBiaya = pComp.biaya / comparisonMonths.length;
        const compAvgPotensial = pComp.potensial / comparisonMonths.length;
        // Anggaran naik minimal 10% dan potensial turun minimal 1 orang
        if (pA.biaya > compAvgBiaya * 1.1 && pA.potensial < compAvgPotensial && compAvgBiaya > 0) {
          list.push({
            id: `anomaly-${pA.kunci}`,
            teks: `Perhatian pada posisi "${pA.kunci}": anggaran naik ${Math.round(((pA.biaya / compAvgBiaya) - 1) * 100)}% (menjadi ${formatRupiah(pA.biaya)}), namun jumlah pelamar potensial turun (${pA.potensial} orang vs rata-rata ${compAvgPotensial.toFixed(1)} orang).`,
            tipe: 'peringatan',
            icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
          });
          break; // tampilkan 1 anomali terpenting
        }
      }
    }

    return list.slice(0, 5);
  }, [bandingData, rows, selectedMonth, mundurBulan]);

  if (bullets.length === 0) return null;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Kesimpulan Otomatis Performa</h3>
            <p className="text-[11px] text-stone-500">
              Rangkuman cerdas berbasis data analitik perbandingan {mundurBulan} bulan ke belakang
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
          {bullets.length} Poin Utama
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {bullets.map((b) => (
          <div
            key={b.id}
            className={`flex items-start gap-3 p-3 rounded-xl border text-xs leading-relaxed transition-colors ${
              b.tipe === 'positif'
                ? 'bg-emerald-50/60 border-emerald-200/70 text-emerald-950'
                : b.tipe === 'peringatan'
                ? 'bg-amber-50/60 border-amber-200/70 text-amber-950'
                : 'bg-stone-50/70 border-stone-200/70 text-stone-800'
            }`}
          >
            <div className="mt-0.5 shrink-0">{b.icon}</div>
            <div className="flex-1 font-medium">{b.teks}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
