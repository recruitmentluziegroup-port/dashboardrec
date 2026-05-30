import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // GET — public, no auth needed
  if (req.method === 'GET') {
    try {
      const filePath = path.join(process.cwd(), 'src/data/vacancies.json');
      const data = fs.readFileSync(filePath, 'utf-8');
      return res.json(JSON.parse(data));
    } catch {
      return res.json([]);
    }
  }

  // POST — requires auth
  if (req.method === 'POST') {
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
    if (!token) return res.status(401).json({ error: 'Akses ditolak.' });

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return res.status(401).json({ error: 'Sesi kedaluwarsa.' });
    }

    // Vercel filesystem is read-only — save changes to src/data/vacancies.json via GitHub
    return res.status(200).json({ 
      success: true, 
      message: 'Perubahan lowongan diterima. Untuk menyimpan permanen, update src/data/vacancies.json dan push ke GitHub.' 
    });
  }

  return res.status(405).end();
}