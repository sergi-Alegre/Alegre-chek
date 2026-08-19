import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  return neon(process.env.DATABASE_URL);
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK (mode IN ('pickup','dropoff')),
      driver TEXT NOT NULL,
      plate TEXT NOT NULL,
      apt BOOLEAN,
      reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      photos JSONB NOT NULL DEFAULT '{}'::jsonb,
      checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
      linked_dropoff_id TEXT,
      linked_pickup_id TEXT,
      score_status TEXT NOT NULL DEFAULT 'pending',
      score INTEGER,
      review_reason TEXT,
      reviewed_by TEXT,
      review_notes TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS inspections_plate_created_idx ON inspections (plate, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS inspections_score_status_idx ON inspections (score_status)`;
}

function decisionFor(dropoff, pickup) {
  const reasons = Array.isArray(pickup.reasons) ? pickup.reasons : [];
  if (dropoff.driver === pickup.driver) {
    return { status: 'review', score: null, reason: 'same_driver' };
  }
  if (pickup.apt === true) {
    return { status: 'auto', score: 10, reason: 'next_pickup_apt' };
  }
  if (pickup.apt === false && reasons.length === 1 && reasons[0] === 'Mecánica') {
    return { status: 'auto', score: 10, reason: 'mechanical_only' };
  }
  if (pickup.apt === false) {
    if (reasons.includes('Plancha')) return { status: 'review', score: null, reason: 'bodywork_dispute' };
    if (reasons.includes('Limpieza interior') || reasons.includes('Limpieza exterior')) {
      return { status: 'review', score: null, reason: 'cleaning_dispute' };
    }
    return { status: 'review', score: null, reason: 'mixed_or_other_dispute' };
  }
  return { status: 'pending', score: null, reason: null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body || {};
    if (!['pickup', 'dropoff'].includes(payload.mode) || !payload.driver || !payload.plate) {
      return res.status(400).json({ error: 'Invalid inspection data' });
    }

    const sql = getSql();
    await ensureSchema(sql);

    const id = crypto.randomUUID();
    const reasons = Array.isArray(payload.reasons) ? payload.reasons : [];
    const details = payload.details || {};
    const photos = payload.photos || {};
    const checklist = payload.checklist || {};

    await sql`
      INSERT INTO inspections (id, mode, driver, plate, apt, reasons, details, photos, checklist, score_status)
      VALUES (
        ${id}, ${payload.mode}, ${payload.driver}, ${payload.plate}, ${payload.apt ?? null},
        ${JSON.stringify(reasons)}::jsonb, ${JSON.stringify(details)}::jsonb,
        ${JSON.stringify(photos)}::jsonb, ${JSON.stringify(checklist)}::jsonb,
        ${payload.mode === 'dropoff' ? 'pending' : 'not_applicable'}
      )
    `;

    let link = null;
    if (payload.mode === 'pickup') {
      const previous = await sql`
        SELECT id, driver, plate, created_at
        FROM inspections
        WHERE mode = 'dropoff'
          AND plate = ${payload.plate}
          AND linked_pickup_id IS NULL
          AND id <> ${id}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (previous.length) {
        const dropoff = previous[0];
        const decision = decisionFor(dropoff, payload);

        await sql`
          UPDATE inspections
          SET linked_pickup_id = ${id},
              score_status = ${decision.status},
              score = ${decision.score},
              review_reason = ${decision.reason}
          WHERE id = ${dropoff.id}
        `;

        await sql`
          UPDATE inspections
          SET linked_dropoff_id = ${dropoff.id}
          WHERE id = ${id}
        `;

        link = {
          dropoffId: dropoff.id,
          scoreStatus: decision.status,
          score: decision.score,
          reviewReason: decision.reason,
        };
      }
    }

    return res.status(200).json({ ok: true, id, link });
  } catch (error) {
    console.error('inspection save error', error);
    return res.status(500).json({ error: 'Inspection save failed' });
  }
}
