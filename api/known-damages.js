import { neon } from '@neondatabase/serverless';

function sqlClient(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL missing');
  return neon(process.env.DATABASE_URL);
}

async function ensureSchema(sql){
  await sql`CREATE TABLE IF NOT EXISTS vehicle_damages (id TEXT PRIMARY KEY,plate TEXT NOT NULL,zone TEXT NOT NULL,description TEXT NOT NULL,photo_url TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_by TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),repaired_at TIMESTAMPTZ,repaired_by TEXT,repair_notes TEXT)`;
  await sql`CREATE INDEX IF NOT EXISTS vehicle_damages_plate_idx ON vehicle_damages (plate,status,created_at DESC)`;
}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const plate=String(req.query.plate||'').trim();
    if(!plate)return res.status(400).json({error:'Falta la matrícula'});
    const sql=sqlClient();
    await ensureSchema(sql);
    const rows=await sql`SELECT id,plate,zone,description,created_at FROM vehicle_damages WHERE plate=${plate} AND status='active' ORDER BY created_at DESC`;
    return res.status(200).json({damages:rows.map(r=>({...r,photoSrc:`/api/vehicle-damage-photo?id=${encodeURIComponent(r.id)}`}))});
  }catch(e){
    console.error('known damages error',e);
    return res.status(500).json({error:'No se pudieron consultar los daños conocidos'});
  }
}
