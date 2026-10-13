// ------------------------------------------------------------------
// ÓRDENES: nuevas arriba, sin columna Materiales, selección múltiple para impresión combinada
// ------------------------------------------------------------------

window.selectedOrderIds = window.selectedOrderIds || new Set();

function updateCombinedOrdersBtn() {
  let btn = document.getElementById('btnPrintCombinedOrders');
  let countEl = document.getElementById('combinedOrderCount');
  let count = (window.selectedOrderIds || new Set()).size;
  if (countEl) countEl.textContent = count;
  if (btn) {
    if (count >= 2) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }
}
window.updateCombinedOrdersBtn = updateCombinedOrdersBtn;

function toggleOrderSelection(chk) {
  let id = chk.value;
  let o = (db.orders || []).find(x => x.id === id);
  if (!o) return;

  if (chk.checked) {
    // Si ya hay órdenes seleccionadas, verificar que coincida el fletero
    if (window.selectedOrderIds.size > 0) {
      let firstId = [...window.selectedOrderIds][0];
      let firstOrder = (db.orders || []).find(x => x.id === firstId);
      if (firstOrder && firstOrder.fleteroId !== o.fleteroId) {
        let f1 = v13OrderCarrier(firstOrder);
        let f2 = v13OrderCarrier(o);
        let msg = `Solo se pueden combinar órdenes del mismo fletero.\nActualmente seleccionado: ${v13CarrierDisplay(f1)}.\nEsta orden pertenece a: ${v13CarrierDisplay(f2)}.`;
        if (typeof toast === 'function') toast('Las órdenes seleccionadas deben pertenecer al mismo fletero.', 'error');
        else alert(msg);
        chk.checked = false;
        return;
      }
    }
    window.selectedOrderIds.add(id);
  } else {
    window.selectedOrderIds.delete(id);
  }
  updateCombinedOrdersBtn();
}
window.toggleOrderSelection = toggleOrderSelection;

function clearOrderSelection() {
  window.selectedOrderIds.clear();
  document.querySelectorAll('.order-select-chk').forEach(c => c.checked = false);
  updateCombinedOrdersBtn();
}
window.clearOrderSelection = clearOrderSelection;

function formatPalletsForPrint(total, prod) {
  if (!prod || !prod.pack) return { pallets: 0, loose: `${total} un.` };
  let perPallet = prod.pack * (prod.perCut || 20) * (prod.cuts || 4);
  if (perPallet > 0) {
    let pallets = Math.floor(total / perPallet);
    let rem = total % perPallet;
    let fardos = Math.floor(rem / prod.pack);
    let un = rem % prod.pack;
    let loose = `${fardos} fardos${un > 0 ? ' + ' + un + ' un.' : ''}`;
    if (fardos === 0 && un === 0) loose = '0 fardos';
    return { pallets: pallets, loose: loose };
  }
  return { pallets: 0, loose: `${Math.floor(total / prod.pack)} fardos${total % prod.pack ? ' + ' + total % prod.pack + ' un.' : ''}` };
}

