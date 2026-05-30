import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { getVacancies, saveVacancies } from '../../src/lib/sheets';

function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  let token: string | null = null;

  if (req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map((c: string) => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    token = cookies['luzie_session'] ?? null;
  }
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
    return false;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return true;
  } catch {
    res.status(401).json({ error: 'Sesi login telah kedaluwarsa.' });
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  // GET — return ALL vacancies including archived (admin needs to see everything)
  if (req.method === 'GET') {
    try {
      const all = await getVacancies();
      return res.json(all);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil data lowongan.' });
    }
  }

  // POST — persist vacancy changes (including archived flag) to Google Sheets
  if (req.method === 'POST') {
    const vacancies = req.body;
    if (!Array.isArray(vacancies)) {
      return res.status(400).json({ error: 'Data lowongan harus berupa array.' });
    }
    try {
      const ok = await saveVacancies(vacancies);
      if (!ok) return res.status(500).json({ error: 'Gagal menyimpan perubahan lowongan.' });
      return res.json({ success: true, message: 'Lowongan pekerjaan berhasil disimpan.' });
    } catch {
      return res.status(500).json({ error: 'Terjadi kesalahan saat menyimpan lowongan.' });
    }
  }

  return res.status(405).end();
}