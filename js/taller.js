// ═══════════════════════════════════════════════════════════
// PANTALLA TALLER — Layout TV: grid 3 col + panel derecho
// ═══════════════════════════════════════════════════════════

const _tallerOrdenesNotificadas = new Set();
let _tallerEtapasSnapshot = {};
let _tallerOverlayTimer = null;

function montarTaller() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  const hamburger = document.querySelector('.hamburger');
  const bottomNav = document.getElementById('bottom-nav');
  const topbar    = document.querySelector('.topbar');
  const main      = document.querySelector('.main');
  const content   = document.querySelector('.content');

  if (sidebar)   sidebar.style.display   = 'none';
  if (overlay)   overlay.style.display   = 'none';
  if (hamburger) hamburger.style.display = 'none';
  if (bottomNav) bottomNav.style.display = 'none';
  if (topbar)    topbar.style.display    = 'none';
  if (main)      { main.style.marginLeft = '0'; main.style.height = '100vh'; main.style.overflow = 'hidden'; }
  if (content)   { content.style.padding = '0'; content.style.maxWidth = '100%'; content.style.height = '100%'; }

  document.body.style.background = '#060B14';
  document.body.style.overflow   = 'hidden';
  document.body.style.height     = '100vh';

  if (!document.getElementById('taller-audio')) {
    const audio = document.createElement('audio');
    audio.id = 'taller-audio'; audio.src = 'motor.mp3'; audio.preload = 'auto';
    document.body.appendChild(audio);
  }

  if (!document.getElementById('taller-tv-styles')) {
    const st = document.createElement('style');
    st.id = 'taller-tv-styles';
    st.textContent = `
      @keyframes pulse-dot  { 0%,100%{opacity:1} 50%{opacity:.35} }
      @keyframes flash-border {
        0%,100%{border-color:rgba(255,255,255,.1)}
        30%,70%{border-color:#F59E0B;box-shadow:0 0 0 1px #F59E0B44}
      }
      @keyframes overlay-in {
        from{opacity:0;transform:scale(.95)}
        to{opacity:1;transform:scale(1)}
      }
      @keyframes slide-in-right {
        from{opacity:0;transform:translateX(20px)}
        to{opacity:1;transform:translateX(0)}
      }
      #pag-taller {
        background:#060B14;height:100vh;overflow:hidden;
        display:flex;flex-direction:column;
      }
      .tv-shell {
        display:flex;flex-direction:column;height:100vh;overflow:hidden;position:relative;
      }
      .tv-header {
        background:#060B14;border-bottom:1px solid rgba(255,255,255,.1);
        padding:0 24px;height:48px;flex-shrink:0;
        display:flex;align-items:center;justify-content:space-between;
      }
      .tv-brand { display:flex;align-items:center;gap:10px; }
      .tv-brand-dot {
        width:8px;height:8px;border-radius:50%;background:#22C55E;
        animation:pulse-dot 2s infinite;
      }
      .tv-brand-name {
        font-family:'DM Mono',monospace;font-size:10px;
        letter-spacing:.18em;color:rgba(255,255,255,.45);text-transform:uppercase;
      }
      .tv-clock {
        font-family:'DM Mono',monospace;font-size:20px;font-weight:700;
        letter-spacing:.06em;color:#FFFFFF;
      }
      .tv-date {
        font-family:'DM Mono',monospace;font-size:10px;
        letter-spacing:.08em;color:#FFFFFF;
        text-align:right;text-transform:uppercase;
      }
      /* ── KPI STRIP ── */
      .tv-kpi-strip {
        display:grid;grid-template-columns:repeat(4,1fr);
        border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;
      }
      .tv-kpi {
        padding:8px 24px;border-right:1px solid rgba(255,255,255,.08);
        display:flex;align-items:center;gap:10px;
      }
      .tv-kpi:last-child { border-right:none; }
      .tv-kpi-num {
        font-family:'DM Mono',monospace;font-size:32px;font-weight:700;line-height:1;
      }
      .tv-kpi-label {
        font-size:10px;font-weight:600;text-transform:uppercase;
        letter-spacing:.09em;color:rgba(255,255,255,.4);line-height:1.4;
      }
      /* ── BODY: grid + panel ── */
      .tv-body {
        flex:1;overflow:hidden;padding:10px 0 10px;
        display:flex;gap:0;
      }
      .tv-grid-wrap {
        flex:1;overflow:hidden;padding:0 10px 0 18px;
        display:flex;flex-direction:column;
      }
      .tv-grid {
        display:grid;
        grid-template-columns:repeat(3,1fr);
        grid-template-rows:repeat(2,1fr);
        gap:8px;flex:1;overflow:hidden;
      }
      /* ── PANEL DERECHO ── */
      .tv-panel-right {
        width:220px;flex-shrink:0;
        border-left:1px solid rgba(255,255,255,.08);
        display:flex;flex-direction:column;
        overflow:hidden;padding:0 0 10px;
      }
      .tv-panel-title {
        font-family:'DM Mono',monospace;font-size:9px;font-weight:700;
        letter-spacing:.18em;text-transform:uppercase;
        color:rgba(255,255,255,.4);
        padding:10px 16px 8px;
        border-bottom:1px solid rgba(255,255,255,.06);
        flex-shrink:0;
      }
      .tv-panel-list {
        flex:1;overflow-y:auto;padding:8px 12px;
        display:flex;flex-direction:column;gap:6px;
      }
      .tv-panel-list::-webkit-scrollbar { width:3px; }
      .tv-panel-list::-webkit-scrollbar-track { background:transparent; }
      .tv-panel-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1);border-radius:2px; }
      .tv-panel-item {
        border-radius:7px;padding:9px 11px;
        display:flex;flex-direction:column;gap:4px;
        animation:slide-in-right .4s ease;
        flex-shrink:0;
      }
      .tv-panel-item.listo {
        background:rgba(245,158,11,.08);
        border:1px solid rgba(245,158,11,.25);
      }
      .tv-panel-item.entregado {
        background:rgba(34,197,94,.07);
        border:1px solid rgba(34,197,94,.22);
      }
      .tv-panel-placa {
        font-family:'DM Mono',monospace;font-size:15px;font-weight:700;
        color:#FFFFFF;letter-spacing:.04em;line-height:1;
      }
      .tv-panel-vehiculo {
        font-size:10px;color:rgba(255,255,255,.35);
      }
      .tv-panel-status {
        font-size:9px;font-weight:700;letter-spacing:.06em;
        text-transform:uppercase;margin-top:2px;
      }
      .tv-panel-status.listo    { color:#FCD34D; }
      .tv-panel-status.entregado{ color:#4ADE80; }
      .tv-panel-time {
        font-family:'DM Mono',monospace;font-size:9px;
        color:rgba(255,255,255,.25);margin-top:1px;
      }
      .tv-panel-empty {
        font-size:10px;color:rgba(255,255,255,.15);
        font-style:italic;padding:12px 0;text-align:center;
      }
      /* ── TARJETAS GRID ── */
      .tv-card {
        background:#0C1220;border:1px solid rgba(255,255,255,.1);
        border-radius:9px;overflow:hidden;display:flex;flex-direction:column;
        cursor:pointer;transition:border-color .2s;
      }
      .tv-card:hover { border-color:rgba(255,255,255,.22); }
      .tv-card.updated { animation:flash-border 1.5s ease-in-out; }
      .tv-card-head {
        padding:9px 13px 7px;border-bottom:1px solid rgba(255,255,255,.07);
        display:flex;align-items:flex-start;justify-content:space-between;gap:6px;flex-shrink:0;
      }
      .tv-placa {
        font-family:'DM Mono',monospace;font-size:18px;font-weight:700;
        color:#FFFFFF;letter-spacing:.05em;line-height:1;
      }
      .tv-vehiculo { font-size:10px;color:rgba(255,255,255,.38);margin-top:2px; }
      .tv-tag {
        font-family:'DM Mono',monospace;font-size:8px;font-weight:700;
        padding:2px 6px;border-radius:3px;text-transform:uppercase;
        letter-spacing:.07em;white-space:nowrap;border:1px solid transparent;
      }
      .tv-tag-amber { background:rgba(245,158,11,.15);color:#FCD34D;border-color:rgba(245,158,11,.35); }
      .tv-tag-blue  { background:rgba(59,130,246,.15);color:#93C5FD;border-color:rgba(59,130,246,.35); }
      .tv-tag-red   { background:rgba(248,113,113,.13);color:#F87171;border-color:rgba(248,113,113,.3); }
      .tv-tag-gray  { background:rgba(255,255,255,.07);color:rgba(255,255,255,.5);border-color:rgba(255,255,255,.12); }
      .tv-card-body { padding:7px 13px 5px;flex:1;display:flex;flex-direction:column;gap:2px; }
      .tv-etapa-row { display:flex;align-items:center;gap:6px;padding:1px 0; }
      .tv-edot      { width:7px;height:7px;border-radius:50%;flex-shrink:0; }
      .tv-edot.done { background:#22C55E; }
      .tv-edot.active { background:#F59E0B; }
      .tv-edot.pending{ background:transparent;border:1.5px solid rgba(255,255,255,.15); }
      .tv-edot.waiting{ background:transparent;border:1.5px solid rgba(245,158,11,.4); }
      .tv-ename     { font-size:11px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .tv-ename.done   { color:rgba(255,255,255,.48); }
      .tv-ename.active { color:#FCD34D;font-weight:700; }
      .tv-ename.pending{ color:rgba(255,255,255,.18); }
      .tv-ename.waiting{ color:rgba(245,158,11,.6); }
      .tv-etime     { font-family:'DM Mono',monospace;font-size:10px;flex-shrink:0; }
      .tv-etime.active{ color:#FCD34D;font-weight:700; }
      .tv-etime.done  { color:rgba(255,255,255,.28); }
      .tv-card-foot {
        padding:5px 13px;border-top:1px solid rgba(255,255,255,.07);
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
      }
      .tv-mname { font-size:10px;color:rgba(255,255,255,.4); }
      .tv-entrega-chip{ font-family:'DM Mono',monospace;font-size:9px;font-weight:700; }
      /* ── OVERLAY ── */
      .tv-update-overlay {
        position:absolute;inset:0;background:rgba(6,11,20,.88);
        z-index:30;display:flex;align-items:center;justify-content:center;padding:20px;
      }
      .tv-overlay-card {
        background:#0C1220;border:2px solid #F59E0B;border-radius:12px;
        width:300px;overflow:hidden;animation:overlay-in .3s ease;
      }
      .tv-overlay-card.green-border { border-color:#22C55E; }
      .tv-overlay-badge {
        background:#F59E0B;color:#060B14;
        font-family:'DM Mono',monospace;font-size:9px;font-weight:700;
        letter-spacing:.18em;text-transform:uppercase;
        padding:6px 16px;text-align:center;
      }
      .tv-overlay-badge.green-bg { background:#22C55E; }
      .tv-overlay-head {
        padding:14px 18px 10px;border-bottom:1px solid rgba(255,255,255,.08);
      }
      .tv-overlay-placa {
        font-family:'DM Mono',monospace;font-size:26px;font-weight:700;
        color:#FFFFFF;letter-spacing:.04em;line-height:1;
      }
      .tv-overlay-veh { font-size:12px;color:rgba(255,255,255,.38);margin-top:3px; }
      .tv-overlay-body { padding:10px 18px; }
      .tv-overlay-row {
        display:flex;align-items:center;gap:8px;padding:5px 0;
        border-bottom:1px solid rgba(255,255,255,.05);
      }
      .tv-overlay-row:last-child { border-bottom:none; }
      .tv-odot        { width:9px;height:9px;border-radius:50%;flex-shrink:0; }
      .tv-odot.done   { background:#22C55E; }
      .tv-odot.active { background:#F59E0B; }
      .tv-odot.pending{ background:transparent;border:2px solid rgba(255,255,255,.15); }
      .tv-oname       { font-size:13px;flex:1; }
      .tv-oname.done  { color:rgba(255,255,255,.5); }
      .tv-oname.active{ color:#FCD34D;font-weight:700; }
      .tv-oname.pending{ color:rgba(255,255,255,.2); }
      .tv-otime       { font-family:'DM Mono',monospace;font-size:12px;font-weight:700; }
      .tv-otime.active{ color:#FCD34D; }
      .tv-otime.done  { color:rgba(255,255,255,.28); }
      .tv-overlay-foot {
        padding:10px 18px;border-top:1px solid rgba(255,255,255,.08);
        display:flex;justify-content:space-between;align-items:center;
      }
      .tv-overlay-tec { font-size:11px;color:rgba(255,255,255,.45); }
      .tv-overlay-entrega { font-size:11px;font-weight:700; }
      .tv-overlay-countdown {
        font-family:'DM Mono',monospace;font-size:9px;
        color:rgba(255,255,255,.25);text-align:center;
        padding:7px;border-top:1px solid rgba(255,255,255,.05);
      }
      .tv-empty {
        flex:1;display:flex;align-items:center;justify-content:center;
        font-family:'DM Mono',monospace;font-size:13px;
        letter-spacing:.15em;color:rgba(255,255,255,.12);text-transform:uppercase;
      }
      .tv-watermark {
        position:fixed;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:380px;height:380px;pointer-events:none;z-index:0;
      }
    `;
    document.head.appendChild(st);
  }

  const pagTaller = document.getElementById('pag-taller');
  if (pagTaller) pagTaller.style.cssText = 'display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#060B14';

  mostrarPagina('pag-taller');
  cargarPantallaTaller();
  iniciarRelojTaller();
  setInterval(() => { if (sesion?.perfil === 'taller') cargarPantallaTaller(); }, 30000);
}

