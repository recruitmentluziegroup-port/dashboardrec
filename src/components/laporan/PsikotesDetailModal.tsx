import React, { useMemo, useState } from 'react';
import {
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Copy,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { AdminModal } from '../dashboard/AdminModal';
import { LaporanPsikotesItem } from '../../types';

interface PsikotesDetailModalProps {
  item: LaporanPsikotesItem | null;
  onClose: () => void;
}

interface ParsedAspect {
  label: string;
  score: string | null;
}

function parseAspectList(raw: string): ParsedAspect[] {
  if (!raw) return [];
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const m = entry.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      if (m) {
        return { label: m[1].trim(), score: m[2].trim() };
      }
      return { label: entry, score: null };
    });
}

export function parsePsikotesCatatan(catatan: string): {
  indikasiUjiCoba: string;
  profilRingkas: string;
  kesimpulanTitle: string;
  kesimpulanBody: string;
  posisiRelevan: string[];
} {
  const raw = (catatan || '').trim();
  if (!raw) {
    return {
      indikasiUjiCoba: '',
      profilRingkas: '',
      kesimpulanTitle: '',
      kesimpulanBody: '',
      posisiRelevan: [],
    };
  }

  let rest = raw;
  let indikasiUjiCoba = '';
  const ujiMatch = rest.match(/^(Indikasi uji coba[^.]*\.)\s*/i);
  if (ujiMatch) {
    indikasiUjiCoba = ujiMatch[1].trim();
    rest = rest.slice(ujiMatch[0].length).trim();
  }

  let posisiRelevan: string[] = [];
  const relMatch = rest.match(/Posisi lain yang relevan:\s*([^.]*)\.?$/i);
  if (relMatch) {
    posisiRelevan = relMatch[1]
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    rest = rest.slice(0, relMatch.index).trim();
  }

  let kesimpulanTitle = '';
  let kesimpulanBody = '';
  const kesMatch = rest.match(/(Kesimpulan[^:]*):\s*([\s\S]*)$/i);
  if (kesMatch) {
    kesimpulanTitle = kesMatch[1].trim();
    kesimpulanBody = kesMatch[2].trim();
    rest = rest.slice(0, kesMatch.index).trim();
  }

  return {
    indikasiUjiCoba,
    profilRingkas: rest,
    kesimpulanTitle,
    kesimpulanBody,
    posisiRelevan,
  };
}

