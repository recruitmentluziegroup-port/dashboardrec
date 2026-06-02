import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { getVacancies, saveVacancies } from '../../src/lib/sheets.js';

function requireAuth(req: VercelRequest, res: VercelResponse): string | null {
  let token = null;
  if (req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map((c: string) => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    token = cookies['luzie_session'];
  }
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    res.status(401).json({ error: 'Akses ditolak.' });
    return null;
  }
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
      const vacancies = await getVacancies();
      return res.json(vacancies);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengambil data lowongan.' });
    }
  }

  if (req.method === 'POST') {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Data lowongan harus berupa array.' });
      }
      const ok = await saveVacancies(req.body);
      if (!ok) return res.status(500).json({ error: 'Gagal menyimpan perubahan lowongan.' });
      return res.json({ success: true, message: 'Lowongan pekerjaan berhasil disimpan.' });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Gagal mengubah rincian lowongan ke server.' });
    }
  }

  return res.status(405).end();
}