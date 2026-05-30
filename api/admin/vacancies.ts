import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_middleware.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = requireAuth(req, res);
  if (!email) return;

  const vacanciesPath = path.join(process.cwd(), 'src/data/vacancies.json');

  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(vacanciesPath, 'utf-8');
      return res.json(JSON.parse(data));
    } catch {
      return res.status(500).json({ error: 'Gagal membaca data lowongan.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = fs.readFileSync(vacanciesPath, 'utf-8');
      const vacancies = JSON.parse(data);
      vacancies.push(req.body);
      fs.writeFileSync(vacanciesPath, JSON.stringify(vacancies, null, 2));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Gagal menyimpan lowongan.' });
    }
  }

  return res.status(405).end();
}