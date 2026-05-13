// ═══════════════════════════════════════════════════════════
// PANTALLA TALLER — Diseño TV compacto, sin scroll, 4×2 tarjetas
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
      @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
      @keyframes flash-card {
        0%,100%{box-shadow:none}
        25%,75%{box-shadow:0 0 0 2px #22C55E,0 0 20px #22C55E33}
      }
      #pag-taller {
        background:#060B14;height:100vh;overflow:hidden;
        display:flex;flex-direction:column;
      }
      .tv-shell {
        display:flex;flex-direction:column;height:100vh;overflow:hidden;
      }
      .tv-header {
        background:#060B14;border-bottom:1px solid rgba(255,255,255,.08);
        padding:0 28px;height:50px;flex-shrink:0;
        display:flex;align-items:center;justify-content:space-between;
      }
      .tv-brand { display:flex;align-items:center;gap:10px; }
      .tv-brand-dot {
        width:8px;height:8px;border-radius:50%;background:#22C55E;
        animation:pulse-dot 2s infinite;
      }
      .tv-brand-name {
        font-family:'DM Mono',monospace;font-size:10px;
        letter-spacing:.18em;color:#94A3B8;text-transform:uppercase;
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
      .tv-kpi-strip {
        display:grid;grid-template-columns:repeat(4,1fr);
        border-bottom:1px solid rgba(255,255,255,.06);
        background:#060B14;flex-shrink:0;
      }
      .tv-kpi {
        padding:8px 28px;border-right:1px solid rgba(255,255,255,.06);
        display:flex;align-items:center;gap:10px;
      }
      .tv-kpi:last-child { border-right:none; }
      .tv-kpi-num {
        font-family:'DM Mono',monospace;font-size:32px;font-weight:700;line-height:1;
      }
      .tv-kpi-label {
        font-size:10px;font-weight:600;text-transform:uppercase;
        letter-spacing:.09em;color:#64748B;line-height:1.4;
      }
      .tv-body {
        flex:1;overflow:hidden;padding:10px 28px 10px;
        display:flex;flex-direction:column;
      }
      .tv-grid {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        grid-template-rows:repeat(2,1fr);
        gap:10px;
        flex:1;
        overflow:hidden;
      }
      .tv-card {
        background:#0D1424;border:1px solid rgba(255,255,255,.08);
        border-radius:10px;overflow:hidden;
        display:flex;flex-direction:column;
      }
      .tv-card.completada {
        border-color:rgba(34,197,94,.4);background:rgba(34,197,94,.05);
        animation:flash-card 1.2s ease-in-out 3;
      }
      .tv-card-head {
        padding:10px 14px 8px;
        border-bottom:1px solid rgba(255,255,255,.06);
        display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
        flex-shrink:0;
      }
      .tv-placa {
        font-family:'DM Mono',monospace;font-size:20px;font-weight:700;
        letter-spacing:.05em;color:#FFFFFF;line-height:1;
      }
      .tv-vehiculo { font-size:11px;color:#334155;margin-top:3px; }
      .tv-tag {
        font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;
        text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;border:1px solid transparent;
      }
      .tv-tag-green  { background:rgba(34,197,94,.13);color:#4ADE80;border-color:rgba(34,197,94,.3); }
      .tv-tag-red    { background:rgba(239,68,68,.13);color:#F87171;border-color:rgba(239,68,68,.3); }
      .tv-tag-amber  { background:rgba(245,158,11,.13);color:#FCD34D;border-color:rgba(245,158,11,.3); }
      .tv-tag-blue   { background:rgba(59,130,246,.13);color:#60A5FA;border-color:rgba(59,130,246,.3); }
      .tv-card-body  { padding:8px 14px;flex:1; }
      .tv-etapa-activa {
        display:flex;align-items:center;gap:7px;margin-bottom:7px;
      }
      .tv-dot-active {
        width:7px;height:7px;border-radius:50%;flex-shrink:0;background:#F59E0B;
      }
      .tv-etapa-nombre {
        font-size:13px;font-weight:600;color:#F59E0B;flex:1;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .tv-etapa-timer {
        font-family:'DM Mono',monospace;font-size:12px;font-weight:700;color:#F59E0B;flex-shrink:0;
      }
      .tv-sin-etapa { font-size:11px;color:#1E3050;font-style:italic;margin-bottom:7px; }
      .tv-prog-bg { height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden; }
      .tv-prog-fill { height:100%;border-radius:2px; }
      .tv-prog-meta {
        display:flex;justify-content:space-between;margin-top:4px;
      }
      .tv-prog-sub { font-size:10px;color:#1E3050; }
      .tv-prog-pct { font-family:'DM Mono',monospace;font-size:10px; }
      .tv-card-foot {
        padding:6px 14px;border-top:1px solid rgba(255,255,255,.06);
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
      }
      .tv-mname { font-size:11px;color:#334155; }
      .tv-entrega-chip { font-family:'DM Mono',monospace;font-size:10px;font-weight:700; }
      .tv-empty {
        flex:1;display:flex;align-items:center;justify-content:center;
        font-family:'DM Mono',monospace;font-size:13px;
        letter-spacing:.15em;color:#1E293B;text-transform:uppercase;
      }
      .tv-watermark {
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
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

function _tvEntregaInfo(orden) {
  if (!orden.fecha_entrega_1) return { color:'#334155', label:'Sin fecha' };
  const dias = Math.round((new Date(orden.fecha_entrega_1) - new Date()) / 86400000);
  if (dias < 0)   return { color:'#F87171', label:`${Math.abs(dias)}d vencida` };
  if (dias === 0) return { color:'#FCD34D', label:'Hoy' };
  if (dias <= 2)  return { color:'#FCD34D', label:`${dias}d` };
  return { color:'#4ADE80', label:`${dias}d` };
}

async function cargarPantallaTaller() {
  const cont = document.getElementById('taller-contenido');
  if (!cont) return;

  try {
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const manana = new Date(hoy); manana.setDate(manana.getDate()+1);
    const hoyISO = hoy.toISOString().split('T')[0];

    const [todasOrdenes, etapasActivas, etapasTodas] = await Promise.all([
      api(`/ordenes?estado=eq.Activa&order=fecha_entrega_1.asc`).catch(()=>[]) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,etapa,servicio,mecanico_id,tecnico,inicio`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,fin`).catch(()=>[]) || []
    ]);

    const creadasHoy  = todasOrdenes.filter(o => new Date(o.creado_en) >= hoy && new Date(o.creado_en) < manana);
    const entregarHoy = todasOrdenes.filter(o => o.fecha_entrega_1?.split('T')[0] === hoyISO || o.fecha_entrega_2?.split('T')[0] === hoyISO);
    const enProceso   = todasOrdenes.filter(o => etapasActivas.some(e => e.orden_id === o.id));

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

    const completadasIds = new Set(recienCompletadas.map(o=>o.id));
    const entregaIds     = new Set(entregarHoy.filter(o=>!completadasIds.has(o.id)).map(o=>o.id));
    const ingresoIds     = new Set(creadasHoy.filter(o=>!completadasIds.has(o.id)&&!entregaIds.has(o.id)).map(o=>o.id));
    const procesoFilt    = enProceso.filter(o=>!completadasIds.has(o.id)&&!entregaIds.has(o.id)&&!ingresoIds.has(o.id));

    const ordenesDisplay = [
      ...recienCompletadas.map(o=>({orden:o,tipo:'completada'})),
      ...entregarHoy.filter(o=>entregaIds.has(o.id)).map(o=>({orden:o,tipo:'entrega'})),
      ...creadasHoy.filter(o=>ingresoIds.has(o.id)).map(o=>({orden:o,tipo:'ingreso'})),
      ...procesoFilt.map(o=>({orden:o,tipo:'activa'}))
    ].slice(0, 8);

    function renderCard({orden, tipo}) {
      const etapaActiva = etapasActivas.find(e => e.orden_id === orden.id);
      const etsOrden    = etapasTodas.filter(e => e.orden_id === orden.id);
      const total       = etsOrden.length;
      const comp        = etsOrden.filter(e => e.fin).length;
      const pct         = total ? Math.round((comp/total)*100) : 0;
      const esComp      = tipo === 'completada';
      const { color: entColor, label: entLabel } = _tvEntregaInfo(orden);
      const tecnico = etapaActiva?.tecnico || '';

      const tipoTagMap = {
        completada: '<span class="tv-tag tv-tag-green">✓ Lista</span>',
        entrega:    '<span class="tv-tag tv-tag-amber">Entrega hoy</span>',
        ingreso:    '<span class="tv-tag tv-tag-blue">Nuevo hoy</span>',
        activa:     ''
      };

      const barColor = esComp ? '#22C55E' : pct >= 70 ? '#4ADE80' : pct >= 40 ? '#F59E0B' : '#60A5FA';

      let etapaHtml = '';
      if (etapaActiva) {
        etapaHtml = `<div class="tv-etapa-activa">
          <div class="tv-dot-active"></div>
          <span class="tv-etapa-nombre">${etapaActiva.etapa||'En proceso'}</span>
          <span class="tv-etapa-timer" id="tv-timer-${orden.id}">${_tvTimerStr(etapaActiva.inicio)}</span>
        </div>`;
      } else if (esComp) {
        etapaHtml = `<div class="tv-etapa-activa"><span style="font-size:12px;color:#22C55E;font-weight:600">✓ Proceso completo</span></div>`;
      } else {
        etapaHtml = `<div class="tv-sin-etapa">Sin etapa activa</div>`;
      }

      return `<div class="tv-card${esComp?' completada':''}">
        <div class="tv-card-head">
          <div>
            <div class="tv-placa">${orden.placa}</div>
            <div class="tv-vehiculo">${[orden.marca,orden.linea].filter(Boolean).join(' ')||'—'}</div>
          </div>
          ${tipoTagMap[tipo]}
        </div>
        <div class="tv-card-body">
          ${etapaHtml}
          ${total > 0 ? `
            <div class="tv-prog-bg">
              <div class="tv-prog-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <div class="tv-prog-meta">
              <span class="tv-prog-sub">${comp}/${total} etapas</span>
              <span class="tv-prog-pct" style="color:${barColor}">${pct}%</span>
            </div>` : ''}
        </div>
        <div class="tv-card-foot">
          <span class="tv-mname">${tecnico||(esComp?'Completada':'Sin técnico')}</span>
          <span class="tv-entrega-chip" style="color:${entColor}">${entLabel}</span>
        </div>
      </div>`;
    }

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

        <div class="tv-body">
          ${ordenesDisplay.length > 0
            ? `<div class="tv-grid">${ordenesDisplay.map(renderCard).join('')}</div>`
            : '<div class="tv-empty">Sin actividad hoy</div>'
          }
        </div>
      </div>

      <div class="tv-watermark">
        <img src="Logo_Fondo_Taller.png" style="width:100%;height:100%;object-fit:contain;opacity:0.05;filter:grayscale(1) brightness(3)" alt="">
      </div>
    `;

    iniciarRelojTaller();

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