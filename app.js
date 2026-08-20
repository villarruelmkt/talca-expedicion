
const firebaseConfig = {
  apiKey: "AIzaSyCeeHUCuY0oGYhIPFeE1fhJk6-_O9eYxVU",
  authDomain: "talca-expedicion.firebaseapp.com",
  projectId: "talca-expedicion",
  storageBucket: "talca-expedicion.firebasestorage.app",
  messagingSenderId: "658825484631",
  appId: "1:658825484631:web:cb95fdc34a838b6306c612",
  measurementId: "G-HXL7VNKPJ7"
};
firebase.initializeApp(firebaseConfig);
const firestoreDb = firebase.firestore();
try {
  firestoreDb.enablePersistence().catch(e => console.warn('Persistence error:', e));
} catch(e) {
  console.warn('Sync persistence error:', e);
}
const docRef = firestoreDb.collection("talca").doc("data");
let isFirebaseReady = false;
const PRODUCT_SEED=[
 {id:'5670',name:'Talca Cola 3 L',pack:6,perCut:15,cuts:4},
 {id:'5675',name:'Talca Lima LimÃ³n 3 L',pack:6,perCut:15,cuts:4},
 {id:'5680',name:'Talca Manzana 3 L',pack:6,perCut:15,cuts:4},
 {id:'5685',name:'Talca Naranja 3 L',pack:6,perCut:15,cuts:4},
 {id:'5690',name:'Talca Pomelo 3 L',pack:6,perCut:15,cuts:4},
 {id:'5051',name:'Talca Cola 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5056',name:'Talca Lima LimÃ³n 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5061',name:'Talca Manzana 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5066',name:'Talca Naranja 500 ml',pack:12,perCut:20,cuts:7},
 {id:'5071',name:'Talca Pomelo 500 ml',pack:12,perCut:20,cuts:7},
 {id:'8670',name:'Agua 2 L',pack:6,perCut:20,cuts:4},
 {id:'4900',name:'Soda 2,25 L',pack:6,perCut:20,cuts:4},
 {id:'4171',name:'Soda 500 ml',pack:12,perCut:20,cuts:7},
 {id:'4910',name:'Soda sifÃ³n 2 L',pack:6,perCut:20,cuts:4},
 {id:'BIDON',name:'BidÃ³n de agua',pack:1,perCut:42,cuts:2}
];
const DEMO={
 audit:[],
 counters:{CE:0,AE:0},
 users:[
  {id:'u1',username:'encargado1',displayName:'Encargado 1',password:'1234',active:true},
  {id:'u2',username:'encargado2',displayName:'Encargado 2',password:'1234',active:true},
  {id:'u3',username:'suplente',displayName:'Encargado suplente',password:'1234',active:true}
 ],
 products:PRODUCT_SEED,
 fleteros:[{id:'f1',name:'Distribuidora G-7',surname:'',company:'Distribuidora G-7'},{id:'f2',name:'Fletero habitual',surname:'',company:''}],
 employees:[{id:'e1',legajo:'11607',name:'JosÃ©',surname:'MartÃ­nez',active:true,balance:4,lastCredit:'2026-07'}],
 stock:Object.fromEntries(PRODUCT_SEED.map(p=>[p.id,0])),
 orders:[],movements:[],materialMoves:[],counts:[]
};
const memoryStorage={};
function clone(x){return JSON.parse(JSON.stringify(x))}
function safeGet(storage,key){
 try{return storage.getItem(key)}catch(err){return memoryStorage[key]||null}
}
function safeSet(storage,key,value){
 try{storage.setItem(key,value);return true}catch(err){memoryStorage[key]=value;return false}
}
function safeRemove(storage,key){
 try{storage.removeItem(key)}catch(err){delete memoryStorage[key]}
}
function safeJSON(value,fallback=null){
 try{return value?JSON.parse(value):fallback}catch(err){return fallback}
}
function load(){
 let x=safeGet(localStorage,'talcaExpV02')||safeGet(localStorage,'talcaExpV01');
 let data=safeJSON(x,null)||clone(DEMO);
 data.users=data.users||clone(DEMO.users);
 data.counters=data.counters||{CE:0,AE:0};
 data.audit=data.audit||[];
 data.products=data.products||clone(DEMO.products);
 data.fleteros=data.fleteros||[];
 data.employees=data.employees||[];
 data.stock=data.stock||{};
 data.orders=data.orders||[];
 data.movements=data.movements||[];
 data.materialMoves=data.materialMoves||[];
 data.counts=data.counts||[];
 data.products.forEach(p=>{if(data.stock[p.id]===undefined)data.stock[p.id]=0});
 return data
}
let db=load();

docRef.onSnapshot((doc) => {
  if (doc.exists) {
    let cloudDb = doc.data();
    // Compare timestamps to prevent older cloud data from overwriting newer local data
    let localLastDate = (db && db.audit && db.audit.length) ? new Date(db.audit[db.audit.length-1].date).getTime() : 0;
    let cloudLastDate = (cloudDb && cloudDb.audit && cloudDb.audit.length) ? new Date(cloudDb.audit[cloudDb.audit.length-1].date).getTime() : 0;
    
    if (localLastDate > cloudLastDate) {
      console.log('Local data is newer. Pushing to cloud to sync...');
      docRef.set(db).catch(console.error);
    } else {
      console.log('Cloud data is newer or equal. Updating local memory.');
      db = cloudDb;
      safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
    }
  } else {
    docRef.set(db).catch(console.error);
  }
  isFirebaseReady = true;
  try { if(typeof fillLoginUsers === 'function') fillLoginUsers(); } catch(e){}
  try { if(typeof renderAll === 'function') renderAll(); } catch(e){}
});

let session=safeJSON(safeGet(sessionStorage,'talcaSession'),null);
function save(){
 safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
 if (isFirebaseReady) {
   docRef.set(db).catch(console.error);
 }
 try{renderAll()}
 catch(err){
   console.error('Error al actualizar la interfaz:',err);
 }
}
function now(){return new Date().toISOString()}
function fmtDate(x){return new Date(x).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}
function uid(p='id'){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function fillLoginUsers(){
 let select=document.getElementById('loginUser');if(!select)return;
 let users=(db.users&&db.users.length?db.users:DEMO.users).filter(u=>u.active!==false);
 if(users.length)select.innerHTML=users.map(u=>`<option value="${u.id}">${u.displayName} (${u.username})</option>`).join('');
}
function doLogin(){
 let userEl=document.getElementById('loginUser');
 let passwordEl=document.getElementById('loginPassword');
 let shiftEl=document.getElementById('loginShift');
 let users=(db.users&&db.users.length?db.users:DEMO.users);
 let u=users.find(x=>x.id===userEl.value&&x.active!==false);
 if(!u||u.password!==passwordEl.value)return alert('Usuario o clave incorrectos.');
 session={userId:u.id,user:u.displayName,username:u.username,shift:shiftEl.value};
 safeSet(sessionStorage,'talcaSession',JSON.stringify(session));start()
}
function logout(){safeRemove(sessionStorage,'talcaSession');location.reload()}
function changeShift(){let n=prompt('Turno activo (MaÃ±ana o Tarde):',session.shift);if(n&&['maÃ±ana','tarde'].includes(n.toLowerCase())){session.shift=n[0].toUpperCase()+n.slice(1).toLowerCase();safeSet(sessionStorage,'talcaSession',JSON.stringify(session));start()}}
function start(){login.classList.add('hidden');app.classList.remove('hidden');sessionBadge.textContent=session.user+' Â· '+session.shift;todayText.textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});if(!localStorage.getItem('wiped_v17')){db.orders=[];db.movements=[];db.materialMoves=[];db.counts=[];db.audit=[];for(let k in db.stock)db.stock[k]=0;localStorage.setItem('wiped_v17','true');save();alert('Base de datos limpiada y lista para v1.7')}renderAll()}
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
         alert('AcciÃ³n bloqueada preventivamente: No tienes conexiÃ³n a internet. Espera a que desaparezca el cartel rojo para evitar sobreescribir y perder datos de otros usuarios.');
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
function showPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.page===id));renderAll()}
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
function productOptions(){return db.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${p.id} Â· ${p.name}</option>`).join('')}
function fleteroOptions(){return db.fleteros.map(f=>`<option value="${f.id}">${f.name}${f.surname?' '+f.surname:''}</option>`).join('')}
function employeeOptions(){return db.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${e.legajo} Â· ${e.name} ${e.surname}</option>`).join('')}
function normalize(packs,units,prod){let total=Number(packs||0)*prod.pack+Number(units||0);return {total,packs:Math.floor(total/prod.pack),units:total%prod.pack}}
function equivalent(total,prod){return `${Math.floor(total/prod.pack)} fardos${total%prod.pack?' + '+total%prod.pack+' un.':''}`}
function audit(action,entity,ref,detail=''){db.audit=db.audit||[];db.audit.push({id:uid('a'),date:now(),user:session?.user||'Sistema',action,entity,ref,detail})}
function addStockMove({type,ref,productId,total,dir,note=''}){db.stock[productId]=(db.stock[productId]||0)+(dir==='in'?total:-total);db.movements.push({id:uid('m'),date:now(),type,ref,productId,total,dir,note,user:session.user,shift:session.shift});audit('Movimiento',type,ref,`${productId} ${dir==='in'?'+':'-'}${total}`)}
function addMaterialMove({fleteroId,ref,source,palletOut=0,palletIn=0,chapOut=0,chapIn=0}){db.materialMoves.push({id:uid('mat'),date:now(),fleteroId,ref,source,palletOut:+palletOut||0,palletIn:+palletIn||0,chapOut:+chapOut||0,chapIn:+chapIn||0,user:session.user,shift:session.shift})}

function openOrderForm(existingId){
 let o=existingId?db.orders.find(x=>x.id===existingId):null;
 modal(`<div class="headrow"><div><h2>${o?'Registrar nueva entrega':'Nueva orden de carga'}</h2><div class="muted">El stock se descuenta al confirmar la entrega real.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid">
  <div><label>NÃºmero de orden</label><input id="oNumber" class="field" value="${o?o.number:''}" ${o?'disabled':''}></div>
  <div><label>Fecha</label><input id="oDate" class="field" type="date" value="${o?o.date:new Date().toISOString().slice(0,10)}"></div>
  <div><label>Fletero</label><select id="oCarrier" ${o?'disabled':''}>${fleteroOptions()}</select></div>
  <div><label>Inicio de carga (opcional)</label><input id="oLoadStart" class="field" type="datetime-local"></div><div><label>Fin de carga (opcional)</label><input id="oLoadEnd" class="field" type="datetime-local"></div><div><label>Observaciones</label><input id="oNote" class="field" value=""></div>
 </div><div class="lineitems"><div class="headrow"><h3>Productos de esta entrega</h3><button class="btn btn-secondary" onclick="addOrderLine()">Agregar producto</button></div><div class="code-entry"><div><label>CÃ³digo o nombre del producto</label><input id="quickProductCode" class="field" placeholder="Ej.: 5670 o Cola 3 L" onkeydown="if(event.key==='Enter'){event.preventDefault();addProductByCode()}"></div><button class="btn btn-primary" onclick="addProductByCode()">Agregar</button></div><div id="orderLines" style="margin-top:12px"></div></div>
 <div class="summary"><div class="summarygrid">
  <div><span class="muted">Planchadas sugeridas</span><b id="suggestPallet">0</b></div>
  <div><label>Planchadas reales que lleva</label><input id="realPalletOut" class="field" type="number" min="0" value="0"></div>
  <div><label>Planchadas que devuelve</label><input id="realPalletIn" class="field" type="number" min="0" value="0"></div>
  <div><span class="muted">Chapadur sugerido</span><b id="suggestChap">0</b></div>
  <div><label>Chapadur que lleva</label><input id="realChapOut" class="field" type="number" min="0" value="0"></div>
  <div><label>Chapadur que devuelve</label><input id="realChapIn" class="field" type="number" min="0" value="0"></div>
  <div><label>Resultado de la orden</label><select id="orderResult"><option>Completa</option><option>Parcial</option><option>Completa con cambio</option></select></div>
  <div><label>FacturaciÃ³n</label><select id="billingStatus"><option>No aplica</option><option>Pendiente de aviso</option><option>Avisada</option></select></div>
 </div></div>
 <div id="stockWarning"></div>
 <div class="right" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button> <button class="btn btn-primary" onclick="saveOrderDelivery('${o?o.id:''}')">Confirmar entrega</button></div>`);
 if(o)oCarrier.value=o.fleteroId;
 addOrderLine();
}
function addOrderLine(productId=''){
 let box=document.getElementById('orderLines'),d=document.createElement('div');d.className='line';
 d.innerHTML=`<div class="prod"><label>Producto</label><select class="liProd" onchange="recalcOrder()">${productOptions()}</select></div><div><label>Solic. fardos</label><input class="field liReqPack" type="number" min="0" value="0" oninput="syncRequested(this);recalcOrder()"></div><div><label>Solic. unidades</label><input class="field liReqUnit" type="number" min="0" value="0" oninput="syncRequested(this);recalcOrder()"></div><div><label>Entreg. fardos</label><input class="field liPack" type="number" min="0" value="0" oninput="recalcOrder()"></div><div><label>Entreg. unidades</label><input class="field liUnit" type="number" min="0" value="0" oninput="recalcOrder()"></div><button class="btn btn-danger" onclick="this.parentElement.remove();recalcOrder()">Quitar</button>`;
 box.appendChild(d);if(productId)d.querySelector('.liProd').value=productId;recalcOrder()
}
function syncRequested(el){let r=el.closest('.line');if(el.classList.contains('liReqPack')&&!r.querySelector('.liPack').dataset.touched)r.querySelector('.liPack').value=el.value;if(el.classList.contains('liReqUnit')&&!r.querySelector('.liUnit').dataset.touched)r.querySelector('.liUnit').value=el.value}
function addProductByCode(){let q=(quickProductCode.value||'').trim().toLowerCase();if(!q)return;let matches=db.products.filter(p=>p.id.toLowerCase()===q||p.name.toLowerCase().includes(q));if(!matches.length)return alert('No se encontrÃ³ un producto con ese cÃ³digo o nombre.');if(matches.length>1)return alert('Hay mÃ¡s de una coincidencia. Escriba un cÃ³digo mÃ¡s preciso.');addOrderLine(matches[0].id);quickProductCode.value='';quickProductCode.focus()}
function getOrderLines(){
 return [...document.querySelectorAll('#orderLines .line')].map(r=>{let p=db.products.find(x=>x.id===r.querySelector('.liProd').value),n=normalize(r.querySelector('.liPack').value,r.querySelector('.liUnit').value,p),req=normalize(r.querySelector('.liReqPack').value,r.querySelector('.liReqUnit').value,p);return {productId:p.id,total:n.total,packs:n.packs,units:n.units,requestedTotal:req.total,requestedPacks:req.packs,requestedUnits:req.units,pendingTotal:Math.max(0,req.total-n.total)}}).filter(x=>x.total>0||x.requestedTotal>0)
}
function recalcOrder(){
 if(!document.getElementById('orderLines'))return;
 let lines=getOrderLines(),occ=0,cuts=0,warns=[];
 lines.forEach(l=>{let p=db.products.find(x=>x.id===l.productId);occ+=l.total/(p.pack*p.perCut*p.cuts);cuts+=Math.ceil(l.total/(p.pack*p.perCut));if(l.total>(db.stock[p.id]||0))warns.push(`${p.name}: disponible ${equivalent(db.stock[p.id]||0,p)}, entrega ${equivalent(l.total,p)}`)});
 suggestPallet.textContent=Math.ceil(occ);suggestChap.textContent=cuts;
 if(+realPalletOut.value===0)realPalletOut.value=Math.ceil(occ);
 if(+realChapOut.value===0)realChapOut.value=cuts;
 stockWarning.innerHTML=warns.length?`<div class="alert"><b>Stock insuficiente.</b><br>${warns.join('<br>')}<label>JustificaciÃ³n obligatoria para continuar</label><textarea id="stockJustification"></textarea></div>`:'';
}
function saveOrderDelivery(orderId){
 let num=oNumber.value.trim(),lines=getOrderLines();if(!num||!lines.length)return alert('Complete nÃºmero de orden y al menos un producto.');
 if(!orderId&&db.orders.some(x=>x.number===num))return alert('El nÃºmero de orden ya existe. Abra la orden existente para registrar otra entrega.');
 let shortage=lines.some(l=>l.total>(db.stock[l.productId]||0));if(shortage&&(!document.getElementById('stockJustification')||!stockJustification.value.trim()))return alert('Debe justificar el stock insuficiente.');
 let o=orderId?db.orders.find(x=>x.id===orderId):{id:uid('o'),number:num,date:oDate.value,fleteroId:oCarrier.value,status:'Recibida',deliveries:[],billing:'No aplica',createdBy:session.user,createdShift:session.shift};
 let delivery={id:uid('d'),date:now(),lines,result:orderResult.value,note:oNote.value,loadStart:oLoadStart.value||'',loadEnd:oLoadEnd.value||'',stockJustification:shortage?stockJustification.value:'',user:session.user,shift:session.shift,palletOut:+realPalletOut.value||0,palletIn:+realPalletIn.value||0,chapOut:+realChapOut.value||0,chapIn:+realChapIn.value||0};
 delivery.lines.forEach(l=>addStockMove({type:'Orden de carga',ref:num,productId:l.productId,total:l.total,dir:'out',note:delivery.stockJustification}));
 addMaterialMove({fleteroId:o.fleteroId,ref:num,source:'Orden de carga',palletOut:delivery.palletOut,palletIn:delivery.palletIn,chapOut:delivery.chapOut,chapIn:delivery.chapIn});
 o.deliveries.push(delivery);o.status=delivery.result==='Parcial'?'Parcial':delivery.result;if(delivery.loadStart&&!delivery.loadEnd)o.status='Carga iniciada';if(delivery.loadEnd&&delivery.result==='Completa')o.status='Completa';o.billing=billingStatus.value;if(!orderId){db.orders.push(o);audit('Alta','Orden',o.number,'Orden creada')}else audit('Entrega','Orden',o.number,delivery.result);save();closeModal();showPage('orders')
}
function viewOrder(id){
 let o=db.orders.find(x=>x.id===id),f=db.fleteros.find(x=>x.id===o.fleteroId);
 modal(`<div class="headrow"><div><h2>Orden ${o.number}</h2><div class="muted">${f?.name||''} Â· ${o.date}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 ${o.deliveries.map((d,i)=>`<div class="card" style="margin-bottom:10px"><b>Entrega ${i+1}</b> Â· ${fmtDate(d.date)} Â· ${d.result}<br><span class="muted">Inicio: ${d.loadStart?new Date(d.loadStart).toLocaleString('es-AR'):'No informado'} Â· Fin: ${d.loadEnd?new Date(d.loadEnd).toLocaleString('es-AR'):'No informado'}</span><br><br>${d.lines.map(l=>{let p=db.products.find(x=>x.id===l.productId),cap=p.pack*p.perCut*p.cuts,full=Math.floor(l.total/cap),rem=l.total%cap,packs=Math.floor(rem/p.pack),units=rem%p.pack;return `<b>${p.name}</b>: ${full} pallet(s) completos Â· ${packs} fardos Â· ${units} unidades sueltas`}).join('<br>')}<br><span class="muted">Planchadas: sale ${d.palletOut}, entra ${d.palletIn}. Chapadur: sale ${d.chapOut}, entra ${d.chapIn}.</span></div>`).join('')}
 <div class="right"><button class="btn btn-primary" onclick="closeModal();openOrderForm('${o.id}')">Agregar entrega</button> <button class="btn btn-secondary" onclick="window.print()">Imprimir</button></div>`)
}

function openMovement(type){
 modal(`<div class="headrow"><div><h2>${type}</h2></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid"><div><label>Fecha</label><input id="mDate" type="date" class="field" value="${new Date().toISOString().slice(0,10)}"></div><div class="span2"><label>Referencia / observaciÃ³n</label><input id="mRef" class="field"></div></div>
 <div class="lineitems"><div class="headrow"><h3>Productos</h3><button class="btn btn-secondary" onclick="addMovementLine()">Agregar</button></div><div id="movementLines"></div></div>
 <div class="right"><button class="btn btn-primary" onclick="saveSimpleMovement('${type}')">Guardar</button></div>`);
 addMovementLine()
}
function addMovementLine(){let d=document.createElement('div');d.className='line';d.innerHTML=`<div class="prod"><label>Producto</label><select class="mvProd">${productOptions()}</select></div><div><label>Fardos</label><input class="field mvPack" type="number" min="0" value="0"></div><div><label>Unidades</label><input class="field mvUnit" type="number" min="0" value="0"></div><button class="btn btn-danger" onclick="this.parentElement.remove()">Quitar</button>`;movementLines.appendChild(d)}
function saveSimpleMovement(type){
 let rows=[...document.querySelectorAll('#movementLines .line')],dir=type==='ProducciÃ³n'?'in':'out';
 for(let r of rows){let p=db.products.find(x=>x.id===r.querySelector('.mvProd').value),n=normalize(r.querySelector('.mvPack').value,r.querySelector('.mvUnit').value,p);if(n.total)addStockMove({type,ref:mRef.value||type,productId:p.id,total:n.total,dir})}
 save();closeModal()
}

function openTransfer(){
 modal(`<div class="headrow"><div><h2>Transferencia Mendoza / San Juan</h2><div class="muted">Genera movimiento de mercaderÃ­a y de materiales del fletero.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid"><div><label>Provincia</label><select id="tProvince"><option>Mendoza</option><option>San Juan</option></select></div><div><label>OperaciÃ³n</label><select id="tDirection"><option value="out">EnvÃ­o</option><option value="in">RecepciÃ³n</option></select></div><div><label>NÃºmero de remito</label><input id="tRemit" class="field"></div><div><label>Fletero</label><select id="tCarrier">${fleteroOptions()}</select></div><div><label>Planchadas que salen</label><input id="tPalletOut" class="field" type="number" min="0" value="0"></div><div><label>Planchadas que entran</label><input id="tPalletIn" class="field" type="number" min="0" value="0"></div><div><label>Chapadur que sale</label><input id="tChapOut" class="field" type="number" min="0" value="0"></div><div><label>Chapadur que entra</label><input id="tChapIn" class="field" type="number" min="0" value="0"></div></div>
 <div class="lineitems"><div class="headrow"><h3>Productos del remito</h3><button class="btn btn-secondary" onclick="addMovementLine()">Agregar</button></div><div id="movementLines"></div></div>
 <div class="right"><button class="btn btn-primary" onclick="saveTransfer()">Guardar transferencia</button></div>`);
 addMovementLine()
}
function saveTransfer(){
 if(!tRemit.value.trim())return alert('El nÃºmero de remito es obligatorio.');
 let type=(tDirection.value==='in'?'RecepciÃ³n desde ':'EnvÃ­o a ')+tProvince.value,ref='Remito '+tRemit.value;
 [...document.querySelectorAll('#movementLines .line')].forEach(r=>{let p=db.products.find(x=>x.id===r.querySelector('.mvProd').value),n=normalize(r.querySelector('.mvPack').value,r.querySelector('.mvUnit').value,p);if(n.total)addStockMove({type,ref,productId:p.id,total:n.total,dir:tDirection.value})});
 addMaterialMove({fleteroId:tCarrier.value,ref,source:type,palletOut:tPalletOut.value,palletIn:tPalletIn.value,chapOut:tChapOut.value,chapIn:tChapIn.value});
 save();closeModal()
}
function openMaterialReturn(){
 modal(`<div class="headrow"><h2>DevoluciÃ³n general de materiales</h2><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><div><label>Fletero</label><select id="rCarrier">${fleteroOptions()}</select></div><div><label>Planchadas devueltas</label><input id="rPallet" class="field" type="number" min="0" value="0"></div><div><label>Chapadur devuelto</label><input id="rChap" class="field" type="number" min="0" value="0"></div><div class="span3"><label>Observaciones</label><input id="rNote" class="field"></div></div><div class="right"><button class="btn btn-primary" onclick="saveReturn()">Guardar</button></div>`)
}
function saveReturn(){addMaterialMove({fleteroId:rCarrier.value,ref:rNote.value||'DevoluciÃ³n general',source:'DevoluciÃ³n general',palletIn:rPallet.value,chapIn:rChap.value});save();closeModal()}

function accreditEmployees(){
 let d=new Date(),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 if(d.getDate()<15)return;
 let changed=false;db.employees.forEach(e=>{if(e.active&&e.lastCredit!==key){e.balance=(e.balance||0)+2;e.lastCredit=key;changed=true}});if(changed)localStorage.setItem('talcaExpV01',JSON.stringify(db))
}

let selectedEmployeeId='';

function searchEmployees(){
 let q=(document.getElementById('employeeSearchInput')?.value||'').trim().toLowerCase();
 let list=db.employees.filter(e=>e.active).filter(e=>!q||e.legajo.toLowerCase().includes(q)||`${e.name} ${e.surname}`.toLowerCase().includes(q));
 employeeSearchResults.innerHTML=list.slice(0,30).map(e=>`<div class="employee-result ${selectedEmployeeId===e.id?'selected':''}" onclick="selectEmployee('${e.id}')"><b>${e.legajo}</b> Â· ${e.name} ${e.surname}<br><span class="muted">Saldo beneficio: ${e.balance||0} fardos</span></div>`).join('')||'<div class="muted">No se encontraron empleados activos.</div>'
}
function selectFirstEmployeeResult(){
 let q=(employeeSearchInput.value||'').trim().toLowerCase();
 let e=db.employees.filter(x=>x.active).find(x=>!q||x.legajo.toLowerCase()===q||`${x.name} ${x.surname}`.toLowerCase().includes(q))||
       db.employees.filter(x=>x.active).find(x=>!q||x.legajo.toLowerCase().includes(q));
 if(!e)return alert('No se encontrÃ³ un empleado activo.');
 selectEmployee(e.id)
}
function selectEmployee(id){
 selectedEmployeeId=id;
 let receiptArea=document.getElementById('employeeReceiptArea');
 if(receiptArea)receiptArea.classList.add('hidden');
 searchEmployees();
 renderEmployeeWorkbench()
}
function employeeMovements(e){
 return [...db.movements].filter(m=>m.type===`Consumo de empleado - ${e.name} ${e.surname}`||m.type===`Anticipo empleado - ${e.name} ${e.surname}`).reverse()
}
function renderEmployeeWorkbench(){
 let e=db.employees.find(x=>x.id===selectedEmployeeId);
 if(!e){employeeWorkbench.innerHTML='<div class="card"><span class="muted">Seleccione un empleado.</span></div>';return}
 let moves=employeeMovements(e);
 employeeWorkbench.innerHTML=`
 <div class="card employee-profile">
   <div class="headrow"><div><h2>${e.name} ${e.surname}</h2><div class="muted">Legajo ${e.legajo} Â· ${e.active?'Activo':'Inactivo'}</div></div><div><span class="muted">Saldo beneficio</span><div style="font-size:30px;font-weight:800">${e.balance||0} fardos</div></div></div>
 </div>
 <div class="employee-actions" style="margin-top:14px">
   <div class="card">
     <h3>Consumo de empleado</h3>
     <p class="muted">Descuenta el beneficio acumulado y el stock. Solo admite fardos completos.</p>
     <label>Producto</label>
     <select id="wbConsumptionProduct">${db.products.filter(p=>p.active!==false&&p.employeeBenefit===true).map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select>
     <label>Fardos</label><input id="wbConsumptionPacks" class="field" type="number" min="1" value="1">
     <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="saveWorkbenchConsumption()">Confirmar y generar comprobantes</button>
   </div>
   <div class="card">
     <div class="headrow"><h3>Anticipo empleado</h3><button class="btn btn-secondary" onclick="addWorkbenchAdvanceLine()">Agregar producto</button></div>
     <p class="muted">Compra de mercaderÃ­a. Afecta el stock, pero no el saldo del beneficio.</p>
     <div id="wbAdvanceLines"></div>
     <label>Observaciones</label><input id="wbAdvanceNote" class="field">
     <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="saveWorkbenchAdvance()">Confirmar y generar comprobantes</button>
   </div>
 </div>
 <div class="card" style="margin-top:14px">
   <h3>Historial reciente</h3>
   <div class="mini-history">${moves.length?moves.slice(0,20).map(m=>{let p=db.products.find(x=>x.id===m.productId);return `<div style="padding:9px 0;border-bottom:1px solid var(--line)"><b>${m.type.startsWith('Consumo')?'Consumo':'Anticipo'}</b> Â· ${p?.name||''} Â· ${equivalent(m.total,p)}<br><span class="muted">${fmtDate(m.date)} Â· ${m.user} Â· Turno ${m.shift}</span></div>`}).join(''):'<span class="muted">TodavÃ­a no registra consumos ni anticipos.</span>'}</div>
 </div>`;
 addWorkbenchAdvanceLine()
}
function addWorkbenchAdvanceLine(){
 let box=document.getElementById('wbAdvanceLines');if(!box)return;
 let d=document.createElement('div');d.className='line';
 d.innerHTML=`<div class="prod"><label>Producto</label><select class="wbaProd">${productOptions()}</select></div><div><label>Fardos</label><input class="field wbaPack" type="number" min="0" value="0"></div><div><label>Unidades</label><input class="field wbaUnit" type="number" min="0" value="0"></div><button class="btn btn-danger" onclick="this.parentElement.remove()">Quitar</button>`;
 box.appendChild(d)
}
function saveWorkbenchConsumption(){
 let e=db.employees.find(x=>x.id===selectedEmployeeId),p=db.products.find(x=>x.id===wbConsumptionProduct.value),packs=+wbConsumptionPacks.value||0;
 if(!e||packs<=0)return;
 if(packs>e.balance)return alert('El empleado no tiene saldo suficiente.');
 let total=packs*p.pack,justification='';
 if(total>(db.stock[p.id]||0)){justification=prompt('Stock insuficiente. Ingrese una justificaciÃ³n para continuar:')||'';if(!justification)return}
 addStockMove({type:`Consumo de empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:p.id,total,dir:'out',note:justification});
 e.balance-=packs;e.lastConsumption=now();
 let receiptItems=[{p,n:{total}}];
 save();
 showEmployeeReceipt(e,receiptItems,'CONSUMO DE EMPLEADO','CE')
}
function saveWorkbenchAdvance(){
 let e=db.employees.find(x=>x.id===selectedEmployeeId);if(!e)return;
 let rows=[...document.querySelectorAll('#wbAdvanceLines .line')],items=[];
 rows.forEach(r=>{let p=db.products.find(x=>x.id===r.querySelector('.wbaProd').value),n=normalize(r.querySelector('.wbaPack').value,r.querySelector('.wbaUnit').value,p);if(n.total)items.push({p,n})});
 if(!items.length)return alert('Agregue al menos un producto.');
 let shortages=items.filter(x=>x.n.total>(db.stock[x.p.id]||0)),justification='';
 if(shortages.length){justification=prompt('Hay stock insuficiente. Ingrese una justificaciÃ³n para continuar:')||'';if(!justification)return}
 items.forEach(x=>addStockMove({type:`Anticipo empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:x.p.id,total:x.n.total,dir:'out',note:[wbAdvanceNote.value,justification].filter(Boolean).join(' Â· ')}));
 save();
 showEmployeeReceipt(e,items,'ANTICIPO EMPLEADO','AE')
}

let currentPrintTitle='Comprobante',currentPrintBody='';

