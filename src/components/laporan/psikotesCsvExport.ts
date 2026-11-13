import { LaporanPsikotesItem } from '../../types';

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportPsikotesToCsv(items: LaporanPsikotesItem[], filenameSuffix = ''): void {
  const headers = [
    'No',
    'Tanggal & Jam Submit (WIB)',
    'Nama Lengkap',
    'Alamat Email',
    'Nomor HP / WhatsApp',
    'Posisi yang Dilamar',
    'Kelengkapan Jawaban',
    'Skor D',
    'Skor I',
    'Skor S',
    'Skor C',
    'Gaya Dominan (Bagian 1)',
    'Gaya Pendukung (Bagian 1)',
    'Aspek Tertinggi (Bagian 2)',
    'Aspek Terendah (Bagian 2)',
    'Catatan',
  ];

  const csvRows: string[] = [headers.join(',')];

  items.forEach((item) => {
    const row = [
      escapeCsvCell(item.no),
      escapeCsvCell(item.tanggalSubmit),
      escapeCsvCell(item.nama),
      escapeCsvCell(item.email),
      escapeCsvCell(item.noHp),
      escapeCsvCell(item.posisi),
      escapeCsvCell(item.kelengkapan),
      escapeCsvCell(item.skorD),
      escapeCsvCell(item.skorI),
      escapeCsvCell(item.skorS),
      escapeCsvCell(item.skorC),
      escapeCsvCell(item.gayaDominan),
      escapeCsvCell(item.gayaPendukung),
      escapeCsvCell(item.aspekTertinggi),
      escapeCsvCell(item.aspekTerendah),
      escapeCsvCell(item.catatan),
    ];
    csvRows.push(row.join(','));
  });

  const bom = '\uFEFF';
  const csvContent = bom + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `ringkasan_psikotes_${filenameSuffix || nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
