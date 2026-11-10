import React, { useMemo } from 'react';
import {
  Briefcase,
  Award,
  Sparkles,
  Download,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import {
  BudgetIklan,
  PelamarAnalyticsInput,
  SkorMitraResult,
  alokasiBiayaPerBulan,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface MatriksMediaPosisiProps {
  ads: BudgetIklan[];
  applicants: PelamarAnalyticsInput[];
  skorList: SkorMitraResult[];
  bulanList?: string[];
}

interface PosisiMediaBest {
  posisi: string;
  bestMediaName: string;
  bestChannel: string;
  biaya: number;
  pelamar: number;
  potensial: number;
  biayaPerPotensial: number | null;
  persenPotensial: number;
  alasan: string;
}

export const MatriksMediaPosisi: React.FC<MatriksMediaPosisiProps> = ({
  ads,
  applicants,
  skorList,
  bulanList,
}) => {
  // Hitung media terbaik per posisi
  const matrixData = useMemo<PosisiMediaBest[]>(() => {
    const activeAds = ads.filter((a) => !a.diarsipkan);
    const alokasi = alokasiBiayaPerBulan(activeAds);
    const alokasiFiltered =
      bulanList && bulanList.length > 0
        ? alokasi.filter((a) => bulanList.includes(a.bulan))
        : alokasi;

    // Kumpulkan semua posisi unik dari iklan dan pelamar
    const positionsSet = new Set<string>();
    alokasiFiltered.forEach((a) => {
      if (a.posisi) positionsSet.add(a.posisi.trim());
    });
    applicants.forEach((p) => {
      if (p.jabatanDituju) positionsSet.add(p.jabatanDituju.trim());
    });

    const positions = Array.from(positionsSet).filter(Boolean).sort();

    const results: PosisiMediaBest[] = [];

    positions.forEach((pos) => {
      const posNorm = pos.toLowerCase().trim();

      // Cari semua media yang pernah memuat posisi ini pada alokasi biaya
      const matchingAlokasi = alokasiFiltered.filter(
        (a) => a.posisi.toLowerCase().trim() === posNorm
      );

      // Kumpulkan kandidat media untuk posisi ini
      const mediaStatsMap = new Map<
        string,
        {
          namaMedia: string;
          channel: string;
          biaya: number;
          pelamar: number;
          potensial: number;
        }
      >();

      matchingAlokasi.forEach((a) => {
        const key = `${a.namaMedia.toLowerCase()}|||${a.channel.toLowerCase()}`;
        let item = mediaStatsMap.get(key);
        if (!item) {
          item = {
            namaMedia: a.namaMedia.trim(),
            channel: a.channel.trim(),
            biaya: 0,
            pelamar: 0,
            potensial: 0,
          };
          mediaStatsMap.set(key, item);
        }
        item.biaya += a.biaya;
      });

      // Ambil pelamar yang melamar untuk posisi ini
      const matchingPelamar = applicants.filter(
        (p) => (p.jabatanDituju || '').toLowerCase().trim() === posNorm
      );

      // Hitung pelamar & potensial per media
      matchingPelamar.forEach((p) => {
        const channelNorm = (p.sumberInfoLowongan || '').toLowerCase().trim();
        const ketNorm = (p.keteranganSumber || '').toLowerCase().trim();
        const isPotensial = ['Reviewed', 'Interview HR', 'Interview User', 'Accepted'].includes(
          p.status
        );

        // Cari direct match atau channel match
        let foundKey: string | null = null;
        for (const [k, m] of mediaStatsMap.entries()) {
          if (m.channel.toLowerCase() === channelNorm) {
            if (
              ketNorm &&
              (ketNorm.includes(m.namaMedia.toLowerCase()) ||
                m.namaMedia.toLowerCase().includes(ketNorm))
            ) {
              foundKey = k;
              break;
            }
          }
        }

        if (!foundKey) {
          // Fallback ke media pertama di channel tersebut
          for (const [k, m] of mediaStatsMap.entries()) {
            if (m.channel.toLowerCase() === channelNorm) {
              foundKey = k;
              break;
            }
          }
        }

        if (foundKey) {
          const item = mediaStatsMap.get(foundKey)!;
          item.pelamar += 1;
          if (isPotensial) item.potensial += 1;
        }
      });

      // Evaluasi media terbaik untuk posisi ini
      const candidateList = Array.from(mediaStatsMap.values());
      if (candidateList.length === 0) return;

      // Urutkan media:
      // Prioritas 1: Potensial > 0 dan biayaPerPotensial terendah
      // Prioritas 2: Potensial terbanyak
      // Prioritas 3: Pelamar terbanyak
      candidateList.sort((a, b) => {
        const cppA = a.potensial > 0 ? a.biaya / a.potensial : Infinity;
        const cppB = b.potensial > 0 ? b.biaya / b.potensial : Infinity;

        if (cppA !== cppB) return cppA - cppB;
        if (b.potensial !== a.potensial) return b.potensial - a.potensial;
        return b.pelamar - a.pelamar;
      });

      const best = candidateList[0];
      const cpp = best.potensial > 0 ? Math.round(best.biaya / best.potensial) : null;
      const pct = best.pelamar > 0 ? Math.round((best.potensial / best.pelamar) * 1000) / 10 : 0;

      let alasan = '';
      if (best.biaya === 0 && best.potensial > 0) {
        alasan = `Channel organik/gratis paling produktif dengan ${best.potensial} kandidat potensial.`;
      } else if (cpp !== null && cpp > 0) {
        alasan = `Biaya paling efisien (${formatRupiah(cpp)}/potensial) dengan konversi ${formatPersen(pct)}.`;
      } else if (best.pelamar > 0) {
        alasan = `Menghasilkan volume pelamar terbanyak (${best.pelamar} orang) untuk posisi ini.`;
      } else {
        alasan = 'Pernah dipasang pada periode ini namun belum menghasilkan pelamar masuk.';
      }

      results.push({
        posisi: pos,
        bestMediaName: best.namaMedia || best.channel,
        bestChannel: best.channel,
        biaya: best.biaya,
        pelamar: best.pelamar,
        potensial: best.potensial,
        biayaPerPotensial: cpp,
        persenPotensial: pct,
        alasan,
      });
    });

    return results;
  }, [ads, applicants, skorList, bulanList]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Posisi Lowongan',
      'Media Rekomendasi Terbaik',
      'Channel',
      'Total Biaya (Rp)',
      'Pelamar Masuk',
      'Pelamar Potensial',
      '% Potensial',
      'Biaya / Potensial (Rp)',
      'Alasan Rekomendasi',
    ];

    const csvRows = matrixData.map((item) => [
      `"${item.posisi}"`,
      `"${item.bestMediaName}"`,
      `"${item.bestChannel}"`,
      item.biaya,
      item.pelamar,
      item.potensial,
      `"${formatPersen(item.persenPotensial)}"`,
      item.biayaPerPotensial !== null ? item.biayaPerPotensial : '',
      `"${item.alasan.replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Matriks_Media_x_Posisi.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-editorial-border rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Matriks Media Rekomendasi per Posisi Loker
            </h3>
            <p className="text-[11px] text-stone-500">
              Panduan &quot;Loker X paling cocok dipasang di Media Y&quot; berdasarkan unit economics historis
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-stone-500" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
              <th className="py-3 px-4 w-48 font-bold text-stone-700">Posisi Lowongan</th>
              <th className="py-3 px-4 font-bold text-stone-700">Media Mitra Terbaik</th>
              <th className="py-3 px-3 text-right">Biaya / Potensial</th>
              <th className="py-3 px-3 text-right">Hasil Potensial</th>
              <th className="py-3 px-4">Alasan Kecocokan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {matrixData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-400">
                  Belum ada data posisi lowongan yang diiklankan pada periode ini.
                </td>
              </tr>
            ) : (
              matrixData.map((item) => (
                <tr key={item.posisi} className="hover:bg-stone-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-stone-900">{item.posisi}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{item.bestMediaName}</span>
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                        {item.bestChannel}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-800">
                    {item.biayaPerPotensial !== null ? formatRupiah(item.biayaPerPotensial) : 'Rp 0'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-stone-800">
                    <span className="font-bold text-emerald-700">{item.potensial} orang</span>{' '}
                    <span className="text-[10px] text-stone-400">({item.pelamar} pelamar)</span>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600 text-[11px] leading-relaxed">
                    {item.alasan}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3.5 bg-stone-50/70 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-2">
        <HelpCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
        <span>
          Matriks ini merekomendasikan media yang terbukti menghasilkan kandidat potensial dengan biaya terendah untuk setiap divisi lowongan kerja.
        </span>
      </div>
    </div>
  );
};
