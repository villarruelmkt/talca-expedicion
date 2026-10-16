
function addStockMove({type,ref,productId,total,dir,note='',date=null}){
  let delta = dir === 'in' ? Number(total) : -Number(total);
  db.stock[productId] = (Number(db.stock[productId]) || 0) + delta;
  db.movements.push({id:uid('m'),date:date||now(),type,ref,productId,total:Number(total),dir,note,user:session.user,shift:session.shift});
  let p = db.products.find(x => x.id === productId);
  audit('Movimiento', type, ref, `${p ? p.name : productId} ${dir === 'in' ? '+' : '-'} ${p ? equivalent(total, p) : total}`);
  if (typeof v1EnsureBucket === 'function') {
    v1EnsureBucket(productId).physical = db.stock[productId] || 0;
  }

  // Actualización atómica en Firestore a nivel de campo para evitar sobreescrituras concurrentes
  if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && typeof docRef !== 'undefined' && docRef && typeof firebase !== 'undefined' && firebase.firestore?.FieldValue?.increment) {
    try {
      let updateAtomic = {};
      updateAtomic[`stock.${productId}`] = firebase.firestore.FieldValue.increment(delta);
      updateAtomic.updatedAt = new Date().toISOString();
      updateAtomic.lastSavedBy = (session && session.user && (session.user.displayName || session.user.username || session.user.email)) || (typeof session?.user === 'string' ? session.user : 'Desconocido');
      docRef.update(updateAtomic).catch(err => {
        console.warn('Actualización atómica diferida (se consolidará en save):', err);
      });
    } catch(e) {
      console.warn('Error en FieldValue.increment:', e);
    }
  }
}
function addMaterialMove({fleteroId,ref,source,palletOut=0,palletIn=0,chapOut=0,chapIn=0,date=null}){db.materialMoves.push({id:uid('mat'),date:date||now(),fleteroId,ref,source,palletOut:+palletOut||0,palletIn:+palletIn||0,chapOut:+chapOut||0,chapIn:+chapIn||0,user:session.user,shift:session.shift})}

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
  
  if(!has)return toast('Ingrese al menos una cantidad.', 'error');
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
 if(!tRemit.value.trim())return toast('El número de remito es obligatorio.', 'error');
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

function openAdjustment(){
 modal(`<div class="headrow"><h2>Ajuste de stock</h2><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div><div class="formgrid"><div><label>Producto</label><select id="aProduct">${productOptions()}</select></div><div><label>Tipo</label><select id="aDir"><option value="in">Ajuste positivo</option><option value="out">Ajuste negativo</option></select></div><div><label>Fardos</label><input id="aPacks" class="field" type="number" min="0" value="0"></div><div><label>Unidades</label><input id="aUnits" class="field" type="number" min="0" value="0"></div><div class="span2"><label>Justificación obligatoria</label><textarea id="aNote"></textarea></div></div><div class="right"><button class="btn btn-primary" onclick="saveAdjustment()">Guardar ajuste</button></div>`)
}
function saveAdjustment(){if(!aNote.value.trim())return toast('La justificación es obligatoria.', 'error');let p=db.products.find(x=>x.id===aProduct.value),n=normalize(aPacks.value,aUnits.value,p);if(!n.total)return;addStockMove({type:aDir.value==='in'?'Ajuste positivo':'Ajuste negativo',ref:'Inventario',productId:p.id,total:n.total,dir:aDir.value,note:aNote.value});save();closeModal()}

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
 let c=db.counts.find(x=>x.id===id);
 customConfirm('¿Confirma que recibe el stock indicado por el turno anterior?', () => {
    c.status='Corroborado';c.correlatedBy=session.user;c.correlatedAt=now();save();
    toast('Conteo corroborado');
 });
}


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
    let annulBtn = (!m.annulled && !m.source.startsWith('Anulación')) ? `<button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="annulMaterialMove('${m.id}')">Anular</button>` : '';
    let stateHtml = m.annulled ? '<br><b class="danger">ANULADO</b>' : '';
    return `<tr><td>${fmtDate(m.date)}${stateHtml}</td><td>${f?.name || ''}</td><td>${m.ref}</td><td>${m.source}</td><td>${m.palletOut}</td><td>${m.palletIn}</td><td>${m.chapOut}</td><td>${m.chapIn}</td><td>Pallets: ${m.palletOut - m.palletIn}; Chapadur: ${m.chapOut - m.chapIn}<br>${annulBtn}</td></tr>`
  }).join('');
}

window.annulMaterialMove = function(id) {
  let m = db.materialMoves.find(x => x.id === id);
  if (!m || m.annulled) return;
  customConfirm('¿Estás seguro de que deseas anular este movimiento de materiales? Esto generará un movimiento inverso para corregir la cuenta corriente del fletero.', () => {
    addMaterialMove({
      fleteroId: m.fleteroId,
      ref: m.ref + ' (Anul.)',
      source: 'Anulación de ' + m.source,
      palletOut: -m.palletOut,
      palletIn: -m.palletIn,
      chapOut: -m.chapOut,
      chapIn: -m.chapIn
    });
    m.annulled = true;
    save();
    renderMaterials();
    toast('Movimiento anulado correctamente');
  });
};

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

