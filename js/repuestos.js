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
// SOLICITAR REPUESTO — formulario multi-ítem
// ─────────────────────────────────────────────────────────
let _solItems = [{ idx: 0, fotoUrl: null }];

function _renderSolItem(item) {
  const isFirst = _solItems[0].idx === item.idx;
  return `<div id="si-row-${item.idx}" style="background:var(--gris-bg);border:1px solid var(--gris-borde);border-radius:10px;padding:14px;margin-bottom:10px;position:relative">
    ${!isFirst ? `<button type="button" style="position:absolute;top:10px;right:10px;background:none;border:none;cursor:pointer;color:var(--gris-mid);font-size:16px;line-height:1;padding:2px 6px" onclick="_quitarSolItem(${item.idx})">✕</button>` : ''}
    <div style="display:grid;grid-template-columns:1fr 80px;gap:10px;margin-bottom:10px">
      <div class="field">
        <label>Repuesto / pieza *</label>
        <input id="si-rep-${item.idx}" type="text" placeholder="Ej: Disco de freno delantero izq.">
      </div>
      <div class="field">
        <label>Cantidad</label>
        <input id="si-cant-${item.idx}" type="number" min="1" value="1">
      </div>
    </div>
    <div class="field" style="margin-bottom:10px">
      <label>Observaciones <span style="color:var(--gris-mid);font-weight:400">(opcional)</span></label>
      <input id="si-obs-${item.idx}" type="text" placeholder="Referencia, marca, urgencia...">
    </div>
    <div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gris-mid);margin-bottom:6px">Foto del repuesto a cambiar</div>
      <div id="si-foto-wrap-${item.idx}">
        ${item.fotoUrl
          ? `<div style="position:relative;display:inline-block">
               <img src="${escapeHtml(item.fotoUrl)}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--gris-borde)">
               <button type="button" style="position:absolute;top:-6px;right:-6px;background:#DC2626;color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0" onclick="_quitarFotoSolItem(${item.idx})">✕</button>
             </div>`
          : `<label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px dashed var(--gris-borde);border-radius:8px;cursor:pointer;font-size:12px;color:var(--gris-mid)">
               <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
               Subir foto
               <input type="file" accept="image/*" style="display:none" onchange="_subirFotoSolItem(this,${item.idx})">
             </label>`
        }
      </div>
      <div id="si-foto-prog-${item.idx}" style="font-size:11px;color:var(--gris-mid);margin-top:4px"></div>
    </div>
  </div>`;
}

function _agregarSolItem() {
  const idx = Date.now();
  _solItems.push({ idx, fotoUrl: null });
  const cont = document.getElementById('sol-items-cont');
  if (cont) cont.innerHTML = _solItems.map(i => _renderSolItem(i)).join('');
  setTimeout(() => document.getElementById(`si-rep-${idx}`)?.focus(), 60);
}

function _quitarSolItem(idx) {
  _solItems = _solItems.filter(i => i.idx !== idx);
  const cont = document.getElementById('sol-items-cont');
  if (cont) cont.innerHTML = _solItems.map(i => _renderSolItem(i)).join('');
}

async function _subirFotoSolItem(input, idx) {
  const file = input.files[0];
  if (!file) return;
  const prog = document.getElementById(`si-foto-prog-${idx}`);
  if (prog) prog.textContent = 'Subiendo...';
  try {
    const ext = file.name.split('.').pop();
    const path = `solicitudes/items/${Date.now()}_${idx}.${ext}`;
    const url = await storageUpload(file, path);
    const item = _solItems.find(i => i.idx === idx);
    if (item) item.fotoUrl = url;
    const cont = document.getElementById('sol-items-cont');
    if (cont) cont.innerHTML = _solItems.map(i => _renderSolItem(i)).join('');
  } catch(e) {
    if (prog) prog.textContent = 'Error al subir';
    toast('Error al subir foto', 'err');
  }
}

function _quitarFotoSolItem(idx) {
  const item = _solItems.find(i => i.idx === idx);
  if (item) item.fotoUrl = null;
  const cont = document.getElementById('sol-items-cont');
  if (cont) cont.innerHTML = _solItems.map(i => _renderSolItem(i)).join('');
}

