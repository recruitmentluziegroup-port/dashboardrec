import React, { useMemo } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  BarisAnalisis,
  AlokasiBiayaRow,
  RingkasanKpiBulan,
  perChannel,
  perPosisi,
  PelamarAnalyticsInput,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface PanelPerhatianProps {
  rows: BarisAnalisis[];
  alokasiRows: AlokasiBiayaRow[];
  kpi: RingkasanKpiBulan;
  selectedMonth: string;
  applicants?: PelamarAnalyticsInput[];
  knownPositions?: string[];
}

export type TipePerhatian = 'Boros' | 'Perlu Evaluasi' | 'Data Belum Lengkap' | 'Cek Nama Posisi';

export interface ItemPerhatian {
  id: string;
  tipe: TipePerhatian;
  judul: string;
  pesan: string;
  rekomendasi: string;
  tingkat: 'danger' | 'warning' | 'info';
}

const BADGE_STYLES: Record<TipePerhatian, string> = {
  Boros: 'bg-rose-50 text-rose-700 border-rose-200',
  'Perlu Evaluasi': 'bg-amber-50 text-amber-700 border-amber-200',
  'Data Belum Lengkap': 'bg-stone-100 text-stone-700 border-stone-200',
  'Cek Nama Posisi': 'bg-blue-50 text-blue-700 border-blue-200',
};

