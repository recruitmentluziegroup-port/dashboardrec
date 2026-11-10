import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Download,
  Sparkles,
  HelpCircle,
  TrendingUp,
  DollarSign,
  PieChart,
} from 'lucide-react';
import {
  SkorMitraResult,
  formatRupiah,
  formatPersen,
} from '../../lib/budget-analytics';

interface SimulasiAlokasiAnggaranProps {
  skorList: SkorMitraResult[];
  defaultTotalAnggaran?: number;
}

export const SimulasiAlokasiAnggaran: React.FC<SimulasiAlokasiAnggaranProps> = ({
  skorList,
  defaultTotalAnggaran = 5000000,
}) => {
  const [totalAnggaran, setTotalAnggaran] = useState<number>(defaultTotalAnggaran);
  const [displayInput, setDisplayInput] = useState<string>(
    new Intl.NumberFormat('id-ID').format(defaultTotalAnggaran)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) || 0;
    setTotalAnggaran(num);
    setDisplayInput(num > 0 ? new Intl.NumberFormat('id-ID').format(num) : '');
  };

  // Filter media yang memenuhi syarat menerima alokasi anggaran
  // Prioritas: media dengan status Layak atau Pertimbangkan (dan skor > 0)
  const { alokasiItems, totalTeralokasi, sumSkor } = useMemo(() => {
    let eligible = skorList.filter(
      (s) =>
        s.dataCukup &&
        s.skorTotal > 0 &&
        (s.rekomendasi === 'Layak diperpanjang/ajak kerja sama' ||
          s.rekomendasi === 'Pertimbangkan')
    );

    // Fallback bila belum ada yang berstatus Layak/Pertimbangkan
    if (eligible.length === 0) {
      eligible = skorList.filter((s) => s.skorTotal > 0 && s.dataCukup);
    }

    const totalSkor = eligible.reduce((s, item) => s + item.skorTotal, 0);

    if (totalSkor === 0 || totalAnggaran === 0) {
      return { alokasiItems: [], totalTeralokasi: 0, sumSkor: 0 };
    }

    // Alokasikan proporsional berbanding lurus skor
    let allocatedSum = 0;
    const items = eligible.map((item) => {
      const proporsi = item.skorTotal / totalSkor;
      const alokasi = Math.round(totalAnggaran * proporsi);
      allocatedSum += alokasi;

      // Estimasi hasil potensial berdasarkan unit economics historis
      const cpp = item.atribusi.biayaPerPotensial;
      const estimasiPotensial = cpp && cpp > 0 ? Math.round((alokasi / cpp) * 10) / 10 : null;

      return {
        namaMedia: item.namaMedia,
        channel: item.channel,
        skorTotal: item.skorTotal,
        rekomendasi: item.rekomendasi,
        proporsiPersen: Math.round(proporsi * 1000) / 10,
        alokasi,
        biayaPerPotensial: cpp,
        estimasiPotensial,
      };
    });

    // Koreksi selisih pembulatan (agar total tepat sama dengan totalAnggaran)
    const selisih = totalAnggaran - allocatedSum;
    if (selisih !== 0 && items.length > 0) {
      // Tambahkan selisih ke item dengan skor tertinggi (item index 0)
      items[0].alokasi += selisih;
    }

    return {
      alokasiItems: items,
      totalTeralokasi: totalAnggaran,
      sumSkor: totalSkor,
    };
  }, [skorList, totalAnggaran]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Nama Media',
      'Channel',
      'Skor Total',
      'Status Rekomendasi',
      'Porsi Alokasi (%)',
      'Alokasi Anggaran Disarankan (Rp)',
      'Estimasi Kandidat Potensial (org)',
    ];

    const csvRows = alokasiItems.map((item) => [
      `"${item.namaMedia}"`,
      `"${item.channel}"`,
      item.skorTotal,
      `"${item.rekomendasi}"`,
      `"${item.proporsiPersen}%"`,
      item.alokasi,
      item.estimasiPotensial !== null ? item.estimasiPotensial : '-',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Simulasi_Alokasi_Anggaran.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-editorial-border rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Simulasi Alokasi Ulang Anggaran Iklan
            </h3>
            <p className="text-[11px] text-stone-500">
              Saran pembagian dana bulan depan proporsional terhadap skor efisiensi dan kualitas mitra
            </p>
          </div>
        </div>

        {alokasiItems.length > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5 text-stone-500" />
            <span>Ekspor Hasil Simulasi</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Input Anggaran */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="space-y-0.5">
            <label htmlFor="simulasi-anggaran" className="text-xs font-bold text-stone-900 block">
              Rencana Total Anggaran Iklan Bulan Depan:
            </label>
            <span className="text-[11px] text-stone-500 block">
              Masukkan estimasi total dana yang akan dialokasikan ke mitra pemasangan iklan
            </span>
          </div>

          <div className="relative sm:w-64 shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
              Rp
            </span>
            <input
              id="simulasi-anggaran"
              type="text"
              value={displayInput}
              onChange={handleInputChange}
              placeholder="Contoh: 5.000.000"
              className="w-full pl-9 pr-3 py-2 text-sm font-bold font-mono text-stone-900 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs"
            />
          </div>

          <div className="text-xs text-stone-600 font-medium sm:ml-auto">
            <span>Total Teralokasi: </span>
            <span className="font-bold text-emerald-800 font-mono text-sm">
              {formatRupiah(totalTeralokasi)}
            </span>
          </div>
        </div>

        {/* Tabel Saran Pembagian */}
        {alokasiItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 italic">
            Belum ada media mitra berbayar yang memenuhi ambang evaluasi untuk disimulasikan.
          </div>
        ) : (
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
                  <th className="py-2.5 px-3">Nama Media</th>
                  <th className="py-2.5 px-2 text-center">Skor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Porsi</th>
                  <th className="py-2.5 px-3 text-right">Alokasi Disarankan</th>
                  <th className="py-2.5 px-3 text-right">Estimasi Hasil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-mono">
                {alokasiItems.map((item) => (
                  <tr key={item.namaMedia} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-stone-900">
                      {item.namaMedia}{' '}
                      <span className="text-[10px] font-normal text-stone-400">
                        ({item.channel})
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-stone-800">
                      {item.skorTotal}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {item.rekomendasi}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-stone-600">
                      {formatPersen(item.proporsiPersen)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                      {formatRupiah(item.alokasi)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-stone-700 font-sans">
                      {item.estimasiPotensial !== null
                        ? `~${item.estimasiPotensial} potensial`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Disclaimer / Catatan Penting */}
        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <HelpCircle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span>Catatan Penting Simulasi:</span>
          </div>
          <p className="leading-relaxed">
            Perhitungan ini merupakan saran awal berbasis proporsi skor efisiensi historis dan bukan merupakan jaminan perolehan kandidat di masa depan. Tim HR disarankan tetap mempertimbangkan ketersediaan paket tayang media, target kualifikasi khusus, dan kebutuhan urgensi tiap divisi lowongan kerja.
          </p>
        </div>
      </div>
    </div>
  );
};
