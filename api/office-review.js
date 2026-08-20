import { neon } from '@neondatabase/serverless';
import { officeAuthorized, officeConfigured } from '../lib/office-auth.js';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!officeConfigured())return res.status(503).json({error:'OFFICE_PIN_NOT_CONFIGURED'});
  if(!officeAuthorized(req))return res.status(401).json({error:'UNAUTHORIZED'});
  const {dropoffId,score,notes,reviewer}=req.body||{};
  if(!dropoffId||![0,5,10].includes(Number(score)))return res.status(400).json({error:'Datos de revisión inválidos'});
  try{
    const sql=neon(process.env.DATABASE_URL);
    const rows=await sql`SELECT id,score_status FROM inspections WHERE id=${dropoffId} AND mode='dropoff' LIMIT 1`;
    if(!rows.length)return res.status(404).json({error:'Dejada no encontrada'});
    if(rows[0].score_status!=='review')return res.status(409).json({error:'Esta dejada ya no está pendiente de revisión'});
    await sql`UPDATE inspections SET score_status='reviewed',score=${Number(score)},reviewed_by=${String(reviewer||'Oficina')},review_notes=${String(notes||'')},reviewed_at=NOW() WHERE id=${dropoffId}`;
    return res.status(200).json({ok:true,score:Number(score)});
  }catch(e){console.error('office review error',e);return res.status(500).json({error:'No se pudo guardar la revisión'})}
}