function printCombinedOrders() {
  if (!window.selectedOrderIds || window.selectedOrderIds.size < 2) {
    if (typeof toast === 'function') toast('Seleccione al menos dos órdenes del mismo fletero.', 'error');
    else alert('Seleccione al menos dos órdenes del mismo fletero.');
    return;
  }
  let orders = [...window.selectedOrderIds].map(id => (db.orders || []).find(o => o.id === id)).filter(Boolean);
  if (orders.length < 2) {
    if (typeof toast === 'function') toast('No se encontraron las órdenes seleccionadas.', 'error');
    return;
  }

  // 1. Validar regla: mismo fletero
  let carrierId = orders[0].fleteroId;
  let sameCarrier = orders.every(o => o.fleteroId === carrierId);
  if (!sameCarrier) {
    let msg = 'La regla requiere que todas las órdenes combinadas pertenezcan al mismo fletero.';
    if (typeof toast === 'function') toast(msg, 'error');
    else alert(msg);
    return;
  }

  let f = v13OrderCarrier(orders[0]);
  let fName = v14Text(v13CarrierDisplay(f));
  let numbers = orders.map(o => v14Text(o.number)).join(' + ');
  let dates = [...new Set(orders.map(o => v14Text(o.date)))].join(' / ');
  let statuses = [...new Set(orders.map(o => v14Text(Array.isArray(o.requestLines) ? v11OrderStatus(o) : (o.status || ''))))].join(' / ');

  // 2. Consolidación de productos: Total unificado
  let productTotals = new Map();
  orders.forEach(o => {
    if (Array.isArray(o.requestLines) && o.requestLines.length > 0) {
      o.requestLines.forEach(l => {
        let pid = l.productId;
        let qty = Number(l.total || 0);
        productTotals.set(pid, (productTotals.get(pid) || 0) + qty);
      });
    } else if (Array.isArray(o.deliveries) && o.deliveries.length > 0) {
      // Compatibilidad con órdenes históricas / legacy
      o.deliveries.forEach(d => {
        (d.lines || []).forEach(l => {
          let pid = l.productId;
          let qty = Number(l.total || 0);
          productTotals.set(pid, (productTotals.get(pid) || 0) + qty);
        });
      });
    }
  });

  let totalFardos = 0;
  let totalPallets = 0;
  let requestRows = '';

  let sortedPids = [...productTotals.keys()].sort((a, b) => {
    let pa = db.products.find(x => x.id === a);
    let pb = db.products.find(x => x.id === b);
    return (pa?.id || a).localeCompare(pb?.id || b, undefined, { numeric: true });
  });

  sortedPids.forEach(pid => {
    let totalQty = productTotals.get(pid);
    let p = db.products.find(x => x.id === pid);
    let pd = formatPalletsForPrint(totalQty, p);
    if (p && p.pack) totalFardos += Math.floor(totalQty / p.pack);
    else totalFardos += Number(totalQty) || 0;
    totalPallets += pd.pallets;
    requestRows += `<tr>
      <td>${v14Text(p?.id || pid)}</td>
      <td>${v14Text(p?.name || pid)}</td>
      <td>${p ? equivalent(totalQty, p) : totalQty}</td>
      <td style="text-align:center;">${pd.pallets}</td>
      <td>${pd.loose}</td>
    </tr>`;
  });

  if (sortedPids.length > 0) {
    requestRows += `<tr class="total-row">
      <td colspan="2" style="text-align:right"><b>TOTAL CONSOLIDADO</b></td>
      <td><b>${totalFardos} fardos</b></td>
      <td style="text-align:center;"><b>${totalPallets} pallets</b></td>
      <td></td>
    </tr>`;
  }

  // 3. Salidas registradas combinadas (si las hubiese)
  let allDeliveries = [];
  orders.forEach(o => {
    (o.deliveries || []).forEach((d, i) => {
      allDeliveries.push({ orderNumber: o.number, d, index: i + 1 });
    });
  });

  let deliveriesHtml = '';
  if (allDeliveries.length > 0) {
    let deliveriesRows = allDeliveries.map(item => {
      let detail = (item.d.lines || []).map(l => {
        let p = db.products.find(x => x.id === l.productId);
        return `${v14Text(p?.name || l.productId)}: ${p ? equivalent(l.total, p) : l.total}`;
      }).join(' · ');
      return `<tr>
        <td>Ord. ${v14Text(item.orderNumber)} (#${item.index})</td>
        <td>${fmtDate(item.d.date)}</td>
        <td>${v14Text(detail)}</td>
        <td>${Number(item.d.palletOut || 0)}</td>
        <td>${Number(item.d.palletIn || 0)}</td>
        <td>${Number(item.d.chapOut || 0)}</td>
        <td>${Number(item.d.chapIn || 0)}</td>
      </tr>`;
    }).join('');

    deliveriesHtml = `
      <h2 style="margin:15px 0 5px 0; font-size:16px;">Salidas registradas</h2>
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr><th>Orden / Salida</th><th>Fecha</th><th>Productos</th><th>Planch. sale</th><th>Planch. vuelve</th><th>Chap. sale</th><th>Chap. vuelve</th></tr></thead>
        <tbody>${deliveriesRows}</tbody>
      </table>`;
  }

  let body = `
  <style>
    #printArea .v16-order-print .req-table th, 
    #printArea .v16-order-print .req-table td { font-size: 14px !important; padding: 4px 6px !important; font-weight: bold !important; }
    #printArea .v16-order-print .req-table .total-row td { font-size: 15px !important; background-color: #eee !important; }
  </style>
  <div class="v16-order-print">
    <div style="font-size:13px; color:#333; margin-bottom:10px; padding-bottom:5px; border-bottom:1px solid #ccc;">
      <b>Órdenes incluidas:</b> ${numbers} &nbsp;|&nbsp; 
      <b>Fecha(s):</b> ${dates} &nbsp;|&nbsp; 
      <b>Estado(s):</b> ${statuses} &nbsp;|&nbsp; 
      <b>Turno de impresión:</b> ${v14Text(session.shift || '')} · ${v14Text(session.user || '')}
    </div>
    <h2 style="margin:10px 0 5px 0; font-size:16px;">Productos solicitados (Total unificado)</h2>
    <table class="req-table" style="width:100%; border-collapse:collapse; margin-bottom:10px;">
      <thead><tr><th>Código</th><th>Producto</th><th>Total solicitado</th><th style="text-align:center;">Pallets completos</th><th>Fardos / sueltos</th></tr></thead>
      <tbody>${requestRows || '<tr><td colspan="5">Sin detalle disponible.</td></tr>'}</tbody>
    </table>
    ${deliveriesHtml}
  </div>`;

  setPrintableDocument(`Órdenes combinadas ${numbers}`, body, 'order', fName);
  printCurrentDocument();
}
window.printCombinedOrders = printCombinedOrders;

