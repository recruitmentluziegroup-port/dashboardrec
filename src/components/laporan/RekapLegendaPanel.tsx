import React from 'react';
import { BookOpen, CheckCircle, AlertTriangle, XCircle, HelpCircle, Clock } from 'lucide-react';
import { LaporanLegendaItem } from '../../types';

interface RekapLegendaPanelProps {
  legenda: LaporanLegendaItem[];
}

function getStatusStyle(status: string) {
  const s = status.toLowerCase();
  if (s.includes('sesuai') && !s.includes('kurang') && !s.includes('tidak')) {
    return {
      border: 'border-green-200',
      bg: 'bg-green-50/70',
      badgeBg: 'bg-green-100 text-editorial-green',
      icon: CheckCircle,
      iconColor: 'text-editorial-green',
    };
  }
  if (s.includes('kurang')) {
    return {
      border: 'border-amber-200',
      bg: 'bg-amber-50/70',
      badgeBg: 'bg-amber-100 text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-700',
    };
  }
  if (s.includes('tidak') && s.includes('sesuai')) {
    return {
      border: 'border-red-200',
      bg: 'bg-red-50/70',
      badgeBg: 'bg-red-100 text-editorial-red',
      icon: XCircle,
      iconColor: 'text-editorial-red',
    };
  }
  if (s.includes('diverifikasi')) {
    return {
      border: 'border-slate-200',
      bg: 'bg-slate-50/80',
      badgeBg: 'bg-slate-200 text-slate-700',
      icon: HelpCircle,
      iconColor: 'text-slate-600',
    };
  }
  // Default / Belum dinilai
  return {
    border: 'border-stone-200',
    bg: 'bg-stone-50/80',
    badgeBg: 'bg-stone-200 text-stone-700',
    icon: Clock,
    iconColor: 'text-stone-500',
  };
}

export const RekapLegendaPanel: React.FC<RekapLegendaPanelProps> = ({ legenda }) => {
  if (!legenda || legenda.length === 0) return null;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-editorial-border shadow-xs berkas-stripe space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-serif font-black text-sm text-stone-900 tracking-tight">
            Arti Status Penilaian CV
          </h3>
        </div>
        <span className="text-[10px] text-stone-400 font-medium">
          Dinamis dari Google Sheet (Tab Rekap Harian sel K2:L6)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {legenda.map((leg, idx) => {
          const style = getStatusStyle(leg.status);
          const IconComponent = style.icon;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border ${style.border} ${style.bg} space-y-2 transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${style.badgeBg}`}>
                  <IconComponent className="h-3 w-3 shrink-0" />
                  <span>{leg.status}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  #{idx + 1}
                </span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-normal">
                {leg.keterangan}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