function iniciarRelojTaller() {
  function tick() {
    const reloj = document.getElementById('taller-reloj');
    const fecha  = document.getElementById('taller-fecha');
    const now    = new Date();
    if (reloj) reloj.textContent = now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    if (fecha)  fecha.innerHTML  = now.toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).toUpperCase();
  }
  tick();
  setInterval(tick, 1000);
}

function _tvTimerStr(inicioISO) {
  if (!inicioISO) return '';
  const secs = Math.floor((Date.now() - new Date(inicioISO)) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = n => String(n).padStart(2,'0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function _tvHoraStr(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:false });
}

function _tvEntregaInfo(orden) {
  if (!orden.fecha_entrega_1) return { color:'rgba(255,255,255,.35)', label:'Sin fecha' };
  const dias = Math.round((new Date(orden.fecha_entrega_1) - new Date()) / 86400000);
  if (dias < 0)   return { color:'#F87171', label:`${Math.abs(dias)}d vencida` };
  if (dias === 0) return { color:'#FCD34D', label:'Hoy' };
  if (dias <= 2)  return { color:'#FCD34D', label:`${dias}d` };
  return { color:'#4ADE80', label:`${dias}d` };
}

function _tvMostrarOverlay(orden, etapasOrden, badge, esVerde) {
  if (_tallerOverlayTimer) clearInterval(_tallerOverlayTimer);

  const { color: entColor, label: entLabel } = _tvEntregaInfo(orden);
  const tecnico = etapasOrden.find(e => e.inicio && !e.fin)?.tecnico
    || etapasOrden.filter(e => e.tecnico).slice(-1)[0]?.tecnico || '';

  const etapasHtml = etapasOrden.map(e => {
    const cls = e.fin ? 'done' : (e.inicio && !e.fin ? 'active' : 'pending');
    const tiempo = cls === 'active' ? _tvTimerStr(e.inicio) : (cls === 'done' ? '✓' : '');
    return `<div class="tv-overlay-row">
      <div class="tv-odot ${cls}"></div>
      <span class="tv-oname ${cls}">${e.etapa||'—'}</span>
      <span class="tv-otime ${cls}">${tiempo}</span>
    </div>`;
  }).join('');

  const overlayHtml = `
    <div class="tv-update-overlay" id="tv-overlay" onclick="this.remove()">
      <div class="tv-overlay-card${esVerde?' green-border':''}" onclick="event.stopPropagation()">
        <div class="tv-overlay-badge${esVerde?' green-bg':''}">${badge}</div>
        <div class="tv-overlay-head">
          <div class="tv-overlay-placa">${orden.placa}</div>
          <div class="tv-overlay-veh">${[orden.marca,orden.linea].filter(Boolean).join(' ')||'—'}</div>
        </div>
        <div class="tv-overlay-body">${etapasHtml}</div>
        <div class="tv-overlay-foot">
          <span class="tv-overlay-tec">${tecnico||'—'}</span>
          <span class="tv-overlay-entrega" style="color:${esVerde?'#4ADE80':entColor}">${esVerde?'✓ Proceso completo':entLabel}</span>
        </div>
        <div class="tv-overlay-countdown" id="tv-overlay-cd">Cerrando en 5s — toca para cerrar</div>
      </div>
    </div>`;

  const shell = document.querySelector('.tv-shell');
  if (!shell) return;
  const existing = document.getElementById('tv-overlay');
  if (existing) existing.remove();
  shell.insertAdjacentHTML('beforeend', overlayHtml);

  let countdown = 5;
  _tallerOverlayTimer = setInterval(() => {
    countdown--;
    const cd = document.getElementById('tv-overlay-cd');
    if (cd) cd.textContent = `Cerrando en ${countdown}s — toca para cerrar`;
    if (countdown <= 0) {
      clearInterval(_tallerOverlayTimer);
      const ov = document.getElementById('tv-overlay');
      if (ov) ov.remove();
    }
  }, 1000);
}

async function cargarPantallaTaller() {
  const cont = document.getElementById('taller-contenido');
  if (!cont) return;

  try {
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const manana = new Date(hoy); manana.setDate(manana.getDate()+1);
    const hoyISO = hoy.toISOString().split('T')[0];

    const [ordenesActivas, entregadasHoy, etapasActivas, etapasTodas] = await Promise.all([
      api(`/ordenes?estado=eq.Activa&order=fecha_entrega_1.asc`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Entregada&entregada_en=gte.${hoy.toISOString()}&order=entregada_en.desc`).catch(()=>[]) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,etapa,servicio,mecanico_id,tecnico,inicio`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,etapa,servicio,inicio,fin,tecnico&order=creado_en.asc`).catch(()=>[]) || []
    ]);

    // ── Clasificar órdenes activas ───────────────────────────
    // LISTAS: todas las etapas tienen fin — ya no van al grid
    const ordenesListas = ordenesActivas.filter(o => {
      const ets = etapasTodas.filter(e => e.orden_id === o.id);
      return ets.length > 0 && ets.every(e => e.fin);
    });
    const listasIds = new Set(ordenesListas.map(o => o.id));

    // EN GRID: tienen al menos una etapa sin fin (activa o pendiente) — FIX bug desaparición
    const ordenesEnGrid = ordenesActivas.filter(o => {
      const ets = etapasTodas.filter(e => e.orden_id === o.id);
      // Sin etapas asignadas: mostrar igual
      if (!ets.length) return true;
      // Mostrar si queda al menos una etapa sin completar
      return ets.some(e => !e.fin);
    }).filter(o => !listasIds.has(o.id));

    const creadasHoy  = ordenesEnGrid.filter(o => new Date(o.creado_en) >= hoy && new Date(o.creado_en) < manana);
    const entregarHoy = ordenesEnGrid.filter(o => o.fecha_entrega_1?.split('T')[0] === hoyISO || o.fecha_entrega_2?.split('T')[0] === hoyISO);
    const enProceso   = ordenesEnGrid.filter(o => etapasActivas.some(e => e.orden_id === o.id));

    // ── Sonido + overlay para nuevas entregas y nuevas listas ─
    const nuevasEntregadas = entregadasHoy.filter(o => !_tallerOrdenesNotificadas.has('ent_' + o.id));
    if (nuevasEntregadas.length) {
      nuevasEntregadas.forEach(o => _tallerOrdenesNotificadas.add('ent_' + o.id));
      const audio = document.getElementById('taller-audio');
      if (audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
      const oEnt = nuevasEntregadas[0];
      const etsEnt = etapasTodas.filter(e => e.orden_id === oEnt.id);
      setTimeout(() => _tvMostrarOverlay(oEnt, etsEnt, '✓ ORDEN ENTREGADA', true), 600);
    }

    const nuevasListas = ordenesListas.filter(o => !_tallerOrdenesNotificadas.has('lst_' + o.id));
    if (nuevasListas.length && !nuevasEntregadas.length) {
      nuevasListas.forEach(o => _tallerOrdenesNotificadas.add('lst_' + o.id));
      const audio = document.getElementById('taller-audio');
      if (audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
      const oLst = nuevasListas[0];
      const etsLst = etapasTodas.filter(e => e.orden_id === oLst.id);
      setTimeout(() => _tvMostrarOverlay(oLst, etsLst, '✓ VEHÍCULO LISTO', true), 600);
    }

    // ── Detectar cambio de etapa activa para overlay ─────────
    const snapshotNuevo = {};
    etapasActivas.forEach(e => { snapshotNuevo[e.orden_id] = e.id; });
    let ordenCambiada = null;
    let badgeOverlay  = 'ETAPA ACTUALIZADA';

    Object.entries(snapshotNuevo).forEach(([oid, eid]) => {
      if (_tallerEtapasSnapshot[oid] && _tallerEtapasSnapshot[oid] !== eid) {
        ordenCambiada = ordenesActivas.find(o => o.id === parseInt(oid));
        badgeOverlay  = 'ETAPA ACTUALIZADA';
      }
    });
    creadasHoy.forEach(o => {
      const key = 'ord_' + o.id;
      if (!_tallerEtapasSnapshot[key] && Object.keys(_tallerEtapasSnapshot).length > 0) {
        ordenCambiada = o;
        badgeOverlay  = 'ORDEN INGRESADA';
      }
      _tallerEtapasSnapshot[key] = true;
    });
    _tallerEtapasSnapshot = { ..._tallerEtapasSnapshot, ...snapshotNuevo };

    // ── Render tarjeta de grid ───────────────────────────────
    function renderCard(orden) {
      const etsOrden    = etapasTodas.filter(e => e.orden_id === orden.id);
      const etapaActiva = etapasActivas.find(e => e.orden_id === orden.id);
      const { color: entColor, label: entLabel } = _tvEntregaInfo(orden);
      const tecnico = etapaActiva?.tecnico || '';

      const esIngreso  = creadasHoy.some(o => o.id === orden.id);
      const esEntrega  = entregarHoy.some(o => o.id === orden.id);
      let tag = '';
      if (esIngreso && esEntrega) tag = '<span class="tv-tag tv-tag-amber">Entrega hoy</span>';
      else if (esIngreso)         tag = '<span class="tv-tag tv-tag-blue">Nuevo hoy</span>';
      else if (esEntrega) {
        const dias = Math.round((new Date(orden.fecha_entrega_1) - new Date()) / 86400000);
        tag = dias < 0
          ? `<span class="tv-tag tv-tag-red">${Math.abs(dias)}d vencida</span>`
          : '<span class="tv-tag tv-tag-amber">Entrega hoy</span>';
      } else if (orden.fecha_entrega_1) {
        const dias = Math.round((new Date(orden.fecha_entrega_1) - new Date()) / 86400000);
        if (dias < 0)        tag = `<span class="tv-tag tv-tag-red">${Math.abs(dias)}d vencida</span>`;
        else if (dias === 0) tag = '<span class="tv-tag tv-tag-amber">Hoy</span>';
        else if (dias <= 2)  tag = `<span class="tv-tag tv-tag-amber">${dias}d</span>`;
        else                 tag = `<span class="tv-tag tv-tag-gray">${dias}d</span>`;
      }

      // Etapas: máx 5, prioriza completadas + activa + esperando
      const MAX = 5;
      let etapasHtml = '';
      if (etsOrden.length) {
        const relevantes = etsOrden.filter(e => e.fin || e.inicio);
        const pendientes  = etsOrden.filter(e => !e.fin && !e.inicio);
        const visibles    = etsOrden.length <= MAX
          ? etsOrden
          : [...relevantes, ...pendientes.slice(0, Math.max(0, MAX - relevantes.length))];
        const ocultas = etsOrden.length - visibles.length;

        etapasHtml = visibles.map(e => {
          // done = tiene fin; active = inicio pero no fin; waiting = terminó última etapa, esperando inicio de esta
          const done    = !!e.fin;
          const active  = !!e.inicio && !e.fin;
          // "waiting" = no tiene inicio ni fin pero la etapa anterior sí terminó
          const idxE    = etsOrden.indexOf(e);
          const prevDone= idxE > 0 && !!etsOrden[idxE-1]?.fin;
          const waiting = !done && !active && prevDone;
          const cls     = done ? 'done' : active ? 'active' : waiting ? 'waiting' : 'pending';

          const tiempo = active
            ? `<span class="tv-etime active" id="tv-et-${e.id}">${_tvTimerStr(e.inicio)}</span>`
            : done
              ? `<span class="tv-etime done">✓</span>`
              : waiting
                ? `<span style="font-size:9px;color:rgba(245,158,11,.5)">próxima</span>`
                : '';

          return `<div class="tv-etapa-row">
            <div class="tv-edot ${cls}"></div>
            <span class="tv-ename ${cls}">${e.etapa||'—'}</span>
            ${tiempo}
          </div>`;
        }).join('');

        if (ocultas > 0) {
          etapasHtml += `<div style="font-size:9px;color:rgba(255,255,255,.2);padding-top:2px">+${ocultas} pendientes</div>`;
        }
      } else {
        etapasHtml = `<span style="font-size:10px;color:rgba(255,255,255,.2);font-style:italic">Sin etapas asignadas</span>`;
      }

      return `<div class="tv-card" onclick="_tvVerDetalle(${orden.id})" id="tv-card-${orden.id}">
        <div class="tv-card-head">
          <div>
            <div class="tv-placa">${orden.placa}</div>
            <div class="tv-vehiculo">${[orden.marca,orden.linea].filter(Boolean).join(' ')||'—'}</div>
          </div>
          ${tag}
        </div>
        <div class="tv-card-body">${etapasHtml}</div>
        <div class="tv-card-foot">
          <span class="tv-mname">${tecnico||'Sin técnico activo'}</span>
          <span class="tv-entrega-chip" style="color:${entColor}">${entLabel}</span>
        </div>
      </div>`;
    }

    // ── Render panel derecho ────────────────────────────────
    // Combina: listas (todas etapas fin, aún Activa) + entregadas hoy
    const panelItems = [
      ...ordenesListas.map(o => ({ orden:o, tipo:'listo' })),
      ...entregadasHoy.map(o => ({ orden:o, tipo:'entregado' }))
    ];

    const panelHtml = panelItems.length
      ? panelItems.map(({orden, tipo}) => {
          const hora = tipo === 'entregado'
            ? _tvHoraStr(orden.entregada_en)
            : '';
          const statusTxt = tipo === 'listo'
            ? 'Vehículo listo — preparando entrega'
            : '✓ Entregado al cliente';
          return `<div class="tv-panel-item ${tipo}" onclick="_tvVerDetalle(${orden.id})">
            <div class="tv-panel-placa">${orden.placa}</div>
            <div class="tv-panel-vehiculo">${[orden.marca,orden.linea].filter(Boolean).join(' ')||'—'}</div>
            <div class="tv-panel-status ${tipo}">${statusTxt}</div>
            ${hora ? `<div class="tv-panel-time">${hora}</div>` : ''}
          </div>`;
        }).join('')
      : '<div class="tv-panel-empty">Sin terminados hoy</div>';

    // ── Render HTML completo ────────────────────────────────
    const gridCards = ordenesEnGrid.slice(0, 6).map(renderCard).join('');

    cont.innerHTML = `
      <div class="tv-shell">
        <div class="tv-header">
          <div class="tv-brand">
            <div class="tv-brand-dot"></div>
            <span class="tv-brand-name">Freimanautos · Sistema Operativo</span>
          </div>
          <div id="taller-reloj" class="tv-clock"></div>
          <div id="taller-fecha" class="tv-date"></div>
        </div>

        <div class="tv-kpi-strip">
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#93C5FD">${ordenesActivas.length}</div>
            <div class="tv-kpi-label">Órdenes<br>activas</div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#4ADE80">${entregadasHoy.length}</div>
            <div class="tv-kpi-label">Entregadas<br>hoy</div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#93C5FD">${creadasHoy.length}</div>
            <div class="tv-kpi-label">Ingresaron<br>hoy</div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#FCD34D">${enProceso.length}</div>
            <div class="tv-kpi-label">En proceso<br>ahora</div>
          </div>
        </div>

        <div class="tv-body">
          <div class="tv-grid-wrap">
            ${gridCards
              ? `<div class="tv-grid">${gridCards}</div>`
              : '<div class="tv-empty">Sin órdenes activas</div>'
            }
          </div>
          <div class="tv-panel-right">
            <div class="tv-panel-title">Listos hoy</div>
            <div class="tv-panel-list">${panelHtml}</div>
          </div>
        </div>
      </div>

      <div class="tv-watermark">
        <img src="Logo_Fondo_Taller.png"
          style="width:100%;height:100%;object-fit:contain;opacity:0.04;filter:grayscale(1) brightness(3)" alt="">
      </div>
    `;

    window._tvEtapasTodas    = etapasTodas;
    window._tvOrdenesActivas = ordenesActivas;
    window._tvEntregadasHoy  = entregadasHoy;

    iniciarRelojTaller();

    if (window._tallerTimerInterval) clearInterval(window._tallerTimerInterval);
    window._tallerTimerInterval = setInterval(() => {
      etapasActivas.forEach(e => {
        const el = document.getElementById(`tv-et-${e.id}`);
        if (el) el.textContent = _tvTimerStr(e.inicio);
      });
    }, 1000);

    // Overlay automático por cambio de etapa
    if (ordenCambiada && !nuevasEntregadas.length && !nuevasListas.length) {
      const ets = etapasTodas.filter(e => e.orden_id === ordenCambiada.id);
      setTimeout(() => _tvMostrarOverlay(ordenCambiada, ets, badgeOverlay, false), 400);
      const cardEl = document.getElementById(`tv-card-${ordenCambiada.id}`);
      if (cardEl) { cardEl.classList.remove('updated'); void cardEl.offsetWidth; cardEl.classList.add('updated'); }
    }

  } catch(e) {
    cont.innerHTML = `<div style="color:#F87171;padding:40px;font-family:'DM Mono',monospace;font-size:18px">ERROR: ${e.message}</div>`;
  }
}

function _tvVerDetalle(ordenId) {
  const todas = [...(window._tvOrdenesActivas||[]), ...(window._tvEntregadasHoy||[])];
  const orden  = todas.find(o => o.id === ordenId);
  if (!orden) return;
  const ets = (window._tvEtapasTodas||[]).filter(e => e.orden_id === ordenId);
  const esEntregada = (window._tvEntregadasHoy||[]).some(o => o.id === ordenId);
  _tvMostrarOverlay(orden, ets, esEntregada ? '✓ ENTREGADA HOY' : 'DETALLE DE ORDEN', esEntregada);
}