/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatusLookupPage
 * ----------------
 * Public, no-auth candidate self-service page at /lacak.
 * Candidate provides their APP-XXXXXXXX ID + last 4 digits of KTP
 * and we look up the status of their application.
 *
 * Hits:  GET /api/status?id=APP-XXXXXXXX&last4=1234
 * Returns: { data: { status, jabatanDituju, submissionDate, lastUpdated } }
 *
 * The bento card, gradient background, and decorations are intentionally
 * a 1:1 visual match for src/App.tsx → ApplicationSuccess / RoleSelectionPage.
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileSearch,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Hourglass,
  ArrowLeft,
  UserCheck,
  Users,
} from 'lucide-react';
import type { ApplicationStatus, StatusRecord, StatusResponse } from '../types';

// -----------------------------------------------------------------
// Local types
// -----------------------------------------------------------------
type LookupPhase = 'idle' | 'loading' | 'success' | 'error';

// -----------------------------------------------------------------
// Per-status visual + copy mapping
// -----------------------------------------------------------------
const STATUS_META: Record<
  ApplicationStatus,
  {
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    bg: string;
    border: string;
    text: string;
    iconWrap: string;
    iconColor: string;
    description: string;
  }
> = {
  Pending: {
    label: 'Belum Direview',
    Icon: Hourglass,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconWrap: 'bg-amber-100',
    iconColor: 'text-amber-600',
    description:
      'Lamaran Anda telah kami terima dan sedang menunggu giliran untuk ditinjau oleh tim rekrutmen.',
  },
  Reviewed: {
    label: 'Sedang Ditinjau',
    Icon: Clock,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconWrap: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description:
      'Tim HRD sedang menelaah kelengkapan dan kecocokan berkas Anda dengan posisi yang dilamar.',
  },
  Accepted: {
    label: 'Diterima',
    Icon: CheckCircle2,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    iconWrap: 'bg-green-100',
    iconColor: 'text-green-600',
    description:
      'Selamat! Anda lolos tahap seleksi berkas. Tim HRD akan segera menghubungi Anda untuk tahapan rekrutmen selanjutnya.',
  },
  Rejected: {
    label: 'Tidak Lolos',
    Icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconWrap: 'bg-red-100',
    iconColor: 'text-red-600',
    description:
      'Mohon maaf, pada kesempatan ini kami belum dapat meloloskan Anda. Kami akan menyimpan profil Anda untuk peluang lain di masa depan.',
  },
  'Interview HR': {
    label: 'Wawancara HR',
    Icon: UserCheck,
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    iconWrap: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description:
      'Selamat! Anda lolos ke tahap wawancara dengan tim HR. Tim rekrutmen akan menghubungi Anda untuk penjadwalan wawancara.',
  },
  'Interview User': {
    label: 'Wawancara User',
    Icon: Users,
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    iconWrap: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    description:
      'Anda lolos ke tahap wawancara dengan calon atasan/team lead. Tim akan menghubungi Anda untuk penjadwalan.',
  },
};

const APP_ID_REGEX = /^APP-[A-Z0-9]{8}$/;

