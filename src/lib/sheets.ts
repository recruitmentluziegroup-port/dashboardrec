import { google } from 'googleapis';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Applicant, ApplicationStatus, Interview, VacancyPriority, VacancyStatus, LaporanHarianResponse, LaporanRekapItem, LaporanLegendaItem, LaporanKandidatItem, BudgetIklan, BudgetIklanResponse, SUMBER_OPTIONS } from '../types';

// Columns mapping mapping to Google Sheets. Total 66 columns (BK/BL appended 2026-09;
// BM/BN appended 2026-10 for the birth-order pair).
//
// ⚠️ RETIRED SLOTS — DO NOT DELETE OR REORDER.
// The 6 columns below (idx 23, 24, 28, 30, 37, 38) had their candidate-facing
// inputs deleted. Their headers and positions are intentionally RETAINED so that
// every index >= 23 stays stable. That keeps all historical rows readable and
// keeps the independent index map in `api/status.ts` (match[13], match[36]) correct.
// These slots are written as blanks from now on; their data is retired, not hidden.
//   23 'TTL Pasangan'        28 'Alamat Orang Tua'   37 'Alasan Jabatan'
//   24 'Pendidikan Pasangan' 30 'Saudara (JSON)'     38 'Pengetahuan Jabatan'
// Removing them physically would shift 24..63 and silently mis-map every existing
// application. See the session notes in progress.md (2026-10-06).
const HEADERS = [
  'Applicant ID', 'Submission Date', 'Status', 'Last Updated',
  'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Kewarganegaraan',
  'Alamat Tempat Tinggal', 'Alamat KTP', 'Email Pribadi', 'No. Telp / HP',
  'Jenis Kelamin', 'Nomor KTP', 'SIM C', 'No SIM C', 'SIM A', 'No SIM A',
  'Agama', 'Golongan Darah', 'Status Pernikahan', 'Tanggal Status Pernikahan',
  'Nama Pasangan', 'TTL Pasangan', 'Pendidikan Pasangan', 'Pekerjaan Pasangan',
  'Anak (JSON)', 'Nama Orang Tua', 'Alamat Orang Tua', 'Pekerjaan Orang Tua',
  'Saudara (JSON)', 'Pendidikan Formal (JSON)', 'Kursus Training (JSON)',
  'Pengalaman Kerja (JSON)', 'Referensi Perusahaan (JSON)', 'Jobdesk Terakhir',
  'Jabatan Dituju', 'Alasan Jabatan', 'Pengetahuan Jabatan', 'Lingkungan Kerja',
  'Cita-cita', 'Kesulitan Keputusan', 'Hobby', 'Waktu Luang', 'Pernah Ke Luar Negeri',
  'Detail Kunjungan Luar Negeri', 'Organisasi (JSON)', 'Kekuatan Diri',
  'Kelemahan Diri', 'Gaji Diinginkan', 'Fasilitas Diharapkan', 'Dapat Mulai Bekerja',
  'Kendaraan Dimiliki', 'Pernah Sakit Keras', 'Detail Sakit Keras',
  'Gangguan Jasmani', 'Kesehatan Keluarga Baik', 'Detail Kesehatan Keluarga',
  'Alamat Media Sosial', 'Referensi Kontak (JSON)', 'Kota Tgl', 'Nama Terang',
  'Sumber Info Lowongan', 'Keterangan Sumber',
  // BM/BN — appended 2026-10. Headers must be typed manually into the live Sheet
  // (ensureHeaders() only writes when A1 is empty, so it will not add these).
  'Posisi Anak Ke', 'Jumlah Saudara Kandung'
];

let sheetsClient: any = null;
let cachedFirstSheetName: string | null = null;

export function getServiceAccountEmail(): string | null {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyEnv) return null;
  try {
    let decoded = keyEnv.trim();
    if (!decoded.startsWith('{')) {
      try {
        const potential = Buffer.from(decoded, 'base64').toString('utf8').trim();
        if (potential.startsWith('{')) {
          decoded = potential;
        }
      } catch {}
    }
    const credentials = JSON.parse(decoded);
    return credentials.client_email || null;
  } catch {
    return null;
  }
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!keyEnv || !sheetId) {
    console.warn('WARNING: GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEET_ID environment variables are missing.');
    return null;
  }

  try {
    let decodedKey = keyEnv.trim();
    
    // Check if base64 encoded
    if (!decodedKey.startsWith('{')) {
      try {
        const potentialDecoded = Buffer.from(decodedKey, 'base64').toString('utf8').trim();
        if (potentialDecoded.startsWith('{')) {
          decodedKey = potentialDecoded;
        }
      } catch (err) {
        // Not base64
      }
    }

    let credentials;
    if (decodedKey.startsWith('{')) {
      credentials = JSON.parse(decodedKey);
    } else {
      const cleanedKey = decodedKey.replace(/\\n/g, '\n');
      try {
        credentials = JSON.parse(cleanedKey);
      } catch (err: any) {
        throw new Error(`Could not parse service account key as JSON: ${err.message}`);
      }
    }

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Service account key is missing client_email or private_key.');
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    return null;
  }
}

export async function getFirstSheetName(sheets: any, spreadsheetId: string): Promise<string> {
  if (cachedFirstSheetName) return cachedFirstSheetName;
  try {
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId
    });
    if (sheetMeta.data.sheets && sheetMeta.data.sheets.length > 0) {
      const firstSheetTitle = sheetMeta.data.sheets[0].properties.title;
      if (firstSheetTitle) {
        cachedFirstSheetName = firstSheetTitle;
        console.log(`Dynamically detected first sheet tab name: "${firstSheetTitle}"`);
        return firstSheetTitle;
      }
    }
  } catch (error) {
    console.error('Failed to dynamically fetch sheet tabs, defaulting to Sheet1:', error);
  }
  return 'Sheet1';
}

// Converts a typed Applicant object to a raw array of strings/numbers
function applicantToRow(app: Applicant): any[] {
  return [
    app.id || '',
    app.submissionDate || '',
    app.status || 'Pending',
    app.lastUpdated || '',
    app.namaLengkap || '',
    app.tempatLahir || '',
    app.tanggalLahir || '',
    app.kewarganegaraan || 'Indonesia',
    app.alamatTinggal || '',
    app.alamatKtp || '',
    app.emailPribadi || '',
    app.noTelp || '',
    app.jenisKelamin || '',
    app.nomorKtp || '',
    app.simC ? 'Ya' : 'Tidak',
    app.noSimC || '',
    app.simA ? 'Ya' : 'Tidak',
    app.noSimA || '',
    app.agama || '',
    app.golonganDarah || '',
    app.statusPernikahan || '',
    app.tanggalStatusPernikahan || '',
    app.namaPasangan || '',
    '', // idx 23 — RETIRED: TTL Pasangan (slot kept for index stability)
    '', // idx 24 — RETIRED: Pendidikan Pasangan
    app.pekerjaanPasangan || '',
    JSON.stringify(app.anak || []),
    app.namaOrtu || '',
    '', // idx 28 — RETIRED: Alamat Orang Tua
    app.pekerjaanOrtu || '',
    '[]', // idx 30 — RETIRED: Saudara (JSON)
    JSON.stringify(app.pendidikanFormal || []),
    JSON.stringify(app.kursus || []),
    JSON.stringify(app.pengalamanKerja || []),
    JSON.stringify(app.referensiPerusahaan || []),
    app.jobdeskTerakhir || '',
    app.jabatanDituju || '',
    '', // idx 37 — RETIRED: Alasan Jabatan
    '', // idx 38 — RETIRED: Pengetahuan Jabatan
    app.lingkunganKerja || '',
    app.citaCita || '',
    app.kesulitanKeputusan || '',
    app.hobby || '',
    app.waktuLuang || '',
    app.pernahKeLuarNegeri || '',
    app.detailKunjunganLuarNegeri || '',
    JSON.stringify(app.organisasi || []),
    app.kekuatanDiri || '',
    app.kelemahanDiri || '',
    app.gajiDiinginkan || '',
    app.fasilitasDiharapkan || '',
    app.dapatMulaiBekerja || '',
    app.kendaraanDimiliki || '',
    app.pernahSakitKeras || '',
    app.detailSakitKeras || '',
    app.gangguanJasmani || '',
    app.kesehatanKeluargaBaik || '',
    app.detailKesehatanKeluarga || '',
    app.alamatMediaSosial || '',
    JSON.stringify(app.referensiKontak || []),
    app.kotaTgl || '',
    app.namaTerang || '',
    app.sumberInfoLowongan || '',
    app.keteranganSumber || '',
    // BM/BN — appended 2026-10; short historical rows fall back to blank
    app.anakKe || '',
    app.jumlahSaudara || ''
  ];
}

