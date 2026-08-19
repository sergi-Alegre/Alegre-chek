import { neon } from '@neondatabase/serverless';

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  return neon(process.env.DATABASE_URL);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const sql = getSql();
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
      ? String(req.query.month)
      : new Date().toISOString().slice(0, 7);

    const rows = await sql`
      SELECT
        driver,
        COUNT(*) FILTER (WHERE score IS NOT NULL)::int AS evaluated_dropoffs,
        COALESCE(SUM(score) FILTER (WHERE score IS NOT NULL), 0)::int AS points,
        ROUND(AVG(score) FILTER (WHERE score IS NOT NULL)::numeric, 2) AS average,
        COUNT(*) FILTER (WHERE score = 10)::int AS tens,
        COUNT(*) FILTER (WHERE score = 5)::int AS fives,
        COUNT(*) FILTER (WHERE score = 0)::int AS zeros,
        COUNT(*) FILTER (WHERE score_status = 'review')::int AS pending_reviews
      FROM inspections
      WHERE mode = 'dropoff'
        AND to_char(created_at AT TIME ZONE 'Europe/Madrid', 'YYYY-MM') = ${month}
      GROUP BY driver
      ORDER BY average DESC NULLS LAST, evaluated_dropoffs DESC, driver ASC
    `;

    return res.status(200).json({ month, ranking: rows });
  } catch (error) {
    console.error('ranking error', error);
    return res.status(500).json({ error: 'Ranking unavailable' });
  }
}
