
function openOrderForm(existingId){
  if(existingId){
    let o=db.orders.find(x=>x.id===existingId);
    if(o&&Array.isArray(o.requestLines))return v13OpenOrderEditor(existingId);
    if(o&&o.pendingType&&o.pendingType!=='immediate')return openPendingDispatchV11(o);
    return legacyOpenOrderForm_v1(existingId);
  }
  return v13OpenOrderEditor('');
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