function setPrintableDocument(title,bodyHtml){
 currentPrintTitle=title||'Comprobante';
 currentPrintBody=bodyHtml||'';
}
function renderPrintArea(){
 let area=document.getElementById('printArea');
 area.innerHTML=`<div class="print-brand">TALCA Â· ExpediciÃ³n</div>${currentPrintBody}`;
}
function printCurrentDocument(){
 if(!currentPrintBody){alert('No hay un comprobante preparado para imprimir.');return}
 renderPrintArea();
 window.print();
}
function openPrintableDocument(){
 if(!currentPrintBody)return;
 renderPrintArea();
 document.querySelectorAll('body > *:not(#printArea)').forEach(el=>el.dataset.prevDisplay=el.style.display||'');
 document.querySelectorAll('body > *:not(#printArea)').forEach(el=>el.style.display='none');
 let area=document.getElementById('printArea');
 area.style.display='block';
 area.style.position='static';
 area.style.width='100%';
 area.style.padding='20px';
 area.innerHTML=`<div class="no-print" style="margin-bottom:16px"><button onclick="restoreApplicationView()" style="padding:10px 14px;margin-right:8px">Volver al sistema</button><button onclick="window.print()" style="padding:10px 14px;background:#19417f;color:white;border:0;border-radius:8px">Imprimir con Ctrl + P</button></div>`+area.innerHTML;
}
function restoreApplicationView(){
 let area=document.getElementById('printArea');
 area.style.display='none';area.style.position='';area.style.width='';area.style.padding='';
 document.querySelectorAll('body > *:not(#printArea)').forEach(el=>el.style.display=el.dataset.prevDisplay||'');
}
function showEmployeeReceipt(e,items,title,prefix){
 let number=nextReceiptNumber(prefix);
 let detail=items.map(x=>`${x.p.name}: ${equivalent(x.n.total,x.p)}`).join('<br>');
 let body=`<div class="receipt"><h2>${title} â€“ FACTURACIÃ“N</h2><p>N.Âº ${number} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div>
 <div class="receipt"><h2>${title} â€“ CONTROL DE GUARDIA</h2><p>N.Âº ${number} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p></div>`;
 setPrintableDocument(title,body);
 let area=document.getElementById('employeeReceiptArea');
 if(!area){
   alert('La operaciÃ³n se registrÃ³ correctamente, pero no se encontrÃ³ el Ã¡rea del comprobante.');
   return;
 }
 area.innerHTML=`<div class="card receipt-success"><div class="headrow"><div><h2>OperaciÃ³n registrada correctamente</h2><div class="muted">${title} Â· Comprobante ${number}</div></div></div>
 ${body}
 <div class="receipt-actions no-print">
   <button class="btn btn-secondary" onclick="document.getElementById('employeeReceiptArea').classList.add('hidden')">Cerrar comprobante</button>
   <button class="btn btn-secondary" onclick="openPrintableDocument()">Vista imprimible</button>
   <button class="btn btn-primary" onclick="printCurrentDocument()">Imprimir / Guardar como PDF</button>
 </div></div>`;
 area.classList.remove('hidden');
 area.scrollIntoView({behavior:'smooth',block:'start'});
}
function nextReceiptNumber(prefix){
 db.counters=db.counters||{CE:0,AE:0};db.counters[prefix]=(db.counters[prefix]||0)+1;safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
 return `${prefix}-${String(db.counters[prefix]).padStart(6,'0')}`
}


function printDialogAsReceipt(title='Comprobante'){
 let dlg=document.getElementById('dialog');if(!dlg)return;
 let copy=dlg.cloneNode(true);copy.querySelectorAll('button,.headrow').forEach(x=>x.remove());
 setPrintableDocument(title,copy.innerHTML);printCurrentDocument()
}

