// --- MODULE: BUSINESS LOGIC (ORDERS & MOVEMENTS) ---
function addStockMove({type,ref,productId,total,dir,note='',date=null}){db.stock[productId]=(db.stock[productId]||0)+(dir==='in'?total:-total);db.movements.push({id:uid('m'),date:date||now(),type,ref,productId,total,dir,note,user:session.user,shift:session.shift});let p=db.products.find(x=>x.id===productId);audit('Movimiento',type,ref,`${p?p.name:productId} ${dir==='in'?'+':'-'} ${p?equivalent(total,p):total}`);if(typeof v1EnsureBucket==='function'){v1EnsureBucket(productId).physical=db.stock[productId]||0;}}
function addMaterialMove({fleteroId,ref,source,palletOut=0,palletIn=0,chapOut=0,chapIn=0,date=null}){db.materialMoves.push({id:uid('mat'),date:date||now(),fleteroId,ref,source,palletOut:+palletOut||0,palletIn:+palletIn||0,chapOut:+chapOut||0,chapIn:+chapIn||0,user:session.user,shift:session.shift})}

function openOrderForm(existingId){
  if(existingId){
    let o=db.orders.find(x=>x.id===existingId);
    if(o&&Array.isArray(o.requestLines))return v13OpenOrderEditor(existingId);
    if(o&&o.pendingType&&o.pendingType!=='immediate')return openPendingDispatchV11(o);
    return legacyOpenOrderForm_v1(existingId);
  }
  return v13OpenOrderEditor('');
}
function legacyOpenOrderForm_v1(existingId){
 let o=existingId?db.orders.find(x=>x.id===existingId):null;
 modal(`<div class="headrow"><div><h2>${o?'Registrar nueva entrega':'Nueva orden de carga'}</h2><div class="muted">El stock se descuenta al confirmar la entrega real.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid">
  <div><label>Número de orden</label><input id="oNumber" class="field" value="${o?o.number:''}" ${o?'disabled':''}></div>
  <div><label>Fecha</label><input id="oDate" class="field" type="date" value="${o?o.date:new Date().toISOString().slice(0,10)}"></div>
  <div><label>Fletero</label><select id="oCarrier" ${o?'disabled':''}>${fleteroOptions()}</select></div>
  <div><label>Inicio de carga (opcional)</label><input id="oLoadStart" class="field" type="datetime-local"></div><div><label>Fin de carga (opcional)</label><input id="oLoadEnd" class="field" type="datetime-local"></div><div><label>Observaciones</label><input id="oNote" class="field" value=""></div>
 </div><div class="lineitems"><div class="headrow"><h3>Productos de esta entrega</h3><button class="btn btn-secondary" onclick="addOrderLine()">Agregar producto</button></div><div class="code-entry"><div><label>Código o nombre del producto</label><input id="quickProductCode" class="field" placeholder="Ej.: 5670 o Cola 3 L" onkeydown="if(event.key==='Enter'){event.preventDefault();addProductByCode()}"></div><button class="btn btn-primary" onclick="addProductByCode()">Agregar</button></div><div id="orderLines" style="margin-top:12px"></div></div>
 <div class="summary"><div class="summarygrid">
  <div><span class="muted">Pallets sugeridas</span><b id="suggestPallet">0</b></div>
  <div><label>Pallets reales que lleva</label><input id="realPalletOut" class="field" type="number" min="0" value="0"></div>
  <div><label>Pallets que devuelve</label><input id="realPalletIn" class="field" type="number" min="0" value="0"></div>
  <div><span class="muted">Chapadur sugerido</span><b id="suggestChap">0</b></div>
  <div><label>Chapadur que lleva</label><input id="realChapOut" class="field" type="number" min="0" value="0"></div>
  <div><label>Chapadur que devuelve</label><input id="realChapIn" class="field" type="number" min="0" value="0"></div>
  <div><label>Resultado de la orden</label><select id="orderResult"><option>Completa</option><option>Parcial</option><option>Completa con cambio</option></select></div>
  <div><label>Facturación</label><select id="billingStatus"><option>No aplica</option><option>Pendiente de aviso</option><option>Avisada</option></select></div>
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
function addProductByCode(){let q=(quickProductCode.value||'').trim().toLowerCase();if(!q)return;let matches=db.products.filter(p=>p.id.toLowerCase()===q||p.name.toLowerCase().includes(q));if(!matches.length)return alert('No se encontró un producto con ese código o nombre.');if(matches.length>1)return alert('Hay más de una coincidencia. Escriba un código más preciso.');addOrderLine(matches[0].id);quickProductCode.value='';quickProductCode.focus()}
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
 stockWarning.innerHTML=warns.length?`<div class="alert"><b>Stock insuficiente.</b><br>${warns.join('<br>')}<label>Justificación obligatoria para continuar</label><textarea id="stockJustification"></textarea></div>`:'';
}
function saveOrderDelivery(orderId){
 let num=oNumber.value.trim(),lines=getOrderLines();if(!num||!lines.length)return alert('Complete número de orden y al menos un producto.');
 if(!orderId&&db.orders.some(x=>x.number===num))return alert('El número de orden ya existe. Abra la orden existente para registrar otra entrega.');
 let shortage=lines.some(l=>l.total>(db.stock[l.productId]||0));if(shortage&&(!document.getElementById('stockJustification')||!stockJustification.value.trim()))return alert('Debe justificar el stock insuficiente.');
 let o=orderId?db.orders.find(x=>x.id===orderId):{id:uid('o'),number:num,date:oDate.value,fleteroId:oCarrier.value,status:'Recibida',deliveries:[],billing:'No aplica',createdBy:session.user,createdShift:session.shift};
 let delivery={id:uid('d'),date:now(),lines,result:orderResult.value,note:oNote.value,loadStart:oLoadStart.value||'',loadEnd:oLoadEnd.value||'',stockJustification:shortage?stockJustification.value:'',user:session.user,shift:session.shift,palletOut:+realPalletOut.value||0,palletIn:+realPalletIn.value||0,chapOut:+realChapOut.value||0,chapIn:+realChapIn.value||0};
 delivery.lines.forEach(l=>addStockMove({type:'Orden de carga',ref:num,productId:l.productId,total:l.total,dir:'out',note:delivery.stockJustification}));
 addMaterialMove({fleteroId:o.fleteroId,ref:num,source:'Orden de carga',palletOut:delivery.palletOut,palletIn:delivery.palletIn,chapOut:delivery.chapOut,chapIn:delivery.chapIn});
 o.deliveries.push(delivery);o.status=delivery.result==='Parcial'?'Parcial':delivery.result;if(delivery.loadStart&&!delivery.loadEnd)o.status='Carga iniciada';if(delivery.loadEnd&&delivery.result==='Completa')o.status='Completa';o.billing=billingStatus.value;if(!orderId){db.orders.push(o);audit('Alta','Orden',o.number,'Orden creada')}else audit('Entrega','Orden',o.number,delivery.result);save();closeModal();showPage('orders')
}


function openMovement(type){
 modal(`<div class="headrow"><div><h2>${type}</h2></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid"><div><label>Fecha</label><input id="mDate" type="date" class="field" value="${new Date().toISOString().slice(0,10)}"></div><div class="span2"><label>Referencia / observación</label><input id="mRef" class="field"></div></div>
 <div class="lineitems"><div class="headrow"><h3>Productos</h3><button class="btn btn-secondary" onclick="addMovementLine()">Agregar</button></div><div id="movementLines"></div></div>
 <div class="right"><button class="btn btn-primary" onclick="saveSimpleMovement('${type}')">Guardar</button></div>`);
 addMovementLine()
}
function addMovementLine(){let d=document.createElement('div');d.className='line';d.innerHTML=`<div class="prod"><label>Producto</label><select class="mvProd">${productOptions()}</select></div><div><label>Fardos</label><input class="field mvPack" type="number" min="0" value="0"></div><div><label>Unidades</label><input class="field mvUnit" type="number" min="0" value="0"></div><button class="btn btn-danger" onclick="this.parentElement.remove()">Quitar</button>`;movementLines.appendChild(d)}
function saveSimpleMovement(type){
  let rows=[...document.querySelectorAll('#movementLines .line')],has=false;
  let op = uid(type==='Rebote'?'reb':type==='Derrame'?'der':'op');
  let mDateEl = document.getElementById('mDate');
  let dStr=mDateEl?mDateEl.value:null, opDate=dStr?new Date(dStr+'T12:00:00').toISOString():now();
  let mRefEl = document.getElementById('mRef');

  for(let r of rows){
    let p=db.products.find(x=>x.id===r.querySelector('.mvProd').value);
    let n=normalize(r.querySelector('.mvPack').value,r.querySelector('.mvUnit').value,p);
    if(!n.total)continue;
    has=true;
    
    if(type==='Derrame'){
      addNeutralMoveV11({type,ref:mRefEl?.value||'Derrame',productId:p.id,total:n.total});
      db.movements[db.movements.length-1].operationId = op;
    } else {
      let dir = (type==='Producción'||type==='Rebote')?'in':'out';
      addStockMove({type,ref:mRefEl?.value||type,productId:p.id,total:n.total,dir,date:opDate});
      if(['Rebote','Derrame'].includes(type)) {
        db.movements[db.movements.length-1].operationId = op;
      }
    }
  }
  
  if(!has)return alert('Ingrese al menos una cantidad.');
  save();closeModal();
}

function openTransfer(){
 modal(`<div class="headrow"><div><h2>Transferencia Mendoza / San Juan</h2><div class="muted">Genera movimiento de mercadería y de materiales del fletero.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid"><div><label>Fecha de movimiento</label><input id="tDate" class="field" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div><label>Provincia</label><select id="tProvince"><option>Mendoza</option><option>San Juan</option></select></div><div><label>Operación</label><select id="tDirection"><option value="out">Envío</option><option value="in">Recepción</option></select></div><div><label>Número de remito</label><input id="tRemit" class="field"></div><div><label>Fletero</label><select id="tCarrier">${fleteroOptions()}</select></div><div><label>Pallets que salen</label><input id="tPalletOut" class="field" type="number" min="0" value="0"></div><div><label>Pallets que entran</label><input id="tPalletIn" class="field" type="number" min="0" value="0"></div><div><label>Chapadur que sale</label><input id="tChapOut" class="field" type="number" min="0" value="0"></div><div><label>Chapadur que entra</label><input id="tChapIn" class="field" type="number" min="0" value="0"></div></div>
 <div class="lineitems"><div class="headrow"><h3>Productos del remito</h3><button class="btn btn-secondary" onclick="addMovementLine()">Agregar</button></div><div id="movementLines"></div></div>
 <div class="right"><button class="btn btn-primary" onclick="saveTransfer()">Guardar transferencia</button></div>`);
 addMovementLine()
}
function saveTransfer(){
 if(!tRemit.value.trim())return alert('El número de remito es obligatorio.');
 let type=(tDirection.value==='in'?'Recepción desde ':'Envío a ')+tProvince.value,ref='Remito '+tRemit.value;
 let dStr=document.getElementById('tDate').value, opDate=dStr?new Date(dStr+'T12:00:00').toISOString():now();
 [...document.querySelectorAll('#movementLines .line')].forEach(r=>{let p=db.products.find(x=>x.id===r.querySelector('.mvProd').value),n=normalize(r.querySelector('.mvPack').value,r.querySelector('.mvUnit').value,p);if(n.total)addStockMove({type,ref,productId:p.id,total:n.total,dir:tDirection.value,date:opDate})});
 addMaterialMove({fleteroId:tCarrier.value,ref,source:type,palletOut:tPalletOut.value,palletIn:tPalletIn.value,chapOut:tChapOut.value,chapIn:tChapIn.value,date:opDate});
 save();closeModal()
}
function openMaterialReturn(){
 modal(`<div class="headrow"><h2>Devolución general de materiales</h2><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><div><label>Fletero</label><select id="rCarrier">${fleteroOptions()}</select></div><div><label>Pallets devueltas</label><input id="rPallet" class="field" type="number" min="0" value="0"></div><div><label>Chapadur devuelto</label><input id="rChap" class="field" type="number" min="0" value="0"></div><div class="span3"><label>Observaciones</label><input id="rNote" class="field"></div></div><div class="right"><button class="btn btn-primary" onclick="saveReturn()">Guardar</button></div>`)
}
function saveReturn(){addMaterialMove({fleteroId:rCarrier.value,ref:rNote.value||'Devolución general',source:'Devolución general',palletIn:rPallet.value,chapIn:rChap.value});save();closeModal()}

function manualAccreditEmployees() {
  if(confirm('¿Deseas sumar 2 fardos de beneficio a todos los empleados activos ahora mismo?')) {
    db.employees.forEach(e => { if(e.active) e.balance = (e.balance || 0) + 2; });
    audit('Acreditación manual', 'Empleados', 'Global', 'Acreditación manual de +2 fardos a activos');
    save(); renderAll(); alert('Beneficio acreditado correctamente.');
  }
}

let selectedEmployeeId='';

function searchEmployees(){
 let q=(document.getElementById('employeeSearchInput')?.value||'').trim().toLowerCase();
 let list=db.employees.filter(e=>e.active).filter(e=>!q||e.legajo.toLowerCase().includes(q)||`${e.name} ${e.surname}`.toLowerCase().includes(q));
 employeeSearchResults.innerHTML=list.slice(0,30).map(e=>`<div class="employee-result ${selectedEmployeeId===e.id?'selected':''}" onclick="selectEmployee('${e.id}')"><b>${e.legajo}</b> · ${e.name} ${e.surname}<br><span class="muted">Saldo beneficio: ${e.balance||0} fardos</span></div>`).join('')||'<div class="muted">No se encontraron empleados activos.</div>'
}
function selectFirstEmployeeResult(){
 let q=(employeeSearchInput.value||'').trim().toLowerCase();
 let e=db.employees.filter(x=>x.active).find(x=>!q||x.legajo.toLowerCase()===q||`${x.name} ${x.surname}`.toLowerCase().includes(q))||
       db.employees.filter(x=>x.active).find(x=>!q||x.legajo.toLowerCase().includes(q));
 if(!e)return alert('No se encontró un empleado activo.');
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
   <div class="headrow"><div><h2>${e.name} ${e.surname}</h2><div class="muted">Legajo ${e.legajo} · ${e.active?'Activo':'Inactivo'}</div></div><div><span class="muted">Saldo beneficio</span><div style="font-size:30px;font-weight:800">${e.balance||0} fardos</div></div></div>
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
     <p class="muted">Compra de mercadería. Afecta el stock, pero no el saldo del beneficio.</p>
     <div id="wbAdvanceLines"></div>
     <label>Observaciones</label><input id="wbAdvanceNote" class="field">
     <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="saveWorkbenchAdvance()">Confirmar y generar comprobantes</button>
   </div>
 </div>
 <div class="card" style="margin-top:14px">
   <h3>Historial reciente</h3>
   <div class="mini-history">${moves.length?moves.slice(0,20).map(m=>{let p=db.products.find(x=>x.id===m.productId);return `<div style="padding:9px 0;border-bottom:1px solid var(--line)"><b>${m.type.startsWith('Consumo')?'Consumo':'Anticipo'}</b> · ${p?.name||''} · ${equivalent(m.total,p)}<br><span class="muted">${fmtDate(m.date)} · ${m.user} · Turno ${m.shift}</span></div>`}).join(''):'<span class="muted">Todavía no registra consumos ni anticipos.</span>'}</div>
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
 if(total>(db.stock[p.id]||0)){justification=prompt('Stock insuficiente. Ingrese una justificación para continuar:')||'';if(!justification)return}
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
 if(shortages.length){justification=prompt('Hay stock insuficiente. Ingrese una justificación para continuar:')||'';if(!justification)return}
 items.forEach(x=>addStockMove({type:`Anticipo empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:x.p.id,total:x.n.total,dir:'out',note:[wbAdvanceNote.value,justification].filter(Boolean).join(' · ')}));
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
 area.innerHTML=`<div class="print-brand">TALCA · Expedición</div>${currentPrintBody}`;
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
 let body=`<div class="receipt"><h2>${title} – FACTURACIÓN</h2><p>N.º ${number} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div>
 <div class="receipt"><h2>${title} – CONTROL DE GUARDIA</h2><p>N.º ${number} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p></div>`;
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
 let total=packs*p.pack;if(total>(db.stock[p.id]||0)){let j=prompt('Stock insuficiente. Escriba una justificación para continuar:');if(!j)return;addStockMove({type:`Consumo de empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:p.id,total,dir:'out',note:j})}else addStockMove({type:`Consumo de empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:p.id,total,dir:'out'});
 e.balance-=packs;e.lastConsumption=now();save();
 dialog.innerHTML=`<div class="headrow"><h2>Comprobante generado</h2><button class="btn btn-secondary no-print" onclick="closeModal()">Cerrar</button></div><div class="card"><h3>CONTROL DE CONSUMO – FACTURACIÓN</h3><p>N.º ${Date.now()} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p><b>Producto:</b> ${p.name} · <b>Cantidad:</b> ${packs} fardos</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div><div class="card" style="margin-top:14px"><h3>AUTORIZACIÓN DE SALIDA – GUARDIA</h3><p>N.º ${Date.now()} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p><b>Producto:</b> ${p.name} · <b>Cantidad:</b> ${packs} fardos</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p></div><div class="right no-print"><button class="btn btn-secondary" onclick="printDialogAsReceipt('Comprobante');setTimeout(openPrintableDocument,700)">Abrir vista imprimible</button> <button class="btn btn-primary" onclick="printDialogAsReceipt('Comprobante')">Imprimir dos copias</button></div>`
}


