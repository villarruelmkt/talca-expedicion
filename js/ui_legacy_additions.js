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
