import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  let databaseReachable = false;
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      const result = await sql`SELECT 1 AS ok`;
      databaseReachable = result?.[0]?.ok === 1;
    } catch (error) {
      console.error('database health error', error);
    }
  }

  return res.status(200).json({
    ok: true,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseReachable,
    blobStoreConfigured: Boolean(process.env.BLOB_STORE_ID),
    blobWriteTokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    oidcAvailable: Boolean(process.env.VERCEL_OIDC_TOKEN),
  });
}
