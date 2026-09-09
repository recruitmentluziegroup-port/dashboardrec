import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { appendRow } from '../src/lib/sheets.js';
import { Applicant, SUMBER_OPTIONS, SUMBER_WARRANTS_KETERANGAN } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const data = req.body;

    if (!data.namaLengkap || !data.emailPribadi || !data.noTelp) {
      return res.status(400).json({ error: 'Field wajib seperti Nama Lengkap, Email, dan No. HP harus diisi.' });
    }

    // ── Sumber Info Lowongan validation (design 2026-09-08 §2) ───────────────
    const sumber = typeof data.sumberInfoLowongan === 'string' ? data.sumberInfoLowongan.trim() : '';
    // Invalid values are rejected outright. Missing/empty is tolerated during
    // the rollout window so stale open form tabs don't get bricked.
    // ponytail: flip to required after rollout window (~2026-09-22)
    if (sumber && !(SUMBER_OPTIONS as readonly string[]).includes(sumber)) {
      return res.status(400).json({ error: 'Sumber informasi lowongan tidak valid. Silakan muat ulang halaman dan pilih ulang.' });
    }
    const keteranganSumber = typeof data.keteranganSumber === 'string' ? data.keteranganSumber.trim() : '';
    if (keteranganSumber) {
      if (!SUMBER_WARRANTS_KETERANGAN.includes(sumber)) {
        return res.status(400).json({ error: 'Keterangan sumber hanya diisi untuk sumber Teman/Keluarga/Karyawan Luzie atau Lainnya.' });
      }
      if (keteranganSumber.length > 100) {
        return res.status(400).json({ error: 'Keterangan sumber maksimal 100 karakter.' });
      }
    }

    const applicantId = `APP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const newApplicant: Applicant = {
      ...data,
      sumberInfoLowongan: sumber,
      keteranganSumber: keteranganSumber,
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
