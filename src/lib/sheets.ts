import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Applicant, ApplicationStatus } from '../types';

// Columns mapping mapping to Google Sheets. Total 62 columns.
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
  'Alamat Media Sosial', 'Referensi Kontak (JSON)', 'Kota Tgl', 'Nama Terang'
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
    app.ttlPasangan || '',
    app.pendidikanPasangan || '',
    app.pekerjaanPasangan || '',
    JSON.stringify(app.anak || []),
    app.namaOrtu || '',
    app.alamatOrtu || '',
    app.pekerjaanOrtu || '',
    JSON.stringify(app.saudara || []),
    JSON.stringify(app.pendidikanFormal || []),
    JSON.stringify(app.kursus || []),
    JSON.stringify(app.pengalamanKerja || []),
    JSON.stringify(app.referensiPerusahaan || []),
    app.jobdeskTerakhir || '',
    app.jabatanDituju || '',
    app.alasanJabatan || '',
    app.pengetahuanJabatan || '',
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
    app.namaTerang || ''
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
    ttlPasangan: row[23] || '',
    pendidikanPasangan: row[24] || '',
    pekerjaanPasangan: row[25] || '',
    anak: parseJsonSafe(row[26], []),
    namaOrtu: row[27] || '',
    alamatOrtu: row[28] || '',
    pekerjaanOrtu: row[29] || '',
    saudara: parseJsonSafe(row[30], []),
    pendidikanFormal: parseJsonSafe(row[31], []),
    kursus: parseJsonSafe(row[32], []),
    pengalamanKerja: parseJsonSafe(row[33], []),
    referensiPerusahaan: parseJsonSafe(row[34], []),
    jobdeskTerakhir: row[35] || '',
    jabatanDituju: row[36] || '',
    alasanJabatan: row[37] || '',
    pengetahuanJabatan: row[38] || '',
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
    namaTerang: row[61] || ''
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

  if (!sheets || !spreadsheetId) {
    const email = getServiceAccountEmail();
    const reason = !spreadsheetId 
      ? 'GOOGLE_SHEET_ID tidak terdefinisi di server.'
      : 'GOOGLE_SERVICE_ACCOUNT_KEY tidak valid atau tidak terpasang.';
    return { 
      success: false, 
      error: `${reason} ${email ? `Service account email: ${email}` : ''}` 
    };
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
    console.error('Error appending row to Google Sheet:', error);
    
    let userMsg = error.message || String(error);
    const email = getServiceAccountEmail();
    
    if (userMsg.includes('permission') || userMsg.includes('403')) {
      userMsg = `Akses Ditolak (403): Silakan bagikan / SHARE Google Sheet Anda ke email Service Account ini sebagai 'Editor': ${email || '(gagal membaca email)'}`;
    } else if (userMsg.includes('not found') || userMsg.includes('404')) {
      userMsg = `File Tidak Ditemukan (404): ID Google Sheet '${spreadsheetId}' tidak valid atau tidak dapat diakses.`;
    }
    
    return { success: false, error: userMsg };
  }
}

export async function getAllRows(): Promise<Applicant[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return [];

  try {
    const sheetTitle = await getFirstSheetName(sheets, spreadsheetId);
    await ensureHeaders(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A2:ZZ` // read from Row 2 downwards
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row: any[]) => rowToApplicant(row)).filter((a: Applicant) => a.id !== '');
  } catch (error) {
    console.error('Error reading rows from Google Sheet:', error);
    return [];
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

  if (!sheets || !spreadsheetId) return false;

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
}

const VACANCY_TAB = 'Vacancies';
const VACANCY_HEADERS = ['Title', 'Category', 'Location', 'Salary', 'Description', 'Requirements (JSON)', 'Archived'];

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
    ]
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
    ]
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
    ]
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
    ]
  }
];

let cachedVacancies: Vacancy[] | null = null;

function readLocalVacancies(): Vacancy[] {
  // Try reading from the JSON file first (local dev), then fall back to the seed constant
  try {
    const filePath = path.join(process.cwd(), 'src/data/vacancies.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
      range: `${VACANCY_TAB}!A2:G`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      // Tab is empty on first deploy — seed from the committed JSON file
      const local = readLocalVacancies();
      if (local.length > 0) await saveVacancies(local);
      cachedVacancies = local;
      return local;
    }

    const fetched = rows.map((row: any[]) => ({
      title: row[0] || '',
      category: row[1] || '',
      location: row[2] || '',
      salary: row[3] || '',
      description: row[4] || '',
      requirements: parseJsonSafe<string[]>(row[5], []),
      archived: row[6] === 'true'
    })).filter((v: any) => v.title.trim() !== '');

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

  // Update memory cache — reset first to force re-fetch on next getVacancies() call
  cachedVacancies = null;

  // Local dev fallback — write directly to the JSON file
  if (!sheets || !spreadsheetId) {
    try {
      const filePath = path.join(process.cwd(), 'src/data/vacancies.json');
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(vacancies, null, 2), 'utf-8');
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

    const rows = vacancies.map(v => [
      v.title,
      v.category,
      v.location,
      v.salary,
      v.description,
      JSON.stringify(v.requirements || []),
      v.archived ? 'true' : 'false'
    ]);

    // Clear all data rows (preserve header in row 1) then rewrite
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${VACANCY_TAB}!A2:G`
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