export const PanelPerhatian: React.FC<PanelPerhatianProps> = ({
  rows,
  alokasiRows,
  kpi,
  selectedMonth,
  applicants = [],
  knownPositions = [],
}) => {
  const items = useMemo<ItemPerhatian[]>(() => {
    const alerts: ItemPerhatian[] = [];

    // Filter baris data untuk bulan yang dipilih
    const monthAlokasi = alokasiRows.filter((a) => a.bulan === selectedMonth);
    const channelList = perChannel(rows, [selectedMonth]);
    const posisiList = perPosisi(rows, [selectedMonth]);

    // 1. Iklan berbiaya tapi 0 pelamar masuk
    // Cek setiap alokasi iklan bulan ini yang biayanya > 0
    const mediaWithZeroApplicants = new Map<string, { namaMedia: string; channel: string; posisi: string; biaya: number }>();
    monthAlokasi.forEach((alok) => {
      if (alok.biaya > 0) {
        // Cari pelamar yang teratribusi ke channel + posisi ini
        const matched = rows.find(
          (r) =>
            r.bulan === selectedMonth &&
            r.posisi.toLowerCase() === alok.posisi.toLowerCase() &&
            r.channel.toLowerCase() === alok.channel.toLowerCase()
        );
        const pelamarCount = matched ? matched.pelamar : 0;
        if (pelamarCount === 0) {
          const key = `${alok.channel}__${alok.namaMedia}__${alok.posisi}`;
          const existing = mediaWithZeroApplicants.get(key);
          if (existing) {
            existing.biaya += alok.biaya;
          } else {
            mediaWithZeroApplicants.set(key, {
              namaMedia: alok.namaMedia,
              channel: alokasiRows.find((a) => a.iklanId === alok.iklanId)?.channel || alok.channel,
              posisi: alok.posisi,
              biaya: alok.biaya,
            });
          }
        }
      }
    });

    if (mediaWithZeroApplicants.size > 0) {
      // Ambil yang biayanya terbesar
      const sortedWaste = Array.from(mediaWithZeroApplicants.values()).sort((a, b) => b.biaya - a.biaya);
      const topWaste = sortedWaste[0];
      alerts.push({
        id: 'zero-applicants',
        tipe: 'Boros',
        judul: `Iklan berbayar tanpa pelamar masuk: ${topWaste.namaMedia || topWaste.channel}`,
        pesan: `Alokasi biaya sebesar ${formatRupiah(topWaste.biaya)} untuk posisi ${topWaste.posisi} belum menghasilkan pelamar masuk sama sekali di bulan ini.`,
        rekomendasi: 'Evaluasi kesesuaian target audiens media, materi iklan, atau permudah call-to-action (CTA) pendaftaran.',
        tingkat: 'danger',
      });
    }

    // 2. Channel dengan biaya/potensial > 1.5x rata-rata bulan ini
    if (kpi.biayaPerPotensial && kpi.biayaPerPotensial > 0) {
      const avgCpp = kpi.biayaPerPotensial;
      const expensiveChannels = channelList.filter(
        (c) => c.biayaPerPotensial !== null && c.biayaPerPotensial > 1.5 * avgCpp && c.potensial > 0
      );
      if (expensiveChannels.length > 0) {
        expensiveChannels.sort((a, b) => (b.biayaPerPotensial || 0) - (a.biayaPerPotensial || 0));
        const worstChannel = expensiveChannels[0];
        const ratio = Math.round(((worstChannel.biayaPerPotensial! / avgCpp) - 1) * 100);
        alerts.push({
          id: `high-cpp-${worstChannel.kunci}`,
          tipe: 'Perlu Evaluasi',
          judul: `Biaya per potensial tinggi di channel ${worstChannel.kunci}`,
          pesan: `Biaya per kandidat potensial di channel ${worstChannel.kunci} mencapai ${formatRupiah(worstChannel.biayaPerPotensial!)}, yaitu ${ratio}% lebih mahal dibandingkan rata-rata seluruh channel (${formatRupiah(avgCpp)}).`,
          rekomendasi: 'Tinjau ulang negosiasi tarif dengan mitra iklan atau alokasikan anggaran ke channel yang lebih hemat.',
          tingkat: 'warning',
        });
      }
    }

    // 3. Volume pelamar tinggi (>= 5 pelamar) tapi rasio potensial < 20%
    const lowConversionPositions = posisiList.filter(
      (p) => p.pelamar >= 5 && p.persenPotensial < 20
    );
    if (lowConversionPositions.length > 0) {
      lowConversionPositions.sort((a, b) => b.pelamar - a.pelamar);
      const targetPos = lowConversionPositions[0];
      alerts.push({
        id: `low-conversion-${targetPos.kunci}`,
        tipe: 'Perlu Evaluasi',
        judul: `Rasio potensial rendah pada posisi ${targetPos.kunci}`,
        pesan: `Menerima ${targetPos.pelamar} pelamar masuk, namun hanya ${formatPersen(targetPos.persenPotensial)} (${targetPos.potensial} orang) yang lolos kualifikasi awal.`,
        rekomendasi: 'Perjelas kriteria minimum, pengalaman wajib, atau kualifikasi teknis pada naskah lowongan untuk menyaring pelamar tidak cocok sejak awal.',
        tingkat: 'warning',
      });
    }

    // 4. Pelamar masuk dengan sumber info belum tercatat
    // Filter applicants bulan terpilih
    const monthApplicants = applicants.filter((app) => {
      if (!app.submissionDate) return false;
      return app.submissionDate.slice(0, 7) === selectedMonth;
    });

    const untrackedCount = monthApplicants.filter((app) => {
      const src = (app.sumberInfoLowongan || '').trim();
      return !src || src === 'Belum tercatat' || (src.toLowerCase() === 'lainnya' && !(app.keteranganSumber || '').trim());
    }).length;

    if (untrackedCount > 0) {
      alerts.push({
        id: 'untracked-sources',
        tipe: 'Data Belum Lengkap',
        judul: `${untrackedCount} pelamar belum memiliki catatan sumber informasi`,
        pesan: `Terdapat ${untrackedCount} pelamar di bulan ${selectedMonth} yang sumber informasinya kosong atau belum tercatat secara spesifik.`,
        rekomendasi: 'Pastikan pertanyaan asal lowongan pada formulir pendaftaran selalu terisi agar atribusi iklan akurat.',
        tingkat: 'info',
      });
    }

    // 5. Posisi di iklan tidak cocok dengan lowongan/pelamar mana pun (potensi typo)
    if (knownPositions.length > 0 && monthAlokasi.length > 0) {
      const knownLower = new Set(knownPositions.map((p) => p.toLowerCase().trim()));
      // Kumpulkan juga posisi dari pelamar yang masuk
      applicants.forEach((a) => {
        if (a.jabatanDituju) knownLower.add(a.jabatanDituju.toLowerCase().trim());
      });

      const unknownPositions = new Set<string>();
      monthAlokasi.forEach((alok) => {
        const norm = alok.posisi.toLowerCase().trim();
        if (norm && !knownLower.has(norm)) {
          unknownPositions.add(alok.posisi);
        }
      });

      if (unknownPositions.size > 0) {
        const typoPos = Array.from(unknownPositions)[0];
        alerts.push({
          id: `unknown-pos-${typoPos}`,
          tipe: 'Cek Nama Posisi',
          judul: `Posisi "${typoPos}" tidak cocok dengan data lowongan/pelamar`,
          pesan: `Posisi ini tercatat pada anggaran iklan bulan ini namun tidak ditemukan pada data master lowongan kerja aktif maupun pelamar.`,
          rekomendasi: 'Periksa penulisan nama posisi pada data iklan agar otomatis terhubung dengan data rekrutmen.',
          tingkat: 'info',
        });
      }
    }

    // Batasi maksimal 5 item
    return alerts.slice(0, 5);
  }, [rows, alokasiRows, kpi, selectedMonth, applicants, knownPositions]);

  // Jika tidak ada masalah yang terdeteksi, tampilkan kartu hijau positif
  if (items.length === 0) {
    return (
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-3.5 transition-all">
        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
            <span>Semua alokasi iklan dan konversi pelamar bulan ini terpantau sehat</span>
          </h4>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Tidak terdeteksi pemborosan anggaran yang signifikan, channel dengan biaya melambung, atau anomali data pelamar pada periode ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Perlu Perhatian Tim Rekrutmen</h3>
            <p className="text-[11px] text-stone-500">
              {items.length} anomali atau peluang optimasi terdeteksi otomatis untuk periode ini
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
          Maks. 5 Temuan
        </span>
      </div>

      <div className="divide-y divide-stone-100">
        {items.map((item) => (
          <div key={item.id} className="p-4 sm:p-5 hover:bg-stone-50/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    BADGE_STYLES[item.tipe]
                  }`}
                >
                  {item.tipe}
                </span>
                <h4 className="text-sm font-bold text-stone-900">{item.judul}</h4>
              </div>
            </div>
            <p className="text-xs text-stone-600 mb-2 leading-relaxed">{item.pesan}</p>
            <div className="flex items-start gap-1.5 text-xs text-stone-700 bg-stone-50 border border-stone-200/70 rounded-lg p-2.5">
              <span className="font-semibold text-stone-900 shrink-0">Saran:</span>
              <span className="text-stone-600">{item.rekomendasi}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
