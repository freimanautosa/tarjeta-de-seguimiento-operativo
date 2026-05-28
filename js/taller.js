// ═══════════════════════════════════════════════════════════
// PANTALLA TALLER — Lista TV + panel derecho + audio desbloqueado
// ═══════════════════════════════════════════════════════════

const _tallerOrdenesNotificadas = new Set();
let _tallerGridSnapshot   = new Set();
let _tallerOverlayTimer   = null;
let _tallerAudioDesbloqueado = false;

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

  document.body.style.background = '#FFFFFF';
  document.body.style.overflow   = 'hidden';
  document.body.style.height     = '100vh';

  if (!document.getElementById('taller-tv-styles')) {
    const st = document.createElement('style');
    st.id = 'taller-tv-styles';
    st.textContent = `
      @keyframes pulse-dot  { 0%,100%{opacity:1} 50%{opacity:.35} }
      @keyframes flash-row  {
        0%,100%{background:transparent}
        30%,70%{background:rgba(245,158,11,.07)}
      }
      @keyframes overlay-in {
        from{opacity:0;transform:scale(.95)}
        to{opacity:1;transform:scale(1)}
      }
      @keyframes slide-in-right {
        from{opacity:0;transform:translateX(1vw)}
        to{opacity:1;transform:translateX(0)}
      }
      #pag-taller {
        background:#FFFFFF;height:100vh;overflow:hidden;
        display:flex;flex-direction:column;font-size:1vw;
      }
      .tv-shell {
        display:flex;flex-direction:column;height:100vh;overflow:hidden;position:relative;
        background:#FFFFFF;
      }

      /* ── PANTALLA DE ACTIVACIÓN ── */
      .tv-activate-screen {
        position:fixed;inset:0;background:#FFFFFF;z-index:100;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2vh;
      }
      .tv-activate-logo {
        width:14vw;opacity:.85;
      }
      .tv-activate-title {
        font-family:'DM Mono',monospace;font-size:1.2vw;color:#9CA3AF;
        letter-spacing:.2em;text-transform:uppercase;
      }
      .tv-activate-btn {
        font-family:'DM Mono',monospace;font-size:1.1vw;font-weight:700;
        letter-spacing:.12em;text-transform:uppercase;
        background:#1E3A5F;color:#FFFFFF;border:none;cursor:pointer;
        padding:1.2vh 3vw;border-radius:.5vw;
        transition:transform .15s,box-shadow .15s;
      }
      .tv-activate-btn:hover {
        transform:scale(1.03);
        box-shadow:0 .4vw 1.5vw rgba(30,58,95,.3);
      }
      .tv-activate-sub {
        font-size:.7vw;color:#9CA3AF;letter-spacing:.1em;text-transform:uppercase;
      }

      /* ── HEADER ── */
      .tv-header {
        background:#FFFFFF;border-bottom:2px solid #D1D5DB;
        padding:0 2vw;height:6vh;flex-shrink:0;
        display:flex;align-items:center;justify-content:space-between;
      }
      .tv-brand { display:flex;align-items:center;gap:.8vw; }
      .tv-brand-dot {
        width:.6vw;height:.6vw;border-radius:50%;background:#22C55E;
        animation:pulse-dot 2s infinite;
      }
      .tv-brand-name {
        font-family:'DM Mono',monospace;font-size:.65vw;
        letter-spacing:.18em;color:#4B5563;text-transform:uppercase;
      }
      .tv-clock {
        font-family:'DM Mono',monospace;font-size:2vw;font-weight:700;
        letter-spacing:.06em;color:#111827;
      }
      .tv-date {
        font-family:'DM Mono',monospace;font-size:.7vw;
        letter-spacing:.08em;color:#374151;text-align:right;text-transform:uppercase;
      }

      /* ── KPI STRIP ── */
      .tv-kpi-strip {
        display:grid;grid-template-columns:repeat(4,1fr);
        border-bottom:2px solid #D1D5DB;flex-shrink:0;
        background:#F8FAFC;
      }
      .tv-kpi {
        padding:.8vh 2vw;border-right:1.5px solid #D1D5DB;
        display:flex;align-items:center;gap:.8vw;
      }
      .tv-kpi:last-child { border-right:none; }
      .tv-kpi-num {
        font-family:'DM Mono',monospace;font-size:3.2vw;font-weight:700;line-height:1;
      }
      .tv-kpi-label {
        font-size:.75vw;font-weight:600;text-transform:uppercase;
        letter-spacing:.09em;color:#6B7280;line-height:1.4;
      }

      /* ── BODY ── */
      .tv-body {
        flex:1;overflow:hidden;display:flex;
      }
      .tv-list-wrap {
        flex:1;overflow:hidden;display:flex;flex-direction:column;
      }
      .tv-table-wrap {
        flex:1;overflow:hidden;
      }
      .tv-table {
        width:100%;border-collapse:collapse;table-layout:fixed;
        border-right:1px solid #D1D5DB;
      }
      .tv-thead th {
        padding:.6vh 1.4vw;font-size:.6vw;font-weight:700;
        letter-spacing:.15em;text-transform:uppercase;
        color:#4B5563;text-align:left;
        background:#F1F5F9;
        border-bottom:2px solid #CBD5E1;
        border-right:1px solid #D1D5DB;
        white-space:nowrap;
      }
      .tv-thead th:last-child { border-right:none; }
      .tv-tbody tr {
        border-bottom:1px solid #E2E8F0;
        transition:background .15s;
      }
      .tv-tbody tr:hover { background:#F8FAFC; }
      .tv-tbody tr.flash { animation:flash-row 1.5s ease-in-out; }
      .tv-tbody td {
        padding:.45vh 1.4vw;vertical-align:middle;
        border-right:1px solid #E9EDF2;
      }
      .tv-tbody td:last-child { border-right:none; }
      .tv-col-placa   { width:18%; }
      .tv-col-etapas  { width:36%; }
      .tv-col-tec     { width:14%; }
      .tv-col-timer   { width:10%; }
      .tv-col-entrega { width:8%; }
      .tv-col-estado  { width:14%; }

      .tv-placa {
        font-family:'DM Mono',monospace;font-size:1.35vw;font-weight:700;
        color:#111827;letter-spacing:.04em;line-height:1;
      }
      .tv-vehiculo { font-size:.55vw;color:#374151;margin-top:.1vh; }
      .tv-propietario { font-size:.62vw;font-weight:600;color:#111827;margin-top:.2vh;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:16vw; }

      /* ── CHIPS DE ETAPA ── */
      .etapas-chips { display:flex;flex-wrap:wrap;gap:.3vw;align-items:center; }
      .chip {
        display:inline-flex;align-items:center;gap:.25vw;
        padding:.2vh .5vw;border-radius:.3vw;
        font-size:.62vw;font-weight:700;white-space:nowrap;border:1px solid transparent;
      }
      .chip-approved { background:#DCFCE7;color:#15803D;border-color:#BBF7D0; }
      .chip-done     { background:#F0FDF4;color:#16A34A;border-color:#D1FAE5; }
      .chip-active   { background:#FEF3C7;color:#B45309;border-color:#FDE68A; }
      .chip-waiting  { background:#FFFBEB;color:#D97706;border-color:#FDE68A; }
      .chip-pending  { background:#F3F4F6;color:#6B7280;border-color:#E5E7EB; }
      .chip-dot { width:.45vw;height:.45vw;border-radius:50%;flex-shrink:0; }
      .chip-dot.approved { background:#22C55E; }
      .chip-dot.done     { background:#4ADE80; }
      .chip-dot.active   { background:#F59E0B; }
      .chip-dot.waiting  { background:transparent;border:.8px solid #F59E0B; }
      .chip-dot.pending  { background:transparent;border:.8px solid #D1D5DB; }

      .tv-tec { font-size:.75vw;color:#374151; }
      .tv-timer-val {
        font-family:'DM Mono',monospace;font-size:.85vw;font-weight:700;color:#B45309;
      }
      .tv-entrega-chip { font-family:'DM Mono',monospace;font-size:.75vw;font-weight:700; }

      .tv-badge {
        font-family:'DM Mono',monospace;font-size:.6vw;font-weight:700;
        padding:.25vh .6vw;border-radius:.3vw;
        text-transform:uppercase;letter-spacing:.07em;border:1px solid;white-space:nowrap;
      }
      .tv-badge-blue   { background:#DBEAFE;color:#1E40AF;border-color:#BFDBFE; }
      .tv-badge-amber  { background:#FEF3C7;color:#B45309;border-color:#FDE68A; }
      .tv-badge-red    { background:#FEE2E2;color:#DC2626;border-color:#FECACA; }
      .tv-badge-gray   { background:#F9FAFB;color:#6B7280;border-color:#E5E7EB; }

      /* ── PANEL DERECHO ── */
      .tv-panel-right {
        width:17vw;flex-shrink:0;
        border-left:2px solid #D1D5DB;
        display:flex;flex-direction:column;overflow:hidden;
        background:#F8FAFC;
      }
      .tv-panel-title {
        font-family:'DM Mono',monospace;font-size:.6vw;font-weight:700;
        letter-spacing:.18em;text-transform:uppercase;
        color:#4B5563;
        padding:.7vh 1.2vw;border-bottom:1.5px solid #D1D5DB;flex-shrink:0;
      }
      .tv-panel-list {
        flex:1;overflow:hidden;padding:.4vh .5vw;
        display:flex;flex-direction:column;gap:.35vh;
      }
      .tv-panel-item {
        border-radius:.4vw;padding:.55vh .8vw;
        display:flex;align-items:center;gap:.6vw;
        animation:slide-in-right .4s ease;flex-shrink:0;cursor:pointer;
      }
      .tv-panel-item.listo {
        background:#FFFBEB;border:1.5px solid #F59E0B;
      }
      .tv-panel-item.entregado {
        background:#F0FDF4;border:1.5px solid #4ADE80;
      }
      .tv-panel-dot { width:.5vw;height:.5vw;border-radius:50%;flex-shrink:0; }
      .tv-panel-dot.listo    { background:#F59E0B; }
      .tv-panel-dot.entregado{ background:#22C55E; }
      .tv-panel-info { flex:1;min-width:0; }
      .tv-panel-placa {
        font-family:'DM Mono',monospace;font-size:.95vw;font-weight:700;
        color:#111827;letter-spacing:.04em;line-height:1;
      }
      .tv-panel-status {
        font-size:.6vw;font-weight:500;margin-top:.15vh;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .tv-panel-status.listo    { color:#D97706; }
      .tv-panel-status.entregado{ color:#16A34A; }
      .tv-panel-time {
        font-family:'DM Mono',monospace;font-size:.6vw;color:#9CA3AF;
      }
      .tv-panel-empty {
        font-size:.7vw;color:#9CA3AF;
        font-style:italic;padding:1vh 0;text-align:center;
      }

      /* ── PANEL PROGRAMADAS ── */
      .tv-panel-section {
        display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0;
      }
      .tv-panel-divider {
        border-top:1.5px solid #D1D5DB;flex-shrink:0;
      }
      .tv-prog-item {
        display:flex;align-items:center;gap:.6vw;
        padding:.45vh .8vw;border-radius:.4vw;
        background:#EEF2FF;border:1px solid #C7D2FE;
        flex-shrink:0;cursor:default;
      }
      .tv-prog-dot {
        width:.45vw;height:.45vw;border-radius:50%;background:#6366F1;flex-shrink:0;
      }
      .tv-prog-placa {
        font-family:'DM Mono',monospace;font-size:.85vw;font-weight:700;
        color:#4338CA;letter-spacing:.04em;line-height:1;flex:1;min-width:0;
      }
      .tv-prog-fecha {
        font-family:'DM Mono',monospace;font-size:.55vw;color:#6B7280;
        flex-shrink:0;
      }
      .tv-prog-ot {
        font-family:'DM Mono',monospace;font-size:.5vw;color:#9CA3AF;
        margin-top:.1vh;
      }

      /* ── OVERLAY ── */
      .tv-update-overlay {
        position:absolute;inset:0;background:rgba(15,23,42,.65);
        z-index:30;display:flex;align-items:center;justify-content:center;padding:2vw;
      }
      .tv-overlay-card {
        background:#FFFFFF;border:0.2vw solid #F59E0B;border-radius:.8vw;
        width:26vw;overflow:hidden;animation:overlay-in .3s ease;
        box-shadow:0 2vw 4vw rgba(0,0,0,.25);
      }
      .tv-overlay-card.green-border { border-color:#22C55E; }
      .tv-overlay-badge {
        background:#F59E0B;color:#FFFFFF;
        font-family:'DM Mono',monospace;font-size:.7vw;font-weight:700;
        letter-spacing:.18em;text-transform:uppercase;
        padding:.6vh 1.5vw;text-align:center;
      }
      .tv-overlay-badge.green-bg { background:#22C55E; }
      .tv-overlay-head {
        padding:1.2vh 1.5vw .8vh;border-bottom:1px solid rgba(0,0,0,.08);
      }
      .tv-overlay-placa {
        font-family:'DM Mono',monospace;font-size:2.5vw;font-weight:700;
        color:#111827;letter-spacing:.04em;line-height:1;
      }
      .tv-overlay-veh { font-size:.8vw;color:#9CA3AF;margin-top:.3vh; }
      .tv-overlay-body { padding:.8vh 1.5vw; }
      .tv-overlay-row {
        display:flex;align-items:center;gap:.7vw;padding:.5vh 0;
        border-bottom:1px solid rgba(0,0,0,.06);
      }
      .tv-overlay-row:last-child { border-bottom:none; }
      .tv-odot        { width:.7vw;height:.7vw;border-radius:50%;flex-shrink:0; }
      .tv-odot.approved{ background:#22C55E; }
      .tv-odot.done   { background:#BBF7D0;border:1px solid #4ADE80; }
      .tv-odot.active { background:#F59E0B; }
      .tv-odot.pending{ background:transparent;border:1px solid #D1D5DB; }
      .tv-oname       { font-size:.9vw;flex:1; }
      .tv-oname.approved{ color:#15803D; }
      .tv-oname.done  { color:#9CA3AF; }
      .tv-oname.active{ color:#B45309;font-weight:700; }
      .tv-oname.pending{ color:#D1D5DB; }
      .tv-otime       { font-family:'DM Mono',monospace;font-size:.8vw;font-weight:700; }
      .tv-otime.approved{ color:#16A34A; }
      .tv-otime.active{ color:#B45309; }
      .tv-otime.done  { color:#9CA3AF; }
      .tv-overlay-foot {
        padding:.8vh 1.5vw;border-top:1px solid rgba(0,0,0,.07);
        display:flex;justify-content:space-between;align-items:center;
      }
      .tv-overlay-tec { font-size:.8vw;color:#6B7280; }
      .tv-overlay-entrega { font-size:.8vw;font-weight:700; }
      .tv-overlay-countdown {
        font-family:'DM Mono',monospace;font-size:.6vw;
        color:#9CA3AF;text-align:center;
        padding:.5vh;border-top:1px solid rgba(0,0,0,.06);
      }
      .tv-watermark {
        position:fixed;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:34vw;height:34vw;pointer-events:none;z-index:0;
      }

      /* ── MÓVIL ── */
      @media (max-width: 768px) {
        .tv-activate-logo { width:40vw !important; }
        .tv-activate-title { font-size:4.5vw !important; letter-spacing:.08em !important; }
        .tv-activate-btn { font-size:4.5vw !important; padding:2.5vh 8vw !important; border-radius:2vw !important; }
        .tv-activate-sub { font-size:3vw !important; }
        .tv-header { height:auto !important; padding:1.5vh 4vw !important; }
        .tv-clock { font-size:9vw !important; }
        .tv-date { font-size:3vw !important; }
        .tv-brand-name { font-size:2.8vw !important; letter-spacing:.1em !important; }
        .tv-brand-dot { width:2vw !important; height:2vw !important; }
        .tv-kpi-strip { grid-template-columns:repeat(2,1fr) !important; }
        .tv-kpi { padding:1.5vh 4vw !important; gap:2.5vw !important; border-right:none !important; border-bottom:1px solid rgba(0,0,0,.07); }
        .tv-kpi:nth-child(1),.tv-kpi:nth-child(3) { border-right:1px solid rgba(0,0,0,.07) !important; }
        .tv-kpi-num { font-size:10vw !important; }
        .tv-kpi-label { font-size:2.8vw !important; }
        .tv-panel-right { display:none !important; }
        .tv-thead th:nth-child(3),.tv-thead th:nth-child(4),
        .tv-tbody tr td:nth-child(3),.tv-tbody tr td:nth-child(4) { display:none !important; }
        .tv-col-placa  { width:22% !important; }
        .tv-col-etapas { width:52% !important; }
        .tv-col-entrega{ width:12% !important; }
        .tv-col-estado { width:14% !important; }
        .tv-thead th { font-size:2.5vw !important; padding:.5vh 1.5vw !important; }
        .tv-tbody td  { padding:1vh 1.5vw !important; }
        .tv-placa  { font-size:3.8vw !important; letter-spacing:.02em !important; }
        .tv-propietario { font-size:2.2vw !important; max-width:20vw !important; }
        .tv-vehiculo { font-size:2.2vw !important; }
        .chip { font-size:2.5vw !important; padding:.3vh 1vw !important; border-radius:.5vw !important; gap:.4vw !important; }
        .chip-dot { width:1.5vw !important; height:1.5vw !important; }
        .tv-entrega-chip { font-size:2.8vw !important; }
        .tv-badge { font-size:2.5vw !important; padding:.3vh 1vw !important; border-radius:.5vw !important; }
        .tv-watermark { width:70vw !important; height:70vw !important; }
      }
    `;
    document.head.appendChild(st);
  }

  const pagTaller = document.getElementById('pag-taller');
  if (pagTaller) pagTaller.style.cssText = 'display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#FFFFFF';

  mostrarPagina('pag-taller');
  _mostrarPantallaActivacion();
}

