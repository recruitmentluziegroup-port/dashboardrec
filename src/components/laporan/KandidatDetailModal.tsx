import React, { useState, useMemo } from 'react';
import {
  Mail,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Briefcase,
  AlertCircle,
  Repeat,
  FileText,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AdminModal } from '../dashboard/AdminModal';
import { LaporanKandidatItem } from '../../types';

interface KandidatDetailModalProps {
  kandidat: LaporanKandidatItem | null;
  onClose: () => void;
  allKandidat: LaporanKandidatItem[];
  onSelectKandidat?: (k: LaporanKandidatItem) => void;
}

function formatIndoFullDate(isoDate: string): string {
  if (!isoDate) return '—';
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

function getStatusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('sesuai') && !s.includes('kurang') && !s.includes('tidak')) {
    return {
      label: status,
      className: 'bg-green-50 text-editorial-green border border-green-200',
    };
  }
  if (s.includes('kurang')) {
    return {
      label: status,
      className: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  if (s.includes('tidak') && s.includes('sesuai')) {
    return {
      label: status,
      className: 'bg-red-50 text-editorial-red border border-red-200',
    };
  }
  if (s.includes('diverifikasi')) {
    return {
      label: status,
      className: 'bg-slate-100 text-slate-700 border border-slate-300',
    };
  }
  return {
    label: status || 'Belum dinilai',
    className: 'bg-stone-100 text-stone-600 border border-stone-200',
  };
}

export const KandidatDetailModal: React.FC<KandidatDetailModalProps> = ({
  kandidat,
  onClose,
  allKandidat,
  onSelectKandidat,
}) => {
  const [copied, setCopied] = useState(false);

  // Duplicate email detection across the entire dataset
  const duplicateApplications = useMemo(() => {
    if (!kandidat || !kandidat.email) return [];
    const normalizedTarget = kandidat.email.trim().toLowerCase();
    return allKandidat.filter((k) => k.email && k.email.trim().toLowerCase() === normalizedTarget);
  }, [kandidat, allKandidat]);

  if (!kandidat) return null;

  const isNameMissing =
    !kandidat.nama ||
    kandidat.nama.toLowerCase().includes('tidak tercantum') ||
    kandidat.nama.toLowerCase().includes('(nama tidak tercantum');

  const statusBadge = getStatusBadge(kandidat.status);

  const handleCopyEmail = async () => {
    if (!kandidat.email) return;
    try {
      await navigator.clipboard.writeText(kandidat.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API not available
      const textarea = document.createElement('textarea');
      textarea.value = kandidat.email;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AdminModal
      open={Boolean(kandidat)}
      onClose={onClose}
      title="Detail Berkas Kandidat"
      subtitle={`ID: ${kandidat.id}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>

          {kandidat.linkEmail ? (
            <a
              href={kandidat.linkEmail}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Buka Email di Tab Baru</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-400 bg-stone-100 rounded-xl cursor-not-allowed"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Link Email Tidak Tersedia</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Header Block: Name, Position, Status */}
        <div className="p-4 rounded-xl bg-stone-50 border border-editorial-border space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Nama Kandidat
              </span>
              <h2
                className={`font-serif font-black text-lg ${
                  isNameMissing ? 'text-stone-400 italic font-medium' : 'text-stone-900'
                }`}
              >
                {kandidat.nama || '(Nama tidak tercantum di subjek)'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
              {kandidat.lamaranUlang && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Repeat className="h-3 w-3 text-amber-700" />
                  <span>Lamaran Ulang</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200/60 text-xs">
            <div className="flex items-center gap-2 text-stone-700">
              <Briefcase className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span>Posisi Dilamar:</span>
              <strong className="text-stone-900 font-bold">{kandidat.posisi}</strong>
            </div>
            <div className="flex items-center gap-2 text-stone-700">
              <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span>Tanggal:</span>
              <span className="font-semibold text-stone-900">
                {formatIndoFullDate(kandidat.tanggal)}
              </span>
            </div>
            {kandidat.rekomendasiPosisi && (
              <div className="col-span-1 sm:col-span-2 flex items-center gap-2 p-2.5 bg-brand-50 border border-brand-200 rounded-lg text-xs">
                <Sparkles className="h-4 w-4 text-brand-600 shrink-0" />
                <span className="text-brand-800 font-medium">Rekomendasi Posisi:</span>
                <strong className="text-brand-950 font-bold text-xs sm:text-sm">{kandidat.rekomendasiPosisi}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Email Section with Copy Action */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Email Pengirim
          </label>
          <div className="flex items-center justify-between p-3 bg-white border border-editorial-border rounded-xl">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <Mail className="h-4 w-4 text-brand-700 shrink-0" />
              <span className="font-mono text-xs text-stone-800 truncate select-all">
                {kandidat.email || '—'}
              </span>
            </div>
            {kandidat.email && (
              <button
                type="button"
                onClick={handleCopyEmail}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-green-100 text-editorial-green border border-green-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Email'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Alasan / Bukti Evaluasi CV */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-stone-500" />
            <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Alasan / Bukti Kualifikasi CV
            </label>
          </div>
          <div className="p-4 bg-stone-50/70 border border-editorial-border rounded-xl text-xs text-stone-800 leading-relaxed font-normal whitespace-pre-wrap">
            {kandidat.alasan ? (
              kandidat.alasan
            ) : (
              <span className="text-stone-400 italic">
                - Tidak ada catatan alasan / bukti kualifikasi yang dicantumkan.
              </span>
            )}
          </div>
        </div>

        {/* Deteksi Pelamar Ganda (Multiple Applications by same email) */}
        {duplicateApplications.length > 1 && (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  Pelamar Ganda Terdeteksi
                </h4>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Email ini tercatat mengirimkan total{' '}
                  <strong className="font-extrabold">{duplicateApplications.length} berkas lamaran</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pl-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Riwayat Pengiriman Email:
              </span>
              <div className="divide-y divide-amber-200/60 rounded-lg bg-white/70 border border-amber-200 overflow-hidden text-[11px]">
                {duplicateApplications.map((dup) => {
                  const isCurrent = dup.id === kandidat.id;
                  const dupBadge = getStatusBadge(dup.status);

                  return (
                    <div
                      key={dup.id}
                      onClick={() => {
                        if (!isCurrent && onSelectKandidat) {
                          onSelectKandidat(dup);
                        }
                      }}
                      className={`p-2 flex items-center justify-between gap-2 transition-colors ${
                        isCurrent
                          ? 'bg-amber-100/60 font-bold'
                          : onSelectKandidat
                          ? 'hover:bg-amber-100/30 cursor-pointer'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="h-3 w-3 text-stone-400 shrink-0" />
                        <span className="font-mono text-stone-800">{dup.tanggal}</span>
                        <span className="text-stone-500">•</span>
                        <span className="text-stone-700 truncate">{dup.posisi}</span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-700 text-white font-extrabold">
                            Sedang Dilihat
                          </span>
                        )}
                        {dup.lamaranUlang && (
                          <span className="text-[9px] px-1 rounded bg-amber-200 text-amber-900 font-bold">
                            Ulang
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${dupBadge.className}`}>
                        {dup.status || 'Belum dinilai'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Link Email External Preview */}
        {kandidat.linkEmail && (
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-brand-700 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-stone-800 block">Tautan Email Gmail</span>
                <span className="text-[10px] text-stone-400 font-mono truncate block">
                  {kandidat.linkEmail}
                </span>
              </div>
            </div>
            <a
              href={kandidat.linkEmail}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 rounded-lg transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Buka</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </AdminModal>
  );
};
