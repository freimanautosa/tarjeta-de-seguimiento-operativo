// ═══════════════════════════════════════════════════════════
// COTIZACIONES
// ═══════════════════════════════════════════════════════════

// ─── NUEVA COTIZACIÓN ─────────────────────────────────────

function nuevaCotizacion() {
  ['cn-placa','cn-marca','cn-linea','cn-ano','cn-color','cn-vin','cn-km',
   'cn-nombre','cn-cedula','cn-celular','cn-correo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const ocrEst = document.getElementById('cn-ocr-estado');
  if (ocrEst) ocrEst.style.display = 'none';
  const ivaCheck = document.getElementById('cn-iva-check');
  if (ivaCheck) ivaCheck.checked = false;
  const repTbody = document.getElementById('cot-rep-tbody');
  const moTbody  = document.getElementById('cot-mo-tbody');
  if (repTbody) repTbody.innerHTML = '';
  if (moTbody)  moTbody.innerHTML  = '';
  _cotActualizarTotales();
  cotAgregarRepuesto();
  cotAgregarManoObra();
  mostrarPagina('pag-cotizacion-nueva');
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = 'Nueva Cotización';
  const actEl = document.getElementById('topbar-actions');
  if (actEl) actEl.innerHTML = '';
  closeSidebar();
}

function volverACotizaciones() { navJefe('cotizaciones'); }

// ─── OCR + BÚSQUEDA ───────────────────────────────────────

async function cotOcrTarjetaPropiedad(input) {
  const file = input.files?.[0];
  if (!file) return;
  const estado = document.getElementById('cn-ocr-estado');
  if (estado) { estado.style.display = 'block'; estado.innerHTML = '⏳ Leyendo tarjeta de propiedad...'; estado.style.background = ''; estado.style.borderColor = ''; estado.style.color = ''; }
  try {
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    const response = await fetch('https://automatizacionesfreimanautos-n8n.qs0sgf.easypanel.host/webhook/ocr-tarjeta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagen: base64, tipo: file.type || 'image/jpeg' })
    });
    const data = await response.json();
    let parsed = {};
    try { parsed = data?.datos || {}; } catch(e) { parsed = {}; }
    const mapa = {
      'cn-placa': parsed.placa?.toUpperCase(),
      'cn-marca': parsed.marca,
      'cn-linea': parsed.linea,
      'cn-ano':   parsed.modelo,
      'cn-color': parsed.color,
      'cn-vin':   parsed.vin?.toUpperCase()
    };
    let encontrados = [];
    Object.entries(mapa).forEach(([id, val]) => {
      if (!val) return;
      const el = document.getElementById(id);
      if (el) { el.value = val; encontrados.push(id.replace('cn-','')); }
    });
    if (parsed.propietario) {
      const el = document.getElementById('cn-nombre');
      if (el && !el.value) { el.value = parsed.propietario; encontrados.push('propietario'); }
    }
    if (estado) {
      if (encontrados.length) {
        estado.innerHTML = `✓ Datos extraídos: <strong>${encontrados.join(', ')}</strong>. Revisa y corrige si es necesario.`;
        estado.style.background = 'var(--verde-bg)'; estado.style.borderColor = 'var(--verde)'; estado.style.color = 'var(--verde)';
      } else {
        estado.innerHTML = '⚠ No se pudieron extraer datos. Intenta con mejor iluminación.';
        estado.style.background = '#FEF3C7'; estado.style.borderColor = '#FDE68A'; estado.style.color = '#92400E';
      }
    }
  } catch(e) {
    if (estado) { estado.innerHTML = '✗ Error al leer la tarjeta: ' + e.message; }
  }
  input.value = '';
}

