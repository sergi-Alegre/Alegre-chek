import { neon } from '@neondatabase/serverless';
import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
import { officeAuthorized, officeConfigured } from '../lib/office-auth.js';

function at(obj,path){return String(path||'').split('.').reduce((v,k)=>v==null?null:v[k],obj)}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).send('Method not allowed');
  if(!officeConfigured())return res.status(503).send('Office PIN not configured');
  if(!officeAuthorized(req))return res.status(401).send('Unauthorized');
  try{
    const {id,path}=req.query;
    if(!id||!path)return res.status(400).send('Missing parameters');
    const sql=neon(process.env.DATABASE_URL);
    const rows=await sql`SELECT photos FROM inspections WHERE id=${String(id)} LIMIT 1`;
    if(!rows.length)return res.status(404).send('Not found');
    const url=at(rows[0].photos,String(path));
    if(!url||typeof url!=='string')return res.status(404).send('Not found');
    const result=await get(url,{access:'private'});
    if(result?.statusCode!==200)return res.status(404).send('Not found');
    res.setHeader('Content-Type',result.blob.contentType||'image/jpeg');
    res.setHeader('Cache-Control','private, max-age=300');
    res.setHeader('X-Content-Type-Options','nosniff');
    Readable.fromWeb(result.stream).pipe(res);
  }catch(e){console.error('office photo error',e);return res.status(500).send('Photo unavailable')}
}
