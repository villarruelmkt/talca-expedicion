
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
}