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

import { appendRow, getAllRows, getRowById, updateRow } from './src/lib/sheets';
import { MyPdfDocument } from './src/lib/pdf';
import { Applicant } from './src/types';

const app = express();
const PORT = 3000;

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
  // API Endpoints
  // -------------------------------------------------------------

  // 0. VACANCIES MANAGEMENT ENDPOINTS
  app.get('/api/vacancies', async (req, res) => {
    try {
      const vacanciesPath = path.join(process.cwd(), 'src/data/vacancies.json');
      if (!fs.existsSync(vacanciesPath)) {
        return res.json([]);
      }
      const data = await fs.promises.readFile(vacanciesPath, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      console.error('Error reading vacancies file:', error);
      res.status(500).json({ error: 'Gagal mengambil data lowongan pekerjaan.' });
    }
  });

  app.post('/api/vacancies', authMiddleware, async (req, res) => {
    try {
      const vacancies = req.body;
      if (!Array.isArray(vacancies)) {
        return res.status(400).json({ error: 'Data lowongan harus berupa list array.' });
      }

      const vacanciesPath = path.join(process.cwd(), 'src/data/vacancies.json');
      const dirPath = path.dirname(vacanciesPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      await fs.promises.writeFile(vacanciesPath, JSON.stringify(vacancies, null, 2), 'utf8');
      res.json({ success: true, message: 'Lowongan pekerjaan berhasil disimpan.' });
    } catch (error) {
      console.error('Error saving vacancies:', error);
      res.status(500).json({ error: 'Gagal merubah rincian lowongan ke server.' });
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