// Punto de entrada unificado (compatible con llamadas antiguas)
async function abrirModalSolicitudRepuesto(ordenId, etapaId, placa) {
  _solItems = [{ idx: 0, fotoUrl: null }];
  const existing = document.getElementById('modal-sol-multi');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'modal-sol-multi';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:500px;max-height:90vh;overflow-y:auto">
      <div class="modal-header">
        <div class="modal-titulo">Solicitar repuesto — ${escapeHtml(placa)}</div>
        <button class="modal-close" onclick="document.getElementById('modal-sol-multi').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size:12px;color:#92400E;margin-bottom:14px;padding:8px 12px;background:#FEF3C7;border-radius:6px;border:1px solid #FDE68A">
          ⏸ La etapa se pausará hasta que el jefe entregue los repuestos.
        </div>
        <div id="sol-items-cont">${_solItems.map(i => _renderSolItem(i)).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="_agregarSolItem()" style="width:100%;margin-top:2px;margin-bottom:4px">
          + Agregar otro repuesto
        </button>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-sol-multi').remove()">Cancelar</button>
        <button class="btn btn-primary" id="sol-multi-submit"
          data-oid="${ordenId}" data-eid="${etapaId||''}"
          onclick="enviarSolicitudRepuesto(+this.dataset.oid,this.dataset.eid?+this.dataset.eid:null)">
          Enviar solicitud
        </button>
      </div>
    </div>`;
  document.body.appendChild(div);
  setTimeout(() => document.getElementById('si-rep-0')?.focus(), 80);
}

async function enviarSolicitudRepuesto(ordenId, etapaId) {
  const items = _solItems.map(item => ({
    repuesto:      (document.getElementById(`si-rep-${item.idx}`)?.value || '').trim(),
    unidades:      parseFloat(document.getElementById(`si-cant-${item.idx}`)?.value) || 1,
    observaciones: (document.getElementById(`si-obs-${item.idx}`)?.value || '').trim() || null,
    foto_url:      item.fotoUrl || null
  }));

  if (items.some(i => !i.repuesto)) {
    toast('Completa el nombre de cada repuesto', 'err');
    return;
  }

  const btn = document.getElementById('sol-multi-submit');
  if (btn) btn.disabled = true;

  try {
    const orden = await api(`/ordenes?id=eq.${ordenId}&select=placa,marca,linea,modelo,vin`).then(r=>r?.[0]).catch(()=>null);

    // Crear cabecera de la solicitud (primer ítem en campos legacy para compatibilidad)
    const solicitudRes = await api('/solicitudes_repuesto', 'POST', {
      orden_id:           ordenId,
      etapa_id:           etapaId || null,
      solicitado_por:     sesion.nombre,
      perfil_solicitante: sesion.perfil,
      repuesto:           items[0].repuesto,
      unidades:           items[0].unidades,
      observaciones:      items[0].observaciones,
      estado:             'pendiente_jefe'
    }, { Prefer: 'return=representation' });

    const solicitudId = solicitudRes?.[0]?.id;

    // Crear los ítems en solicitud_items (todos)
    if (solicitudId) {
      for (const item of items) {
        await api('/solicitud_items', 'POST', {
          solicitud_id:  solicitudId,
          repuesto:      item.repuesto,
          unidades:      item.unidades,
          observaciones: item.observaciones,
          foto_url:      item.foto_url
        }, { Prefer: 'return=minimal' }).catch(() => {});
      }
    }

    // Pausar etapa activa
    if (etapaId) {
      await api(`/etapas?id=eq.${etapaId}`, 'PATCH', {
        pausado: true, pausa_inicio: new Date().toISOString()
      }).catch(() => {});
    } else {
      // Sin etapa específica: buscar etapas activas de este mecánico en esta orden y pausarlas
      const activas = await api(`/etapas?orden_id=eq.${ordenId}&fin=is.null&pausado=eq.false&inicio=not.is.null&select=id`).catch(()=>[]) || [];
      for (const e of activas) {
        await api(`/etapas?id=eq.${e.id}`, 'PATCH', {
          pausado: true, pausa_inicio: new Date().toISOString()
        }).catch(() => {});
      }
    }

    // Notificación N8N
    const resumen = items.map(i => `${i.repuesto} (x${i.unidades})`).join(', ');
    fetch(N8N_REPUESTO, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento: 'repuesto_solicitado', solicitado_por: sesion.nombre,
        repuesto: resumen, placa: orden?.placa || '',
        marca: orden?.marca || '', modelo: orden?.linea || '',
        vin: orden?.vin || '', orden_id: ordenId
      })
    }).catch(() => {});

    document.getElementById('modal-sol-multi')?.remove();
    toast(`${items.length > 1 ? items.length + ' repuestos solicitados' : 'Solicitud enviada'} ✓ — ⏸ Etapa pausada`);

    if (typeof actualizarBadgeRepuestos === 'function') actualizarBadgeRepuestos();
    if (typeof cargarEtapasMecanico === 'function') cargarEtapasMecanico();
    if (typeof cargarRepuestosJefe === 'function' && typeof esJefe === 'function' && esJefe()) cargarRepuestosJefe();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
    if (btn) btn.disabled = false;
  }
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
      pendiente_jefe:    {txt:'Pendiente revisión', cls:'badge-pendiente'},
      enviado_repuestos: {txt:'En repuestos',       cls:'badge-iniciada'},
      cotizado:          {txt:'Cotizado',            cls:'badge-cotizada'},
      pedido:            {txt:'Pedido',              cls:'badge-iniciada'},
      recibido_taller:   {txt:'Llegó al taller',    cls:'badge-completada'},
      entregado:         {txt:'Entregado al técnico',cls:'badge-completada'},
      rechazado:         {txt:'Rechazado',           cls:'badge-pendiente'}
    };

    const barraHtml = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:16px;font-weight:700">Solicitudes de repuestos</div>
      <select id="rep-filtro-estado" onchange="cargarRepuestosJefe()" style="font-size:12px;padding:6px 10px;border-radius:6px;border:1px solid var(--gris-borde)">
        <option value="">Todos los estados</option>
        <option value="pendiente_jefe">Pendiente revisión</option>
        <option value="enviado_repuestos">En repuestos</option>
        <option value="cotizado">Cotizado</option>
        <option value="pedido">Pedido</option>
        <option value="recibido_taller">Llegó al taller</option>
        <option value="entregado">Entregado al técnico</option>
        <option value="rechazado">Rechazado</option>
      </select>
    </div>`;

    // Cargar ítems de todas las solicitudes en un solo query
    const solIds = solicitudes.map(s => s.id);
    const todosItems = solIds.length
      ? await api(`/solicitud_items?solicitud_id=in.(${solIds.join(',')})&order=creado_en.asc`).catch(()=>[]) || []
      : [];

    if (!solicitudes.length) {
      cont.innerHTML = `<div style="padding:20px">${barraHtml}<div class="empty-state"><p>Sin solicitudes</p></div></div>`;
      return;
    }

    cont.innerHTML = `<div style="padding:20px">${barraHtml}
      <div style="display:flex;flex-direction:column;gap:10px">
        ${solicitudes.map(s => {
          const o   = om[s.orden_id]||{};
          const est = estMap[s.estado]||{txt:s.estado,cls:''};
          const items = todosItems.filter(i => i.solicitud_id === s.id);

          // Timer del proveedor
          let timerProv = '';
          if (s.pedido_en && (s.estado === 'pedido' || s.estado === 'recibido_taller' || s.estado === 'entregado')) {
            const finTs = s.recibido_en ? new Date(s.recibido_en) : new Date();
            const mins  = Math.round((finTs - new Date(s.pedido_en)) / 60000);
            const h = Math.floor(mins/60), m = mins%60;
            const label = s.recibido_en ? 'Proveedor tardó' : 'Esperando proveedor';
            timerProv = `<div style="font-size:11px;color:${s.recibido_en?'#059669':'#D97706'};margin-top:3px;font-weight:600">⏱ ${label}: ${h>0?h+'h ':''}${m}m</div>`;
          }

          // Lista de ítems con fotos
          const itemsHtml = items.length > 0
            ? `<div style="margin:8px 0 10px;display:flex;flex-direction:column;gap:5px">
                ${items.map(i => `<div style="display:flex;align-items:center;gap:8px">
                  ${i.foto_url ? `<img src="${escapeHtml(i.foto_url)}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer" onclick="abrirLightbox('${escapeHtml(i.foto_url)}')">` : ''}
                  <div>
                    <span style="font-weight:600;font-size:13px">${escapeHtml(i.repuesto)}</span>
                    <span style="font-size:12px;color:var(--gris-mid);margin-left:6px">x${i.unidades||1}</span>
                    ${i.observaciones ? `<div style="font-size:11px;color:var(--gris-mid);font-style:italic">${escapeHtml(i.observaciones)}</div>` : ''}
                  </div>
                </div>`).join('')}
              </div>`
            : `<div style="font-size:13px;color:var(--gris-mid);margin-bottom:8px">${escapeHtml(s.repuesto)} · x${s.unidades||1}${s.observaciones?` · ${escapeHtml(s.observaciones)}`:''}</div>`;

          return `<div class="card" style="padding:16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px">
              <div>
                <div style="font-weight:700;font-size:15px;margin-bottom:2px">
                  ${items.length > 1 ? `${items.length} repuestos solicitados` : escapeHtml(s.repuesto)}
                </div>
                <div style="font-size:12px;color:var(--gris-mid)">${escapeHtml(s.solicitado_por)} · ${formatTS(s.creado_en)}</div>
                ${o.placa ? `<div style="font-size:12px;color:var(--azul);margin-top:2px;font-family:'DM Mono',monospace">
                  ${escapeHtml(o.placa)} · OT-${String(s.orden_id).padStart(4,'0')}
                  ${o.vin ? `· <span style="color:var(--gris-mid)">VIN: ${escapeHtml(o.vin)}</span>` : ''}
                </div>` : ''}
                ${timerProv}
              </div>
              <span class="badge ${est.cls}">${est.txt}</span>
            </div>
            ${itemsHtml}
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
              <div style="background:#EBF2FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#1E40AF;font-weight:600">
                💰 Hay cotizaciones listas. Define el precio de venta para ordenar el repuesto.
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" onclick="abrirModalPrecioVenta(${s.id})">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Definir precio y ordenar
                </button>
              </div>` : ''}
            ${s.estado==='pedido' ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <span style="font-size:12px;color:var(--gris-mid);font-style:italic">⏳ Esperando llegada del proveedor...</span>
                <button class="btn btn-success btn-sm" onclick="jefeConfirmarLlegada(${s.id})">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Llegó al taller
                </button>
              </div>` : ''}
            ${s.estado==='recibido_taller' ? `
              <div style="background:#E6F5EF;border:1px solid #A7F3D0;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#065F46;font-weight:600">
                📦 El repuesto está en el taller. Entrégalo al técnico para reanudar su trabajo.
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${s.etapa_id ? `<button class="btn btn-success btn-sm" onclick="jefeConfirmarEntrega(${s.id},${s.etapa_id})">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Entregar al técnico → Reanudar timer
                </button>` : `<button class="btn btn-success btn-sm" onclick="jefeConfirmarEntrega(${s.id},null)">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Marcar como entregado
                </button>`}
              </div>` : ''}
            ${s.estado==='enviado_repuestos' ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <span style="font-size:12px;color:var(--gris-mid);font-style:italic">⏳ Esperando cotización de repuestos...</span>
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

// Jefe confirma que el repuesto llegó al taller (paso 1 de 2)
async function jefeConfirmarLlegada(solicitudId) {
  try {
    const ahora = new Date().toISOString();
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', {
      estado: 'recibido_taller',
      recibido_en: ahora,
      nota_jefe: 'El repuesto llegó al taller. Pendiente de entrega al técnico.'
    });

    // Notificar al técnico por Telegram
    const sol = await api(`/solicitudes_repuesto?id=eq.${solicitudId}&select=*`).then(r=>r?.[0]).catch(()=>null);
    if (sol?.etapa_id) {
      const etapa = await api(`/etapas?id=eq.${sol.etapa_id}&select=mecanico_id,tecnico`).then(r=>r?.[0]).catch(()=>null);
      const mec   = etapa?.mecanico_id ? await api(`/mecanicos?id=eq.${etapa.mecanico_id}&select=nombre,telegram_chat_id`).then(r=>r?.[0]).catch(()=>null) : null;
      const orden = sol.orden_id ? await api(`/ordenes?id=eq.${sol.orden_id}&select=placa`).then(r=>r?.[0]).catch(()=>null) : null;
      if (mec?.telegram_chat_id) {
        fetch(N8N_REPUESTO, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evento: 'repuesto_llegado_taller',
            telegram_chat_id: mec.telegram_chat_id,
            tecnico: mec.nombre || etapa?.tecnico || '',
            repuesto: sol.repuesto,
            placa: orden?.placa || '',
            ot: `OT-${String(sol.orden_id).padStart(4,'0')}`
          })
        }).catch(()=>{});
      }
    }

    toast('✓ Repuesto en taller — entrega al técnico para reanudar su timer');
    cargarRepuestosJefe();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// Jefe entrega el repuesto al técnico y reanuda su timer (paso 2 de 2)