async function cotBuscarVehiculo() {
  const placa = document.getElementById('cn-placa')?.value.trim().toUpperCase();
  if (!placa) { toast('Ingresa la placa primero', 'err'); return; }
  try {
    const vhs = await api(`/vehiculos?placa=eq.${placa}`) || [];
    if (!vhs.length) { toast('Vehículo no encontrado', 'warn'); return; }
    const v = vhs[0];
    const mapa = { 'cn-marca': v.marca, 'cn-linea': v.linea, 'cn-ano': v.modelo, 'cn-color': v.color, 'cn-vin': v.vin };
    Object.entries(mapa).forEach(([id, val]) => { const el = document.getElementById(id); if (el && val) el.value = val; });
    toast('Vehículo encontrado ✓');
  } catch(e) { toast('Error al buscar: ' + e.message, 'err'); }
}

async function cotBuscarCliente() {
  const cedula = document.getElementById('cn-cedula')?.value.trim();
  if (!cedula) { toast('Ingresa la cédula primero', 'err'); return; }
  try {
    const cls = await api(`/clientes?cedula_nit=eq.${cedula}`) || [];
    if (!cls.length) { toast('Cliente no encontrado', 'warn'); return; }
    const c = cls[0];
    const mapa = { 'cn-nombre': c.nombre, 'cn-celular': c.celular, 'cn-correo': c.correo };
    Object.entries(mapa).forEach(([id, val]) => { const el = document.getElementById(id); if (el && val) el.value = val; });
    toast('Cliente encontrado ✓');
  } catch(e) { toast('Error al buscar: ' + e.message, 'err'); }
}

// ─── TABLA DE ÍTEMS ───────────────────────────────────────

function _cotFila(placeholderDesc) {
  const tr = document.createElement('tr');
  tr.className = 'cot-item-row';
  tr.innerHTML = `
    <td><input type="number" class="cot-inp cot-inp-num" min="1" value="1" oninput="_cotActualizarTotales()"></td>
    <td><input type="text"   class="cot-inp cot-inp-desc" placeholder="${escapeHtml(placeholderDesc)}"></td>
    <td style="white-space:nowrap"><input type="number" class="cot-inp cot-inp-dto" min="0" max="100" value="0" oninput="_cotActualizarTotales()">%</td>
    <td><input type="number" class="cot-inp cot-inp-val" min="0" value="0" oninput="_cotActualizarTotales()"></td>
    <td class="cot-row-total">${formatCOP(0)}</td>
    <td><button class="btn-del-row" onclick="cotEliminarFila(this)" title="Eliminar">×</button></td>`;
  return tr;
}

function cotAgregarRepuesto() {
  const tbody = document.getElementById('cot-rep-tbody');
  if (tbody) tbody.appendChild(_cotFila('Descripción del repuesto'));
}

function cotAgregarManoObra() {
  const tbody = document.getElementById('cot-mo-tbody');
  if (tbody) tbody.appendChild(_cotFila('Concepto de mano de obra'));
}

function cotEliminarFila(btn) {
  const tr = btn.closest('tr');
  if (tr) { tr.remove(); _cotActualizarTotales(); }
}

function _cotActualizarTotales() {
  const _calcTbody = tbodyId => {
    let subtotal = 0, descuento = 0;
    document.querySelectorAll(`#${tbodyId} .cot-item-row`).forEach(tr => {
      const cant = parseFloat(tr.querySelector('.cot-inp-num')?.value  || 0);
      const dto  = parseFloat(tr.querySelector('.cot-inp-dto')?.value  || 0);
      const val  = parseFloat(tr.querySelector('.cot-inp-val')?.value  || 0);
      const sub  = cant * val;
      const dv   = Math.round(sub * dto / 100);
      const tot  = sub - dv;
      const cell = tr.querySelector('.cot-row-total');
      if (cell) cell.textContent = formatCOP(tot);
      subtotal  += tot;
      descuento += dv;
    });
    return { subtotal, descuento };
  };
  const rep = _calcTbody('cot-rep-tbody');
  const mo  = _calcTbody('cot-mo-tbody');
  const dtoTotal = rep.descuento + mo.descuento;
  const total    = rep.subtotal  + mo.subtotal;
  const conIva   = document.getElementById('cn-iva-check')?.checked || false;
  const iva      = conIva ? Math.round(total * 0.19) : 0;
  const totalIva = total + iva;
  const _txt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  _txt('cn-sub-rep',   formatCOP(rep.subtotal));
  _txt('cn-res-rep',   formatCOP(rep.subtotal));
  _txt('cn-sub-mo',    formatCOP(mo.subtotal));
  _txt('cn-res-mo',    formatCOP(mo.subtotal));
  _txt('cn-dto-total', '−' + formatCOP(dtoTotal));
  _txt('cn-total',     formatCOP(total));
  _txt('cn-iva-val',   formatCOP(iva));
  _txt('cn-total-iva', formatCOP(totalIva));
  const _show = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v ? '' : 'none'; };
  _show('cn-dto-row',       dtoTotal > 0);
  _show('cn-iva-row',       conIva);
  _show('cn-total-iva-row', conIva);
}