function openEmployeeConsumption(employeeId=''){
 modal(`<div class="headrow"><div><h2>Consumo de empleado</h2><div class="muted">Solo fardos completos de gaseosa 3 L o agua 2 L.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><div><label>Empleado</label><select id="eEmployee" onchange="showEmployeeBalance()">${employeeOptions()}</select><div id="eBalance" class="muted"></div></div><div><label>Producto</label><select id="eProduct">${db.products.filter(p=>p.active!==false&&p.employeeBenefit===true).map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></div><div><label>Fardos</label><input id="ePacks" class="field" type="number" min="1" value="1"></div></div><div class="right"><button class="btn btn-primary" onclick="saveEmployeeConsumption()">Confirmar e imprimir</button></div>`);if(employeeId)eEmployee.value=employeeId;showEmployeeBalance()
}
function showEmployeeBalance(){let e=db.employees.find(x=>x.id===eEmployee.value);eBalance.textContent='Saldo disponible: '+(e?.balance||0)+' fardos'}
function saveEmployeeConsumption(){
 let e=db.employees.find(x=>x.id===eEmployee.value),p=db.products.find(x=>x.id===eProduct.value),packs=+ePacks.value||0;if(packs<=0)return;
 if(packs>e.balance)return alert('El empleado no tiene saldo suficiente.');
 let total=packs*p.pack;if(total>(db.stock[p.id]||0)){let j=prompt('Stock insuficiente. Escriba una justificaciÃ³n para continuar:');if(!j)return;addStockMove({type:`Consumo de empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:p.id,total,dir:'out',note:j})}else addStockMove({type:`Consumo de empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:p.id,total,dir:'out'});
 e.balance-=packs;e.lastConsumption=now();save();
 dialog.innerHTML=`<div class="headrow"><h2>Comprobante generado</h2><button class="btn btn-secondary no-print" onclick="closeModal()">Cerrar</button></div><div class="card"><h3>CONTROL DE CONSUMO â€“ FACTURACIÃ“N</h3><p>N.Âº ${Date.now()} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p><p><b>Producto:</b> ${p.name} Â· <b>Cantidad:</b> ${packs} fardos</p><p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div><div class="card" style="margin-top:14px"><h3>AUTORIZACIÃ“N DE SALIDA â€“ GUARDIA</h3><p>N.Âº ${Date.now()} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p><p><b>Producto:</b> ${p.name} Â· <b>Cantidad:</b> ${packs} fardos</p><p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p></div><div class="right no-print"><button class="btn btn-secondary" onclick="printDialogAsReceipt('Comprobante');setTimeout(openPrintableDocument,700)">Abrir vista imprimible</button> <button class="btn btn-primary" onclick="printDialogAsReceipt('Comprobante')">Imprimir dos copias</button></div>`
}


function openEmployeeAdvance(employeeId=''){
 modal(`<div class="headrow"><div><h2>Anticipo empleado</h2><div class="muted">Registra una compra de mercaderÃ­a y descuenta el stock. No afecta el saldo del beneficio mensual.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid"><div><label>Empleado</label><select id="advEmployee">${employeeOptions()}</select></div><div class="span2"><label>Observaciones</label><input id="advNote" class="field" placeholder="Opcional"></div></div>
 <div class="lineitems"><div class="headrow"><h3>Productos</h3><button class="btn btn-secondary" onclick="addAdvanceLine()">Agregar producto</button></div><div id="advanceLines"></div></div>
 <div class="right"><button class="btn btn-primary" onclick="saveEmployeeAdvance()">Confirmar anticipo</button></div>`);
 if(employeeId)advEmployee.value=employeeId;addAdvanceLine()
}
function addAdvanceLine(){
 let d=document.createElement('div');d.className='line';
 d.innerHTML=`<div class="prod"><label>Producto</label><select class="advProd">${productOptions()}</select></div><div><label>Fardos</label><input class="field advPack" type="number" min="0" value="0"></div><div><label>Unidades</label><input class="field advUnit" type="number" min="0" value="0"></div><button class="btn btn-danger" onclick="this.parentElement.remove()">Quitar</button>`;
 advanceLines.appendChild(d)
}
function saveEmployeeAdvance(){
 let e=db.employees.find(x=>x.id===advEmployee.value);if(!e)return alert('Seleccione un empleado.');
 let rows=[...document.querySelectorAll('#advanceLines .line')],items=[];
 rows.forEach(r=>{let p=db.products.find(x=>x.id===r.querySelector('.advProd').value),n=normalize(r.querySelector('.advPack').value,r.querySelector('.advUnit').value,p);if(n.total)items.push({p,n})});
 if(!items.length)return alert('Agregue al menos un producto.');
 let shortages=items.filter(x=>x.n.total>(db.stock[x.p.id]||0));
 let justification='';
 if(shortages.length){justification=prompt('Hay stock insuficiente. Ingrese una justificaciÃ³n para continuar:')||'';if(!justification)return}
 items.forEach(x=>addStockMove({type:`Anticipo empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:x.p.id,total:x.n.total,dir:'out',note:[advNote.value,justification].filter(Boolean).join(' Â· ')}));save();let receiptNo=Date.now(),detail=items.map(x=>`${x.p.name}: ${equivalent(x.n.total,x.p)}`).join('<br>');dialog.innerHTML=`<div class="headrow"><h2>Comprobantes de anticipo</h2><button class="btn btn-secondary no-print" onclick="closeModal()">Cerrar</button></div><div class="card"><h3>ANTICIPO EMPLEADO â€“ FACTURACIÃ“N</h3><p>N.Âº ${receiptNo} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div><div class="card" style="margin-top:14px"><h3>ANTICIPO EMPLEADO â€“ CONTROL DE GUARDIA</h3><p>N.Âº ${receiptNo} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p></div><div class="right no-print"><button class="btn btn-secondary" onclick="printDialogAsReceipt('Comprobante');setTimeout(openPrintableDocument,700)">Abrir vista imprimible</button> <button class="btn btn-primary" onclick="printDialogAsReceipt('Comprobante')">Imprimir dos copias</button></div>`
}

function openAdjustment(){
 modal(`<div class="headrow"><h2>Ajuste de stock</h2><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><div><label>Producto</label><select id="aProduct">${productOptions()}</select></div><div><label>Tipo</label><select id="aDir"><option value="in">Ajuste positivo</option><option value="out">Ajuste negativo</option></select></div><div><label>Fardos</label><input id="aPacks" class="field" type="number" min="0" value="0"></div><div><label>Unidades</label><input id="aUnits" class="field" type="number" min="0" value="0"></div><div class="span2"><label>JustificaciÃ³n obligatoria</label><textarea id="aNote"></textarea></div></div><div class="right"><button class="btn btn-primary" onclick="saveAdjustment()">Guardar ajuste</button></div>`)
}
function saveAdjustment(){if(!aNote.value.trim())return alert('La justificaciÃ³n es obligatoria.');let p=db.products.find(x=>x.id===aProduct.value),n=normalize(aPacks.value,aUnits.value,p);if(!n.total)return;addStockMove({type:aDir.value==='in'?'Ajuste positivo':'Ajuste negativo',ref:'Inventario',productId:p.id,total:n.total,dir:aDir.value,note:aNote.value});save();closeModal()}

function openCount(){
 modal(`<div class="headrow"><div><h2>Conteo de ${session.shift}</h2><div class="muted">Compare el conteo fÃ­sico con el saldo teÃ³rico.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div id="countLines">${db.products.map(p=>`<div class="line" data-p="${p.id}"><div class="prod"><b>${p.name}</b><div class="muted">Sistema: ${equivalent(db.stock[p.id]||0,p)}</div></div><div><label>Fardos fÃ­sicos</label><input class="field cPack" type="number" min="0" value="${Math.floor((db.stock[p.id]||0)/p.pack)}"></div><div><label>Unidades</label><input class="field cUnit" type="number" min="0" value="${(db.stock[p.id]||0)%p.pack}"></div></div>`).join('')}</div><label>Tipo de conteo</label><select id="countType"><option>Cierre de turno</option><option>Apertura / corroboraciÃ³n</option></select><label>Observaciones</label><textarea id="countNote"></textarea><div class="right"><button class="btn btn-primary" onclick="saveCount()">Guardar conteo</button></div>`)
}
function saveCount(){
 let differences=[];
 [...document.querySelectorAll('#countLines .line')].forEach(r=>{let p=db.products.find(x=>x.id===r.dataset.p),n=normalize(r.querySelector('.cPack').value,r.querySelector('.cUnit').value,p),diff=n.total-(db.stock[p.id]||0);if(diff)differences.push({productId:p.id,diff,physical:n.total})});
 db.counts.push({id:uid('c'),date:now(),shift:session.shift,type:countType.value,user:session.user,differences,note:countNote.value,status:countType.value.startsWith('Cierre')?'Pendiente de corroboraciÃ³n':'Corroborado'});
 save();closeModal()
}
function corroborateCount(id){
 let c=db.counts.find(x=>x.id===id);if(!confirm('Â¿Confirma que recibe el stock indicado por el turno anterior?'))return;c.status='Corroborado';c.correlatedBy=session.user;c.correlatedAt=now();save()
}

function addUser(){
 let displayName=prompt('Nombre visible del encargado:');if(!displayName)return;
 let username=prompt('Nombre de usuario:');if(!username)return;
 if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return alert('Ese usuario ya existe.');
 let password=prompt('Clave inicial:');if(!password)return;
 db.users.push({id:uid('u'),displayName,username,password,active:true});audit('Alta','Usuario',username,displayName);save();fillLoginUsers()
}
function addFletero(){let name=prompt('Nombre obligatorio del fletero:');if(!name)return;let surname=prompt('Apellido (opcional):')||'',company=prompt('Empresa transportista (opcional):')||'';db.fleteros.push({id:uid('f'),name,surname,company,active:true});audit('Alta','Fletero',name,company);save()}
function addEmployee(){
 let legajo=prompt('NÃºmero de legajo:');if(!legajo)return;
 if(db.employees.some(e=>e.legajo===legajo))return alert('Ese legajo ya existe.');
 let name=prompt('Nombre:');if(!name)return;
 let surname=prompt('Apellido:')||'';
 let balance=Number(prompt('Fardos acumulados iniciales:', '0')||0);
 db.employees.push({id:uid('e'),legajo,name,surname,active:true,balance,lastCredit:''});audit('Alta','Empleado',legajo,`${name} ${surname}`);save()
}
function addProduct(){
 let id=prompt('CÃ³digo del producto:');if(!id)return;
 if(db.products.some(p=>p.id===id))return alert('Ese cÃ³digo ya existe.');
 let name=prompt('Nombre del producto:');if(!name)return;
 let pack=Number(prompt('Unidades por fardo:', '6'));if(!pack)return;
 let perCut=Number(prompt('Fardos por corte:', '20'));if(!perCut)return;
 let cuts=Number(prompt('Cortes por planchada:', '4'));if(!cuts)return;
 let minStock=Number(prompt('Stock mÃ­nimo en fardos:', '0')||0),criticalStock=Number(prompt('Stock crÃ­tico en fardos:', '0')||0);db.products.push({id,name,pack,perCut,cuts,minStock,criticalStock,active:true});db.stock[id]=0;audit('Alta','Producto',id,name);save()
}
function resetData(){if(confirm('Se borrarÃ¡n todos los datos de prueba guardados en este navegador.')){safeRemove(localStorage,'talcaExpV01');db=clone(DEMO);save();fillLoginUsers()}}

function editUser(id){let u=db.users.find(x=>x.id===id);if(!u)return;let n=prompt('Nombre visible:',u.displayName);if(!n)return;let un=prompt('Usuario:',u.username);if(!un)return;let pw=prompt('Clave:',u.password);if(!pw)return;u.displayName=n;u.username=un;u.password=pw;save();fillLoginUsers()}
function editFletero(id){let f=db.fleteros.find(x=>x.id===id);if(!f)return;let n=prompt('Nombre:',f.name);if(!n)return;f.name=n;f.surname=prompt('Apellido:',f.surname||'')||'';f.company=prompt('Empresa:',f.company||'')||'';save()}
function editEmployee(id){let e=db.employees.find(x=>x.id===id);if(!e)return;let l=prompt('Legajo:',e.legajo);if(!l)return;let n=prompt('Nombre:',e.name);if(!n)return;e.legajo=l;e.name=n;e.surname=prompt('Apellido:',e.surname||'')||'';e.balance=Number(prompt('Saldo de beneficio:',String(e.balance||0))||0);e.active=confirm('Aceptar para ACTIVO; Cancelar para INACTIVO.');if(!e.active)e.balance=0;save()}
function editProduct(id){let p=db.products.find(x=>x.id===id);if(!p)return;let ni=prompt('CÃ³digo alfanumÃ©rico:',p.id);if(!ni)return;if(ni!==p.id&&db.products.some(x=>x.id===ni))return alert('Ese cÃ³digo ya existe.');let old=p.id;p.id=ni;p.name=prompt('Nombre:',p.name)||p.name;p.pack=Number(prompt('Unidades por fardo:',String(p.pack))||p.pack);p.perCut=Number(prompt('Fardos por corte:',String(p.perCut))||p.perCut);p.cuts=Number(prompt('Cortes por planchada:',String(p.cuts))||p.cuts);p.minStock=Number(prompt('Stock mÃ­nimo en fardos:',String(p.minStock||0))||0);p.criticalStock=Number(prompt('Stock crÃ­tico en fardos:',String(p.criticalStock||0))||0);p.active=confirm('Aceptar para dejar el producto ACTIVO. Cancelar para marcarlo INACTIVO.');if(ni!==old){db.stock[ni]=db.stock[old]||0;delete db.stock[old];db.movements.forEach(m=>{if(m.productId===old)m.productId=ni});db.orders.forEach(o=>o.deliveries.forEach(d=>d.lines.forEach(l=>{if(l.productId===old)l.productId=ni})))}save()}
function populateFilters(){if(document.getElementById('ofCarrier')){ofCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();mfCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();if(document.getElementById('pfCarrier'))pfCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();if(document.getElementById('pfProduct'))pfProduct.innerHTML='<option value="">Todos</option>'+productOptions()}if(document.getElementById('ofUser'))ofUser.innerHTML='<option value="">Todos</option>'+db.users.map(u=>`<option value="${u.displayName}">${u.displayName}</option>`).join('')}
function clearOrderFilters(){ofCarrier.value='';ofDate.value='';ofUser.value='';ofShift.value='';renderOrders()}
function clearMaterialFilters(){mfCarrier.value='';mfFrom.value='';mfTo.value='';mfSource.value='';renderMaterials()}
function printSection(id,title){document.querySelectorAll('.page').forEach(p=>p.classList.remove('print-target'));let p=document.getElementById(id);p.classList.add('print-target');let rt=p.querySelector('.report-title');if(rt)rt.textContent=title;window.print();p.classList.remove('print-target')}
function renderOrders(){if(!document.getElementById('ordersBody'))return;let carrier=ofCarrier?.value||'',date=ofDate?.value||'',user=ofUser?.value||'',shift=ofShift?.value||'';let list=db.orders.filter(o=>{let ds=o.deliveries||[];return(!carrier||o.fleteroId===carrier)&&(!date||o.date===date)&&(!user||ds.some(d=>d.user===user))&&(!shift||ds.some(d=>d.shift===shift))});ordersBody.innerHTML=list.map(o=>{let f=db.fleteros.find(x=>x.id===o.fleteroId),ds=o.deliveries||[],tot=ds.reduce((s,d)=>s+d.lines.reduce((a,l)=>a+l.total,0),0),mat=ds.reduce((s,d)=>({p:s.p+d.palletOut-d.palletIn,c:s.c+d.chapOut-d.chapIn}),{p:0,c:0}),last=ds.at(-1)||{};return `<tr><td><b>${o.number}</b></td><td>${o.date}</td><td>${f?.name||''}</td><td>${last.user||''}</td><td>${last.shift||''}</td><td><span class="status ${o.status==='Parcial'?'partial':'done'}">${o.status}</span></td><td>${tot} unidades</td><td>${mat.p} planch. Â· ${mat.c} chap.</td><td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td></tr>`}).join('')}
function renderMaterials() {
  if (!document.getElementById('materialsBody')) return;
  let carrier = mfCarrier?.value || '', from = mfFrom?.value || '', to = mfTo?.value || '', source = mfSource?.value || '';
  let list = db.materialMoves.filter(m => {
    let d = m.date.slice(0, 10);
    return (!carrier || m.fleteroId === carrier) && (!from || d >= from) && (!to || d <= to) && (!source || m.source === source);
  });
  let t = list.reduce((s, m) => ({ po: s.po + m.palletOut, pi: s.pi + m.palletIn, co: s.co + m.chapOut, ci: s.ci + m.chapIn }), { po: 0, pi: 0, co: 0, ci: 0 });

  let cb = {};
  list.forEach(m => {
    if (!cb[m.fleteroId]) cb[m.fleteroId] = { po: 0, pi: 0, co: 0, ci: 0 };
    cb[m.fleteroId].po += m.palletOut;
    cb[m.fleteroId].pi += m.palletIn;
    cb[m.fleteroId].co += m.chapOut;
    cb[m.fleteroId].ci += m.chapIn;
  });
  let balancesHtml = `<div class="card tablewrap" style="margin-top:16px;">
    <h3>Saldos de Fleteros en este perÃ­odo</h3>
    <table>
      <thead>
        <tr>
          <th>Fletero</th>
          <th style="text-align:center">Planchadas (Sale/Entra)</th>
          <th style="text-align:center">Saldo Planchadas</th>
          <th style="text-align:center">Chapadur (Sale/Entra)</th>
          <th style="text-align:center">Saldo Chapadur</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(cb).map(([fId, b]) => {
          let f = db.fleteros.find(x => x.id === fId);
          let pColor = b.po - b.pi > 0 ? '#d32f2f' : (b.po - b.pi < 0 ? '#388e3c' : '');
          let cColor = b.co - b.ci > 0 ? '#d32f2f' : (b.co - b.ci < 0 ? '#388e3c' : '');
          return `<tr>
            <td><b>${f ? f.name : fId}</b></td>
            <td style="text-align:center">${b.po} / ${b.pi}</td>
            <td style="text-align:center;color:${pColor}"><b>${b.po - b.pi}</b></td>
            <td style="text-align:center">${b.co} / ${b.ci}</td>
            <td style="text-align:center;color:${cColor}"><b>${b.co - b.ci}</b></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;

  materialsTotals.innerHTML = `<div class="summarygrid"><div><span class="muted">Planchadas entregadas</span><b>${t.po}</b></div><div><span class="muted">Planchadas devueltas</span><b>${t.pi}</b></div><div><span class="muted">Resultado planchadas</span><b>${t.po - t.pi}</b></div><div><span class="muted">Chapadur entregado</span><b>${t.co}</b></div><div><span class="muted">Chapadur devuelto</span><b>${t.ci}</b></div><div><span class="muted">Resultado chapadur</span><b>${t.co - t.ci}</b></div></div>` + (Object.keys(cb).length ? balancesHtml : '');
  
  materialsBody.innerHTML = [...list].reverse().map(m => {
    let f = db.fleteros.find(x => x.id === m.fleteroId);
    return `<tr><td>${fmtDate(m.date)}</td><td>${f?.name || ''}</td><td>${m.ref}</td><td>${m.source}</td><td>${m.palletOut}</td><td>${m.palletIn}</td><td>${m.chapOut}</td><td>${m.chapIn}</td><td>Planchadas: ${m.palletOut - m.palletIn}; Chapadur: ${m.chapOut - m.chapIn}</td></tr>`
  }).join('');
}

function reservedForProduct(productId){
 return db.orders.filter(o=>['Recibida','Carga iniciada','Parcial','Pendiente de control'].includes(o.status)).reduce((sum,o)=>{
   let req=0,del=0;(o.deliveries||[]).forEach(d=>(d.lines||[]).forEach(l=>{if(l.productId===productId){req=Math.max(req,l.requestedTotal||l.total);del+=l.total||0}}));
   return sum+Math.max(0,req-del)
 },0)
}
function stockState(p,total){
 let f=Math.floor(total/p.pack),crit=p.criticalStock||0,min=p.minStock||0;
 if(total<0)return ['Negativo','danger'];if(f===0)return ['Sin stock','danger'];if(crit&&f<=crit)return ['CrÃ­tico','danger'];if(min&&f<=min)return ['Bajo','partial'];return ['Normal','done']
}
function renderPending(){
 if(!document.getElementById('pendingBody'))return;
  let pfCarrier = document.getElementById('pfCarrier'), pfProduct = document.getElementById('pfProduct'), pfStatus = document.getElementById('pfStatus'), pfFrom = document.getElementById('pfFrom');
  let fc=pfCarrier?.value||'',fp=pfProduct?.value||'',fs=pfStatus?.value||'',from=pfFrom?.value||'';
 let rows=[];
 db.orders.forEach(o=>{let f=db.fleteros.find(x=>x.id===o.fleteroId),by={};(o.deliveries||[]).forEach(d=>(d.lines||[]).forEach(l=>{let z=by[l.productId]||(by[l.productId]={requested:0,delivered:0});z.requested=Math.max(z.requested,l.requestedTotal||l.total);z.delivered+=l.total||0}));
   Object.entries(by).forEach(([pid,z])=>{let pend=Math.max(0,z.requested-z.delivered);if(pend>0||o.status==='Completa con cambio')rows.push({o,f,pid,z,pend})})
 });
 rows=rows.filter(r=>(!fc||r.o.fleteroId===fc)&&(!fp||r.pid===fp)&&(!fs||r.o.status===fs)&&(!from||r.o.date>=from));
 pendingBody.innerHTML=rows.map(r=>{let p=db.products.find(x=>x.id===r.pid);return `<tr><td>${r.o.number}</td><td>${r.o.date}</td><td>${r.f?.name||''}</td><td>${p?.name||''}</td><td>${equivalent(r.z.requested,p)}</td><td>${equivalent(r.z.delivered,p)}</td><td><b>${equivalent(r.pend,p)}</b></td><td>${r.o.status}</td><td>${r.o.billing}</td><td class="no-print"><button class="btn btn-secondary" onclick="openOrderForm('${r.o.id}')">Completar</button></td></tr>`}).join('')
}
function downloadCSV(filename,rows){
 let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
 let a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download=filename;a.click();URL.revokeObjectURL(a.href)
}
function exportPendingCSV(){
 let rows=[['Orden','Fecha','Fletero','Producto','Estado','FacturaciÃ³n']];
 db.orders.filter(o=>o.status==='Parcial'||o.status==='Completa con cambio').forEach(o=>rows.push([o.number,o.date,db.fleteros.find(f=>f.id===o.fleteroId)?.name||'', '',o.status,o.billing]));
 downloadCSV('pendientes.csv',rows)
}
function exportAuditCSV(){downloadCSV('auditoria.csv',[['Fecha','Usuario','AcciÃ³n','Entidad','Referencia','Detalle'],...(db.audit||[]).map(a=>[fmtDate(a.date),a.user,a.action,a.entity,a.ref,a.detail])])}
function generateShiftSummary(){
 let today=new Date().toISOString().slice(0,10),moves=db.movements.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift),mats=db.materialMoves.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift);
 let byType={};moves.forEach(m=>byType[m.type]=(byType[m.type]||0)+1);
 let body=`<h1>Resumen de turno</h1><p><b>Fecha:</b> ${today} Â· <b>Turno:</b> ${session.shift} Â· <b>Encargado:</b> ${session.user}</p>
 <h2>Movimientos</h2><table><thead><tr><th>Tipo</th><th>Cantidad de registros</th></tr></thead><tbody>${Object.entries(byType).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
 <h2>Materiales</h2><p>Planchadas entregadas: ${mats.reduce((s,m)=>s+m.palletOut,0)} Â· devueltas: ${mats.reduce((s,m)=>s+m.palletIn,0)}</p><p>Chapadur entregado: ${mats.reduce((s,m)=>s+m.chapOut,0)} Â· devuelto: ${mats.reduce((s,m)=>s+m.chapIn,0)}</p>
 <h2>Pendientes</h2><p>Ã“rdenes parciales: ${db.orders.filter(o=>o.status==='Parcial').length} Â· Cambios sin informar: ${db.orders.filter(o=>o.billing==='Pendiente de aviso').length}</p>`;
 setPrintableDocument('Resumen de turno',body);printCurrentDocument()
}

function renderAll(){
 if(!session)return;
 populateFilters();if(document.getElementById('employeeSearchResults')){searchEmployees();if(selectedEmployeeId)renderEmployeeWorkbench();}
 let today=new Date().toISOString().slice(0,10);
 kOpen.textContent=db.orders.filter(o=>o.status==='Abierta'||o.status==='Parcial').length;
 kDeliveries.textContent=db.orders.flatMap(o=>o.deliveries).filter(d=>d.date.slice(0,10)===today).length;
 kAlerts.textContent=db.movements.filter(m=>m.note&&m.date.slice(0,10)===today).length;
 kBilling.textContent=db.orders.filter(o=>o.billing==='Pendiente de aviso').length;
 let recentMoves=[...db.movements].slice(-6).reverse();recent.innerHTML=recentMoves.length?recentMoves.map(m=>{let p=db.products.find(x=>x.id===m.productId);return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${m.type}</b> Â· ${p?.name||''} Â· ${m.dir==='in'?'+':'-'}${equivalent(m.total,p)}<br><span class="muted">${fmtDate(m.date)} Â· ${m.user} Â· ${m.ref}</span></div>`}).join(''):'<span class="muted">AÃºn no hay movimientos.</span>';
 renderOrders();
 stockBody.innerHTML=db.products.filter(p=>p.active!==false).map(p=>{let moves=db.movements.filter(m=>m.productId===p.id),last=moves.at(-1),total=db.stock[p.id]||0,fardos=Math.floor(total/p.pack),sueltas=((total%p.pack)+p.pack)%p.pack,res=reservedForProduct(p.id),avail=total-res,state=stockState(p,avail);return `<tr><td>${p.id}</td><td>${p.name}</td><td><b>${fardos}</b></td><td>${sueltas}</td><td>${equivalent(res,p)}</td><td><b>${equivalent(avail,p)}</b></td><td><span class="status ${state[1]}">${state[0]}</span></td><td>${last?last.type+' Â· '+fmtDate(last.date):'Sin movimientos'}</td></tr>`}).join('');
 movementsBody.innerHTML=[...db.movements].reverse().map(m=>{let p=db.products.find(x=>x.id===m.productId);return `<tr><td>${fmtDate(m.date)}</td><td>${m.type}</td><td>${m.ref}</td><td>${p?.name||''}</td><td>${m.dir==='in'?equivalent(m.total,p):''}</td><td>${m.dir==='out'?equivalent(m.total,p):''}</td><td>${m.user}</td><td>${m.shift}</td></tr>`}).join('');
 renderMaterials();
 let legacyEmployeesBody=document.getElementById('employeesBody');
 if(legacyEmployeesBody){
   let sortedEmployees = [...db.employees].sort((a,b) => String(a.legajo).localeCompare(String(b.legajo), undefined, {numeric:true}));
   legacyEmployeesBody.innerHTML=sortedEmployees.map(e=>`<tr><td>${e.legajo}</td><td>${e.name} ${e.surname}</td><td>${e.active?'Activo':'Inactivo'}</td><td><b>${e.balance||0} fardos</b></td><td>${e.lastConsumption?fmtDate(e.lastConsumption):'Sin consumos'}</td></tr>`).join('');
 }
 renderPending();auditBody.innerHTML=[...(db.audit||[])].reverse().map(a=>`<tr><td>${fmtDate(a.date)}</td><td>${a.user}</td><td>${a.action}</td><td>${a.entity}</td><td>${a.ref}</td><td>${a.detail}</td></tr>`).join('');
 countsBody.innerHTML=[...db.counts].reverse().map(c=>`<tr><td>${fmtDate(c.date)}</td><td>${c.shift}</td><td>${c.type}</td><td>${c.user}</td><td>${c.differences.length}</td><td>${c.status}</td></tr>`).join('');
 let pending=[...db.counts].reverse().find(c=>c.type==='Cierre de turno'&&c.status==='Pendiente de corroboraciÃ³n'&&c.shift!==session.shift);
 handoverAlert.innerHTML=pending?`<div class="alert"><b>Relevo pendiente.</b> ${pending.user} cerrÃ³ el turno ${pending.shift} con ${pending.differences.length} diferencias. <button class="btn btn-primary" onclick="corroborateCount('${pending.id}')">Corroborar recepciÃ³n</button></div>`:'';
 usersList.innerHTML=db.users.map(u=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${u.displayName}</b><br><span class="muted">@${u.username} Â· ${u.active?'Activo':'Inactivo'}</span><div class="right"><button class="btn btn-secondary" onclick="editUser('${u.id}')">Modificar</button></div></div>`).join('');
 fleterosList.innerHTML=db.fleteros.map(f=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${f.name} ${f.surname||''}</b><br><span class="muted">${f.company||'Sin empresa indicada'}</span><div class="right"><button class="btn btn-secondary" onclick="editFletero('${f.id}')">Modificar</button></div></div>`).join('');
 let sortedConfigEmployees = [...db.employees].sort((a,b) => String(a.legajo).localeCompare(String(b.legajo), undefined, {numeric:true}));
 employeeConfigList.innerHTML=sortedConfigEmployees.map(e=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${e.legajo} Â· ${e.name} ${e.surname}</b><br><span class="muted">${e.active?'Activo':'Inactivo'} Â· Saldo beneficio: ${e.balance||0} fardos</span><div class="right"><button class="btn btn-secondary" onclick="editEmployee('${e.id}')">Modificar</button></div></div>`).join('');
 productsList.innerHTML=db.products.map(p=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${p.id} Â· ${p.name}</b><br><span class="muted">${p.pack} un/fardo Â· ${p.perCut} fardos/corte Â· ${p.cuts} cortes/planchada</span><div class="right"><button class="btn btn-secondary" onclick="editProduct('${p.id}')">Modificar</button></div></div>`).join('');
}

// ===== Talca ExpediciÃ³n v1.1: migraciÃ³n, empleados, stock pendiente y backups =====
const V1_EMPLOYEE_SEED=[{"id": "emp_10054", "legajo": "10054", "name": "JOSE ANTONIO", "surname": "LOPEZ MENA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10055", "legajo": "10055", "name": "FACUNDO", "surname": "MOLINA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10101", "legajo": "10101", "name": "SERGIO OMAR", "surname": "FERNANDEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10102", "legajo": "10102", "name": "CLAUDIA INES", "surname": "LIZONDO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10103", "legajo": "10103", "name": "ADOLFO HEN", "surname": "LI", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10112", "legajo": "10112", "name": "GONZALO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10113", "legajo": "10113", "name": "CLAUDIA", "surname": "ALBORNOZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10117", "legajo": "10117", "name": "MONICA LILIANA", "surname": "JIMENEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10118", "legajo": "10118", "name": "MARCO ANTONIO", "surname": "CORTEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10419", "legajo": "10419", "name": "JORGE RAUL", "surname": "ARAOZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10426", "legajo": "10426", "name": "HUGO LUIS", "surname": "PORTAL", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10430", "legajo": "10430", "name": "CARLOS", "surname": "FLORES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10432", "legajo": "10432", "name": "SERGIO", "surname": "GOMEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10437", "legajo": "10437", "name": "ALEJANDRO A", "surname": "FERLATTI", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10439", "legajo": "10439", "name": "BARTOLOME", "surname": "MORALES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10440", "legajo": "10440", "name": "ALDO GONZALO", "surname": "PLAZA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10441", "legajo": "10441", "name": "DIEGO", "surname": "LIENDRO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10442", "legajo": "10442", "name": "EDGAR", "surname": "QUARTIN", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10711", "legajo": "10711", "name": "ANDRES RICARDO", "surname": "GUAYMAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10725", "legajo": "10725", "name": "CARLOS S", "surname": "BARBOZA E", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10754", "legajo": "10754", "name": "MARIA VICTORIA", "surname": "LUI VEGAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10902", "legajo": "10902", "name": "JOSE LUIS", "surname": "JUAREZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10903", "legajo": "10903", "name": "MARCOS", "surname": "BORDON", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10906", "legajo": "10906", "name": "JOAQUIN", "surname": "CONDE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10907", "legajo": "10907", "name": "EXEQUIEL", "surname": "BARCELO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10908", "legajo": "10908", "name": "HERNAN", "surname": "BALDIVIEZO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_10909", "legajo": "10909", "name": "ISAAC", "surname": "RODRIGUEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11002", "legajo": "11002", "name": "VICTOR HUGO", "surname": "RUIZ BAREA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11004", "legajo": "11004", "name": "AGUSTIN", "surname": "CARRERAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11005", "legajo": "11005", "name": "VICTOR HUGO", "surname": "CHUNGARA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11007", "legajo": "11007", "name": "ISMAEL", "surname": "FIGUEROA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11008", "legajo": "11008", "name": "ORLANDO DARIO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11009", "legajo": "11009", "name": "CARLOS GUALBERTO", "surname": "ROMERO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11010", "legajo": "11010", "name": "SERGIO ALEJANDRO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11011", "legajo": "11011", "name": "RICARDO CESAR", "surname": "OSORES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11012", "legajo": "11012", "name": "SANTOS P", "surname": "ALBERTO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11013", "legajo": "11013", "name": "CHRISTIAN", "surname": "PALAVECINO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11018", "legajo": "11018", "name": "RAUL OBDULIO", "surname": "ARIAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11021", "legajo": "11021", "name": "JUAN CARLOS", "surname": "CORTEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11022", "legajo": "11022", "name": "JORGE LUIS", "surname": "AVILA OLGUIN", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11026", "legajo": "11026", "name": "SERGIO ROLANDO", "surname": "SARDINA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11027", "legajo": "11027", "name": "RICHARD", "surname": "CUELLAR", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11029", "legajo": "11029", "name": "NESTOR RAMON", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11030", "legajo": "11030", "name": "NELSON", "surname": "GARIN RODRIGUEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11031", "legajo": "11031", "name": "OSCAR ALBERTO", "surname": "GIRAUDO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11034", "legajo": "11034", "name": "GUSTAVO ADRIAN", "surname": "ORTEGA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11035", "legajo": "11035", "name": "FRANCISCO GABINO", "surname": "SULCA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11037", "legajo": "11037", "name": "JOSE LUIS", "surname": "ARCE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11039", "legajo": "11039", "name": "ROMUALDO ABEL", "surname": "CRUZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11041", "legajo": "11041", "name": "RAUL", "surname": "CRUZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11046", "legajo": "11046", "name": "FREDY ARIEL", "surname": "MORALES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11048", "legajo": "11048", "name": "PABLO JESUS", "surname": "VILTE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11050", "legajo": "11050", "name": "JESUS HUGO", "surname": "LOPEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11054", "legajo": "11054", "name": "JORGE EDUARDO", "surname": "GUANCA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11062", "legajo": "11062", "name": "OSCAR RENE", "surname": "VILTE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11063", "legajo": "11063", "name": "RUFINO", "surname": "LEMOS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11071", "legajo": "11071", "name": "DIEGO", "surname": "RIOS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11072", "legajo": "11072", "name": "DANIEL", "surname": "SARDINAS", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11078", "legajo": "11078", "name": "RAUL LEONARDO", "surname": "ORELLANA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11079", "legajo": "11079", "name": "CARLOS CESAR", "surname": "ALVAREZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11082", "legajo": "11082", "name": "ALBERTO", "surname": "REALES", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11088", "legajo": "11088", "name": "ADRIAN", "surname": "TAPIA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11090", "legajo": "11090", "name": "DELFIN", "surname": "RODRIGUEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11095", "legajo": "11095", "name": "JUAN", "surname": "FERNANDEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11096", "legajo": "11096", "name": "FACUNDO", "surname": "JODOR", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11104", "legajo": "11104", "name": "LUCAS", "surname": "CHILIGUAY", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11503", "legajo": "11503", "name": "RENE ANICETO", "surname": "GRAMAJO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11602", "legajo": "11602", "name": "DANIEL GUALBERTO", "surname": "BARRO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11607", "legajo": "11607", "name": "JOSE LUIS", "surname": "MARTINEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11608", "legajo": "11608", "name": "JOSE", "surname": "CRUZ YEBARA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11609", "legajo": "11609", "name": "CARLOS MARTIN", "surname": "BRAVO", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11610", "legajo": "11610", "name": "ABEL RAMIRO", "surname": "CRUZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11611", "legajo": "11611", "name": "ESTEBAN MISAEL", "surname": "MARTINEZ", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11613", "legajo": "11613", "name": "DIEGO PAUL", "surname": "CORDOBA", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11615", "legajo": "11615", "name": "JUAN", "surname": "CABELLER PONCE", "active": true, "balance": 0, "lastCredit": ""}, {"id": "emp_11950", "legajo": "11950", "name": "FELIX A", "surname": "PATIÃ‘O FERNANDEZ", "active": true, "balance": 0, "lastCredit": ""}];
const V1_SCHEMA_VERSION=1;
function v1SafeGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function v1SafeSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function v1Backup(label='Respaldo manual'){
  const raw=JSON.stringify(db);let arr=[];try{arr=JSON.parse(v1SafeGet('talcaExpBackups')||'[]')}catch(e){}
  arr.push({id:'bk_'+Date.now(),date:new Date().toISOString(),label,data:raw});if(arr.length>10)arr=arr.slice(-10);v1SafeSet('talcaExpBackups',JSON.stringify(arr));return arr.at(-1)
}
function v1EnsureBucket(pid){
  db.stockBuckets=db.stockBuckets||{};
  db.stockBuckets[pid]=Object.assign({physical:db.stock[pid]||0,preventa:0,distriC:0,distriInterior:0,sinCodificar:0,oesteMendoza:0,oesteJeremias:0},db.stockBuckets[pid]||{});
  db.stockBuckets[pid].physical=db.stock[pid]||0;return db.stockBuckets[pid]
}
function v1Migrate(){
  let changed=false;
  if(!db.schemaVersion||db.schemaVersion<V1_SCHEMA_VERSION){v1Backup('Antes de actualizar a v1.0');changed=true}
  db.schemaVersion=V1_SCHEMA_VERSION;db.stockBuckets=db.stockBuckets||{};
  (db.products||[]).forEach(p=>v1EnsureBucket(p.id));
  const legs=new Set((db.employees||[]).map(e=>String(e.legajo)));
  V1_EMPLOYEE_SEED.forEach(e=>{if(!legs.has(String(e.legajo))){db.employees.push(JSON.parse(JSON.stringify(e)));changed=true}});
  if(changed){try{localStorage.setItem('talcaExpV02',JSON.stringify(db))}catch(e){}}
}
v1Migrate();

const _v1OriginalAddStockMove=addStockMove;
addStockMove=function(args){_v1OriginalAddStockMove(args);v1EnsureBucket(args.productId).physical=db.stock[args.productId]||0};

function v1PendingTotal(b){return ['preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias'].reduce((s,k)=>s+Number(b[k]||0),0)}
function v1Pct(b){let t=v1PendingTotal(b);return t===0?100:(Number(b.physical||0)/t)*100}
function v1State(b){let t=v1PendingTotal(b);if(t===0)return 'Sin pendientes';return Number(b.physical||0)>=t?'Disponible':'Insuficiente'}
function v1PendingField(label,key,total,p){let n=normalize(0,total,p);return `<div><label>${label}</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input id="${key}Pack" class="field" type="number" min="0" value="${n.packs}" placeholder="Fardos"><input id="${key}Unit" class="field" type="number" min="0" value="${n.units}" placeholder="Unidades"></div></div>`}
function openPendingEditorV1(pid){let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid);modal(`<div class="headrow"><div><h2>Pendientes Â· ${p.name}</h2><div class="muted">Ingrese fardos y unidades sueltas.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid">${v1PendingField('Preventa pendiente','preventa',b.preventa,p)}${v1PendingField('Distri C pendiente','distriC',b.distriC,p)}${v1PendingField('Distri Interior','distriInterior',b.distriInterior,p)}${v1PendingField('Sin codificar','sinCodificar',b.sinCodificar,p)}${v1PendingField('Oeste Mendoza pendiente','oesteMendoza',b.oesteMendoza,p)}${v1PendingField('Oeste JeremÃ­as pendiente','oesteJeremias',b.oesteJeremias,p)}</div><label>JustificaciÃ³n / referencia</label><textarea id="v1PendingNote"></textarea><div class="right"><button class="btn btn-primary" onclick="savePendingV1('${pid}')">Guardar pendientes</button></div>` )}
function savePendingV1(pid){let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid),before=JSON.parse(JSON.stringify(b));['preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias'].forEach(k=>{b[k]=normalize(document.getElementById(k+'Pack').value,document.getElementById(k+'Unit').value,p).total});audit('ModificaciÃ³n','Pendientes',pid,JSON.stringify({before,after:b,note:document.getElementById('v1PendingNote').value}));save();closeModal();renderStockV1()}
function renderStockV1(){
 if(!document.getElementById('stockBody'))return;let q=(document.getElementById('stockSearchV1')?.value||'').toLowerCase(),f=document.getElementById('stockStateV1')?.value||'';
 let list=(db.products||[]).filter(p=>p.active!==false).filter(p=>!q||p.id.toLowerCase().includes(q)||p.name.toLowerCase().includes(q)).filter(p=>!f||v1State(v1EnsureBucket(p.id))===f);
 stockBody.innerHTML=list.map(p=>{let b=v1EnsureBucket(p.id),t=v1PendingTotal(b),pct=v1Pct(b),state=v1State(b);return `<tr><td><b>${p.id}</b><br>${p.name}</td><td>${equivalent(b.physical,p)}</td><td>${equivalent(b.preventa,p)}</td><td>${equivalent(b.distriC,p)}</td><td>${equivalent(b.distriInterior,p)}</td><td>${equivalent(b.sinCodificar,p)}</td><td>${equivalent(b.oesteMendoza,p)}</td><td>${equivalent(b.oesteJeremias,p)}</td><td><b>${equivalent(t,p)}</b></td><td><span class="status ${state==='Insuficiente'?'danger':state==='Disponible'?'done':'partial'}">${pct.toFixed(1)}%</span><br><span class="muted">${state}</span></td><td class="no-print"><button class="btn btn-secondary" onclick="openPendingEditorV1('${p.id}')">Editar</button></td></tr>`}).join('')
}
function exportStockV1CSV(){let rows=[['CÃ³digo','Producto','Stock fÃ­sico','Preventa','Distri C','Distri Interior','Sin codificar','Oeste Mendoza','Oeste JeremÃ­as','Total pendiente','% disponible']];(db.products||[]).filter(p=>p.active!==false).forEach(p=>{let b=v1EnsureBucket(p.id),t=v1PendingTotal(b);rows.push([p.id,p.name,equivalent(b.physical,p),equivalent(b.preventa,p),equivalent(b.distriC,p),equivalent(b.distriInterior,p),equivalent(b.sinCodificar,p),equivalent(b.oesteMendoza,p),equivalent(b.oesteJeremias,p),equivalent(t,p),v1Pct(b).toFixed(1)+'%'])});downloadCSV('stock_y_pendientes.csv',rows)}
function exportBackupV1(){let payload={app:'Talca ExpediciÃ³n',schemaVersion:V1_SCHEMA_VERSION,exportedAt:new Date().toISOString(),data:db},a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='talca_backup_'+new Date().toISOString().replaceAll(':','-')+'.json';a.click();URL.revokeObjectURL(a.href)}
function importBackupV1(input){let file=input.files?.[0];if(!file)return;let r=new FileReader();r.onload=()=>{try{let payload=JSON.parse(r.result),data=payload.data||payload;if(!data.products||!data.stock)throw new Error('Formato invÃ¡lido');v1Backup('Antes de importar respaldo');db=data;v1Migrate();save();alert('Respaldo importado correctamente')}catch(e){alert('No se pudo importar: '+e.message)}};r.readAsText(file)}
function showBackupManagerV1(){let arr=[];try{arr=JSON.parse(v1SafeGet('talcaExpBackups')||'[]')}catch(e){};modal(`<div class="headrow"><div><h2>Copias de seguridad</h2><div class="muted">La migraciÃ³n a v1.0 crea un respaldo automÃ¡tico.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="toolbar"><button class="btn btn-primary" onclick="exportBackupV1()">Descargar respaldo</button><label class="btn btn-secondary">Importar respaldo<input type="file" accept=".json" hidden onchange="importBackupV1(this)"></label></div><div style="margin-top:16px">${arr.length?arr.slice().reverse().map(b=>`<div class="card" style="margin-bottom:8px"><b>${b.label}</b><br><span class="muted">${fmtDate(b.date)}</span></div>`).join(''):'<span class="muted">No hay respaldos automÃ¡ticos.</span>'}</div>` )}

const _v1OriginalRenderAll=renderAll;
renderAll=function(){_v1OriginalRenderAll();renderStockV1()};
renderAll();



// ===== Talca ExpediciÃ³n v1.1: Ã³rdenes pendientes, beneficios, rebotes y derrame =====
const V11_SCHEMA_VERSION=2;
const V11_BENEFIT_CODES=new Set(['5670','5675','5680','5685','5690','8670']);
const V11_PENDING_LABELS={
 preventa:'Preventa pendiente',distriC:'Distri C pendiente',distriInterior:'Distri Interior',
 sinCodificar:'Sin codificar',oesteMendoza:'Oeste Mendoza pendiente',oesteJeremias:'Oeste JeremÃ­as pendiente',
 immediate:'Salida inmediata',legacy:'OperaciÃ³n histÃ³rica'
};
function v11PendingOptions(selected=''){
 return ['preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias','immediate']
  .map(k=>`<option value="${k}" ${selected===k?'selected':''}>${V11_PENDING_LABELS[k]}</option>`).join('')
}
function v11Migrate(){
 let changed=false;
 if(!db.schemaVersion||db.schemaVersion<V11_SCHEMA_VERSION){v1Backup('Antes de actualizar a v1.1');changed=true}
 db.schemaVersion=V11_SCHEMA_VERSION;
 (db.products||[]).forEach(p=>{
   if(typeof p.employeeBenefit!=='boolean'){p.employeeBenefit=V11_BENEFIT_CODES.has(p.id);changed=true}
   v1EnsureBucket(p.id)
 });
 (db.orders||[]).forEach(o=>{
   o.deliveries=o.deliveries||[];
   if(o.requestLines)o.requestLines.forEach(l=>{if(typeof l.resolvedTotal!=='number')l.resolvedTotal=0});
 });
 if(changed)safeSet(localStorage,'talcaExpV02',JSON.stringify(db))
}
v11Migrate();

const _v11Save=save;
save=function(){db.schemaVersion=V11_SCHEMA_VERSION;(db.products||[]).forEach(p=>v1EnsureBucket(p.id));_v11Save()};

function v11IncreasePending(type,productId,total){if(!type||type==='immediate'||!total)return;let b=v1EnsureBucket(productId);b[type]=Number(b[type]||0)+Number(total||0)}
function v11DecreasePending(type,productId,total){if(!type||type==='immediate'||!total)return 0;let b=v1EnsureBucket(productId),applied=Math.min(Number(b[type]||0),Number(total||0));b[type]=Math.max(0,Number(b[type]||0)-applied);return applied}
function v11OrderRequested(o){return (o.requestLines||[]).reduce((s,l)=>s+Number(l.total||0),0)}
function v11OrderResolved(o){return (o.requestLines||[]).reduce((s,l)=>s+Math.min(Number(l.total||0),Number(l.resolvedTotal||0)),0)}
function v11OrderOutstanding(o){return Math.max(0,v11OrderRequested(o)-v11OrderResolved(o))}
function v11DeliveredTotal(o){return (o.deliveries||[]).reduce((s,d)=>s+(d.lines||[]).reduce((a,l)=>a+Number(l.total||0),0),0)}
function v11LineOutstanding(l){return Math.max(0,Number(l.total||0)-Number(l.resolvedTotal||0))}
function v11FindRequestLine(o,sourceProductId){return (o.requestLines||[]).find(l=>l.productId===sourceProductId&&v11LineOutstanding(l)>0)||(o.requestLines||[]).find(l=>l.productId===sourceProductId)}
function v11OrderStatus(o){
 if(o.pendingType==='immediate')return o.status||'Despachada';
 let outstanding=v11OrderOutstanding(o),delivered=v11DeliveredTotal(o),sub=(o.deliveries||[]).some(d=>(d.lines||[]).some(l=>l.sourceProductId&&l.sourceProductId!==l.productId));
 if(outstanding===0)return 'Despachada';
 if(sub)return 'Pendiente de FacturaciÃ³n';
 if(delivered>0)return 'Parcialmente despachada';
 return 'Pendiente de despacho'
}
function v11ProductSelect(selected=''){return db.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.id} Â· ${p.name}</option>`).join('')}

const _v11LegacyOpenOrderForm=openOrderForm;
openOrderForm=function(existingId){
 if(existingId){
   let o=db.orders.find(x=>x.id===existingId);
   if(o&&o.pendingType&&o.pendingType!=='immediate')return openPendingDispatchV11(o);
   return _v11LegacyOpenOrderForm(existingId)
 }
 let defaultType=session?.shift==='Tarde'?'preventa':'immediate';
 modal(`<div class="headrow"><div><h2>Nueva orden de carga</h2><div class="muted">Las Ã³rdenes pendientes suman lo solicitado; el stock fÃ­sico se descuenta reciÃ©n al confirmar la salida.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid">
  <div><label>NÃºmero de orden</label><input id="v11Number" class="field"></div>
  <div><label>Fecha</label><input id="v11Date" class="field" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
  <div><label>Fletero</label><select id="v11Carrier">${fleteroOptions()}</select></div>
  <div><label>Tipo de afectaciÃ³n</label><select id="v11PendingType" onchange="toggleOrderModeV11()">${v11PendingOptions(defaultType)}</select></div>
  <div class="span2"><label>Observaciones</label><input id="v11Note" class="field"></div>
 </div>
 <div id="v11ModeInfo" class="alert"></div>
 <div class="lineitems"><div class="headrow"><h3>Productos solicitados</h3><button class="btn btn-secondary" onclick="addOrderLine()">Agregar producto</button></div>
 <div class="code-entry"><div><label>CÃ³digo o nombre</label><input id="quickProductCode" class="field" placeholder="Ej.: 5670" onkeydown="if(event.key==='Enter'){event.preventDefault();addProductByCode()}"></div><button class="btn btn-primary" onclick="addProductByCode()">Agregar</button></div>
 <div id="orderLines" style="margin-top:12px"></div></div>
 <div id="v11ImmediateMaterials" class="summary"><div class="summarygrid">
  <div><span class="muted">Planchadas sugeridas</span><b id="suggestPallet">0</b></div><div><label>Planchadas que lleva</label><input id="realPalletOut" class="field" type="number" min="0" value="0"></div>
  <div><label>Planchadas que devuelve</label><input id="realPalletIn" class="field" type="number" min="0" value="0"></div><div><span class="muted">Chapadur sugerido</span><b id="suggestChap">0</b></div>
  <div><label>Chapadur que lleva</label><input id="realChapOut" class="field" type="number" min="0" value="0"></div><div><label>Chapadur que devuelve</label><input id="realChapIn" class="field" type="number" min="0" value="0"></div>
 </div></div><div id="stockWarning"></div>
 <div class="right" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button id="v11SaveOrderBtn" class="btn btn-primary" onclick="saveNewOrderV11()">Guardar orden</button></div>`);
 addOrderLine();toggleOrderModeV11()
};

addOrderLine=function(productId=''){
 let box=document.getElementById('orderLines');if(!box)return;
 let d=document.createElement('div');d.className='line v11-new-order-line';
 d.innerHTML=`<div class="prod"><label>Producto</label><select class="liProd" onchange="recalcOrderV11()">${v11ProductSelect(productId)}</select></div>
 <div><label>Solic. fardos</label><input class="field liReqPack" type="number" min="0" value="0" oninput="syncRequestedV11(this);recalcOrderV11()"></div>
 <div><label>Solic. unidades</label><input class="field liReqUnit" type="number" min="0" value="0" oninput="syncRequestedV11(this);recalcOrderV11()"></div>
 <div class="v11-actual"><label>Entreg. fardos</label><input class="field liPack" type="number" min="0" value="0" oninput="this.dataset.touched='1';recalcOrderV11()"></div>
 <div class="v11-actual"><label>Entreg. unidades</label><input class="field liUnit" type="number" min="0" value="0" oninput="this.dataset.touched='1';recalcOrderV11()"></div>
 <button class="btn btn-danger" onclick="this.parentElement.remove();recalcOrderV11()">Quitar</button>`;
 box.appendChild(d);recalcOrderV11()
};
function syncRequestedV11(el){let r=el.closest('.line'),isPack=el.classList.contains('liReqPack'),target=r.querySelector(isPack?'.liPack':'.liUnit');if(!target.dataset.touched)target.value=el.value}
addProductByCode=function(){let input=document.getElementById('quickProductCode'),q=(input?.value||'').trim().toLowerCase();if(!q)return;let matches=db.products.filter(p=>p.active!==false&&(p.id.toLowerCase()===q||p.name.toLowerCase().includes(q)));if(!matches.length)return alert('No se encontrÃ³ el producto.');if(matches.length>1)return alert('Hay varias coincidencias; escriba el cÃ³digo exacto.');addOrderLine(matches[0].id);input.value='';input.focus()};
function toggleOrderModeV11(){
 let type=document.getElementById('v11PendingType')?.value,immediate=type==='immediate';
 document.querySelectorAll('.v11-actual').forEach(x=>x.classList.toggle('hidden',!immediate));
 document.getElementById('v11ImmediateMaterials')?.classList.toggle('hidden',!immediate);
 let info=document.getElementById('v11ModeInfo');if(info)info.innerHTML=immediate?'<b>Salida inmediata:</b> se descontarÃ¡ del stock fÃ­sico lo realmente entregado y no se modificarÃ¡ ningÃºn pendiente.':`<b>${V11_PENDING_LABELS[type]}:</b> se sumarÃ¡ la cantidad solicitada. El stock fÃ­sico no cambia hasta confirmar la salida.`;
 let btn=document.getElementById('v11SaveOrderBtn');if(btn)btn.textContent=immediate?'Confirmar orden y salida':'Registrar orden pendiente';
 recalcOrderV11()
}
function getNewOrderLinesV11(){
 return [...document.querySelectorAll('#orderLines .v11-new-order-line')].map(r=>{let p=db.products.find(x=>x.id===r.querySelector('.liProd').value),req=normalize(r.querySelector('.liReqPack').value,r.querySelector('.liReqUnit').value,p),act=normalize(r.querySelector('.liPack').value,r.querySelector('.liUnit').value,p);return {productId:p.id,requestedTotal:req.total,total:act.total}}).filter(x=>x.requestedTotal>0||x.total>0)
}
function recalcOrderV11(){
 if(!document.getElementById('orderLines'))return;let immediate=document.getElementById('v11PendingType')?.value==='immediate',lines=getNewOrderLinesV11(),occ=0,cuts=0,w=[];
 if(immediate)lines.forEach(l=>{let p=db.products.find(x=>x.id===l.productId);occ+=l.total/(p.pack*p.perCut*p.cuts);cuts+=l.total?Math.ceil(l.total/(p.pack*p.perCut)):0;if(l.total>(db.stock[p.id]||0))w.push(`${p.name}: stock ${equivalent(db.stock[p.id]||0,p)}, entrega ${equivalent(l.total,p)}`)});
 let sp=document.getElementById('suggestPallet'),sc=document.getElementById('suggestChap');if(sp)sp.textContent=Math.ceil(occ);if(sc)sc.textContent=cuts;
 let po=document.getElementById('realPalletOut'),co=document.getElementById('realChapOut');if(po&&+po.value===0)po.value=Math.ceil(occ);if(co&&+co.value===0)co.value=cuts;
 let warn=document.getElementById('stockWarning');if(warn)warn.innerHTML=w.length?`<div class="alert"><b>Stock insuficiente.</b><br>${w.join('<br>')}<label>JustificaciÃ³n obligatoria</label><textarea id="stockJustification"></textarea></div>`:''
}
function saveNewOrderV11(){
 let num=document.getElementById('v11Number').value.trim(),type=document.getElementById('v11PendingType').value,lines=getNewOrderLinesV11();
 if(!num||!lines.length||!lines.some(l=>l.requestedTotal>0))return alert('Complete el nÃºmero y al menos una cantidad solicitada.');
 if(db.orders.some(o=>o.number===num))return alert('El nÃºmero de orden ya existe.');
 let o={id:uid('o'),number:num,date:document.getElementById('v11Date').value,fleteroId:document.getElementById('v11Carrier').value,pendingType:type,requestLines:lines.map(l=>({productId:l.productId,total:l.requestedTotal,resolvedTotal:0})),deliveries:[],billing:'No aplica',note:document.getElementById('v11Note').value,createdBy:session.user,createdShift:session.shift,createdAt:now()};
 if(type!=='immediate'){
   o.requestLines.forEach(l=>v11IncreasePending(type,l.productId,l.total));o.status='Pendiente de despacho';db.orders.push(o);audit('Alta','Orden pendiente',num,V11_PENDING_LABELS[type]);save();closeModal();showPage('orders');return
 }
 let actual=lines.filter(l=>l.total>0);if(!actual.length)return alert('Ingrese lo realmente entregado.');
 let shortage=actual.some(l=>l.total>(db.stock[l.productId]||0)),just='';if(shortage){just=document.getElementById('stockJustification')?.value.trim()||'';if(!just)return alert('Debe justificar el stock insuficiente.')}
 actual.forEach(l=>addStockMove({type:'Orden de carga',ref:num,productId:l.productId,total:l.total,dir:'out',note:just}));
 let delivery={id:uid('d'),date:now(),lines:actual.map(l=>({sourceProductId:l.productId,productId:l.productId,total:l.total})),result:'Salida inmediata',note:o.note,user:session.user,shift:session.shift,palletOut:+document.getElementById('realPalletOut').value||0,palletIn:+document.getElementById('realPalletIn').value||0,chapOut:+document.getElementById('realChapOut').value||0,chapIn:+document.getElementById('realChapIn').value||0};
 o.deliveries.push(delivery);o.status=actual.reduce((s,l)=>s+l.total,0)>=o.requestLines.reduce((s,l)=>s+l.total,0)?'Despachada':'Parcial';o.requestLines.forEach(r=>{let a=actual.find(x=>x.productId===r.productId);r.resolvedTotal=Math.min(r.total,a?.total||0)});
 addMaterialMove({fleteroId:o.fleteroId,ref:num,source:'Orden de carga',palletOut:delivery.palletOut,palletIn:delivery.palletIn,chapOut:delivery.chapOut,chapIn:delivery.chapIn});db.orders.push(o);audit('Alta','Salida inmediata',num,o.status);save();closeModal();showPage('orders')
}

let v11CurrentDispatchOrderId='';
function openPendingDispatchV11(o){
 v11CurrentDispatchOrderId=o.id;
 let f=db.fleteros.find(x=>x.id===o.fleteroId);
 modal(`<div class="headrow"><div><h2>Confirmar salida Â· Orden ${o.number}</h2><div class="muted">${f?.name||''} Â· ${V11_PENDING_LABELS[o.pendingType]} Â· Solo se descontarÃ¡ lo realmente entregado.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="card v11-request-card"><h3>Pedido original</h3>${(o.requestLines||[]).map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${p?.name||l.productId}</b> Â· Solicitado ${equivalent(l.total,p)} Â· <span class="v11-pending-chip">Pendiente ${equivalent(v11LineOutstanding(l),p)}</span></div>`}).join('')}</div>
 <div class="headrow" style="margin-top:16px"><h3>MercaderÃ­a realmente entregada</h3><button class="btn btn-secondary" onclick="addPendingDispatchLineV11()">Agregar lÃ­nea</button></div><div id="v11DispatchLines"></div>
 <div class="summary"><div class="summarygrid"><div><span class="muted">Planchadas sugeridas</span><b id="v11DispatchPalletSuggest">0</b></div><div><label>Planchadas que lleva</label><input id="v11DispatchPalletOut" class="field" type="number" min="0" value="0"></div><div><label>Planchadas que devuelve</label><input id="v11DispatchPalletIn" class="field" type="number" min="0" value="0"></div><div><span class="muted">Chapadur sugerido</span><b id="v11DispatchChapSuggest">0</b></div><div><label>Chapadur que lleva</label><input id="v11DispatchChapOut" class="field" type="number" min="0" value="0"></div><div><label>Chapadur que devuelve</label><input id="v11DispatchChapIn" class="field" type="number" min="0" value="0"></div></div></div>
 <label>Observaciones</label><textarea id="v11DispatchNote"></textarea><div id="v11DispatchWarning"></div>
 <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="savePendingDispatchV11('${o.id}')">Confirmar salida</button></div>`);
 (o.requestLines||[]).filter(l=>v11LineOutstanding(l)>0).forEach(l=>addPendingDispatchLineV11(l.productId,l.productId));
 if(!document.querySelector('#v11DispatchLines .v11-delivery-row'))addPendingDispatchLineV11();recalcPendingDispatchV11()
}
function v11SourceOptions(o,selected=''){return (o.requestLines||[]).filter(l=>v11LineOutstanding(l)>0||l.productId===selected).map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<option value="${l.productId}" ${l.productId===selected?'selected':''}>${p?.name||l.productId} Â· pendiente ${equivalent(v11LineOutstanding(l),p)}</option>`}).join('')}
function addPendingDispatchLineV11(source='',actual=''){
 let o=db.orders.find(x=>x.id===v11CurrentDispatchOrderId);if(!o)return;
 source=source||(o.requestLines||[]).find(l=>v11LineOutstanding(l)>0)?.productId||'';actual=actual||source;
 let d=document.createElement('div');d.className='v11-delivery-row';d.innerHTML=`<div class="wide"><label>Corresponde al producto solicitado</label><select class="v11Source" onchange="syncDispatchActualV11(this);recalcPendingDispatchV11()">${v11SourceOptions(o,source)}</select></div><div class="wide"><label>Producto realmente entregado</label><select class="v11Actual" onchange="this.dataset.touched='1';recalcPendingDispatchV11()">${v11ProductSelect(actual)}</select><div class="v11-help">Si es diferente, se registra como sustituciÃ³n y el pendiente original queda pendiente de definiciÃ³n.</div></div><div><label>Fardos</label><input class="field v11DPack" type="number" min="0" value="0" oninput="recalcPendingDispatchV11()"></div><div><label>Unidades</label><input class="field v11DUnit" type="number" min="0" value="0" oninput="recalcPendingDispatchV11()"></div><button class="btn btn-danger" onclick="this.parentElement.remove();recalcPendingDispatchV11()">Quitar</button>`;document.getElementById('v11DispatchLines').appendChild(d)
}
function syncDispatchActualV11(sel){let row=sel.closest('.v11-delivery-row'),actual=row.querySelector('.v11Actual');if(!actual.dataset.touched)actual.value=sel.value}
function getPendingDispatchLinesV11(){return [...document.querySelectorAll('#v11DispatchLines .v11-delivery-row')].map(r=>{let source=r.querySelector('.v11Source').value,productId=r.querySelector('.v11Actual').value,p=db.products.find(x=>x.id===productId),n=normalize(r.querySelector('.v11DPack').value,r.querySelector('.v11DUnit').value,p);return {sourceProductId:source,productId,total:n.total}}).filter(l=>l.total>0)}
function recalcPendingDispatchV11(){let lines=getPendingDispatchLinesV11(),occ=0,cuts=0,w=[];lines.forEach(l=>{let p=db.products.find(x=>x.id===l.productId);occ+=l.total/(p.pack*p.perCut*p.cuts);cuts+=Math.ceil(l.total/(p.pack*p.perCut));if(l.total>(db.stock[p.id]||0))w.push(`${p.name}: stock ${equivalent(db.stock[p.id]||0,p)}, entrega ${equivalent(l.total,p)}`)});let ps=document.getElementById('v11DispatchPalletSuggest'),cs=document.getElementById('v11DispatchChapSuggest');if(ps)ps.textContent=Math.ceil(occ);if(cs)cs.textContent=cuts;let po=document.getElementById('v11DispatchPalletOut'),co=document.getElementById('v11DispatchChapOut');if(po&&+po.value===0)po.value=Math.ceil(occ);if(co&&+co.value===0)co.value=cuts;let box=document.getElementById('v11DispatchWarning');if(box)box.innerHTML=w.length?`<div class="alert"><b>Stock insuficiente.</b><br>${w.join('<br>')}<label>JustificaciÃ³n obligatoria</label><textarea id="v11DispatchJustification"></textarea></div>`:''}
function savePendingDispatchV11(orderId){
 let o=db.orders.find(x=>x.id===orderId),lines=getPendingDispatchLinesV11();if(!lines.length)return alert('Ingrese al menos una cantidad realmente entregada.');
 let totals={};lines.forEach(l=>totals[l.productId]=(totals[l.productId]||0)+l.total);let shortage=Object.entries(totals).some(([pid,t])=>t>(db.stock[pid]||0)),just='';if(shortage){just=document.getElementById('v11DispatchJustification')?.value.trim()||'';if(!just)return alert('Debe justificar el stock insuficiente.')}
 lines.forEach(l=>{
   addStockMove({type:l.productId===l.sourceProductId?'Orden de carga':'Orden de carga Â· SustituciÃ³n',ref:o.number,productId:l.productId,total:l.total,dir:'out',note:just});
   let req=v11FindRequestLine(o,l.sourceProductId);if(req&&l.productId===l.sourceProductId){let applied=Math.min(v11LineOutstanding(req),l.total);req.resolvedTotal=Number(req.resolvedTotal||0)+applied;v11DecreasePending(o.pendingType,l.sourceProductId,applied)}
 });
 let delivery={id:uid('d'),date:now(),lines,result:'Salida confirmada',note:document.getElementById('v11DispatchNote').value,stockJustification:just,user:session.user,shift:session.shift};
 o.deliveries.push(delivery);if(lines.some(l=>l.productId!==l.sourceProductId))o.billing='Pendiente de aviso';o.status=v11OrderStatus(o);audit('Salida','Orden',o.number,o.status);save();closeModal();showPage('orders')
}

viewOrder=function(id){
 let o=db.orders.find(x=>x.id===id),f=db.fleteros.find(x=>x.id===o.fleteroId),modern=Array.isArray(o.requestLines),outstanding=modern?v11OrderOutstanding(o):0;
 let requests=modern?`<div class="card v11-request-card"><h3>Solicitud</h3>${o.requestLines.map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${p?.name||l.productId}</b>: ${equivalent(l.total,p)} Â· Resuelto ${equivalent(Math.min(l.total,l.resolvedTotal||0),p)} Â· <b>Pendiente ${equivalent(v11LineOutstanding(l),p)}</b></div>`}).join('')}</div>`:'';
 let deliveries=(o.deliveries||[]).map((d,i)=>`<div class="card" style="margin-top:10px"><b>Salida ${i+1}</b> Â· ${fmtDate(d.date)} Â· ${d.user||''} Â· Turno ${d.shift||''}<br><br>${(d.lines||[]).map(l=>{let p=db.products.find(x=>x.id===l.productId),s=db.products.find(x=>x.id===(l.sourceProductId||l.productId)),change=(l.sourceProductId&&l.sourceProductId!==l.productId)?` <span class="status open">Sustituye a ${s?.name||l.sourceProductId}</span>`:'';return `<b>${p?.name||l.productId}</b>: ${equivalent(l.total,p)}${change}`}).join('<br>')}<br><span class="muted">Planchadas: sale ${d.palletOut||0}, entra ${d.palletIn||0}. Chapadur: sale ${d.chapOut||0}, entra ${d.chapIn||0}.</span></div>`).join('')||'<div class="card" style="margin-top:10px"><span class="muted">TodavÃ­a no se confirmÃ³ ninguna salida.</span></div>';
 modal(`<div class="headrow"><div><h2>Orden ${o.number}</h2><div class="muted">${f?.name||''} Â· ${o.date} Â· ${V11_PENDING_LABELS[o.pendingType||'legacy']||'OperaciÃ³n histÃ³rica'}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="summary"><b>Estado: ${modern?v11OrderStatus(o):o.status}</b>${modern&&o.pendingType!=='immediate'?` Â· Pendiente total: ${outstanding} unidades`:''}${o.billing&&o.billing!=='No aplica'?` Â· FacturaciÃ³n: ${o.billing}`:''}</div>${requests}${deliveries}<div class="right" style="margin-top:16px">${modern&&o.pendingType!=='immediate'&&outstanding>0?`<button class="btn btn-primary" onclick="closeModal();openOrderForm('${o.id}')">Confirmar nueva salida</button>`:''}<button class="btn btn-secondary" onclick="window.print()">Imprimir</button></div>`)
};

function renderOrdersV11(){
 let body=document.getElementById('ordersBody');if(!body)return;let carrier=document.getElementById('ofCarrier')?.value||'',date=document.getElementById('ofDate')?.value||'',user=document.getElementById('ofUser')?.value||'',shift=document.getElementById('ofShift')?.value||'';
 let list=(db.orders||[]).filter(o=>{let ds=o.deliveries||[];return(!carrier||o.fleteroId===carrier)&&(!date||o.date===date)&&(!user||o.createdBy===user||ds.some(d=>d.user===user))&&(!shift||o.createdShift===shift||ds.some(d=>d.shift===shift))});
 body.innerHTML=list.map(o=>{let f=db.fleteros.find(x=>x.id===o.fleteroId),ds=o.deliveries||[],req=Array.isArray(o.requestLines)?v11OrderRequested(o):ds.reduce((s,d)=>s+(d.lines||[]).reduce((a,l)=>a+Number(l.requestedTotal||l.total||0),0),0),del=v11DeliveredTotal(o),mat=ds.reduce((s,d)=>({p:s.p+(+d.palletOut||0)-(+d.palletIn||0),c:s.c+(+d.chapOut||0)-(+d.chapIn||0)}),{p:0,c:0}),last=ds.at(-1)||{},status=Array.isArray(o.requestLines)?v11OrderStatus(o):o.status,type=V11_PENDING_LABELS[o.pendingType||'legacy']||'HistÃ³rica';return `<tr><td><b>${o.number}</b></td><td>${o.date}</td><td>${f?.name||''}</td><td>${type}</td><td>${last.user||o.createdBy||''}</td><td>${last.shift||o.createdShift||''}</td><td><span class="status ${status.includes('Pendiente')?'open':status.includes('Parcial')?'partial':'done'}">${status}</span></td><td>${req} unidades</td><td>${del} unidades</td><td>${mat.p} planch. Â· ${mat.c} chap.</td><td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td></tr>`}).join('')
}
function renderPendingV11(){
 let body=document.getElementById('pendingBody');if(!body)return;let carrier=document.getElementById('pfCarrier')?.value||'',product=document.getElementById('pfProduct')?.value||'',from=document.getElementById('pfFrom')?.value||'',statusFilter=document.getElementById('pfStatus')?.value||'';let rows=[];
 (db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&o.pendingType!=='immediate').filter(o=>(!carrier||o.fleteroId===carrier)&&(!from||o.date>=from)&&(!statusFilter||v11OrderStatus(o)===statusFilter)).forEach(o=>{let f=db.fleteros.find(x=>x.id===o.fleteroId);o.requestLines.forEach(l=>{let p=db.products.find(x=>x.id===l.productId),pend=v11LineOutstanding(l);if(pend>0&&(!product||l.productId===product))rows.push(`<tr><td><b>${o.number}</b></td><td>${o.date}</td><td>${f?.name||''}</td><td>${V11_PENDING_LABELS[o.pendingType]}</td><td>${p?.name||l.productId}</td><td>${equivalent(l.total,p)}</td><td>${equivalent(Math.min(l.total,l.resolvedTotal||0),p)}</td><td><b>${equivalent(pend,p)}</b></td><td>${v11OrderStatus(o)}</td><td>${o.billing||'No aplica'}</td><td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td></tr>`)})});body.innerHTML=rows.join('')||'<tr><td colspan="11" class="muted">No hay pendientes con los filtros seleccionados.</td></tr>'
}
exportPendingCSV=function(){let rows=[['Orden','Fecha','Fletero','Tipo','Producto','Solicitado','Resuelto','Pendiente','Estado','FacturaciÃ³n']];(db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&o.pendingType!=='immediate').forEach(o=>{let f=db.fleteros.find(x=>x.id===o.fleteroId);o.requestLines.forEach(l=>{let p=db.products.find(x=>x.id===l.productId),pend=v11LineOutstanding(l);if(pend>0)rows.push([o.number,o.date,f?.name||'',V11_PENDING_LABELS[o.pendingType],p?.name||l.productId,equivalent(l.total,p),equivalent(Math.min(l.total,l.resolvedTotal||0),p),equivalent(pend,p),v11OrderStatus(o),o.billing||'No aplica'])})});downloadCSV('pendientes.csv',rows)};

const _v11OriginalOpenMovement=openMovement;
openMovement=function(type){return _v11OriginalOpenMovement(type)};
function addNeutralMoveV11({type,ref,productId,total,note=''}){db.movements.push({id:uid('m'),date:now(),type,ref,productId,total,dir:'none',note,user:session.user,shift:session.shift});audit('Movimiento sin impacto',type,ref,`${productId} ${total}`)}
saveSimpleMovement=function(type){
 let rows=[...document.querySelectorAll('#movementLines .line')],has=false;
 for(let r of rows){let p=db.products.find(x=>x.id===r.querySelector('.mvProd').value),n=normalize(r.querySelector('.mvPack').value,r.querySelector('.mvUnit').value,p);if(!n.total)continue;has=true;if(type==='Derrame')addNeutralMoveV11({type,ref:document.getElementById('mRef').value||'Derrame',productId:p.id,total:n.total});else addStockMove({type,ref:document.getElementById('mRef').value||type,productId:p.id,total:n.total,dir:(type==='ProducciÃ³n'||type==='Rebote')?'in':'out'})}
 if(!has)return alert('Ingrese al menos una cantidad.');save();closeModal()
};
function renderMovementsV11(){let body=document.getElementById('movementsBody');if(!body)return;body.innerHTML=[...(db.movements||[])].reverse().map(m=>{let p=db.products.find(x=>x.id===m.productId);return `<tr><td>${fmtDate(m.date)}</td><td>${m.type}</td><td>${m.ref||''}</td><td>${p?.name||''}</td><td>${m.dir==='in'?equivalent(m.total,p):''}</td><td>${m.dir==='out'?equivalent(m.total,p):''}</td><td>${m.dir==='none'?equivalent(m.total,p):''}</td><td>${m.user||''}</td><td>${m.shift||''}</td></tr>`}).join('')}
function renderRecentV11(){let box=document.getElementById('recent');if(!box)return;let ms=[...(db.movements||[])].slice(-6).reverse();box.innerHTML=ms.length?ms.map(m=>{let p=db.products.find(x=>x.id===m.productId),impact=m.dir==='in'?'+':m.dir==='out'?'-':'Sin impacto: ';return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${m.type}</b> Â· ${p?.name||''} Â· ${impact}${equivalent(m.total,p)}<br><span class="muted">${fmtDate(m.date)} Â· ${m.user||''} Â· ${m.ref||''}</span></div>`}).join(''):'<span class="muted">AÃºn no hay movimientos.</span>'}

function renderStockV11(){
 let body=document.getElementById('stockBody');if(!body)return;let q=(document.getElementById('stockSearchV1')?.value||'').toLowerCase(),f=document.getElementById('stockStateV1')?.value||'';let list=(db.products||[]).filter(p=>p.active!==false).filter(p=>!q||p.id.toLowerCase().includes(q)||p.name.toLowerCase().includes(q)).filter(p=>!f||v1State(v1EnsureBucket(p.id))===f);
 body.innerHTML=list.map(p=>{let b=v1EnsureBucket(p.id),t=v1PendingTotal(b),state=v1State(b),availability=state==='Sin pendientes'?'<span class="status partial">Sin pendientes</span>':`<span class="status ${state==='Insuficiente'?'danger':'done'}">${v1Pct(b).toFixed(1)}%</span><br><span class="muted">${state}</span>`;return `<tr><td><b>${p.id}</b><br>${p.name}</td><td>${equivalent(b.physical,p)}</td><td>${equivalent(b.preventa,p)}</td><td>${equivalent(b.distriC,p)}</td><td>${equivalent(b.distriInterior,p)}</td><td>${equivalent(b.sinCodificar,p)}</td><td>${equivalent(b.oesteMendoza,p)}</td><td>${equivalent(b.oesteJeremias,p)}</td><td><b>${equivalent(t,p)}</b></td><td>${availability}</td><td class="no-print"><button class="btn btn-secondary" onclick="openPendingEditorV1('${p.id}')">Editar</button></td></tr>`}).join('')
}
renderStockV1=renderStockV11;

addProduct=function(){let id=prompt('CÃ³digo del producto:');if(!id)return;if(db.products.some(p=>p.id===id))return alert('Ese cÃ³digo ya existe.');let name=prompt('Nombre del producto:');if(!name)return;let pack=Number(prompt('Unidades por fardo:','6'));if(!pack)return;let perCut=Number(prompt('Fardos por corte:','20'));if(!perCut)return;let cuts=Number(prompt('Cortes por planchada:','4'));if(!cuts)return;let minStock=Number(prompt('Stock mÃ­nimo en fardos:','0')||0),criticalStock=Number(prompt('Stock crÃ­tico en fardos:','0')||0),employeeBenefit=confirm('Aceptar para habilitar este producto en el beneficio de empleados.');db.products.push({id,name,pack,perCut,cuts,minStock,criticalStock,active:true,employeeBenefit});db.stock[id]=0;db.stockBuckets=db.stockBuckets||{};v1EnsureBucket(id);audit('Alta','Producto',id,name);save()};
editProduct=function(id){let p=db.products.find(x=>x.id===id);if(!p)return;let ni=prompt('CÃ³digo alfanumÃ©rico:',p.id);if(!ni)return;if(ni!==p.id&&db.products.some(x=>x.id===ni))return alert('Ese cÃ³digo ya existe.');let old=p.id;p.name=prompt('Nombre:',p.name)||p.name;p.pack=Number(prompt('Unidades por fardo:',String(p.pack))||p.pack);p.perCut=Number(prompt('Fardos por corte:',String(p.perCut))||p.perCut);p.cuts=Number(prompt('Cortes por planchada:',String(p.cuts))||p.cuts);p.minStock=Number(prompt('Stock mÃ­nimo en fardos:',String(p.minStock||0))||0);p.criticalStock=Number(prompt('Stock crÃ­tico en fardos:',String(p.criticalStock||0))||0);p.employeeBenefit=confirm('Aceptar para HABILITAR el producto en el beneficio de empleados. Cancelar para DESHABILITARLO.');p.active=confirm('Aceptar para dejar el producto ACTIVO. Cancelar para marcarlo INACTIVO.');if(ni!==old){p.id=ni;db.stock[ni]=db.stock[old]||0;delete db.stock[old];if(db.stockBuckets?.[old]){db.stockBuckets[ni]=db.stockBuckets[old];delete db.stockBuckets[old]}(db.movements||[]).forEach(m=>{if(m.productId===old)m.productId=ni});(db.orders||[]).forEach(o=>{(o.requestLines||[]).forEach(l=>{if(l.productId===old)l.productId=ni});(o.deliveries||[]).forEach(d=>(d.lines||[]).forEach(l=>{if(l.productId===old)l.productId=ni;if(l.sourceProductId===old)l.sourceProductId=ni}))})}save()};
function renderProductsConfigV11(){let box=document.getElementById('productsList');if(!box)return;box.innerHTML=db.products.map(p=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${p.id} Â· ${p.name}</b><br><span class="muted">${p.pack} un/fardo Â· ${p.perCut} fardos/corte Â· ${p.cuts} cortes/planchada Â· Beneficio empleados: <b>${p.employeeBenefit?'SÃ­':'No'}</b></span><div class="right"><button class="btn btn-secondary" onclick="editProduct('${p.id}')">Modificar</button></div></div>`).join('')}

const _v11PrevRenderAll=renderAll;
renderAll=function(){_v11PrevRenderAll();renderOrdersV11();renderPendingV11();renderMovementsV11();renderRecentV11();renderStockV11();renderProductsConfigV11();let ko=document.getElementById('kOpen');if(ko)ko.textContent=(db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&o.pendingType!=='immediate'&&v11OrderOutstanding(o)>0).length};
renderAll();


// ===== Talca ExpediciÃ³n v1.2: consumo de empleados con mÃºltiples productos =====
const V12_SCHEMA_VERSION=3;

(function migrateV12(){
  if(Number(db.schemaVersion||0)<V12_SCHEMA_VERSION){
    try{v1Backup('Antes de actualizar a v1.2')}catch(err){console.error(err)}
    db.schemaVersion=V12_SCHEMA_VERSION;
    safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
  }
})();

const _v12PreviousSave=save;
save=function(){
  _v12PreviousSave();
  db.schemaVersion=V12_SCHEMA_VERSION;
  safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
};

function employeeBenefitProductOptionsV12(selected=''){
  return db.products
    .filter(p=>p.active!==false&&p.employeeBenefit===true)
    .map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.id} Â· ${p.name}</option>`)
    .join('');
}

function addWorkbenchConsumptionLine(productId='',packs=1){
  let box=document.getElementById('wbConsumptionLines');
  if(!box)return;
  let products=db.products.filter(p=>p.active!==false&&p.employeeBenefit===true);
  if(!products.length){
    box.innerHTML='<div class="alert">No hay productos habilitados para el beneficio de empleados.</div>';
    return;
  }
  let selected=productId||products[0].id;
  let row=document.createElement('div');
  row.className='consumption-line';
  row.innerHTML=`
    <div>
      <label>Producto</label>
      <select class="wbcProd" onchange="updateWorkbenchConsumptionSummary()">${employeeBenefitProductOptionsV12(selected)}</select>
    </div>
    <div>
      <label>Fardos</label>
      <input class="field wbcPack" type="number" min="1" step="1" value="${Math.max(1,Number(packs)||1)}" oninput="updateWorkbenchConsumptionSummary()">
    </div>
    <button type="button" class="btn btn-danger remove-consumption-line" onclick="removeWorkbenchConsumptionLine(this)">Quitar</button>`;
  box.appendChild(row);
  updateWorkbenchConsumptionSummary();
}

function removeWorkbenchConsumptionLine(button){
  let box=document.getElementById('wbConsumptionLines');
  button.closest('.consumption-line')?.remove();
  if(box&&!box.querySelector('.consumption-line'))addWorkbenchConsumptionLine();
  updateWorkbenchConsumptionSummary();
}

function collectWorkbenchConsumptionV12(){
  let grouped=new Map();
  document.querySelectorAll('#wbConsumptionLines .consumption-line').forEach(row=>{
    let productId=row.querySelector('.wbcProd')?.value;
    let packs=Number(row.querySelector('.wbcPack')?.value||0);
    if(!productId||!Number.isFinite(packs)||packs<=0)return;
    if(!Number.isInteger(packs))throw new Error('El beneficio solo admite fardos completos.');
    grouped.set(productId,(grouped.get(productId)||0)+packs);
  });
  return [...grouped.entries()].map(([productId,packs])=>{
    let p=db.products.find(x=>x.id===productId);
    return {p,packs,n:{total:packs*p.pack,packs,units:0}};
  });
}

function updateWorkbenchConsumptionSummary(){
  let summary=document.getElementById('wbConsumptionSummary');
  let e=db.employees.find(x=>x.id===selectedEmployeeId);
  if(!summary||!e)return;
  let total=0,error='';
  try{
    total=collectWorkbenchConsumptionV12().reduce((sum,x)=>sum+x.packs,0);
  }catch(err){error=err.message}
  let remaining=Number(e.balance||0)-total;
  summary.innerHTML=`
    <div><span class="muted">Total seleccionado</span><br><strong>${total} fardos</strong></div>
    <div><span class="muted">Saldo actual</span><br><strong>${e.balance||0} fardos</strong></div>
    <div><span class="muted">Saldo despuÃ©s del consumo</span><br><strong class="${remaining<0?'over-balance':''}">${remaining} fardos</strong></div>
    ${error?`<div class="over-balance"><b>${error}</b></div>`:''}`;
}

function employeeHistoryGroupsV12(e){
  let groups=new Map();
  employeeMovements(e).forEach(m=>{
    let key=m.operationId||m.receiptNumber||m.id;
    if(!groups.has(key)){
      groups.set(key,{
        key,
        type:m.type.startsWith('Consumo')?'Consumo':'Anticipo',
        date:m.date,
        user:m.user,
        shift:m.shift,
        receiptNumber:m.receiptNumber||'',
        movements:[]
      });
    }
    groups.get(key).movements.push(m);
  });
  return [...groups.values()];
}

renderEmployeeWorkbench=function(){
  let workbench=document.getElementById('employeeWorkbench');
  let e=db.employees.find(x=>x.id===selectedEmployeeId);
  if(!e){
    workbench.innerHTML='<div class="card"><span class="muted">Seleccione un empleado.</span></div>';
    return;
  }
  let history=employeeHistoryGroupsV12(e);
  workbench.innerHTML=`
  <div class="card employee-profile">
    <div class="headrow">
      <div><h2>${e.name} ${e.surname}</h2><div class="muted">Legajo ${e.legajo} Â· ${e.active?'Activo':'Inactivo'}</div></div>
      <div><span class="muted">Saldo beneficio</span><div style="font-size:30px;font-weight:800">${e.balance||0} fardos</div></div>
    </div>
  </div>

  <div class="employee-actions" style="margin-top:14px">
    <div class="card">
      <div class="headrow">
        <div><h3>Consumo de empleado</h3><p class="muted">Permite combinar varios productos en un solo consumo y comprobante.</p></div>
        <button type="button" class="btn btn-secondary" onclick="addWorkbenchConsumptionLine()">Agregar producto</button>
      </div>
      <div id="wbConsumptionLines" class="consumption-lines"></div>
      <div id="wbConsumptionSummary" class="consumption-summary"></div>
      <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="saveWorkbenchConsumption()">Confirmar y generar comprobantes</button>
    </div>

    <div class="card">
      <div class="headrow"><h3>Anticipo empleado</h3><button class="btn btn-secondary" onclick="addWorkbenchAdvanceLine()">Agregar producto</button></div>
      <p class="muted">Compra de mercaderÃ­a. Afecta el stock, pero no el saldo del beneficio.</p>
      <div id="wbAdvanceLines"></div>
      <label>Observaciones</label><input id="wbAdvanceNote" class="field">
      <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="saveWorkbenchAdvance()">Confirmar y generar comprobantes</button>
    </div>
  </div>

  <div class="card" style="margin-top:14px">
    <h3>Historial reciente</h3>
    <div class="mini-history">${
      history.length
      ?history.slice(0,20).map(g=>{
        let detail=g.movements.map(m=>{
          let p=db.products.find(x=>x.id===m.productId);
          return `${p?.name||m.productId}: ${p?equivalent(m.total,p):m.total}`;
        }).join(' Â· ');
        return `<div class="history-operation"><b>${g.type}</b>${g.receiptNumber?` Â· ${g.receiptNumber}`:''}<br>${detail}<br><span class="muted">${fmtDate(g.date)} Â· ${g.user} Â· Turno ${g.shift}</span></div>`;
      }).join('')
      :'<span class="muted">TodavÃ­a no registra consumos ni anticipos.</span>'
    }</div>
  </div>`;

  addWorkbenchConsumptionLine();
  addWorkbenchAdvanceLine();
  updateWorkbenchConsumptionSummary();
};

showEmployeeReceipt=function(e,items,title,prefix,providedNumber=''){
  let number=providedNumber||nextReceiptNumber(prefix);
  let totalPacks=items.reduce((sum,x)=>sum+Math.floor(Number(x.n.total||0)/x.p.pack),0);
  let totalLabel=prefix==='CE'?`${totalPacks} fardos`:`${items.length} producto${items.length===1?'':'s'}`;
  let rows=items.map(x=>`<tr><td>${x.p.id}</td><td>${x.p.name}</td><td>${equivalent(x.n.total,x.p)}</td></tr>`).join('');
  let detailTable=`<table><thead><tr><th>CÃ³digo</th><th>Producto</th><th>Cantidad</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2"><b>Total</b></td><td><b>${totalLabel}</b></td></tr></tfoot></table>`;
  let body=`<div class="receipt"><h2>${title} â€“ FACTURACIÃ“N</h2><p>N.Âº ${number} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p>${detailTable}<p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div>
  <div class="receipt"><h2>${title} â€“ CONTROL DE GUARDIA</h2><p>N.Âº ${number} Â· ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} Â· <b>Legajo:</b> ${e.legajo}</p>${detailTable}<p><b>Encargado:</b> ${session.user} Â· <b>Turno:</b> ${session.shift}</p></div>`;
  setPrintableDocument(title,body);
  let area=document.getElementById('employeeReceiptArea');
  if(!area){
    alert('La operaciÃ³n se registrÃ³ correctamente, pero no se encontrÃ³ el Ã¡rea del comprobante.');
    return;
  }
  area.innerHTML=`<div class="card receipt-success"><div class="headrow"><div><h2>OperaciÃ³n registrada correctamente</h2><div class="muted">${title} Â· Comprobante ${number}</div></div></div>
  ${body}
  <div class="receipt-actions no-print">
    <button class="btn btn-secondary" onclick="document.getElementById('employeeReceiptArea').classList.add('hidden')">Cerrar comprobante</button>
    <button class="btn btn-secondary" onclick="openPrintableDocument()">Vista imprimible</button>
    <button class="btn btn-primary" onclick="printCurrentDocument()">Imprimir / Guardar como PDF</button>
  </div></div>`;
  area.classList.remove('hidden');
  area.scrollIntoView({behavior:'smooth',block:'start'});
};

saveWorkbenchConsumption=function(){
  let e=db.employees.find(x=>x.id===selectedEmployeeId);
  if(!e||e.active===false)return alert('Seleccione un empleado activo.');

  let items;
  try{items=collectWorkbenchConsumptionV12()}
  catch(err){return alert(err.message)}

  if(!items.length)return alert('Agregue al menos un producto y una cantidad vÃ¡lida.');

  let totalPacks=items.reduce((sum,x)=>sum+x.packs,0);
  if(totalPacks>Number(e.balance||0)){
    return alert(`Saldo insuficiente. El consumo suma ${totalPacks} fardos y el empleado dispone de ${e.balance||0}.`);
  }

  let shortages=items.filter(x=>x.n.total>Number(db.stock[x.p.id]||0));
  let justification='';
  if(shortages.length){
    let names=shortages.map(x=>x.p.name).join(', ');
    justification=prompt(`Stock insuficiente en: ${names}. Ingrese una justificaciÃ³n para continuar:`)||'';
    if(!justification)return;
  }

  // Todas las validaciones se completan antes de modificar stock o saldo.
  let receiptNumber=nextReceiptNumber('CE');
  let operationId=uid('ce');
  let operationDate=now();

  items.forEach(x=>{
    addStockMove({
      type:`Consumo de empleado - ${e.name} ${e.surname}`,
      ref:e.legajo,
      productId:x.p.id,
      total:x.n.total,
      dir:'out',
      note:justification
    });
    let movement=db.movements[db.movements.length-1];
    movement.operationId=operationId;
    movement.receiptNumber=receiptNumber;
    movement.operationDate=operationDate;
    movement.operationTotalPacks=totalPacks;
  });

  e.balance=Number(e.balance||0)-totalPacks;
  e.lastConsumption=operationDate;
  save();
  renderEmployeeWorkbench();
  showEmployeeReceipt(e,items,'CONSUMO DE EMPLEADO','CE',receiptNumber);
};

// Refresh the selected employee if the screen was already open during an update.
if(selectedEmployeeId&&document.getElementById('employeeWorkbench'))renderEmployeeWorkbench();


// ===== Talca ExpediciÃ³n v1.3: fleteros rÃ¡pidos, ediciÃ³n y PENDIENTE administrativo =====
const V13_SCHEMA_VERSION=4;
V11_PENDING_LABELS.administrative='PENDIENTE Â· Sin impacto';

function v13Esc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function v13Norm(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}
function v13IsOperational(type){
  return ['preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias'].includes(type);
}
function v13CarrierDisplay(f){
  if(!f)return 'Sin fletero';
  return [f.name,f.surname].filter(Boolean).join(' ')+(f.company?` Â· ${f.company}`:'');
}
function v13OrderCarrier(o){
  return db.fleteros.find(f=>f.id===o.fleteroId)||o.carrierSnapshot||null;
}
function v13SnapshotOrder(o){
  return clone({
    number:o.number,date:o.date,fleteroId:o.fleteroId,carrierSnapshot:o.carrierSnapshot||null,
    pendingType:o.pendingType,status:o.status,note:o.note||'',billing:o.billing||'No aplica',
    requestLines:o.requestLines||[],deliveries:o.deliveries||[]
  });
}
function v13Migrate(){
  let changed=false;
  if(Number(db.schemaVersion||0)<V13_SCHEMA_VERSION){
    try{v1Backup('Antes de actualizar a v1.3')}catch(err){console.error(err)}
    changed=true;
  }
  db.schemaVersion=V13_SCHEMA_VERSION;
  (db.orders||[]).forEach(o=>{
    o.editHistory=o.editHistory||[];
    let f=db.fleteros.find(x=>x.id===o.fleteroId);
    if(!o.carrierSnapshot&&f){o.carrierSnapshot={id:f.id,name:f.name||'',surname:f.surname||'',company:f.company||''};changed=true}
  });
  if(changed)safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
}
v13Migrate();

const _v13PreviousSave=save;
save=function(){
  db.schemaVersion=V13_SCHEMA_VERSION;
  _v13PreviousSave();
  safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
};

v11IncreasePending=function(type,productId,total){
  if(!v13IsOperational(type)||!total)return;
  let b=v1EnsureBucket(productId);
  b[type]=Number(b[type]||0)+Number(total||0);
};
v11DecreasePending=function(type,productId,total){
  if(!v13IsOperational(type)||!total)return 0;
  let b=v1EnsureBucket(productId);
  let applied=Math.min(Number(b[type]||0),Number(total||0));
  b[type]=Math.max(0,Number(b[type]||0)-applied);
  return applied;
};
v11OrderStatus=function(o){
  if(o.pendingType==='administrative')return 'PENDIENTE';
  if(o.pendingType==='immediate')return o.status||'Despachada';
  let outstanding=v11OrderOutstanding(o),delivered=v11DeliveredTotal(o);
  let substitution=(o.deliveries||[]).some(d=>(d.lines||[]).some(l=>l.sourceProductId&&l.sourceProductId!==l.productId));
  if(outstanding===0)return 'Despachada';
  if(substitution)return 'Pendiente de FacturaciÃ³n';
  if(delivered>0)return 'Parcialmente despachada';
  return 'Pendiente de despacho';
};

function v13TypeOptions(selected='administrative'){
  let keys=['administrative','preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias','immediate'];
  return keys.map(k=>`<option value="${k}" ${selected===k?'selected':''}>${V11_PENDING_LABELS[k]}</option>`).join('');
}
function v13SearchCarriers(){
  let input=document.getElementById('v13CarrierSearch');
  let results=document.getElementById('v13CarrierResults');
  if(!input||!results)return;
  let q=v13Norm(input.value);
  let list=(db.fleteros||[]).filter(f=>{
    let hay=v13Norm(`${f.name||''} ${f.surname||''} ${f.company||''}`);
    return !q||hay.includes(q);
  }).slice(0,10);
  results.innerHTML=list.length
    ?list.map(f=>`<button type="button" onclick="v13SelectCarrier('${f.id}')"><b>${v13Esc([f.name,f.surname].filter(Boolean).join(' '))}</b><br><span class="muted">${v13Esc(f.company||'Sin empresa indicada')}</span></button>`).join('')
    :'<div class="muted" style="padding:10px">Sin coincidencias. Complete los datos para registrar un fletero nuevo.</div>';
  results.classList.remove('hidden');
}
function v13SelectCarrier(id){
  let f=db.fleteros.find(x=>x.id===id);if(!f)return;
  document.getElementById('v13CarrierId').value=f.id;
  document.getElementById('v13CarrierSearch').value=v13CarrierDisplay(f);
  document.getElementById('v13CarrierName').value=f.name||'';
  document.getElementById('v13CarrierSurname').value=f.surname||'';
  document.getElementById('v13CarrierCompany').value=f.company||'';
  document.getElementById('v13CarrierResults').classList.add('hidden');
  document.getElementById('v13CarrierMode').textContent='Fletero existente seleccionado';
}
function v13StartNewCarrier(){
  document.getElementById('v13CarrierId').value='';
  document.getElementById('v13CarrierSearch').value='';
  document.getElementById('v13CarrierName').value='';
  document.getElementById('v13CarrierSurname').value='';
  document.getElementById('v13CarrierCompany').value='';
  document.getElementById('v13CarrierResults').classList.add('hidden');
  document.getElementById('v13CarrierMode').textContent='Nuevo fletero: se guardarÃ¡ al confirmar la orden';
  document.getElementById('v13CarrierName').focus();
}
function v13ResolveCarrier(){
  let id=document.getElementById('v13CarrierId').value;
  let name=document.getElementById('v13CarrierName').value.trim();
  let surname=document.getElementById('v13CarrierSurname').value.trim();
  let company=document.getElementById('v13CarrierCompany').value.trim();
  if(!name)throw new Error('El nombre del fletero es obligatorio.');
  let f=id?db.fleteros.find(x=>x.id===id):null;
  if(!f){
    f=(db.fleteros||[]).find(x=>
      v13Norm(x.name)===v13Norm(name)&&
      v13Norm(x.surname||'')===v13Norm(surname)&&
      v13Norm(x.company||'')===v13Norm(company)
    );
  }
  if(!f){
    f={id:uid('f'),name,surname,company,active:true};
    db.fleteros.push(f);
    audit('Alta','Fletero',f.id,v13CarrierDisplay(f));
  }else{
    let before=v13CarrierDisplay(f);
    if(f.name!==name||String(f.surname||'')!==surname||String(f.company||'')!==company){
      f.name=name;f.surname=surname;f.company=company;
      audit('ModificaciÃ³n','Fletero',f.id,`${before} â†’ ${v13CarrierDisplay(f)}`);
    }
  }
  return f;
}

let v13EditingOrderId='';
function v13ActualTotals(o){
  let map={};
  (o?.deliveries||[]).forEach(d=>(d.lines||[]).forEach(l=>{
    map[l.productId]=(map[l.productId]||0)+Number(l.total||0);
  }));
  return map;
}
function v13AddOrderLine(line=null,actualTotal=0){
  let box=document.getElementById('v13OrderLines');if(!box)return;
  let productId=line?.productId||db.products.find(p=>p.active!==false)?.id||'';
  let p=db.products.find(x=>x.id===productId);
  let req=normalize(0,Number(line?.total||0),p);
  let act=normalize(0,Number(actualTotal||0),p);
  let row=document.createElement('div');
  row.className='v13-order-line';
  row.dataset.originalProduct=line?.productId||'';
  row.dataset.resolvedTotal=String(Number(line?.resolvedTotal||0));
  row.innerHTML=`
    <div class="v13-product"><label>Producto</label><select class="v13Prod" onchange="v13RecalcOrder()">${v11ProductSelect(productId)}</select></div>
    <div><label>Solic. fardos</label><input class="field v13ReqPack" type="number" min="0" value="${req.packs}" oninput="v13SyncRequested(this);v13RecalcOrder()"></div>
    <div><label>Solic. unidades</label><input class="field v13ReqUnit" type="number" min="0" value="${req.units}" oninput="v13SyncRequested(this);v13RecalcOrder()"></div>
    <div class="v13-immediate-field"><label>Entreg. fardos</label><input class="field v13ActPack" type="number" min="0" value="${act.packs}" oninput="this.dataset.touched='1';v13RecalcOrder()"></div>
    <div class="v13-immediate-field"><label>Entreg. unidades</label><input class="field v13ActUnit" type="number" min="0" value="${act.units}" oninput="this.dataset.touched='1';v13RecalcOrder()"></div>
    <button type="button" class="btn btn-danger v13-remove" onclick="this.closest('.v13-order-line').remove();v13RecalcOrder()">Quitar</button>`;
  box.appendChild(row);
  v13ToggleMode();
}
function v13SyncRequested(input){
  let row=input.closest('.v13-order-line');
  let target=row.querySelector(input.classList.contains('v13ReqPack')?'.v13ActPack':'.v13ActUnit');
  if(!target.dataset.touched)target.value=input.value;
}
function v13CollectLines(){
  let grouped=new Map();
  document.querySelectorAll('#v13OrderLines .v13-order-line').forEach(row=>{
    let productId=row.querySelector('.v13Prod').value;
    let p=db.products.find(x=>x.id===productId);
    let req=normalize(row.querySelector('.v13ReqPack').value,row.querySelector('.v13ReqUnit').value,p);
    let act=normalize(row.querySelector('.v13ActPack').value,row.querySelector('.v13ActUnit').value,p);
    if(!req.total&&!act.total)return;
    let current=grouped.get(productId)||{productId,requestedTotal:0,actualTotal:0,resolvedTotal:0,originalProducts:new Set()};
    current.requestedTotal+=req.total;
    current.actualTotal+=act.total;
    current.resolvedTotal+=Number(row.dataset.resolvedTotal||0);
    if(row.dataset.originalProduct)current.originalProducts.add(row.dataset.originalProduct);
    grouped.set(productId,current);
  });
  return [...grouped.values()];
}
function v13ToggleMode(){
  let type=document.getElementById('v13OrderType')?.value||'administrative';
  let immediate=type==='immediate';
  document.querySelectorAll('.v13-immediate-field').forEach(el=>el.classList.toggle('hidden',!immediate));
  document.getElementById('v13Materials')?.classList.toggle('hidden',!immediate);
  let info=document.getElementById('v13ModeInfo');
  if(info){
    if(type==='administrative')info.innerHTML='<b>PENDIENTE administrativo:</b> la orden queda guardada y editable, sin afectar stock fÃ­sico ni columnas de pendientes.';
    else if(immediate)info.innerHTML='<b>Salida inmediata:</b> se descontarÃ¡ del stock fÃ­sico Ãºnicamente lo realmente entregado.';
    else info.innerHTML=`<b>${V11_PENDING_LABELS[type]}:</b> se sumarÃ¡ lo solicitado a esta columna. El stock fÃ­sico se descontarÃ¡ al confirmar la salida.`;
  }
  let button=document.getElementById('v13SaveButton');
  if(button)button.textContent=v13EditingOrderId?'Guardar correcciÃ³n':type==='administrative'?'Guardar como PENDIENTE':immediate?'Confirmar orden y salida':'Registrar orden operativa';
  v13RecalcOrder();
}
function v13RecalcOrder(){
  if(!document.getElementById('v13OrderLines'))return;
  let type=document.getElementById('v13OrderType')?.value;
  let immediate=type==='immediate',occ=0,cuts=0,warnings=[];
  let lines=v13CollectLines();
  if(immediate){
    lines.forEach(l=>{
      let p=db.products.find(x=>x.id===l.productId);
      occ+=l.actualTotal/(p.pack*p.perCut*p.cuts);
      if(l.actualTotal)cuts+=Math.ceil(l.actualTotal/(p.pack*p.perCut));
      if(l.actualTotal>Number(db.stock[p.id]||0))warnings.push(`${p.name}: stock ${equivalent(db.stock[p.id]||0,p)}, entrega ${equivalent(l.actualTotal,p)}`);
    });
  }
  let ps=document.getElementById('v13SuggestPallet'),cs=document.getElementById('v13SuggestChap');
  if(ps)ps.textContent=Math.ceil(occ);if(cs)cs.textContent=cuts;
  let po=document.getElementById('v13PalletOut'),co=document.getElementById('v13ChapOut');
  if(po&&Number(po.value||0)===0)po.value=Math.ceil(occ);
  if(co&&Number(co.value||0)===0)co.value=cuts;
  let warning=document.getElementById('v13StockWarning');
  if(warning)warning.innerHTML=warnings.length?`<div class="alert"><b>Stock insuficiente.</b><br>${warnings.join('<br>')}<label>JustificaciÃ³n obligatoria</label><textarea id="v13StockJustification"></textarea></div>`:'';
}
function v13OpenOrderEditor(existingId=''){
  let o=existingId?db.orders.find(x=>x.id===existingId):null;
  if(o&&!Array.isArray(o.requestLines))return alert('Esta orden pertenece a una versiÃ³n anterior y todavÃ­a no admite ediciÃ³n completa.');
  v13EditingOrderId=o?.id||'';
  let carrier=o?v13OrderCarrier(o):null;
  let type=o?.pendingType||'administrative';
  let hasDeliveries=Boolean((o?.deliveries||[]).length);
  let actual=v13ActualTotals(o);
  modal(`<div class="headrow"><div><h2>${o?`Corregir orden ${v13Esc(o.number)}`:'Nueva orden de carga'}</h2><div class="muted">${o?'Los cambios conservarÃ¡n el historial anterior.':'Puede dejarla como PENDIENTE sin impacto hasta que se defina su salida.'}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Fecha</label><input id="v13Date" class="field" type="date" value="${v13Esc(o?.date||new Date().toISOString().slice(0,10))}"></div>
    <div><label>NÃºmero de orden</label><input id="v13Number" class="field" value="${v13Esc(o?.number||'')}" autofocus></div>
    <div><label>Estado / afectaciÃ³n</label><select id="v13OrderType" onchange="v13ToggleMode()">${v13TypeOptions(type)}</select></div>
    <div><label>Estado de FacturaciÃ³n</label><select id="v13Billing"><option ${!o||o.billing==='No aplica'?'selected':''}>No aplica</option><option ${o?.billing==='Pendiente'?'selected':''}>Pendiente</option><option ${o?.billing==='Pagada'?'selected':''}>Pagada</option><option ${o?.billing==='Pendiente de aviso'?'selected':''}>Pendiente de aviso</option><option ${o?.billing==='Corregida'?'selected':''}>Corregida</option></select></div>
    <div class="span3 v13-carrier-box">
      <div class="headrow"><div><h3>Fletero</h3><span id="v13CarrierMode" class="muted">${carrier?'Fletero existente seleccionado':'Busque uno conocido o complete los datos para crear uno nuevo'}</span></div><button type="button" class="btn btn-secondary" onclick="v13StartNewCarrier()">Nuevo fletero</button></div>
      <input id="v13CarrierId" type="hidden" value="${v13Esc(carrier?.id||'')}">
      <div class="v13-carrier-search"><label>Buscar por nombre, apellido o empresa</label><input id="v13CarrierSearch" class="field" autocomplete="off" value="${v13Esc(carrier?v13CarrierDisplay(carrier):'')}" oninput="v13SearchCarriers()" onfocus="v13SearchCarriers()"><div id="v13CarrierResults" class="v13-autocomplete hidden"></div></div>
      <div class="formgrid">
        <div><label>Nombre</label><input id="v13CarrierName" class="field" value="${v13Esc(carrier?.name||'')}"></div>
        <div><label>Apellido</label><input id="v13CarrierSurname" class="field" value="${v13Esc(carrier?.surname||'')}"></div>
        <div><label>Empresa</label><input id="v13CarrierCompany" class="field" value="${v13Esc(carrier?.company||'')}"></div>
      </div>
    </div>
    <div class="span3"><label>Observaciones</label><textarea id="v13Note">${v13Esc(o?.note||'')}</textarea></div>
    ${o?'<div class="span3"><label>Motivo de la correcciÃ³n</label><textarea id="v13CorrectionReason" placeholder="Obligatorio para guardar cambios"></textarea></div>':''}
  </div>
  ${hasDeliveries?'<div class="alert"><b>La orden ya tiene salidas confirmadas.</b> Puede corregir datos generales y cantidades solicitadas. El historial de entregas seguirÃ¡ visible; no se elimina.</div>':''}
  <div id="v13ModeInfo" class="alert v13-mode-card"></div>
  <div class="lineitems"><div class="headrow"><h3>Productos de la orden</h3><button type="button" class="btn btn-secondary" onclick="v13AddOrderLine()">Agregar producto</button></div><div id="v13OrderLines"></div></div>
  <div id="v13StockWarning"></div>
  <div class="right" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button id="v13SaveButton" class="btn btn-primary" onclick="v13SaveOrder()">Guardar orden</button></div>`);
  let lines=o?.requestLines?.length?o.requestLines:[null];
  lines.forEach(l=>v13AddOrderLine(l,l?Number(actual[l.productId]||0):0));
  if(hasDeliveries){
    let select=document.getElementById('v13OrderType');
    // DespuÃ©s de una salida no se permite volver a un estado administrativo ni alterar el circuito general.
    [...select.options].forEach(opt=>{
      if(o.pendingType==='immediate')opt.disabled=opt.value!=='immediate';
      else if(v13IsOperational(o.pendingType))opt.disabled=opt.value==='administrative'||opt.value==='immediate';
    });
  }
  v13ToggleMode();
}
const _v13PreviousOpenOrderForm=openOrderForm;
openOrderForm=function(existingId){
  if(existingId){
    let o=db.orders.find(x=>x.id===existingId);
    if(o&&Array.isArray(o.requestLines))return v13OpenOrderEditor(existingId);
    return _v13PreviousOpenOrderForm(existingId);
  }
  return v13OpenOrderEditor('');
};

function v13MapOutstanding(o){
  let map={};
  if(!o||!v13IsOperational(o.pendingType))return map;
  (o.requestLines||[]).forEach(l=>map[l.productId]=(map[l.productId]||0)+v11LineOutstanding(l));
  return map;
}
function v13ApplyOutstanding(type,map,direction){
  if(!v13IsOperational(type))return;
  Object.entries(map).forEach(([productId,total])=>{
    if(direction<0)v11DecreasePending(type,productId,total);
    else v11IncreasePending(type,productId,total);
  });
}
function v13AggregateActualFromLines(lines){
  let map={};lines.forEach(l=>map[l.productId]=(map[l.productId]||0)+Number(l.actualTotal||0));return map;
}
function v13AddOrderStockMovement(o,productId,total,dir,note,isCorrection=true){
  addStockMove({type:isCorrection?'CorrecciÃ³n de orden de carga':'Orden de carga',ref:o.number,productId,total,dir,note});
  let m=db.movements[db.movements.length-1];if(m)m.orderId=o.id;
}
function v13UpdateMaterialMove(o,oldNumber,delivery){
  let move=(db.materialMoves||[]).find(m=>m.orderId===o.id)||(db.materialMoves||[]).find(m=>m.ref===oldNumber&&m.source==='Orden de carga');
  if(!move){
    addMaterialMove({fleteroId:o.fleteroId,ref:o.number,source:'Orden de carga',palletOut:delivery.palletOut,palletIn:delivery.palletIn,chapOut:delivery.chapOut,chapIn:delivery.chapIn});
    move=db.materialMoves[db.materialMoves.length-1];
  }else{
    move.fleteroId=o.fleteroId;move.ref=o.number;move.palletOut=delivery.palletOut;move.palletIn=delivery.palletIn;move.chapOut=delivery.chapOut;move.chapIn=delivery.chapIn;
  }
  if(move)move.orderId=o.id;
}
function v13SaveOrder(){
  let existing=v13EditingOrderId?db.orders.find(x=>x.id===v13EditingOrderId):null;
  let number=document.getElementById('v13Number').value.trim();
  let date=document.getElementById('v13Date').value;
  let type=document.getElementById('v13OrderType').value;
  let note=document.getElementById('v13Note').value.trim();
  let billing=document.getElementById('v13Billing').value;
  let correctionReason=existing?(document.getElementById('v13CorrectionReason').value.trim()):'';
  if(!number||!date)return alert('Complete nÃºmero de orden y fecha.');
  if(existing&&!correctionReason)return alert('Ingrese el motivo de la correcciÃ³n.');
  if(db.orders.some(o=>o.number===number&&o.id!==existing?.id))return alert('El nÃºmero de orden ya existe.');

  let formLines=v13CollectLines();
  if(!formLines.length||!formLines.some(l=>l.requestedTotal>0))return alert('Agregue al menos un producto con cantidad solicitada.');
  let hasDeliveries=Boolean((existing?.deliveries||[]).length);
  if(hasDeliveries&&existing.pendingType==='immediate'&&type!=='immediate')return alert('Una salida inmediata ya confirmada no puede cambiar de circuito.');
  if(hasDeliveries&&v13IsOperational(existing.pendingType)&&!v13IsOperational(type))return alert('Una orden con salidas confirmadas debe permanecer en un pendiente operativo.');

  let carrier;
  try{carrier=v13ResolveCarrier()}catch(err){return alert(err.message)}

  let before=existing?v13SnapshotOrder(existing):null;
  let oldNumber=existing?.number||number;
  let oldOutstanding=v13MapOutstanding(existing);
  let oldActual=existing&&existing.pendingType==='immediate'?v13ActualTotals(existing):{};
  if(existing)v13ApplyOutstanding(existing.pendingType,oldOutstanding,-1);

  let o=existing||{
    id:uid('o'),deliveries:[],editHistory:[],createdBy:session.user,createdShift:session.shift,createdAt:now()
  };
  o.number=number;o.date=date;o.fleteroId=carrier.id;
  o.carrierSnapshot={id:carrier.id,name:carrier.name||'',surname:carrier.surname||'',company:carrier.company||''};
  o.pendingType=type;o.note=note;o.billing=billing;

  let oldResolved={};
  if(existing)(existing.requestLines||[]).forEach(l=>oldResolved[l.productId]=(oldResolved[l.productId]||0)+Number(l.resolvedTotal||0));
  o.requestLines=formLines.map(l=>{
    let resolved=Math.min(Number(l.requestedTotal||0),Number(oldResolved[l.productId]||0));
    return {productId:l.productId,total:l.requestedTotal,resolvedTotal:resolved};
  });

  if(type==='administrative'){
    o.status='PENDIENTE';
  }else if(v13IsOperational(type)){
    let newOutstanding=v13MapOutstanding(o);
    v13ApplyOutstanding(type,newOutstanding,1);
    o.status=v11OrderStatus(o);
  }else{
    let actualMap=v13AggregateActualFromLines(formLines);
    if(!Object.values(actualMap).some(v=>v>0)){
      if(existing)v13ApplyOutstanding(existing.pendingType,oldOutstanding,1);
      return alert('Ingrese la cantidad realmente entregada.');
    }
    let shortages=Object.entries(actualMap).filter(([pid,total])=>total>Number(db.stock[pid]||0));
    let justification='';
    if(shortages.length){
      justification=document.getElementById('v13StockJustification')?.value.trim()||'';
      if(!justification){
        if(existing)v13ApplyOutstanding(existing.pendingType,oldOutstanding,1);
        return alert('Debe justificar el stock insuficiente.');
      }
    }
    let products=new Set([...Object.keys(oldActual),...Object.keys(actualMap)]);
    products.forEach(pid=>{
      let delta=Number(actualMap[pid]||0)-Number(oldActual[pid]||0);
      if(delta>0)v13AddOrderStockMovement(o,pid,delta,'out',justification||correctionReason,Boolean(existing));
      if(delta<0)v13AddOrderStockMovement(o,pid,Math.abs(delta),'in',correctionReason,true);
    });
    o.requestLines.forEach(r=>r.resolvedTotal=Math.min(r.total,Number(actualMap[r.productId]||0)));
    let delivery={
      id:existing?.deliveries?.[0]?.id||uid('d'),date:existing?.deliveries?.[0]?.date||now(),
      correctedAt:existing?now():'',lines:Object.entries(actualMap).filter(([,t])=>t>0).map(([productId,total])=>({sourceProductId:productId,productId,total})),
      result:'Salida inmediata',note,user:session.user,shift:session.shift,
      palletOut:+document.getElementById('v13PalletOut').value||0,palletIn:+document.getElementById('v13PalletIn').value||0,
      chapOut:+document.getElementById('v13ChapOut').value||0,chapIn:+document.getElementById('v13ChapIn').value||0
    };
    o.deliveries=[delivery];
    o.status=v11OrderOutstanding(o)>0?'Parcial':'Despachada';
    v13UpdateMaterialMove(o,oldNumber,delivery);
  }

  if(oldNumber!==number){
    (db.movements||[]).forEach(m=>{if(m.orderId===o.id||m.ref===oldNumber){if(String(m.type||'').includes('Orden')){m.ref=number;m.orderId=o.id}}});
    (db.materialMoves||[]).forEach(m=>{if(m.orderId===o.id||(m.ref===oldNumber&&m.source==='Orden de carga')){m.ref=number;m.orderId=o.id}});
  }

  let after=v13SnapshotOrder(o);
  if(existing){
    o.editHistory=o.editHistory||[];
    o.editHistory.push({id:uid('edit'),date:now(),user:session.user,shift:session.shift,reason:correctionReason,before,after});
    audit('CorrecciÃ³n','Orden',number,correctionReason);
  }else{
    db.orders.push(o);
    audit('Alta','Orden',number,type==='administrative'?'PENDIENTE sin impacto':V11_PENDING_LABELS[type]);
  }
  save();closeModal();showPage('orders');
}

viewOrder=function(id){
  let o=db.orders.find(x=>x.id===id);if(!o)return;
  let f=v13OrderCarrier(o),modern=Array.isArray(o.requestLines),outstanding=modern?v11OrderOutstanding(o):0;
  let requests=modern?`<div class="card v11-request-card"><h3>Solicitud</h3>${o.requestLines.map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${v13Esc(p?.name||l.productId)}</b>: ${equivalent(l.total,p)} Â· Resuelto ${equivalent(Math.min(l.total,l.resolvedTotal||0),p)} Â· <b>Restante ${equivalent(v11LineOutstanding(l),p)}</b></div>`}).join('')}</div>`:'';
  let deliveries=(o.deliveries||[]).map((d,i)=>`<div class="card" style="margin-top:10px"><b>Salida ${i+1}</b> Â· ${fmtDate(d.date)} Â· ${v13Esc(d.user||'')} Â· Turno ${v13Esc(d.shift||'')}<br><br>${(d.lines||[]).map(l=>{let p=db.products.find(x=>x.id===l.productId),s=db.products.find(x=>x.id===(l.sourceProductId||l.productId)),change=l.sourceProductId&&l.sourceProductId!==l.productId?` <span class="status open">Sustituye a ${v13Esc(s?.name||l.sourceProductId)}</span>`:'';return `<b>${v13Esc(p?.name||l.productId)}</b>: ${equivalent(l.total,p)}${change}`}).join('<br>')}<br><span class="muted">Planchadas: sale ${d.palletOut||0}, entra ${d.palletIn||0}. Chapadur: sale ${d.chapOut||0}, entra ${d.chapIn||0}.</span></div>`).join('')||'<div class="card" style="margin-top:10px"><span class="muted">TodavÃ­a no se confirmÃ³ ninguna salida.</span></div>';
  let history=(o.editHistory||[]).slice().reverse().map(h=>`<div class="v13-edit-history"><b>${fmtDate(h.date)} Â· ${v13Esc(h.user||'')} Â· Turno ${v13Esc(h.shift||'')}</b><br>${v13Esc(h.reason||'Sin motivo indicado')}</div>`).join('');
  let status=modern?v11OrderStatus(o):o.status;
  modal(`<div class="headrow"><div><h2>Orden ${v13Esc(o.number)}</h2><div class="muted">${v13Esc(v13CarrierDisplay(f))} Â· ${v13Esc(o.date)} Â· ${v13Esc(V11_PENDING_LABELS[o.pendingType||'legacy']||'OperaciÃ³n histÃ³rica')}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="summary"><b>Estado: ${v13Esc(status)}</b>${modern&&v13IsOperational(o.pendingType)?` Â· Pendiente total: ${outstanding} unidades`:''}${o.billing&&o.billing!=='No aplica'?` Â· FacturaciÃ³n: ${v13Esc(o.billing)}`:''}<br><span class="muted">${v13Esc(o.note||'Sin observaciones')}</span></div>
  ${requests}${deliveries}
  ${history?`<div class="card" style="margin-top:10px"><h3>Historial de correcciones</h3>${history}</div>`:''}
  <div class="right" style="margin-top:16px">
    <button class="btn btn-secondary" onclick="closeModal();openOrderForm('${o.id}')">Corregir orden</button>
    ${modern&&v13IsOperational(o.pendingType)&&outstanding>0?`<button class="btn btn-primary" onclick="closeModal();openPendingDispatchV11(db.orders.find(x=>x.id==='${o.id}'))">Confirmar salida</button>`:''}
    <button class="btn btn-secondary" onclick="window.print()">Imprimir</button>
  </div>`);
};

function renderOrdersV13(){
  let body=document.getElementById('ordersBody');if(!body)return;
  let carrier=document.getElementById('ofCarrier')?.value||'',date=document.getElementById('ofDate')?.value||'',user=document.getElementById('ofUser')?.value||'',shift=document.getElementById('ofShift')?.value||'';
  let list=(db.orders||[]).filter(o=>{let ds=o.deliveries||[];return(!carrier||o.fleteroId===carrier)&&(!date||o.date===date)&&(!user||o.createdBy===user||ds.some(d=>d.user===user))&&(!shift||o.createdShift===shift||ds.some(d=>d.shift===shift))});
  body.innerHTML=list.map(o=>{
    let f=v13OrderCarrier(o),ds=o.deliveries||[];
    let req=Array.isArray(o.requestLines)?v11OrderRequested(o):0,del=v11DeliveredTotal(o);
    let mat=ds.reduce((s,d)=>({p:s.p+(+d.palletOut||0)-(+d.palletIn||0),c:s.c+(+d.chapOut||0)-(+d.chapIn||0)}),{p:0,c:0});
    let last=ds.at(-1)||{},status=Array.isArray(o.requestLines)?v11OrderStatus(o):o.status;
    let type=V11_PENDING_LABELS[o.pendingType||'legacy']||'HistÃ³rica';
    let cls=status==='PENDIENTE'?'v13-admin-pending':status.includes('Pendiente')?'open':status.includes('Parcial')?'partial':'done';
    return `<tr><td><b>${v13Esc(o.number)}</b></td><td>${v13Esc(o.date)}</td><td>${v13Esc(v13CarrierDisplay(f))}</td><td>${v13Esc(type)}</td><td>${v13Esc(last.user||o.createdBy||'')}</td><td>${v13Esc(last.shift||o.createdShift||'')}</td><td><span class="status ${cls}">${v13Esc(status)}</span></td><td>${req} unidades</td><td>${del} unidades</td><td>${mat.p} planch. Â· ${mat.c} chap.</td><td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td></tr>`;
  }).join('')||'<tr><td colspan="11" class="muted">No hay Ã³rdenes registradas.</td></tr>';
}
renderOrdersV11=renderOrdersV13;
renderOrders=renderOrdersV13;

function renderPendingV13(){
  let body=document.getElementById('pendingBody');if(!body)return;
  let carrier=document.getElementById('pfCarrier')?.value||'',product=document.getElementById('pfProduct')?.value||'',from=document.getElementById('pfFrom')?.value||'',statusFilter=document.getElementById('pfStatus')?.value||'';
  let rows=[];
  (db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&v13IsOperational(o.pendingType))
    .filter(o=>(!carrier||o.fleteroId===carrier)&&(!from||o.date>=from)&&(!statusFilter||v11OrderStatus(o)===statusFilter))
    .forEach(o=>{
      let f=v13OrderCarrier(o);
      o.requestLines.forEach(l=>{
        let p=db.products.find(x=>x.id===l.productId),pending=v11LineOutstanding(l);
        if(pending>0&&(!product||l.productId===product))rows.push(`<tr><td><b>${v13Esc(o.number)}</b></td><td>${v13Esc(o.date)}</td><td>${v13Esc(v13CarrierDisplay(f))}</td><td>${v13Esc(V11_PENDING_LABELS[o.pendingType])}</td><td>${v13Esc(p?.name||l.productId)}</td><td>${equivalent(l.total,p)}</td><td>${equivalent(Math.min(l.total,l.resolvedTotal||0),p)}</td><td><b>${equivalent(pending,p)}</b></td><td>${v13Esc(v11OrderStatus(o))}</td><td>${v13Esc(o.billing||'No aplica')}</td><td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td></tr>`);
      });
    });
  body.innerHTML=rows.join('')||'<tr><td colspan="11" class="muted">No hay pendientes operativos con los filtros seleccionados.</td></tr>';
}
renderPendingV11=renderPendingV13;
renderPending=renderPendingV13;

exportPendingCSV=function(){
  let rows=[['Orden','Fecha','Fletero','Tipo','Producto','Solicitado','Resuelto','Pendiente','Estado','FacturaciÃ³n']];
  (db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&v13IsOperational(o.pendingType)).forEach(o=>{
    let f=v13OrderCarrier(o);
    o.requestLines.forEach(l=>{
      let p=db.products.find(x=>x.id===l.productId),pending=v11LineOutstanding(l);
      if(pending>0)rows.push([o.number,o.date,v13CarrierDisplay(f),V11_PENDING_LABELS[o.pendingType],p?.name||l.productId,equivalent(l.total,p),equivalent(Math.min(l.total,l.resolvedTotal||0),p),equivalent(pending,p),v11OrderStatus(o),o.billing||'No aplica']);
    });
  });
  downloadCSV('pendientes_operativos.csv',rows);
};

const _v13PreviousRenderAll=renderAll;
renderAll=function(){
  _v13PreviousRenderAll();
  renderOrdersV13();renderPendingV13();
  let k=document.getElementById('kOpen');
  if(k)k.textContent=(db.orders||[]).filter(o=>o.pendingType==='administrative'||(v13IsOperational(o.pendingType)&&v11OrderOutstanding(o)>0)).length;
};
renderAll();

document.addEventListener('click',event=>{
  let box=document.getElementById('v13CarrierResults');
  if(box&&!event.target.closest('.v13-carrier-search'))box.classList.add('hidden');
});


// ===== Talca ExpediciÃ³n v1.4: operaciÃ³n rÃ¡pida, producciÃ³n sin codificar y A4 =====
const V14_SCHEMA_VERSION=5;
const V14_DEFAULT_ALIASES={
  '5670':'CO3','5675':'LI3','5680':'MA3','5685':'NA3','5690':'PO3',
  '5051':'CO5','5056':'LI5','5061':'MA5','5066':'NA5','5071':'PO5',
  '8670':'AG2','4900':'SO2','4171':'SO5','4910':'SIF','BIDON':'BID'
};

function v14Text(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function v14SearchNorm(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function v14DatePart(value){return String(value||'').slice(0,10)}
function v14Migrate(){
  let changed=false;
  if(Number(db.schemaVersion||0)<V14_SCHEMA_VERSION){
    try{v1Backup('Antes de actualizar a v1.4')}catch(err){console.error(err)}
    changed=true;
  }
  db.schemaVersion=V14_SCHEMA_VERSION;
  (db.products||[]).forEach(p=>{
    if(!p.alias){
      p.alias=V14_DEFAULT_ALIASES[p.id]||'';
      changed=true;
    }
    v1EnsureBucket(p.id);
  });
  if(changed)safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
}
v14Migrate();

const _v14Save=save;
save=function(){
  db.schemaVersion=V14_SCHEMA_VERSION;
  _v14Save();
  safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
};

// Sin codificar deja de ser una afectaciÃ³n posible de las Ã³rdenes.
v13IsOperational=function(type){
  return ['preventa','distriC','distriInterior','oesteMendoza','oesteJeremias'].includes(type);
};
v13TypeOptions=function(selected='administrative'){
  let keys=['administrative','preventa','distriC','distriInterior','oesteMendoza','oesteJeremias','immediate'];
  let html=keys.map(k=>`<option value="${k}" ${selected===k?'selected':''}>${V11_PENDING_LABELS[k]}</option>`).join('');
  if(selected==='sinCodificar')html=`<option value="sinCodificar" selected disabled>Sin codificar Â· histÃ³rico</option>`+html;
  return html;
};
v11OrderStatus=function(o){
  if(o.pendingType==='administrative')return 'PENDIENTE';
  if(o.pendingType==='immediate')return o.status||'Despachada';
  let outstanding=v11OrderOutstanding(o),delivered=v11DeliveredTotal(o);
  let substitution=(o.deliveries||[]).some(d=>(d.lines||[]).some(l=>l.sourceProductId&&l.sourceProductId!==l.productId));
  if(outstanding===0)return 'Despachada';
  if(substitution)return 'Pendiente de definiciÃ³n';
  if(delivered>0)return 'Parcialmente despachada';
  return 'Pendiente de despacho';
};

// El total mantiene todas las columnas; la cobertura usa solamente mercaderÃ­a entregable.
function v14DeliverableStock(bucket){return Math.max(0,Number(bucket.physical||0)-Number(bucket.sinCodificar||0))}
v1Pct=function(bucket){
  let total=v1PendingTotal(bucket);
  return total===0?null:(bucket.physical/total)*100;
};
v1State=function(bucket){
  let total=v1PendingTotal(bucket);
  if(total===0)return 'Sin pendientes';
  return bucket.physical>=total?'Disponible':'Insuficiente';
};

openPendingEditorV1=function(pid){
  let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid);
  modal(`<div class="headrow"><div><h2>Pendientes Â· ${v14Text(p.name)}</h2><div class="muted">â€œSin codificarâ€ se alimenta Ãºnicamente desde el ingreso de producciÃ³n.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    ${v1PendingField('Preventa pendiente','preventa',b.preventa,p)}
    ${v1PendingField('Distri C pendiente','distriC',b.distriC,p)}
    ${v1PendingField('Distri Interior','distriInterior',b.distriInterior,p)}
    ${v1PendingField('Oeste Mendoza pendiente','oesteMendoza',b.oesteMendoza,p)}
    ${v1PendingField('Oeste JeremÃ­as pendiente','oesteJeremias',b.oesteJeremias,p)}
  </div>
  <label>JustificaciÃ³n / referencia</label><textarea id="v1PendingNote"></textarea>
  <div class="right"><button class="btn btn-primary" onclick="savePendingV14('${pid}')">Guardar pendientes</button></div>`);
};
function savePendingV14(pid){
  let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid),before=clone(b);
  ['preventa','distriC','distriInterior','oesteMendoza','oesteJeremias'].forEach(k=>{
    b[k]=normalize(document.getElementById(k+'Pack').value,document.getElementById(k+'Unit').value,p).total;
  });
  audit('ModificaciÃ³n','Pendientes',pid,JSON.stringify({before,after:b,note:document.getElementById('v1PendingNote').value}));
  save();closeModal();renderStockV1();
}
renderStockV1=function(){
  if(!document.getElementById('stockBody'))return;
  let q=v14SearchNorm(document.getElementById('stockSearchV1')?.value||''),filter=document.getElementById('stockStateV1')?.value||'';
  let list=(db.products||[]).filter(p=>p.active!==false).filter(p=>{
    let hay=v14SearchNorm(`${p.id} ${p.alias||''} ${p.name}`);
    return !q||hay.includes(q);
  }).filter(p=>!filter||v1State(v1EnsureBucket(p.id))===filter);
  stockBody.innerHTML=list.map(p=>{
    let b=v1EnsureBucket(p.id),total=v1PendingTotal(b),pct=v1Pct(b),state=v1State(b),deliverable=v14DeliverableStock(b);
    let percentage=total===0
      ?'<span class="status partial">Sin pendientes</span>'
      :`<span class="status ${state==='Insuficiente'?'danger':'done'}">${pct.toFixed(1)}%</span><br><span class="muted">${state}</span>`;
    return `<tr>
      <td><b>${v14Text(p.id)}</b>${p.alias?` Â· <span class="status partial">${v14Text(p.alias)}</span>`:''}<br>${v14Text(p.name)}</td>
      <td>${equivalent(b.physical,p)}<br><span class="muted">Entregable: ${equivalent(deliverable,p)}</span></td>
      <td>${equivalent(b.preventa,p)}</td><td>${equivalent(b.distriC,p)}</td><td>${equivalent(b.distriInterior,p)}</td>
      <td>${equivalent(b.sinCodificar,p)}</td><td>${equivalent(b.oesteMendoza,p)}</td><td>${equivalent(b.oesteJeremias,p)}</td>
      <td><b>${equivalent(total,p)}</b></td><td>${percentage}</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="openPendingEditorV1('${p.id}')">Editar pendientes</button></td>
    </tr>`;
  }).join('');
};
exportStockV1CSV=function(){
  let rows=[['CÃ³digo','Alias','Producto','Stock fÃ­sico','Stock entregable','Preventa','Distri C','Distri Interior','Sin codificar','Oeste Mendoza','Oeste JeremÃ­as','Total pendiente','% disponible']];
  (db.products||[]).filter(p=>p.active!==false).forEach(p=>{
    let b=v1EnsureBucket(p.id),total=v1PendingTotal(b),pct=v1Pct(b);
    rows.push([p.id,p.alias||'',p.name,equivalent(b.physical,p),equivalent(v14DeliverableStock(b),p),equivalent(b.preventa,p),equivalent(b.distriC,p),equivalent(b.distriInterior,p),equivalent(b.sinCodificar,p),equivalent(b.oesteMendoza,p),equivalent(b.oesteJeremias,p),equivalent(total,p),pct===null?'Sin pendientes':pct.toFixed(1)+'%']);
  });
  downloadCSV('stock_y_pendientes.csv',rows);
};

// ProducciÃ³n codificada / sin codificar.
const _v14LegacyOpenMovement=openMovement;
openMovement=function(type){
  if(type!=='ProducciÃ³n')return _v14LegacyOpenMovement(type);
  modal(`<div class="headrow"><div><h2>Ingreso de producciÃ³n</h2><div class="muted">La producciÃ³n sin codificar suma al stock fÃ­sico, pero queda bloqueada para entrega.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Fecha</label><input id="mDate" type="date" class="field" value="${new Date().toISOString().slice(0,10)}"></div>
    <div><label>ClasificaciÃ³n</label><select id="v14ProductionClass" onchange="v14UpdateProductionInfo()"><option value="coded">ProducciÃ³n codificada</option><option value="uncoded">ProducciÃ³n sin codificar</option></select></div>
    <div class="span3"><label>Referencia / observaciÃ³n</label><input id="mRef" class="field" placeholder="Opcional"></div>
  </div>
  <div id="v14ProductionInfo" class="v14-production-mode"></div>
  <div class="lineitems"><div class="headrow"><h3>Productos</h3><button class="btn btn-secondary" onclick="addMovementLine()">Agregar</button></div><div id="movementLines"></div></div>
  <div class="right"><button class="btn btn-primary" onclick="saveProductionV14()">Guardar producciÃ³n</button></div>`);
  addMovementLine();v14UpdateProductionInfo();
};
function v14UpdateProductionInfo(){
  let uncoded=document.getElementById('v14ProductionClass')?.value==='uncoded';
  let box=document.getElementById('v14ProductionInfo');if(!box)return;
  box.innerHTML=uncoded
    ?'<b>Sin codificar:</b> aumenta el stock fÃ­sico y tambiÃ©n la columna Sin codificar. No queda disponible para entregar.'
    :'<b>Codificada:</b> aumenta el stock fÃ­sico y queda disponible para las operaciones.';
}
function saveProductionV14(){
  let uncoded=document.getElementById('v14ProductionClass').value==='uncoded';
  let rows=[...document.querySelectorAll('#movementLines .line')],has=false;
  rows.forEach(row=>{
    let p=db.products.find(x=>x.id===row.querySelector('.mvProd').value);
    let n=normalize(row.querySelector('.mvPack').value,row.querySelector('.mvUnit').value,p);
    if(!n.total)return;
    has=true;
    addStockMove({
      type:uncoded?'ProducciÃ³n sin codificar':'ProducciÃ³n',
      ref:document.getElementById('mRef').value||'ProducciÃ³n',
      productId:p.id,total:n.total,dir:'in',
      note:uncoded?'MercaderÃ­a fÃ­sica no habilitada para entrega':''
    });
    if(uncoded){
      let b=v1EnsureBucket(p.id);
      b.sinCodificar=Number(b.sinCodificar||0)+n.total;
      let m=db.movements[db.movements.length-1];
      if(m){m.productionClass='uncoded';m.noDelivery=true}
    }
  });
  if(!has)return alert('Agregue al menos un producto con cantidad.');
  save();closeModal();
}

// Alias y configuraciÃ³n de productos.
addProduct=function(){
  let id=(prompt('CÃ³digo del producto:')||'').trim();if(!id)return;
  if(db.products.some(p=>p.id===id))return alert('Ese cÃ³digo ya existe.');
  let name=(prompt('Nombre del producto:')||'').trim();if(!name)return;
  let alias=(prompt('Alias de bÃºsqueda (ej.: CO3):','')||'').trim().toUpperCase();
  if(alias&&db.products.some(p=>v14SearchNorm(p.alias)===v14SearchNorm(alias)))return alert('Ese alias ya existe.');
  let pack=Number(prompt('Unidades por fardo:','6'));if(!pack)return;
  let perCut=Number(prompt('Fardos por corte:','20'));if(!perCut)return;
  let cuts=Number(prompt('Cortes por planchada:','4'));if(!cuts)return;
  let minStock=Number(prompt('Stock mÃ­nimo en fardos:','0')||0),criticalStock=Number(prompt('Stock crÃ­tico en fardos:','0')||0);
  db.products.push({id,name,alias,pack,perCut,cuts,minStock,criticalStock,active:true,employeeBenefit:false});
  db.stock[id]=0;v1EnsureBucket(id);audit('Alta','Producto',id,`${name} Â· ${alias}`);save();
};
editProduct=function(id){
  let p=db.products.find(x=>x.id===id);if(!p)return;
  let newId=(prompt('CÃ³digo alfanumÃ©rico:',p.id)||'').trim();if(!newId)return;
  if(newId!==p.id&&db.products.some(x=>x.id===newId))return alert('Ese cÃ³digo ya existe.');
  let alias=(prompt('Alias de bÃºsqueda:',p.alias||'')||'').trim().toUpperCase();
  if(alias&&db.products.some(x=>x.id!==p.id&&v14SearchNorm(x.alias)===v14SearchNorm(alias)))return alert('Ese alias ya existe.');
  let old=p.id;
  p.name=(prompt('Nombre:',p.name)||p.name).trim();
  p.alias=alias;p.pack=Number(prompt('Unidades por fardo:',String(p.pack))||p.pack);
  p.perCut=Number(prompt('Fardos por corte:',String(p.perCut))||p.perCut);
  p.cuts=Number(prompt('Cortes por planchada:',String(p.cuts))||p.cuts);
  p.minStock=Number(prompt('Stock mÃ­nimo en fardos:',String(p.minStock||0))||0);
  p.criticalStock=Number(prompt('Stock crÃ­tico en fardos:',String(p.criticalStock||0))||0);
  p.employeeBenefit=confirm('Aceptar para habilitar este producto para el beneficio de empleados.');
  p.active=confirm('Aceptar para dejar el producto ACTIVO. Cancelar para marcarlo INACTIVO.');
  if(newId!==old){
    p.id=newId;
    db.stock[newId]=db.stock[old]||0;delete db.stock[old];
    db.stockBuckets=db.stockBuckets||{};
    db.stockBuckets[newId]=db.stockBuckets[old]||{physical:db.stock[newId]||0,preventa:0,distriC:0,distriInterior:0,sinCodificar:0,oesteMendoza:0,oesteJeremias:0};
    delete db.stockBuckets[old];
    (db.movements||[]).forEach(m=>{if(m.productId===old)m.productId=newId});
    (db.orders||[]).forEach(o=>{
      (o.requestLines||[]).forEach(l=>{if(l.productId===old)l.productId=newId});
      (o.deliveries||[]).forEach(d=>(d.lines||[]).forEach(l=>{
        if(l.productId===old)l.productId=newId;
        if(l.sourceProductId===old)l.sourceProductId=newId;
      }));
    });
  }
  save();
};
function v14RenderProductConfig(){
  let list=document.getElementById('productsList');if(!list)return;
  list.innerHTML=db.products.map(p=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)">
    <b>${v14Text(p.id)}${p.alias?` Â· ${v14Text(p.alias)}`:''} Â· ${v14Text(p.name)}</b><br>
    <span class="muted">${p.pack} un/fardo Â· ${p.perCut} fardos/corte Â· ${p.cuts} cortes/planchada Â· Beneficio: ${p.employeeBenefit?'SÃ­':'No'}</span>
    <div class="right"><button class="btn btn-secondary" onclick="editProduct('${p.id}')">Modificar</button></div>
  </div>`).join('');
}

