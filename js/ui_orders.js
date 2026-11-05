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
      fromD=document.getElementById('ofFrom')?.value||document.getElementById('ofDate')?.value||'',
      toD=document.getElementById('ofTo')?.value||'',
      stFilter=document.getElementById('ofStatus')?.value||'',
      user=document.getElementById('ofUser')?.value||'',
      shift=document.getElementById('ofShift')?.value||'';

  let list=(db.orders||[]).filter(o=>{
    if (!o || o._deleted || !o.id || o.id === 'undefined') return false;
    if (carrier && o.fleteroId !== carrier) return false;
    let ds = o.deliveries || [];

    let oDate = o.date ? o.date.slice(0, 10) : '';
    let dates = [oDate, ...ds.map(d => (d.date ? d.date.slice(0, 10) : oDate))].filter(Boolean);

    if (fromD && toD) {
      let inRange = dates.some(d => d >= fromD && d <= toD);
      if (!inRange) return false;
    } else if (fromD) {
      let inRange = dates.some(d => d >= fromD);
      if (!inRange) return false;
    } else if (toD) {
      let inRange = dates.some(d => d <= toD);
      if (!inRange) return false;
    }

    let status=Array.isArray(o.requestLines)?(typeof v11OrderStatus === 'function' ? v11OrderStatus(o) : o.status):o.status;
    if (stFilter) {
      if (stFilter === 'Despachada') {
        let isDesp = status === 'Despachada' || status === 'Completa' || o.status === 'Despachada' || o.status === 'Completa';
        if (typeof v11OrderOutstanding === 'function' && Array.isArray(o.requestLines) && v11OrderOutstanding(o) > 0) isDesp = false;
        if (!isDesp) return false;
      } else if (stFilter === 'Pendiente') {
        if (!String(status).includes('Pendiente') && status !== 'PENDIENTE') return false;
      } else if (stFilter === 'Parcial') {
        if (!String(status).includes('Parcial')) return false;
      }
    }

    if (user && shift) {
      let matches = ds.length > 0
        ? ds.some(d => d.user === user && d.shift === shift && (!fromD || (d.date && d.date.slice(0, 10) >= fromD)) && (!toD || (d.date && d.date.slice(0, 10) <= toD)))
        : (o.createdBy === user && o.createdShift === shift);
      if (!matches) return false;
    } else if (user) {
      let matches = ds.length > 0
        ? ds.some(d => d.user === user && (!fromD || (d.date && d.date.slice(0, 10) >= fromD)) && (!toD || (d.date && d.date.slice(0, 10) <= toD)))
        : (o.createdBy === user);
      if (!matches) return false;
    } else if (shift) {
      let matches = ds.length > 0
        ? ds.some(d => d.shift === shift && (!fromD || (d.date && d.date.slice(0, 10) >= fromD)) && (!toD || (d.date && d.date.slice(0, 10) <= toD)))
        : (o.createdShift === shift);
      if (!matches) return false;
    }

    return true;
  }).sort(v16NaturalCompareDesc);

  let totalOrderCount = list.length;
  let isOrdersCapped = false;
  let hasFilters = Boolean(carrier || fromD || toD || stFilter || user || shift);
  if (!hasFilters && list.length > 150) {
    list = list.slice(0, 150);
    isOrdersCapped = true;
  }

  let rowsHtml = list.map(o=>{
    let f=v13OrderCarrier(o),ds=o.deliveries||[];
    let req=Array.isArray(o.requestLines)?v15OrderRequestedFardos(o):0;
    let del=Array.isArray(o.requestLines)?v15OrderDeliveredFardos(o):0;

    let matchingDeliveries = ds.filter(d => {
      let dDate = d.date ? d.date.slice(0, 10) : o.date;
      if (fromD && dDate < fromD) return false;
      if (toD && dDate > toD) return false;
      if (user && d.user !== user) return false;
      if (shift && d.shift !== shift) return false;
      return true;
    });
    let relevantDelivery = (user || shift || fromD || toD)
      ? (matchingDeliveries.at(-1) || ds.at(-1) || {})
      : (ds.at(-1) || {});

    let displayUser = relevantDelivery.user || o.createdBy || '';
    let displayShift = relevantDelivery.shift || o.createdShift || '';

    let status=Array.isArray(o.requestLines)?(typeof v11OrderStatus === 'function' ? v11OrderStatus(o) : o.status):o.status,
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
      <td>${v14Text(displayUser)}</td>
      <td>${v14Text(displayShift)}</td>
      <td><span class="status ${cls}">${v14Text(status)}</span></td>
      <td>${v15FormatFardos(req)}</td>
      <td>${v15FormatFardos(del)}</td>
      <td class="no-print"><button class="btn btn-secondary" onclick="viewOrder('${o.id}')">Abrir</button></td>
    </tr>`;
  }).join('');

  if (isOrdersCapped) {
    rowsHtml += `<tr><td colspan="11" style="text-align:center;background:var(--card);color:var(--muted);padding:10px;font-size:13px;font-weight:bold;">Mostrando las 150 órdenes más recientes de ${totalOrderCount}. Utilice los filtros para buscar por fletero, día, encargado o turno.</td></tr>`;
  }

  let finalHtml = rowsHtml || '<tr><td colspan="11" class="muted">No hay órdenes registradas.</td></tr>';
  if (body.innerHTML !== finalHtml) {
    body.innerHTML = finalHtml;
  }

  updateCombinedOrdersBtn();
}
window.renderOrdersV15=renderOrdersV16;
window.renderOrdersV13=renderOrdersV16;
window.renderOrdersV11=renderOrdersV16;
window.renderOrders=renderOrdersV16;
window.renderOrdersV16=renderOrdersV16;

// =============================================================
// MODAL E IMPRESIÓN DE ÓRDENES DESPACHADAS POR PERÍODO
// (Saltea el límite de visualización de órdenes recientes)
// =============================================================

function openDispatchedOrdersModal() {
  let nowD = new Date();
  let y = nowD.getFullYear();
  let m = String(nowD.getMonth() + 1).padStart(2, '0');
  let d = String(nowD.getDate()).padStart(2, '0');
  let toDefault = `${y}-${m}-${d}`;
  let fromDefault = `${y}-${m}-01`;

  let userOptions = (db.users || []).map(u => {
    let name = u.displayName || u.username || '';
    return `<option value="${v14Text(name)}">${v14Text(name)}</option>`;
  }).join('');

  let html = `
    <div class="headrow">
      <div>
        <h2>Órdenes despachadas por período</h2>
        <div class="muted">Reporte consolidado e impresión de órdenes despachadas sin límite de visualización.</div>
      </div>
      <button class="btn btn-secondary no-print" onclick="closeModal()">Cerrar</button>
    </div>

    <div class="card no-print" style="margin-bottom:14px; background:var(--bg); border:1px solid var(--line); padding:12px; border-radius:12px;">
      <div class="formgrid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:10px; margin-bottom:0;">
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Desde</label>
          <input id="dispFrom" type="date" class="field" value="${fromDefault}" onchange="renderDispatchedOrdersPreview()">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Hasta</label>
          <input id="dispTo" type="date" class="field" value="${toDefault}" onchange="renderDispatchedOrdersPreview()">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Fletero</label>
          <select id="dispCarrier" class="field" onchange="renderDispatchedOrdersPreview()">
            <option value="">Todos los fleteros</option>
            ${fleteroOptions()}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Encargado</label>
          <select id="dispUser" class="field" onchange="renderDispatchedOrdersPreview()">
            <option value="">Todos los encargados</option>
            ${userOptions}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; margin:0 0 4px;">Turno</label>
          <select id="dispShift" class="field" onchange="renderDispatchedOrdersPreview()">
            <option value="">Todos los turnos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
          </select>
        </div>
      </div>
    </div>

    <div id="dispatchedPreview" style="max-height:55vh; overflow-y:auto; margin-bottom:14px; padding-right:4px;">
      <div style="text-align:center; padding:20px; color:var(--muted);">Cargando reporte...</div>
    </div>

    <div class="headrow no-print" style="justify-content:space-between; gap:8px; margin-bottom:0; flex-wrap:wrap;">
      <button class="btn btn-secondary" onclick="syncAndRefreshDispatchedOrders(true)" title="Descargar órdenes históricas de este período desde Firestore">🔄 Sincronizar período</button>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        <button class="btn btn-primary" onclick="printDispatchedOrdersReport()">🖨️ Imprimir documento</button>
      </div>
    </div>
  `;

  modal(html);
  renderDispatchedOrdersPreview();
}
window.openDispatchedOrdersModal = openDispatchedOrdersModal;

function getFilteredDispatchedOrdersList() {
  let fromD = document.getElementById('dispFrom')?.value || '',
      toD = document.getElementById('dispTo')?.value || '',
      carrier = document.getElementById('dispCarrier')?.value || '',
      user = document.getElementById('dispUser')?.value || '',
      shift = document.getElementById('dispShift')?.value || '';

  return (db.orders || []).filter(o => {
    if (!o || o._deleted || !o.id || o.id === 'undefined') return false;

    // Solo órdenes despachadas
    let status = Array.isArray(o.requestLines) ? (typeof v11OrderStatus === 'function' ? v11OrderStatus(o) : o.status) : o.status;
    let isDespachada = (status === 'Despachada' || status === 'Completa' || o.status === 'Despachada' || o.status === 'Completa');
    if (typeof v11OrderOutstanding === 'function' && Array.isArray(o.requestLines) && v11OrderOutstanding(o) > 0) {
      isDespachada = false;
    }
    if (!isDespachada) return false;

    if (carrier && o.fleteroId !== carrier) return false;

    let ds = o.deliveries || [];
    let oDate = o.date ? o.date.slice(0, 10) : '';
    let dates = [oDate, ...ds.map(d => (d.date ? d.date.slice(0, 10) : oDate))].filter(Boolean);

    if (fromD && toD) {
      let matches = dates.some(d => d >= fromD && d <= toD);
      if (!matches) return false;
    } else if (fromD) {
      let matches = dates.some(d => d >= fromD);
      if (!matches) return false;
    } else if (toD) {
      let matches = dates.some(d => d <= toD);
      if (!matches) return false;
    }

    let lastDel = ds.length > 0 ? ds[ds.length - 1] : null;
    let orderUser = lastDel?.user || o.createdBy || '';
    let orderShift = lastDel?.shift || o.createdShift || '';

    if (user && orderUser !== user) return false;
    if (shift && orderShift !== shift) return false;

    return true;
  }).sort(v16NaturalCompareDesc);
}

function renderDispatchedOrdersPreview() {
  let preview = document.getElementById('dispatchedPreview');
  if (!preview) return;

  let list = getFilteredDispatchedOrdersList();
  if (!list.length) {
    preview.innerHTML = '<div style="text-align:center; padding:30px; color:var(--muted); font-size:14px;">No se encontraron órdenes despachadas para el período y filtros seleccionados. Puede pulsar <b>Sincronizar período</b> si las fechas son históricas.</div>';
    return;
  }

  let totalOrders = list.length;
  let totalDeliveredFardos = 0;
  let qtyByProduct = {};

  function addDelivered(pid, physicalQty) {
    if (!physicalQty) return;
    let p = db.products.find(x => x.id === pid);
    if (!p) return;
    let fardos = v15FardosEquivalent(physicalQty, p);
    qtyByProduct[pid] = (qtyByProduct[pid] || 0) + fardos;
    totalDeliveredFardos += fardos;
  }

  list.forEach(o => {
    let ds = o.deliveries || [];
    if (ds.length > 0) {
      ds.forEach(d => {
        (d.lines || []).forEach(l => {
          addDelivered(l.productId, l.total);
        });
      });
    } else if (Array.isArray(o.requestLines)) {
      o.requestLines.forEach(l => {
        addDelivered(l.productId, l.resolvedTotal || l.total);
      });
    }
  });

  let pids = Object.keys(qtyByProduct).sort();
  let prodRows = pids.map(pid => {
    let p = db.products.find(x => x.id === pid);
    let fardos = qtyByProduct[pid];
    let perPallet = (p && p.perCut && p.cuts) ? (p.perCut * p.cuts) : 80;
    let pallets = perPallet > 0 ? (fardos / perPallet).toFixed(1) : '-';
    return `<tr>
      <td><b>${v14Text(pid)}</b></td>
      <td>${v14Text(p ? p.name : pid)}</td>
      <td style="text-align:right;"><b>${v15FormatNumber(fardos)}</b></td>
      <td style="text-align:center;">${pallets} pl</td>
    </tr>`;
  }).join('');

  let orderRows = list.map((o, idx) => {
    let f = v13OrderCarrier(o);
    let ds = o.deliveries || [];
    let req = Array.isArray(o.requestLines) ? v15OrderRequestedFardos(o) : 0;
    let del = Array.isArray(o.requestLines) ? v15OrderDeliveredFardos(o) : 0;
    if (!del && ds.length > 0) {
      del = ds.reduce((sum, d) => sum + (d.lines || []).reduce((inner, l) => {
        let p = db.products.find(x => x.id === l.productId);
        return inner + (p && p.pack ? Number(l.total || 0) / Number(p.pack) : Number(l.total || 0));
      }, 0), 0);
    }
    let lastDel = ds.length > 0 ? ds[ds.length - 1] : null;
    let userDisp = lastDel?.user || o.createdBy || '';
    let shiftDisp = lastDel?.shift || o.createdShift || '';
    let dateDisp = lastDel?.date ? lastDel.date.slice(0, 10) : o.date;

    return `<tr>
      <td style="text-align:center; color:var(--muted);">${idx + 1}</td>
      <td><b>${v14Text(o.number)}</b></td>
      <td>${v14Text(dateDisp)}</td>
      <td>${v14Text(v13CarrierDisplay(f))}</td>
      <td>${v14Text(userDisp)}</td>
      <td>${v14Text(shiftDisp)}</td>
      <td style="text-align:right;">${v15FormatNumber(req)}</td>
      <td style="text-align:right; font-weight:bold; color:#10b981;">${v15FormatNumber(del)}</td>
    </tr>`;
  }).join('');

  preview.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:14px;">
      <div class="card" style="padding:10px; text-align:center; background:var(--bg);">
        <div class="muted" style="font-size:12px;">Órdenes despachadas</div>
        <b style="font-size:22px; color:var(--text);">${totalOrders}</b>
      </div>
      <div class="card" style="padding:10px; text-align:center; background:var(--bg);">
        <div class="muted" style="font-size:12px;">Total fardos entregados</div>
        <b style="font-size:22px; color:#10b981;">${v15FormatNumber(totalDeliveredFardos)}</b>
      </div>
    </div>

    <h3 style="font-size:14px; margin:10px 0 6px 0;">Total Despachado por Producto</h3>
    <div class="tablewrap" style="margin-bottom:14px;">
      <table>
        <thead>
          <tr>
            <th style="width:70px;">Cód.</th>
            <th>Producto</th>
            <th style="text-align:right; width:120px;">Fardos entregados</th>
            <th style="text-align:center; width:90px;">Pallets equiv.</th>
          </tr>
        </thead>
        <tbody>
          ${prodRows}
          <tr style="font-weight:bold; background:var(--soft);">
            <td colspan="2" style="text-align:right;">TOTAL GENERAL</td>
            <td style="text-align:right;">${v15FormatNumber(totalDeliveredFardos)}</td>
            <td style="text-align:center;">-</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style="font-size:14px; margin:10px 0 6px 0;">Detalle de Órdenes Despachadas (${totalOrders})</h3>
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th style="width:25px; text-align:center;">#</th>
            <th>Orden</th>
            <th>Fecha</th>
            <th>Fletero</th>
            <th>Encargado</th>
            <th>Turno</th>
            <th style="text-align:right;">Solicitado</th>
            <th style="text-align:right;">Entregado</th>
          </tr>
        </thead>
        <tbody>
          ${orderRows}
        </tbody>
      </table>
    </div>
  `;
}
window.renderDispatchedOrdersPreview = renderDispatchedOrdersPreview;

function printDispatchedOrdersReport() {
  let list = getFilteredDispatchedOrdersList();
  if (!list.length) {
    alert('No hay órdenes despachadas para imprimir en el período seleccionado.');
    return;
  }

  let fromD = document.getElementById('dispFrom')?.value || '',
      toD = document.getElementById('dispTo')?.value || '',
      carrier = document.getElementById('dispCarrier')?.value || '',
      user = document.getElementById('dispUser')?.value || '',
      shift = document.getElementById('dispShift')?.value || '';

  let carrierName = carrier ? ((db.fleteros || []).find(f => f.id === carrier)?.name || carrier) : 'Todos los fleteros';
  let periodText = (fromD && toD) ? `${fmtDate(fromD)} al ${fmtDate(toD)}` : (fromD ? `Desde ${fmtDate(fromD)}` : (toD ? `Hasta ${fmtDate(toD)}` : 'Histórico completo'));

  let totalOrders = list.length;
  let totalDeliveredFardos = 0;
  let qtyByProduct = {};

  function addDelivered(pid, physicalQty) {
    if (!physicalQty) return;
    let p = db.products.find(x => x.id === pid);
    if (!p) return;
    let fardos = v15FardosEquivalent(physicalQty, p);
    qtyByProduct[pid] = (qtyByProduct[pid] || 0) + fardos;
    totalDeliveredFardos += fardos;
  }

  list.forEach(o => {
    let ds = o.deliveries || [];
    if (ds.length > 0) {
      ds.forEach(d => {
        (d.lines || []).forEach(l => {
          addDelivered(l.productId, l.total);
        });
      });
    } else if (Array.isArray(o.requestLines)) {
      o.requestLines.forEach(l => {
        addDelivered(l.productId, l.resolvedTotal || l.total);
      });
    }
  });

  let pids = Object.keys(qtyByProduct).sort();
  let prodRows = pids.map(pid => {
    let p = db.products.find(x => x.id === pid);
    let fardos = qtyByProduct[pid];
    let perPallet = (p && p.perCut && p.cuts) ? (p.perCut * p.cuts) : 80;
    let pallets = perPallet > 0 ? (fardos / perPallet).toFixed(1) : '-';
    return `<tr>
      <td style="padding:4px 6px;">${v14Text(pid)}</td>
      <td style="padding:4px 6px;">${v14Text(p ? p.name : pid)}</td>
      <td style="padding:4px 6px; text-align:right;"><b>${v15FormatNumber(fardos)}</b></td>
      <td style="padding:4px 6px; text-align:center;">${pallets} pl</td>
    </tr>`;
  }).join('');

  let orderRows = list.map((o, idx) => {
    let f = v13OrderCarrier(o);
    let ds = o.deliveries || [];
    let req = Array.isArray(o.requestLines) ? v15OrderRequestedFardos(o) : 0;
    let del = Array.isArray(o.requestLines) ? v15OrderDeliveredFardos(o) : 0;
    if (!del && ds.length > 0) {
      del = ds.reduce((sum, d) => sum + (d.lines || []).reduce((inner, l) => {
        let p = db.products.find(x => x.id === l.productId);
        return inner + (p && p.pack ? Number(l.total || 0) / Number(p.pack) : Number(l.total || 0));
      }, 0), 0);
    }
    let lastDel = ds.length > 0 ? ds[ds.length - 1] : null;
    let userDisp = lastDel?.user || o.createdBy || '';
    let shiftDisp = lastDel?.shift || o.createdShift || '';
    let dateDisp = lastDel?.date ? fmtDate(lastDel.date) : fmtDate(o.date);

    return `<tr>
      <td style="padding:3px 5px; text-align:center;">${idx + 1}</td>
      <td style="padding:3px 5px;"><b>${v14Text(o.number)}</b></td>
      <td style="padding:3px 5px;">${v14Text(dateDisp)}</td>
      <td style="padding:3px 5px;">${v14Text(v13CarrierDisplay(f))}</td>
      <td style="padding:3px 5px;">${v14Text(userDisp)}</td>
      <td style="padding:3px 5px;">${v14Text(shiftDisp)}</td>
      <td style="padding:3px 5px; text-align:right;">${v15FormatNumber(req)}</td>
      <td style="padding:3px 5px; text-align:right; font-weight:bold;">${v15FormatNumber(del)}</td>
    </tr>`;
  }).join('');

  let body = `
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      #printArea table { font-size: 10px !important; width: 100% !important; border-collapse: collapse; }
      #printArea th, #printArea td { border: 1px solid #ddd; }
      #printArea th { background-color: #f3f4f6; font-weight: bold; }
      .dispatched-kpis { display: flex; gap: 12px; margin-bottom: 12px; }
      .dispatched-kpi { border: 1px solid #19417f; padding: 6px 12px; border-radius: 4px; background: #eef2ff; }
      .dispatched-kpi b { font-size: 14px; color: #19417f; }
    </style>
    <div style="font-size:11px; color:#333; background:#f9fafb; padding:6px 10px; border-radius:4px; border:1px solid #e5e7eb; margin-bottom:12px;">
      <b>Período:</b> ${v14Text(periodText)} &nbsp;·&nbsp;
      <b>Fletero:</b> ${v14Text(carrierName)} &nbsp;·&nbsp;
      <b>Encargado:</b> ${v14Text(user || 'Todos')} &nbsp;·&nbsp;
      <b>Turno:</b> ${v14Text(shift || 'Todos')} &nbsp;·&nbsp;
      <b>Emisión:</b> ${fmtDate(now())} (${v14Text(session.user || '')} - ${v14Text(session.shift || '')})
    </div>

    <div class="dispatched-kpis">
      <div class="dispatched-kpi">Órdenes despachadas: <b>${totalOrders}</b></div>
      <div class="dispatched-kpi">Total fardos entregados: <b>${v15FormatNumber(totalDeliveredFardos)}</b></div>
    </div>

    <h3 style="font-size:13px; margin:10px 0 6px 0; color:#19417f;">Total Despachado por Producto</h3>
    <table style="margin-bottom:14px;">
      <thead>
        <tr>
          <th style="padding:4px 6px; text-align:left; width:70px;">Cód.</th>
          <th style="padding:4px 6px; text-align:left;">Producto</th>
          <th style="padding:4px 6px; text-align:right; width:120px;">Fardos entregados</th>
          <th style="padding:4px 6px; text-align:center; width:90px;">Pallets equiv.</th>
        </tr>
      </thead>
      <tbody>
        ${prodRows}
        <tr style="background:#eef2ff; font-weight:bold;">
          <td colspan="2" style="padding:4px 6px; text-align:right;">TOTAL GENERAL</td>
          <td style="padding:4px 6px; text-align:right;">${v15FormatNumber(totalDeliveredFardos)}</td>
          <td style="padding:4px 6px; text-align:center;">-</td>
        </tr>
      </tbody>
    </table>

    <h3 style="font-size:13px; margin:10px 0 6px 0; color:#19417f;">Detalle de Órdenes Despachadas</h3>
    <table>
      <thead>
        <tr>
          <th style="padding:3px 5px; width:25px; text-align:center;">#</th>
          <th style="padding:3px 5px; text-align:left;">Orden</th>
          <th style="padding:3px 5px; text-align:left; width:75px;">Fecha</th>
          <th style="padding:3px 5px; text-align:left;">Fletero</th>
          <th style="padding:3px 5px; text-align:left;">Encargado</th>
          <th style="padding:3px 5px; text-align:left; width:55px;">Turno</th>
          <th style="padding:3px 5px; text-align:right; width:70px;">Solicitado</th>
          <th style="padding:3px 5px; text-align:right; width:70px;">Entregado</th>
        </tr>
      </thead>
      <tbody>
        ${orderRows}
      </tbody>
    </table>
  `;

  setPrintableDocument(`Reporte de órdenes despachadas`, body, 'report', `Período: ${periodText}`);
  printCurrentDocument();
}
window.printDispatchedOrdersReport = printDispatchedOrdersReport;

async function syncAndRefreshDispatchedOrders(force = false) {
  let fromD = document.getElementById('dispFrom')?.value || '';
  let toD = document.getElementById('dispTo')?.value || '';
  if (!fromD) {
    if (typeof toast === 'function') toast('Seleccione una fecha Desde.', 'error');
    return;
  }
  let prevPreview = document.getElementById('dispatchedPreview');
  if (prevPreview) {
    prevPreview.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);"><span class="icon">🔄</span> Buscando órdenes en la base de datos...</div>';
  }

  if (typeof firestoreDb !== 'undefined' && firestoreDb) {
    try {
      let q = firestoreDb.collection('orders').where('date', '>=', fromD);
      if (toD) {
        q = q.where('date', '<=', toD);
      }
      let snap = await q.get();
      let remoteOrders = [];
      snap.forEach(doc => {
        let data = doc.data() || {};
        if (!data.id) data.id = doc.id;
        if (data && !data._deleted && data.id) {
          remoteOrders.push(data);
          if (typeof lastSyncedDb !== 'undefined' && lastSyncedDb.orders) {
            lastSyncedDb.orders.set(data.id, fastHash(data));
          }
        }
      });
      if (remoteOrders.length > 0) {
        let map = new Map((db.orders || []).map(x => [x.id, x]));
        remoteOrders.forEach(o => {
          let local = map.get(o.id);
          if (local && (local.deliveries || []).length > (o.deliveries || []).length) {
            o.deliveries = local.deliveries;
            o.requestLines = local.requestLines;
            if (local.status === 'Despachada') o.status = 'Despachada';
          }
          map.set(o.id, o);
        });
        db.orders = Array.from(map.values());
        safeSet(localStorage, 'talcaExpV02', JSON.stringify(db));
      }
    } catch(err) {
      console.warn('Alerta al consultar órdenes por rango en Firestore:', err);
    }
  }

  renderDispatchedOrdersPreview();
  if (force && typeof toast === 'function') toast('Órdenes del período actualizadas.', 'success');
}
window.syncAndRefreshDispatchedOrders = syncAndRefreshDispatchedOrders;


