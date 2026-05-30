import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_middleware.js';
import { getAllRows } from '../../src/lib/sheets.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = requireAuth(req, res);
  if (!email) return;

  if (req.method !== 'GET') return res.status(405).end();

  try {
    const rows = await getAllRows();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal mengambil data aplikasi.' });
  }
}