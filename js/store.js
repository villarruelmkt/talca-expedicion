// --- MODULE: GLOBAL STATE & CORE UTILS ---
let db=load();


// --- MODULE: FIREBASE COLLECTIONS SYNC ---
let lastSyncedDb = {
  orders: new Map(), movements: new Map(), audit: new Map(), materialMoves: new Map(), counts: new Map()
};
function fastHash(obj) { return JSON.stringify(obj); }

function mergeList(local, cloud) {
   if (!cloud || !cloud.length) return local || [];
   if (!local || !local.length) return cloud || [];
   let map = new Map((local || []).map(x => [x.id, x]));
   (cloud || []).forEach(x => map.set(x.id, x));
   return Array.from(map.values());
}

docRef.onSnapshot((doc) => {
  if (doc.exists) {
    let cloudDb = doc.data();
    // Stock y configuraciones toman el valor de la nube (última verdad)
    db.stock = cloudDb.stock || db.stock;
    db.stockBuckets = cloudDb.stockBuckets || db.stockBuckets;
    db.products = mergeList(db.products, cloudDb.products);
    db.fleteros = mergeList(db.fleteros, cloudDb.fleteros);
    db.employees = mergeList(db.employees, cloudDb.employees);
    db.users = mergeList(db.users, cloudDb.users);
    db.counters = cloudDb.counters || db.counters;
    
    safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
  } else {
    // Si no existe el documento maestro, lo creamos sin los arreglos pesados
    let clone = { ...db };
    delete clone.audit; delete clone.movements; delete clone.orders; delete clone.materialMoves; delete clone.counts;
    docRef.set(clone).catch(console.error);
  }
  isFirebaseReady = true;
  try { if(typeof fillLoginUsers === 'function') fillLoginUsers(); } catch(e){}
  try { if(typeof renderAll === 'function') renderAll(); } catch(e){}
});

function setupCollectionListeners() {
  ['orders', 'movements', 'audit', 'materialMoves', 'counts'].forEach(col => {
    firestoreDb.collection(col).onSnapshot(snap => {
       let updated = false;
       snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
             let data = change.doc.data();
             let idx = (db[col]||[]).findIndex(x => x.id === data.id);
             if (idx >= 0) db[col][idx] = data;
             else { db[col] = db[col]||[]; db[col].push(data); }
             lastSyncedDb[col].set(data.id, fastHash(data));
             updated = true;
          }
          if (change.type === 'removed') {
             let data = change.doc.data();
             db[col] = (db[col]||[]).filter(x => x.id !== data.id);
             lastSyncedDb[col].delete(data.id);
             updated = true;
          }
       });
       if (updated) {
          if(col !== 'orders') db[col].sort((a,b) => new Date(a.date||0) - new Date(b.date||0));
          safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
          try{renderAll()}catch(e){}
       }
    });
  });
}
setupCollectionListeners();

// Sincronización en background a los 5 segundos (Auto-Migración y Offline Resolver)
setTimeout(() => {
   if (isFirebaseReady) {
      console.log('Iniciando verificación de colecciones en background...');
      ['orders', 'movements', 'audit', 'materialMoves', 'counts'].forEach(col => {
         let currentIds = new Set();
         (db[col] || []).forEach(item => {
            if (!item.id) return;
            currentIds.add(item.id);
            let hash = fastHash(item);
            if (lastSyncedDb[col].get(item.id) !== hash) {
               firestoreDb.collection(col).doc(item.id).set(item).catch(console.error);
               lastSyncedDb[col].set(item.id, hash);
            }
         });
         
         for (let id of lastSyncedDb[col].keys()) {
            if (!currentIds.has(id)) {
               firestoreDb.collection(col).doc(id).delete().catch(console.error);
               lastSyncedDb[col].delete(id);
            }
         }
      });
   }
}, 5000);

let session=safeJSON(safeGet(sessionStorage,'talcaSession'),null);

