import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_middleware.js';
import { getRowById } from '../../../src/lib/sheets.js';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { MyPdfDocument } from '../../../src/lib/pdf';
import { Applicant } from '../../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = requireAuth(req, res);
  if (!email) return;

  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query as { id: string };

  try {
    const applicant = await getRowById(id) as Applicant;
    if (!applicant) return res.status(404).json({ error: 'Data pelamar tidak ditemukan.' });

    const stream = await renderToStream(
      React.createElement(MyPdfDocument, { applicant })
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pelamar-${id}.pdf"`);
    stream.pipe(res);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal generate PDF.' });
  }
}