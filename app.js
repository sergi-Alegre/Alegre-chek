const DRIVERS=['Juan F.','Andrei K','Marc A','Carlos E','Carles A','Jordi N','Zoltan D','David A','Fadoua C','Armando S','Xavi V','Vasyl L','Ivan R','ROstik K','Cristian G','Bogdan H','Angel V','Paolo V','Jordi Y','Albert R','Mika J','Lalo M','Ihor G','Eduardo R','Imad A','Daniel E'];
const PLATES=['KCV','49 NGM','25 NGM','KVF','MFB','MJB','MPT','90 NGM','KZZ','LBG','LBZ','LYR','LZD','KYS','MVJ','MVG','MTY','KXW','MGC'];
const KNOWN_DAMAGE={};
const DROP_SHOTS=[['front','Exterior · Frontal'],['rear','Exterior · Trasera'],['left','Exterior · Lateral izquierdo'],['right','Exterior · Lateral derecho'],['cabFront','Interior · Zona delantera'],['cabRear','Interior · Zona trasera'],['matsFront','Alfombras delanteras'],['matsRear','Alfombras traseras'],['dashboard','Cuadro · Nivel de combustible']];

function fresh(){return{mode:'',driver:'',plate:'',apt:null,reasons:[],interior:[],exterior:[],desc:{interior:'',exterior:'',mechanics:'',bodywork:''},incidentPhotos:{interior:[],exterior:[],mechanics:[],bodywork:[]},newDamage:null,knownDamageId:null,drop:{exterior:null,interior:null,fuel:null,breakdowns:null,bodywork:null},dropPhotos:{}}}
let s=fresh();
let knownDamagePlate='',knownDamageLoading=false;
const app=document.getElementById('app');
const fx=document.getElementById('fx');

function opts(a,v){return'<option value="">Selecciona</option>'+a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('')}
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function multi(g,x){return`<button class="btn choice ${s[g].includes(x)?'active':''}" onclick="toggleSub('${g}','${x}')">${s[g].includes(x)?'✓ ':''}${x}</button>`}
function missionProgress(){
  if(!s.mode)return 0;
  if(s.mode==='pickup'){
    let p=12;if(s.driver)p+=16;if(s.plate)p+=16;if(s.apt!==null)p+=26;
    if(s.apt===true)p=88;
    if(s.apt===false&&s.reasons.length)p+=10;
    const photoCount=Object.values(s.incidentPhotos).reduce((n,a)=>n+a.length,0);if(photoCount)p+=12;
    return Math.min(94,p);
  }
  let p=12;if(s.driver)p+=12;if(s.plate)p+=12;
  p+=Object.values(s.drop).filter(v=>v!==null).length*5;
  p+=Object.keys(s.dropPhotos).filter(k=>s.dropPhotos[k]).length*3;
  return Math.min(94,p);
}
function missionHeader(title){const p=missionProgress();return`<div class="mission-title"><div><div class="mission-tag">Misión en curso</div><h2>${title}</h2></div><strong>${p}%</strong></div><div class="progress"><i style="width:${p}%"></i></div>`}
function showFx(kind){
  if(!fx)return;
  const good=kind==='good';
  fx.innerHTML=`<div class="overlay" onclick="clearFx()"><div class="overlay-card ${good?'good':'sad'}"><span class="overlay-icon">${good?'🏆':'😕'}</span><h2>${good?'¡VEHÍCULO APTO!':'NO ESTÁ APTO'}</h2><p>${good?'¡Genial! Está listo para trabajar.':'Gracias por detectarlo. Vamos a documentarlo.'}</p></div></div>`;
  if(good)confetti();
  setTimeout(clearFx,1250);
}
function clearFx(){if(fx)fx.innerHTML=''}
function confetti(){
  const colors=['#ef4f87','#30c7e8','#39dc8b','#ffc857','#ffffff'];
  for(let i=0;i<28;i++){
    const e=document.createElement('i');e.className='confetti';e.style.left=(Math.random()*100)+'vw';e.style.background=colors[i%colors.length];e.style.animationDelay=(Math.random()*.35)+'s';e.style.transform=`rotate(${Math.random()*180}deg)`;document.body.appendChild(e);setTimeout(()=>e.remove(),2100);
  }
}
function setApt(v){s.apt=v;render();showFx(v?'good':'sad')}

