function manualAccreditEmployees() {
  customConfirm('¿Deseas sumar 2 fardos de beneficio a todos los empleados activos ahora mismo?', () => {
    db.employees.forEach(e => { if(e.active) e.balance = (e.balance || 0) + 2; });
    audit('Acreditación manual', 'Empleados', 'Global', 'Acreditación manual de +2 fardos a activos');
    save(); renderAll(); toast('Beneficio acreditado correctamente.');
  });
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
 if(!e)return toast('No se encontró un empleado activo.', 'error');
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
 if(packs>e.balance)return toast('El empleado no tiene saldo suficiente.', 'error');
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
 if(!items.length)return toast('Agregue al menos un producto.', 'error');
 let shortages=items.filter(x=>x.n.total>(db.stock[x.p.id]||0)),justification='';
 if(shortages.length){justification=prompt('Hay stock insuficiente. Ingrese una justificación para continuar:')||'';if(!justification)return}
 items.forEach(x=>addStockMove({type:`Anticipo empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:x.p.id,total:x.n.total,dir:'out',note:[wbAdvanceNote.value,justification].filter(Boolean).join(' · ')}));
 save();
 showEmployeeReceipt(e,items,'ANTICIPO EMPLEADO','AE')
}

let currentPrintTitle='Comprobante',currentPrintBody='';

function showEmployeeReceipt(e,items,title,prefix){
 let number=nextReceiptNumber(prefix);
 let detail=items.map(x=>`${x.p.name}: ${equivalent(x.n.total,x.p)}`).join('<br>');
 let body=`<div class="receipt"><h2>${title} – FACTURACIÓN</h2><p>N.º ${number} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div>
 <div class="receipt"><h2>${title} – CONTROL DE GUARDIA</h2><p>N.º ${number} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p></div>`;
 setPrintableDocument(title,body);
 let area=document.getElementById('employeeReceiptArea');
 if(!area){
   toast('La operación se registró correctamente, pero no se encontró el área del comprobante.', 'error');
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
 if(packs>e.balance)return toast('El empleado no tiene saldo suficiente.', 'error');
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
 let e=db.employees.find(x=>x.id===advEmployee.value);if(!e)return toast('Seleccione un empleado.', 'error');
 let rows=[...document.querySelectorAll('#advanceLines .line')],items=[];
 rows.forEach(r=>{let p=db.products.find(x=>x.id===r.querySelector('.advProd').value),n=normalize(r.querySelector('.advPack').value,r.querySelector('.advUnit').value,p);if(n.total)items.push({p,n})});
 if(!items.length)return toast('Agregue al menos un producto.', 'error');
 let shortages=items.filter(x=>x.n.total>(db.stock[x.p.id]||0));
 let justification='';
 if(shortages.length){justification=prompt('Hay stock insuficiente. Ingrese una justificación para continuar:')||'';if(!justification)return}
 items.forEach(x=>addStockMove({type:`Anticipo empleado - ${e.name} ${e.surname}`,ref:e.legajo,productId:x.p.id,total:x.n.total,dir:'out',note:[advNote.value,justification].filter(Boolean).join(' · ')}));save();let receiptNo=Date.now(),detail=items.map(x=>`${x.p.name}: ${equivalent(x.n.total,x.p)}`).join('<br>');dialog.innerHTML=`<div class="headrow"><h2>Comprobantes de anticipo</h2><button class="btn btn-secondary no-print" onclick="closeModal()">Cerrar</button></div><div class="card"><h3>ANTICIPO EMPLEADO – FACTURACIÓN</h3><p>N.º ${receiptNo} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p><br>Firma empleado: ____________________</div><div class="card" style="margin-top:14px"><h3>ANTICIPO EMPLEADO – CONTROL DE GUARDIA</h3><p>N.º ${receiptNo} · ${fmtDate(now())}</p><p><b>Empleado:</b> ${e.name} ${e.surname} · <b>Legajo:</b> ${e.legajo}</p><p>${detail}</p><p><b>Encargado:</b> ${session.user} · <b>Turno:</b> ${session.shift}</p></div><div class="right no-print"><button class="btn btn-secondary" onclick="printDialogAsReceipt('Comprobante');setTimeout(openPrintableDocument,700)">Abrir vista imprimible</button> <button class="btn btn-primary" onclick="printDialogAsReceipt('Comprobante')">Imprimir dos copias</button></div>`
}

function generateShiftSummary(){
 let today=new Date().toISOString().slice(0,10),moves=db.movements.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift),mats=db.materialMoves.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift);
 let byType={};moves.forEach(m=>byType[m.type]=(byType[m.type]||0)+1);
 let body=`<h1>Resumen de turno</h1><p><b>Fecha:</b> ${today} · <b>Turno:</b> ${session.shift} · <b>Encargado:</b> ${session.user}</p>
 <h2>Movimientos</h2><table><thead><tr><th>Tipo</th><th>Cantidad de registros</th></tr></thead><tbody>${Object.entries(byType).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
 <h2>Materiales</h2><p>Planchadas entregadas: ${mats.reduce((s,m)=>s+m.palletOut,0)} · devueltas: ${mats.reduce((s,m)=>s+m.palletIn,0)}</p><p>Chapadur entregado: ${mats.reduce((s,m)=>s+m.chapOut,0)} · devuelto: ${mats.reduce((s,m)=>s+m.chapIn,0)}</p>
 <h2>Pendientes</h2><p>Órdenes parciales: ${db.orders.filter(o=>o.status==='Parcial').length} · Cambios sin informar: ${db.orders.filter(o=>o.billing==='Pendiente de aviso').length}</p>`;
 setPrintableDocument('Resumen de turno',body);printCurrentDocument()
}

