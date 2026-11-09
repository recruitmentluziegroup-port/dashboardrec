import React, { useState, useMemo } from 'react';
import {
  Download,
  Radio,
  Award,
  AlertTriangle,
  Flame,
  HelpCircle,
} from 'lucide-react';
import {
  BarisAnalisis,
  RingkasanKpiBulan,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface PerbandinganChannelProps {
  rows: BarisAnalisis[];
  deretBulan: RingkasanKpiBulan[];
  selectedMonth: string;
}

type MetrikChannel = 'biayaPerPotensial' | 'pelamar' | 'persenPotensial';

function formatMonthShort(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(date);
}

export const PerbandinganChannel: React.FC<PerbandinganChannelProps> = ({
  rows,
  deretBulan,
  selectedMonth,
}) => {
  const [metrik, setMetrik] = useState<MetrikChannel>('biayaPerPotensial');

  // Months ordered from newest to oldest for table columns
  const reversedMonths = useMemo(() => [...deretBulan].reverse(), [deretBulan]);
  const monthKeys = useMemo(() => deretBulan.map((d) => d.bulan), [deretBulan]);

  // Aggregate channel data per month
  const { channelMatrix, konsistenTerbaik, konsistenTerburuk } = useMemo(() => {
    // 1. Gather all unique channels present in the period
    const channelMap = new Map<string, string>(); // lowerKey -> displayName
    rows
      .filter((r) => monthKeys.includes(r.bulan))
      .forEach((r) => {
        const norm = r.channel.trim().toLowerCase();
        if (norm && !channelMap.has(norm)) {
          channelMap.set(norm, r.channel.trim());
        }
      });

    const channels = Array.from(channelMap.entries()).map(([normKey, displayName]) => {
      let totalBiaya = 0;
      let totalPelamar = 0;
      let totalPotensial = 0;
      let activeMonthsCount = 0;

      const monthlyValues: Record<
        string,
        {
          hasData: boolean;
          biaya: number;
          pelamar: number;
          potensial: number;
          biayaPerPotensial: number | null;
          persenPotensial: number | null;
        }
      > = {};

      monthKeys.forEach((m) => {
        const matching = rows.filter(
          (r) => r.bulan === m && r.channel.trim().toLowerCase() === normKey
        );

        if (matching.length === 0) {
          monthlyValues[m] = {
            hasData: false,
            biaya: 0,
            pelamar: 0,
            potensial: 0,
            biayaPerPotensial: null,
            persenPotensial: null,
          };
        } else {
          activeMonthsCount += 1;
          const b = matching.reduce((s, r) => s + r.biaya, 0);
          const p = matching.reduce((s, r) => s + r.pelamar, 0);
          const pot = matching.reduce((s, r) => s + r.potensial, 0);

          totalBiaya += b;
          totalPelamar += p;
          totalPotensial += pot;

          monthlyValues[m] = {
            hasData: true,
            biaya: b,
            pelamar: p,
            potensial: pot,
            biayaPerPotensial: pot > 0 ? Math.round(b / pot) : b > 0 ? null : 0,
            persenPotensial: p > 0 ? Math.round((pot / p) * 1000) / 10 : null,
          };
        }
      });

      const avgCpp = totalPotensial > 0 ? Math.round(totalBiaya / totalPotensial) : null;
      const avgPersen = totalPelamar > 0 ? Math.round((totalPotensial / totalPelamar) * 1000) / 10 : null;

      return {
        normKey,
        displayName,
        totalBiaya,
        totalPelamar,
        totalPotensial,
        activeMonthsCount,
        avgCpp,
        avgPersen,
        monthlyValues,
      };
    });

    // 2. Identify Best and Worst channels (active in at least 2 months or >= 1 month if period is small)
    const minActive = Math.min(2, monthKeys.length);
    const eligibleChannels = channels.filter((c) => c.activeMonthsCount >= minActive);

    let bestChannelKey: string | null = null;
    let worstChannelKey: string | null = null;

    if (eligibleChannels.length > 0) {
      // Best: Lowest avgCpp with at least 1 qualified applicant, or highest avgPersen
      const withQualified = eligibleChannels.filter((c) => c.avgCpp !== null && c.totalPotensial > 0);
      if (withQualified.length > 0) {
        withQualified.sort((a, b) => (a.avgCpp ?? 0) - (b.avgCpp ?? 0));
        bestChannelKey = withQualified[0].normKey;

        // Worst: Highest avgCpp or 0 qualified with budget > 0
        const expensiveOrWasted = [...eligibleChannels].sort((a, b) => {
          if (a.totalPotensial === 0 && a.totalBiaya > 0) return -1;
          if (b.totalPotensial === 0 && b.totalBiaya > 0) return 1;
          return (b.avgCpp ?? 0) - (a.avgCpp ?? 0);
        });

        if (expensiveOrWasted[0].normKey !== bestChannelKey) {
          worstChannelKey = expensiveOrWasted[0].normKey;
        }
      }
    }

    // Sort channels by total applicants or total budget descending
    channels.sort((a, b) => b.totalBiaya - a.totalBiaya || b.totalPelamar - a.totalPelamar);

    return {
      channelMatrix: channels,
      konsistenTerbaik: bestChannelKey,
      konsistenTerburuk: worstChannelKey,
    };
  }, [rows, monthKeys]);

  // Heatmap helper for cell styling
  const getHeatmapClass = (val: number | null, metrikType: MetrikChannel) => {
    if (val === null) return '';
    if (metrikType === 'biayaPerPotensial') {
      if (val === 0) return 'bg-emerald-50 text-emerald-800 font-bold';
      if (val <= 50000) return 'bg-emerald-50/70 text-emerald-900';
      if (val > 250000) return 'bg-rose-50/70 text-rose-900 font-semibold';
      return '';
    }
    if (metrikType === 'pelamar') {
      if (val >= 20) return 'bg-brand-50/70 text-brand-900 font-bold';
      if (val >= 5) return 'bg-brand-50/30 text-brand-800';
      return '';
    }
    if (metrikType === 'persenPotensial') {
      if (val >= 40) return 'bg-emerald-50 text-emerald-800 font-bold';
      if (val <= 15) return 'bg-amber-50/60 text-amber-900';
      return '';
    }
    return '';
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Channel',
      'Status Sorotan',
      ...reversedMonths.map((m) =>
        m.bulan === selectedMonth
          ? `${formatMonthShort(m.bulan)} (Acuan)`
          : formatMonthShort(m.bulan)
      ),
      metrik === 'biayaPerPotensial'
        ? 'Rata-rata Biaya/Potensial'
        : metrik === 'pelamar'
        ? 'Total Pelamar'
        : 'Rata-rata % Potensial',
    ];

    const csvRows = channelMatrix.map((c) => {
      const tag =
        c.normKey === konsistenTerbaik
          ? 'Konsisten Terbaik'
          : c.normKey === konsistenTerburuk
          ? 'Perlu Evaluasi'
          : '';

      const monthCells = reversedMonths.map((m) => {
        const item = c.monthlyValues[m.bulan];
        if (!item || !item.hasData) return '-';
        if (metrik === 'biayaPerPotensial') {
          return item.biayaPerPotensial !== null ? item.biayaPerPotensial : 'Tanpa Potensial';
        }
        if (metrik === 'pelamar') return item.pelamar;
        return item.persenPotensial !== null ? `${item.persenPotensial}%` : '-';
      });

      const summaryVal =
        metrik === 'biayaPerPotensial'
          ? c.avgCpp !== null
            ? c.avgCpp
            : '-'
          : metrik === 'pelamar'
          ? c.totalPelamar
          : c.avgPersen !== null
          ? `${c.avgPersen}%`
          : '-';

      return [`"${c.displayName}"`, `"${tag}"`, ...monthCells, summaryVal].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Perbandingan_Channel_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-editorial-border rounded-2xl shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Perbandingan Kinerja per Channel</h3>
            <p className="text-[11px] text-stone-500">
              Matriks channel x bulan untuk mengamati efisiensi dan konsistensi platform pemasangan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metrik Selector */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetrik('biayaPerPotensial')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metrik === 'biayaPerPotensial'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Biaya/Potensial
            </button>
            <button
              type="button"
              onClick={() => setMetrik('pelamar')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metrik === 'pelamar'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Pelamar Masuk
            </button>
            <button
              type="button"
              onClick={() => setMetrik('persenPotensial')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metrik === 'persenPotensial'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              % Potensial
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-stone-500" />
            <span>Ekspor</span>
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
              <th className="py-3 px-4 w-52 font-bold text-stone-700">Channel</th>
              {reversedMonths.map((m) => {
                const isAcuan = m.bulan === selectedMonth;
                return (
                  <th
                    key={m.bulan}
                    className={`py-3 px-3 text-right ${
                      isAcuan ? 'bg-brand-50/70 text-brand-900 border-x border-brand-100 font-extrabold' : ''
                    }`}
                  >
                    <span>{formatMonthShort(m.bulan)}</span>
                    {isAcuan && (
                      <span className="block text-[8px] uppercase tracking-wider font-extrabold text-brand-700">
                        Acuan
                      </span>
                    )}
                  </th>
                );
              })}
              <th className="py-3 px-4 text-right bg-stone-100/60 text-stone-700">
                {metrik === 'biayaPerPotensial'
                  ? 'Rata-rata Biaya'
                  : metrik === 'pelamar'
                  ? 'Total Pelamar'
                  : 'Rata-rata %'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {channelMatrix.length === 0 ? (
              <tr>
                <td
                  colSpan={reversedMonths.length + 2}
                  className="py-8 text-center text-stone-400"
                >
                  Belum ada data channel pada rentang bulan yang dipilih.
                </td>
              </tr>
            ) : (
              channelMatrix.map((c) => {
                const isBest = c.normKey === konsistenTerbaik;
                const isWorst = c.normKey === konsistenTerburuk;

                return (
                  <tr key={c.normKey} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{c.displayName}</span>
                        {isBest && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-md"
                            title="Konsisten menghasilkan kandidat potensial dengan biaya efisien"
                          >
                            <Award className="h-3 w-3" />
                            <span>Konsisten Terbaik</span>
                          </span>
                        )}
                        {isWorst && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-md"
                            title="Biaya per potensial relatif mahal atau konversi rendah"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>Perlu Evaluasi</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {reversedMonths.map((m) => {
                      const isAcuan = m.bulan === selectedMonth;
                      const item = c.monthlyValues[m.bulan];

                      if (!item || !item.hasData) {
                        return (
                          <td
                            key={m.bulan}
                            className={`py-3 px-3 text-right font-mono text-stone-400 ${
                              isAcuan ? 'bg-brand-50/20 border-x border-brand-100/50' : ''
                            }`}
                          >
                            -
                          </td>
                        );
                      }

                      let displayVal = '-';
                      let heatClass = '';

                      if (metrik === 'biayaPerPotensial') {
                        if (item.biayaPerPotensial !== null) {
                          displayVal = formatRupiah(item.biayaPerPotensial);
                          heatClass = getHeatmapClass(item.biayaPerPotensial, 'biayaPerPotensial');
                        } else if (item.biaya > 0 && item.potensial === 0) {
                          displayVal = '0 potensial';
                          heatClass = 'bg-rose-50 text-rose-700 font-bold';
                        } else {
                          displayVal = '-';
                        }
                      } else if (metrik === 'pelamar') {
                        displayVal = `${item.pelamar}`;
                        heatClass = getHeatmapClass(item.pelamar, 'pelamar');
                      } else {
                        displayVal =
                          item.persenPotensial !== null ? formatPersen(item.persenPotensial) : '-';
                        heatClass = getHeatmapClass(item.persenPotensial, 'persenPotensial');
                      }

                      return (
                        <td
                          key={m.bulan}
                          className={`py-3 px-3 text-right font-mono text-xs ${heatClass} ${
                            isAcuan ? 'border-x border-brand-100/60 font-semibold' : ''
                          }`}
                        >
                          {displayVal}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-800 bg-stone-50/40">
                      {metrik === 'biayaPerPotensial'
                        ? c.avgCpp !== null
                          ? formatRupiah(c.avgCpp)
                          : '-'
                        : metrik === 'pelamar'
                        ? `${c.totalPelamar} orang`
                        : c.avgPersen !== null
                        ? formatPersen(c.avgPersen)
                        : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer explanation */}
      <div className="p-3.5 bg-stone-50/70 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <span>
            Tanda &quot;-&quot; menandakan tidak ada iklan atau pelamar yang teratribusi pada bulan tersebut (bukan nilai 0).
          </span>
        </div>
      </div>
    </div>
  );
};
