// ═══════════════════════════════════════════════════════════
// ROL REPUESTOS
// ═══════════════════════════════════════════════════════════

function montarRepuestos() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = `
      <div class="nav-section-label">Repuestos</div>
      <button class="nav-item active" id="nav-rep-aprobados" onclick="navRepuestos('aprobados')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
        Por enviar
      </button>
      <button class="nav-item" id="nav-rep-enviados" onclick="navRepuestos('enviados')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Enviados
      </button>
      <button class="nav-item" id="nav-rep-todos" onclick="navRepuestos('todos')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Todos
      </button>
    `;
  }

  const bottomNav = document.getElementById('bottom-nav-inner');
  if (bottomNav) {
    bottomNav.innerHTML = `
      <button class="bnav-item active" onclick="navRepuestos('aprobados')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
        <span>Por enviar</span>
      </button>
      <button class="bnav-item" onclick="navRepuestos('enviados')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        <span>Enviados</span>
      </button>
      <button class="bnav-item" onclick="navRepuestos('todos')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
        <span>Todos</span>
      </button>
    `;
  }

  document.getElementById('topbar-title').textContent = 'Repuestos';
  mostrarPagina('pag-repuestos');
  navRepuestos('aprobados');
}

function navRepuestos(filtro) {
  // Tabs del rol Repuestos (Por enviar / Enviados / Todos)
  ['aprobados','enviados','todos'].forEach(f => {
    const btn = document.getElementById('nav-rep-' + f);
    if (btn) btn.classList.toggle('active', f === filtro);
  });
  // Tab del jefe (pendientes)
  const btnPend = document.getElementById('nav-rep-pendientes');
  if (btnPend) btnPend.classList.remove('active');

  cargarRepuestos(filtro);
  closeSidebar();
}