function formatDateId(iso: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const StatusLookupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [appId, setAppId] = useState<string>(searchParams.get('id') ?? '');
  const [last4, setLast4] = useState<string>('');
  const [phase, setPhase] = useState<LookupPhase>('idle');
  const [record, setRecord] = useState<StatusRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedId = appId.trim().toUpperCase();
  const idValid = APP_ID_REGEX.test(normalizedId);
  const last4Valid = /^\d{4}$/.test(last4);
  const canSubmit = idValid && last4Valid && phase !== 'loading';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setPhase('loading');
    setErrorMessage(null);
    setRecord(null);

    try {
      const url = `/api/status?id=${encodeURIComponent(normalizedId)}&last4=${encodeURIComponent(last4)}`;
      const res = await fetch(url, { method: 'GET' });
      const json = (await res.json().catch(() => ({}))) as StatusResponse;

      if (!res.ok || !json.data) {
        setPhase('error');
        setErrorMessage(
          json.error ??
            'Data lamaran tidak ditemukan atau verifikasi tidak cocok. Periksa kembali Nomor Berkas dan 4 digit terakhir KTP Anda.',
        );
        return;
      }
      setRecord(json.data);
      setPhase('success');
    } catch {
      setPhase('error');
      setErrorMessage(
        'Kegagalan sistem saat menghubungi server. Silakan coba lagi beberapa saat.',
      );
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setErrorMessage(null);
    setRecord(null);
    setLast4('');
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-tr from-brand-900 via-brand-600 to-amber-500 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div
          className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-linear-to-br from-amber-400/20 to-orange-500/20 opacity-45 blur-3xl animate-pulse"
          style={{ animationDuration: '7s' }}
        />
        <div
          className="absolute -bottom-[15%] -right-[15%] w-[65%] h-[65%] rounded-full bg-linear-to-br from-brand-700/25 to-brand-950/45 opacity-45 blur-3xl animate-pulse"
          style={{ animationDuration: '10s' }}
        />
        <div className="absolute top-[30%] left-[20%] w-[45%] h-[45%] rounded-full bg-orange-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-15 mix-blend-overlay"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none flex items-end justify-center">
        <svg viewBox="0 0 100 100" className="w-[80vw] max-w-(--size-xs) h-auto">
          <path d="M50,0 Q60,25 50,50 Q40,75 50,100" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,20 Q70,10 75,25 Q55,30 50,20" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,40 Q30,30 25,45 Q45,50 50,40" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <path d="M50,60 Q70,50 75,65 Q55,70 50,60" fill="none" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      </div>

      <div className="w-full max-w-lg bg-white rounded-[--radius-bento] border border-bento-sand shadow-[--shadow-bento] overflow-hidden p-8 sm:p-10 text-center space-y-6 relative animate-bounce-in before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-amber-400 before:via-brand-500 before:to-brand-700">
        <div className="space-y-2">
          <div className="inline-flex p-4 bg-brand-50 text-brand-600 border border-bento-sand rounded-2xl">
            <FileSearch className="h-10 w-10" />
          </div>
          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest block">
            Portal Pelamar
          </span>
          <h1 className="font-serif font-black text-3xl tracking-tight text-editorial-navy">
            Lacak Status Lamaran
          </h1>
          <p className="text-sm text-stone-500 font-medium leading-relaxed px-2">
            Cek perkembangan berkas administrasi Anda yang telah disubmit ke tim rekrutmen Luzie Group.
          </p>
        </div>

        {phase === 'idle' && (
          <>
            <div className="text-left bg-bento-cream border border-bento-sand rounded-[--radius-bento] p-4 text-xs text-stone-600 font-medium leading-relaxed">
              Masukkan nomor berkas dan 4 digit terakhir KTP yang Anda gunakan saat melamar untuk melihat status terkini.
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="lacak-appid" className="block text-xs font-bold text-stone-600">
                  Nomor Berkas
                </label>
                <input
                  id="lacak-appid"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="APP-XXXXXXXX"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  maxLength={12}
                  className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-sm text-stone-800 font-mono font-medium outline-hidden transition-all duration-200"
                />
                <p className="text-[10px] text-stone-400 font-medium">
                  Format: <span className="font-mono">APP-</span> diikuti 8 karakter alfanumerik huruf besar / angka.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lacak-last4" className="block text-xs font-bold text-stone-600">
                  4 Digit Terakhir KTP
                </label>
                <input
                  id="lacak-last4"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="••••"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(-4))}
                  maxLength={16}
                  className="w-full bg-bento-cream border border-bento-sand focus:border-brand-400 focus:ring-2 focus:ring-brand-100 p-3 rounded-xl text-base text-stone-800 font-mono font-medium outline-hidden transition-all duration-200 tracking-[0.5em] text-center"
                />
                <p className="text-[10px] text-stone-400 font-medium">
                  Ketik atau tempel 4 digit terakhir KTP. Jika menempel KTP lengkap, kami otomatis mengambil 4 digit terakhir.
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:shadow-none text-white font-bold text-sm rounded-[--radius-bento] py-3.5 shadow-[--shadow-bento] transition-all cursor-pointer flex items-center justify-center space-x-2 mt-2"
              >
                <Search className="h-4 w-4" />
                <span>Lacak Status</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full text-[11px] font-bold text-stone-500 hover:text-stone-700 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali ke Halaman Utama</span>
              </button>
            </form>
          </>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <div className="h-8 w-8 text-brand-500 border-4 border-brand-200 border-t-brand-500 animate-spin rounded-full" />
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              Memeriksa database rekrutmen...
            </span>
          </div>
        )}

        {phase === 'success' && record && (
          <SuccessView record={record} onReset={handleReset} />
        )}

        {phase === 'error' && (
          <ErrorView
            message={
              errorMessage ??
                'Data lamaran tidak ditemukan atau verifikasi tidak cocok. Periksa kembali Nomor Berkas dan 4 digit terakhir KTP Anda.'
            }
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

const SuccessView: React.FC<{ record: StatusRecord; onReset: () => void }> = ({
  record,
  onReset,
}) => {
  const navigate = useNavigate();
  const meta = STATUS_META[record.status];

  const submitMs = new Date(record.submissionDate).getTime();
  const lastMs = new Date(record.lastUpdated).getTime();
  const showLastUpdated =
    Number.isFinite(submitMs) && Number.isFinite(lastMs) && lastMs - submitMs > 1000;

  return (
    <>
      <div className={`${meta.bg} ${meta.border} border-2 rounded-[--radius-bento] p-6 space-y-3`}>
        <div className={`inline-flex p-3 ${meta.iconWrap} ${meta.iconColor} rounded-2xl`}>
          <meta.Icon className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <span className={`block text-[10px] font-extrabold uppercase tracking-widest ${meta.text}`}>
            Status Lamaran
          </span>
          <h2 className={`font-serif font-black text-2xl tracking-tight ${meta.text}`}>
            {meta.label}
          </h2>
          <p className="text-xs text-stone-600 font-medium leading-relaxed px-2 pt-1">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="text-left bg-bento-cream border border-bento-sand rounded-[--radius-bento] p-5 space-y-3 text-sm font-medium">
        <DetailRow label="Jabatan yang dilamar" value={record.jabatanDituju || '—'} />
        <DetailRow label="Tanggal submit" value={formatDateId(record.submissionDate)} />
        {showLastUpdated && (
          <DetailRow label="Terakhir diperbarui" value={formatDateId(record.lastUpdated)} />
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onReset}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-[--radius-bento] py-3.5 shadow-[--shadow-bento] transition-all cursor-pointer flex items-center justify-center space-x-2"
        >
          <Search className="h-4 w-4" />
          <span>Lacak ID Lain</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full border border-bento-sand hover:bg-bento-cream text-stone-600 hover:text-stone-800 font-bold text-sm rounded-[--radius-bento] py-3 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Halaman Utama</span>
        </button>
      </div>
    </>
  );
};

const ErrorView: React.FC<{ message: string; onReset: () => void }> = ({ message, onReset }) => {
  const navigate = useNavigate();

  return (
    <>
      <div className="bg-red-50 border-2 border-red-200 rounded-[--radius-bento] p-6 space-y-3">
        <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-2xl">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-red-700">
            Verifikasi Gagal
          </span>
          <p className="text-xs text-stone-700 font-medium leading-relaxed px-2">
            {message}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onReset}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-[--radius-bento] py-3.5 shadow-[--shadow-bento] transition-all cursor-pointer flex items-center justify-center space-x-2"
        >
          <Search className="h-4 w-4" />
          <span>Coba Lagi</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full border border-bento-sand hover:bg-bento-cream text-stone-600 hover:text-stone-800 font-bold text-sm rounded-[--radius-bento] py-3 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Halaman Utama</span>
        </button>
      </div>
    </>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-4 text-xs">
    <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest shrink-0">
      {label}
    </span>
    <span className="text-stone-800 font-semibold text-right break-words">{value}</span>
  </div>
);