// Safely parses continuous values inside arrays, objects or strings.
function parseJsonSafe<T>(jsonStr: any, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

// Converts a raw row array back to typed Applicant object
function rowToApplicant(row: any[]): Applicant {
  return {
    id: row[0] || '',
    submissionDate: row[1] || '',
    status: (row[2] || 'Pending') as ApplicationStatus,
    lastUpdated: row[3] || '',
    namaLengkap: row[4] || '',
    tempatLahir: row[5] || '',
    tanggalLahir: row[6] || '',
    kewarganegaraan: row[7] || '',
    alamatTinggal: row[8] || '',
    alamatKtp: row[9] || '',
    alamatKtpSama: row[8] === row[9],
    emailPribadi: row[10] || '',
    noTelp: row[11] || '',
    jenisKelamin: (row[12] || '') as 'Laki-laki' | 'Perempuan' | '',
    nomorKtp: row[13] || '',
    simC: row[14] === 'Ya',
    noSimC: row[15] || '',
    simA: row[16] === 'Ya',
    noSimA: row[17] || '',
    agama: row[18] || '',
    golonganDarah: row[19] || '',
    statusPernikahan: (row[20] || '') as 'Single' | 'Tunangan' | 'Menikah' | 'Bercerai' | '',
    tanggalStatusPernikahan: row[21] || '',
    namaPasangan: row[22] || '',
    // idx 23, 24 — RETIRED (TTL Pasangan, Pendidikan Pasangan): read but discarded.
    pekerjaanPasangan: row[25] || '',
    anak: parseJsonSafe(row[26], []),
    namaOrtu: row[27] || '',
    // idx 28 — RETIRED (Alamat Orang Tua): read but discarded.
    pekerjaanOrtu: row[29] || '',
    // idx 30 — RETIRED (Saudara JSON): no longer surfaced.
    pendidikanFormal: parseJsonSafe(row[31], []),
    kursus: parseJsonSafe(row[32], []),
    pengalamanKerja: parseJsonSafe(row[33], []),
    referensiPerusahaan: parseJsonSafe(row[34], []),
    jobdeskTerakhir: row[35] || '',
    jabatanDituju: row[36] || '',
    // idx 37, 38 — RETIRED (Alasan Jabatan, Pengetahuan Jabatan).
    lingkunganKerja: row[39] || '',
    citaCita: row[40] || '',
    kesulitanKeputusan: row[41] || '',
    hobby: row[42] || '',
    waktuLuang: row[43] || '',
    pernahKeLuarNegeri: (row[44] || '') as 'Ya' | 'Tidak' | '',
    detailKunjunganLuarNegeri: row[45] || '',
    organisasi: parseJsonSafe(row[46], []),
    kekuatanDiri: row[47] || '',
    kelemahanDiri: row[48] || '',
    gajiDiinginkan: row[49] || '',
    fasilitasDiharapkan: row[50] || '',
    dapatMulaiBekerja: row[51] || '',
    kendaraanDimiliki: row[52] || '',
    pernahSakitKeras: (row[53] || '') as 'Ya' | 'Tidak' | '',
    detailSakitKeras: row[54] || '',
    gangguanJasmani: row[55] || '',
    kesehatanKeluargaBaik: (row[56] || '') as 'Ya' | 'Tidak' | '',
    detailKesehatanKeluarga: row[57] || '',
    alamatMediaSosial: row[58] || '',
    referensiKontak: parseJsonSafe(row[59], []),
    kotaTgl: row[60] || '',
    namaTerang: row[61] || '',
    // BK/BL — appended 2026-09; short historical rows fall back to blank
    sumberInfoLowongan: row[62] || '',
    keteranganSumber: row[63] || '',
    // BM/BN — appended 2026-10; short historical rows fall back to blank
    anakKe: row[64] || '',
    jumlahSaudara: row[65] || ''
  };
}

// Ensures sheet headers are in place on recruitment database
async function ensureHeaders(sheets: any, spreadsheetId: string) {
  try {
    const sheetTitle = await getFirstSheetName(sheets, spreadsheetId);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A1:A1`
    });

    if (!res.data.values || res.data.values.length === 0) {
      console.log(`Sheet "${sheetTitle}" is empty. Writing headers row...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [HEADERS]
        }
      });
    }
  } catch (error) {
    console.error('Failed to write headers to the sheet:', error);
  }
}

let cachedApplicants: Applicant[] | null = null;

function readLocalApplicants(): Applicant[] {
  try {
    const filePath = path.join(process.cwd(), 'src/data/applicants.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // File not accessible or invalid
  }
  return [];
}

function saveLocalApplicants(applicants: Applicant[]): void {
  try {
    const filePath = path.join(process.cwd(), 'src/data/applicants.json');
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(applicants, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist local applicants file:', err);
  }
}

export async function appendRow(applicant: Applicant): Promise<{ success: boolean; error?: string }> {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (keyEnv && keyEnv.trim().includes('@') && !keyEnv.trim().includes('{')) {
    return {
      success: false,
      error: 'Kesalahan Konfigurasi: Anda memasukkan ALAMAT EMAIL Service Account ke variabel GOOGLE_SERVICE_ACCOUNT_KEY. Yang benar adalah SELURUH isi file JSON Key Service Account yang Anda unduh dari Google Cloud Console (berisi private_key, project_id, dll, diawali dengan kurung kurawal \'{\'). Silakan ganti nilainya di menu Secrets.'
    };
  }

  const sheets = getSheetsClient();

  // Local dev / unconfigured fallback — store in memory and JSON file
  if (!sheets || !spreadsheetId) {
    const list = await getAllRows();
    const existingIdx = list.findIndex(a => a.id === applicant.id);
    if (existingIdx >= 0) {
      list[existingIdx] = applicant;
    } else {
      list.unshift(applicant);
    }
    cachedApplicants = list;
    saveLocalApplicants(list);
    console.log(`[AI Studio] Saved applicant ${applicant.id} (${applicant.namaLengkap}) to local fallback store.`);
    return { success: true };
  }

  try {
    const sheetTitle = await getFirstSheetName(sheets, spreadsheetId);
    await ensureHeaders(sheets, spreadsheetId);

    const row = applicantToRow(applicant);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTitle}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row]
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error appending row to Google Sheet, saving to local store:', error);
    
    // Fall back to local store on failure so user actions are never lost
    const list = await getAllRows();
    list.unshift(applicant);
    cachedApplicants = list;
    saveLocalApplicants(list);
    return { success: true };
  }
}

