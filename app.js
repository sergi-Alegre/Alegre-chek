const DRIVERS=['Juan F.','Andrei K','Marc A','Carlos E','Carles A','Jordi N','Zoltan D','David A','Fadoua C','Armando S','Xavi V','Vasyl L','Ivan R','ROstik K','Cristian G','Bogdan H','Angel V','Paolo V','Jordi Y','Albert R','Mika J','Lalo M','Ihor G','Eduardo R','Imad A','Daniel E'];
const PLATES=['KCV','49 NGM','25 NGM','KVF','MFB','MJB','MPT','90 NGM','KZZ','LBG','LBZ','LYR','LZD','KYS','MVJ','MVG','MTY','KXW','MGC'];
const KNOWN_DAMAGE={};
const DROP_SHOTS=[['front','Exterior · Frontal'],['rear','Exterior · Trasera'],['left','Exterior · Lateral izquierdo'],['right','Exterior · Lateral derecho'],['cabFront','Interior · Zona delantera'],['cabRear','Interior · Zona trasera'],['matsFront','Alfombras delanteras'],['matsRear','Alfombras traseras'],['dashboard','Cuadro · Nivel de combustible']];

function fresh(){return{mode:'',driver:'',plate:'',apt:null,reasons:[],interior:[],exterior:[],desc:{interior:'',exterior:'',mechanics:'',bodywork:''},incidentPhotos:{interior:[],exterior:[],mechanics:[],bodywork:[]},newDamage:null,drop:{exterior:null,interior:null,fuel:null,breakdowns:null,bodywork:null},dropPhotos:{}}}
let s=fresh();
const app=document.getElementById('app');

