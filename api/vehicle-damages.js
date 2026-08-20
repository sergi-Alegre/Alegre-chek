import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
import { officeAuthorized, officeConfigured } from '../lib/office-auth.js';

function sqlClient(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL missing');return neon(process.env.DATABASE_URL)}
async function ensureSchema(sql){await sql`CREATE TABLE IF NOT EXISTS vehicle_damages (id TEXT PRIMARY KEY,plate TEXT NOT NULL,zone TEXT NOT NULL,description TEXT NOT NULL,photo_url TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_by TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),repaired_at TIMESTAMPTZ,repaired_by TEXT,repair_notes TEXT)`;await sql`CREATE INDEX IF NOT EXISTS vehicle_damages_plate_idx ON vehicle_damages (plate,status,created_at DESC)`}
export default async function handler(req,res){
  if(!officeConfigured())return res.status(503).json({error:'OFFICE_PIN_NOT_CONFIGURED'});
  if(!officeAuthorized(req))return res.status(401).json({error:'UNAUTHORIZED'});
  const sql=sqlClient();await ensureSchema(sql);
  try{
    if(req.method==='GET'){
      const rows=await sql`SELECT * FROM vehicle_damages ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END,plate,created_at DESC`;
      return res.status(200).json({damages:rows.map(r=>({...r,photoSrc:`/api/vehicle-damage-photo?id=${encodeURIComponent(r.id)}`}))});
    }
    if(req.method==='POST'){
      const {action='create',id,plate,zone,description,photoUrl,reviewer,notes}=req.body||{};
      if(action==='create'){
        if(!plate||!zone||!description||!photoUrl)return res.status(400).json({error:'Faltan datos del daño'});
        const newId=crypto.randomUUID();
        await sql`INSERT INTO vehicle_damages (id,plate,zone,description,photo_url,created_by) VALUES (${newId},${String(plate)},${String(zone)},${String(description)},${String(photoUrl)},${String(reviewer||'Oficina')})`;
        return res.status(200).json({ok:true,id:newId});
      }
      if(action==='repair'){
        if(!id)return res.status(400).json({error:'Falta el daño'});
        await sql`UPDATE vehicle_damages SET status='repaired',repaired_at=NOW(),repaired_by=${String(reviewer||'Oficina')},repair_notes=${String(notes||'')} WHERE id=${String(id)}`;
        return res.status(200).json({ok:true});
      }
      return res.status(400).json({error:'Acción no válida'});
    }
    return res.status(405).json({error:'Method not allowed'});
  }catch(e){console.error('vehicle damages error',e);return res.status(500).json({error:'No se pudo gestionar los daños'})}
}
