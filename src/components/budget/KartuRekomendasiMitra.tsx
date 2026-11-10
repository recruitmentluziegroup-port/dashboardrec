import React, { useMemo } from 'react';
import {
  Award,
  Sparkles,
  Gift,
  AlertOctagon,
  TrendingDown,
  Users,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { SkorMitraResult, formatRupiah, formatPersen } from '../../lib/budget-analytics';

interface KartuRekomendasiMitraProps {
  skorList: SkorMitraResult[];
  onSelectMedia?: (namaMedia: string) => void;
}

export const KartuRekomendasiMitra: React.FC<KartuRekomendasiMitraProps> = ({
  skorList,
  onSelectMedia,
}) => {
  // 1. Top 3 Layak diajak kerja sama
  const topLayak = useMemo(() => {
    const qualified = skorList.filter(
      (s) =>
        s.dataCukup &&
        (s.rekomendasi === 'Layak diperpanjang/ajak kerja sama' || s.rekomendasi === 'Pertimbangkan')
    );
    // Urutkan dari skor tertinggi
    return qualified.slice(0, 3);
  }, [skorList]);

  // 2. Media gratis/organik berkinerja baik
  const bestFree = useMemo(() => {
    const freeMedia = skorList.filter(
      (s) => s.atribusi.biayaTotal === 0 && s.atribusi.potensialTotal > 0
    );
    freeMedia.sort((a, b) => b.atribusi.potensialTotal - a.atribusi.potensialTotal);
    return freeMedia[0] || null;
  }, [skorList]);

  // 3. Pengeluaran berisiko (biaya besar, hasil potensial rendah / nol)
  const worstRisk = useMemo(() => {
    const paidMedia = skorList.filter((s) => s.atribusi.biayaTotal > 0);
    // Cari yang berstatus Hindari/Evaluasi ulang atau biaya > 0 tapi 0 potensial
    const risky = paidMedia.filter(
      (s) =>
        s.rekomendasi === 'Hindari/tinjau ulang' ||
        s.rekomendasi === 'Evaluasi ulang' ||
        s.atribusi.potensialTotal === 0
    );
    // Urutkan dari biaya terbesar yang terbuang
    risky.sort((a, b) => b.atribusi.biayaTotal - a.atribusi.biayaTotal);
    return risky[0] || null;
  }, [skorList]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* ─── KARTU 1: Top 3 Layak Diajak Kerja Sama ────────────────────────── */}
      <div className="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-70" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                Prioritas Rekomendasi
              </span>
              <h4 className="text-sm font-bold text-stone-900">Top Layak Diajak Kerja Sama</h4>
            </div>
          </div>

          {topLayak.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-2">
              Belum ada media berbayar yang memenuhi ambang data cukup untuk kategori layak kerja sama.
            </p>
          ) : (
            <div className="space-y-2.5 pt-1">
              {topLayak.map((item, idx) => (
                <div
                  key={`${item.namaMedia}-${item.channel}`}
                  className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold bg-emerald-700 text-white w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-stone-900 truncate">
                        {item.namaMedia}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block truncate pl-5">
                      {item.channel} • {item.atribusi.potensialTotal} potensial
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-800 block font-mono">
                      {item.atribusi.biayaPerPotensial !== null
                        ? formatRupiah(item.atribusi.biayaPerPotensial)
                        : 'Rp 0'}
                    </span>
                    <span className="text-[9px] text-stone-400 font-mono">/potensial</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-emerald-100/60 mt-2 text-[11px] text-emerald-900 font-medium">
          {topLayak.length > 0
            ? `${topLayak[0].namaMedia} memiliki efisiensi skor tertinggi (${topLayak[0].skorTotal}/100).`
            : 'Kumpulkan minimal 2 iklan atau 10 pelamar untuk penilaian akurat.'}
        </div>
      </div>

      {/* ─── KARTU 2: Media Gratis / Organik Berkinerja Baik ───────────────── */}
      <div className="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0 opacity-70" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                Peluang Kemitraan Barter
              </span>
              <h4 className="text-sm font-bold text-stone-900">Media Gratis Berkinerja Baik</h4>
            </div>
          </div>

          {bestFree ? (
            <div className="space-y-2 pt-1">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">{bestFree.namaMedia}</span>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Biaya Rp 0
                  </span>
                </div>
                <div className="text-xs text-stone-600 mt-1 flex items-center gap-3">
                  <span>
                    <strong>{bestFree.atribusi.potensialTotal}</strong> kandidat potensial
                  </span>
                  <span>•</span>
                  <span>
                    Konversi <strong>{formatPersen(bestFree.atribusi.persenPotensial)}</strong>
                  </span>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Menghasilkan kandidat berkualitas tanpa beban anggaran. Sangat potensial untuk ditingkatkan menjadi kerja sama kemitraan strategis atau barter eksposur.
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic py-2">
              Belum ada media tanpa biaya yang menghasilkan pelamar potensial pada periode ini.
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-blue-100/60 mt-2 text-[11px] text-blue-900 font-medium">
          {bestFree
            ? `Total ${bestFree.atribusi.pelamarTotal} pelamar masuk dari kanal ini.`
            : 'Pantau sumber organik pada formulir pendaftaran.'}
        </div>
      </div>

      {/* ─── KARTU 3: Pengeluaran Berisiko ─────────────────────────────────── */}
      <div className="bg-white border border-rose-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-0 opacity-70" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">
                Perlu Dihentikan / Negosiasi
              </span>
              <h4 className="text-sm font-bold text-stone-900">Pengeluaran Berisiko Tinggi</h4>
            </div>
          </div>

          {worstRisk ? (
            <div className="space-y-2 pt-1">
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">{worstRisk.namaMedia}</span>
                  <span className="text-xs font-bold text-rose-700 font-mono">
                    {formatRupiah(worstRisk.atribusi.biayaTotal)}
                  </span>
                </div>
                <div className="text-xs text-stone-600 mt-1 flex items-center gap-3">
                  <span>
                    Hasil: <strong>{worstRisk.atribusi.potensialTotal}</strong> potensial
                  </span>
                  <span>•</span>
                  <span>
                    Skor: <strong>{worstRisk.skorTotal}/100</strong>
                  </span>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Biaya yang dikeluarkan belum sebanding dengan kandidat yang lolos screening. Disarankan untuk menangguhkan perpanjangan tayang di media ini.
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic py-2">
              Tidak ditemukan mitra dengan pemborosan anggaran yang signifikan pada periode ini.
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-rose-100/60 mt-2 text-[11px] text-rose-900 font-medium">
          {worstRisk
            ? `Rekomendasi: ${worstRisk.rekomendasi}.`
            : 'Seluruh alokasi biaya termonitor menghasilkan konversi yang wajar.'}
        </div>
      </div>
    </div>
  );
};
