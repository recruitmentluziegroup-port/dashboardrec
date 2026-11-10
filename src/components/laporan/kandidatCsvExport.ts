import { LaporanKandidatItem } from '../../types';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportKandidatToCsv(candidates: LaporanKandidatItem[], filenameSuffix = ''): void {
  const headers = [
    'Tanggal',
    'Nama Kandidat',
    'Posisi Dilamar',
    'Status Pengalaman',
    'Alasan / Bukti',
    'Email Pengirim',
    'Lamaran Ulang',
    'Rekomendasi Posisi',
    'Link Email',
  ];

  const csvRows: string[] = [headers.join(',')];

  candidates.forEach((k) => {
    const row = [
      escapeCsvCell(k.tanggal),
      escapeCsvCell(k.nama || '(nama tidak tercantum di subjek)'),
      escapeCsvCell(k.posisi),
      escapeCsvCell(k.status || 'Belum dinilai'),
      escapeCsvCell(k.alasan || '-'),
      escapeCsvCell(k.email),
      escapeCsvCell(k.lamaranUlang ? 'Ya' : 'Tidak'),
      escapeCsvCell(k.rekomendasiPosisi || '-'),
      escapeCsvCell(k.linkEmail || ''),
    ];
    csvRows.push(row.join(','));
  });

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
  const bom = '\uFEFF';
  const csvContent = bom + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `laporan_kandidat_${filenameSuffix || nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
