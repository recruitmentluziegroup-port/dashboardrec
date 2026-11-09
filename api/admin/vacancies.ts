import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const VACANCY_TAB = 'Vacancies';
const VACANCY_HEADERS = ['Title', 'Category', 'Location', 'Salary', 'Description', 'Requirements (JSON)', 'Archived', 'User', 'Recruiter', 'Tanggal Dibuka', 'Tanggal Terakhir', 'Tanggal Selesai', 'Priority', 'Jumlah', 'Gender', 'Status'];
const VACANCY_EXTRA = { user: '', recruiter: 'All', tanggalDibuka: '', tanggalTerakhir: '', tanggalSelesai: '', priority: 'Normal', jumlah: '1', gender: '', status: 'Open' };

// Normalize a date cell coming back from Google Sheets into YYYY-MM-DD.
// Our write path is RAW (plain strings), but dates typed directly in the Sheet UI
// become real date values and the default FORMATTED_VALUE read returns them in
// the cell's display format (locale strings or serial numbers), which the admin
// table could not render (dates showed as garbage glyphs).
function normalizeSheetDate(v: any): string {
  if (v === undefined || v === null) return '';
  const s = String(v).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Pure number → Sheets date serial (days since 1899-12-30), ignore junk numbers
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 20000 && n < 80000) return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
    return s;
  }
  // dd/mm/yyyy — Indonesian display order (Sheets id-ID locale)
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmy) {
    const day = Number(dmy[1]);
    const mon = Number(dmy[2]);
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return `${dmy[3]}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  // Long locale forms ("8 September 2026", "September 8, 2026", ISO datetimes)
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 1900 && y <= 2200) {
      return `${y}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
  }
  return s;
}

// ─── Trackers (decoupled Treker Posisi — own Sheet tab, own cache) ──────────
// Served from this same file via ?store=trackers so the Hobby 12-function cap
// is not exceeded. Starts empty, never seeded from vacancies.
const TRACKER_TAB = 'Trackers';
const TRACKER_HEADERS = ['ID', 'Title', 'Category', 'User', 'Recruiter', 'Tanggal Dibuka', 'Tanggal Terakhir', 'Tanggal Selesai', 'Priority', 'Jumlah', 'Gender', 'Status'];
let cachedTrackers: any[] | null = null;

async function ensureTrackerTab(): Promise<void> {
  const meta = await sheetsFetch<{ sheets?: { properties?: { title?: string } }[] }>('');
  if ((meta.sheets ?? []).some((s) => s.properties?.title === TRACKER_TAB)) return;
  await sheetsFetch(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TRACKER_TAB } } }] }) });
  await sheetsFetch(`/values/${encodeURIComponent(TRACKER_TAB + '!A1')}`, { method: 'PUT', body: JSON.stringify({ values: [TRACKER_HEADERS] }) });
}

function validateTrackers(body: any[]): string | null {
  for (const t of body) {
    if (!t || typeof t.title !== 'string' || t.title.trim() === '') return 'Setiap tracker wajib memiliki Nama Posisi.';
    if (t.priority !== undefined && t.priority !== '' && t.priority !== 'Normal' && t.priority !== 'High') return `Priority tidak valid: ${t.priority}.`;
    if (t.status !== undefined && t.status !== '' && !['Open', 'On Hold', 'Closed-Filled', 'Closed-Unfilled'].includes(t.status)) return `Status tidak valid: ${t.status}.`;
    for (const d of [t.tanggalDibuka, t.tanggalTerakhir, t.tanggalSelesai]) {
      if (d !== undefined && d !== '' && !DATE_RE.test(String(d))) return `Format tanggal harus YYYY-MM-DD: ${d}.`;
    }
  }
  return null;
}

