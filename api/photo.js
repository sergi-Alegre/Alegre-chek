import { put } from '@vercel/blob';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { dataUrl, plate, kind } = req.body || {};
    if (!dataUrl || !plate || !kind) return res.status(400).json({ error: 'Missing photo data' });

    const match = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(dataUrl);
    if (!match) return res.status(400).json({ error: 'Invalid image format' });

    const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 4_000_000) return res.status(413).json({ error: 'Image too large' });

    const safePlate = String(plate).replace(/[^a-z0-9-]/gi, '_');
    const safeKind = String(kind).replace(/[^a-z0-9-]/gi, '_');
    const pathname = `inspections/${safePlate}/${Date.now()}-${crypto.randomUUID()}-${safeKind}.${ext}`;

    const blob = await put(pathname, buffer, {
      access: 'private',
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      addRandomSuffix: false,
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error('photo upload error', error);
    return res.status(500).json({ error: 'Photo upload failed' });
  }
}
