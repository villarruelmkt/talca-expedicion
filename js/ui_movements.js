// ------------------------------------------------------------------
// MOVIMIENTOS: agrupación por operación
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
  body.innerHTML=list.map(g=>`<tr>
    <td>${fmtDate(g.date)}</td>
    <td>${v14Text(g.type)}${g.count>1?`<span class="v16-group-badge">${g.count} productos</span>`:''}</td>
    <td>${v14Text(g.ref||'')}</td>
    <td>${g.input?v16FmtFardos(g.input):''}</td>
    <td>${g.output?v16FmtFardos(g.output):''}</td>
    <td>${g.neutral?v16FmtFardos(g.neutral):''}</td>
    <td>${v14Text(g.user||'')}</td>
    <td>${v14Text(g.shift||'')}</td>
    ${renderEditMovementBtn(g)}
  </tr>`).join('')||'<tr><td colspan="9" class="muted">No hay movimientos registrados.</td></tr>';
}

function editMovement(id) {
  let m = db.movements.find(x => x.id === id);
  if (!m) return;
  let groupedMoves = m.operationId ? db.movements.filter(x => x.operationId === m.operationId) : [m];
  
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
  
  let groupedMoves = m.operationId ? db.movements.filter(x => x.operationId === m.operationId) : [m];
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