// Fletero compacto.
v13SelectCarrier=function(id){
  let f=db.fleteros.find(x=>x.id===id);if(!f)return;
  document.getElementById('v13CarrierId').value=f.id;
  document.getElementById('v13CarrierSearch').value=v13CarrierDisplay(f);
  document.getElementById('v13CarrierName').value=f.name||'';
  document.getElementById('v13CarrierSurname').value=f.surname||'';
  document.getElementById('v13CarrierCompany').value=f.company||'';
  document.getElementById('v13CarrierResults').classList.add('hidden');
  document.getElementById('v13CarrierMode').textContent='Seleccionado: '+v13CarrierDisplay(f);
  document.getElementById('v14CarrierDetails')?.classList.add('hidden');
};
v13StartNewCarrier=function(){
  document.getElementById('v13CarrierId').value='';
  document.getElementById('v13CarrierSearch').value='';
  document.getElementById('v13CarrierName').value='';
  document.getElementById('v13CarrierSurname').value='';
  document.getElementById('v13CarrierCompany').value='';
  document.getElementById('v13CarrierResults').classList.add('hidden');
  document.getElementById('v13CarrierMode').textContent='Nuevo fletero: complete los datos inferiores';
  document.getElementById('v14CarrierDetails')?.classList.remove('hidden');
  document.getElementById('v13CarrierName').focus();
};