function save(){
 db.schemaVersion = V16_SCHEMA_VERSION;
 (db.products||[]).forEach(p=>v1EnsureBucket(p.id));
 safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
 
 if (isFirebaseReady) {
   // Diff & Sync: Solo subimos a colecciones los items modificados o nuevos
   ['orders', 'movements', 'audit', 'materialMoves', 'counts'].forEach(col => {
      let currentIds = new Set();
      (db[col] || []).forEach(item => {
         if (!item.id) return;
         currentIds.add(item.id);
         let hash = fastHash(item);
         if (lastSyncedDb[col].get(item.id) !== hash) {
            firestoreDb.collection(col).doc(item.id).set(item).catch(console.error);
            lastSyncedDb[col].set(item.id, hash);
         }
      });
      
      for (let id of lastSyncedDb[col].keys()) {
         if (!currentIds.has(id)) {
            firestoreDb.collection(col).doc(id).delete().catch(console.error);
            lastSyncedDb[col].delete(id);
         }
      }
   });

   // Documento maestro súper liviano (Libre de límite de 1MB)
   let clone = { ...db };
   delete clone.audit; delete clone.movements; delete clone.orders; delete clone.materialMoves; delete clone.counts;
   docRef.set(clone).catch(console.error);
 }
 
 try{renderAll()}
 catch(err){
   console.error('Error al actualizar la interfaz:',err);
 }
}
function now(){return new Date().toISOString()}
function fmtDate(x){if(typeof x==='string'&&x.length===10&&x.indexOf('-')===4){let [y,m,d]=x.split('-');return `${d}/${m}/${y}`}return new Date(x).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}
function uid(p='id'){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function fillLoginUsers(){
 let select=document.getElementById('loginUser');if(!select)return;
 let users=(db.users&&db.users.length?db.users:[]).filter(u=>u.active!==false);
 if(users.length)select.innerHTML=users.map(u=>`<option value="${u.id}">${u.displayName} (${u.username})</option>`).join('');
}
function doLogin(){
 let userEl=document.getElementById('loginUser');
 let passwordEl=document.getElementById('loginPassword');
 let shiftEl=document.getElementById('loginShift');
 let users=(db.users&&db.users.length?db.users:[]);
 let u=users.find(x=>x.id===userEl.value&&x.active!==false);
 if(!u||u.password!==passwordEl.value)return alert('Usuario o clave incorrectos.');
 session={userId:u.id,user:u.displayName,username:u.username,shift:shiftEl.value};
 safeSet(sessionStorage,'talcaSession',JSON.stringify(session));start()
}
function logout(){safeRemove(sessionStorage,'talcaSession');location.reload()}
function changeShift(){
  modal(`<div class="headrow"><div><h2>Cambiar turno</h2><div class="muted">Seleccione el turno activo.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><select id="shiftSelect" class="field"><option value="Mañana" ${session.shift==='Mañana'?'selected':''}>Mañana</option><option value="Tarde" ${session.shift==='Tarde'?'selected':''}>Tarde</option></select></div><div class="right"><button class="btn btn-primary" onclick="confirmShift()">Guardar</button></div>`);
  window.confirmShift = function() {
    session.shift = document.getElementById('shiftSelect').value;
    safeSet(sessionStorage,'talcaSession',JSON.stringify(session));
    closeModal();
    start();
  };
}
function start(){login.classList.add('hidden');app.classList.remove('hidden');sessionBadge.textContent=session.user+' · '+session.shift;todayText.textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});renderAll()}
document.addEventListener('DOMContentLoaded',()=>{
 fillLoginUsers();
 let warning=document.getElementById('mobileFileWarning');
 if(warning&&location.protocol==='file:'&&/iPhone|iPad|iPod/i.test(navigator.userAgent))warning.classList.remove('hidden');
 if(session)start();
 
 window.addEventListener('offline', () => {
   let banner = document.getElementById('offlineBanner');
   if (banner) banner.classList.remove('hidden');
 });
 window.addEventListener('online', () => {
   let banner = document.getElementById('offlineBanner');
   if (banner) banner.classList.add('hidden');
 });

 document.addEventListener('click', (e) => {
   if (!navigator.onLine) {
     let t = e.target;
     if (t.tagName === 'BUTTON') {
       let text = (t.innerText || t.textContent || '').toLowerCase();
       if (text.includes('guardar') || text.includes('confirmar') || text.includes('generar') || text.includes('despachar')) {
         e.stopPropagation();
         e.preventDefault();
         alert('Acción bloqueada preventivamente: No tienes conexión a internet. Espera a que desaparezca el cartel rojo para evitar sobreescribir y perder datos de otros usuarios.');
       }
     }
   }
 }, true);

 document.addEventListener('wheel', (e) => {
   if (document.activeElement && document.activeElement.type === 'number') {
     document.activeElement.blur();
   }
 });

 document.addEventListener('keydown', (e) => {
   if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
     let focusable = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea, button:not(.navbtn)'))
       .filter(el => !el.disabled && el.offsetParent !== null);
     let index = focusable.indexOf(e.target);
     if (index > -1 && index + 1 < focusable.length) {
       e.preventDefault();
       focusable[index + 1].focus();
       if(focusable[index + 1].select) focusable[index + 1].select();
     }
   }
 });
});
document.querySelectorAll('.navbtn').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
function showPage(id){
  if(id!=='employees'&&typeof currentPrintKind!=='undefined'&&currentPrintKind==='receipt'){
    currentPrintBody='';
    currentPrintTitle='';
    currentPrintKind='report';
    let p=document.getElementById('printArea');if(p)p.innerHTML='';
  }
  document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
  renderAll();
}
function modal(content){
 let dialogEl=document.getElementById('dialog');
 let modalEl=document.getElementById('modal');
 if(!dialogEl||!modalEl){
   alert('No se pudo abrir el comprobante por un error de interfaz.');
   return;
 }
 dialogEl.innerHTML=content;
 modalEl.classList.remove('hidden');
}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
document.getElementById('modal').onclick=e=>{if(e.target.id==='modal')closeModal()}
window.addEventListener('beforeprint',()=>{if(currentPrintBody)renderPrintArea()});
window.addEventListener('afterprint',()=>{let a=document.getElementById('printArea');if(a)a.innerHTML=''});
function productOptions(){return db.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${p.id} · ${p.name}</option>`).join('')}
function fleteroOptions(){return db.fleteros.map(f=>`<option value="${f.id}">${f.name}${f.surname?' '+f.surname:''}</option>`).join('')}
function employeeOptions(){return db.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${e.legajo} · ${e.name} ${e.surname}</option>`).join('')}
function normalize(packs,units,prod){let total=Number(packs||0)*prod.pack+Number(units||0);return {total,packs:Math.floor(total/prod.pack),units:total%prod.pack}}
var v1StockUnit = 'fardos';
function toggleStockUnit() {
  v1StockUnit = v1StockUnit === 'fardos' ? 'pallets' : 'fardos';
  let btn = document.getElementById('stockUnitToggle');
  if (btn) btn.innerText = v1StockUnit === 'fardos' ? 'Ver en Pallets' : 'Ver en Fardos';
  if(typeof renderStockV1 === 'function') renderStockV1();
}
function equivalent(total, prod) {
  if (!prod || !prod.pack) return `${total} un.`;
  if (typeof v1StockUnit !== 'undefined' && v1StockUnit === 'pallets') {
    let perPallet = prod.pack * (prod.perCut || 20) * (prod.cuts || 4);
    if (perPallet > 0) {
      let pallets = Math.floor(total / perPallet);
      let rem = total % perPallet;
      let fardos = Math.floor(rem / prod.pack);
      let un = rem % prod.pack;
      let parts = [];
      if (pallets > 0) parts.push(`${pallets} pl`);
      if (fardos > 0) parts.push(`${fardos} fardos`);
      if (un > 0) parts.push(`${un} un.`);
      return parts.join(' + ') || '0 fardos';
    }
  }
  return `${Math.floor(total/prod.pack)} fardos${total%prod.pack?' + '+total%prod.pack+' un.':''}`;
}
function audit(action,entity,ref,detail=''){db.audit=db.audit||[];db.audit.push({id:uid('a'),date:now(),user:session?.user||'Sistema',action,entity,ref,detail})}

// Auto-repair: Eliminar movimientos de materiales con fleteroId inválido
setTimeout(() => {
  if (typeof db !== 'undefined' && db.materialMoves && db.fleteros) {
    let originalLength = db.materialMoves.length;
    db.materialMoves = db.materialMoves.filter(m => {
      return db.fleteros.some(f => f.id === m.fleteroId);
    });
    if (db.materialMoves.length !== originalLength) {
      if (typeof save === 'function') save();
      if (document.getElementById('materialsTotals')) {
        if (typeof window.renderMaterials === 'function') window.renderMaterials();
        else if (typeof window.renderMaterialsV11 === 'function') window.renderMaterialsV11();
      }
    }
  }
}, 3500);
