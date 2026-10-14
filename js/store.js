// --- MODULE: GLOBAL STATE & CORE UTILS ---
let db=load();

// --- DEFINICIONES DE STOCK REAL VERIFICADO AL 13 DE OCTUBRE (CIERRE 20:00 - AJUSTE ÓRDENES) ---
const VERIFIED_STOCK_OCT13_2000 = {
  "5670": 179739, "5675": 53124, "5680": 62617, "5685": 46342, "5690": 42451,
  "5051": 19626,  "5056": 12969, "5061": 26419, "5066": 13184, "5071": 11482,
  "8670": 20414,  "4900": 79208, "4171": 0,     "4910": 26934, "BIDON": 0,
  "5200": 3614,   "5205": 3396,  "5210": 0,     "5215": 2046,  "5220": 1902,
  "8687": 1262,   "8680": 66954, "417": 10019
};
const CORRECT_PRODUCT_PACKS = {
  "5051": 12, "5056": 12, "5061": 12, "5066": 12, "5071": 12,
  "8680": 12, "417": 12, "4171": 12, "8687": 1, "BIDON": 1
};

function applyVerifiedStockV25() {
  if (!db) return;
  (db.products || []).forEach(p => {
    if (CORRECT_PRODUCT_PACKS[p.id]) p.pack = CORRECT_PRODUCT_PACKS[p.id];
  });
  if (localStorage.getItem('talca_stock_verified_v25') !== '1') {
    db.stock = Object.assign({}, db.stock || {}, VERIFIED_STOCK_OCT13_2000);
    safeSet(localStorage, 'talcaExpV02', JSON.stringify(db));
    safeSet(localStorage, 'talca_stock_verified_v25', '1');
    localStorage.removeItem('talca_stock_pushed_v25');
  }
}
applyVerifiedStockV25();


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
    // Blindaje: Solo actualizar campos si la nube tiene datos reales y no vacíos
    if (cloudDb.stock && Object.keys(cloudDb.stock).length > 0) {
      // Blindaje: si la nube aún tiene stock antiguo previo a la reconstrucción, conservar el verificado y subirlo
      if (cloudDb.stock['5670'] !== VERIFIED_STOCK_OCT13_2000['5670'] && !localStorage.getItem('talca_stock_pushed_v25')) {
        console.warn('Blindaje: Se retiene el stock verificado frente a snapshot antiguo de Firestore.');
        db.stock = Object.assign({}, db.stock || {}, VERIFIED_STOCK_OCT13_2000);
        save();
        localStorage.setItem('talca_stock_pushed_v25', '1');
      } else {
        db.stock = cloudDb.stock;
      }
    }
    if (cloudDb.stockBuckets && Object.keys(cloudDb.stockBuckets).length > 0) {
      db.stockBuckets = cloudDb.stockBuckets;
    }
    if (cloudDb.products && cloudDb.products.length > 0) {
      db.products = mergeList(db.products, cloudDb.products);
      (db.products || []).forEach(p => {
        if (CORRECT_PRODUCT_PACKS[p.id]) p.pack = CORRECT_PRODUCT_PACKS[p.id];
      });
    }
    if (cloudDb.fleteros && cloudDb.fleteros.length > 0) {
      db.fleteros = mergeList(db.fleteros, cloudDb.fleteros);
    }
    if (cloudDb.employees && cloudDb.employees.length > 0) {
      db.employees = mergeList(db.employees, cloudDb.employees);
    }
    if (cloudDb.users && cloudDb.users.length > 0) {
      db.users = mergeList(db.users, cloudDb.users);
    }
    if (cloudDb.counters) {
      db.counters = cloudDb.counters;
    }
    
    // Respaldo de seguridad local rotativo cada vez que los datos son consistentes
    if ((db.fleteros || []).length >= 10) {
      safeSet(localStorage, 'talcaExp_last_valid_backup', JSON.stringify(db));
    }
    safeSet(localStorage, 'talcaExpV02', JSON.stringify(db));
  } else {
    // Blindaje crítico: NUNCA crear el documento maestro en la nube si los datos locales son demo o degradados
    let fleterosCount = (db.fleteros || []).length;
    let hasStock = Object.keys(db.stock || {}).length > 0;
    if (fleterosCount >= 10 && hasStock) {
      let clone = { ...db };
      delete clone.audit; delete clone.movements; delete clone.orders; delete clone.materialMoves; delete clone.counts;
      docRef.set(clone).catch(console.error);
    } else {
      console.warn('Blindaje: Se bloqueó la creación de talca/data porque los datos locales son insuficientes (fleteros:', fleterosCount, ')');
    }
  }
  isFirebaseReady = true;
  try { if(typeof fillLoginUsers === 'function') fillLoginUsers(); } catch(e){}
  try { if(typeof renderAll === 'function') renderAll(); } catch(e){}
}, (err) => {
  console.warn('Alerta Firestore: Error en listener talca/data (posible cuota excedida u offline):', err);
});

function setupCollectionListeners() {
  ['orders', 'movements', 'audit', 'materialMoves', 'counts'].forEach(col => {
    firestoreDb.collection(col).onSnapshot(snap => {
       let updated = false;
       snap.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
             let data = change.doc.data();
             if (data._deleted) {
                db[col] = (db[col]||[]).filter(x => x.id !== data.id);
                lastSyncedDb[col].delete(data.id);
                updated = true;
                return;
             }
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
    }, err => {
       console.warn(`Alerta Firestore: Error en listener de colección ${col}:`, err);
    });
  });
}
setupCollectionListeners();

// Blindaje contra saturación de cuota:
// Se eliminó la re-escritura masiva de colecciones a los 5 segundos que provocaba agotamiento de cuota diaria (Error 429).
// La sincronización en tiempo real es manejada de forma eficiente por los listeners y save().

let session=safeJSON(safeGet(sessionStorage,'talcaSession'),null);

function save(){
 db.schemaVersion = V16_SCHEMA_VERSION;
 if (typeof v1SyncOrderBuckets === 'function') {
   try { v1SyncOrderBuckets(); } catch(e) { console.warn('v1SyncOrderBuckets diferido:', e); }
 }
 (db.products||[]).forEach(p=>v1EnsureBucket(p.id));
 safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
 
 // Si los datos locales son ricos, renovar el respaldo de emergencia
 if ((db.fleteros || []).length >= 10) {
   safeSet(localStorage, 'talcaExp_last_valid_backup', JSON.stringify(db));
 }
 
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
            let dRef = firestoreDb.collection(col).doc(id);
            dRef.set({ _deleted: true }, { merge: true }).catch(console.error);
            lastSyncedDb[col].delete(id);
         }
      }
   });

   // Blindaje crítico: NUNCA sobreescribir el documento maestro en la nube si los datos locales parecen incompletos
   let fleterosCount = (db.fleteros || []).length;
   let hasStock = Object.keys(db.stock || {}).length > 0;
   if (fleterosCount >= 5 && hasStock) {
     let clone = { ...db };
     delete clone.audit; delete clone.movements; delete clone.orders; delete clone.materialMoves; delete clone.counts;
     docRef.set(clone).catch(err => {
       console.warn('Error al guardar documento maestro en la nube:', err);
     });
   } else {
     console.warn('Guardado en la nube bloqueado preventivamente: los datos locales son insuficientes para sobreescribir talca/data (fleteros:', fleterosCount, ')');
   }
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