// Buscador y editor superior de productos.
let v14DraftProductId='';
function v14ProductMatches(query){
  let q=v14SearchNorm(query);
  if(!q)return [];
  return db.products.filter(p=>p.active!==false).map(p=>{
    let id=v14SearchNorm(p.id),alias=v14SearchNorm(p.alias||''),name=v14SearchNorm(p.name);
    let score=id===q||alias===q?0:id.startsWith(q)||alias.startsWith(q)?1:name.startsWith(q)?2:name.includes(q)?3:99;
    return {p,score};
  }).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||a.p.name.localeCompare(b.p.name)).map(x=>x.p);
}
function v14SearchDraftProducts(){
  v14DraftProductId='';
  let input=document.getElementById('v14ProductSearch'),box=document.getElementById('v14ProductResults');
  if(!input||!box)return;
  let list=v14ProductMatches(input.value).slice(0,10);
  box.innerHTML=list.length?list.map(p=>`<button type="button" onclick="v14ChooseDraftProduct('${p.id}')"><b>${v14Text(p.alias||p.id)} Â· ${v14Text(p.name)}</b><br><span class="muted">CÃ³digo ${v14Text(p.id)}</span></button>`).join(''):'<div class="muted" style="padding:10px">Sin coincidencias.</div>';
  box.classList.remove('hidden');
}
function v14ChooseDraftProduct(id){
  let p=db.products.find(x=>x.id===id);if(!p)return;
  v14DraftProductId=id;
  document.getElementById('v14ProductSearch').value=`${p.alias||p.id} Â· ${p.name}`;
  document.getElementById('v14ProductResults').classList.add('hidden');
  let pack=document.getElementById('v14DraftPack');pack.focus();pack.select();
}
function v14ProductSearchKey(event){
  if(event.key!=='Enter')return;
  event.preventDefault();
  let list=v14ProductMatches(event.currentTarget.value);
  if(!list.length)return alert('No se encontrÃ³ el producto por cÃ³digo, alias o nombre.');
  v14ChooseDraftProduct(list[0].id);
}
function v14DraftPackKey(event){
  if(event.key==='Enter'){event.preventDefault();document.getElementById('v14DraftUnit').focus();document.getElementById('v14DraftUnit').select()}
}
function v14DraftUnitKey(event){
  if(event.key==='Enter'){event.preventDefault();v14ConfirmDraftProduct()}
}
function v14ConfirmedRow(line,actualTotal=0){
  let p=db.products.find(x=>x.id===line.productId),req=normalize(0,Number(line.total||line.requestedTotal||0),p),act=normalize(0,Number(actualTotal||line.actualTotal||0),p);
  return `<div class="v14-confirmed-line" data-product-id="${p.id}" data-resolved-total="${Number(line.resolvedTotal||0)}">
    <div class="product-name"><b>${v14Text(p.alias||p.id)} Â· ${v14Text(p.name)}</b><small>CÃ³digo ${v14Text(p.id)}</small></div>
    <div><label>Solic. fardos</label><input class="field v14ReqPack" type="number" min="0" value="${req.packs}" oninput="v14SyncConfirmed(this);v13RecalcOrder()"></div>
    <div><label>Solic. unidades</label><input class="field v14ReqUnit" type="number" min="0" value="${req.units}" oninput="v14SyncConfirmed(this);v13RecalcOrder()"></div>
    <div class="v14-immediate-field"><label>Entreg. fardos</label><input class="field v14ActPack" type="number" min="0" value="${act.packs}" oninput="this.dataset.touched='1';v13RecalcOrder()"></div>
    <div class="v14-immediate-field"><label>Entreg. unidades</label><input class="field v14ActUnit" type="number" min="0" value="${act.units}" oninput="this.dataset.touched='1';v13RecalcOrder()"></div>
    <button type="button" class="btn btn-danger v14-remove" onclick="this.closest('.v14-confirmed-line').remove();v14RefreshEmpty();v13RecalcOrder()">Quitar</button>
  </div>`;
}
function v14AppendConfirmed(line,actualTotal=0){
  let box=document.getElementById('v14ConfirmedLines');if(!box)return;
  box.insertAdjacentHTML('beforeend',v14ConfirmedRow(line,actualTotal));
  v14RefreshEmpty();v13ToggleMode();
}
function v14RefreshEmpty(){
  let box=document.getElementById('v14ConfirmedLines'),empty=document.getElementById('v14EmptyLines');
  if(empty)empty.classList.toggle('hidden',Boolean(box?.children.length));
}
function v14ConfirmDraftProduct(){
  if(!v14DraftProductId){
    let matches=v14ProductMatches(document.getElementById('v14ProductSearch').value);
    if(matches.length)v14DraftProductId=matches[0].id;
  }
  let p=db.products.find(x=>x.id===v14DraftProductId);
  if(!p)return alert('Seleccione un producto vÃ¡lido.');
  let n=normalize(document.getElementById('v14DraftPack').value,document.getElementById('v14DraftUnit').value,p);
  if(!n.total)return alert('Ingrese una cantidad en fardos o unidades.');
  let existing=document.querySelector(`#v14ConfirmedLines .v14-confirmed-line[data-product-id="${CSS.escape(p.id)}"]`);
  let immediate=document.getElementById('v13OrderType').value==='immediate';
  if(existing){
    let old=normalize(existing.querySelector('.v14ReqPack').value,existing.querySelector('.v14ReqUnit').value,p);
    let sum=normalize(0,old.total+n.total,p);
    existing.querySelector('.v14ReqPack').value=sum.packs;existing.querySelector('.v14ReqUnit').value=sum.units;
    if(immediate){
      let oldAct=normalize(existing.querySelector('.v14ActPack').value,existing.querySelector('.v14ActUnit').value,p);
      let act=normalize(0,oldAct.total+n.total,p);
      existing.querySelector('.v14ActPack').value=act.packs;existing.querySelector('.v14ActUnit').value=act.units;
    }
  }else{
    v14AppendConfirmed({productId:p.id,total:n.total,resolvedTotal:0},immediate?n.total:0);
  }
  v14DraftProductId='';
  document.getElementById('v14ProductSearch').value='';
  document.getElementById('v14DraftPack').value='0';
  document.getElementById('v14DraftUnit').value='0';
  document.getElementById('v14ProductSearch').focus();
  v13RecalcOrder();
}
function v14SyncConfirmed(input){
  if(document.getElementById('v13OrderType')?.value!=='immediate')return;
  let row=input.closest('.v14-confirmed-line');
  let target=row.querySelector(input.classList.contains('v14ReqPack')?'.v14ActPack':'.v14ActUnit');
  if(!target.dataset.touched)target.value=input.value;
}
v13CollectLines=function(){
  let grouped=new Map();
  document.querySelectorAll('#v14ConfirmedLines .v14-confirmed-line').forEach(row=>{
    let productId=row.dataset.productId,p=db.products.find(x=>x.id===productId);
    let req=normalize(row.querySelector('.v14ReqPack').value,row.querySelector('.v14ReqUnit').value,p);
    let act=normalize(row.querySelector('.v14ActPack').value,row.querySelector('.v14ActUnit').value,p);
    if(!req.total&&!act.total)return;
    let current=grouped.get(productId)||{productId,requestedTotal:0,actualTotal:0,resolvedTotal:0,originalProducts:new Set()};
    current.requestedTotal+=req.total;current.actualTotal+=act.total;
    current.resolvedTotal+=Number(row.dataset.resolvedTotal||0);current.originalProducts.add(productId);
    grouped.set(productId,current);
  });
  return [...grouped.values()];
};
v13RecalcOrder=function(){
  if(!document.getElementById('v14ConfirmedLines'))return;
  let type=document.getElementById('v13OrderType')?.value,immediate=type==='immediate',occ=0,cuts=0,warnings=[];
  v13CollectLines().forEach(l=>{
    let p=db.products.find(x=>x.id===l.productId);
    if(immediate){
      occ+=l.actualTotal/(p.pack*p.perCut*p.cuts);
      if(l.actualTotal)cuts+=Math.ceil(l.actualTotal/(p.pack*p.perCut));
      let deliverable=v14DeliverableStock(v1EnsureBucket(p.id));
      if(l.actualTotal>deliverable)warnings.push(`${p.name}: entregable ${equivalent(deliverable,p)}, entrega ${equivalent(l.actualTotal,p)}`);
    }
  });
  let ps=document.getElementById('v13SuggestPallet'),cs=document.getElementById('v13SuggestChap');
  if(ps)ps.textContent=Math.ceil(occ);if(cs)cs.textContent=cuts;
  let po=document.getElementById('v13PalletOut'),co=document.getElementById('v13ChapOut');
  if(po&&Number(po.value||0)===0)po.value=Math.ceil(occ);if(co&&Number(co.value||0)===0)co.value=cuts;
  let warning=document.getElementById('v13StockWarning');
  if(warning)warning.innerHTML=warnings.length?`<div class="alert"><b>Stock entregable insuficiente.</b><br>${warnings.join('<br>')}<label>JustificaciÃ³n obligatoria</label><textarea id="v13StockJustification"></textarea></div>`:'';
};
v13ToggleMode=function(){
  let type=document.getElementById('v13OrderType')?.value||'administrative',immediate=type==='immediate';
  document.querySelectorAll('.v14-immediate-field').forEach(el=>el.classList.toggle('hidden',!immediate));
  if(immediate){
    document.querySelectorAll('#v14ConfirmedLines .v14-confirmed-line').forEach(row=>{
      let ap=row.querySelector('.v14ActPack'),au=row.querySelector('.v14ActUnit');
      if(!ap.dataset.touched&&!au.dataset.touched&&Number(ap.value||0)===0&&Number(au.value||0)===0){
        ap.value=row.querySelector('.v14ReqPack').value;au.value=row.querySelector('.v14ReqUnit').value;
      }
    });
  }
  document.getElementById('v13Materials')?.classList.toggle('hidden',!immediate);
  let info=document.getElementById('v13ModeInfo');
  if(info){
    if(type==='administrative')info.innerHTML='<b>PENDIENTE administrativo:</b> queda guardada sin afectar stock fÃ­sico ni pendientes operativos.';
    else if(immediate)info.innerHTML='<b>Salida inmediata:</b> descuenta del stock entregable lo confirmado.';
    else info.innerHTML=`<b>${V11_PENDING_LABELS[type]}:</b> suma lo solicitado a esta columna. El stock fÃ­sico cambia al confirmar la salida.`;
  }
  let button=document.getElementById('v13SaveButton');
  if(button)button.textContent=v13EditingOrderId?'Guardar correcciÃ³n':type==='administrative'?'Guardar como PENDIENTE':immediate?'Confirmar orden y salida':'Registrar orden operativa';
  v13RecalcOrder();
};

