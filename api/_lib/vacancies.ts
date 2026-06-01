import { JWT } from 'google-auth-library';

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
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

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
      'Memiliki keterampilan komunikasi verbal & tertulis yang rapi, ramah, dan cakap',
    ],
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
      'Memiliki nalar psikologi copywriting penawaran tinggi yang menarik minat beli',
    ],
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
      'Daya pikir analitis taktis, integritas prima, serta siap untuk dinas luar kota sewaktu-waktu',
    ],
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
      'Wajib melampirkan portofolio kumpulan karya konten kreatif media sosial Anda',
    ],
  },
];

let cachedVacancies: Vacancy[] | null = null;
let _authClient: JWT | null = null;

function getAuthClient(): JWT | null {
  if (_authClient) return _authClient;

  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyEnv) return null;

  try {
    let decoded = keyEnv.trim();
    if (!decoded.startsWith('{')) {
      try {
        const potential = Buffer.from(decoded, 'base64').toString('utf8').trim();
        if (potential.startsWith('{')) decoded = potential;
      } catch { /* not base64 */ }
    }

    const credentials = JSON.parse(decoded);
    if (!credentials.client_email || !credentials.private_key) {
      console.error('Service account key missing client_email or private_key');
      return null;
    }

    _authClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return _authClient;
  } catch (err) {
    console.error('Failed to create auth client:', err);
    return null;
  }
}

async function sheetsRequest<T = any>(
  pathAndQuery: string,
  init: RequestInit = {},
): Promise<T> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID not set');

  const client = getAuthClient();
  if (!client) throw new Error('Google auth not configured');

  const tokenRes = await client.getAccessToken();
  if (!tokenRes.token) throw new Error('Failed to obtain access token');

  const url = `${SHEETS_API}/${spreadsheetId}${pathAndQuery}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokenRes.token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 204) return undefined as unknown as T;
  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Sheets API ${res.status}: ${JSON.stringify(body)}`);
  }

  return body as T;
}

async function ensureVacancyTab(): Promise<void> {
  try {
    const meta = await sheetsRequest<{
      sheets?: { properties?: { title?: string } }[];
    }>('');

    const exists = (meta.sheets ?? []).some(
      (s) => s.properties?.title === VACANCY_TAB,
    );
    if (exists) return;

    await sheetsRequest(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: VACANCY_TAB } } }],
      }),
    });

    await sheetsRequest(`/values/${encodeURIComponent(VACANCY_TAB + '!A1')}`, {
      method: 'PUT',
      body: JSON.stringify({ values: [VACANCY_HEADERS] }),
    });
  } catch (err) {
    console.error('Error ensuring Vacancies tab:', err);
  }
}

function parseJsonSafe<T>(jsonStr: any, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

function readLocalVacancies(): Vacancy[] {
  return SEED_VACANCIES;
}

export async function getVacancies(): Promise<Vacancy[]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const client = getAuthClient();

  if (!client || !spreadsheetId) {
    if (cachedVacancies) return cachedVacancies;
    cachedVacancies = readLocalVacancies();
    return cachedVacancies;
  }

  try {
    await ensureVacancyTab();

    const data = await sheetsRequest<{
      values?: string[][];
    }>(`/values/${encodeURIComponent(VACANCY_TAB + '!A2:G')}`);

    const rows = data.values;
    if (!rows || rows.length === 0) {
      const local = readLocalVacancies();
      if (local.length > 0) await saveVacancies(local);
      cachedVacancies = local;
      return local;
    }

    const fetched = rows
      .map((row) => ({
        title: row[0] || '',
        category: row[1] || '',
        location: row[2] || '',
        salary: row[3] || '',
        description: row[4] || '',
        requirements: parseJsonSafe<string[]>(row[5], []),
        archived: row[6] === 'true',
      }))
      .filter((v) => v.title.trim() !== '');

    cachedVacancies = fetched;
    return fetched;
  } catch (error) {
    console.error('Error reading vacancies:', error);
    if (cachedVacancies) return cachedVacancies;
    cachedVacancies = readLocalVacancies();
    return cachedVacancies;
  }
}

export async function saveVacancies(vacancies: Vacancy[]): Promise<boolean> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const client = getAuthClient();

  cachedVacancies = null;

  if (!client || !spreadsheetId) {
    cachedVacancies = vacancies;
    return true;
  }

  try {
    await ensureVacancyTab();

    const rows = vacancies.map((v) => [
      v.title,
      v.category,
      v.location,
      v.salary,
      v.description,
      JSON.stringify(v.requirements || []),
      v.archived ? 'true' : 'false',
    ]);

    await sheetsRequest(
      `/values/${encodeURIComponent(VACANCY_TAB + '!A2:G')}:clear`,
      { method: 'POST' },
    );

    if (rows.length > 0) {
      await sheetsRequest(
        `/values/${encodeURIComponent(VACANCY_TAB + '!A2')}?valueInputOption=RAW`,
        {
          method: 'PUT',
          body: JSON.stringify({ values: rows }),
        },
      );
    }

    cachedVacancies = vacancies;
    return true;
  } catch (error) {
    console.error('Error saving vacancies:', error);
    return false;
  }
}
