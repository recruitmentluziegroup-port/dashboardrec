import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { getRowById } from '../../../src/lib/sheets.js';
import { MyPdfDocument } from '../../../src/lib/pdf.js';

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

  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query as { id: string };

  try {
    const applicant = await getRowById(id);

    if (!applicant) {
      return res.status(404).json({ error: 'Identitas pelamar tidak ditemukan.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="data_personal_${id}_${applicant.namaLengkap.replace(/\s+/g, '_')}.pdf"`
    );

    const pdfNode = React.createElement(MyPdfDocument, { applicant });
    const stream = await renderToStream(pdfNode);

    stream.pipe(res);
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat mencetak berkas PDF.' });
  }
}