v13OpenOrderEditor=function(existingId=''){
  let o=existingId?db.orders.find(x=>x.id===existingId):null;
  if(o&&!Array.isArray(o.requestLines))return alert('Esta orden pertenece a una versiÃ³n anterior y todavÃ­a no admite ediciÃ³n completa.');
  v13EditingOrderId=o?.id||'';
  let carrier=o?v13OrderCarrier(o):null,type=o?.pendingType||'administrative';
  let hasDeliveries=Boolean((o?.deliveries||[]).length),actual=v13ActualTotals(o);
  modal(`<div class="headrow"><div><h2>${o?`Corregir orden ${v14Text(o.number)}`:'Nueva orden de carga'}</h2><div class="muted">${o?'Los cambios conservarÃ¡n el historial anterior.':'Puede quedar como PENDIENTE sin impacto hasta definir su salida.'}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>NÃºmero de orden</label><input id="v13Number" class="field" value="${v14Text(o?.number||'')}"></div>
    <div><label>Fecha</label><input id="v13Date" class="field" type="date" value="${v14Text(o?.date||new Date().toISOString().slice(0,10))}"></div>
    <div><label>Estado / afectaciÃ³n</label><select id="v13OrderType" onchange="v13ToggleMode()">${v13TypeOptions(type)}</select></div>
    <input id="v13Billing" type="hidden" value="No aplica">
    <div class="span3 v14-carrier-compact">
      <div class="v13-carrier-search"><label>Fletero Â· nombre, apellido o empresa</label><input id="v13CarrierSearch" class="field" autocomplete="off" value="${v14Text(carrier?v13CarrierDisplay(carrier):'')}" placeholder="Comience a escribirâ€¦" oninput="v13SearchCarriers()" onfocus="v13SearchCarriers()"><div id="v13CarrierResults" class="v13-autocomplete hidden"></div></div>
      <button type="button" class="btn btn-secondary" onclick="v13StartNewCarrier()">Nuevo</button>
      <input id="v13CarrierId" type="hidden" value="${v14Text(carrier?.id||'')}">
      <span id="v13CarrierMode" class="muted" style="grid-column:1/-1">${carrier?'Seleccionado: '+v14Text(v13CarrierDisplay(carrier)):'Seleccione uno conocido o presione Nuevo'}</span>
      <div id="v14CarrierDetails" class="v14-carrier-details ${carrier?'hidden':''}">
        <div><label>Nombre</label><input id="v13CarrierName" class="field" value="${v14Text(carrier?.name||'')}"></div>
        <div><label>Apellido</label><input id="v13CarrierSurname" class="field" value="${v14Text(carrier?.surname||'')}"></div>
        <div><label>Empresa</label><input id="v13CarrierCompany" class="field" value="${v14Text(carrier?.company||'')}"></div>
      </div>
    </div>
    <div class="span3"><label>Observaciones</label><textarea id="v13Note">${v14Text(o?.note||'')}</textarea></div>
    ${o?'<div class="span3"><label>Motivo de la correcciÃ³n</label><textarea id="v13CorrectionReason" placeholder="Obligatorio para guardar cambios"></textarea></div>':''}
  </div>
  ${hasDeliveries?'<div class="alert"><b>La orden ya tiene salidas confirmadas.</b> El historial de entregas no se eliminarÃ¡.</div>':''}
  <div id="v13ModeInfo" class="alert v13-mode-card"></div>
  <div class="lineitems">
    <div class="v14-draft">
      <h3 style="margin-top:0">Agregar nuevo producto</h3>
      <div class="v14-draft-grid">
        <div class="v14-product-search"><label>CÃ³digo, alias o nombre</label><input id="v14ProductSearch" class="field" autocomplete="off" placeholder="Ej.: 5670, CO3, NA3, BIDâ€¦" oninput="v14SearchDraftProducts()" onkeydown="v14ProductSearchKey(event)"><div id="v14ProductResults" class="v14-product-results hidden"></div></div>
        <div><label>Fardos</label><input id="v14DraftPack" class="field" type="number" min="0" value="0" onkeydown="v14DraftPackKey(event)"></div>
        <div><label>Unidades</label><input id="v14DraftUnit" class="field" type="number" min="0" value="0" onkeydown="v14DraftUnitKey(event)"></div>
        <button type="button" class="btn btn-primary" onclick="v14ConfirmDraftProduct()">Agregar</button>
      </div>
    </div>
    <h3>Productos ya cargados</h3>
    <div id="v14EmptyLines" class="v14-empty">TodavÃ­a no se agregaron productos.</div>
    <div id="v14ConfirmedLines" class="v14-confirmed-list"></div>
  </div>
  <div id="v13Materials" class="summary"><div class="summarygrid">
    <div><span class="muted">Planchadas sugeridas</span><b id="v13SuggestPallet">0</b></div>
    <div><label>Planchadas que lleva</label><input id="v13PalletOut" class="field" type="number" min="0" value="${Number(o?.deliveries?.[0]?.palletOut||0)}"></div>
    <div><label>Planchadas que devuelve</label><input id="v13PalletIn" class="field" type="number" min="0" value="${Number(o?.deliveries?.[0]?.palletIn||0)}"></div>
    <div><span class="muted">Chapadur sugerido</span><b id="v13SuggestChap">0</b></div>
    <div><label>Chapadur que lleva</label><input id="v13ChapOut" class="field" type="number" min="0" value="${Number(o?.deliveries?.[0]?.chapOut||0)}"></div>
    <div><label>Chapadur que devuelve</label><input id="v13ChapIn" class="field" type="number" min="0" value="${Number(o?.deliveries?.[0]?.chapIn||0)}"></div>
  </div></div>
  <div id="v13StockWarning"></div>
  <div class="right" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button id="v13SaveButton" class="btn btn-primary" onclick="v13SaveOrder()">Guardar orden</button></div>`);
  (o?.requestLines||[]).forEach(line=>v14AppendConfirmed(line,Number(actual[line.productId]||0)));
  v14RefreshEmpty();
  if(hasDeliveries){
    let select=document.getElementById('v13OrderType');
    [...select.options].forEach(opt=>{
      if(o.pendingType==='immediate')opt.disabled=opt.value!=='immediate';
      else if(v13IsOperational(o.pendingType))opt.disabled=opt.value==='administrative'||opt.value==='immediate';
    });
  }
  v13ToggleMode();
  setTimeout(()=>document.getElementById('v13Number')?.focus(),0);
};

