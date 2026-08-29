// --- TOAST NOTIFICATIONS ---
window.toast = function toast(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    let t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = msg;
    container.appendChild(t);
    setTimeout(() => {
        t.classList.add('fade-out');
        setTimeout(() => t.remove(), 300);
    }, 3000);
};

window.customConfirm = function customConfirm(msg, onConfirm) {
    let html = `
    <div class="headrow">
        <div><h2>Confirmación</h2></div>
        <button class="btn btn-secondary" onclick="closeModal()">X</button>
    </div>
    <div style="margin: 16px 0; font-size: 16px;">${msg}</div>
    <div class="right" style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-danger" id="btnConfirmAction">Aceptar</button>
    </div>`;
    modal(html);
    document.getElementById('btnConfirmAction').onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };
};

window.v1SafeGet = function v1SafeGet(k){try{return localStorage.getItem(k)}catch(e){return null}};
window.v1SafeSet = function v1SafeSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}};
window.v1Backup = function v1Backup(label='Respaldo manual'){
  const raw=JSON.stringify(db);let arr=[];try{arr=JSON.parse(v1SafeGet('talcaExpBackups')||'[]')}catch(e){}
  arr.push({id:'bk_'+Date.now(),date:new Date().toISOString(),label,data:raw});if(arr.length>10)arr=arr.slice(-10);v1SafeSet('talcaExpBackups',JSON.stringify(arr));return arr.at(-1)
};
window.v1PendingTotal = function v1PendingTotal(b){return ['preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias'].reduce((s,k)=>s+Number(b[k]||0),0)};
window.v1Pct = function v1Pct(b){let t=v1PendingTotal(b);if(t===0)return null;let d=v14DeliverableStock(b);if(d===0)return -100;return ((d-t)/d)*100};
window.v1State = function v1State(b){let t=v1PendingTotal(b);if(t===0)return 'Sin pendientes';return Number(b.physical||0)>=t?'Disponible':'Insuficiente'};
window.v1PendingField = function v1PendingField(label,key,total,p){let n=normalize(0,total,p);return `<div><label>${label}</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input id="${key}Pack" class="field" type="number" min="0" value="${n.packs}" placeholder="Fardos"><input id="${key}Unit" class="field" type="number" min="0" value="${n.units}" placeholder="Unidades"></div></div>`};
window.openPendingEditorV1 = function openPendingEditorV1(pid){let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid);modal(`<div class="headrow"><div><h2>Pendientes · ${p.name}</h2><div class="muted">Ingrese fardos y unidades sueltas.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid">${v1PendingField('Preventa pendiente','preventa',b.preventa,p)}${v1PendingField('Distri C pendiente','distriC',b.distriC,p)}${v1PendingField('Distri Interior','distriInterior',b.distriInterior,p)}${v1PendingField('Sin codificar','sinCodificar',b.sinCodificar,p)}${v1PendingField('Oeste Mendoza pendiente','oesteMendoza',b.oesteMendoza,p)}${v1PendingField('Oeste Jeremías pendiente','oesteJeremias',b.oesteJeremias,p)}</div><label>Justificación / referencia</label><textarea id="v1PendingNote"></textarea><div class="right"><button class="btn btn-primary" onclick="savePendingV1('${pid}')">Guardar pendientes</button></div>` )};
window.savePendingV1 = function savePendingV1(pid){let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid),before=JSON.parse(JSON.stringify(b));['preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias'].forEach(k=>{b[k]=normalize(document.getElementById(k+'Pack').value,document.getElementById(k+'Unit').value,p).total});audit('Modificación','Pendientes',pid,JSON.stringify({before,after:b,note:document.getElementById('v1PendingNote').value}));save();closeModal();renderStockV1()};
window.exportStockV1CSV = function exportStockV1CSV(){let rows=[['Código','Producto','Stock físico','Preventa','Distri C','Distri Interior','Sin codificar','Oeste Mendoza','Oeste Jeremías','Total pendiente','% disponible']];(db.products||[]).filter(p=>p.active!==false).forEach(p=>{let b=v1EnsureBucket(p.id),t=v1PendingTotal(b);rows.push([p.id,p.name,equivalent(b.physical,p),equivalent(b.preventa,p),equivalent(b.distriC,p),equivalent(b.distriInterior,p),equivalent(b.sinCodificar,p),equivalent(b.oesteMendoza,p),equivalent(b.oesteJeremias,p),equivalent(t,p),v1Pct(b).toFixed(1)+'%'])});downloadCSV('stock_y_pendientes.csv',rows)};
window.exportBackupV1 = function exportBackupV1(){let payload={app:'Talca Expedición',schemaVersion:window.V11_SCHEMA_VERSION||2,exportedAt:new Date().toISOString(),data:db},a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='talca_backup_'+new Date().toISOString().replaceAll(':','-')+'.json';a.click();URL.revokeObjectURL(a.href)};
window.importBackupV1 = function importBackupV1(input){let file=input.files?.[0];if(!file)return;let r=new FileReader();r.onload=()=>{try{let payload=JSON.parse(r.result),data=payload.data||payload;if(!data.products||!data.stock)throw new Error('Formato inválido');v1Backup('Antes de importar respaldo');db=data;v1Migrate();save();alert('Respaldo importado correctamente')}catch(e){alert('No se pudo importar: '+e.message)}};r.readAsText(file)};
window.showBackupManagerV1 = function showBackupManagerV1(){let arr=[];try{arr=JSON.parse(v1SafeGet('talcaExpBackups')||'[]')}catch(e){};modal(`<div class="headrow"><div><h2>Copias de seguridad</h2><div class="muted">La migración a v1.0 crea un respaldo automático.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="toolbar"><button class="btn btn-primary" onclick="exportBackupV1()">Descargar respaldo</button><label class="btn btn-secondary">Importar respaldo<input type="file" accept=".json" hidden onchange="importBackupV1(this)"></label></div><div style="margin-top:16px">${arr.length?arr.slice().reverse().map(b=>`<div class="card" style="margin-bottom:8px"><b>${b.label}</b><br><span class="muted">${fmtDate(b.date)}</span></div>`).join(''):'<span class="muted">No hay respaldos automáticos.</span>'}</div>` )};

