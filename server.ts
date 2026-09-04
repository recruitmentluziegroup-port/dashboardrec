import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { createServer as createViteServer } from 'vite';

import { appendRow, getAllRows, getRowById, updateRow, getVacancies, saveVacancies, getTrackers, saveTrackers, getInterviews, appendInterview, updateInterview, deleteInterview, hasInterviewOverlap } from './src/lib/sheets';
import { MyPdfDocument } from './src/lib/pdf';
import { Applicant, ApplicationStatus, StatusLabelId } from './src/types';

const app = express();
const PORT = 3000;

// ─── Public status-check rate limiter (in-memory, per-instance) ────────────
// 5 attempts per 10 minutes per IP. Resets on cold start (acceptable: no PII
// leaked on failure — only the existence of a valid ID is exposed, which the
// candidate already knows).
const statusRateLimit = new Map<string, { count: number; resetAt: number }>();
const STATUS_RATE_LIMIT_MAX = 5;
const STATUS_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(req: express.Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkStatusRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = statusRateLimit.get(ip);
  if (!entry || now >= entry.resetAt) {
    statusRateLimit.set(ip, { count: 1, resetAt: now + STATUS_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= STATUS_RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

function statusLabelId(s: string): StatusLabelId {
  switch (s) {
    case 'Reviewed':
      return 'Sedang Ditinjau';
    case 'Accepted':
      return 'Diterima';
    case 'Rejected':
      return 'Tidak Lolos';
    case 'Interview HR':
      return 'Wawancara HR';
    case 'Interview User':
      return 'Wawancara User';
    case 'Pending':
    default:
      return 'Belum Direview';
  }
}

function normalizeStatus(s: string): ApplicationStatus {
  if (
    s === 'Reviewed' ||
    s === 'Accepted' ||
    s === 'Rejected' ||
    s === 'Interview HR' ||
    s === 'Interview User'
  ) {
    return s;
  }
  return 'Pending';
}

// Body parser with 10mb payload limit to handle complex JSON from form submissions
app.use(express.json({ limit: '10mb' }));

  // Health endpoint with Google Sheets connectivity check
  app.get('/api/health', (req, res) => {
    const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    
    // Find all environment variable names that might have similar terms to help diagnose typos
    const envKeys = Object.keys(process.env).filter(
      k => k.toUpperCase().includes('GOOGLE') || k.toUpperCase().includes('SHEET') || k.toUpperCase().includes('KEY') || k.toUpperCase().includes('SA')
    );

    let clientEmail = null;
    let parsingError = null;
    let keyPreview = null;

    if (keyEnv) {
      const trimmed = keyEnv.trim();
      keyPreview = trimmed.length > 20 
        ? `${trimmed.substring(0, 15)}...[length: ${trimmed.length}]...${trimmed.substring(trimmed.length - 15)}`
        : `Too short: ${trimmed}`;

      try {
        let decoded = trimmed;
        if (!decoded.startsWith('{')) {
          try {
            const potential = Buffer.from(decoded, 'base64').toString('utf8').trim();
            if (potential.startsWith('{')) {
              decoded = potential;
            }
          } catch (b64Err: any) {
            // Not base64
          }
        }
        const credentials = JSON.parse(decoded);
        clientEmail = credentials.client_email || 'Not found inside JSON';
      } catch (err: any) {
        parsingError = err.message || String(err);
        clientEmail = `Gagal parsing key: ${err.message}`;
      }
    }

    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      googleSheets: {
        configured: !!(keyEnv && sheetId),
        hasKey: !!keyEnv,
        keyPreview,
        hasSheetId: !!sheetId,
        sheetId: sheetId || null,
        clientEmail,
        parsingError,
        envKeys,
        hint: clientEmail ? `Pastikan Anda telah MENUNJUK/BERBAGI (Share) Google Sheet (${sheetId}) sebagai Editor ke email Service Account ini: ${clientEmail}` : 'Konfigurasi kredensial Google Sheets belum terpasang di server (.env atau container environment).'
      }
    });
  });

  // -------------------------------------------------------------
  // Authentication Middleware
  // -------------------------------------------------------------
  function authMiddleware(req: any, res: any, next: any) {
    let token = null;

    // Try extracting from Cookie
    if (req.headers.cookie) {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map((c: string) => {
          const parts = c.trim().split('=');
          return [parts[0], parts.slice(1).join('=')];
        })
      );
      token = cookies['luzie_session'];
    }

    // Try extracting from Authentication header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu sebagai admin.' });
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || 'luzie_secret_jwt_key_2026';
      const decoded = jwt.verify(token, jwtSecret) as any;
      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Sesi login telah kedaluwarsa atau tidak valid.' });
    }
  }

  // -------------------------------------------------------------
  // Validation helpers (tracker + interviews)
  // -------------------------------------------------------------
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

  function validateVacancies(vacancies: any[]): string | null {
    for (const v of vacancies) {
      if (!v || typeof v.title !== 'string' || v.title.trim() === '') return 'Setiap lowongan wajib memiliki Title.';
      if (v.priority !== undefined && v.priority !== '' && v.priority !== 'Normal' && v.priority !== 'High') return `Priority tidak valid: ${v.priority}.`;
      if (v.status !== undefined && v.status !== '' && !['Open', 'On Hold', 'Closed-Filled', 'Closed-Unfilled'].includes(v.status)) return `Status tidak valid: ${v.status}.`;
      for (const d of [v.tanggalDibuka, v.tanggalTerakhir, v.tanggalSelesai]) {
        if (d !== undefined && d !== '' && !DATE_RE.test(String(d))) return `Format tanggal harus YYYY-MM-DD: ${d}.`;
      }
      if (v.requirements !== undefined && !Array.isArray(v.requirements)) return 'Requirements harus berupa array.';
    }
    return null;
  }

  function validateTrackers(trackers: any[]): string | null {
    for (const t of trackers) {
      if (!t || typeof t.title !== 'string' || t.title.trim() === '') return 'Setiap tracker wajib memiliki Nama Posisi.';
      if (t.priority !== undefined && t.priority !== '' && t.priority !== 'Normal' && t.priority !== 'High') return `Priority tidak valid: ${t.priority}.`;
      if (t.status !== undefined && t.status !== '' && !['Open', 'On Hold', 'Closed-Filled', 'Closed-Unfilled'].includes(t.status)) return `Status tidak valid: ${t.status}.`;
      for (const d of [t.tanggalDibuka, t.tanggalTerakhir, t.tanggalSelesai]) {
        if (d !== undefined && d !== '' && !DATE_RE.test(String(d))) return `Format tanggal harus YYYY-MM-DD: ${d}.`;
      }
    }
    return null;
  }

  function validateInterviewBody(b: any): string | null {
    if (!b || typeof b !== 'object') return 'Data jadwal tidak valid.';
    for (const f of ['applicantId', 'candidateName', 'position', 'interviewer'] as const) {
      if (!b[f] || String(b[f]).trim() === '') return `Field wajib belum diisi: ${f}.`;
    }
    if (b.stage !== 'Interview HR' && b.stage !== 'Interview User') return 'Tahap harus Interview HR atau Interview User.';
    if (!DATE_RE.test(String(b.date || ''))) return 'Tanggal harus format YYYY-MM-DD.';
    if (!TIME_RE.test(String(b.startTime || '')) || !TIME_RE.test(String(b.endTime || ''))) return 'Jam mulai/selesai harus format HH:MM.';
    if (String(b.startTime) >= String(b.endTime)) return 'Jam selesai harus setelah jam mulai.';
    if (b.link && !/^https?:\/\//i.test(String(b.link))) return 'Link harus diawali http(s)://.';
    return null;
  }

  // -------------------------------------------------------------
  // API Endpoints
  // -------------------------------------------------------------

  // 0. VACANCIES MANAGEMENT ENDPOINTS

  // PUBLIC: active (non-archived, non-closed) vacancies only — what candidates see
  app.get('/api/vacancies', async (req, res) => {
    try {
      const all = await getVacancies();
      res.json(all.filter((v: any) => v.archived !== true && v.status !== 'Closed-Filled' && v.status !== 'Closed-Unfilled'));
    } catch (error) {
      console.error('Error reading vacancies:', error);
      res.status(500).json({ error: 'Gagal mengambil data lowongan pekerjaan.' });
    }
  });

  // PUBLIC: Status check — candidate verifies with their application ID and the
  // last 4 digits of their KTP. Returns ONLY sanitized data (no PII).
  app.get('/api/status', async (req, res) => {
    // 1. Rate limit
    const ip = getClientIp(req);
    const rl = checkStatusRateLimit(ip);
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      console.warn(`[status] rate limit exceeded for ip=${ip}`);
      return res.status(429).json({
        error: 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.',
      });
    }

    // 2. Validate query params
    const id = String((req.query as any)?.id ?? '').trim();
    const last4 = String((req.query as any)?.last4 ?? '').trim();
    if (!id || !/^APP-[0-9A-F]{8}$/i.test(id)) {
      return res.status(400).json({ error: 'ID lamaran tidak valid.' });
    }
    if (!/^\d{4}$/.test(last4)) {
      return res.status(400).json({ error: '4 digit terakhir KTP tidak valid.' });
    }

    // 3. Look up applicant and verify last 4 digits of KTP
    try {
      const applicant = await getRowById(id);
      if (!applicant) {
        return res.status(404).json({ error: 'Data lamaran tidak ditemukan atau verifikasi tidak cocok.' });
      }
      // nomorKtp may be a number in Sheets — coerce safely.
      const ktpLast4 = String(applicant.nomorKtp ?? '').slice(-4);
      if (!ktpLast4 || ktpLast4 !== last4) {
        return res.status(404).json({ error: 'Data lamaran tidak ditemukan atau verifikasi tidak cocok.' });
      }

      // 4. Sanitized payload — no PII exposed
      return res.json({
        data: {
          id: applicant.id,
          status: normalizeStatus(applicant.status),
          statusLabelId: statusLabelId(applicant.status),
          submissionDate: applicant.submissionDate,
          lastUpdated: applicant.lastUpdated,
          jabatanDituju: applicant.jabatanDituju,
        },
      });
    } catch (err: any) {
      console.error('[status] internal error:', err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
    }
  });

  // ADMIN: all vacancies including archived — protected
  // (?store=trackers serves the decoupled Treker Posisi list from the same
  // route so Vercel stays at 11 serverless functions.)
  app.get('/api/admin/vacancies', authMiddleware, async (req, res) => {
    try {
      if ((req.query as any)?.store === 'trackers') return res.json(await getTrackers());
      res.json(await getVacancies());
    } catch (error) {
      console.error('Error reading all vacancies:', error);
      res.status(500).json({ error: 'Gagal mengambil semua data lowongan.' });
    }
  });

  // ADMIN: persist vacancy changes (archived flag included) — protected
  app.post('/api/admin/vacancies', authMiddleware, async (req, res) => {
    try {
      if ((req.query as any)?.store === 'trackers') {
        const trackers = req.body;
        if (!Array.isArray(trackers)) {
          return res.status(400).json({ error: 'Data tracker harus berupa array.' });
        }
        const trackErr = validateTrackers(trackers);
        if (trackErr) return res.status(400).json({ error: trackErr });
        const trackOk = await saveTrackers(trackers);
        if (!trackOk) return res.status(500).json({ error: 'Gagal menyimpan data tracker.' });
        return res.json({ success: true, message: 'Data tracker berhasil disimpan.' });
      }
      const vacancies = req.body;
      if (!Array.isArray(vacancies)) {
        return res.status(400).json({ error: 'Data lowongan harus berupa array.' });
      }
      const err = validateVacancies(vacancies);
      if (err) return res.status(400).json({ error: err });
      const ok = await saveVacancies(vacancies);
      if (!ok) return res.status(500).json({ error: 'Gagal menyimpan perubahan lowongan.' });
      res.json({ success: true, message: 'Lowongan pekerjaan berhasil disimpan.' });
    } catch (error) {
      console.error('Error saving vacancies:', error);
      res.status(500).json({ error: 'Gagal merubah rincian lowongan ke server.' });
    }
  });

  // ADMIN: interview scheduling — protected
  app.get('/api/admin/interviews', authMiddleware, async (req, res) => {
    try {
      let list = await getInterviews();
      const { date, interviewer, applicantId } = req.query as any;
      if (date) list = list.filter((iv) => iv.date === String(date));
      if (interviewer) list = list.filter((iv) => iv.interviewer.toLowerCase() === String(interviewer).toLowerCase());
      if (applicantId) list = list.filter((iv) => iv.applicantId === String(applicantId));
      res.json(list);
    } catch (error) {
      console.error('Error reading interviews:', error);
      res.status(500).json({ error: 'Gagal mengambil jadwal interview.' });
    }
  });

  app.post('/api/admin/interviews', authMiddleware, async (req, res) => {
    try {
      const err = validateInterviewBody(req.body);
      if (err) return res.status(400).json({ error: err });
      const list = await getInterviews();
      if (hasInterviewOverlap(list, req.body)) {
        return res.status(409).json({ error: 'Pewawancara sudah memiliki jadwal lain pada waktu tersebut.' });
      }
      const created = await appendInterview(req.body);
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Error creating interview:', error);
      res.status(500).json({ error: 'Gagal menyimpan jadwal interview.' });
    }
  });

  app.get('/api/admin/interviews/:id', authMiddleware, async (req, res) => {
    try {
      const list = await getInterviews();
      const found = list.find((iv) => iv.id === req.params.id);
      if (!found) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      res.json({ data: found });
    } catch (error) {
      console.error('Error reading interview:', error);
      res.status(500).json({ error: 'Gagal mengambil jadwal interview.' });
    }
  });

  app.patch('/api/admin/interviews/:id', authMiddleware, async (req, res) => {
    try {
      const list = await getInterviews();
      const found = list.find((iv) => iv.id === req.params.id);
      if (!found) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      const merged = { ...found, ...req.body, id: found.id };
      const err = validateInterviewBody(merged);
      if (err) return res.status(400).json({ error: err });
      if (hasInterviewOverlap(list, merged, found.id)) {
        return res.status(409).json({ error: 'Pewawancara sudah memiliki jadwal lain pada waktu tersebut.' });
      }
      const updated = await updateInterview(found.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating interview:', error);
      res.status(500).json({ error: 'Gagal mengubah jadwal interview.' });
    }
  });

  app.delete('/api/admin/interviews/:id', authMiddleware, async (req, res) => {
    try {
      const ok = await deleteInterview(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting interview:', error);
      res.status(500).json({ error: 'Gagal menghapus jadwal interview.' });
    }
  });

  // 1. PUBLIC: Post Candidate Application Form
  app.post('/api/applications', async (req, res) => {
    try {
      const data = req.body;

      if (!data.namaLengkap || !data.emailPribadi || !data.noTelp) {
        return res.status(400).json({ error: 'Field wajib seperti Nama Lengkap, Email, dan No. HP harus diisi.' });
      }

      // Generate server-side metadata to guarantee integrity
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
        return res.status(500).json({ error: result.error || 'Gagal mengunggah formulir lamaran kerja ke Google Sheets. Periksa konfigurasi API server.' });
      }

      res.status(201).json({ success: true, id: applicantId });
    } catch (error: any) {
      console.error('Submission error in POST /api/applications:', error);
      res.status(500).json({ error: 'Terjadi kesalahan sistem di server saat memproses lamaran.' });
    }
  });

  // 2. PUBLIC: Admin Login handler
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;

      const expectedEmail = process.env.ADMIN_EMAIL || 'recruitmentluziegroup@gmail.com';
      const expectedPassword = process.env.ADMIN_PASSWORD || 'admin_luzie_secure';

      if (email === expectedEmail && password === expectedPassword) {
        const jwtSecret = process.env.JWT_SECRET || 'luzie_secret_jwt_key_2026';
        const token = jwt.sign({ email }, jwtSecret, { expiresIn: '24h' });

        // HTTPOnly cookie setting directly
        res.setHeader(
          'Set-Cookie',
          `luzie_session=${token}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict${
            process.env.NODE_ENV === 'production' ? '; Secure' : ''
          }`
        );

        return res.json({ success: true, email, token });
      }

      return res.status(401).json({ error: 'Kredensial salah. Email atau password admin tidak terdaftar.' });
    } catch (error) {
      res.status(500).json({ error: 'Gagal memproses login admin.' });
    }
  });

  // 3. PUBLIC: Retrieve Admin active user session
  app.get('/api/auth/me', (req, res) => {
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

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.json({ authenticated: false });
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || 'luzie_secret_jwt_key_2026';
      const decoded = jwt.verify(token, jwtSecret) as any;
      return res.json({ authenticated: true, email: decoded.email });
    } catch {
      return res.json({ authenticated: false });
    }
  });

  // 4. PUBLIC: Admin Logout
  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'luzie_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
    res.json({ success: true });
  });

  // 5. PROTECTED: Get all applications
  app.get('/api/admin/applications', authMiddleware, async (req, res) => {
    try {
      const list = await getAllRows();
      res.json({ data: list });
    } catch (error) {
      res.status(500).json({ error: 'Gagal mengambil data lampiran pelamar.' });
    }
  });

  // 6. PROTECTED: Get single application by ID
  app.get('/api/admin/applications/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const applicant = await getRowById(id);

      if (!applicant) {
        return res.status(404).json({ error: `Identitas pelamar dengan ID ${id} tidak ditemukan.` });
      }

      res.json({ data: applicant });
    } catch (error) {
      res.status(500).json({ error: 'Gagal mengambil rincian data pelamar.' });
    }
  });

  // 7. PROTECTED: Update application details or status
  app.patch('/api/admin/applications/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const fieldsToUpdate = req.body;

      const success = await updateRow(id, fieldsToUpdate);
      if (!success) {
        return res.status(500).json({ error: 'Gagal mengupdate lembar baris Google Sheets.' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Gagal merubah rincian data pelamar.' });
    }
  });

  // 8. PROTECTED: Export candidate details as PDF
  app.get('/api/admin/export/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const applicant = await getRowById(id);

      if (!applicant) {
        return res.status(404).send('Identitas pelamar tidak ditemukan.');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="data_personal_${id}_${applicant.namaLengkap.replace(/\s+/g, '_')}.pdf"`);

      // Generate the React-PDF document stream server-side
      const pdfNode = React.createElement(MyPdfDocument, { applicant });
      const stream = await renderToStream(pdfNode);

      stream.pipe(res);
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      res.status(500).send('Terjadi kesalahan server saat mencetak berkas PDF.');
    }
  });

  // -------------------------------------------------------------
  // Mounting Vite Server (Dev) or Serving Production Build (Dist)
  // -------------------------------------------------------------
  async function initViteAndListen() {
    if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted successfully (development mode).');
    } else if (process.env.VERCEL !== '1') {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log('Serving built static directory in production:', distPath);
    }

    if (process.env.VERCEL !== '1') {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server fully operational on http://0.0.0.0:${PORT}`);
      });
    }
  }

  initViteAndListen();

export default app;