function _cotLeerItems(tbodyId) {
  const items = [];
  document.querySelectorAll(`#${tbodyId} .cot-item-row`).forEach(tr => {
    const cant = parseFloat(tr.querySelector('.cot-inp-num')?.value || 0);
    const desc = tr.querySelector('.cot-inp-desc')?.value.trim() || '';
    const dto  = parseFloat(tr.querySelector('.cot-inp-dto')?.value || 0);
    const val  = parseFloat(tr.querySelector('.cot-inp-val')?.value || 0);
    if (!desc && val === 0) return;
    const sub = cant * val;
    const dv  = Math.round(sub * dto / 100);
    items.push({ cantidad: cant, descripcion: desc, descuento_pct: dto, valor_unitario: val, total: sub - dv });
  });
  return items;
}

// ─── GUARDAR COTIZACIÓN ───────────────────────────────────

const N8N_PDF_WEBHOOK = 'https://automatizacionesfreimanautos-n8n.qs0sgf.easypanel.host/webhook/cotizacion-pdf';

async function generarPdfCotizacion(cotId) {
  try {
    const res = await fetch(N8N_PDF_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacion_id: cotId })
    });
    const data = await res.json();
    const pdfUrl = data?.url || data?.pdf_url || null;
    if (pdfUrl) {
      await api(`/cotizaciones?id=eq.${cotId}`, 'PATCH', { url_pdf: pdfUrl });
    }
    return pdfUrl;
  } catch(e) {
    console.warn('Error generando PDF:', e);
    return null;
  }
}

async function guardarNuevaCotizacion(conPdf = false) {
  const nombre = document.getElementById('cn-nombre')?.value.trim();
  if (!nombre) { toast('El nombre del cliente es obligatorio', 'err'); document.getElementById('cn-nombre')?.focus(); return; }

  const btnGuardar = document.getElementById('btn-guardar-cot');
  const btnPdf     = document.getElementById('btn-guardar-pdf-cot');
  if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.textContent = 'Guardando...'; }
  if (btnPdf)     { btnPdf.disabled = true; }

  try {
    const conIva      = document.getElementById('cn-iva-check')?.checked || false;
    const repItems    = _cotLeerItems('cot-rep-tbody');
    const moItems     = _cotLeerItems('cot-mo-tbody');
    const subtotalRep = repItems.reduce((s, i) => s + i.total, 0);
    const subtotalMo  = moItems.reduce((s, i)  => s + i.total, 0);
    const total       = subtotalRep + subtotalMo;
    const iva         = conIva ? Math.round(total * 0.19) : 0;
    const totalFinal  = total + iva;

    const body = {
      placa:              document.getElementById('cn-placa')?.value.trim().toUpperCase() || null,
      marca:              document.getElementById('cn-marca')?.value.trim() || null,
      linea:              document.getElementById('cn-linea')?.value.trim() || null,
      año:                parseInt(document.getElementById('cn-ano')?.value) || null,
      color:              document.getElementById('cn-color')?.value.trim() || null,
      vin:                document.getElementById('cn-vin')?.value.trim().toUpperCase() || null,
      km:                 parseInt(document.getElementById('cn-km')?.value) || null,
      nombre_cliente:     nombre,
      cedula_cliente:     document.getElementById('cn-cedula')?.value.trim() || null,
      telefono_cliente:   document.getElementById('cn-celular')?.value.trim() || null,
      correo_cliente:     document.getElementById('cn-correo')?.value.trim() || null,
      items_repuestos:    repItems,
      items_mo:           moItems,
      subtotal_repuestos: subtotalRep,
      subtotal_mo:        subtotalMo,
      total_general:      totalFinal,
      con_iva:            conIva,
      iva:                iva,
      estado:             'pendiente'
    };

    const res = await api('/cotizaciones?select=id', 'POST', body, { Prefer: 'return=representation' });
    const cotId = res[0]?.id;
    toast('Cotización guardada ✓');

    if (conPdf && cotId) {
      toast('Generando PDF...');
      const pdfUrl = await generarPdfCotizacion(cotId);
      if (pdfUrl) {
        toast('PDF generado ✓');
        window.open(pdfUrl, '_blank');
      } else {
        toast('No se pudo generar el PDF', 'warn');
      }
    }

    volverACotizaciones();
    await cargarCotizaciones();
  } catch(e) {
    toast('Error al guardar: ' + e.message, 'err');
  } finally {
    if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = 'Guardar cotización →'; }
    if (btnPdf)     { btnPdf.disabled = false; }
  }
}