function opts(a,v){return'<option value="">Selecciona</option>'+a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('')}
function multi(g,x){return`<button class="btn choice ${s[g].includes(x)?'active':''}" onclick="toggleSub('${g}','${x}')">${x}</button>`}
function gallery(k){let a=s.incidentPhotos[k];return`<div class="counter">Fotos: ${a.length}/5 · mínimo 1</div>${a.length?`<div class="photos">${a.map((p,i)=>`<div class="photo"><img src="${p}"><button onclick="removeIncidentPhoto('${k}',${i})">×</button></div>`).join('')}</div>`:''}<div id="incident-cam-${k}"></div>${a.length<5?`<button class="btn alt" onclick="startIncidentCamera('${k}')">${a.length?'Añadir otra foto':'Hacer foto ahora'}</button>`:'<p class="small">Máximo de 5 fotos alcanzado.</p>'}`}
function cat(n){
  if(!s.reasons.includes(n))return'';
  if(n==='Limpieza interior')return`<div class="subbox"><strong>Limpieza interior</strong><div class="stack">${['Salpicadero','Asientos','Alfombras','Detalles a fondo','Aguas usadas sin vaciar'].map(x=>multi('interior',x)).join('')}</div><label class="label">Breve descripción</label><textarea oninput="s.desc.interior=this.value">${s.desc.interior}</textarea><label class="label">Evidencia fotográfica</label>${gallery('interior')}</div>`;
  if(n==='Limpieza exterior')return`<div class="subbox"><strong>Limpieza exterior</strong><div class="stack">${['Plancha','Cristales','Llantas','Bajos'].map(x=>multi('exterior',x)).join('')}</div><label class="label">Breve descripción</label><textarea oninput="s.desc.exterior=this.value">${s.desc.exterior}</textarea><label class="label">Evidencia fotográfica</label>${gallery('exterior')}</div>`;
  if(n==='Mecánica')return`<div class="subbox"><strong>Mecánica</strong><label class="label">Describe la avería o anomalía</label><textarea oninput="s.desc.mechanics=this.value">${s.desc.mechanics}</textarea><label class="label">Evidencia fotográfica</label>${gallery('mechanics')}</div>`;
  const known=KNOWN_DAMAGE[s.plate]||[];
  return`<div class="subbox"><strong>Plancha</strong><div class="known"><strong>Daños ya conocidos</strong>${known.length?`<ul>${known.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<p class="small">Se mostrarán aquí al conectar el histórico de daños.</p>'}</div><label class="label">¿Hay un daño nuevo?</label><div class="grid"><button class="btn choice ${s.newDamage===false?'active':''}" onclick="s.newDamage=false;render()">No, daño conocido</button><button class="btn choice ${s.newDamage===true?'active':''}" onclick="s.newDamage=true;render()">Sí, daño nuevo</button></div><label class="label">Breve descripción</label><textarea oninput="s.desc.bodywork=this.value">${s.desc.bodywork}</textarea><label class="label">Evidencia fotográfica</label>${gallery('bodywork')}</div>`;
}
function dropEvidence(){return DROP_SHOTS.map(([k,l])=>`<div class="evidence ${s.dropPhotos[k]?'done':''}"><strong>${l}</strong>${s.dropPhotos[k]?`<div class="cam"><img src="${s.dropPhotos[k]}"></div><button class="btn alt" onclick="startDropCamera('${k}')">Repetir foto</button>`:`<div id="drop-cam-${k}"></div><button class="btn alt" onclick="startDropCamera('${k}')">Hacer foto ahora</button>`}</div>`).join('')}

function render(){
  if(!s.mode){app.innerHTML=`<div class="card"><h2>¿Qué vas a hacer?</h2><div class="grid"><button class="btn primary" onclick="setMode('pickup')">Recojo el vehículo</button><button class="btn alt" onclick="setMode('dropoff')">Dejo el vehículo</button></div></div>`;return}
  let h=`<div class="card"><h2>${s.mode==='pickup'?'Recogida':'Dejada'} de vehículo</h2><label class="label">Conductor</label><select onchange="s.driver=this.value">${opts(DRIVERS,s.driver)}</select><label class="label">Matrícula</label><select onchange="s.plate=this.value;render()">${opts(PLATES,s.plate)}</select></div>`;
  if(s.mode==='pickup'){
    h+=`<div class="card"><h2>¿El vehículo está apto para trabajar?</h2><div class="grid"><button class="btn choice ${s.apt===true?'active':''}" onclick="s.apt=true;render()">Sí, está apto</button><button class="btn choice ${s.apt===false?'active':''}" onclick="s.apt=false;render()">No está apto</button></div>${s.apt===false?`<div class="bad"><strong>¿Por qué no está apto?</strong><div class="stack">${['Limpieza interior','Limpieza exterior','Mecánica','Plancha'].map(r=>`<button class="btn choice ${s.reasons.includes(r)?'active':''}" onclick="toggleReason('${r}')">${r}</button>`).join('')}</div>${['Limpieza interior','Limpieza exterior','Mecánica','Plancha'].map(cat).join('')}</div>`:''}</div>`;
  } else {
    h+=`<div class="card"><h2>Checklist de dejada</h2>${[['exterior','Limpieza exterior correcta'],['interior','Limpieza interior correcta'],['fuel','Repostado correcto'],['breakdowns','Sin averías'],['bodywork','Sin incidencias de plancha']].map(([k,l])=>`<div style="margin-bottom:14px"><span class="label">${l}</span><div class="grid"><button class="btn choice ${s.drop[k]===true?'active':''}" onclick="setDrop('${k}',true)">Sí</button><button class="btn choice ${s.drop[k]===false?'active':''}" onclick="setDrop('${k}',false)">No</button></div></div>`).join('')}</div><div class="card"><h2>Evidencia de la dejada</h2><p class="small">9 fotos obligatorias, hechas ahora desde la cámara.</p>${dropEvidence()}</div>`;
  }
  h+=`<button class="btn primary" onclick="finish()">Finalizar y guardar</button><button class="btn alt" style="margin-top:10px" onclick="resetAll()">Cancelar</button>`;
  app.innerHTML=h;
}
function setMode(m){s.mode=m;render()}
function setDrop(k,v){s.drop[k]=v;render()}
function toggleReason(r){s.reasons=s.reasons.includes(r)?s.reasons.filter(x=>x!==r):[...s.reasons,r];render()}
function toggleSub(g,x){s[g]=s[g].includes(x)?s[g].filter(v=>v!==x):[...s[g],x];render()}
function removeIncidentPhoto(k,i){s.incidentPhotos[k].splice(i,1);render()}

function captureVideoFrame(video){
  const maxW=1400,maxH=1050;
  const scale=Math.min(1,maxW/video.videoWidth,maxH/video.videoHeight);
  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(video.videoWidth*scale));
  c.height=Math.max(1,Math.round(video.videoHeight*scale));
  c.getContext('2d').drawImage(video,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',0.72);
}
async function camera(id,onshot){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    const el=document.getElementById(id);
    el.innerHTML=`<div class="cam"><video id="v-${id}" autoplay playsinline muted></video></div><button class="btn primary" id="shot-${id}">Hacer foto</button><button class="btn alt" style="margin-top:8px" id="cancel-${id}">Cancelar</button>`;
    const v=document.getElementById('v-'+id);v.srcObject=stream;
    document.getElementById('shot-'+id).onclick=()=>{onshot(captureVideoFrame(v));stream.getTracks().forEach(t=>t.stop());render()};
    document.getElementById('cancel-'+id).onclick=()=>{stream.getTracks().forEach(t=>t.stop());render()};
  }catch(e){alert('No se ha podido abrir la cámara. Revisa el permiso de Cámara en Safari.')}
}
function startIncidentCamera(k){if(s.incidentPhotos[k].length>=5)return;camera('incident-cam-'+k,p=>s.incidentPhotos[k].push(p))}
function startDropCamera(k){const id='drop-cam-'+k;if(s.dropPhotos[k]){s.dropPhotos[k]='';render();setTimeout(()=>camera(id,p=>s.dropPhotos[k]=p),0)}else camera(id,p=>s.dropPhotos[k]=p)}
function validInc(n,k,sub){if(sub&&!s[k].length){alert('Selecciona al menos un motivo en '+n);return false}if(!s.desc[k].trim()){alert('Añade una breve descripción en '+n);return false}if(!s.incidentPhotos[k].length){alert('Haz al menos una foto para '+n);return false}return true}
function validate(){
  if(!s.driver||!s.plate){alert('Selecciona conductor y matrícula.');return false}
  if(s.mode==='pickup'){
    if(s.apt===null){alert('Indica si está apto.');return false}
    if(s.apt===false&&!s.reasons.length){alert('Selecciona al menos un motivo.');return false}
    if(s.reasons.includes('Limpieza interior')&&!validInc('Limpieza interior','interior',true))return false;
    if(s.reasons.includes('Limpieza exterior')&&!validInc('Limpieza exterior','exterior',true))return false;
    if(s.reasons.includes('Mecánica')&&!validInc('Mecánica','mechanics',false))return false;
    if(s.reasons.includes('Plancha')){if(s.newDamage===null){alert('Indica si el daño es conocido o nuevo.');return false}if(!validInc('Plancha','bodywork',false))return false}
  }else{
    if(Object.values(s.drop).some(v=>v===null)){alert('Completa los cinco puntos.');return false}
    const missing=DROP_SHOTS.filter(([k])=>!s.dropPhotos[k]);if(missing.length){alert('Faltan '+missing.length+' fotos obligatorias de la dejada.');return false}
  }
  return true;
}