function openEmployeeAdvance(employeeId=''){
 modal(`<div class="headrow"><div><h2>Anticipo empleado</h2><div class="muted">Registra una compra de mercadería y descuenta el stock. No afecta el saldo del beneficio mensual.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
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
 if(shortages.length){justification=prompt('Hay stock insuficiente. Ingrese una justificación para continuar:')||'';if(!justification)return}
 items.forEach(x=>addStockMove({type:`Anticipo empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:x.p.id,total:x.n.total,dir:'out',note:[advNote.value,justification].filter(Boolean).join(' · ')}));save();let receiptNo=Date.now(),detail=items.map(x=>`${x.p.name}: ${equivalent(x.n.total,x.p)}`).join('<br>');dialog.innerHTML=`<div class="headrow"><h2>Comprobantes de anticipo</h2><button class="btn btn-secondary no-print" onclick="closeModal()">Cerrar</button></div><div class="card"><h3>ANTICIPO EMPLEADO – FACTURACIÓN</h3><p>N.º ${receiptNo} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div><div class="card" style="margin-top:14px"><h3>ANTICIPO EMPLEADO – CONTROL DE GUARDIA</h3><p>N.º ${receiptNo} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p></div><div class="right no-print"><button class="btn btn-secondary" onclick="printDialogAsReceipt('Comprobante');setTimeout(openPrintableDocument,700)">Abrir vista imprimible</button> <button class="btn btn-primary" onclick="printDialogAsReceipt('Comprobante')">Imprimir dos copias</button></div>`
}

