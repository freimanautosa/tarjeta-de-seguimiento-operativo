// ═══════════════════════════════════════════════════════════
// ÓRDENES - LISTA, DETALLE, NUEVA ORDEN, ETAPAS
// ═══════════════════════════════════════════════════════════

// ============================================================
// LISTA DE ÓRDENES (JEFE)
// ============================================================
function setFiltro(estado, btn) {
  filtroEstado = estado;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cargarOrdenes();
}

function setFiltroPulmon(btn) {
  filtroEstado = null;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cargarOrdenesPulmon();
}

async function cargarOrdenes() {
  if (filtroEstado === null) return; // tab pulmón activo, no aplica
  const lista = document.getElementById('lista-ordenes');
  if (!lista) return;
  lista.innerHTML = '<div class="loading-state">Cargando órdenes...</div>';
  try {
    const data = await api(`/ordenes?estado=eq.${filtroEstado}${filtroEstado==='Activa'?'&pulmon=eq.false':''}&order=creado_en.desc&limit=60`);
    if (!data?.length) {
      lista.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ico('clipboard', 32)}</div>No hay órdenes ${filtroEstado.toLowerCase()}s.</div>`;
      return;
    }
    const ids = data.map(o => o.id).join(',');
    const etapas = await api(`/etapas?orden_id=in.(${ids})&select=orden_id,servicio,fin`).catch(() => []) || [];

    lista.innerHTML = data.map(o => {
      const etapasO  = etapas.filter(e => e.orden_id === o.id);
      const total    = etapasO.length;
      const comp     = etapasO.filter(e => e.fin).length;
      const pct      = total ? Math.round((comp / total) * 100) : 0;
      const completa = total > 0 && comp === total;
      const srvs     = [...new Set(etapasO.map(e => e.servicio).filter(Boolean))];
      const chips    = srvs.map(s => `<span class="badge badge-${s}">${CATALOGO[s]?.nombre || s}</span>`).join('');
      const estadoBadge = o.pulmon
        ? `<span class="badge badge-pulmon">En Pulmón</span>`
        : `<span class="badge badge-${o.estado?.toLowerCase() || 'activa'}">${o.estado || 'Activa'}</span>`;
      const tcBadge = o.tipo_cliente ? `<span class="badge badge-${o.tipo_cliente}">${o.tipo_cliente}</span>` : '';
      const ahora2 = new Date();
      const primerDiaMes = new Date(ahora2.getFullYear(), ahora2.getMonth(), 1);
      const esMesAnterior = o.creado_en && new Date(o.creado_en) < primerDiaMes && o.estado === 'Activa';
      const alertaMesAnt = esMesAnterior
        ? `<span style="font-size:10px;font-weight:700;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:4px;padding:2px 7px;margin-left:4px;vertical-align:middle">MES ANT.</span>`
        : '';

      return `<div class="orden-card" draggable="true" id="card-${o.id}"
        ondragstart="dragStart(event,'${o.id}')"
        ondragover="dragOver(event)"
        ondragleave="dragLeave(event)"
        ondrop="dragDrop(event,'${o.id}')"
        ondragend="dragEnd(event)"
        onclick="abrirOrden(${o.id})"
        style="${esMesAnterior ? 'border-left:3px solid #F59E0B;' : ''}">
        <div class="orden-card-top">
          <div>
            <div class="orden-placa">${escapeHtml(o.placa)}</div>
            <div class="orden-vehiculo">${[o.marca,o.linea,o.modelo].filter(Boolean).map(escapeHtml).join(' · ')} ${o.propietario ? '— '+escapeHtml(o.propietario) : ''}</div>
          </div>
          <div class="orden-badges">${estadoBadge}${tcBadge}</div>
        </div>
        ${total > 0 ? `<div class="progreso-bar-wrap">
          <div class="progreso-labels"><span>${comp} / ${total} etapas</span><span>${pct}%</span></div>
          <div class="progreso-track"><div class="progreso-fill ${completa?'completa':''}" style="width:${pct}%"></div></div>
        </div>` : ''}
        <div class="orden-card-bottom">
          <div class="srv-chips">${chips || '<span style="font-size:12px;color:var(--gris-mid)">Sin etapas</span>'}</div>
          <div class="orden-fecha">${formatFecha(o.creado_en)}${o.fecha_entrega_1 ? '<br>Entrega: '+formatFecha(o.fecha_entrega_1) : ''}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) { lista.innerHTML = `<div class="empty-state">Error cargando órdenes: ${e.message}</div>`; }
}