async function uploadPhoto(dataUrl,kind){
  const r=await fetch('/api/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl,plate:s.plate,kind})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'No se pudo guardar una foto');
  return j.url;
}
async function uploadAllPhotos(){
  if(s.mode==='dropoff'){
    const pairs=await Promise.all(Object.entries(s.dropPhotos).map(async([k,v])=>[k,await uploadPhoto(v,'dropoff-'+k)]));
    return {dropoff:Object.fromEntries(pairs)};
  }
  const incidents={};
  for(const key of ['interior','exterior','mechanics','bodywork']){
    if(s.incidentPhotos[key].length)incidents[key]=await Promise.all(s.incidentPhotos[key].map((p,i)=>uploadPhoto(p,`pickup-${key}-${i+1}`)));
  }
  return {incidents};
}
async function finish(){
  if(!validate())return;
  const snapshot=JSON.parse(JSON.stringify(s));
  app.innerHTML=`<div class="card saving"><h2>Guardando inspección…</h2><p>Subiendo fotografías y registrando los datos. No cierres esta pantalla.</p></div>`;
  try{
    const photos=await uploadAllPhotos();
    const payload={mode:snapshot.mode,driver:snapshot.driver,plate:snapshot.plate,apt:snapshot.mode==='pickup'?snapshot.apt:null,reasons:snapshot.reasons,details:{interior:snapshot.interior,exterior:snapshot.exterior,descriptions:snapshot.desc,newDamage:snapshot.newDamage},photos,checklist:snapshot.mode==='dropoff'?snapshot.drop:{}};
    const r=await fetch('/api/inspection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const result=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(result.error||'No se pudo guardar la inspección');
    let extra='';
    if(snapshot.mode==='pickup'&&result.link){
      extra=result.link.scoreStatus==='auto'?'<p class="small">La dejada anterior ha quedado validada automáticamente.</p>':'<p class="small">La dejada anterior ha quedado pendiente de revisión por oficina.</p>';
    }
    app.innerHTML=`<div class="card"><h2>Registro guardado</h2><p>${snapshot.mode==='pickup'?'Recogida':'Dejada'} de ${snapshot.plate} registrada correctamente.</p>${extra}<button class="btn primary" onclick="resetAll()">Nueva inspección</button></div>`;
  }catch(e){
    console.error(e);s=snapshot;render();alert('No se ha podido guardar. No se ha borrado el formulario. Comprueba la conexión y vuelve a intentarlo.\n\n'+e.message);
  }
}
function resetAll(){s=fresh();render()}
render();