async function jefeConfirmarEntrega(solicitudId, etapaId) {
  try {
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', {
      estado: 'entregado',
      nota_jefe: '✅ Repuesto entregado — puedes continuar con tu trabajo.'
    });
    if (etapaId) {
      await _reanudarEtapa(etapaId, solicitudId);
      toast('Repuesto entregado al técnico ✓ — ▶ Timer reanudado');
    } else {
      toast('Repuesto entregado ✓');
    }
    cargarRepuestosJefe();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function abrirModalPrecioVenta(solicitudId) {
  const [cots, sol] = await Promise.all([
    api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&order=opcion.asc&select=*,proveedores(nombre,whatsapp)`).catch(() => []) || [],
    api(`/solicitudes_repuesto?id=eq.${solicitudId}`).then(r => r?.[0]).catch(() => null)
  ]);
  document.getElementById('modal-precio-venta')?.remove();

  const fmt = n => n != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n) : '—';
  const opLbl = { 1: 'Opción 1 — Precio alto', 2: 'Opción 2 — Precio medio', 3: 'Opción 3 — Precio bajo' };

  // Guardar globalmente para que devolverRepuestoATecnico las use
  window._pvCots = cots;
  window._pvSol  = sol;

  // Pre-seleccionar la que ya tenga precio_venta_jefe, o la primera
  const presel = cots.find(c => c.precio_venta_jefe) || cots[0];
  window._pvSeleccionada = presel?.id || null;

  const div = document.createElement('div');
  div.id = 'modal-precio-venta';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:580px">
      <div class="modal-header">
        <div class="modal-titulo">Precio venta — ${escapeHtml(sol?.repuesto || '')}</div>
        <button class="modal-close" onclick="document.getElementById('modal-precio-venta').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--gris-mid);margin-bottom:16px">
          Selecciona la opción que le presentarás al cliente. El precio sugerido es costo del taller + 40%.
        </p>
        ${cots.length ? cots.map(c => {
          const sug = c.precio_costo ? Math.round(c.precio_costo * 1.4) : null;
          const seleccionado = c.id === window._pvSeleccionada;
          return `
          <div id="pv-card-${c.id}"
            onclick="_pvSeleccionar(${c.id}, [${cots.map(x => x.id).join(',')}])"
            style="
              border-radius:10px;padding:14px 16px;margin-bottom:10px;cursor:pointer;
              transition:border-color .15s, background .15s;
              border:2px solid ${seleccionado ? 'var(--azul)' : 'var(--gris-borde)'};
              background:${seleccionado ? 'var(--azul-bg,#EBF2FF)' : 'var(--gris-bg)'};
            ">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div id="pv-radio-${c.id}" style="
                width:18px;height:18px;border-radius:50%;flex-shrink:0;
                border:2px solid ${seleccionado ? 'var(--azul)' : 'var(--gris-mid)'};
                background:${seleccionado ? 'var(--azul)' : 'transparent'};
                display:flex;align-items:center;justify-content:center;
              ">${seleccionado ? '<div style="width:7px;height:7px;border-radius:50%;background:#fff"></div>' : ''}</div>
              <div style="font-weight:700;font-size:13px;color:${seleccionado ? 'var(--azul)' : 'var(--texto)'}">
                ${opLbl[c.opcion] || 'Opción ' + c.opcion}
              </div>
            </div>
            <div style="font-size:12px;color:var(--gris-mid);margin-bottom:10px;padding-left:28px">
              Proveedor: <strong>${escapeHtml(c.proveedores?.nombre || '—')}</strong> &nbsp;·&nbsp;
              Costo taller: <strong>${fmt(c.precio_costo)}</strong>
              ${sug ? `&nbsp;·&nbsp;<span style="color:var(--verde);font-weight:600">Sugerido +40%: ${fmt(sug)}</span>` : ''}
            </div>
            <div style="padding-left:28px" onclick="event.stopPropagation()">
              <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gris-mid);display:block;margin-bottom:5px">
                Precio venta al cliente (COP)
              </label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="number" id="pv-${c.id}"
                  value="${c.precio_venta_jefe || (sug || '')}"
                  placeholder="0" min="0"
                  style="font-family:'DM Mono',monospace;flex:1;padding:9px 12px;border:1px solid var(--gris-borde);border-radius:7px;font-size:14px">
                ${sug ? `<button type="button" class="btn btn-ghost btn-sm"
                  onclick="document.getElementById('pv-${c.id}').value='${sug}'"
                  style="white-space:nowrap;font-size:11px">Usar sugerido</button>` : ''}
              </div>
            </div>
          </div>`;
        }).join('') : '<p style="color:var(--gris-mid)">Sin cotizaciones aún.</p>'}

        <!-- Devolver al técnico -->
        <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--gris-borde)">
          <div style="font-size:12px;font-weight:700;color:var(--rojo);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">
            ¿Ninguna opción funciona?
          </div>
          <div style="display:flex;gap:8px;align-items:flex-start">
            <input id="pv-nota-devolucion" type="text" placeholder="Motivo para el técnico (opcional)"
              style="flex:1;padding:9px 12px;border:1px solid var(--gris-borde);border-radius:7px;font-size:13px">
            <button class="btn btn-sm" onclick="devolverRepuestoATecnico(${solicitudId})"
              style="background:var(--rojo-bg,#FEE2E2);color:var(--rojo,#DC2626);border:1px solid var(--rojo,#DC2626);white-space:nowrap;flex-shrink:0">
              ↩ Devolver al técnico
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-precio-venta').remove()">Cancelar</button>
        ${cots.length ? `<button class="btn btn-primary" onclick="guardarPrecioVentaSeleccionado(${solicitudId})">
          Guardar y notificar cliente
        </button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(div);
}

function _pvSeleccionar(cotId, todosIds) {
  window._pvSeleccionada = cotId;
  todosIds.forEach(id => {
    const card  = document.getElementById(`pv-card-${id}`);
    const radio = document.getElementById(`pv-radio-${id}`);
    const lbl   = card?.querySelector('div[style*="font-weight:700;font-size:13px"]');
    const sel   = id === cotId;
    if (card) {
      card.style.borderColor = sel ? 'var(--azul)' : 'var(--gris-borde)';
      card.style.background  = sel ? 'var(--azul-bg,#EBF2FF)' : 'var(--gris-bg)';
    }
    if (radio) {
      radio.style.borderColor = sel ? 'var(--azul)' : 'var(--gris-mid)';
      radio.style.background  = sel ? 'var(--azul)' : 'transparent';
      radio.innerHTML = sel ? '<div style="width:7px;height:7px;border-radius:50%;background:#fff"></div>' : '';
    }
    if (lbl) lbl.style.color = sel ? 'var(--azul)' : 'var(--texto)';
  });
}

async function guardarPrecioVentaSeleccionado(solicitudId) {
  const cotId = window._pvSeleccionada;
  if (!cotId) { toast('Selecciona una opción primero', 'err'); return; }
  const val = parseFloat(document.getElementById(`pv-${cotId}`)?.value) || 0;
  if (!val) { toast('Ingresa el precio de venta', 'err'); document.getElementById(`pv-${cotId}`)?.focus(); return; }

  const cots   = window._pvCots || [];
  const cot    = cots.find(c => c.id === cotId);
  const opLbl  = { 1: 'Opción 1 — Precio alto', 2: 'Opción 2 — Precio medio', 3: 'Opción 3 — Precio bajo' };
  const fmt    = n => n != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n) : '—';
  const sol    = window._pvSol;

  // Nota visible para el técnico
  const notaTecnico = [
    `✓ Repuesto aprobado: ${sol?.repuesto || ''}`,
    cot ? `Opción elegida: ${opLbl[cot.opcion] || 'Opción ' + cot.opcion}` : '',
    cot?.proveedores?.nombre ? `Proveedor: ${cot.proveedores.nombre}` : '',
    `Precio de venta al cliente: ${fmt(val)}`
  ].filter(Boolean).join(' — ');

  try {
    await api(`/cotizaciones_repuesto?id=eq.${cotId}`, 'PATCH', { precio_venta_jefe: val });
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', {
      estado: 'pedido',
      nota_jefe: notaTecnico,
      pedido_en: new Date().toISOString()
    });
    toast('Precio definido ✓ — ahora espera que llegue el repuesto');
    document.getElementById('modal-precio-venta')?.remove();
    cargarRepuestosJefe();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function devolverRepuestoATecnico(solicitudId) {
  const motivoExtra = document.getElementById('pv-nota-devolucion')?.value.trim();
  const cots = window._pvCots || [];
  const fmt  = n => n != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n) : '—';
  const opLbl = { 1: 'Opción 1', 2: 'Opción 2', 3: 'Opción 3' };

  // Construir resumen de opciones con precios sugeridos
  let resumenOpciones = '';
  if (cots.length) {
    resumenOpciones = cots.map(c => {
      const sug = c.precio_costo ? Math.round(c.precio_costo * 1.4) : null;
      return `${opLbl[c.opcion] || 'Opción ' + c.opcion}: costo ${fmt(c.precio_costo)}${sug ? ' → sugerido ' + fmt(sug) : ''}`;
    }).join(' | ');
  }

  const nota = [
    motivoExtra || 'Repuesto devuelto para revisión.',
    resumenOpciones ? `Opciones cotizadas: ${resumenOpciones}` : ''
  ].filter(Boolean).join(' — ');

  try {
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', {
      estado: 'rechazado',
      nota_jefe: nota
    });
    toast('Solicitud devuelta al técnico ✓');
    document.getElementById('modal-precio-venta')?.remove();
    cargarRepuestosJefe();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
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
    const sols = await api('/solicitudes_repuesto?estado=in.(enviado_repuestos,cotizado,pedido,recibido_taller,entregado)&order=creado_en.desc&select=*').catch(()=>[]) || [];
    const oids = [...new Set(sols.map(s=>s.orden_id).filter(Boolean))];
    const ords = oids.length ? await api(`/ordenes?id=in.(${oids.join(',')})&select=id,placa,marca,linea,modelo,vin`).catch(()=>[]) || [] : [];
    const om = {}; ords.forEach(o=>{ om[o.id]=o; });

    // Cargar ítems de solicitud_items para todas las solicitudes
    const solIds = sols.map(s => s.id);
    const todosItems = solIds.length
      ? await api(`/solicitud_items?solicitud_id=in.(${solIds.join(',')})&order=creado_en.asc`).catch(()=>[]) || []
      : [];

    _solRegistry = {};
    sols.forEach(s => {
      const o = om[s.orden_id] || {};
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

    const fmt = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
    const estadoBadge = {
      enviado_repuestos: { cls:'badge-iniciada',   txt:'Por cotizar' },
      cotizado:          { cls:'badge-cotizada',   txt:'Cotizado' },
      pedido:            { cls:'badge-iniciada',   txt:'Pedido al proveedor' },
      recibido_taller:   { cls:'badge-completada', txt:'Llegó al taller' },
      entregado:         { cls:'badge-completada', txt:'Entregado' }
    };

    cont.innerHTML = `<div style="padding:20px">
      <div style="font-size:16px;font-weight:700;margin-bottom:16px">Solicitudes de repuestos</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${sols.map(s => {
          const o = om[s.orden_id] || {};
          const items = todosItems.filter(i => i.solicitud_id === s.id);
          const eb = estadoBadge[s.estado] || { cls:'', txt: s.estado };

          // Timer del proveedor (desde pedido_en hasta ahora o recibido_en)
          let timerProv = '';
          if (s.pedido_en) {
            const finTs = s.recibido_en ? new Date(s.recibido_en) : new Date();
            const mins  = Math.round((finTs - new Date(s.pedido_en)) / 60000);
            const h = Math.floor(mins/60), m = mins%60;
            const label = s.recibido_en ? 'Tardó' : 'Esperando';
            timerProv = `<div style="font-size:11px;color:${s.recibido_en?'#059669':'#D97706'};margin-top:4px;font-weight:600">
              ⏱ ${label}: ${h > 0 ? h+'h ' : ''}${m}m
            </div>`;
          }

          // Lista de ítems
          const itemsHtml = items.length > 0
            ? `<div style="margin:8px 0;display:flex;flex-direction:column;gap:4px">
                ${items.map(i => `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
                  ${i.foto_url ? `<img src="${escapeHtml(i.foto_url)}" style="width:28px;height:28px;object-fit:cover;border-radius:3px;flex-shrink:0">` : ''}
                  <span style="font-weight:600">${escapeHtml(i.repuesto)}</span>
                  <span style="color:var(--gris-mid)">x${i.unidades||1}</span>
                  ${i.observaciones ? `<span style="color:var(--gris-mid);font-style:italic">${escapeHtml(i.observaciones)}</span>` : ''}
                </div>`).join('')}
              </div>`
            : `<div style="font-size:13px;color:var(--gris-mid);margin-bottom:4px">${escapeHtml(s.repuesto)} · x${s.unidades||1}</div>`;

          return `<div class="card" style="padding:16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:14px;margin-bottom:2px">${items.length > 1 ? `${items.length} repuestos` : escapeHtml(s.repuesto)}</div>
                <div style="font-size:12px;color:var(--azul);font-family:'DM Mono',monospace">
                  ${escapeHtml(o.placa||'—')} · OT-${String(s.orden_id).padStart(4,'0')}
                </div>
                <div style="font-size:11px;color:var(--gris-mid);margin-top:2px">${escapeHtml(s.solicitado_por||'')} · ${formatTS(s.creado_en)}</div>
                ${timerProv}
              </div>
              <span class="badge ${eb.cls}">${eb.txt}</span>
            </div>
            ${itemsHtml}
            ${s.nota_jefe ? `<div style="font-size:12px;background:var(--gris-bg);padding:6px 10px;border-radius:6px;border-left:3px solid var(--azul);margin-top:6px">${escapeHtml(s.nota_jefe)}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              ${s.estado === 'enviado_repuestos' || s.estado === 'cotizado'
                ? `<button class="btn btn-primary btn-sm" data-sol-id="${s.id}" onclick="_abrirCotizarPorId(this)">
                    ${s.estado==='enviado_repuestos' ? '+ Cotizar' : 'Ver / editar cotizaciones'}
                  </button>`
                : ''}
              ${s.estado === 'pedido'
                ? `<button class="btn btn-success btn-sm" onclick="marcarRepuestoSolicitadoProveedor(${s.id})"
                    style="display:flex;align-items:center;gap:5px">
                    <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    Confirmar pedido al proveedor
                  </button>`
                : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    iniciarPollingRepuestos(() => {
      if (document.getElementById('rep-contenido')) cargarSolicitudesRepuestos();
      else detenerPollingRepuestos();
    });
  } catch(e) { cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`; }
}

// Repuestos confirma que ya se hizo el pedido al proveedor elegido
async function marcarRepuestoSolicitadoProveedor(solicitudId) {
  try {
    // Obtener datos para Telegram
    const sol   = await api(`/solicitudes_repuesto?id=eq.${solicitudId}&select=*`).then(r=>r?.[0]).catch(()=>null);
    const orden = sol?.orden_id ? await api(`/ordenes?id=eq.${sol.orden_id}&select=placa`).then(r=>r?.[0]).catch(()=>null) : null;
    let mecTelegram = null, mecNombre = '';
    if (sol?.etapa_id) {
      const etapa = await api(`/etapas?id=eq.${sol.etapa_id}&select=mecanico_id,tecnico`).then(r=>r?.[0]).catch(()=>null);
      if (etapa?.mecanico_id) {
        const mec = await api(`/mecanicos?id=eq.${etapa.mecanico_id}&select=nombre,telegram_chat_id`).then(r=>r?.[0]).catch(()=>null);
        mecTelegram = mec?.telegram_chat_id || null;
        mecNombre   = mec?.nombre || etapa?.tecnico || '';
      }
    }

    if (mecTelegram) {
      fetch(N8N_REPUESTO, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento: 'repuesto_pedido_proveedor',
          telegram_chat_id: mecTelegram,
          tecnico: mecNombre,
          repuesto: sol?.repuesto || '',
          placa: orden?.placa || '',
          ot: `OT-${String(sol?.orden_id||0).padStart(4,'0')}`
        })
      }).catch(()=>{});
    }

    toast('✓ Pedido confirmado — técnico notificado');
    cargarSolicitudesRepuestos();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function abrirModalCotizar(solicitudId, repuesto, unidades, placa, marca, modelo, anio, vin) {
  const [proveedores, cots, solItems] = await Promise.all([
    api('/proveedores?activo=eq.true&order=nombre.asc').catch(()=>[]) || [],
    api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&order=opcion.asc`).catch(()=>[]) || [],
    api(`/solicitud_items?solicitud_id=eq.${solicitudId}&order=creado_en.asc`).catch(()=>[]) || []
  ]);
  const existing = document.getElementById('modal-cotizar');
  if (existing) existing.remove();

  // Usar ítems de solicitud_items si existen; si no, usar los campos legacy
  const itemsList = solItems.length ? solItems : [{ repuesto, unidades, observaciones: null, foto_url: null }];

  const provOpts = '<option value="">— Seleccionar proveedor —</option>' +
    proveedores.map(p => `<option value="${p.id}" data-wa="${escapeHtml(p.whatsapp||p.telefono||'')}">${escapeHtml(p.nombre)}</option>`).join('');
  const opLbl = { 1:'Opción 1', 2:'Opción 2', 3:'Opción 3' };

  // Mensaje base con lista de todos los ítems
  const listaItems = itemsList.map(i => `- ${i.repuesto} (x${i.unidades||1})`).join('\n');
  const msgBase = `Buenos días. Solicito cotización para los siguientes repuestos:\n${listaItems}\nVehículo: *${[marca,modelo,anio].filter(Boolean).join(' ')}*${vin ? ', VIN: *' + vin + '*' : ''}. Quedo atento, gracias.`;

  function renderOp(num) {
    const c = cots.find(x => x.opcion === num) || {};
    return `<div style="background:var(--gris-bg);border-radius:10px;padding:14px;margin-bottom:12px;border:1px solid var(--gris-borde)">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:var(--azul)">${opLbl[num]}</div>

      <!-- Proveedor + nuevo -->
      <div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:10px">
        <div class="field" style="flex:1;margin:0">
          <label>Proveedor</label>
          <select id="cot-prov-${num}-${solicitudId}" style="width:100%">${provOpts}</select>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="_toggleNuevoProv(${num},${solicitudId})"
          style="padding:7px 10px;flex-shrink:0;margin-bottom:1px" title="Registrar nuevo proveedor">
          + Nuevo
        </button>
      </div>

      <!-- Formulario nuevo proveedor (oculto) -->
      <div id="np-form-${num}-${solicitudId}" style="display:none;background:white;border:1.5px solid var(--azul);border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--azul);margin-bottom:10px">Nuevo proveedor</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="field"><label>Nombre *</label><input id="np-nom-${num}-${solicitudId}" type="text" placeholder="Nombre del proveedor"></div>
          <div class="field"><label>Teléfono / WhatsApp</label><input id="np-tel-${num}-${solicitudId}" type="tel" placeholder="3001234567"></div>
        </div>
        <div class="field" style="margin-bottom:10px">
          <label>Especialidad <span style="font-weight:400;color:var(--gris-mid)">(frenos, luces, motor, eléctrico...)</span></label>
          <input id="np-esp-${num}-${solicitudId}" type="text" placeholder="¿En qué se especializa?">
        </div>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost btn-xs" onclick="_cancelarNuevoProv(${num},${solicitudId})">Cancelar</button>
          <button type="button" class="btn btn-primary btn-xs" onclick="_guardarNuevoProvInline(${num},${solicitudId})">Guardar proveedor</button>
        </div>
      </div>

      <!-- Precio + Original/Genérico -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end;margin-bottom:12px">
        <div class="field" style="margin:0">
          <label>Precio costo total (COP)</label>
          <input type="number" id="cot-precio-${num}-${solicitudId}" value="${c.precio_costo||''}" placeholder="0" min="0"
            style="font-family:'DM Mono',monospace">
        </div>
        <div style="padding-bottom:6px">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;white-space:nowrap">
            <input type="checkbox" id="cot-orig-${num}-${solicitudId}" ${c.es_original!==false?'checked':''}>
            Original
          </label>
          <div style="font-size:11px;color:var(--gris-mid);margin-top:2px;padding-left:20px">/ Genérico</div>
        </div>
      </div>

      <!-- Mensaje para copiar -->
      <div style="background:white;border-radius:6px;padding:10px 12px;border:1px solid var(--gris-borde)">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gris-mid);margin-bottom:6px">Mensaje para el proveedor</div>
        <textarea id="wa-msg-${num}-${solicitudId}" rows="4"
          style="width:100%;font-size:12px;border:none;background:transparent;resize:vertical;outline:none;line-height:1.5">${escapeHtml(msgBase)}</textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:6px">
          <button type="button" class="btn btn-ghost btn-sm" onclick="_copiarMensajeProv(${num},${solicitudId})"
            style="display:flex;align-items:center;gap:5px">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Copiar mensaje
          </button>
        </div>
      </div>
    </div>`;
  }

  // Lista de repuestos solicitados
  const itemsHtml = `<div style="background:var(--gris-bg);border-radius:8px;padding:12px 14px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gris-mid);margin-bottom:8px">Repuestos solicitados</div>
    ${itemsList.map((item, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;${i < itemsList.length-1 ? 'border-bottom:1px solid var(--gris-borde)' : ''}">
        ${item.foto_url
          ? `<img src="${escapeHtml(item.foto_url)}" style="width:42px;height:42px;object-fit:cover;border-radius:5px;flex-shrink:0">`
          : `<div style="width:42px;height:42px;background:#E5E7EB;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px">📦</div>`}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${escapeHtml(item.repuesto)}</div>
          <div style="font-size:11px;color:var(--gris-mid)">x${item.unidades||1}${item.observaciones ? ' · ' + escapeHtml(item.observaciones) : ''}</div>
        </div>
      </div>`).join('')}
  </div>`;

  const div = document.createElement('div');
  div.id = 'modal-cotizar';
  div.className = 'modal-overlay show';
  div.innerHTML = `
    <div class="modal" style="max-width:580px;max-height:90vh;overflow-y:auto">
      <div class="modal-header">
        <div class="modal-titulo">Cotizar — ${escapeHtml(repuesto)}</div>
        <button class="modal-close" onclick="document.getElementById('modal-cotizar').remove()">✕</button>
      </div>
      <div class="modal-body">
        ${placa ? `<div style="font-size:12px;color:var(--azul);font-family:'DM Mono',monospace;margin-bottom:14px;background:var(--gris-bg);padding:8px 12px;border-radius:6px">
          ${escapeHtml(placa)} · ${[marca,modelo,anio].filter(Boolean).map(escapeHtml).join(' ')}${vin ? `<br>VIN: ${escapeHtml(vin)}` : ''}
        </div>` : ''}
        ${itemsHtml}
        <div style="font-size:12px;color:var(--gris-mid);margin-bottom:12px">
          Ingresa hasta 3 opciones de proveedores. Deja en blanco las que no uses.
        </div>
        ${renderOp(1)}${renderOp(2)}${renderOp(3)}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cotizar').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarCotizaciones(${solicitudId})">Guardar cotizaciones</button>
      </div>
    </div>`;
  document.body.appendChild(div);

  // Pre-seleccionar proveedores de cotizaciones existentes
  cots.forEach(c => {
    const sel = document.getElementById(`cot-prov-${c.opcion}-${solicitudId}`);
    if (sel) sel.value = c.proveedor_id || '';
  });
}

// ── Helpers para nuevo proveedor inline ──────────────────
function _toggleNuevoProv(num, solicitudId) {
  const form = document.getElementById(`np-form-${num}-${solicitudId}`);
  if (!form) return;
  const visible = form.style.display !== 'none';
  form.style.display = visible ? 'none' : 'block';
  if (!visible) setTimeout(() => document.getElementById(`np-nom-${num}-${solicitudId}`)?.focus(), 60);
}

function _cancelarNuevoProv(num, solicitudId) {
  const form = document.getElementById(`np-form-${num}-${solicitudId}`);
  if (form) form.style.display = 'none';
}

async function _guardarNuevoProvInline(num, solicitudId) {
  const nombre = document.getElementById(`np-nom-${num}-${solicitudId}`)?.value?.trim();
  if (!nombre) { toast('El nombre es obligatorio', 'err'); return; }
  const telefono      = document.getElementById(`np-tel-${num}-${solicitudId}`)?.value?.trim() || null;
  const especialidades = document.getElementById(`np-esp-${num}-${solicitudId}`)?.value?.trim() || '';
  try {
    const res = await api('/proveedores', 'POST', {
      nombre, telefono, whatsapp: telefono, especialidades, activo: true, marcas: [], multimarca: false
    }, { Prefer: 'return=representation' });
    const newProv = res?.[0];
    if (!newProv) { toast('Error al guardar proveedor', 'err'); return; }
    // Agregar al select y seleccionar
    const sel = document.getElementById(`cot-prov-${num}-${solicitudId}`);
    if (sel) {
      const opt = document.createElement('option');
      opt.value = newProv.id;
      opt.dataset.wa = telefono || '';
      opt.textContent = nombre;
      sel.appendChild(opt);
      sel.value = newProv.id;
    }
    _cancelarNuevoProv(num, solicitudId);
    toast(`Proveedor "${nombre}" guardado ✓`);
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

function _copiarMensajeProv(num, solicitudId) {
  const txt = document.getElementById(`wa-msg-${num}-${solicitudId}`)?.value || '';
  if (!txt) return;
  navigator.clipboard?.writeText(txt).then(() => {
    toast('Mensaje copiado ✓');
  }).catch(() => {
    // Fallback: select textarea
    const ta = document.getElementById(`wa-msg-${num}-${solicitudId}`);
    if (ta) { ta.select(); document.execCommand('copy'); toast('Mensaje copiado ✓'); }
  });
}

// Mantener compatibilidad con actualizarWaLink (ya no hace nada visualmente pero puede ser llamada)
function actualizarWaLink() {}

async function guardarCotizaciones(solicitudId) {
  try {
    let guardadas = 0;
    for (let op = 1; op <= 3; op++) {
      const provId    = document.getElementById(`cot-prov-${op}-${solicitudId}`)?.value || null;
      const precio    = parseFloat(document.getElementById(`cot-precio-${op}-${solicitudId}`)?.value) || 0;
      const esOrig    = document.getElementById(`cot-orig-${op}-${solicitudId}`)?.checked ?? true;
      if (!provId && !precio) continue;
      guardadas++;
      const body = { proveedor_id: provId || null, precio_costo: precio, es_original: esOrig, estado_opcion: 'cotizado' };
      const ex = await api(`/cotizaciones_repuesto?solicitud_id=eq.${solicitudId}&opcion=eq.${op}`).catch(()=>[]) || [];
      if (ex.length) {
        await api(`/cotizaciones_repuesto?id=eq.${ex[0].id}`, 'PATCH', body);
      } else {
        await api('/cotizaciones_repuesto', 'POST', { solicitud_id: solicitudId, opcion: op, ...body }, { Prefer: 'return=minimal' });
      }
    }
    if (!guardadas) { toast('Ingresa al menos una cotización', 'err'); return; }
    await api(`/solicitudes_repuesto?id=eq.${solicitudId}`, 'PATCH', { estado: 'cotizado' });
    toast('Cotizaciones guardadas ✓');
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
