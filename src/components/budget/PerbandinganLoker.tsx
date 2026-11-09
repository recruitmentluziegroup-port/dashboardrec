import React, { useMemo } from 'react';
import {
  Download,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  HelpCircle,
} from 'lucide-react';
import {
  BarisAnalisis,
  RingkasanKpiBulan,
  formatRupiah,
} from '../../lib/budget-analytics';

interface PerbandinganLokerProps {
  rows: BarisAnalisis[];
  deretBulan: RingkasanKpiBulan[];
  selectedMonth: string;
}

function formatMonthShort(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(date);
}

export const PerbandinganLoker: React.FC<PerbandinganLokerProps> = ({
  rows,
  deretBulan,
  selectedMonth,
}) => {
  const reversedMonths = useMemo(() => [...deretBulan].reverse(), [deretBulan]);
  const monthKeys = useMemo(() => deretBulan.map((d) => d.bulan), [deretBulan]);

  const posisiList = useMemo(() => {
    // 1. Kumpulkan semua nama posisi unik
    const mapPos = new Map<string, string>(); // lowerKey -> displayName
    rows
      .filter((r) => monthKeys.includes(r.bulan))
      .forEach((r) => {
        const norm = r.posisi.trim().toLowerCase();
        if (norm && !mapPos.has(norm)) {
          mapPos.set(norm, r.posisi.trim());
        }
      });

    const compMonths = monthKeys.filter((m) => m !== selectedMonth);

    const result = Array.from(mapPos.entries()).map(([normKey, displayName]) => {
      const monthlyValues: Record<
        string,
        {
          hasData: boolean;
          biaya: number;
          potensial: number;
          pelamar: number;
        }
      > = {};

      let totalBiaya = 0;
      let totalPotensial = 0;
      let compBiayaSum = 0;
      let compPotensialSum = 0;
      let compMonthsWithData = 0;

      monthKeys.forEach((m) => {
        const matched = rows.filter(
          (r) => r.bulan === m && r.posisi.trim().toLowerCase() === normKey
        );

        if (matched.length === 0) {
          monthlyValues[m] = {
            hasData: false,
            biaya: 0,
            potensial: 0,
            pelamar: 0,
          };
        } else {
          const b = matched.reduce((s, r) => s + r.biaya, 0);
          const pot = matched.reduce((s, r) => s + r.potensial, 0);
          const pel = matched.reduce((s, r) => s + r.pelamar, 0);

          totalBiaya += b;
          totalPotensial += pot;

          monthlyValues[m] = {
            hasData: true,
            biaya: b,
            potensial: pot,
            pelamar: pel,
          };

          if (compMonths.includes(m)) {
            compBiayaSum += b;
            compPotensialSum += pot;
            compMonthsWithData += 1;
          }
        }
      });

      const acuanData = monthlyValues[selectedMonth] || {
        hasData: false,
        biaya: 0,
        potensial: 0,
        pelamar: 0,
      };

      // Cek apakah posisi ini mengalami anomali:
      // Anggaran bulan acuan naik dibanding rata-rata pembanding, tetapi pelamar potensialnya justru turun
      const avgCompBiaya = compMonthsWithData > 0 ? compBiayaSum / compMonthsWithData : 0;
      const avgCompPotensial =
        compMonthsWithData > 0 ? compPotensialSum / compMonthsWithData : 0;

      const isAnomaly =
        acuanData.hasData &&
        compMonthsWithData > 0 &&
        acuanData.biaya > avgCompBiaya * 1.05 && // biaya naik >5%
        acuanData.potensial < avgCompPotensial && // potensial turun
        avgCompBiaya > 0;

      return {
        normKey,
        displayName,
        totalBiaya,
        totalPotensial,
        monthlyValues,
        acuanData,
        avgCompBiaya,
        avgCompPotensial,
        isAnomaly,
      };
    });

    // Urutkan anomali ke atas terlebih dahulu, kemudian berdasarkan total biaya DESC
    return result.sort((a, b) => {
      if (a.isAnomaly && !b.isAnomaly) return -1;
      if (!a.isAnomaly && b.isAnomaly) return 1;
      return b.totalBiaya - a.totalBiaya || b.totalPotensial - a.totalPotensial;
    });
  }, [rows, monthKeys, selectedMonth]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Posisi Lowongan',
      'Peringatan Anomali',
      ...reversedMonths.flatMap((m) => [
        `${formatMonthShort(m.bulan)} Anggaran (Rp)`,
        `${formatMonthShort(m.bulan)} Potensial (org)`,
      ]),
      'Total Anggaran (Rp)',
      'Total Potensial (org)',
    ];

    const csvRows = posisiList.map((p) => {
      const anomalyText = p.isAnomaly ? 'Anggaran Naik Potensial Turun' : 'Normal';
      const monthCells = reversedMonths.flatMap((m) => {
        const item = p.monthlyValues[m.bulan];
        if (!item || !item.hasData) return ['-', '-'];
        return [item.biaya, item.potensial];
      });

      return [
        `"${p.displayName}"`,
        `"${anomalyText}"`,
        ...monthCells,
        p.totalBiaya,
        p.totalPotensial,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Perbandingan_Loker_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-editorial-border rounded-2xl shadow-xs overflow-hidden">
      {/* Table Header */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Perbandingan per Loker (Posisi)</h3>
            <p className="text-[11px] text-stone-500">
              Evaluasi dinamika alokasi anggaran dan hasil kandidat potensial tiap lowongan kerja
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

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
              <th className="py-3 px-4 w-56 font-bold text-stone-700">Posisi Lowongan</th>
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
                    <span className="block text-[9px] font-normal lowercase tracking-normal text-stone-500">
                      anggaran / potensial
                    </span>
                  </th>
                );
              })}
              <th className="py-3 px-4 text-right bg-stone-100/60 text-stone-700">
                Total Akumulasi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {posisiList.length === 0 ? (
              <tr>
                <td
                  colSpan={reversedMonths.length + 2}
                  className="py-8 text-center text-stone-400"
                >
                  Belum ada data posisi lowongan pada rentang bulan yang dipilih.
                </td>
              </tr>
            ) : (
              posisiList.map((p) => {
                return (
                  <tr
                    key={p.normKey}
                    className={`hover:bg-stone-50/60 transition-colors ${
                      p.isAnomaly ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-stone-900">{p.displayName}</div>
                        {p.isAnomaly && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md">
                            <AlertTriangle className="h-3 w-3 text-amber-700" />
                            <span>Anggaran Naik, Potensial Turun</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {reversedMonths.map((m) => {
                      const isAcuan = m.bulan === selectedMonth;
                      const item = p.monthlyValues[m.bulan];

                      if (!item || !item.hasData) {
                        return (
                          <td
                            key={m.bulan}
                            className={`py-3.5 px-3 text-right font-mono text-stone-400 ${
                              isAcuan ? 'bg-brand-50/20 border-x border-brand-100/50' : ''
                            }`}
                          >
                            -
                          </td>
                        );
                      }

                      return (
                        <td
                          key={m.bulan}
                          className={`py-3.5 px-3 text-right font-mono text-xs ${
                            isAcuan ? 'bg-brand-50/30 border-x border-brand-100/60' : ''
                          }`}
                        >
                          <div className="font-bold text-stone-900">
                            {item.biaya > 0 ? formatRupiah(item.biaya) : item.pelamar > 0 ? 'Gratis' : '-'}
                          </div>
                          <div className="text-[11px] text-emerald-700 font-medium">
                            {item.potensial} potensial{' '}
                            <span className="text-[10px] text-stone-400">({item.pelamar} pelamar)</span>
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-right font-mono text-xs bg-stone-50/40">
                      <div className="font-bold text-stone-900">{formatRupiah(p.totalBiaya)}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">
                        {p.totalPotensial} potensial
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3.5 bg-stone-50/70 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <span>
            Penanda anomali muncul saat anggaran iklan pada bulan acuan mengalami kenaikan lebih dari 5%, namun jumlah pelamar potensial yang didapat justru lebih sedikit dibanding rata-rata pembanding.
          </span>
        </div>
      </div>
    </div>
  );
};