window.V11_SCHEMA_VERSION=2;
window.V11_BENEFIT_CODES=new Set(['5670','5675','5680','5685','5690','8670']);
window.V11_PENDING_LABELS={
 preventa:'Preventa pendiente',distriC:'Distri C pendiente',distriInterior:'Distri Interior',
 sinCodificar:'Sin codificar',oesteMendoza:'Oeste Mendoza pendiente',oesteJeremias:'Oeste Jeremías pendiente',
 immediate:'Salida inmediata',legacy:'Operación histórica'
};
window.v11PendingOptions = function v11PendingOptions(selected=''){
 return ['preventa','distriC','distriInterior','sinCodificar','oesteMendoza','oesteJeremias','immediate']
  .map(k=>`<option value="${k}" ${selected===k?'selected':''}>${window.V11_PENDING_LABELS[k]}</option>`).join('')
};
window.v11IncreasePending = function v11IncreasePending(type,productId,total){if(!type||type==='immediate'||!total)return;let b=v1EnsureBucket(productId);b[type]=Number(b[type]||0)+Number(total||0)};
window.v11DecreasePending = function v11DecreasePending(type,productId,total){if(!type||type==='immediate'||!total)return 0;let b=v1EnsureBucket(productId),applied=Math.min(Number(b[type]||0),Number(total||0));b[type]=Math.max(0,Number(b[type]||0)-applied);return applied};
window.v11OrderRequested = function v11OrderRequested(o){return (o.requestLines||[]).reduce((s,l)=>s+Number(l.total||0),0)};
window.v11OrderResolved = function v11OrderResolved(o){return (o.requestLines||[]).reduce((s,l)=>s+Math.min(Number(l.total||0),Number(l.resolvedTotal||0)),0)};
window.v11OrderOutstanding = function v11OrderOutstanding(o){return Math.max(0,v11OrderRequested(o)-v11OrderResolved(o))};
window.v11DeliveredTotal = function v11DeliveredTotal(o){return (o.deliveries||[]).reduce((s,d)=>s+(d.lines||[]).reduce((a,l)=>a+Number(l.total||0),0),0)};
window.v11LineOutstanding = function v11LineOutstanding(l){return Math.max(0,Number(l.total||0)-Number(l.resolvedTotal||0))};
window.v11FindRequestLine = function v11FindRequestLine(o,sourceProductId){return (o.requestLines||[]).find(l=>l.productId===sourceProductId&&v11LineOutstanding(l)>0)||(o.requestLines||[]).find(l=>l.productId===sourceProductId)};
window.v11OrderStatus = function v11OrderStatus(o){
 if(o.pendingType==='immediate')return o.status||'Despachada';
 let outstanding=v11OrderOutstanding(o),delivered=v11DeliveredTotal(o),sub=(o.deliveries||[]).some(d=>(d.lines||[]).some(l=>l.sourceProductId&&l.sourceProductId!==l.productId));
 if(outstanding===0)return 'Despachada';
 if(sub)return 'Pendiente de Facturación';
 if(delivered>0)return 'Parcialmente despachada';
 return 'Pendiente de despacho'
};
window.v11ProductSelect = function v11ProductSelect(selected=''){return db.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.id} · ${p.name}</option>`).join('')};

window.addOrderLine = function addOrderLine(productId=''){
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
window.syncRequestedV11 = function syncRequestedV11(el){let r=el.closest('.line'),isPack=el.classList.contains('liReqPack'),target=r.querySelector(isPack?'.liPack':'.liUnit');if(!target.dataset.touched)target.value=el.value};
window.addProductByCode = function addProductByCode(){let input=document.getElementById('quickProductCode'),q=(input?.value||'').trim().toLowerCase();if(!q)return;let matches=db.products.filter(p=>p.active!==false&&(p.id.toLowerCase()===q||p.name.toLowerCase().includes(q)));if(!matches.length)return toast('No se encontró el producto.', 'error');if(matches.length>1)return toast('Hay varias coincidencias; escriba el código exacto.', 'error');addOrderLine(matches[0].id);input.value='';input.focus()};
window.toggleOrderModeV11 = function toggleOrderModeV11(){
 let type=document.getElementById('v11PendingType')?.value,immediate=type==='immediate';
 document.querySelectorAll('.v11-actual').forEach(x=>x.classList.toggle('hidden',!immediate));
 document.getElementById('v11ImmediateMaterials')?.classList.toggle('hidden',!immediate);
 let info=document.getElementById('v11ModeInfo');if(info)info.innerHTML=immediate?'<b>Salida inmediata:</b> se descontará del stock físico lo realmente entregado y no se modificará ningún pendiente.':`<b>${window.V11_PENDING_LABELS[type]}:</b> se sumará la cantidad solicitada. El stock físico no cambia hasta confirmar la salida.`;
 let btn=document.getElementById('v11SaveOrderBtn');if(btn)btn.textContent=immediate?'Confirmar orden y salida':'Registrar orden pendiente';
 recalcOrderV11()
};
window.getNewOrderLinesV11 = function getNewOrderLinesV11(){
 return [...document.querySelectorAll('#orderLines .v11-new-order-line')].map(r=>{let p=db.products.find(x=>x.id===r.querySelector('.liProd').value),req=normalize(r.querySelector('.liReqPack').value,r.querySelector('.liReqUnit').value,p),act=normalize(r.querySelector('.liPack').value,r.querySelector('.liUnit').value,p);return {productId:p.id,requestedTotal:req.total,total:act.total}}).filter(x=>x.requestedTotal>0||x.total>0)
};
window.recalcOrderV11 = function recalcOrderV11(){
 if(!document.getElementById('orderLines'))return;let immediate=document.getElementById('v11PendingType')?.value==='immediate',lines=getNewOrderLinesV11(),occ=0,cuts=0,w=[];
 if(immediate)lines.forEach(l=>{let p=db.products.find(x=>x.id===l.productId);occ+=l.total/(p.pack*p.perCut*p.cuts);cuts+=l.total?Math.ceil(l.total/(p.pack*p.perCut)):0;if(l.total>(db.stock[p.id]||0))w.push(`${p.name}: stock ${equivalent(db.stock[p.id]||0,p)}, entrega ${equivalent(l.total,p)}`)});
 let sp=document.getElementById('suggestPallet'),sc=document.getElementById('suggestChap');if(sp)sp.textContent=Math.ceil(occ);if(sc)sc.textContent=cuts;
 let po=document.getElementById('realPalletOut'),co=document.getElementById('realChapOut');if(po&&+po.value===0)po.value=Math.ceil(occ);if(co&&+co.value===0)co.value=cuts;
 let warn=document.getElementById('stockWarning');if(warn)warn.innerHTML=w.length?`<div class="alert"><b>Stock insuficiente.</b><br>${w.join('<br>')}<label>Justificación obligatoria</label><textarea id="stockJustification"></textarea></div>`:''
};

function renderAll() {
  const tryRender = (fnName) => { try { if (typeof window[fnName] === 'function') window[fnName](); } catch(e) { console.error(fnName, e); } };
  tryRender('renderRecentV11');
  tryRender('renderProductsConfigV11');
  tryRender('renderEmployeeWorkbench');
  tryRender('renderMaterials');
  tryRender('renderOrdersV16');
  tryRender('renderMovementsV16');
  tryRender('renderPrintArea');
  tryRender('renderPendingV13');
  tryRender('renderStockV1');

  if(document.getElementById('auditBody')) {
    document.getElementById('auditBody').innerHTML=[...(db.audit||[])].reverse().map(a=>`<tr><td>${fmtDate(a.date)}</td><td>${a.user}</td><td>${a.action}</td><td>${a.entity}</td><td>${a.ref}</td><td>${a.detail}</td></tr>`).join('');
  }
  if(document.getElementById('countsBody')) {
    document.getElementById('countsBody').innerHTML=[...db.counts].reverse().map(c=>`<tr><td>${fmtDate(c.date)}</td><td>${c.shift}</td><td>${c.type}</td><td>${c.user}</td><td>${c.differences.length}</td><td>${c.status}</td></tr>`).join('');
  }
  if(document.getElementById('handoverAlert')) {
    let pending=[...db.counts].reverse().find(c=>c.type==='Cierre de turno'&&c.status==='Pendiente de corroboración'&&c.shift!==session.shift);
    document.getElementById('handoverAlert').innerHTML=pending?`<div class="alert"><b>Relevo pendiente.</b> ${pending.user} cerró el turno ${pending.shift} con ${pending.differences.length} diferencias. <button class="btn btn-primary" onclick="corroborateCount('${pending.id}')">Corroborar recepción</button></div>`:'';
  }
  if(document.getElementById('usersList')) {
    document.getElementById('usersList').innerHTML=db.users.map(u=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${u.displayName}</b><br><span class="muted">@${u.username} · ${u.active?'Activo':'Inactivo'}</span><div class="right"><button class="btn btn-secondary" onclick="editUser('${u.id}')">Modificar</button></div></div>`).join('');
  }
  if(document.getElementById('fleterosList')) {
    document.getElementById('fleterosList').innerHTML=db.fleteros.map(f=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${f.name} ${f.surname||''}</b><br><span class="muted">${f.company||'Sin empresa indicada'}</span><div class="right"><button class="btn btn-secondary" onclick="editFletero('${f.id}')">Modificar</button></div></div>`).join('');
  }
  if(document.getElementById('employeeConfigList')) {
    document.getElementById('employeeConfigList').innerHTML=db.employees.map(e=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${e.legajo} · ${e.name} ${e.surname}</b><br><span class="muted">${e.active?'Activo':'Inactivo'} · Saldo beneficio: ${e.balance||0} fardos</span><div class="right"><button class="btn btn-secondary" onclick="editEmployee('${e.id}')">Modificar</button></div></div>`).join('');
  }
}
window.renderAll = renderAll;

