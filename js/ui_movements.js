// ------------------------------------------------------------------
// MOVIMIENTOS: agrupación por operación
// ------------------------------------------------------------------
function v16GroupedMovements(){
  let output=[],map=new Map();

  [...(db.movements||[])].forEach(m=>{
    if(!v16IsGroupedMovement(m)){
      output.push({
        key:`SINGLE|${m.id}`,
        id:m.id,
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
        key,id:m.id,date:m.operationDate||m.date,
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
  return output.sort((a,b)=>(b.date||'') > (a.date||'') ? 1 : ((b.date||'') < (a.date||'') ? -1 : 0));
}

function renderEditMovementBtn(g) {
  let editableTypes = ['Producción', 'Rebote', 'Derrame', 'Recepción desde Mendoza', 'Recepción desde San Juan', 'Envío a Mendoza', 'Envío a San Juan'];
  if (editableTypes.includes(g.type)) {
    return `<td class="no-print"><button class="btn btn-secondary" onclick="editMovement('${g.id}')">Corregir</button></td>`;
  }
  return '<td class="no-print"></td>';
}

function renderMovementsV16(){
  let body=document.getElementById('movementsBody');if(!body)return;
  let list=v16GroupedMovements();
  
  let fromD = document.getElementById('movFrom')?.value;
  let toD = document.getElementById('movTo')?.value;
  let t = document.getElementById('movType')?.value;

  if (fromD) list = list.filter(g => g.date >= fromD);
  if (toD) list = list.filter(g => g.date <= toD + 'T23:59:59');
  if (t === 'Producción') {
    list = list.filter(g => (g.type === 'Producción' || g.type === 'Producción sin codificar') && !String(g.ref || '').toLowerCase().includes('mendoza'));
  } else if (t === 'Producción Mendoza' || t === 'Mendoza') {
    list = list.filter(g => {
      let typeNorm = String(g.type || '').toLowerCase();
      let refNorm = String(g.ref || '').toLowerCase();
      let isMendoza = typeNorm.includes('mendoza');
      let isIncoming = isMendoza && (g.input > 0 || typeNorm.includes('recep') || typeNorm.includes('ingreso') || typeNorm.includes('produc'));
      let isProdMendoza = typeNorm.includes('produc') && refNorm.includes('mendoza');
      return isIncoming || isProdMendoza;
    });
  } else if (t) {
    list = list.filter(g => g.type === t);
  }

  let totalCount = list.length;
  let isCapped = false;

  if (!list.length) {
    body.innerHTML = '<tr><td colspan="9" class="muted" style="text-align:center;padding:16px;">No hay movimientos registrados para los filtros seleccionados.</td></tr>';
    return;
  }

  // Cálculo de totales para el totalizado final (Entrada, Salida, Sin impacto)
  let totalInput = 0;
  let totalOutput = 0;
  let totalNeutral = 0;
  list.forEach(g => {
    totalInput += (Number(g.input) || 0);
    totalOutput += (Number(g.output) || 0);
    totalNeutral += (Number(g.neutral) || 0);
  });

  let rowsHtml = list.map(g=>`<tr>
    <td>${fmtDate(g.date)}</td>
    <td>${v14Text(g.type)}${g.count>1?`<span class="v16-group-badge">${g.count} productos</span>`:''}</td>
    <td>${v14Text(g.ref||'')}</td>
    <td>${g.input?v16FmtFardos(g.input):''}</td>
    <td>${g.output?v16FmtFardos(g.output):''}</td>
    <td>${g.neutral?v16FmtFardos(g.neutral):''}</td>
    <td>${v14Text(g.user||'')}</td>
    <td>${v14Text(g.shift||'')}</td>
    ${renderEditMovementBtn(g)}
  </tr>`).join('');

  if (isCapped) {
    rowsHtml += `<tr><td colspan="9" style="text-align:center;background:var(--card);color:var(--muted);padding:10px;font-size:13px;font-weight:bold;">Mostrando los 200 movimientos más recientes de ${totalCount}. Utilice los filtros 'Desde', 'Hasta' o 'Tipo' para ver operaciones anteriores.</td></tr>`;
  }

  let totalRowHtml = `<tr class="v16-movements-total" style="font-weight:bold;background:#eef2ff;border-top:2px solid #19417f;border-bottom:2px solid #19417f;">
    <td colspan="3" style="font-weight:bold;text-align:left;padding:8px 10px;">TOTALIZADO FINAL (${list.length} ${list.length === 1 ? 'operación' : 'operaciones'}${isCapped ? ' mostradas' : ''})</td>
    <td style="font-weight:bold;color:#059669;padding:8px 10px;">${totalInput ? v16FmtFardos(totalInput) : '-'}</td>
    <td style="font-weight:bold;color:#dc2626;padding:8px 10px;">${totalOutput ? v16FmtFardos(totalOutput) : '-'}</td>
    <td style="font-weight:bold;color:#4b5563;padding:8px 10px;">${totalNeutral ? v16FmtFardos(totalNeutral) : '-'}</td>
    <td colspan="2" style="font-size:11px;color:#6b7280;vertical-align:middle;padding:8px 10px;">Total consolidado</td>
    <td class="no-print"></td>
  </tr>`;

  rowsHtml += totalRowHtml;

  body.innerHTML = rowsHtml;
}

window.clearMovFilters = function() {
  if(document.getElementById('movFrom')) document.getElementById('movFrom').value = '';
  if(document.getElementById('movTo')) document.getElementById('movTo').value = '';
  if(document.getElementById('movType')) document.getElementById('movType').value = '';
  renderMovementsV16();
};
function editMovement(id) {
  let m = db.movements.find(x => x.id === id);
  if (!m) return;
  let groupedMoves = m.operationId ? db.movements.filter(x => x.operationId === m.operationId) : db.movements.filter(x => x.type === m.type && x.ref === m.ref && String(x.date).slice(0, 19) === String(m.date).slice(0, 19));
  if (!groupedMoves.length) groupedMoves = [m];
  
  let lines = groupedMoves.map(move => {
    let p = db.products.find(x => x.id === move.productId);
    let eq = p ? equivalent(move.total, p) : move.total;
    return `<div><b>${v14Text(p?.name || move.productId)}</b>: ${eq}</div>`;
  }).join('');

  let oldDateStr = m.date.slice(0, 10);
  
  modal(`<div class="headrow"><div><h2>Corregir ${m.type}</h2></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="summary">
    ${lines}
    <div class="muted">Ref: ${v14Text(m.ref || '')}</div>
  </div>
  <div class="formgrid" style="margin-top:16px;">
    <div><label>Nueva fecha</label><input id="emDate" type="date" class="field" value="${oldDateStr}"></div>
    <div><label>Nueva referencia</label><input id="emRef" class="field" value="${v14Text(m.ref || '')}"></div>
  </div>
  <div class="alert" style="margin-top:16px;"><b>Aviso:</b> Guardar los cambios actualizará la fecha y referencia para los productos asociados a este movimiento.</div>
  <div class="right" style="margin-top:16px">
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveEditMovement('${m.id}')">Guardar corrección</button>
  </div>`);
}

function saveEditMovement(id) {
  let m = db.movements.find(x => x.id === id);
  if (!m) return closeModal();
  let newDateStr = document.getElementById('emDate').value;
  let newRef = document.getElementById('emRef').value;
  
  let newDate = newDateStr ? new Date(newDateStr + 'T12:00:00').toISOString() : m.date;
  
  let groupedMoves = m.operationId ? db.movements.filter(x => x.operationId === m.operationId) : db.movements.filter(x => x.type === m.type && x.ref === m.ref && String(x.date).slice(0, 19) === String(m.date).slice(0, 19));
  if (!groupedMoves.length) groupedMoves = [m];
  groupedMoves.forEach(move => {
    move.date = newDate;
    move.ref = newRef;
  });
  
  audit('Corrección', m.type, newRef, 'Fecha/Ref editada');
  save();
  closeModal();
  renderAll();
}
renderMovementsV11=renderMovementsV16;

// ------------------------------------------------------------------
// RESUMEN DE CONSUMOS Y EGRESOS (Empleados, Anticipos e Internos)
// ------------------------------------------------------------------
function getConsumptionCategory(m) {
  let t = String(m.type || '').trim();
  if (t.startsWith('Consumo de empleado')) return 'consumo_empleado';
  if (t.startsWith('Anticipo empleado')) return 'anticipo_empleado';
  if (t.toLowerCase().startsWith('consumo interno') || t.toLowerCase().includes('consumo interno')) return 'consumo_interno';
  return null;
}

function getConsumptionBeneficiary(m, cat) {
  if (cat === 'consumo_interno') {
    return m.ref || m.type || 'Buffet / Consumo interno';
  }
  if (m.employeeName) return m.employeeName;
  let t = String(m.type || '');
  let cleaned = t.replace(/^(Consumo de empleado|Anticipo empleado)\s*-\s*/, '').trim();
  if (cleaned && cleaned !== t) return cleaned;
  return m.ref ? `Legajo ${m.ref}` : 'Empleado';
}

function getFilteredConsumptionData(from, to, typeFilter, userFilter) {
  let moves = (db.movements || []).filter(m => {
    if (m.annulled) return false;
    let cat = getConsumptionCategory(m);
    if (!cat) return false;
    if (typeFilter && typeFilter !== 'all' && cat !== typeFilter) return false;
    let mDate = String(m.date || '').slice(0, 10);
    if (from && mDate < from) return false;
    if (to && mDate > to) return false;
    if (userFilter && String(m.user || '').trim().toLowerCase() !== userFilter.trim().toLowerCase()) return false;
    return true;
  });

  let opMap = new Map();
  moves.forEach(m => {
    let cat = getConsumptionCategory(m);
    let opKey = m.operationId ? `OP|${m.operationId}` :
                m.receiptNumber ? `REC|${m.receiptNumber}` :
                `${cat}|${m.ref || ''}|${m.user || ''}|${m.shift || ''}|${String(m.date || '').slice(0, 19)}`;

    if (!opMap.has(opKey)) {
      opMap.set(opKey, {
        key: opKey,
        date: m.date,
        category: cat,
        categoryLabel: cat === 'consumo_empleado' ? 'Consumo de empleado' : (cat === 'anticipo_empleado' ? 'Anticipo empleado' : 'Consumo interno'),
        beneficiary: getConsumptionBeneficiary(m, cat),
        user: m.user || 'Desconocido',
        shift: m.shift || 'Sin turno',
        receiptNumber: m.receiptNumber || '',
        notes: [],
        items: [],
        totalUnits: 0,
        totalFardos: 0
      });
    }

    let op = opMap.get(opKey);
    if (String(m.date || '') > String(op.date || '')) op.date = m.date;
    if (m.note && !op.notes.includes(m.note)) op.notes.push(m.note);

    let p = (db.products || []).find(x => x.id === m.productId);
    let pName = p ? p.name : m.productId;
    let units = Number(m.total) || 0;
    let fardos = (p && p.pack) ? (units / p.pack) : units;
    let fardosEq = p ? equivalent(units, p) : `${units} u.`;

    op.items.push({
      productId: m.productId,
      productName: pName,
      units: units,
      fardos: fardos,
      fardosEq: fardosEq
    });
    op.totalUnits += units;
    op.totalFardos += fardos;
  });

  let operations = Array.from(opMap.values()).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  let totals = {
    consumoEmpleado: { fardos: 0, count: 0 },
    anticipoEmpleado: { fardos: 0, count: 0 },
    consumoInterno: { fardos: 0, count: 0 },
    general: { fardos: 0, count: 0 }
  };

  let productMap = new Map();

  operations.forEach(op => {
    if (op.category === 'consumo_empleado') {
      totals.consumoEmpleado.fardos += op.totalFardos;
      totals.consumoEmpleado.count++;
    } else if (op.category === 'anticipo_empleado') {
      totals.anticipoEmpleado.fardos += op.totalFardos;
      totals.anticipoEmpleado.count++;
    } else if (op.category === 'consumo_interno') {
      totals.consumoInterno.fardos += op.totalFardos;
      totals.consumoInterno.count++;
    }
    totals.general.fardos += op.totalFardos;
    totals.general.count++;

    op.items.forEach(it => {
      if (!productMap.has(it.productId)) {
        productMap.set(it.productId, { name: it.productName, fardos: 0, units: 0 });
      }
      let prodAgg = productMap.get(it.productId);
      prodAgg.fardos += it.fardos;
      prodAgg.units += it.units;
    });
  });

  let productBreakdown = Array.from(productMap.values()).sort((a, b) => b.fardos - a.fardos);

  return {
    operations,
    totals,
    productBreakdown,
    from,
    to,
    typeFilter,
    userFilter
  };
}

window.openConsumptionSummaryModal = function() {
  let nowD = new Date();
  let y = nowD.getFullYear();
  let m = String(nowD.getMonth() + 1).padStart(2, '0');
  let d = String(nowD.getDate()).padStart(2, '0');
  let toDefault = `${y}-${m}-${d}`;
  let fromDefault = `${y}-${m}-01`;

  let userSet = new Set();
  (db.movements || []).forEach(move => {
    if (move.user && getConsumptionCategory(move)) {
      userSet.add(String(move.user).trim());
    }
  });
  (db.users || []).forEach(u => {
    let name = (u.displayName || u.username || '').trim();
    if (name) userSet.add(name);
  });
  let userOptions = Array.from(userSet).sort().map(u => `<option value="${v14Text(u)}">${v14Text(u)}</option>`).join('');

  let html = `
    <div class="headrow">
      <div>
        <h2>Resumen de consumos y egresos</h2>
        <div class="muted">Consumos de empleados, anticipos y consumos internos con fecha y encargado.</div>
      </div>
      <button class="btn btn-secondary no-print" onclick="closeModal()">Cerrar</button>
    </div>

    <div class="card no-print" style="margin-bottom:14px; background:var(--bg); border:1px solid var(--line); padding:12px; border-radius:12px;">
      <div class="formgrid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:10px; margin-bottom:0;">
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Desde</label>
          <input id="csFrom" type="date" class="field" value="${fromDefault}" onchange="renderConsumptionSummaryPreview()">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Hasta</label>
          <input id="csTo" type="date" class="field" value="${toDefault}" onchange="renderConsumptionSummaryPreview()">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Tipo de movimiento</label>
          <select id="csType" class="field" onchange="renderConsumptionSummaryPreview()">
            <option value="all">Todos (Consumos, Anticipos y Buffet)</option>
            <option value="consumo_empleado">Solo Consumos de empleados</option>
            <option value="anticipo_empleado">Solo Anticipos de empleados</option>
            <option value="consumo_interno">Solo Consumos internos (Buffet)</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Encargado</label>
          <select id="csUser" class="field" onchange="renderConsumptionSummaryPreview()">
            <option value="">Todos los encargados</option>
            ${userOptions}
          </select>
        </div>
      </div>
    </div>

    <div id="csPreview" style="max-height:55vh; overflow-y:auto; margin-bottom:14px; padding-right:4px;"></div>

    <div class="headrow no-print" style="justify-content:flex-end; gap:8px; margin-bottom:0;">
      <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-primary" onclick="printConsumptionSummaryReport()">🖨️ Imprimir documento</button>
    </div>
  `;

  modal(html);
  renderConsumptionSummaryPreview();
};

window.renderConsumptionSummaryPreview = function() {
  let box = document.getElementById('csPreview');
  if (!box) return;

  let from = document.getElementById('csFrom')?.value || '';
  let to = document.getElementById('csTo')?.value || '';
  let typeFilter = document.getElementById('csType')?.value || 'all';
  let userFilter = document.getElementById('csUser')?.value || '';

  let data = getFilteredConsumptionData(from, to, typeFilter, userFilter);

  if (!data.operations.length) {
    box.innerHTML = `<div class="card" style="text-align:center; padding:28px; color:var(--muted);">
      No se encontraron movimientos de consumos o anticipos para los filtros seleccionados.
    </div>`;
    return;
  }

  function fmtFardosVal(val) {
    let num = Number(val || 0);
    return `${num.toLocaleString('es-AR', { maximumFractionDigits: 2 })} fardos`;
  }

  let kpisHtml = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:14px;">
      <div class="card" style="padding:12px; border-left:4px solid #2563eb;">
        <span class="muted" style="font-size:11px; font-weight:bold; text-transform:uppercase;">Consumo Empleados</span>
        <b style="display:block; font-size:18px; color:var(--ink); margin-top:4px;">${fmtFardosVal(data.totals.consumoEmpleado.fardos)}</b>
        <small class="muted">${data.totals.consumoEmpleado.count} comprobante(s)</small>
      </div>
      <div class="card" style="padding:12px; border-left:4px solid #d97706;">
        <span class="muted" style="font-size:11px; font-weight:bold; text-transform:uppercase;">Anticipos Empleados</span>
        <b style="display:block; font-size:18px; color:var(--ink); margin-top:4px;">${fmtFardosVal(data.totals.anticipoEmpleado.fardos)}</b>
        <small class="muted">${data.totals.anticipoEmpleado.count} comprobante(s)</small>
      </div>
      <div class="card" style="padding:12px; border-left:4px solid #7c3aed;">
        <span class="muted" style="font-size:11px; font-weight:bold; text-transform:uppercase;">Consumo Interno (Buffet)</span>
        <b style="display:block; font-size:18px; color:var(--ink); margin-top:4px;">${fmtFardosVal(data.totals.consumoInterno.fardos)}</b>
        <small class="muted">${data.totals.consumoInterno.count} salida(s)</small>
      </div>
      <div class="card" style="padding:12px; border-left:4px solid #10b981; background:var(--row-alt);">
        <span class="muted" style="font-size:11px; font-weight:bold; text-transform:uppercase;">Total Egresado</span>
        <b style="display:block; font-size:18px; color:var(--ink); margin-top:4px;">${fmtFardosVal(data.totals.general.fardos)}</b>
        <small class="muted">${data.totals.general.count} operación(es) en total</small>
      </div>
    </div>
  `;

  let productsHtml = '';
  if (data.productBreakdown.length > 0) {
    productsHtml = `
      <div class="card" style="padding:12px; margin-bottom:14px;">
        <div style="font-weight:700; font-size:13px; margin-bottom:8px; display:flex; justify-content:space-between;">
          <span>Totales consolidados por producto</span>
          <span class="muted" style="font-size:12px;">${data.productBreakdown.length} producto(s)</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:6px 12px; font-size:12px;">
          ${data.productBreakdown.map(p => `
            <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px dashed var(--line);">
              <span style="color:var(--ink);">${v14Text(p.name)}</span>
              <b style="color:var(--brand); white-space:nowrap; margin-left:8px;">${fmtFardosVal(p.fardos)}</b>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  let rowsHtml = data.operations.map(op => {
    let badgeColor = op.category === 'consumo_empleado' ? '#2563eb' : (op.category === 'anticipo_empleado' ? '#d97706' : '#7c3aed');
    let badgeBg = op.category === 'consumo_empleado' ? 'rgba(37,99,235,0.1)' : (op.category === 'anticipo_empleado' ? 'rgba(217,119,6,0.1)' : 'rgba(124,58,237,0.1)');

    let itemsStr = op.items.map(it => `<div><b>${v14Text(it.productName)}</b>: ${it.fardosEq}</div>`).join('');
    let noteStr = op.notes.filter(Boolean).join(' · ');

    return `
      <tr>
        <td style="font-size:12px; vertical-align:top;">${fmtDate(op.date)}</td>
        <td style="vertical-align:top;">
          <span style="font-size:11px; font-weight:700; color:${badgeColor}; background:${badgeBg}; padding:2px 6px; border-radius:4px; display:inline-block;">
            ${v14Text(op.categoryLabel)}
          </span>
          ${op.receiptNumber ? `<div class="muted" style="font-size:10px;">Nº ${v14Text(op.receiptNumber)}</div>` : ''}
        </td>
        <td style="font-size:13px; font-weight:600; vertical-align:top;">${v14Text(op.beneficiary)}</td>
        <td style="font-size:12px; vertical-align:top;">
          ${itemsStr}
          ${noteStr ? `<div class="muted" style="font-size:11px; margin-top:2px;"><i>${v14Text(noteStr)}</i></div>` : ''}
        </td>
        <td style="font-size:12px; font-weight:600; color:var(--brand); vertical-align:top;">${v14Text(op.user)}</td>
        <td style="font-size:12px; vertical-align:top;">${v14Text(op.shift)}</td>
      </tr>
    `;
  }).join('');

  let tableHtml = `
    <div class="card tablewrap" style="padding:0;">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Beneficiario / Sector</th>
            <th>Productos y Cantidades</th>
            <th>Encargado</th>
            <th>Turno</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  box.innerHTML = kpisHtml + productsHtml + tableHtml;
};

window.printConsumptionSummaryReport = function() {
  let from = document.getElementById('csFrom')?.value || '';
  let to = document.getElementById('csTo')?.value || '';
  let typeFilter = document.getElementById('csType')?.value || 'all';
  let userFilter = document.getElementById('csUser')?.value || '';

  let data = getFilteredConsumptionData(from, to, typeFilter, userFilter);

  if (!data.operations.length) {
    toast('No hay movimientos para imprimir con los filtros seleccionados.', 'error');
    return;
  }

  function fmtFardosVal(val) {
    let num = Number(val || 0);
    return `${num.toLocaleString('es-AR', { maximumFractionDigits: 2 })} fardos`;
  }

  let typeLabel = typeFilter === 'consumo_empleado' ? 'Consumos de Empleados' :
                  typeFilter === 'anticipo_empleado' ? 'Anticipos de Empleados' :
                  typeFilter === 'consumo_interno' ? 'Consumo Interno (Buffet)' :
                  'Todos (Consumos, Anticipos e Internos)';

  let userLabel = userFilter || 'Todos los encargados';
  let dateRangeLabel = (from && to) ? `Del ${from} al ${to}` : (from ? `Desde ${from}` : (to ? `Hasta ${to}` : 'Histórico completo'));

  let metaHtml = `
    <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin-bottom:14px; font-size:12px; color:#1e293b;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <div><b>Período:</b> ${dateRangeLabel} &nbsp;·&nbsp; <b>Tipo:</b> ${typeLabel} &nbsp;·&nbsp; <b>Encargado autorizante:</b> ${v14Text(userLabel)}</div>
        <div><b>Emitido:</b> ${fmtDate(now())} &nbsp;·&nbsp; <b>Turno actual:</b> ${v14Text(session.shift)} (${v14Text(session.user)})</div>
      </div>
    </div>
  `;

  let kpisPrintHtml = `
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:14px; font-size:12px;">
      <div style="border:1px solid #cbd5e1; padding:6px 10px; border-radius:4px; background:#fafafa;">
        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Consumo Empleados</div>
        <div style="font-size:15px; font-weight:bold; color:#1e293b;">${fmtFardosVal(data.totals.consumoEmpleado.fardos)}</div>
        <div style="font-size:10px; color:#64748b;">${data.totals.consumoEmpleado.count} comprobante(s)</div>
      </div>
      <div style="border:1px solid #cbd5e1; padding:6px 10px; border-radius:4px; background:#fafafa;">
        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Anticipos Empleados</div>
        <div style="font-size:15px; font-weight:bold; color:#1e293b;">${fmtFardosVal(data.totals.anticipoEmpleado.fardos)}</div>
        <div style="font-size:10px; color:#64748b;">${data.totals.anticipoEmpleado.count} comprobante(s)</div>
      </div>
      <div style="border:1px solid #cbd5e1; padding:6px 10px; border-radius:4px; background:#fafafa;">
        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold;">Consumo Interno</div>
        <div style="font-size:15px; font-weight:bold; color:#1e293b;">${fmtFardosVal(data.totals.consumoInterno.fardos)}</div>
        <div style="font-size:10px; color:#64748b;">${data.totals.consumoInterno.count} salida(s)</div>
      </div>
      <div style="border:2px solid #19417f; padding:6px 10px; border-radius:4px; background:#f0f7ff;">
        <div style="font-size:10px; color:#19417f; text-transform:uppercase; font-weight:bold;">Total Egresos</div>
        <div style="font-size:16px; font-weight:bold; color:#19417f;">${fmtFardosVal(data.totals.general.fardos)}</div>
        <div style="font-size:10px; color:#19417f;">${data.totals.general.count} operaciones</div>
      </div>
    </div>
  `;

  let prodPrintHtml = '';
  if (data.productBreakdown.length > 0) {
    prodPrintHtml = `
      <div style="margin-bottom:14px;">
        <h3 style="font-size:12px; margin:0 0 6px; text-transform:uppercase; color:#334155; border-bottom:1px solid #cbd5e1; padding-bottom:3px;">
          Consolidado por Producto (${data.productBreakdown.length} items)
        </h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="border:1px solid #cbd5e1; padding:4px 6px; text-align:left;">Producto</th>
              <th style="border:1px solid #cbd5e1; padding:4px 6px; text-align:right;">Fardos Totales</th>
              <th style="border:1px solid #cbd5e1; padding:4px 6px; text-align:right;">Unidades Físicas</th>
            </tr>
          </thead>
          <tbody>
            ${data.productBreakdown.map(p => `
              <tr>
                <td style="border:1px solid #cbd5e1; padding:3px 6px;">${v14Text(p.name)}</td>
                <td style="border:1px solid #cbd5e1; padding:3px 6px; text-align:right; font-weight:bold;">${fmtFardosVal(p.fardos)}</td>
                <td style="border:1px solid #cbd5e1; padding:3px 6px; text-align:right; color:#475569;">${p.units.toLocaleString('es-AR')} u.</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  let opsPrintRows = data.operations.map(op => {
    let itemsStr = op.items.map(it => `${v14Text(it.productName)}: <b>${it.fardosEq}</b>`).join(' &nbsp;·&nbsp; ');
    let noteStr = op.notes.filter(Boolean).join(' · ');

    return `
      <tr style="page-break-inside:avoid;">
        <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:11px; white-space:nowrap;">${fmtDate(op.date)}</td>
        <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:11px; font-weight:600;">
          ${v14Text(op.categoryLabel)}
          ${op.receiptNumber ? `<span style="font-size:10px; color:#64748b; font-weight:normal;"> (${v14Text(op.receiptNumber)})</span>` : ''}
        </td>
        <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:11px; font-weight:bold;">${v14Text(op.beneficiary)}</td>
        <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:11px;">
          ${itemsStr}
          ${noteStr ? `<div style="font-size:10px; color:#64748b; margin-top:2px;">Obs: ${v14Text(noteStr)}</div>` : ''}
        </td>
        <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:11px; white-space:nowrap;">${v14Text(op.user)}</td>
        <td style="border:1px solid #cbd5e1; padding:4px 6px; font-size:11px; white-space:nowrap;">${v14Text(op.shift)}</td>
      </tr>
    `;
  }).join('');

  let opsTablePrintHtml = `
    <div>
      <h3 style="font-size:12px; margin:0 0 6px; text-transform:uppercase; color:#334155; border-bottom:1px solid #cbd5e1; padding-bottom:3px;">
        Detalle Cronológico de Operaciones (${data.operations.length} registros)
      </h3>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="border:1px solid #cbd5e1; padding:5px 6px; text-align:left;">Fecha</th>
            <th style="border:1px solid #cbd5e1; padding:5px 6px; text-align:left;">Tipo</th>
            <th style="border:1px solid #cbd5e1; padding:5px 6px; text-align:left;">Beneficiario / Sector</th>
            <th style="border:1px solid #cbd5e1; padding:5px 6px; text-align:left;">Detalle de Productos</th>
            <th style="border:1px solid #cbd5e1; padding:5px 6px; text-align:left;">Encargado</th>
            <th style="border:1px solid #cbd5e1; padding:5px 6px; text-align:left;">Turno</th>
          </tr>
        </thead>
        <tbody>
          ${opsPrintRows}
        </tbody>
      </table>
    </div>
  `;

  let printStyle = `
    <style>
      @page { margin: 10mm; size: portrait; }
      #printArea { font-family: Inter, system-ui, -apple-system, sans-serif !important; color: #0f172a !important; }
      #printArea table { border-collapse: collapse !important; }
      #printArea tr { page-break-inside: avoid !important; }
    </style>
  `;

  // Omitiendo el pie de firmas en el documento imprimible según requerimiento
  let fullPrintContent = printStyle + metaHtml + kpisPrintHtml + prodPrintHtml + opsTablePrintHtml;

  setPrintableDocument('Resumen de consumos y egresos', fullPrintContent, 'report', 'Expedición Salta');
  printCurrentDocument();
};

