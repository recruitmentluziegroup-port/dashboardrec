import React, { useState } from 'react';
import {
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Award,
  AlertCircle,
  Briefcase,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  SkorMitraResult,
  RekomendasiMitraLabel,
  BudgetIklan,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface TabelPeringkatMitraProps {
  skorList: SkorMitraResult[];
  ads: BudgetIklan[];
  periodeLabel: string;
}

const BADGE_REKOMENDASI: Record<
  RekomendasiMitraLabel,
  { bg: string; text: string; border: string }
> = {
  'Layak diperpanjang/ajak kerja sama': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  Pertimbangkan: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  'Evaluasi ulang': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  'Hindari/tinjau ulang': {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
  'Data belum cukup': {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200',
  },
};

export const TabelPeringkatMitra: React.FC<TabelPeringkatMitraProps> = ({
  skorList,
  ads,
  periodeLabel,
}) => {
  const [expandedMediaKey, setExpandedMediaKey] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedMediaKey((prev) => (prev === key ? null : key));
  };

  // Helper untuk mendapatkan metadata tambahan dari iklan asli
  const getMediaMeta = (namaMedia: string, channel: string) => {
    const matchingAds = ads.filter(
      (a) =>
        a.namaMedia.trim().toLowerCase() === namaMedia.trim().toLowerCase() &&
        a.channel.trim().toLowerCase() === channel.trim().toLowerCase()
    );

    const positions = Array.from(
      new Set(matchingAds.flatMap((a) => a.posisi || []).filter(Boolean))
    );

    // Cari link postingan terbaru yang valid
    const latestWithLink = matchingAds.find((a) => a.linkPostingan && a.linkPostingan.trim());
    const latestLink = latestWithLink ? latestWithLink.linkPostingan.trim() : null;

    return { positions, latestLink, adsCount: matchingAds.length };
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Peringkat',
      'Nama Media',
      'Channel',
      'Skor Total (0-100)',
      'Label Rekomendasi',
      'Data Cukup',
      'Total Biaya (Rp)',
      'Jumlah Iklan',
      'Bulan Aktif',
      'Pelamar Masuk',
      'Pelamar Potensial',
      '% Potensial',
      'Biaya / Potensial',
      'Tingkat Keyakinan Atribusi',
      'Alasan Rekomendasi',
    ];

    const csvRows = skorList.map((item, idx) => {
      const at = item.atribusi;
      const keyakinan =
        at.persenAtribusiLangsung >= 70
          ? 'Tinggi'
          : at.persenAtribusiLangsung >= 30
          ? 'Sedang'
          : 'Rendah';

      return [
        idx + 1,
        `"${item.namaMedia}"`,
        `"${item.channel}"`,
        item.skorTotal,
        `"${item.rekomendasi}"`,
        item.dataCukup ? 'Ya' : 'Tidak',
        at.biayaTotal,
        at.jumlahIklan,
        `"${at.bulanAktif.join(', ')}"`,
        at.pelamarTotal,
        at.potensialTotal,
        `"${formatPersen(at.persenPotensial)}"`,
        at.biayaPerPotensial !== null ? at.biayaPerPotensial : '',
        `"${keyakinan} (${at.persenAtribusiLangsung}%)"`,
        `"${item.alasan.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Peringkat_Mitra_Iklan_${periodeLabel.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-editorial-border rounded-2xl shadow-xs overflow-hidden">
      {/* Table Header / Action */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Peringkat & Evaluasi Kelayakan Mitra Iklan
            </h3>
            <p className="text-[11px] text-stone-500">
              Disusun berdasarkan algoritma skor gabungan efisiensi, kualitas kandidat, volume, dan konsistensi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-stone-500" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[920px]">
          <thead>
            <tr className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th className="py-3 px-4 font-bold text-stone-700">Nama Media & Channel</th>
              <th className="py-3 px-3 w-32">Skor Kinerja</th>
              <th className="py-3 px-3 w-44">Label Rekomendasi</th>
              <th className="py-3 px-3 text-right">Total Biaya</th>
              <th className="py-3 px-2 text-center">Iklan</th>
              <th className="py-3 px-2 text-center">Bulan</th>
              <th className="py-3 px-3 text-right">Pelamar</th>
              <th className="py-3 px-3 text-right">Potensial</th>
              <th className="py-3 px-3 text-right">% Potensial</th>
              <th className="py-3 px-3 text-right">Biaya / Potensial</th>
              <th className="py-3 px-3 text-center">Keyakinan</th>
              <th className="py-3 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-xs">
            {skorList.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-10 text-center text-stone-400">
                  Belum ada data mitra iklan yang tercatat pada periode ini.
                </td>
              </tr>
            ) : (
              skorList.map((item, idx) => {
                const at = item.atribusi;
                const mediaKey = `${item.namaMedia}|||${item.channel}`;
                const isExpanded = expandedMediaKey === mediaKey;
                const badgeStyle = BADGE_REKOMENDASI[item.rekomendasi];
                const meta = getMediaMeta(item.namaMedia, item.channel);

                // Tingkat Keyakinan Atribusi
                const keyakinanStatus =
                  at.persenAtribusiLangsung >= 70
                    ? {
                        label: 'Tinggi',
                        class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      }
                    : at.persenAtribusiLangsung >= 30
                    ? {
                        label: 'Sedang',
                        class: 'bg-amber-50 text-amber-700 border-amber-200',
                      }
                    : {
                        label: 'Rendah',
                        class: 'bg-stone-100 text-stone-600 border-stone-200',
                      };

                // Warna bar skor
                const scoreBarColor = !item.dataCukup
                  ? 'bg-stone-300'
                  : item.skorTotal >= 75
                  ? 'bg-emerald-600'
                  : item.skorTotal >= 55
                  ? 'bg-blue-600'
                  : item.skorTotal >= 35
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

                return (
                  <React.Fragment key={mediaKey}>
                    <tr
                      onClick={() => toggleExpand(mediaKey)}
                      className={`hover:bg-stone-50/80 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-stone-50/70' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 leading-tight">
                          {item.namaMedia}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{item.channel}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-stone-900">
                              {item.dataCukup ? `${item.skorTotal}/100` : '-'}
                            </span>
                          </div>
                          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreBarColor}`}
                              style={{ width: `${item.dataCukup ? item.skorTotal : 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          {item.rekomendasi}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-800">
                        {at.biayaTotal > 0 ? formatRupiah(at.biayaTotal) : 'Rp 0'}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-stone-600">
                        {at.jumlahIklan}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-stone-600">
                        {at.bulanAktif.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-stone-800">
                        {at.pelamarTotal}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                        {at.potensialTotal}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-700">
                        {formatPersen(at.persenPotensial)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                        {at.biayaPerPotensial !== null ? formatRupiah(at.biayaPerPotensial) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${keyakinanStatus.class}`}
                          title={
                            at.persenAtribusiLangsung < 100
                              ? `Estimasi berbasis pembagian proporsional (${at.persenAtribusiLangsung}% langsung, sisanya proporsional)`
                              : '100% atribusi langsung dari formulir/kode lacak pelamar'
                          }
                        >
                          {keyakinanStatus.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-400">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                    </tr>

                    {/* ─── Expandable Details Row ──────────────────────────── */}
                    {isExpanded && (
                      <tr className="bg-stone-50/60 border-b border-stone-200">
                        <td colSpan={13} className="p-4 sm:p-5">
                          <div className="space-y-4 max-w-4xl">
                            {/* Alasan Otomatis */}
                            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                                <Sparkles className="h-3.5 w-3.5 text-brand-700" />
                                <span>Alasan & Evaluasi Kinerja Otomatis:</span>
                              </div>
                              <p className="text-xs text-stone-600 leading-relaxed">
                                {item.alasan}
                              </p>
                            </div>

                            {/* Rincian Posisi & Link Postingan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Posisi Terkait */}
                              <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs space-y-1.5">
                                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                                  <Briefcase className="h-3.5 w-3.5 text-stone-500" />
                                  <span>Posisi yang Pernah Diiklankan ({meta.positions.length}):</span>
                                </span>
                                {meta.positions.length === 0 ? (
                                  <span className="text-stone-400 text-xs italic">
                                    Tidak tercatat posisi spesifik.
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {meta.positions.map((pos) => (
                                      <span
                                        key={pos}
                                        className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[11px] font-medium rounded-md border border-stone-200"
                                      >
                                        {pos}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Link Postingan Terbaru */}
                              <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
                                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-stone-500" />
                                  <span>Bulan Aktif:</span>
                                </span>
                                <div className="text-stone-600 font-mono text-[11px]">
                                  {at.bulanAktif.join(', ')}
                                </div>
                                {meta.latestLink ? (
                                  <div className="pt-1">
                                    <a
                                      href={meta.latestLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 hover:underline"
                                    >
                                      <span>Buka Link Postingan Terbaru</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-stone-400 text-[11px] italic">
                                    Tidak ada tautan postingan tersimpan.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Note Footer */}
      <div className="p-3.5 bg-stone-50/70 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <span>
            Klik pada baris media mana pun untuk membuka analisis mendalam, rincian posisi, dan tautan bukti tayang.
          </span>
        </div>
      </div>
    </div>
  );
};