async function readTrackers(): Promise<any[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!parseCredentials() || !spreadsheetId) {
    if (cachedTrackers) return cachedTrackers;
    cachedTrackers = [];
    return cachedTrackers;
  }
  try {
    await ensureTrackerTab();
    const data = await sheetsFetch<{ values?: string[][] }>(`/values/${encodeURIComponent(TRACKER_TAB + '!A2:L')}`);
    if (!data.values || data.values.length === 0) {
      cachedTrackers = [];
      return cachedTrackers;
    }
    cachedTrackers = data.values.map((row) => ({
      id: row[0] || '', title: row[1] || '', category: row[2] || '', user: row[3] || '',
      recruiter: row[4] || '', tanggalDibuka: normalizeSheetDate(row[5]), tanggalTerakhir: normalizeSheetDate(row[6]),
      tanggalSelesai: normalizeSheetDate(row[7]), priority: row[8] || 'Normal', jumlah: row[9] || '',
      gender: row[10] || '', status: row[11] || 'Open',
    })).filter((t) => t.id !== '' || t.title.trim() !== '');
    return cachedTrackers;
  } catch {
    if (cachedTrackers) return cachedTrackers;
    cachedTrackers = [];
    return cachedTrackers;
  }
}

async function writeTrackers(trackers: any[]): Promise<boolean> {
  await ensureTrackerTab();
  const rows = trackers.map((t) => [t.id || '', t.title, t.category || '', t.user || '', t.recruiter || '', t.tanggalDibuka || '', t.tanggalTerakhir || '', t.tanggalSelesai || '', t.priority || 'Normal', t.jumlah || '', t.gender || '', t.status || 'Open']);
  await sheetsFetch(`/values/${encodeURIComponent(TRACKER_TAB + '!A2:L')}:clear`, { method: 'POST' });
  if (rows.length > 0) {
    await sheetsFetch(`/values/${encodeURIComponent(TRACKER_TAB + '!A2')}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: rows }) });
  }
  cachedTrackers = trackers;
  return true;
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const SEED_VACANCIES = [
  { title: 'Personal Assistant', category: 'Administrative Support', location: 'Solo / WFH (Remote Indonesia)', salary: 'Rp 3.5jt - Rp 5.0jt / bln', description: 'Mengelola jadwal harian pimpinan, mengoordinasikan dokumen/surat perusahaan, menyusun agenda rapat, serta memberikan dukungan administratif perkantoran secara rahasia, tertib, dan andal.', requirements: ['Minimal lulusan D3/S1 sekalian jurusan (diutamakan Administrasi Perkantoran / Sekretaris)', 'Sangat fasih mengoperasikan Google Workspace (Sheets, Docs, Slides, Google Calendar)', 'Memiliki keterampilan komunikasi verbal & tertulis yang rapi, ramah, dan cakap'], archived: false, ...VACANCY_EXTRA },
  { title: 'Digital Marketer Specialist', category: 'Marketing & Conversion Optimization', location: 'Purwokerto (On-site / WFO)', salary: 'Rp 4.0jt - Rp 6.0jt / bln', description: 'Mengonsep, mengeksekusi, dan menjasmani kampanye paid traffic (Facebook Ads, TikTok Ads, Google Ads), menganalisis budget iklan, serta menjaga rasio efisiensi ROAS bisnis eksekutif.', requirements: ['Pengalaman kerja langsung minimal 1-2 tahun sebagai Media Buyer / Digital Advertiser', 'Mahir mengulik platform Google Analytics, Facebook Pixel, serta konversi landing page', 'Memiliki nalar psikologi copywriting penawaran tinggi yang menarik minat beli'], archived: false, ...VACANCY_EXTRA },
  { title: 'CEO & Founder Personal Assistant', category: 'Executive Office Operations', location: 'Purwokerto (On-site / WFO)', salary: 'Rp 6.0jt - Rp 10.0jt / bln', description: 'Bertindak sebagai asisten eksekutif utama Founder Luzie Group untuk mengawal implementasi proyek strategis, memonitor status target KPI tim, serta mendampingi kunjungan bisnis pimpinan.', requirements: ['Gelar S1 terkemuka (Manajemen, Bisnis, Hubungan Internasional, atau Hukum disukai)', 'Fasih berkomunikasi dalam Bahasa Inggris aktif lisan & tulisan tingkat mahir', 'Daya pikir analitis taktis, integritas prima, serta siap untuk dinas luar kota sewaktu-waktu'], archived: false, ...VACANCY_EXTRA },
  { title: 'Social Media Management', category: 'Creative Design & Content Strategy', location: 'Solo / WFH (Remote Indonesia)', salary: 'Rp 4.0jt - Rp 6.0jt / bln', description: 'Merancang ide konten mingguan kreatif, memproduksi dan menyunting video pendek (Reels, TikTok & Shorts), merias caption, serta membangun interaksi organik komunitas brand Luzie.', requirements: ['Keahlian tinggi mengoperasikan editor video CapCut, Premiere Pro, atau Adobe After Effects', 'Mengikuti update tren konten visual, audio, serta cara kerja algoritma media sosial terbaru', 'Wajib melampirkan portofolio kumpulan karya konten kreatif media sosial Anda'], archived: false, ...VACANCY_EXTRA },
];

let cachedVacancies: any[] | null = null;
let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

function parseCredentials(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    let decoded = raw.trim();
    if (!decoded.startsWith('{')) {
      try {
        const b64 = Buffer.from(decoded, 'base64').toString('utf8').trim();
        if (b64.startsWith('{')) decoded = b64;
      } catch { /* not base64 */ }
    }
    const creds = JSON.parse(decoded);
    if (creds.client_email && creds.private_key) return creds;
    return null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < tokenExpiry) return cachedAccessToken;
  const creds = parseCredentials();
  if (!creds) return null;
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: creds.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now },
    creds.private_key,
    { algorithm: 'RS256' },
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedAccessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedAccessToken;
}

async function sheetsFetch<T = any>(pathAndQuery: string, init: RequestInit = {}): Promise<T> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID not set');
  const token = await getAccessToken();
  if (!token) throw new Error('Failed to get access token');
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}${pathAndQuery}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  });
  if (res.status === 204) return undefined as unknown as T;
  const body = await res.json();
  if (!res.ok) throw new Error(`Sheets API ${res.status}`);
  return body as T;
}

async function ensureVacancyTab(): Promise<void> {
  const meta = await sheetsFetch<{ sheets?: { properties?: { title?: string } }[] }>('');
  if ((meta.sheets ?? []).some((s) => s.properties?.title === VACANCY_TAB)) return;
  await sheetsFetch(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: VACANCY_TAB } } }] }) });
  await sheetsFetch(`/values/${encodeURIComponent(VACANCY_TAB + '!A1')}`, { method: 'PUT', body: JSON.stringify({ values: [VACANCY_HEADERS] }) });
}

function parseJsonSafe<T>(jsonStr: any, fallback: T): T {
  if (!jsonStr) return fallback;
  try { return JSON.parse(jsonStr) as T; } catch { return fallback; }
}

async function readVacancies(): Promise<any[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const creds = parseCredentials();
  if (!creds || !spreadsheetId) {
    if (cachedVacancies) return cachedVacancies;
    cachedVacancies = SEED_VACANCIES;
    return cachedVacancies;
  }
  try {
    await ensureVacancyTab();
    const data = await sheetsFetch<{ values?: string[][] }>(`/values/${encodeURIComponent(VACANCY_TAB + '!A2:P')}`);
    const rows = data.values;
    if (!rows || rows.length === 0) {
      if (SEED_VACANCIES.length > 0) {
        cachedVacancies = null;
        await writeVacancies(SEED_VACANCIES);
      }
      cachedVacancies = cachedVacancies || SEED_VACANCIES;
      return cachedVacancies;
    }
    cachedVacancies = rows.map((row) => {
      const isArchived = row[6] === 'true' || String(row[6]).toLowerCase() === 'true';
      let status = row[15] || (isArchived ? 'Closed-Filled' : 'Open');
      if (!isArchived && (status === 'Closed-Filled' || status === 'Closed-Unfilled')) {
        status = 'Open';
      }
      return {
        title: row[0] || '', category: row[1] || '', location: row[2] || '', salary: row[3] || '',
        description: row[4] || '', requirements: parseJsonSafe<string[]>(row[5], []), archived: isArchived,
        user: row[7] || '', recruiter: row[8] || '', tanggalDibuka: normalizeSheetDate(row[9]), tanggalTerakhir: normalizeSheetDate(row[10]),
        tanggalSelesai: normalizeSheetDate(row[11]), priority: row[12] || 'Normal', jumlah: row[13] || '', gender: row[14] || '',
        status,
      };
    }).filter((v) => v.title.trim() !== '');
    return cachedVacancies;
  } catch {
    if (cachedVacancies) return cachedVacancies;
    cachedVacancies = SEED_VACANCIES;
    return cachedVacancies;
  }
}

async function writeVacancies(vacancies: any[]): Promise<boolean> {
  await ensureVacancyTab();
  const rows = vacancies.map((v) => {
    const isArchived = v.archived === true || String(v.archived).toLowerCase() === 'true';
    const status = isArchived ? (v.status === 'Closed-Unfilled' ? 'Closed-Unfilled' : 'Closed-Filled') : 'Open';
    return [
      v.title, v.category, v.location, v.salary, v.description, JSON.stringify(v.requirements || []),
      isArchived ? 'true' : 'false', v.user || '', v.recruiter || '', v.tanggalDibuka || '', v.tanggalTerakhir || '',
      v.tanggalSelesai || '', v.priority || 'Normal', v.jumlah || '', v.gender || '', status
    ];
  });
  await sheetsFetch(`/values/${encodeURIComponent(VACANCY_TAB + '!A2:P')}:clear`, { method: 'POST' });
  if (rows.length > 0) {
    await sheetsFetch(`/values/${encodeURIComponent(VACANCY_TAB + '!A2')}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: rows }) });
  }
  cachedVacancies = vacancies;
  return true;
}

