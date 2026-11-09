import React from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Table as TableIcon,
  HelpCircle,
} from 'lucide-react';
import {
  AnalisisBanding,
  RingkasanKpiBulan,
  PerbandinganMetrikItem,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface TabelPerbandinganKpiProps {
  bandingData: AnalisisBanding;
  selectedMonth: string;
}

function formatMonthHeader(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(date);
}

interface RowConfig {
  id: string;
  label: string;
  getValue: (kpi: RingkasanKpiBulan) => string;
  getRawValue: (kpi: RingkasanKpiBulan) => number | null;
  trendKey?: keyof AnalisisBanding['perbandingan'];
  isCurrency?: boolean;
  isPercent?: boolean;
}

export const TabelPerbandinganKpi: React.FC<TabelPerbandinganKpiProps> = ({
  bandingData,
  selectedMonth,
}) => {
  const { deretBulan, rataRataPembanding, perbandingan, jumlahBulanBerdata } = bandingData;
  const kpiAcuan = deretBulan[deretBulan.length - 1];

  // Susun kolom bulan: terbaru paling kiri (Acuan, lalu mundur)
  // deretBulan berisi [pembandingN, ..., pembanding1, acuan]
  // Kita balik agar yang terbaru (acuan) paling kiri, lalu bulan-bulan sebelumnya
  const reversedMonths = [...deretBulan].reverse();

  // Konfigurasi baris metrik
  const rows: RowConfig[] = [
    {
      id: 'totalBiaya',
      label: 'Total Anggaran',
      getValue: (k) => (k.totalBiaya > 0 ? formatRupiah(k.totalBiaya) : k.totalBiaya === 0 && k.pelamar === 0 ? '-' : 'Rp 0'),
      getRawValue: (k) => k.totalBiaya,
      trendKey: 'totalBiaya',
      isCurrency: true,
    },
    {
      id: 'jumlahLokerDiiklankan',
      label: 'Loker Diiklankan',
      getValue: (k) => (k.totalBiaya === 0 && k.pelamar === 0 ? '-' : `${k.jumlahLokerDiiklankan} posisi`),
      getRawValue: (k) => k.jumlahLokerDiiklankan,
    },
    {
      id: 'jumlahIklan',
      label: 'Jumlah Iklan',
      getValue: (k) => (k.totalBiaya === 0 && k.pelamar === 0 ? '-' : `${k.jumlahIklan} tayangan`),
      getRawValue: (k) => k.jumlahIklan,
    },
    {
      id: 'pelamar',
      label: 'Pelamar Masuk',
      getValue: (k) => (k.totalBiaya === 0 && k.pelamar === 0 ? '-' : `${k.pelamar} orang`),
      getRawValue: (k) => k.pelamar,
      trendKey: 'pelamar',
    },
    {
      id: 'potensial',
      label: 'Pelamar Potensial',
      getValue: (k) => (k.totalBiaya === 0 && k.pelamar === 0 ? '-' : `${k.potensial} orang`),
      getRawValue: (k) => k.potensial,
      trendKey: 'potensial',
    },
    {
      id: 'tidakPotensial',
      label: 'Tidak Potensial',
      getValue: (k) => (k.totalBiaya === 0 && k.pelamar === 0 ? '-' : `${k.tidakPotensial} orang`),
      getRawValue: (k) => k.tidakPotensial,
    },
    {
      id: 'persenPotensial',
      label: '% Potensial',
      getValue: (k) => (k.totalBiaya === 0 && k.pelamar === 0 ? '-' : formatPersen(k.persenPotensial)),
      getRawValue: (k) => k.persenPotensial,
      trendKey: 'persenPotensial',
      isPercent: true,
    },
    {
      id: 'diterima',
      label: 'Kandidat Diterima',
      getValue: (k) => (k.totalBiaya === 0 && k.pelamar === 0 ? '-' : `${k.diterima} orang`),
      getRawValue: (k) => k.diterima,
      trendKey: 'diterima',
    },
    {
      id: 'biayaPerPelamar',
      label: 'Biaya / Pelamar',
      getValue: (k) => (k.biayaPerPelamar !== null ? formatRupiah(k.biayaPerPelamar) : '-'),
      getRawValue: (k) => k.biayaPerPelamar,
      trendKey: 'biayaPerPelamar',
      isCurrency: true,
    },
    {
      id: 'biayaPerPotensial',
      label: 'Biaya / Potensial',
      getValue: (k) => (k.biayaPerPotensial !== null ? formatRupiah(k.biayaPerPotensial) : '-'),
      getRawValue: (k) => k.biayaPerPotensial,
      trendKey: 'biayaPerPotensial',
      isCurrency: true,
    },
    {
      id: 'biayaPerDiterima',
      label: 'Biaya / Diterima',
      getValue: (k) => (k.biayaPerDiterima !== null ? formatRupiah(k.biayaPerDiterima) : '-'),
      getRawValue: (k) => k.biayaPerDiterima,
      trendKey: 'biayaPerDiterima',
      isCurrency: true,
    },
  ];

  // Helper render selisih & tren
  const renderTrendCell = (item?: PerbandinganMetrikItem, isCurrency = false, isPercent = false) => {
    if (!item || item.selisihPersen === null || item.nilaiPembanding === null) {
      return <span className="text-stone-400 text-xs">-</span>;
    }

    const { selisihAbsolut, selisihPersen, arah } = item;
    const isGood = arah === 'membaik';
    const isBad = arah === 'memburuk';
    const isStable = arah === 'stabil';

    const absSign = selisihAbsolut !== null && selisihAbsolut > 0 ? '+' : '';
    const pctSign = selisihPersen > 0 ? '+' : '';

    let absFormatted = '';
    if (selisihAbsolut !== null) {
      if (isCurrency) {
        absFormatted = `${absSign}${formatRupiah(selisihAbsolut)}`;
      } else if (isPercent) {
        absFormatted = `${absSign}${formatPersen(selisihAbsolut)}`;
      } else {
        absFormatted = `${absSign}${selisihAbsolut}`;
      }
    }

    const badgeLabel = isGood ? 'Membaik' : isBad ? 'Memburuk' : 'Stabil';

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isGood
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isBad
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {isGood ? (
              <TrendingDown className="h-3 w-3" />
            ) : isBad ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>{badgeLabel}</span>
          </span>
          <span
            className={`font-mono text-xs ${
              isGood ? 'text-emerald-700' : isBad ? 'text-rose-700' : 'text-stone-600'
            }`}
          >
            {pctSign}
            {selisihPersen.toFixed(1)}%
          </span>
        </div>
        <span className="text-[10px] text-stone-400 font-mono">({absFormatted})</span>
      </div>
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Metrik',
      ...reversedMonths.map((m) =>
        m.bulan === selectedMonth
          ? `${formatMonthHeader(m.bulan)} (Acuan)`
          : formatMonthHeader(m.bulan)
      ),
      'Rata-rata Pembanding',
      'Selisih Absolut',
      'Selisih Persen',
      'Status Tren',
    ];

    const csvRows = rows.map((r) => {
      const monthVals = reversedMonths.map((m) => {
        const v = r.getRawValue(m);
        return v !== null ? v : '';
      });

      const avgVal = r.getRawValue(rataRataPembanding);
      const trendItem = r.trendKey ? perbandingan[r.trendKey] : undefined;

      const selAbs = trendItem?.selisihAbsolut !== null ? trendItem?.selisihAbsolut : '';
      const selPct = trendItem?.selisihPersen !== null ? `${trendItem?.selisihPersen}%` : '';
      const arahTeks =
        trendItem?.arah === 'membaik'
          ? 'Membaik'
          : trendItem?.arah === 'memburuk'
          ? 'Memburuk'
          : trendItem?.arah === 'stabil'
          ? 'Stabil'
          : '';

      return [
        `"${r.label}"`,
        ...monthVals,
        avgVal !== null ? avgVal : '',
        selAbs !== undefined ? selAbs : '',
        selPct !== undefined ? `"${selPct}"` : '',
        `"${arahTeks}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Perbandingan_KPI_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-editorial-border rounded-2xl shadow-xs overflow-hidden">
      {/* Table Header / Action */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <TableIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Tabel Perbandingan Metrik KPI</h3>
            <p className="text-[11px] text-stone-500">
              Evaluasi kinerja bulan acuan terhadap deret bulan sebelumnya dan rata-rata historis
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
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
              <th className="py-3 px-4 w-48 font-bold text-stone-700">Metrik</th>
              {reversedMonths.map((m) => {
                const isAcuan = m.bulan === selectedMonth;
                const noData = m.totalBiaya === 0 && m.pelamar === 0;

                return (
                  <th
                    key={m.bulan}
                    className={`py-3 px-3 text-right ${
                      isAcuan ? 'bg-brand-50/70 text-brand-900 border-x border-brand-100 font-extrabold' : ''
                    }`}
                  >
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1">
                        <span>{formatMonthHeader(m.bulan)}</span>
                        {isAcuan && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 bg-brand-700 text-white rounded">
                            Acuan
                          </span>
                        )}
                      </div>
                      {noData && !isAcuan && (
                        <span className="text-[9px] font-normal lowercase tracking-normal text-amber-700 bg-amber-50 border border-amber-200/60 px-1 rounded">
                          belum ada data
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="py-3 px-3 text-right bg-stone-100/60 text-stone-700">
                <div className="flex flex-col items-end">
                  <span>Rata-rata Pembanding</span>
                  <span className="text-[9px] font-normal lowercase text-stone-500">
                    ({jumlahBulanBerdata ?? 0} bulan berdata)
                  </span>
                </div>
              </th>
              <th className="py-3 px-4 text-right bg-stone-50 text-stone-700 w-48">
                Selisih vs Pembanding
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {rows.map((row) => {
              const trendItem = row.trendKey ? perbandingan[row.trendKey] : undefined;

              return (
                <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-stone-900">{row.label}</td>
                  {reversedMonths.map((m) => {
                    const isAcuan = m.bulan === selectedMonth;
                    const val = row.getValue(m);

                    return (
                      <td
                        key={m.bulan}
                        className={`py-3 px-3 text-right font-mono ${
                          isAcuan
                            ? 'bg-brand-50/30 text-stone-900 font-bold border-x border-brand-100/60'
                            : 'text-stone-600'
                        }`}
                      >
                        {val}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right font-mono font-medium text-stone-800 bg-stone-50/40">
                    {row.getValue(rataRataPembanding)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {renderTrendCell(trendItem, row.isCurrency, row.isPercent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Note footer */}
      <div className="p-3.5 bg-stone-50/70 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-2">
        <HelpCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
        <span>
          Bulan pembanding yang belum memiliki catatan anggaran dikeluarkan dari penghitungan rata-rata agar tidak mendistorsi perbandingan tren.
        </span>
      </div>
    </div>
  );
};