export async function getAllRows(): Promise<Applicant[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Local fallback if sheets client or ID not configured
  if (!sheets || !spreadsheetId) {
    if (cachedApplicants) return cachedApplicants;
    const local = readLocalApplicants();
    cachedApplicants = local;
    return local;
  }

  try {
    const sheetTitle = await getFirstSheetName(sheets, spreadsheetId);
    await ensureHeaders(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A2:ZZ` // read from Row 2 downwards
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const fetched = rows.map((row: any[]) => rowToApplicant(row)).filter((a: Applicant) => a.id !== '');
    cachedApplicants = fetched;
    return fetched;
  } catch (error) {
    console.error('Error reading rows from Google Sheet, falling back to local store:', error);
    if (cachedApplicants) return cachedApplicants;
    const fallback = readLocalApplicants();
    cachedApplicants = fallback;
    return fallback;
  }
}

export async function getRowById(id: string): Promise<Applicant | null> {
  const applicants = await getAllRows();
  const match = applicants.find(a => a.id === id);
  return match || null;
}

export async function updateRow(id: string, updatedFields: Partial<Applicant>): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const applicants = await getAllRows();
    const index = applicants.findIndex(a => a.id === id);
    if (index === -1) {
      console.error(`Applicant with ID ${id} not found in local store`);
      return false;
    }
    const current = applicants[index];
    const updated: Applicant = {
      ...current,
      ...updatedFields,
      lastUpdated: new Date().toISOString()
    };
    applicants[index] = updated;
    cachedApplicants = applicants;
    saveLocalApplicants(applicants);
    return true;
  }

  try {
    const sheetTitle = await getFirstSheetName(sheets, spreadsheetId);
    const applicants = await getAllRows();
    const index = applicants.findIndex(a => a.id === id);

    if (index === -1) {
      console.error(`Applicant with ID ${id} not found to update`);
      return false;
    }

    const current = applicants[index];
    const updated: Applicant = {
      ...current,
      ...updatedFields,
      lastUpdated: new Date().toISOString()
    };

    const rowValues = applicantToRow(updated);
    // Row 1 is header, index 0 is row 2, so the Google Sheets row is index + 2
    const sheetRowNumber = index + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A${sheetRowNumber}:ZZ${sheetRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowValues]
      }
    });

    return true;
  } catch (error) {
    console.error(`Error updating row for ID ${id}:`, error);
    // Update local cache as fallback
    const applicants = await getAllRows();
    const index = applicants.findIndex(a => a.id === id);
    if (index !== -1) {
      applicants[index] = { ...applicants[index], ...updatedFields, lastUpdated: new Date().toISOString() };
      cachedApplicants = applicants;
      saveLocalApplicants(applicants);
      return true;
    }
    return false;
  }
}

// ─── Vacancy Storage ─────────────────────────────────────────────────────────
// Vacancies are stored in a dedicated "Vacancies" tab in the same Google Sheet.
// Falls back to src/data/vacancies.json for local dev if Sheets env vars aren't set.

export interface Vacancy {
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

const VACANCY_TAB = 'Vacancies';
const VACANCY_HEADERS = ['Title', 'Category', 'Location', 'Salary', 'Description', 'Requirements (JSON)', 'Archived', 'User', 'Recruiter', 'Tanggal Dibuka', 'Tanggal Terakhir', 'Tanggal Selesai', 'Priority', 'Jumlah', 'Gender', 'Status'];

// Hardcoded seed vacancies — used as fallback when Google Sheets is unavailable
// or the Vacancies tab is empty on first deploy. Mirrors src/data/vacancies.json.
const SEED_VACANCIES: Vacancy[] = [
  {
    title: 'Personal Assistant',
    category: 'Administrative Support',
    location: 'Solo / WFH (Remote Indonesia)',
    salary: 'Rp 3.5jt - Rp 5.0jt / bln',
    description: 'Mengelola jadwal harian pimpinan, mengoordinasikan dokumen/surat perusahaan, menyusun agenda rapat, serta memberikan dukungan administratif perkantoran secara rahasia, tertib, dan andal.',
    requirements: [
      'Minimal lulusan D3/S1 sekalian jurusan (diutamakan Administrasi Perkantoran / Sekretaris)',
      'Sangat fasih mengoperasikan Google Workspace (Sheets, Docs, Slides, Google Calendar)',
      'Memiliki keterampilan komunikasi verbal & tertulis yang rapi, ramah, dan cakap'
    ],
    user: '',
    recruiter: 'All',
    tanggalDibuka: '',
    tanggalTerakhir: '',
    tanggalSelesai: '',
    priority: 'Normal',
    jumlah: '1',
    gender: '',
    status: 'Open'
  },
  {
    title: 'Digital Marketer Specialist',
    category: 'Marketing & Conversion Optimization',
    location: 'Purwokerto (On-site / WFO)',
    salary: 'Rp 4.0jt - Rp 6.0jt / bln',
    description: 'Mengonsep, mengeksekusi, dan menjasmani kampanye paid traffic (Facebook Ads, TikTok Ads, Google Ads), menganalisis budget iklan, serta menjaga rasio efisiensi ROAS bisnis eksekutif.',
    requirements: [
      'Pengalaman kerja langsung minimal 1-2 tahun sebagai Media Buyer / Digital Advertiser',
      'Mahir mengulik platform Google Analytics, Facebook Pixel, serta konversi landing page',
      'Memiliki nalar psikologi copywriting penawaran tinggi yang menarik minat beli'
    ],
    user: '',
    recruiter: 'All',
    tanggalDibuka: '',
    tanggalTerakhir: '',
    tanggalSelesai: '',
    priority: 'Normal',
    jumlah: '1',
    gender: '',
    status: 'Open'
  },
  {
    title: 'CEO & Founder Personal Assistant',
    category: 'Executive Office Operations',
    location: 'Purwokerto (On-site / WFO)',
    salary: 'Rp 6.0jt - Rp 10.0jt / bln',
    description: 'Bertindak sebagai asisten eksekutif utama Founder Luzie Group untuk mengawal implementasi proyek strategis, memonitor status target KPI tim, serta mendampingi kunjungan bisnis pimpinan.',
    requirements: [
      'Gelar S1 terkemuka (Manajemen, Bisnis, Hubungan Internasional, atau Hukum disukai)',
      'Fasih berkomunikasi dalam Bahasa Inggris aktif lisan & tulisan tingkat mahir',
      'Daya pikir analitis taktis, integritas prima, serta siap untuk dinas luar kota sewaktu-waktu'
    ],
    user: '',
    recruiter: 'All',
    tanggalDibuka: '',
    tanggalTerakhir: '',
    tanggalSelesai: '',
    priority: 'Normal',
    jumlah: '1',
    gender: '',
    status: 'Open'
  },
  {
    title: 'Social Media Management',
    category: 'Creative Design & Content Strategy',
    location: 'Solo / WFH (Remote Indonesia)',
    salary: 'Rp 4.0jt - Rp 6.0jt / bln',
    description: 'Merancang ide konten mingguan kreatif, memproduksi dan menyunting video pendek (Reels, TikTok & Shorts), merias caption, serta membangun interaksi organik komunitas brand Luzie.',
    requirements: [
      'Keahlian tinggi mengoperasikan editor video CapCut, Premiere Pro, atau Adobe After Effects',
      'Mengikuti update tren konten visual, audio, serta cara kerja algoritma media sosial terbaru',
      'Wajib melampirkan portofolio kumpulan karya konten kreatif media sosial Anda'
    ],
    user: '',
    recruiter: 'All',
    tanggalDibuka: '',
    tanggalTerakhir: '',
    tanggalSelesai: '',
    priority: 'Normal',
    jumlah: '1',
    gender: '',
    status: 'Open'
  }
];

let cachedVacancies: Vacancy[] | null = null;

function readLocalVacancies(): Vacancy[] {
  // Try reading from the JSON file first (local dev), then fall back to the seed constant
  try {
    const filePath = path.join(process.cwd(), 'src/data/vacancies.json');
    if (fs.existsSync(filePath)) {
      const data: Vacancy[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data.map(v => {
        const isArchived = v.archived === true || String(v.archived).toLowerCase() === 'true';
        let status = v.status;
        if (!isArchived && (status === 'Closed-Filled' || status === 'Closed-Unfilled')) {
          status = 'Open';
        }
        return {
          ...v,
          archived: isArchived,
          status: (status || (isArchived ? 'Closed-Filled' : 'Open')) as VacancyStatus
        };
      });
    }
  } catch {
    // File not accessible (e.g. Vercel serverless) — use embedded seed
  }
  return SEED_VACANCIES;
}

async function ensureVacancyTab(sheets: any, spreadsheetId: string): Promise<void> {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = (meta.data.sheets ?? []).some(
      (s: any) => s.properties?.title === VACANCY_TAB
    );
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: VACANCY_TAB } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${VACANCY_TAB}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [VACANCY_HEADERS] }
      });
    }
  } catch (error) {
    console.error('Error ensuring Vacancies tab:', error);
  }
}

export async function getVacancies(): Promise<Vacancy[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Local dev fallback
  if (!sheets || !spreadsheetId) {
    if (cachedVacancies) return cachedVacancies;
    const local = readLocalVacancies();
    cachedVacancies = local;
    return local;
  }

  try {
    await ensureVacancyTab(sheets, spreadsheetId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${VACANCY_TAB}!A2:P`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      // Tab is empty on first deploy — seed from the committed JSON file
      const local = readLocalVacancies();
      if (local.length > 0) await saveVacancies(local);
      cachedVacancies = local;
      return local;
    }

    const fetched = rows.map((row: any[]) => {
      const isArchived = row[6] === 'true' || String(row[6]).toLowerCase() === 'true';
      let status = (row[15] || (isArchived ? 'Closed-Filled' : 'Open')) as VacancyStatus;
      if (!isArchived && (status === 'Closed-Filled' || status === 'Closed-Unfilled')) {
        status = 'Open';
      }
      return {
        title: row[0] || '',
        category: row[1] || '',
        location: row[2] || '',
        salary: row[3] || '',
        description: row[4] || '',
        requirements: parseJsonSafe<string[]>(row[5], []),
        archived: isArchived,
        user: row[7] || '',
        recruiter: row[8] || '',
        tanggalDibuka: normalizeSheetDate(row[9]),
        tanggalTerakhir: normalizeSheetDate(row[10]),
        tanggalSelesai: normalizeSheetDate(row[11]),
        priority: (row[12] || 'Normal') as VacancyPriority,
        jumlah: row[13] || '',
        gender: row[14] || '',
        status
      };
    }).filter((v: any) => v.title.trim() !== '');

    cachedVacancies = fetched;
    return fetched;
  } catch (error) {
    console.error('Error reading vacancies from Sheets:', error);
    if (cachedVacancies) return cachedVacancies;
    const fallback = readLocalVacancies();
    cachedVacancies = fallback;
    return fallback;
  }
}

