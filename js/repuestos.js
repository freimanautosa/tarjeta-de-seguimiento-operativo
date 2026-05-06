// ═══════════════════════════════════════════════════════════
// ROL REPUESTOS
// ═══════════════════════════════════════════════════════════

function montarRepuestos() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = `
      <div class="nav-section-label">Repuestos</div>
      <button class="nav-item active" id="nav-rep-pendientes" onclick="navRepuestos('pendientes')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Pendientes
      </button>
      <button class="nav-item" id="nav-rep-aprobados" onclick="navRepuestos('aprobados')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
        Aprobados
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
      <button class="bnav-item active" onclick="navRepuestos('pendientes')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Pendientes</span>
      </button>
      <button class="bnav-item" onclick="navRepuestos('aprobados')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
        <span>Aprobados</span>
      </button>
      <button class="bnav-item" onclick="navRepuestos('todos')">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
        <span>Todos</span>
      </button>
    `;
  }

  document.getElementById('topbar-title').textContent = 'Repuestos';
  mostrarPagina('pag-repuestos');
  navRepuestos('pendientes');
}

function navRepuestos(filtro) {
  ['pendientes','aprobados','todos'].forEach(f => {
    const btn = document.getElementById('nav-rep-' + f);
    if (btn) btn.classList.toggle('active', f === filtro);
  });
  cargarRepuestos(filtro);
  closeSidebar();
}

async function cargarRepuestos(filtro = 'pendientes') {
  const cont = document.getElementById('rep-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';

  try {
    let query = '/repuestos_solicitud?order=creado_en.desc';
    if (filtro === 'pendientes') query += '&estado=eq.pendiente';
    else if (filtro === 'aprobados') query += '&estado=eq.aprobado';

    const solicitudes = await api(query).catch(()=>[]) || [];
    if (!solicitudes.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔩</div><p>No hay solicitudes ${filtro === 'pendientes' ? 'pendientes' : filtro === 'aprobados' ? 'aprobadas' : ''}.</p></div>`;
      return;
    }

    // Fetch items and ordenes
    const ids = solicitudes.map(s => s.id).join(',');
    const ordenIds = [...new Set(solicitudes.map(s => s.orden_id))].join(',');
    const [items, ordenes] = await Promise.all([
      api(`/repuestos_items?solicitud_id=in.(${ids})`).catch(()=>[]) || [],
      api(`/ordenes?id=in.(${ordenIds})&select=id,placa,marca,linea,propietario`).catch(()=>[]) || []
    ]);

    const fmt = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
    const estadoColor = { pendiente:'#D97706', aprobado:'#2563EB', conseguido:'#059669', rechazado:'#DC2626' };
    const estadoBg   = { pendiente:'#FEF3C7', aprobado:'#EBF2FF', conseguido:'#E6F5EF', rechazado:'#FEE2E2' };

    cont.innerHTML = solicitudes.map(s => {
      const orden   = ordenes.find(o => o.id === s.orden_id);
      const sitems  = items.filter(i => i.solicitud_id === s.id);
      const color   = estadoColor[s.estado] || '#6B7280';
      const bg      = estadoBg[s.estado] || '#F3F4F6';
      const totalVal = sitems.reduce((acc, i) => acc + ((i.precio_lista||0) * (i.cantidad||1)), 0);

      const itemsHtml = sitems.map(i => `
        <tr>
          <td style="padding:8px 12px;font-size:13px;font-weight:500">${i.descripcion}</td>
          <td style="padding:8px 12px;font-size:12px;color:var(--gris-mid);font-family:'DM Mono',monospace">${i.numero_parte_oem||'—'}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px">${i.cantidad}</td>
          <td style="padding:8px 12px;font-size:12px">${i.operacion||'—'}</td>
          <td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:600">${fmt(i.precio_lista)}</td>
          <td style="padding:8px 12px;text-align:center;font-size:12px;color:var(--gris-mid)">${i.tiempo_estimado_horas ? i.tiempo_estimado_horas + 'h' : '—'}</td>
          ${s.estado === 'aprobado' ? `<td style="padding:8px 12px;text-align:center">
            <button class="btn btn-success btn-xs" onclick="marcarConseguido(${s.id})">✓ Conseguido</button>
          </td>` : '<td></td>'}
        </tr>`).join('');

      return `<div class="rep-card">
        <div class="rep-card-header">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:600;letter-spacing:1px">${orden?.placa||'—'}</div>
            <div style="font-size:12px;color:var(--gris-mid);margin-top:2px">${[orden?.marca,orden?.linea].filter(Boolean).join(' ')||'—'} · ${orden?.propietario||'—'}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:11px;font-weight:700;color:${color};background:${bg};padding:4px 10px;border-radius:99px;text-transform:uppercase">${s.estado}</span>
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
                <th style="padding:6px 12px;text-align:center;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">H. M.O.</th>
                <th style="padding:6px 12px;width:120px"></th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            ${totalVal > 0 ? `<tfoot>
              <tr style="border-top:2px solid var(--gris-borde)">
                <td colspan="4" style="padding:8px 12px;font-size:12px;color:var(--gris-mid)">Total estimado</td>
                <td style="padding:8px 12px;text-align:right;font-size:14px;font-weight:700;color:var(--azul)">${fmt(totalVal)}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>` : ''}
          </table>
        </div>
        ${s.estado === 'pendiente' ? `
        <div style="padding:12px 0 4px;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-danger btn-sm" onclick="rechazarSolicitudRepuestos(${s.id})">✕ Rechazar</button>
        </div>` : ''}
        ${s.aprobado_por ? `<div style="font-size:11px;color:var(--gris-mid);padding:6px 0">Aprobado por ${s.aprobado_por} · ${formatTS(s.aprobado_en)}</div>` : ''}
      </div>`;
    }).join('');
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

async function marcarConseguido(solicitudId) {
  try {
    await api(`/repuestos_solicitud?id=eq.${solicitudId}`, 'PATCH', { estado: 'conseguido' });
    toast('Marcado como conseguido ✓');
    navRepuestos('aprobados');
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function rechazarSolicitudRepuestos(solicitudId) {
  if (!confirm('¿Rechazar esta solicitud?')) return;
  try {
    await api(`/repuestos_solicitud?id=eq.${solicitudId}`, 'PATCH', { estado: 'rechazado' });
    toast('Solicitud rechazada');
    navRepuestos('pendientes');
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}