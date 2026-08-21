import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

function getSql(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL missing');return neon(process.env.DATABASE_URL)}
async function schema(sql){await sql`CREATE TABLE IF NOT EXISTS pilot_feedback (id TEXT PRIMARY KEY, driver TEXT, plate TEXT, mode TEXT, category TEXT NOT NULL, message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;await sql`CREATE INDEX IF NOT EXISTS pilot_feedback_created_idx ON pilot_feedback (created_at DESC)`}
export default async function handler(req,res){
 try{
  const sql=getSql();await schema(sql);
  if(req.method==='POST'){
   const p=req.body||{};const message=String(p.message||'').trim();const category=String(p.category||'Mejora').trim();
   if(!message)return res.status(400).json({error:'Escribe un comentario'});
   const id=crypto.randomUUID();
   await sql`INSERT INTO pilot_feedback (id,driver,plate,mode,category,message) VALUES (${id},${p.driver||null},${p.plate||null},${p.mode||null},${category},${message})`;
   return res.status(200).json({ok:true,id});
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(e){console.error('feedback error',e);return res.status(500).json({error:'Feedback save failed'})}
}