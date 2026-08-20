import { neon } from '@neondatabase/serverless';
import { get } from '@vercel/blob';
import { Readable } from 'node:stream';

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).send('Method not allowed');
  try{
    const id=String(req.query.id||'');
    if(!id)return res.status(400).send('Missing id');
    if(!process.env.DATABASE_URL)return res.status(503).send('Database not configured');
    const sql=neon(process.env.DATABASE_URL);
    const rows=await sql`SELECT photo_url FROM vehicle_damages WHERE id=${id} AND status='active' LIMIT 1`;
    if(!rows.length)return res.status(404).send('Not found');
    const result=await get(rows[0].photo_url,{access:'private'});
    if(result?.statusCode!==200)return res.status(404).send('Not found');
    res.setHeader('Content-Type',result.blob.contentType||'image/jpeg');
    res.setHeader('Cache-Control','private, max-age=120');
    res.setHeader('X-Content-Type-Options','nosniff');
    Readable.fromWeb(result.stream).pipe(res);
  }catch(e){
    console.error('known damage photo error',e);
    return res.status(500).send('Photo unavailable');
  }
}