function openAdjustment(){
 modal(`<div class="headrow"><h2>Ajuste de stock</h2><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><div><label>Producto</label><select id="aProduct">${productOptions()}</select></div><div><label>Tipo</label><select id="aDir"><option value="in">Ajuste positivo</option><option value="out">Ajuste negativo</option></select></div><div><label>Fardos</label><input id="aPacks" class="field" type="number" min="0" value="0"></div><div><label>Unidades</label><input id="aUnits" class="field" type="number" min="0" value="0"></div><div class="span2"><label>Justificación obligatoria</label><textarea id="aNote"></textarea></div></div><div class="right"><button class="btn btn-primary" onclick="saveAdjustment()">Guardar ajuste</button></div>`)
}
function saveAdjustment(){if(!aNote.value.trim())return alert('La justificación es obligatoria.');let p=db.products.find(x=>x.id===aProduct.value),n=normalize(aPacks.value,aUnits.value,p);if(!n.total)return;addStockMove({type:aDir.value==='in'?'Ajuste positivo':'Ajuste negativo',ref:'Inventario',productId:p.id,total:n.total,dir:aDir.value,note:aNote.value});save();closeModal()}

function openCount(){
 modal(`<div class="headrow"><div><h2>Conteo de ${session.shift}</h2><div class="muted">Compare el conteo físico con el saldo teórico.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div id="countLines">${db.products.map(p=>`<div class="line" data-p="${p.id}"><div class="prod"><b>${p.name}</b><div class="muted">Sistema: ${equivalent(db.stock[p.id]||0,p)}</div></div><div><label>Fardos físicos</label><input class="field cPack" type="number" min="0" value="${Math.floor((db.stock[p.id]||0)/p.pack)}"></div><div><label>Unidades</label><input class="field cUnit" type="number" min="0" value="${(db.stock[p.id]||0)%p.pack}"></div></div>`).join('')}</div><label>Tipo de conteo</label><select id="countType"><option>Cierre de turno</option><option>Apertura / corroboración</option></select><label>Observaciones</label><textarea id="countNote"></textarea><div class="right"><button class="btn btn-primary" onclick="saveCount()">Guardar conteo</button></div>`)
}
function saveCount(){
 let differences=[];
 [...document.querySelectorAll('#countLines .line')].forEach(r=>{let p=db.products.find(x=>x.id===r.dataset.p),n=normalize(r.querySelector('.cPack').value,r.querySelector('.cUnit').value,p),diff=n.total-(db.stock[p.id]||0);if(diff)differences.push({productId:p.id,diff,physical:n.total})});
 db.counts.push({id:uid('c'),date:now(),shift:session.shift,type:countType.value,user:session.user,differences,note:countNote.value,status:countType.value.startsWith('Cierre')?'Pendiente de corroboración':'Corroborado'});
 save();closeModal()
}
function corroborateCount(id){
 let c=db.counts.find(x=>x.id===id);if(!confirm('¿Confirma que recibe el stock indicado por el turno anterior?'))return;c.status='Corroborado';c.correlatedBy=session.user;c.correlatedAt=now();save()
}