async function loadKnownDamagesForPlate(plate){
  const p=String(plate||'').trim();
  if(!p||knownDamagePlate===p||knownDamageLoading)return;
  knownDamageLoading=true;
  try{
    const r=await fetch('/api/known-damages?plate='+encodeURIComponent(p),{cache:'no-store'});
    const j=await r.json().catch(()=>({damages:[]}));
    if(!r.ok)throw new Error(j.error||'No se pudieron cargar los daños conocidos');
    KNOWN_DAMAGE[p]=j.damages||[];
    knownDamagePlate=p;
    if(s.mode==='pickup'&&s.plate===p)render();
  }catch(e){
    console.warn('known damages unavailable',e);
    KNOWN_DAMAGE[p]=[];
    knownDamagePlate=p;
  }finally{
    knownDamageLoading=false;
  }
}

function gallery(k){let a=s.incidentPhotos[k];return`<div class="counter">📸 Fotos: ${a.length}/5 · mínimo 1</div>${a.length?`<div class="photos">${a.map((p,i)=>`<div class="photo"><img src="${p}"><button onclick="removeIncidentPhoto('${k}',${i})">×</button></div>`).join('')}</div>`:''}<div id="incident-cam-${k}"></div>${a.length<5?`<button class="btn alt" onclick="startIncidentCamera('${k}')">📷 ${a.length?'Añadir otra foto':'Hacer foto ahora'}</button>`:'<p class="small">Máximo de 5 fotos alcanzado.</p>'}`}
function knownDamageCards(known){
  if(!known.length)return'';
  return `<div class="stack">${known.map(d=>`<div class="evidence ${s.knownDamageId===d.id&&s.newDamage===false?'done':''}"><div class="section-kicker">Daño activo · ${esc(d.zone)}</div><a href="${esc(d.photoSrc)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(d.photoSrc)}" alt="Daño conocido ${esc(d.zone)}" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin:8px 0;border:1px solid #315a6d"></a><p class="small" style="margin:4px 0 10px">${esc(d.description)}</p><button class="btn choice ${s.knownDamageId===d.id&&s.newDamage===false?'active':''}" onclick="s.knownDamageId='${esc(d.id)}';s.newDamage=false;render()">✓ Es este daño conocido</button></div>`).join('')}</div>`;
}
function cat(n){
  if(!s.reasons.includes(n))return'';
  if(n==='Limpieza interior')return`<div class="subbox"><div class="section-kicker">Evidencia</div><strong>🧽 Limpieza interior</strong><div class="stack">${['Salpicadero','Asientos','Alfombras','Detalles a fondo','Aguas usadas sin vaciar'].map(x=>multi('interior',x)).join('')}</div><label class="label">Breve descripción</label><textarea placeholder="Ej. Alfombras sucias..." oninput="s.desc.interior=this.value">${s.desc.interior}</textarea><label class="label">Evidencia fotográfica</label>${gallery('interior')}</div>`;
  if(n==='Limpieza exterior')return`<div class="subbox"><div class="section-kicker">Evidencia</div><strong>✨ Limpieza exterior</strong><div class="stack">${['Plancha','Cristales','Llantas','Bajos'].map(x=>multi('exterior',x)).join('')}</div><label class="label">Breve descripción</label><textarea placeholder="Ej. Cristales sucios..." oninput="s.desc.exterior=this.value">${s.desc.exterior}</textarea><label class="label">Evidencia fotográfica</label>${gallery('exterior')}</div>`;
  if(n==='Mecánica')return`<div class="subbox"><div class="section-kicker">Evidencia</div><strong>🔧 Mecánica</strong><label class="label">Describe la avería o anomalía</label><textarea placeholder="Describe qué has observado..." oninput="s.desc.mechanics=this.value">${s.desc.mechanics}</textarea><label class="label">Evidencia fotográfica</label>${gallery('mechanics')}</div>`;
  const known=KNOWN_DAMAGE[s.plate]||[];
  const knownMsg=knownDamageLoading&&knownDamagePlate!==s.plate?'<p class="small">Consultando daños conocidos…</p>':'<p class="small">No hay daños conocidos activos para esta matrícula.</p>';
  return`<div class="subbox"><div class="section-kicker">Evidencia</div><strong>🚘 Plancha</strong><div class="known"><strong>Daños activos conocidos</strong><p class="small">Solo se muestran daños pendientes de reparar. Toca una foto para ampliarla.</p>${known.length?knownDamageCards(known):knownMsg}</div><label class="label">¿Es un daño nuevo?</label><button class="btn choice ${s.newDamage===true?'active':''}" onclick="s.newDamage=true;s.knownDamageId=null;render()">⚠️ Hay un daño nuevo en esta zona</button><label class="label">Breve descripción</label><textarea placeholder="Describe el daño observado..." oninput="s.desc.bodywork=this.value">${s.desc.bodywork}</textarea><label class="label">Evidencia fotográfica actual</label>${gallery('bodywork')}</div>`;
}
function dropEvidence(){return DROP_SHOTS.map(([k,l],i)=>`<div class="evidence ${s.dropPhotos[k]?'done':''}"><div class="section-kicker">Foto ${i+1} de 9</div><strong>${l}</strong>${s.dropPhotos[k]?`<div class="cam"><img src="${s.dropPhotos[k]}"></div><button class="btn alt" onclick="startDropCamera('${k}')">↻ Repetir foto</button>`:`<div id="drop-cam-${k}"></div><button class="btn alt" onclick="startDropCamera('${k}')">📷 Hacer foto ahora</button>`}</div>`).join('')}

