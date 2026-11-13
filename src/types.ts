/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Controlled taxonomy for "Sumber Info Lowongan" (Sheets col BK).
 * Stored values — never renamed after launch; display labels may change later.
 */
export const SUMBER_OPTIONS = [
  'Instagram',
  'TikTok',
  'LinkedIn',
  'JobStreet',
  'Glints/Portal Lain',
  'Google/Website Luzie',
  'WhatsApp/Grup Komunitas',
  'Teman/Keluarga/Karyawan Luzie',
  'Kampus/Job Fair',
  'Lainnya',
] as const;

export type SumberInfoLowongan = (typeof SUMBER_OPTIONS)[number];

/** Sources that warrant the conditional "Keterangan Sumber" detail field. */
export const SUMBER_WARRANTS_KETERANGAN: readonly string[] = [
  'Teman/Keluarga/Karyawan Luzie',
  'Lainnya',
];

/**
 * `Anak` is stored as a JSON string in Sheets col AA (index 26).
 * The historical `pendidikan` sub-field was retired from the candidate form;
 * it is intentionally absent here. Legacy rows read back from Sheets may still
 * carry the key inside the stored JSON — it is simply never rendered or written
 * again, and `parseJsonSafe` preserves it verbatim on re-save.
 */
export interface Anak {
  nama: string;
  ttl: string;
}

export interface PendidikanFormal {
  dari: string;
  sampai: string;
  sekolah: string;
  jurusan: string;
  kota: string;
  ijazah: 'Ya' | 'Tidak' | 'Dalam Proses' | '';
}

export interface Kursus {
  bidang: string;
  lamanya: string;
  tempat: string;
}

export interface PengalamanKerja {
  perusahaan: string;
  dari: string;
  sampai: string;
  jabatan: string;
  gaji: string;
  alasanPindah: string;
}

export interface ReferensiPerusahaan {
  perusahaan: string;
  kontak: string;
  telp: string;
  hubungan: string;
}

export interface Organisasi {
  nama: string;
  periode: string;
  jabatan: string;
  keterangan: string;
}

export interface ReferensiKontak {
  nama: string;
  hubungan: string;
  telp: string;
}

export type ApplicationStatus =
  | 'Pending'
  | 'Reviewed'
  | 'Accepted'
  | 'Rejected'
  | 'Interview HR'
  | 'Interview User';

export type StatusLabelId =
  | 'Belum Direview'
  | 'Sedang Ditinjau'
  | 'Diterima'
  | 'Tidak Lolos'
  | 'Wawancara HR'
  | 'Wawancara User';

export interface StatusRecord {
  id: string;
  status: ApplicationStatus;
  statusLabelId: StatusLabelId;
  submissionDate: string;
  lastUpdated: string;
  jabatanDituju: string;
}

export interface StatusResponse {
  data?: StatusRecord;
  error?: string;
}

export interface Applicant {
  // Metadata
  id: string;
  submissionDate: string;
  status: ApplicationStatus;
  lastUpdated: string;

  // Step 1: Identitas Pribadi
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  kewarganegaraan: string;
  alamatTinggal: string;
  alamatKtp: string;
  alamatKtpSama: boolean;
  emailPribadi: string;
  noTelp: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan' | '';
  nomorKtp: string;
  simC: boolean;
  noSimC: string;
  simA: boolean;
  noSimA: string;
  agama: string;
  golonganDarah: string;
  statusPernikahan: 'Single' | 'Tunangan' | 'Menikah' | 'Bercerai' | '';
  tanggalStatusPernikahan: string;

  // Step 2: Keluarga & Lingkungan
  namaPasangan: string;
  pekerjaanPasangan: string;
  anak: Anak[]; // JSON column in Sheets
  namaOrtu: string;
  pekerjaanOrtu: string;
  anakKe: string; // Sheets col BM
  jumlahSaudara: string; // Sheets col BN

  // Step 3: Riwayat Pendidikan
  pendidikanFormal: PendidikanFormal[]; // JSON column in Sheets
  kursus: Kursus[]; // JSON column in Sheets

  // Step 4: Pengalaman Kerja
  pengalamanKerja: PengalamanKerja[]; // JSON column in Sheets
  referensiPerusahaan: ReferensiPerusahaan[]; // JSON column in Sheets
  jobdeskTerakhir: string;

  // Step 5: Minat & Konsep Diri
  jabatanDituju: string;
  lingkunganKerja: string;
  citaCita: string;
  kesulitanKeputusan: string;