// El guardado de v1.3 sigue utilizÃ¡ndose, con el Estado de FacturaciÃ³n oculto.
const _v14V13SaveOrder=v13SaveOrder;
v13SaveOrder=function(){
  if(document.getElementById('v13OrderType')?.value==='sinCodificar')return alert('Seleccione una afectaciÃ³n operativa vÃ¡lida o PENDIENTE. Sin codificar ya no corresponde a Ã³rdenes.');
  if(document.getElementById('v13OrderType')?.value==='immediate'){
    let blocked=v13CollectLines().filter(l=>{let physical=Number(db.stock[l.productId]||0),deliverable=v14DeliverableStock(v1EnsureBucket(l.productId));return l.actualTotal>deliverable&&l.actualTotal<=physical});
    if(blocked.length){
      let detail=blocked.map(l=>{let p=db.products.find(x=>x.id===l.productId);return `${p.name}: entregable ${equivalent(v14DeliverableStock(v1EnsureBucket(p.id)),p)}, solicitado ${equivalent(l.actualTotal,p)}`}).join('\n');
      return alert('La salida incluye mercaderÃ­a sin codificar o supera el stock entregable:\n'+detail);
    }
  }
  return _v14V13SaveOrder();
};

// Pendientes y detalle sin Estado de FacturaciÃ³n.
renderPendingV13=function(){
  let body=document.getElementById('pendingBody');if(!body)return;
  let carrier=document.getElementById('pfCarrier')?.value||'',product=document.getElementById('pfProduct')?.value||'',from=document.getElementById('pfFrom')?.value||'',statusFilter=document.getElementById('pfStatus')?.value||'';
  let rows=[];
  (db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&v13IsOperational(o.pendingType))
    .filter(o=>(!carrier||o.fleteroId===carrier)&&(!from||o.date>=from)&&(!statusFilter||v11OrderStatus(o)===statusFilter))
    .forEach(o=>{
      let f=v13OrderCarrier(o);
      o.requestLines.forEach(l=>{
        let p=db.products.find(x=>x.id===l.productId),pending=v11LineOutstanding(l);
        if(pending>0&&(!product||l.productId===product))rows.push(`<tr><td><b>${v14Text(o.number)}</b></td><td>${v14Text(o.date)}</td><td>${v14Text(v13CarrierDisplay(f))}</td><td>${v14Text(V11_PENDING_LABELS[o.pendingType])}</td><td>${v14Text(p?.name||l.productId)}</td><td>${equivalent(l.total,p)}</td><td>${equivalent(Math.min(l.total,l.resolvedTotal||0),p)}</td><td><b>${equivalent(pending,p)}</b></td><td>${v14Text(v11OrderStatus(o))}</td><td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td></tr>`);
      });
    });
  body.innerHTML=rows.join('')||'<tr><td colspan="10" class="muted">No hay pendientes operativos con los filtros seleccionados.</td></tr>';
};
renderPending=renderPendingV13;
exportPendingCSV=function(){
  let rows=[['Orden','Fecha','Fletero','Tipo','Producto','Solicitado','Resuelto','Pendiente','Estado']];
  (db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&v13IsOperational(o.pendingType)).forEach(o=>{
    let f=v13OrderCarrier(o);
    o.requestLines.forEach(l=>{
      let p=db.products.find(x=>x.id===l.productId),pending=v11LineOutstanding(l);
      if(pending>0)rows.push([o.number,o.date,v13CarrierDisplay(f),V11_PENDING_LABELS[o.pendingType],p?.name||l.productId,equivalent(l.total,p),equivalent(Math.min(l.total,l.resolvedTotal||0),p),equivalent(pending,p),v11OrderStatus(o)]);
    });
  });
  downloadCSV('pendientes_operativos.csv',rows);
};

viewOrder=function(id){
  let o=db.orders.find(x=>x.id===id);if(!o)return;
  let f=v13OrderCarrier(o),modern=Array.isArray(o.requestLines),outstanding=modern?v11OrderOutstanding(o):0;
  let requests=modern?`<div class="card v11-request-card"><h3>Solicitud</h3>${o.requestLines.map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${v14Text(p?.name||l.productId)}</b>: ${equivalent(l.total,p)} Â· Resuelto ${equivalent(Math.min(l.total,l.resolvedTotal||0),p)} Â· <b>Restante ${equivalent(v11LineOutstanding(l),p)}</b></div>`}).join('')}</div>`:'';
  let deliveries=(o.deliveries||[]).map((d,i)=>`<div class="card" style="margin-top:10px"><b>Salida ${i+1}</b> Â· ${fmtDate(d.date)} Â· ${v14Text(d.user||'')} Â· Turno ${v14Text(d.shift||'')}<br><br>${(d.lines||[]).map(l=>{let p=db.products.find(x=>x.id===l.productId),s=db.products.find(x=>x.id===(l.sourceProductId||l.productId)),change=l.sourceProductId&&l.sourceProductId!==l.productId?` <span class="status open">Sustituye a ${v14Text(s?.name||l.sourceProductId)}</span>`:'';return `<b>${v14Text(p?.name||l.productId)}</b>: ${equivalent(l.total,p)}${change}`}).join('<br>')}<br><span class="muted">Planchadas: sale ${d.palletOut||0}, entra ${d.palletIn||0}. Chapadur: sale ${d.chapOut||0}, entra ${d.chapIn||0}.</span></div>`).join('')||'<div class="card" style="margin-top:10px"><span class="muted">TodavÃ­a no se confirmÃ³ ninguna salida.</span></div>';
  let history=(o.editHistory||[]).slice().reverse().map(h=>`<div class="v13-edit-history"><b>${fmtDate(h.date)} Â· ${v14Text(h.user||'')} Â· Turno ${v14Text(h.shift||'')}</b><br>${v14Text(h.reason||'Sin motivo indicado')}</div>`).join('');
  let status=modern?v11OrderStatus(o):o.status;
  modal(`<div class="headrow"><div><h2>Orden ${v14Text(o.number)}</h2><div class="muted">${v14Text(v13CarrierDisplay(f))} Â· ${v14Text(o.date)} Â· ${v14Text(V11_PENDING_LABELS[o.pendingType||'legacy']||'OperaciÃ³n histÃ³rica')}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="summary"><b>Estado: ${v14Text(status)}</b>${modern&&v13IsOperational(o.pendingType)?` Â· Pendiente total: ${outstanding} unidades`:''}<br><span class="muted">${v14Text(o.note||'Sin observaciones')}</span></div>
  ${requests}${deliveries}${history?`<div class="card" style="margin-top:10px"><h3>Historial de correcciones</h3>${history}</div>`:''}
  <div class="right" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal();openOrderForm('${o.id}')">Corregir orden</button>${modern&&v13IsOperational(o.pendingType)&&outstanding>0?`<button class="btn btn-primary" onclick="closeModal();openPendingDispatchV11(db.orders.find(x=>x.id==='${o.id}'))">Confirmar salida</button>`:''}<button class="btn btn-secondary" onclick="window.print()">Imprimir</button></div>`);
};

// Resumen del turno centrado en Ã³rdenes y productos.
generateShiftSummary=function(){
  let today=new Date().toISOString().slice(0,10),shift=session.shift;
  let relevant=(db.orders||[]).filter(o=>{
    let created=v14DatePart(o.createdAt)===today&&o.createdShift===shift;
    let delivered=(o.deliveries||[]).some(d=>v14DatePart(d.date)===today&&d.shift===shift);
    let edited=(o.editHistory||[]).some(e=>v14DatePart(e.date)===today&&e.shift===shift);
    return created||delivered||edited;
  });
  let orderBlocks=relevant.map(o=>{
    let f=v13OrderCarrier(o),delivered={};
    (o.deliveries||[]).filter(d=>v14DatePart(d.date)===today&&d.shift===shift).forEach(d=>(d.lines||[]).forEach(l=>{
      delivered[l.productId]=(delivered[l.productId]||0)+Number(l.total||0);
    }));
    let ids=new Set([...(o.requestLines||[]).map(l=>l.productId),...Object.keys(delivered)]);
    let rows=[...ids].map(pid=>{
      let p=db.products.find(x=>x.id===pid),req=(o.requestLines||[]).filter(l=>l.productId===pid).reduce((s,l)=>s+Number(l.total||0),0),out=(o.requestLines||[]).filter(l=>l.productId===pid).reduce((s,l)=>s+v11LineOutstanding(l),0),del=Number(delivered[pid]||0);
      return `<tr><td>${v14Text(p?.alias||p?.id||pid)} Â· ${v14Text(p?.name||pid)}</td><td>${req?equivalent(req,p):'â€”'}</td><td>${del?equivalent(del,p):'â€”'}</td><td>${out?equivalent(out,p):'â€”'}</td></tr>`;
    }).join('');
    let events=[];
    if(v14DatePart(o.createdAt)===today&&o.createdShift===shift)events.push('Orden registrada');
    if(Object.values(delivered).some(Boolean))events.push('Salida confirmada');
    if((o.editHistory||[]).some(e=>v14DatePart(e.date)===today&&e.shift===shift))events.push('Orden corregida');
    return `<div class="v14-shift-order"><h3>Orden ${v14Text(o.number)} Â· ${v14Text(v13CarrierDisplay(f))}</h3><p><b>${v14Text(V11_PENDING_LABELS[o.pendingType]||'OperaciÃ³n')}</b> Â· Estado: ${v14Text(v11OrderStatus(o))} Â· ${events.join(' / ')}</p><table><thead><tr><th>Producto</th><th>Solicitado</th><th>Entregado en turno</th><th>Pendiente actual</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Sin productos detallados.</td></tr>'}</tbody></table></div>`;
  }).join('');
  let mats=(db.materialMoves||[]).filter(m=>v14DatePart(m.date)===today&&m.shift===shift);
  let other=(db.movements||[]).filter(m=>v14DatePart(m.date)===today&&m.shift===shift&&!String(m.type||'').includes('Orden de carga')&&!String(m.type||'').includes('CorrecciÃ³n de orden'));
  let otherRows=other.map(m=>{let p=db.products.find(x=>x.id===m.productId);return `<tr><td>${v14Text(m.type)}</td><td>${v14Text(m.ref)}</td><td>${v14Text(p?.name||m.productId)}</td><td>${m.dir==='neutral'?'Sin impacto':(m.dir==='in'?'+':'-')+equivalent(m.total,p)}</td></tr>`}).join('');
  let body=`<h1>Resumen de turno</h1><p><b>Fecha:</b> ${today} Â· <b>Turno:</b> ${v14Text(shift)} Â· <b>Encargado:</b> ${v14Text(session.user)}</p>
  <h2>Ã“rdenes de carga trabajadas</h2>${orderBlocks||'<p>No se registraron ni despacharon Ã³rdenes durante este turno.</p>'}
  <h2>Materiales</h2><p>Planchadas entregadas: ${mats.reduce((s,m)=>s+Number(m.palletOut||0),0)} Â· devueltas: ${mats.reduce((s,m)=>s+Number(m.palletIn||0),0)} Â· Chapadur entregado: ${mats.reduce((s,m)=>s+Number(m.chapOut||0),0)} Â· devuelto: ${mats.reduce((s,m)=>s+Number(m.chapIn||0),0)}</p>
  ${otherRows?`<h2>Otros movimientos</h2><table><thead><tr><th>Tipo</th><th>Referencia</th><th>Producto</th><th>Cantidad</th></tr></thead><tbody>${otherRows}</tbody></table>`:''}`;
  setPrintableDocument('Resumen de turno',body);printCurrentDocument();
};

// Consumo y anticipo: dos comprobantes de media hoja en un A4.
showEmployeeReceipt=function(e,items,title,prefix,providedNumber=''){
  let number=providedNumber||nextReceiptNumber(prefix);
  let totalPacks=items.reduce((sum,x)=>sum+Math.floor(Number(x.n.total||0)/x.p.pack),0);
  let totalLabel=prefix==='CE'?`${totalPacks} fardos`:`${items.length} producto${items.length===1?'':'s'}`;
  let rows=items.map(x=>`<tr><td>${v14Text(x.p.id)}</td><td>${v14Text(x.p.name)}</td><td>${equivalent(x.n.total,x.p)}</td></tr>`).join('');
  function half(destination,signature){
    return `<section class="v14-receipt-half"><h2>${v14Text(title)} Â· ${destination}</h2><p><b>N.Âº:</b> ${v14Text(number)} Â· <b>Fecha:</b> ${fmtDate(now())}</p><p><b>Empleado:</b> ${v14Text(e.name)} ${v14Text(e.surname)} Â· <b>Legajo:</b> ${v14Text(e.legajo)}</p><table><thead><tr><th>CÃ³digo</th><th>Producto</th><th>Cantidad</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2"><b>Total</b></td><td><b>${totalLabel}</b></td></tr></tfoot></table><p><b>Encargado:</b> ${v14Text(session.user)} Â· <b>Turno:</b> ${v14Text(session.shift)}</p>${signature?'<p style="margin-top:12mm">Firma empleado: ______________________________</p>':''}</section>`;
  }
  let body=`<div class="v14-receipt-sheet">${half('FACTURACIÃ“N',true)}${half('CONTROL DE GUARDIA',false)}</div>`;
  setPrintableDocument(title,body);
  let area=document.getElementById('employeeReceiptArea');
  if(!area)return alert('La operaciÃ³n se registrÃ³ correctamente, pero no se encontrÃ³ el Ã¡rea del comprobante.');
  area.innerHTML=`<div class="card receipt-success"><div class="headrow"><div><h2>OperaciÃ³n registrada correctamente</h2><div class="muted">${v14Text(title)} Â· Comprobante ${v14Text(number)} Â· Una hoja A4</div></div></div>${body}<div class="receipt-actions no-print"><button class="btn btn-secondary" onclick="document.getElementById('employeeReceiptArea').classList.add('hidden')">Cerrar</button><button class="btn btn-secondary" onclick="openPrintableDocument()">Vista imprimible</button><button class="btn btn-primary" onclick="printCurrentDocument()">Imprimir / Guardar como PDF</button></div></div>`;
  area.classList.remove('hidden');area.scrollIntoView({behavior:'smooth',block:'start'});
};


// Las salidas de Ã³rdenes pendientes tambiÃ©n respetan el stock entregable.
recalcPendingDispatchV11=function(){
  let lines=getPendingDispatchLinesV11(),occ=0,cuts=0,totals={};
  lines.forEach(l=>{totals[l.productId]=(totals[l.productId]||0)+l.total;let p=db.products.find(x=>x.id===l.productId);occ+=l.total/(p.pack*p.perCut*p.cuts);if(l.total)cuts+=Math.ceil(l.total/(p.pack*p.perCut))});
  let blocked=[],shortages=[];
  Object.entries(totals).forEach(([pid,total])=>{let p=db.products.find(x=>x.id===pid),physical=Number(db.stock[pid]||0),deliverable=v14DeliverableStock(v1EnsureBucket(pid));if(total>deliverable&&total<=physical)blocked.push(`${p.name}: entregable ${equivalent(deliverable,p)}, entrega ${equivalent(total,p)}`);else if(total>physical)shortages.push(`${p.name}: stock fÃ­sico ${equivalent(physical,p)}, entrega ${equivalent(total,p)}`)});
  let ps=document.getElementById('v11DispatchPalletSuggest'),cs=document.getElementById('v11DispatchChapSuggest');
  if(ps)ps.textContent=Math.ceil(occ);if(cs)cs.textContent=cuts;
  let po=document.getElementById('v11DispatchPalletOut'),co=document.getElementById('v11DispatchChapOut');
  if(po&&Number(po.value||0)===0)po.value=Math.ceil(occ);if(co&&Number(co.value||0)===0)co.value=cuts;
  let warning=document.getElementById('v11DispatchWarning');
  if(warning){
    if(blocked.length)warning.innerHTML=`<div class="alert"><b>No se puede confirmar la salida.</b><br>${blocked.join('<br>')}<br><span class="muted">La diferencia corresponde a mercaderÃ­a sin codificar, no habilitada para entrega.</span></div>`;
    else if(shortages.length)warning.innerHTML=`<div class="alert"><b>Stock fÃ­sico insuficiente.</b><br>${shortages.join('<br>')}<label>JustificaciÃ³n obligatoria</label><textarea id="v11DispatchJustification"></textarea></div>`;
    else warning.innerHTML='';
  }
};
const _v14SavePendingDispatch=savePendingDispatchV11;
savePendingDispatchV11=function(orderId){
  let lines=getPendingDispatchLinesV11(),totals={};
  lines.forEach(l=>totals[l.productId]=(totals[l.productId]||0)+l.total);
  let blocked=Object.entries(totals).filter(([pid,total])=>{let physical=Number(db.stock[pid]||0),deliverable=v14DeliverableStock(v1EnsureBucket(pid));return total>deliverable&&total<=physical});
  if(blocked.length){
    let detail=blocked.map(([pid,total])=>{let p=db.products.find(x=>x.id===pid);return `${p.name}: entregable ${equivalent(v14DeliverableStock(v1EnsureBucket(pid)),p)}, entrega ${equivalent(total,p)}`}).join('\n');
    return alert('No se puede confirmar la salida porque supera el stock entregable:\n'+detail);
  }
  return _v14SavePendingDispatch(orderId);
};

// ActualizaciÃ³n visual final.
const _v14RenderAll=renderAll;
renderAll=function(){
  _v14RenderAll();
  let pending=(db.orders||[]).filter(o=>o.pendingType==='administrative').length;
  let k=document.getElementById('kBilling');if(k)k.textContent=pending;
  v14RenderProductConfig();renderStockV1();renderPendingV13();
};
renderAll();

document.addEventListener('click',event=>{
  let box=document.getElementById('v14ProductResults');
  if(box&&!event.target.closest('.v14-product-search'))box.classList.add('hidden');
});


// ===== Talca ExpediciÃ³n v1.5 =====
// 1) ConfirmaciÃ³n de pendientes precargada.
// 2) Resumen de Ã³rdenes expresado en fardos.
// 3) Totales al pie de la tabla de stock.

const V15_SCHEMA_VERSION=6;
(function v15Migrate(){
  if(Number(db.schemaVersion||0)<V15_SCHEMA_VERSION){
    try{v1Backup('Antes de actualizar a v1.5')}catch(err){console.error(err)}
    db.schemaVersion=V15_SCHEMA_VERSION;
    safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
  }
})();

const _v15Save=save;
save=function(){
  db.schemaVersion=V15_SCHEMA_VERSION;
  _v15Save();
  safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
};

function v15FardosEquivalent(total,p){
  if(!p||!Number(p.pack))return 0;
  return Number(total||0)/Number(p.pack);
}
function v15FormatNumber(value,max=2){
  let n=Number(value||0);
  return n.toLocaleString('es-AR',{minimumFractionDigits:Number.isInteger(n)?0:0,maximumFractionDigits:max});
}
function v15FormatFardos(value){
  return `${v15FormatNumber(value)} fardos`;
}
function v15OrderRequestedFardos(o){
  return (o.requestLines||[]).reduce((sum,l)=>{
    let p=db.products.find(x=>x.id===l.productId);
    return sum+v15FardosEquivalent(l.total,p);
  },0);
}
function v15OrderDeliveredFardos(o){
  return (o.deliveries||[]).reduce((sum,d)=>sum+(d.lines||[]).reduce((inner,l)=>{
    let p=db.products.find(x=>x.id===l.productId);
    return inner+v15FardosEquivalent(l.total,p);
  },0),0);
}

// ---------- ConfirmaciÃ³n de Ã³rdenes pendientes ----------
// Si la lÃ­nea viene de la orden, se precarga con TODO lo que queda pendiente.
// El encargado solo modifica las excepciones antes de confirmar.
addPendingDispatchLineV11=function(source='',actual='',prefillTotal=null){
  let o=db.orders.find(x=>x.id===v11CurrentDispatchOrderId);if(!o)return;
  source=source||(o.requestLines||[]).find(l=>v11LineOutstanding(l)>0)?.productId||'';
  actual=actual||source;
  let sourceLine=(o.requestLines||[]).find(l=>l.productId===source);
  let totalToPrefill=prefillTotal;
  if(totalToPrefill===null && source && actual===source && sourceLine){
    totalToPrefill=v11LineOutstanding(sourceLine);
  }
  if(totalToPrefill===null)totalToPrefill=0;

  let actualProduct=db.products.find(x=>x.id===actual);
  let normalized=actualProduct?normalize(0,totalToPrefill,actualProduct):{packs:0,units:0};

  let d=document.createElement('div');
  d.className='v11-delivery-row';
  d.innerHTML=`
    <div class="wide">
      <label>Corresponde al producto solicitado</label>
      <select class="v11Source" onchange="syncDispatchActualV11(this);v15RefreshDispatchPrefill(this);recalcPendingDispatchV11()">${v11SourceOptions(o,source)}</select>
    </div>
    <div class="wide">
      <label>Producto realmente entregado</label>
      <select class="v11Actual" onchange="this.dataset.touched='1';recalcPendingDispatchV11()">${v11ProductSelect(actual)}</select>
      <div class="v11-help">Si es diferente, se registra como sustituciÃ³n y el pendiente original queda pendiente de definiciÃ³n.</div>
    </div>
    <div>
      <label>Fardos</label>
      <input class="field v11DPack" type="number" min="0" value="${normalized.packs}" oninput="this.dataset.touched='1';recalcPendingDispatchV11()">
    </div>
    <div>
      <label>Unidades</label>
      <input class="field v11DUnit" type="number" min="0" value="${normalized.units}" oninput="this.dataset.touched='1';recalcPendingDispatchV11()">
    </div>
    <button class="btn btn-danger" onclick="this.parentElement.remove();recalcPendingDispatchV11()">Quitar</button>`;
  document.getElementById('v11DispatchLines').appendChild(d);
};

function v15RefreshDispatchPrefill(select){
  let row=select.closest('.v11-delivery-row');
  if(!row)return;
  let source=select.value;
  let o=db.orders.find(x=>x.id===v11CurrentDispatchOrderId);
  let line=(o?.requestLines||[]).find(l=>l.productId===source);
  let actual=row.querySelector('.v11Actual');
  if(!actual.dataset.touched)actual.value=source;

  // Si el operador todavÃ­a no modificÃ³ las cantidades, actualizamos el valor
  // al pendiente correspondiente al nuevo producto seleccionado.
  let packInput=row.querySelector('.v11DPack');
  let unitInput=row.querySelector('.v11DUnit');
  if(!packInput.dataset.touched && !unitInput.dataset.touched && line){
    let p=db.products.find(x=>x.id===actual.value);
    let n=normalize(0,v11LineOutstanding(line),p);
    packInput.value=n.packs;
    unitInput.value=n.units;
  }
}

openPendingDispatchV11=function(o){
  v11CurrentDispatchOrderId=o.id;
  let f=db.fleteros.find(x=>x.id===o.fleteroId);
  modal(`<div class="headrow"><div><h2>Confirmar salida Â· Orden ${v14Text(o.number)}</h2><div class="muted">${v14Text(f?.name||'')} Â· ${v14Text(V11_PENDING_LABELS[o.pendingType])} Â· Solo se descontarÃ¡ lo realmente entregado.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="v15-prefill-note"><b>Carga rÃ¡pida:</b> las cantidades ya estÃ¡n completadas con lo que queda pendiente segÃºn la orden. Si algo no sale, modifique solamente esa cantidad antes de confirmar.</div>
  <div class="card v11-request-card"><h3>Pedido original</h3>${(o.requestLines||[]).map(l=>{
    let p=db.products.find(x=>x.id===l.productId);
    return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${v14Text(p?.name||l.productId)}</b> Â· Solicitado ${equivalent(l.total,p)} Â· <span class="v11-pending-chip">Pendiente ${equivalent(v11LineOutstanding(l),p)}</span></div>`;
  }).join('')}</div>
  <div class="headrow" style="margin-top:16px"><h3>MercaderÃ­a realmente entregada</h3><button class="btn btn-secondary" onclick="addPendingDispatchLineV11('', '', 0)">Agregar lÃ­nea</button></div>
  <div id="v11DispatchLines"></div>

  <label>Observaciones</label><textarea id="v11DispatchNote"></textarea>
  <div id="v11DispatchWarning"></div>
  <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="savePendingDispatchV11('${o.id}')">Confirmar salida</button></div>`);

  (o.requestLines||[])
    .filter(l=>v11LineOutstanding(l)>0)
    .forEach(l=>addPendingDispatchLineV11(l.productId,l.productId,v11LineOutstanding(l)));

  if(!document.querySelector('#v11DispatchLines .v11-delivery-row')){
    addPendingDispatchLineV11('', '', 0);
  }
  recalcPendingDispatchV11();
};

// ---------- Listado de Ã³rdenes: fardos ----------
function renderOrdersV15(){
  let body=document.getElementById('ordersBody');if(!body)return;
  let carrier=document.getElementById('ofCarrier')?.value||'',
      date=document.getElementById('ofDate')?.value||'',
      user=document.getElementById('ofUser')?.value||'',
      shift=document.getElementById('ofShift')?.value||'';

  let list=(db.orders||[]).filter(o=>{
    let ds=o.deliveries||[];
    return(!carrier||o.fleteroId===carrier)&&
          (!date||o.date===date)&&
          (!user||o.createdBy===user||ds.some(d=>d.user===user))&&
          (!shift||o.createdShift===shift||ds.some(d=>d.shift===shift));
  });

  body.innerHTML=list.map(o=>{
    let f=v13OrderCarrier(o),ds=o.deliveries||[];
    let req=Array.isArray(o.requestLines)?v15OrderRequestedFardos(o):0;
    let del=Array.isArray(o.requestLines)?v15OrderDeliveredFardos(o):0;
    let mat=ds.reduce((s,d)=>({
      p:s.p+(+d.palletOut||0)-(+d.palletIn||0),
      c:s.c+(+d.chapOut||0)-(+d.chapIn||0)
    }),{p:0,c:0});
    let last=ds.at(-1)||{},
        status=Array.isArray(o.requestLines)?v11OrderStatus(o):o.status,
        type=V11_PENDING_LABELS[o.pendingType||'legacy']||'HistÃ³rica',
        cls=status==='PENDIENTE'?'v13-admin-pending':status.includes('Pendiente')?'open':status.includes('Parcial')?'partial':'done';

    return `<tr>
      <td><b>${v14Text(o.number)}</b></td>
      <td>${v14Text(o.date)}</td>
      <td>${v14Text(v13CarrierDisplay(f))}</td>
      <td>${v14Text(type)}</td>
      <td>${v14Text(last.user||o.createdBy||'')}</td>
      <td>${v14Text(last.shift||o.createdShift||'')}</td>
      <td><span class="status ${cls}">${v14Text(status)}</span></td>
      <td>${v15FormatFardos(req)}</td>
      <td>${v15FormatFardos(del)}</td>
      <td>${mat.p} planch. Â· ${mat.c} chap.</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="11" class="muted">No hay Ã³rdenes registradas.</td></tr>';
}
renderOrdersV13=renderOrdersV15;
renderOrdersV11=renderOrdersV15;
renderOrders=renderOrdersV15;

