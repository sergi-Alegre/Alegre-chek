import { neon } from '@neondatabase/serverless';
import { officeAuthorized, officeConfigured } from '../lib/office-auth.js';

function sqlClient(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL missing');return neon(process.env.DATABASE_URL)}
function photoRefs(id,photos){const out=[];if(photos?.dropoff){for(const [k] of Object.entries(photos.dropoff))out.push({label:k,path:`dropoff.${k}`,src:`/api/office-photo?id=${encodeURIComponent(id)}&path=${encodeURIComponent(`dropoff.${k}`)}`})}if(photos?.incidents){for(const [k,a] of Object.entries(photos.incidents)){(Array.isArray(a)?a:[]).forEach((_,i)=>out.push({label:`${k} ${i+1}`,path:`incidents.${k}.${i}`,src:`/api/office-photo?id=${encodeURIComponent(id)}&path=${encodeURIComponent(`incidents.${k}.${i}`)}`}))}}return out}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(!officeConfigured())return res.status(503).json({error:'OFFICE_PIN_NOT_CONFIGURED'});
  if(!officeAuthorized(req))return res.status(401).json({error:'UNAUTHORIZED'});
  try{
    const sql=sqlClient();
    const month=/^\d{4}-\d{2}$/.test(String(req.query.month||''))?String(req.query.month):new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).slice(0,7);
    const reviews=await sql`
      SELECT d.id,d.driver,d.plate,d.created_at,d.checklist,d.photos,d.score_status,d.review_reason,
             p.id AS pickup_id,p.driver AS pickup_driver,p.created_at AS pickup_created_at,p.apt AS pickup_apt,p.reasons AS pickup_reasons,p.details AS pickup_details,p.photos AS pickup_photos
      FROM inspections d
      JOIN inspections p ON p.id=d.linked_pickup_id
      WHERE d.mode='dropoff' AND d.score_status='review'
      ORDER BY d.created_at ASC
      LIMIT 100`;
    const ranking=await sql`
      SELECT driver,COUNT(*) FILTER(WHERE score IS NOT NULL)::int AS evaluated_dropoffs,
             COALESCE(SUM(score) FILTER(WHERE score IS NOT NULL),0)::int AS points,
             ROUND(AVG(score) FILTER(WHERE score IS NOT NULL)::numeric,2) AS average,
             COUNT(*) FILTER(WHERE score=10)::int AS tens,
             COUNT(*) FILTER(WHERE score=5)::int AS fives,
             COUNT(*) FILTER(WHERE score=0)::int AS zeros,
             COUNT(*) FILTER(WHERE score_status='review')::int AS pending_reviews
      FROM inspections
      WHERE mode='dropoff' AND to_char(created_at AT TIME ZONE 'Europe/Madrid','YYYY-MM')=${month}
      GROUP BY driver ORDER BY average DESC NULLS LAST,evaluated_dropoffs DESC,driver ASC`;
    const recent=await sql`SELECT id,mode,driver,plate,apt,reasons,score_status,score,review_reason,created_at FROM inspections ORDER BY created_at DESC LIMIT 40`;
    return res.status(200).json({month,reviews:reviews.map(r=>({...r,dropoffPhotos:photoRefs(r.id,r.photos),pickupPhotos:photoRefs(r.pickup_id,r.pickup_photos)})),ranking,recent});
  }catch(e){console.error('office data error',e);return res.status(500).json({error:'Office data unavailable'})}
}
