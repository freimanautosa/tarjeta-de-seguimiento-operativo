// ═══════════════════════════════════════════════════════════
// DASHBOARD - ESTADO DEL TALLER
// ═══════════════════════════════════════════════════════════

function actualizarCapacidad(activas, pulmonInterno = 0, pulmonExterno = 0) {
  activas = Number(activas) || 0;
  pulmonInterno = Number(pulmonInterno) || 0;
  pulmonExterno = Number(pulmonExterno) || 0;
  const cap   = document.getElementById('sidebar-capacidad');
  const fillA = document.getElementById('cap-fill-activas');
  const fillP = document.getElementById('cap-fill-pulmon');
  const pctEl = document.getElementById('cap-pct');
  const subEl = document.getElementById('cap-sub');
  const pulmonSubEl = document.getElementById('cap-pulmon-sub');
  if (!cap) return;
  cap.style.display = 'block';

  const circ     = 2 * Math.PI * 30;
  const pulmonTotal = pulmonInterno + pulmonExterno;
  const total    = activas + pulmonInterno;
  const pctA     = Math.min(Math.round((activas / CAPACIDAD_TALLER) * 100), 100);
  const pctP     = Math.min(Math.round((pulmonInterno / CAPACIDAD_TALLER) * 100), 100);
  const pctTotal = Math.min(pctA + pctP, 100);

  // Barra activas (amarillo)
  if (fillA) {
    fillA.style.display = activas > 0 ? '' : 'none';
    fillA.style.strokeDasharray = `${(pctA/100)*circ} ${circ}`;
    fillA.style.strokeDashoffset = '0';
  }
  // Barra pulmón (naranja) — desplazada por el arco de activas
  if (fillP) {
    fillP.style.display = pulmonInterno > 0 ? '' : 'none';
    fillP.style.strokeDasharray = `${(pctP/100)*circ} ${circ}`;
    fillP.style.strokeDashoffset = `-${(pctA/100)*circ}`;
  }
  if (pctEl) pctEl.textContent = pctTotal + '%';
  if (subEl) subEl.textContent = `${total} de ${CAPACIDAD_TALLER} cupos`;
  if (pulmonSubEl) {
    const partes = [];
    if (pulmonInterno > 0) partes.push(`${pulmonInterno} pulmon interno`);
    if (pulmonExterno > 0) partes.push(`${pulmonExterno} pulmon externo`);
    pulmonSubEl.textContent = partes.join(' · ');
    pulmonSubEl.style.display = pulmonTotal > 0 ? 'block' : 'none';
  }
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

async function cargarDashboardMes() {
  const cont = document.getElementById('dash-mes-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';

  try {
    const ahora        = new Date();
    const inicioMesDate = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMesDate    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
    const inicioMes    = inicioMesDate.toISOString();
    const finMes       = finMesDate.toISOString();
    const hoy          = new Date(); hoy.setHours(0,0,0,0);

    const [ordenesMes, ordenesActivas, todasEtapas, solicitudesPend, aprobaciones] = await Promise.all([
      api(`/ordenes?creado_en=gte.${inicioMes}&creado_en=lt.${finMes}&select=id,placa,marca,linea,modelo,propietario,estado,pulmon,pulmon_tipo,creado_en,fecha_entrega_1,fecha_entrega_2,entregada_en&order=creado_en.desc`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Activa&select=id,placa,marca,linea,modelo,propietario,estado,pulmon,pulmon_tipo,creado_en,fecha_entrega_1,fecha_entrega_2`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,servicio,etapa,inicio,fin,valor,tecnico,mecanico_id,tiempo_pausado_min`).catch(()=>[]) || [],
      api(`/solicitudes_repuesto?estado=in.(pendiente_jefe,enviado_repuestos,cotizado,pedido,recibido_taller)&select=id,orden_id,estado,repuesto`).catch(()=>[]) || [],
      api(`/aprobaciones_etapa?select=id,etapa_id,estado&order=creado_en.desc`).catch(()=>[]) || []
    ]);

    // ── Helpers ──────────────────────────────────────────────
    const fmt     = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n||0);
    const mesLabel = ahora.toLocaleDateString('es-CO',{month:'long',year:'numeric'});
    const srvColor  = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };
    const srvNombre = { latoneria:'Latonería', pintura:'Pintura', mecanica:'Mecánica', adicionales:'Adicionales' };
    const srvBgMap  = { latoneria:'#FEE2E2', pintura:'#FEF3C7', mecanica:'#EBF2FF', adicionales:'#E6F5EF' };

    // ── Métricas KPI ─────────────────────────────────────────
    const activasNormales = ordenesActivas.filter(o => !o.pulmon).length;
    const pulmonInterno   = ordenesActivas.filter(o => o.pulmon && o.pulmon_tipo === 'interno').length;
    const pulmonExterno   = ordenesActivas.filter(o => o.pulmon && o.pulmon_tipo === 'externo').length;
    const entregadasMes   = ordenesMes.filter(o =>
      o.estado === 'Entregada' || (o.entregada_en && new Date(o.entregada_en) >= inicioMesDate)
    ).length;
    const etapasMesFin = todasEtapas.filter(e => e.fin && new Date(e.fin) >= inicioMesDate && new Date(e.fin) < finMesDate);
    const valorMes     = etapasMesFin.reduce((s,e) => s + (e.valor||0), 0);

    // ── Etapas indexadas por orden ────────────────────────────
    const etapasPorOrden = {};
    todasEtapas.forEach(e => {
      if (!etapasPorOrden[e.orden_id]) etapasPorOrden[e.orden_id] = [];
      etapasPorOrden[e.orden_id].push(e);
    });

    // ── Retrasos ─────────────────────────────────────────────
    const ordenesRetraso = ordenesActivas
      .filter(o => o.fecha_entrega_1 && new Date(o.fecha_entrega_1) < hoy)
      .map(o => {
        const f = new Date(o.fecha_entrega_1); f.setHours(0,0,0,0);
        return { ...o, diasRetraso: Math.round((hoy - f) / 86400000) };
      })
      .sort((a,b) => b.diasRetraso - a.diasRetraso);

    // ── Próximas entregas ─────────────────────────────────────
    const proximas = ordenesActivas
      .filter(o => o.fecha_entrega_1 || o.fecha_entrega_2)
      .map(o => {
        const f = o.fecha_entrega_1 ? new Date(o.fecha_entrega_1) : new Date(o.fecha_entrega_2);
        f.setHours(0,0,0,0);
        return { ...o, fechaRef: f, dias: Math.round((f - hoy) / 86400000) };
      })
      .filter(o => o.dias >= 0)
      .sort((a,b) => a.dias - b.dias)
      .slice(0, 7);

    // ── Flujo operativo (pipeline) ────────────────────────────
    const aprobPorEtapa = {};
    aprobaciones.forEach(a => { if (!aprobPorEtapa[a.etapa_id]) aprobPorEtapa[a.etapa_id] = a.estado; });

    const creadas    = ordenesMes.length;
    const asignadas  = ordenesActivas.filter(o => (etapasPorOrden[o.id]||[]).some(e => e.mecanico_id)).length;
    const enLat      = ordenesActivas.filter(o => (etapasPorOrden[o.id]||[]).some(e => e.servicio==='latoneria' && e.inicio && !e.fin)).length;
    const enPintura  = ordenesActivas.filter(o => (etapasPorOrden[o.id]||[]).some(e => e.servicio==='pintura'   && e.inicio && !e.fin)).length;
    const enMec      = ordenesActivas.filter(o => (etapasPorOrden[o.id]||[]).some(e => e.servicio==='mecanica'  && e.inicio && !e.fin)).length;
    const conCalidad = ordenesActivas.filter(o => {
      const ets = etapasPorOrden[o.id] || [];
      return ets.length > 0 && ets.every(e => aprobPorEtapa[e.id] === 'aprobado');
    }).length;
    const listaEntrega = ordenesActivas.filter(o => {
      const ets = etapasPorOrden[o.id] || [];
      return ets.length > 0 && ets.every(e => !!e.fin) && ets.every(e => aprobPorEtapa[e.id] === 'aprobado');
    }).length;

    // ── Tiempo promedio por servicio ──────────────────────────
    const tiemposPorSrv = {};
    todasEtapas.filter(e => e.inicio && e.fin).forEach(e => {
      const srv  = e.servicio || 'adicionales';
      const mins = Math.max(0, Math.round((new Date(e.fin) - new Date(e.inicio)) / 60000) - (e.tiempo_pausado_min||0));
      if (mins > 0) { if (!tiemposPorSrv[srv]) tiemposPorSrv[srv] = []; tiemposPorSrv[srv].push(mins); }
    });

    // ────────────────────────────────────────────────────────
    // HTML BLOCKS
    // ────────────────────────────────────────────────────────

    // — KPI cards —
    const kpiHtml = `
      <div style="display:grid;grid-template-columns:1.5fr repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div style="background:#1E3A5F;border-radius:14px;padding:22px 20px;color:white;display:flex;flex-direction:column;justify-content:space-between;min-height:128px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.65">Facturación del mes</div>
          <div>
            <div style="font-size:26px;font-weight:800;font-family:'DM Mono',monospace;line-height:1.15">${fmt(valorMes)}</div>
            <div style="font-size:11px;opacity:.55;margin-top:4px">${etapasMesFin.length} etapas cerradas</div>
          </div>
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:14px;padding:16px 14px;display:flex;flex-direction:column;gap:10px">
          <div style="width:34px;height:34px;background:#EBF2FF;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="17" height="17" fill="none" stroke="#2563EB" stroke-width="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <div style="font-size:30px;font-weight:800;color:#2563EB;line-height:1">${activasNormales}</div>
          <div><div style="font-size:12px;font-weight:600;color:var(--texto)">Activas</div><div style="font-size:11px;color:var(--gris-mid)">En proceso</div></div>
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:14px;padding:16px 14px;display:flex;flex-direction:column;gap:10px">
          <div style="width:34px;height:34px;background:#F5F3FF;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="17" height="17" fill="none" stroke="#7C3AED" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <div style="font-size:30px;font-weight:800;color:#7C3AED;line-height:1">${ordenesMes.length}</div>
          <div><div style="font-size:12px;font-weight:600;color:var(--texto)">Creadas</div><div style="font-size:11px;color:var(--gris-mid)">Este mes</div></div>
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:14px;padding:16px 14px;display:flex;flex-direction:column;gap:10px">
          <div style="width:34px;height:34px;background:#E6F5EF;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="17" height="17" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style="font-size:30px;font-weight:800;color:#059669;line-height:1">${entregadasMes}</div>
          <div><div style="font-size:12px;font-weight:600;color:var(--texto)">Entregadas</div><div style="font-size:11px;color:var(--gris-mid)">Este mes</div></div>
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:14px;padding:16px 14px;display:flex;flex-direction:column;gap:10px">
          <div style="width:34px;height:34px;background:#FEF3C7;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="17" height="17" fill="none" stroke="#D97706" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div style="font-size:30px;font-weight:800;color:#D97706;line-height:1">${pulmonInterno+pulmonExterno}</div>
          <div><div style="font-size:12px;font-weight:600;color:var(--texto)">En pulmón</div><div style="font-size:11px;color:var(--gris-mid)">${pulmonInterno} int · ${pulmonExterno} ext</div></div>
        </div>
      </div>`;

    // — Retrasos —
    const retrasosHtml = ordenesRetraso.length ? `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <svg width="15" height="15" fill="none" stroke="#DC2626" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style="font-size:12px;font-weight:700;color:#DC2626">${ordenesRetraso.length} con retraso:</span>
        </div>
        ${ordenesRetraso.map(o => `
          <div style="display:inline-flex;align-items:center;gap:6px;background:white;border:1px solid #FECACA;border-radius:7px;padding:4px 10px;cursor:pointer" onclick="abrirOrden(${o.id})">
            <span style="font-family:'DM Mono',monospace;font-weight:700;font-size:12px;letter-spacing:.5px">${escapeHtml(o.placa)}</span>
            <span style="font-size:11px;color:#DC2626;font-weight:600">+${o.diasRetraso}d</span>
          </div>`).join('')}
      </div>` : '';

    // — Pipeline —
    const pasos = [
      { label:'Creadas',    val:creadas,     color:'#2563EB', bg:'#EBF2FF' },
      { label:'Asignadas',  val:asignadas,   color:'#7C3AED', bg:'#F5F3FF' },
      { label:'Latonería',  val:enLat,       color:'#DC2626', bg:'#FEE2E2' },
      { label:'Pintura',    val:enPintura,   color:'#D97706', bg:'#FEF3C7' },
      { label:'Mecánica',   val:enMec,       color:'#0891B2', bg:'#E0F2FE' },
      { label:'Calidad',    val:conCalidad,  color:'#059669', bg:'#E6F5EF' },
      { label:'Lista',      val:listaEntrega,color:'#16A34A', bg:'#DCFCE7' },
    ];
    const pipelineHtml = pasos.map((p, i) => `
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:4px">
        <div style="flex:1;min-width:0;background:${p.bg};border-radius:10px;padding:12px 6px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:${p.color};line-height:1">${p.val}</div>
          <div style="font-size:10px;font-weight:600;color:${p.color};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.label}</div>
        </div>
        ${i < pasos.length-1 ? `<svg width="12" height="12" fill="none" stroke="var(--gris-mid)" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
      </div>`).join('');

    // — Próximas entregas —
    const proximasHtml = proximas.length ? proximas.map(o => {
      const color = o.dias === 0 ? 'var(--rojo)' : o.dias <= 2 ? '#D97706' : '#059669';
      const bg    = o.dias === 0 ? '#FEE2E2'     : o.dias <= 2 ? '#FEF3C7' : '#E6F5EF';
      const label = o.dias === 0 ? 'Hoy' : o.dias === 1 ? 'Mañana' : `${o.dias}d`;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde);cursor:pointer" onclick="abrirOrden(${o.id})">
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.5px">${escapeHtml(o.placa)}</div>
          <div style="font-size:11px;color:var(--gris-mid);margin-top:1px">${[o.marca,o.linea,o.modelo].filter(Boolean).map(escapeHtml).join(' ')||'—'} · ${escapeHtml(o.propietario||'—')}</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${color};background:${bg};padding:3px 8px;border-radius:99px;flex-shrink:0">${label}</span>
      </div>`;
    }).join('') : '<div style="font-size:12px;color:var(--gris-mid);padding:8px 0">Sin próximas entregas programadas.</div>';

    // — Tabla órdenes activas —
    const filasOrdenes = ordenesActivas.map(o => {
      const ets         = etapasPorOrden[o.id] || [];
      const etapaActiva = ets.find(e => e.inicio && !e.fin);
      const responsable = etapaActiva?.tecnico || '—';
      const srv         = etapaActiva?.servicio || null;
      const srvLabel    = srv ? (srvNombre[srv]||srv) : (ets.length ? 'Sin iniciar' : 'Sin etapas');
      const srvC        = srv ? (srvColor[srv]||'#6B7280') : '#9CA3AF';
      const srvBg       = srv ? (srvBgMap[srv]||'#F3F4F6') : '#F3F4F6';
      const diasTaller  = Math.round((ahora - new Date(o.creado_en)) / 86400000);
      const fEnt        = o.fecha_entrega_1 ? (() => { const d=new Date(o.fecha_entrega_1);d.setHours(0,0,0,0);return d; })() : null;
      const diasDelay   = fEnt ? Math.round((hoy - fEnt) / 86400000) : null;
      const riesgo      = diasDelay === null ? null : diasDelay > 0 ? 'Alto' : diasDelay >= -2 ? 'Medio' : 'Bajo';
      const rC = { Alto:'#DC2626', Medio:'#D97706', Bajo:'#059669' };
      const rB = { Alto:'#FEE2E2', Medio:'#FEF3C7', Bajo:'#E6F5EF' };
      return `<tr style="border-bottom:1px solid var(--gris-borde);cursor:pointer" onclick="abrirOrden(${o.id})" onmouseenter="this.style.background='var(--gris-bg)'" onmouseleave="this.style.background=''">
        <td style="padding:10px 12px;font-family:'DM Mono',monospace;font-size:11px;font-weight:600;color:var(--gris-mid);white-space:nowrap">${formatOT(o.id)}</td>
        <td style="padding:10px 12px">
          <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.8px">${escapeHtml(o.placa)}</div>
          <div style="font-size:10px;color:var(--gris-mid)">${[o.marca,o.linea].filter(Boolean).map(escapeHtml).join(' ')||'—'}</div>
        </td>
        <td style="padding:10px 12px">
          <span style="font-size:11px;font-weight:600;color:${srvC};background:${srvBg};padding:3px 8px;border-radius:6px;white-space:nowrap">${srvLabel}</span>
        </td>
        <td style="padding:10px 12px;font-size:12px;color:var(--texto)">${escapeHtml(responsable)}</td>
        <td style="padding:10px 12px;text-align:center;font-weight:700;font-size:13px;color:${diasTaller>10?'#DC2626':diasTaller>5?'#D97706':'var(--texto)'}">${diasTaller}d</td>
        <td style="padding:10px 12px;text-align:center">
          ${riesgo ? `<span style="font-size:10px;font-weight:700;color:${rC[riesgo]};background:${rB[riesgo]};padding:2px 7px;border-radius:99px">${riesgo}</span>` : '<span style="font-size:11px;color:var(--gris-mid)">—</span>'}
        </td>
      </tr>`;
    }).join('');

    const tablaHtml = ordenesActivas.length ? `
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:560px">
          <thead><tr style="background:var(--gris-bg)">
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:2px solid var(--gris-borde)">No. Orden</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:2px solid var(--gris-borde)">Placa</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:2px solid var(--gris-borde)">Estado</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:2px solid var(--gris-borde)">Responsable</th>
            <th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:2px solid var(--gris-borde)">Días</th>
            <th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:2px solid var(--gris-borde)">Riesgo</th>
          </tr></thead>
          <tbody>${filasOrdenes}</tbody>
        </table>
      </div>` : '<div class="empty-state"><p>Sin órdenes activas.</p></div>';

    // — Tiempo promedio —
    const tiemposHtml = Object.entries(tiemposPorSrv).length
      ? Object.entries(tiemposPorSrv)
          .sort((a,b) => (b[1].reduce((x,y)=>x+y,0)/b[1].length) - (a[1].reduce((x,y)=>x+y,0)/a[1].length))
          .map(([srv, arr]) => {
            const avg = Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
            const h   = Math.floor(avg/60), m = avg%60;
            const dias = Math.floor(h/8);
            const label = dias > 0 ? `${dias}d ${h%8}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
            const color = srvColor[srv]||'#6B7280';
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gris-borde)">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0"></div>
                <span style="font-size:13px;color:var(--texto)">${srvNombre[srv]||srv}</span>
              </div>
              <span style="font-size:13px;font-weight:700;color:${color};font-family:'DM Mono',monospace">${label}</span>
            </div>`;
          }).join('')
      : '<div style="font-size:12px;color:var(--gris-mid);padding:8px 0">Sin datos históricos aún.</div>';

    // ────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────
    cont.innerHTML = `
      <!-- Header -->
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--gris-mid);margin-bottom:3px">Resumen Operativo del mes</div>
        <div style="font-size:22px;font-weight:800;color:var(--texto);text-transform:capitalize">${mesLabel}</div>
      </div>

      ${kpiHtml}
      ${retrasosHtml}

      <!-- Flujo + Próximas -->
      <div style="display:grid;grid-template-columns:1fr 300px;gap:14px;margin-bottom:16px;align-items:start">
        <div class="card" style="padding:18px">
          <div style="font-size:14px;font-weight:700;color:var(--texto);margin-bottom:3px">Flujo operativo del taller</div>
          <div style="font-size:11px;color:var(--gris-mid);margin-bottom:14px">Estado actual de órdenes activas por proceso</div>
          <div style="display:flex;align-items:stretch;gap:4px;overflow-x:auto">${pipelineHtml}</div>
        </div>
        <div class="card" style="padding:18px">
          <div style="font-size:14px;font-weight:700;color:var(--texto);margin-bottom:14px">Próximas entregas</div>
          ${proximasHtml}
        </div>
      </div>

      <!-- Órdenes activas + sidebar -->
      <div style="display:grid;grid-template-columns:1fr 260px;gap:14px;align-items:start">
        <div class="card" style="padding:18px">
          <div style="font-size:14px;font-weight:700;color:var(--texto);margin-bottom:3px">Órdenes de trabajo activas</div>
          <div style="font-size:11px;color:var(--gris-mid);margin-bottom:14px">Seguimiento en tiempo real</div>
          ${tablaHtml}
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="card" style="padding:16px">
            <div style="font-size:13px;font-weight:700;color:var(--texto);margin-bottom:3px">Tiempo promedio por etapa</div>
            <div style="font-size:11px;color:var(--gris-mid);margin-bottom:12px">Histórico general</div>
            ${tiemposHtml}
          </div>
          <div class="card" style="padding:16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--texto);margin-bottom:3px">Repuestos pendientes</div>
                <div style="font-size:11px;color:var(--gris-mid);margin-bottom:10px">Órdenes en espera</div>
                <div style="font-size:36px;font-weight:800;color:${solicitudesPend.length>0?'#DC2626':'#059669'};line-height:1">${solicitudesPend.length}</div>
                <div style="font-size:11px;font-weight:600;color:${solicitudesPend.length>0?'#DC2626':'#059669'};margin-top:5px">${solicitudesPend.length>0?'Atención requerida':'Al día'}</div>
              </div>
              <div style="width:48px;height:48px;background:${solicitudesPend.length>0?'#FEE2E2':'#E6F5EF'};border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <svg width="24" height="24" fill="none" stroke="${solicitudesPend.length>0?'#DC2626':'#059669'}" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>`;

  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
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
    const activas        = ordenes.filter(o => o.estado === 'Activa' && !o.pulmon).length;
    const pulmonInterno  = ordenes.filter(o => o.pulmon && o.pulmon_tipo === 'interno').length;
    const pulmonExterno  = ordenes.filter(o => o.pulmon && o.pulmon_tipo === 'externo').length;
    const pulmon         = pulmonInterno + pulmonExterno;
    const entregadas = ordenes.filter(o => o.estado === 'Entregada').length;
    const total      = ordenes.length;

    actualizarCapacidad(activas, pulmonInterno, pulmonExterno);

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
                ${e.tecnico ? `<div style="font-size:10px;color:var(--gris-mid);display:flex;align-items:center;gap:3px">${ico('user',11)} ${e.tecnico}</div>` : ''}
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
      : `<div class="empty-state"><div class="empty-state-icon">${ico('wrench', 32)}</div><p>No hay etapas activas ahora.</p></div>`;

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
      return `<div class="dash-bar-col" style="min-width:18px;flex:0 0 auto">
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
          <div class="dash-card-icon" style="background:#E6F5EF;color:#059669">${ico('money', 22)}</div>
          <div class="dash-card-val" style="color:var(--verde);font-size:20px">${fmt(wipTotal)}</div>
          <div class="dash-card-label">WIP — trabajo en proceso</div>
          <div class="dash-card-sub">MO: ${fmt(wipMO)} · Rep: ${fmt(wipRep)}</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#EBF2FF;color:#2563EB">${ico('chart', 22)}</div>
          <div class="dash-card-val" style="color:var(--azul);font-size:20px">${fmt(totalFacturado)}</div>
          <div class="dash-card-label">Total facturado (entregadas)</div>
          <div class="dash-card-sub">${ordenesEntregadas.length} órdenes entregadas</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#FEF3C7;color:#D97706">${ico('ticket', 22)}</div>
          <div class="dash-card-val" style="color:#D97706;font-size:20px">${fmt(ticketProm)}</div>
          <div class="dash-card-label">Ticket promedio por orden</div>
          <div class="dash-card-sub">Mano de obra + repuestos</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#FEE2E2;color:#DC2626">${ico('warning', 22)}</div>
          <div class="dash-card-val" style="color:var(--rojo)">${demoradas.length}</div>
          <div class="dash-card-label">Órdenes demoradas</div>
          <div class="dash-card-sub">>30% sobre promedio histórico</div>
        </div>
      </div>

      <div class="dash-row-2" style="margin-bottom:16px">
        <div class="dash-panel">
          <div class="dash-panel-titulo">${ico('clock', 15)} Tiempo real vs estimado por servicio</div>
          ${tiempoSrvHtml}
        </div>
        <div class="dash-panel">
          <div class="dash-panel-titulo">${ico('warning', 15)} Órdenes demoradas</div>
          ${demoradasHtml}
        </div>
      </div>

      <div class="dash-panel">
        <div class="dash-panel-titulo">${ico('user', 15)} Productividad por técnico</div>
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
    if (!mesCont?.innerHTML?.trim()) {
      if (typeof cargarDashboardMes === 'function') cargarDashboardMes();
    }
  } else if (tab === 'operativo') {
    if (opCont)  { opCont.style.display = ''; }
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
