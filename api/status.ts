import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

let cachedFirstSheetName: string | null = null;
let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

const statusRateLimit = new Map<string, { count: number; resetAt: number }>();

function parseCredentials(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    let decoded = raw.trim();
    if (!decoded.startsWith('{')) {
      try {
        const b64 = Buffer.from(decoded, 'base64').toString('utf8').trim();
        if (b64.startsWith('{')) decoded = b64;
      } catch {
        // not base64
      }
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
    {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    },
    creds.private_key,
    { algorithm: 'RS256' },
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
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
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 204) return undefined as unknown as T;
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Sheets API ${res.status}: ${errBody.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function getAllSheetNames(): Promise<string[]> {
  const meta = await sheetsFetch<{ sheets?: { properties?: { title?: string } }[] }>(
    '?fields=sheets.properties.title',
  );
  return (meta.sheets || [])
    .map((s) => s.properties?.title || '')
    .filter(Boolean);
}

async function getFirstSheetName(): Promise<string> {
  if (cachedFirstSheetName) return cachedFirstSheetName;
  const all = await getAllSheetNames();
  cachedFirstSheetName = all[0] || 'Sheet1';
  return cachedFirstSheetName;
}

function getClientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).split(',')[0].trim();
  }
  const xReal = req.headers['x-real-ip'];
  if (typeof xReal === 'string' && xReal.length > 0) return xReal;
  const sock = (req.socket as any)?.remoteAddress;
  return sock || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = statusRateLimit.get(ip);
  if (!entry || now >= entry.resetAt) {
    statusRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

function statusLabelId(s: string): 'Belum Direview' | 'Sedang Ditinjau' | 'Diterima' | 'Tidak Lolos' {
  switch (s) {
    case 'Reviewed':
      return 'Sedang Ditinjau';
    case 'Accepted':
      return 'Diterima';
    case 'Rejected':
      return 'Tidak Lolos';
    case 'Pending':
    default:
      return 'Belum Direview';
  }
}

function normalizeStatus(s: string): 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected' {
  if (s === 'Reviewed' || s === 'Accepted' || s === 'Rejected') return s;
  return 'Pending';
}

function readStringParam(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? '');
  return v == null ? '' : String(v);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  }

  // -------------------------------------------------------------------
  // DEBUG BRANCH — X-Debug-Status: 1
  // Bypasses rate limit + input validation. Returns raw sheet structure
  // for diagnosing lookup failures. Safe to keep in production — the
  // header is never sent by browsers/fetch/axios.
  // -------------------------------------------------------------------
  if (req.headers['x-debug-status'] === '1') {
    try {
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      if (!spreadsheetId) {
        return res.status(500).json({ error: 'GOOGLE_SHEET_ID not set' });
      }
      const tabs = await getAllSheetNames();
      const selectedTab = tabs[0] || 'Sheet1';
      const data = await sheetsFetch<{ values?: string[][] }>(
        `/values/${encodeURIComponent(selectedTab)}!A1:BJ`,
      );
      const rows = data.values || [];
      return res.status(200).json({
        spreadsheetIdPrefix: spreadsheetId.slice(0, 8) + '...',
        allTabs: tabs,
        selectedTab,
        rowCount: rows.length,
        headerRow: rows[0] || [],
        firstFiveDataRows: rows.slice(1, 6).map((r) => ({
          col0_applicantId: r[0] || '',
          col1_submissionDate: r[1] || '',
          col2_status: r[2] || '',
          col3_lastUpdated: r[3] || '',
          col4_namaLengkap: r[4] || '',
          col5_tempatLahir: r[5] || '',
          col6_tanggalLahir: r[6] || '',
          col12_jenisKelamin: r[12] || '',
          col13_nomorKtp_raw: r[13] || '',
          col13_nomorKtp_last4: String(r[13] || '').slice(-4),
          col14_simC: r[14] || '',
          col36_jabatanDituju: r[36] || '',
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    console.warn(`[status] rate limit exceeded for ip=${ip}`);
    return res.status(429).json({
      error: 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.',
    });
  }

  const id = readStringParam((req.query as any)?.id).trim();
  const last4 = readStringParam((req.query as any)?.last4).trim();

  if (!id || !/^APP-[0-9A-F]{8}$/i.test(id)) {
    return res.status(400).json({ error: 'ID lamaran tidak valid.' });
  }
  if (!/^\d{4}$/.test(last4)) {
    return res.status(400).json({ error: '4 digit terakhir KTP tidak valid.' });
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const creds = parseCredentials();
    if (!creds || !spreadsheetId) {
      console.error('[status] sheets env not configured');
      return res.status(500).json({ error: 'Layanan tidak tersedia. Coba lagi nanti.' });
    }

    const sheetTitle = await getFirstSheetName();
    const range = `${sheetTitle}!A2:BJ`;
    const data = await sheetsFetch<{ values?: string[][] }>(
      `/values/${encodeURIComponent(range)}`,
    );
    const rows = data.values || [];

    // nomorKtp is at column index 13 (HEADERS index 13 = 'Nomor KTP').
    // See src/lib/sheets.ts: rowToApplicant() reads row[13] for nomorKtp.
    const match = rows.find((r) => (r[0] || '').toString() === id);
    if (!match) {
      return res
        .status(404)
        .json({ error: 'Data lamaran tidak ditemukan atau verifikasi tidak cocok.' });
    }
    const ktpLast4 = String(match[13] || '').slice(-4);
    if (!ktpLast4 || ktpLast4 !== last4) {
      return res
        .status(404)
        .json({ error: 'Data lamaran tidak ditemukan atau verifikasi tidak cocok.' });
    }

    const rawStatus = (match[2] || 'Pending').toString();
    return res.status(200).json({
      id: (match[0] || '').toString(),
      status: normalizeStatus(rawStatus),
      statusLabelId: statusLabelId(rawStatus),
      submissionDate: (match[1] || '').toString(),
      lastUpdated: (match[3] || '').toString(),
      jabatanDituju: (match[36] || '').toString(),
    });
  } catch (err: any) {
    console.error('[status] internal error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
  }
}
