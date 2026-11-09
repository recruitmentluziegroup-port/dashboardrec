import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, HelpCircle, CheckCircle, FileText } from 'lucide-react';
import { POTENSIAL_STATUSES, TIDAK_POTENSIAL_STATUSES, DITERIMA_STATUSES } from '../../lib/budget-analytics';

export const CatatanMetodologi: React.FC = () => {
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
          <div className="p-1.5 bg-stone-200/70 text-stone-700 rounded-lg">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-900 block">
              Catatan Metodologi & Sumber Data Analitik
            </span>
            <span className="text-[11px] text-stone-500 block">
              Pelajari definisi status potensial, atribusi media iklan, dan formula alokasi biaya
            </span>
          </div>
        </div>
        <div className="text-stone-400 p-1">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-stone-200/60 space-y-4 text-xs text-stone-600 leading-relaxed bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>Kandidat Potensial ({POTENSIAL_STATUSES.join(', ')})</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Pelamar yang telah melalui screening berkas dan dinilai memenuhi kualifikasi awal (lolos seleksi CV, dipanggil wawancara HR/User, atau telah diterima kerja). Status &apos;Rejected&apos; dihitung sebagai Tidak Potensial, sedangkan pelamar yang baru masuk dan belum diproses masuk ke kategori Pending.
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-brand-600" />
                <span>Atribusi Channel & Media Iklan</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Atribusi dihubungkan dari jawaban pertanyaan pendaftaran (&apos;Dapat informasi lowongan ini dari mana?&apos;) dan field keterangan pelamar yang mencantumkan nama media mitra atau kode lacak unik (misal: BDG-xxx atau nama akun Instagram/portal).
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>Alokasi Biaya Lintas Bulan & Multi-Posisi</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Iklan yang berjalan melintasi pergantian bulan dialokasikan secara proporsional berdasarkan jumlah hari kalender di masing-masing bulan. Untuk iklan yang memuat lebih dari satu posisi loker sekaligus, biaya dibagi rata secara proporsional.
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-600" />
                <span>Status Data Snapshot Real-time</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Analitik ini bersumber dari data Google Sheets terkini. Pelamar yang baru masuk bulan ini dan belum diproses tim HR akan segera terefleksi dalam metrik begitu statusnya diubah menjadi Reviewed atau lolos wawancara.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