async function cargarOrdenesPulmon() {
  const lista = document.getElementById('lista-ordenes');
  if (!lista) return;
  lista.innerHTML = '<div class="loading-state">Cargando órdenes...</div>';
  try {
    const data = await api(`/ordenes?pulmon=eq.true&order=pulmon_desde.asc&limit=60`);
    if (!data?.length) {
      lista.innerHTML = `<div class="empty-state"><div class="empty-state-icon"></div>No hay órdenes en pulmón.</div>`;
      return;
    }
    const ids = data.map(o => o.id).join(',');
    const etapas = await api(`/etapas?orden_id=in.(${ids})&select=orden_id,servicio,fin`).catch(() => []) || [];

    lista.innerHTML = data.map(o => {
      const etapasO  = etapas.filter(e => e.orden_id === o.id);
      const total    = etapasO.length;
      const comp     = etapasO.filter(e => e.fin).length;
      const pct      = total ? Math.round((comp / total) * 100) : 0;
      const completa = total > 0 && comp === total;
      const srvs     = [...new Set(etapasO.map(e => e.servicio).filter(Boolean))];
      const chips    = srvs.map(s => `<span class="badge badge-${s}">${CATALOGO[s]?.nombre || s}</span>`).join('');
      const diasPulmon = o.pulmon_desde
        ? Math.floor((new Date() - new Date(o.pulmon_desde)) / 86400000)
        : null;
      return `<div class="orden-card" draggable="true" id="card-${o.id}"
        ondragstart="dragStart(event,'${o.id}')"
        ondragover="dragOver(event)"
        ondragleave="dragLeave(event)"
        ondrop="dragDrop(event,'${o.id}')"
        ondragend="dragEnd(event)"
        onclick="abrirOrden(${o.id})">
        <div class="orden-card-top">
          <div>
            <div class="orden-placa">${escapeHtml(o.placa)}</div>
            <div class="orden-vehiculo">${[o.marca,o.linea,o.modelo].filter(Boolean).map(escapeHtml).join(' · ')} ${o.propietario ? '— '+escapeHtml(o.propietario) : ''}</div>
          </div>
          <div class="orden-badges">
            <span class="badge badge-pulmon">En Pulmón${diasPulmon !== null ? ` · ${diasPulmon}d` : ''}</span>
            ${o.tipo_cliente ? `<span class="badge badge-${o.tipo_cliente}">${o.tipo_cliente}</span>` : ''}
          </div>
        </div>
        ${total > 0 ? `<div class="progreso-bar-wrap">
          <div class="progreso-labels"><span>${comp} / ${total} etapas</span><span>${pct}%</span></div>
          <div class="progreso-track"><div class="progreso-fill ${completa?'completa':''}" style="width:${pct}%"></div></div>
        </div>` : ''}
        <div class="orden-card-bottom">
          <div class="srv-chips">${chips || '<span style="font-size:12px;color:var(--gris-mid)">Sin etapas</span>'}</div>
          <div class="orden-fecha">${diasPulmon !== null ? `${diasPulmon} días en pulmón` : ''}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) { lista.innerHTML = `<div class="empty-state">Error cargando órdenes: ${e.message}</div>`; }
}

// DRAG & DROP
let dragSrcId = null;

function dragStart(e, id) {
  dragSrcId = id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function dragDrop(e, targetId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (dragSrcId === targetId) return;
  const src = document.getElementById('card-' + dragSrcId);
  const tgt = document.getElementById('card-' + targetId);
  if (!src || !tgt) return;
  const srcRect = src.getBoundingClientRect();
  const tgtRect = tgt.getBoundingClientRect();
  if (srcRect.top < tgtRect.top) {
    tgt.parentNode.insertBefore(src, tgt.nextSibling);
  } else {
    tgt.parentNode.insertBefore(src, tgt);
  }
}

function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.orden-card').forEach(c => c.classList.remove('drag-over'));
  dragSrcId = null;
}

// ============================================================
// DETALLE DE ORDEN
// ============================================================
function volverALista() {
  if (sesion?.perfil === 'jefe') navJefe('ordenes');
}

async function abrirOrden(id) {
  mostrarPagina('pag-detalle');
  document.getElementById('topbar-title').textContent = 'Detalle de Orden';
  const detalleCont = document.getElementById('detalle-contenido');
  if (!detalleCont) return;
  detalleCont.innerHTML = '<div class="loading-state">Cargando...</div>';

  try {
    const [orden, etapas, fotosEt, fotosIng, novedades, aprobaciones] = await Promise.all([
      api(`/ordenes?id=eq.${id}`).then(d => d[0]),
      api(`/etapas?orden_id=eq.${id}&order=creado_en.asc`).catch(() => []) || [],
      api(`/fotos_etapas?orden_id=eq.${id}&order=creado_en.desc`).catch(() => []) || [],
      api(`/fotos_ingreso?orden_id=eq.${id}&order=creado_en.asc`).catch(() => []) || [],
      api(`/novedades?orden_id=eq.${id}&order=creado_en.desc`).catch(() => []) || [],
      api(`/aprobaciones_etapa?orden_id=eq.${id}&order=creado_en.asc`).catch(() => []) || []
    ]);
    ordenActual = orden;

    const total = etapas.length;
    const comp = etapas.filter(e => e.fin).length;
    const pct = total ? Math.round((comp / total) * 100) : 0;
    const circ = 2 * Math.PI * 22;

    // Inventario
    let invHtml = '—';
    try {
      const inv = orden.inventario ? JSON.parse(orden.inventario) : null;
      if (inv?.items) {
        const activos = Object.entries(inv.items).filter(([,v])=>v).map(([k])=>INV_LABELS[k]||k);
        invHtml = activos.length
          ? activos.map(a=>`<span class="badge" style="background:var(--verde-bg);color:var(--verde);margin:2px">${a}</span>`).join('')
          : '<span style="color:var(--gris-mid)">Sin ítems</span>';
      }
    } catch(e) {}

    // Fotos
    const todasFotos = [...fotosEt, ...fotosIng];
    const fotosRecHtml = todasFotos.length
      ? todasFotos.map(f=>`<div class="foto-thumb" data-url="${escapeHtml(f.url)}" onclick="abrirLightbox(this.dataset.url)"><img src="${escapeHtml(f.url)}" alt="" loading="lazy"></div>`).join('')
      : '<span style="font-size:12px;color:var(--gris-mid)">Sin fotos.</span>';

    // Timeline
    const tlHtml = etapas.length ? etapas.map((e,i) => {
      const done = !!e.fin;
      const active = !!e.inicio && !e.fin;
      const cls = done ? 'done' : active ? 'active' : 'pending';
      const icon = done ? '✓' : active ? '●' : (i+1);
      return `<div class="timeline-step ${done?'done':''}">
        <div class="timeline-dot ${cls}">${icon}</div>
        <div class="timeline-label ${cls}">${escapeHtml(e.etapa)||'—'}</div>
      </div>`;
    }).join('') : '<span style="font-size:12px;color:var(--gris-mid)">Sin etapas.</span>';

    const estadoClase = orden.pulmon ? 'pulmon' : (orden.estado||'activa').toLowerCase();
    const estadoTexto = orden.pulmon ? 'En Pulmón' : (orden.estado||'Activa');

    const primera = etapas.find(e=>e.inicio);
    const activa = etapas.find(e=>e.inicio&&!e.fin);
    const ahora = new Date();
    const tiempoEtapa = activa ? durHumana(ahora - new Date(activa.inicio)) : (comp===total&&total>0?'Completada':'Sin iniciar');
    const tiempoTotal = primera ? durHumana(ahora - new Date(primera.inicio)) : '—';

    // Servicios
    const porServicio = {};
    etapas.forEach(e=>{ const s=e.servicio||'sin_servicio'; if(!porServicio[s])porServicio[s]=[]; porServicio[s].push(e); });
    const hayActiva = etapas.some(x=>x.inicio&&!x.fin);
    // Orden de servicios persistido en localStorage
    const ordenSrvKey = 'srv_orden_' + id;
    let ordenSrv = [];
    try { ordenSrv = JSON.parse(localStorage.getItem(ordenSrvKey) || '[]'); } catch(ee) {}
    const srvKeys = Object.keys(porServicio);
    const srvKeysSorted = ordenSrv.length
      ? [...ordenSrv.filter(k => srvKeys.includes(k)), ...srvKeys.filter(k => !ordenSrv.includes(k))]
      : srvKeys;

    const serviciosHtml = srvKeysSorted.length
      ? '<div id="srv-drag-container">' +
        srvKeysSorted.map((srvKey) => {
          const ets = porServicio[srvKey];
          const srv = CATALOGO[srvKey];
          const srvNombre = srv ? srv.nombre : srvKey;
          const srvClase  = srv ? srv.clase : 'latoneria';
          const compS = ets.filter(e => e.fin).length;
          const etapaOrdenKey = 'etapa_orden_' + id + '_' + srvKey;
          let etapaOrden = [];
          try { etapaOrden = JSON.parse(localStorage.getItem(etapaOrdenKey) || '[]'); } catch(ee) {}
          const etsSorted = etapaOrden.length
            ? [...etapaOrden.map(eid2 => ets.find(e => e.id === eid2)).filter(Boolean),
               ...ets.filter(e => !etapaOrden.includes(e.id))]
            : ets;
          const etapsHtml = '<div class="etapas-drag-container" id="edc-' + srvKey + '">' +
            etsSorted.map(e => {
              const eHtml = renderEtapa(e, fotosEt, novedades, hayActiva, aprobaciones);
              return eHtml.replace(
                '<div class="etapa-card">',
                '<div class="etapa-card" draggable="true" data-eid="' + e.id + '" ' +
                  'ondragstart="etapaDragStart(event,' + e.id + ',\'' + srvKey + '\')" ' +
                  'ondragover="etapaDragOver(event)" ' +
                  'ondragleave="etapaDragLeave(event)" ' +
                  'ondrop="etapaDragDrop(event,' + e.id + ',\'' + srvKey + '\',' + id + ')" ' +
                  'ondragend="etapaDragEnd(event)">'
              );
            }).join('') + '</div>';
          return '<div class="srv-panel" draggable="true" data-srv="' + srvKey + '" ' +
            'ondragstart="srvDragStart(event,\'' + srvKey + '\')" ' +
            'ondragover="srvDragOver(event)" ' +
            'ondragleave="srvDragLeave(event)" ' +
            'ondrop="srvDragDrop(event,\'' + srvKey + '\',' + id + ')" ' +
            'ondragend="srvDragEnd(event)">' +
            '<div class="srv-panel-header ' + srvClase + '">' +
              '<span class="srv-drag-handle" onclick="event.stopPropagation()" title="Arrastrar servicio">⠮⠮</span>' +
              '<span class="srv-panel-titulo ' + srvClase + '" onclick="togglePanel(\'sp-' + srvKey + '\')" style="cursor:pointer;flex:1">' + srvNombre + '</span>' +
              '<span style="font-size:11px;font-family:\'DM Mono\',monospace;opacity:0.7;cursor:pointer" onclick="togglePanel(\'sp-' + srvKey + '\')"> ' + compS + '/' + ets.length + ' ▾</span>' +
            '</div>' +
            '<div class="srv-panel-body open" id="sp-' + srvKey + '">' + etapsHtml + '</div>' +
          '</div>';
        }).join('') + '</div>'
      : '<div class="empty-state">' +
          `<div class="empty-state-icon">${ico('wrench', 32)}</div>` +
          '<p>No hay etapas registradas aún.</p>' +
          '<button class="btn btn-primary" style="margin-top:14px" onclick="abrirModalAgregar()">+ Asignar servicios y etapas</button>' +
        '</div>';


    detalleCont.innerHTML = `
      <div class="detalle-grid">
        <div>
          <div class="detalle-header-card">
            <div class="detalle-placa-row">
              <div>
                <div class="detalle-placa">${escapeHtml(orden.placa)}</div>
                <div class="detalle-vehiculo">${[orden.marca,orden.linea,orden.modelo,orden.color].filter(Boolean).map(escapeHtml).join(' · ')}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                <span class="badge badge-${estadoClase}">${estadoTexto}</span>
                ${orden.tipo_cliente ? `<span class="badge badge-${orden.tipo_cliente}">${orden.tipo_cliente}</span>` : ''}
              </div>
            </div>
            <div class="donut-section">
              <svg class="donut-svg" width="56" height="56" viewBox="0 0 56 56">
                <circle class="donut-track" cx="28" cy="28" r="22"/>
                <circle class="donut-fill ${pct===100?'completa':'proceso'}" cx="28" cy="28" r="22"
                  style="stroke-dasharray:${(pct/100)*circ} ${circ}"/>
                <text class="donut-pct" x="28" y="32" text-anchor="middle">${pct}%</text>
              </svg>
              <div class="donut-info">
                <div class="donut-label">Progreso general</div>
                <div class="donut-val">${comp} / ${total} etapas</div>
                <div style="display:flex;gap:16px;flex-wrap:wrap">
                  <div><div class="donut-label">Etapa activa</div><div style="font-size:13px;font-weight:600">${tiempoEtapa}</div></div>
                  <div><div class="donut-label">Tiempo total</div><div style="font-size:13px;font-weight:600">${tiempoTotal}</div></div>
                </div>
              </div>
            </div>
            <div class="timeline-wrap">
              <div class="etapas-timeline" id="d-timeline">${tlHtml}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div class="seccion-titulo" style="margin-bottom:0">Datos del vehículo y cliente</div>
            ${sesion?.perfil === 'jefe' && orden.estado !== 'Entregada' ? `<button class="btn btn-ghost btn-sm" onclick="abrirEditarOrden(${orden.id})">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar datos
            </button>` : ''}
          </div>
          <div class="info-chips" style="margin-bottom:16px">
            <div class="info-chip"><div class="info-chip-label">Propietario</div><div class="info-chip-val">${escapeHtml(orden.propietario)||'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">Teléfono</div><div class="info-chip-val">${escapeHtml(orden.telefono)||'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">Tipo cliente</div><div class="info-chip-val">${escapeHtml(orden.tipo_cliente)||'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">Aseguradora</div><div class="info-chip-val">${escapeHtml(orden.aseguradora)||'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">Nivel daño</div><div class="info-chip-val">${escapeHtml(orden.nivel_dano)||'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">Kilometraje</div><div class="info-chip-val">${orden.kilometraje?orden.kilometraje.toLocaleString('es-CO')+' km':'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">VIN</div><div class="info-chip-val" style="font-family:'DM Mono',monospace;font-size:11px">${escapeHtml(orden.vin)||'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">Correo</div><div class="info-chip-val">${escapeHtml(orden.correo_cliente)||'—'}</div></div>
            <div class="info-chip"><div class="info-chip-label">Ingreso</div><div class="info-chip-val">${formatFecha(orden.creado_en)}</div></div>
            <div class="info-chip"><div class="info-chip-label">Fecha entrega 1</div><div class="info-chip-val">${formatFecha(orden.fecha_entrega_1)}</div></div>
            <div class="info-chip"><div class="info-chip-label">Fecha entrega 2</div><div class="info-chip-val">${formatFecha(orden.fecha_entrega_2)}</div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div class="seccion-titulo" style="margin-bottom:0">Servicios y Etapas</div>
            ${sesion?.perfil === 'jefe' ? '<button class="btn btn-ghost btn-sm" onclick="abrirModalAgregar()">+ Agregar etapas</button>' : ''}
          </div>
          ${serviciosHtml}
        </div>
        <div class="detalle-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-card-header" style="background:var(--azul-light);color:var(--azul)">Valor total de la orden</div>
            <div class="sidebar-card-body">
              ${(() => {
                const totalEtapas = etapas.reduce((s,e) => s + (e.valor||0), 0);
                if (!totalEtapas) return '<div style="font-size:13px;color:var(--gris-mid)">Sin valores en etapas.</div>';
                const fmt = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n);
                const filas = etapas.filter(e=>e.valor).map(e =>
                  '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--gris-borde)"><span style="color:var(--gris-mid)">' + escapeHtml(e.etapa||'') + '</span><span style="font-weight:600">' + fmt(e.valor) + '</span></div>'
                ).join('');
                return filas + '<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:2px solid var(--azul-mid)"><span style="font-size:13px;font-weight:700;color:var(--azul)">Total</span><span style="font-size:15px;font-weight:700;color:var(--azul)">' + fmt(totalEtapas) + '</span></div>';
              })()}
            </div>
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-header">Fotos recientes</div>
            <div class="sidebar-card-body">
              <div class="fotos-grid">${fotosRecHtml}</div>
            </div>
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-header">Inventario</div>
            <div class="sidebar-card-body">
              <div>${invHtml}</div>
            </div>
          </div>
          <div id="pulmon-card" class="pulmon-card ${orden.pulmon?'':'inactivo'}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="font-size:12px;font-weight:700;font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;color:${orden.pulmon?'var(--amarillo)':'var(--gris-mid)'}">Pulmón</div>
              <button class="btn btn-sm btn-ghost" id="btn-pulmon" onclick="togglePulmon()">
                ${orden.pulmon ? 'Sacar de pulmón' : 'Activar Pulmón'}
              </button>
            </div>
            <div id="d-pulmon-badge" style="font-size:13px;color:${orden.pulmon?'var(--amarillo)':'var(--gris-mid)'}">
              ${orden.pulmon
                ? `En pulmón${orden.pulmon_tipo ? ` · <strong>${orden.pulmon_tipo.charAt(0).toUpperCase()+orden.pulmon_tipo.slice(1)}</strong>` : ''} desde ${formatFecha(orden.pulmon_desde)}`
                : (orden.pulmon_fin && orden.pulmon_desde)
                  ? `<span style="color:var(--verde,#10B981)">✓ Salió de pulmón</span> · estuvo <strong>${_calcPulmonTiempo(orden.pulmon_desde, orden.pulmon_fin)}</strong>${orden.pulmon_tipo ? ` (${orden.pulmon_tipo})` : ''}`
                  : 'Sin pulmón activo'}
            </div>
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-header">Cotización PDF</div>
            <div class="sidebar-card-body">
              <div id="d-cotizacion-link" style="margin-bottom:12px;font-size:13px">
                ${orden.cotizacion_url
                  ? `<a href="${safeUrl(orden.cotizacion_url)}" target="_blank" rel="noopener noreferrer" style="color:var(--azul-mid);text-decoration:underline">Ver PDF →</a>`
                  : '<span style="color:var(--gris-mid)">Sin cotización adjunta</span>'}
              </div>
              <div class="upload-zone" onclick="document.getElementById('fi-cotizacion').click()">
                <input type="file" id="fi-cotizacion" accept=".pdf,application/pdf" onchange="subirCotizacion(this)">
                <div style="opacity:0.45">${ico('file', 20)}</div>
                <p>${orden.cotizacion_url ? 'Reemplazar PDF' : 'Subir PDF'}</p>
                <div class="upload-prog" id="prog-cotizacion"></div>
              </div>
            </div>
          </div>
          ${sesion?.perfil === 'jefe' ? `
          <div class="sidebar-card">
            <div class="sidebar-card-header">Estado de la orden</div>
            <div class="sidebar-card-body">
              ${(comp === total && total > 0 && orden.estado !== 'Entregada' && orden.estado !== 'Archivada')
                ? `<button class="btn btn-success" style="width:100%" onclick="cambiarEstado('Entregada')">
                     <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                     Marcar como Finalizada
                   </button>
                   <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:6px" onclick="generarPreliquidacion(${orden.id})">
                     <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                     Generar preliquidación
                   </button>
                   <div style="font-size:11px;color:var(--gris-mid);margin-top:8px;text-align:center">Todas las etapas completadas</div>`
                : `<div style="display:flex;flex-direction:column;gap:8px">
                     <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;background:var(--azul-light);border-radius:20px">
                       <span style="width:8px;height:8px;border-radius:50%;background:var(--azul-mid);display:inline-block"></span>
                       <span style="font-size:13px;font-weight:700;color:var(--azul)">${orden.estado === 'Entregada' ? 'Finalizada' : orden.estado === 'Archivada' ? 'Archivada' : 'Activa'}</span>
                     </div>
                     <button class="btn btn-ghost btn-sm" style="width:100%" onclick="generarPreliquidacion(${orden.id})">
                       <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                       Preliquidación
                     </button>
                   </div>`
              }
            </div>
          </div>` : ''}
        </div>
      </div>`;
  } catch(e) {
    detalleCont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

function renderEtapa(e, fotos, novedades, hayActiva, aprobaciones = []) {
  const eid = e.id;
  const k = kid(eid);
  const nombre = e.etapa || '—';
  const esPausado = e.pausado && !e.fin;
  const badge = !e.inicio ? 'Pendiente' : (e.fin ? 'Completada' : esPausado ? 'Pausado' : 'En proceso');
  const bCls  = !e.inicio ? 'pendiente'  : (e.fin ? 'completada' : esPausado ? 'pendiente' : 'iniciada');
  const eFotos = fotos.filter(f => f.etapa_id === eid);
  const eNovs = novedades.filter(n => n.etapa_id === eid);
  const aprobEtapa = aprobaciones.filter(a => a.etapa_id === eid);
  const ultimaAprob = aprobEtapa.length ? aprobEtapa[aprobEtapa.length - 1] : null;

  // ── Cálculo de duración descontando tiempo pausado ──
  let dur = '';
  if (e.inicio) {
    const finRef = e.fin ? new Date(e.fin) : new Date();
    const totalMs = finRef - new Date(e.inicio);
    let pausadoAcum = e.tiempo_pausado_min || 0;
    // Si está actualmente pausada, añadir la pausa en curso
    if (esPausado && e.pausa_inicio) {
      pausadoAcum += Math.max(0, Math.round((Date.now() - new Date(e.pausa_inicio).getTime()) / 60000));
    }
    const m = Math.max(0, Math.round(totalMs / 60000) - pausadoAcum);
    const durStr = `${Math.floor(m/60)}h ${m%60}m`;
    const pausaStr = pausadoAcum > 0
      ? ` <span style="font-size:10px;color:var(--gris-mid)">(⏸ ${pausadoAcum}m en espera de repuesto)</span>`
      : '';
    if (e.fin) {
      dur = `<div class="ts-chip">Duración: <strong>${durStr}</strong>${pausaStr}</div>`;
    } else if (esPausado) {
      dur = `<div class="ts-chip" style="color:#D97706;font-weight:600">⏸ Pausado · tiempo trabajado: <strong>${durStr}</strong>${pausaStr}</div>`;
    }
  }

  let acc = '';
  if (!e.inicio)
    acc = `<button class="btn btn-success btn-sm" data-eid="${eid}" data-nombre="${escapeHtml(nombre)}" onclick="iniciarEtapa(+this.dataset.eid,this.dataset.nombre)">▶ Iniciar</button>`;
  else if (e.inicio && !e.fin && esPausado)
    acc = `<span style="font-size:12px;color:#D97706;font-weight:600;display:flex;align-items:center;gap:5px">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      Esperando repuesto...
    </span>`;
  else if (e.inicio && !e.fin)
    acc = `<button class="btn btn-danger btn-sm" data-eid="${eid}" data-nombre="${escapeHtml(nombre)}" data-srv="${escapeHtml(e.servicio||'')}" onclick="finalizarEtapa(+this.dataset.eid,this.dataset.nombre,this.dataset.srv)">■ Finalizar</button>`;
  else if (e.fin) {
    const aprobBtn = ultimaAprob
      ? `<button class="btn btn-ghost btn-sm" data-eid="${eid}" data-nombre="${escapeHtml(nombre)}" onclick="abrirModalAprobacion(+this.dataset.eid,this.dataset.nombre)">↻ Revisar calidad</button>`
      : `<button class="btn btn-primary btn-sm" data-eid="${eid}" data-nombre="${escapeHtml(nombre)}" onclick="abrirModalAprobacion(+this.dataset.eid,this.dataset.nombre)">✓ Aprobar calidad</button>`;
    acc = aprobBtn;
  } else {
    acc = `<span style="font-size:12px;color:var(--gris-mid);font-style:italic">Esperando turno</span>`;
  }

  const fotosHtml = eFotos.map(f => `
    <div class="foto-thumb" data-url="${escapeHtml(f.url)}" onclick="abrirLightbox(this.dataset.url)">
      <img src="${escapeHtml(f.url)}" alt="">
      <button class="foto-delete" data-fid="${f.id}" data-url="${escapeHtml(f.url)}" onclick="event.stopPropagation();eliminarFoto(+this.dataset.fid,this.dataset.url)">✕</button>
    </div>`).join('');

  const novsHtml = eNovs.length ? eNovs.map(n => `
    <div class="novedad-item">
      <div class="novedad-item-top">
        <span class="novedad-tipo ${escapeHtml((n.tipo||'').toLowerCase())}">${escapeHtml(n.tipo)}</span>
        <span class="novedad-fecha">${formatTS(n.creado_en)}</span>
      </div>
      <div class="novedad-motivo">${escapeHtml(n.motivo)||'—'}</div>
      <div class="novedad-resp">Resp: ${escapeHtml(n.responsable)||'—'}</div>
      ${n.valor ? '<div style="font-size:12px;font-weight:600;color:var(--rojo);margin-top:3px;display:flex;align-items:center;gap:4px">' + ico('money',12) + ' Valor adicional: ' + new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n.valor) + '</div>' : ''}
    </div>`).join('')
    : '<div style="font-size:12px;color:var(--gris-mid);padding:4px 0">Sin novedades.</div>';

  return `
    <div class="etapa-card">
      <div class="etapa-header" onclick="toggleEtapa('eb-${k}')">
        <div style="flex:1;min-width:0">
          <div class="etapa-nombre">${escapeHtml(nombre)}${e.tercero?` <span style="font-size:11px;color:var(--gris-mid);font-weight:400">(${escapeHtml(e.tercero)})</span>`:''}</div>
          ${e.tecnico||e.mecanico_id ? `<div class="etapa-tecnico">${ico('user',12)} ${escapeHtml(e.tecnico)||'Asignado'}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          ${ultimaAprob ? `<span class="badge badge-${ultimaAprob.estado}">${ultimaAprob.estado==='aprobado'?'✓ Aprobada':'✗ Rechazada'}</span>` : ''}
          ${esPausado ? `<span class="badge" style="background:#FEF3C7;color:#92400E;border:1px solid #F59E0B">⏸ Pausado</span>` : ''}
          <span class="badge badge-${bCls}">${badge}</span>
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="opacity:0.4"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </div>
      <div class="etapa-body" id="eb-${k}">
        <div class="etapa-actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${acc}
          <button class="btn btn-ghost btn-sm" style="font-size:12px;display:flex;align-items:center;gap:4px"
            data-oid="${ordenActual?.id||e.orden_id}" data-eid="${eid}" data-placa="${escapeHtml(ordenActual?.placa||'')}" onclick="abrirModalSolicitudRepuesto(+this.dataset.oid,+this.dataset.eid,this.dataset.placa)" >
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            + Repuesto
          </button>
        </div>
        <div class="timestamps">
          <div class="ts-chip">Inicio: <strong>${e.inicio?formatTS(e.inicio):'—'}</strong></div>
          <div class="ts-chip">Fin: <strong>${e.fin?formatTS(e.fin):'—'}</strong></div>
          ${dur}
        </div>
        <div class="grid-2" style="margin-bottom:12px">
          <div class="field"><label>Técnico asignado</label>
            <select id="tec-${k}" onchange="asignarMecanico(${eid},'${k}')">
              <option value="">— Sin asignar —</option>
              ${mecanicos.filter(m=>!['taller','repuestos','Asesor Previsora'].includes(m.rol)).map(m=>`<option value="${m.id}" ${e.mecanico_id===m.id?'selected':''}>${escapeHtml(m.nombre)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:8px">
            <div class="field" style="flex:1"><label>H. Facturadas</label>
              <input id="hf-${k}" type="number" step="0.5" value="${e.horas_facturadas||''}" placeholder="0" onblur="patchHoras(${eid},'${k}')">
            </div>
            <div class="field" style="flex:1"><label>H. Adicionales</label>
              <input id="ha-${k}" type="number" step="0.5" value="${e.horas_adicionales||''}" placeholder="0" onblur="patchHoras(${eid},'${k}')">
            </div>
          </div>
        </div>

        <div class="field" style="margin-bottom:12px">
          <label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gris-mid)"> Valor </label>
          <input id="val-${k}" type="number" step="1000" value="${e.valor||''}" placeholder="0"
            style="font-size:14px;font-weight:600;color:var(--verde)"
            onblur="patchValor(${eid},'${k}')">
          ${e.valor ? '<div style="font-size:11px;color:var(--gris-mid);margin-top:3px">' + new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(e.valor) + '</div>' : '' }
        </div>

        <div class="fotos-section" style="margin-top:0">
          <label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gris-mid)">Fotos (${eFotos.length})</label>
          <div class="fotos-grid" style="margin-top:6px">${fotosHtml}</div>
          <div class="upload-zone" onclick="document.getElementById('fi-${k}').click()" style="margin-top:8px">
            <input type="file" id="fi-${k}" accept="image/*" multiple data-nombre="${escapeHtml(nombre)}" data-eid="${eid}" data-k="${k}" onchange="subirFotos(this,this.dataset.nombre,+this.dataset.eid,this.dataset.k)">
            <div style="opacity:0.45">${ico('camera', 20)}</div>
            <p>Clic para subir fotos</p>
            <div class="upload-prog" id="prog-${k}"></div>
          </div>
        </div>
        <div class="novedad-section">
          <div class="novedad-section-titulo">Novedades</div>
          <div id="nlist-${eid}">${novsHtml}</div>
          <div class="grid-2" style="margin-top:10px">
            <div class="field"><label>Tipo</label>
              <select id="ntype-${eid}">
                <option value="Detenido">Detenido</option>
                <option value="Reproceso">Reproceso</option>
                <option value="Garantia">Garantía</option>
              </select>
            </div>
            <div class="field"><label>Responsable</label>
              <select id="nresp-${eid}">
                <option value="S.C.">Servicio al Cliente</option>
                <option value="A.S.">Asesor de Servicio</option>
                <option value="C.P.">Control de Producción</option>
                <option value="A">Almacén</option>
              </select>
            </div>
            <div class="field full"><label>Motivo</label>
              <textarea id="nmot-${eid}" placeholder="Describe la novedad..." style="min-height:52px"></textarea>
            </div>
          </div>
          <div class="field" style="margin-top:8px"><label style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--gris-mid)">Valor adicional COP</label><input id="nvalor-${eid}" type="number" step="1000" min="0" placeholder="0 (opcional)"></div>
          <div class="btn-row" style="margin-top:8px">
            <button class="btn btn-danger btn-sm" onclick="guardarNovedad(${eid})">Guardar novedad</button>
          </div>
        </div>
        ${ultimaAprob ? `
        <div class="aprob-box ${ultimaAprob.estado==='rechazado'?'rechazado':''}" style="margin-top:14px">
          <div class="aprob-box-top">
            <span class="aprob-box-estado">${ultimaAprob.estado==='aprobado'?'✓ Aprobada':'✗ Rechazada'}</span>
            <span class="aprob-box-fecha">${formatTS(ultimaAprob.creado_en)}</span>
          </div>
          <div style="font-size:12px;color:var(--gris-mid)">Por: ${escapeHtml(ultimaAprob.registrado_por)}</div>
          ${ultimaAprob.observacion?`<div style="font-size:12px;margin-top:4px">${escapeHtml(ultimaAprob.observacion)}</div>`:''}
        </div>` : ''}
      </div>
    </div>`;
}

function togglePanel(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open'); 
}
function toggleEtapa(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open'); 
}

// ============================================================
// ACCIONES DE ETAPAS (JEFE)
// ============================================================
async function iniciarEtapa(eid, nombre) {
  try {
    await api(`/etapas?id=eq.${eid}`, 'PATCH', { inicio: new Date().toISOString() });
    toast(`${nombre} iniciada ✓`);
    if (ordenActual) abrirOrden(ordenActual.id);
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

async function finalizarEtapa(eid, nombre, servicio) {
  try {
    const repPend = await api(`/solicitudes_repuesto?etapa_id=eq.${eid}&estado=in.(pendiente_jefe,enviado_repuestos,cotizado,pedido)&select=id,repuesto`).catch(()=>[]) || [];
    if (repPend.length) {
      toast(`No puedes finalizar. Hay ${repPend.length} repuesto(s) pendiente(s): ${repPend.map(r=>r.repuesto).join(', ')}`, 'err');
      return;
    }
    await api(`/etapas?id=eq.${eid}`, 'PATCH', { fin: new Date().toISOString() });
    toast(`${nombre} finalizada ✓`);
    const etapasOrden = await api(`/etapas?orden_id=eq.${ordenActual.id}&order=creado_en.asc`);
    const etapaActual = etapasOrden.find(e => e.id === eid);
    const etapasMismoSrv = etapasOrden.filter(e => e.servicio === (etapaActual?.servicio || servicio));
    const idxEnSrv = etapasMismoSrv.findIndex(e => e.id === eid);
    const siguiente = etapasMismoSrv.slice(idxEnSrv + 1).find(e => !e.fin) || null;
    const todasComp = etapasOrden.every(e => e.fin || e.id === eid);
    const tiemposEtapas = etapasOrden.map(e => {
      const inicio = e.inicio ? new Date(e.inicio) : null;
      const fin = (e.id === eid) ? new Date() : (e.fin ? new Date(e.fin) : null);
      let duracion = null;
      if (inicio && fin) {
        const bruto = Math.round((fin - inicio) / 60000);
        const m = Math.max(0, bruto - (e.tiempo_pausado_min || 0));
        duracion = `${Math.floor(m/60)}h ${m%60}m`;
      }
      return { etapa: e.etapa, servicio: e.servicio, tecnico: e.tecnico, duracion };
    });
    fetch(N8N_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        evento: todasComp ? 'orden_completada' : 'etapa_finalizada', 
        orden: { id: ordenActual.id, placa: ordenActual.placa, propietario: ordenActual.propietario, marca: ordenActual.marca, linea: ordenActual.linea, aseguradora: ordenActual.aseguradora }, 
        etapa_finalizada: { id: eid, nombre, servicio: etapaActual?.servicio || servicio, tecnico: etapaActual?.tecnico || null }, 
        siguiente_etapa: siguiente ? { id: siguiente.id, nombre: siguiente.etapa, servicio: siguiente.servicio, mecanico_id: siguiente.mecanico_id, tecnico: siguiente.tecnico } : null, 
        todas_completadas: todasComp, 
        tiempos_etapas: todasComp ? tiemposEtapas : null, 
        link: `${window.location.origin}${window.location.pathname}` 
      }) 
    }).catch(() => {});
    if (ordenActual) abrirOrden(ordenActual.id);
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

async function patchHoras(eid, k) {
  const hf = parseFloat(document.getElementById(`hf-${k}`)?.value) || null;
  const ha = parseFloat(document.getElementById(`ha-${k}`)?.value) || null;
  await api(`/etapas?id=eq.${eid}`, 'PATCH', { horas_facturadas: hf, horas_adicionales: ha }).catch(() => {});
}

async function asignarMecanico(eid, k) {
  const sel = document.getElementById(`tec-${k}`);
  const mecId = sel?.value ? parseInt(sel.value) : null;
  const mec = mecanicos.find(m => m.id === mecId);
  try {
    await api(`/etapas?id=eq.${eid}`, 'PATCH', { mecanico_id: mecId || null, tecnico: mec?.nombre || null });
    toast('Técnico asignado ✓');
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

// ============================================================
// NUEVA ORDEN
// ============================================================
function resetNuevaOrden() {
  const fields = ['n-placa', 'n-marca', 'n-linea', 'n-modelo', 'n-color', 'n-propietario', 'n-telefono', 'n-km', 'n-fecha1', 'n-fecha2', 'n-inv-obs', 'n-cedula-cliente', 'n-vin', 'n-correo-cliente'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const aseguradora = document.getElementById('n-aseguradora');
  const dano = document.getElementById('n-dano');
  const tipoCliente = document.getElementById('n-tipo-cliente');
  if (aseguradora) aseguradora.value = '';
  if (dano) dano.value = '';
  if (tipoCliente) tipoCliente.value = '';
  document.querySelectorAll('.inv-item').forEach(el => {
    el.classList.remove('checked');
    const chk = el.querySelector('input[type=checkbox]');
    if (chk) chk.checked = false;
  });
  fotosIngresoPendientes = [];
  renderPreviewIngreso();
  const resultado = document.getElementById('placa-resultado');
  const historial = document.getElementById('historial-previo');
  if (resultado) resultado.style.display = 'none';
  if (historial) historial.style.display = 'none';
}

function cancelarNuevaOrden() { 
  if (sesion?.perfil === 'jefe') navJefe('ordenes'); 
}

function toggleInv(el, key) {
  el.classList.toggle('checked');
  const chk = el.querySelector('input[type=checkbox]');
  if (chk) chk.checked = el.classList.contains('checked');
}

function agregarFotosIngreso(input) {
  fotosIngresoPendientes = [...fotosIngresoPendientes, ...Array.from(input.files)];
  renderPreviewIngreso();
}

function renderPreviewIngreso() {
  const g = document.getElementById('fotos-ingreso-preview');
  if (!g) return;
  g.innerHTML = fotosIngresoPendientes.map((f, i) => `
    <div class="foto-thumb">
      <img src="${URL.createObjectURL(f)}" style="width:100%;height:100%;object-fit:cover">
      <button class="foto-delete" style="opacity:1" onclick="quitarFotoIngreso(${i})">✕</button>
    </div>`).join('');
}

function quitarFotoIngreso(i) { 
  fotosIngresoPendientes.splice(i, 1); 
  renderPreviewIngreso(); 
}

// ── Autocompletado de placa en tiempo real ──────────────────
let _placaDebounce = null;
let _placaRegistry = {};

function seleccionarPlacaById(placa) {
  seleccionarPlaca(placa, _placaRegistry[placa] || {});
}

async function autocompletarPlaca(val) {
  clearTimeout(_placaDebounce);
  const sugDiv = document.getElementById('placa-sugerencias');
  if (!sugDiv) return;
  if (!val || val.length < 2) { sugDiv.style.display = 'none'; return; }

  _placaDebounce = setTimeout(async () => {
    try {
      const [deVehiculos, deOrdenes] = await Promise.all([
        api(`/vehiculos?placa=ilike.${val}*&select=placa,marca,linea,modelo&limit=6`).catch(()=>[]) || [],
        api(`/ordenes?placa=ilike.${val}*&select=placa,marca,linea,modelo,propietario,telefono,color&order=creado_en.desc&limit=6`).catch(()=>[]) || []
      ]);

      // Deduplicar por placa, priorizar vehículos
      const mapa = {};
      deOrdenes.forEach(o => { mapa[o.placa] = o; });
      deVehiculos.forEach(v => { mapa[v.placa] = { ...mapa[v.placa], ...v }; });
      const sugerencias = Object.values(mapa).slice(0, 6);

      if (!sugerencias.length) { sugDiv.style.display = 'none'; return; }

      _placaRegistry = {};
      sugerencias.forEach(s => { _placaRegistry[s.placa] = s; });

      sugDiv.innerHTML = sugerencias.map(s => `
        <div class="placa-sug-item" data-placa="${escapeHtml(s.placa)}" onmousedown="seleccionarPlacaById(this.dataset.placa)">
          <span class="placa-sug-placa">${escapeHtml(s.placa)}</span>
          <span class="placa-sug-veh">${[s.marca,s.linea,s.modelo].filter(Boolean).map(escapeHtml).join(' ')||'—'}</span>
        </div>`).join('');
      sugDiv.style.display = 'block';
    } catch(e) { sugDiv.style.display = 'none'; }
  }, 250);
}

function seleccionarPlaca(placa, datos) {
  const input = document.getElementById('n-placa');
  if (input) input.value = placa;
  cerrarSugerenciasPlaca();
  // Pre-llenar campos del vehículo
  const campos = { 'n-marca': datos.marca, 'n-linea': datos.linea, 'n-modelo': datos.modelo, 'n-color': datos.color };
  Object.entries(campos).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });
  // Pre-llenar propietario si es particular
  if (datos.propietario) {
    const prop = document.getElementById('n-propietario');
    const tel  = document.getElementById('n-telefono');
    if (prop && !prop.value) prop.value = datos.propietario;
    if (tel  && !tel.value  && datos.telefono) tel.value = datos.telefono;
  }
  buscarPorPlaca(); // Mostrar historial
}

function cerrarSugerenciasPlaca() {
  const s = document.getElementById('placa-sugerencias');
  if (s) s.style.display = 'none';
}

let _placaSugIdx = -1;
function navSugerenciasPlaca(e) {
  const items = document.querySelectorAll('.placa-sug-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _placaSugIdx = Math.min(_placaSugIdx+1, items.length-1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _placaSugIdx = Math.max(_placaSugIdx-1, 0); }
  else if (e.key === 'Enter' && _placaSugIdx >= 0) { e.preventDefault(); items[_placaSugIdx]?.dispatchEvent(new MouseEvent('mousedown')); return; }
  else if (e.key === 'Escape') { cerrarSugerenciasPlaca(); return; }
  items.forEach((item, i) => item.classList.toggle('active', i === _placaSugIdx));
}

async function buscarPorPlaca() {
  const placa = document.getElementById('n-placa')?.value.trim().toUpperCase();
  const resultDiv = document.getElementById('placa-resultado');
  const histDiv = document.getElementById('historial-previo');
  cerrarSugerenciasPlaca();
  if (!placa || placa.length < 3) {
    if (resultDiv) resultDiv.style.display = 'none';
    if (histDiv) histDiv.style.display = 'none';
    return;
  }
  try {
    // Consultar vehículos registrados Y historial de órdenes en paralelo
    const [vehiculo, ordenes] = await Promise.all([
      api(`/vehiculos?placa=eq.${placa}&limit=1`).then(r => r?.[0]).catch(() => null),
      api(`/ordenes?placa=eq.${placa}&order=creado_en.desc&limit=5`).catch(() => []) || []
    ]);

    // Prioridad: tabla vehiculos > última orden
    const fuente = vehiculo || (ordenes?.length ? ordenes[0] : null);

    if (fuente) {
      const flds = { 'n-marca': fuente.marca, 'n-linea': fuente.linea, 'n-modelo': fuente.modelo, 'n-color': fuente.color };
      Object.entries(flds).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val && !el.value) el.value = val;
      });
      const prop = document.getElementById('n-propietario');
      const tel  = document.getElementById('n-telefono');
      const ced  = document.getElementById('n-cedula-cliente');
      if (prop && !prop.value && fuente.propietario) prop.value = fuente.propietario;
      if (tel  && !tel.value  && fuente.telefono)    tel.value  = fuente.telefono;
      if (ced  && !ced.value  && fuente.cedula_nit)  ced.value  = fuente.cedula_nit;

      // Si el vehículo pertenece a una flotilla, pre-seleccionar
      if (vehiculo?.flotilla_id) {
        const tabFlot = document.getElementById('tcb-flotilla');
        if (tabFlot && typeof selTipoCliente === 'function') {
          const tipoActual = document.getElementById('n-tipo-cliente')?.value;
          if (!tipoActual) {
            selTipoCliente(tabFlot, 'flotilla');
            setTimeout(() => {
              const sel = document.getElementById('n-flotilla-sel');
              if (sel) sel.value = vehiculo.flotilla_id;
            }, 300);
          }
        }
      }

      if (resultDiv) {
        const origen = vehiculo ? '🚗 Vehículo en flotilla registrada' : '✔ Vehículo encontrado';
        resultDiv.className = 'placa-resultado encontrado';
        resultDiv.innerHTML = `${origen} — datos autocompletados.`;
        resultDiv.style.display = 'block';
      }
    }

    if (ordenes?.length) {
      const historialLista = document.getElementById('historial-lista');
      if (historialLista && histDiv) {
        historialLista.innerHTML = ordenes.map(o => `
          <div class="historial-item" onclick="abrirOrden(${o.id})">
            <div><span class="historial-placa">${escapeHtml(o.placa)}</span>
            <span style="color:var(--gris-mid);margin-left:8px">${escapeHtml(o.aseguradora)||'—'}</span></div>
            <div style="font-size:11px;color:var(--gris-mid);text-align:right">${formatFecha(o.creado_en)}</div>
          </div>`).join('');
        histDiv.style.display = 'block';
      }
    } else if (!fuente) {
      if (resultDiv) {
        resultDiv.className = 'placa-resultado nuevo';
        resultDiv.innerHTML = 'ℹ Placa nueva — sin registros anteriores.';
        resultDiv.style.display = 'block';
      }
      if (histDiv) histDiv.style.display = 'none';
    }
  } catch(e) { if (resultDiv) resultDiv.style.display = 'none'; }
}

// ── OCR Tarjeta de Propiedad ─────────────────────────────────
async function ocrTarjetaPropiedad(input) {
  const file = input.files?.[0];
  if (!file) return;
  const estado = document.getElementById('ocr-estado');
  if (estado) { estado.style.display = 'block'; estado.innerHTML = '⏳ Leyendo tarjeta de propiedad...'; }

  try {
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    // Llamada via proxy n8n (evita CORS y protege la API key)
    const response = await fetch('https://automatizacionesfreimanautos-n8n.qs0sgf.easypanel.host/webhook/ocr-tarjeta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imagen: base64,
        tipo: file.type || 'image/jpeg'
      })
    });

    const data = await response.json();
    let parsed = {};
    try { parsed = data?.datos || {}; } catch(e) { parsed = {}; }

    const mapa = {
      'n-placa':  parsed.placa?.toUpperCase(),
      'n-marca':  parsed.marca,
      'n-linea':  parsed.linea,
      'n-modelo': parsed.modelo,
      'n-color':  parsed.color,
      'n-vin':    parsed.vin?.toUpperCase()
    };

    let encontrados = [];
    Object.entries(mapa).forEach(([id, val]) => {
      if (!val) return;
      const el = document.getElementById(id);
      if (el) { el.value = val; encontrados.push(id.replace('n-','').replace('-',' ')); }
    });

    // Propietario va al campo correcto según tipo cliente seleccionado
    if (parsed.propietario) {
      const tipo = document.getElementById('n-tipo-cliente')?.value;
      const targetId = tipo === 'aseguradora' ? 'n-propietario-aseg' : 'n-propietario';
      const el = document.getElementById(targetId);
      if (el && !el.value) { el.value = parsed.propietario; encontrados.push('propietario'); }
    }

    // Cédula / NIT del propietario (extraída de la tarjeta)
    const cedulaParsed = parsed.cedula_nit || parsed.cedula || parsed.documento;
    if (cedulaParsed) {
      const tipo = document.getElementById('n-tipo-cliente')?.value;
      const cedId = tipo === 'aseguradora' ? 'n-cedula-aseg' : 'n-cedula-cliente';
      const cedEl = document.getElementById(cedId);
      if (cedEl && !cedEl.value) { cedEl.value = cedulaParsed; encontrados.push('cédula'); }
    }

    // Si encontró placa, buscar historial
    if (parsed.placa) buscarPorPlaca();

    if (estado) {
      if (encontrados.length) {
        estado.innerHTML = `${ico('check',14)} Datos extraídos: <strong>${encontrados.join(', ')}</strong>. Revisa y corrige si es necesario.`;
        estado.style.background = 'var(--verde-bg)';
        estado.style.borderColor = 'var(--verde)';
        estado.style.color = 'var(--verde)';
      } else {
        estado.innerHTML = ico('warning',14) + ' No se pudieron extraer datos. La imagen puede estar borrosa o mal enfocada. Intenta con mejor iluminación.';
        estado.style.background = '#FEF3C7';
        estado.style.borderColor = '#FDE68A';
        estado.style.color = '#92400E';
      }
    }
  } catch(e) {
    if (estado) {
      estado.innerHTML = ico('x',14) + ' Error al leer la tarjeta: ' + e.message;
      estado.style.background = 'var(--rojo-bg,#FEE2E2)';
    }
    console.error('OCR error:', e);
  } finally {
    input.value = ''; // Reset para poder volver a subir
  }
}

// ── Toggle persona natural / empresa en nueva orden ─────────
function toggleTipoPersonaNueva(tipo) {
  const lblNombre = document.getElementById('lbl-n-propietario');
  const lblDoc    = document.getElementById('lbl-n-cedula');
  if (tipo === 'empresa') {
    if (lblNombre) lblNombre.textContent = 'Razón social *';
    if (lblDoc)    lblDoc.textContent    = 'NIT';
  } else {
    if (lblNombre) lblNombre.textContent = 'Nombre completo *';
    if (lblDoc)    lblDoc.textContent    = 'Cédula';
  }
}

function toggleTipoClienteNueva(tipo) {
  ['n-wrap-particular','n-wrap-aseg','n-wrap-flot','n-wrap-empresa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const mapaBloque = {
    particular:  'n-wrap-particular',
    aseguradora: 'n-wrap-aseg',
    flotilla:    'n-wrap-flot',
    empresa:     'n-wrap-empresa'
  };
  const el = document.getElementById(mapaBloque[tipo]);
  if (el) el.style.display = 'block';
  const hidden = document.getElementById('n-tipo-cliente');
  if (hidden) hidden.value = tipo;
}

function selTipoCliente(label, tipo) {
  document.querySelectorAll('.tipo-cliente-btn').forEach(b => b.classList.remove('selected'));
  label.classList.add('selected');
  toggleTipoClienteNueva(tipo);
}

function toggleNuevaAseg(val) {
  const el = document.getElementById('n-wrap-aseg-extra');
  if (el) el.style.display = val ? 'none' : 'block';
}
function toggleNuevaFlot(val) {
  const el = document.getElementById('n-wrap-flot-extra');
  if (el) el.style.display = val ? 'none' : 'block';
}
function toggleNuevaEmpresa(val) {
  const el = document.getElementById('n-wrap-empresa-extra');
  if (el) el.style.display = val ? 'none' : 'block';
}
async function agregarNuevaEmpresaNueva() {
  const n = document.getElementById('n-emp-nombre')?.value.trim() || prompt('Razón social:')?.trim();
  if (!n) return;
  const nit = document.getElementById('n-emp-nit')?.value.trim() || null;
  try {
    await api('/flotillas', 'POST', { nombre: n, nit, activo: true }, { Prefer:'return=minimal' });
    toast('Empresa agregada ✓');
    await recargarListasNuevaOrden();
    const sel = document.getElementById('n-empresa-sel');
    if (sel) sel.value = n;
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function agregarNuevaAsegNueva() {
  const nombre = prompt('Nombre de la nueva aseguradora:')?.trim();
  if (!nombre) return;
  try {
    await api('/aseguradoras', 'POST', { nombre, activo: true }, { Prefer:'return=minimal' });
    toast('Aseguradora agregada ✓');
    await recargarListasNuevaOrden();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function agregarNuevaFlotNueva() {
  const nombre = prompt('Nombre de la nueva flotilla:')?.trim();
  if (!nombre) return;
  try {
    await api('/flotillas', 'POST', { nombre, activo: true }, { Prefer:'return=minimal' });
    toast('Flotilla agregada ✓');
    await recargarListasNuevaOrden();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function recargarListasNuevaOrden() {
  const [aseg, flot] = await Promise.all([
    api('/aseguradoras?activo=eq.true&order=nombre.asc').catch(()=>[]) || [],
    api('/flotillas?activo=eq.true&order=nombre.asc').catch(()=>[]) || []
  ]);
  const selA = document.getElementById('n-aseguradora-sel');
  const selF = document.getElementById('n-flotilla-sel');
  if (selA) selA.innerHTML = '<option value="">— Seleccionar —</option>' +
    aseg.map(a=>`<option value="${escapeHtml(a.nombre)}">${escapeHtml(a.nombre)}</option>`).join('');
  if (selF) selF.innerHTML = '<option value="">— Seleccionar —</option>' +
    flot.map(f=>`<option value="${escapeHtml(f.nombre)}">${escapeHtml(f.nombre)}</option>`).join('');
}

async function crearOrden() {
  const placa = document.getElementById('n-placa')?.value.trim().toUpperCase();
  if (!placa) { toast('La placa es obligatoria', 'err'); return; }
  const cedulaCliente = document.getElementById('n-cedula-cliente')?.value.trim() || '';
  const vin = document.getElementById('n-vin')?.value.trim().toUpperCase() || null;
  const correoCliente = document.getElementById('n-correo-cliente')?.value.trim() || null;

  // Validar VIN si fue ingresado
  if (vin && vin.length !== 17) { toast('El VIN debe tener exactamente 17 caracteres', 'err'); return; }
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) { toast('VIN inválido — solo mayúsculas y números (sin I, O, Q)', 'err'); return; }
  if (correoCliente && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoCliente)) { toast('Correo electrónico inválido', 'err'); return; }

  const invItems = {};
  document.querySelectorAll('.inv-item input[type=checkbox]').forEach(chk => { invItems[chk.value] = chk.checked; });

  let clienteId = null;
  if (cedulaCliente) {
    try {
      let cl = await api(`/clientes?cedula_nit=eq.${cedulaCliente}`);
      if (cl?.length) {
        clienteId = cl[0].id;
      } else {
        const nombre = document.getElementById('n-propietario')?.value || null;
        const telefono = document.getElementById('n-telefono')?.value || null;
        const nuevo = await api('/clientes?select=id', 'POST', { cedula_nit: cedulaCliente, nombre, celular: telefono }, { Prefer: 'return=representation' });
        clienteId = nuevo[0].id;
      }
    } catch(e) { console.warn('Error creando cliente:', e); }
  }

  const body = {
    placa,
    aseguradora: (() => {
      const tipo = document.getElementById('n-tipo-cliente')?.value || '';
      if (tipo === 'aseguradora') return document.getElementById('n-aseguradora-sel')?.value || null;
      if (tipo === 'flotilla')    return document.getElementById('n-flotilla-sel')?.value || null;
      return null;
    })(),
    marca: document.getElementById('n-marca')?.value || null,
    linea: document.getElementById('n-linea')?.value || null,
    modelo: document.getElementById('n-modelo')?.value || null,
    color: document.getElementById('n-color')?.value || null,
    propietario: document.getElementById('n-propietario')?.value || null,
    telefono: document.getElementById('n-telefono')?.value || null,
    tipo_cliente: (() => {
      const persona = document.querySelector('input[name="n-tipo-persona"]:checked')?.value || 'natural';
      if (persona === 'empresa') return 'empresa';
      return document.getElementById('n-tipo-cliente')?.value || null;
    })(),
    nivel_dano: document.getElementById('n-dano')?.value || null,
    kilometraje: parseInt(document.getElementById('n-km')?.value) || null,
    fecha_entrega_1: document.getElementById('n-fecha1')?.value || null,
    fecha_entrega_2: document.getElementById('n-fecha2')?.value || null,
    inventario: JSON.stringify({ items: invItems, observaciones: document.getElementById('n-inv-obs')?.value.trim() || null }),
    estado: 'Activa',
    cliente_id: clienteId,
    vin: vin || null,
    correo_cliente: correoCliente || null
  };

  try {
    const res = await api('/ordenes?select=id', 'POST', body, { Prefer: 'return=representation' });
    const ordenId = res[0].id;

    if (fotosIngresoPendientes.length) {
      const prog = document.getElementById('prog-ingreso');
      if (prog) prog.textContent = `Subiendo fotos 0/${fotosIngresoPendientes.length}...`;
      let sub = 0;
      for (const file of fotosIngresoPendientes) {
        try {
          const ext = file.name.split('.').pop();
          const path = `${ordenId}/ingreso/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const url = await storageUpload(file, path);
          await api('/fotos_ingreso', 'POST', { orden_id: ordenId, url, nombre: file.name }, { Prefer: 'return=minimal' });
          sub++;
          if (prog) prog.textContent = `Subiendo fotos ${sub}/${fotosIngresoPendientes.length}...`;
        } catch(e) { console.error(e); }
      }
      if (prog) prog.textContent = '';
    }

    resetNuevaOrden();
    fotosIngresoPendientes = [];
    modalOrdenId = ordenId;
    toast('Orden creada ✓');
    abrirModalServicios();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// MODAL SERVICIOS
// ============================================================
function abrirModalServicios() {
  srvSeleccionados = [];
  modalPaso = 1;
  document.querySelectorAll('.srv-card-select').forEach(c => c.classList.remove('selected'));
  const errorDiv = document.getElementById('srv-error');
  if (errorDiv) errorDiv.style.display = 'none';
  const titulo = document.getElementById('modal-srv-titulo');
  if (titulo) titulo.textContent = 'Paso 1 — Servicios';
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.style.display = 'none';
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) nextBtn.textContent = 'Continuar →';
  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  if (paso1) paso1.classList.add('active');
  if (paso2) paso2.classList.remove('active');
  const modal = document.getElementById('modal-servicios');
  if (modal) modal.classList.add('show');
}