function saveNewOrderV11(){
 let num=document.getElementById('v11Number').value.trim(),type=document.getElementById('v11PendingType').value,lines=getNewOrderLinesV11();
 if(!num||!lines.length||!lines.some(l=>l.requestedTotal>0))return alert('Complete el número y al menos una cantidad solicitada.');
 if(db.orders.some(o=>o.number===num))return alert('El número de orden ya existe.');
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
 modal(`<div class="headrow"><div><h2>Confirmar salida · Orden ${o.number}</h2><div class="muted">${f?.name||''} · ${V11_PENDING_LABELS[o.pendingType]} · Solo se descontará lo realmente entregado.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="card v11-request-card"><h3>Pedido original</h3>${(o.requestLines||[]).map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${p?.name||l.productId}</b> · Solicitado ${equivalent(l.total,p)} · <span class="v11-pending-chip">Pendiente ${equivalent(v11LineOutstanding(l),p)}</span></div>`}).join('')}</div>
 <div class="headrow" style="margin-top:16px"><h3>Mercadería realmente entregada</h3><button class="btn btn-secondary" onclick="addPendingDispatchLineV11()">Agregar línea</button></div><div id="v11DispatchLines"></div>
 <div class="summary" style="display:none;"><div class="summarygrid"><div><span class="muted">Pallets sugeridas</span><b id="v11DispatchPalletSuggest">0</b></div><div><label>Pallets que lleva</label><input id="v11DispatchPalletOut" class="field" type="number" min="0" value="0"></div><div><label>Pallets que devuelve</label><input id="v11DispatchPalletIn" class="field" type="number" min="0" value="0"></div><div><span class="muted">Chapadur sugerido</span><b id="v11DispatchChapSuggest">0</b></div><div><label>Chapadur que lleva</label><input id="v11DispatchChapOut" class="field" type="number" min="0" value="0"></div><div><label>Chapadur que devuelve</label><input id="v11DispatchChapIn" class="field" type="number" min="0" value="0"></div></div></div>
 <label>Observaciones</label><textarea id="v11DispatchNote"></textarea><div id="v11DispatchWarning"></div>
 <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="savePendingDispatchV11('${o.id}')">Confirmar salida</button></div>`);
 (o.requestLines||[]).filter(l=>v11LineOutstanding(l)>0).forEach(l=>addPendingDispatchLineV11(l.productId,l.productId));
 if(!document.querySelector('#v11DispatchLines .v11-delivery-row'))addPendingDispatchLineV11();recalcPendingDispatchV11()
}
function v11SourceOptions(o,selected=''){return (o.requestLines||[]).filter(l=>v11LineOutstanding(l)>0||l.productId===selected).map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<option value="${l.productId}" ${l.productId===selected?'selected':''}>${p?.name||l.productId} · pendiente ${equivalent(v11LineOutstanding(l),p)}</option>`}).join('')}
function addPendingDispatchLineV11(source='',actual=''){
 let o=db.orders.find(x=>x.id===v11CurrentDispatchOrderId);if(!o)return;
 source=source||(o.requestLines||[]).find(l=>v11LineOutstanding(l)>0)?.productId||'';actual=actual||source;
 let d=document.createElement('div');d.className='v11-delivery-row';d.innerHTML=`<div class="wide"><label>Corresponde al producto solicitado</label><select class="v11Source" onchange="syncDispatchActualV11(this);recalcPendingDispatchV11()">${v11SourceOptions(o,source)}</select></div><div class="wide"><label>Producto realmente entregado</label><select class="v11Actual" onchange="this.dataset.touched='1';recalcPendingDispatchV11()">${v11ProductSelect(actual)}</select><div class="v11-help">Si es diferente, se registra como sustitución y el pendiente original queda pendiente de definición.</div></div><div><label>Fardos</label><input class="field v11DPack" type="number" min="0" value="0" oninput="recalcPendingDispatchV11()"></div><div><label>Unidades</label><input class="field v11DUnit" type="number" min="0" value="0" oninput="recalcPendingDispatchV11()"></div><button class="btn btn-danger" onclick="this.parentElement.remove();recalcPendingDispatchV11()">Quitar</button>`;document.getElementById('v11DispatchLines').appendChild(d)
}
function syncDispatchActualV11(sel){let row=sel.closest('.v11-delivery-row'),actual=row.querySelector('.v11Actual');if(!actual.dataset.touched)actual.value=sel.value}
function getPendingDispatchLinesV11(){return [...document.querySelectorAll('#v11DispatchLines .v11-delivery-row')].map(r=>{let source=r.querySelector('.v11Source').value,productId=r.querySelector('.v11Actual').value,p=db.products.find(x=>x.id===productId),n=normalize(r.querySelector('.v11DPack').value,r.querySelector('.v11DUnit').value,p);return {sourceProductId:source,productId,total:n.total}}).filter(l=>l.total>0)}
function recalcPendingDispatchV11(){let lines=getPendingDispatchLinesV11(),w=[];lines.forEach(l=>{let p=db.products.find(x=>x.id===l.productId);if(l.total>(db.stock[p.id]||0))w.push(`${p.name}: stock ${equivalent(db.stock[p.id]||0,p)}, entrega ${equivalent(l.total,p)}`)});let box=document.getElementById('v11DispatchWarning');if(box)box.innerHTML=w.length?`<div class="alert"><b>Stock insuficiente.</b><br>${w.join('<br>')}<label>Justificación obligatoria</label><textarea id="v11DispatchJustification"></textarea></div>`:''}
function savePendingDispatchV11(orderId){
 let o=db.orders.find(x=>x.id===orderId),lines=getPendingDispatchLinesV11();if(!lines.length)return alert('Ingrese al menos una cantidad realmente entregada.');
 let totals={};lines.forEach(l=>totals[l.productId]=(totals[l.productId]||0)+l.total);let shortage=Object.entries(totals).some(([pid,t])=>t>(db.stock[pid]||0)),just='';if(shortage){just=document.getElementById('v11DispatchJustification')?.value.trim()||'';if(!just)return alert('Debe justificar el stock insuficiente.')}
 lines.forEach(l=>{
   addStockMove({type:l.productId===l.sourceProductId?'Orden de carga':'Orden de carga · Sustitución',ref:o.number,productId:l.productId,total:l.total,dir:'out',note:just});
   let req=v11FindRequestLine(o,l.sourceProductId);if(req&&l.productId===l.sourceProductId){let applied=Math.min(v11LineOutstanding(req),l.total);req.resolvedTotal=Number(req.resolvedTotal||0)+applied;v11DecreasePending(o.pendingType,l.sourceProductId,applied)}
 });
 let delivery={id:uid('d'),date:now(),lines,result:'Salida confirmada',note:document.getElementById('v11DispatchNote').value,stockJustification:just,user:session.user,shift:session.shift};
 o.deliveries.push(delivery);if(lines.some(l=>l.productId!==l.sourceProductId))o.billing='Pendiente de aviso';o.status=v11OrderStatus(o);audit('Salida','Orden',o.number,o.status);save();closeModal();showPage('orders')
}






const _v11OriginalOpenMovement=openMovement;
openMovement=function(type){return _v11OriginalOpenMovement(type)};
function addNeutralMoveV11({type,ref,productId,total,note=''}){db.movements.push({id:uid('m'),date:now(),type,ref,productId,total,dir:'none',note,user:session.user,shift:session.shift});let p=db.products.find(x=>x.id===productId);audit('Movimiento sin impacto',type,ref,`${p?p.name:productId} ${p?equivalent(total,p):total}`)}


