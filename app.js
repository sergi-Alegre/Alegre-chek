(function(){
  const base=document.createElement('script');
  base.src='/app-base.js';
  base.async=false;
  base.onload=()=>{
    const originalFresh=fresh;
    fresh=function(){const x=originalFresh();x.dropNotes={};return x};
    if(!s.dropNotes)s.dropNotes={};

    dropEvidence=function(){
      return DROP_SHOTS.map(([k,l],i)=>`<div class="evidence ${s.dropPhotos[k]?'done':''}"><div class="section-kicker">Foto ${i+1} de 9</div><strong>${l}</strong>${s.dropPhotos[k]?`<div class="cam"><img src="${s.dropPhotos[k]}"></div><label class="label">💬 Observación sobre esta foto</label><textarea placeholder="Opcional · Describe qué has visto o qué quieres dejar indicado..." oninput="s.dropNotes['${k}']=this.value">${esc(s.dropNotes[k]||'')}</textarea><button class="btn alt" style="margin-top:8px" onclick="startDropCamera('${k}')">↻ Repetir foto</button>`:`<div id="drop-cam-${k}"></div><button class="btn alt" onclick="startDropCamera('${k}')">📷 Hacer foto ahora</button>`}</div>`).join('');
    };

    finish=async function(){
      if(!validate())return;
      const snapshot=JSON.parse(JSON.stringify(s));
      app.innerHTML=`<div class="card saving"><div class="section-kicker">Guardando misión</div><h2>Subiendo inspección…</h2><p class="small">Fotografías y datos se están guardando de forma segura. No cierres esta pantalla.</p></div>`;
      try{
        const photos=await uploadAllPhotos();
        const checklist=snapshot.mode==='dropoff'?{...snapshot.drop,photoComments:snapshot.dropNotes||{}}:{};
        const payload={mode:snapshot.mode,driver:snapshot.driver,plate:snapshot.plate,apt:snapshot.mode==='pickup'?snapshot.apt:null,reasons:snapshot.reasons,details:{interior:snapshot.interior,exterior:snapshot.exterior,descriptions:snapshot.desc,newDamage:snapshot.newDamage,knownDamageId:snapshot.knownDamageId},photos,checklist};
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
    };
    render();
  };
  base.onerror=()=>alert('No se ha podido cargar Alegre Check. Recarga la página.');
  document.head.appendChild(base);
})();