function addUser(){
 let displayName=prompt('Nombre visible del encargado:');if(!displayName)return;
 let username=prompt('Nombre de usuario:');if(!username)return;
 if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return alert('Ese usuario ya existe.');
 let password=prompt('Clave inicial:');if(!password)return;
 db.users.push({id:uid('u'),displayName,username,password,active:true});audit('Alta','Usuario',username,displayName);save();fillLoginUsers()
}
function addFletero() {
  modal(`<div class="headrow"><div><h2>Nuevo fletero</h2></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div style="grid-column:1/-1"><label>Nombre (obligatorio):</label><input type="text" id="mAddFletName" class="field"></div>
    <div style="grid-column:1/-1"><label>Apellido (opcional):</label><input type="text" id="mAddFletSur" class="field"></div>
    <div style="grid-column:1/-1"><label>Empresa transportista (opcional):</label><input type="text" id="mAddFletComp" class="field"></div>
  </div>
  <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="saveAddFletero()">Guardar</button></div>`);
  window.saveAddFletero = function() {
    let name = document.getElementById('mAddFletName').value.trim();
    let surname = document.getElementById('mAddFletSur').value.trim();
    let company = document.getElementById('mAddFletComp').value.trim();
    if(!name) return alert('El nombre es obligatorio');
    db.fleteros.push({id:uid('f'), name, surname, company, active:true});
    audit('Alta', 'Fletero', name, company);
    save(); renderAll(); closeModal();
  };
}
function addEmployee() {
  modal(`<div class="headrow"><div><h2>Nuevo empleado</h2></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div style="grid-column:1/-1"><label>Número de legajo:</label><input type="text" id="mAddEmpLeg" class="field"></div>
    <div style="grid-column:1/-1"><label>Nombre:</label><input type="text" id="mAddEmpName" class="field"></div>
    <div style="grid-column:1/-1"><label>Apellido:</label><input type="text" id="mAddEmpSur" class="field"></div>
    <div style="grid-column:1/-1"><label>Fardos acumulados iniciales:</label><input type="number" id="mAddEmpBal" class="field" value="0"></div>
  </div>
  <div class="right" style="margin-top:16px"><button class="btn btn-primary" onclick="saveAddEmployee()">Guardar</button></div>`);
  window.saveAddEmployee = function() {
    let legajo = document.getElementById('mAddEmpLeg').value.trim();
    let name = document.getElementById('mAddEmpName').value.trim();
    if(!legajo || !name) return alert('Legajo y nombre son obligatorios');
    if(db.employees.some(e=>e.legajo===legajo)) return alert('Ese legajo ya existe.');
    let surname = document.getElementById('mAddEmpSur').value.trim();
    let balance = Number(document.getElementById('mAddEmpBal').value) || 0;
    db.employees.push({id:uid('e'), legajo, name, surname, active:true, balance, lastCredit:''});
    db.employees.sort((a,b)=>a.legajo.localeCompare(b.legajo));
    audit('Alta', 'Empleado', legajo, `${name} ${surname}`);
    save(); renderAll(); closeModal();
  };
}
function populateFilters(){if(document.getElementById('ofCarrier')){ofCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();mfCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();if(document.getElementById('pfCarrier'))pfCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();if(document.getElementById('pfProduct'))pfProduct.innerHTML='<option value="">Todos</option>'+productOptions()}if(document.getElementById('ofUser'))ofUser.innerHTML='<option value="">Todos</option>'+db.users.map(u=>`<option value="${u.displayName}">${u.displayName}</option>`).join('')}
function clearOrderFilters(){ofCarrier.value='';ofDate.value='';ofUser.value='';ofShift.value='';renderOrders()}
function clearMaterialFilters(){mfCarrier.value='';mfFrom.value='';mfTo.value='';mfSource.value='';renderMaterials()}
function printSection(id,title){document.querySelectorAll('.page').forEach(p=>p.classList.remove('print-target'));let p=document.getElementById(id);p.classList.add('print-target');let rt=p.querySelector('.report-title');if(rt)rt.textContent=title;window.print();p.classList.remove('print-target')}

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
    <h3>Saldos de Fleteros en este período</h3>
    <table>
      <thead>
        <tr>
          <th>Fletero</th>
          <th style="text-align:center">Pallets (Sale/Entra)</th>
          <th style="text-align:center">Saldo Pallets</th>
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

  materialsTotals.innerHTML = `<div class="summarygrid"><div><span class="muted">Pallets entregadas</span><b>${t.po}</b></div><div><span class="muted">Pallets devueltas</span><b>${t.pi}</b></div><div><span class="muted">Resultado pallets</span><b>${t.po - t.pi}</b></div><div><span class="muted">Chapadur entregado</span><b>${t.co}</b></div><div><span class="muted">Chapadur devuelto</span><b>${t.ci}</b></div><div><span class="muted">Resultado chapadur</span><b>${t.co - t.ci}</b></div></div>` + (Object.keys(cb).length ? balancesHtml : '');
  
  materialsBody.innerHTML = [...list].reverse().map(m => {
    let f = db.fleteros.find(x => x.id === m.fleteroId);
    return `<tr><td>${fmtDate(m.date)}</td><td>${f?.name || ''}</td><td>${m.ref}</td><td>${m.source}</td><td>${m.palletOut}</td><td>${m.palletIn}</td><td>${m.chapOut}</td><td>${m.chapIn}</td><td>Pallets: ${m.palletOut - m.palletIn}; Chapadur: ${m.chapOut - m.chapIn}</td></tr>`
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
 if(total<0)return ['Negativo','danger'];if(f===0)return ['Sin stock','danger'];if(crit&&f<=crit)return ['Crítico','danger'];if(min&&f<=min)return ['Bajo','partial'];return ['Normal','done']
}

function downloadCSV(filename,rows){
 let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
 let a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download=filename;a.click();URL.revokeObjectURL(a.href)
}
function exportPendingCSV(){
 let rows=[['Orden','Fecha','Fletero','Producto','Estado','Facturación']];
 db.orders.filter(o=>o.status==='Parcial'||o.status==='Completa con cambio').forEach(o=>rows.push([o.number,o.date,db.fleteros.find(f=>f.id===o.fleteroId)?.name||'', '',o.status,o.billing]));
 downloadCSV('pendientes.csv',rows)
}
function exportAuditCSV(){downloadCSV('auditoria.csv',[['Fecha','Usuario','Acción','Entidad','Referencia','Detalle'],...(db.audit||[]).map(a=>[fmtDate(a.date),a.user,a.action,a.entity,a.ref,a.detail])])}
function generateShiftSummary(){
 let today=new Date().toISOString().slice(0,10),moves=db.movements.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift),mats=db.materialMoves.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift);
 let byType={};moves.forEach(m=>byType[m.type]=(byType[m.type]||0)+1);
 let body=`<h1>Resumen de turno</h1><p><b>Fecha:</b> ${today} · <b>Turno:</b> ${session.shift} · <b>Encargado:</b> ${session.user}</p>
 <h2>Movimientos</h2><table><thead><tr><th>Tipo</th><th>Cantidad de registros</th></tr></thead><tbody>${Object.entries(byType).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
 <h2>Materiales</h2><p>Pallets entregadas: ${mats.reduce((s,m)=>s+m.palletOut,0)} · devueltas: ${mats.reduce((s,m)=>s+m.palletIn,0)}</p><p>Chapadur entregado: ${mats.reduce((s,m)=>s+m.chapOut,0)} · devuelto: ${mats.reduce((s,m)=>s+m.chapIn,0)}</p>
 <h2>Pendientes</h2><p>Órdenes parciales: ${db.orders.filter(o=>o.status==='Parcial').length} · Cambios sin informar: ${db.orders.filter(o=>o.billing==='Pendiente de aviso').length}</p>`;
 setPrintableDocument('Resumen de turno',body);printCurrentDocument()
}

