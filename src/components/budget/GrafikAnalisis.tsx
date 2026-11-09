import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarisAnalisis, perChannel, RingkasanKpiBulan, formatRupiah, formatPersen } from '../../lib/budget-analytics';

interface GrafikAnalisisProps {
  rows: BarisAnalisis[];
  kpi: RingkasanKpiBulan;
  selectedMonth: string;
}

const PIE_COLORS = {
  potensial: '#10b981', // emerald-500
  tidakPotensial: '#f43f5e', // rose-500
  pending: '#f59e0b', // amber-500
};

export const GrafikAnalisis: React.FC<GrafikAnalisisProps> = ({
  rows,
  kpi,
  selectedMonth,
}) => {
  // 1. Data Batang: Anggaran vs Pelamar Potensial per Channel
  const barChartData = useMemo(() => {
    const channels = perChannel(rows, [selectedMonth]);
    return channels.map((c) => ({
      channel: c.kunci.length > 15 ? c.kunci.slice(0, 14) + '…' : c.kunci,
      fullChannel: c.kunci,
      anggaran: c.biaya,
      potensial: c.potensial,
      pelamarTotal: c.pelamar,
      persenPotensial: c.persenPotensial,
    }));
  }, [rows, selectedMonth]);

  // 2. Data Donut: Komposisi Status Pelamar
  const donutData = useMemo(() => {
    const total = kpi.pelamar || 0;
    return [
      {
        name: 'Kandidat Potensial',
        value: kpi.potensial,
        pct: total > 0 ? (kpi.potensial / total) * 100 : 0,
        color: PIE_COLORS.potensial,
      },
      {
        name: 'Gugur Seleksi',
        value: kpi.tidakPotensial,
        pct: total > 0 ? (kpi.tidakPotensial / total) * 100 : 0,
        color: PIE_COLORS.tidakPotensial,
      },
      {
        name: 'Belum Diproses (Pending)',
        value: kpi.pending,
        pct: total > 0 ? (kpi.pending / total) * 100 : 0,
        color: PIE_COLORS.pending,
      },
    ].filter((d) => d.value > 0);
  }, [kpi]);

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;

    return (
      <div className="bg-white p-3 rounded-xl border border-editorial-border shadow-md text-xs space-y-1.5 z-50">
        <p className="font-bold text-stone-900 border-b border-stone-100 pb-1">{data.fullChannel}</p>
        <p className="text-stone-600 flex justify-between gap-4">
          <span>Anggaran:</span>
          <strong className="font-mono text-stone-900">{formatRupiah(data.anggaran)}</strong>
        </p>
        <p className="text-stone-600 flex justify-between gap-4">
          <span>Kandidat Potensial:</span>
          <strong className="text-emerald-700">{data.potensial} orang ({formatPersen(data.persenPotensial)})</strong>
        </p>
        <p className="text-stone-500 text-[11px] flex justify-between gap-4">
          <span>Total Pelamar:</span>
          <span>{data.pelamarTotal} orang</span>
        </p>
      </div>
    );
  };

  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0];

    return (
      <div className="bg-white p-3 rounded-xl border border-editorial-border shadow-md text-xs space-y-1 z-50">
        <p className="font-bold text-stone-900">{data.name}</p>
        <p className="text-stone-700">
          Jumlah: <strong>{data.value} orang</strong> ({formatPersen(data.payload.pct)})
        </p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── (A) BAR CHART: ANGGARAN VS POTENSIAL PER CHANNEL (2 cols) ──── */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-editorial-border shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-editorial-border pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-stone-600" />
            <h3 className="font-serif font-bold text-sm text-stone-900 tracking-tight">
              Anggaran vs Kandidat Potensial per Channel
            </h3>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">Dual Sumbu (Biaya vs Orang)</span>
        </div>

        {barChartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-stone-400">
            Tidak ada data channel untuk digrafikkan.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="channel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                {/* Sumbu kiri: Anggaran (Rp) */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  stroke="#94a3b8"
                />
                {/* Sumbu kanan: Pelamar Potensial (orang) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#10b981' }}
                  stroke="#10b981"
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="anggaran"
                  name="Anggaran (Rp)"
                  fill="#475569"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  yAxisId="right"
                  dataKey="potensial"
                  name="Kandidat Potensial"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ─── (B) DONUT CHART: KOMPOSISI STATUS PELAMAR (1 col) ───────────── */}
      <div className="bg-white rounded-2xl border border-editorial-border shadow-xs p-5 space-y-4 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-editorial-border pb-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-stone-600" />
            <h3 className="font-serif font-bold text-sm text-stone-900 tracking-tight">
              Komposisi Kualitas Pelamar
            </h3>
          </div>
          <span className="text-[11px] text-stone-500 font-bold">{kpi.pelamar} total</span>
        </div>

        {donutData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-stone-400">
            Belum ada pelamar di bulan ini.
          </div>
        ) : (
          <>
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomDonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Potensial</span>
                <span className="text-xl font-black text-emerald-700">
                  {formatPersen(kpi.persenPotensial)}
                </span>
              </div>
            </div>

            {/* Custom text legend with clear numbers and % */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-stone-700 font-medium">Potensial</span>
                </div>
                <div className="font-mono font-bold text-stone-900">
                  {kpi.potensial} <span className="text-[11px] text-stone-400 font-normal">({formatPersen(kpi.persenPotensial)})</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-stone-700 font-medium">Gugur Seleksi</span>
                </div>
                <div className="font-mono font-bold text-stone-900">
                  {kpi.tidakPotensial} <span className="text-[11px] text-stone-400 font-normal">
                    ({kpi.pelamar > 0 ? formatPersen((kpi.tidakPotensial / kpi.pelamar) * 100) : '0%'})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-stone-700 font-medium">Belum Diproses</span>
                </div>
                <div className="font-mono font-bold text-stone-900">
                  {kpi.pending} <span className="text-[11px] text-stone-400 font-normal">
                    ({kpi.pelamar > 0 ? formatPersen((kpi.pending / kpi.pelamar) * 100) : '0%'})
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