async function cargarRepuestos(filtro = 'aprobados') {
  const cont = document.getElementById('rep-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';

  // Determinar si quien llama es el jefe (puede ver pendientes y aprobar)
  const esJefe = sesion?.perfil === 'jefe';

  try {
    let query = '/repuestos_solicitud?order=creado_en.desc';
    if      (filtro === 'pendientes' || filtro === 'pendiente')  query += '&estado=eq.pendiente';
    else if (filtro === 'aprobados'  || filtro === 'aprobado')   query += '&estado=eq.aprobado';
    else if (filtro === 'enviados'   || filtro === 'enviado')    query += '&estado=eq.enviado';
    else if (filtro === 'recibidos'  || filtro === 'recibido')   query += '&estado=eq.recibido';

    const solicitudes = await api(query).catch(() => []) || [];

    const SVG_WRENCH = '<svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="display:block;margin:0 auto"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

    if (!solicitudes.length) {
      const labels = { pendientes:'pendientes de aprobación', aprobados:'por enviar', enviados:'enviados', todos:'' };
      cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${SVG_WRENCH}</div><p>No hay solicitudes ${labels[filtro]||''}.</p></div>`;
      return;
    }

    const ids = solicitudes.map(s => s.id).join(',');
    const ordenIds = [...new Set(solicitudes.map(s => s.orden_id))].join(',');
    const [items, ordenes] = await Promise.all([
      api(`/repuestos_items?solicitud_id=in.(${ids})`).catch(() => []) || [],
      api(`/ordenes?id=in.(${ordenIds})&select=id,placa,marca,linea,propietario`).catch(() => []) || []
    ]);

    const fmt = n => n != null ? new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n) : '—';

    const estadoLabel = { pendiente:'Pendiente', aprobado:'Aprobado', enviado:'Enviado', recibido:'Recibido', rechazado:'Rechazado' };
    const estadoColor = { pendiente:'#D97706', aprobado:'#2563EB', enviado:'#7C3AED', recibido:'#059669', rechazado:'#DC2626' };
    const estadoBg   = { pendiente:'#FEF3C7', aprobado:'#EBF2FF', enviado:'#EDE9FE', recibido:'#E6F5EF',  rechazado:'#FEE2E2' };

    cont.innerHTML = solicitudes.map(s => {
      const orden    = ordenes.find(o => o.id === s.orden_id);
      const sitems   = items.filter(i => i.solicitud_id === s.id);
      const color    = estadoColor[s.estado] || '#6B7280';
      const bg       = estadoBg[s.estado]   || '#F3F4F6';
      const totalVal = sitems.reduce((acc, i) => acc + ((i.precio_lista||0) * (i.cantidad||1)), 0);

      const itemsHtml = sitems.map(i => `
        <tr>
          <td style="padding:8px 12px;font-size:13px;font-weight:500">${i.descripcion}</td>
          <td style="padding:8px 12px;font-size:12px;color:var(--gris-mid);font-family:'DM Mono',monospace">${i.numero_parte_oem||'—'}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px">${i.cantidad}</td>
          <td style="padding:8px 12px;font-size:12px">${i.operacion||'—'}</td>
          <td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:600">${fmt(i.precio_lista)}</td>
        </tr>`).join('');

      // Botones según rol y estado
      let accionesHtml = '';
      if (esJefe && s.estado === 'pendiente') {
        accionesHtml = `
          <div style="padding:12px 0 4px;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-danger btn-sm" onclick="rechazarSolicitudRepuestos(${s.id})">Rechazar</button>
            <button class="btn btn-success btn-sm" onclick="aprobarSolicitudRepuestos(${s.id})">Aprobar</button>
          </div>`;
      } else if (!esJefe && s.estado === 'aprobado') {
        // Rol Repuestos: marcar como enviado
        accionesHtml = `
          <div style="padding:12px 0 4px;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-primary btn-sm" onclick="marcarEnviado(${s.id})">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Marcar como enviado al mecánico
            </button>
          </div>`;
      }

      return `<div class="rep-card">
        <div class="rep-card-header">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:600;letter-spacing:1px">${orden?.placa||'—'}</div>
            <div style="font-size:12px;color:var(--gris-mid);margin-top:2px">${[orden?.marca,orden?.linea].filter(Boolean).join(' ')||'—'} · ${orden?.propietario||'—'}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:11px;font-weight:700;color:${color};background:${bg};padding:4px 12px;border-radius:99px;text-transform:uppercase">${estadoLabel[s.estado]||s.estado}</span>
            <div style="font-size:10px;color:var(--gris-mid);margin-top:4px">${formatTS(s.creado_en)}</div>
            <div style="font-size:11px;color:var(--gris-mid);margin-top:2px">Solicitó: ${s.solicitado_por}</div>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;margin-top:8px">
            <thead>
              <tr style="background:var(--gris-bg);border-bottom:1px solid var(--gris-borde)">
                <th style="padding:6px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Descripción</th>
                <th style="padding:6px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">N° Parte</th>
                <th style="padding:6px 12px;text-align:center;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Cant.</th>
                <th style="padding:6px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Operación</th>
                <th style="padding:6px 12px;text-align:right;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Precio</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            ${totalVal > 0 ? `<tfoot>
              <tr style="border-top:2px solid var(--gris-borde)">
                <td colspan="4" style="padding:8px 12px;font-size:12px;color:var(--gris-mid)">Total estimado</td>
                <td style="padding:8px 12px;text-align:right;font-size:14px;font-weight:700;color:var(--azul)">${fmt(totalVal)}</td>
              </tr>
            </tfoot>` : ''}
          </table>
        </div>
        ${accionesHtml}
        <div style="font-size:11px;color:var(--gris-mid);padding:6px 0;display:flex;gap:16px;flex-wrap:wrap">
          ${s.aprobado_por  ? `<span>Aprobado por <strong>${s.aprobado_por}</strong> · ${formatTS(s.aprobado_en)}</span>` : ''}
          ${s.enviado_en    ? `<span>Enviado · ${formatTS(s.enviado_en)}</span>` : ''}
          ${s.recibido_en   ? `<span>Recibido por mecánico · ${formatTS(s.recibido_en)}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// Jefe aprueba
async function aprobarSolicitudRepuestos(solicitudId) {
  if (!confirm('¿Aprobar esta solicitud de repuestos?')) return;
  try {
    await api(`/repuestos_solicitud?id=eq.${solicitudId}`, 'PATCH', {
      estado: 'aprobado',
      aprobado_por: sesion?.nombre || 'Jefe',
      aprobado_en: new Date().toISOString()
    });
    toast('Solicitud aprobada ✓');
    if (sesion?.perfil === 'jefe') cargarRepuestosJefe('pendientes');
    else cargarRepuestos('aprobados');
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// Jefe rechaza
async function rechazarSolicitudRepuestos(solicitudId) {
  if (!confirm('¿Rechazar esta solicitud?')) return;
  try {
    await api(`/repuestos_solicitud?id=eq.${solicitudId}`, 'PATCH', { estado: 'rechazado' });
    toast('Solicitud rechazada');
    if (sesion?.perfil === 'jefe') cargarRepuestosJefe('pendientes');
    else cargarRepuestos('pendientes');
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// Rol Repuestos: marca como enviado al mecánico
async function marcarEnviado(solicitudId) {
  try {
    await api(`/repuestos_solicitud?id=eq.${solicitudId}`, 'PATCH', {
      estado: 'enviado',
      enviado_en: new Date().toISOString()
    });
    toast('Marcado como enviado al mecánico ✓');
    navRepuestos('aprobados');
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// Llamada desde navJefe — renderiza tabs DENTRO del contenido, no toca el sidebar
function mostrarRepuestosJefe() {
  const cont = document.getElementById('rep-contenido');
  if (!cont) return;

  // Inyectar tabs de filtro dentro de la página de repuestos
  cont.innerHTML = `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px" id="rep-tabs-jefe">
      <button class="filtro-btn active" id="rtab-pendientes" onclick="navRepuestosJefe('pendientes')">Pendientes</button>
      <button class="filtro-btn" id="rtab-aprobados"  onclick="navRepuestosJefe('aprobados')">Aprobados</button>
      <button class="filtro-btn" id="rtab-enviados"   onclick="navRepuestosJefe('enviados')">Enviados</button>
      <button class="filtro-btn" id="rtab-recibidos"  onclick="navRepuestosJefe('recibidos')">Recibidos</button>
      <button class="filtro-btn" id="rtab-todos"      onclick="navRepuestosJefe('todos')">Todos</button>
    </div>
    <div id="rep-lista-jefe"><div class="loading-state">Cargando...</div></div>
  `;

  cargarRepuestosJefe('pendientes');
}

function navRepuestosJefe(filtro) {
  ['pendientes','aprobados','enviados','recibidos','todos'].forEach(f => {
    const btn = document.getElementById('rtab-' + f);
    if (btn) btn.classList.toggle('active', f === filtro);
  });
  cargarRepuestosJefe(filtro);
}

async function cargarRepuestosJefe(filtro) {
  const lista = document.getElementById('rep-lista-jefe');
  if (!lista) return;
  lista.innerHTML = '<div class="loading-state">Cargando...</div>';

  try {
    const estadoMap = { pendientes:'pendiente', aprobados:'aprobado', enviados:'enviado', recibidos:'recibido' };
    let query = '/repuestos_solicitud?order=creado_en.desc';
    if (estadoMap[filtro]) query += `&estado=eq.${estadoMap[filtro]}`;

    const solicitudes = await api(query).catch(() => []) || [];

    const SVG_WRENCH = '<svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="display:block;margin:0 auto"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

    if (!solicitudes.length) {
      const labels = { pendientes:'pendientes', aprobados:'aprobados', enviados:'enviados', recibidos:'recibidos', todos:'' };
      lista.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${SVG_WRENCH}</div><p>No hay solicitudes ${labels[filtro]||''}.</p></div>`;
      return;
    }

    const ids      = solicitudes.map(s => s.id).join(',');
    const ordenIds = [...new Set(solicitudes.map(s => s.orden_id))].join(',');
    const [items, ordenes] = await Promise.all([
      api(`/repuestos_items?solicitud_id=in.(${ids})`).catch(() => []) || [],
      api(`/ordenes?id=in.(${ordenIds})&select=id,placa,marca,linea,propietario`).catch(() => []) || []
    ]);

    const fmt = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
    const estadoLabel = { pendiente:'Pendiente', aprobado:'Aprobado', enviado:'Enviado', recibido:'Recibido', rechazado:'Rechazado' };
    const estadoColor = { pendiente:'#D97706', aprobado:'#2563EB', enviado:'#7C3AED', recibido:'#059669', rechazado:'#DC2626' };
    const estadoBg   = { pendiente:'#FEF3C7', aprobado:'#EBF2FF', enviado:'#EDE9FE', recibido:'#E6F5EF',  rechazado:'#FEE2E2' };

    lista.innerHTML = solicitudes.map(s => {
      const orden    = ordenes.find(o => o.id === s.orden_id);
      const sitems   = items.filter(i => i.solicitud_id === s.id);
      const color    = estadoColor[s.estado] || '#6B7280';
      const bg       = estadoBg[s.estado]   || '#F3F4F6';
      const totalVal = sitems.reduce((acc, i) => acc + ((i.precio_lista||0)*(i.cantidad||1)), 0);

      const itemsHtml = sitems.map(i => `
        <tr>
          <td style="padding:8px 12px;font-size:13px;font-weight:500">${i.descripcion}</td>
          <td style="padding:8px 12px;font-size:12px;color:var(--gris-mid);font-family:'DM Mono',monospace">${i.numero_parte_oem||'—'}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px">${i.cantidad}</td>
          <td style="padding:8px 12px;font-size:12px">${i.operacion||'—'}</td>
          <td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:600">${fmt(i.precio_lista)}</td>
        </tr>`).join('');

      const accionesHtml = s.estado === 'pendiente' ? `
        <div style="padding:12px 0 4px;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-danger btn-sm" onclick="rechazarSolicitudRepuestos(${s.id})">Rechazar</button>
          <button class="btn btn-success btn-sm" onclick="aprobarSolicitudRepuestos(${s.id})">Aprobar</button>
        </div>` : '';

      return `<div class="rep-card">
        <div class="rep-card-header">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:600;letter-spacing:1px">${orden?.placa||'—'}</div>
            <div style="font-size:12px;color:var(--gris-mid);margin-top:2px">${[orden?.marca,orden?.linea].filter(Boolean).join(' ')||'—'} · ${orden?.propietario||'—'}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:11px;font-weight:700;color:${color};background:${bg};padding:4px 12px;border-radius:99px;text-transform:uppercase">${estadoLabel[s.estado]||s.estado}</span>
            <div style="font-size:10px;color:var(--gris-mid);margin-top:4px">${formatTS(s.creado_en)}</div>
            <div style="font-size:11px;color:var(--gris-mid);margin-top:2px">Solicitó: ${s.solicitado_por}</div>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;margin-top:8px">
            <thead>
              <tr style="background:var(--gris-bg);border-bottom:1px solid var(--gris-borde)">
                <th style="padding:6px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Descripción</th>
                <th style="padding:6px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">N° Parte</th>
                <th style="padding:6px 12px;text-align:center;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Cant.</th>
                <th style="padding:6px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Operación</th>
                <th style="padding:6px 12px;text-align:right;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Precio</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            ${totalVal > 0 ? `<tfoot><tr style="border-top:2px solid var(--gris-borde)">
              <td colspan="4" style="padding:8px 12px;font-size:12px;color:var(--gris-mid)">Total estimado</td>
              <td style="padding:8px 12px;text-align:right;font-size:14px;font-weight:700;color:var(--azul)">${fmt(totalVal)}</td>
            </tr></tfoot>` : ''}
          </table>
        </div>
        ${accionesHtml}
        <div style="font-size:11px;color:var(--gris-mid);padding:6px 0;display:flex;gap:16px;flex-wrap:wrap">
          ${s.aprobado_por ? `<span>Aprobado por <strong>${s.aprobado_por}</strong> · ${formatTS(s.aprobado_en)}</span>` : ''}
          ${s.enviado_en   ? `<span>Enviado · ${formatTS(s.enviado_en)}</span>` : ''}
          ${s.recibido_en  ? `<span>Recibido · ${formatTS(s.recibido_en)}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    lista.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}