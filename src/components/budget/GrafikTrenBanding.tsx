import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Percent,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  AnalisisBanding,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface GrafikTrenBandingProps {
  bandingData: AnalisisBanding;
  selectedMonth: string;
}

type ModeGrafik = 'anggaran-potensial' | 'unit-economics' | 'persen-potensial';

function formatMonthAxis(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(date);
}

export const GrafikTrenBanding: React.FC<GrafikTrenBandingProps> = ({
  bandingData,
  selectedMonth,
}) => {
  const [mode, setMode] = useState<ModeGrafik>('anggaran-potensial');

  // Urutkan kronologis dari kiri ke kanan (bulan terlama -> bulan acuan)
  const chartData = useMemo(() => {
    return bandingData.deretBulan.map((item) => ({
      rawMonth: item.bulan,
      bulan: formatMonthAxis(item.bulan),
      anggaran: item.totalBiaya,
      pelamar: item.pelamar,
      potensial: item.potensial,
      tidakPotensial: item.tidakPotensial,
      persenPotensial: item.persenPotensial,
      biayaPerPelamar: item.biayaPerPelamar ?? 0,
      biayaPerPotensial: item.biayaPerPotensial ?? 0,
      isAcuan: item.bulan === selectedMonth,
    }));
  }, [bandingData, selectedMonth]);

  // Tooltip Kustom Lengkap & Informatif
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = chartData.find((d) => d.bulan === label);

    return (
      <div className="bg-stone-900/95 text-white p-3.5 rounded-xl shadow-xl border border-stone-700/60 text-xs space-y-2 min-w-[210px] backdrop-blur-xs">
        <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 font-bold">
          <span className="text-stone-300">{label}</span>
          {dataItem?.isAcuan && (
            <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.2 rounded font-extrabold uppercase">
              Bulan Acuan
            </span>
          )}
        </div>

        <div className="space-y-1 font-mono text-[11px]">
          {payload.map((entry: any, index: number) => {
            let formattedVal = entry.value;
            if (entry.dataKey === 'anggaran' || entry.dataKey === 'biayaPerPelamar' || entry.dataKey === 'biayaPerPotensial') {
              formattedVal = formatRupiah(entry.value);
            } else if (entry.dataKey === 'persenPotensial') {
              formattedVal = formatPersen(entry.value);
            } else {
              formattedVal = `${entry.value} orang`;
            }

            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-stone-300 font-sans">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}:
                </span>
                <span className="font-bold text-white">{formattedVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-editorial-border rounded-2xl shadow-xs overflow-hidden p-5 space-y-5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Grafik Tren Kinerja Historis</h3>
            <p className="text-[11px] text-stone-500">
              Visualisasi dinamika metrik antar bulan ({chartData.length} bulan pengamatan)
            </p>
          </div>
        </div>

        {/* Toggle options */}
        <div className="flex items-center bg-stone-100/80 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('anggaran-potensial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'anggaran-potensial'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-brand-600" />
            <span>Anggaran vs Potensial</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('unit-economics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'unit-economics'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5 text-amber-600" />
            <span>Biaya per Unit</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('persen-potensial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'persen-potensial'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Percent className="h-3.5 w-3.5 text-emerald-600" />
            <span>% Potensial</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'anggaran-potensial' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : `${v / 1000}k`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Bar
                yAxisId="left"
                dataKey="anggaran"
                name="Anggaran Iklan (Rp)"
                fill="#0f766e" // brand dark teal / emerald-700
                radius={[6, 6, 0, 0]}
                barSize={36}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="potensial"
                name="Pelamar Potensial (orang)"
                stroke="#f59e0b" // amber-500
                strokeWidth={3}
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          ) : mode === 'unit-economics' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey="biayaPerPelamar"
                name="Biaya per Pelamar"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#64748b' }}
              />
              <Line
                type="monotone"
                dataKey="biayaPerPotensial"
                name="Biaya per Potensial"
                stroke="#059669" // emerald-600
                strokeWidth={3}
                dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey="persenPotensial"
                name="Rasio Pelamar Potensial (%)"
                stroke="#0284c7" // sky-600
                strokeWidth={3}
                dot={{ r: 5, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
