import React, { useMemo } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface GreetingBarProps {
  adminEmail: string;
  lastSyncAt: Date | null;
}

function pickGreeting(hour: number): string {
  if (hour < 12) return 'Selamat pagi';
  if (hour < 18) return 'Selamat siang';
  return 'Selamat malam';
}

function formatIndonesianDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

function formatTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

function nameFromEmail(email: string): string {
  if (!email) return 'Admin';
  const local = email.split('@')[0] || '';
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'Admin';
  return cleaned
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function syncStateFromLastSync(lastSyncAt: Date | null): {
  label: string;
  tone: 'ok' | 'warn' | 'err' | 'idle';
  icon: React.ReactNode;
} {
  if (!lastSyncAt) {
    return {
      label: 'Belum sinkron',
      tone: 'idle',
      icon: <RefreshCw className="h-3 w-3" />,
    };
  }
  const ageMs = Date.now() - lastSyncAt.getTime();
  const ageMin = ageMs / 60000;
  if (ageMin < 5) {
    return {
      label: `Sheets tersinkron · ${formatTime(lastSyncAt)}`,
      tone: 'ok',
      icon: <Cloud className="h-3 w-3" />,
    };
  }
  if (ageMin < 15) {
    return {
      label: `Sinkron ${Math.round(ageMin)} menit lalu`,
      tone: 'warn',
      icon: <Cloud className="h-3 w-3" />,
    };
  }
  return {
    label: `Sinkron ${Math.round(ageMin)} menit lalu — periksa koneksi`,
    tone: 'err',
    icon: <CloudOff className="h-3 w-3" />,
  };
}

export const GreetingBar: React.FC<GreetingBarProps> = ({ adminEmail, lastSyncAt }) => {
  const now = useMemo(() => new Date(), []);
  const greeting = pickGreeting(now.getHours());
  const fullName = nameFromEmail(adminEmail);
  const dateStr = formatIndonesianDate(now);
  const sync = syncStateFromLastSync(lastSyncAt);

  const toneClass = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    err: 'bg-rose-50 text-rose-700 border-rose-200',
    idle: 'bg-stone-100 text-stone-500 border-stone-200',
  }[sync.tone];

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-2">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">
          Recruitment Dashboard
        </p>
        <h1 className="font-serif font-black text-3xl sm:text-4xl text-stone-900 tracking-tight leading-tight mt-1">
          {greeting}, {fullName}.
        </h1>
        <p className="text-xs text-stone-500 mt-1.5 font-medium">{dateStr}</p>
      </div>

      <div
        className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${toneClass}`}
        title="Status sinkronisasi Google Sheets"
      >
        {sync.icon}
        <span>{sync.label}</span>
      </div>
    </div>
  );
};