export async function saveVacancies(vacancies: Vacancy[]): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Clean and normalize status / archived synchronization
  const normalized: Vacancy[] = vacancies.map(v => {
    const isArchived = v.archived === true || String(v.archived).toLowerCase() === 'true';
    let status = v.status;
    if (isArchived) {
      if (status !== 'Closed-Unfilled') status = 'Closed-Filled';
    } else {
      if (!status || status === 'Closed-Filled' || status === 'Closed-Unfilled') {
        status = 'Open';
      }
    }
    return {
      ...v,
      archived: isArchived,
      status: status as VacancyStatus
    };
  });

  // Keep memory cache in sync immediately
  cachedVacancies = normalized;

  // Local dev fallback — write directly to the JSON file
  if (!sheets || !spreadsheetId) {
    try {
      const filePath = path.join(process.cwd(), 'src/data/vacancies.json');
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
      console.log('Successfully saved vacancies locally to src/data/vacancies.json');
      return true;
    } catch (err) {
      console.warn('Failed to write local vacancies file (might be Vercel serverless):', err);
      // Return true anyway if we updated the memory cache, so the UI behaves correctly
      return true;
    }
  }

  try {
    await ensureVacancyTab(sheets, spreadsheetId);

    const rows = normalized.map(v => [
      v.title,
      v.category,
      v.location,
      v.salary,
      v.description,
      JSON.stringify(v.requirements || []),
      v.archived ? 'true' : 'false',
      v.user || '',
      v.recruiter || '',
      v.tanggalDibuka || '',
      v.tanggalTerakhir || '',
      v.tanggalSelesai || '',
      v.priority || 'Normal',
      v.jumlah || '',
      v.gender || '',
      v.status || 'Open'
    ]);

    // Clear all data rows (preserve header in row 1) then rewrite
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${VACANCY_TAB}!A2:P`
    });
    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${VACANCY_TAB}!A2`,
        valueInputOption: 'RAW',
        requestBody: { values: rows }
      });
    }
    return true;
  } catch (error) {
    console.error('Error saving vacancies to Sheets:', error);
    return false;
  }
}

// ─── Tracker Posisi Storage ────────────────────────────────────────────────
// Decoupled from Vacancies. Own "Trackers" tab (ID + 11 tracker fields).
// Local dev fallback persists to src/data/trackers.json (starts empty).

export interface TrackerItem {
  id: string;
  title: string;
  category: string;
  user: string;
  recruiter: string;
  tanggalDibuka: string;
  tanggalTerakhir: string;
  tanggalSelesai: string;
  priority?: VacancyPriority;
  jumlah?: string;
  gender?: string;
  status?: VacancyStatus;
}

const TRACKER_TAB = 'Trackers';
const TRACKER_HEADERS = ['ID', 'Title', 'Category', 'User', 'Recruiter', 'Tanggal Dibuka', 'Tanggal Terakhir', 'Tanggal Selesai', 'Priority', 'Jumlah', 'Gender', 'Status'];

let cachedTrackers: TrackerItem[] | null = null;

function readLocalTrackers(): TrackerItem[] {
  try {
    const filePath = path.join(process.cwd(), 'src/data/trackers.json');
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // File not accessible — fall through to empty list
  }
  return [];
}

// Normalize a date cell coming back from Google Sheets into YYYY-MM-DD.
// Mirrors normalizeSheetDate in api/admin/vacancies.ts (kept self-contained there
// because Vercel serverless functions cannot import from src/lib at runtime).
function normalizeSheetDate(v: any): string {
  if (v === undefined || v === null) return '';
  const s = String(v).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 20000 && n < 80000) return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
    return s;
  }
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const mon = Number(dmy[2]);
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return `${dmy[3]}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 1900 && y <= 2200) {
      return `${y}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
  }
  return s;
}

function trackerToRow(t: TrackerItem): any[] {
  return [
    t.id || '', t.title || '', t.category || '', t.user || '', t.recruiter || '',
    t.tanggalDibuka || '', t.tanggalTerakhir || '', t.tanggalSelesai || '',
    t.priority || 'Normal', t.jumlah || '', t.gender || '', t.status || 'Open'
  ];
}

function rowToTracker(row: any[]): TrackerItem {
  return {
    id: row[0] || '',
    title: row[1] || '',
    category: row[2] || '',
    user: row[3] || '',
    recruiter: row[4] || '',
    tanggalDibuka: normalizeSheetDate(row[5]),
    tanggalTerakhir: normalizeSheetDate(row[6]),
    tanggalSelesai: normalizeSheetDate(row[7]),
    priority: (row[8] || 'Normal') as VacancyPriority,
    jumlah: row[9] || '',
    gender: row[10] || '',
    status: (row[11] || 'Open') as VacancyStatus
  };
}

async function ensureTrackerTab(sheets: any, spreadsheetId: string): Promise<void> {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = (meta.data.sheets ?? []).some(
      (s: any) => s.properties?.title === TRACKER_TAB
    );
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: TRACKER_TAB } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TRACKER_TAB}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [TRACKER_HEADERS] }
      });
    }
  } catch (error) {
    console.error('Error ensuring Trackers tab:', error);
  }
}

