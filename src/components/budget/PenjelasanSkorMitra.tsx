import React, { useState } from 'react';
import {
  Info,
  ChevronDown,
  ChevronUp,
  Percent,
  Layers,
  Scale,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { BOBOT_SKOR_MITRA, AMBANG_DATA_CUKUP } from '../../lib/budget-analytics';

export const PenjelasanSkorMitra: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-stone-50/70 border border-stone-200 rounded-2xl overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-stone-100/60 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-900 block">
              Metodologi Algoritma Skor & Ambang Batas Evaluasi Mitra
            </span>
            <span className="text-[11px] text-stone-500 block">
              Pelajari 5 pilar pembobotan skor kinerja (0-100) dan tata cara atribusi pelamar
            </span>
          </div>
        </div>
        <div className="text-stone-400 p-1">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-stone-200/60 space-y-4 text-xs text-stone-600 leading-relaxed bg-white">
          {/* 5 Pilar Bobot */}
          <div className="space-y-2">
            <span className="font-bold text-stone-900 block">
              5 Pilar Pembobotan Skor Mitra (Total 100%):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">1. Efisiensi Biaya</span>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                    Bobot {BOBOT_SKOR_MITRA.efisiensi * 100}%
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Biaya per kandidat potensial dinormalisasi terhadap benchmark antar media. Semakin hemat biaya untuk mendapatkan 1 orang potensial, semakin tinggi skornya.
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">2. Kualitas Pelamar</span>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                    Bobot {BOBOT_SKOR_MITRA.kualitas * 100}%
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Persentase kandidat yang memenuhi kualifikasi awal (lolos seleksi CV, dipanggil wawancara, atau diterima) terhadap seluruh pelamar dari media tersebut.
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">3. Volume Pelamar</span>
                  <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                    Bobot {BOBOT_SKOR_MITRA.volume * 100}%
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Rata-rata jumlah pelamar per bulan aktif dinormalisasi terhadap capaian volume tertinggi dari seluruh media pada periode yang sama.
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">4. Konsistensi Keberhasilan</span>
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                    Bobot {BOBOT_SKOR_MITRA.konsistensi * 100}%
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Frekuensi bulan aktif pemasangan yang secara konsisten menghasilkan pelamar potensial, menghindari bias lonjakan sesaat pada satu bulan tertentu.
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">5. Tren Kinerja</span>
                  <span className="text-[10px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                    Bobot {BOBOT_SKOR_MITRA.tren * 100}%
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Perbandingan performa antara paruh waktu awal pengamatan dengan paruh waktu akhir untuk mendeteksi apakah efisiensi media sedang menanjak naik atau menurun.
                </p>
              </div>
            </div>
          </div>

          {/* Ambang Batas Data Cukup & Ketentuan Atribusi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
                <span>Ambang Batas Data Cukup</span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                Media wajib memiliki minimal <strong>{AMBANG_DATA_CUKUP.minIklan} kali tayangan iklan</strong> atau menghasilkan minimal <strong>{AMBANG_DATA_CUKUP.minPelamar} pelamar masuk</strong> agar skor dan label evaluasi diterbitkan. Media dengan data di bawah batas ini otomatis berlabel <em>&quot;Data belum cukup&quot;</em> guna mencegah kesimpulan prematur.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <AlertTriangle className="h-4 w-4 text-stone-600" />
                <span>Ketentuan Atribusi Langsung vs Estimasi</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Pelamar yang mencantumkan nama akun media atau kode lacak unik pada formulir pendaftaran diatribusikan secara langsung (100% presisi). Pelamar yang hanya memilih nama channel (misal &quot;Instagram&quot;) diatribusikan secara proporsional sesuai bobot alokasi anggaran media di channel dan divisi lowongan tersebut.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