function renderOrdersV16(){
  let body=document.getElementById('ordersBody');if(!body)return;
  let carrier=document.getElementById('ofCarrier')?.value||'',
      date=document.getElementById('ofDate')?.value||'',
      user=document.getElementById('ofUser')?.value||'',
      shift=document.getElementById('ofShift')?.value||'';

  let list=(db.orders||[]).filter(o=>{
    let ds=o.deliveries||[];
    return(!carrier||o.fleteroId===carrier)&&
          (!date||o.date===date)&&
          (!user||o.createdBy===user||ds.some(d=>d.user===user))&&
          (!shift||o.createdShift===shift||ds.some(d=>d.shift===shift));
  }).sort(v16NaturalCompareDesc);

  body.innerHTML=list.map(o=>{
    let f=v13OrderCarrier(o),ds=o.deliveries||[];
    let req=Array.isArray(o.requestLines)?v15OrderRequestedFardos(o):0;
    let del=Array.isArray(o.requestLines)?v15OrderDeliveredFardos(o):0;
    let last=ds.at(-1)||{},
        status=Array.isArray(o.requestLines)?v11OrderStatus(o):o.status,
        type=V11_PENDING_LABELS[o.pendingType||'legacy']||'Histórica',
        cls=status==='PENDIENTE'?'v13-admin-pending':
            String(status).includes('Pendiente')?'open':
            String(status).includes('Parcial')?'partial':'done';
    let isChecked = window.selectedOrderIds && window.selectedOrderIds.has(o.id) ? 'checked' : '';

    return `<tr>
      <td class="no-print" style="text-align:center;"><input type="checkbox" class="order-select-chk" value="${o.id}" data-fletero="${o.fleteroId||''}" ${isChecked} onchange="toggleOrderSelection(this)" style="width:18px;height:18px;cursor:pointer;"></td>
      <td><b>${v14Text(o.number)}</b></td>
      <td>${v14Text(o.date)}</td>
      <td>${v14Text(v13CarrierDisplay(f))}</td>
      <td>${v14Text(type)}</td>
      <td>${v14Text(last.user||o.createdBy||'')}</td>
      <td>${v14Text(last.shift||o.createdShift||'')}</td>
      <td><span class="status ${cls}">${v14Text(status)}</span></td>
      <td>${v15FormatFardos(req)}</td>
      <td>${v15FormatFardos(del)}</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="11" class="muted">No hay órdenes registradas.</td></tr>';

  updateCombinedOrdersBtn();
}
renderOrdersV15=renderOrdersV16;
renderOrdersV13=renderOrdersV16;
renderOrdersV11=renderOrdersV16;
renderOrders=renderOrdersV16;

