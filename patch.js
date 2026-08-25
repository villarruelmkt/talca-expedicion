const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

code = code.replace(
\unction accreditEmployees(){
  if(new Date().getDate()!==15)return;
  let yr=new Date().getFullYear(),mo=new Date().getMonth();
  if(db.accreditation_log&&db.accreditation_log.yr===yr&&db.accreditation_log.mo===mo)return;
  db.employees.forEach(e=>{if(e.active)e.balance=(e.balance||0)+2});
  db.accreditation_log={yr,mo};save()
}
function loginUser(){\,
\unction accreditEmployees(){
  if(new Date().getDate()!==15)return;
  let yr=new Date().getFullYear(),mo=new Date().getMonth();
  if(db.accreditation_log&&db.accreditation_log.yr===yr&&db.accreditation_log.mo===mo)return;
  db.employees.forEach(e=>{if(e.active)e.balance=(e.balance||0)+2});
  db.accreditation_log={yr,mo};save()
}
function manualAccreditEmployees() {
  if(confirm('¿Deseas sumar 2 fardos de beneficio a todos los empleados activos ahora mismo?')) {
    db.employees.forEach(e => {
      if(e.active) e.balance = (e.balance || 0) + 2;
    });
    audit('Acreditación manual', 'Empleados', 'Global', 'Acreditación manual de +2 fardos a activos');
    save();
    renderAll();
    alert('Beneficio acreditado correctamente.');
  }
}
function loginUser(){\);

code = code.replace(
\  modal(\\\<div class="headrow"><div><h2>\ orden</h2><div class="muted">Operación completa: Entrega de mercadería, devolución de materiales y cobros.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>N° de orden / comprobante</label><input id="v13Number" class="field" value="\"></div>
    <div><label>Fecha</label><input id="v13Date" class="field" type="date" value="\"></div>
    <div><label>Fletero asignado</label><select id="v13Carrier">\</select></div>\
,
\  modal(\\\<div class="headrow"><div><h2>\ orden</h2><div class="muted">Operación completa: Entrega de mercadería, devolución de materiales y cobros.</div></div><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  <div class="formgrid">
    <div><label>Fecha</label><input id="v13Date" class="field" type="date" value="\"></div>
    <div><label>N° de orden / comprobante</label><input id="v13Number" class="field" value="\"></div>
    <div><label>Fletero asignado</label><select id="v13Carrier">\</select></div>\
);

code = code.replace(
\  let lines=v13CollectLines(),existing=lines.find(l=>l.productId===pid);
  if(existing)existing.total+=qt;
  else lines.push({productId:pid,sourceProductId:pid,total:qt});
  v14UpdateConfirmedList(lines);
  document.getElementById('v14SearchInput').value='';
  document.getElementById('v14ProductResults').classList.add('hidden');
};\,
\  let lines = v13CollectLines();
  let existingIndex = lines.findIndex(l => l.productId === pid);
  if(existingIndex >= 0) {
    lines[existingIndex].total += qt;
  } else {
    lines.push({productId:pid, sourceProductId:pid, total:qt});
  }
  lines.sort((a,b) => String(a.productId).localeCompare(String(b.productId)));
  v14UpdateConfirmedList(lines);
  document.getElementById('v14SearchInput').value='';
  document.getElementById('v14ProductResults').classList.add('hidden');
};\);

fs.writeFileSync('app.js', code);