function formatSignedScore(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

const DISC_DESCRIPTIONS: Record<'D' | 'I' | 'S' | 'C', { title: string; desc: string }> = {
  D: {
    title: 'D — Dominance',
    desc: 'Tegas, berorientasi hasil & target, cepat mengambil keputusan',
  },
  I: {
    title: 'I — Influence',
    desc: 'Sosial, persuasif, antusias, mudah membangun kedekatan',
  },
  S: {
    title: 'S — Steadiness',
    desc: 'Stabil, tekun, sabar, konsisten menjaga harmoni tim',
  },
  C: {
    title: 'C — Conscientiousness',
    desc: 'Teliti, analitis, patuh aturan & menjaga mutu kerja',
  },
};

export const PsikotesDetailModal: React.FC<PsikotesDetailModalProps> = ({ item, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const parsedCatatan = useMemo(() => parsePsikotesCatatan(item?.catatan || ''), [item?.catatan]);
  const tertinggiList = useMemo(() => parseAspectList(item?.aspekTertinggi || ''), [item?.aspekTertinggi]);
  const terendahList = useMemo(() => parseAspectList(item?.aspekTerendah || ''), [item?.aspekTerendah]);

  if (!item) return null;

  const discRows: Array<{ key: 'D' | 'I' | 'S' | 'C'; val: number }> = [
    { key: 'D', val: item.skorD },
    { key: 'I', val: item.skorI },
    { key: 'S', val: item.skorS },
    { key: 'C', val: item.skorC },
  ];
  const maxDisc = Math.max(item.skorD, item.skorI, item.skorS, item.skorC);

  const handleCopyEmail = async () => {
    if (!item.email) return;
    try {
      await navigator.clipboard.writeText(item.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <AdminModal
      open={Boolean(item)}
      onClose={onClose}
      title={item.nama || 'Detail Ringkasan Psikotes'}
      subtitle={`${item.posisi || 'Posisi belum diisi'} · Submit ${item.tanggalSubmit || '—'} WIB`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-stone-500">
            Bahan skrining awal & pertanyaan interview, bukan satu-satunya dasar keputusan.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Uji coba notice if applicable */}
        {item.isUjiCoba && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Indikasi Data Uji Coba</p>
              <p className="text-amber-800 mt-0.5">
                {parsedCatatan.indikasiUjiCoba || 'Baris ini terdeteksi sebagai pengisian contoh / uji coba internal.'}
              </p>
            </div>
          </div>
        )}

        {/* Identitas & Kontak Ringkas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-stone-200 text-xs">
          <div className="flex items-center gap-2 text-stone-700">
            <Briefcase className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="text-stone-500">Posisi:</span>
            <span className="font-semibold text-stone-900">{item.posisi || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="text-stone-500">Kelengkapan:</span>
            <span className="font-semibold text-stone-900 tabular-nums">{item.kelengkapan || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-stone-700">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span className="font-mono text-stone-800 truncate">{item.email || '—'}</span>
            </div>
            {item.email && (
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {copiedEmail ? <Check className="h-3 w-3 text-editorial-green" /> : <Copy className="h-3 w-3" />}
                <span>{copiedEmail ? 'Tersalin' : 'Salin'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-stone-700">
            <Phone className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="text-stone-500">No. HP / WA:</span>
            <span className="font-mono text-stone-900 tabular-nums">{item.noHp || '—'}</span>
          </div>
        </div>

        {/* Bagian 1: Profil DISC */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Bagian 1 — Gaya Perilaku Kerja (DISC)
            </h3>
            <span className="text-[11px] text-stone-400">Rentang skor -12 s.d. +12</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div>
              <span className="text-[11px] text-stone-500 block">Gaya Dominan</span>
              <span className="font-bold text-stone-900 mt-0.5 block">{item.gayaDominan || '—'}</span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">Gaya Pendukung</span>
              <span className="font-semibold text-stone-800 mt-0.5 block">{item.gayaPendukung || '—'}</span>
            </div>
          </div>

          {/* 4-bar centered divergence visual */}
          <div className="space-y-2.5 pt-1">
            {discRows.map(({ key, val }) => {
              const isDominant = val === maxDisc;
              const clamped = Math.max(-12, Math.min(12, val));
              const pct = (Math.abs(clamped) / 12) * 50; // half of full bar width
              const meta = DISC_DESCRIPTIONS[key];

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <span className={`font-bold ${isDominant ? 'text-brand-800' : 'text-stone-800'}`}>
                        {meta.title}
                      </span>
                      <span className="text-stone-500 text-[11px] ml-2 hidden sm:inline">
                        {meta.desc}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold tabular-nums shrink-0 ${
                        val > 0
                          ? isDominant
                            ? 'text-brand-700'
                            : 'text-editorial-green'
                          : val < 0
                            ? 'text-stone-500'
                            : 'text-stone-700'
                      }`}
                    >
                      {formatSignedScore(val)}
                    </span>
                  </div>

                  {/* Diverging meter centered at 0 */}
                  <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200/70">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-300 z-10" />
                    {clamped >= 0 ? (
                      <div
                        className={`absolute top-0 bottom-0 left-1/2 rounded-r-full transition-all ${
                          isDominant ? 'bg-brand-600' : 'bg-emerald-500/80'
                        }`}
                        style={{ width: `${Math.max(pct, clamped === 0 ? 0 : 3)}%` }}
                      />
                    ) : (
                      <div
                        className="absolute top-0 bottom-0 bg-stone-400/70 rounded-l-full transition-all"
                        style={{
                          width: `${Math.max(pct, 3)}%`,
                          right: '50%',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bagian 2: Kecenderungan Kerja (PAPI Kostick) */}
        <section className="space-y-3 pt-4 border-t border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Bagian 2 — Kecenderungan Kerja (PAPI Kostick)
            </h3>
            <span className="text-[11px] text-stone-400">Skala 0–5 (5 = menonjol kuat, 0–2 = lemah)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="text-xs font-bold text-editorial-green">Aspek Tertinggi (Menonjol)</h4>
              {tertinggiList.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Tidak tercatat</p>
              ) : (
                <ul className="space-y-1.5">
                  {tertinggiList.map((asp, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-stone-800">{asp.label}</span>
                      {asp.score !== null && (
                        <span className="font-mono font-bold text-editorial-green tabular-nums shrink-0">
                          {asp.score}/5
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <h4 className="text-xs font-bold text-stone-600">Aspek Terendah (Perlu Perhatian)</h4>
              {terendahList.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Tidak tercatat</p>
              ) : (
                <ul className="space-y-1.5">
                  {terendahList.map((asp, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-stone-700">{asp.label}</span>
                      {asp.score !== null && (
                        <span className="font-mono font-semibold text-stone-500 tabular-nums shrink-0">
                          {asp.score}/5
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Kesimpulan & Catatan */}
        {item.catatan && (
          <section className="space-y-3 pt-4 border-t border-stone-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-stone-400" />
              <span>Ringkasan & Kesimpulan</span>
            </h3>

            <div className="space-y-3 text-xs leading-relaxed text-stone-700">
              {parsedCatatan.profilRingkas && (
                <p className="text-stone-700">{parsedCatatan.profilRingkas}</p>
              )}

              {parsedCatatan.kesimpulanBody && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">
                    {parsedCatatan.kesimpulanTitle || 'Kesimpulan Posisi'}
                  </span>
                  <p className="text-stone-700">{parsedCatatan.kesimpulanBody}</p>
                </div>
              )}

              {parsedCatatan.posisiRelevan.length > 0 && (
                <div className="text-xs text-stone-700">
                  <span className="font-semibold text-stone-500">Posisi lain yang relevan: </span>
                  <span className="font-semibold text-stone-900">
                    {parsedCatatan.posisiRelevan.join(' · ')}
                  </span>
                </div>
              )}

              {!parsedCatatan.profilRingkas && !parsedCatatan.kesimpulanBody && (
                <p className="text-stone-700 whitespace-pre-wrap">{item.catatan}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </AdminModal>
  );
};
