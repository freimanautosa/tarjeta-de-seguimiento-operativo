// ═══════════════════════════════════════════════════════════
// PANTALLA TALLER — Tiempo real, sin sidebar
// ═══════════════════════════════════════════════════════════

let tallerSubscription = null;

function montarTaller() {
  // Ocultar sidebar y topbar hamburger — pantalla limpia
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.querySelector('.hamburger');
  const bottomNav = document.getElementById('bottom-nav');
  if (sidebar)   sidebar.style.display = 'none';
  if (overlay)   overlay.style.display = 'none';
  if (hamburger) hamburger.style.display = 'none';
  if (bottomNav) bottomNav.style.display = 'none';

  // Ajustar main para que ocupe todo
  const main = document.querySelector('.main');
  if (main) main.style.marginLeft = '0';

  document.getElementById('topbar-title').textContent = 'Taller — Órdenes del día';
  document.getElementById('topbar-actions').innerHTML = `
    <span id="taller-reloj" style="font-family:'DM Mono',monospace;font-size:13px;color:var(--gris-mid)"></span>
  `;

  mostrarPagina('pag-taller');
  cargarPantallaTaller();
  iniciarRelojTaller();
  suscribirTaller();
}

function iniciarRelojTaller() {
  function tick() {
    const el = document.getElementById('taller-reloj');
    if (el) el.textContent = new Date().toLocaleTimeString('es-CO');
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
    const mananaISO = manana.toISOString().split('T')[0];

    const [todasOrdenes, etapasActivas] = await Promise.all([
      api(`/ordenes?estado=eq.Activa&order=creado_en.desc`).catch(()=>[]) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,etapa,servicio,mecanico_id,tecnico`).catch(()=>[]) || []
    ]);

    // Órdenes creadas hoy
    const creadasHoy = todasOrdenes.filter(o => {
      const f = new Date(o.creado_en);
      return f >= hoy && f < manana;
    });

    // Órdenes para entregar hoy
    const entregarHoy = todasOrdenes.filter(o => {
      const f1 = o.fecha_entrega_1 ? new Date(o.fecha_entrega_1).toISOString().split('T')[0] : null;
      const f2 = o.fecha_entrega_2 ? new Date(o.fecha_entrega_2).toISOString().split('T')[0] : null;
      return f1 === hoyISO || f2 === hoyISO;
    });

    const srvColor = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };
    const srvNombre = { latoneria:'Latonería', pintura:'Pintura', mecanica:'Mecánica', adicionales:'Adicionales' };

    function renderOrdenTaller(o) {
      const etapasO = etapasActivas.filter(e => e.orden_id === o.id);
      const etapsHtml = etapasO.length
        ? etapasO.map(e => {
            const color = srvColor[e.servicio] || '#6B7280';
            return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--gris-borde)">
              <div style="width:3px;height:20px;background:${color};border-radius:99px;flex-shrink:0"></div>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:600">${e.etapa||'—'}</div>
                ${e.tecnico ? `<div style="font-size:10px;color:var(--gris-mid)"> ${e.tecnico}</div>` : ''}
              </div>
              <div style="font-size:10px;color:${color};font-weight:700">${srvNombre[e.servicio]||''}</div>
            </div>`;
          }).join('')
        : `<div style="font-size:12px;color:var(--gris-mid);padding:6px 0">Sin etapas activas</div>`;

      return `<div class="taller-orden-card">
        <div class="taller-orden-placa">${o.placa}</div>
        <div style="font-size:12px;color:var(--gris-mid);margin-bottom:8px">${[o.marca,o.linea].filter(Boolean).join(' ')||'—'} · ${o.propietario||'—'}</div>
        ${etapsHtml}
      </div>`;
    }

    cont.innerHTML = `
      <div class="taller-grid">
        <div class="taller-col">
          <div class="taller-col-header" style="background:var(--azul);color:white">
            <span> Ingresaron hoy</span>
            <span class="taller-count">${creadasHoy.length}</span>
          </div>
          <div class="taller-col-body">
            ${creadasHoy.length
              ? creadasHoy.map(renderOrdenTaller).join('')
              : '<div class="taller-empty">Sin ingresos hoy</div>'}
          </div>
        </div>
        <div class="taller-col">
          <div class="taller-col-header" style="background:var(--verde);color:white">
            <span> Entregan hoy</span>
            <span class="taller-count">${entregarHoy.length}</span>
          </div>
          <div class="taller-col-body">
            ${entregarHoy.length
              ? entregarHoy.map(renderOrdenTaller).join('')
              : '<div class="taller-empty">Sin entregas programadas</div>'}
          </div>
        </div>
      </div>
    `;
  } catch(e) {
    const cont2 = document.getElementById('taller-contenido');
    if (cont2) cont2.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

function suscribirTaller() {
  // Polling cada 30 segundos — Supabase Realtime requiere configuración adicional
  // pero polling es suficiente para pantalla de taller
  setInterval(() => {
    if (sesion?.perfil === 'taller') cargarPantallaTaller();
  }, 30000);
}