// ---------- Stock: fila de totales ----------
function v15AddFardos(totalObj,key,total,p){
  totalObj[key]+=v15FardosEquivalent(total,p);
}
renderStockV1=function(){
  if(!document.getElementById('stockBody'))return;

  let q=v14SearchNorm(document.getElementById('stockSearchV1')?.value||''),
      filter=document.getElementById('stockStateV1')?.value||'';

  let list=(db.products||[])
    .filter(p=>p.active!==false)
    .filter(p=>{
      let hay=v14SearchNorm(`${p.id} ${p.alias||''} ${p.name}`);
      return !q||hay.includes(q);
    })
    .filter(p=>!filter||v1State(v1EnsureBucket(p.id))===filter);

  let totals={
    physical:0,deliverable:0,preventa:0,distriC:0,distriInterior:0,
    sinCodificar:0,oesteMendoza:0,oesteJeremias:0,pending:0
  };

  let rows=list.map(p=>{
    let b=v1EnsureBucket(p.id),
        total=v1PendingTotal(b),
        pct=v1Pct(b),
        state=v1State(b),
        deliverable=v14DeliverableStock(b);

    v15AddFardos(totals,'physical',b.physical,p);
    v15AddFardos(totals,'deliverable',deliverable,p);
    v15AddFardos(totals,'preventa',b.preventa,p);
    v15AddFardos(totals,'distriC',b.distriC,p);
    v15AddFardos(totals,'distriInterior',b.distriInterior,p);
    v15AddFardos(totals,'sinCodificar',b.sinCodificar,p);
    v15AddFardos(totals,'oesteMendoza',b.oesteMendoza,p);
    v15AddFardos(totals,'oesteJeremias',b.oesteJeremias,p);
    v15AddFardos(totals,'pending',total,p);

    let percentage=total===0
      ?'<span class="status partial">Sin pendientes</span>'
      :`<span class="status ${state==='Insuficiente'?'danger':'done'}">${pct.toFixed(1)}%</span><br><span class="muted">${state}</span>`;

    return `<tr>
      <td><b>${v14Text(p.id)}</b>${p.alias?` Â· <span class="status partial">${v14Text(p.alias)}</span>`:''}<br>${v14Text(p.name)}</td>
      <td>${equivalent(b.physical,p)}<br><span class="muted">Entregable: ${equivalent(deliverable,p)}</span></td>
      <td>${equivalent(b.preventa,p)}</td>
      <td>${equivalent(b.distriC,p)}</td>
      <td>${equivalent(b.distriInterior,p)}</td>
      <td>${equivalent(b.sinCodificar,p)}</td>
      <td>${equivalent(b.oesteMendoza,p)}</td>
      <td>${equivalent(b.oesteJeremias,p)}</td>
      <td><b>${equivalent(total,p)}</b></td>
      <td>${percentage}</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="openPendingEditorV1('${p.id}')">Editar pendientes</button></td>
    </tr>`;
  }).join('');

  let globalPct=totals.pending===0?null:(totals.physical/totals.pending)*100;
  let totalRow=`<tr class="v15-stock-total">
    <td>TOTAL</td>
    <td>${v15FormatFardos(totals.physical)}<br><span class="muted">Entregable: ${v15FormatFardos(totals.deliverable)}</span></td>
    <td>${v15FormatFardos(totals.preventa)}</td>
    <td>${v15FormatFardos(totals.distriC)}</td>
    <td>${v15FormatFardos(totals.distriInterior)}</td>
    <td>${v15FormatFardos(totals.sinCodificar)}</td>
    <td>${v15FormatFardos(totals.oesteMendoza)}</td>
    <td>${v15FormatFardos(totals.oesteJeremias)}</td>
    <td>${v15FormatFardos(totals.pending)}</td>
    <td>${globalPct===null?'<span class="status partial">Sin pendientes</span>':`<b>${globalPct.toFixed(1)}%</b><br><span class="muted">Cobertura global</span>`}</td>
    <td class="no-print"></td>
  </tr>`;

  stockBody.innerHTML=(rows||'<tr><td colspan="11" class="muted">No hay productos con los filtros seleccionados.</td></tr>')+totalRow;
};

// Aseguramos que el render general utilice las versiones v1.5.
const _v15RenderAll=renderAll;
renderAll=function(){
  _v15RenderAll();
  renderOrdersV15();
  renderStockV1();
};
renderAll();


// ===== Talca ExpediciÃ³n v1.6 =====
const V16_SCHEMA_VERSION=7;
let currentPrintKind='report';
let v16LastReceipt=null;

(function v16Migrate(){
  if(Number(db.schemaVersion||0)<V16_SCHEMA_VERSION){
    try{v1Backup('Antes de actualizar a v1.6')}catch(err){console.error(err)}
    db.schemaVersion=V16_SCHEMA_VERSION;
    safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
  }
})();

const _v16Save=save;
save=function(){
  db.schemaVersion=V16_SCHEMA_VERSION;
  _v16Save();
  safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
};

// ------------------------------------------------------------------
// Interfaz adaptativa
// ------------------------------------------------------------------
function v16ApplyAdaptiveMode(){
  document.body.classList.toggle('compact-ui',window.innerWidth<=1450||window.innerHeight<=850);
}
v16ApplyAdaptiveMode();
window.addEventListener('resize',v16ApplyAdaptiveMode);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function v16NaturalCompareDesc(a,b){
  return String(b?.number??'').localeCompare(String(a?.number??''),'es',{
    numeric:true,sensitivity:'base'
  });
}
function v16MovementFardos(m){
  let p=db.products.find(x=>x.id===m.productId);
  return p&&Number(p.pack)?Number(m.total||0)/Number(p.pack):0;
}
function v16FmtFardos(n){
  let value=Number(n||0);
  return `${value.toLocaleString('es-AR',{maximumFractionDigits:2})} fardos`;
}
function v16BaseMovementType(type){
  let t=String(type||'');
  if(t.startsWith('Consumo de empleado'))return 'Consumo de empleado';
  if(t.startsWith('Anticipo empleado'))return 'Anticipo empleado';
  if(t.startsWith('CorrecciÃ³n de orden de carga'))return 'Orden de carga';
  if(t.startsWith('Orden de carga'))return 'Orden de carga';
  return t;
}
function v16IsGroupedMovement(m){
  let t=v16BaseMovementType(m.type);
  return Boolean(m.operationId||m.receiptNumber)||
    ['Orden de carga','Rebote','Derrame','Consumo de empleado','Anticipo empleado'].includes(t);
}
function v16FallbackGroupKey(m){
  let t=v16BaseMovementType(m.type);
  if(t==='Orden de carga')return `ORDEN|${m.ref||''}`;
  // Para registros histÃ³ricos sin operationId se agrupan las lÃ­neas creadas en el mismo segundo.
  let second=String(m.operationDate||m.date||'').slice(0,19);
  return `${t}|${m.ref||''}|${m.user||''}|${m.shift||''}|${second}`;
}
function v16MovementGroupKey(m){
  // Una orden de carga debe verse una sola vez incluso si tuvo varias
  // salidas parciales, sustituciones o correcciones.
  if(v16BaseMovementType(m.type)==='Orden de carga')return `ORDEN|${m.ref||''}`;
  return m.operationId?`OP|${m.operationId}`:
         m.receiptNumber?`REC|${m.receiptNumber}`:
         v16FallbackGroupKey(m);
}

// ------------------------------------------------------------------
// PENDIENTES: una fila por orden
// ------------------------------------------------------------------
renderPendingV13=function(){
  let body=document.getElementById('pendingBody');if(!body)return;
  let carrier=document.getElementById('pfCarrier')?.value||'',
      from=document.getElementById('pfFrom')?.value||'';

  let list=(db.orders||[])
    .filter(o=>Array.isArray(o.requestLines)&&v13IsOperational(o.pendingType)&&v11OrderOutstanding(o)>0)
    .filter(o=>(!carrier||o.fleteroId===carrier)&&(!from||o.date>=from))
    .sort(v16NaturalCompareDesc);

  body.innerHTML=list.map(o=>{
    let f=v13OrderCarrier(o);
    return `<tr>
      <td><b>${v14Text(o.number)}</b></td>
      <td>${v14Text(o.date)}</td>
      <td>${v14Text(v13CarrierDisplay(f))}</td>
      <td>${v14Text(V11_PENDING_LABELS[o.pendingType]||'Pendiente')}</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="5" class="muted">No hay Ã³rdenes pendientes con los filtros seleccionados.</td></tr>';
};
renderPendingV11=renderPendingV13;
renderPending=renderPendingV13;

exportPendingCSV=function(){
  let rows=[['Orden','Fecha','Fletero','Tipo']];
  (db.orders||[])
    .filter(o=>Array.isArray(o.requestLines)&&v13IsOperational(o.pendingType)&&v11OrderOutstanding(o)>0)
    .sort(v16NaturalCompareDesc)
    .forEach(o=>{
      let f=v13OrderCarrier(o);
      rows.push([o.number,o.date,v13CarrierDisplay(f),V11_PENDING_LABELS[o.pendingType]||'Pendiente']);
    });
  downloadCSV('pendientes_por_orden.csv',rows);
};

// ------------------------------------------------------------------
// Ã“RDENES: nuevas arriba, sin columna Materiales
// ------------------------------------------------------------------
function renderOrdersV16(){
  let body=document.getElementById('ordersBody');if(!body)return;
  let carrier=document.getElementById('ofCarrier')?.value||'',
      date=document.getElementById('ofDate')?.value||'',
      user=document.getElementById('ofUser')?.value||'',
      shift=document.getElementById('ofShift')?.value||'';

  let list=(db.orders||[]).filter(o=>{
    let ds=o.deliveries||[];
    return(!carrier||o.fleteroId===carrier)&&
          (!date||o.date===date)&&
          (!user||o.createdBy===user||ds.some(d=>d.user===user))&&
          (!shift||o.createdShift===shift||ds.some(d=>d.shift===shift));
  }).sort(v16NaturalCompareDesc);

  body.innerHTML=list.map(o=>{
    let f=v13OrderCarrier(o),ds=o.deliveries||[];
    let req=Array.isArray(o.requestLines)?v15OrderRequestedFardos(o):0;
    let del=Array.isArray(o.requestLines)?v15OrderDeliveredFardos(o):0;
    let last=ds.at(-1)||{},
        status=Array.isArray(o.requestLines)?v11OrderStatus(o):o.status,
        type=V11_PENDING_LABELS[o.pendingType||'legacy']||'HistÃ³rica',
        cls=status==='PENDIENTE'?'v13-admin-pending':
            String(status).includes('Pendiente')?'open':
            String(status).includes('Parcial')?'partial':'done';

    return `<tr>
      <td><b>${v14Text(o.number)}</b></td>
      <td>${v14Text(o.date)}</td>
      <td>${v14Text(v13CarrierDisplay(f))}</td>
      <td>${v14Text(type)}</td>
      <td>${v14Text(last.user||o.createdBy||'')}</td>
      <td>${v14Text(last.shift||o.createdShift||'')}</td>
      <td><span class="status ${cls}">${v14Text(status)}</span></td>
      <td>${v15FormatFardos(req)}</td>
      <td>${v15FormatFardos(del)}</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="10" class="muted">No hay Ã³rdenes registradas.</td></tr>';
}
renderOrdersV15=renderOrdersV16;
renderOrdersV13=renderOrdersV16;
renderOrdersV11=renderOrdersV16;
renderOrders=renderOrdersV16;

// ------------------------------------------------------------------
// MOVIMIENTOS: agrupaciÃ³n por operaciÃ³n
// ------------------------------------------------------------------
function v16GroupedMovements(){
  let output=[],map=new Map();

  [...(db.movements||[])].forEach(m=>{
    if(!v16IsGroupedMovement(m)){
      output.push({
        key:`SINGLE|${m.id}`,
        date:m.date,type:m.type,ref:m.ref||'',user:m.user||'',shift:m.shift||'',
        input:(m.dir==='in'?v16MovementFardos(m):0),
        output:(m.dir==='out'?v16MovementFardos(m):0),
        neutral:(m.dir==='none'||m.dir==='neutral'?v16MovementFardos(m):0),
        count:1,grouped:false
      });
      return;
    }

    let key=v16MovementGroupKey(m);
    if(!map.has(key)){
      map.set(key,{
        key,date:m.operationDate||m.date,
        type:v16BaseMovementType(m.type),ref:m.ref||'',
        user:m.user||'',shift:m.shift||'',
        input:0,output:0,neutral:0,count:0,grouped:true
      });
    }
    let g=map.get(key);
    if(String(m.date||'')>String(g.date||''))g.date=m.date;
    if(m.dir==='in')g.input+=v16MovementFardos(m);
    else if(m.dir==='out')g.output+=v16MovementFardos(m);
    else if(m.dir==='none'||m.dir==='neutral')g.neutral+=v16MovementFardos(m);
    g.count++;
  });

  output.push(...map.values());
  return output.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}

function renderMovementsV16(){
  let body=document.getElementById('movementsBody');if(!body)return;
  let list=v16GroupedMovements();
  body.innerHTML=list.map(g=>`<tr>
    <td>${fmtDate(g.date)}</td>
    <td>${v14Text(g.type)}${g.count>1?`<span class="v16-group-badge">${g.count} productos</span>`:''}</td>
    <td>${v14Text(g.ref||'')}</td>
    <td>${g.input?v16FmtFardos(g.input):''}</td>
    <td>${g.output?v16FmtFardos(g.output):''}</td>
    <td>${g.neutral?v16FmtFardos(g.neutral):''}</td>
    <td>${v14Text(g.user||'')}</td>
    <td>${v14Text(g.shift||'')}</td>
  </tr>`).join('')||'<tr><td colspan="8" class="muted">No hay movimientos registrados.</td></tr>';
}
renderMovementsV11=renderMovementsV16;

// Marcar nuevas operaciones Rebote/Derrame con operationId para agrupaciÃ³n inequÃ­voca.
const _v16SaveSimpleMovement=saveSimpleMovement;
saveSimpleMovement=function(type){
  if(!['Rebote','Derrame'].includes(type))return _v16SaveSimpleMovement(type);
  let before=(db.movements||[]).length;
  let result=_v16SaveSimpleMovement(type);
  let added=(db.movements||[]).slice(before);
  if(added.length){
    let op=uid(type==='Rebote'?'reb':'der');
    added.forEach(m=>m.operationId=op);
    save();
  }
  return result;
};

// Marcar nuevas confirmaciones de orden con operationId.
const _v16SavePendingDispatch=savePendingDispatchV11;
savePendingDispatchV11=function(orderId){
  let before=(db.movements||[]).length;
  let result=_v16SavePendingDispatch(orderId);
  let added=(db.movements||[]).slice(before);
  if(added.length){
    let op=uid('od');
    added.forEach(m=>m.operationId=op);
    save();
  }
  return result;
};

// Anticipos nuevos: operationId + receiptNumber.
saveWorkbenchAdvance=function(){
  let e=db.employees.find(x=>x.id===selectedEmployeeId);
  if(!e)return alert('Seleccione un empleado.');

  let rows=[...document.querySelectorAll('#wbAdvanceLines .line')],items=[];
  rows.forEach(r=>{
    let p=db.products.find(x=>x.id===r.querySelector('.wbaProd').value),
        n=normalize(r.querySelector('.wbaPack').value,r.querySelector('.wbaUnit').value,p);
    if(n.total)items.push({p,n});
  });
  if(!items.length)return alert('Agregue al menos un producto.');

  let shortages=items.filter(x=>x.n.total>Number(db.stock[x.p.id]||0)),justification='';
  if(shortages.length){
    justification=prompt('Hay stock insuficiente. Ingrese una justificaciÃ³n para continuar:')||'';
    if(!justification)return;
  }

  let receiptNumber=nextReceiptNumber('AE'),
      operationId=uid('ae'),
      operationDate=now(),
      note=document.getElementById('wbAdvanceNote')?.value||'';

  items.forEach(x=>{
    addStockMove({
      type:`Anticipo empleado - ${e.name} ${e.surname}`,
      ref:e.legajo,productId:x.p.id,total:x.n.total,dir:'out',
      note:[note,justification].filter(Boolean).join(' Â· ')
    });
    let movement=db.movements[db.movements.length-1];
    movement.operationId=operationId;
    movement.receiptNumber=receiptNumber;
    movement.operationDate=operationDate;
  });
  save();
  renderEmployeeWorkbench();
  showEmployeeReceipt(e,items,'ANTICIPO EMPLEADO','AE',receiptNumber);
};

// ------------------------------------------------------------------
// MATERIALES: resumen 3 + 3 y formularios ordenados
// ------------------------------------------------------------------
const _v16RenderMaterials=renderMaterials;
renderMaterials=function(){
  _v16RenderMaterials();
  let grid=document.querySelector('#materialsTotals .summarygrid');
  if(grid)grid.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
};

function v16MaterialInputHTML(id,label,value){
  return `<div><label>${label}</label><input id="${id}" class="field" type="number" min="0" value="${v14Text(value)}"></div>`;
}
function v16AttachMaterialKeyboard(sequence,afterId){
  sequence.forEach((id)=>{
    let input=document.getElementById(id);
    if(!input)return;
    input.addEventListener('input',()=>{
      input.dataset.confirmed='';
      input.classList.remove('v16-confirmed');
    });
    input.addEventListener('keydown',(event)=>{
      if(event.key!=='Enter')return;
      event.preventDefault();
      input.dataset.confirmed='1';
      input.classList.add('v16-confirmed');

      let currentIndex=sequence.indexOf(id);
      let next=sequence.slice(currentIndex+1)
        .map(x=>document.getElementById(x))
        .find(el=>el&&!el.dataset.confirmed);
      if(next){
        next.focus();next.select();
      }else{
        let after=document.getElementById(afterId);
        if(after)after.focus();
      }
    });
  });
}


// Envolver los editores actuales sin alterar su lÃ³gica.
const _v16OpenOrderEditor=v13OpenOrderEditor;
v13OpenOrderEditor=function(existingId=''){
  return _v16OpenOrderEditor(existingId);
};
const _v16OpenPendingDispatch=openPendingDispatchV11;
openPendingDispatchV11=function(o){
  return _v16OpenPendingDispatch(o);
};

// ------------------------------------------------------------------
// IMPRESIÃ“N: un Ãºnico sistema y limpieza del documento previo
// ------------------------------------------------------------------
setPrintableDocument=function(title,bodyHtml,kind='report'){
  currentPrintTitle=title||'Documento';
  currentPrintBody=bodyHtml||'';
  currentPrintKind=kind||'report';
};
function v16PrintLogo(){
  return document.querySelector('.top-logo')?.src||document.querySelector('.brand-logo')?.src||'';
}
renderPrintArea=function(){
  let area=document.getElementById('printArea');if(!area)return;
  if(currentPrintKind==='receipt'){
    area.innerHTML=currentPrintBody;
    return;
  }
  let logo=v16PrintLogo();
  area.innerHTML=`<div class="v16-print-brand">
    <img src="${logo}" alt="Talca">
    <h1>${v14Text(currentPrintTitle)}</h1>
  </div>${currentPrintBody}`;
};
printCurrentDocument=function(){
  if(!currentPrintBody){
    alert('No hay un documento preparado para imprimir.');
    return;
  }
  renderPrintArea();
  window.print();
};
function v16ClearPrintState(){
  let area=document.getElementById('printArea');
  if(area)area.innerHTML='';
  currentPrintTitle='';
  currentPrintBody='';
  currentPrintKind='report';
}
window.addEventListener('afterprint',v16ClearPrintState);

printSection=function(id,title){
  let source=document.getElementById(id);
  if(!source)return;
  // Se copia sÃ³lo el contenido visible del reporte. Los controles quedan fuera.
  let clone=source.cloneNode(true);
  clone.querySelectorAll('.no-print,button').forEach(el=>el.remove());
  clone.querySelectorAll('.hidden').forEach(el=>el.remove());
  clone.querySelectorAll('.report-title').forEach(el=>{
    el.style.display='block';
    el.textContent=title;
  });
  // Los wrappers dejan de tener scroll al imprimir.
  clone.querySelectorAll('.tablewrap').forEach(el=>{
    el.style.maxHeight='none';
    el.style.overflow='visible';
  });
  setPrintableDocument(title,clone.innerHTML,'report');
  printCurrentDocument();
};

openPrintableDocument=function(){
  if(!currentPrintBody)return;
  renderPrintArea();
  document.querySelectorAll('body > *:not(#printArea)').forEach(el=>{
    el.dataset.prevDisplay=el.style.display||'';
    el.style.display='none';
  });
  let area=document.getElementById('printArea');
  area.style.display='block';
  area.style.position='static';
  area.style.width='100%';
  area.style.padding='16px';
  area.insertAdjacentHTML('afterbegin',
    `<div class="no-print" style="margin-bottom:14px">
       <button onclick="restoreApplicationView()" style="padding:10px 14px;margin-right:8px">Volver al sistema</button>
       <button onclick="printCurrentDocument()" style="padding:10px 14px;background:#19417f;color:white;border:0;border-radius:8px">Imprimir</button>
     </div>`);
};
restoreApplicationView=function(){
  let area=document.getElementById('printArea');
  area.style.display='none';
  area.style.position='';
  area.style.width='';
  area.style.padding='';
  document.querySelectorAll('body > *:not(#printArea)').forEach(el=>{
    el.style.display=el.dataset.prevDisplay||'';
  });
  // La vista imprimible no debe quedar como documento activo.
  v16ClearPrintState();
};

// Orden de carga: documento especÃ­fico en vez de window.print() directo.
function v16PrintOrder(id){
  let o=db.orders.find(x=>x.id===id);if(!o)return;
  let f=v13OrderCarrier(o);
  let status=Array.isArray(o.requestLines)?v11OrderStatus(o):(o.status||'');
  let type=V11_PENDING_LABELS[o.pendingType||'legacy']||'HistÃ³rica';

  let requests=(o.requestLines||[]).map(l=>{
    let p=db.products.find(x=>x.id===l.productId);
    return `<tr><td>${v14Text(p?.id||l.productId)}</td><td>${v14Text(p?.name||l.productId)}</td>
      <td>${p?equivalent(l.total,p):l.total}</td>
      <td>${p?equivalent(Math.min(l.total,l.resolvedTotal||0),p):''}</td>
      <td>${p?equivalent(v11LineOutstanding(l),p):''}</td></tr>`;
  }).join('');

  let deliveries=(o.deliveries||[]).map((d,i)=>{
    let detail=(d.lines||[]).map(l=>{
      let p=db.products.find(x=>x.id===l.productId);
      return `${v14Text(p?.name||l.productId)}: ${p?equivalent(l.total,p):l.total}`;
    }).join(' Â· ');
    return `<tr><td>${i+1}</td><td>${fmtDate(d.date)}</td><td>${v14Text(detail)}</td>
      <td>${Number(d.palletOut||0)}</td><td>${Number(d.palletIn||0)}</td>
      <td>${Number(d.chapOut||0)}</td><td>${Number(d.chapIn||0)}</td></tr>`;
  }).join('');

  let body=`<div class="v16-order-print">
    <div class="meta">
      <div><b>Orden</b><br>${v14Text(o.number)}</div>
      <div><b>Fecha</b><br>${v14Text(o.date)}</div>
      <div><b>Fletero</b><br>${v14Text(v13CarrierDisplay(f))}</div>
      <div><b>Tipo</b><br>${v14Text(type)}</div>
      <div><b>Estado</b><br>${v14Text(status)}</div>
      <div><b>Turno / encargado</b><br>${v14Text(o.createdShift||'')} Â· ${v14Text(o.createdBy||'')}</div>
    </div>
    <h2>Productos solicitados</h2>
    <table><thead><tr><th>CÃ³digo</th><th>Producto</th><th>Solicitado</th><th>Resuelto</th><th>Pendiente</th></tr></thead>
    <tbody>${requests||'<tr><td colspan="5">Sin detalle disponible.</td></tr>'}</tbody></table>
    <h2 style="margin-top:16px">Salidas registradas</h2>
    <table><thead><tr><th>#</th><th>Fecha</th><th>Productos</th><th>Planch. sale</th><th>Planch. vuelve</th><th>Chap. sale</th><th>Chap. vuelve</th></tr></thead>
    <tbody>${deliveries||'<tr><td colspan="7">Sin salidas confirmadas.</td></tr>'}</tbody></table>
  </div>`;
  setPrintableDocument(`Orden de carga ${o.number}`,body,'order');
  printCurrentDocument();
}

// Sustituir Ãºnicamente el botÃ³n de impresiÃ³n del modal actual.
const _v16ViewOrder=viewOrder;
viewOrder=function(id){
  let result=_v16ViewOrder(id);
  let dialog=document.getElementById('dialog');
  if(dialog){
    [...dialog.querySelectorAll('button')].forEach(btn=>{
      if(btn.textContent.trim()==='Imprimir'){
        btn.setAttribute('onclick',`v16PrintOrder('${id}')`);
      }
    });
  }
  return result;
};

// ------------------------------------------------------------------
// Comprobantes: exactamente una A4, sin encabezado previo
// ------------------------------------------------------------------
showEmployeeReceipt=function(e,items,title,prefix,providedNumber=''){
  let number=providedNumber||nextReceiptNumber(prefix);
  let rows=items.map(x=>`<tr>
    <td>${v14Text(x.p.id)}</td>
    <td>${v14Text(x.p.name)}</td>
    <td>${equivalent(x.n.total,x.p)}</td>
  </tr>`).join('');
  let logo=v16PrintLogo();

  function half(destination,signature){
    return `<section class="v16-receipt-half">
      <div class="v16-receipt-brand">
        <img src="${logo}" alt="Talca">
        <strong>${v14Text(destination)}</strong>
      </div>
      <h2>${v14Text(title)}</h2>
      <p><b>N.Âº:</b> ${v14Text(number)} &nbsp; Â· &nbsp; <b>Fecha:</b> ${fmtDate(now())}</p>
      <p><b>Empleado:</b> ${v14Text(e.name)} ${v14Text(e.surname)} &nbsp; Â· &nbsp; <b>Legajo:</b> ${v14Text(e.legajo)}</p>
      <table>
        <thead><tr><th>CÃ³digo</th><th>Producto</th><th>Cantidad</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p><b>Encargado:</b> ${v14Text(session.user)} &nbsp; Â· &nbsp; <b>Turno:</b> ${v14Text(session.shift)}</p>
      ${signature?'<p class="v16-receipt-signature">Firma empleado: ____________________________________</p>':''}
    </section>`;
  }

  let body=`<div class="v16-receipt-sheet">
    ${half('FACTURACIÃ“N',true)}
    ${half('CONTROL DE GUARDIA',false)}
  </div>`;

  v16LastReceipt={title,body};
  setPrintableDocument(title,body,'receipt');

  let area=document.getElementById('employeeReceiptArea');
  if(!area)return alert('La operaciÃ³n se registrÃ³ correctamente, pero no se encontrÃ³ el Ã¡rea del comprobante.');

  area.innerHTML=`<div class="card receipt-success">
    <div class="headrow">
      <div><h2>OperaciÃ³n registrada correctamente</h2>
      <div class="muted">${v14Text(title)} Â· Comprobante ${v14Text(number)} Â· 1 hoja A4</div></div>
    </div>
    ${body}
    <div class="receipt-actions no-print">
      <button class="btn btn-secondary" onclick="document.getElementById('employeeReceiptArea').classList.add('hidden')">Cerrar</button>
      <button class="btn btn-secondary" onclick="v16OpenLastReceipt()">Vista imprimible</button>
      <button class="btn btn-primary" onclick="v16PrintLastReceipt()">Imprimir / Guardar como PDF</button>
    </div>
  </div>`;
  area.classList.remove('hidden');
  area.scrollIntoView({behavior:'smooth',block:'start'});
};
function v16PrintLastReceipt(){
  if(!v16LastReceipt)return;
  setPrintableDocument(v16LastReceipt.title,v16LastReceipt.body,'receipt');
  printCurrentDocument();
}
function v16OpenLastReceipt(){
  if(!v16LastReceipt)return;
  setPrintableDocument(v16LastReceipt.title,v16LastReceipt.body,'receipt');
  openPrintableDocument();
}

// Evitar que un comprobante viejo reaparezca al imprimir un documento distinto.
const _v16ShowPage=showPage;
showPage=function(id){
  if(id!=='employees'&&currentPrintKind==='receipt'){
    currentPrintBody='';
    currentPrintTitle='';
    currentPrintKind='report';
    let p=document.getElementById('printArea');if(p)p.innerHTML='';
  }
  let result=_v16ShowPage(id);
  // Asegurar que las funciones v1.6 sean las que redibujan las pantallas.
  if(id==='orders')renderOrdersV16();
  if(id==='pending')renderPendingV13();
  if(id==='movements')renderMovementsV16();
  if(id==='materials')renderMaterials();
  return result;
};

// ------------------------------------------------------------------
// Render final
// ------------------------------------------------------------------
const _v16RenderAll=renderAll;
renderAll=function(){
  _v16RenderAll();
  renderOrdersV16();
  renderPendingV13();
  renderMovementsV16();
  renderMaterials();
};
renderAll();

function openShiftMaterials() {
  let today = new Date().toISOString().slice(0, 10);
  let fleteros = new Set();
  
  db.orders.forEach(o => {
    let hasDeliveryThisShift = (o.deliveries || []).some(d => d.date.startsWith(today) && d.shift === session.shift);
    if (o.date === today || hasDeliveryThisShift) {
      if (o.fleteroId) fleteros.add(o.fleteroId);
    }
  });

  let options = Array.from(fleteros).map(id => {
    let f = db.fleteros.find(x => x.id === id);
    return `<option value="${id}">${f ? f.name : id}</option>`;
  }).join('');

  if (!options) {
    options = `<option value="">No hay fleteros activos en este turno</option>` + fleteroOptions();
  }

  modal(`<div class="headrow"><h2>Nueva Carga de Materiales por Turno</h2><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Fletero</label><select id="smCarrier">${options}</select></div>
    <div><label>Planchadas entregadas al fletero</label><input id="smPalletOut" class="field" type="number" min="0" value="0"></div>
    <div><label>Planchadas devueltas por el fletero</label><input id="smPalletIn" class="field" type="number" min="0" value="0"></div>
    <div><label>Chapadur entregado al fletero</label><input id="smChapOut" class="field" type="number" min="0" value="0"></div>
    <div><label>Chapadur devuelto por el fletero</label><input id="smChapIn" class="field" type="number" min="0" value="0"></div>
    <div class="span3"><label>Observaciones</label><input id="smNote" class="field"></div>
  </div>
  <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="saveShiftMaterials()">Guardar</button></div>`);
  
  v16AttachMaterialKeyboard(
    ['smPalletOut','smPalletIn','smChapOut','smChapIn'],
    'smNote'
  );
}

function saveShiftMaterials() {
  let carrier = document.getElementById('smCarrier').value;
  if (!carrier) return alert('Seleccione un fletero vÃ¡lido.');
  
  addMaterialMove({
    fleteroId: carrier,
    ref: 'Turno ' + session.shift,
    source: 'Carga por turno',
    palletOut: +document.getElementById('smPalletOut').value || 0,
    palletIn: +document.getElementById('smPalletIn').value || 0,
    chapOut: +document.getElementById('smChapOut').value || 0,
    chapIn: +document.getElementById('smChapIn').value || 0
  });
  
  let move = db.materialMoves[db.materialMoves.length - 1];
  if (move) move.note = document.getElementById('smNote').value;
  
  save();
  closeModal();
  renderMaterials();
}


