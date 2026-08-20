import { put } from '@vercel/blob';
import crypto from 'node:crypto';
import { officeAuthorized, officeConfigured } from '../lib/office-auth.js';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!officeConfigured())return res.status(503).json({error:'OFFICE_PIN_NOT_CONFIGURED'});
  if(!officeAuthorized(req))return res.status(401).json({error:'UNAUTHORIZED'});
  try{
    const {dataUrl,plate}=req.body||{};
    if(!dataUrl||!plate)return res.status(400).json({error:'Faltan datos de la foto'});
    const match=/^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(dataUrl);
    if(!match)return res.status(400).json({error:'Formato de imagen no válido'});
    const ext=match[1].toLowerCase()==='png'?'png':'jpg';
    const buffer=Buffer.from(match[2],'base64');
    if(buffer.length>4_000_000)return res.status(413).json({error:'Imagen demasiado grande'});
    const safePlate=String(plate).replace(/[^a-z0-9-]/gi,'_');
    const pathname=`known-damages/${safePlate}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const blob=await put(pathname,buffer,{access:'private',contentType:ext==='png'?'image/png':'image/jpeg',addRandomSuffix:false});
    return res.status(200).json({url:blob.url,pathname:blob.pathname});
  }catch(e){console.error('office damage photo error',e);return res.status(500).json({error:'No se pudo guardar la foto'})}
}
