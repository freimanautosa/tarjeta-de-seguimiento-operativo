// ═══════════════════════════════════════════════════════════
// PANTALLA TALLER — Diseño TV con tarjetas grandes
// ═══════════════════════════════════════════════════════════

const _tallerOrdenesNotificadas = new Set();

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
  if (main)      main.style.marginLeft   = '0';
  if (content)   { content.style.padding = '0'; content.style.maxWidth = '100%'; }

  document.body.style.background = '#060B14';

  if (!document.getElementById('taller-audio')) {
    const audio = document.createElement('audio');
    audio.id  = 'taller-audio';
    audio.src = 'motor.mp3';
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }

  // Inyectar estilos TV
  if (!document.getElementById('taller-tv-styles')) {
    const st = document.createElement('style');
    st.id = 'taller-tv-styles';
    st.textContent = `
      @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
      @keyframes flash-card {
        0%,100%{box-shadow:none}
        20%,60%{box-shadow:0 0 0 3px #22C55E,0 0 32px #22C55E44}
        40%,80%{box-shadow:0 0 0 1px #22C55E88}
      }
      #pag-taller { background:#060B14; min-height:100vh; overflow-x:hidden; }
      .tv-header {
        background:#060B14;
        border-bottom:1px solid rgba(255,255,255,.08);
        padding:0 40px;
        height:64px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        position:sticky;top:0;z-index:20;
      }
      .tv-brand {
        display:flex;align-items:center;gap:14px;
      }
      .tv-brand-dot {
        width:10px;height:10px;border-radius:50%;
        background:#22C55E;box-shadow:0 0 10px #22C55E;
        animation:pulse-dot 2s infinite;
      }
      .tv-brand-name {
        font-family:'DM Mono',monospace;
        font-size:13px;letter-spacing:.2em;
        color:#E2E8F0;text-transform:uppercase;
      }
      .tv-clock {
        font-family:'DM Mono',monospace;
        font-size:28px;font-weight:700;
        letter-spacing:.06em;color:#FFFFFF;
      }
      .tv-date {
        font-family:'DM Mono',monospace;
        font-size:11px;letter-spacing:.1em;
        color:#FFFFFF;text-align:right;text-transform:uppercase;
      }
      .tv-kpi-strip {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        border-bottom:1px solid rgba(255,255,255,.06);
        background:#060B14;
      }
      .tv-kpi {
        padding:18px 40px;
        border-right:1px solid rgba(255,255,255,.06);
        display:flex;align-items:center;gap:16px;
      }
      .tv-kpi:last-child { border-right:none; }
      .tv-kpi-num {
        font-family:'DM Mono',monospace;
        font-size:52px;font-weight:700;line-height:1;
      }
      .tv-kpi-label {
        font-size:13px;font-weight:600;
        text-transform:uppercase;letter-spacing:.1em;
        color:#94A3B8;line-height:1.4;
      }
      .tv-main { padding:28px 40px; }
      .tv-section-head {
        display:flex;align-items:center;gap:12px;
        margin-bottom:18px;
      }
      .tv-section-title {
        font-family:'DM Mono',monospace;
        font-size:11px;font-weight:700;
        letter-spacing:.2em;text-transform:uppercase;
        color:#FFFFFF;
      }
      .tv-section-badge {
        font-family:'DM Mono',monospace;
        font-size:12px;font-weight:700;
        padding:3px 12px;border-radius:20px;
        border:1px solid;
      }
      .tv-section-badge.blue  { background:rgba(59,130,246,.13);color:#60A5FA;border-color:rgba(59,130,246,.3); }
      .tv-section-badge.green { background:rgba(34,197,94,.13);color:#4ADE80;border-color:rgba(34,197,94,.3); }
      .tv-section-badge.amber { background:rgba(245,158,11,.13);color:#FCD34D;border-color:rgba(245,158,11,.3); }
      .tv-cards-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(320px,1fr));
        gap:16px;
        margin-bottom:32px;
      }
      .tv-card {
        background:#0D1424;
        border:1px solid rgba(255,255,255,.08);
        border-radius:14px;
        overflow:hidden;
        transition:border-color .2s;
      }
      .tv-card.completada {
        border-color:rgba(34,197,94,.35);
        background:rgba(34,197,94,.04);
        animation:flash-card 1s ease-in-out 4;
      }
      .tv-card-head {
        padding:18px 20px 14px;
        border-bottom:1px solid rgba(255,255,255,.06);
        display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
      }
      .tv-card-placa {
        font-family:'DM Mono',monospace;
        font-size:28px;font-weight:700;
        letter-spacing:.06em;color:#FFFFFF;line-height:1;
      }
      .tv-card-vehiculo {
        font-size:13px;color:#64748B;margin-top:4px;
      }
      .tv-tag {
        font-family:'DM Mono',monospace;
        font-size:10px;font-weight:700;
        padding:4px 10px;border-radius:6px;
        text-transform:uppercase;letter-spacing:.08em;
        white-space:nowrap;border:1px solid transparent;
      }
      .tv-tag-green  { background:rgba(34,197,94,.13);color:#4ADE80;border-color:rgba(34,197,94,.3); }
      .tv-tag-red    { background:rgba(239,68,68,.13);color:#F87171;border-color:rgba(239,68,68,.3); }
      .tv-tag-amber  { background:rgba(245,158,11,.13);color:#FCD34D;border-color:rgba(245,158,11,.3); }
      .tv-tag-blue   { background:rgba(59,130,246,.13);color:#60A5FA;border-color:rgba(59,130,246,.3); }
      .tv-tag-gray   { background:rgba(255,255,255,.06);color:#94A3B8;border-color:rgba(255,255,255,.1); }
      .tv-card-body  { padding:14px 20px; }
      .tv-etapas-label {
        font-size:9px;font-weight:700;
        text-transform:uppercase;letter-spacing:.15em;
        color:#334155;margin-bottom:10px;
      }
      .tv-etapa-row  { display:flex;align-items:center;gap:10px;padding:4px 0; }
      .tv-edot       { width:11px;height:11px;border-radius:50%;flex-shrink:0; }
      .tv-edot.done  { background:#22C55E; }
      .tv-edot.active{ background:#F59E0B;box-shadow:0 0 8px rgba(245,158,11,.6); }
      .tv-edot.pending{ background:transparent;border:2px solid #1E293B; }
      .tv-ename      { font-size:14px;flex:1;line-height:1.2; }
      .tv-ename.done { color:#22C55E; }
      .tv-ename.active{ color:#F59E0B;font-weight:700; }
      .tv-ename.pending{ color:#1E3050; }
      .tv-etime      { font-family:'DM Mono',monospace;font-size:12px;min-width:36px;text-align:right; }
      .tv-etime.done { color:#22C55E; }
      .tv-etime.active{ color:#F59E0B; }
      .tv-card-foot  {
        padding:11px 20px;
        border-top:1px solid rgba(255,255,255,.06);
        display:flex;align-items:center;justify-content:space-between;
      }
      .tv-mecanico   { display:flex;align-items:center;gap:8px; }
      .tv-mav        {
        width:28px;height:28px;border-radius:50%;
        background:rgba(59,130,246,.13);border:1px solid rgba(59,130,246,.3);
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;color:#60A5FA;text-transform:uppercase;
      }
      .tv-mav.green  { background:rgba(34,197,94,.13);color:#4ADE80;border-color:rgba(34,197,94,.3); }
      .tv-mname      { font-size:13px;color:#64748B; }
      .tv-timer      { font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:#F59E0B; }
      .tv-divider    { height:1px;background:rgba(255,255,255,.05);margin-bottom:28px; }
      .tv-no-etapas  { font-size:13px;color:#1E3050;font-style:italic;padding:6px 0; }
      .tv-empty      {
        text-align:center;padding:60px 0;
        font-family:'DM Mono',monospace;font-size:14px;
        letter-spacing:.15em;color:#1E293B;text-transform:uppercase;
      }
      .tv-watermark  {
        position:fixed;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:480px;height:480px;
        pointer-events:none;z-index:0;
      }
    `;
    document.head.appendChild(st);
  }

  mostrarPagina('pag-taller');
  cargarPantallaTaller();
  iniciarRelojTaller();
  setInterval(() => { if (sesion?.perfil === 'taller') cargarPantallaTaller(); }, 30000);
}