function cerrarModalServicios() {
  const modal = document.getElementById('modal-servicios');
  if (modal) modal.classList.remove('show');
  if (modalOrdenId) { 
    cargarOrdenes(); 
    abrirOrden(modalOrdenId); 
    modalOrdenId = null; 
  }
}

function toggleServicio(srv) {
  const card = document.getElementById('srv-' + srv);
  if (card) card.classList.toggle('selected');
  if (srvSeleccionados.includes(srv)) {
    srvSeleccionados = srvSeleccionados.filter(s => s !== srv);
  } else {
    srvSeleccionados.push(srv);
  }
}

function modalNext() {
  if (modalPaso === 1) {
    if (!srvSeleccionados.length) { 
      const error = document.getElementById('srv-error');
      if (error) error.style.display = 'block';
      return; 
    }
    const error = document.getElementById('srv-error');
    if (error) error.style.display = 'none';
    buildChecklist('checklist-nuevo', srvSeleccionados, []);
    const paso1 = document.getElementById('paso-1');
    const paso2 = document.getElementById('paso-2');
    if (paso1) paso1.classList.remove('active');
    if (paso2) paso2.classList.add('active');
    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.style.display = '';
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.textContent = 'Guardar etapas ✓';
    modalPaso = 2;
  } else {
    guardarEtapasNueva();
  }
}

