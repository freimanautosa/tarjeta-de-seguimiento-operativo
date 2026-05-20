// ═══════════════════════════════════════════════════════════
// PERFIL MECÁNICO - MIS ETAPAS
// ═══════════════════════════════════════════════════════════

function montarMecanico() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = `
      <div class="nav-section-label">Mis asignaciones</div>
      <button class="nav-item active" id="nav-mec-ordenes" onclick="navMec('ordenes')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
        Mis órdenes
      </button>
      <button class="nav-item" id="nav-mec-historial" onclick="navMec('historial')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Mi historial
      </button>
      <button class="nav-item" id="nav-mec-solicitudes" onclick="navMec('solicitudes')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83"/></svg>
        Solicitudes
      </button>
    `;
  }
  
  const bottomNav = document.getElementById('bottom-nav-inner');
  if (bottomNav) {
    bottomNav.innerHTML = `
      <button class="bnav-item active" id="bnav-mec-ordenes" onclick="navMec('ordenes')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
        <span>Mis órdenes</span>
      </button>
      <button class="bnav-item" id="bnav-mec-historial" onclick="navMec('historial')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>Historial</span>
      </button>
      <button class="bnav-item" id="bnav-mec-solicitudes" onclick="navMec('solicitudes')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4"/></svg>
        <span>Solicitudes</span>
      </button>
    `;
  }
  navMec('ordenes');
}

function navMec(pag) {
  ['ordenes','historial','solicitudes'].forEach(p => {
    const nb = document.getElementById('nav-mec-'+p);
    const bb = document.getElementById('bnav-mec-'+p);
    if (nb) nb.classList.toggle('active', p===pag);
    if (bb) bb.classList.toggle('active', p===pag);
  });
  const titles = { ordenes:'Mis Órdenes', historial:'Mi Historial', solicitudes:'Solicitudes' };
  const pages  = { ordenes:'pag-mecanico', historial:'pag-mec-historial', solicitudes:'pag-mec-repuestos' };
  mostrarPagina(pages[pag]||'pag-mecanico');
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = titles[pag]||'Mis Órdenes';
  if (pag==='ordenes') cargarEtapasMecanico();
  if (pag==='historial') cargarHistorialMecanico();
  if (pag==='solicitudes') cargarRepuestosMecanico();
  closeSidebar();
}