  // Step 6: Aktifitas Sosial & Kemasyarakatan
  hobby: string;
  waktuLuang: string;
  pernahKeLuarNegeri: 'Ya' | 'Tidak' | '';
  detailKunjunganLuarNegeri: string;
  organisasi: Organisasi[]; // JSON column in Sheets
  kekuatanDiri: string;
  kelemahanDiri: string;

  // Step 7: Ekspektasi & Lain-lain
  gajiDiinginkan: string;
  fasilitasDiharapkan: string;
  dapatMulaiBekerja: string;
  kendaraanDimiliki: string;
  pernahSakitKeras: 'Ya' | 'Tidak' | '';
  detailSakitKeras: string;
  gangguanJasmani: string;
  kesehatanKeluargaBaik: 'Ya' | 'Tidak' | '';
  detailKesehatanKeluarga: string;
  alamatMediaSosial: string;

  // "Dapat informasi lowongan ini dari mana?" (Step 7) — Sheets col BK/BL
  sumberInfoLowongan: string;
  keteranganSumber: string;

  // Step 8: Referensi Kontak (WAJIB)
  referensiKontak: ReferensiKontak[]; // JSON column in Sheets
  kotaTgl: string;
  namaTerang: string;
}

// ─── Recruitment tracker + interviews ──────────────────────────────────────

export type VacancyPriority = 'Normal' | 'High';

export type VacancyStatus = 'Open' | 'On Hold' | 'Closed-Filled' | 'Closed-Unfilled';

export type InterviewStage = 'Interview HR' | 'Interview User';

export interface Interview {
  id: string;
  applicantId: string;
  candidateName: string;
  position: string;
  stage: InterviewStage;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  interviewer: string;
  location?: string;
  link?: string;
  notes?: string;
}

export interface ExtendedVacancy {
  title: string;
  category: string;
  location: string;
  salary: string;
  description: string;
  requirements: string[];
  archived?: boolean;
  user?: string;
  recruiter?: string;
  tanggalDibuka?: string;
  tanggalTerakhir?: string;
  tanggalSelesai?: string;
  priority?: VacancyPriority;
  jumlah?: string;
  gender?: string;
  status?: VacancyStatus;
}

// ─── Laporan Rekrutmen Harian ──────────────────────────────────────────────

export interface LaporanRekapItem {
  tanggal: string; // YYYY-MM-DD
  total: number;
  contentCreator: number;
  spvMarketing: number;
  adminInvestasi: number;
  sesuai: number;
  kurangSesuai: number;
  tidakSesuai: number;
  tidakDiverifikasi: number;
  dinilai: boolean;
}

export interface LaporanLegendaItem {
  status: string;
  keterangan: string;
}

export interface LaporanKandidatItem {
  id: string; // Deterministic & stable across refreshes
  tanggal: string; // YYYY-MM-DD
  nama: string;
  posisi: string;
  status: string;
  alasan: string;
  email: string;
  lamaranUlang: boolean;
  rekomendasiPosisi?: string; // Kolom Rekomendasi Posisi dari spreadsheet
  linkEmail: string; // Parsed URL from hyperlink
}

export interface LaporanPsikotesItem {
  id: string;
  no: string;
  tanggalSubmit: string; // e.g. "2026-11-12 13:59"
  nama: string;
  email: string;
  noHp: string;
  posisi: string;
  kelengkapan: string;
  skorD: number;
  skorI: number;
  skorS: number;
  skorC: number;
  gayaDominan: string;
  gayaPendukung: string;
  aspekTertinggi: string;
  aspekTerendah: string;
  catatan: string;
  isUjiCoba: boolean;
}

export interface LaporanHarianResponse {
  connected: boolean;
  fetchedAt: string;
  rekap: LaporanRekapItem[];
  legenda: LaporanLegendaItem[];
  kandidat: LaporanKandidatItem[];
  psikotes?: LaporanPsikotesItem[];
  psikotesPanduan?: string[];
  error?: string;
}

// ─── Budget Iklan Lowongan Kerja ──────────────────────────────────────────

export type JenisBiayaIklan = 'Berbayar' | 'Gratis' | 'Barter';

export interface BudgetIklan {
  id: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  posisi: string[];
  channel: string; // Salah satu dari SUMBER_OPTIONS
  namaMedia: string;
  jenisBiaya: JenisBiayaIklan;
  biaya: number; // Rupiah bulat
  jumlahPostingan: number;
  linkPostingan: string;
  kodeLacak: string;
  catatan: string;
  dibuatOleh: string;
  dibuatPada: string; // ISO 8601
  diubahPada: string; // ISO 8601
  diarsipkan: boolean;
}

export interface BudgetIklanResponse {
  connected: boolean;
  items: BudgetIklan[];
  error?: string;
}
