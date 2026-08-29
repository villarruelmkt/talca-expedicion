
function openOrderForm(existingId){
  if(existingId){
    let o=db.orders.find(x=>x.id===existingId);
    if(o&&Array.isArray(o.requestLines))return typeof v13OpenOrderEditor==='function'?v13OpenOrderEditor(existingId):legacyOpenOrderForm_v1(existingId);
    if(o&&o.pendingType&&o.pendingType!=='immediate')return typeof openPendingDispatchV11==='function'?openPendingDispatchV11(o):legacyOpenOrderForm_v1(existingId);
    return legacyOpenOrderForm_v1(existingId);
  }
  return typeof v13OpenOrderEditor==='function'?v13OpenOrderEditor(''):legacyOpenOrderForm_v1('');
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
function addProductByCode(){let q=(quickProductCode.value||'').trim().toLowerCase();if(!q)return;let matches=db.products.filter(p=>p.id.toLowerCase()===q||p.name.toLowerCase().includes(q));if(!matches.length)return toast('No se encontró un producto con ese código o nombre.', 'error');if(matches.length>1)return toast('Hay más de una coincidencia. Escriba un código más preciso.', 'error');addOrderLine(matches[0].id);quickProductCode.value='';quickProductCode.focus()}
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
 let num=oNumber.value.trim(),lines=getOrderLines();if(!num||!lines.length)return toast('Complete número de orden y al menos un producto.', 'error');
 if(!orderId&&db.orders.some(x=>x.number===num))return toast('El número de orden ya existe. Abra la orden existente para registrar otra entrega.', 'error');
 let shortage=lines.some(l=>l.total>(db.stock[l.productId]||0));if(shortage&&(!document.getElementById('stockJustification')||!stockJustification.value.trim()))return toast('Debe justificar el stock insuficiente.', 'error');
 let o=orderId?db.orders.find(x=>x.id===orderId):{id:uid('o'),number:num,date:oDate.value,fleteroId:oCarrier.value,status:'Recibida',deliveries:[],billing:'No aplica',createdBy:session.user,createdShift:session.shift};
 let delivery={id:uid('d'),date:now(),lines,result:orderResult.value,note:oNote.value,loadStart:oLoadStart.value||'',loadEnd:oLoadEnd.value||'',stockJustification:shortage?stockJustification.value:'',user:session.user,shift:session.shift,palletOut:+realPalletOut.value||0,palletIn:+realPalletIn.value||0,chapOut:+realChapOut.value||0,chapIn:+realChapIn.value||0};
 delivery.lines.forEach(l=>addStockMove({type:'Orden de carga',ref:num,productId:l.productId,total:l.total,dir:'out',note:delivery.stockJustification}));
 addMaterialMove({fleteroId:o.fleteroId,ref:num,source:'Orden de carga',palletOut:delivery.palletOut,palletIn:delivery.palletIn,chapOut:delivery.chapOut,chapIn:delivery.chapIn});
 o.deliveries.push(delivery);o.status=delivery.result==='Parcial'?'Parcial':delivery.result;if(delivery.loadStart&&!delivery.loadEnd)o.status='Carga iniciada';if(delivery.loadEnd&&delivery.result==='Completa')o.status='Completa';o.billing=billingStatus.value;if(!orderId){db.orders.push(o);audit('Alta','Orden',o.number,'Orden creada')}else audit('Entrega','Orden',o.number,delivery.result);save();closeModal();showPage('orders')
}


function populateFilters(){if(document.getElementById('ofCarrier')){ofCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();mfCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();if(document.getElementById('pfCarrier'))pfCarrier.innerHTML='<option value="">Todos</option>'+fleteroOptions();if(document.getElementById('pfProduct'))pfProduct.innerHTML='<option value="">Todos</option>'+productOptions()}if(document.getElementById('ofUser'))ofUser.innerHTML='<option value="">Todos</option>'+db.users.map(u=>`<option value="${u.displayName}">${u.displayName}</option>`).join('')}
function clearOrderFilters(){ofCarrier.value='';ofDate.value='';ofUser.value='';ofShift.value='';renderOrders()}
function clearMaterialFilters(){mfCarrier.value='';mfFrom.value='';mfTo.value='';mfSource.value='';renderMaterials()}
function printSection(id,title){document.querySelectorAll('.page').forEach(p=>p.classList.remove('print-target'));let p=document.getElementById(id);p.classList.add('print-target');let rt=p.querySelector('.report-title');if(rt)rt.textContent=title;window.print();p.classList.remove('print-target')}
function legacyOpenOrderForm_v1(existingId){
 let o=existingId?db.orders.find(x=>x.id===existingId):null;
 modal(`<div class="headrow"><div><h2>${o?'Registrar nueva entrega':'Nueva orden de carga'}</h2><div class="muted">El stock se descuenta al confirmar la entrega real.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
 <div class="formgrid">
  <div><label>NÃºmero de orden</label><input id="oNumber" class="field" value="${o?o.number:''}" ${o?'disabled':''}></div>
  <div><label>Fecha</label><input id="oDate" class="field" type="date" value="${o?o.date:new Date().toISOString().slice(0,10)}"></div>
  <div><label>Fletero</label><select id="oCarrier" ${o?'disabled':''}>${fleteroOptions()}</select></div>
  <div><label>Inicio de carga (opcional)</label><input id="oLoadStart" class="field" type="datetime-local"></div><div><label>Fin de carga (opcional)</label><input id="oLoadEnd" class="field" type="datetime-local"></div><div><label>Observaciones</label><input id="oNote" class="field" value=""></div>
 </div><div class="lineitems"><div class="headrow"><h3>Productos de esta entrega</h3><button class="btn btn-secondary" onclick="addOrderLine()">Agregar producto</button></div><div class="code-entry"><div><label>CÃ³digo o nombre del producto</label><input id="quickProductCode" class="field" placeholder="Ej.: 5670 o Cola 3 L" onkeydown="if(event.key==='Enter'){event.preventDefault();addProductByCode()}"></div><button class="btn btn-primary" onclick="addProductByCode()">Agregar</button></div><div id="orderLines" style="margin-top:12px"></div></div>
 <div class="summary"><div class="summarygrid">
  <div><span class="muted">Pallets sugeridas</span><b id="suggestPallet">0</b></div>
  <div><label>Pallets reales que lleva</label><input id="realPalletOut" class="field" type="number" min="0" value="0"></div>
  <div><label>Pallets que devuelve</label><input id="realPalletIn" class="field" type="number" min="0" value="0"></div>
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