function requireAuth(req: VercelRequest, res: VercelResponse): string | null {
  let token: string | null = null;
  if (req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map((c) => {
        const p = c.trim().split('='); return [p[0], p.slice(1).join('=')];
      })
    );
    token = cookies['luzie_session'] ?? null;
  }
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) { res.status(401).json({ error: 'Akses ditolak.' }); return null; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.email;
  } catch {
    res.status(401).json({ error: 'Sesi login telah kedaluwarsa.' });
    return null;
  }
}

// ─── Laporan Rekrutmen Harian (Read-Only) ──────────────────────────────────
// Dedicated spreadsheet (LAPORAN_SHEET_ID, fallback 1ef0gwvtYYMbOMG6Pt7D2rBnMJ2MTdnpaKrZsaP9B9TA).
// Served via ?store=laporan on GET without exceeding the Hobby 12-function cap.

const DEFAULT_LAPORAN_SHEET_ID = '1ef0gwvtYYMbOMG6Pt7D2rBnMJ2MTdnpaKrZsaP9B9TA';
let cachedLaporan: { data: any; timestamp: number } | null = null;
const LAPORAN_CACHE_TTL_MS = 60 * 1000;
let cachedLaporanAccessToken: string | null = null;
let laporanTokenExpiry = 0;

async function getLaporanAccessToken(): Promise<string | null> {
  if (cachedLaporanAccessToken && Date.now() < laporanTokenExpiry) return cachedLaporanAccessToken;
  const creds = parseCredentials();
  if (!creds) return null;
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: creds.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now },
    creds.private_key,
    { algorithm: 'RS256' },
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedLaporanAccessToken = data.access_token;
  laporanTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedLaporanAccessToken;
}