// ── Pantalla de activación de audio ─────────────────────────
function _mostrarPantallaActivacion() {
  const cont = document.getElementById('taller-contenido');
  if (!cont) return;

  cont.innerHTML = `
    <div class="tv-activate-screen" id="tv-activate-screen">
      <img src="icons/Icono_Redondo_Fondo_Taller.png" class="tv-activate-logo" alt="">
      <div class="tv-activate-title">Freimanautos · Sistema Operativo</div>
      <button class="tv-activate-btn" onclick="_activarPantallaTaller()">
        ▶ &nbsp; Iniciar pantalla del taller
      </button>
      <div class="tv-activate-sub">Presiona una vez para activar el audio y comenzar</div>
    </div>`;
}

async function _activarPantallaTaller() {
  // Desbloquear audio con interacción del usuario
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    window._tvAudioCtx = ctx;
    _tallerAudioDesbloqueado = true;
  } catch(e) { console.warn('AudioContext:', e); }

  // También pre-cargar el archivo mp3
  try {
    const audio = new Audio('motor.mp3');
    await audio.play().catch(()=>{});
    audio.pause();
    audio.currentTime = 0;
    window._tvAudio = audio;
  } catch(e) { console.warn('Audio preload:', e); }

  // Quitar pantalla de activación y arrancar
  const screen = document.getElementById('tv-activate-screen');
  if (screen) screen.remove();

  cargarPantallaTaller();
  iniciarRelojTaller();
  setInterval(() => { if (sesion?.perfil === 'taller') cargarPantallaTaller(); }, 10000);
}

