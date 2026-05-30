import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware.js';
import { getRowById, updateRow } from '../../../src/lib/sheets.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = requireAuth(req, res);
  if (!email) return;

  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    try {
      const row = await getRowById(id);
      return res.json(row);
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