async function cargarEtapasMecanico() {
  const cont = document.getElementById('mec-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando tus órdenes...</div>';
  try {
    const etapas = await api(`/etapas?mecanico_id=eq.${sesion.id}&order=creado_en.asc`) || [];
    if (!etapas.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ico('check', 32)}</div><p>No tienes etapas asignadas por el momento.</p></div>`;
      return;
    }

    const ids = [...new Set(etapas.map(e => e.orden_id))];
    const ordenes = await api(`/ordenes?id=in.(${ids.join(',')})`).catch(() => []) || [];

    const porOrden = {};
    etapas.forEach(e => {
      if (!porOrden[e.orden_id]) porOrden[e.orden_id] = [];
      porOrden[e.orden_id].push(e);
    });

    cont.innerHTML = Object.entries(porOrden).map(([oid, ets]) => {
      const orden = ordenes.find(o => o.id == oid) || {};
      const etapsHtml = ets.map(e => {
        const badge = !e.inicio ? 'Pendiente' : (e.fin ? 'Completada' : 'En proceso');
        const bCls = !e.inicio ? 'pendiente' : (e.fin ? 'completada' : 'iniciada');
        const hayActiva = ets.some(x => x.inicio && !x.fin);
        let acc = '';
        if (!e.inicio && !hayActiva)
          acc = `<button class="btn btn-success btn-sm" data-eid="${e.id}" data-etapa="${escapeHtml(e.etapa || '')}" data-oid="${oid}" onclick="event.stopPropagation();mecIniciarEtapa(+this.dataset.eid,this.dataset.etapa,+this.dataset.oid)">▶ Iniciar</button>`;
        else if (e.inicio && !e.fin)
          acc = `<button class="btn btn-danger btn-sm" data-eid="${e.id}" data-etapa="${escapeHtml(e.etapa || '')}" data-srv="${escapeHtml(e.servicio || '')}" data-oid="${oid}" onclick="event.stopPropagation();mecFinalizarEtapa(+this.dataset.eid,this.dataset.etapa,this.dataset.srv,+this.dataset.oid)">■ Finalizar</button>`;
        else if (e.fin)
          acc = `<span class="badge badge-completada">Completada ✓</span>`;
        else
          acc = `<span style="font-size:12px;color:var(--gris-mid)">Esperando turno</span>`;

        return `<div class="mec-etapa-item">
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px">${escapeHtml(e.etapa) || '—'}</div>
            <div style="font-size:11px;color:var(--gris-mid);margin-top:2px">
              ${escapeHtml(CATALOGO[e.servicio]?.nombre || e.servicio) || '—'}
              ${e.inicio ? ' · Inicio: ' + formatTS(e.inicio) : ''}
              ${e.fin ? ' · Fin: ' + formatTS(e.fin) : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="badge badge-${bCls}">${badge}</span>
            ${acc}
            ${!e.fin ? `<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();abrirMecDetalle(${e.id},${oid})">Fotos / novedades</button>` : ''}
          </div>
        </div>`;
      }).join('');

      return `<div class="mec-orden-card" onclick="abrirOrdenMecanico(${oid})" style="cursor:pointer">
        <div class="mec-orden-header">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:500;letter-spacing:2px">${escapeHtml(orden.placa) || '—'}</div>
            <div style="font-size:13px;color:var(--gris-mid);margin-top:3px">${[orden.marca, orden.linea, orden.modelo].filter(Boolean).map(escapeHtml).join(' · ') || 'Sin datos'}</div>
          </div>
          <div style="text-align:right">
            ${orden.pulmon ? '<span class="badge badge-pulmon">En Pulmón</span>' : ''}
            <div style="font-size:11px;color:var(--gris-mid);font-family:\'DM Mono\',monospace;margin-top:4px">${formatFecha(orden.creado_en)}</div>
          </div>
        </div>
        ${etapsHtml}
      </div>`;
    }).join('');
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

async function mecIniciarEtapa(eid, nombre, oid) {
  try {
    await api(`/etapas?id=eq.${eid}`, 'PATCH', { inicio: new Date().toISOString() });
    toast(`${nombre} iniciada ✓`);
    cargarEtapasMecanico();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function mecFinalizarEtapa(eid, nombre, servicio, oid) {
  try {
    await api(`/etapas?id=eq.${eid}`, 'PATCH', { fin: new Date().toISOString() });
    toast(`${nombre} finalizada ✓`);
    
    const etapasOrden = await api(`/etapas?orden_id=eq.${oid}&order=creado_en.asc`);
    const etapaActual = etapasOrden.find(e => e.id === eid);
    const etapasMismoSrv = etapasOrden.filter(e => e.servicio === (etapaActual?.servicio || servicio));
    const idxEnSrv = etapasMismoSrv.findIndex(e => e.id === eid);
    const siguiente = etapasMismoSrv.slice(idxEnSrv + 1).find(e => !e.fin) || null;
    const todasComp = etapasOrden.every(e => e.fin || e.id === eid);
    const orden = await api(`/ordenes?id=eq.${oid}`).then(d => d[0]).catch(() => ({}));
    
    fetch(N8N_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento: todasComp ? 'orden_completada' : 'etapa_finalizada',
        orden: { id: oid, placa: orden.placa, propietario: orden.propietario, marca: orden.marca, linea: orden.linea, aseguradora: orden.aseguradora },
        etapa_finalizada: { id: eid, nombre, servicio: etapaActual?.servicio || servicio, tecnico: etapaActual?.tecnico || null },
        siguiente_etapa: siguiente ? { id: siguiente.id, nombre: siguiente.etapa, servicio: siguiente.servicio, mecanico_id: siguiente.mecanico_id, tecnico: siguiente.tecnico } : null,
        todas_completadas: todasComp,
        link: `${window.location.origin}${window.location.pathname}`
      })
    }).catch(() => {});
    
    cargarEtapasMecanico();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

let mecEtapaActual = null;

async function abrirMecDetalle(eid, oid) {
  mostrarPagina('pag-mec-detalle');
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = 'Fotos y Novedades';
  const cont = document.getElementById('mec-detalle-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';
  try {
    const [etapa, orden, fotos, novedades] = await Promise.all([
      api(`/etapas?id=eq.${eid}`).then(d => d[0]),
      api(`/ordenes?id=eq.${oid}`).then(d => d[0]),
      api(`/fotos_etapas?etapa_id=eq.${eid}&order=creado_en.desc`).catch(() => []) || [],
      api(`/novedades?etapa_id=eq.${eid}&order=creado_en.desc`).catch(() => []) || []
    ]);
    mecEtapaActual = { eid, oid, etapa, orden };
    const k = kid(eid);

    const fotosHtml = fotos.map(f => `
      <div class="foto-thumb" data-url="${escapeHtml(f.url)}" onclick="abrirLightbox(this.dataset.url)">
        <img src="${escapeHtml(f.url)}" alt="">
        <button class="foto-delete" data-fid="${f.id}" data-url="${escapeHtml(f.url)}" data-eid="${eid}" data-oid="${oid}" onclick="event.stopPropagation();eliminarFotoMec(+this.dataset.fid,this.dataset.url,+this.dataset.eid,+this.dataset.oid)">✕</button>
      </div>`).join('');

    const novsHtml = novedades.length ? novedades.map(n => `
      <div class="novedad-item">
        <div class="novedad-item-top">
          <span class="novedad-tipo ${escapeHtml((n.tipo || '').toLowerCase())}">${escapeHtml(n.tipo)}</span>
          <span class="novedad-fecha">${formatTS(n.creado_en)}</span>
        </div>
        <div class="novedad-motivo">${escapeHtml(n.motivo) || '—'}</div>
      </div>`).join('')
      : '<div style="font-size:12px;color:var(--gris-mid);padding:4px 0">Sin novedades.</div>';

    cont.innerHTML = `
      <div class="card" style="padding:24px;margin-bottom:14px">
        <div style="font-family:'DM Mono',monospace;font-size:20px;letter-spacing:2px;font-weight:500;margin-bottom:4px">${escapeHtml(orden.placa) || '—'}</div>
        <div style="font-size:13px;color:var(--gris-mid);margin-bottom:16px">${escapeHtml(etapa.etapa) || '—'} · ${escapeHtml(CATALOGO[etapa.servicio]?.nombre || etapa.servicio) || '—'}</div>
        <div class="seccion-titulo">Fotos (${fotos.length})</div>
        <div class="fotos-grid" id="mec-fotos-grid">${fotosHtml}</div>
        <div class="upload-zone" onclick="document.getElementById('mec-fi-${k}').click()" style="margin-top:10px">
          <input type="file" id="mec-fi-${k}" accept="image/*" multiple onchange="mecSubirFotos(this,${eid},'${etapa.etapa || ''}',${oid})">
          <div style="opacity:0.45">${ico('camera', 20)}</div>
          <p>Subir fotos</p>
          <div class="upload-prog" id="mec-prog-${k}"></div>
        </div>
      </div>
      <div class="card" style="padding:24px">
        <div class="seccion-titulo">Novedades</div>
        <div id="mec-novs-${eid}">${novsHtml}</div>
        <div class="grid-2" style="margin-top:12px">
          <div class="field"><label>Tipo</label>
            <select id="mec-ntype-${eid}">
              <option value="Detenido">Detenido</option>
              <option value="Reproceso">Reproceso</option>
              <option value="Garantia">Garantía</option>
            </select>
          </div>
          <div class="field full"><label>Motivo</label>
            <textarea id="mec-nmot-${eid}" placeholder="Describe la novedad..." style="min-height:52px"></textarea>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-danger btn-sm" onclick="mecGuardarNovedad(${eid},${oid})">Guardar novedad</button>
        </div>
      </div>`;
  } catch(e) { 
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`; 
  }
}

function volverAMecOrdenes() {
  navMec('ordenes');
}

async function mecSubirFotos(input, eid, nombre, oid) {
  const files = Array.from(input.files);
  if (!files.length) return;
  const k = kid(eid);
  const prog = document.getElementById(`mec-prog-${k}`);
  let sub = 0;
  for (const file of files) {
    try {
      const ext = file.name.split('.').pop();
      const path = `${oid}/etapas/${eid}_${Date.now()}.${ext}`;
      const url = await storageUpload(file, path);
      await api('/fotos_etapas', 'POST', { etapa_id: eid, orden_id: oid, etapa_nombre: nombre, url, nombre: file.name }, { Prefer: 'return=minimal' });
      sub++;
      if (prog) prog.textContent = `Subiendo ${sub}/${files.length}...`;
    } catch(e) { toast(`Error: ${file.name}`, 'err'); }
  }
  if (prog) prog.textContent = '';
  input.value = '';
  toast(`${sub} foto(s) subida(s) ✓`);
  abrirMecDetalle(eid, oid);
}

async function eliminarFotoMec(fotoId, url, eid, oid) {
  if (!confirm('¿Eliminar esta foto?')) return;
  try {
    await api(`/fotos_etapas?id=eq.${fotoId}`, 'DELETE');
    const path = url.split(`/object/public/${BUCKET}/`)[1];
    if (path) await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${_getBearer()}` } });
    toast('Foto eliminada ✓');
    abrirMecDetalle(eid, oid);
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function mecGuardarNovedad(eid, oid) {
  const motivo = document.getElementById(`mec-nmot-${eid}`)?.value?.trim();
  if (!motivo) { toast('El motivo es obligatorio', 'err'); return; }
  try {
    await api('/novedades', 'POST', {
      orden_id: oid, etapa_id: eid,
      tipo: document.getElementById(`mec-ntype-${eid}`).value,
      responsable: sesion.nombre,
      motivo, desde: new Date().toISOString()
    }, { Prefer: 'return=minimal' });
    toast('Novedad registrada ✓');
    const input = document.getElementById(`mec-nmot-${eid}`);
    if (input) input.value = '';
    abrirMecDetalle(eid, oid);
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}
// ═══════════════════════════════════════════════════════════
// HISTORIAL DEL MECÁNICO
// ═══════════════════════════════════════════════════════════
async function cargarHistorialMecanico() {
  const cont = document.getElementById('mec-historial-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando historial...</div>';
  try {
    const etapas = await api(`/etapas?mecanico_id=eq.${sesion.id}&fin=not.is.null&order=fin.desc&limit=100`) || [];
    if (!etapas.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ico('clipboard', 32)}</div><p style="font-size:15px;font-weight:600;margin-bottom:6px">Sin historial aún</p><p>Cuando finalices etapas aparecerán aquí.</p></div>`;
      return;
    }
    const oids = [...new Set(etapas.map(e => e.orden_id))];
    const ordenes = await api(`/ordenes?id=in.(${oids.join(',')})&select=id,placa,marca,linea`).catch(()=>[]) || [];
    const totalMins = etapas.reduce((acc, e) => e.inicio && e.fin ? acc + Math.round((new Date(e.fin)-new Date(e.inicio))/60000) : acc, 0);
    const hTot = Math.floor(totalMins/60), mTot = totalMins%60;
    const promMin = etapas.length ? Math.round(totalMins/etapas.length) : 0;
    const hProm = Math.floor(promMin/60), mProm = promMin%60;
    const srvConteo = {};
    etapas.forEach(e => { const s = e.servicio||'otro'; srvConteo[s]=(srvConteo[s]||0)+1; });
    const srvTop = Object.entries(srvConteo).sort((a,b)=>b[1]-a[1])[0];
    const srvColor = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };

    cont.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:white;border:1.5px solid var(--gris-borde);border-radius:var(--radio);padding:16px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:var(--azul);font-family:'DM Mono',monospace">${etapas.length}</div>
          <div style="font-size:11px;color:var(--gris-mid);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Etapas hechas</div>
        </div>
        <div style="background:white;border:1.5px solid var(--gris-borde);border-radius:var(--radio);padding:16px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:var(--verde);font-family:'DM Mono',monospace">${hTot}h ${mTot}m</div>
          <div style="font-size:11px;color:var(--gris-mid);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Tiempo total</div>
        </div>
        <div style="background:white;border:1.5px solid var(--gris-borde);border-radius:var(--radio);padding:16px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:#D97706;font-family:'DM Mono',monospace">${hProm>0?hProm+'h ':''}${mProm}m</div>
          <div style="font-size:11px;color:var(--gris-mid);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Prom. por etapa</div>
        </div>
      </div>
      ${srvTop ? `<div style="background:white;border:1.5px solid var(--gris-borde);border-radius:var(--radio);padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <div style="width:10px;height:10px;border-radius:50%;background:${srvColor[srvTop[0]]||'#6B7280'};flex-shrink:0"></div>
        <div><div style="font-size:12px;color:var(--gris-mid)">Especialidad más frecuente</div>
          <div style="font-size:15px;font-weight:600">${CATALOGO[srvTop[0]]?.nombre||srvTop[0]} · ${srvTop[1]} etapa${srvTop[1]>1?'s':''}</div></div>
      </div>` : ''}
      <div style="display:grid;grid-template-columns:100px 1fr 80px 70px;gap:12px;padding:6px 0;border-bottom:2px solid var(--gris-borde);margin-bottom:4px">
        <div style="font-size:10px;font-weight:700;color:var(--gris-mid);text-transform:uppercase;letter-spacing:1px">Placa</div>
        <div style="font-size:10px;font-weight:700;color:var(--gris-mid);text-transform:uppercase;letter-spacing:1px">Etapa</div>
        <div style="font-size:10px;font-weight:700;color:var(--gris-mid);text-transform:uppercase;letter-spacing:1px">Fecha</div>
        <div style="font-size:10px;font-weight:700;color:var(--gris-mid);text-transform:uppercase;letter-spacing:1px;text-align:right">Duración</div>
      </div>
      ${etapas.map(e => {
        const o = ordenes.find(ord => ord.id === e.orden_id)||{};
        const mins = e.inicio&&e.fin ? Math.round((new Date(e.fin)-new Date(e.inicio))/60000) : 0;
        const dur = mins<60?`${mins}m`:`${Math.floor(mins/60)}h ${mins%60}m`;
        const color = srvColor[e.servicio]||'#6B7280';
        return `<div style="display:grid;grid-template-columns:100px 1fr 80px 70px;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gris-borde)">
          <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px;letter-spacing:1px">${escapeHtml(o.placa)||'—'}</div>
          <div><div style="font-weight:600;font-size:13px">${escapeHtml(e.etapa)||'—'}</div>
            <div style="font-size:11px;color:${color}">${escapeHtml(CATALOGO[e.servicio]?.nombre||e.servicio)||'—'}</div></div>
          <div style="font-size:12px;color:var(--gris-mid)">${formatFecha(e.fin)}</div>
          <div style="font-size:13px;font-weight:600;color:var(--azul);text-align:right">${dur}</div>
        </div>`;
      }).join('')}`;
  } catch(e) { cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`; }
}

