import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { getRowById, updateRow } from '../../../src/lib/sheets.js';

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

  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    try {
      const row = await getRowById(id);
      return res.json({ data: row });
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil data.' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      await updateRow(id, req.body);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Gagal update data.' });
    }
  }

  return res.status(405).end();
}