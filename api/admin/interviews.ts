import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const INTERVIEW_TAB = 'Interviews';
const INTERVIEW_HEADERS = ['ID', 'Applicant ID', 'Candidate Name', 'Position', 'Stage', 'Date', 'Start Time', 'End Time', 'Interviewer', 'Location', 'Link', 'Notes'];
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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

async function ensureInterviewTab(): Promise<void> {
  const meta = await sheetsFetch<{ sheets?: { properties?: { title?: string } }[] }>('');
  if ((meta.sheets ?? []).some((s) => s.properties?.title === INTERVIEW_TAB)) return;
  await sheetsFetch(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: INTERVIEW_TAB } } }] }) });
  await sheetsFetch(`/values/${encodeURIComponent(INTERVIEW_TAB + '!A1')}`, { method: 'PUT', body: JSON.stringify({ values: [INTERVIEW_HEADERS] }) });
}

function toRow(iv: any): any[] {
  return [iv.id || '', iv.applicantId || '', iv.candidateName || '', iv.position || '', iv.stage || '', iv.date || '', iv.startTime || '', iv.endTime || '', iv.interviewer || '', iv.location || '', iv.link || '', iv.notes || ''];
}

function fromRow(row: any[]): any {
  return {
    id: row[0] || '', applicantId: row[1] || '', candidateName: row[2] || '', position: row[3] || '',
    stage: row[4] || 'Interview HR', date: row[5] || '', startTime: row[6] || '', endTime: row[7] || '',
    interviewer: row[8] || '', location: row[9] || '', link: row[10] || '', notes: row[11] || '',
  };
}

async function readInterviews(): Promise<any[]> {
  const data = await sheetsFetch<{ values?: string[][] }>(`/values/${encodeURIComponent(INTERVIEW_TAB + '!A2:L')}`);
  return (data.values ?? []).map(fromRow).filter((iv) => iv.id !== '');
}

async function rewriteAll(list: any[]): Promise<void> {
  await sheetsFetch(`/values/${encodeURIComponent(INTERVIEW_TAB + '!A2:L')}:clear`, { method: 'POST' });
  if (list.length > 0) {
    await sheetsFetch(`/values/${encodeURIComponent(INTERVIEW_TAB + '!A2')}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: list.map(toRow) }) });
  }
}

function validateInterviewBody(b: any, partial = false): string | null {
  if (!b || typeof b !== 'object') return 'Data jadwal tidak valid.';
  const required = ['applicantId', 'candidateName', 'position', 'interviewer'];
  for (const f of required) {
    if (!partial && (!b[f] || String(b[f]).trim() === '')) return `Field wajib belum diisi: ${f}.`;
    if (partial && f in b && (!b[f] || String(b[f]).trim() === '')) return `Field wajib belum diisi: ${f}.`;
  }
  if (!partial || b.stage !== undefined) {
    if (b.stage !== 'Interview HR' && b.stage !== 'Interview User') return 'Tahap harus Interview HR atau Interview User.';
  }
  if (!partial || b.date !== undefined) {
    if (!DATE_RE.test(String(b.date || ''))) return 'Tanggal harus format YYYY-MM-DD.';
  }
  if (!partial || b.startTime !== undefined) {
    if (!TIME_RE.test(String(b.startTime || ''))) return 'Jam mulai harus format HH:MM.';
  }
  if (!partial || b.endTime !== undefined) {
    if (!TIME_RE.test(String(b.endTime || ''))) return 'Jam selesai harus format HH:MM.';
  }
  const start = b.startTime !== undefined ? String(b.startTime) : null;
  const end = b.endTime !== undefined ? String(b.endTime) : null;
  if (start !== null && end !== null && start >= end) return 'Jam selesai harus setelah jam mulai.';
  if (b.link && !/^https?:\/\//i.test(String(b.link))) return 'Link harus diawali http(s)://.';
  return null;
}

function toMin(t: string): number {
  const [h, m] = String(t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function overlaps(list: any[], c: any, excludeId?: string): boolean {
  const s = toMin(c.startTime);
  const e = toMin(c.endTime);
  return list.some((iv) => {
    if (excludeId && iv.id === excludeId) return false;
    if (c.id && iv.id === c.id) return false;
    if (!iv.date || iv.date !== c.date) return false;
    const sameI = iv.interviewer && c.interviewer && String(iv.interviewer).trim().toLowerCase() === String(c.interviewer).trim().toLowerCase();
    const sameA = iv.applicantId && c.applicantId && iv.applicantId === c.applicantId;
    if (!sameI && !sameA) return false;
    return s < toMin(iv.endTime) && toMin(iv.startTime) < e;
  });
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = requireAuth(req, res);
  if (!email) return;
  // Single-resource actions arrive via rewrite /api/admin/interviews/:id -> ?id=:id
  const id = String((req.query as any)?.id ?? '');

  if (req.method === 'GET') {
    try {
      await ensureInterviewTab();
      const list = await readInterviews();
      if (id) {
        const found = list.find((iv) => iv.id === id);
        if (!found) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
        return res.json({ data: found });
      }
      let filtered = list;
      const { date, interviewer, applicantId } = (req.query ?? {}) as any;
      if (date) filtered = filtered.filter((iv) => iv.date === String(date));
      if (interviewer) filtered = filtered.filter((iv) => String(iv.interviewer).toLowerCase() === String(interviewer).toLowerCase());
      if (applicantId) filtered = filtered.filter((iv) => iv.applicantId === String(applicantId));
      return res.json(filtered);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengambil jadwal interview.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const err = validateInterviewBody(req.body);
      if (err) return res.status(400).json({ error: err });
      await ensureInterviewTab();
      const list = await readInterviews();
      if (overlaps(list, req.body)) {
        return res.status(409).json({ error: 'Pewawancara sudah memiliki jadwal lain pada waktu tersebut.' });
      }
      const created = { ...req.body, id: `INT-${crypto.randomBytes(4).toString('hex').toUpperCase()}` };
      await sheetsFetch(`/values/${encodeURIComponent(INTERVIEW_TAB + '!A:A')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST', body: JSON.stringify({ values: [toRow(created)] }),
      });
      return res.status(201).json({ success: true, data: created });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal menyimpan jadwal interview.' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      if (!id) return res.status(400).json({ error: 'ID jadwal wajib diisi.' });
      const list = await readInterviews();
      const idx = list.findIndex((iv) => iv.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      const merged = { ...list[idx], ...(req.body ?? {}), id };
      const err = validateInterviewBody(merged);
      if (err) return res.status(400).json({ error: err });
      if (overlaps(list, merged, id)) {
        return res.status(409).json({ error: 'Pewawancara sudah memiliki jadwal lain pada waktu tersebut.' });
      }
      list[idx] = merged;
      await rewriteAll(list);
      return res.json({ success: true, data: merged });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengubah jadwal interview.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (!id) return res.status(400).json({ error: 'ID jadwal wajib diisi.' });
      const list = await readInterviews();
      const filtered = list.filter((iv) => iv.id !== id);
      if (filtered.length === list.length) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      await rewriteAll(filtered);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal menghapus jadwal interview.' });
    }
  }

  return res.status(405).end();
}
