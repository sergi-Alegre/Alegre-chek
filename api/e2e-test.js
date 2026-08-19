import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const host = req.headers.host;
  const proto = 'https';
  const plate = `TEST-${Date.now()}`;
  const driver1 = 'TEST Driver A';
  const driver2 = 'TEST Driver B';
  const sql = neon(process.env.DATABASE_URL);
  let ids = [];
  try {
    const drop = await fetch(`${proto}://${host}/api/inspection`, {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({mode:'dropoff',driver:driver1,plate,apt:null,reasons:[],details:{},photos:{},checklist:{exterior:true,interior:true,fuel:true,breakdowns:true,bodywork:true}})
    });
    const dropJson = await drop.json();
    if (!drop.ok) throw new Error(`dropoff failed: ${JSON.stringify(dropJson)}`);
    ids.push(dropJson.id);

    const pickup = await fetch(`${proto}://${host}/api/inspection`, {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({mode:'pickup',driver:driver2,plate,apt:true,reasons:[],details:{},photos:{},checklist:{}})
    });
    const pickupJson = await pickup.json();
    if (!pickup.ok) throw new Error(`pickup failed: ${JSON.stringify(pickupJson)}`);
    ids.push(pickupJson.id);

    const rows = await sql`SELECT id, linked_pickup_id, score_status, score FROM inspections WHERE id = ${dropJson.id}`;
    const row = rows[0];
    const ok = row && row.linked_pickup_id === pickupJson.id && row.score_status === 'auto' && row.score === 10;

    await sql`DELETE FROM inspections WHERE plate = ${plate}`;
    return res.status(ok ? 200 : 500).json({ok, linked:Boolean(row?.linked_pickup_id), scoreStatus:row?.score_status, score:row?.score});
  } catch (error) {
    console.error('e2e test failed', error);
    try { await sql`DELETE FROM inspections WHERE plate = ${plate}`; } catch {}
    return res.status(500).json({ok:false,error:'E2E test failed'});
  }
}