function renderRecentV11(){let box=document.getElementById('recent');if(!box)return;let ms=[...(db.movements||[])].slice(-6).reverse();box.innerHTML=ms.length?ms.map(m=>{let p=db.products.find(x=>x.id===m.productId),impact=m.dir==='in'?'+':m.dir==='out'?'-':'Sin impacto: ';return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${m.type}</b> · ${p?.name||''} · ${impact}${equivalent(m.total,p)}<br><span class="muted">${fmtDate(m.date)} · ${m.user||''} · ${m.ref||''}</span></div>`}).join(''):'<span class="muted">Aún no hay movimientos.</span>'}



addProduct = function() {
  modal(`<div class="headrow"><div><h2>Nuevo producto</h2></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Código alfanumérico</label><input type="text" id="mProdId" class="field"></div>
    <div><label>Alias de búsqueda (opcional)</label><input type="text" id="mProdAlias" class="field"></div>
    <div style="grid-column:1/-1"><label>Nombre del producto</label><input type="text" id="mProdName" class="field"></div>
    <div><label>Unidades por fardo</label><input type="number" id="mProdPack" class="field" value="6"></div>
    <div><label>Fardos por corte</label><input type="number" id="mProdCut" class="field" value="20"></div>
    <div><label>Cortes por pallet</label><input type="number" id="mProdPallet" class="field" value="4"></div>
    <div><label>Stock mínimo</label><input type="number" id="mProdMin" class="field" value="0"></div>
    <div><label>Stock crítico</label><input type="number" id="mProdCrit" class="field" value="0"></div>
    <div style="grid-column:1/-1; display:flex; align-items:center; gap:8px">
      <input type="checkbox" id="mProdBenefit" style="width:20px;height:20px"> <label style="margin:0">Habilitar en beneficio de empleados</label>
    </div>
  </div>
  <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="saveAddProduct()">Guardar</button></div>`);
  window.saveAddProduct = function() {
    let id = document.getElementById('mProdId').value.trim();
    if(!id) return alert('Código requerido');
    if(db.products.some(p=>p.id===id)) return alert('El código ya existe');
    let name = document.getElementById('mProdName').value.trim();
    if(!name) return alert('Nombre requerido');
    let alias = document.getElementById('mProdAlias').value.trim().toUpperCase();
    if(alias && db.products.some(p=>v14SearchNorm(p.alias)===v14SearchNorm(alias))) return alert('El alias ya existe');
    let pack = Number(document.getElementById('mProdPack').value) || 6;
    let perCut = Number(document.getElementById('mProdCut').value) || 20;
    let cuts = Number(document.getElementById('mProdPallet').value) || 4;
    let minStock = Number(document.getElementById('mProdMin').value) || 0;
    let criticalStock = Number(document.getElementById('mProdCrit').value) || 0;
    let employeeBenefit = document.getElementById('mProdBenefit').checked;
    db.products.push({id, name, alias, pack, perCut, cuts, minStock, criticalStock, active:true, employeeBenefit});
    db.stock[id] = 0; v1EnsureBucket(id); audit('Alta', 'Producto', id, name);
    save(); closeModal(); renderAll();
  };
};
editProduct = function(id) {
  let p = db.products.find(x => x.id === id); if(!p) return;
  modal(`<div class="headrow"><div><h2>Modificar producto</h2></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Código alfanumérico</label><input type="text" id="mProdId" class="field" value="${p.id}"></div>
    <div><label>Alias de búsqueda</label><input type="text" id="mProdAlias" class="field" value="${p.alias||''}"></div>
    <div style="grid-column:1/-1"><label>Nombre del producto</label><input type="text" id="mProdName" class="field" value="${p.name}"></div>
    <div><label>Unidades por fardo</label><input type="number" id="mProdPack" class="field" value="${p.pack}"></div>
    <div><label>Fardos por corte</label><input type="number" id="mProdCut" class="field" value="${p.perCut}"></div>
    <div><label>Cortes por pallet</label><input type="number" id="mProdPallet" class="field" value="${p.cuts}"></div>
    <div><label>Stock mínimo</label><input type="number" id="mProdMin" class="field" value="${p.minStock||0}"></div>
    <div><label>Stock crítico</label><input type="number" id="mProdCrit" class="field" value="${p.criticalStock||0}"></div>
    <div style="grid-column:1/-1; display:flex; align-items:center; gap:8px">
      <input type="checkbox" id="mProdBenefit" ${p.employeeBenefit?'checked':''} style="width:20px;height:20px"> <label style="margin:0">Habilitar beneficio empleados</label>
    </div>
    <div style="grid-column:1/-1; display:flex; align-items:center; gap:8px">
      <input type="checkbox" id="mProdActive" ${p.active!==false?'checked':''} style="width:20px;height:20px"> <label style="margin:0">Producto ACTIVO</label>
    </div>
  </div>
  <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="saveEditProduct('${id}')">Guardar</button></div>`);
  window.saveEditProduct = function(oldId) {
    let pObj = db.products.find(x => x.id === oldId);
    let nid = document.getElementById('mProdId').value.trim();
    if(!nid) return alert('Código requerido');
    if(nid !== oldId && db.products.some(x=>x.id===nid)) return alert('Ese código ya existe');
    let alias = document.getElementById('mProdAlias').value.trim().toUpperCase();
    pObj.name = document.getElementById('mProdName').value.trim() || pObj.name;
    pObj.alias = alias;
    pObj.pack = Number(document.getElementById('mProdPack').value) || pObj.pack;
    pObj.perCut = Number(document.getElementById('mProdCut').value) || pObj.perCut;
    pObj.cuts = Number(document.getElementById('mProdPallet').value) || pObj.cuts;
    pObj.minStock = Number(document.getElementById('mProdMin').value) || 0;
    pObj.criticalStock = Number(document.getElementById('mProdCrit').value) || 0;
    pObj.employeeBenefit = document.getElementById('mProdBenefit').checked;
    pObj.active = document.getElementById('mProdActive').checked;
    
    if(nid !== oldId) {
      pObj.id = nid;
      db.stock[nid] = db.stock[oldId] || 0; delete db.stock[oldId];
      if(db.stockBuckets?.[oldId]){db.stockBuckets[nid]=db.stockBuckets[oldId];delete db.stockBuckets[oldId]}
      (db.movements||[]).forEach(m=>{if(m.productId===oldId)m.productId=nid});
      (db.orders||[]).forEach(o=>{(o.requestLines||[]).forEach(l=>{if(l.productId===oldId)l.productId=nid});(o.deliveries||[]).forEach(d=>(d.lines||[]).forEach(l=>{if(l.productId===oldId)l.productId=nid;if(l.sourceProductId===oldId)l.sourceProductId=nid}))});
    }
    save(); closeModal(); renderAll();
  };
};
function renderProductsConfigV11(){let box=document.getElementById('productsList');if(!box)return;box.innerHTML=db.products.map(p=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${p.id} · ${p.name}</b><br><span class="muted">${p.pack} un/fardo · ${p.perCut} fardos/corte · ${p.cuts} cortes/pallet · Beneficio empleados: <b>${p.employeeBenefit?'Sí':'No'}</b></span><div class="right"><button class="btn btn-secondary" onclick="editProduct('${p.id}')">Modificar</button></div></div>`).join('')}




// ===== Talca Expedición v1.2: consumo de empleados con múltiples productos =====
const V12_SCHEMA_VERSION=3;

(function migrateV12(){
  if(Number(db.schemaVersion||0)<V12_SCHEMA_VERSION){
    try{v1Backup('Antes de actualizar a v1.2')}catch(err){console.error(err)}
    db.schemaVersion=V12_SCHEMA_VERSION;
    safeSet(localStorage,'talcaExpV02',JSON.stringify(db));
  }
})();



function employeeBenefitProductOptionsV12(selected=''){
  return db.products
    .filter(p=>p.active!==false&&p.employeeBenefit===true)
    .map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.id} · ${p.name}</option>`)
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
    <div><span class="muted">Saldo después del consumo</span><br><strong class="${remaining<0?'over-balance':''}">${remaining} fardos</strong></div>
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
      <div><h2>${e.name} ${e.surname}</h2><div class="muted">Legajo ${e.legajo} · ${e.active?'Activo':'Inactivo'}</div></div>
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
      <p class="muted">Compra de mercadería. Afecta el stock, pero no el saldo del beneficio.</p>
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
        }).join(' · ');
        return `<div class="history-operation"><b>${g.type}</b>${g.receiptNumber?` · ${g.receiptNumber}`:''}<br>${detail}<br><span class="muted">${fmtDate(g.date)} · ${g.user} · Turno ${g.shift}</span></div>`;
      }).join('')
      :'<span class="muted">Todavía no registra consumos ni anticipos.</span>'
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
  let detailTable=`<table><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2"><b>Total</b></td><td><b>${totalLabel}</b></td></tr></tfoot></table>`;
  let body=`<div class="receipt"><h2>${title} – FACTURACIÓN</h2><p>N.º ${number} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p>${detailTable}<p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div>
  <div class="receipt"><h2>${title} – CONTROL DE GUARDIA</h2><p>N.º ${number} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p>${detailTable}<p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p></div>`;
  setPrintableDocument(title,body);
  let area=document.getElementById('employeeReceiptArea');
  if(!area){
    alert('La operación se registró correctamente, pero no se encontró el área del comprobante.');
    return;
  }
  area.innerHTML=`<div class="card receipt-success"><div class="headrow"><div><h2>Operación registrada correctamente</h2><div class="muted">${title} · Comprobante ${number}</div></div></div>
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

  if(!items.length)return alert('Agregue al menos un producto y una cantidad válida.');

  let totalPacks=items.reduce((sum,x)=>sum+x.packs,0);
  if(totalPacks>Number(e.balance||0)){
    return alert(`Saldo insuficiente. El consumo suma ${totalPacks} fardos y el empleado dispone de ${e.balance||0}.`);
  }

  let shortages=items.filter(x=>x.n.total>Number(db.stock[x.p.id]||0));
  let justification='';
  if(shortages.length){
    let names=shortages.map(x=>x.p.name).join(', ');
    justification=prompt(`Stock insuficiente en: ${names}. Ingrese una justificación para continuar:`)||'';
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


// ===== Talca Expedición v1.3: fleteros rápidos, edición y PENDIENTE administrativo =====
const V13_SCHEMA_VERSION=4;
V11_PENDING_LABELS.administrative='PENDIENTE · Sin impacto';

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
  return [f.name,f.surname].filter(Boolean).join(' ')+(f.company?` · ${f.company}`:'');
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
  if(substitution)return 'Pendiente de Facturación';
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
  document.getElementById('v13CarrierMode').textContent='Nuevo fletero: se guardará al confirmar la orden';
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
      audit('Modificación','Fletero',f.id,`${before} → ${v13CarrierDisplay(f)}`);
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
    if(type==='administrative')info.innerHTML='<b>PENDIENTE administrativo:</b> la orden queda guardada y editable, sin afectar stock físico ni columnas de pendientes.';
    else if(immediate)info.innerHTML='<b>Salida inmediata:</b> se descontará del stock físico únicamente lo realmente entregado.';
    else info.innerHTML=`<b>${V11_PENDING_LABELS[type]}:</b> se sumará lo solicitado a esta columna. El stock físico se descontará al confirmar la salida.`;
  }
  let button=document.getElementById('v13SaveButton');
  if(button)button.textContent=v13EditingOrderId?'Guardar corrección':type==='administrative'?'Guardar como PENDIENTE':immediate?'Confirmar orden y salida':'Registrar orden operativa';
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
  if(warning)warning.innerHTML=warnings.length?`<div class="alert"><b>Stock insuficiente.</b><br>${warnings.join('<br>')}<label>Justificación obligatoria</label><textarea id="v13StockJustification"></textarea></div>`:'';
}
function v13OpenOrderEditor(existingId=''){
  let o=existingId?db.orders.find(x=>x.id===existingId):null;
  if(o&&!Array.isArray(o.requestLines))return alert('Esta orden pertenece a una versión anterior y todavía no admite edición completa.');
  v13EditingOrderId=o?.id||'';
  let carrier=o?v13OrderCarrier(o):null;
  let type=o?.pendingType||'administrative';
  let hasDeliveries=Boolean((o?.deliveries||[]).length);
  let actual=v13ActualTotals(o);
  modal(`<div class="headrow"><div><h2>${o?`Corregir orden ${v13Esc(o.number)}`:'Nueva orden de carga'}</h2><div class="muted">${o?'Los cambios conservarán el historial anterior.':'Puede dejarla como PENDIENTE sin impacto hasta que se defina su salida.'}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Fecha</label><input id="v13Date" class="field" type="date" value="${v13Esc(o?.date||new Date().toISOString().slice(0,10))}"></div>
    <div><label>Número de orden</label><input id="v13Number" class="field" value="${v13Esc(o?.number||'')}" autofocus></div>
    <div><label>Estado / afectación</label><select id="v13OrderType" onchange="v13ToggleMode()">${v13TypeOptions(type)}</select></div>
    <div><label>Estado de Facturación</label><select id="v13Billing"><option ${!o||o.billing==='No aplica'?'selected':''}>No aplica</option><option ${o?.billing==='Pendiente'?'selected':''}>Pendiente</option><option ${o?.billing==='Pagada'?'selected':''}>Pagada</option><option ${o?.billing==='Pendiente de aviso'?'selected':''}>Pendiente de aviso</option><option ${o?.billing==='Corregida'?'selected':''}>Corregida</option></select></div>
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
    ${o?'<div class="span3"><label>Motivo de la corrección</label><textarea id="v13CorrectionReason" placeholder="Obligatorio para guardar cambios"></textarea></div>':''}
  </div>
  ${hasDeliveries?'<div class="alert"><b>La orden ya tiene salidas confirmadas.</b> Puede corregir datos generales y cantidades solicitadas. El historial de entregas seguirá visible; no se elimina.</div>':''}
  <div id="v13ModeInfo" class="alert v13-mode-card"></div>
  <div class="lineitems"><div class="headrow"><h3>Productos de la orden</h3><button type="button" class="btn btn-secondary" onclick="v13AddOrderLine()">Agregar producto</button></div><div id="v13OrderLines"></div></div>
  <div id="v13StockWarning"></div>
  <div class="right" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button id="v13SaveButton" class="btn btn-primary" onclick="v13SaveOrder()">Guardar orden</button></div>`);
  let lines=o?.requestLines?.length?o.requestLines:[null];
  lines.forEach(l=>v13AddOrderLine(l,l?Number(actual[l.productId]||0):0));
  if(hasDeliveries){
    let select=document.getElementById('v13OrderType');
    // Después de una salida no se permite volver a un estado administrativo ni alterar el circuito general.
    [...select.options].forEach(opt=>{
      if(o.pendingType==='immediate')opt.disabled=opt.value!=='immediate';
      else if(v13IsOperational(o.pendingType))opt.disabled=opt.value==='administrative'||opt.value==='immediate';
    });
  }
  v13ToggleMode();
}


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
  addStockMove({type:isCorrection?'Corrección de orden de carga':'Orden de carga',ref:o.number,productId,total,dir,note});
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
  if(!number||!date)return alert('Complete número de orden y fecha.');
  if(existing&&!correctionReason)return alert('Ingrese el motivo de la corrección.');
  if(db.orders.some(o=>o.number===number&&o.id!==existing?.id))return alert('El número de orden ya existe.');

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
      palletOut:0,palletIn:0,
      chapOut:0,chapIn:0
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
    audit('Corrección','Orden',number,correctionReason);
  }else{
    db.orders.push(o);
    audit('Alta','Orden',number,type==='administrative'?'PENDIENTE sin impacto':V11_PENDING_LABELS[type]);
  }
  save();closeModal();showPage('orders');
}







exportPendingCSV=function(){
  let rows=[['Orden','Fecha','Fletero','Tipo','Producto','Solicitado','Resuelto','Pendiente','Estado','Facturación']];
  (db.orders||[]).filter(o=>Array.isArray(o.requestLines)&&v13IsOperational(o.pendingType)).forEach(o=>{
    let f=v13OrderCarrier(o);
    o.requestLines.forEach(l=>{
      let p=db.products.find(x=>x.id===l.productId),pending=v11LineOutstanding(l);
      if(pending>0)rows.push([o.number,o.date,v13CarrierDisplay(f),V11_PENDING_LABELS[o.pendingType],p?.name||l.productId,equivalent(l.total,p),equivalent(Math.min(l.total,l.resolvedTotal||0),p),equivalent(pending,p),v11OrderStatus(o),o.billing||'No aplica']);
    });
  });
  downloadCSV('pendientes_operativos.csv',rows);
};



document.addEventListener('click',event=>{
  let box=document.getElementById('v13CarrierResults');
  if(box&&!event.target.closest('.v13-carrier-search'))box.classList.add('hidden');
});


// ===== Talca Expedición v1.4: operación rápida, producción sin codificar y A4 =====
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


// Sin codificar deja de ser una afectación posible de las órdenes.
v13IsOperational=function(type){
  return ['preventa','distriC','distriInterior','oesteMendoza','oesteJeremias'].includes(type);
};
v13TypeOptions=function(selected='administrative'){
  let keys=['administrative','preventa','distriC','distriInterior','oesteMendoza','oesteJeremias','immediate'];
  let html=keys.map(k=>`<option value="${k}" ${selected===k?'selected':''}>${V11_PENDING_LABELS[k]}</option>`).join('');
  if(selected==='sinCodificar')html=`<option value="sinCodificar" selected disabled>Sin codificar · histórico</option>`+html;
  return html;
};
v11OrderStatus=function(o){
  if(o.pendingType==='administrative')return 'PENDIENTE';
  if(o.pendingType==='immediate')return o.status||'Despachada';
  let outstanding=v11OrderOutstanding(o),delivered=v11DeliveredTotal(o);
  let substitution=(o.deliveries||[]).some(d=>(d.lines||[]).some(l=>l.sourceProductId&&l.sourceProductId!==l.productId));
  if(outstanding===0)return 'Despachada';
  if(substitution)return 'Pendiente de definición';
  if(delivered>0)return 'Parcialmente despachada';
  return 'Pendiente de despacho';
};

// El total mantiene todas las columnas; la cobertura usa solamente mercadería entregable.
function v14DeliverableStock(bucket){return Math.max(0,Number(bucket.physical||0)-Number(bucket.sinCodificar||0))}
v1Pct=function(bucket){
  let total=v1PendingTotal(bucket);
  if (total === 0) return null;
  let deliverable=v14DeliverableStock(bucket);
  if (deliverable === 0) return -100;
  return ((deliverable-total)/deliverable)*100;
};
v1State=function(bucket){
  let total=v1PendingTotal(bucket);
  if(total===0)return 'Sin pendientes';
  return v14DeliverableStock(bucket)>=total?'Disponible':'Insuficiente';
};

openPendingEditorV1=function(pid){
  let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid);
  modal(`<div class="headrow"><div><h2>Pendientes · ${v14Text(p.name)}</h2><div class="muted">“Sin codificar” se alimenta únicamente desde el ingreso de producción.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    ${v1PendingField('Preventa pendiente','preventa',b.preventa,p)}
    ${v1PendingField('Distri C pendiente','distriC',b.distriC,p)}
    ${v1PendingField('Distri Interior','distriInterior',b.distriInterior,p)}
    ${v1PendingField('Oeste Mendoza pendiente','oesteMendoza',b.oesteMendoza,p)}
    ${v1PendingField('Oeste Jeremías pendiente','oesteJeremias',b.oesteJeremias,p)}
  </div>
  <label>Justificación / referencia</label><textarea id="v1PendingNote"></textarea>
  <div class="right"><button class="btn btn-primary" onclick="savePendingV14('${pid}')">Guardar pendientes</button></div>`);
};
function savePendingV14(pid){
  let p=db.products.find(x=>x.id===pid),b=v1EnsureBucket(pid),before=clone(b);
  ['preventa','distriC','distriInterior','oesteMendoza','oesteJeremias'].forEach(k=>{
    b[k]=normalize(document.getElementById(k+'Pack').value,document.getElementById(k+'Unit').value,p).total;
  });
  audit('Modificación','Pendientes',pid,JSON.stringify({before,after:b,note:document.getElementById('v1PendingNote').value}));
  save();closeModal();renderStockV1();
}
function v15AddFardos(totals, key, total, p) {
  totals[key] = (totals[key] || 0) + (Number(total || 0) / p.pack);
}
renderStockV1=function(){
  if(!document.getElementById('stockBody'))return;
  let q=v14SearchNorm(document.getElementById('stockSearchV1')?.value||''),filter=document.getElementById('stockStateV1')?.value||'';
  let list=(db.products||[]).filter(p=>p.active!==false).filter(p=>{
    let hay=v14SearchNorm(`${p.id} ${p.alias||''} ${p.name}`);
    return !q||hay.includes(q);
  }).filter(p=>!filter||v1State(v1EnsureBucket(p.id))===filter);
  let totals={physical:0,deliverable:0,preventa:0,distriC:0,distriInterior:0,sinCodificar:0,oesteMendoza:0,oesteJeremias:0,pending:0};
  let rows=list.map(p=>{
    let b=v1EnsureBucket(p.id),total=v1PendingTotal(b),pct=v1Pct(b),state=v1State(b),deliverable=v14DeliverableStock(b);
    v15AddFardos(totals,'physical',b.physical,p);v15AddFardos(totals,'deliverable',deliverable,p);v15AddFardos(totals,'preventa',b.preventa,p);v15AddFardos(totals,'distriC',b.distriC,p);v15AddFardos(totals,'distriInterior',b.distriInterior,p);v15AddFardos(totals,'sinCodificar',b.sinCodificar,p);v15AddFardos(totals,'oesteMendoza',b.oesteMendoza,p);v15AddFardos(totals,'oesteJeremias',b.oesteJeremias,p);v15AddFardos(totals,'pending',total,p);
    let percentage=total===0
      ?'<span class="status partial">Sin pendientes</span>'
      :`<span class="status ${state==='Insuficiente'?'danger':'done'}">${pct.toFixed(1)}%</span><br><span class="muted">${state}</span>`;
    return `<tr>
      <td><b>${v14Text(p.id)}</b>${p.alias?` · <span class="status partial">${v14Text(p.alias)}</span>`:''}<br>${v14Text(p.name)}</td>
      <td>${equivalent(b.physical,p)}<br><span class="muted">Entregable: ${equivalent(deliverable,p)}</span></td>
      <td>${equivalent(b.preventa,p)}</td><td>${equivalent(b.distriC,p)}</td><td>${equivalent(b.distriInterior,p)}</td>
      <td>${equivalent(b.sinCodificar,p)}</td><td>${equivalent(b.oesteMendoza,p)}</td><td>${equivalent(b.oesteJeremias,p)}</td>
      <td><b>${equivalent(total,p)}</b></td><td>${percentage}</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="openPendingEditorV1('${p.id}')">Editar pendientes</button></td>
    </tr>`;
  }).join('');
  let globalPct=totals.pending===0?null:(totals.physical===0?0:((totals.physical-totals.pending)*100)/totals.physical);
  let totalRow=`<tr class="v15-stock-total" style="background:var(--soft);font-weight:bold;border-top:2px solid var(--line);"><td>TOTAL</td><td>${v15FormatFardos(totals.physical)}<br><span class="muted" style="font-weight:normal">Entregable: ${v15FormatFardos(totals.deliverable)}</span></td><td>${v15FormatFardos(totals.preventa)}</td><td>${v15FormatFardos(totals.distriC)}</td><td>${v15FormatFardos(totals.distriInterior)}</td><td>${v15FormatFardos(totals.sinCodificar)}</td><td>${v15FormatFardos(totals.oesteMendoza)}</td><td>${v15FormatFardos(totals.oesteJeremias)}</td><td>${v15FormatFardos(totals.pending)}</td><td>${globalPct===null?'<span class="status partial" style="font-weight:normal">Sin pendientes</span>':`<b>${globalPct.toFixed(1)}%</b><br><span class="muted" style="font-weight:normal">Cobertura global</span>`}</td><td class="no-print"></td></tr>`;
  stockBody.innerHTML=rows+totalRow;
};
exportStockV1CSV=function(){
  let rows=[['Código','Alias','Producto','Stock físico','Stock entregable','Preventa','Distri C','Distri Interior','Sin codificar','Oeste Mendoza','Oeste Jeremías','Total pendiente','% disponible']];
  (db.products||[]).filter(p=>p.active!==false).forEach(p=>{
    let b=v1EnsureBucket(p.id),total=v1PendingTotal(b),pct=v1Pct(b);
    rows.push([p.id,p.alias||'',p.name,equivalent(b.physical,p),equivalent(v14DeliverableStock(b),p),equivalent(b.preventa,p),equivalent(b.distriC,p),equivalent(b.distriInterior,p),equivalent(b.sinCodificar,p),equivalent(b.oesteMendoza,p),equivalent(b.oesteJeremias,p),equivalent(total,p),pct===null?'Sin pendientes':pct.toFixed(1)+'%']);
  });
  downloadCSV('stock_y_pendientes.csv',rows);
};

// Producción codificada / sin codificar.
const _v14LegacyOpenMovement=openMovement;
openMovement=function(type){
  if(type!=='Producción')return _v14LegacyOpenMovement(type);
  modal(`<div class="headrow"><div><h2>Ingreso de producción</h2><div class="muted">La producción sin codificar suma al stock físico, pero queda bloqueada para entrega.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Fecha</label><input id="mDate" type="date" class="field" value="${new Date().toISOString().slice(0,10)}"></div>
    <div><label>Clasificación</label><select id="v14ProductionClass" onchange="v14UpdateProductionInfo()"><option value="coded">Producción codificada</option><option value="uncoded">Producción sin codificar</option></select></div>
    <div class="span3"><label>Referencia / observación</label><input id="mRef" class="field" placeholder="Opcional"></div>
  </div>
  <div id="v14ProductionInfo" class="v14-production-mode"></div>
  <div class="lineitems"><div class="headrow"><h3>Productos</h3><button class="btn btn-secondary" onclick="addMovementLine()">Agregar</button></div><div id="movementLines"></div></div>
  <div class="right"><button class="btn btn-primary" onclick="saveProductionV14()">Guardar producción</button></div>`);
  addMovementLine();v14UpdateProductionInfo();
};
function v14UpdateProductionInfo(){
  let uncoded=document.getElementById('v14ProductionClass')?.value==='uncoded';
  let box=document.getElementById('v14ProductionInfo');if(!box)return;
  box.innerHTML=uncoded
    ?'<b>Sin codificar:</b> aumenta el stock físico y también la columna Sin codificar. No queda disponible para entregar.'
    :'<b>Codificada:</b> aumenta el stock físico y queda disponible para las operaciones.';
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
      type:uncoded?'Producción sin codificar':'Producción',
      ref:document.getElementById('mRef').value||'Producción',
      productId:p.id,total:n.total,dir:'in',
      note:uncoded?'Mercadería física no habilitada para entrega':''
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

// Alias y configuración de productos.


function v14RenderProductConfig(){
  let list=document.getElementById('productsList');if(!list)return;
  list.innerHTML=db.products.map(p=>`<div style="padding:7px 0;border-bottom:1px solid var(--line)">
    <b>${v14Text(p.id)}${p.alias?` · ${v14Text(p.alias)}`:''} · ${v14Text(p.name)}</b><br>
    <span class="muted">${p.pack} un/fardo · ${p.perCut} fardos/corte · ${p.cuts} cortes/pallet · Beneficio: ${p.employeeBenefit?'Sí':'No'}</span>
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
  box.innerHTML=list.length?list.map(p=>`<button type="button" onclick="v14ChooseDraftProduct('${p.id}')"><b>${v14Text(p.alias||p.id)} · ${v14Text(p.name)}</b><br><span class="muted">Código ${v14Text(p.id)}</span></button>`).join(''):'<div class="muted" style="padding:10px">Sin coincidencias.</div>';
  box.classList.remove('hidden');
}
function v14ChooseDraftProduct(id){
  let p=db.products.find(x=>x.id===id);if(!p)return;
  v14DraftProductId=id;
  document.getElementById('v14ProductSearch').value=`${p.alias||p.id} · ${p.name}`;
  document.getElementById('v14ProductResults').classList.add('hidden');
  let pack=document.getElementById('v14DraftPack');pack.focus();pack.select();
}
function v14ProductSearchKey(event){
  if(event.key!=='Enter')return;
  event.preventDefault();
  let list=v14ProductMatches(event.currentTarget.value);
  if(!list.length)return toast('No se encontró el producto por código, alias o nombre.', 'error');
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
    <div class="product-name"><b>${v14Text(p.alias||p.id)} · ${v14Text(p.name)}</b><small>Código ${v14Text(p.id)}</small></div>
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
  let rows=Array.from(box.children);
  rows.sort((a,b)=>(a.dataset.productId||'').localeCompare((b.dataset.productId||''),undefined,{numeric:true,sensitivity:'base'}));
  rows.forEach(r=>box.appendChild(r));
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
  if(!p)return toast('Seleccione un producto válido.', 'error');
  let n=normalize(document.getElementById('v14DraftPack').value,document.getElementById('v14DraftUnit').value,p);
  if(!n.total)return toast('Ingrese una cantidad en fardos o unidades.', 'error');
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
  v13RecalcOrder();
  setTimeout(() => {
    let searchInput = document.getElementById('v14ProductSearch');
    if (searchInput) searchInput.focus();
  }, 50);
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
  let list = [...grouped.values()]; list.sort((a,b)=>a.productId.localeCompare(b.productId)); return list;
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
  if(warning)warning.innerHTML=warnings.length?`<div class="alert"><b>Stock entregable insuficiente.</b><br>${warnings.join('<br>')}<label>Justificación obligatoria</label><textarea id="v13StockJustification"></textarea></div>`:'';
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
    if(type==='administrative')info.innerHTML='<b>PENDIENTE administrativo:</b> queda guardada sin afectar stock físico ni pendientes operativos.';
    else if(immediate)info.innerHTML='<b>Salida inmediata:</b> descuenta del stock entregable lo confirmado.';
    else info.innerHTML=`<b>${V11_PENDING_LABELS[type]}:</b> suma lo solicitado a esta columna. El stock físico cambia al confirmar la salida.`;
  }
  let button=document.getElementById('v13SaveButton');
  if(button)button.textContent=v13EditingOrderId?'Guardar corrección':type==='administrative'?'Guardar como PENDIENTE':immediate?'Confirmar orden y salida':'Registrar orden operativa';
  v13RecalcOrder();
};

