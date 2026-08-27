// ------------------------------------------------------------------
// ÓRDENES: nuevas arriba, sin columna Materiales
// ------------------------------------------------------------------
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

    return `<tr>
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
  }).join('')||'<tr><td colspan="10" class="muted">No hay órdenes registradas.</td></tr>';
}
renderOrdersV15=renderOrdersV16;
renderOrdersV13=renderOrdersV16;
renderOrdersV11=renderOrdersV16;
renderOrders=renderOrdersV16;