async function laporanSheetsFetch<T = any>(pathAndQuery: string): Promise<{ data?: T; status: number; error?: string }> {
  const spreadsheetId = process.env.LAPORAN_SHEET_ID || DEFAULT_LAPORAN_SHEET_ID;
  const token = await getLaporanAccessToken();
  if (!token) return { status: 401, error: 'Failed to obtain access token' };
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (res.status === 204) return { status: 204 };
  const body = await res.json();
  if (!res.ok) {
    return { status: res.status, error: body?.error?.message || `Sheets API ${res.status}` };
  }
  return { status: res.status, data: body as T };
}

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

function readLocalLaporanFile(): any | null {
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

async function readLaporan(forceRefresh = false): Promise<any> {
  const now = Date.now();
  if (!forceRefresh && cachedLaporan && now - cachedLaporan.timestamp < LAPORAN_CACHE_TTL_MS) {
    return cachedLaporan.data;
  }

  const creds = parseCredentials();
  if (!creds) {
    const local = readLocalLaporanFile();
    if (local) {
      const payload = {
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
    // 1. Verify sheet metadata
    const metaRes = await laporanSheetsFetch<{ sheets?: { properties?: { title?: string } }[] }>('?fields=sheets.properties.title');
    if (metaRes.status === 403 || metaRes.status === 404) {
      return {
        connected: false,
        fetchedAt: new Date().toISOString(),
        rekap: [],
        legenda: [],
        kandidat: [],
        error: `Spreadsheet belum dibagikan ke service account. Bagikan sebagai Viewer ke: ${creds.client_email}`,
      };
    }
    if (!metaRes.data) {
      const local = readLocalLaporanFile();
      if (local) return { connected: true, fetchedAt: local.fetchedAt || new Date().toISOString(), ...local };
      return {
        connected: false,
        fetchedAt: new Date().toISOString(),
        rekap: [],
        legenda: [],
        kandidat: [],
        error: metaRes.error || 'Gagal mengakses spreadsheet.',
      };
    }

    const titles = (metaRes.data.sheets ?? []).map((s) => s.properties?.title || '');
    if (!titles.includes('Rekap Harian') || !titles.includes('Detail Kandidat')) {
      return {
        connected: false,
        fetchedAt: new Date().toISOString(),
        rekap: [],
        legenda: [],
        kandidat: [],
        error: 'Tab "Rekap Harian" atau "Detail Kandidat" tidak ditemukan di spreadsheet.',
      };
    }

    // 2. Fetch Rekap Harian
    const rekapRes = await laporanSheetsFetch<{ values?: string[][] }>(
      `/values/${encodeURIComponent('Rekap Harian!A1:L')}?valueRenderOption=FORMATTED_VALUE`
    );
    const rekapRows = rekapRes.data?.values || [];

    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
    const rekap: any[] = [];
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
    const legenda: any[] = [];
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
    const detailRes = await laporanSheetsFetch<{ values?: string[][] }>(
      `/values/${encodeURIComponent('Detail Kandidat!A1:G')}?valueRenderOption=FORMATTED_VALUE`
    );
    const formulaRes = await laporanSheetsFetch<{ values?: string[][] }>(
      `/values/${encodeURIComponent('Detail Kandidat!H1:H')}?valueRenderOption=FORMULA`
    );

    const detailRows = detailRes.data?.values || [];
    const formulaRows = formulaRes.data?.values || [];

    const kandidat: any[] = [];
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
      const rawFormula = fRow && fRow[0] !== undefined ? cleanLaporanText(fRow[0]) : '';
      let linkEmail = extractHyperlinkUrl(rawFormula);

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
        linkEmail,
      });
    }

    const payload = {
      connected: true,
      fetchedAt: new Date().toISOString(),
      rekap,
      legenda,
      kandidat,
    };

    cachedLaporan = { data: payload, timestamp: now };
    return payload;
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('403') || msg.includes('404')) {
      return {
        connected: false,
        fetchedAt: new Date().toISOString(),
        rekap: [],
        legenda: [],
        kandidat: [],
        error: `Spreadsheet belum dibagikan ke service account. Bagikan sebagai Viewer ke: ${creds.client_email}`,
      };
    }
    const local = readLocalLaporanFile();
    if (local) return { connected: true, fetchedAt: local.fetchedAt || new Date().toISOString(), ...local };
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

// ─── Budget Iklan Lowongan Kerja Store ───────────────────────────────────────
const BUDGET_TAB = 'BudgetIklan';
const BUDGET_HEADERS = [
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

const VALID_BUDGET_CHANNELS = [
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

interface BudgetIklan {
  id: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  posisi: string[];
  channel: string;
  namaMedia: string;
  jenisBiaya: 'Berbayar' | 'Gratis' | 'Barter';
  biaya: number;
  jumlahPostingan: number;
  linkPostingan: string;
  kodeLacak: string;
  catatan: string;
  dibuatOleh: string;
  dibuatPada: string;
  diubahPada: string;
  diarsipkan: boolean;
}

let cachedBudget: { data: BudgetIklan[]; timestamp: number } | null = null;

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

function validateBudgetPayload(data: any): string | null {
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

  // channel: wajib salah satu dari SUMBER_OPTIONS
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

function readLocalBudgetFile(): BudgetIklan[] {
  try {
    const filePath = path.join(process.cwd(), 'src/data/budget.json');
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalBudgetFile(items: BudgetIklan[]): boolean {
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

async function ensureBudgetTab(): Promise<void> {
  const meta = await sheetsFetch<{ sheets?: { properties?: { title?: string } }[] }>('?fields=sheets.properties.title');
  if ((meta.sheets ?? []).some((s) => s.properties?.title === BUDGET_TAB)) return;
  await sheetsFetch(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: BUDGET_TAB } } }] }),
  });
  await sheetsFetch(
    `/values/${encodeURIComponent(BUDGET_TAB + '!A1:P1')}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [BUDGET_HEADERS] }),
    }
  );
}

async function readBudgets(forceRefresh = false): Promise<{ connected: boolean; items: BudgetIklan[]; error?: string }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const creds = parseCredentials();
  if (!creds || !spreadsheetId) {
    const local = readLocalBudgetFile();
    return {
      connected: false,
      items: local,
      error: 'Kredensial Service Account belum dikonfigurasi.',
    };
  }

  const now = Date.now();
  if (!forceRefresh && cachedBudget && now - cachedBudget.timestamp < 60000) {
    return { connected: true, items: cachedBudget.data };
  }

  try {
    await ensureBudgetTab();
    const res = await sheetsFetch<{ values?: any[][] }>(
      `/values/${encodeURIComponent(BUDGET_TAB + '!A2:P')}?valueRenderOption=FORMATTED_VALUE`
    );
    const rows = res.values || [];
    const items: BudgetIklan[] = [];
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const parsed = parseBudgetRow(row);
      if (parsed) items.push(parsed);
    }
    cachedBudget = { data: items, timestamp: now };
    return { connected: true, items };
  } catch (error: any) {
    const local = readLocalBudgetFile();
    return {
      connected: false,
      items: local,
      error: error?.message || 'Gagal membaca data budget iklan dari Google Sheets.',
    };
  }
}

async function createBudget(data: any, adminEmail: string): Promise<BudgetIklan> {
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

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const creds = parseCredentials();

  if (!creds || !spreadsheetId) {
    const items = readLocalBudgetFile();
    items.unshift(item);
    writeLocalBudgetFile(items);
    cachedBudget = null;
    return item;
  }

  await ensureBudgetTab();
  const rowValues = budgetItemToRow(item);
  await sheetsFetch(
    `/values/${encodeURIComponent(BUDGET_TAB + '!A:P')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({ values: [rowValues] }),
    }
  );

  cachedBudget = null;
  return item;
}

