import React, { useMemo, useState } from 'react';
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
import { PieChart as PieIcon, BarChart3, Info } from 'lucide-react';
import { LaporanRekapItem } from '../../types';

interface RekapKomposisiChartProps {
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

export const RekapKomposisiChart: React.FC<RekapKomposisiChartProps> = ({ rows }) => {
  const [chartType, setChartType] = useState<'stacked' | 'donut'>('stacked');

  // Summary aggregation
  const totals = useMemo(() => {
    let sesuai = 0;
    let kurangSesuai = 0;
    let tidakSesuai = 0;
    let tidakDiverifikasi = 0;
    let belumDinilai = 0;
    let sudahDinilaiCount = 0;

    rows.forEach((r) => {
      if (r.dinilai) {
        sesuai += r.sesuai || 0;
        kurangSesuai += r.kurangSesuai || 0;
        tidakSesuai += r.tidakSesuai || 0;
        tidakDiverifikasi += r.tidakDiverifikasi || 0;
        sudahDinilaiCount += r.total || 0;
      } else {
        belumDinilai += r.total || 0;
      }
    });

    const totalEvaluated = sesuai + kurangSesuai + tidakSesuai + tidakDiverifikasi;

    return {
      sesuai,
      kurangSesuai,
      tidakSesuai,
      tidakDiverifikasi,
      belumDinilai,
      totalEvaluated,
      sudahDinilaiCount,
    };
  }, [rows]);

  // Stacked Bar Data (chronological)
  const barData = useMemo(() => {
    return [...rows]
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .map((r) => ({
        tanggal: r.tanggal,
        shortDate: formatShortDate(r.tanggal),
        fullDate: formatFullIndoDate(r.tanggal),
        total: r.total || 0,
        dinilai: r.dinilai,
        // When evaluated, show the 4 breakdown buckets; if not evaluated, put in 'belumDinilai' bucket
        sesuai: r.dinilai ? r.sesuai || 0 : 0,
        kurangSesuai: r.dinilai ? r.kurangSesuai || 0 : 0,
        tidakSesuai: r.dinilai ? r.tidakSesuai || 0 : 0,
        tidakDiverifikasi: r.dinilai ? r.tidakDiverifikasi || 0 : 0,
        belumDinilai: !r.dinilai ? r.total || 0 : 0,
      }));
  }, [rows]);

  // Donut chart data (evaluated only, with separate note)
  const pieData = useMemo(() => {
    const list = [
      { name: 'Sesuai', value: totals.sesuai, color: '#15803D' },
      { name: 'Kurang Sesuai', value: totals.kurangSesuai, color: '#D97706' },
      { name: 'Tidak Sesuai', value: totals.tidakSesuai, color: '#DC2626' },
      { name: 'Tidak Diverifikasi', value: totals.tidakDiverifikasi, color: '#64748B' },
    ];
    return list.filter((item) => item.value > 0);
  }, [totals]);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-4">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">
              Komposisi Hasil Penilaian CV
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {totals.totalEvaluated} CV dinilai
            </span>
          </div>
          <p className="text-[11px] text-stone-500 font-medium mt-0.5">
            Distribusi kesesuaian kualifikasi kandidat dengan kriteria posisi
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start sm:self-center">
          <button
            type="button"
            onClick={() => setChartType('stacked')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              chartType === 'stacked'
                ? 'bg-white text-brand-700 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="h-3 w-3" />
            <span>Batang Bertumpuk</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              chartType === 'donut'
                ? 'bg-white text-brand-700 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PieIcon className="h-3 w-3" />
            <span>Donat Total</span>
          </button>
        </div>
      </div>

      {/* Status Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        <div className="p-2.5 rounded-xl bg-green-50/80 border border-green-200/80 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-green-900 uppercase">Sesuai</span>
            <span className="h-2 w-2 rounded-full bg-green-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-black text-lg text-editorial-green">{totals.sesuai}</span>
            <span className="text-[10px] font-semibold text-green-700">
              {totals.totalEvaluated > 0 ? `(${((totals.sesuai / totals.totalEvaluated) * 100).toFixed(1)}%)` : '—'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-900 uppercase">Kurang Sesuai</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-black text-lg text-amber-700">{totals.kurangSesuai}</span>
            <span className="text-[10px] font-semibold text-amber-700">
              {totals.totalEvaluated > 0 ? `(${((totals.kurangSesuai / totals.totalEvaluated) * 100).toFixed(1)}%)` : '—'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-red-50/80 border border-red-200/80 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-900 uppercase">Tidak Sesuai</span>
            <span className="h-2 w-2 rounded-full bg-red-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-black text-lg text-editorial-red">{totals.tidakSesuai}</span>
            <span className="text-[10px] font-semibold text-red-700">
              {totals.totalEvaluated > 0 ? `(${((totals.tidakSesuai / totals.totalEvaluated) * 100).toFixed(1)}%)` : '—'}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-800 uppercase">Tidak Diverifikasi</span>
            <span className="h-2 w-2 rounded-full bg-slate-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-black text-lg text-slate-700">{totals.tidakDiverifikasi}</span>
            <span className="text-[10px] font-semibold text-slate-600">
              {totals.totalEvaluated > 0 ? `(${((totals.tidakDiverifikasi / totals.totalEvaluated) * 100).toFixed(1)}%)` : '—'}
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-2.5 rounded-xl bg-stone-100/70 border border-stone-200 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-600 uppercase">Belum Dinilai</span>
            <span className="h-2 w-2 rounded-full bg-stone-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-black text-lg text-stone-700">{totals.belumDinilai}</span>
            <span className="text-[10px] font-semibold text-stone-500">
              (Sebelum 5 Okt)
            </span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-72 w-full pt-2" role="img" aria-label="Grafik komposisi penilaian CV">
        {barData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-stone-400 font-bold italic">
            Tidak ada data dalam rentang tanggal yang dipilih.
          </div>
        ) : chartType === 'stacked' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
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
                    <div className="bg-stone-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-2 border border-stone-800 min-w-48">
                      <div className="font-bold text-stone-300 pb-1 border-b border-stone-800">
                        {p.fullDate}
                      </div>
                      {p.dinilai ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-green-400">
                            <span>Sesuai:</span>
                            <span className="font-black">{p.sesuai}</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-400">
                            <span>Kurang Sesuai:</span>
                            <span className="font-black">{p.kurangSesuai}</span>
                          </div>
                          <div className="flex items-center justify-between text-red-400">
                            <span>Tidak Sesuai:</span>
                            <span className="font-black">{p.tidakSesuai}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span>Tidak Diverifikasi:</span>
                            <span className="font-black">{p.tidakDiverifikasi}</span>
                          </div>
                          <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between text-stone-300 font-bold">
                            <span>Total Hari Ini:</span>
                            <span className="text-amber-300 font-black">{p.total}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-stone-300">
                            <span>Total Lamaran:</span>
                            <span className="font-black">{p.total}</span>
                          </div>
                          <div className="text-[10px] text-amber-400 bg-amber-950/60 p-1.5 rounded border border-amber-800/60 mt-1">
                            Belum dinilai (sebelum penilaian CV dimulai).
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
                cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) => <span className="font-medium text-stone-700">{value}</span>}
              />
              <Bar dataKey="sesuai" name="Sesuai" stackId="a" fill="#15803D" radius={[0, 0, 0, 0]} />
              <Bar dataKey="kurangSesuai" name="Kurang Sesuai" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} />
              <Bar dataKey="tidakSesuai" name="Tidak Sesuai" stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} />
              <Bar dataKey="tidakDiverifikasi" name="Tidak Diverifikasi" stackId="a" fill="#64748B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="belumDinilai" name="Belum Dinilai (Sebelum 5 Okt)" stackId="a" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col md:flex-row items-center justify-center gap-6">
            {pieData.length === 0 ? (
              <div className="text-xs text-stone-400 font-bold italic">
                Belum ada data penilaian pada periode ini.
              </div>
            ) : (
              <>
                <div className="h-60 w-60 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const p = payload[0];
                          const pct = totals.totalEvaluated > 0
                            ? ((Number(p.value) / totals.totalEvaluated) * 100).toFixed(1)
                            : '0';
                          return (
                            <div className="bg-stone-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-stone-800">
                              <div className="font-bold">{p.name}</div>
                              <div className="text-stone-300">
                                {p.value} berkas ({pct}%)
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 max-w-sm">
                  <div className="text-xs font-bold text-stone-900">
                    Distribusi Persentase ({totals.totalEvaluated} CV telah dinilai)
                  </div>
                  <div className="space-y-1.5">
                    {pieData.map((item) => {
                      const pct = totals.totalEvaluated > 0
                        ? ((item.value / totals.totalEvaluated) * 100).toFixed(1)
                        : '0';
                      return (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-stone-700 font-medium">{item.name}</span>
                          </div>
                          <span className="font-bold text-stone-900">
                            {item.value} <span className="text-stone-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {totals.belumDinilai > 0 && (
                    <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-200">
                      * Ditambah <strong className="text-stone-800">{totals.belumDinilai} berkas</strong> berstatus Belum Dinilai (periode 1–4 Okt 2026).
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footnote clarification */}
      <div className="flex items-start gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-[11px] text-stone-600">
        <Info className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Catatan:</strong> Lamaran pada tanggal 1–4 Oktober 2026 berstatus <em>Belum dinilai</em> karena peninjauan kualifikasi CV dimulai terhitung sejak 5 Oktober 2026. Data kosong pada periode tersebut bukan berarti 0 penilaian.
        </p>
      </div>
    </div>
  );
};
