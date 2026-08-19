import { neon } from '@neondatabase/serverless';
import { put, del } from '@vercel/blob';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const result = { database: false, blob: false };
  let blobUrl = null;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const testId = `selftest-${crypto.randomUUID()}`;
    await sql`CREATE TABLE IF NOT EXISTS alegre_selftest (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`INSERT INTO alegre_selftest (id) VALUES (${testId})`;
    const rows = await sql`SELECT id FROM alegre_selftest WHERE id = ${testId}`;
    result.database = rows?.[0]?.id === testId;
    await sql`DELETE FROM alegre_selftest WHERE id = ${testId}`;

    const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64');
    const blob = await put(`selftest/${testId}.png`, tinyPng, { access: 'private', contentType: 'image/png', addRandomSuffix: false });
    blobUrl = blob.url;
    result.blob = Boolean(blob.url);
    await del(blob.url);

    return res.status(200).json({ ok: result.database && result.blob, ...result });
  } catch (error) {
    console.error('self test failed', error);
    if (blobUrl) { try { await del(blobUrl); } catch {} }
    return res.status(500).json({ ok: false, ...result, error: 'Self test failed' });
  }
}
