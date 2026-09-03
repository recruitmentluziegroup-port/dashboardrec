/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Anak {
  nama: string;
  ttl: string;
  pendidikan: string;
}

export interface Saudara {
  nama: string;
  kakakAdik: 'Kakak' | 'Adik' | '';
  usia: string;
  pendidikanPekerjaan: string;
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
  ttlPasangan: string;
  pendidikanPasangan: string;
  pekerjaanPasangan: string;
  anak: Anak[]; // JSON column in Sheets
  namaOrtu: string;
  alamatOrtu: string;
  pekerjaanOrtu: string;
  saudara: Saudara[]; // JSON column in Sheets

  // Step 3: Riwayat Pendidikan
  pendidikanFormal: PendidikanFormal[]; // JSON column in Sheets
  kursus: Kursus[]; // JSON column in Sheets

  // Step 4: Pengalaman Kerja
  pengalamanKerja: PengalamanKerja[]; // JSON column in Sheets
  referensiPerusahaan: ReferensiPerusahaan[]; // JSON column in Sheets
  jobdeskTerakhir: string;

  // Step 5: Minat & Konsep Diri
  jabatanDituju: string;
  alasanJabatan: string;
  pengetahuanJabatan: string;
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

  // Step 8: Referensi Kontak (WAJIB)
  referensiKontak: ReferensiKontak[]; // JSON column in Sheets
  kotaTgl: string;
  namaTerang: string;
}