function _tvSonar() {
  try {
    if (window._tvAudio) {
      window._tvAudio.currentTime = 0;
      window._tvAudio.play().catch(()=>{});
      return;
    }
    const audio = new Audio('motor.mp3');
    audio.play().catch(()=>{});
  } catch(e) { console.warn('Sound error:', e); }
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

function _tvTimerStr(etapaOinicio) {
  const inicioISO = typeof etapaOinicio === 'string' ? etapaOinicio : etapaOinicio?.inicio;
  if (!inicioISO) return '';
  let secs = Math.floor((Date.now() - new Date(inicioISO)) / 1000);
  // Descontar tiempo en pausa acumulado
  if (typeof etapaOinicio === 'object' && etapaOinicio) {
    secs -= (etapaOinicio.tiempo_pausado_min || 0) * 60;
    if (etapaOinicio.pausado && etapaOinicio.pausa_inicio) {
      secs -= Math.floor((Date.now() - new Date(etapaOinicio.pausa_inicio)) / 1000);
    }
  }
  secs = Math.max(0, secs);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = n => String(n).padStart(2,'0');
  return pad(h)+':'+pad(m)+':'+pad(s);
}

function _tvHoraStr(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:false });
}

function _tvEntregaInfo(orden) {
  if (!orden.fecha_entrega_1) return { color:'#9CA3AF', label:'Sin fecha', hora:null };
  const f    = new Date(orden.fecha_entrega_1);
  const fDia = new Date(f); fDia.setHours(0,0,0,0);
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const dias = Math.round((fDia - hoy) / 86400000);
  const tieneHora = f.getHours() !== 0 || f.getMinutes() !== 0;
  const hora = tieneHora ? f.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false}) : null;
  if (dias < 0)   return { color:'#DC2626', label:`${Math.abs(dias)}d vencida`, hora };
  if (dias === 0) return { color:'#D97706', label:'Hoy', hora };
  if (dias <= 2)  return { color:'#D97706', label:`${dias}d`, hora };
  return { color:'#16A34A', label:`${dias}d`, hora };
}

