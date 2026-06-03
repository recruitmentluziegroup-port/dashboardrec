import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { appendRow } from '../src/lib/sheets.js';
import { Applicant } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const data = req.body;

    if (!data.namaLengkap || !data.emailPribadi || !data.noTelp) {
      return res.status(400).json({ error: 'Field wajib seperti Nama Lengkap, Email, dan No. HP harus diisi.' });
    }

    const applicantId = `APP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const newApplicant: Applicant = {
      ...data,
      id: applicantId,
      submissionDate: timestamp,
      status: 'Pending',
      lastUpdated: timestamp,
    };

    const result = await appendRow(newApplicant);
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Gagal mengunggah formulir lamaran kerja ke Google Sheets.' });
    }

    res.status(201).json({ success: true, id: applicantId });
  } catch (error: any) {
    console.error('Submission error in POST /api/applications:', error);
    res.status(500).json({ error: 'Terjadi kesalahan sistem di server saat memproses lamaran.' });
  }
}
