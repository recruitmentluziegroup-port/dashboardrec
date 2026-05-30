import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader(
    'Set-Cookie',
    'luzie_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure'
  );
  return res.json({ success: true });
}