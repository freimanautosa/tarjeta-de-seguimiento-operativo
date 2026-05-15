// ═══════════════════════════════════════════════════════════
// MÓDULO DE REPUESTOS
// Flujo: Solicitud → Jefe aprueba → Repuestos cotiza → Jefe precio venta → Cliente ve
// ═══════════════════════════════════════════════════════════

const N8N_REPUESTO = 'https://automatizacionesfreimanautos-n8n.qs0sgf.easypanel.host/webhook/notificar-etapa';

// ─────────────────────────────────────────────────────────
// SOLICITAR REPUESTO — desde orden/etapa (todos los perfiles)
// ─────────────────────────────────────────────────────────
function abrirModalSolicitudRepuesto(ordenId, etapaId, placa) {
  const existing = document.getElementById('modal-solicitud-repuesto');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'modal-solicitud-repuesto';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div class="modal-titulo">Solicitar repuesto — ${placa}</div>
        <button class="modal-close" onclick="document.getElementById('modal-solicitud-repuesto').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Repuesto solicitado *</label>
          <input id="sr-repuesto" placeholder="Ej: Filtro de aceite, pastillas de freno...">
        </div>
        <div class="field">
          <label>Unidades *</label>
          <input id="sr-unidades" type="number" min="1" value="1" placeholder="1">
        </div>
        <div class="field">
          <label>Observaciones</label>
          <textarea id="sr-obs" placeholder="Referencia, marca preferida, urgencia..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-solicitud-repuesto').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="enviarSolicitudRepuesto(${ordenId},${etapaId||'null'},'${placa}')">Enviar solicitud</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function enviarSolicitudRepuesto(ordenId, etapaId, placa) {
  const repuesto = document.getElementById('sr-repuesto')?.value.trim();
  const unidades = parseFloat(document.getElementById('sr-unidades')?.value) || 1;
  const obs      = document.getElementById('sr-obs')?.value.trim() || null;

  if (!repuesto) { toast('Indica el repuesto', 'err'); return; }

  try {
    await api('/solicitudes_repuesto', 'POST', {
      orden_id:           ordenId,
      etapa_id:           etapaId || null,
      solicitado_por:     sesion.nombre,
      perfil_solicitante: sesion.perfil,
      repuesto,
      unidades,
      observaciones:      obs,
      estado:             'pendiente_jefe'
    }, { Prefer: 'return=minimal' });

    // Notificar al jefe por Telegram
    fetch(N8N_REPUESTO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento: 'repuesto_solicitado',
        solicitado_por: sesion.nombre,
        repuesto, unidades,
        placa,
        orden_id: ordenId
      })
    }).catch(() => {});

    document.getElementById('modal-solicitud-repuesto')?.remove();
    toast('Solicitud enviada al jefe de taller ✓');

    // Actualizar badge de repuestos pendientes si el jefe está viendo
    if (sesion.perfil === 'jefe') actualizarBadgeRepuestos();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

