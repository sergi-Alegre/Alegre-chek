export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    blobStoreConfigured: Boolean(process.env.BLOB_STORE_ID),
    oidcAvailable: Boolean(process.env.VERCEL_OIDC_TOKEN),
  });
}