export async function getTrackers(): Promise<TrackerItem[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Local dev fallback — persisted JSON file, starts empty (no seeding)
  if (!sheets || !spreadsheetId) {
    if (cachedTrackers) return cachedTrackers;
    const local = readLocalTrackers();
    cachedTrackers = local;
    return local;
  }

  try {
    await ensureTrackerTab(sheets, spreadsheetId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TRACKER_TAB}!A2:L`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      cachedTrackers = [];
      return cachedTrackers;
    }

    const fetched = rows.map((row: any[]) => rowToTracker(row))
      .filter((t: TrackerItem) => t.id !== '' || t.title.trim() !== '');
    cachedTrackers = fetched;
    return fetched;
  } catch (error) {
    console.error('Error reading trackers from Sheets:', error);
    if (cachedTrackers) return cachedTrackers;
    const fallback = readLocalTrackers();
    cachedTrackers = fallback;
    return fallback;
  }
}

export async function saveTrackers(trackers: TrackerItem[]): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Update memory cache — reset first to force re-fetch on next getTrackers() call
  cachedTrackers = null;

  // Local dev fallback — write directly to the JSON file
  if (!sheets || !spreadsheetId) {
    try {
      const filePath = path.join(process.cwd(), 'src/data/trackers.json');
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(trackers, null, 2), 'utf-8');
      console.log('Successfully saved trackers locally to src/data/trackers.json');
      return true;
    } catch (err) {
      console.warn('Failed to write local trackers file (might be Vercel serverless):', err);
      return true;
    }
  }

  try {
    await ensureTrackerTab(sheets, spreadsheetId);

    const rows = trackers.map(trackerToRow);

    // Clear all data rows (preserve header in row 1) then rewrite
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${TRACKER_TAB}!A2:L`
    });
    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TRACKER_TAB}!A2`,
        valueInputOption: 'RAW',
        requestBody: { values: rows }
      });
    }
    return true;
  } catch (error) {
    console.error('Error saving trackers to Sheets:', error);
    return false;
  }
}

// ─── Interview Storage ───────────────────────────────────────────────────────
// Interviews are stored in a dedicated "Interviews" tab in the same Google Sheet.
// Local dev fallback keeps them in memory (no committed JSON seed).

export const INTERVIEW_TAB = 'Interviews';
export const INTERVIEW_HEADERS = ['ID', 'Applicant ID', 'Candidate Name', 'Position', 'Stage', 'Date', 'Start Time', 'End Time', 'Interviewer', 'Location', 'Link', 'Notes'];

let cachedInterviews: Interview[] | null = null;

function interviewToRow(iv: Interview): any[] {
  return [
    iv.id || '',
    iv.applicantId || '',
    iv.candidateName || '',
    iv.position || '',
    iv.stage || '',
    iv.date || '',
    iv.startTime || '',
    iv.endTime || '',
    iv.interviewer || '',
    iv.location || '',
    iv.link || '',
    iv.notes || ''
  ];
}

function rowToInterview(row: any[]): Interview {
  return {
    id: row[0] || '',
    applicantId: row[1] || '',
    candidateName: row[2] || '',
    position: row[3] || '',
    stage: (row[4] || 'Interview HR') as Interview['stage'],
    date: row[5] || '',
    startTime: row[6] || '',
    endTime: row[7] || '',
    interviewer: row[8] || '',
    location: row[9] || '',
    link: row[10] || '',
    notes: row[11] || ''
  };
}

async function ensureInterviewTab(sheets: any, spreadsheetId: string): Promise<void> {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = (meta.data.sheets ?? []).some(
      (s: any) => s.properties?.title === INTERVIEW_TAB
    );
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: INTERVIEW_TAB } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${INTERVIEW_TAB}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [INTERVIEW_HEADERS] }
      });
    }
  } catch (error) {
    console.error('Error ensuring Interviews tab:', error);
  }
}

export async function getInterviews(): Promise<Interview[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Local dev fallback — in-memory only
  if (!sheets || !spreadsheetId) {
    if (cachedInterviews) return cachedInterviews;
    cachedInterviews = [];
    return cachedInterviews;
  }

  try {
    await ensureInterviewTab(sheets, spreadsheetId);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${INTERVIEW_TAB}!A2:L`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      cachedInterviews = [];
      return cachedInterviews;
    }

    const fetched = rows.map((row: any[]) => rowToInterview(row)).filter((iv: Interview) => iv.id !== '');
    cachedInterviews = fetched;
    return fetched;
  } catch (error) {
    console.error('Error reading interviews from Sheets:', error);
    if (cachedInterviews) return cachedInterviews;
    cachedInterviews = [];
    return cachedInterviews;
  }
}

