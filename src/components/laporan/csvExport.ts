import { LaporanRekapItem } from '../../types';

export function exportRekapToCsv(rows: LaporanRekapItem[], filenameSuffix = ''): void {
  const headers = [
    'Tanggal',
    'Total Lamaran',
    'Content Creator',
    'SPV Marketing Biro Umrah',
    'Admin Investasi',
    'Sesuai',
    'Kurang Sesuai',
    'Tidak Sesuai',
    'Tidak Diverifikasi',
    'Status Penilaian',
  ];

  const csvRows: string[] = [headers.join(',')];

  rows.forEach((r) => {
    const statusPenilaian = r.dinilai ? 'Sudah Dinilai' : 'Belum dinilai';
    const rowValues = [
      `"${r.tanggal}"`,
      r.total,
      r.contentCreator,
      r.spvMarketing,
      r.adminInvestasi,
      r.dinilai ? r.sesuai : '"Belum dinilai"',
      r.dinilai ? r.kurangSesuai : '"Belum dinilai"',
      r.dinilai ? r.tidakSesuai : '"Belum dinilai"',
      r.dinilai ? r.tidakDiverifikasi : '"Belum dinilai"',
      `"${statusPenilaian}"`,
    ];
    csvRows.push(rowValues.join(','));
  });

  // UTF-8 BOM so Microsoft Excel correctly renders UTF-8 encoding
  const bom = '\uFEFF';
  const csvContent = bom + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `laporan_rekap_harian_${filenameSuffix || nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