window.openStockAuditModal = function() {
  if (!db || !db.stock || !db.movements) return toast('Datos no cargados.', 'error');
  
  const baseline = typeof VERIFIED_STOCK_OCT16_1300 !== 'undefined' ? VERIFIED_STOCK_OCT16_1300 : {};
  const BASE_DATE_ISO = '2026-10-16T16:14:00.000Z';
  
  let netMoves = {};
  (db.products || []).forEach(p => { netMoves[p.id] = 0; });

  (db.movements || []).forEach(m => {
    if (!m || m._deleted || !m.productId) return;
    if (m.date && m.date > BASE_DATE_ISO) {
      let delta = m.dir === 'in' ? Number(m.total || 0) : -Number(m.total || 0);
      netMoves[m.productId] = (netMoves[m.productId] || 0) + delta;
    }
  });

  let rows = (db.products || []).filter(p => typeof OBSOLETE_PRODUCT_IDS !== 'undefined' ? !OBSOLETE_PRODUCT_IDS.includes(p.id) : true).map(p => {
    let base = baseline[p.id] || 0;
    let net = netMoves[p.id] || 0;
    let calculated = base + net;
    let current = Number(db.stock[p.id] || 0);
    let diff = current - calculated;
    return { p, base, net, calculated, current, diff };
  });

  let discrepanciesCount = rows.filter(r => r.diff !== 0).length;

  let html = `
  <div class="headrow">
    <div>
      <h2>Auditoría y Calibración de Stock</h2>
      <div class="muted">Compara el saldo físico del sistema con la suma de la base verificada y los movimientos registrados.</div>
    </div>
    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
  </div>
  <div style="margin: 12px 0; padding: 10px; background: ${discrepanciesCount ? '#fef3c7' : '#ecfdf5'}; border-radius: 6px; font-size: 13px; color: #1e293b;">
    ${discrepanciesCount 
      ? `<b>Atención:</b> Se detectaron <b>${discrepanciesCount}</b> productos con desfasaje entre el stock actual y los movimientos registrados.` 
      : '<b>Excelente:</b> El stock actual del sistema coincide al 100% con los movimientos registrados.'}
  </div>
  <div class="tablewrap" style="max-height: 380px; overflow-y: auto;">
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Producto</th>
          <th style="text-align:right">Stock Actual</th>
          <th style="text-align:right">Base + Movs</th>
          <th style="text-align:right">Diferencia</th>
          <th style="text-align:center">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          let diffText = r.diff === 0 ? '0' : (r.diff > 0 ? `+${r.diff}` : `${r.diff}`);
          let diffColor = r.diff === 0 ? '#10b981' : (r.diff > 0 ? '#d97706' : '#ef4444');
          let statusChip = r.diff === 0 
            ? '<span class="status done">Correcto</span>' 
            : `<span class="status danger">${r.diff > 0 ? 'Excedente' : 'Faltante'}</span>`;
          return `<tr>
            <td><b>${r.p.id}</b></td>
            <td>${r.p.name}</td>
            <td style="text-align:right; font-weight:bold;">${equivalent(r.current, r.p)}</td>
            <td style="text-align:right;">${equivalent(r.calculated, r.p)}</td>
            <td style="text-align:right; color:${diffColor}; font-weight:bold;">${diffText} un.</td>
            <td style="text-align:center;">${statusChip}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  <div class="right" style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
    <div style="font-size: 12px; color: var(--muted);">Base de referencia: 16/10/2026 13:14 hs.</div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-primary" onclick="executeStockAlignment()" ${discrepanciesCount === 0 ? 'disabled' : ''}>Alinear Stock con Movimientos</button>
    </div>
  </div>`;

  modal(html);
};

window.executeStockAlignment = function() {
  if (typeof isAuthorizedWriter === 'function' && !isAuthorizedWriter(session)) {
    return alert('Acceso denegado: Tu usuario está en modo SOLO LECTURA.');
  }
  customConfirm('¿Confirma que desea ajustar el stock del sistema al saldo exacto calculado por los movimientos registrados? Esto resolverá cualquier desfasaje por concurrencia.', () => {
    const baseline = typeof VERIFIED_STOCK_OCT16_1300 !== 'undefined' ? VERIFIED_STOCK_OCT16_1300 : {};
    const BASE_DATE_ISO = '2026-10-16T16:14:00.000Z';
    
    let netMoves = {};
    (db.products || []).forEach(p => { netMoves[p.id] = 0; });

    (db.movements || []).forEach(m => {
      if (!m || m._deleted || !m.productId) return;
      if (m.date && m.date > BASE_DATE_ISO) {
        let delta = m.dir === 'in' ? Number(m.total || 0) : -Number(m.total || 0);
        netMoves[m.productId] = (netMoves[m.productId] || 0) + delta;
      }
    });

    (db.products || []).forEach(p => {
      if (typeof OBSOLETE_PRODUCT_IDS !== 'undefined' && OBSOLETE_PRODUCT_IDS.includes(p.id)) return;
      let base = baseline[p.id] || 0;
      let net = netMoves[p.id] || 0;
      let correctStock = Math.max(0, base + net);
      db.stock[p.id] = correctStock;
      if (typeof v1EnsureBucket === 'function') {
        v1EnsureBucket(p.id).physical = correctStock;
      }
    });

    audit('Alineación', 'Stock', 'Auto-Reconciliación', 'Calibración automática con suma de movimientos');
    if (typeof saveStock === 'function') saveStock();
    else save();
    closeModal();
    if (typeof renderStockV1 === 'function') renderStockV1();
    toast('Stock alineado y sincronizado exitosamente con el registro de movimientos');
  });
};