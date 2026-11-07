import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, Layers, Activity } from 'lucide-react';
import { LaporanRekapItem } from '../../types';

interface RekapTrendChartProps {
  rows: LaporanRekapItem[];
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatShortDate(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return isoDate;
  const parts = isoDate.split('-');
  const day = parts[2];
  const mIndex = parseInt(parts[1], 10) - 1;
  const monthName = MONTH_NAMES_SHORT[mIndex] || parts[1];
  return `${day} ${monthName}`;
}

function formatFullIndoDate(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const d = new Date(`${isoDate}T00:00:00`);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export const RekapTrendChart: React.FC<RekapTrendChartProps> = ({ rows }) => {
  const [viewMode, setViewMode] = useState<'total' | 'positions'>('total');

  // Ensure chronological order for time-series left-to-right
  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .map((r) => ({
        tanggal: r.tanggal,
        shortDate: formatShortDate(r.tanggal),
        fullDate: formatFullIndoDate(r.tanggal),
        total: r.total || 0,
        contentCreator: r.contentCreator || 0,
        spvMarketing: r.spvMarketing || 0,
        adminInvestasi: r.adminInvestasi || 0,
        dinilai: r.dinilai,
      }));
  }, [rows]);

  const maxTotal = useMemo(() => {
    return Math.max(5, ...chartData.map((d) => d.total));
  }, [chartData]);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">
              Tren Lamaran Harian
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {chartData.length} hari
            </span>
          </div>
          <p className="text-[11px] text-stone-500 font-medium mt-0.5">
            Volume email lamaran yang masuk setiap hari
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('total')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'total'
                ? 'bg-white text-brand-700 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="h-3 w-3" />
            <span>Total Lamaran</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('positions')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'positions'
                ? 'bg-white text-brand-700 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>Per Posisi (3 Seri)</span>
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-72 w-full pt-2" role="img" aria-label="Grafik tren lamaran harian">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-stone-400 font-bold italic">
            Tidak ada data dalam rentang tanggal yang dipilih.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'total' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C2410C" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#C2410C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="shortDate"
                  fontSize={11}
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, Math.ceil(maxTotal * 1.15)]}
                  fontSize={11}
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-stone-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-stone-800">
                        <div className="font-bold text-stone-300 pb-1 border-b border-stone-800">
                          {p.fullDate}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-stone-400">Total Lamaran:</span>
                          <span className="font-extrabold text-amber-400 text-sm">{p.total}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 pt-1 space-y-0.5 border-t border-stone-800">
                          <div>• Content Creator: <strong className="text-white">{p.contentCreator}</strong></div>
                          <div>• SPV Marketing: <strong className="text-white">{p.spvMarketing}</strong></div>
                          <div>• Admin Investasi: <strong className="text-white">{p.adminInvestasi}</strong></div>
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#C2410C"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#totalTrendGradient)"
                  name="Total Lamaran"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="shortDate"
                  fontSize={11}
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={11}
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-stone-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-2 border border-stone-800 min-w-44">
                        <div className="font-bold text-stone-300 pb-1 border-b border-stone-800">
                          {p.fullDate}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-blue-400">
                            <span>Content Creator:</span>
                            <span className="font-black">{p.contentCreator}</span>
                          </div>
                          <div className="flex items-center justify-between text-purple-400">
                            <span>SPV Marketing:</span>
                            <span className="font-black">{p.spvMarketing}</span>
                          </div>
                          <div className="flex items-center justify-between text-teal-400">
                            <span>Admin Investasi:</span>
                            <span className="font-black">{p.adminInvestasi}</span>
                          </div>
                          <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between text-stone-300 font-bold">
                            <span>Total:</span>
                            <span className="text-amber-400 font-black">{p.total}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => <span className="font-medium text-stone-700">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="contentCreator"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  name="Content Creator"
                />
                <Line
                  type="monotone"
                  dataKey="spvMarketing"
                  stroke="#9333EA"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  name="SPV Marketing Biro Umrah"
                />
                <Line
                  type="monotone"
                  dataKey="adminInvestasi"
                  stroke="#0D9488"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  name="Admin Investasi"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