function v13OpenOrderEditor(existingId=''){
  let o=existingId?db.orders.find(x=>x.id===existingId):null;
  if(o&&!Array.isArray(o.requestLines))return alert('Esta orden pertenece a una versión anterior y todavía no admite edición completa.');
  v13EditingOrderId=o?.id||'';
  let carrier=o?v13OrderCarrier(o):null,type=o?.pendingType||'administrative';
  let hasDeliveries=Boolean((o?.deliveries||[]).length),actual=v13ActualTotals(o);
  modal(`<div class="headrow"><div><h2>${o?`Corregir orden ${v14Text(o.number)}`:'Nueva orden de carga'}</h2><div class="muted">${o?'Los cambios conservarán el historial anterior.':'Puede quedar como PENDIENTE sin impacto hasta definir su salida.'}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Fecha</label><input id="v13Date" class="field" type="date" value="${v14Text(o?.date||new Date().toISOString().slice(0,10))}"></div>
    <div><label>Número de orden</label><input id="v13Number" class="field" autofocus value="${v14Text(o?.number||'')}"></div>
    <div><label>Estado / afectación</label><select id="v13OrderType" onchange="v13ToggleMode()">${v13TypeOptions(type)}</select></div>
    <input id="v13Billing" type="hidden" value="No aplica">
    <div class="span3 v14-carrier-compact">
      <div class="v13-carrier-search"><label>Fletero · nombre, apellido o empresa</label><input id="v13CarrierSearch" class="field" autocomplete="off" value="${v14Text(carrier?v13CarrierDisplay(carrier):'')}" placeholder="Comience a escribir…" oninput="v13SearchCarriers()" onfocus="v13SearchCarriers()"><div id="v13CarrierResults" class="v13-autocomplete hidden"></div></div>
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
    ${o?'<div class="span3"><label>Motivo de la corrección</label><textarea id="v13CorrectionReason" placeholder="Obligatorio para guardar cambios"></textarea></div>':''}
  </div>
  ${hasDeliveries?'<div class="alert"><b>La orden ya tiene salidas confirmadas.</b> El historial de entregas no se eliminará.</div>':''}
  <div id="v13ModeInfo" class="alert v13-mode-card"></div>
  <div class="lineitems">
    <div class="v14-draft">
      <h3 style="margin-top:0">Agregar nuevo producto</h3>
      <div class="v14-draft-grid">
        <div class="v14-product-search"><label>Código, alias o nombre</label><input id="v14ProductSearch" class="field" autocomplete="off" placeholder="Ej.: 5670, CO3, NA3, BID…" oninput="v14SearchDraftProducts()" onkeydown="v14ProductSearchKey(event)"><div id="v14ProductResults" class="v14-product-results hidden"></div></div>
        <div><label>Fardos</label><input id="v14DraftPack" class="field" type="number" min="0" value="0" onkeydown="v14DraftPackKey(event)"></div>
        <div><label>Unidades</label><input id="v14DraftUnit" class="field" type="number" min="0" value="0" onkeydown="v14DraftUnitKey(event)"></div>
        <button type="button" class="btn btn-primary" onclick="v14ConfirmDraftProduct()">Agregar</button>
      </div>
    </div>
    <h3>Productos ya cargados</h3>
    <div id="v14EmptyLines" class="v14-empty">Todavía no se agregaron productos.</div>
    <div id="v14ConfirmedLines" class="v14-confirmed-list"></div>
  </div>
  <div id="v13Materials" class="summary" style="display:none;"><div class="summarygrid">
    <div><span class="muted">Pallets sugeridas</span><b id="v13SuggestPallet">0</b></div>
    <div><label>Pallets que lleva</label><input id="v13PalletOut" class="field" type="number" min="0" value="0"></div>
    <div><label>Pallets que devuelve</label><input id="v13PalletIn" class="field" type="number" min="0" value="0"></div>
    <div><span class="muted">Chapadur sugerido</span><b id="v13SuggestChap">0</b></div>
    <div><label>Chapadur que lleva</label><input id="v13ChapOut" class="field" type="number" min="0" value="0"></div>
    <div><label>Chapadur que devuelve</label><input id="v13ChapIn" class="field" type="number" min="0" value="0"></div>
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

// El guardado de v1.3 sigue utilizándose, con el Estado de Facturación oculto.
const _v14V13SaveOrder=v13SaveOrder;
v13SaveOrder=function(){
  if(document.getElementById('v13OrderType')?.value==='sinCodificar')return alert('Seleccione una afectación operativa válida o PENDIENTE. Sin codificar ya no corresponde a órdenes.');
  if(document.getElementById('v13OrderType')?.value==='immediate'){
    let blocked=v13CollectLines().filter(l=>{let physical=Number(db.stock[l.productId]||0),deliverable=v14DeliverableStock(v1EnsureBucket(l.productId));return l.actualTotal>deliverable&&l.actualTotal<=physical});
    if(blocked.length){
      let detail=blocked.map(l=>{let p=db.products.find(x=>x.id===l.productId);return `${p.name}: entregable ${equivalent(v14DeliverableStock(v1EnsureBucket(p.id)),p)}, solicitado ${equivalent(l.actualTotal,p)}`}).join('\n');
      return alert('La salida incluye mercadería sin codificar o supera el stock entregable:\n'+detail);
    }
  }
  return _v14V13SaveOrder();
};

// Pendientes y detalle sin Estado de Facturación.
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

function viewOrder(id){
  let o=db.orders.find(x=>x.id===id);if(!o)return;
  let f=v13OrderCarrier(o),modern=Array.isArray(o.requestLines),outstanding=modern?v11OrderOutstanding(o):0;
  let requests=modern?`<div class="card v11-request-card"><h3>Solicitud</h3>${o.requestLines.map(l=>{let p=db.products.find(x=>x.id===l.productId);return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${v14Text(p?.name||l.productId)}</b>: ${equivalent(l.total,p)} · Resuelto ${equivalent(Math.min(l.total,l.resolvedTotal||0),p)} · <b>Restante ${equivalent(v11LineOutstanding(l),p)}</b></div>`}).join('')}</div>`:'';
  let deliveries=(o.deliveries||[]).map((d,i)=>`<div class="card" style="margin-top:10px"><b>Salida ${i+1}</b> · ${fmtDate(d.date)} · ${v14Text(d.user||'')} · Turno ${v14Text(d.shift||'')}<br><br>${(d.lines||[]).map(l=>{let p=db.products.find(x=>x.id===l.productId),s=db.products.find(x=>x.id===(l.sourceProductId||l.productId)),change=l.sourceProductId&&l.sourceProductId!==l.productId?` <span class="status open">Sustituye a ${v14Text(s?.name||l.sourceProductId)}</span>`:'';return `<b>${v14Text(p?.name||l.productId)}</b>: ${equivalent(l.total,p)}${change}`}).join('<br>')}<br><span class="muted">Pallets: sale ${d.palletOut||0}, entra ${d.palletIn||0}. Chapadur: sale ${d.chapOut||0}, entra ${d.chapIn||0}.</span></div>`).join('')||'<div class="card" style="margin-top:10px"><span class="muted">Todavía no se confirmó ninguna salida.</span></div>';
  let history=(o.editHistory||[]).slice().reverse().map(h=>`<div class="v13-edit-history"><b>${fmtDate(h.date)} · ${v14Text(h.user||'')} · Turno ${v14Text(h.shift||'')}</b><br>${v14Text(h.reason||'Sin motivo indicado')}</div>`).join('');
  let status=modern?v11OrderStatus(o):o.status;
  modal(`<div class="headrow"><div><h2>Orden ${v14Text(o.number)}</h2><div class="muted">${v14Text(v13CarrierDisplay(f))} · ${v14Text(o.date)} · ${v14Text(V11_PENDING_LABELS[o.pendingType||'legacy']||'Operación histórica')}</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="summary"><b>Estado: ${v14Text(status)}</b>${modern&&v13IsOperational(o.pendingType)?` · Pendiente total: ${outstanding} unidades`:''}<br><span class="muted">${v14Text(o.note||'Sin observaciones')}</span></div>
  ${requests}${deliveries}${history?`<div class="card" style="margin-top:10px"><h3>Historial de correcciones</h3>${history}</div>`:''}
  <div class="right" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal();openOrderForm('${o.id}')">Corregir orden</button>${modern&&v13IsOperational(o.pendingType)&&outstanding>0?`<button class="btn btn-primary" onclick="closeModal();openPendingDispatchV11(db.orders.find(x=>x.id==='${o.id}'))">Confirmar salida</button>`:''}<button class="btn btn-secondary" onclick="v16PrintOrder('${o.id}')">Imprimir</button></div>`);
}

// Resumen del turno centrado en órdenes y productos.
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
      return `<tr><td>${v14Text(p?.alias||p?.id||pid)} · ${v14Text(p?.name||pid)}</td><td>${req?equivalent(req,p):'—'}</td><td>${del?equivalent(del,p):'—'}</td><td>${out?equivalent(out,p):'—'}</td></tr>`;
    }).join('');
    let events=[];
    if(v14DatePart(o.createdAt)===today&&o.createdShift===shift)events.push('Orden registrada');
    if(Object.values(delivered).some(Boolean))events.push('Salida confirmada');
    if((o.editHistory||[]).some(e=>v14DatePart(e.date)===today&&e.shift===shift))events.push('Orden corregida');
    return `<div class="v14-shift-order"><h3>Orden ${v14Text(o.number)} · ${v14Text(v13CarrierDisplay(f))}</h3><p><b>${v14Text(V11_PENDING_LABELS[o.pendingType]||'Operación')}</b> · Estado: ${v14Text(v11OrderStatus(o))} · ${events.join(' / ')}</p><table><thead><tr><th>Producto</th><th>Solicitado</th><th>Entregado en turno</th><th>Pendiente actual</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Sin productos detallados.</td></tr>'}</tbody></table></div>`;
  }).join('');
  let mats=(db.materialMoves||[]).filter(m=>v14DatePart(m.date)===today&&m.shift===shift);
  let other=(db.movements||[]).filter(m=>v14DatePart(m.date)===today&&m.shift===shift&&!String(m.type||'').includes('Orden de carga')&&!String(m.type||'').includes('Corrección de orden'));
  let otherRows=other.map(m=>{let p=db.products.find(x=>x.id===m.productId);return `<tr><td>${v14Text(m.type)}</td><td>${v14Text(m.ref)}</td><td>${v14Text(p?.name||m.productId)}</td><td>${m.dir==='neutral'?'Sin impacto':(m.dir==='in'?'+':'-')+equivalent(m.total,p)}</td></tr>`}).join('');
  let body=`<h1>Resumen de turno</h1><p><b>Fecha:</b> ${today} · <b>Turno:</b> ${v14Text(shift)} · <b>Encargado:</b> ${v14Text(session.user)}</p>
  <h2>Órdenes de carga trabajadas</h2>${orderBlocks||'<p>No se registraron ni despacharon órdenes durante este turno.</p>'}
  <h2>Materiales</h2><p>Pallets entregadas: ${mats.reduce((s,m)=>s+Number(m.palletOut||0),0)} · devueltas: ${mats.reduce((s,m)=>s+Number(m.palletIn||0),0)} · Chapadur entregado: ${mats.reduce((s,m)=>s+Number(m.chapOut||0),0)} · devuelto: ${mats.reduce((s,m)=>s+Number(m.chapIn||0),0)}</p>
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
    return `<section class="v14-receipt-half"><h2>${v14Text(title)} · ${destination}</h2><p><b>N.º:</b> ${v14Text(number)} · <b>Fecha:</b> ${fmtDate(now())}</p><p><b>Empleado:</b> ${v14Text(e.name)} ${v14Text(e.surname)} · <b>Legajo:</b> ${v14Text(e.legajo)}</p><table><thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2"><b>Total</b></td><td><b>${totalLabel}</b></td></tr></tfoot></table><p><b>Encargado:</b> ${v14Text(session.user)} · <b>Turno:</b> ${v14Text(session.shift)}</p>${signature?'<p style="margin-top:12mm">Firma empleado: ______________________________</p>':''}</section>`;
  }
  let body=`<div class="v14-receipt-sheet">${half('FACTURACIÓN',true)}${half('CONTROL DE GUARDIA',false)}</div>`;
  setPrintableDocument(title,body);
  let area=document.getElementById('employeeReceiptArea');
  if(!area)return alert('La operación se registró correctamente, pero no se encontró el área del comprobante.');
  area.innerHTML=`<div class="card receipt-success"><div class="headrow"><div><h2>Operación registrada correctamente</h2><div class="muted">${v14Text(title)} · Comprobante ${v14Text(number)} · Una hoja A4</div></div></div>${body}<div class="receipt-actions no-print"><button class="btn btn-secondary" onclick="document.getElementById('employeeReceiptArea').classList.add('hidden')">Cerrar</button><button class="btn btn-secondary" onclick="openPrintableDocument()">Vista imprimible</button><button class="btn btn-primary" onclick="printCurrentDocument()">Imprimir / Guardar como PDF</button></div></div>`;
  area.classList.remove('hidden');area.scrollIntoView({behavior:'smooth',block:'start'});
};


