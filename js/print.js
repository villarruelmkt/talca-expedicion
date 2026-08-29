
function setPrintableDocument(title,bodyHtml){
 currentPrintTitle=title||'Comprobante';
 currentPrintBody=bodyHtml||'';
}
function renderPrintArea(){
 let area=document.getElementById('printArea');
 area.innerHTML=`<div class="print-brand">TALCA · Expedición</div>${currentPrintBody}`;
}
function printCurrentDocument(){
 if(!currentPrintBody){toast('No hay un comprobante preparado para imprimir.', 'error');return}
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
}function generateShiftSummary(){
 let today=new Date().toISOString().slice(0,10),moves=db.movements.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift),mats=db.materialMoves.filter(m=>m.date.slice(0,10)===today&&m.shift===session.shift);
 let byType={};moves.forEach(m=>byType[m.type]=(byType[m.type]||0)+1);
 let body=`<h1>Resumen de turno</h1><p><b>Fecha:</b> ${today} Â· <b>Turno:</b> ${session.shift} Â· <b>Encargado:</b> ${session.user}</p>
 <h2>Movimientos</h2><table><thead><tr><th>Tipo</th><th>Cantidad de registros</th></tr></thead><tbody>${Object.entries(byType).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
 <h2>Materiales</h2><p>Pallets entregadas: ${mats.reduce((s,m)=>s+m.palletOut,0)} Â· devueltas: ${mats.reduce((s,m)=>s+m.palletIn,0)}</p><p>Chapadur entregado: ${mats.reduce((s,m)=>s+m.chapOut,0)} Â· devuelto: ${mats.reduce((s,m)=>s+m.chapIn,0)}</p>
 <h2>Pendientes</h2><p>Ã“rdenes parciales: ${db.orders.filter(o=>o.status==='Parcial').length} Â· Cambios sin informar: ${db.orders.filter(o=>o.billing==='Pendiente de aviso').length}</p>`;
 setPrintableDocument('Resumen de turno',body);printCurrentDocument()
}