function _tvMostrarOverlay(orden, etapasOrden, badge, esVerde, aprobadas) {
  if (_tallerOverlayTimer) clearInterval(_tallerOverlayTimer);
  const { color: entColor, label: entLabel } = _tvEntregaInfo(orden);
  const tecnico = etapasOrden.find(e => e.inicio && !e.fin)?.tecnico
    || etapasOrden.filter(e => e.tecnico).slice(-1)[0]?.tecnico || '';

  const etapasHtml = etapasOrden.map(e => {
    const isApproved = !!e.fin && aprobadas?.has(e.id);
    const cls = isApproved ? 'approved' : e.fin ? 'done' : (e.inicio && !e.fin ? 'active' : 'pending');
    const tiempo = cls === 'active' ? _tvTimerStr(e.inicio) : (isApproved ? '✓✓' : e.fin ? '✓' : '');
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
          <div style="font-family:'DM Mono',monospace;font-size:.7vw;font-weight:600;color:#9CA3AF;letter-spacing:.08em;margin-top:.2vh">${formatOT(orden.id)}</div>
          <div class="tv-overlay-veh">${[orden.marca,orden.linea].filter(Boolean).join(' ')||'—'}</div>
        </div>
        <div class="tv-overlay-body">${etapasHtml}</div>
        <div class="tv-overlay-foot">
          <span class="tv-overlay-tec">${tecnico||'—'}</span>
          <span class="tv-overlay-entrega" style="color:${esVerde?'#4ADE80':entColor}">${esVerde?'✓ Listo para entrega':entLabel}</span>
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
  if (!cont || document.getElementById('tv-activate-screen')) return;

  try {
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const manana = new Date(hoy); manana.setDate(manana.getDate()+1);
    const hoyISO = hoy.toISOString().split('T')[0];

    const [ordenesActivas, entregadasHoy, etapasActivas, etapasTodas, aprobacionesTodas, ordenesProgramadas] = await Promise.all([
      api(`/ordenes?estado=eq.Activa&order=fecha_entrega_1.asc`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Entregada&entregada_en=gte.${hoy.toISOString()}&order=entregada_en.desc`).catch(()=>[]) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,etapa,servicio,mecanico_id,tecnico,inicio,pausado,pausa_inicio,tiempo_pausado_min`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,etapa,servicio,inicio,fin,tecnico&order=creado_en.asc`).catch(()=>[]) || [],
      api(`/aprobaciones_etapa?select=etapa_id,estado&order=creado_en.desc`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Programada&order=fecha_programada.asc&select=id,placa,marca,linea,fecha_programada`).catch(()=>[]) || []
    ]);

    // Tomar el estado MÁS RECIENTE por etapa (orden desc ya viene del query)
    const _ultimoEstadoEtapa = {};
    aprobacionesTodas.forEach(a => {
      if (!(_ultimoEstadoEtapa[a.etapa_id])) _ultimoEstadoEtapa[a.etapa_id] = a.estado;
    });
    const aprobadas = new Set(
      Object.entries(_ultimoEstadoEtapa)
        .filter(([, estado]) => estado === 'aprobado')
        .map(([etapa_id]) => Number(etapa_id))
    );

    // ── Clasificar órdenes ───────────────────────────────────
    // Una orden está "lista" solo cuando TODAS sus etapas tienen fin Y calidad aprobada (última aprobación)
    const ordenesListas = ordenesActivas.filter(o => {
      const ets = etapasTodas.filter(e => e.orden_id === o.id);
      return ets.length > 0 && ets.every(e => e.fin) && ets.every(e => aprobadas.has(e.id));
    });
    const listasIds = new Set(ordenesListas.map(o => o.id));

    const ordenesEnGrid = ordenesActivas.filter(o => {
      if (listasIds.has(o.id)) return false;
      const ets = etapasTodas.filter(e => e.orden_id === o.id);
      if (!ets.length) return true;
      return ets.some(e => !e.fin);
    });

    const creadasHoy  = ordenesEnGrid.filter(o => new Date(o.creado_en) >= hoy && new Date(o.creado_en) < manana);
    const entregarHoy = ordenesEnGrid.filter(o => o.fecha_entrega_1?.split('T')[0] === hoyISO || o.fecha_entrega_2?.split('T')[0] === hoyISO);
    const enProceso   = ordenesEnGrid.filter(o => etapasActivas.some(e => e.orden_id === o.id));

    // ── Sonido para nuevas entregas ──────────────────────────
    const nuevasEntregadas = entregadasHoy.filter(o => !_tallerOrdenesNotificadas.has('ent_'+o.id));
    if (nuevasEntregadas.length) {
      nuevasEntregadas.forEach(o => _tallerOrdenesNotificadas.add('ent_'+o.id));
      _tvSonar();
      const oEnt = nuevasEntregadas[0];
      const ets  = etapasTodas.filter(e => e.orden_id === oEnt.id);
      setTimeout(() => _tvMostrarOverlay(oEnt, ets, '✓ ORDEN ENTREGADA', true, aprobadas), 600);
    }

    // ── Sonido para nuevas listas ────────────────────────────
    const nuevasListas = ordenesListas.filter(o =>
      !_tallerOrdenesNotificadas.has('lst_'+o.id) &&
      (_tallerGridSnapshot.size === 0 || _tallerGridSnapshot.has(o.id))
    );
    if (nuevasListas.length && !nuevasEntregadas.length) {
      nuevasListas.forEach(o => _tallerOrdenesNotificadas.add('lst_'+o.id));
      _tvSonar();
      const oLst = nuevasListas[0];
      const ets  = etapasTodas.filter(e => e.orden_id === oLst.id);
      setTimeout(() => _tvMostrarOverlay(oLst, ets, '✓ LISTO PARA ENTREGA', true, aprobadas), 600);
    }

    // ── Sonido para nueva etapa activa ───────────────────────
    const snapshotNuevo = {};
    etapasActivas.forEach(e => { snapshotNuevo[e.orden_id] = e.id; });
    let ordenCambiada = null; let badgeOverlay = 'ETAPA ACTUALIZADA';
    Object.entries(snapshotNuevo).forEach(([oid, eid]) => {
      if (_tallerGridSnapshot.size && window._tvSnapshotEtapas?.[oid] && window._tvSnapshotEtapas[oid] !== eid) {
        ordenCambiada = ordenesEnGrid.find(o => o.id === parseInt(oid));
      }
    });
    window._tvSnapshotEtapas = snapshotNuevo;
    _tallerGridSnapshot = new Set(ordenesEnGrid.map(o => o.id));

    // ── Render fila de tabla ─────────────────────────────────
    function renderFila(orden) {
      const etsOrden     = etapasTodas.filter(e => e.orden_id === orden.id);
      const etapasActOrden = etapasActivas.filter(e => e.orden_id === orden.id);
      const { color: entColor, label: entLabel } = _tvEntregaInfo(orden);

      const esIngreso = creadasHoy.some(o => o.id === orden.id);
      const esEntrega = entregarHoy.some(o => o.id === orden.id);
      const dias      = orden.fecha_entrega_1
        ? Math.round((new Date(orden.fecha_entrega_1) - new Date()) / 86400000) : null;

      let badge = '';
      if (esEntrega && dias !== null && dias < 0)
        badge = `<span class="tv-badge tv-badge-red">${Math.abs(dias)}d vencida</span>`;
      else if (esEntrega)
        badge = `<span class="tv-badge tv-badge-amber">Entrega hoy</span>`;
      else if (esIngreso)
        badge = `<span class="tv-badge tv-badge-blue">Nuevo hoy</span>`;
      else if (dias !== null && dias < 0)
        badge = `<span class="tv-badge tv-badge-red">${Math.abs(dias)}d vencida</span>`;
      else if (dias !== null && dias <= 2)
        badge = `<span class="tv-badge tv-badge-amber">${dias}d</span>`;
      else
        badge = `<span class="tv-badge tv-badge-gray">${dias !== null ? dias+'d' : 'Sin fecha'}</span>`;

      // Chips de etapas
      const chips = etsOrden.map((e, idx) => {
        const isApproved = !!e.fin && aprobadas.has(e.id);
        const done       = !!e.fin;
        const active     = !!e.inicio && !e.fin;
        const prevDone   = idx > 0 && !!etsOrden[idx-1]?.fin;
        const waiting    = !done && !active && prevDone;
        const cls        = isApproved ? 'approved' : done ? 'done' : active ? 'active' : waiting ? 'waiting' : 'pending';
        const label      = isApproved ? `${e.etapa} ✓✓` : done ? `${e.etapa} ✓` : active ? `${e.etapa} ●` : waiting ? `${e.etapa} →` : e.etapa;
        return `<span class="chip chip-${cls}"><span class="chip-dot ${cls}"></span>${label||'—'}</span>`;
      }).join('');

      // Técnico(s) — puede ser múltiple si hay simultáneas
      const tecnicos = [...new Set(etapasActOrden.map(e => e.tecnico).filter(Boolean))];
      const tecHtml  = tecnicos.length
        ? tecnicos.map(t => `<div class="tv-tec">${t}</div>`).join('')
        : `<div class="tv-tec" style="color:#9CA3AF">—</div>`;

      // Timer(es)
      const timerHtml = etapasActOrden.length
        ? etapasActOrden.map(e =>
            `<div class="tv-timer-val" id="tv-et-${e.id}" ${e.pausado ? 'style="color:rgba(180,83,9,.4)"' : ''}>${e.pausado ? '⏸ ' : ''}${_tvTimerStr(e)}</div>`
          ).join('')
        : `<div style="font-size:.7vw;color:#9CA3AF">—</div>`;

      return `<tr id="tv-row-${orden.id}" onclick="_tvVerDetalle(${orden.id})" style="cursor:pointer">
        <td>
          <div style="display:flex;align-items:baseline;gap:.5vw;white-space:nowrap">
            <div class="tv-placa">${orden.placa}</div>
            <div style="font-family:'DM Mono',monospace;font-size:.8vw;font-weight:700;color:#374151;letter-spacing:.04em;white-space:nowrap">${formatOT(orden.id)}</div>
          </div>
          ${orden.propietario ? `<div class="tv-propietario">${orden.propietario}</div>` : ''}
          <div class="tv-vehiculo">${[orden.marca,orden.linea].filter(Boolean).join(' ')||'—'}</div>
        </td>
        <td><div class="etapas-chips">${chips}</div></td>
        <td>${tecHtml}</td>
        <td>${timerHtml}</td>
        <td>
          <span class="tv-entrega-chip" style="color:${entColor}">${entLabel}</span>
          ${(() => { const { hora } = _tvEntregaInfo(orden); return hora ? `<div style="font-family:'DM Mono',monospace;font-size:.6vw;color:${entColor};opacity:.65;margin-top:.15vh">${hora}</div>` : ''; })()}
        </td>
        <td>${badge}</td>
      </tr>`;
    }

    // ── Panel derecho: Listos hoy ────────────────────────────
    const panelItems = [
      ...ordenesListas.map(o  => ({ orden:o, tipo:'listo'    })),
      ...entregadasHoy.map(o  => ({ orden:o, tipo:'entregado' }))
    ];
    const panelListosHtml = panelItems.length
      ? panelItems.map(({orden, tipo}) => {
          const hora = tipo === 'entregado' ? _tvHoraStr(orden.entregada_en) : '';
          const statusTxt = tipo === 'listo' ? 'Listo para entrega' : '✓ Entregado';
          return `<div class="tv-panel-item ${tipo}" onclick="_tvVerDetalle(${orden.id})">
            <div class="tv-panel-dot ${tipo}"></div>
            <div class="tv-panel-info">
              <div class="tv-panel-placa">${orden.placa}</div>
              <div class="tv-panel-status ${tipo}">${statusTxt}</div>
            </div>
            ${hora ? `<div class="tv-panel-time">${hora}</div>` : ''}
          </div>`;
        }).join('')
      : '<div class="tv-panel-empty">Sin terminados hoy</div>';

    // ── Panel derecho: Programadas ───────────────────────────
    const progHtml = ordenesProgramadas.length
      ? ordenesProgramadas.map(o => {
          const fp   = o.fecha_programada ? new Date(o.fecha_programada + 'T00:00:00') : null;
          const dias = fp ? Math.round((fp - hoy) / 86400000) : null;
          const label = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : dias !== null ? `en ${dias}d` : '—';
          return `<div class="tv-prog-item">
            <div class="tv-prog-dot"></div>
            <div style="flex:1;min-width:0">
              <div class="tv-prog-placa">${o.placa}</div>
              <div class="tv-prog-ot">${formatOT(o.id)} · ${[o.marca,o.linea].filter(Boolean).join(' ')||'—'}</div>
            </div>
            ${label ? `<div class="tv-prog-fecha">${label}</div>` : ''}
          </div>`;
        }).join('')
      : '<div class="tv-panel-empty">Sin programadas</div>';

    const panelHtml = panelListosHtml; // alias para compatibilidad

    // ── Render completo ──────────────────────────────────────
    const filasHtml = ordenesEnGrid.map(renderFila).join('');

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

        <div class="tv-kpi-strip" style="grid-template-columns:repeat(5,1fr)">
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#1E40AF">${ordenesActivas.length}</div>
            <div class="tv-kpi-label">Órdenes<br>activas</div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#15803D">${entregadasHoy.length}</div>
            <div class="tv-kpi-label">Entregadas<br>hoy</div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#1E40AF">${creadasHoy.length}</div>
            <div class="tv-kpi-label">Ingresaron<br>hoy</div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#B45309">${enProceso.length}</div>
            <div class="tv-kpi-label">En proceso<br>ahora</div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-num" style="color:#4338CA">${ordenesProgramadas.length}</div>
            <div class="tv-kpi-label">Programadas</div>
          </div>
        </div>

        <div class="tv-body">
          <div class="tv-list-wrap">
            <div class="tv-table-wrap">
              <table class="tv-table">
                <thead class="tv-thead">
                  <tr>
                    <th class="tv-col-placa">Placa</th>
                    <th class="tv-col-etapas">Etapas del proceso</th>
                    <th class="tv-col-tec">Técnico</th>
                    <th class="tv-col-timer">Tiempo</th>
                    <th class="tv-col-entrega">Entrega</th>
                    <th class="tv-col-estado">Estado</th>
                  </tr>
                </thead>
                <tbody class="tv-tbody">
                  ${filasHtml || `<tr><td colspan="6" style="text-align:center;padding:3vh;color:#D1D5DB;font-size:.8vw;letter-spacing:.1em">SIN ÓRDENES ACTIVAS</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="tv-panel-right">
            <div class="tv-panel-section">
              <div class="tv-panel-title">Listos hoy</div>
              <div class="tv-panel-list">${panelListosHtml}</div>
            </div>
            <div class="tv-panel-divider"></div>
            <div class="tv-panel-section">
              <div class="tv-panel-title" style="color:#6366F1">Programadas · ${ordenesProgramadas.length}</div>
              <div class="tv-panel-list" style="gap:.3vh">${progHtml}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="tv-watermark">
        <img src="icons/Icono_Redondo_Fondo_Taller.png"
          style="width:100%;height:100%;object-fit:contain;opacity:0.06" alt="">
      </div>
    `;

    // Guardar referencias globales
    window._tvEtapasTodas    = etapasTodas;
    window._tvOrdenesActivas = ordenesActivas;
    window._tvEntregadasHoy  = entregadasHoy;
    window._tvAprobadas      = aprobadas;

    iniciarRelojTaller();

    // Timers en vivo
    if (window._tallerTimerInterval) clearInterval(window._tallerTimerInterval);
    window._tallerTimerInterval = setInterval(() => {
      etapasActivas.forEach(e => {
        const el = document.getElementById(`tv-et-${e.id}`);
        if (el) el.textContent = (e.pausado ? '⏸ ' : '') + _tvTimerStr(e);
      });
    }, 1000);

    // Overlay por cambio de etapa
    if (ordenCambiada && !nuevasEntregadas.length && !nuevasListas.length) {
      const ets = etapasTodas.filter(e => e.orden_id === ordenCambiada.id);
      setTimeout(() => _tvMostrarOverlay(ordenCambiada, ets, 'ETAPA ACTUALIZADA', false, aprobadas), 400);
      const rowEl = document.getElementById(`tv-row-${ordenCambiada.id}`);
      if (rowEl) { rowEl.classList.remove('flash'); void rowEl.offsetWidth; rowEl.classList.add('flash'); }
    }

  } catch(e) {
    if (!document.getElementById('tv-activate-screen'))
      cont.innerHTML = `<div style="color:#DC2626;padding:4vh 3vw;font-family:'DM Mono',monospace;font-size:1.2vw">ERROR: ${e.message}</div>`;
  }
}

function _tvVerDetalle(ordenId) {
  const todas  = [...(window._tvOrdenesActivas||[]), ...(window._tvEntregadasHoy||[])];
  const orden  = todas.find(o => o.id === ordenId);
  if (!orden) return;
  const ets    = (window._tvEtapasTodas||[]).filter(e => e.orden_id === ordenId);
  const esEnt  = (window._tvEntregadasHoy||[]).some(o => o.id === ordenId);
  _tvMostrarOverlay(orden, ets, esEnt ? '✓ ENTREGADA HOY' : 'DETALLE DE ORDEN', esEnt, window._tvAprobadas);
}