// ─── LISTA DE COTIZACIONES ────────────────────────────────

async function cargarCotizaciones() {
  const lista = document.getElementById('cot-lista');
  if (!lista) return;
  lista.innerHTML = '<div class="loading-state">Cargando cotizaciones...</div>';
  try {
    const data = await api('/cotizaciones?order=created_at.desc&limit=100') || [];
    todasCotizaciones = data;
    renderCotizaciones(data);
  } catch(e) {
    lista.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

function filtrarCotizaciones() {
  const q = (document.getElementById('cot-buscar')?.value || '').toLowerCase().trim();
  const est = document.getElementById('cot-filtro-estado')?.value || '';
  const filt = todasCotizaciones.filter(c => {
    const matchQ = !q || [c.placa, c.nombre_cliente, c.codigo_cotizacion, c.cedula_cliente].some(f => (f || '').toLowerCase().includes(q));
    const matchEst = !est || (c.estado || 'pendiente') === est;
    return matchQ && matchEst;
  });
  renderCotizaciones(filt);
}

function renderCotizaciones(data) {
  const lista = document.getElementById('cot-lista');
  if (!lista) return;
  if (!data.length) {
    lista.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><p>No hay cotizaciones.</p></div>';
    return;
  }
  const fmt = n => n != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n) : '—';
  
  lista.innerHTML = data.map(c => {
    const estado = c.estado || 'pendiente';
    const badgeCls = `badge-cot-${estado}`;
    let badgeTxt = '';
    if (estado === 'pendiente') {
      badgeTxt = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2"/><path d="M20 12v5"/><path d="M20 21h.01"/><path d="M21.25 8.2A10 10 0 1 0 16 21.16"/></svg> Pendiente`;
    } else if (estado === 'aprobada') {
      badgeTxt = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Aprobada`;
    } else {
      badgeTxt = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Rechazada`;
    }
    const tienOrden = c.orden_id != null;
    return `<div class="cot-card">
      <div class="cot-card-top">
        <div>
          <div class="cot-placa">${c.placa || '—'}</div>
          <div class="cot-codigo">${c.codigo_cotizacion || '—'}</div>
          <div class="cot-cliente">${c.nombre_cliente || '—'} · ${c.cedula_cliente || '—'}</div>
        </div>
        <span class="${badgeCls}">${badgeTxt}</span>
      </div>
      <div class="cot-card-mid">
        <div class="cot-chip"><strong>${c.fecha || formatFecha(c.created_at)}</strong></div>
        <div class="cot-chip">Tecnico: <strong>${c.tecnico || '—'}</strong></div>
        <div class="cot-chip"><strong>${[c.marca, c.modelo, c.año].filter(Boolean).join(' ') || '—'}</strong></div>
        <div class="cot-chip">Valor: <strong>${fmt(c.total_general)}</strong></div>
      </div>
      <div class="cot-card-bot">
        ${c.url_pdf ? `<a href="${c.url_pdf}" target="_blank" class="btn btn-outline btn-sm" style="font-size:12px">Ver PDF</a>` : ''}
        ${estado === 'pendiente' ? `
          <button class="btn btn-success btn-sm" onclick="aprobarCotizacion(${c.id})">Aprobar → Crear Orden</button>
          <button class="btn btn-danger btn-sm" onclick="rechazarCotizacion(${c.id})">Rechazar</button>
        ` : ''}
        ${estado === 'aprobada' && !tienOrden ? `
          <button class="btn btn-primary btn-sm" onclick="convertirEnOrden(${c.id})">+ Crear orden desde esta</button>
        ` : ''}
        ${tienOrden ? `<span style="font-size:12px;color:var(--verde);font-weight:600">✓ Orden creada</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function aprobarCotizacion(id) {
  if (!confirm('¿Aprobar esta cotización y crear la orden de trabajo?')) return;
  try {
    await api(`/cotizaciones?id=eq.${id}`, 'PATCH', { estado: 'aprobada' });
    const cot = todasCotizaciones.find(c => c.id === id);
    if (cot) await crearOrdenDesdeCotizacion(cot);
    toast('Cotización aprobada y orden creada ✓');
    cargarCotizaciones();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function rechazarCotizacion(id) {
  if (!confirm('¿Rechazar esta cotización?')) return;
  try {
    await api(`/cotizaciones?id=eq.${id}`, 'PATCH', { estado: 'rechazada' });
    toast('Cotización rechazada ✓');
    cargarCotizaciones();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function convertirEnOrden(cotId) {
  const cot = todasCotizaciones.find(c => c.id === cotId);
  if (!cot) return;
  try {
    await crearOrdenDesdeCotizacion(cot);
    toast('Orden creada ✓');
    cargarCotizaciones();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function crearOrdenDesdeCotizacion(cot) {
  // Buscar o crear cliente
  let clienteId = null;
  if (cot.cedula_cliente) {
    try {
      const cl = await api(`/clientes?cedula_nit=eq.${cot.cedula_cliente}`).catch(() => []) || [];
      if (cl.length) {
        clienteId = cl[0].id;
      } else if (cot.nombre_cliente) {
        const nuevo = await api('/clientes?select=id', 'POST', {
          cedula_nit: cot.cedula_cliente,
          nombre: cot.nombre_cliente,
          celular: cot.telefono_cliente || null
        }, { Prefer: 'return=representation' });
        clienteId = nuevo[0]?.id || null;
      }
    } catch(e) { console.warn('Error cliente:', e); }
  }

  // Buscar vehículo
  let vehiculoId = null;
  if (cot.placa) {
    const vh = await api(`/vehiculos?placa=eq.${cot.placa}`).catch(() => []) || [];
    vehiculoId = vh[0]?.id || null;
  }

  // Construir body con todos los campos disponibles en la cotización
  const body = {
    placa:           cot.placa           || null,
    marca:           cot.marca           || null,
    linea:           cot.linea           || cot.modelo || null,
    modelo:          cot.año             || cot.modelo || null,
    color:           cot.color           || null,
    propietario:     cot.nombre_cliente  || null,
    telefono:        cot.telefono_cliente || null,
    cedula_cliente:  cot.cedula_cliente  || null,
    correo_cliente:  cot.correo_cliente  || null,
    aseguradora:     cot.aseguradora     || null,
    tipo_cliente:    cot.tipo_cliente    || null,
    nivel_dano:      cot.nivel_dano      || null,
    cotizacion_url:  cot.url_pdf         || null,
    cotizacion_id:   cot.id,
    cliente_id:      clienteId,
    vehiculo_id:     vehiculoId,
    estado:          'Activa'
  };

  const res = await api('/ordenes?select=id', 'POST', body, { Prefer: 'return=representation' });
  const ordenId = res[0].id;
  await api(`/cotizaciones?id=eq.${cot.id}`, 'PATCH', { orden_id: ordenId });
  return ordenId;
}