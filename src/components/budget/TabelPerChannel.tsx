import React, { useMemo } from 'react';
import { Download, Radio, Megaphone } from 'lucide-react';
import { BarisAnalisis, AlokasiBiayaRow, perChannel, formatRupiah, formatPersen } from '../../lib/budget-analytics';

interface TabelPerChannelProps {
  rows: BarisAnalisis[];
  alokasiRows: AlokasiBiayaRow[];
  selectedMonth: string;
}

export const TabelPerChannel: React.FC<TabelPerChannelProps> = ({
  rows,
  alokasiRows,
  selectedMonth,
}) => {
  // Aggregate per channel using helper
  const dataChannel = useMemo(() => {
    const list = perChannel(rows, [selectedMonth]);
    const monthAlokasi = alokasiRows.filter((a) => a.bulan === selectedMonth);

    return list.map((item) => {
      // Hitung jumlah media unik di channel ini
      const mediaSet = new Set<string>();
      monthAlokasi
        .filter((a) => a.channel.toLowerCase() === item.kunci.toLowerCase())
        .forEach((a) => {
          if (a.namaMedia.trim()) mediaSet.add(a.namaMedia.trim().toLowerCase());
        });

      return {
        ...item,
        jumlahMedia: mediaSet.size,
      };
    });
  }, [rows, alokasiRows, selectedMonth]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Channel',
      'Jumlah Media',
      'Anggaran (Rp)',
      'Pelamar Masuk',
      'Pelamar Potensial',
      '% Potensial',
      'Biaya per Pelamar (Rp)',
      'Biaya per Potensial (Rp)',
      'Tipe Channel',
    ];

    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      headers.join(','),
      ...dataChannel.map((row) =>
        [
          row.kunci,
          row.jumlahMedia,
          row.biaya,
          row.pelamar,
          row.potensial,
          `${row.persenPotensial.toFixed(1)}%`,
          row.biayaPerPelamar ?? '-',
          row.biayaPerPotensial ?? '-',
          row.biaya === 0 ? 'Organik/Gratis' : 'Berbayar',
        ]
          .map(esc)
          .join(',')
      ),
    ];

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis-channel-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (dataChannel.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-editorial-border p-8 text-center text-stone-500 text-xs">
        Tidak ada data channel pada periode {selectedMonth}.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-editorial-border shadow-xs overflow-hidden space-y-0">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-editorial-border flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-stone-600" />
          <h3 className="font-serif font-bold text-sm text-stone-900 tracking-tight">
            Performa per Channel Distribusi Iklan
          </h3>
          <span className="text-[11px] text-stone-500 font-medium">({dataChannel.length} channel)</span>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-700 hover:bg-white bg-stone-100 transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-stone-500" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[750px]">
          <thead>
            <tr className="border-b border-editorial-border bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-stone-500 select-none">
              <th className="py-3 px-4">Channel</th>
              <th className="py-3 px-3 text-center">Media Aktif</th>
              <th className="py-3 px-4 text-right">Anggaran</th>
              <th className="py-3 px-3 text-center">Pelamar</th>
              <th className="py-3 px-3 text-center">Potensial</th>
              <th className="py-3 px-3 text-right">% Potensial</th>
              <th className="py-3 px-4 text-right">Biaya/Pelamar</th>
              <th className="py-3 px-4 text-right">Biaya/Potensial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-medium">
            {dataChannel.map((row) => {
              const isOrganik = row.biaya === 0;

              return (
                <tr key={row.kunci} className="hover:bg-stone-50/80 transition-colors">
                  {/* Channel */}
                  <td className="py-3.5 px-4 font-bold text-stone-900">
                    <div className="flex items-center gap-2">
                      <span>{row.kunci}</span>
                      {isOrganik ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-stone-100 text-stone-600 border border-stone-200">
                          Organik / Gratis
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-brand-50 text-brand-700 border border-brand-200">
                          Berbayar
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Media */}
                  <td className="py-3.5 px-3 text-center text-stone-700">
                    {row.jumlahMedia > 0 ? (
                      <span className="font-semibold text-stone-900">{row.jumlahMedia} media</span>
                    ) : (
                      <span className="text-stone-400 italic">—</span>
                    )}
                  </td>

                  {/* Anggaran */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                    {formatRupiah(row.biaya)}
                  </td>

                  {/* Pelamar */}
                  <td className="py-3.5 px-3 text-center font-bold text-stone-900">{row.pelamar}</td>

                  {/* Potensial */}
                  <td className="py-3.5 px-3 text-center font-bold text-emerald-700">{row.potensial}</td>

                  {/* % Potensial */}
                  <td className="py-3.5 px-3 text-right font-semibold text-emerald-700">
                    {formatPersen(row.persenPotensial)}
                  </td>

                  {/* Biaya/Pelamar */}
                  <td className="py-3.5 px-4 text-right font-mono text-stone-800">
                    {formatRupiah(row.biayaPerPelamar)}
                  </td>

                  {/* Biaya/Potensial */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                    {formatRupiah(row.biayaPerPotensial)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
