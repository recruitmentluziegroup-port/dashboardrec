import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  const expectedEmail = process.env.ADMIN_EMAIL!;
  const expectedPassword = process.env.ADMIN_PASSWORD!;

  if (email === expectedEmail && password === expectedPassword) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '24h' });
    res.setHeader(
      'Set-Cookie',
      `luzie_session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict; Secure`
    );
    return res.json({ success: true, email, token });
  }

  return res.status(401).json({ error: 'Kredensial salah. Email atau password admin tidak terdaftar.' });
}