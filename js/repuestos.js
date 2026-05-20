// ═══════════════════════════════════════════════════════════
// MÓDULO DE REPUESTOS — v2
// ═══════════════════════════════════════════════════════════

const N8N_REPUESTO = 'https://automatizacionesfreimanautos-n8n.qs0sgf.easypanel.host/webhook/notificar-etapa';

const MARCAS_VEHICULOS = [
  'Acura','Alfa Romeo','Audi','BMW','Bentley','Buick','Cadillac','Chevrolet',
  'Chrysler','Citroën','Dodge','Ferrari','Fiat','Ford','GMC','Genesis',
  'Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Lamborghini',
  'Land Rover','Lexus','Lincoln','Maserati','Mazda','Mercedes-Benz','Mini',
  'Mitsubishi','Nissan','Peugeot','Porsche','Ram','Renault','Rolls-Royce',
  'Seat','Skoda','Subaru','Suzuki','Tesla','Toyota','Volkswagen','Volvo',
  'Bajaj','Hero','Yamaha','Honda Moto','Kawasaki','Suzuki Moto','KTM'
];

// ── Polling global ──────────────────────────────────────
let _repuestosPollingInterval = null;
function iniciarPollingRepuestos(fn, seg = 15) {
  if (_repuestosPollingInterval) clearInterval(_repuestosPollingInterval);
  _repuestosPollingInterval = setInterval(fn, seg * 1000);
}
function detenerPollingRepuestos() {
  if (_repuestosPollingInterval) clearInterval(_repuestosPollingInterval);
  _repuestosPollingInterval = null;
}

// ── Registros para evitar pasar datos de DB en onclick ──
let _solRegistry = {};
let _provRegistry = {};

function _abrirCotizarPorId(btn) {
  const d = _solRegistry[btn.dataset.solId];
  if (d) abrirModalCotizar(d.solicitudId, d.repuesto, d.unidades, d.placa, d.marca, d.modelo, d.anio, d.vin);
}

function _editarProveedorPorId(btn) {
  const p = _provRegistry[btn.dataset.provId];
  if (p) abrirModalProveedor(p);
}