function modalBack() {
  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  if (paso1) paso1.classList.add('active');
  if (paso2) paso2.classList.remove('active');
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.style.display = 'none';
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) nextBtn.textContent = 'Continuar →';
  const titulo = document.getElementById('modal-srv-titulo');
  if (titulo) titulo.textContent = 'Paso 1 — Servicios';
  modalPaso = 1;
}

const ROLES_EXCLUIR = ['taller', 'repuestos', 'Asesor Previsora'];

function buildChecklist(containerId, servicios, existentes) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const mecElegibles = mecanicos.filter(m => !ROLES_EXCLUIR.includes(m.rol));
  container.innerHTML = servicios.map(srvKey => {
    const srv = CATALOGO[srvKey];
    if (!srv) return '';
    const items = srv.etapas.map(et => {
      const ex = existentes.find(e => e.etapa_key === et.key);
      const iniciada = !!ex?.inicio;
      const checked = !!ex;
      const dis = iniciada ? 'disabled' : '';
      const mecSelected = ex?.mecanico_id ?? '';
      const extraHtml = (et.tot || et.otro) ? `<div class="extra-input${checked ? ' show' : ''}" id="extra-${et.key}">
        <input type="text" placeholder="${et.tot ? '¿Quién es el tercero?' : 'Especifica cuál...'}" style="font-size:13px;margin-top:4px">
      </div>` : '';
      const mecsFiltrados = mecElegibles;
      const mecHtml = !iniciada ? `<div class="mec-select-wrap" id="mec-${et.key}" style="margin-top:6px;display:${checked ? 'block' : 'none'}">
        <select id="mec-sel-${et.key}" style="font-size:13px">
          <option value="">— Asignar técnico * —</option>
          ${mecsFiltrados.map(m => `<option value="${m.id}" ${m.id == mecSelected ? ' selected' : ''}>${escapeHtml(m.nombre)}</option>`).join('')}
        </select>
      </div>` : `<div style="font-size:11px;color:var(--gris-mid);margin-top:4px">Técnico ya asignado</div>`;
      const camposHtml = !iniciada ? `
        <div class="etapa-extra-campos" id="campos-${et.key}" style="display:${checked ? 'block' : 'none'};margin-top:8px;padding:10px;background:var(--gris-bg);border-radius:6px;border:1px solid var(--gris-borde)">
          <div style="display:grid;grid-template-columns:1fr 80px 110px;gap:8px">
            <div><label style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gris-mid);display:block;margin-bottom:3px">Descripción</label>
              <input id="desc-et-${et.key}" type="text" placeholder="Detalle..." style="width:100%;padding:7px 9px;border:1.5px solid var(--gris-borde);border-radius:5px;font-size:12px" value="${ex?.descripcion||''}"></div>
            <div><label style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gris-mid);display:block;margin-bottom:3px"># Horas</label>
              <input id="piezas-et-${et.key}" type="number" min="0" step="0.5" placeholder="0" style="width:100%;padding:7px 9px;border:1.5px solid var(--gris-borde);border-radius:5px;font-size:12px" value="${ex?.horas_estimadas||''}"></div>
            <div><label style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gris-mid);display:block;margin-bottom:3px">Valor COP</label>
              <input id="valor-et-${et.key}" type="number" min="0" step="1000" placeholder="0" style="width:100%;padding:7px 9px;border:1.5px solid var(--gris-borde);border-radius:5px;font-size:12px" value="${ex?.valor||''}"></div>
          </div>
        </div>` : '';
      return `<div class="check-item">
        <input type="checkbox" id="chk-${et.key}" value="${et.key}" ${checked ? 'checked' : ''} ${dis}
          onchange="onChkChange('${et.key}', this.checked)">
        <div style="flex:1">
          <div class="check-item-label">${et.nombre}${iniciada ? ' <span style="font-size:10px;color:var(--gris-mid)">(ya iniciada)</span>' : ''}</div>
          ${extraHtml}${mecHtml}${camposHtml}
        </div>
      </div>`;
    }).join('');
    const cls = srv.clase;
    return `<div class="etapas-grupo">
      <span class="etapas-grupo-label badge-${cls}" style="background:var(--${cls === 'latoneria' ? 'rojo' : cls === 'pintura' ? 'amarillo' : cls === 'mecanica' ? 'azul' : 'verde'}-bg);color:${cls === 'latoneria' ? '#991B1B' : cls === 'pintura' ? 'var(--amarillo)' : cls === 'mecanica' ? 'var(--azul)' : 'var(--verde)'}">${srv.nombre}</span>
      ${items}
    </div>`;
  }).join('');
}

function onChkChange(key, checked) {
  const extra = document.getElementById('extra-' + key);
  if (extra) extra.classList.toggle('show', checked);
  const mecDiv = document.getElementById('mec-' + key);
  if (mecDiv) {
    mecDiv.classList.toggle('show', checked);
    mecDiv.style.display = checked ? 'block' : 'none';
  }
  const camposDiv = document.getElementById('campos-' + key);
  if (camposDiv) camposDiv.style.display = checked ? 'block' : 'none';
}

function recogerChecklist(containerId) {
  const result = [];
  document.querySelectorAll(`#${containerId} input[type=checkbox]:checked:not(:disabled)`).forEach(chk => {
    const key = chk.value;
    let srvKey = null, etDef = null;
    for (const [sk, sv] of Object.entries(CATALOGO)) {
      const et = sv.etapas.find(e => e.key === key);
      if (et) { srvKey = sk; etDef = et; break; }
    }
    if (!etDef) return;
    const inp = document.querySelector(`#extra-${key} input`);
    const mecSel   = document.getElementById(`mec-sel-${key}`);
    const descEl   = document.getElementById(`desc-et-${key}`);
    const piezasEl = document.getElementById(`piezas-et-${key}`);
    const valorEl  = document.getElementById(`valor-et-${key}`);
    result.push({ 
      key, servicio: srvKey, nombre: etDef.nombre, 
      tercero:     inp?.value?.trim() || null, 
      mecanico_id: mecSel?.value ? parseInt(mecSel.value) : null,
      descripcion: descEl?.value?.trim() || null,
      horas_estimadas: piezasEl?.value ? parseFloat(piezasEl.value) : null,
      valor:       valorEl?.value ? parseFloat(valorEl.value) : null
    });
  });
  return result;
}

async function guardarEtapasNueva() {
  const etapas = recogerChecklist('checklist-nuevo');
  if (!etapas.length) { toast('Selecciona al menos una etapa', 'err'); return; }
  const sinMec = etapas.filter(et => !et.mecanico_id && !et.tercero);
  if (sinMec.length) { toast(`Asigna un mecánico a: ${sinMec.map(e => e.nombre).join(', ')}`, 'err'); return; }
  const sinValor = etapas.filter(et => et.valor == null || et.valor === '');
  if (sinValor.length) { toast(`Ingresa el valor de: ${sinValor.map(e => e.nombre).join(', ')}`, 'err'); return; }
  try {
    for (const et of etapas) {
      const mec = mecanicos.find(m => m.id === et.mecanico_id);
      await api('/etapas', 'POST', {
        orden_id: modalOrdenId, servicio: et.servicio, etapa_key: et.key, etapa: et.nombre,
        tercero: et.tercero || null, mecanico_id: et.mecanico_id || null, tecnico: mec?.nombre || null,
        descripcion: et.descripcion || null,
        horas_estimadas: et.horas_estimadas || null,
        valor: et.valor || null
      }, { Prefer: 'return=minimal' });
    }
    toast('Etapas guardadas ✓');
    document.getElementById('modal-servicios')?.classList.remove('show');

    const ordenData = await api(`/ordenes?id=eq.${modalOrdenId}`).catch(() => []);
    if (ordenData?.[0]) {
      const ord = ordenData[0];
      const primerasPorSrv = {};
      etapas.forEach(et => { if (!primerasPorSrv[et.servicio]) primerasPorSrv[et.servicio] = et; });
      for (const et of Object.values(primerasPorSrv)) {
        if (!et.mecanico_id) continue;
        fetch(N8N_WEBHOOK, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            evento: 'etapa_finalizada', 
            orden: { id: ord.id, placa: ord.placa, propietario: ord.propietario, marca: ord.marca, linea: ord.linea, aseguradora: ord.aseguradora }, 
            etapa_finalizada: null, 
            siguiente_etapa: { id: null, nombre: et.nombre, servicio: et.servicio, mecanico_id: et.mecanico_id, tecnico: mecanicos.find(m => m.id === et.mecanico_id)?.nombre || null }, 
            todas_completadas: false, 
            link: `${window.location.origin}${window.location.pathname}` 
          }) 
        }).catch(() => {});
      }
      const fotosIng = await api(`/fotos_ingreso?orden_id=eq.${modalOrdenId}&order=creado_en.asc&limit=1`).catch(() => []) || [];
      fetch(N8N_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          evento: 'orden_creada', 
          orden: { id: ord.id, placa: ord.placa, propietario: ord.propietario, marca: ord.marca, linea: ord.linea, modelo: ord.modelo, color: ord.color, tipo_cliente: ord.tipo_cliente, aseguradora: ord.aseguradora, nivel_dano: ord.nivel_dano, fecha_entrega_1: ord.fecha_entrega_1 }, 
          etapas: etapas.map(et => ({ servicio: et.servicio, etapa: et.nombre, tecnico: mecanicos.find(m => m.id === et.mecanico_id)?.nombre || et.tercero || 'Sin asignar' })), 
          foto_url: fotosIng[0]?.url || null, 
          link: `${window.location.origin}${window.location.pathname}` 
        }) 
      }).catch(() => {});
    }
    cargarOrdenes(); 
    if (modalOrdenId) abrirOrden(modalOrdenId); 
    modalOrdenId = null;
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// MODAL AGREGAR ETAPAS
// ============================================================
async function abrirModalAgregar() {
  if (!ordenActual) return;
  const [existentes] = await Promise.all([
    api(`/etapas?orden_id=eq.${ordenActual.id}&order=creado_en.asc`).catch(() => []),
    cargarMecanicos(),
  ]);
  buildChecklist('checklist-agregar', Object.keys(CATALOGO), existentes || []);
  const modal = document.getElementById('modal-agregar');
  if (modal) modal.classList.add('show');
}

function cerrarModalAgregar() { 
  const modal = document.getElementById('modal-agregar');
  if (modal) modal.classList.remove('show'); 
}

