// ═══════════════════════════════════════════════════════════
// DASHBOARD - ESTADO DEL TALLER
// ═══════════════════════════════════════════════════════════

function actualizarCapacidad(activas) {
  const cap   = document.getElementById('sidebar-capacidad');
  const fill  = document.getElementById('cap-fill');
  const pctEl = document.getElementById('cap-pct');
  const subEl = document.getElementById('cap-sub');
  if (!cap) return;
  cap.style.display = 'block';
  const pct   = Math.min(Math.round((activas / CAPACIDAD_TALLER) * 100), 100);
  const circ  = 2 * Math.PI * 30;
  const color = pct <= 65 ? '#EAB308' : pct <= 80 ? '#F97316' : '#EF4444';
  if (fill)  { fill.style.strokeDasharray = `${(pct/100)*circ} ${circ}`; fill.style.stroke = color; }
  if (pctEl) pctEl.textContent = pct + '%';
  if (subEl) subEl.textContent = `${activas} de ${CAPACIDAD_TALLER} cupos`;
}

// ── Helpers ──────────────────────────────────────────────
function semanaNum(fecha) {
  const d = new Date(fecha);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w) / 86400000 - 3 + (w.getDay() + 6) % 7) / 7);
}

function diasEntre(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ── Dashboard principal ───────────────────────────────────
async function cargarDashboard() {
  const cont = document.getElementById('dash-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';

  try {
    const [ordenes, todasEtapas] = await Promise.all([
      api(`/ordenes?select=id,placa,marca,linea,modelo,propietario,estado,pulmon,creado_en,fecha_entrega_1,fecha_entrega_2`).catch(() => []) || [],
      api(`/etapas?select=id,orden_id,servicio,etapa,etapa_key,inicio,fin,mecanico_id,tecnico`).catch(() => []) || []
    ]);

    // ── Métricas base ─────────────────────────────────────
    const activas    = ordenes.filter(o => o.estado === 'Activa' && !o.pulmon).length;
    const pulmon     = ordenes.filter(o => o.pulmon).length;
    const entregadas = ordenes.filter(o => o.estado === 'Entregada').length;
    const total      = ordenes.length;

    actualizarCapacidad(activas + pulmon);

    const etapasActivas = todasEtapas.filter(e => e.inicio && !e.fin);

    const srvColor  = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };
    const srvNombre = { latoneria:'Latonería', pintura:'Pintura', mecanica:'Mecánica', adicionales:'Adicionales' };

    // ── 1. TIEMPO PROMEDIO POR SERVICIO ──────────────────
    const etapasConDur = todasEtapas.filter(e => e.inicio && e.fin);
    const tiemposPorSrv = {};
    etapasConDur.forEach(e => {
      const srv = e.servicio || 'sin_servicio';
      if (!tiemposPorSrv[srv]) tiemposPorSrv[srv] = [];
      const mins = Math.round((new Date(e.fin) - new Date(e.inicio)) / 60000);
      if (mins > 0) tiemposPorSrv[srv].push(mins);
    });

    const promedios = Object.fromEntries(
      Object.entries(tiemposPorSrv).map(([srv, arr]) => [srv, Math.round(arr.reduce((a,b)=>a+b,0)/arr.length)])
    );
    const maxProm = Math.max(...Object.values(promedios), 1);

    const tiemposHtml = Object.entries(promedios).length
      ? Object.entries(promedios).sort((a,b)=>b[1]-a[1]).map(([srv, prom]) => {
          const h = Math.floor(prom / 60), m = prom % 60;
          const label = h >= 24 ? `${Math.floor(h/24)}d ${h%24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
          const color = srvColor[srv] || '#6B7280';
          const barW  = Math.round((prom / maxProm) * 100);
          const n     = tiemposPorSrv[srv].length;
          return `<div class="dash-tiempo-row">
            <div class="dash-tiempo-label" style="color:${color}">${srvNombre[srv] || srv}</div>
            <div class="dash-tiempo-bar-wrap">
              <div class="dash-tiempo-bar" style="width:${barW}%;background:${color}22;border-left:3px solid ${color}"></div>
            </div>
            <div class="dash-tiempo-val" style="color:${color}">${label}</div>
            <div class="dash-tiempo-n">${n} etapas</div>
          </div>`;
        }).join('')
      : '<div style="font-size:13px;color:var(--gris-mid);padding:8px 0">Sin datos históricos aún.</div>';

    // ── 2. PRÓXIMAS ENTREGAS ──────────────────────────────
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const ordenesConFecha = ordenes
      .filter(o => (o.estado === 'Activa' || o.pulmon) && (o.fecha_entrega_1 || o.fecha_entrega_2))
      .map(o => {
        const f1 = o.fecha_entrega_1 ? new Date(o.fecha_entrega_1) : null;
        const f2 = o.fecha_entrega_2 ? new Date(o.fecha_entrega_2) : null;
        const fechaRef = f1 || f2;
        const dias = Math.round((fechaRef - hoy) / 86400000);
        return { ...o, fechaRef, dias };
      })
      .sort((a,b) => a.dias - b.dias)
      .slice(0, 8);

    const entregasHtml = ordenesConFecha.length
      ? ordenesConFecha.map(o => {
          const urgente = o.dias <= 0;
          const pronto  = o.dias > 0 && o.dias <= 3;
          const color   = urgente ? 'var(--rojo)' : pronto ? '#D97706' : 'var(--verde)';
          const bg      = urgente ? 'var(--rojo-bg)' : pronto ? '#FEF3C7' : 'var(--verde-bg)';
          const label   = urgente
            ? (o.dias === 0 ? 'Hoy' : `${Math.abs(o.dias)}d vencida`)
            : o.dias === 1 ? 'Mañana' : `${o.dias} días`;
          return `<div class="dash-entrega-row" onclick="abrirOrden(${o.id})">
            <div style="flex:1;min-width:0">
              <div style="font-family:'DM Mono',monospace;font-weight:600;font-size:13px;letter-spacing:1px">${o.placa}</div>
              <div style="font-size:11px;color:var(--gris-mid);margin-top:1px">${[o.marca,o.linea].filter(Boolean).join(' ')||'—'} · ${o.propietario||'—'}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12px;font-weight:700;color:${color};background:${bg};padding:3px 8px;border-radius:99px">${label}</div>
              <div style="font-size:10px;color:var(--gris-mid);margin-top:2px">${o.fechaRef.toLocaleDateString('es-CO')}</div>
            </div>
          </div>`;
        }).join('')
      : '<div style="font-size:13px;color:var(--gris-mid);padding:8px 0">No hay fechas de entrega registradas.</div>';

    // ── 3. ÓRDENES POR SEMANA (últimas 8) ────────────────
    const ahora = new Date();
    const semanas = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date(ahora);
      d.setDate(d.getDate() - i * 7);
      const key = `${d.getFullYear()}-S${String(semanaNum(d)).padStart(2,'0')}`;
      semanas[key] = { iniciadas: 0, finalizadas: 0, label: `S${semanaNum(d)}` };
    }
    ordenes.forEach(o => {
      if (!o.creado_en) return;
      const key = `${new Date(o.creado_en).getFullYear()}-S${String(semanaNum(o.creado_en)).padStart(2,'0')}`;
      if (semanas[key]) semanas[key].iniciadas++;
    });
    ordenes.filter(o => o.estado === 'Entregada').forEach(o => {
      if (!o.creado_en) return;
      const key = `${new Date(o.creado_en).getFullYear()}-S${String(semanaNum(o.creado_en)).padStart(2,'0')}`;
      if (semanas[key]) semanas[key].finalizadas++;
    });

    const semArr = Object.values(semanas);
    const maxSem = Math.max(...semArr.map(s => Math.max(s.iniciadas, s.finalizadas)), 1);

    const semanasHtml = semArr.map(s => {
      const hI = Math.round((s.iniciadas / maxSem) * 72);
      const hF = Math.round((s.finalizadas / maxSem) * 72);
      return `<div class="dash-bar-col">
        <div class="dash-bar-group">
          <div class="dash-bar" style="height:${hI}px;background:var(--azul-mid)" title="Iniciadas: ${s.iniciadas}"></div>
          <div class="dash-bar" style="height:${hF}px;background:var(--verde)" title="Finalizadas: ${s.finalizadas}"></div>
        </div>
        <div class="dash-bar-label">${s.label}</div>
      </div>`;
    }).join('');

    // ── 4. SERVICIOS MÁS POPULARES ───────────────────────
    const conteoSrv = {};
    todasEtapas.forEach(e => {
      const s = e.servicio || 'sin_servicio';
      conteoSrv[s] = (conteoSrv[s] || 0) + 1;
    });
    const maxSrv = Math.max(...Object.values(conteoSrv), 1);

    const popularesHtml = Object.entries(conteoSrv).length
      ? Object.entries(conteoSrv).sort((a,b) => b[1]-a[1]).map(([srv, count]) => {
          const color = srvColor[srv] || '#6B7280';
          const pct   = Math.round((count / maxSrv) * 100);
          return `<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:12px;font-weight:600;color:${color}">${srvNombre[srv] || srv}</span>
              <span style="font-size:12px;color:var(--gris-mid)">${count} etapas</span>
            </div>
            <div style="height:6px;background:var(--gris-borde);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;transition:width 0.6s ease"></div>
            </div>
          </div>`;
        }).join('')
      : '<div style="font-size:13px;color:var(--gris-mid)">Sin datos aún.</div>';

    // ── 5. PROCESOS ACTIVOS ───────────────────────────────
    const porEtapa = {};
    etapasActivas.forEach(e => {
      const k = e.etapa || e.etapa_key || 'Sin nombre';
      if (!porEtapa[k]) porEtapa[k] = [];
      porEtapa[k].push(e);
    });

    const procesosHtml = Object.entries(porEtapa).length
      ? Object.entries(porEtapa).sort((a,b) => b[1].length - a[1].length).map(([etapaNombre, ets]) => {
          const srv   = ets[0]?.servicio || '';
          const color = srvColor[srv] || '#6B7280';
          const filasHtml = ets.slice(0,5).map(e => {
            const o = ordenes.find(ord => ord.id === e.orden_id);
            const dias = e.inicio ? diasEntre(e.inicio, new Date()) : 0;
            return `<div class="proceso-orden-row" onclick="abrirOrden(${e.orden_id})">
              <div>
                <div class="proceso-orden-placa">${o?.placa || '—'}</div>
                <div class="proceso-orden-vehiculo">${[o?.marca, o?.linea].filter(Boolean).join(' ')||'—'}</div>
              </div>
              <div style="text-align:right;margin-left:auto">
                ${e.tecnico ? `<div style="font-size:10px;color:var(--gris-mid)">👤 ${e.tecnico}</div>` : ''}
                <div style="font-size:10px;color:${dias >= 3 ? 'var(--rojo)' : 'var(--gris-mid)'};font-weight:${dias>=3?'700':'400'}">${dias}d</div>
              </div>
            </div>`;
          }).join('');
          const masHtml = ets.length > 5 ? `<div class="proceso-vacio" style="color:var(--azul-mid)">+${ets.length-5} más</div>` : '';
          return `<div class="proceso-col">
            <div class="proceso-col-header">
              <span class="proceso-col-nombre" style="color:${color}">${etapaNombre}</span>
              <span class="proceso-col-count" style="color:${color}">${ets.length}</span>
            </div>
            ${ets.length ? filasHtml + masHtml : '<div class="proceso-vacio">Sin carros</div>'}
          </div>`;
        }).join('')
      : '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>No hay etapas activas ahora.</p></div>';

    // ── Render ────────────────────────────────────────────
    cont.innerHTML = `
      <div class="dash-grid">
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#c5dbf0;color:#01459E">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="7" y1="3" x2="7" y2="9"/><line x1="12" y1="3" x2="12" y2="9"/></svg>
          </div>
          <div class="dash-card-val" style="color:var(--azul)">${activas}</div>
          <div class="dash-card-label">Órdenes activas</div>
          <div class="dash-card-sub">${total > 0 ? Math.round((activas/total)*100) : 0}% del total</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#f0d7bd;color:#D97706">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>
          </div>
          <div class="dash-card-val" style="color:#D97706">${pulmon}</div>
          <div class="dash-card-label">En pulmón</div>
          <div class="dash-card-sub">Esperando aprobación</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#ccedc0;color:#16A34A">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
          </div>
          <div class="dash-card-val" style="color:#16A34A">${entregadas}</div>
          <div class="dash-card-label">Entregadas</div>
          <div class="dash-card-sub">Historial total</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#d7beeb;color:#7C3AED">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
          </div>
          <div class="dash-card-val" style="color:#7C3AED">${total}</div>
          <div class="dash-card-label">Total órdenes</div>
          <div class="dash-card-sub">Todas las registradas</div>
        </div>
      </div>

      <div class="dash-row-2">
        <div class="dash-panel">
          <div class="dash-panel-titulo">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Tiempo promedio por servicio
          </div>
          <div class="dash-tiempos">${tiemposHtml}</div>
        </div>
        <div class="dash-panel">
          <div class="dash-panel-titulo">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Próximas entregas
          </div>
          <div class="dash-entregas">${entregasHtml}</div>
        </div>
      </div>

      <div class="dash-row-2">
        <div class="dash-panel">
          <div class="dash-panel-titulo" style="justify-content:space-between">
            <span style="display:flex;align-items:center;gap:7px"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Órdenes</span>
            <select id="dash-periodo-sel" onchange="cargarGraficoPeriodo()" style="font-size:11px;font-weight:600;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 8px;color:var(--gris-mid);background:white">
              <option value="semana">Por semana</option>
              <option value="mes">Por mes</option>
              <option value="ano">Por año</option>
            </select>
          </div>
          <div class="dash-legend">
            <span class="dash-legend-dot" style="background:var(--azul-mid)"></span><span>Iniciadas</span>
            <span class="dash-legend-dot" style="background:var(--verde);margin-left:12px"></span><span>Finalizadas</span>
          </div>
          <div id="dash-grafico-bars" class="dash-bars">${semanasHtml}</div>
        </div>
        <div class="dash-panel">
          <div class="dash-panel-titulo">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Servicios más demandados
          </div>
          <div style="margin-top:12px">${popularesHtml}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
        <button class="btn btn-ghost btn-sm" onclick="abrirReporteOrdenes()">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
          Exportar reporte
        </button>
      </div>
      <div class="dash-section-title">Procesos activos en el taller</div>
      <div class="dash-procesos-grid">${procesosHtml}</div>
    `;

  } catch(e) {
    const c = document.getElementById('dash-contenido');
    if (c) c.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}
// ═══════════════════════════════════════════════════════════
// GRÁFICO DINÁMICO POR PERÍODO
// ═══════════════════════════════════════════════════════════
async function cargarGraficoPeriodo() {
  const sel = document.getElementById('dash-periodo-sel');
  const periodo = sel?.value || 'semana';
  const cont = document.getElementById('dash-grafico-bars');
  if (!cont) return;
  cont.innerHTML = '<div style="font-size:12px;color:var(--gris-mid)">Cargando...</div>';

  try {
    const ordenes = await api(
      `/ordenes?select=id,creado_en,entregada_en,estado&order=creado_en.asc`
    ).catch(()=>[]) || [];

    const ahora = new Date();
    let buckets = {};

    if (periodo === 'semana') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(ahora);
        d.setDate(d.getDate() - i * 7);
        const key = `${d.getFullYear()}-S${String(semanaNum(d)).padStart(2,'0')}`;
        buckets[key] = { label: `S${semanaNum(d)}`, iniciadas: 0, finalizadas: 0 };
      }
      ordenes.forEach(o => {
        if (!o.creado_en) return;
        const key = `${new Date(o.creado_en).getFullYear()}-S${String(semanaNum(o.creado_en)).padStart(2,'0')}`;
        if (buckets[key]) buckets[key].iniciadas++;
      });
      ordenes.filter(o=>o.estado==='Entregada'&&o.entregada_en).forEach(o => {
        const key = `${new Date(o.entregada_en).getFullYear()}-S${String(semanaNum(o.entregada_en)).padStart(2,'0')}`;
        if (buckets[key]) buckets[key].finalizadas++;
      });

    } else if (periodo === 'mes') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label = d.toLocaleDateString('es-CO',{month:'short'});
        buckets[key] = { label, iniciadas: 0, finalizadas: 0 };
      }
      ordenes.forEach(o => {
        if (!o.creado_en) return;
        const d = new Date(o.creado_en);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (buckets[key]) buckets[key].iniciadas++;
      });
      ordenes.filter(o=>o.estado==='Entregada'&&o.entregada_en).forEach(o => {
        const d = new Date(o.entregada_en);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (buckets[key]) buckets[key].finalizadas++;
      });

    } else { // año
      const minYear = ordenes.length ? new Date(ordenes[0].creado_en).getFullYear() : ahora.getFullYear();
      for (let y = minYear; y <= ahora.getFullYear(); y++) {
        buckets[y] = { label: String(y), iniciadas: 0, finalizadas: 0 };
      }
      ordenes.forEach(o => {
        if (!o.creado_en) return;
        const y = new Date(o.creado_en).getFullYear();
        if (buckets[y]) buckets[y].iniciadas++;
      });
      ordenes.filter(o=>o.estado==='Entregada'&&o.entregada_en).forEach(o => {
        const y = new Date(o.entregada_en).getFullYear();
        if (buckets[y]) buckets[y].finalizadas++;
      });
    }

    const arr = Object.values(buckets);
    const maxV = Math.max(...arr.map(b=>Math.max(b.iniciadas,b.finalizadas)), 1);

    cont.innerHTML = arr.map(b => {
      const hI = Math.round((b.iniciadas/maxV)*72);
      const hF = Math.round((b.finalizadas/maxV)*72);
      return `<div class="dash-bar-col">
        <div class="dash-bar-group">
          <div class="dash-bar" style="height:${hI}px;background:var(--azul-mid)" title="Iniciadas: ${b.iniciadas}"></div>
          <div class="dash-bar" style="height:${hF}px;background:var(--verde)" title="Finalizadas: ${b.finalizadas}"></div>
        </div>
        <div class="dash-bar-label">${b.label}</div>
      </div>`;
    }).join('');
  } catch(e) {
    const cont2 = document.getElementById('dash-grafico-bars');
    if (cont2) cont2.innerHTML = `<div style="font-size:12px;color:var(--rojo)">Error: ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD FINANCIERO
// ═══════════════════════════════════════════════════════════
async function cargarDashboardFinanciero() {
  const cont = document.getElementById('dash-financiero-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando datos financieros...</div>';

  try {
    const [ordenes, etapas, repItems, solicitudes] = await Promise.all([
      api(`/ordenes?select=id,placa,marca,linea,propietario,estado,pulmon,creado_en,entregada_en`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,servicio,etapa,mecanico_id,tecnico,valor,inicio,fin,horas_estimadas`).catch(()=>[]) || [],
      api(`/repuestos_items?select=id,solicitud_id,precio_lista,cantidad`).catch(()=>[]) || [],
      api(`/repuestos_solicitud?select=id,orden_id,estado`).catch(()=>[]) || []
    ]);

    const fmt = n => n!=null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
    const srvColor = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };

    // Valores por orden (mano de obra)
    const valorMOPorOrden = {};
    etapas.forEach(e => {
      if (e.valor) valorMOPorOrden[e.orden_id] = (valorMOPorOrden[e.orden_id]||0) + e.valor;
    });

    // Valor repuestos por orden
    const repPorSolicitud = {};
    repItems.forEach(i => {
      repPorSolicitud[i.solicitud_id] = (repPorSolicitud[i.solicitud_id]||0) + ((i.precio_lista||0)*(i.cantidad||1));
    });
    const valorRepPorOrden = {};
    solicitudes.filter(s=>s.estado==='conseguido'||s.estado==='aprobado').forEach(s => {
      valorRepPorOrden[s.orden_id] = (valorRepPorOrden[s.orden_id]||0) + (repPorSolicitud[s.id]||0);
    });

    // WIP — órdenes activas
    const ordenesActivas = ordenes.filter(o=>o.estado==='Activa'&&!o.pulmon);
    const wipMO  = ordenesActivas.reduce((s,o)=>(valorMOPorOrden[o.id]||0)+s, 0);
    const wipRep = ordenesActivas.reduce((s,o)=>(valorRepPorOrden[o.id]||0)+s, 0);
    const wipTotal = wipMO + wipRep;

    // Entregadas — facturación
    const ordenesEntregadas = ordenes.filter(o=>o.estado==='Entregada');
    const totalFacturado = ordenesEntregadas.reduce((s,o)=>(valorMOPorOrden[o.id]||0)+(valorRepPorOrden[o.id]||0)+s, 0);
    const ticketProm = ordenesEntregadas.length ? Math.round(totalFacturado/ordenesEntregadas.length) : 0;

    // Tiempo real vs estimado por servicio
    const tiempoSrv = {};
    etapas.filter(e=>e.inicio&&e.fin&&e.servicio).forEach(e => {
      if (!tiempoSrv[e.servicio]) tiempoSrv[e.servicio] = { realMins:[], estHoras:[] };
      const mins = Math.round((new Date(e.fin)-new Date(e.inicio))/60000);
      tiempoSrv[e.servicio].realMins.push(mins);
      if (e.horas_estimadas) tiempoSrv[e.servicio].estHoras.push(e.horas_estimadas*60);
    });

    const tiempoSrvHtml = Object.entries(tiempoSrv).map(([srv, data]) => {
      const promReal = Math.round(data.realMins.reduce((a,b)=>a+b,0)/data.realMins.length);
      const promEst  = data.estHoras.length ? Math.round(data.estHoras.reduce((a,b)=>a+b,0)/data.estHoras.length) : null;
      const hR = Math.floor(promReal/60), mR = promReal%60;
      const color = srvColor[srv]||'#6B7280';
      const diff = promEst ? Math.round(((promReal-promEst)/promEst)*100) : null;
      const diffBadge = diff!=null ? `<span style="font-size:11px;font-weight:700;color:${diff>20?'var(--rojo)':diff>0?'#D97706':'var(--verde)'}">
        ${diff>0?'+':''}${diff}% vs estimado</span>` : '';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gris-borde)">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:3px;height:28px;background:${color};border-radius:99px"></div>
          <div><div style="font-size:13px;font-weight:600;color:${color}">${CATALOGO[srv]?.nombre||srv}</div>
            <div style="font-size:11px;color:var(--gris-mid)">${data.realMins.length} etapas completadas</div></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:700">${hR>0?hR+'h ':''} ${mR}m prom.</div>
          ${diffBadge}
        </div>
      </div>`;
    }).join('') || '<div style="font-size:13px;color:var(--gris-mid)">Sin datos aún.</div>';

    // Productividad por técnico
    const porTecnico = {};
    etapas.filter(e=>e.tecnico&&e.fin).forEach(e => {
      if (!porTecnico[e.tecnico]) porTecnico[e.tecnico] = { etapas:0, mins:0, valor:0 };
      porTecnico[e.tecnico].etapas++;
      if (e.inicio&&e.fin) porTecnico[e.tecnico].mins += Math.round((new Date(e.fin)-new Date(e.inicio))/60000);
      if (e.valor) porTecnico[e.tecnico].valor += e.valor;
    });
    const tecnicoHtml = Object.entries(porTecnico).sort((a,b)=>b[1].valor-a[1].valor).map(([tec, data]) => {
      const h = Math.floor(data.mins/60), m = data.mins%60;
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gris-borde)">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--azul-light);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--azul);flex-shrink:0">${tec.charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${tec}</div>
          <div style="font-size:11px;color:var(--gris-mid)">${data.etapas} etapas · ${h>0?h+'h ':''}${m}m trabajadas</div>
        </div>
        <div style="text-align:right;font-size:13px;font-weight:700;color:var(--verde)">${fmt(data.valor)}</div>
      </div>`;
    }).join('') || '<div style="font-size:13px;color:var(--gris-mid)">Sin datos aún.</div>';

    // Órdenes demoradas (>30% sobre promedio histórico del servicio)
    const promedioSrv = {};
    Object.entries(tiempoSrv).forEach(([srv, data]) => {
      promedioSrv[srv] = Math.round(data.realMins.reduce((a,b)=>a+b,0)/data.realMins.length);
    });
    const demoradas = [];
    ordenes.filter(o=>o.estado==='Activa'&&!o.pulmon).forEach(o => {
      const etsO = etapas.filter(e=>e.orden_id===o.id&&e.inicio&&!e.fin);
      etsO.forEach(e => {
        const minsTrans = Math.round((new Date()-new Date(e.inicio))/60000);
        const prom = promedioSrv[e.servicio];
        if (prom && minsTrans > prom * 1.3) {
          const pctDem = Math.round(((minsTrans-prom)/prom)*100);
          demoradas.push({ o, e, minsTrans, prom, pctDem });
        }
      });
    });
    demoradas.sort((a,b)=>b.pctDem-a.pctDem);
    const demoradasHtml = demoradas.length ? demoradas.slice(0,8).map(({o,e,minsTrans,prom,pctDem}) => {
      const hT = Math.floor(minsTrans/60), mT = minsTrans%60;
      const hP = Math.floor(prom/60), mP = prom%60;
      const color = pctDem>60?'var(--rojo)':pctDem>30?'#D97706':'#F59E0B';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gris-borde)">
        <div style="flex:1">
          <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px">${o.placa}</div>
          <div style="font-size:11px;color:var(--gris-mid)">${e.etapa} · ${CATALOGO[e.servicio]?.nombre||e.servicio}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px"><span style="color:var(--gris-mid)">Actual:</span> ${hT>0?hT+'h ':''} ${mT}m</div>
          <div style="font-size:12px"><span style="color:var(--gris-mid)">Prom:</span> ${hP>0?hP+'h ':''} ${mP}m</div>
          <span style="font-size:11px;font-weight:700;color:${color}">+${pctDem}% demorada</span>
        </div>
      </div>`;
    }).join('') : '<div style="font-size:13px;color:var(--verde);padding:8px 0">✓ Sin órdenes demoradas.</div>';

    cont.innerHTML = `
      <!-- KPIs financieros -->
      <div class="dash-grid" style="margin-bottom:16px">
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#E6F5EF;color:#059669">💰</div>
          <div class="dash-card-val" style="color:var(--verde);font-size:20px">${fmt(wipTotal)}</div>
          <div class="dash-card-label">WIP — trabajo en proceso</div>
          <div class="dash-card-sub">MO: ${fmt(wipMO)} · Rep: ${fmt(wipRep)}</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#EBF2FF;color:#2563EB">📊</div>
          <div class="dash-card-val" style="color:var(--azul);font-size:20px">${fmt(totalFacturado)}</div>
          <div class="dash-card-label">Total facturado (entregadas)</div>
          <div class="dash-card-sub">${ordenesEntregadas.length} órdenes entregadas</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#FEF3C7;color:#D97706">🎫</div>
          <div class="dash-card-val" style="color:#D97706;font-size:20px">${fmt(ticketProm)}</div>
          <div class="dash-card-label">Ticket promedio por orden</div>
          <div class="dash-card-sub">Mano de obra + repuestos</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#FEE2E2;color:#DC2626">⚠️</div>
          <div class="dash-card-val" style="color:var(--rojo)">${demoradas.length}</div>
          <div class="dash-card-label">Órdenes demoradas</div>
          <div class="dash-card-sub">>30% sobre promedio histórico</div>
        </div>
      </div>

      <div class="dash-row-2" style="margin-bottom:16px">
        <div class="dash-panel">
          <div class="dash-panel-titulo">⏱ Tiempo real vs estimado por servicio</div>
          ${tiempoSrvHtml}
        </div>
        <div class="dash-panel">
          <div class="dash-panel-titulo">⚠️ Órdenes demoradas</div>
          ${demoradasHtml}
        </div>
      </div>

      <div class="dash-panel">
        <div class="dash-panel-titulo">👤 Productividad por técnico</div>
        ${tecnicoHtml}
      </div>`;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// TABS DEL DASHBOARD
// ═══════════════════════════════════════════════════════════
function switchDashTab(tab) {
  const mesCont = document.getElementById('dash-mes-contenido');
  const opCont  = document.getElementById('dash-contenido');
  const finCont = document.getElementById('dash-financiero-contenido');
  const metCont = document.getElementById('dash-metas-contenido');
  const btnMes  = document.getElementById('dash-tab-mes');
  const btnOp   = document.getElementById('dash-tab-operativo');
  const btnFin  = document.getElementById('dash-tab-financiero');
  const btnMet  = document.getElementById('dash-tab-metas');

  [mesCont, opCont, finCont, metCont].forEach(c => { if (c) c.style.display = 'none'; });
  [btnMes, btnOp, btnFin, btnMet].forEach(b => { if (b) b.classList.remove('active'); });

  if (tab === 'mes') {
    if (mesCont) { mesCont.style.display = ''; }
    if (btnMes)  btnMes.classList.add('active');
    if (!mesCont?.innerHTML?.trim() || mesCont.innerHTML.includes('loading-state')) cargarDashboardMes();
  } else if (tab === 'operativo') {
    if (opCont)  { opCont.style.display  = ''; }
    if (btnOp)   btnOp.classList.add('active');
    if (!opCont?.innerHTML?.trim() || opCont.innerHTML.includes('loading-state')) cargarDashboard();
  } else if (tab === 'financiero') {
    if (finCont) { finCont.style.display = ''; }
    if (btnFin)  btnFin.classList.add('active');
    cargarDashboardFinanciero();
  } else if (tab === 'metas') {
    if (metCont) { metCont.style.display = ''; }
    if (btnMet)  btnMet.classList.add('active');
    if (typeof cargarDashboardMetas === 'function') cargarDashboardMetas();
  }
}
// ═══════════════════════════════════════════════════════════
// DASHBOARD MES ACTUAL — Tab por defecto
// ═══════════════════════════════════════════════════════════
async function cargarDashboardMes() {
  const cont = document.getElementById('dash-mes-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando mes actual...</div>';

  try {
    const ahora      = new Date();
    const inicioMes  = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
    const finMes     = new Date(ahora.getFullYear(), ahora.getMonth()+1, 0, 23, 59, 59).toISOString();
    const hoy        = new Date(); hoy.setHours(0,0,0,0);

    const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesNombre  = mesesNombres[ahora.getMonth()];
    const anioActual = ahora.getFullYear();

    const [ordenesActivas, ordenesEntregadasMes, etapasActivas, etapasMes] = await Promise.all([
      api(`/ordenes?estado=eq.Activa&pulmon=eq.false&select=id,placa,marca,linea,propietario,fecha_entrega_1,creado_en`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Entregada&creado_en=gte.${inicioMes}&select=id,placa,creado_en,entregada_en`).catch(()=>[]) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=orden_id,etapa,servicio,tecnico`).catch(()=>[]) || [],
      api(`/etapas?fin=gte.${inicioMes}&select=orden_id,servicio,valor`).catch(()=>[]) || []
    ]);

    const hoyISO       = hoy.toISOString().split('T')[0];
    const ingresadasHoy = ordenesActivas.filter(o => new Date(o.creado_en) >= hoy).length;
    const entregandoHoy = ordenesActivas.filter(o => o.fecha_entrega_1?.split('T')[0] === hoyISO).length;
    const enProceso     = new Set(etapasActivas.map(e => e.orden_id)).size;
    const ingresosMes   = etapasMes.reduce((s,e) => s+(e.valor||0), 0);

    const fmt = n => n != null
      ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n)
      : '—';

    // Próximas entregas del mes (ordenesActivas con fecha_entrega_1 en este mes)
    const proximasEntregas = ordenesActivas
      .filter(o => {
        if (!o.fecha_entrega_1) return false;
        const d = new Date(o.fecha_entrega_1);
        return d >= hoy;
      })
      .map(o => {
        const dias = Math.round((new Date(o.fecha_entrega_1) - hoy) / 86400000);
        return { ...o, dias };
      })
      .sort((a,b) => a.dias - b.dias)
      .slice(0, 6);

    const colorBar = p => p >= 100 ? 'var(--verde)' : p >= 70 ? '#D97706' : 'var(--rojo)';

    // Servicios del mes
    const srvColor  = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };
    const conteoPorSrv = {};
    etapasMes.forEach(e => {
      const s = e.servicio || 'otro';
      conteoPorSrv[s] = (conteoPorSrv[s]||0) + 1;
    });
    const maxSrv = Math.max(...Object.values(conteoPorSrv), 1);

    const srvHtml = Object.entries(conteoPorSrv).sort((a,b)=>b[1]-a[1]).map(([srv, cnt]) => {
      const color = srvColor[srv] || '#6B7280';
      const pct   = Math.round((cnt/maxSrv)*100);
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:12px;font-weight:600;color:${color}">${CATALOGO[srv]?.nombre||srv}</span>
          <span style="font-size:12px;color:var(--gris-mid)">${cnt} etapas</span>
        </div>
        <div style="height:6px;background:var(--gris-borde);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;transition:width .6s"></div>
        </div>
      </div>`;
    }).join('') || '<div style="font-size:13px;color:var(--gris-mid)">Sin datos aún.</div>';

    // Próximas entregas html
    const entregasHtml = proximasEntregas.length
      ? proximasEntregas.map(o => {
          const urgente = o.dias <= 0;
          const pronto  = o.dias > 0 && o.dias <= 2;
          const color   = urgente ? 'var(--rojo)' : pronto ? '#D97706' : 'var(--verde)';
          const bg      = urgente ? 'var(--rojo-bg)' : pronto ? '#FEF3C7' : 'var(--verde-bg)';
          const label   = urgente
            ? (o.dias === 0 ? 'Hoy' : `${Math.abs(o.dias)}d vencida`)
            : o.dias === 1 ? 'Mañana' : `${o.dias}d`;
          return `<div class="dash-entrega-row" onclick="abrirOrden(${o.id})" style="cursor:pointer">
            <div style="flex:1;min-width:0">
              <div style="font-family:'DM Mono',monospace;font-weight:600;font-size:13px;letter-spacing:1px">${o.placa}</div>
              <div style="font-size:11px;color:var(--gris-mid);margin-top:1px">${[o.marca,o.linea].filter(Boolean).join(' ')||'—'} · ${o.propietario||'—'}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12px;font-weight:700;color:${color};background:${bg};padding:3px 8px;border-radius:99px">${label}</div>
              <div style="font-size:10px;color:var(--gris-mid);margin-top:2px">${new Date(o.fecha_entrega_1).toLocaleDateString('es-CO')}</div>
            </div>
          </div>`;
        }).join('')
      : '<div style="font-size:13px;color:var(--gris-mid);padding:8px 0">No hay fechas de entrega registradas.</div>';

    cont.innerHTML = `
      <div style="margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-size:20px;font-weight:700;color:var(--texto)">${mesNombre} ${anioActual}</div>
          <div style="font-size:13px;color:var(--gris-mid);margin-top:2px">Resumen operativo del mes en curso</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-ghost btn-sm" onclick="abrirModalReporte('dia')" style="font-size:12px;display:flex;align-items:center;gap:5px">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Reporte por día
          </button>
          <button class="btn btn-ghost btn-sm" onclick="abrirModalReporte('semana')" style="font-size:12px;display:flex;align-items:center;gap:5px">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Reporte por semana
          </button>
          <button class="btn btn-primary btn-sm" onclick="generarReporteMes()" style="font-size:12px;display:flex;align-items:center;gap:5px">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Reporte del mes
          </button>
        </div>
      </div>

      <div class="dash-grid" style="margin-bottom:16px">
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#EBF2FF;color:#2563EB">
            <svg width="22" height="22" fill="none" stroke="#2563EB" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/></svg>
          </div>
          <div class="dash-card-val" style="color:var(--azul)">${ordenesActivas.length}</div>
          <div class="dash-card-label">Órdenes activas</div>
          <div class="dash-card-sub">${ingresadasHoy} ingresaron hoy</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#E6F5EF;color:#059669">
            <svg width="22" height="22" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="dash-card-val" style="color:var(--verde)">${ordenesEntregadasMes.length}</div>
          <div class="dash-card-label">Entregadas este mes</div>
          <div class="dash-card-sub">${entregandoHoy} entregan hoy</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#FEF3C7;color:#D97706">
            <svg width="22" height="22" fill="none" stroke="#D97706" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="dash-card-val" style="color:#D97706">${enProceso}</div>
          <div class="dash-card-label">En proceso ahora</div>
          <div class="dash-card-sub">Etapas activas</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#E6F5EF;color:#059669">
            <svg width="22" height="22" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="dash-card-val" style="color:var(--verde);font-size:18px">${fmt(ingresosMes)}</div>
          <div class="dash-card-label">Ingresos del mes</div>
          <div class="dash-card-sub">Mano de obra completada</div>
        </div>
      </div>

      <div class="dash-row-2">
        <div class="dash-panel">
          <div class="dash-panel-titulo">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Próximas entregas
          </div>
          <div class="dash-entregas">${entregasHtml}</div>
        </div>
        <div class="dash-panel">
          <div class="dash-panel-titulo">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Servicios del mes
          </div>
          ${srvHtml}
        </div>
      </div>
    `;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════
// REPORTES — Mes, semana y día
// ═══════════════════════════════════════════════════════════

function abrirModalReporte(tipo) {
  const modal = document.getElementById('modal-reporte');
  if (!modal) {
    // Crear modal si no existe
    const div = document.createElement('div');
    div.id = 'modal-reporte';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center';
    div.innerHTML = `<div style="background:var(--blanco);border-radius:12px;width:380px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="padding:20px 24px;border-bottom:1px solid var(--gris-borde);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:15px;font-weight:700;color:var(--texto)" id="modal-rep-titulo">Reporte</div>
        <button onclick="cerrarModalReporte()" style="background:none;border:none;cursor:pointer;color:var(--gris-mid);font-size:18px">✕</button>
      </div>
      <div style="padding:20px 24px" id="modal-rep-body"></div>
      <div style="padding:14px 24px;border-top:1px solid var(--gris-borde);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="cerrarModalReporte()">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="modal-rep-btn" onclick="">Generar</button>
      </div>
    </div>`;
    document.body.appendChild(div);
  }

  const ahora = new Date();
  const titulo = document.getElementById('modal-rep-titulo');
  const body   = document.getElementById('modal-rep-body');
  const btn    = document.getElementById('modal-rep-btn');
  const m = document.getElementById('modal-reporte');
  m.style.display = 'flex';

  if (tipo === 'dia') {
    titulo.textContent = 'Reporte por día';
    body.innerHTML = `
      <div class="field">
        <label>Selecciona el día</label>
        <input type="date" id="rep-fecha-dia" value="${ahora.toISOString().split('T')[0]}" max="${ahora.toISOString().split('T')[0]}">
      </div>`;
    btn.onclick = () => { generarReporteDia(document.getElementById('rep-fecha-dia')?.value); };
  } else if (tipo === 'semana') {
    // Calcular inicio de semana actual (lunes)
    const lunes = new Date(ahora);
    lunes.setDate(ahora.getDate() - ((ahora.getDay() + 6) % 7));
    titulo.textContent = 'Reporte por semana';
    body.innerHTML = `
      <div class="field" style="margin-bottom:12px">
        <label>Fecha inicio (lunes)</label>
        <input type="date" id="rep-fecha-ini" value="${lunes.toISOString().split('T')[0]}" max="${ahora.toISOString().split('T')[0]}">
      </div>
      <div class="field">
        <label>Fecha fin (domingo)</label>
        <input type="date" id="rep-fecha-fin" value="${ahora.toISOString().split('T')[0]}" max="${ahora.toISOString().split('T')[0]}">
      </div>`;
    btn.onclick = () => {
      const ini = document.getElementById('rep-fecha-ini')?.value;
      const fin = document.getElementById('rep-fecha-fin')?.value;
      generarReporteSemana(ini, fin);
    };
  }
}

function cerrarModalReporte() {
  const m = document.getElementById('modal-reporte');
  if (m) m.style.display = 'none';
}

async function generarReporteMes() {
  const ahora     = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre = mesesNombres[ahora.getMonth()];
  const titulo    = `Reporte ${mesNombre} ${ahora.getFullYear()}`;
  await _generarReporte(inicioMes, new Date(ahora.getFullYear(), ahora.getMonth()+1, 0, 23, 59, 59).toISOString(), titulo);
}

async function generarReporteDia(fecha) {
  if (!fecha) { toast('Selecciona una fecha', 'err'); return; }
  cerrarModalReporte();
  const ini = new Date(fecha + 'T00:00:00');
  const fin = new Date(fecha + 'T23:59:59');
  const fmt = d => d.toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  await _generarReporte(ini.toISOString(), fin.toISOString(), `Reporte del ${fmt(ini)}`);
}

async function generarReporteSemana(fechaIni, fechaFin) {
  if (!fechaIni || !fechaFin) { toast('Selecciona las fechas', 'err'); return; }
  cerrarModalReporte();
  const ini = new Date(fechaIni + 'T00:00:00');
  const fin = new Date(fechaFin + 'T23:59:59');
  const fmtCorto = d => d.toLocaleDateString('es-CO', { day:'2-digit', month:'short' });
  await _generarReporte(ini.toISOString(), fin.toISOString(), `Reporte semana ${fmtCorto(ini)} – ${fmtCorto(fin)}`);
}

async function _generarReporte(desde, hasta, titulo) {
  toast('Generando reporte...');
  try {
    const [ordenesEnt, etapasPeriodo, ordenesActivas] = await Promise.all([
      api(`/ordenes?estado=eq.Entregada&entregada_en=gte.${desde}&entregada_en=lte.${hasta}&select=id,placa,marca,linea,propietario,aseguradora,entregada_en,fecha_entrega_1`).catch(()=>[]) || [],
      api(`/etapas?fin=gte.${desde}&fin=lte.${hasta}&select=orden_id,etapa,servicio,valor,tecnico,inicio,fin`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Activa&creado_en=gte.${desde}&creado_en=lte.${hasta}&select=id,placa,marca,linea,propietario,aseguradora,creado_en`).catch(()=>[]) || []
    ]);

    const ingresos  = etapasPeriodo.reduce((s,e) => s+(e.valor||0), 0);
    const fmt       = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '$0';
    const fmtFecha  = d => d ? new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const fmtHora   = d => d ? new Date(d).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}) : '—';

    // Agrupar etapas por servicio
    const srvCount = {};
    etapasPeriodo.forEach(e => {
      const s = e.servicio || 'otro';
      srvCount[s] = (srvCount[s]||0) + 1;
    });

    // Agrupar por técnico
    const tecCount = {};
    etapasPeriodo.forEach(e => {
      if (!e.tecnico) return;
      tecCount[e.tecnico] = (tecCount[e.tecnico]||0) + 1;
    });

    // Construir HTML del reporte
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 13px; }
  .page { max-width: 900px; margin: 0 auto; padding: 32px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1E3A5F; padding-bottom:16px; margin-bottom:24px; }
  .logo-txt { font-size:22px; font-weight:700; color:#1E3A5F; letter-spacing:1px; }
  .logo-sub { font-size:11px; color:#666; margin-top:3px; }
  .rep-titulo { font-size:14px; font-weight:600; color:#333; text-align:right; }
  .rep-fecha  { font-size:11px; color:#888; margin-top:3px; text-align:right; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .kpi-box { border:1px solid #e5e7eb; border-radius:8px; padding:14px 16px; }
  .kpi-val { font-size:22px; font-weight:700; color:#1E3A5F; margin-bottom:4px; }
  .kpi-lbl { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.5px; }
  .section { margin-bottom:24px; }
  .section-title { font-size:12px; font-weight:700; color:#1E3A5F; text-transform:uppercase; letter-spacing:.8px; border-bottom:1px solid #e5e7eb; padding-bottom:8px; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#f3f4f6; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#666; font-weight:600; }
  td { padding:7px 10px; border-bottom:1px solid #f3f4f6; color:#333; }
  tr:last-child td { border-bottom:none; }
  .pill { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:600; }
  .pill-blue { background:#EBF2FF; color:#1E3A5F; }
  .pill-green { background:#E6F5EF; color:#0D7A4E; }
  .total-row { font-weight:700; background:#f9fafb; }
  .footer { margin-top:32px; border-top:1px solid #e5e7eb; padding-top:12px; font-size:10px; color:#aaa; text-align:center; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo-txt">FREIMANAUTOS</div>
      <div class="logo-sub">Simplemente profesional</div>
    </div>
    <div>
      <div class="rep-titulo">${titulo}</div>
      <div class="rep-fecha">Generado: ${new Date().toLocaleString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-val">${ordenesEnt.length}</div>
      <div class="kpi-lbl">Órdenes entregadas</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-val">${ordenesActivas.length}</div>
      <div class="kpi-lbl">Órdenes ingresadas</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-val">${etapasPeriodo.length}</div>
      <div class="kpi-lbl">Etapas completadas</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-val" style="font-size:16px">${fmt(ingresos)}</div>
      <div class="kpi-lbl">Ingresos generados</div>
    </div>
  </div>

  ${ordenesEnt.length ? `
  <div class="section">
    <div class="section-title">Órdenes entregadas</div>
    <table>
      <thead><tr><th>Placa</th><th>Vehículo</th><th>Propietario</th><th>Aseguradora</th><th>Fecha entrega</th></tr></thead>
      <tbody>
        ${ordenesEnt.map(o => `<tr>
          <td><strong>${o.placa}</strong></td>
          <td>${[o.marca,o.linea].filter(Boolean).join(' ')||'—'}</td>
          <td>${o.propietario||'—'}</td>
          <td>${o.aseguradora||'Particular'}</td>
          <td>${fmtHora(o.entregada_en)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${ordenesActivas.length ? `
  <div class="section">
    <div class="section-title">Órdenes ingresadas</div>
    <table>
      <thead><tr><th>Placa</th><th>Vehículo</th><th>Propietario</th><th>Aseguradora</th><th>Fecha ingreso</th></tr></thead>
      <tbody>
        ${ordenesActivas.map(o => `<tr>
          <td><strong>${o.placa}</strong></td>
          <td>${[o.marca,o.linea].filter(Boolean).join(' ')||'—'}</td>
          <td>${o.propietario||'—'}</td>
          <td>${o.aseguradora||'Particular'}</td>
          <td>${fmtFecha(o.creado_en)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${Object.keys(srvCount).length ? `
  <div class="section">
    <div class="section-title">Etapas por servicio</div>
    <table>
      <thead><tr><th>Servicio</th><th>Etapas completadas</th></tr></thead>
      <tbody>
        ${Object.entries(srvCount).sort((a,b)=>b[1]-a[1]).map(([srv,cnt]) => `<tr>
          <td>${srv.charAt(0).toUpperCase()+srv.slice(1)}</td>
          <td><span class="pill pill-blue">${cnt}</span></td>
        </tr>`).join('')}
        <tr class="total-row"><td>Total</td><td>${etapasPeriodo.length}</td></tr>
      </tbody>
    </table>
  </div>` : ''}

  ${Object.keys(tecCount).length ? `
  <div class="section">
    <div class="section-title">Productividad por técnico</div>
    <table>
      <thead><tr><th>Técnico</th><th>Etapas completadas</th></tr></thead>
      <tbody>
        ${Object.entries(tecCount).sort((a,b)=>b[1]-a[1]).map(([tec,cnt]) => `<tr>
          <td>${tec}</td>
          <td><span class="pill pill-green">${cnt}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <div class="footer">
    Freimanautos · Sistema Operativo · Reporte generado automáticamente
  </div>
</div>
</body>
</html>`;

    // Abrir en nueva pestaña y disparar impresión/descarga
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }
    toast('Reporte generado ✓');
  } catch(e) {
    toast('Error generando reporte: ' + e.message, 'err');
  }
}