// Las salidas de órdenes pendientes también respetan el stock entregable.
recalcPendingDispatchV11=function(){
  let lines=getPendingDispatchLinesV11(),occ=0,cuts=0,totals={};
  lines.forEach(l=>{totals[l.productId]=(totals[l.productId]||0)+l.total;let p=db.products.find(x=>x.id===l.productId);occ+=l.total/(p.pack*p.perCut*p.cuts);if(l.total)cuts+=Math.ceil(l.total/(p.pack*p.perCut))});
  let blocked=[],shortages=[];
  Object.entries(totals).forEach(([pid,total])=>{let p=db.products.find(x=>x.id===pid),physical=Number(db.stock[pid]||0),deliverable=v14DeliverableStock(v1EnsureBucket(pid));if(total>deliverable&&total<=physical)blocked.push(`${p.name}: entregable ${equivalent(deliverable,p)}, entrega ${equivalent(total,p)}`);else if(total>physical)shortages.push(`${p.name}: stock físico ${equivalent(physical,p)}, entrega ${equivalent(total,p)}`)});

  let warning=document.getElementById('v11DispatchWarning');
  if(warning){
    if(blocked.length)warning.innerHTML=`<div class="alert"><b>No se puede confirmar la salida.</b><br>${blocked.join('<br>')}<br><span class="muted">La diferencia corresponde a mercadería sin codificar, no habilitada para entrega.</span></div>`;
    else if(shortages.length)warning.innerHTML=`<div class="alert"><b>Stock físico insuficiente.</b><br>${shortages.join('<br>')}<label>Justificación obligatoria</label><textarea id="v11DispatchJustification"></textarea></div>`;
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

// Actualización visual final.


document.addEventListener('click',event=>{
  let box=document.getElementById('v14ProductResults');
  if(box&&!event.target.closest('.v14-product-search'))box.classList.add('hidden');
});


// ===== Talca Expedición v1.5 =====
// 1) Confirmación de pendientes precargada.
// 2) Resumen de órdenes expresado en fardos.
// 3) Totales al pie de la tabla de stock.

const V15_SCHEMA_VERSION=6;



function v15FardosEquivalent(total,p){
  if(!p||!Number(p.pack))return 0;
  return Number(total||0)/Number(p.pack);
}
function v15FormatNumber(value,max=2){
  let n=Number(value||0);
  return n.toLocaleString('es-AR',{minimumFractionDigits:Number.isInteger(n)?0:0,maximumFractionDigits:max});
}
function v15FormatFardos(value){
  if (typeof v1StockUnit !== 'undefined' && v1StockUnit === 'pallets') {
    let pallets = Math.floor(value / 80);
    let remFardos = Math.floor(value % 80);
    let parts = [];
    if (pallets > 0) parts.push(`${pallets} pl`);
    if (remFardos > 0 || pallets === 0) parts.push(`${v15FormatNumber(remFardos)} fardos`);
    return parts.join(' + ');
  }
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

// ---------- Confirmación de órdenes pendientes ----------
// Si la línea viene de la orden, se precarga con TODO lo que queda pendiente.
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
      <div class="v11-help">Si es diferente, se registra como sustitución y el pendiente original queda pendiente de definición.</div>
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

  // Si el operador todavía no modificó las cantidades, actualizamos el valor
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
  modal(`<div class="headrow"><div><h2>Confirmar salida · Orden ${v14Text(o.number)}</h2><div class="muted">${v14Text(f?.name||'')} · ${v14Text(V11_PENDING_LABELS[o.pendingType])} · Solo se descontará lo realmente entregado.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="v15-prefill-note"><b>Carga rápida:</b> las cantidades ya están completadas con lo que queda pendiente según la orden. Si algo no sale, modifique solamente esa cantidad antes de confirmar.</div>
  <div class="card v11-request-card"><h3>Pedido original</h3>${(o.requestLines||[]).map(l=>{
    let p=db.products.find(x=>x.id===l.productId);
    return `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b>${v14Text(p?.name||l.productId)}</b> · Solicitado ${equivalent(l.total,p)} · <span class="v11-pending-chip">Pendiente ${equivalent(v11LineOutstanding(l),p)}</span></div>`;
  }).join('')}</div>
  <div class="headrow" style="margin-top:16px"><h3>Mercadería realmente entregada</h3><button class="btn btn-secondary" onclick="addPendingDispatchLineV11('', '', 0)">Agregar línea</button></div>
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

// ---------- Listado de órdenes: fardos ----------




// Aseguramos que el render general utilice las versiones v1.5.



// ===== Talca Expedición v1.6 =====
const V16_SCHEMA_VERSION=7;
let currentPrintKind='report';
let v16LastReceipt=null;




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
  if(t.startsWith('Corrección de orden de carga'))return 'Orden de carga';
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
  // Para registros históricos sin operationId se agrupan las líneas creadas en el mismo segundo.
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
  }).join('')||'<tr><td colspan="5" class="muted">No hay órdenes pendientes con los filtros seleccionados.</td></tr>';
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
    justification=prompt('Hay stock insuficiente. Ingrese una justificación para continuar:')||'';
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
      note:[note,justification].filter(Boolean).join(' · ')
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




// ------------------------------------------------------------------
// IMPRESIÓN: un único sistema y limpieza del documento previo
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
  // Se copia sólo el contenido visible del reporte. Los controles quedan fuera.
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

// Orden de carga: documento específico en vez de window.print() directo.
function v16PrintOrder(id){
  let o=db.orders.find(x=>x.id===id);if(!o)return;
  let f=v13OrderCarrier(o);
  let status=Array.isArray(o.requestLines)?v11OrderStatus(o):(o.status||'');
  let type=V11_PENDING_LABELS[o.pendingType||'legacy']||'Histórica';

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
    }).join(' · ');
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
      <div><b>Turno / encargado</b><br>${v14Text(o.createdShift||'')} · ${v14Text(o.createdBy||'')}</div>
    </div>
    <h2>Productos solicitados</h2>
    <table><thead><tr><th>Código</th><th>Producto</th><th>Solicitado</th><th>Resuelto</th><th>Pendiente</th></tr></thead>
    <tbody>${requests||'<tr><td colspan="5">Sin detalle disponible.</td></tr>'}</tbody></table>
    <h2 style="margin-top:16px">Salidas registradas</h2>
    <table><thead><tr><th>#</th><th>Fecha</th><th>Productos</th><th>Planch. sale</th><th>Planch. vuelve</th><th>Chap. sale</th><th>Chap. vuelve</th></tr></thead>
    <tbody>${deliveries||'<tr><td colspan="7">Sin salidas confirmadas.</td></tr>'}</tbody></table>
  </div>`;
  setPrintableDocument(`Orden de carga ${o.number}`,body,'order');
  printCurrentDocument();
}

// Sustituir únicamente el botón de impresión del modal actual.


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
      <p><b>N.º:</b> ${v14Text(number)} &nbsp; · &nbsp; <b>Fecha:</b> ${fmtDate(now())}</p>
      <p><b>Empleado:</b> ${v14Text(e.name)} ${v14Text(e.surname)} &nbsp; · &nbsp; <b>Legajo:</b> ${v14Text(e.legajo)}</p>
      <table>
        <thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p><b>Encargado:</b> ${v14Text(session.user)} &nbsp; · &nbsp; <b>Turno:</b> ${v14Text(session.shift)}</p>
      ${signature?'<p class="v16-receipt-signature">Firma empleado: ____________________________________</p>':''}
    </section>`;
  }

  let body=`<div class="v16-receipt-sheet">
    ${half('FACTURACIÓN',true)}
    ${half('CONTROL DE GUARDIA',false)}
  </div>`;

  v16LastReceipt={title,body};
  setPrintableDocument(title,body,'receipt');

  let area=document.getElementById('employeeReceiptArea');
  if(!area)return alert('La operación se registró correctamente, pero no se encontró el área del comprobante.');

  area.innerHTML=`<div class="card receipt-success">
    <div class="headrow">
      <div><h2>Operación registrada correctamente</h2>
      <div class="muted">${v14Text(title)} · Comprobante ${v14Text(number)} · 1 hoja A4</div></div>
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


// ------------------------------------------------------------------
// Render final
// ------------------------------------------------------------------


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
    <div><label>Pallets entregadas al fletero</label><input id="smPalletOut" class="field" type="number" min="0" value="0"></div>
    <div><label>Pallets devueltas por el fletero</label><input id="smPalletIn" class="field" type="number" min="0" value="0"></div>
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
  if (!carrier) return alert('Seleccione un fletero válido.');
  
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