async function confirmarAgregarEtapas() {
  const etapas = recogerChecklist('checklist-agregar');
  if (!etapas.length) { toast('Selecciona al menos una etapa', 'err'); return; }
  const sinMec = etapas.filter(et => !et.mecanico_id && !et.tercero);
  if (sinMec.length) { toast(`Asigna un mecánico a: ${sinMec.map(e => e.nombre).join(', ')}`, 'err'); return; }
  const sinValor = etapas.filter(et => et.valor == null || et.valor === '');
  if (sinValor.length) { toast(`Ingresa el valor de: ${sinValor.map(e => e.nombre).join(', ')}`, 'err'); return; }
  try {
    for (const et of etapas) {
      const mec = mecanicos.find(m => m.id === et.mecanico_id);
      await api('/etapas', 'POST', { 
        orden_id: ordenActual.id, servicio: et.servicio, etapa_key: et.key, etapa: et.nombre, 
        tercero: et.tercero || null, mecanico_id: et.mecanico_id || null, tecnico: mec?.nombre || null,
        descripcion: et.descripcion || null,
        horas_estimadas: et.horas_estimadas || null,
        valor: et.valor || null
      }, { Prefer: 'return=minimal' });
    }
    toast('Etapas agregadas ✓');
    cerrarModalAgregar();
    if (ordenActual) abrirOrden(ordenActual.id);
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// FOTOS
// ============================================================
async function subirFotos(input, nombre, eid, k) {
  const files = Array.from(input.files);
  if (!files.length) return;
  const prog = document.getElementById(`prog-${k}`);
  let sub = 0;
  for (const file of files) {
    try {
      const ext = file.name.split('.').pop();
      const path = `${ordenActual.id}/etapas/${eid}_${Date.now()}.${ext}`;
      const url = await storageUpload(file, path);
      await api('/fotos_etapas', 'POST', { etapa_id: eid, orden_id: ordenActual.id, etapa_nombre: nombre, url, nombre: file.name }, { Prefer: 'return=minimal' });
      sub++;
      if (prog) prog.textContent = `Subiendo ${sub}/${files.length}...`;
    } catch(e) { toast(`Error: ${file.name}`, 'err'); }
  }
  if (prog) prog.textContent = '';
  input.value = '';
  toast(`${sub} foto(s) subida(s) ✓`);
  if (ordenActual) abrirOrden(ordenActual.id);
}

async function eliminarFoto(fotoId, url) {
  if (!confirm('¿Eliminar esta foto?')) return;
  try {
    await api(`/fotos_etapas?id=eq.${fotoId}`, 'DELETE');
    const path = url.split(`/object/public/${BUCKET}/`)[1];
    if (path) await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${_getBearer()}` } });
    toast('Foto eliminada ✓');
    if (ordenActual) abrirOrden(ordenActual.id);
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// NOVEDADES
// ============================================================
async function guardarNovedad(eid) {
  const motivo = document.getElementById(`nmot-${eid}`)?.value?.trim();
  if (!motivo) { toast('El motivo es obligatorio', 'err'); return; }
  try {
    await api('/novedades', 'POST', { 
      orden_id: ordenActual.id, etapa_id: eid, 
      tipo: document.getElementById(`ntype-${eid}`).value, 
      responsable: document.getElementById(`nresp-${eid}`).value, 
      motivo, desde: new Date().toISOString(),
      valor: parseFloat(document.getElementById(`nvalor-${eid}`)?.value) || null
    }, { Prefer: 'return=minimal' });
    toast('Novedad registrada ✓');
    const input = document.getElementById(`nmot-${eid}`);
    if (input) input.value = '';
    const vinput = document.getElementById(`nvalor-${eid}`);
    if (vinput) vinput.value = '';
    if (ordenActual) abrirOrden(ordenActual.id);
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// APROBACIÓN DE CALIDAD
// ============================================================
async function abrirModalAprobacion(eid, nombre) {
  aprobEtapaId = eid;
  const titulo = document.getElementById('modal-aprob-titulo');
  if (titulo) titulo.textContent = `Calidad — ${nombre}`;
  const obs = document.getElementById('aprob-obs');
  if (obs) obs.value = '';
  document.querySelectorAll('input[name="aprob-estado"]').forEach(r => r.checked = false);
  const hist = await api(`/aprobaciones_etapa?etapa_id=eq.${eid}&order=creado_en.desc`).catch(() => []) || [];
  const histDiv = document.getElementById('aprob-historial');
  const histList = document.getElementById('aprob-historial-lista');
  if (hist.length && histList) {
    histList.innerHTML = hist.map(h => `
      <div class="aprob-box ${h.estado === 'rechazado' ? 'rechazado' : ''}" style="margin-bottom:8px">
        <div class="aprob-box-top">
          <span class="aprob-box-estado">${h.estado === 'aprobado' ? '✓ Aprobado' : '✗ Rechazado'}</span>
          <span class="aprob-box-fecha">${formatTS(h.creado_en)}</span>
        </div>
        <div style="font-size:12px;color:var(--gris-mid)">Por: ${escapeHtml(h.registrado_por)}</div>
        ${h.observacion ? `<div style="font-size:12px;margin-top:4px">${escapeHtml(h.observacion)}</div>` : ''}
      </div>`).join('');
    if (histDiv) histDiv.style.display = 'block';
  } else if (histDiv) {
    histDiv.style.display = 'none';
  }
  const modal = document.getElementById('modal-aprobacion');
  if (modal) modal.classList.add('show');
}

function cerrarModalAprobacion() { 
  const modal = document.getElementById('modal-aprobacion');
  if (modal) modal.classList.remove('show'); 
  aprobEtapaId = null; 
}

async function guardarAprobacion() {
  const estado = document.querySelector('input[name="aprob-estado"]:checked')?.value;
  const obs = document.getElementById('aprob-obs')?.value.trim() || '';
  if (!estado) { toast('Selecciona Aprobado o Rechazado', 'err'); return; }
  try {
    await api('/aprobaciones_etapa', 'POST', { 
      etapa_id: aprobEtapaId, orden_id: ordenActual.id, estado, 
      registrado_por: sesion?.nombre || 'Jefe', observacion: obs || null 
    });
    toast(`Etapa ${estado} ✓`);
    cerrarModalAprobacion();
    if (ordenActual) abrirOrden(ordenActual.id);
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// CAPACIDAD (helper)
// ============================================================
function _refrescarCapacidad() {
  const ok = [true, true, true];
  Promise.all([
    api('/ordenes?estado=eq.Activa&pulmon=eq.false&select=id').catch(() => { ok[0] = false; return []; }),
    api('/ordenes?pulmon=eq.true&pulmon_tipo=eq.interno&select=id').catch(() => { ok[1] = false; return []; }),
    api('/ordenes?pulmon=eq.true&pulmon_tipo=eq.externo&select=id').catch(() => { ok[2] = false; return []; })
  ]).then(([activas, pulmonInterno, pulmonExterno]) => {
    if (ok[0] && ok[1] && ok[2]) actualizarCapacidad(activas.length, pulmonInterno.length, pulmonExterno.length);
  });
}

function _setPulmonUI(activo, tipo) {
  const card  = document.getElementById('pulmon-card');
  const badge = document.getElementById('d-pulmon-badge');
  const btn   = document.getElementById('btn-pulmon');
  if (card)  card.classList.toggle('inactivo', !activo);
  if (badge) {
    if (activo) {
      badge.innerHTML = `En pulmón${tipo ? ` · <strong>${tipo.charAt(0).toUpperCase()+tipo.slice(1)}</strong>` : ''} desde ${formatFecha(ordenActual.pulmon_desde)}`;
      badge.style.color = 'var(--amarillo)';
    } else if (ordenActual.pulmon_fin && ordenActual.pulmon_desde) {
      const tiempo = _calcPulmonTiempo(ordenActual.pulmon_desde, ordenActual.pulmon_fin);
      badge.innerHTML = `<span style="color:var(--verde,#10B981)">✓ Salió de pulmón</span> · estuvo <strong>${tiempo}</strong>${tipo ? ` (${tipo})` : ''}`;
      badge.style.color = 'var(--gris-mid)';
    } else {
      badge.textContent = 'Sin pulmón activo';
      badge.style.color = 'var(--gris-mid)';
    }
  }
  if (btn) btn.textContent = activo ? 'Sacar de pulmón' : 'Activar Pulmón';
}

// ============================================================
// PULMÓN
// ============================================================
function _calcPulmonTiempo(desde, fin) {
  const min = Math.round((new Date(fin) - new Date(desde)) / 60000);
  if (min < 1) return '< 1m';
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function togglePulmon() {
  if (ordenActual.pulmon) {
    _desactivarPulmon();
  } else {
    document.getElementById('modal-pulmon-tipo')?.classList.add('show');
  }
}

function cerrarModalPulmonTipo() {
  document.getElementById('modal-pulmon-tipo')?.classList.remove('show');
}

async function activarPulmonCon(tipo) {
  cerrarModalPulmonTipo();
  const ahora = new Date().toISOString();
  const patch = { pulmon: true, pulmon_desde: ahora, pulmon_tipo: tipo };
  try {
    await api(`/ordenes?id=eq.${ordenActual.id}`, 'PATCH', patch);
    ordenActual.pulmon = true;
    ordenActual.pulmon_desde = ahora;
    ordenActual.pulmon_tipo = tipo;
    _setPulmonUI(true, tipo);
    toast(`Orden en pulmón ${tipo.charAt(0).toUpperCase()+tipo.slice(1)} ✓`);
    _refrescarCapacidad();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function _desactivarPulmon() {
  const ahora = new Date().toISOString();
  // Guardamos pulmon_fin y NO borramos pulmon_desde — queda el historial
  const patch = { pulmon: false, pulmon_fin: ahora };
  try {
    await api(`/ordenes?id=eq.${ordenActual.id}`, 'PATCH', patch);
    ordenActual.pulmon     = false;
    ordenActual.pulmon_fin = ahora;
    // pulmon_desde y pulmon_tipo se conservan para mostrar historial
    _setPulmonUI(false, ordenActual.pulmon_tipo || '');
    toast('Pulmón desactivado ✓');
    _refrescarCapacidad();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// COTIZACIÓN (subir PDF)
// ============================================================
async function subirCotizacion(input) {
  const file = input.files[0];
  if (!file) return;
  const prog = document.getElementById('prog-cotizacion');
  if (prog) prog.textContent = 'Subiendo...';
  try {
    const ext = file.name.split('.').pop();
    const path = `${ordenActual.id}/cotizacion/cotizacion_${Date.now()}.${ext}`;
    const url = await storageUpload(file, path);
    await api(`/ordenes?id=eq.${ordenActual.id}`, 'PATCH', { cotizacion_url: url });
    ordenActual.cotizacion_url = url;
    const linkDiv = document.getElementById('d-cotizacion-link');
    if (linkDiv) linkDiv.innerHTML = `<a href="${url}" target="_blank" style="color:var(--azul-mid);text-decoration:underline">Ver PDF de cotización →</a>`;
    if (prog) prog.textContent = '';
    input.value = '';
    toast('Cotización subida ✓');
    fetch(N8N_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        evento: 'cotizacion_subida', 
        orden: { id: ordenActual.id, placa: ordenActual.placa, propietario: ordenActual.propietario, marca: ordenActual.marca, linea: ordenActual.linea, aseguradora: ordenActual.aseguradora }, 
        cotizacion_url: url, 
        link: `${window.location.origin}${window.location.pathname}` 
      }) 
    }).catch(() => {});
  } catch(e) { 
    if (prog) prog.textContent = ''; 
    toast('Error subiendo PDF: ' + e.message, 'err'); 
  }
}

// ============================================================
// ESTADO ORDEN (JEFE)
// ============================================================
async function cambiarEstado(v) {
  try { 
    const patch = { estado: v };
    if (v === 'Entregada') patch.entregada_en = new Date().toISOString();
    await api(`/ordenes?id=eq.${ordenActual.id}`, 'PATCH', patch); 
    ordenActual.estado = v; 
    toast(`Estado: ${v} ✓`); 
    cargarOrdenes(); 
    if (ordenActual) abrirOrden(ordenActual.id); 
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// ============================================================
// MECÁNICOS (cargar lista)
// ============================================================
async function cargarMecanicos() {
  try {
    mecanicos = await api('/mecanicos?activo=eq.true&order=nombre.asc') || [];
  } catch(e) { 
    mecanicos = []; 
  }
}
// ============================================================
// NAVEGACIÓN JEFE
// ============================================================
function montarJefe() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = `
      <button class="nav-item" id="nav-dashboard" onclick="navJefe('dashboard')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        <span class="nav-label">Estado del taller</span>
      </button>
      <button class="nav-item active" id="nav-ordenes" onclick="navJefe('ordenes')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <span class="nav-label">Todas las órdenes</span>
      </button>
      <button class="nav-item" id="nav-nueva" onclick="navJefe('nueva')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
        <span class="nav-label">Nueva orden</span>
      </button>
      <button class="nav-item" id="nav-cotizaciones" onclick="navJefe('cotizaciones')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
        <span class="nav-label">Cotizaciones</span>
      </button>
      <button class="nav-item" id="nav-calendario" onclick="navJefe('calendario')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span class="nav-label">Calendario</span>
      </button>
      <button class="nav-item" id="nav-mecanicos" onclick="navJefe('mecanicos')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        <span class="nav-label">Mecánicos</span>
      </button>
      <button class="nav-item" id="nav-repuestos" onclick="navJefe('repuestos')" style="position:relative">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        <span class="nav-label">Repuestos</span>
        <span id="badge-repuestos" style="display:none;position:absolute;top:6px;right:8px;background:var(--rojo);color:white;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;line-height:16px;text-align:center">0</span>
      </button>
      <button class="nav-item" id="nav-reportes" onclick="navJefe('reportes')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <span class="nav-label">Reportes</span>
      </button>
      <button class="nav-item" id="nav-flotillas" onclick="navJefe('flotillas')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        <span class="nav-label">Vehículos</span>
      </button>
    `;
  }

  const bottomNav = document.getElementById('bottom-nav-inner');
  if (bottomNav) {
    bottomNav.innerHTML = `
      <button class="bnav-item" id="bnav-dashboard" onclick="navJefe('dashboard')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        <span>Taller</span>
      </button>
      <button class="bnav-item active" id="bnav-ordenes" onclick="navJefe('ordenes')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <span>Órdenes</span>
      </button>
      <button class="bnav-item" id="bnav-nueva" onclick="navJefe('nueva')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
        <span>Nueva</span>
      </button>
      <button class="bnav-item" id="bnav-cotizaciones" onclick="navJefe('cotizaciones')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
        <span>Cotiz.</span>
      </button>
      <button class="bnav-item" id="bnav-mas" onclick="openSidebar()">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <span>Más</span>
      </button>
    `;
  }

  // Cargar la lista de mecánicos para los selects
  cargarMecanicos().finally(() => {
    navJefe('dashboard');
  });
  
  // Cargar capacidad al inicio
  _refrescarCapacidad();
  setTimeout(() => { if (typeof actualizarBadgeRepuestos === 'function') actualizarBadgeRepuestos(); }, 1500);

  // Activar Realtime (pendiente de implementar)
  if (typeof iniciarRealtime === 'function') iniciarRealtime();
}

function navJefe(pag) {
  // Actualizar clases active en sidebar y bottom nav
  const pages = ['ordenes', 'nueva', 'dashboard', 'cotizaciones', 'calendario', 'mecanicos', 'repuestos', 'reportes', 'flotillas'];
  pages.forEach(p => {
    const navBtn = document.getElementById('nav-' + p);
    const bnavBtn = document.getElementById('bnav-' + p);
    if (navBtn) navBtn.classList.remove('active');
    if (bnavBtn) bnavBtn.classList.remove('active');
  });
  
  const currentNav = document.getElementById('nav-' + pag);
  const currentBnav = document.getElementById('bnav-' + pag);
  if (currentNav) currentNav.classList.add('active');
  if (currentBnav) currentBnav.classList.add('active');

  // Ocultar/mostrar botón de detalle si existe
  const navDetalle = document.getElementById('nav-detalle');
  if (navDetalle && pag !== 'detalle') navDetalle.style.display = 'none';

  // Mostrar la página correspondiente
  let pagId = '';
  let titulo = '';
  
  switch(pag) {
    case 'ordenes':
      pagId = 'pag-ordenes';
      titulo = 'Órdenes';
      break;
    case 'nueva':
      pagId = 'pag-nueva';
      titulo = 'Nueva Orden';
      resetNuevaOrden();
      setTimeout(() => { if (typeof recargarListasNuevaOrden === 'function') recargarListasNuevaOrden(); }, 50);
      break;
    case 'dashboard':
      pagId = 'pag-dashboard';
      titulo = 'Estado del Taller';
      setTimeout(() => { if (typeof switchDashTab === 'function') switchDashTab('mes'); }, 50);
      break;
    case 'cotizaciones':
      pagId = 'pag-cotizaciones';
      titulo = 'Cotizaciones';
      cargarCotizaciones();
      break;
    case 'calendario':
      pagId = 'pag-calendario';
      titulo = 'Calendario de Entregas';
      cargarCalendario();
      break;
    case 'mecanicos':
      pagId = 'pag-mecanicos';
      titulo = 'Mecánicos';
      cargarMecanicosVista();
      break;
    case 'repuestos':
      pagId = 'pag-repuestos-jefe';
      titulo = 'Repuestos';
      setTimeout(() => { if (typeof cargarRepuestosJefe === 'function') cargarRepuestosJefe(); }, 50);
      break;
    case 'reportes':
      pagId = 'pag-reportes';
      titulo = 'Reportes';
      setTimeout(() => { if (typeof montarReportes === 'function') montarReportes(); }, 50);
      break;
    case 'flotillas':
      pagId = 'pag-flotillas';
      titulo = 'Flotillas';
      setTimeout(() => { if (typeof montarFlotillas === 'function') montarFlotillas(); }, 50);
      break;
    default:
      pagId = 'pag-ordenes';
      titulo = 'Órdenes';
  }

  mostrarPagina(pagId);
  
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titulo;
  
  const actionsEl = document.getElementById('topbar-actions');
  if (actionsEl) actionsEl.innerHTML = '';
  
  // Si es la página de órdenes, cargar las órdenes
  if (pag === 'ordenes') cargarOrdenes();
  
  closeSidebar();
}
// ═══════════════════════════════════════════════════════════
// CALENDARIO DE ENTREGAS
// ═══════════════════════════════════════════════════════════
let calMesActual = new Date();
calMesActual.setDate(1);
calMesActual.setHours(0,0,0,0);

async function cargarCalendario() {
  const cont = document.getElementById('pag-calendario');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';
  try {
    const ordenes = await api(
      `/ordenes?select=id,placa,marca,linea,propietario,estado,pulmon,fecha_entrega_1,fecha_entrega_2&or=(estado.eq.Activa,pulmon.eq.true)&order=fecha_entrega_1.asc`
    ).catch(() => []) || [];
    renderCalendario(cont, ordenes, calMesActual);
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

function renderCalendario(cont, ordenes, mesDate) {
  const año  = mesDate.getFullYear();
  const mes  = mesDate.getMonth();
  const hoy  = new Date(); hoy.setHours(0,0,0,0);

  const mesLabel = mesDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const diasMes  = new Date(año, mes + 1, 0).getDate();
  const primerDia = new Date(año, mes, 1).getDay(); // 0=dom
  const offset = (primerDia + 6) % 7; // lunes primero

  // Indexar órdenes por fecha (fecha_entrega_1 o fecha_entrega_2)
  const porDia = {};
  ordenes.forEach(o => {
    [o.fecha_entrega_1, o.fecha_entrega_2].filter(Boolean).forEach((f, fi) => {
      const d = new Date(f);
      if (d.getFullYear() === año && d.getMonth() === mes) {
        const key = d.getDate();
        if (!porDia[key]) porDia[key] = [];
        porDia[key].push({ ...o, esFecha2: fi === 1 });
      }
    });
  });

  // Build grid
  const diasSem = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const totalMes = Object.values(porDia).reduce((sum, items) => sum + items.length, 0);
  const headHtml = diasSem.map(d => `<div class="cal-head">${d}</div>`).join('');

  let celdas = '';
  // Celdas vacías antes del primer día
  for (let i = 0; i < offset; i++) celdas += `<div class="cal-cell cal-empty"></div>`;

  for (let d = 1; d <= diasMes; d++) {
    const fecha  = new Date(año, mes, d);
    const esHoy  = fecha.getTime() === hoy.getTime();
    const ords   = porDia[d] || [];
    const pasado = fecha < hoy;

    const ordsHtml = ords.slice(0, 4).map(o => {
      const urgente = !o.esFecha2 && new Date(o.fecha_entrega_1) <= hoy;
      const color = urgente ? '#DC2626' : o.esFecha2 ? '#D97706' : '#2A5298';
      const bg    = urgente ? '#FEE2E2' : o.esFecha2 ? '#FEF3C7' : '#EBF2FF';
      return `<div class="cal-orden" style="background:${bg};color:${color};border-left-color:${color}" onclick="abrirOrden(${o.id})">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
          <span style="font-family:'DM Mono',monospace;font-weight:700;font-size:11px">${escapeHtml(o.placa) || '---'}</span>
          ${o.esFecha2 ? '<span style="font-size:9px;font-weight:800;opacity:0.75">F2</span>' : ''}
        </div>
        <div class="cal-orden-meta">${[o.marca,o.linea].filter(Boolean).map(escapeHtml).join(' ') || escapeHtml(o.propietario) || 'Orden activa'}</div>
      </div>`;
    }).join('');
    const masHtml = ords.length > 4
      ? `<div class="cal-mas">+${ords.length-4} mas</div>` : '';

    celdas += `<div class="cal-cell${esHoy?' cal-hoy':''}${pasado&&!esHoy?' cal-pasado':''}${ords.length?' cal-con-ordenes':''}">
      <div class="cal-dia"><span>${d}</span>${ords.length ? `<strong>${ords.length}</strong>` : ''}</div>
      ${ordsHtml}${masHtml}
    </div>`;
  }

  cont.innerHTML = `
    <div class="cal-shell">
    <div class="cal-nav">
      <button class="btn btn-ghost btn-sm" onclick="calCambiarMes(-1)">← Anterior</button>
      <div>
        <div class="cal-mes-titulo">${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}</div>
        <div style="font-size:12px;color:var(--gris-mid);text-align:center">${totalMes} entregas programadas</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="calCambiarMes(1)">Siguiente →</button>
    </div>
    <div class="cal-leyenda">
      <span class="cal-ley-dot" style="background:#EBF2FF;border:1px solid #2A5298"></span><span style="font-size:11px;color:var(--gris-mid)">Fecha 1</span>
      <span class="cal-ley-dot" style="background:#FEF3C7;border:1px solid #D97706;margin-left:12px"></span><span style="font-size:11px;color:var(--gris-mid)">Fecha 2</span>
      <span class="cal-ley-dot" style="background:#FEE2E2;border:1px solid #DC2626;margin-left:12px"></span><span style="font-size:11px;color:var(--gris-mid)">Vencida</span>
    </div>
    <div class="cal-grid">
      ${headHtml}
      ${celdas}
    </div>
    </div>
  `;
}

async function calCambiarMes(delta) {
  calMesActual.setMonth(calMesActual.getMonth() + delta);
  const cont = document.getElementById('pag-calendario');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';
  try {
    const ordenes = await api(
      `/ordenes?select=id,placa,marca,linea,propietario,estado,pulmon,fecha_entrega_1,fecha_entrega_2&or=(estado.eq.Activa,pulmon.eq.true)`
    ).catch(() => []) || [];
    renderCalendario(cont, ordenes, calMesActual);
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// VISTA MECÁNICOS
// ═══════════════════════════════════════════════════════════
async function cargarMecanicosVista() {
  const cont = document.getElementById('pag-mecanicos');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';
  try {
    const [mecsData, etapasActivas] = await Promise.all([
      api('/mecanicos?activo=eq.true&order=nombre.asc').catch(() => []) || [],
      api('/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,etapa,servicio,mecanico_id,inicio').catch(() => []) || []
    ]);

    const ids = [...new Set(etapasActivas.map(e => e.orden_id))];
    const ordenes = ids.length
      ? await api(`/ordenes?id=in.(${ids.join(',')})&select=id,placa,marca,linea`).catch(() => []) || []
      : [];

    const srvColor = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };

    cont.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-ghost btn-sm" onclick="abrirReporteTodosTecnicos()">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Reporte general de técnicos
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
        ${mecsData.map(m => {
          const etapas = etapasActivas.filter(e => e.mecanico_id === m.id);
          const etapsHtml = etapas.length
            ? etapas.map(e => {
                const ord = ordenes.find(o => o.id === e.orden_id);
                const color = srvColor[e.servicio] || '#6B7280';
                const mins  = e.inicio ? Math.round((new Date() - new Date(e.inicio)) / 60000) : 0;
                const dur   = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${Math.floor(mins/1440)}d`;
                return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--gris-borde)">
                  <div style="width:3px;height:32px;background:${color};border-radius:99px;flex-shrink:0"></div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;font-weight:600;color:var(--texto)">${escapeHtml(e.etapa)||'—'}</div>
                    <div style="font-size:11px;color:var(--gris-mid);font-family:'DM Mono',monospace">${escapeHtml(ord?.placa)||'—'} · ${[ord?.marca,ord?.linea].filter(Boolean).map(escapeHtml).join(' ')||'—'}</div>
                  </div>
                  <div style="font-size:11px;color:var(--gris-mid);font-family:'DM Mono',monospace;flex-shrink:0">${dur}</div>
                </div>`;
              }).join('')
            : `<div style="font-size:12px;color:var(--gris-mid);padding:12px 0;text-align:center">Sin etapas activas</div>`;

          return `<div style="background:white;border:1px solid var(--gris-borde);border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
            <div style="padding:12px 16px;border-bottom:1px solid var(--gris-borde);display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--azul-light);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:var(--azul);flex-shrink:0">${escapeHtml(m.nombre.charAt(0).toUpperCase())}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:14px">${escapeHtml(m.nombre)}</div>
                <div style="font-size:11px;color:var(--gris-mid)">${escapeHtml(m.rol)||'Técnico'} · ${etapas.length} etapa${etapas.length!==1?'s':''} activa${etapas.length!==1?'s':''}</div>
              </div>
              <button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();abrirReporteTecnico(${m.id})" title="Reporte del técnico">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Reporte
              </button>
            </div>
            <div style="padding:0 16px 8px">${etapsHtml}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}
// ═══════════════════════════════════════════════════════════
// DRAG & DROP — PANELES DE SERVICIO
// ═══════════════════════════════════════════════════════════
let srvDragSrc = null;

function srvDragStart(e, srvKey) {
  srvDragSrc = srvKey;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.stopPropagation();
}
function srvDragOver(e) {
  e.preventDefault(); e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('srv-drag-over');
}
function srvDragLeave(e) {
  e.stopPropagation();
  e.currentTarget.classList.remove('srv-drag-over');
}
function srvDragDrop(e, targetSrv, ordenId) {
  e.preventDefault(); e.stopPropagation();
  e.currentTarget.classList.remove('srv-drag-over');
  if (!srvDragSrc || srvDragSrc === targetSrv) return;
  const container = document.getElementById('srv-drag-container');
  if (!container) return;
  const panels = [...container.querySelectorAll('.srv-panel[data-srv]')];
  const srcEl = panels.find(p => p.dataset.srv === srvDragSrc);
  const tgtEl = panels.find(p => p.dataset.srv === targetSrv);
  if (!srcEl || !tgtEl) return;
  const srcRect = srcEl.getBoundingClientRect();
  const tgtRect = tgtEl.getBoundingClientRect();
  if (srcRect.top < tgtRect.top) {
    tgtEl.parentNode.insertBefore(srcEl, tgtEl.nextSibling);
  } else {
    tgtEl.parentNode.insertBefore(srcEl, tgtEl);
  }
  const newOrder = [...container.querySelectorAll('.srv-panel[data-srv]')].map(p => p.dataset.srv);
  localStorage.setItem('srv_orden_' + ordenId, JSON.stringify(newOrder));
}
function srvDragEnd(e) {
  e.stopPropagation();
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.srv-panel').forEach(p => p.classList.remove('srv-drag-over'));
  srvDragSrc = null;
}

// ═══════════════════════════════════════════════════════════
// DRAG & DROP — ETAPAS DENTRO DE UN SERVICIO
// ═══════════════════════════════════════════════════════════
let etapaDragSrc = null;
let etapaDragSrvKey = null;

function etapaDragStart(e, eid, srvKey) {
  etapaDragSrc = eid;
  etapaDragSrvKey = srvKey;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.stopPropagation();
}
function etapaDragOver(e) {
  e.preventDefault(); e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('etapa-drag-over');
}
function etapaDragLeave(e) {
  e.stopPropagation();
  e.currentTarget.classList.remove('etapa-drag-over');
}
function etapaDragDrop(e, targetEid, srvKey, ordenId) {
  e.preventDefault(); e.stopPropagation();
  e.currentTarget.classList.remove('etapa-drag-over');
  if (!etapaDragSrc || etapaDragSrc === targetEid || etapaDragSrvKey !== srvKey) return;
  const container = document.getElementById('edc-' + srvKey);
  if (!container) return;
  const cards = [...container.querySelectorAll('.etapa-card[data-eid]')];
  const srcEl = cards.find(c => parseInt(c.dataset.eid) === etapaDragSrc);
  const tgtEl = cards.find(c => parseInt(c.dataset.eid) === targetEid);
  if (!srcEl || !tgtEl) return;
  const srcRect = srcEl.getBoundingClientRect();
  const tgtRect = tgtEl.getBoundingClientRect();
  if (srcRect.top < tgtRect.top) {
    tgtEl.parentNode.insertBefore(srcEl, tgtEl.nextSibling);
  } else {
    tgtEl.parentNode.insertBefore(srcEl, tgtEl);
  }
  const newOrder = [...container.querySelectorAll('.etapa-card[data-eid]')].map(c => parseInt(c.dataset.eid));
  localStorage.setItem('etapa_orden_' + ordenId + '_' + srvKey, JSON.stringify(newOrder));
}
function etapaDragEnd(e) {
  e.stopPropagation();
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.etapa-card').forEach(c => c.classList.remove('etapa-drag-over'));
  etapaDragSrc = null;
  etapaDragSrvKey = null;
}

// ═══════════════════════════════════════════════════════════
// VALOR DE ETAPA
// ═══════════════════════════════════════════════════════════
async function patchValor(eid, k) {
  const val = parseFloat(document.getElementById(`val-${k}`)?.value) || null;
  await api(`/etapas?id=eq.${eid}`, 'PATCH', { valor: val }).catch(() => {});
}
// ═══════════════════════════════════════════════════════════
// MODAL CALENDARIO — info de orden al hacer click
// ═══════════════════════════════════════════════════════════
async function abrirCalModal(ordenId) {
  let modal = document.getElementById('modal-cal-orden');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-cal-orden';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal" style="max-width:480px">
      <div class="modal-header">
        <h2 id="mcal-titulo">Orden</h2>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('modal-cal-orden').classList.remove('show')">✕</button>
      </div>
      <div class="modal-body" id="mcal-body"><div class="loading-state">Cargando...</div></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cal-orden').classList.remove('show')">Cerrar</button>
        <button class="btn btn-primary" id="mcal-btn-abrir">Ver orden completa</button>
      </div>
    </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    document.body.appendChild(modal);
  }
  modal.classList.add('show');
  document.getElementById('mcal-body').innerHTML = '<div class="loading-state">Cargando...</div>';
  try {
    const [orden, etapas] = await Promise.all([
      api(`/ordenes?id=eq.${ordenId}`).then(d => d[0]),
      api(`/etapas?orden_id=eq.${ordenId}&order=creado_en.asc`).catch(()=>[]) || []
    ]);
    const total = etapas.length;
    const comp  = etapas.filter(e => e.fin).length;
    const pct   = total ? Math.round((comp/total)*100) : 0;
    const activa = etapas.find(e => e.inicio && !e.fin);
    const fmt = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
    const totalVal = etapas.reduce((s,e) => s+(e.valor||0), 0);
    const srvColor = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };
    const srvs = [...new Set(etapas.map(e=>e.servicio).filter(Boolean))];

    document.getElementById('mcal-titulo').textContent = orden.placa;
    document.getElementById('mcal-btn-abrir').onclick = () => {
      modal.classList.remove('show');
      abrirOrden(ordenId);
    };
    document.getElementById('mcal-body').innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="flex:1">
          <div style="font-size:13px;color:var(--gris-mid)">${[orden.marca,orden.linea,orden.modelo].filter(Boolean).map(escapeHtml).join(' ')||'—'}</div>
          <div style="font-size:12px;color:var(--gris-mid);margin-top:2px;display:flex;align-items:center;gap:4px">${orden.aseguradora?ico('building',12)+' '+escapeHtml(orden.aseguradora):''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:700;font-family:'DM Mono',monospace;color:${pct===100?'var(--verde)':'var(--azul)'}">${pct}%</div>
          <div style="font-size:11px;color:var(--gris-mid)">${comp}/${total} etapas</div>
        </div>
      </div>
      <div style="height:6px;background:var(--gris-borde);border-radius:99px;overflow:hidden;margin-bottom:16px">
        <div style="height:100%;width:${pct}%;background:${pct===100?'var(--verde)':'var(--azul-mid)'};border-radius:99px;transition:width 0.4s"></div>
      </div>
      <div class="info-chips" style="margin-bottom:14px">
        <div class="info-chip"><div class="info-chip-label">Estado</div><div class="info-chip-val">${orden.pulmon?'En Pulmón':orden.estado||'Activa'}</div></div>
        <div class="info-chip"><div class="info-chip-label">Ingreso</div><div class="info-chip-val">${formatFecha(orden.creado_en)}</div></div>
        <div class="info-chip"><div class="info-chip-label">Entrega 1</div><div class="info-chip-val">${formatFecha(orden.fecha_entrega_1)||'—'}</div></div>
        <div class="info-chip"><div class="info-chip-label">Entrega 2</div><div class="info-chip-val">${formatFecha(orden.fecha_entrega_2)||'—'}</div></div>
        ${totalVal ? `<div class="info-chip"><div class="info-chip-label">Valor MO</div><div class="info-chip-val" style="color:var(--verde);font-weight:700">${fmt(totalVal)}</div></div>` : ''}
      </div>
      ${activa ? `<div style="padding:10px 14px;background:var(--azul-light);border-radius:6px;margin-bottom:10px;font-size:13px">
        <span style="color:var(--gris-mid)">Etapa actual:</span> <strong>${escapeHtml(activa.etapa)}</strong>${activa.tecnico?` · ${ico('user',12)} ${escapeHtml(activa.tecnico)}`:''}
      </div>` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${srvs.map(s=>`<span style="background:${srvColor[s]||'#6B7280'}15;color:${srvColor[s]||'#6B7280'};border:1px solid ${srvColor[s]||'#6B7280'}30;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600">${CATALOGO[s]?.nombre||s}</span>`).join('')}
      </div>`;
  } catch(e) {
    document.getElementById('mcal-body').innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// VISTA DE ORDEN PARA MECÁNICO (filtrada)
// ═══════════════════════════════════════════════════════════
async function abrirOrdenMecanico(id) {
  mostrarPagina('pag-mec-orden');
  document.getElementById('topbar-title').textContent = 'Detalle de Orden';
  const cont = document.getElementById('mec-orden-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';
  try {
    const [orden, todasEtapas, fotosEt, novedades] = await Promise.all([
      api(`/ordenes?id=eq.${id}`).then(d => d[0]),
      api(`/etapas?orden_id=eq.${id}&order=creado_en.asc`).catch(()=>[]) || [],
      api(`/fotos_etapas?orden_id=eq.${id}&order=creado_en.desc`).catch(()=>[]) || [],
      api(`/novedades?orden_id=eq.${id}&order=creado_en.desc`).catch(()=>[]) || []
    ]);

    // Solo etapas del mecánico actual
    const misEtapas = todasEtapas.filter(e => e.mecanico_id === sesion.id);
    const total = todasEtapas.length;
    const comp  = todasEtapas.filter(e => e.fin).length;
    const pct   = total ? Math.round((comp/total)*100) : 0;
    const circ  = 2 * Math.PI * 22;

    const tlHtml = todasEtapas.map((e,i) => {
      const done = !!e.fin, active = !!e.inicio && !e.fin;
      const cls = done ? 'done' : active ? 'active' : 'pending';
      return `<div class="timeline-step ${done?'done':''}">
        <div class="timeline-dot ${cls}">${done?'✓':active?'●':(i+1)}</div>
        <div class="timeline-label ${cls}">${escapeHtml(e.etapa)||'—'}</div>
      </div>`;
    }).join('');

    // Render solo mis etapas
    const etapasHtml = misEtapas.map(e => {
      const k = kid(e.id);
      const badge = !e.inicio ? 'Pendiente' : e.fin ? 'Completada' : 'En proceso';
      const bCls  = !e.inicio ? 'pendiente' : e.fin ? 'completada' : 'iniciada';
      const eFotos = fotosEt.filter(f => f.etapa_id === e.id);
      const eNovs  = novedades.filter(n => n.etapa_id === e.id);
      let acc = '';
      if (!e.inicio) acc = `<button class="btn btn-success btn-sm" data-eid="${e.id}" data-etapa="${escapeHtml(e.etapa||'')}" data-oid="${id}" onclick="mecIniciarEtapa(+this.dataset.eid,this.dataset.etapa,+this.dataset.oid)">▶ Iniciar</button>`;
      else if (!e.fin) acc = `<button class="btn btn-danger btn-sm" data-eid="${e.id}" data-etapa="${escapeHtml(e.etapa||'')}" data-srv="${escapeHtml(e.servicio||'')}" data-oid="${id}" onclick="mecFinalizarEtapaDetalle(+this.dataset.eid,this.dataset.etapa,this.dataset.srv,+this.dataset.oid)">■ Finalizar</button>`;

      const fotosHtml = eFotos.map(f=>`<div class="foto-thumb" data-url="${escapeHtml(f.url)}" onclick="abrirLightbox(this.dataset.url)"><img src="${escapeHtml(f.url)}" alt="" loading="lazy"></div>`).join('');
      const novsHtml = eNovs.length ? eNovs.map(n=>`<div class="novedad-item">
        <div class="novedad-item-top"><span class="novedad-tipo ${escapeHtml((n.tipo||'').toLowerCase())}">${escapeHtml(n.tipo)}</span><span class="novedad-fecha">${formatTS(n.creado_en)}</span></div>
        <div class="novedad-motivo">${escapeHtml(n.motivo)||'—'}</div>
        ${n.valor?`<div style="font-size:12px;font-weight:600;color:var(--rojo);margin-top:2px;display:flex;align-items:center;gap:4px">${ico('money',12)} ${new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n.valor)}</div>`:''}
      </div>`).join('') : '<div style="font-size:12px;color:var(--gris-mid)">Sin novedades.</div>';

      return `<div class="etapa-card" style="margin-bottom:12px">
        <div class="etapa-header" onclick="toggleEtapa('meb-${k}')">
          <div style="flex:1"><div class="etapa-nombre">${escapeHtml(e.etapa)||'—'}</div></div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="badge badge-${bCls}">${badge}</span>
            ${acc}
          </div>
        </div>
        <div class="etapa-body" id="meb-${k}">
          <div class="timestamps" style="margin-bottom:12px">
            <div class="ts-chip">Inicio: <strong>${e.inicio?formatTS(e.inicio):'—'}</strong></div>
            <div class="ts-chip">Fin: <strong>${e.fin?formatTS(e.fin):'—'}</strong></div>
          </div>
          <div class="fotos-section">
            <label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gris-mid)">Fotos (${eFotos.length})</label>
            <div class="fotos-grid" style="margin-top:6px">${fotosHtml}</div>
            <div class="upload-zone" onclick="document.getElementById('mec-fi2-${k}').click()" style="margin-top:8px">
              <input type="file" id="mec-fi2-${k}" accept="image/*" multiple data-eid="${e.id}" data-etapa="${escapeHtml(e.etapa||'')}" data-oid="${id}" onchange="mecSubirFotos(this,+this.dataset.eid,this.dataset.etapa,+this.dataset.oid)">
              <div style="opacity:0.45">${ico('camera', 20)}</div><p>Subir fotos</p>
              <div class="upload-prog" id="mec-prog2-${k}"></div>
            </div>
          </div>
          <div class="novedad-section" style="margin-top:14px">
            <div class="novedad-section-titulo">Novedades</div>
            <div>${novsHtml}</div>
            <div class="grid-2" style="margin-top:10px">
              <div class="field"><label>Tipo</label>
                <select id="mec2-ntype-${e.id}">
                  <option value="Detenido">Detenido</option>
                  <option value="Reproceso">Reproceso</option>
                  <option value="Garantia">Garantía</option>
                </select>
              </div>
              <div class="field"><label>Valor adicional COP</label>
                <input id="mec2-nvalor-${e.id}" type="number" step="1000" min="0" placeholder="0 (opcional)">
              </div>
              <div class="field full"><label>Motivo</label>
                <textarea id="mec2-nmot-${e.id}" placeholder="Describe la novedad..." style="min-height:52px"></textarea>
              </div>
            </div>
            <div class="btn-row" style="margin-top:8px">
              <button class="btn btn-danger btn-sm" onclick="mecGuardarNovedadDetalle(${e.id},${id})">Guardar novedad</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    cont.innerHTML = `
      <button class="back-btn" onclick="navMec('ordenes')">← Volver</button>
      <div class="detalle-header-card" style="margin-bottom:16px">
        <div class="detalle-placa-row">
          <div>
            <div class="detalle-placa">${escapeHtml(orden.placa)}</div>
            <div class="detalle-vehiculo">${[orden.marca,orden.linea,orden.modelo,orden.color].filter(Boolean).map(escapeHtml).join(' · ')||'—'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
            <span class="badge badge-${orden.pulmon?'pulmon':(orden.estado||'activa').toLowerCase()}">${orden.pulmon?'En Pulmón':escapeHtml(orden.estado)||'Activa'}</span>
            <button class="btn btn-primary btn-sm" onclick="abrirModalSolicitudRepuesto(${id},null,'Orden #${id}')">+ Solicitar repuesto</button>
          </div>
        </div>
        <div class="donut-section">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle class="donut-track" cx="28" cy="28" r="22"/>
            <circle class="donut-fill ${pct===100?'completa':'proceso'}" cx="28" cy="28" r="22" style="stroke-dasharray:${(pct/100)*circ} ${circ}"/>
            <text class="donut-pct" x="28" y="32" text-anchor="middle">${pct}%</text>
          </svg>
          <div class="donut-info">
            <div class="donut-label">Progreso general</div>
            <div class="donut-val">${comp} / ${total} etapas</div>
            <div class="donut-label" style="margin-top:4px">Fechas de entrega</div>
            <div style="font-size:13px;font-weight:600">${formatFecha(orden.fecha_entrega_1)||'—'}${orden.fecha_entrega_2?' / '+formatFecha(orden.fecha_entrega_2):''}</div>
          </div>
        </div>
        <div class="timeline-wrap"><div class="etapas-timeline">${tlHtml}</div></div>
      </div>
      <div class="seccion-titulo" style="margin-bottom:12px">Mis etapas en esta orden</div>
      ${misEtapas.length ? etapasHtml : '<div class="empty-state"><p>No tenés etapas asignadas en esta orden.</p></div>'}`;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

async function mecFinalizarEtapaDetalle(eid, nombre, servicio, oid) {
  try {
    const repPend = await api(`/solicitudes_repuesto?etapa_id=eq.${eid}&estado=in.(pendiente_jefe,enviado_repuestos,cotizado,pedido)&select=id,repuesto`).catch(()=>[]) || [];
    if (repPend.length) {
      toast(`No puedes finalizar. Hay ${repPend.length} repuesto(s) pendiente(s): ${repPend.map(r=>r.repuesto).join(', ')}`, 'err');
      return;
    }
    await api(`/etapas?id=eq.${eid}`, 'PATCH', { fin: new Date().toISOString() });
    toast(`${nombre} finalizada ✓`);
    const etapasOrden = await api(`/etapas?orden_id=eq.${oid}&order=creado_en.asc`);
    const etapaActual = etapasOrden.find(e => e.id === eid);
    const todasComp   = etapasOrden.every(e => e.fin || e.id === eid);
    const orden = await api(`/ordenes?id=eq.${oid}`).then(d=>d[0]).catch(()=>({}));
    fetch(N8N_WEBHOOK, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ evento: todasComp?'orden_completada':'etapa_finalizada',
        orden: {id:oid,placa:orden.placa,propietario:orden.propietario,marca:orden.marca,linea:orden.linea},
        etapa_finalizada: {id:eid,nombre,servicio:etapaActual?.servicio||servicio,tecnico:etapaActual?.tecnico||null},
        todas_completadas:todasComp, link:`${window.location.origin}${window.location.pathname}`})
    }).catch(()=>{});
    abrirOrdenMecanico(oid);
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

async function mecGuardarNovedadDetalle(eid, oid) {
  const motivo = document.getElementById(`mec2-nmot-${eid}`)?.value?.trim();
  if (!motivo) { toast('El motivo es obligatorio', 'err'); return; }
  try {
    await api('/novedades', 'POST', {
      orden_id: oid, etapa_id: eid,
      tipo: document.getElementById(`mec2-ntype-${eid}`).value,
      responsable: sesion.nombre,
      motivo, desde: new Date().toISOString(),
      valor: parseFloat(document.getElementById(`mec2-nvalor-${eid}`)?.value) || null
    }, { Prefer: 'return=minimal' });
    toast('Novedad registrada ✓');
    abrirOrdenMecanico(oid);
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

// ═══════════════════════════════════════════════════════════
// HELPERS REPORTE DESDE VISTAS
// ═══════════════════════════════════════════════════════════
function abrirReporteTecnico(mecId) {
  const overlay = document.getElementById('modal-reporte');
  if (!overlay) { toast('Modal de reporte no encontrado','err'); return; }
  overlay.dataset.tipo = 'tecnico';
  document.getElementById('modal-rep-titulo').textContent = 'Reporte del técnico';
  const selWrap = document.getElementById('rep-sel-tecnico');
  const selId   = document.getElementById('rep-sel-tecnico-id');
  if (selWrap) selWrap.style.display = 'block';
  if (selId)   selId.value = mecId;
  // Llenar select con nombre del técnico
  _cargarSelectTecnicos(mecId);
  overlay.classList.add('show');
}

function abrirReporteTodosTecnicos() {
  abrirModalReporte('todos_tecnicos');
}

function abrirReporteOrdenes() {
  abrirModalReporte('ordenes');
}

async function _cargarSelectTecnicos(preselect) {
  const sel = document.getElementById('rep-sel-tecnico-id');
  if (!sel) return;
  if (sel.options.length <= 1) {
    const mecs = await api('/mecanicos?activo=eq.true&order=nombre.asc').catch(()=>[]) || [];
    sel.innerHTML = mecs.map(m=>`<option value="${m.id}" ${String(m.id)===String(preselect)?'selected':''}>${escapeHtml(m.nombre)}</option>`).join('');
  } else if (preselect) {
    sel.value = preselect;
  }
}
// ═══════════════════════════════════════════════════════════
// EDITAR DATOS DE ORDEN (solo jefe, solo si no está entregada)
// ═══════════════════════════════════════════════════════════
async function abrirEditarOrden(ordenId) {
  const orden = ordenActual;
  if (!orden) return;

  // Cargar listas dinámicas
  const [aseguradoras, flotillas] = await Promise.all([
    api('/aseguradoras?activo=eq.true&order=nombre.asc').catch(()=>[]) || [],
    api('/flotillas?activo=eq.true&order=nombre.asc').catch(()=>[]) || []
  ]);

  const tipoActual = orden.tipo_cliente || '';
  const esPNatural = !tipoActual || tipoActual === 'particular';
  const esEmpresa  = tipoActual === 'empresa';

  const asegOpts = aseguradoras.map(a =>
    `<option value="${escapeHtml(a.nombre)}" ${orden.aseguradora===a.nombre?'selected':''}>${escapeHtml(a.nombre)}</option>`
  ).join('');
  const flotOpts = flotillas.map(f =>
    `<option value="${escapeHtml(f.nombre)}" ${orden.aseguradora===f.nombre?'selected':''}>${escapeHtml(f.nombre)}</option>`
  ).join('');

  const modal = document.getElementById('modal-editar-orden');
  const body  = document.getElementById('modal-editar-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <!-- TIPO DE PERSONA -->
      <div class="field">
        <label>Tipo de persona</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid var(--gris-borde);border-radius:7px;cursor:pointer;font-size:13px;font-weight:500" id="lbl-pnatural">
            <input type="radio" name="ed-tipo-persona" value="natural" ${!esEmpresa?'checked':''} onchange="toggleTipoPersonaEdit('natural')">
            Persona natural
          </label>
          <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid var(--gris-borde);border-radius:7px;cursor:pointer;font-size:13px;font-weight:500" id="lbl-empresa">
            <input type="radio" name="ed-tipo-persona" value="empresa" ${esEmpresa?'checked':''} onchange="toggleTipoPersonaEdit('empresa')">
            Empresa
          </label>
        </div>
      </div>

      <!-- VEHÍCULO -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Placa</label><input id="ed-placa" value="${escapeHtml(orden.placa||'')}" style="font-family:'DM Mono',monospace;letter-spacing:2px;font-size:16px" oninput="this.value=this.value.toUpperCase()"></div>
        <div class="field"><label>Marca</label><input id="ed-marca" value="${escapeHtml(orden.marca||'')}"></div>
        <div class="field"><label>Línea</label><input id="ed-linea" value="${escapeHtml(orden.linea||'')}"></div>
        <div class="field"><label>Año</label><input id="ed-modelo" type="number" value="${escapeHtml(orden.modelo||'')}"></div>
        <div class="field"><label>Color</label><input id="ed-color" value="${escapeHtml(orden.color||'')}"></div>
        <div class="field"><label>Kilometraje</label><input id="ed-km" type="number" value="${escapeHtml(String(orden.kilometraje||''))}"></div>
      </div>
      <div class="field">
        <label>VIN <span style="font-weight:400;color:var(--gris-mid);font-size:11px">(17 caracteres, opcional)</span></label>
        <input id="ed-vin" value="${escapeHtml(orden.vin||'')}" maxlength="17" style="font-family:'DM Mono',monospace;letter-spacing:1px" oninput="this.value=this.value.toUpperCase()">
      </div>

      <!-- PROPIETARIO / EMPRESA -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" id="ed-bloque-propietario">
        <div class="field" id="ed-wrap-nombre" style="grid-column:1/-1">
          <label id="ed-lbl-nombre">Nombre completo</label>
          <input id="ed-propietario" value="${escapeHtml(orden.propietario||'')}">
        </div>
        <div class="field"><label>Teléfono</label><input id="ed-telefono" value="${escapeHtml(orden.telefono||'')}"></div>
        <div class="field"><label id="ed-lbl-doc">Cédula / NIT</label><input id="ed-cedula" value="${escapeHtml(orden.cedula_cliente||'')}"></div>
        <div class="field" style="grid-column:1/-1"><label>Correo electrónico</label><input id="ed-correo" type="email" value="${escapeHtml(orden.correo_cliente||'')}"></div>
      </div>

      <!-- ORDEN -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Tipo de cliente</label>
          <select id="ed-tipo-cliente" onchange="toggleTipoClienteEdit(this.value)">
            <option value="">— Seleccionar —</option>
            <option value="particular" ${tipoActual==='particular'||!tipoActual?'selected':''}>Particular</option>
            <option value="aseguradora" ${tipoActual==='aseguradora'?'selected':''}>Aseguradora</option>
            <option value="flotilla" ${tipoActual==='flotilla'?'selected':''}>Flotilla</option>
            <option value="empresa" ${tipoActual==='empresa'?'selected':''}>Empresa</option>
          </select>
        </div>
        <div class="field" id="ed-wrap-aseg" style="display:${tipoActual==='aseguradora'?'block':'none'}">
          <label>Aseguradora</label>
          <div style="display:flex;gap:6px">
            <select id="ed-aseguradora" style="flex:1">
              <option value="">— Seleccionar —</option>
              ${asegOpts}
            </select>
            <button class="btn btn-ghost btn-sm" onclick="agregarNuevaAseg()" title="Agregar nueva">+</button>
          </div>
        </div>
        <div class="field" id="ed-wrap-flot" style="display:${tipoActual==='flotilla'?'block':'none'}">
          <label>Flotilla</label>
          <div style="display:flex;gap:6px">
            <select id="ed-flotilla" style="flex:1">
              <option value="">— Seleccionar —</option>
              ${flotOpts}
            </select>
            <button class="btn btn-ghost btn-sm" onclick="agregarNuevaFlot()" title="Agregar nueva">+</button>
          </div>
        </div>
        <div class="field"><label>Nivel de daño</label>
          <select id="ed-dano">
            <option value="">—</option>
            ${['Leve','Moderado','Fuerte','Pérdida Total'].map(d=>`<option ${orden.nivel_dano===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Fecha entrega 1</label><input id="ed-fecha1" type="date" value="${orden.fecha_entrega_1?.split('T')[0]||''}"></div>
        <div class="field"><label>Fecha entrega 2</label><input id="ed-fecha2" type="date" value="${orden.fecha_entrega_2?.split('T')[0]||''}"></div>
      </div>
    </div>
  `;

  // Establecer estado visual inicial
  toggleTipoClienteEdit(tipoActual);
  if (esEmpresa) toggleTipoPersonaEdit('empresa');

  modal.classList.add('show');
}

function toggleTipoPersonaEdit(tipo) {
  const lblNombre = document.getElementById('ed-lbl-nombre');
  const lblDoc    = document.getElementById('ed-lbl-doc');
  if (tipo === 'empresa') {
    if (lblNombre) lblNombre.textContent = 'Razón social';
    if (lblDoc)    lblDoc.textContent    = 'NIT';
  } else {
    if (lblNombre) lblNombre.textContent = 'Nombre completo';
    if (lblDoc)    lblDoc.textContent    = 'Cédula';
  }
}

function toggleTipoClienteEdit(tipo) {
  const wAseg = document.getElementById('ed-wrap-aseg');
  const wFlot = document.getElementById('ed-wrap-flot');
  if (wAseg) wAseg.style.display = tipo === 'aseguradora' ? 'block' : 'none';
  if (wFlot) wFlot.style.display = tipo === 'flotilla'    ? 'block' : 'none';
}

async function agregarNuevaAseg() {
  const nombre = prompt('Nombre de la nueva aseguradora:')?.trim();
  if (!nombre) return;
  try {
    await api('/aseguradoras', 'POST', { nombre, activo: true }, { Prefer: 'return=minimal' });
    toast('Aseguradora agregada ✓');
    // Recargar select
    const aseg = await api('/aseguradoras?activo=eq.true&order=nombre.asc').catch(()=>[]) || [];
    const sel = document.getElementById('ed-aseguradora');
    if (sel) {
      sel.innerHTML = '<option value="">— Seleccionar —</option>' +
        aseg.map(a=>`<option value="${escapeHtml(a.nombre)}" ${a.nombre===nombre?'selected':''}>${escapeHtml(a.nombre)}</option>`).join('');
    }
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function agregarNuevaFlot() {
  const nombre = prompt('Nombre de la nueva flotilla:')?.trim();
  if (!nombre) return;
  try {
    await api('/flotillas', 'POST', { nombre, activo: true }, { Prefer: 'return=minimal' });
    toast('Flotilla agregada ✓');
    const flot = await api('/flotillas?activo=eq.true&order=nombre.asc').catch(()=>[]) || [];
    const sel = document.getElementById('ed-flotilla');
    if (sel) {
      sel.innerHTML = '<option value="">— Seleccionar —</option>' +
        flot.map(f=>`<option value="${escapeHtml(f.nombre)}" ${f.nombre===nombre?'selected':''}>${escapeHtml(f.nombre)}</option>`).join('');
    }
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function guardarEdicionOrden() {
  const btn = document.getElementById('btn-guardar-edicion');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  try {
    const tipoPersona = document.querySelector('input[name="ed-tipo-persona"]:checked')?.value || 'natural';
    const tipoCliente = document.getElementById('ed-tipo-cliente')?.value || null;
    const vin = document.getElementById('ed-vin')?.value.trim().toUpperCase() || null;
    if (vin && vin.length !== 17) { toast('VIN debe tener 17 caracteres','err'); return; }

    // Aseguradora / flotilla según tipo
    let aseguradora = null;
    if (tipoCliente === 'aseguradora') {
      aseguradora = document.getElementById('ed-aseguradora')?.value || null;
    } else if (tipoCliente === 'flotilla') {
      aseguradora = document.getElementById('ed-flotilla')?.value || null;
    }

    const patch = {
      placa:           (document.getElementById('ed-placa')?.value.trim().toUpperCase()) || ordenActual.placa,
      marca:           document.getElementById('ed-marca')?.value.trim()    || null,
      linea:           document.getElementById('ed-linea')?.value.trim()    || null,
      modelo:          document.getElementById('ed-modelo')?.value          || null,
      color:           document.getElementById('ed-color')?.value.trim()    || null,
      kilometraje:     parseInt(document.getElementById('ed-km')?.value)    || null,
      vin:             vin,
      propietario:     document.getElementById('ed-propietario')?.value.trim() || null,
      telefono:        document.getElementById('ed-telefono')?.value.trim() || null,
      cedula_cliente:  document.getElementById('ed-cedula')?.value.trim()   || null,
      correo_cliente:  document.getElementById('ed-correo')?.value.trim()   || null,
      tipo_cliente:    tipoPersona === 'empresa' ? 'empresa' : (tipoCliente || null),
      aseguradora:     aseguradora,
      nivel_dano:      document.getElementById('ed-dano')?.value            || null,
      fecha_entrega_1: document.getElementById('ed-fecha1')?.value          || null,
      fecha_entrega_2: document.getElementById('ed-fecha2')?.value          || null,
    };

    await api(`/ordenes?id=eq.${ordenActual.id}`, 'PATCH', patch);
    toast('Datos actualizados ✓');
    document.getElementById('modal-editar-orden')?.classList.remove('show');
    abrirOrden(ordenActual.id); // Recargar detalle
  } catch(e) {
    toast('Error: '+e.message,'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
  }
}
// ── Combustible (dropdown en inventario) ─────────────────────
const _COMB_LABELS = { vacio:'Vacío', '1/4':'1/4 tanque', '1/2':'1/2 tanque', '3/4':'3/4 tanque', lleno:'Lleno' };

function abrirDropdownCombustible(e, el) {
  e.stopPropagation();
  const dd = document.getElementById('comb-dropdown');
  if (!dd) return;
  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  dd.style.top      = (rect.bottom + scrollY + 4) + 'px';
  dd.style.left     = rect.left + 'px';
  dd.style.minWidth = rect.width + 'px';
  dd.classList.toggle('open');
}

function seleccionarCombustible(valor) {
  const item   = document.getElementById('inv-combustible-item');
  const label  = document.getElementById('inv-combustible-label');
  const hidden = document.getElementById('n-combustible-val');
  if (hidden) hidden.value = valor;
  if (label)  label.textContent = _COMB_LABELS[valor] || 'Combustible';
  if (item)   item.classList.add('checked');
  document.getElementById('comb-dropdown')?.classList.remove('open');
}

document.addEventListener('click', () => {
  const dd = document.getElementById('comb-dropdown');
  if (dd?.classList.contains('open')) dd.classList.remove('open');
});

// ── Reset nueva orden ────────────────────────────────────────
function resetNuevaOrden() {
  ['n-placa','n-marca','n-linea','n-modelo','n-color','n-km','n-fecha1','n-fecha2',
   'n-inv-obs','n-vin','n-propietario','n-telefono','n-cedula-cliente','n-correo-cliente',
   'n-direccion','n-propietario-aseg','n-telefono-aseg','n-cedula-aseg','n-correo-aseg',
   'n-aseg-nombre','n-aseg-nit','n-flot-nombre','n-flot-nit','n-flot-dir',
   'n-emp-nombre','n-emp-nit','n-empresa-tel','n-combustible-val'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.querySelectorAll('.inv-item.checked').forEach(el => el.classList.remove('checked'));
  const _ci = document.getElementById('inv-combustible-item');
  const _cl = document.getElementById('inv-combustible-label');
  if (_ci) _ci.classList.remove('checked');
  if (_cl) _cl.textContent = 'Combustible';
  document.querySelectorAll('.tipo-cliente-btn.selected').forEach(el => el.classList.remove('selected'));
  ['n-wrap-particular','n-wrap-aseg','n-wrap-flot','n-wrap-empresa'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  ['n-wrap-aseg-extra','n-wrap-flot-extra','n-wrap-empresa-extra'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  document.getElementById('n-tipo-cliente') && (document.getElementById('n-tipo-cliente').value = '');
  document.getElementById('placa-resultado') && (document.getElementById('placa-resultado').style.display = 'none');
  document.getElementById('historial-previo') && (document.getElementById('historial-previo').style.display = 'none');
  document.getElementById('ocr-estado') && (document.getElementById('ocr-estado').style.display = 'none');
  cerrarSugerenciasPlaca();
  fotosIngresoPendientes = [];
  if (typeof renderPreviewIngreso === 'function') renderPreviewIngreso();
}

async function recargarListasNuevaOrden() {
  const [aseg, flot] = await Promise.all([
    api('/aseguradoras?activo=eq.true&order=nombre.asc').catch(()=>[]) || [],
    api('/flotillas?activo=eq.true&order=nombre.asc').catch(()=>[]) || []
  ]);
  ['n-aseguradora-sel','n-flotilla-sel','n-empresa-sel'].forEach((id, i) => {
    const sel = document.getElementById(id);
    const lista = i === 0 ? aseg : flot;
    if (sel) sel.innerHTML = '<option value="">— Seleccionar —</option>' +
      lista.map(x => `<option value="${x.nombre}">${x.nombre}</option>`).join('');
  });
}
// ═══════════════════════════════════════════════════════════
// PRELIQUIDACIÓN — PDF con resumen de la orden
// ═══════════════════════════════════════════════════════════
async function generarPreliquidacion(ordenId) {
  try {
    toast('Generando preliquidación...');

    const [orden, etapas, novedades] = await Promise.all([
      api(`/ordenes?id=eq.${ordenId}`).then(r => r?.[0]).catch(()=>null),
      api(`/etapas?orden_id=eq.${ordenId}&order=creado_en.asc&select=*`).catch(()=>[]) || [],
      api(`/novedades?orden_id=eq.${ordenId}&select=*`).catch(()=>[]) || []
    ]);

    if (!orden) { toast('No se encontró la orden', 'err'); return; }

    const fmt = n => n != null
      ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n)
      : '$0';
    const fmtFecha = iso => iso
      ? new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})
      : '—';
    const fmtHora = iso => iso
      ? new Date(iso).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})
      : '—';
    const durMin = (ini, fin) => {
      if (!ini || !fin) return '—';
      const m = Math.round((new Date(fin) - new Date(ini)) / 60000);
      return `${Math.floor(m/60)}h ${m%60}m`;
    };

    const totalManoObra = etapas.reduce((s,e) => s+(e.valor||0), 0);
    const totalHorasFact = etapas.reduce((s,e) => s+(e.horas_facturadas||0), 0);
    const totalHorasAdi  = etapas.reduce((s,e) => s+(e.horas_adicionales||0), 0);

    // Agrupar etapas por servicio
    const servicios = {};
    etapas.forEach(e => {
      const s = e.servicio || 'adicionales';
      if (!servicios[s]) servicios[s] = [];
      servicios[s].push(e);
    });

    const srvNombres = { latoneria:'Latonería', pintura:'Pintura', mecanica:'Mecánica', adicionales:'Adicionales' };
    const srvColor   = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };

    const etapasHtml = Object.entries(servicios).map(([srv, ets]) => `
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${srvColor[srv]||'#374151'};border-bottom:2px solid ${srvColor[srv]||'#374151'};padding-bottom:5px;margin-bottom:10px">
          ${srvNombres[srv]||srv}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#F8FAFC">
              <th style="padding:7px 10px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #E2E8F0">Etapa</th>
              <th style="padding:7px 10px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #E2E8F0">Técnico</th>
              <th style="padding:7px 10px;text-align:center;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #E2E8F0">Duración</th>
              <th style="padding:7px 10px;text-align:center;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #E2E8F0">H. Fact.</th>
              <th style="padding:7px 10px;text-align:right;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #E2E8F0">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${ets.map(e => `
              <tr style="border-bottom:1px solid #F1F5F9">
                <td style="padding:8px 10px;font-weight:600;color:#1E293B">${escapeHtml(e.etapa)||'—'}</td>
                <td style="padding:8px 10px;color:#64748B">${escapeHtml(e.tecnico)||'—'}</td>
                <td style="padding:8px 10px;text-align:center;color:#64748B;font-family:monospace">${durMin(e.inicio,e.fin)}</td>
                <td style="padding:8px 10px;text-align:center;color:#64748B">${e.horas_facturadas||'—'}</td>
                <td style="padding:8px 10px;text-align:right;font-weight:600;color:#1E293B;font-family:monospace">${fmt(e.valor)}</td>
              </tr>`).join('')}
            <tr style="background:#F8FAFC;font-weight:700">
              <td colspan="4" style="padding:8px 10px;color:#374151;font-size:12px">Subtotal ${srvNombres[srv]||srv}</td>
              <td style="padding:8px 10px;text-align:right;color:${srvColor[srv]||'#374151'};font-family:monospace">${fmt(ets.reduce((s,e)=>s+(e.valor||0),0))}</td>
            </tr>
          </tbody>
        </table>
      </div>`).join('');

    const novedadesHtml = novedades.length ? `
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#DC2626;border-bottom:2px solid #DC2626;padding-bottom:5px;margin-bottom:10px">Novedades</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#FEF2F2">
            <th style="padding:7px 10px;text-align:left;color:#DC2626;font-size:10px;text-transform:uppercase;border-bottom:1px solid #FECACA">Tipo</th>
            <th style="padding:7px 10px;text-align:left;color:#DC2626;font-size:10px;text-transform:uppercase;border-bottom:1px solid #FECACA">Motivo</th>
            <th style="padding:7px 10px;text-align:left;color:#DC2626;font-size:10px;text-transform:uppercase;border-bottom:1px solid #FECACA">Responsable</th>
            <th style="padding:7px 10px;text-align:left;color:#DC2626;font-size:10px;text-transform:uppercase;border-bottom:1px solid #FECACA">Fecha</th>
          </tr></thead>
          <tbody>
            ${novedades.map(n=>`<tr style="border-bottom:1px solid #FEE2E2">
              <td style="padding:7px 10px;font-weight:600">${escapeHtml(n.tipo)||'—'}</td>
              <td style="padding:7px 10px;color:#64748B">${escapeHtml(n.motivo)||'—'}</td>
              <td style="padding:7px 10px;color:#64748B">${escapeHtml(n.responsable)||'—'}</td>
              <td style="padding:7px 10px;color:#64748B;font-size:11px">${fmtHora(n.creado_en)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Preliquidación ${escapeHtml(orden.placa)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1E293B;background:#fff;font-size:13px;line-height:1.5}
  .page{max-width:900px;margin:0 auto;padding:32px 36px}
  @media print{body{font-size:12px}.page{padding:20px 24px}}
</style>
</head>
<body>
<div class="page">

  <!-- ENCABEZADO -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1E3A5F;padding-bottom:18px;margin-bottom:24px">
    <div>
      <div style="font-size:24px;font-weight:800;color:#1E3A5F;letter-spacing:1px">FREIMANAUTOS</div>
      <div style="font-size:11px;color:#94A3B8;margin-top:3px">Simplemente profesional</div>
      <div style="font-size:10px;color:#64748B;margin-top:6px;line-height:1.7">
        NIT: 800.012.186 &nbsp;·&nbsp; Calle 98A # 68D – 15<br>
        Tel: 320 902 5804<br>
        freimanautossa@yahoo.com &nbsp;·&nbsp; freimanautosgerencia@yahoo.com
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700;color:#1E3A5F">PRELIQUIDACIÓN</div>
      <div style="font-family:monospace;font-size:20px;font-weight:800;color:#1E3A5F;letter-spacing:3px;margin-top:4px">${escapeHtml(orden.placa)}</div>
      <div style="font-size:11px;color:#94A3B8;margin-top:4px">Generada: ${fmtHora(new Date().toISOString())}</div>
    </div>
  </div>

  <!-- DATOS VEHÍCULO Y CLIENTE -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div style="background:#F8FAFC;border-radius:8px;padding:14px 16px;border:1px solid #E2E8F0">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;margin-bottom:10px">Vehículo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div><div style="color:#94A3B8;font-size:10px">Marca</div><div style="font-weight:600">${escapeHtml(orden.marca)||'—'}</div></div>
        <div><div style="color:#94A3B8;font-size:10px">Línea</div><div style="font-weight:600">${escapeHtml(orden.linea)||'—'}</div></div>
        <div><div style="color:#94A3B8;font-size:10px">Modelo</div><div style="font-weight:600">${escapeHtml(orden.modelo)||'—'}</div></div>
        <div><div style="color:#94A3B8;font-size:10px">Color</div><div style="font-weight:600">${escapeHtml(orden.color)||'—'}</div></div>
        <div><div style="color:#94A3B8;font-size:10px">Kilometraje</div><div style="font-weight:600">${orden.km ? orden.km+' km' : '—'}</div></div>
        <div><div style="color:#94A3B8;font-size:10px">VIN</div><div style="font-weight:600;font-family:monospace;font-size:10px">${escapeHtml(orden.vin)||'—'}</div></div>
      </div>
    </div>
    <div style="background:#F8FAFC;border-radius:8px;padding:14px 16px;border:1px solid #E2E8F0">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;margin-bottom:10px">Cliente</div>
      <div style="display:grid;gap:6px;font-size:12px">
        <div><div style="color:#94A3B8;font-size:10px">Propietario</div><div style="font-weight:600">${escapeHtml(orden.propietario)||'—'}</div></div>
        <div><div style="color:#94A3B8;font-size:10px">Teléfono</div><div style="font-weight:600">${escapeHtml(orden.telefono)||'—'}</div></div>
        <div><div style="color:#94A3B8;font-size:10px">Tipo cliente</div><div style="font-weight:600">${escapeHtml(orden.tipo_cliente)||'Particular'}</div></div>
        ${orden.aseguradora ? `<div><div style="color:#94A3B8;font-size:10px">Aseguradora</div><div style="font-weight:600">${escapeHtml(orden.aseguradora)}</div></div>` : ''}
      </div>
    </div>
  </div>

  <!-- FECHAS -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">
    <div style="background:#EBF2FF;border-radius:8px;padding:12px 14px;text-align:center">
      <div style="font-size:10px;color:#2563EB;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Fecha ingreso</div>
      <div style="font-weight:700;color:#1E3A5F">${fmtFecha(orden.creado_en)}</div>
    </div>
    <div style="background:#FEF3C7;border-radius:8px;padding:12px 14px;text-align:center">
      <div style="font-size:10px;color:#D97706;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Entrega prometida</div>
      <div style="font-weight:700;color:#92400E">${fmtFecha(orden.fecha_entrega_1)}</div>
    </div>
    <div style="background:#E6F5EF;border-radius:8px;padding:12px 14px;text-align:center">
      <div style="font-size:10px;color:#059669;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Estado</div>
      <div style="font-weight:700;color:#065F46">${orden.estado||'—'}</div>
    </div>
  </div>

  <!-- ETAPAS POR SERVICIO -->
  ${etapasHtml}

  <!-- NOVEDADES -->
  ${novedadesHtml}

  <!-- TOTALES -->
  <div style="border-top:2px solid #E2E8F0;padding-top:16px;margin-top:8px">
    <div style="display:flex;justify-content:flex-end">
      <div style="min-width:300px">
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F1F5F9;font-size:13px">
          <span style="color:#64748B">Total horas facturadas</span>
          <span style="font-weight:600">${totalHorasFact}h</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F1F5F9;font-size:13px">
          <span style="color:#64748B">Horas adicionales</span>
          <span style="font-weight:600">${totalHorasAdi}h</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0 0;font-size:16px;font-weight:800;color:#1E3A5F">
          <span>TOTAL MANO DE OBRA</span>
          <span style="font-family:monospace">${fmt(totalManoObra)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- NOTA -->
  <div style="margin-top:32px;border-top:1px solid #E2E8F0;padding-top:14px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between">
    <span>FREIMANAUTOS · NIT 800.012.186 · Calle 98A # 68D – 15 · Tel: 320 902 5804 · Documento preliminar — no constituye factura</span>
    <span>Generado el ${new Date().toLocaleString('es-CO')}</span>
  </div>

</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 700);
      toast('Preliquidación generada ✓');
    } else {
      toast('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.', 'err');
    }
  } catch(e) {
    toast('Error generando preliquidación: ' + e.message, 'err');
    console.error(e);
  }
}

// ═══════════════════════════════════════════════════════════
// AUTO-REFRESH — Polling para órdenes, capacidad y dashboard
// ═══════════════════════════════════════════════════════════

let _realtimeIntervals = [];
let _realtimeVisibilityHandler = null;
let _ultimoRefresh = 0;

// Devuelve el id de la página activa en el .content
function _paginaActiva() {
  const el = document.querySelector('.pagina.activa');
  return el ? el.id : null;
}

// ¿Hay algún modal abierto? Evitamos refrescar mientras el usuario edita
function _hayModalAbierto() {
  return !![...document.querySelectorAll('.modal-overlay')]
    .some(m => m.style.display !== 'none' && !m.classList.contains('hide') && m.offsetParent !== null);
}

function _tickRefresh() {
  if (!sesion) return;                 // no hay sesión activa
  if (document.hidden) return;        // pestaña oculta
  if (_hayModalAbierto()) return;     // usuario en un modal

  const pag = _paginaActiva();

  // Siempre actualizar la barra de capacidad del sidebar
  _refrescarCapacidad();

  // Actualizar lista de órdenes si está visible
  if (pag === 'pag-ordenes') {
    cargarOrdenes();
    return;
  }

  // Actualizar dashboard si está visible
  if (pag === 'pag-dashboard' && typeof switchDashTab === 'function') {
    const tabActivo = document.querySelector('.filtro-btn.active[id^="dash-tab-"]');
    const tab = tabActivo ? tabActivo.id.replace('dash-tab-', '') : 'mes';
    switchDashTab(tab);
    return;
  }
}

function iniciarRealtime() {
  detenerRealtime(); // Limpiar cualquier instancia previa

  // ── Polling cada 30 segundos ────────────────────────────
  const intervalo = setInterval(_tickRefresh, 30_000);
  _realtimeIntervals.push(intervalo);

  // ── Refresh inmediato al volver a la pestaña ────────────
  _realtimeVisibilityHandler = () => {
    if (!document.hidden && sesion) {
      const ahora = Date.now();
      // Evitar doble-refresh si ya se refrescó hace menos de 5 s
      if (ahora - _ultimoRefresh > 5_000) {
        _ultimoRefresh = ahora;
        _tickRefresh();
      }
    }
  };
  document.addEventListener('visibilitychange', _realtimeVisibilityHandler);

  // ── Refresh al recuperar conexión ───────────────────────
  window.addEventListener('online', _tickRefresh);

  console.debug('[Realtime] Polling activo — cada 30 s');
}

function detenerRealtime() {
  _realtimeIntervals.forEach(id => clearInterval(id));
  _realtimeIntervals = [];
  if (_realtimeVisibilityHandler) {
    document.removeEventListener('visibilitychange', _realtimeVisibilityHandler);
    _realtimeVisibilityHandler = null;
  }
  window.removeEventListener('online', _tickRefresh);
}
