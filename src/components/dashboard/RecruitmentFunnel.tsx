import React from 'react';
import { ArrowRight, XCircle, CheckCircle2, Clock, UserCheck, Users } from 'lucide-react';
import { CountUp } from './CountUp';

export interface FunnelStats {
  pending: number;
  reviewed: number;
  interviewHR: number;
  interviewUser: number;
  accepted: number;
  rejected: number;
}

interface RecruitmentFunnelProps {
  stats: FunnelStats;
}

interface Stage {
  key: keyof FunnelStats;
  label: string;
  icon: React.ReactNode;
  palette: {
    bg: string;
    text: string;
    border: string;
    bar: string;
  };
}

const STAGES: Stage[] = [
  {
    key: 'pending',
    label: 'Pending',
    icon: <Clock className="h-3.5 w-3.5" />,
    palette: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      bar: 'bg-amber-500',
    },
  },
  {
    key: 'reviewed',
    label: 'Direview',
    icon: <UserCheck className="h-3.5 w-3.5" />,
    palette: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      bar: 'bg-indigo-500',
    },
  },
  {
    key: 'interviewHR',
    label: 'Wawancara HR',
    icon: <Users className="h-3.5 w-3.5" />,
    palette: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      bar: 'bg-purple-500',
    },
  },
  {
    key: 'interviewUser',
    label: 'Wawancara User',
    icon: <Users className="h-3.5 w-3.5" />,
    palette: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      bar: 'bg-sky-500',
    },
  },
  {
    key: 'accepted',
    label: 'Diterima',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    palette: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      bar: 'bg-emerald-500',
    },
  },
];

function conversionTone(pct: number): string {
  if (pct >= 60) return 'text-emerald-600';
  if (pct >= 30) return 'text-amber-600';
  return 'text-rose-600';
}

export const RecruitmentFunnel: React.FC<RecruitmentFunnelProps> = ({ stats }) => {
  const counts = STAGES.map(s => stats[s.key]);
  const top = Math.max(...counts, 1);
  const allZero = counts.every(c => c === 0);

  if (allZero) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-xs space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 tracking-tight">Corong Rekrutmen</h3>
            <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
              Alur konversi pelamar dari pengajuan hingga diterima
            </p>
          </div>
          <span className="text-[10px] bg-stone-100 text-stone-500 font-extrabold px-2 py-0.5 rounded-md uppercase">
            Kosong
          </span>
        </div>
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
          <p className="text-xs text-stone-500 font-bold">Belum ada aktivitas rekrutmen pada filter saat ini.</p>
          <p className="text-[10px] text-stone-400 font-medium">Data akan muncul setelah pelamar pertama dikirimkan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-sm font-extrabold text-stone-900 tracking-tight">Corong Rekrutmen</h3>
          <p className="text-[10px] text-stone-400 font-semibold leading-none mt-1">
            Alur konversi pelamar dari pengajuan hingga diterima
          </p>
        </div>
        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-2 py-0.5 rounded-md uppercase">
          {counts[0]} masuk
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
        {STAGES.map((stage, idx) => {
          const value = counts[idx];
          const widthPct = Math.max((value / top) * 100, 8);
          const prevValue = idx === 0 ? null : counts[idx - 1];
          const conversion = idx === 0 || !prevValue
            ? null
            : prevValue === 0
              ? 100
              : Math.round((value / prevValue) * 100);

          return (
            <React.Fragment key={stage.key}>
              <div className={`p-4 rounded-xl border ${stage.palette.border} ${stage.palette.bg} flex flex-col justify-between min-h-[110px]`}>
                <div className={`flex items-center gap-1.5 ${stage.palette.text}`}>
                  {stage.icon}
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    {stage.label}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="font-serif font-black text-2xl text-stone-900 tracking-tight leading-none">
                    <CountUp value={value} />
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.palette.bar} rounded-full transition-all duration-700`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              </div>
              {idx < STAGES.length - 1 && conversion !== null && (
                <div className="hidden md:flex flex-col items-center justify-center text-stone-400 self-center">
                  <ArrowRight className="h-4 w-4" />
                  <span className={`text-[10px] font-extrabold mt-1 ${conversionTone(conversion)}`}>
                    {conversion}%
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {stats.rejected > 0 && (
        <div className="pt-3 border-t border-stone-100 flex items-center gap-3 text-xs">
          <div className="h-px flex-1 border-t border-dashed border-stone-300" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
            <XCircle className="h-3.5 w-3.5" />
            <span className="font-extrabold">
              <CountUp value={stats.rejected} /> ditolak
            </span>
            <span className="text-rose-500 font-bold">·</span>
            <span className="text-rose-600 font-bold">
              {counts[0] === 0 ? 0 : Math.round((stats.rejected / counts[0]) * 100)}% dari total
            </span>
          </div>
          <div className="h-px flex-1 border-t border-dashed border-stone-300" />
        </div>
      )}
    </div>
  );
};