export async function appendInterview(data: Omit<Interview, 'id'>): Promise<Interview> {
  const interview: Interview = {
    ...data,
    id: `INT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  };

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Local dev fallback — in-memory only
  if (!sheets || !spreadsheetId) {
    const list = await getInterviews();
    list.push(interview);
    cachedInterviews = list;
    return interview;
  }

  await ensureInterviewTab(sheets, spreadsheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${INTERVIEW_TAB}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [interviewToRow(interview)] }
  });
  cachedInterviews = null;
  return interview;
}

export async function updateInterview(id: string, updatedFields: Partial<Interview>): Promise<Interview | null> {
  const list = await getInterviews();
  const index = list.findIndex(iv => iv.id === id);
  if (index === -1) return null;

  const updated: Interview = { ...list[index], ...updatedFields, id };
  list[index] = updated;

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Local dev fallback — in-memory only
  if (!sheets || !spreadsheetId) {
    cachedInterviews = list;
    return updated;
  }

  try {
    const sheetRowNumber = index + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${INTERVIEW_TAB}!A${sheetRowNumber}:L${sheetRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [interviewToRow(updated)] }
    });
    cachedInterviews = null;
    return updated;
  } catch (error) {
    console.error(`Error updating interview ${id}:`, error);
    return null;
  }
}

export async function deleteInterview(id: string): Promise<boolean> {
  const list = await getInterviews();
  const filtered = list.filter(iv => iv.id !== id);
  if (filtered.length === list.length) return false;

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Local dev fallback — in-memory only
  if (!sheets || !spreadsheetId) {
    cachedInterviews = filtered;
    return true;
  }

  try {
    await ensureInterviewTab(sheets, spreadsheetId);
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${INTERVIEW_TAB}!A2:L`
    });
    if (filtered.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${INTERVIEW_TAB}!A2`,
        valueInputOption: 'RAW',
        requestBody: { values: filtered.map(interviewToRow) }
      });
    }
    cachedInterviews = null;
    return true;
  } catch (error) {
    console.error(`Error deleting interview ${id}:`, error);
    return false;
  }
}

function toMin(t: string): number {
  const [h, m] = String(t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Overlap = same date + intersecting [startTime, endTime) + same interviewer or same applicant.
export function hasInterviewOverlap(list: Interview[], candidate: Omit<Interview, 'id'> & { id?: string }, excludeId?: string): boolean {
  const s = toMin(candidate.startTime);
  const e = toMin(candidate.endTime);
  return list.some(iv => {
    if (excludeId && iv.id === excludeId) return false;
    if (candidate.id && iv.id === candidate.id) return false;
    if (!iv.date || iv.date !== candidate.date) return false;
    const sameInterviewer = iv.interviewer && candidate.interviewer && iv.interviewer === candidate.interviewer;
    const sameApplicant = (iv.applicantId && candidate.applicantId && iv.applicantId === candidate.applicantId) || false;
    if (!sameInterviewer && !sameApplicant) return false;
    const os = toMin(iv.startTime);
    const oe = toMin(iv.endTime);
    return s < oe && os < e;
  });
}

// ─── Laporan Rekrutmen Harian Storage ───────────────────────────────────────
// Dedicated read-only Google Sheet (LAPORAN_SHEET_ID, fallback 1ef0gwvtYYMbOMG6Pt7D2rBnMJ2MTdnpaKrZsaP9B9TA).
// Two tabs: "Rekap Harian" (daily metrics + legend) and "Detail Kandidat" (candidate records + email link).

const DEFAULT_LAPORAN_SHEET_ID = '1ef0gwvtYYMbOMG6Pt7D2rBnMJ2MTdnpaKrZsaP9B9TA';
let laporanSheetsClient: any = null;
let cachedLaporan: { data: LaporanHarianResponse; timestamp: number } | null = null;
const LAPORAN_CACHE_TTL_MS = 60 * 1000;

function cleanLaporanText(v: any): string {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
}

function parseLaporanNum(v: any): number {
  if (v === undefined || v === null) return 0;
  const s = cleanLaporanText(v).replace(/[^\d-]/g, '');
  if (!s) return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function extractHyperlinkUrl(raw: string): string {
  if (!raw) return '';
  const match = raw.match(/=HYPERLINK\(\s*["']([^"']+)["']/i);
  if (match) return match[1].trim();
  if (/^https?:\/\//i.test(raw)) return raw.trim();
  const htmlMatch = raw.match(/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/i);
  if (htmlMatch) return htmlMatch[1].trim();
  return '';
}

function getLaporanSheetsClient() {
  if (laporanSheetsClient) return laporanSheetsClient;

  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyEnv) return null;

  try {
    let decodedKey = keyEnv.trim();
    if (!decodedKey.startsWith('{')) {
      try {
        const potentialDecoded = Buffer.from(decodedKey, 'base64').toString('utf8').trim();
        if (potentialDecoded.startsWith('{')) {
          decodedKey = potentialDecoded;
        }
      } catch {}
    }

    let credentials;
    if (decodedKey.startsWith('{')) {
      credentials = JSON.parse(decodedKey);
    } else {
      const cleanedKey = decodedKey.replace(/\\n/g, '\n');
      credentials = JSON.parse(cleanedKey);
    }

    if (!credentials.client_email || !credentials.private_key) {
      return null;
    }

    // Use read-only scope for Laporan
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    laporanSheetsClient = google.sheets({ version: 'v4', auth });
    return laporanSheetsClient;
  } catch (error) {
    console.error('Error initializing Laporan Sheets client:', error);
    return null;
  }
}

function readLocalLaporan(): LaporanHarianResponse | null {
  try {
    const filePath = path.join(process.cwd(), 'src/data/laporan_cache.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rekap) && Array.isArray(parsed.kandidat)) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export async function getLaporan(forceRefresh = false): Promise<LaporanHarianResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedLaporan && now - cachedLaporan.timestamp < LAPORAN_CACHE_TTL_MS) {
    return cachedLaporan.data;
  }

  const spreadsheetId = process.env.LAPORAN_SHEET_ID || DEFAULT_LAPORAN_SHEET_ID;
  const clientEmail = getServiceAccountEmail();
  const sheets = getLaporanSheetsClient();

  // Local fallback if no service account credentials
  if (!sheets) {
    const local = readLocalLaporan();
    if (local) {
      const payload: LaporanHarianResponse = {
        connected: true,
        fetchedAt: local.fetchedAt || new Date().toISOString(),
        rekap: local.rekap,
        legenda: local.legenda,
        kandidat: local.kandidat,
      };
      cachedLaporan = { data: payload, timestamp: now };
      return payload;
    }
    return {
      connected: false,
      fetchedAt: new Date().toISOString(),
      rekap: [],
      legenda: [],
      kandidat: [],
      error: 'Kredensial Service Account belum dikonfigurasi.',
    };
  }

  try {
    // 1. Verify sheet metadata & check tabs exist
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles: string[] = (meta.data.sheets ?? []).map((s: any) => s.properties?.title || '');
    if (!sheetTitles.includes('Rekap Harian') || !sheetTitles.includes('Detail Kandidat')) {
      return {
        connected: false,
        fetchedAt: new Date().toISOString(),
        rekap: [],
        legenda: [],
        kandidat: [],
        error: 'Tab "Rekap Harian" atau "Detail Kandidat" tidak ditemukan di spreadsheet.',
      };
    }

    // 2. Fetch Rekap Harian (A1:L with FORMATTED_VALUE)
    const rekapRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'Rekap Harian'!A1:L`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const rekapRows: any[][] = rekapRes.data.values || [];

    // Parse Rekap Harian
    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
    const rekap: LaporanRekapItem[] = [];
    for (let i = 1; i < rekapRows.length; i++) {
      const row = rekapRows[i];
      if (!row || row.length === 0) continue;
      const rawTgl = cleanLaporanText(row[0]);
      const tgl = normalizeSheetDate(rawTgl);
      if (!DATE_PATTERN.test(tgl)) continue;

      const cellF = row[5] !== undefined && row[5] !== null ? cleanLaporanText(row[5]) : '';
      const cellG = row[6] !== undefined && row[6] !== null ? cleanLaporanText(row[6]) : '';
      const cellH = row[7] !== undefined && row[7] !== null ? cleanLaporanText(row[7]) : '';
      const cellI = row[8] !== undefined && row[8] !== null ? cleanLaporanText(row[8]) : '';
      const dinilai = cellF !== '' || cellG !== '' || cellH !== '' || cellI !== '';

      rekap.push({
        tanggal: tgl,
        total: parseLaporanNum(row[1]),
        contentCreator: parseLaporanNum(row[2]),
        spvMarketing: parseLaporanNum(row[3]),
        adminInvestasi: parseLaporanNum(row[4]),
        sesuai: dinilai ? parseLaporanNum(cellF) : 0,
        kurangSesuai: dinilai ? parseLaporanNum(cellG) : 0,
        tidakSesuai: dinilai ? parseLaporanNum(cellH) : 0,
        tidakDiverifikasi: dinilai ? parseLaporanNum(cellI) : 0,
        dinilai,
      });
    }

    // Parse Legenda (K2:L6 - rows 2 to 6, index 1 to 5)
    const legenda: LaporanLegendaItem[] = [];
    for (let r = 1; r <= 5 && r < rekapRows.length; r++) {
      const row = rekapRows[r];
      if (!row) continue;
      const status = cleanLaporanText(row[10]);
      const keterangan = cleanLaporanText(row[11]);
      if (status) {
        legenda.push({ status, keterangan });
      }
    }

    // 3. Fetch Detail Kandidat
    // Cols A:I with FORMATTED_VALUE (Col H is Rekomendasi Posisi, Col I is Link Email)
    const detailRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'Detail Kandidat'!A1:I`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    // Cols H:I with FORMULA for `=HYPERLINK(...)` URL
    const formulaRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'Detail Kandidat'!H1:I`,
      valueRenderOption: 'FORMULA',
    });

    const detailRows: any[][] = detailRes.data.values || [];
    const formulaRows: any[][] = formulaRes.data.values || [];

    // Detect if column H is Rekomendasi Posisi or legacy Link Email
    const headerRow = detailRows[0] || [];
    const headerH = cleanLaporanText(headerRow[7] || '').toLowerCase();
    const headerI = cleanLaporanText(headerRow[8] || '').toLowerCase();
    const hasRekomendasiCol =
      headerH.includes('rekomendasi') ||
      headerI.includes('email') ||
      headerI.includes('link') ||
      headerRow.length >= 9;

    const kandidat: LaporanKandidatItem[] = [];
    for (let i = 1; i < detailRows.length; i++) {
      const row = detailRows[i];
      if (!row || row.length === 0) continue;
      const rawTgl = cleanLaporanText(row[0]);
      const tgl = normalizeSheetDate(rawTgl);
      if (!DATE_PATTERN.test(tgl)) continue;

      const nama = cleanLaporanText(row[1]);
      const posisi = cleanLaporanText(row[2]);
      const status = cleanLaporanText(row[3]);
      const alasan = cleanLaporanText(row[4]);
      const email = cleanLaporanText(row[5]);
      const lamaranUlang = cleanLaporanText(row[6]).toLowerCase() === 'ya';

      const fRow = formulaRows[i];
      const fColH = fRow && fRow[0] !== undefined ? cleanLaporanText(fRow[0]) : '';
      const fColI = fRow && fRow[1] !== undefined ? cleanLaporanText(fRow[1]) : '';
      const rawColH = cleanLaporanText(row[7] || '');
      const rawColI = cleanLaporanText(row[8] || '');

      let rekomendasiPosisi = '';
      let linkEmail = '';

      if (hasRekomendasiCol) {
        // Guard: if rawColH is actually a hyperlink formula, fallback to linkEmail
        if (rawColH.toLowerCase().startsWith('=hyperlink') || /^https?:\/\//i.test(rawColH)) {
          linkEmail = extractHyperlinkUrl(rawColH);
          rekomendasiPosisi = '';
        } else {
          rekomendasiPosisi = rawColH;
          linkEmail =
            extractHyperlinkUrl(fColI) ||
            extractHyperlinkUrl(rawColI) ||
            extractHyperlinkUrl(fColH);
        }
      } else {
        // Legacy layout (Col H is Link Email)
        linkEmail = extractHyperlinkUrl(fColH) || extractHyperlinkUrl(rawColH);
      }

      // Stable id: tanggal|email|posisi|nomor baris sheet (1-based: i + 1)
      const sheetRowNumber = i + 1;
      const id = `${tgl}|${email}|${posisi}|${sheetRowNumber}`;

      kandidat.push({
        id,
        tanggal: tgl,
        nama,
        posisi,
        status,
        alasan,
        email,
        lamaranUlang,
        rekomendasiPosisi: rekomendasiPosisi || undefined,
        linkEmail,
      });
    }

    const payload: LaporanHarianResponse = {
      connected: true,
      fetchedAt: new Date().toISOString(),
      rekap,
      legenda,
      kandidat,
    };

    cachedLaporan = { data: payload, timestamp: now };
    return payload;
  } catch (error: any) {
    const status = error?.code || error?.status || error?.response?.status;
    const msg = error?.message || String(error);
    if (status === 403 || status === 404 || msg.includes('403') || msg.includes('404') || msg.includes('permission') || msg.includes('notFound')) {
      return {
        connected: false,
        fetchedAt: new Date().toISOString(),
        rekap: [],
        legenda: [],
        kandidat: [],
        error: `Spreadsheet belum dibagikan ke service account. Bagikan sebagai Viewer ke: ${clientEmail || '(email service account)'}`,
      };
    }

    console.error('Error fetching Laporan from Sheets, checking fallback:', error);
    const local = readLocalLaporan();
    if (local) {
      return {
        connected: true,
        fetchedAt: local.fetchedAt || new Date().toISOString(),
        rekap: local.rekap,
        legenda: local.legenda,
        kandidat: local.kandidat,
      };
    }

    return {
      connected: false,
      fetchedAt: new Date().toISOString(),
      rekap: [],
      legenda: [],
      kandidat: [],
      error: `Gagal membaca spreadsheet: ${msg}`,
    };
  }
}

