import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVacancies } from '../src/lib/sheets.js';

// PUBLIC endpoint — returns only active (non-archived) vacancies.
// Archived vacancies are never sent to the candidate portal.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const all = await getVacancies();
    const active = all.filter(v => v.archived !== true);
    return res.json(active);
  } catch {
    return res.status(500).json({ error: 'Gagal mengambil data lowongan.' });
  }
}