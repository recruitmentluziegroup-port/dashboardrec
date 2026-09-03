import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const VACANCY_TAB = 'Vacancies';
const VACANCY_HEADERS = ['Title', 'Category', 'Location', 'Salary', 'Description', 'Requirements (JSON)', 'Archived'];
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const SEED_VACANCIES = [
  {
    title: 'Personal Assistant',
    category: 'Administrative Support',
    location: 'Solo / WFH (Remote Indonesia)',
    salary: 'Rp 3.5jt - Rp 5.0jt / bln',
    description: 'Mengelola jadwal harian pimpinan, mengoordinasikan dokumen/surat perusahaan, menyusun agenda rapat, serta memberikan dukungan administratif perkantoran secara rahasia, tertib, dan andal.',
    requirements: ['Minimal lulusan D3/S1 sekalian jurusan (diutamakan Administrasi Perkantoran / Sekretaris)', 'Sangat fasih mengoperasikan Google Workspace (Sheets, Docs, Slides, Google Calendar)', 'Memiliki keterampilan komunikasi verbal & tertulis yang rapi, ramah, dan cakap'],
  },
  {
    title: 'Digital Marketer Specialist',
    category: 'Marketing & Conversion Optimization',
    location: 'Purwokerto (On-site / WFO)',
    salary: 'Rp 4.0jt - Rp 6.0jt / bln',
    description: 'Mengonsep, mengeksekusi, dan menjasmani kampanye paid traffic (Facebook Ads, TikTok Ads, Google Ads), menganalisis budget iklan, serta menjaga rasio efisiensi ROAS bisnis eksekutif.',
    requirements: ['Pengalaman kerja langsung minimal 1-2 tahun sebagai Media Buyer / Digital Advertiser', 'Mahir mengulik platform Google Analytics, Facebook Pixel, serta konversi landing page', 'Memiliki nalar psikologi copywriting penawaran tinggi yang menarik minat beli'],
  },
  {
    title: 'CEO & Founder Personal Assistant',
    category: 'Executive Office Operations',
    location: 'Purwokerto (On-site / WFO)',
    salary: 'Rp 6.0jt - Rp 10.0jt / bln',
    description: 'Bertindak sebagai asisten eksekutif utama Founder Luzie Group untuk mengawal implementasi proyek strategis, memonitor status target KPI tim, serta mendampingi kunjungan bisnis pimpinan.',
    requirements: ['Gelar S1 terkemuka (Manajemen, Bisnis, Hubungan Internasional, atau Hukum disukai)', 'Fasih berkomunikasi dalam Bahasa Inggris aktif lisan & tulisan tingkat mahir', 'Daya pikir analitis taktis, integritas prima, serta siap untuk dinas luar kota sewaktu-waktu'],
  },
  {
    title: 'Social Media Management',
    category: 'Creative Design & Content Strategy',
    location: 'Solo / WFH (Remote Indonesia)',
    salary: 'Rp 4.0jt - Rp 6.0jt / bln',
    description: 'Merancang ide konten mingguan kreatif, memproduksi dan menyunting video pendek (Reels, TikTok & Shorts), merias caption, serta membangun interaksi organik komunitas brand Luzie.',
    requirements: ['Keahlian tinggi mengoperasikan editor video CapCut, Premiere Pro, atau Adobe After Effects', 'Mengikuti update tren konten visual, audio, serta cara kerja algoritma media sosial terbaru', 'Wajib melampirkan portofolio kumpulan karya konten kreatif media sosial Anda'],
  },
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

async function getVacancies(): Promise<any[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const creds = parseCredentials();
  if (!creds || !spreadsheetId) {
    if (cachedVacancies) return cachedVacancies;
    cachedVacancies = SEED_VACANCIES;
    return cachedVacancies;
  }
  try {
    await ensureVacancyTab();
    const data = await sheetsFetch<{ values?: string[][] }>(`/values/${encodeURIComponent(VACANCY_TAB + '!A2:G')}`);
    const rows = data.values;
    if (!rows || rows.length === 0) {
      if (SEED_VACANCIES.length > 0) {
        cachedVacancies = null;
        await saveVacanciesInternal(SEED_VACANCIES);
      }
      cachedVacancies = cachedVacancies || SEED_VACANCIES;
      return cachedVacancies;
    }
    cachedVacancies = rows.map((row) => ({
      title: row[0] || '', category: row[1] || '', location: row[2] || '', salary: row[3] || '',
      description: row[4] || '', requirements: parseJsonSafe<string[]>(row[5], []), archived: row[6] === 'true',
    })).filter((v) => v.title.trim() !== '');
    return cachedVacancies;
  } catch {
    if (cachedVacancies) return cachedVacancies;
    cachedVacancies = SEED_VACANCIES;
    return cachedVacancies;
  }
}

async function saveVacanciesInternal(vacancies: any[]): Promise<boolean> {
  await ensureVacancyTab();
  const rows = vacancies.map((v) => [v.title, v.category, v.location, v.salary, v.description, JSON.stringify(v.requirements || []), v.archived ? 'true' : 'false']);
  await sheetsFetch(`/values/${encodeURIComponent(VACANCY_TAB + '!A2:G')}:clear`, { method: 'POST' });
  if (rows.length > 0) {
    await sheetsFetch(`/values/${encodeURIComponent(VACANCY_TAB + '!A2')}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: rows }) });
  }
  cachedVacancies = vacancies;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const all = await getVacancies();
    return res.json(all.filter((v: any) => v.archived !== true));
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Gagal mengambil data lowongan.' });
  }
}