async function updateBudget(id: string, data: any): Promise<BudgetIklan> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID iklan wajib dicantumkan.');
  }

  const validationError = validateBudgetPayload(data);
  if (validationError) {
    throw new Error(validationError);
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const creds = parseCredentials();

  if (!creds || !spreadsheetId) {
    const items = readLocalBudgetFile();
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
    writeLocalBudgetFile(items);
    cachedBudget = null;
    return updated;
  }

  await ensureBudgetTab();

  const colRes = await sheetsFetch<{ values?: string[][] }>(
    `/values/${encodeURIComponent(BUDGET_TAB + '!A:A')}?valueRenderOption=FORMATTED_VALUE`
  );
  const rows = colRes.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const cellId = unescapeFromSheet(rows[i]?.[0] || '').trim();
    if (cellId === id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Iklan dengan ID ${id} tidak ditemukan di spreadsheet.`);
  }

  const rowRes = await sheetsFetch<{ values?: any[][] }>(
    `/values/${encodeURIComponent(BUDGET_TAB + `!A${rowIndex}:P${rowIndex}`)}?valueRenderOption=FORMATTED_VALUE`
  );
  const currentRow = rowRes.values?.[0] || [];
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

  const rowValues = budgetItemToRow(updatedItem);
  await sheetsFetch(
    `/values/${encodeURIComponent(BUDGET_TAB + `!A${rowIndex}:P${rowIndex}`)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [rowValues] }),
    }
  );

  cachedBudget = null;
  return updatedItem;
}