// ─────────────────────────────────────────────────────────
// SOLICITAR REPUESTO
// ─────────────────────────────────────────────────────────
async function abrirModalSolicitudRepuesto(ordenId, etapaId, placa) {
  const existing = document.getElementById('modal-solicitud-repuesto');
  if (existing) existing.remove();

  const historial = await api('/solicitudes_repuesto?select=repuesto&order=creado_en.desc&limit=100').catch(()=>[]) || [];
  const frecuencia = {};
  historial.forEach(h => { frecuencia[h.repuesto] = (frecuencia[h.repuesto]||0)+1; });
  const sugeridos = Object.entries(frecuencia).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([r])=>r);

  const div = document.createElement('div');
  div.id = 'modal-solicitud-repuesto';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:460px">
      <div class="modal-header">
        <div class="modal-titulo">Solicitar repuesto — ${escapeHtml(placa)}</div>
        <button class="modal-close" onclick="document.getElementById('modal-solicitud-repuesto').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="field" style="position:relative">
          <label>Repuesto solicitado *</label>
          <input id="sr-repuesto" placeholder="Escribe el nombre del repuesto..."
            oninput="filtrarSugerenciasRepuesto(this.value)"
            onblur="setTimeout(()=>{ const s=document.getElementById('sr-sugerencias'); if(s) s.style.display='none'; },200)">
          <div id="sr-sugerencias" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1.5px solid var(--gris-borde);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:200;overflow:hidden">
            ${sugeridos.map(s=>`<div style="padding:9px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--gris-borde)" data-val="${escapeHtml(s)}" onmousedown="document.getElementById('sr-repuesto').value=this.dataset.val;document.getElementById('sr-sugerencias').style.display='none'">${escapeHtml(s)}</div>`).join('')}
          </div>
        </div>
        ${sugeridos.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          <span style="font-size:11px;color:var(--gris-mid);align-self:center">Recientes:</span>
          ${sugeridos.slice(0,5).map(s=>`<button type="button" class="btn btn-ghost btn-xs" data-val="${escapeHtml(s)}" onclick="document.getElementById('sr-repuesto').value=this.dataset.val" style="font-size:11px">${escapeHtml(s)}</button>`).join('')}
        </div>` : ''}
        <div class="field">
          <label>Unidades *</label>
          <input id="sr-unidades" type="number" min="1" value="1">
        </div>
        <div class="field">
          <label>Observaciones</label>
          <textarea id="sr-obs" placeholder="Referencia, marca preferida, urgencia..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-solicitud-repuesto').remove()">Cancelar</button>
        <button class="btn btn-primary" data-oid="${ordenId}" data-eid="${etapaId||''}" data-placa="${escapeHtml(placa)}" onclick="enviarSolicitudRepuesto(+this.dataset.oid,this.dataset.eid?+this.dataset.eid:null,this.dataset.placa)">Enviar solicitud</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

function filtrarSugerenciasRepuesto(val) {
  const cont = document.getElementById('sr-sugerencias');
  if (!cont) return;
  if (!val || val.length < 2) { cont.style.display='none'; return; }
  const items = cont.querySelectorAll('div');
  let vis = 0;
  items.forEach(item => {
    const match = item.textContent.toLowerCase().includes(val.toLowerCase());
    item.style.display = match ? '' : 'none';
    if (match) vis++;
  });
  cont.style.display = vis ? 'block' : 'none';
}

async function enviarSolicitudRepuesto(ordenId, etapaId, placa) {
  const repuesto = document.getElementById('sr-repuesto')?.value.trim();
  const unidades = parseFloat(document.getElementById('sr-unidades')?.value)||1;
  const obs      = document.getElementById('sr-obs')?.value.trim()||null;
  if (!repuesto) { toast('Indica el repuesto','err'); return; }

  try {
    const orden = await api(`/ordenes?id=eq.${ordenId}&select=placa,marca,linea,modelo,vin`).then(r=>r?.[0]).catch(()=>null);
    await api('/solicitudes_repuesto','POST',{
      orden_id: ordenId, etapa_id: etapaId||null,
      solicitado_por: sesion.nombre, perfil_solicitante: sesion.perfil,
      repuesto, unidades, observaciones: obs, estado: 'pendiente_jefe'
    },{ Prefer:'return=minimal' });

    // ── Pausar la etapa mientras se gestiona el repuesto ──
    if (etapaId) {
      await api(`/etapas?id=eq.${etapaId}`, 'PATCH', {
        pausado: true,
        pausa_inicio: new Date().toISOString()
      }).catch(() => {});
    }

    fetch(N8N_REPUESTO,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        evento:'repuesto_solicitado', solicitado_por: sesion.nombre,
        repuesto, unidades, placa: orden?.placa||placa,
        marca: orden?.marca||'', modelo: orden?.linea||'',
        vin: orden?.vin||'', orden_id: ordenId
      })
    }).catch(()=>{});

    document.getElementById('modal-solicitud-repuesto')?.remove();
    if (etapaId) {
      toast('Solicitud enviada ✓ — ⏸ Etapa pausada hasta recibir el repuesto');
    } else {
      toast('Solicitud enviada al jefe de taller ✓');
    }
    if (sesion.perfil==='jefe') actualizarBadgeRepuestos();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

// ─────────────────────────────────────────────────────────
// BADGE JEFE
// ─────────────────────────────────────────────────────────
async function actualizarBadgeRepuestos() {
  try {
    const p = await api('/solicitudes_repuesto?estado=eq.pendiente_jefe&select=id').catch(()=>[]) || [];
    const badge = document.getElementById('badge-repuestos');
    if (!badge) return;
    badge.textContent = p.length;
    badge.style.display = p.length>0 ? 'inline-flex' : 'none';
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────
// PERFIL JEFE — repuestos
// ─────────────────────────────────────────────────────────
async function cargarRepuestosJefe() {
  const cont = document.getElementById('repuestos-jefe-contenido');
  if (!cont) return;

  try {
    const filtro = document.getElementById('rep-filtro-estado')?.value||'';
    let q = '/solicitudes_repuesto?order=creado_en.desc&limit=50&select=*';
    if (filtro) q += `&estado=eq.${filtro}`;

    const solicitudes = await api(q).catch(()=>[]) || [];
    const oids = [...new Set(solicitudes.map(s=>s.orden_id).filter(Boolean))];
    const ordenes = oids.length ? await api(`/ordenes?id=in.(${oids.join(',')})&select=id,placa,marca,linea,modelo,vin`).catch(()=>[]) || [] : [];
    const om = {}; ordenes.forEach(o=>{ om[o.id]=o; });

    const estMap = {
      pendiente_jefe:    {txt:'Pendiente revisión',cls:'badge-pendiente'},
      enviado_repuestos: {txt:'En repuestos',      cls:'badge-iniciada'},
      cotizado:          {txt:'Cotizado',           cls:'badge-cotizada'},
      pedido:            {txt:'Pedido',             cls:'badge-iniciada'},
      entregado:         {txt:'Entregado',          cls:'badge-completada'},
      rechazado:         {txt:'Rechazado',          cls:'badge-pendiente'}
    };

    const barraHtml = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:16px;font-weight:700">Solicitudes de repuestos</div>
      <select id="rep-filtro-estado" onchange="cargarRepuestosJefe()" style="font-size:12px;padding:6px 10px;border-radius:6px;border:1px solid var(--gris-borde)">
        <option value="">Todos los estados</option>
        <option value="pendiente_jefe">Pendiente revisión</option>
        <option value="enviado_repuestos">En repuestos</option>
        <option value="cotizado">Cotizado</option>
        <option value="pedido">Pedido</option>
        <option value="entregado">Entregado</option>
        <option value="rechazado">Rechazado</option>
      </select>
    </div>`;

    if (!solicitudes.length) {
      cont.innerHTML = `<div style="padding:20px">${barraHtml}<div class="empty-state"><p>Sin solicitudes</p></div></div>`;
      return;
    }

    cont.innerHTML = `<div style="padding:20px">${barraHtml}
      <div style="display:flex;flex-direction:column;gap:10px">
        ${solicitudes.map(s => {
          const o   = om[s.orden_id]||{};
          const est = estMap[s.estado]||{txt:s.estado,cls:''};
          return `<div class="card" style="padding:16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
              <div>
                <div style="font-weight:700;font-size:15px;margin-bottom:3px">${escapeHtml(s.repuesto)}</div>
                <div style="font-size:12px;color:var(--gris-mid)">${escapeHtml(String(s.unidades))} und · ${escapeHtml(s.solicitado_por)} · ${formatTS(s.creado_en)}</div>
                ${o.placa ? `<div style="font-size:12px;color:var(--azul);margin-top:3px;font-family:'DM Mono',monospace">
                  ${escapeHtml(o.placa)} · ${[o.marca,o.linea,o.modelo].filter(Boolean).map(escapeHtml).join(' ')} · OT#${s.orden_id}
                  ${o.vin ? `· <span style="color:var(--gris-mid)">VIN: ${escapeHtml(o.vin)}</span>` : ''}
                </div>` : ''}
                ${s.observaciones ? `<div style="font-size:12px;color:var(--gris-mid);font-style:italic;margin-top:3px">${escapeHtml(s.observaciones)}</div>` : ''}
              </div>
              <span class="badge ${est.cls}">${est.txt}</span>
            </div>
            ${s.estado==='pendiente_jefe' ? `
              <div style="background:var(--gris-bg);border-radius:8px;padding:10px 12px;margin-bottom:10px">
                <div style="font-size:11px;font-weight:600;color:var(--gris-mid);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Nota para repuestos (opcional)</div>
                <textarea id="nota-jefe-${s.id}" style="width:100%;min-height:48px;font-size:13px;border:1px solid var(--gris-borde);border-radius:6px;padding:6px 10px;resize:vertical">${escapeHtml(s.nota_jefe||'')}</textarea>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-success btn-sm" onclick="jefeProcesarSolicitud(${s.id},'aprobar',${s.etapa_id||'null'})">✓ Aprobar y enviar</button>
                <button class="btn btn-danger btn-sm"  onclick="jefeProcesarSolicitud(${s.id},'rechazar',${s.etapa_id||'null'})">✕ Rechazar</button>
              </div>` : ''}
            ${s.estado==='cotizado' ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <button class="btn btn-outline btn-sm" onclick="abrirModalPrecioVenta(${s.id})">Ver cotizaciones y definir precio venta</button>
                ${s.etapa_id ? `<button class="btn btn-success btn-sm" onclick="jefeConfirmarEntrega(${s.id},${s.etapa_id})">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Confirmar entrega → Reanudar mecánico
                </button>` : ''}
              </div>` : ''}
            ${s.estado==='pedido' ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <span style="font-size:12px;color:var(--gris-mid);font-style:italic">Pedido al proveedor...</span>
                ${s.etapa_id ? `<button class="btn btn-success btn-sm" onclick="jefeConfirmarEntrega(${s.id},${s.etapa_id})">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Confirmar entrega → Reanudar mecánico
                </button>` : ''}
              </div>` : ''}
            ${s.estado==='enviado_repuestos' ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <span style="font-size:12px;color:var(--gris-mid);font-style:italic">Esperando cotización de repuestos...</span>
                ${s.etapa_id ? `<button class="btn btn-success btn-sm" onclick="jefeConfirmarEntrega(${s.id},${s.etapa_id})">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Confirmar entrega → Reanudar mecánico
                </button>` : ''}
              </div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;

    iniciarPollingRepuestos(()=>{
      if (document.getElementById('repuestos-jefe-contenido')) cargarRepuestosJefe();
      else detenerPollingRepuestos();
    });
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// ── Reanuda el timer de una etapa pausada y registra el tiempo de espera ──
async function _reanudarEtapa(etapaId, solicitudId) {
  if (!etapaId) return;
  try {
    const etapa = await api(`/etapas?id=eq.${etapaId}`).then(r => r?.[0]);
    if (!etapa || !etapa.pausado) return;
    const pausaMs = etapa.pausa_inicio
      ? Date.now() - new Date(etapa.pausa_inicio).getTime()
      : 0;
    const pausaMin = Math.max(0, Math.round(pausaMs / 60000));
    const tiempoPausadoTotal = (etapa.tiempo_pausado_min || 0) + pausaMin;
    await api(`/etapas?id=eq.${etapaId}`, 'PATCH', {
      pausado: false,
      pausa_inicio: null,
      tiempo_pausado_min: tiempoPausadoTotal
    });
    if (solicitudId) {
      await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', {
        tiempo_espera_min: pausaMin
      }).catch(() => {});
    }
  } catch(e) { console.error('Error reanudando etapa:', e); }
}

