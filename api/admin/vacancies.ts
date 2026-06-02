import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';

const VACANCY_TAB = 'Vacancies';
const VACANCY_HEADERS = ['Title', 'Category', 'Location', 'Salary', 'Description', 'Requirements (JSON)', 'Archived'];

const SEED_VACANCIES = [
  { title: 'Personal Assistant', category: 'Administrative Support', location: 'Solo / WFH (Remote Indonesia)', salary: 'Rp 3.5jt - Rp 5.0jt / bln', description: 'Mengelola jadwal harian pimpinan, mengoordinasikan dokumen/surat perusahaan, menyusun agenda rapat, serta memberikan dukungan administratif perkantoran secara rahasia, tertib, dan andal.', requirements: ['Minimal lulusan D3/S1 sekalian jurusan (diutamakan Administrasi Perkantoran / Sekretaris)', 'Sangat fasih mengoperasikan Google Workspace (Sheets, Docs, Slides, Google Calendar)', 'Memiliki keterampilan komunikasi verbal & tertulis yang rapi, ramah, dan cakap'], archived: false },
  { title: 'Digital Marketer Specialist', category: 'Marketing & Conversion Optimization', location: 'Purwokerto (On-site / WFO)', salary: 'Rp 4.0jt - Rp 6.0jt / bln', description: 'Mengonsep, mengeksekusi, dan menjasmani kampanye paid traffic (Facebook Ads, TikTok Ads, Google Ads), menganalisis budget iklan, serta menjaga rasio efisiensi ROAS bisnis eksekutif.', requirements: ['Pengalaman kerja langsung minimal 1-2 tahun sebagai Media Buyer / Digital Advertiser', 'Mahir mengulik platform Google Analytics, Facebook Pixel, serta konversi landing page', 'Memiliki nalar psikologi copywriting penawaran tinggi yang menarik minat beli'], archived: false },
  { title: 'CEO & Founder Personal Assistant', category: 'Executive Office Operations', location: 'Purwokerto (On-site / WFO)', salary: 'Rp 6.0jt - Rp 10.0jt / bln', description: 'Bertindak sebagai asisten eksekutif utama Founder Luzie Group untuk mengawal implementasi proyek strategis, memonitor status target KPI tim, serta mendampingi kunjungan bisnis pimpinan.', requirements: ['Gelar S1 terkemuka (Manajemen, Bisnis, Hubungan Internasional, atau Hukum disukai)', 'Fasih berkomunikasi dalam Bahasa Inggris aktif lisan & tulisan tingkat mahir', 'Daya pikir analitis taktis, integritas prima, serta siap untuk dinas luar kota sewaktu-waktu'], archived: false },
  { title: 'Social Media Management', category: 'Creative Design & Content Strategy', location: 'Solo / WFH (Remote Indonesia)', salary: 'Rp 4.0jt - Rp 6.0jt / bln', description: 'Merancang ide konten mingguan kreatif, memproduksi dan menyunting video pendek (Reels, TikTok & Shorts), merias caption, serta membangun interaksi organik komunitas brand Luzie.', requirements: ['Keahlian tinggi mengoperasikan editor video CapCut, Premiere Pro, atau Adobe After Effects', 'Mengikuti update tren konten visual, audio, serta cara kerja algoritma media sosial terbaru', 'Wajib melampirkan portofolio kumpulan karya konten kreatif media sosial Anda'], archived: false },
];

function parseJsonSafe<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!raw || !spreadsheetId) return null;
  try {
    let decoded = raw.trim();
    if (!decoded.startsWith('{')) {
      try {
        const b64 = Buffer.from(decoded, 'base64').toString('utf8').trim();
        if (b64.startsWith('{')) decoded = b64;
      } catch { /* not base64 */ }
    }
    const creds = JSON.parse(decoded);
    if (!creds.client_email || !creds.private_key) return null;
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
  } catch { return null; }
}

async function ensureVacancyTab(sheets: any, spreadsheetId: string): Promise<void> {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = (meta.data.sheets ?? []).some((s: any) => s.properties?.title === VACANCY_TAB);
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: VACANCY_TAB } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${VACANCY_TAB}!A1`,
        valueInputOption: 'RAW', requestBody: { values: [VACANCY_HEADERS] },
      });
    }
  } catch { /* ignore — tab may already exist */ }
}

async function readVacancies(): Promise<any[]> {
  const client = getSheetsClient();
  if (!client) return SEED_VACANCIES;
  try {
    const { sheets, spreadsheetId } = client;
    await ensureVacancyTab(sheets, spreadsheetId);
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${VACANCY_TAB}!A2:G` });
    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      await writeVacancies(sheets, spreadsheetId, SEED_VACANCIES);
      return SEED_VACANCIES;
    }
    return rows.map((row: any[]) => ({
      title: row[0] || '', category: row[1] || '', location: row[2] || '', salary: row[3] || '',
      description: row[4] || '', requirements: parseJsonSafe<string[]>(row[5], []), archived: row[6] === 'true',
    })).filter((v: any) => v.title.trim() !== '');
  } catch {
    return SEED_VACANCIES;
  }
}

async function writeVacancies(sheets: any, spreadsheetId: string, vacancies: any[]): Promise<boolean> {
  try {
    await ensureVacancyTab(sheets, spreadsheetId);
    const rows = vacancies.map((v: any) => [
      v.title, v.category, v.location, v.salary, v.description,
      JSON.stringify(v.requirements || []), v.archived ? 'true' : 'false',
    ]);
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${VACANCY_TAB}!A2:G` });
    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${VACANCY_TAB}!A2`,
        valueInputOption: 'RAW', requestBody: { values: rows },
      });
    }
    return true;
  } catch { return false; }
}

function requireAuth(req: VercelRequest, res: VercelResponse): string | null {
  let token: string | null = null;
  if (req.headers.cookie) {
    const cookies = Object.fromEntries(req.headers.cookie.split(';').map((c) => {
      const p = c.trim().split('='); return [p[0], p.slice(1).join('=')];
    }));
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = requireAuth(req, res);
  if (!email) return;

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
      const client = getSheetsClient();
      if (!client) return res.status(503).json({ error: 'Google Sheets tidak terkonfigurasi.' });
      const ok = await writeVacancies(client.sheets, client.spreadsheetId, req.body);
      if (!ok) return res.status(500).json({ error: 'Gagal menyimpan perubahan lowongan.' });
      return res.json({ success: true, message: 'Lowongan pekerjaan berhasil disimpan.' });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengubah rincian lowongan ke server.' });
    }
  }

  return res.status(405).end();
}