async function archiveBudget(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID iklan wajib dicantumkan.');
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const creds = parseCredentials();

  if (!creds || !spreadsheetId) {
    const items = readLocalBudgetFile();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Iklan dengan ID ${id} tidak ditemukan.`);
    items[idx].diarsipkan = true;
    items[idx].diubahPada = new Date().toISOString();
    writeLocalBudgetFile(items);
    cachedBudget = null;
    return true;
  }

  await ensureBudgetTab();

  const colRes = await sheetsFetch<{ values?: string[][] }>(
    `/values/${encodeURIComponent(BUDGET_TAB + '!A:A')}?valueRenderOption=FORMATTED_VALUE`
  );
  const rows = colRes.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const cellId = unescapeFromSheet(rows[i]?.[0] || '').trim();
    if (cellId === id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Iklan dengan ID ${id} tidak ditemukan di spreadsheet.`);
  }

  const nowIso = new Date().toISOString();
  await sheetsFetch(
    `/values/${encodeURIComponent(BUDGET_TAB + `!O${rowIndex}:P${rowIndex}`)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({ values: [[sanitizeForSheet(nowIso), 'TRUE']] }),
    }
  );

  cachedBudget = null;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = requireAuth(req, res);
  if (!email) return;

  // Budget Iklan Lowongan Kerja store — same function, no extra Vercel function.
  const isBudget = (req.query as any)?.store === 'budget';
  if (isBudget) {
    if (req.method === 'GET') {
      try {
        const forceRefresh = (req.query as any)?.refresh === '1';
        const result = await readBudgets(forceRefresh);
        return res.json(result);
      } catch (e: any) {
        return res.status(500).json({ error: e?.message || 'Gagal mengambil data budget iklan.' });
      }
    }

    if (req.method === 'POST') {
      try {
        const item = await createBudget(req.body, email);
        return res.status(201).json({ success: true, item });
      } catch (e: any) {
        return res.status(400).json({ error: e?.message || 'Gagal menambah data budget iklan.' });
      }
    }

    if (req.method === 'PUT') {
      try {
        const id = String((req.query as any)?.id || req.body?.id || '');
        const item = await updateBudget(id, req.body);
        return res.json({ success: true, item });
      } catch (e: any) {
        return res.status(400).json({ error: e?.message || 'Gagal mengubah data budget iklan.' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        const id = String((req.query as any)?.id || '');
        await archiveBudget(id);
        return res.json({ success: true, message: 'Iklan berhasil diarsipkan.' });
      } catch (e: any) {
        return res.status(400).json({ error: e?.message || 'Gagal mengarsipkan data budget iklan.' });
      }
    }

    return res.status(405).end();
  }

  // Read-only Laporan Rekrutmen Harian store — same function, no extra Vercel function.
  const isLaporan = (req.query as any)?.store === 'laporan';
  if (isLaporan) {
    if (req.method !== 'GET') return res.status(405).end();
    try {
      const forceRefresh = (req.query as any)?.refresh === '1';
      const result = await readLaporan(forceRefresh);
      return res.json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengambil data laporan harian.' });
    }
  }

  // Decoupled Treker Posisi store — same function, no extra Vercel function.
  const isTracker = (req.query as any)?.store === 'trackers';
  if (isTracker && req.method === 'GET') {
    try {
      return res.json(await readTrackers());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengambil data tracker.' });
    }
  }

  if (isTracker && req.method === 'POST') {
    try {
      if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Data tracker harus berupa array.' });
      const trackErr = validateTrackers(req.body);
      if (trackErr) return res.status(400).json({ error: trackErr });
      await writeTrackers(req.body);
      return res.json({ success: true, message: 'Data tracker berhasil disimpan.' });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal menyimpan data tracker.' });
    }
  }

  if (req.method === 'GET') {
    try {
      return res.json(await readVacancies());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengambil data lowongan.' });
    }
  }

  if (req.method === 'POST') {
    try {
      if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Data lowongan harus berupa array.' });
      for (const v of req.body) {
        if (!v || typeof v.title !== 'string' || v.title.trim() === '') return res.status(400).json({ error: 'Setiap lowongan wajib memiliki Title.' });
        if (v.priority !== undefined && v.priority !== '' && v.priority !== 'Normal' && v.priority !== 'High') return res.status(400).json({ error: `Priority tidak valid: ${v.priority}.` });
        if (v.status !== undefined && v.status !== '' && !['Open', 'On Hold', 'Closed-Filled', 'Closed-Unfilled'].includes(v.status)) return res.status(400).json({ error: `Status tidak valid: ${v.status}.` });
        for (const d of [v.tanggalDibuka, v.tanggalTerakhir, v.tanggalSelesai]) {
          if (d !== undefined && d !== '' && !DATE_RE.test(String(d))) return res.status(400).json({ error: `Format tanggal harus YYYY-MM-DD: ${d}.` });
        }
      }
      const ok = await writeVacancies(req.body);
      if (!ok) return res.status(500).json({ error: 'Gagal menyimpan perubahan lowongan.' });
      return res.json({ success: true, message: 'Lowongan pekerjaan berhasil disimpan.' });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengubah rincian lowongan ke server.' });
    }
  }

  return res.status(405).end();
}

