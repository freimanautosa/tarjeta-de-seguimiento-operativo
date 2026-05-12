// ═══════════════════════════════════════════════════════════
// PANTALLA TALLER — Estilo tablero de aeropuerto
// ═══════════════════════════════════════════════════════════

// IDs de órdenes completadas que ya sonaron — persiste en la sesión
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

  document.body.style.background = '#0A0F1A';

  // Precargar audio
  if (!document.getElementById('taller-audio')) {
    const audio = document.createElement('audio');
    audio.id  = 'taller-audio';
    audio.src = 'motor.mp3';
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }

  mostrarPagina('pag-taller');
  renderTallerShell();
  cargarPantallaTaller();
  iniciarRelojTaller();
  setInterval(() => { if (sesion?.perfil === 'taller') cargarPantallaTaller(); }, 30000);
}

function renderTallerShell() {
  const cont = document.getElementById('taller-contenido');
  if (!cont) return;

  // Header
  const header = document.createElement('div');
  header.id = 'taller-header';
  header.style.cssText = 'background:#060B14;border-bottom:1px solid #94A3B8;padding:0 32px;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:10';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px">
      <div style="width:8px;height:8px;border-radius:50%;background:#22C55E;box-shadow:0 0 8px #22C55E;animation:pulse 2s infinite"></div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:3px;color:#E2E8F0;text-transform:uppercase">Freimanautos · Sistema Operativo</div>
    </div>
    <div id="taller-reloj" style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:#E2E8F0;letter-spacing:4px"></div>
    <div id="taller-fecha" style="font-family:'DM Mono',monospace;font-size:11px;color:#E2E8F0;letter-spacing:2px;text-align:right"></div>
  `;
  cont.parentElement.insertBefore(header, cont);
}

function iniciarRelojTaller() {
  function tick() {
    const reloj = document.getElementById('taller-reloj');
    const fecha = document.getElementById('taller-fecha');
    const now = new Date();
    if (reloj) reloj.textContent = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    if (fecha) fecha.innerHTML = now.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  }
  tick();
  setInterval(tick, 1000);
}

async function cargarPantallaTaller() {
  const cont = document.getElementById('taller-contenido');
  if (!cont) return;

  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const hoyISO = hoy.toISOString().split('T')[0];

    const [todasOrdenes, etapasActivas] = await Promise.all([
      api(`/ordenes?estado=eq.Activa&order=fecha_entrega_1.asc`).catch(() => []) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,etapa,servicio,mecanico_id,tecnico,inicio`).catch(() => []) || []
    ]);

    const creadasHoy  = todasOrdenes.filter(o => new Date(o.creado_en) >= hoy && new Date(o.creado_en) < manana);
    const entregarHoy = todasOrdenes.filter(o => {
      const f1 = o.fecha_entrega_1?.split('T')[0];
      const f2 = o.fecha_entrega_2?.split('T')[0];
      return f1 === hoyISO || f2 === hoyISO;
    });
    const enProceso   = todasOrdenes.filter(o => etapasActivas.some(e => e.orden_id === o.id));

    // ── Órdenes recién completadas ────────────────────────────────────────────
    // Una orden está "recién completada" si tiene etapas pero ninguna activa en este momento.
    // Consultamos etapas de todas las órdenes activas para detectarlo.
    const todasEtapas = await api(
      `/etapas?orden_id=in.(${todasOrdenes.map(o=>o.id).join(',')})&select=orden_id,fin`
    ).catch(() => []) || [];

    const recienCompletadas = todasOrdenes.filter(o => {
      const ets = todasEtapas.filter(e => e.orden_id === o.id);
      if (!ets.length) return false;                          // sin etapas → no aplica
      const tieneActiva = etapasActivas.some(e => e.orden_id === o.id);
      const todasFinalizadas = ets.every(e => e.fin);
      return !tieneActiva && todasFinalizadas;
    });

    // Disparar audio + registrar para no repetir
    const nuevasCompletadas = recienCompletadas.filter(o => !_tallerOrdenesNotificadas.has(o.id));
    if (nuevasCompletadas.length) {
      nuevasCompletadas.forEach(o => _tallerOrdenesNotificadas.add(o.id));
      const audio = document.getElementById('taller-audio');
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    }

    const srvColor  = { latoneria: '#EF4444', pintura: '#F59E0B', mecanica: '#3B82F6', adicionales: '#10B981' };
    const srvLabel  = { latoneria: 'LAT', pintura: 'PIN', mecanica: 'MEC', adicionales: 'ADI' };

    function tiempoEnEtapa(e) {
      if (!e.inicio) return '';
      const mins = Math.round((new Date() - new Date(e.inicio)) / 60000);
      if (mins < 60) return `${mins}m`;
      return `${Math.floor(mins/60)}h ${mins%60}m`;
    }

    function urgencyColor(o) {
      if (!o.fecha_entrega_1) return '#E2E8F0';
      const dias = Math.round((new Date(o.fecha_entrega_1) - new Date()) / 86400000);
      if (dias < 0)  return '#EF4444';
      if (dias === 0) return '#F59E0B';
      if (dias <= 2)  return '#EAB308';
      return '#22C55E';
    }

    function renderSeccionCompletadas(ordenes) {
      return `
        <div style="margin-bottom:2px">
          <div style="display:grid;grid-template-columns:130px 1fr 180px 120px 80px 90px;align-items:center;gap:0;padding:0 32px;height:36px;background:#22C55E18;border-left:3px solid #22C55E">
            <div style="font-family:'DM Mono',monospace;font-size:10px;font-weight:700;letter-spacing:3px;color:#22C55E;grid-column:1/-1">
              <svg width="12" height="12" fill="none" stroke="#22C55E" stroke-width="2.5" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-1px;margin-right:6px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              COMPLETADAS — LISTAS PARA ENTREGAR <span style="opacity:0.6">(${ordenes.length})</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:130px 1fr 180px 120px 80px 90px;padding:4px 32px 4px;border-bottom:1px solid #0D1B2E">
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">PLACA</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">VEHÍCULO</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">PROPIETARIO</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase"></div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">ENTREGA</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">ESTADO</div>
          </div>
          ${ordenes.map(o => {
            const color = urgencyColor(o);
            const dias  = o.fecha_entrega_1 ? Math.round((new Date(o.fecha_entrega_1) - new Date()) / 86400000) : null;
            const diasLabel = dias === null ? '—' : dias < 0 ? 'VENCIDA' : dias === 0 ? 'HOY' : `${dias}d`;
            const esNueva = nuevasCompletadas.some(n => n.id === o.id);
            return `<div class="${esNueva ? 'fila-completada' : ''}" style="display:grid;grid-template-columns:130px 1fr 180px 120px 80px 90px;align-items:center;gap:0;padding:0 32px;height:60px;border-bottom:1px solid #0D1B2E">
              <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:700;letter-spacing:3px;color:#22C55E">${o.placa}</div>
              <div style="font-size:13px;font-weight:500;color:#94A3B8">${[o.marca,o.linea].filter(Boolean).join(' ')||'—'}</div>
              <div style="font-size:12px;color:#64748B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.propietario||'—'}</div>
              <div></div>
              <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:${color}">${diasLabel}</div>
              <div><span style="background:#22C55E22;color:#22C55E;border:1px solid #22C55E44;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px">LISTA</span></div>
            </div>`;
          }).join('')}
        </div>`;
    }

    function renderFila(o, tipo) {
      const ets   = etapasActivas.filter(e => e.orden_id === o.id);
      const color = urgencyColor(o);
      const dias  = o.fecha_entrega_1 ? Math.round((new Date(o.fecha_entrega_1) - new Date()) / 86400000) : null;
      const diasLabel = dias === null ? '—' : dias < 0 ? 'VENCIDA' : dias === 0 ? 'HOY' : `${dias}d`;
      const etaLabel  = ets.length
        ? ets.map(e => `<span style="background:${srvColor[e.servicio]||'#E2E8F0'}22;color:${srvColor[e.servicio]||'#E2E8F0'};border:1px solid ${srvColor[e.servicio]||'#E2E8F0'}44;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;margin-right:4px">${srvLabel[e.servicio]||'—'} ${e.etapa||''}</span>`).join('')
        : '<span style="color:#E2E8F0;font-size:11px">Sin etapa activa</span>';
      const tecLabel  = [...new Set(ets.filter(e=>e.tecnico).map(e=>e.tecnico))].join(', ') || '—';
      const tiempoLabel = ets.length ? tiempoEnEtapa(ets[0]) : '—';

      return `<div class="taller-fila" style="display:grid;grid-template-columns:130px 1fr 180px 120px 80px 90px;align-items:center;gap:0;padding:0 32px;height:60px;border-bottom:1px solid #0D1B2E;transition:background 0.2s" onmouseover="this.style.background='#0D1B2E'" onmouseout="this.style.background='transparent'">
        <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:700;letter-spacing:3px;color:#E2E8F0">${o.placa}</div>
        <div>
          <div style="font-size:13px;font-weight:500;color:#94A3B8;margin-bottom:4px">${[o.marca,o.linea].filter(Boolean).join(' ')||'—'}</div>
          <div>${etaLabel}</div>
        </div>
        <div style="font-size:12px;color:#64748B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${tecLabel}"> ${tecLabel}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:#64748B">${tiempoLabel}</div>
        <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:${color}">${diasLabel}</div>
        <div>
          ${tipo === 'entrega' ? `<span style="background:#22C55E22;color:#22C55E;border:1px solid #22C55E44;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px">ENTREGA HOY</span>` : ''}
          ${tipo === 'ingreso' ? `<span style="background:#3B82F622;color:#3B82F6;border:1px solid #3B82F644;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px">NUEVO HOY</span>` : ''}
          ${tipo === 'activa' ? `<span style="background:#F59E0B22;color:#F59E0B;border:1px solid #F59E0B44;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px">EN PROCESO</span>` : ''}
        </div>
      </div>`;
    }

    function renderSeccion(titulo, color, icono, ordenes, tipo) {
      if (!ordenes.length) return '';
      return `
        <div style="margin-bottom:2px">
          <div style="display:grid;grid-template-columns:130px 1fr 180px 120px 80px 90px;align-items:center;gap:0;padding:0 32px;height:36px;background:${color}18;border-left:3px solid ${color}">
            <div style="font-family:'DM Mono',monospace;font-size:10px;font-weight:700;letter-spacing:3px;color:${color};grid-column:1/-1">${icono} ${titulo} <span style="opacity:0.6">(${ordenes.length})</span></div>
          </div>
          <div style="display:grid;grid-template-columns:130px 1fr 180px 120px 80px 90px;padding:4px 32px 4px;border-bottom:1px solid #0D1B2E">
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">PLACA</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">VEHÍCULO / ETAPA ACTUAL</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">TÉCNICO</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">TIEMPO ETAPA</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">ENTREGA</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase">ESTADO</div>
          </div>
          ${ordenes.map(o => renderFila(o, tipo)).join('')}
        </div>`;
    }

    // Stats bar
    const statsHtml = `
      <div style="display:flex;align-items:center;gap:40px;padding:12px 32px;background:#060B14;border-bottom:1px solid #0D1B2E">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#3B82F6">${todasOrdenes.length}</div>
          <div style="font-size:10px;color:#E2E8F0;letter-spacing:1px;text-transform:uppercase">Órdenes<br>activas</div>
        </div>
        <div style="width:1px;height:36px;background:#94A3B8"></div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#22C55E">${entregarHoy.length}</div>
          <div style="font-size:10px;color:#E2E8F0;letter-spacing:1px;text-transform:uppercase">Entregan<br>hoy</div>
        </div>
        <div style="width:1px;height:36px;background:#94A3B8"></div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#3B82F6">${creadasHoy.length}</div>
          <div style="font-size:10px;color:#E2E8F0;letter-spacing:1px;text-transform:uppercase">Ingresaron<br>hoy</div>
        </div>
        <div style="width:1px;height:36px;background:#94A3B8"></div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#F59E0B">${enProceso.length}</div>
          <div style="font-size:10px;color:#E2E8F0;letter-spacing:1px;text-transform:uppercase">En proceso<br>ahora</div>
        </div>
        <div style="flex:1"></div>
        <div style="font-size:10px;color:#94A3B8;font-family:'DM Mono',monospace"></div>
      </div>`;

    cont.innerHTML = `
      <style>
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes flash  {
          0%,100% { background: transparent; }
          20%,60% { background: #22C55E18; box-shadow: inset 0 0 0 1px #22C55E44; }
          40%,80% { background: #22C55E08; }
        }
        .fila-completada { animation: flash 1s ease-in-out 4; }
        #pag-taller { background:#0A0F1A; min-height:100vh; }
      </style>
      ${statsHtml}
      ${recienCompletadas.length ? renderSeccionCompletadas(recienCompletadas) : ''}
      ${renderSeccion('ENTREGAS DEL DÍA', '#22C55E', '', entregarHoy, 'entrega')}
      ${renderSeccion('INGRESOS DE HOY', '#3B82F6', '', creadasHoy, 'ingreso')}
      ${renderSeccion('EN PROCESO', '#F59E0B', '', enProceso.filter(o => !entregarHoy.includes(o) && !creadasHoy.includes(o)), 'activa')}
      ${!recienCompletadas.length && !entregarHoy.length && !creadasHoy.length && !enProceso.length
        ? `<div style="text-align:center;padding:80px 0;color:#94A3B8;font-family:'DM Mono',monospace;font-size:14px;letter-spacing:2px">SIN ACTIVIDAD HOY</div>`
        : ''}
      <!-- Watermark logo -->
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:420px;height:420px;pointer-events:none;z-index:0">
        <img src="Logo_Fondo_Taller.png" style="width:100%;height:100%;object-fit:contain;opacity:0.07;filter:grayscale(1) brightness(3)" alt="">
      </div>
    `;
  } catch(e) {
    const cont2 = document.getElementById('taller-contenido');
    if (cont2) cont2.innerHTML = `<div style="color:#EF4444;padding:40px;font-family:'DM Mono',monospace">ERROR: ${e.message}</div>`;
  }
}