// ─── Budget Iklan Lowongan Kerja Storage ────────────────────────────────────
// Dedicated tab "BudgetIklan" in the primary recruitment Google Sheet (GOOGLE_SHEET_ID).
// Fallback local file: src/data/budget.json.

export const BUDGET_TAB = 'BudgetIklan';
export const BUDGET_HEADERS = [
  'ID',
  'Tanggal Mulai',
  'Tanggal Selesai',
  'Posisi (JSON)',
  'Channel',
  'Nama Media/Mitra',
  'Jenis Biaya',
  'Biaya (Rp)',
  'Jumlah Postingan',
  'Link Postingan',
  'Kode Lacak',
  'Catatan',
  'Dibuat Oleh',
  'Dibuat Pada',
  'Diubah Pada',
  'Diarsipkan',
];

export const VALID_BUDGET_CHANNELS = [
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
];

let cachedBudget: { data: BudgetIklan[]; timestamp: number } | null = null;
const BUDGET_CACHE_TTL_MS = 60 * 1000;

function sanitizeForSheet(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function unescapeFromSheet(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.startsWith("'") && /^[=+\-@]/.test(str.slice(1))) {
    return str.slice(1);
  }
  return str;
}

function generateBudgetId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `BDG-${ts}-${rand}`;
}

export function validateBudgetPayload(data: any): string | null {
  if (!data || typeof data !== 'object') {
    return 'Data iklan tidak valid.';
  }

  // posisi: minimal 1 posisi, tiap item teks tidak kosong
  if (!Array.isArray(data.posisi) || data.posisi.length === 0) {
    return 'Posisi wajib diisi minimal 1 lowongan kerja.';
  }
  for (const p of data.posisi) {
    if (typeof p !== 'string' || p.trim() === '') {
      return 'Setiap posisi lowongan tidak boleh berupa teks kosong.';
    }
  }

  // channel: wajib salah satu dari VALID_BUDGET_CHANNELS / SUMBER_OPTIONS
  const channel = String(data.channel || '').trim();
  if (!VALID_BUDGET_CHANNELS.includes(channel)) {
    return `Channel tidak valid. Harus salah satu dari: ${VALID_BUDGET_CHANNELS.join(', ')}.`;
  }

  // namaMedia: wajib, maksimal 100 karakter, trim
  const namaMedia = String(data.namaMedia || '').trim();
  if (!namaMedia) {
    return 'Nama Media/Mitra wajib diisi.';
  }
  if (namaMedia.length > 100) {
    return 'Nama Media/Mitra maksimal 100 karakter.';
  }

  // jenisBiaya: Berbayar/Gratis/Barter
  const jenisBiaya = String(data.jenisBiaya || '').trim();
  if (!['Berbayar', 'Gratis', 'Barter'].includes(jenisBiaya)) {
    return 'Jenis biaya harus salah satu dari: Berbayar, Gratis, atau Barter.';
  }

  // biaya: bilangan bulat >= 0 dan <= 1.000.000.000
  const rawBiaya = Number(data.biaya);
  if (isNaN(rawBiaya) || !Number.isInteger(rawBiaya) || rawBiaya < 0 || rawBiaya > 1_000_000_000) {
    return 'Biaya harus berupa bilangan bulat antara Rp 0 s.d. Rp 1.000.000.000.';
  }

  if (jenisBiaya === 'Gratis' && rawBiaya !== 0) {
    return 'Untuk jenis biaya Gratis, nominal biaya harus Rp 0.';
  }
  if (jenisBiaya === 'Berbayar' && rawBiaya <= 0) {
    return 'Untuk jenis biaya Berbayar, nominal biaya harus lebih besar dari Rp 0.';
  }

  // jumlahPostingan: bilangan bulat >= 1
  const rawPostingan = Number(data.jumlahPostingan);
  if (isNaN(rawPostingan) || !Number.isInteger(rawPostingan) || rawPostingan < 1) {
    return 'Jumlah postingan harus berupa bilangan bulat minimal 1.';
  }

  // tanggalMulai dan tanggalSelesai: format YYYY-MM-DD, selesai >= mulai
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const tglMulai = String(data.tanggalMulai || '').trim();
  const tglSelesai = String(data.tanggalSelesai || '').trim();
  if (!DATE_PATTERN.test(tglMulai) || !DATE_PATTERN.test(tglSelesai)) {
    return 'Format tanggal mulai dan tanggal selesai harus YYYY-MM-DD.';
  }
  if (tglSelesai < tglMulai) {
    return 'Tanggal selesai tidak boleh mendahului tanggal mulai.';
  }

  // linkPostingan: kosong atau diawali http(s)://
  const link = String(data.linkPostingan || '').trim();
  if (link && !/^https?:\/\//i.test(link)) {
    return 'Link postingan harus berupa URL yang diawali http:// atau https://.';
  }

  // kodeLacak maks 50 karakter, catatan maks 500
  const kodeLacak = String(data.kodeLacak || '').trim();
  if (kodeLacak.length > 50) {
    return 'Kode lacak maksimal 50 karakter.';
  }

  const catatan = String(data.catatan || '').trim();
  if (catatan.length > 500) {
    return 'Catatan maksimal 500 karakter.';
  }

  return null;
}

function parseBudgetRow(row: any[]): BudgetIklan | null {
  const id = unescapeFromSheet(row[0] || '').trim();
  if (!id) return null;

  const rawMulai = unescapeFromSheet(row[1] || '');
  const rawSelesai = unescapeFromSheet(row[2] || '');
  const tanggalMulai = normalizeSheetDate(rawMulai);
  const tanggalSelesai = normalizeSheetDate(rawSelesai);

  const rawPosisi = row[3];
  let posisi: string[] = [];
  if (typeof rawPosisi === 'string') {
    try {
      const parsed = JSON.parse(rawPosisi);
      if (Array.isArray(parsed)) {
        posisi = parsed.map((p) => String(p).trim()).filter(Boolean);
      }
    } catch {
      posisi = [];
    }
  } else if (Array.isArray(rawPosisi)) {
    posisi = rawPosisi.map((p) => String(p).trim()).filter(Boolean);
  }

  const channel = unescapeFromSheet(row[4] || '').trim();
  const namaMedia = unescapeFromSheet(row[5] || '').trim();
  const rawJenis = unescapeFromSheet(row[6] || '').trim();
  const jenisBiaya: 'Berbayar' | 'Gratis' | 'Barter' =
    rawJenis === 'Gratis' || rawJenis === 'Barter' ? rawJenis : 'Berbayar';

  const rawBiayaStr = String(row[7] ?? '').replace(/[^0-9]/g, '');
  const biaya = rawBiayaStr ? parseInt(rawBiayaStr, 10) : 0;

  const rawPostinganStr = String(row[8] ?? '').replace(/[^0-9]/g, '');
  const jumlahPostingan = rawPostinganStr ? Math.max(1, parseInt(rawPostinganStr, 10)) : 1;

  const linkPostingan = unescapeFromSheet(row[9] || '').trim();
  const kodeLacak = unescapeFromSheet(row[10] || '').trim();
  const catatan = unescapeFromSheet(row[11] || '').trim();
  const dibuatOleh = unescapeFromSheet(row[12] || '').trim();
  const dibuatPada = unescapeFromSheet(row[13] || '').trim();
  const diubahPada = unescapeFromSheet(row[14] || '').trim();

  const rawArsip = String(row[15] ?? '').trim().toUpperCase();
  const diarsipkan = rawArsip === 'TRUE' || rawArsip === '1' || rawArsip === 'YA';

  return {
    id,
    tanggalMulai,
    tanggalSelesai,
    posisi,
    channel,
    namaMedia,
    jenisBiaya,
    biaya,
    jumlahPostingan,
    linkPostingan,
    kodeLacak,
    catatan,
    dibuatOleh,
    dibuatPada,
    diubahPada,
    diarsipkan,
  };
}