// ═══════════════════════════════════════════════════════════
// SOLICITAR REPUESTOS (MECÁNICO)
// ═══════════════════════════════════════════════════════════
let _mecRepItems = [0];

async function cargarRepuestosMecanico() {
  const cont = document.getElementById('mec-repuestos-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';
  try {
    {
    const solicitudes = await api(`/solicitudes_repuesto?solicitado_por=eq.${encodeURIComponent(sesion.nombre)}&order=creado_en.desc&limit=80&select=*`).catch(()=>[]) || [];
    const ordenIds = [...new Set(solicitudes.map(s => s.orden_id).filter(Boolean))];
    const ordenes = ordenIds.length ? await api(`/ordenes?id=in.(${ordenIds.join(',')})&select=id,placa,propietario,marca,linea,estado`).catch(()=>[]) || [] : [];
    const estadoColor = {
      pendiente_jefe:'#D97706', enviado_repuestos:'#7C3AED',
      cotizado:'#2563EB', pedido:'#0891B2',
      entregado:'#059669', rechazado:'#DC2626'
    };
    const estadoBg = {
      pendiente_jefe:'#FEF3C7', enviado_repuestos:'#EDE9FE',
      cotizado:'#EBF2FF', pedido:'#E0F2FE',
      entregado:'#E6F5EF', rechazado:'#FEE2E2'
    };
    const estadoLabel = {
      pendiente_jefe:'Pendiente revision', enviado_repuestos:'En gestion',
      cotizado:'Cotizado', pedido:'Pedido al proveedor',
      entregado:'Entregado', rechazado:'Rechazado'
    };
    const conteos = solicitudes.reduce((acc, s) => {
      const estado = s.estado || 'pendiente_jefe';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    cont.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px">
        <div class="info-chip"><div class="info-chip-label">Pendientes</div><div class="info-chip-val">${(conteos.pendiente_jefe||0) + (conteos.enviado_repuestos||0) + (conteos.cotizado||0) + (conteos.pedido||0)}</div></div>
        <div class="info-chip"><div class="info-chip-label">Entregadas</div><div class="info-chip-val">${conteos.entregado||0}</div></div>
        <div class="info-chip"><div class="info-chip-label">Rechazadas</div><div class="info-chip-val">${conteos.rechazado||0}</div></div>
      </div>
      ${solicitudes.length ? solicitudes.map(s => {
        const o = ordenes.find(ord => ord.id === s.orden_id) || {};
        const estado = s.estado || 'pendiente_jefe';
        const color = estadoColor[estado] || '#6B7280';
        const bg = estadoBg[estado] || '#F3F4F6';
        return `<div class="solicitud-card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
            <div style="min-width:0">
              <div style="font-family:'DM Mono',monospace;font-weight:800;font-size:15px">${escapeHtml(o.placa) || 'Orden #' + s.orden_id}</div>
              <div style="font-size:12px;color:var(--gris-mid);margin-top:2px">${[o.marca,o.linea].filter(Boolean).map(escapeHtml).join(' ') || escapeHtml(o.propietario) || 'Sin datos'} · ${formatTS(s.creado_en)}</div>
            </div>
            <span style="font-size:11px;font-weight:800;color:${color};background:${bg};padding:4px 10px;border-radius:99px;text-transform:uppercase;white-space:nowrap">${estadoLabel[estado] || estado}</span>
          </div>
          <div style="font-weight:700;margin-bottom:4px">${escapeHtml(s.repuesto) || 'Repuesto sin nombre'}</div>
          <div style="font-size:12px;color:var(--gris-mid)">Cantidad: ${s.unidades || 1}${s.observaciones ? ' · ' + escapeHtml(s.observaciones) : ''}</div>
          ${s.nota_jefe ? `<div style="font-size:12px;color:var(--texto);background:var(--gris-bg);padding:8px;border-radius:6px;margin-top:10px">${escapeHtml(s.nota_jefe)}</div>` : ''}
          <div class="btn-row" style="margin-top:10px">
            <button class="btn btn-ghost btn-sm" onclick="abrirOrdenMecanico(${s.orden_id})">Ver orden</button>
          </div>
        </div>`;
      }).join('') : '<div class="empty-state"><p>No tienes solicitudes de repuestos todavía.</p></div>'}
    `;
    return;
    }

    const etapas = await api(`/etapas?mecanico_id=eq.${sesion.id}&fin=is.null&select=orden_id`).catch(()=>[]) || [];
    const oids = [...new Set(etapas.map(e=>e.orden_id))];
    const ordenes = oids.length ? await api(`/ordenes?id=in.(${oids.join(',')})&select=id,placa,propietario`).catch(()=>[]) || [] : [];
    const solicitudes = await api(`/solicitudes_repuesto?solicitado_por=eq.${encodeURIComponent(sesion.nombre)}&order=creado_en.desc&limit=30&select=*`).catch(()=>[]) || [];
    const estadoColor = {
      pendiente_jefe:'#D97706', enviado_repuestos:'#7C3AED',
      cotizado:'#2563EB', pedido:'#0891B2',
      entregado:'#059669', rechazado:'#DC2626'
    };
    const estadoBg = {
      pendiente_jefe:'#FEF3C7', enviado_repuestos:'#EDE9FE',
      cotizado:'#EBF2FF', pedido:'#E0F2FE',
      entregado:'#E6F5EF', rechazado:'#FEE2E2'
    };
    const estadoLabel = {
      pendiente_jefe:'Pendiente revisión', enviado_repuestos:'En gestión',
      cotizado:'Cotizado', pedido:'Pedido al proveedor',
      entregado:'Entregado ✓', rechazado:'Rechazado'
    };

    _mecRepItems = [0];
    cont.innerHTML = `
      ${solicitudes.length ? `<div style="margin-bottom:20px">
        <div class="seccion-titulo" style="margin-bottom:10px">Mis solicitudes</div>
        ${solicitudes.map(s => {
          const o = ordenes.find(ord=>ord.id===s.orden_id)||{};
          const color = estadoColor[s.estado]||'#6B7280';
          const bg = estadoBg[s.estado]||'#F3F4F6';
          const puedeRecibir = s.estado === 'enviado';
          return `<div style="border:1px solid var(--gris-borde);border-radius:8px;padding:12px;margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${puedeRecibir?'10px':'0'}">
              <div>
                <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:14px">${o.placa||'—'}</div>
                <div style="font-size:11px;color:var(--gris-mid);margin-top:2px">${formatTS(s.creado_en)}</div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${color};background:${bg};padding:3px 12px;border-radius:99px;text-transform:uppercase">${estadoLabel[s.estado]||s.estado}</span>
            </div>
            ${puedeRecibir ? `<button class="btn btn-success btn-sm" style="width:100%" onclick="marcarRepuestoRecibido(${s.id})">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              Confirmar recibido
            </button>` : ''}
          </div>`;
        }).join('')}
      </div>` : ''}
      <div class="seccion-titulo" style="margin-bottom:10px">Nueva solicitud</div>
      ${!oids.length ? '<div style="font-size:13px;color:var(--gris-mid);padding:12px 0">No tenés órdenes activas asignadas.</div>' : `
        <div class="field" style="margin-bottom:12px"><label>Orden de trabajo *</label>
          <select id="mec-rep-orden">
            <option value="">— Seleccioná la orden —</option>
            ${ordenes.map(o=>`<option value="${o.id}">${o.placa} · ${o.propietario||'—'}</option>`).join('')}
          </select>
        </div>
        <div id="mec-rep-items">${renderMecRepItem(0)}</div>
        <button class="btn btn-ghost btn-sm" onclick="agregarMecRepItem()" style="margin-top:4px;margin-bottom:16px">+ Agregar pieza</button>
        <div class="btn-row"><button class="btn btn-primary" onclick="enviarMecRepuestos()">Enviar solicitud</button></div>
      `}`;
  } catch(e) { cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`; }
}

function renderMecRepItem(idx) {
  return `<div style="background:var(--gris-bg);border-radius:8px;padding:12px;margin-bottom:8px" id="mec-ri-${idx}">
    ${_mecRepItems.length>1?`<div style="display:flex;justify-content:flex-end;margin-bottom:4px"><button class="btn btn-ghost btn-xs" onclick="quitarMecRepItem(${idx})" style="color:var(--rojo)">✕</button></div>`:''}
    <div style="display:grid;grid-template-columns:1fr 70px;gap:8px;margin-bottom:8px">
      <div class="field"><label>Descripción *</label><input id="mec-rdesc-${idx}" type="text" placeholder="Nombre de la pieza"></div>
      <div class="field"><label>Cant.</label><input id="mec-rcant-${idx}" type="number" min="1" value="1"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="field"><label>N° Parte OEM</label><input id="mec-rpart-${idx}" type="text" placeholder="Opcional"></div>
      <div class="field"><label>Operación</label>
        <select id="mec-roper-${idx}">
          <option value="reemplazar">Reemplazar</option>
          <option value="reparar">Reparar</option>
          <option value="pintar">Pintar</option>
          <option value="calibrar">Calibrar</option>
          <option value="programar">Programar</option>
        </select>
      </div>
    </div>
  </div>`;
}

function agregarMecRepItem() {
  const idx = Date.now();
  _mecRepItems.push(idx);
  document.getElementById('mec-rep-items')?.insertAdjacentHTML('beforeend', renderMecRepItem(idx));
}

function quitarMecRepItem(idx) {
  _mecRepItems = _mecRepItems.filter(i=>i!==idx);
  document.getElementById(`mec-ri-${idx}`)?.remove();
}

async function enviarMecRepuestos() {
  const ordenId = parseInt(document.getElementById('mec-rep-orden')?.value);
  if (!ordenId) { toast('Seleccioná una orden', 'err'); return; }
  const items = _mecRepItems.map(idx => ({
    descripcion: document.getElementById(`mec-rdesc-${idx}`)?.value?.trim()||'',
    cantidad: parseInt(document.getElementById(`mec-rcant-${idx}`)?.value)||1,
    numero_parte_oem: document.getElementById(`mec-rpart-${idx}`)?.value?.trim()||null,
    operacion: document.getElementById(`mec-roper-${idx}`)?.value||'reemplazar'
  }));
  if (items.some(i=>!i.descripcion)) { toast('Completá la descripción de cada pieza', 'err'); return; }
  try {
    const res = await api('/repuestos_solicitud?select=id', 'POST', {
      orden_id: ordenId, solicitado_por: sesion?.nombre||'Mecánico', estado: 'pendiente'
    }, { Prefer: 'return=representation' });
    const sid = res[0].id;
    for (const item of items) {
      await api('/repuestos_items', 'POST', { solicitud_id: sid, ...item }, { Prefer: 'return=minimal' });
    }
    toast('Solicitud enviada ✓');
    _mecRepItems = [0];
    cargarRepuestosMecanico();
  } catch(e) { toast('Error: '+e.message, 'err'); }
}
async function marcarRepuestoRecibido(solicitudId) {
  try {
    await api(`/repuestos_solicitud?id=eq.${solicitudId}`, 'PATCH', {
      estado: 'recibido',
      recibido_en: new Date().toISOString()
    });
    toast('Repuestos confirmados como recibidos ✓');
    cargarRepuestosMecanico();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}