async function jefeProcesarSolicitud(id, accion, etapaId) {
  const nota = document.getElementById(`nota-jefe-${id}`)?.value.trim()||null;
  await api(`/solicitudes_repuesto?id=eq.${id}`,'PATCH',{estado:accion==='aprobar'?'enviado_repuestos':'rechazado',nota_jefe:nota});

  // Si se rechaza, reanudar inmediatamente la etapa del mecánico
  if (accion === 'rechazar' && etapaId) {
    await _reanudarEtapa(etapaId, id);
    toast('Rechazado — ▶ Etapa del mecánico reanudada');
  } else {
    toast(accion==='aprobar' ? 'Enviado a repuestos ✓' : 'Rechazado');
  }
  cargarRepuestosJefe(); actualizarBadgeRepuestos();
}

// Jefe confirma que el repuesto llegó y el mecánico puede continuar
async function jefeConfirmarEntrega(solicitudId, etapaId) {
  try {
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', { estado: 'entregado' });
    if (etapaId) {
      await _reanudarEtapa(etapaId, solicitudId);
      toast('Repuesto entregado ✓ — ▶ Etapa del mecánico reanudada');
    } else {
      toast('Repuesto marcado como entregado ✓');
    }
    cargarRepuestosJefe();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function abrirModalPrecioVenta(solicitudId) {
  const [cots,sol] = await Promise.all([
    api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&order=opcion.asc&select=*,proveedores(nombre,whatsapp)`).catch(()=>[]) || [],
    api(`/solicitudes_repuesto?id=eq.${solicitudId}`).then(r=>r?.[0]).catch(()=>null)
  ]);
  const existing = document.getElementById('modal-precio-venta');
  if (existing) existing.remove();
  const fmt = n => n!=null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
  const opLbl = {1:'Opción 1 — Precio alto',2:'Opción 2 — Precio medio',3:'Opción 3 — Precio bajo'};

  const div = document.createElement('div');
  div.id = 'modal-precio-venta';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <div class="modal-titulo">Precio venta — ${escapeHtml(sol?.repuesto||'')}</div>
        <button class="modal-close" onclick="document.getElementById('modal-precio-venta').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--gris-mid);margin-bottom:16px">El precio sugerido es el costo del taller + 40%.</p>
        ${cots.map(c => {
          const sug = c.precio_costo ? Math.round(c.precio_costo*1.4) : null;
          return `<div style="background:var(--gris-bg);border-radius:8px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--gris-borde)">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:var(--azul)">${opLbl[c.opcion]||'Opción '+c.opcion}</div>
            <div style="font-size:12px;color:var(--gris-mid);margin-bottom:10px">
              Proveedor: <strong>${escapeHtml(c.proveedores?.nombre||'—')}</strong><br>
              Costo taller: <strong>${fmt(c.precio_costo)}</strong>
              ${sug ? `· <span style="color:var(--verde);font-weight:600">Sugerido +40%: ${fmt(sug)}</span>` : ''}
            </div>
            <div class="field">
              <label>Precio venta al cliente (COP)</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="number" id="pv-${c.id}" value="${c.precio_venta_jefe||(sug||'')}" placeholder="0" min="0" style="font-family:'DM Mono',monospace;flex:1">
                ${sug ? `<button type="button" class="btn btn-ghost btn-sm" data-sug="${sug}" onclick="document.getElementById('pv-${c.id}').value=this.dataset.sug" style="white-space:nowrap;font-size:11px">Usar sugerido</button>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
        ${!cots.length ? '<p style="color:var(--gris-mid)">Sin cotizaciones aún.</p>' : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-precio-venta').remove()">Cancelar</button>
        ${cots.length ? `<button class="btn btn-primary" onclick="guardarPreciosVenta([${cots.map(c=>c.id).join(',')}],${solicitudId})">Guardar y notificar cliente</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function guardarPreciosVenta(cotIds, solicitudId) {
  for (const id of cotIds) {
    const val = parseFloat(document.getElementById(`pv-${id}`)?.value)||0;
    await api(`/cotizaciones_repuesto?id=eq.${id}`,'PATCH',{precio_venta_jefe:val});
  }
  toast('Precios guardados ✓');
  document.getElementById('modal-precio-venta')?.remove();
  cargarRepuestosJefe();
}

// ─────────────────────────────────────────────────────────
// PERFIL REPUESTOS
// ─────────────────────────────────────────────────────────
async function montarRepuestos() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = `
      <div class="nav-section-label">Repuestos</div>
      <button class="nav-item active" id="nav-rep-solicitudes" onclick="mostrarSeccionRep('solicitudes')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        Solicitudes
      </button>
      <button class="nav-item" id="nav-rep-proveedores" onclick="mostrarSeccionRep('proveedores')">
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
  const btnSol = document.getElementById('nav-rep-solicitudes');
  const btnProv = document.getElementById('nav-rep-proveedores');
  if (btnSol) btnSol.classList.toggle('active', sec === 'solicitudes');
  if (btnProv) btnProv.classList.toggle('active', sec === 'proveedores');
  if (sec === 'solicitudes') cargarSolicitudesRepuestos();
  else cargarProveedores();
}

async function cargarSolicitudesRepuestos() {
  const cont = document.getElementById('rep-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';

  try {
    const sols = await api('/solicitudes_repuesto?estado=in.(enviado_repuestos,cotizado,pedido,entregado)&order=creado_en.desc&select=*').catch(()=>[]) || [];
    const oids = [...new Set(sols.map(s=>s.orden_id).filter(Boolean))];
    const ords = oids.length ? await api(`/ordenes?id=in.(${oids.join(',')})&select=id,placa,marca,linea,modelo,vin`).catch(()=>[]) || [] : [];
    const om = {}; ords.forEach(o=>{ om[o.id]=o; });

    // Poblar registry para evitar pasar strings de DB en onclick
    _solRegistry = {};
    sols.forEach(s => {
      const o = om[s.orden_id]||{};
      _solRegistry[s.id] = {
        solicitudId: s.id, repuesto: s.repuesto||'', unidades: s.unidades||1,
        placa: o.placa||'', marca: o.marca||'', modelo: o.linea||'',
        anio: o.modelo||'', vin: o.vin||''
      };
    });

    if (!sols.length) {
      cont.innerHTML = `<div style="padding:20px"><div style="font-size:16px;font-weight:700;margin-bottom:16px">Solicitudes</div><div class="empty-state"><p>Sin solicitudes asignadas</p></div></div>`;
      return;
    }

    cont.innerHTML = `<div style="padding:20px">
      <div style="font-size:16px;font-weight:700;margin-bottom:16px">Solicitudes de repuestos</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${sols.map(s => {
          const o = om[s.orden_id]||{};
          return `<div class="card" style="padding:16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
              <div>
                <div style="font-weight:700;font-size:15px;margin-bottom:2px">${escapeHtml(s.repuesto)}</div>
                <div style="font-size:12px;color:var(--gris-mid)">${escapeHtml(String(s.unidades))} und · ${formatTS(s.creado_en)}</div>
                ${o.placa ? `<div style="font-size:12px;color:var(--azul);font-family:'DM Mono',monospace;margin-top:3px">
                  ${escapeHtml(o.placa)} · ${[o.marca,o.linea,o.modelo].filter(Boolean).map(escapeHtml).join(' ')} · OT#${s.orden_id}
                  ${o.vin ? `<br><span style="color:var(--gris-mid)">VIN: ${escapeHtml(o.vin)}</span>` : ''}
                </div>` : ''}
                ${s.nota_jefe ? `<div style="font-size:12px;background:var(--gris-bg);padding:6px 10px;border-radius:6px;border-left:3px solid var(--azul);margin-top:6px;display:flex;align-items:flex-start;gap:5px">${ico('edit',13)} <span>${escapeHtml(s.nota_jefe)}</span></div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                <span class="badge ${s.estado==='entregado'?'badge-completada':s.estado==='pedido'?'badge-iniciada':'badge-cotizada'}">${
                  s.estado==='enviado_repuestos'?'Por cotizar':s.estado==='cotizado'?'Cotizado':s.estado==='pedido'?'Pedido':'Entregado'
                }</span>
                <button class="btn btn-primary btn-sm" data-sol-id="${s.id}" onclick="_abrirCotizarPorId(this)">
                  ${s.estado==='enviado_repuestos'?'+ Cotizar':'Ver / editar'}
                </button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    iniciarPollingRepuestos(()=>{
      if (document.getElementById('rep-contenido')) cargarSolicitudesRepuestos();
      else detenerPollingRepuestos();
    });
  } catch(e) { cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`; }
}

async function abrirModalCotizar(solicitudId, repuesto, unidades, placa, marca, modelo, anio, vin) {
  const [proveedores, cots] = await Promise.all([
    api('/proveedores?activo=eq.true&order=nombre.asc').catch(()=>[]) || [],
    api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&order=opcion.asc`).catch(()=>[]) || []
  ]);
  const existing = document.getElementById('modal-cotizar');
  if (existing) existing.remove();

  const provOpts = '<option value="">— Seleccionar proveedor —</option>'+
    proveedores.map(p=>`<option value="${p.id}" data-wa="${escapeHtml(p.whatsapp||'')}">${escapeHtml(p.nombre)}</option>`).join('');
  const opLbl = {1:'Opción 1 — Precio alto',2:'Opción 2 — Precio medio',3:'Opción 3 — Precio bajo'};
  const msgBase = `Buenos días. Solicito su colaboración para la búsqueda del siguiente repuesto: *${repuesto}* (${unidades} und) para el vehículo *${marca} ${modelo}*${anio?' año '+anio:''}, VIN: *${vin||'No disponible'}*. Quedo atento, gracias.`;

  function renderOp(num) {
    const c = cots.find(x=>x.opcion===num)||{};
    return `<div style="background:var(--gris-bg);border-radius:8px;padding:12px 14px;margin-bottom:12px;border:1px solid var(--gris-borde)">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--azul)">${opLbl[num]}</div>
      <div class="grid-2">
        <div class="field">
          <label>Proveedor</label>
          <select id="cot-prov-${num}-${solicitudId}" style="width:100%" onchange="actualizarWaLink(${num},${solicitudId})">${provOpts}</select>
        </div>
        <div class="field">
          <label>Precio costo x unidad (COP)</label>
          <input type="number" id="cot-precio-${num}-${solicitudId}" value="${c.precio_costo||''}" placeholder="0" min="0" style="font-family:'DM Mono',monospace">
        </div>
      </div>
      <div class="field">
        <label>Estado</label>
        <select id="cot-estado-${num}-${solicitudId}" style="width:180px">
          <option value="cotizado"  ${(c.estado_opcion||'cotizado')==='cotizado' ?'selected':''}>Cotizado</option>
          <option value="pedido"    ${c.estado_opcion==='pedido'   ?'selected':''}>Pedido</option>
          <option value="entregado" ${c.estado_opcion==='entregado'?'selected':''}>Entregado</option>
        </select>
      </div>
      <div style="margin-top:10px;background:white;border-radius:6px;padding:10px 12px;border:1px solid var(--gris-borde)">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gris-mid);margin-bottom:6px">Mensaje WhatsApp</div>
        <textarea id="wa-msg-${num}-${solicitudId}" rows="3" style="width:100%;font-size:12px;border:none;background:transparent;resize:none;outline:none">${escapeHtml(msgBase)}</textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:6px">
          <a id="wa-link-${num}-${solicitudId}" href="#" target="_blank"
            class="btn btn-success btn-sm" style="display:flex;align-items:center;gap:5px;text-decoration:none;opacity:.4;pointer-events:none">
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar por WhatsApp
          </a>
        </div>
      </div>
    </div>`;
  }

  const div = document.createElement('div');
  div.id = 'modal-cotizar';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:600px;max-height:90vh;overflow-y:auto">
      <div class="modal-header">
        <div class="modal-titulo">Cotizar — ${escapeHtml(repuesto)}</div>
        <button class="modal-close" onclick="document.getElementById('modal-cotizar').remove()">✕</button>
      </div>
      <div class="modal-body">
        ${placa ? `<div style="font-size:12px;color:var(--azul);font-family:'DM Mono',monospace;margin-bottom:14px;background:var(--gris-bg);padding:8px 12px;border-radius:6px">
          ${escapeHtml(placa)} · ${[marca,modelo,anio].filter(Boolean).map(escapeHtml).join(' ')}${vin?`<br>VIN: ${escapeHtml(vin)}`:''}
        </div>` : ''}
        ${renderOp(1)}${renderOp(2)}${renderOp(3)}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cotizar').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarCotizaciones(${solicitudId})">Guardar cotizaciones</button>
      </div>
    </div>`;
  document.body.appendChild(div);

  cots.forEach(c => {
    const sel = document.getElementById(`cot-prov-${c.opcion}-${solicitudId}`);
    if (sel) { sel.value = c.proveedor_id||''; actualizarWaLink(c.opcion, solicitudId); }
  });
}

function actualizarWaLink(num, solicitudId) {
  const sel  = document.getElementById(`cot-prov-${num}-${solicitudId}`);
  const link = document.getElementById(`wa-link-${num}-${solicitudId}`);
  const msg  = document.getElementById(`wa-msg-${num}-${solicitudId}`)?.value || '';
  if (!link || !sel) return;
  const waNum = sel.options[sel.selectedIndex]?.dataset?.wa || '';
  if (waNum) {
    link.href = `https://wa.me/${waNum.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
    link.style.opacity = '1';
    link.style.pointerEvents = 'auto';
  } else {
    link.style.opacity = '.4';
    link.style.pointerEvents = 'none';
  }
}

async function guardarCotizaciones(solicitudId) {
  try {
    for (let op=1; op<=3; op++) {
      const provId = document.getElementById(`cot-prov-${op}-${solicitudId}`)?.value||null;
      const precio = parseFloat(document.getElementById(`cot-precio-${op}-${solicitudId}`)?.value)||0;
      const estado = document.getElementById(`cot-estado-${op}-${solicitudId}`)?.value||'cotizado';
      if (!provId && !precio) continue;
      const ex = await api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&opcion=eq.${op}`).catch(()=>[]) || [];
      if (ex.length) {
        await api(`/cotizaciones_repuesto?id=eq.${ex[0].id}`,'PATCH',{proveedor_id:provId||null,precio_costo:precio,estado_opcion:estado});
      } else {
        await api('/cotizaciones_repuesto','POST',{solicitud_id:solicitudId,opcion:op,proveedor_id:provId||null,precio_costo:precio,estado_opcion:estado},{Prefer:'return=minimal'});
      }
    }
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`,'PATCH',{estado:'cotizado'});
    toast('Cotizaciones guardadas ✓');
    document.getElementById('modal-cotizar')?.remove();
    cargarSolicitudesRepuestos();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

// ─────────────────────────────────────────────────────────
// PROVEEDORES
// ─────────────────────────────────────────────────────────
async function cargarProveedores() {
  const cont = document.getElementById('rep-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando proveedores...</div>';

  try {
    const provs = await api('/proveedores?order=nombre.asc').catch(()=>[]) || [];

    // Poblar registry para evitar pasar JSON en onclick
    _provRegistry = {};
    provs.forEach(p => { _provRegistry[p.id] = p; });

    cont.innerHTML = `<div style="padding:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:16px;font-weight:700">Proveedores</div>
        <button class="btn btn-primary btn-sm" onclick="abrirModalProveedor()">+ Nuevo proveedor</button>
      </div>
      ${provs.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--gris-bg);border-bottom:1px solid var(--gris-borde)">
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Nombre</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Tipo</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Ciudad</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">WhatsApp</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Marcas</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${provs.map(p=>`<tr style="border-bottom:1px solid var(--gris-borde)">
            <td style="padding:10px 12px;font-weight:600">${escapeHtml(p.nombre)}</td>
            <td style="padding:10px 12px;color:var(--gris-mid)">${escapeHtml(p.tipo_proveedor||'—')}</td>
            <td style="padding:10px 12px">${escapeHtml(p.ciudad||'—')}</td>
            <td style="padding:10px 12px;font-family:'DM Mono',monospace">${escapeHtml(p.whatsapp||'—')}</td>
            <td style="padding:10px 12px;font-size:11px;color:var(--gris-mid)">
              ${p.multimarca?'<span style="background:var(--azul-light);color:var(--azul);padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600">Multimarca</span>':(p.marcas||[]).slice(0,3).map(escapeHtml).join(', ')||'—'}
            </td>
            <td style="padding:10px 12px">
              <button class="btn btn-ghost btn-sm" data-prov-id="${p.id}" onclick="_editarProveedorPorId(this)">Editar</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty-state"><p>Sin proveedores registrados</p></div>'}
    </div>`;
  } catch(e) { cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`; }
}

function abrirModalProveedor(prov) {
  const existing = document.getElementById('modal-proveedor');
  if (existing) existing.remove();
  const p = prov||{};
  const selMarcas = p.marcas||[];
  const esMulti   = p.multimarca||false;

  const marcasHtml = MARCAS_VEHICULOS.map(m=>`
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:2px 0">
      <input type="checkbox" name="prov-marca" value="${escapeHtml(m)}" ${selMarcas.includes(m)||esMulti?'checked':''}>
      ${escapeHtml(m)}
    </label>`).join('');

  const div = document.createElement('div');
  div.id = 'modal-proveedor';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:520px;max-height:90vh;overflow-y:auto">
      <div class="modal-header">
        <div class="modal-titulo">${p.id?'Editar proveedor':'Nuevo proveedor'}</div>
        <button class="modal-close" onclick="document.getElementById('modal-proveedor').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="field"><label>Nombre *</label><input id="prov-nombre" value="${escapeHtml(p.nombre||'')}"></div>
        <div class="field">
          <label>Tipo de proveedor</label>
          <select id="prov-tipo" style="width:100%">
            <option value="">— Seleccionar —</option>
            <option value="Concesionario" ${p.tipo_proveedor==='Concesionario'?'selected':''}>Concesionario</option>
            <option value="Importador"    ${p.tipo_proveedor==='Importador'   ?'selected':''}>Importador</option>
            <option value="Almacén"       ${p.tipo_proveedor==='Almacén'      ?'selected':''}>Almacén</option>
          </select>
        </div>
        <div class="field"><label>Ciudad</label><input id="prov-ciudad" value="${escapeHtml(p.ciudad||'')}" placeholder="Bogotá, Medellín..."></div>
        <div class="field"><label>WhatsApp</label><input id="prov-whatsapp" value="${escapeHtml(p.whatsapp||'')}" type="tel" placeholder="3001234567"></div>
        <div class="field">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <label style="margin:0">Marcas que maneja</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:600;color:var(--azul)">
              <input type="checkbox" id="prov-multimarca" ${esMulti?'checked':''} onchange="toggleMultimarca(this.checked)">
              Multimarca (todas)
            </label>
          </div>
          <div id="prov-marcas-wrap" style="max-height:200px;overflow-y:auto;border:1px solid var(--gris-borde);border-radius:8px;padding:10px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;${esMulti?'opacity:.4;pointer-events:none':''}">
            ${marcasHtml}
          </div>
        </div>
        ${p.id ? `<div class="field"><label>Estado</label>
          <select id="prov-activo" style="width:100%">
            <option value="true"  ${p.activo!==false?'selected':''}>Activo</option>
            <option value="false" ${p.activo===false?'selected':''}>Inactivo</option>
          </select></div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-proveedor').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarProveedor(${p.id||'null'})">Guardar</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

function toggleMultimarca(checked) {
  const wrap = document.getElementById('prov-marcas-wrap');
  if (!wrap) return;
  wrap.style.opacity = checked ? '.4' : '1';
  wrap.style.pointerEvents = checked ? 'none' : 'auto';
  if (checked) wrap.querySelectorAll('input[type=checkbox]').forEach(cb=>{ cb.checked=true; });
}

async function guardarProveedor(id) {
  const nombre = document.getElementById('prov-nombre')?.value.trim();
  if (!nombre) { toast('El nombre es obligatorio','err'); return; }
  const esMulti  = document.getElementById('prov-multimarca')?.checked||false;
  const marcas   = esMulti ? MARCAS_VEHICULOS
    : [...document.querySelectorAll('#modal-proveedor input[name="prov-marca"]:checked')].map(cb=>cb.value);

  const body = {
    nombre,
    tipo_proveedor: document.getElementById('prov-tipo')?.value||null,
    ciudad:         document.getElementById('prov-ciudad')?.value.trim()||null,
    whatsapp:       document.getElementById('prov-whatsapp')?.value.trim()||null,
    multimarca:     esMulti,
    marcas,
    activo:         id ? (document.getElementById('prov-activo')?.value==='true') : true
  };

  try {
    if (id) await api(`/proveedores?id=eq.${id}`,'PATCH',body);
    else     await api('/proveedores','POST',body,{Prefer:'return=minimal'});
    toast('Proveedor guardado ✓');
    document.getElementById('modal-proveedor')?.remove();
    cargarProveedores();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

// ─────────────────────────────────────────────────────────
// VISTA CLIENTE
// ─────────────────────────────────────────────────────────
async function cargarRepuestosCliente(ordenId) {
  const cont = document.getElementById('cliente-repuestos-contenido');
  if (!cont) return;
  try {
    const sols = await api(`/solicitudes_repuesto?orden_id=eq.${ordenId}&estado=in.(cotizado,pedido,entregado)&select=*`).catch(()=>[]) || [];
    if (!sols.length) { cont.innerHTML=''; return; }
    const fmt = n => n!=null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
    const items = await Promise.all(sols.map(async s => {
      const cots = await api(`/cotizaciones_repuesto?solicitud_id=eq.${s.id}&order=opcion.asc&select=*,proveedores(nombre)`).catch(()=>[]) || [];
      const conPrecio = cots.filter(c=>c.precio_venta_jefe);
      if (!conPrecio.length) return '';
      return `<div style="margin-bottom:14px;padding:14px;background:var(--gris-bg);border-radius:8px;border:1px solid var(--gris-borde)">
        <div style="font-weight:700;margin-bottom:8px">${escapeHtml(s.repuesto)} · ${escapeHtml(String(s.unidades))} und</div>
        ${conPrecio.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:white;border-radius:6px;border:1px solid var(--gris-borde);margin-bottom:5px">
          <div><div style="font-size:13px;font-weight:600">Opción ${c.opcion}</div><div style="font-size:11px;color:var(--gris-mid)">${escapeHtml(c.proveedores?.nombre||'—')}</div></div>
          <div style="font-size:15px;font-weight:700;color:var(--verde);font-family:'DM Mono',monospace">${fmt(c.precio_venta_jefe)}</div>
        </div>`).join('')}
        <div style="font-size:11px;color:var(--gris-mid);margin-top:6px">Consulta con el taller para confirmar tu opción.</div>
      </div>`;
    }));
    const html = items.filter(Boolean).join('');
    if (html) cont.innerHTML = `<div style="margin-top:16px;border-top:1px solid var(--gris-borde);padding-top:16px"><div class="seccion-titulo">Repuestos disponibles</div>${html}</div>`;
  } catch(e) { cont.innerHTML=''; }
}
