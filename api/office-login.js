import { officeConfigured, officePinValid, officeCookie, officeAuthorized } from '../lib/office-auth.js';

export default async function handler(req,res){
  if(req.method==='GET')return res.status(200).json({configured:officeConfigured(),authorized:officeAuthorized(req)});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!officeConfigured())return res.status(503).json({error:'Office PIN not configured'});
  if(!officePinValid(req.body?.pin))return res.status(401).json({error:'PIN incorrecto'});
  res.setHeader('Set-Cookie',officeCookie());
  return res.status(200).json({ok:true});
}
