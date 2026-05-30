import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  let clientEmail = null;
  let parsingError = null;

  if (keyEnv) {
    try {
      let decoded = keyEnv.trim();
      if (!decoded.startsWith('{')) {
        decoded = Buffer.from(decoded, 'base64').toString('utf8').trim();
      }
      const credentials = JSON.parse(decoded);
      clientEmail = credentials.client_email || 'Not found';
    } catch (err: any) {
      parsingError = err.message;
    }
  }

  return res.json({
    status: 'ok',
    time: new Date().toISOString(),
    googleSheets: {
      configured: !!(keyEnv && sheetId),
      hasKey: !!keyEnv,
      hasSheetId: !!sheetId,
      clientEmail,
      parsingError,
    }
  });
}