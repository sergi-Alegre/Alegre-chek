let knownDamagePlate='';
let knownDamageLoading=false;

async function loadKnownDamagesForPlate(plate){
  const p=String(plate||'').trim();
  if(!p){
    knownDamagePlate='';
    Object.keys(KNOWN_DAMAGE).forEach(k=>delete KNOWN_DAMAGE[k]);
    return;
  }
  if(knownDamagePlate===p||knownDamageLoading)return;
  knownDamageLoading=true;
  try{
    const r=await fetch('/api/known-damages?plate='+encodeURIComponent(p),{cache:'no-store'});
    const j=await r.json().catch(()=>({damages:[]}));
    if(!r.ok)throw new Error(j.error||'No se pudieron cargar los daños');
    KNOWN_DAMAGE[p]=(j.damages||[]).map(d=>`${d.zone}: ${d.description}`);
    knownDamagePlate=p;
    if(s.plate===p)render();
  }catch(e){
    console.warn('known damages unavailable',e);
    KNOWN_DAMAGE[p]=[];
    knownDamagePlate=p;
  }finally{
    knownDamageLoading=false;
  }
}

const renderWithoutKnownDamages=render;
render=function(){
  renderWithoutKnownDamages();
  if(s.mode==='pickup'&&s.plate)loadKnownDamagesForPlate(s.plate);
};

loadKnownDamagesForPlate(s.plate);