function render(){
  if(!s.mode){app.innerHTML=`<div class="card"><div class="section-kicker">Nueva misión</div><h2>🎮 ¿Qué vas a hacer?</h2><p class="small">Elige una misión y completa el control en pocos minutos.</p><div class="grid mission-buttons"><button class="btn pickup" onclick="setMode('pickup')"><span class="mission-icon">🚙</span><b>RECOGER<br>VEHÍCULO</b><small>Revisión antes de iniciar servicio</small></button><button class="btn dropoff" onclick="setMode('dropoff')"><span class="mission-icon">🏁</span><b>DEJAR<br>VEHÍCULO</b><small>Deja todo listo para el siguiente</small></button></div></div>`;return}
  let h=`<div class="card">${missionHeader(s.mode==='pickup'?'Recoger vehículo':'Dejar vehículo')}<label class="label">👤 Conductor</label><select onchange="s.driver=this.value;render()">${opts(DRIVERS,s.driver)}</select><label class="label">🚘 Matrícula</label><select onchange="s.plate=this.value;s.knownDamageId=null;s.newDamage=null;knownDamagePlate='';render()">${opts(PLATES,s.plate)}</select></div>`;
  if(s.mode==='pickup'){
    h+=`<div class="card"><div class="section-kicker">Decisión clave</div><h2>¿El vehículo está apto para trabajar?</h2><div class="grid"><button class="btn choice ${s.apt===true?'active':''}" onclick="setApt(true)">✅ Sí, está apto</button><button class="btn choice ${s.apt===false?'active':''}" onclick="setApt(false)">⚠️ No está apto</button></div>${s.apt===true?`<div class="status-banner good"><span class="emoji">🎉</span><h3>¡Todo en orden!</h3><p class="small">Vehículo listo para trabajar.</p></div>`:''}${s.apt===false?`<div class="status-banner bad-news"><span class="emoji">😕</span><h3>Hay algo que revisar</h3><p class="small">Detectarlo es hacer bien la inspección. Documentemos el motivo.</p></div><div class="bad"><strong>¿Por qué no está apto?</strong><div class="stack">${['Limpieza interior','Limpieza exterior','Mecánica','Plancha'].map(r=>`<button class="btn choice ${s.reasons.includes(r)?'active':''}" onclick="toggleReason('${r}')">${s.reasons.includes(r)?'✓ ':''}${r}</button>`).join('')}</div>${['Limpieza interior','Limpieza exterior','Mecánica','Plancha'].map(cat).join('')}</div>`:''}</div>`;
  } else {
    h+=`<div class="card"><div class="section-kicker">Nivel 1 · Checklist</div><h2>Deja el vehículo preparado</h2>${[['exterior','✨ Limpieza exterior correcta'],['interior','🧽 Limpieza interior correcta'],['fuel','⛽ Repostado correcto'],['breakdowns','🔧 Sin averías'],['bodywork','🚘 Sin incidencias de plancha']].map(([k,l],i)=>`<div class="check-row"><span class="label">${i+1}. ${l}</span><div class="grid"><button class="btn choice ${s.drop[k]===true?'active':''}" onclick="setDrop('${k}',true)">✅ Sí</button><button class="btn choice ${s.drop[k]===false?'active':''}" onclick="setDrop('${k}',false)">⚠️ No</button></div></div>`).join('')}</div><div class="card"><div class="section-kicker">Nivel 2 · Evidencia</div><h2>📸 Fotos finales</h2><p class="small">9 fotos obligatorias hechas ahora desde la cámara. Cada foto suma progreso a la misión.</p>${dropEvidence()}</div>`;
  }
  h+=`<button class="btn primary" onclick="finish()">🏁 FINALIZAR Y GUARDAR</button><button class="btn alt" style="margin-top:10px" onclick="resetAll()">Cancelar misión</button>`;
  app.innerHTML=h;
  if(s.mode==='pickup'&&s.plate)loadKnownDamagesForPlate(s.plate);
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
    el.innerHTML=`<div class="cam"><video id="v-${id}" autoplay playsinline muted></video></div><button class="btn primary" id="shot-${id}">📸 Hacer foto</button><button class="btn alt" style="margin-top:8px" id="cancel-${id}">Cancelar</button>`;
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
    if(s.reasons.includes('Plancha')){
      if(s.newDamage===null){alert('Indica si coincide con un daño conocido o si es un daño nuevo.');return false}
      if(s.newDamage===false&&!s.knownDamageId){alert('Selecciona cuál de los daños conocidos coincide.');return false}
      if(!validInc('Plancha','bodywork',false))return false;
    }
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
  app.innerHTML=`<div class="card saving"><div class="section-kicker">Guardando misión</div><h2>Subiendo inspección…</h2><p class="small">Fotografías y datos se están guardando de forma segura. No cierres esta pantalla.</p></div>`;
  try{
    const photos=await uploadAllPhotos();
    const payload={mode:snapshot.mode,driver:snapshot.driver,plate:snapshot.plate,apt:snapshot.mode==='pickup'?snapshot.apt:null,reasons:snapshot.reasons,details:{interior:snapshot.interior,exterior:snapshot.exterior,descriptions:snapshot.desc,newDamage:snapshot.newDamage,knownDamageId:snapshot.knownDamageId},photos,checklist:snapshot.mode==='dropoff'?snapshot.drop:{}};
    const r=await fetch('/api/inspection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const result=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(result.error||'No se pudo guardar la inspección');
    let extra='';
    if(snapshot.mode==='pickup'&&result.link){
      extra=result.link.scoreStatus==='auto'?'<p class="small">La dejada anterior ha quedado validada automáticamente.</p>':'<p class="small">La dejada anterior ha quedado pendiente de revisión por oficina.</p>';
    }
    confetti();
    app.innerHTML=`<div class="card"><div class="reward"><div class="trophy">🏆</div><div class="mission-tag">100% completado</div><h2>¡MISIÓN COMPLETADA!</h2><strong>Gran trabajo</strong><p>${snapshot.mode==='pickup'?'Recogida':'Dejada'} de <b>${snapshot.plate}</b> registrada correctamente.</p>${extra}</div><button class="btn primary" style="margin-top:14px" onclick="resetAll()">🎮 Nueva misión</button></div>`;
  }catch(e){
    console.error(e);s=snapshot;render();alert('No se ha podido guardar. No se ha borrado el formulario. Comprueba la conexión y vuelve a intentarlo.\n\n'+e.message);
  }
}
function resetAll(){clearFx();s=fresh();knownDamagePlate='';render()}
render();