function iniciarRelojTaller() {
  function tick() {
    const reloj = document.getElementById('taller-reloj');
    const fecha = document.getElementById('taller-fecha');
    const now = new Date();
    if (reloj) reloj.textContent = now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    if (fecha) fecha.innerHTML = now.toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }).toUpperCase();
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

function _tvEntregaTag(orden) {
  if (!orden.fecha_entrega_1) return '<span class="tv-tag tv-tag-gray">Sin fecha</span>';
  const dias = Math.round((new Date(orden.fecha_entrega_1) - new Date()) / 86400000);
  if (dias < 0)  return `<span class="tv-tag tv-tag-red">${Math.abs(dias)}d vencida</span>`;
  if (dias === 0) return '<span class="tv-tag tv-tag-amber">Hoy</span>';
  if (dias <= 2)  return `<span class="tv-tag tv-tag-amber">${dias}d</span>`;
  return `<span class="tv-tag tv-tag-green">${dias}d</span>`;
}

async function cargarPantallaTaller() {
  const cont = document.getElementById('taller-contenido');
  if (!cont) return;

  try {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const manana = new Date(hoy); manana.setDate(manana.getDate()+1);
    const hoyISO = hoy.toISOString().split('T')[0];

    const [todasOrdenes, etapasActivas, etapasTodas] = await Promise.all([
      api(`/ordenes?estado=eq.Activa&order=fecha_entrega_1.asc`).catch(()=>[]) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,etapa,servicio,mecanico_id,tecnico,inicio`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,etapa,servicio,inicio,fin,mecanico_id,tecnico`).catch(()=>[]) || []
    ]);

    const creadasHoy  = todasOrdenes.filter(o => new Date(o.creado_en) >= hoy && new Date(o.creado_en) < manana);
    const entregarHoy = todasOrdenes.filter(o => o.fecha_entrega_1?.split('T')[0] === hoyISO || o.fecha_entrega_2?.split('T')[0] === hoyISO);
    const enProceso   = todasOrdenes.filter(o => etapasActivas.some(e => e.orden_id === o.id));

    // Detectar recién completadas
    const recienCompletadas = todasOrdenes.filter(o => {
      const ets = etapasTodas.filter(e => e.orden_id === o.id);
      if (!ets.length) return false;
      return !etapasActivas.some(e => e.orden_id === o.id) && ets.every(e => e.fin);
    });
    const nuevasComp = recienCompletadas.filter(o => !_tallerOrdenesNotificadas.has(o.id));
    if (nuevasComp.length) {
      nuevasComp.forEach(o => _tallerOrdenesNotificadas.add(o.id));
      const audio = document.getElementById('taller-audio');
      if (audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
    }

    // ── Render tarjeta de orden ──────────────────────────────
    function renderCard(orden, tipo) {
      const etapasOrden = etapasTodas.filter(e => e.orden_id === orden.id)
        .sort((a,b) => new Date(a.inicio||'9999')-new Date(b.inicio||'9999') || a.id-b.id);
      const etapaActiva = etapasActivas.find(e => e.orden_id === orden.id);
      const esCompletada = tipo === 'completada';
      const cardCls = esCompletada ? 'tv-card completada' : 'tv-card';

      // Tags
      const entregaTag = _tvEntregaTag(orden);
      let tipoTag = '';
      if (tipo === 'ingreso')    tipoTag = '<span class="tv-tag tv-tag-blue">Nuevo hoy</span>';
      if (tipo === 'entrega')    tipoTag = '<span class="tv-tag tv-tag-amber">Entrega hoy</span>';
      if (tipo === 'completada') tipoTag = '<span class="tv-tag tv-tag-green">✓ Lista</span>';

      // Técnico activo
      const tecnico = etapaActiva?.tecnico || '';
      const tecIniciales = tecnico ? tecnico.split(' ').map(p=>p[0]).join('').toUpperCase().slice(0,2) : '';
      const mavCls = esCompletada ? 'tv-mav green' : 'tv-mav';

      // Etapas HTML
      let etapasHtml = '';
      if (etapasOrden.length) {
        etapasHtml = `<div class="tv-etapas-label">Proceso</div><div>` +
          etapasOrden.map(e => {
            const done   = !!e.fin;
            const active = !!e.inicio && !e.fin;
            const cls    = done ? 'done' : active ? 'active' : 'pending';
            const timeStr = active ? _tvTimerStr(e.inicio) : (done ? '✓' : '');
            return `<div class="tv-etapa-row">
              <div class="tv-edot ${cls}"></div>
              <span class="tv-ename ${cls}">${e.etapa||'—'}</span>
              <span class="tv-etime ${cls}">${timeStr}</span>
            </div>`;
          }).join('') + '</div>';
      } else {
        etapasHtml = '<div class="tv-no-etapas">Sin etapas asignadas</div>';
      }

      // Timer de etapa activa (id único para actualización en vivo)
      const timerId = `tv-timer-${orden.id}`;

      return `<div class="${cardCls}">
        <div class="tv-card-head">
          <div>
            <div class="tv-card-placa">${orden.placa}</div>
            <div class="tv-card-vehiculo">${[orden.marca,orden.linea].filter(Boolean).join(' ')||'—'}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
            ${entregaTag}
            ${tipoTag}
          </div>
        </div>
        <div class="tv-card-body">${etapasHtml}</div>
        <div class="tv-card-foot">
          <div class="tv-mecanico">
            ${tecnico
              ? `<div class="${mavCls}">${tecIniciales}</div><span class="tv-mname">${tecnico}</span>`
              : `<span class="tv-mname" style="color:#1E3050">${esCompletada ? 'Completada' : 'Sin técnico activo'}</span>`
            }
          </div>
          ${etapaActiva ? `<span class="tv-timer" id="${timerId}">${_tvTimerStr(etapaActiva.inicio)}</span>` : ''}
        </div>
      </div>`;
    }

    // ── Sección con título ───────────────────────────────────
    function renderSeccion(titulo, badgeCls, ordenes, tipo) {
      if (!ordenes.length) return '';
      return `
        <div class="tv-section-head">
          <span class="tv-section-title">${titulo}</span>
          <span class="tv-section-badge ${badgeCls}">${ordenes.length}</span>
        </div>
        <div class="tv-cards-grid">
          ${ordenes.map(o => renderCard(o, tipo)).join('')}
        </div>`;
    }

    const hayAlgo = recienCompletadas.length || entregarHoy.length || creadasHoy.length || enProceso.length;

    // Deduplica: si una orden aparece en varias secciones, prioriza completada > entrega > ingreso > activa
    const completadasIds = new Set(recienCompletadas.map(o=>o.id));
    const entregaIds     = new Set(entregarHoy.filter(o=>!completadasIds.has(o.id)).map(o=>o.id));
    const ingresoIds     = new Set(creadasHoy.filter(o=>!completadasIds.has(o.id)&&!entregaIds.has(o.id)).map(o=>o.id));
    const procesoFilt    = enProceso.filter(o=>!completadasIds.has(o.id)&&!entregaIds.has(o.id)&&!ingresoIds.has(o.id));

    cont.innerHTML = `
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
          <div class="tv-kpi-num" style="color:#60A5FA">${todasOrdenes.length}</div>
          <div class="tv-kpi-label">Órdenes<br>activas</div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-num" style="color:#4ADE80">${entregarHoy.length}</div>
          <div class="tv-kpi-label">Entregan<br>hoy</div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-num" style="color:#60A5FA">${creadasHoy.length}</div>
          <div class="tv-kpi-label">Ingresaron<br>hoy</div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-num" style="color:#FCD34D">${enProceso.length}</div>
          <div class="tv-kpi-label">En proceso<br>ahora</div>
        </div>
      </div>

      <div class="tv-main">
        ${recienCompletadas.length ? renderSeccion('Listas para entregar', 'green', recienCompletadas, 'completada') : ''}
        ${entregaIds.size ? renderSeccion('Entregas del día', 'amber', entregarHoy.filter(o=>entregaIds.has(o.id)), 'entrega') : ''}
        ${ingresoIds.size ? renderSeccion('Ingresos de hoy', 'blue', creadasHoy.filter(o=>ingresoIds.has(o.id)), 'ingreso') : ''}
        ${procesoFilt.length ? renderSeccion('En proceso', 'amber', procesoFilt, 'activa') : ''}
        ${!hayAlgo ? '<div class="tv-empty">Sin actividad hoy</div>' : ''}
      </div>

      <div class="tv-watermark">
        <img src="Logo_Fondo_Taller.png" style="width:100%;height:100%;object-fit:contain;opacity:0.05;filter:grayscale(1) brightness(3)" alt="">
      </div>
    `;

    // Reiniciar reloj (se destruyó al reemplazar innerHTML)
    iniciarRelojTaller();

    // Timers en vivo para etapas activas
    if (window._tallerTimerInterval) clearInterval(window._tallerTimerInterval);
    window._tallerTimerInterval = setInterval(() => {
      etapasActivas.forEach(e => {
        const el = document.getElementById(`tv-timer-${e.orden_id}`);
        if (el) el.textContent = _tvTimerStr(e.inicio);
      });
    }, 1000);

  } catch(e) {
    cont.innerHTML = `<div style="color:#EF4444;padding:40px;font-family:'DM Mono',monospace;font-size:18px">ERROR: ${e.message}</div>`;
  }
}