function budgetItemToRow(item: BudgetIklan): any[] {
  return [
    sanitizeForSheet(item.id),
    sanitizeForSheet(item.tanggalMulai),
    sanitizeForSheet(item.tanggalSelesai),
    JSON.stringify(item.posisi || []),
    sanitizeForSheet(item.channel),
    sanitizeForSheet(item.namaMedia),
    sanitizeForSheet(item.jenisBiaya),
    item.biaya,
    item.jumlahPostingan,
    sanitizeForSheet(item.linkPostingan),
    sanitizeForSheet(item.kodeLacak),
    sanitizeForSheet(item.catatan),
    sanitizeForSheet(item.dibuatOleh),
    sanitizeForSheet(item.dibuatPada),
    sanitizeForSheet(item.diubahPada),
    item.diarsipkan ? 'TRUE' : 'FALSE',
  ];
}

function readLocalBudget(): BudgetIklan[] {
  try {
    const filePath = path.join(process.cwd(), 'src/data/budget.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function writeLocalBudget(items: BudgetIklan[]): boolean {
  try {
    const filePath = path.join(process.cwd(), 'src/data/budget.json');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

async function ensureBudgetTab(sheets: any, spreadsheetId: string): Promise<void> {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = (meta.data.sheets ?? []).some(
      (s: any) => s.properties?.title === BUDGET_TAB
    );
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: BUDGET_TAB } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${BUDGET_TAB}!A1:P1`,
        valueInputOption: 'RAW',
        requestBody: { values: [BUDGET_HEADERS] }
      });
    }
  } catch (error) {
    console.error('Error ensuring BudgetIklan tab:', error);
  }
}

export async function getBudgets(forceRefresh = false): Promise<BudgetIklanResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedBudget && now - cachedBudget.timestamp < BUDGET_CACHE_TTL_MS) {
    return { connected: true, items: cachedBudget.data };
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const local = readLocalBudget();
    cachedBudget = { data: local, timestamp: now };
    return {
      connected: false,
      items: local,
      error: 'Kredensial Service Account belum dikonfigurasi.',
    };
  }

  try {
    await ensureBudgetTab(sheets, spreadsheetId);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${BUDGET_TAB}!A2:P`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const rows: any[][] = res.data.values || [];
    const items: BudgetIklan[] = [];
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const parsed = parseBudgetRow(row);
      if (parsed) items.push(parsed);
    }

    cachedBudget = { data: items, timestamp: now };
    return { connected: true, items };
  } catch (error: any) {
    console.error('Error fetching Budget from Sheets, checking fallback:', error);
    const local = readLocalBudget();
    return {
      connected: false,
      items: local,
      error: error?.message || 'Gagal membaca data budget iklan dari Google Sheets.',
    };
  }
}

export async function createBudget(data: any, adminEmail: string): Promise<BudgetIklan> {
  const validationError = validateBudgetPayload(data);
  if (validationError) {
    throw new Error(validationError);
  }

  const nowIso = new Date().toISOString();
  const item: BudgetIklan = {
    id: generateBudgetId(),
    tanggalMulai: String(data.tanggalMulai).trim(),
    tanggalSelesai: String(data.tanggalSelesai).trim(),
    posisi: (data.posisi as string[]).map((p) => String(p).trim()).filter(Boolean),
    channel: String(data.channel).trim(),
    namaMedia: String(data.namaMedia).trim(),
    jenisBiaya: data.jenisBiaya,
    biaya: Number(data.biaya) || 0,
    jumlahPostingan: Number(data.jumlahPostingan) || 1,
    linkPostingan: String(data.linkPostingan || '').trim(),
    kodeLacak: String(data.kodeLacak || '').trim(),
    catatan: String(data.catatan || '').trim(),
    dibuatOleh: adminEmail || 'Admin',
    dibuatPada: nowIso,
    diubahPada: nowIso,
    diarsipkan: false,
  };

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const items = readLocalBudget();
    items.unshift(item);
    writeLocalBudget(items);
    cachedBudget = null;
    return item;
  }

  await ensureBudgetTab(sheets, spreadsheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${BUDGET_TAB}!A:P`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [budgetItemToRow(item)] },
  });

  cachedBudget = null;
  return item;
}

export async function updateBudget(id: string, data: any): Promise<BudgetIklan> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID iklan wajib dicantumkan.');
  }

  const validationError = validateBudgetPayload(data);
  if (validationError) {
    throw new Error(validationError);
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const items = readLocalBudget();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Iklan dengan ID ${id} tidak ditemukan.`);
    const existing = items[idx];
    const updated: BudgetIklan = {
      ...existing,
      tanggalMulai: String(data.tanggalMulai).trim(),
      tanggalSelesai: String(data.tanggalSelesai).trim(),
      posisi: (data.posisi as string[]).map((p) => String(p).trim()).filter(Boolean),
      channel: String(data.channel).trim(),
      namaMedia: String(data.namaMedia).trim(),
      jenisBiaya: data.jenisBiaya,
      biaya: Number(data.biaya) || 0,
      jumlahPostingan: Number(data.jumlahPostingan) || 1,
      linkPostingan: String(data.linkPostingan || '').trim(),
      kodeLacak: String(data.kodeLacak || '').trim(),
      catatan: String(data.catatan || '').trim(),
      diarsipkan: data.diarsipkan !== undefined ? Boolean(data.diarsipkan) : existing.diarsipkan,
      diubahPada: new Date().toISOString(),
    };
    items[idx] = updated;
    writeLocalBudget(items);
    cachedBudget = null;
    return updated;
  }

  await ensureBudgetTab(sheets, spreadsheetId);

  // Find row by column A
  const colRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BUDGET_TAB}!A:A`,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const rows: any[][] = colRes.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const cellId = unescapeFromSheet(rows[i]?.[0] || '').trim();
    if (cellId === id) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Iklan dengan ID ${id} tidak ditemukan di spreadsheet.`);
  }

  // Get current row to preserve dibuatOleh, dibuatPada, diarsipkan
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BUDGET_TAB}!A${rowIndex}:P${rowIndex}`,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const currentRow = rowRes.data.values?.[0] || [];
  const currentParsed = parseBudgetRow(currentRow);

  const nowIso = new Date().toISOString();
  const updatedItem: BudgetIklan = {
    id,
    tanggalMulai: String(data.tanggalMulai).trim(),
    tanggalSelesai: String(data.tanggalSelesai).trim(),
    posisi: (data.posisi as string[]).map((p) => String(p).trim()).filter(Boolean),
    channel: String(data.channel).trim(),
    namaMedia: String(data.namaMedia).trim(),
    jenisBiaya: data.jenisBiaya,
    biaya: Number(data.biaya) || 0,
    jumlahPostingan: Number(data.jumlahPostingan) || 1,
    linkPostingan: String(data.linkPostingan || '').trim(),
    kodeLacak: String(data.kodeLacak || '').trim(),
    catatan: String(data.catatan || '').trim(),
    dibuatOleh: currentParsed?.dibuatOleh || 'Admin',
    dibuatPada: currentParsed?.dibuatPada || nowIso,
    diubahPada: nowIso,
    diarsipkan: data.diarsipkan !== undefined ? Boolean(data.diarsipkan) : (currentParsed ? currentParsed.diarsipkan : false),
  };

  // Update ONLY row rowIndex range A:P
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${BUDGET_TAB}!A${rowIndex}:P${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [budgetItemToRow(updatedItem)] },
  });

  cachedBudget = null;
  return updatedItem;
}

export async function archiveBudget(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID iklan wajib dicantumkan.');
  }

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const items = readLocalBudget();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Iklan dengan ID ${id} tidak ditemukan.`);
    items[idx].diarsipkan = true;
    items[idx].diubahPada = new Date().toISOString();
    writeLocalBudget(items);
    cachedBudget = null;
    return true;
  }

  await ensureBudgetTab(sheets, spreadsheetId);

  // Find row by column A
  const colRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${BUDGET_TAB}!A:A`,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const rows: any[][] = colRes.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const cellId = unescapeFromSheet(rows[i]?.[0] || '').trim();
    if (cellId === id) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Iklan dengan ID ${id} tidak ditemukan di spreadsheet.`);
  }

  const nowIso = new Date().toISOString();
  // Update ONLY O{rowIndex}:P{rowIndex}
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${BUDGET_TAB}!O${rowIndex}:P${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[sanitizeForSheet(nowIso), 'TRUE']] },
  });

  cachedBudget = null;
  return true;
}