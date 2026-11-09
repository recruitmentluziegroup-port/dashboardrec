import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  Layers,
} from 'lucide-react';
import { BarisAnalisis, AlokasiBiayaRow, formatRupiah, formatPersen } from '../../lib/budget-analytics';

interface TabelPerLokerProps {
  rows: BarisAnalisis[];
  alokasiRows: AlokasiBiayaRow[];
  selectedMonth: string;
}

type SortField =
  | 'posisi'
  | 'biaya'
  | 'pelamar'
  | 'potensial'
  | 'tidakPotensial'
  | 'pending'
  | 'diterima'
  | 'persenPotensial'
  | 'biayaPerPelamar'
  | 'biayaPerPotensial';

interface PosisiSummary {
  posisi: string;
  biaya: number;
  channels: string[];
  pelamar: number;
  potensial: number;
  tidakPotensial: number;
  pending: number;
  diterima: number;
  persenPotensial: number;
  biayaPerPelamar: number | null;
  biayaPerPotensial: number | null;
  breakdown: {
    channel: string;
    biaya: number;
    pelamar: number;
    potensial: number;
    mediaList: string[];
  }[];
}

export const TabelPerLoker: React.FC<TabelPerLokerProps> = ({
  rows,
  alokasiRows,
  selectedMonth,
}) => {
  const [expandedPosisi, setExpandedPosisi] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('biaya');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Group data by position for the selected month
  const dataPosisi = useMemo(() => {
    const monthRows = rows.filter((r) => r.bulan === selectedMonth);
    const monthAlokasi = alokasiRows.filter((a) => a.bulan === selectedMonth);

    const map = new Map<string, PosisiSummary>();

    for (const r of monthRows) {
      let item = map.get(r.posisi);
      if (!item) {
        item = {
          posisi: r.posisi,
          biaya: 0,
          channels: [],
          pelamar: 0,
          potensial: 0,
          tidakPotensial: 0,
          pending: 0,
          diterima: 0,
          persenPotensial: 0,
          biayaPerPelamar: null,
          biayaPerPotensial: null,
          breakdown: [],
        };
        map.set(r.posisi, item);
      }

      item.biaya += r.biaya;
      item.pelamar += r.pelamar;
      item.potensial += r.potensial;
      item.tidakPotensial += r.tidakPotensial;
      item.pending += r.pending;
      item.diterima += r.diterima;

      if (r.channel && !item.channels.includes(r.channel)) {
        item.channels.push(r.channel);
      }

      // Add to breakdown per channel
      const matchingMedia = monthAlokasi
        .filter((a) => a.posisi.toLowerCase() === r.posisi.toLowerCase() && a.channel === r.channel)
        .map((a) => a.namaMedia);

      item.breakdown.push({
        channel: r.channel,
        biaya: r.biaya,
        pelamar: r.pelamar,
        potensial: r.potensial,
        mediaList: Array.from(new Set(matchingMedia)),
      });
    }

    // Calculate rates
    const list: PosisiSummary[] = [];
    for (const item of map.values()) {
      item.persenPotensial = item.pelamar > 0 ? (item.potensial / item.pelamar) * 100 : 0;
      item.biayaPerPelamar = item.pelamar > 0 ? Math.round(item.biaya / item.pelamar) : null;
      item.biayaPerPotensial = item.potensial > 0 ? Math.round(item.biaya / item.potensial) : null;
      list.push(item);
    }

    return list;
  }, [rows, alokasiRows, selectedMonth]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...dataPosisi].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === null || valA === undefined) valA = sortDir === 'asc' ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortDir === 'asc' ? Infinity : -Infinity;

      if (typeof valA === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB, 'id-ID')
          : valB.localeCompare(valA, 'id-ID');
      }

      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [dataPosisi, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const toggleExpand = (posisi: string) => {
    setExpandedPosisi((prev) => {
      const next = new Set(prev);
      if (next.has(posisi)) next.delete(posisi);
      else next.add(posisi);
      return next;
    });
  };

  // Export CSV with UTF-8 BOM
  const handleExportCsv = () => {
    const headers = [
      'Posisi',
      'Anggaran (Rp)',
      'Channel Digunakan',
      'Pelamar Masuk',
      'Pelamar Potensial',
      'Gugur Seleksi',
      'Pending',
      'Diterima',
      '% Potensial',
      'Biaya per Pelamar (Rp)',
      'Biaya per Potensial (Rp)',
    ];

    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      headers.join(','),
      ...sortedData.map((row) =>
        [
          row.posisi,
          row.biaya,
          row.channels.join('; '),
          row.pelamar,
          row.potensial,
          row.tidakPotensial,
          row.pending,
          row.diterima,
          `${row.persenPotensial.toFixed(1)}%`,
          row.biayaPerPelamar ?? '-',
          row.biayaPerPotensial ?? '-',
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
    a.download = `analisis-loker-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-brand-700" />
    ) : (
      <ArrowDown className="h-3 w-3 text-brand-700" />
    );
  };

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-editorial-border p-8 text-center text-stone-500 text-xs">
        Tidak ada data lowongan atau iklan pada periode {selectedMonth}.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-editorial-border shadow-xs overflow-hidden space-y-0">
      {/* Table Header Action Bar */}
      <div className="px-5 py-4 border-b border-editorial-border flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-stone-600" />
          <h3 className="font-serif font-bold text-sm text-stone-900 tracking-tight">
            Performa Rekrutmen per Posisi (Loker)
          </h3>
          <span className="text-[11px] text-stone-500 font-medium">({sortedData.length} posisi)</span>
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

      {/* Responsive Table with Inner Scroll */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-editorial-border bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-stone-500 select-none">
              <th className="py-3 px-3 text-center w-8">#</th>
              <th
                onClick={() => toggleSort('posisi')}
                className="py-3 px-4 cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center gap-1">
                  <span>Posisi</span>
                  {renderSortIcon('posisi')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('biaya')}
                className="py-3 px-4 text-right cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Anggaran</span>
                  {renderSortIcon('biaya')}
                </div>
              </th>
              <th className="py-3 px-4">Channel</th>
              <th
                onClick={() => toggleSort('pelamar')}
                className="py-3 px-3 text-center cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Pelamar</span>
                  {renderSortIcon('pelamar')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('potensial')}
                className="py-3 px-3 text-center cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Potensial</span>
                  {renderSortIcon('potensial')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('tidakPotensial')}
                className="py-3 px-3 text-center cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Gugur</span>
                  {renderSortIcon('tidakPotensial')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('pending')}
                className="py-3 px-3 text-center cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Pending</span>
                  {renderSortIcon('pending')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('diterima')}
                className="py-3 px-3 text-center cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Diterima</span>
                  {renderSortIcon('diterima')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('persenPotensial')}
                className="py-3 px-3 text-right cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>% Potensial</span>
                  {renderSortIcon('persenPotensial')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('biayaPerPelamar')}
                className="py-3 px-4 text-right cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Biaya/Pelamar</span>
                  {renderSortIcon('biayaPerPelamar')}
                </div>
              </th>
              <th
                onClick={() => toggleSort('biayaPerPotensial')}
                className="py-3 px-4 text-right cursor-pointer hover:text-stone-900 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Biaya/Potensial</span>
                  {renderSortIcon('biayaPerPotensial')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-medium">
            {sortedData.map((row) => {
              const isExpanded = expandedPosisi.has(row.posisi);

              return (
                <React.Fragment key={row.posisi}>
                  <tr
                    onClick={() => toggleExpand(row.posisi)}
                    className="hover:bg-stone-50/80 transition-colors cursor-pointer select-none"
                  >
                    {/* Expand icon */}
                    <td className="py-3.5 px-3 text-center text-stone-400">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 mx-auto text-brand-700" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mx-auto" />
                      )}
                    </td>

                    {/* Posisi */}
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      <div className="flex items-center gap-2">
                        <span>{row.posisi}</span>
                        {row.biaya === 0 && row.pelamar > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Organik
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Anggaran */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                      {formatRupiah(row.biaya)}
                    </td>

                    {/* Channel Chips */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {row.channels.map((ch) => (
                          <span
                            key={ch}
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 truncate max-w-[120px]"
                            title={ch}
                          >
                            {ch}
                          </span>
                        ))}
                        {row.channels.length === 0 && <span className="text-stone-400 italic">—</span>}
                      </div>
                    </td>

                    {/* Pelamar */}
                    <td className="py-3.5 px-3 text-center font-bold text-stone-900">{row.pelamar}</td>

                    {/* Potensial */}
                    <td className="py-3.5 px-3 text-center font-bold text-emerald-700">{row.potensial}</td>

                    {/* Gugur */}
                    <td className="py-3.5 px-3 text-center text-stone-500">{row.tidakPotensial}</td>

                    {/* Pending */}
                    <td className="py-3.5 px-3 text-center text-amber-700">{row.pending}</td>

                    {/* Diterima */}
                    <td className="py-3.5 px-3 text-center font-bold text-indigo-700">{row.diterima}</td>

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

                  {/* Expanded Detail Row: Breakdown by Channel + Media */}
                  {isExpanded && (
                    <tr className="bg-stone-50/70 border-b border-stone-200/80">
                      <td colSpan={12} className="py-3 px-6 text-xs">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-stone-400" />
                            Rincian Channel & Media untuk Posisi: <span className="text-stone-900">{row.posisi}</span>
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {row.breakdown.map((b, idx) => (
                              <div
                                key={idx}
                                className="bg-white rounded-xl p-3 border border-stone-200 shadow-2xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-stone-900 text-xs">{b.channel}</span>
                                  <span className="font-mono font-bold text-xs text-brand-700">
                                    {formatRupiah(b.biaya)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-stone-600">
                                  <span>Pelamar: <strong>{b.pelamar}</strong></span>
                                  <span>Potensial: <strong className="text-emerald-700">{b.potensial}</strong></span>
                                </div>

                                {b.mediaList.length > 0 && (
                                  <div className="text-[10px] text-stone-400 truncate" title={b.mediaList.join(', ')}>
                                    Mitra: {b.mediaList.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