// ─────────────────────────────────────────────────────────
// BADGE NOTIFICACIÓN JEFE — muestra cuántas solicitudes pendientes
// ─────────────────────────────────────────────────────────
async function actualizarBadgeRepuestos() {
  try {
    const pendientes = await api('/solicitudes_repuesto?estado=eq.pendiente_jefe&select=id').catch(()=>[]) || [];
    const badge = document.getElementById('badge-repuestos');
    if (!badge) return;
    if (pendientes.length > 0) {
      badge.textContent = pendientes.length;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────
// PERFIL JEFE — sección de repuestos
// ─────────────────────────────────────────────────────────
async function cargarRepuestosJefe() {
  const cont = document.getElementById('repuestos-jefe-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando solicitudes...</div>';

  try {
    const solicitudes = await api(
      '/solicitudes_repuesto?order=creado_en.desc&limit=50&select=*'
    ).catch(()=>[]) || [];

    const ordenIds = [...new Set(solicitudes.map(s => s.orden_id).filter(Boolean))];
    let ordenes = [];
    if (ordenIds.length) {
      ordenes = await api(`/ordenes?id=in.(${ordenIds.join(',')})&select=id,placa,marca,linea`).catch(()=>[]) || [];
    }
    const ordenMap = {};
    ordenes.forEach(o => { ordenMap[o.id] = o; });

    const estadoLabel = {
      pendiente_jefe:    { txt: 'Pendiente revisión', cls: 'badge-pendiente' },
      enviado_repuestos: { txt: 'En repuestos',       cls: 'badge-iniciada'  },
      cotizado:          { txt: 'Cotizado',            cls: 'badge-cotizada'  },
      pedido:            { txt: 'Pedido',              cls: 'badge-iniciada'  },
      entregado:         { txt: 'Entregado',           cls: 'badge-completada'},
      rechazado:         { txt: 'Rechazado',           cls: 'badge-pendiente' }
    };

    if (!solicitudes.length) {
      cont.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>Sin solicitudes de repuestos</p></div>';
      return;
    }

    cont.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:16px;font-weight:700">Solicitudes de repuestos</div>
        <div style="display:flex;gap:8px">
          <select id="rep-filtro-estado" class="filtro-btn" onchange="cargarRepuestosJefe()" style="font-size:12px;padding:6px 10px;border-radius:6px;border:1px solid var(--gris-borde)">
            <option value="">Todos los estados</option>
            <option value="pendiente_jefe">Pendiente revisión</option>
            <option value="enviado_repuestos">En repuestos</option>
            <option value="cotizado">Cotizado</option>
            <option value="pedido">Pedido</option>
            <option value="entregado">Entregado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px" id="rep-lista-jefe">
        ${solicitudes.map(s => {
          const orden  = ordenMap[s.orden_id] || {};
          const estado = estadoLabel[s.estado] || { txt: s.estado, cls: '' };
          const esPendiente = s.estado === 'pendiente_jefe';
          const esCotizado  = s.estado === 'cotizado';
          return `<div class="card" style="padding:16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
              <div>
                <div style="font-weight:700;font-size:15px;margin-bottom:3px">${s.repuesto}</div>
                <div style="font-size:12px;color:var(--gris-mid)">${s.unidades} und · Solicitado por <strong>${s.solicitado_por}</strong> · ${formatTS(s.creado_en)}</div>
                ${orden.placa ? `<div style="font-size:12px;color:var(--azul);margin-top:2px;font-family:'DM Mono',monospace">${orden.placa} ${[orden.marca,orden.linea].filter(Boolean).join(' ')} · <span style="color:var(--gris-mid)">Orden #${s.orden_id}</span></div>` : ''}
                ${s.observaciones ? `<div style="font-size:12px;color:var(--gris-mid);margin-top:4px;font-style:italic">${s.observaciones}</div>` : ''}
              </div>
              <span class="badge ${estado.cls}">${estado.txt}</span>
            </div>

            ${esPendiente ? `
              <div style="background:var(--gris-bg);border-radius:8px;padding:10px 12px;margin-bottom:10px">
                <div style="font-size:11px;font-weight:600;color:var(--gris-mid);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Nota para repuestos (opcional)</div>
                <textarea id="nota-jefe-${s.id}" style="width:100%;min-height:48px;font-size:13px;border:1px solid var(--gris-borde);border-radius:6px;padding:6px 10px;resize:vertical" placeholder="Especificaciones adicionales...">${s.nota_jefe||''}</textarea>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-success btn-sm" onclick="jefeProcesarSolicitud(${s.id},'aprobar')">
                  ✓ Aprobar y enviar a repuestos
                </button>
                <button class="btn btn-danger btn-sm" onclick="jefeProcesarSolicitud(${s.id},'rechazar')">
                  ✕ Rechazar
                </button>
              </div>` : ''}

            ${esCotizado ? `
              <button class="btn btn-outline btn-sm" onclick="abrirModalPrecioVenta(${s.id})">
                Ver cotizaciones y poner precio venta
              </button>` : ''}

            ${s.estado === 'enviado_repuestos' ? `
              <div style="font-size:12px;color:var(--gris-mid);font-style:italic">Esperando cotización del área de repuestos...</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

async function jefeProcesarSolicitud(id, accion) {
  const nota = document.getElementById(`nota-jefe-${id}`)?.value.trim() || null;
  const nuevoEstado = accion === 'aprobar' ? 'enviado_repuestos' : 'rechazado';
  try {
    await api(`/solicitudes_repuesto?id=eq.${id}`, 'PATCH', { estado: nuevoEstado, nota_jefe: nota });
    toast(accion === 'aprobar' ? 'Enviado a repuestos ✓' : 'Solicitud rechazada');
    cargarRepuestosJefe();
    actualizarBadgeRepuestos();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// Modal precio venta del jefe sobre cotizaciones
async function abrirModalPrecioVenta(solicitudId) {
  const cots = await api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&order=opcion.asc&select=*,proveedores(nombre,contacto,telefono)`).catch(()=>[]) || [];
  const sol  = await api(`/solicitudes_repuesto?id=eq.${solicitudId}`).then(r=>r?.[0]).catch(()=>null);

  const existing = document.getElementById('modal-precio-venta');
  if (existing) existing.remove();

  const fmt = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
  const opcionLabel = { 1:'Opción alta', 2:'Opción media', 3:'Opción baja' };

  const div = document.createElement('div');
  div.id = 'modal-precio-venta';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:540px">
      <div class="modal-header">
        <div class="modal-titulo">Precio venta al cliente — ${sol?.repuesto||''}</div>
        <button class="modal-close" onclick="document.getElementById('modal-precio-venta').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--gris-mid);margin-bottom:16px">
          Define el precio de venta para cada opción. El cliente verá estas 3 opciones en su perfil.
        </p>
        ${cots.map(c => `
          <div style="background:var(--gris-bg);border-radius:8px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--gris-borde)">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px">${opcionLabel[c.opcion]||'Opción '+c.opcion}</div>
            <div style="font-size:12px;color:var(--gris-mid);margin-bottom:8px">
              Proveedor: <strong>${c.proveedores?.nombre||'—'}</strong> · ${c.proveedores?.telefono||c.proveedores?.contacto||'—'}<br>
              Costo taller: <strong>${fmt(c.precio_costo)}</strong>
            </div>
            <div class="field">
              <label>Precio venta al cliente (COP)</label>
              <input type="number" id="pv-${c.id}" value="${c.precio_venta_jefe||''}" placeholder="0" min="0" style="font-family:'DM Mono',monospace">
            </div>
          </div>`).join('')}
        ${!cots.length ? '<div style="color:var(--gris-mid);font-size:13px">Sin cotizaciones aún.</div>' : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-precio-venta').remove()">Cancelar</button>
        ${cots.length ? `<button class="btn btn-primary" onclick="guardarPreciosVenta([${cots.map(c=>c.id).join(',')}],${solicitudId})">Guardar y notificar cliente</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function guardarPreciosVenta(cotIds, solicitudId) {
  try {
    for (const id of cotIds) {
      const val = parseFloat(document.getElementById(`pv-${id}`)?.value) || 0;
      await api(`/cotizaciones_repuesto?id=eq.${id}`, 'PATCH', { precio_venta_jefe: val });
    }
    toast('Precios guardados ✓ — el cliente puede ver las opciones');
    document.getElementById('modal-precio-venta')?.remove();
    cargarRepuestosJefe();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ─────────────────────────────────────────────────────────
// PERFIL REPUESTOS — gestión de cotizaciones
// ─────────────────────────────────────────────────────────
async function montarRepuestos() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = `
      <div class="nav-section-label">Repuestos</div>
      <button class="nav-item active" onclick="mostrarSeccionRep('solicitudes')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        Solicitudes
      </button>
      <button class="nav-item" onclick="mostrarSeccionRep('proveedores')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        Proveedores
      </button>`;
  }

  const title = document.getElementById('topbar-title');
  if (title) title.textContent = 'Repuestos';
  mostrarPagina('pag-repuestos');
  cargarSolicitudesRepuestos();
}

function mostrarSeccionRep(sec) {
  document.querySelectorAll('#sidebar-nav .nav-item').forEach((b,i) => {
    b.classList.toggle('active', i === (sec === 'solicitudes' ? 0 : 1));
  });
  if (sec === 'solicitudes') cargarSolicitudesRepuestos();
  else cargarProveedores();
}

async function cargarSolicitudesRepuestos() {
  const cont = document.getElementById('rep-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando solicitudes...</div>';

  try {
    const solicitudes = await api(
      `/solicitudes_repuesto?estado=in.(enviado_repuestos,cotizado,pedido,entregado)&order=creado_en.desc&select=*`
    ).catch(()=>[]) || [];

    const ordenIds = [...new Set(solicitudes.map(s => s.orden_id).filter(Boolean))];
    let ordenes = [];
    if (ordenIds.length) {
      ordenes = await api(`/ordenes?id=in.(${ordenIds.join(',')})&select=id,placa,marca,linea`).catch(()=>[]) || [];
    }
    const ordenMap = {};
    ordenes.forEach(o => { ordenMap[o.id] = o; });

    if (!solicitudes.length) {
      cont.innerHTML = `
        <div style="padding:20px">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px">Solicitudes de repuestos</div>
          <div class="empty-state"><div class="empty-state-icon">📦</div><p>Sin solicitudes asignadas</p></div>
        </div>`;
      return;
    }

    cont.innerHTML = `
      <div style="padding:20px">
        <div style="font-size:16px;font-weight:700;margin-bottom:16px">Solicitudes de repuestos</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${solicitudes.map(s => {
            const orden = ordenMap[s.orden_id] || {};
            return `<div class="card" style="padding:16px" id="rep-sol-${s.id}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
                <div>
                  <div style="font-weight:700;font-size:15px;margin-bottom:2px">${s.repuesto}</div>
                  <div style="font-size:12px;color:var(--gris-mid)">${s.unidades} unidades · ${formatTS(s.creado_en)}</div>
                  ${orden.placa ? `<div style="font-size:12px;color:var(--azul);font-family:'DM Mono',monospace;margin-top:2px">${orden.placa} ${[orden.marca,orden.linea].filter(Boolean).join(' ')}</div>` : ''}
                  ${s.nota_jefe ? `<div style="font-size:12px;color:var(--texto);margin-top:6px;background:var(--gris-bg);padding:6px 10px;border-radius:6px;border-left:3px solid var(--azul)">📝 Jefe: ${s.nota_jefe}</div>` : ''}
                  ${s.observaciones ? `<div style="font-size:12px;color:var(--gris-mid);font-style:italic;margin-top:4px">${s.observaciones}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                  <span class="badge ${s.estado==='entregado'?'badge-completada':s.estado==='pedido'?'badge-iniciada':'badge-cotizada'}">${
                    s.estado==='enviado_repuestos'?'Por cotizar':
                    s.estado==='cotizado'?'Cotizado':
                    s.estado==='pedido'?'Pedido':
                    s.estado==='entregado'?'Entregado':s.estado
                  }</span>
                  <button class="btn btn-primary btn-sm" onclick="abrirModalCotizar(${s.id},'${s.repuesto.replace(/'/g,'&apos;')}',${s.unidades})">
                    ${s.estado==='enviado_repuestos'?'+ Cotizar':'Ver / editar cotización'}
                  </button>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

async function abrirModalCotizar(solicitudId, repuesto, unidades) {
  // Cargar proveedores y cotizaciones existentes
  const [proveedores, cots] = await Promise.all([
    api('/proveedores?activo=eq.true&order=nombre.asc').catch(()=>[]) || [],
    api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&order=opcion.asc`).catch(()=>[]) || []
  ]);

  const existing = document.getElementById('modal-cotizar');
  if (existing) existing.remove();

  const provOpts = `<option value="">— Seleccionar proveedor —</option>` +
    proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

  const opcionLabel = { 1:'Opción 1 — Precio alto', 2:'Opción 2 — Precio medio', 3:'Opción 3 — Precio bajo' };

  function renderOpcion(num) {
    const c = cots.find(x => x.opcion === num) || {};
    return `
      <div style="background:var(--gris-bg);border-radius:8px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--gris-borde)">
        <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--azul)">${opcionLabel[num]}</div>
        <div class="grid-2">
          <div class="field">
            <label>Proveedor</label>
            <select id="cot-prov-${num}-${solicitudId}" style="width:100%">${provOpts}</select>
          </div>
          <div class="field">
            <label>Precio costo x unidad (COP)</label>
            <input type="number" id="cot-precio-${num}-${solicitudId}" value="${c.precio_costo||''}" placeholder="0" min="0" style="font-family:'DM Mono',monospace">
          </div>
        </div>
        <div id="cot-estado-wrap-${num}-${solicitudId}" style="margin-top:8px">
          <div class="field">
            <label>Estado</label>
            <select id="cot-estado-${num}-${solicitudId}" style="width:100%">
              <option value="cotizado" ${(c.estado_opcion||'cotizado')==='cotizado'?'selected':''}>Cotizado</option>
              <option value="pedido" ${c.estado_opcion==='pedido'?'selected':''}>Pedido</option>
              <option value="entregado" ${c.estado_opcion==='entregado'?'selected':''}>Entregado</option>
            </select>
          </div>
        </div>
      </div>`;
  }

  // Pre-seleccionar proveedores en cots existentes
  const div = document.createElement('div');
  div.id = 'modal-cotizar';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-titulo">Cotizar — ${repuesto} (${unidades} und)</div>
        <button class="modal-close" onclick="document.getElementById('modal-cotizar').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--gris-mid);margin-bottom:16px">
          Ingresa las 3 opciones de cotización. El jefe de taller definirá el precio de venta al cliente.
        </p>
        ${renderOpcion(1)}${renderOpcion(2)}${renderOpcion(3)}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cotizar').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarCotizaciones(${solicitudId})">Guardar cotizaciones</button>
      </div>
    </div>`;
  document.body.appendChild(div);

  // Pre-seleccionar proveedores
  cots.forEach(c => {
    const sel = document.getElementById(`cot-prov-${c.opcion}-${solicitudId}`);
    if (sel) sel.value = c.proveedor_id || '';
  });
}

async function guardarCotizaciones(solicitudId) {
  try {
    for (let opcion = 1; opcion <= 3; opcion++) {
      const provId  = document.getElementById(`cot-prov-${opcion}-${solicitudId}`)?.value || null;
      const precio  = parseFloat(document.getElementById(`cot-precio-${opcion}-${solicitudId}`)?.value) || 0;
      const estado  = document.getElementById(`cot-estado-${opcion}-${solicitudId}`)?.value || 'cotizado';

      if (!provId && !precio) continue; // saltar opciones vacías

      // Upsert por solicitud_id + opcion
      const existing = await api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&opcion=eq.${opcion}`).catch(()=>[]) || [];
      if (existing.length) {
        await api(`/cotizaciones_repuesto?id=eq.${existing[0].id}`, 'PATCH', {
          proveedor_id: provId || null, precio_costo: precio, estado_opcion: estado
        });
      } else {
        await api('/cotizaciones_repuesto', 'POST', {
          solicitud_id: solicitudId, opcion, proveedor_id: provId || null,
          precio_costo: precio, estado_opcion: estado
        }, { Prefer: 'return=minimal' });
      }
    }

    // Actualizar estado solicitud a cotizado
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', { estado: 'cotizado' });

    toast('Cotizaciones guardadas ✓ — el jefe puede revisarlas');
    document.getElementById('modal-cotizar')?.remove();
    cargarSolicitudesRepuestos();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ─────────────────────────────────────────────────────────
// PROVEEDORES
// ─────────────────────────────────────────────────────────
async function cargarProveedores() {
  const cont = document.getElementById('rep-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando proveedores...</div>';

  try {
    const proveedores = await api('/proveedores?order=nombre.asc').catch(()=>[]) || [];

    cont.innerHTML = `
      <div style="padding:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-size:16px;font-weight:700">Proveedores</div>
          <button class="btn btn-primary btn-sm" onclick="abrirModalProveedor()">+ Nuevo proveedor</button>
        </div>
        ${proveedores.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--gris-bg);border-bottom:1px solid var(--gris-borde)">
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Nombre</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Especialidad</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Contacto</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Teléfono</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${proveedores.map(p => `
              <tr style="border-bottom:1px solid var(--gris-borde)">
                <td style="padding:10px 12px;font-weight:600">${p.nombre}</td>
                <td style="padding:10px 12px;color:var(--gris-mid)">${p.especialidad||'—'}</td>
                <td style="padding:10px 12px">${p.contacto||'—'}</td>
                <td style="padding:10px 12px;font-family:'DM Mono',monospace">${p.telefono||'—'}</td>
                <td style="padding:10px 12px">
                  <span class="badge ${p.activo?'badge-completada':'badge-pendiente'}">${p.activo?'Activo':'Inactivo'}</span>
                </td>
                <td style="padding:10px 12px">
                  <button class="btn btn-ghost btn-sm" onclick="abrirModalProveedor(${JSON.stringify(p).replace(/"/g,'&quot;')})">Editar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<div class="empty-state"><div class="empty-state-icon">🏪</div><p>Sin proveedores registrados</p></div>'}
      </div>`;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

function abrirModalProveedor(prov) {
  const existing = document.getElementById('modal-proveedor');
  if (existing) existing.remove();

  const p = prov || {};
  const div = document.createElement('div');
  div.id = 'modal-proveedor';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div class="modal-titulo">${p.id ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
        <button class="modal-close" onclick="document.getElementById('modal-proveedor').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="field"><label>Nombre *</label><input id="prov-nombre" value="${p.nombre||''}"></div>
        <div class="field">
          <label>Especialidad</label>
          <select id="prov-especialidad" style="width:100%">
            <option value="">— General —</option>
            ${['Latonería','Pintura','Mecánica','Eléctrica','Llantas','Vidrios','Tapicería','Frenos','Suspensión','General'].map(e =>
              `<option value="${e}" ${p.especialidad===e?'selected':''}>${e}</option>`
            ).join('')}
          </select>
        </div>
        <div class="field"><label>Contacto</label><input id="prov-contacto" value="${p.contacto||''}" placeholder="Nombre del vendedor"></div>
        <div class="field"><label>Teléfono</label><input id="prov-telefono" value="${p.telefono||''}" type="tel"></div>
        <div class="field"><label>Email</label><input id="prov-email" value="${p.email||''}" type="email"></div>
        ${p.id ? `
        <div class="field">
          <label>Estado</label>
          <select id="prov-activo" style="width:100%">
            <option value="true" ${p.activo?'selected':''}>Activo</option>
            <option value="false" ${!p.activo?'selected':''}>Inactivo</option>
          </select>
        </div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-proveedor').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarProveedor(${p.id||'null'})">Guardar</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function guardarProveedor(id) {
  const nombre = document.getElementById('prov-nombre')?.value.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'err'); return; }

  const body = {
    nombre,
    especialidad: document.getElementById('prov-especialidad')?.value || null,
    contacto:     document.getElementById('prov-contacto')?.value.trim()  || null,
    telefono:     document.getElementById('prov-telefono')?.value.trim()  || null,
    email:        document.getElementById('prov-email')?.value.trim()     || null,
    activo:       id ? (document.getElementById('prov-activo')?.value === 'true') : true
  };

  try {
    if (id) {
      await api(`/proveedores?id=eq.${id}`, 'PATCH', body);
    } else {
      await api('/proveedores', 'POST', body, { Prefer: 'return=minimal' });
    }
    toast('Proveedor guardado ✓');
    document.getElementById('modal-proveedor')?.remove();
    cargarProveedores();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ─────────────────────────────────────────────────────────
// VISTA CLIENTE — repuestos de su orden
// ─────────────────────────────────────────────────────────
async function cargarRepuestosCliente(ordenId) {
  const cont = document.getElementById('cliente-repuestos-contenido');
  if (!cont) return;

  try {
    const solicitudes = await api(
      `/solicitudes_repuesto?orden_id=eq.${ordenId}&estado=in.(cotizado,pedido,entregado)&select=*`
    ).catch(()=>[]) || [];

    if (!solicitudes.length) { cont.innerHTML = ''; return; }

    const fmt = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';

    const items = await Promise.all(solicitudes.map(async s => {
      const cots = await api(
        `/cotizaciones_repuesto?solicitud_id=eq.${s.id}&order=opcion.asc&select=*,proveedores(nombre)`
      ).catch(()=>[]) || [];

      const cotsConPrecio = cots.filter(c => c.precio_venta_jefe);
      if (!cotsConPrecio.length) return '';

      const opcionLabel = { 1:'Opción 1', 2:'Opción 2', 3:'Opción 3' };
      return `<div style="margin-bottom:16px;padding:14px;background:var(--gris-bg);border-radius:8px;border:1px solid var(--gris-borde)">
        <div style="font-weight:700;margin-bottom:8px">${s.repuesto} · ${s.unidades} und</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${cotsConPrecio.map(c => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:white;border-radius:6px;border:1px solid var(--gris-borde)">
              <div>
                <div style="font-size:13px;font-weight:600">${opcionLabel[c.opcion]||'Opción '+c.opcion}</div>
                <div style="font-size:11px;color:var(--gris-mid)">${c.proveedores?.nombre||'—'}</div>
              </div>
              <div style="font-size:15px;font-weight:700;color:var(--verde);font-family:'DM Mono',monospace">${fmt(c.precio_venta_jefe)}</div>
            </div>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--gris-mid);margin-top:8px">Consulta con el taller para confirmar la opción de tu preferencia.</div>
      </div>`;
    }));

    const html = items.filter(Boolean).join('');
    if (html) {
      cont.innerHTML = `
        <div style="margin-top:16px;border-top:1px solid var(--gris-borde);padding-top:16px">
          <div class="seccion-titulo">Repuestos disponibles</div>
          ${html}
        </div>`;
    }
  } catch(e) { cont.innerHTML = ''; }
}