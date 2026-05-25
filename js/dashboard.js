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

    const [ordenesMes, ordenesActivas, todasEtapas, solicitudesPend, aprobaciones, metasMes] = await Promise.all([
      api(`/ordenes?creado_en=gte.${inicioMes}&creado_en=lt.${finMes}&select=id,placa,marca,linea,modelo,propietario,estado,pulmon,pulmon_tipo,creado_en,fecha_entrega_1,fecha_entrega_2,entregada_en&order=creado_en.desc`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Activa&select=id,placa,marca,linea,modelo,propietario,estado,pulmon,pulmon_tipo,creado_en,fecha_entrega_1,fecha_entrega_2`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,servicio,etapa,inicio,fin,valor,tecnico,mecanico_id,tiempo_pausado_min`).catch(()=>[]) || [],
      api(`/solicitudes_repuesto?estado=in.(pendiente_jefe,enviado_repuestos,cotizado,pedido,recibido_taller)&select=id,orden_id,estado,repuesto`).catch(()=>[]) || [],
      api(`/aprobaciones_etapa?select=id,etapa_id,estado&order=creado_en.desc`).catch(()=>[]) || [],
      api(`/metas_taller?ano=eq.${ahora.getFullYear()}&mes_num=eq.${ahora.getMonth()+1}&limit=1`).catch(()=>[]) || []
    ]);
    const metaMes = Array.isArray(metasMes) ? metasMes[0] : null;

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
        const fDia = new Date(f); fDia.setHours(0,0,0,0);
        // Hora si fue guardada con tiempo (no medianoche exacta)
        const tieneHora = o.fecha_entrega_1 && (f.getHours() !== 0 || f.getMinutes() !== 0);
        const horaStr = tieneHora ? f.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:false }) : null;
        return { ...o, fechaRef: fDia, dias: Math.round((fDia - hoy) / 86400000), horaStr };
      })
      .filter(o => o.dias >= 0)
      .sort((a,b) => a.dias - b.dias || (a.horaStr||'99:99').localeCompare(b.horaStr||'99:99'))
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
      <div style="display:grid;grid-template-columns:1.6fr repeat(4,1fr);gap:8px;margin-bottom:12px">
        <div style="background:#1E3A5F;border-radius:12px;padding:14px 16px;color:white;display:flex;flex-direction:column;justify-content:space-between;min-height:100px">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.65">Facturación del mes</div>
          <div>
            <div style="font-size:22px;font-weight:800;font-family:'DM Mono',monospace;line-height:1.1">${fmt(valorMes)}</div>
            ${metaMes?.meta_ingresos ? (() => {
              const pct = Math.min(Math.round((valorMes / metaMes.meta_ingresos) * 100), 100);
              const barColor = pct >= 100 ? '#34D399' : pct >= 70 ? '#FCD34D' : '#F87171';
              return `<div style="margin-top:6px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:10px;opacity:.6">Meta: ${fmt(metaMes.meta_ingresos)}</span>
                  <span style="font-size:10px;font-weight:700;color:${barColor}">${pct}%</span>
                </div>
                <div style="height:3px;background:rgba(255,255,255,.15);border-radius:99px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${barColor};border-radius:99px"></div>
                </div>
              </div>`;
            })() : `<div style="font-size:10px;opacity:.5;margin-top:3px">${etapasMesFin.length} etapas cerradas</div>`}
          </div>
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px">
          <div style="width:28px;height:28px;background:#EBF2FF;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" fill="none" stroke="#2563EB" stroke-width="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <div style="font-size:26px;font-weight:800;color:#2563EB;line-height:1">${activasNormales}</div>
          <div><div style="font-size:11px;font-weight:600;color:var(--texto)">Activas</div><div style="font-size:10px;color:var(--gris-mid)">En proceso</div></div>
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px">
          <div style="width:28px;height:28px;background:#F5F3FF;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" fill="none" stroke="#7C3AED" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <div style="display:flex;align-items:baseline;gap:4px">
            <div style="font-size:26px;font-weight:800;color:#7C3AED;line-height:1">${ordenesMes.length}</div>
            ${metaMes?.meta_ordenes ? `<div style="font-size:12px;font-weight:600;color:var(--gris-mid)">/ ${metaMes.meta_ordenes}</div>` : ''}
          </div>
          <div><div style="font-size:11px;font-weight:600;color:var(--texto)">Creadas</div><div style="font-size:10px;color:var(--gris-mid)">Este mes</div></div>
          ${metaMes?.meta_ordenes ? (() => {
            const pct = Math.min(Math.round((ordenesMes.length / metaMes.meta_ordenes) * 100), 100);
            const barColor = pct >= 100 ? '#059669' : pct >= 70 ? '#D97706' : '#DC2626';
            return `<div style="height:3px;background:var(--gris-borde);border-radius:99px;overflow:hidden;margin-top:2px">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:99px"></div>
            </div>`;
          })() : ''}
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px">
          <div style="width:28px;height:28px;background:#E6F5EF;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style="font-size:26px;font-weight:800;color:#059669;line-height:1">${entregadasMes}</div>
          <div><div style="font-size:11px;font-weight:600;color:var(--texto)">Entregadas</div><div style="font-size:10px;color:var(--gris-mid)">Este mes</div></div>
        </div>
        <div style="background:white;border:1px solid var(--gris-borde);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px">
          <div style="width:28px;height:28px;background:#FEF3C7;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="14" height="14" fill="none" stroke="#D97706" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div style="font-size:26px;font-weight:800;color:#D97706;line-height:1">${pulmonInterno+pulmonExterno}</div>
          <div><div style="font-size:11px;font-weight:600;color:var(--texto)">En pulmón</div><div style="font-size:10px;color:var(--gris-mid)">${pulmonInterno} int · ${pulmonExterno} ext</div></div>
        </div>
      </div>`;

    // — Retrasos —
    const retrasosHtml = ordenesRetraso.length ? `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          <svg width="13" height="13" fill="none" stroke="#DC2626" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style="font-size:11px;font-weight:700;color:#DC2626">${ordenesRetraso.length} con retraso:</span>
        </div>
        ${ordenesRetraso.map(o => `
          <div style="display:inline-flex;align-items:center;gap:5px;background:white;border:1px solid #FECACA;border-radius:6px;padding:3px 8px;cursor:pointer" onclick="abrirOrden(${o.id})">
            <span style="font-family:'DM Mono',monospace;font-weight:700;font-size:11px;letter-spacing:.5px">${escapeHtml(o.placa)}</span>
            <span style="font-size:10px;color:#DC2626;font-weight:600">+${o.diasRetraso}d</span>
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
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:3px">
        <div style="flex:1;min-width:0;background:${p.bg};border-radius:8px;padding:8px 4px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:${p.color};line-height:1">${p.val}</div>
          <div style="font-size:9px;font-weight:600;color:${p.color};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.label}</div>
        </div>
        ${i < pasos.length-1 ? `<svg width="10" height="10" fill="none" stroke="var(--gris-mid)" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>` : ''}
      </div>`).join('');

    // — Próximas entregas —
    const proximasHtml = proximas.length ? proximas.map(o => {
      const color = o.dias === 0 ? 'var(--rojo)' : o.dias <= 2 ? '#D97706' : '#059669';
      const bg    = o.dias === 0 ? '#FEE2E2'     : o.dias <= 2 ? '#FEF3C7' : '#E6F5EF';
      const label = o.dias === 0 ? 'Hoy' : o.dias === 1 ? 'Mañana' : `${o.dias}d`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gris-borde);cursor:pointer" onclick="abrirOrden(${o.id})">
        <div style="flex:1;min-width:0;overflow:hidden">
          <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:11px;letter-spacing:.5px">${escapeHtml(o.placa)}</div>
          <div style="font-size:10px;color:var(--gris-mid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(o.propietario||'—')}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <span style="font-size:10px;font-weight:700;color:${color};background:${bg};padding:2px 6px;border-radius:99px;display:block">${label}</span>
          ${o.horaStr ? `<span style="font-family:'DM Mono',monospace;font-size:9px;color:${color};opacity:.75;display:block;margin-top:2px">${o.horaStr}</span>` : ''}
        </div>
      </div>`;
    }).join('') : '<div style="font-size:12px;color:var(--gris-mid);padding:8px 0">Sin próximas entregas programadas.</div>';

    // — Tabla órdenes activas (máx 3, luego "Ver todas") —
    const buildFila = o => {
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
        <td style="padding:7px 10px;font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:var(--gris-mid);white-space:nowrap">${formatOT(o.id)}</td>
        <td style="padding:7px 10px">
          <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:12px;letter-spacing:.8px">${escapeHtml(o.placa)}</div>
          <div style="font-size:10px;color:var(--gris-mid)">${[o.marca,o.linea].filter(Boolean).map(escapeHtml).join(' ')||'—'}</div>
        </td>
        <td style="padding:7px 10px">
          <span style="font-size:10px;font-weight:600;color:${srvC};background:${srvBg};padding:2px 7px;border-radius:5px;white-space:nowrap">${srvLabel}</span>
        </td>
        <td style="padding:7px 10px;font-size:11px;color:var(--texto)">${escapeHtml(responsable)}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;font-size:12px;color:${diasTaller>10?'#DC2626':diasTaller>5?'#D97706':'var(--texto)'}">${diasTaller}d</td>
        <td style="padding:7px 10px;text-align:center">
          ${riesgo ? `<span style="font-size:10px;font-weight:700;color:${rC[riesgo]};background:${rB[riesgo]};padding:2px 6px;border-radius:99px">${riesgo}</span>` : '<span style="font-size:10px;color:var(--gris-mid)">—</span>'}
        </td>
      </tr>`;
    };
    const filasOrdenes    = ordenesActivas.slice(0,3).map(buildFila).join('');
    const restanteOrdenes = ordenesActivas.length - 3;

    const tablaHtml = ordenesActivas.length ? `
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:520px">
          <thead><tr style="background:var(--gris-bg)">
            <th style="padding:6px 10px;text-align:left;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:1px solid var(--gris-borde)">No. Orden</th>
            <th style="padding:6px 10px;text-align:left;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:1px solid var(--gris-borde)">Placa</th>
            <th style="padding:6px 10px;text-align:left;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:1px solid var(--gris-borde)">Estado</th>
            <th style="padding:6px 10px;text-align:left;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:1px solid var(--gris-borde)">Responsable</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:1px solid var(--gris-borde)">Días</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gris-mid);border-bottom:1px solid var(--gris-borde)">Riesgo</th>
          </tr></thead>
          <tbody>${filasOrdenes}</tbody>
        </table>
      </div>
      ${restanteOrdenes > 0 ? `
        <div style="text-align:center;margin-top:10px">
          <button onclick="switchTab('ordenes')" style="background:none;border:1px solid var(--gris-borde);border-radius:8px;padding:6px 16px;font-size:11px;font-weight:600;color:var(--gris-mid);cursor:pointer">
            Ver todas las órdenes (${restanteOrdenes} más)
          </button>
        </div>` : ''}
      ` : '<div class="empty-state"><p>Sin órdenes activas.</p></div>';

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
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--gris-borde)">
              <div style="display:flex;align-items:center;gap:6px">
                <div style="width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0"></div>
                <span style="font-size:11px;color:var(--texto)">${srvNombre[srv]||srv}</span>
              </div>
              <span style="font-size:11px;font-weight:700;color:${color};font-family:'DM Mono',monospace">${label}</span>
            </div>`;
          }).join('')
      : '<div style="font-size:12px;color:var(--gris-mid);padding:8px 0">Sin datos históricos aún.</div>';

    // ────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────
    cont.innerHTML = `
      <!-- Header -->
      <div style="margin-bottom:10px;display:flex;align-items:baseline;gap:10px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--gris-mid)">Resumen Operativo del mes</div>
        <div style="font-size:18px;font-weight:800;color:var(--texto);text-transform:capitalize">${mesLabel}</div>
      </div>

      ${kpiHtml}
      ${retrasosHtml}

      <!-- Layout principal: izquierda (flujo + tabla) | derecha (próximas + tiempo + repuestos) -->
      <div style="display:grid;grid-template-columns:1fr 220px;gap:10px;align-items:start">

        <!-- Columna izquierda -->
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="card" style="padding:12px 14px">
            <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:1px">Flujo operativo del taller</div>
            <div style="font-size:10px;color:var(--gris-mid);margin-bottom:10px">Órdenes activas por proceso</div>
            <div style="display:flex;align-items:stretch;gap:3px;overflow-x:auto">${pipelineHtml}</div>
          </div>
          <div class="card" style="padding:12px 14px">
            <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:1px">Órdenes de trabajo activas</div>
            <div style="font-size:10px;color:var(--gris-mid);margin-bottom:10px">Seguimiento en tiempo real</div>
            ${tablaHtml}
          </div>
        </div>

        <!-- Columna derecha -->
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="card" style="padding:12px 14px">
            <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:8px">Próximas entregas</div>
            ${proximasHtml}
          </div>
          <div class="card" style="padding:12px 14px">
            <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:1px">Tiempo promedio</div>
            <div style="font-size:10px;color:var(--gris-mid);margin-bottom:8px">Histórico general</div>
            ${tiemposHtml}
          </div>
          <div class="card" style="padding:12px 14px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div>
                <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:1px">Repuestos</div>
                <div style="font-size:10px;color:var(--gris-mid);margin-bottom:6px">Pendientes</div>
                <div style="font-size:28px;font-weight:800;color:${solicitudesPend.length>0?'#DC2626':'#059669'};line-height:1">${solicitudesPend.length}</div>
                <div style="font-size:10px;font-weight:600;color:${solicitudesPend.length>0?'#DC2626':'#059669'};margin-top:3px">${solicitudesPend.length>0?'Atención requerida':'Al día'}</div>
              </div>
              <div style="width:34px;height:34px;background:${solicitudesPend.length>0?'#FEE2E2':'#E6F5EF'};border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <svg width="16" height="16" fill="none" stroke="${solicitudesPend.length>0?'#DC2626':'#059669'}" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
            </div>
          </div>
        </div>

      </div>`;

  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

// ── Dashboard principal (General) ────────────────────────
async function cargarDashboard() {
  const cont = document.getElementById('dash-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando...</div>';

  try {
    const ahora  = new Date();
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const manana = new Date(hoy); manana.setDate(hoy.getDate()+1);
    const hace60 = new Date(hoy); hace60.setDate(hoy.getDate()-60);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [ordenes, todasEtapas, etapasActArr, aprobaciones, solicitudesPend] = await Promise.all([
      api(`/ordenes?select=id,placa,marca,linea,modelo,propietario,estado,pulmon,pulmon_tipo,creado_en,fecha_entrega_1,entregada_en`).catch(()=>[]) || [],
      api(`/etapas?select=id,orden_id,servicio,etapa,inicio,fin,tecnico,valor,tiempo_pausado_min&order=creado_en.asc`).catch(()=>[]) || [],
      api(`/etapas?fin=is.null&inicio=not.is.null&select=id,orden_id,servicio,etapa,tecnico,inicio`).catch(()=>[]) || [],
      api(`/aprobaciones_etapa?estado=eq.aprobado&select=etapa_id`).catch(()=>[]) || [],
      api(`/solicitudes_repuesto?estado=in.(pendiente_jefe,enviado_repuestos,cotizado,pedido,recibido_taller)&select=id,orden_id`).catch(()=>[]) || []
    ]);

    // ── Helpers ──────────────────────────────────────────
    const fmt       = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n||0);
    const srvColor  = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };
    const srvNombre = { latoneria:'Latonería', pintura:'Pintura', mecanica:'Mecánica', adicionales:'Adicionales' };
    const srvBg     = { latoneria:'#FEE2E2', pintura:'#FEF3C7', mecanica:'#EBF2FF', adicionales:'#E6F5EF' };

    // ── KPIs ─────────────────────────────────────────────
    const activasArr     = ordenes.filter(o => o.estado === 'Activa' && !o.pulmon);
    const pulmonInt      = ordenes.filter(o => o.pulmon && o.pulmon_tipo === 'interno').length;
    const pulmonExt      = ordenes.filter(o => o.pulmon && o.pulmon_tipo === 'externo').length;
    const pulmonTotal    = pulmonInt + pulmonExt;
    const entregadasArr  = ordenes.filter(o => o.estado === 'Entregada');
    const entregadasHoy  = entregadasArr.filter(o => o.entregada_en && new Date(o.entregada_en) >= hoy && new Date(o.entregada_en) < manana);
    const totalOrdenes   = ordenes.length;
    const pctActivas     = totalOrdenes > 0 ? Math.round((activasArr.length / totalOrdenes) * 100) : 0;

    actualizarCapacidad(activasArr.length, pulmonInt, pulmonExt);

    // Facturación del mes
    const valorMes = todasEtapas.filter(e => e.fin && new Date(e.fin) >= inicioMes).reduce((s,e)=>s+(e.valor||0),0);

    // ── Etapas indexadas ─────────────────────────────────
    const etapasPorOrden = {};
    todasEtapas.forEach(e => { if (!etapasPorOrden[e.orden_id]) etapasPorOrden[e.orden_id] = []; etapasPorOrden[e.orden_id].push(e); });
    const aprobSet = new Set(aprobaciones.map(a => a.etapa_id));

    // ── Retrasos ─────────────────────────────────────────
    const retrasos = activasArr.filter(o => o.fecha_entrega_1 && new Date(o.fecha_entrega_1) < hoy);

    // ── Pipeline ─────────────────────────────────────────
    const enLat  = activasArr.filter(o => (etapasPorOrden[o.id]||[]).some(e=>e.servicio==='latoneria'&&e.inicio&&!e.fin)).length;
    const enPin  = activasArr.filter(o => (etapasPorOrden[o.id]||[]).some(e=>e.servicio==='pintura'&&e.inicio&&!e.fin)).length;
    const enMec  = activasArr.filter(o => (etapasPorOrden[o.id]||[]).some(e=>e.servicio==='mecanica'&&e.inicio&&!e.fin)).length;
    const enAdd  = activasArr.filter(o => (etapasPorOrden[o.id]||[]).some(e=>e.servicio==='adicionales'&&e.inicio&&!e.fin)).length;
    const listaEnt = activasArr.filter(o => { const ets=etapasPorOrden[o.id]||[]; return ets.length>0&&ets.every(e=>!!e.fin&&aprobSet.has(e.id)); }).length;
    const asignadas = activasArr.filter(o => (etapasPorOrden[o.id]||[]).some(e=>e.tecnico)).length;

    // ── Próximas entregas ─────────────────────────────────
    const proximas = activasArr
      .filter(o => o.fecha_entrega_1)
      .map(o => {
        const f = new Date(o.fecha_entrega_1); const fD = new Date(f); fD.setHours(0,0,0,0);
        const dias = Math.round((fD - hoy) / 86400000);
        const th = f.getHours()!==0||f.getMinutes()!==0;
        return { ...o, dias, horaStr: th ? f.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false}) : null };
      })
      .filter(o => o.dias >= -1).sort((a,b)=>a.dias-b.dias).slice(0,5);

    // ── Carga por área (etapas activas) ──────────────────
    const srvActivos = {};
    etapasActArr.forEach(e => { const s=e.servicio||'adicionales'; srvActivos[s]=(srvActivos[s]||0)+1; });
    const totalActivos = Math.max(Object.values(srvActivos).reduce((a,b)=>a+b,0),1);

    // ── Tiempo promedio por servicio ──────────────────────
    const tiemposPorSrv = {};
    todasEtapas.filter(e=>e.inicio&&e.fin).forEach(e => {
      const srv = e.servicio||'adicionales';
      const mins = Math.max(0,Math.round((new Date(e.fin)-new Date(e.inicio))/60000)-(e.tiempo_pausado_min||0));
      if (mins>0) { if (!tiemposPorSrv[srv]) tiemposPorSrv[srv]=[]; tiemposPorSrv[srv].push(mins); }
    });

    // ── Eficiencia (entregas a tiempo, últimos 60 días) ───
    const entRec   = entregadasArr.filter(o=>o.entregada_en&&o.fecha_entrega_1&&new Date(o.entregada_en)>=hace60);
    const aTiempo  = entRec.filter(o=>new Date(o.entregada_en)<=new Date(o.fecha_entrega_1));
    const eficiencia = entRec.length>0 ? Math.round((aTiempo.length/entRec.length)*100) : null;
    const efColor = eficiencia===null?'#6B7280':eficiencia>=80?'#059669':eficiencia>=60?'#D97706':'#DC2626';

    // ── Servicios más demandados ──────────────────────────
    const conteoSrv = {};
    todasEtapas.forEach(e => { const s=e.servicio||'adicionales'; conteoSrv[s]=(conteoSrv[s]||0)+1; });
    const totalSrv  = Math.max(Object.values(conteoSrv).reduce((a,b)=>a+b,0),1);

    // ── Técnicos activos ──────────────────────────────────
    const tecActivos = new Set(etapasActArr.map(e=>e.tecnico).filter(Boolean));

    // ── Procesos activos en taller (tabla top 6) ──────────
    const procesosTabla = activasArr
      .filter(o => etapasActArr.some(e=>e.orden_id===o.id))
      .slice(0,6)
      .map(o => {
        const ea = etapasActArr.find(e=>e.orden_id===o.id);
        const diasTaller = Math.round((ahora-new Date(o.creado_en))/86400000);
        const vencida = o.fecha_entrega_1 && new Date(o.fecha_entrega_1)<ahora;
        return { o, ea, diasTaller, vencida };
      });

    // ════════════════════════════════════════════════════
    // HTML BLOCKS
    // ════════════════════════════════════════════════════

    // — Donut SVG helper —
    const buildDonut = (slices, sz=90, sw=16) => {
      const r=(sz-sw)/2, cx=sz/2, cy=sz/2, circ=2*Math.PI*r;
      let cum=0;
      const hasData = slices.some(s=>s.pct>0);
      if (!hasData) return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--gris-borde)" stroke-width="${sw}"/></svg>`;
      const paths = slices.filter(s=>s.pct>0).map(s => {
        const len=(s.pct/100)*circ;
        const p=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(circ-len).toFixed(2)}" stroke-dashoffset="${(-cum).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
        cum+=len; return p;
      });
      return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">${paths.join('')}</svg>`;
    };

    // — Donut data —
    const donutSlices = Object.entries(srvActivos).map(([srv,n]) => ({
      srv, n, color: srvColor[srv]||'#6B7280', pct: Math.round((n/totalActivos)*100)
    }));

    // — Carga por área HTML —
    const donutLeyenda = Object.entries(srvActivos).length
      ? Object.entries(srvActivos).sort((a,b)=>b[1]-a[1]).map(([srv,n]) => {
          const pct = Math.round((n/totalActivos)*100);
          const color = srvColor[srv]||'#6B7280';
          return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gris-borde);cursor:pointer" onclick="switchTab('ordenes')">
            <div style="width:10px;height:10px;border-radius:3px;background:${color};flex-shrink:0"></div>
            <span style="font-size:12px;font-weight:600;color:${color};flex:1">${srvNombre[srv]||srv}</span>
            <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:${color}">${pct}%</span>
            <span style="font-size:10px;color:var(--gris-mid)">${n}</span>
          </div>`;
        }).join('')
      : '<div style="font-size:11px;color:var(--gris-mid);padding:8px 0">Sin procesos activos</div>';

    // — Procesos activos tabla HTML —
    const procesosTablaHtml = procesosTabla.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:var(--gris-bg)">
          ${['OT','Vehículo','Etapa actual','Días','Estado'].map(h=>`<th style="padding:5px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--gris-mid);border-bottom:1px solid var(--gris-borde)">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${procesosTabla.map(({o,ea,diasTaller,vencida})=>{
            const srv = ea?.servicio||null;
            const etLabel = ea?.etapa || (srv ? srvNombre[srv]||srv : 'En proceso');
            const sC = srv ? srvColor[srv]||'#6B7280' : '#9CA3AF';
            const sB = srv ? srvBg[srv]||'#F3F4F6' : '#F3F4F6';
            return `<tr style="border-bottom:1px solid var(--gris-borde);cursor:pointer" onclick="abrirOrden(${o.id})" onmouseenter="this.style.background='var(--gris-bg)'" onmouseleave="this.style.background=''">
              <td style="padding:6px 8px;font-family:'DM Mono',monospace;font-size:10px;color:var(--gris-mid)">${formatOT(o.id)}</td>
              <td style="padding:6px 8px">
                <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:12px">${escapeHtml(o.placa)}</div>
                <div style="font-size:10px;color:var(--gris-mid)">${escapeHtml([o.marca,o.linea].filter(Boolean).join(' ')||'—')}</div>
              </td>
              <td style="padding:6px 8px"><span style="font-size:10px;font-weight:600;color:${sC};background:${sB};padding:2px 7px;border-radius:5px">${etLabel}</span></td>
              <td style="padding:6px 8px;text-align:center;font-weight:700;font-size:12px;color:${diasTaller>10?'#DC2626':diasTaller>5?'#D97706':'var(--texto)'}">${diasTaller}d</td>
              <td style="padding:6px 8px"><span style="font-size:10px;font-weight:700;color:${vencida?'#DC2626':'#059669'};background:${vencida?'#FEE2E2':'#E6F5EF'};padding:2px 6px;border-radius:99px">${vencida?'Retrasada':'En tiempo'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div style="text-align:center;margin-top:10px">
        <button onclick="switchTab('ordenes')" style="background:none;border:1px solid var(--gris-borde);border-radius:7px;padding:5px 14px;font-size:11px;font-weight:600;color:var(--gris-mid);cursor:pointer">Ver todas las órdenes</button>
      </div>`
      : '<div class="empty-state"><p>Sin procesos activos.</p></div>';

    // — Servicios más demandados HTML —
    const demandadosHtml = Object.entries(conteoSrv).length
      ? Object.entries(conteoSrv).sort((a,b)=>b[1]-a[1]).map(([srv,n]) => {
          const pct   = Math.round((n/totalSrv)*100);
          const color = srvColor[srv]||'#6B7280';
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="display:flex;align-items:center;gap:6px">
                <div style="width:8px;height:8px;border-radius:2px;background:${color}"></div>
                <span style="font-size:12px;font-weight:600;color:var(--texto)">${srvNombre[srv]||srv}</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <span style="font-size:10px;color:var(--gris-mid)">${n} etapas</span>
                <span style="font-size:11px;font-weight:700;color:${color}">${pct}%</span>
              </div>
            </div>
            <div style="height:5px;background:var(--gris-borde);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:99px"></div>
            </div>
          </div>`;
        }).join('')
      : '<div style="font-size:11px;color:var(--gris-mid)">Sin datos aún.</div>';

    // — Tiempo promedio HTML —
    const tiempoHtml = Object.entries(tiemposPorSrv).length
      ? Object.entries(tiemposPorSrv).sort((a,b)=>(b[1].reduce((x,y)=>x+y,0)/b[1].length)-(a[1].reduce((x,y)=>x+y,0)/a[1].length)).map(([srv,arr])=>{
          const avg=Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
          const h=Math.floor(avg/60),m=avg%60,dias=Math.floor(h/8);
          const label=dias>0?`${dias}d ${h%8}h`:h>0?`${h}h ${m}m`:`${m}m`;
          const color=srvColor[srv]||'#6B7280';
          const maxAvg=Math.max(...Object.entries(tiemposPorSrv).map(([,a])=>Math.round(a.reduce((x,y)=>x+y,0)/a.length)),1);
          const barW=Math.round((avg/maxAvg)*100);
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;font-weight:600;color:${color}">${srvNombre[srv]||srv}</span>
              <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:700;color:${color}">${label}</span>
            </div>
            <div style="height:5px;background:var(--gris-borde);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${barW}%;background:${color};border-radius:99px"></div>
            </div>
            <div style="font-size:10px;color:var(--gris-mid);margin-top:2px">${arr.length} etapas completadas</div>
          </div>`;
        }).join('')
      : '<div style="font-size:11px;color:var(--gris-mid)">Sin datos históricos.</div>';

    // — Próximas entregas HTML —
    const proximasHtml = proximas.length
      ? proximas.map(o => {
          const c=o.dias<0?'#DC2626':o.dias===0?'#D97706':o.dias<=2?'#D97706':'#059669';
          const bg=o.dias<0?'#FEE2E2':o.dias===0?'#FEF3C7':o.dias<=2?'#FEF3C7':'#E6F5EF';
          const lbl=o.dias<0?`${Math.abs(o.dias)}d vencida`:o.dias===0?'Hoy':o.dias===1?'Mañana':`${o.dias}d`;
          return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gris-borde);cursor:pointer" onclick="abrirOrden(${o.id})">
            <div style="flex:1;min-width:0">
              <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:12px">${escapeHtml(o.placa)}</div>
              <div style="font-size:10px;color:var(--gris-mid);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(o.propietario||'—')}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <span style="font-size:10px;font-weight:700;color:${c};background:${bg};padding:2px 7px;border-radius:99px;display:block">${lbl}</span>
              ${o.horaStr?`<span style="font-family:'DM Mono',monospace;font-size:9px;color:${c};opacity:.75;display:block;margin-top:1px">${o.horaStr}</span>`:''}
            </div>
          </div>`;
        }).join('')
      : '<div style="font-size:11px;color:var(--gris-mid)">Sin entregas próximas.</div>';

    // — Retrasos banner —
    const retrasosHtml = retrasos.length ? `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:8px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <svg width="14" height="14" fill="none" stroke="#DC2626" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style="font-size:12px;font-weight:700;color:#DC2626">${retrasos.length} ${retrasos.length===1?'vehículo':'vehículos'} con retraso en el proceso</span>
        ${retrasos.map(o=>`<span onclick="abrirOrden(${o.id})" style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:#DC2626;background:white;border:1px solid #FECACA;border-radius:6px;padding:2px 8px;cursor:pointer">${escapeHtml(o.placa)}</span>`).join('')}
      </div>` : '';

    // ════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════
    cont.innerHTML = `
      <!-- KPI row -->
      <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1.4fr;gap:8px;margin-bottom:10px">
        <!-- Órdenes activas -->
        <div style="background:#1E3A5F;border-radius:12px;padding:14px 16px;color:white">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.55;margin-bottom:6px">Órdenes activas</div>
          <div style="font-size:32px;font-weight:800;font-family:'DM Mono',monospace;line-height:1">${activasArr.length}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
            <div style="flex:1;height:3px;background:rgba(255,255,255,.15);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pctActivas}%;background:#93C5FD;border-radius:99px"></div>
            </div>
            <span style="font-size:11px;font-weight:700;color:#93C5FD">${pctActivas}%</span>
          </div>
          <div style="font-size:10px;opacity:.5;margin-top:3px">del total de órdenes</div>
        </div>
        <!-- Total entregadas -->
        <div class="card" style="padding:14px 16px">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gris-mid);margin-bottom:6px">Total entregadas</div>
          <div style="font-size:30px;font-weight:800;color:#059669;line-height:1">${entregadasArr.length}</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-top:3px">Historial completo</div>
          <button onclick="filtrarOrdenes('Entregada')" style="margin-top:8px;background:none;border:1px solid #D1FAE5;border-radius:6px;padding:3px 10px;font-size:10px;font-weight:600;color:#059669;cursor:pointer;width:100%">Ver cerradas →</button>
        </div>
        <!-- Entregadas hoy -->
        <div class="card" style="padding:14px 16px">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gris-mid);margin-bottom:6px">Entregadas hoy</div>
          <div style="font-size:30px;font-weight:800;color:#2563EB;line-height:1">${entregadasHoy.length}</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-top:3px">Vehículos programados</div>
        </div>
        <!-- En pulmón -->
        <div class="card" style="padding:14px 16px">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--gris-mid);margin-bottom:6px">En pulmón</div>
          <div style="font-size:30px;font-weight:800;color:#D97706;line-height:1">${pulmonTotal}</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-top:3px">${pulmonInt} int · ${pulmonExt} ext</div>
        </div>
        <!-- Facturación mes -->
        <div style="background:var(--azul);border-radius:12px;padding:14px 16px;color:white">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;opacity:.55;margin-bottom:6px">Facturación del mes</div>
          <div style="font-size:18px;font-weight:800;font-family:'DM Mono',monospace;line-height:1.1">${fmt(valorMes)}</div>
          <div style="font-size:10px;opacity:.5;margin-top:5px">Total órdenes: ${totalOrdenes}</div>
          <button onclick="switchDashTab('financiero')" style="margin-top:6px;background:rgba(255,255,255,.12);border:none;border-radius:6px;padding:3px 10px;font-size:10px;font-weight:600;color:white;cursor:pointer;width:100%">Ver histórico →</button>
        </div>
      </div>

      ${retrasosHtml}

      <!-- Pipeline + Próximas entregas -->
      <div style="display:grid;grid-template-columns:1fr 210px;gap:10px;margin-bottom:10px">
        <div class="card" style="padding:12px 14px">
          <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:1px">Flujo operativo del taller</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-bottom:10px">Estado actual de vehículos en cada etapa</div>
          <div style="display:flex;align-items:stretch;gap:3px">
            ${[
              {label:'Activas',  val:activasArr.length, color:'#2563EB', bg:'#EBF2FF'},
              {label:'Asignadas',val:asignadas,          color:'#7C3AED', bg:'#F5F3FF'},
              {label:'Latonería',val:enLat,              color:'#DC2626', bg:'#FEE2E2'},
              {label:'Pintura',  val:enPin,              color:'#D97706', bg:'#FEF3C7'},
              {label:'Mecánica', val:enMec,              color:'#0891B2', bg:'#E0F2FE'},
              {label:'Adicionales',val:enAdd,            color:'#059669', bg:'#E6F5EF'},
              {label:'Listas',   val:listaEnt,           color:'#16A34A', bg:'#DCFCE7'},
            ].map((p,i,arr)=>`
              <div style="flex:1;min-width:0;display:flex;align-items:center;gap:3px">
                <div style="flex:1;background:${p.bg};border-radius:8px;padding:8px 4px;text-align:center">
                  <div style="font-size:20px;font-weight:800;color:${p.color};line-height:1">${p.val}</div>
                  <div style="font-size:9px;font-weight:600;color:${p.color};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.label}</div>
                </div>
                ${i<arr.length-1?`<svg width="8" height="8" fill="none" stroke="var(--gris-mid)" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>`:''}
              </div>`).join('')}
          </div>
        </div>
        <div class="card" style="padding:12px 14px">
          <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:8px">Próximas entregas</div>
          ${proximasHtml}
        </div>
      </div>

      <!-- Fila 3: Carga por área | Procesos activos | Servicios más demandados -->
      <div style="display:grid;grid-template-columns:200px 1fr 200px;gap:10px;margin-bottom:10px;align-items:start">
        <!-- Donut carga por área -->
        <div class="card" style="padding:12px 14px">
          <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:2px">Carga por área</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-bottom:10px">Ocupación actual</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <div style="position:relative">
              ${buildDonut(donutSlices)}
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column">
                <span style="font-size:16px;font-weight:800;color:var(--texto);line-height:1">${Object.values(srvActivos).reduce((a,b)=>a+b,0)}</span>
                <span style="font-size:9px;color:var(--gris-mid)">activas</span>
              </div>
            </div>
            ${donutLeyenda}
          </div>
        </div>

        <!-- Procesos activos tabla -->
        <div class="card" style="padding:12px 14px">
          <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:2px">Procesos activos en el taller</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-bottom:10px">Órdenes en proceso</div>
          ${procesosTablaHtml}
        </div>

        <!-- Servicios más demandados -->
        <div class="card" style="padding:12px 14px">
          <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:2px">Servicios más demandados</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-bottom:10px">Histórico de etapas</div>
          ${demandadosHtml}
        </div>
      </div>

      <!-- Fila 4: Tiempo promedio | Eficiencia | Técnicos | Repuestos -->
      <div style="display:grid;grid-template-columns:1fr 160px 140px 140px;gap:10px;align-items:start">
        <div class="card" style="padding:12px 14px">
          <div style="font-size:12px;font-weight:700;color:var(--texto);margin-bottom:2px">Tiempo promedio por servicio</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-bottom:10px">Histórico general</div>
          ${tiempoHtml}
        </div>
        <!-- Eficiencia -->
        <div class="card" style="padding:12px 14px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--gris-mid);margin-bottom:8px">Eficiencia</div>
          <div style="font-size:36px;font-weight:800;color:${efColor};line-height:1">${eficiencia!==null?eficiencia+'%':'—'}</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-top:4px">Entregas a tiempo</div>
          <div style="font-size:9px;color:var(--gris-mid);margin-top:2px">Últimos 60 días</div>
          ${eficiencia!==null?`<div style="height:4px;background:var(--gris-borde);border-radius:99px;overflow:hidden;margin-top:8px"><div style="height:100%;width:${eficiencia}%;background:${efColor};border-radius:99px"></div></div>`:''}
        </div>
        <!-- Técnicos activos -->
        <div class="card" style="padding:12px 14px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--gris-mid);margin-bottom:8px">Técnicos</div>
          <div style="font-size:36px;font-weight:800;color:#2563EB;line-height:1">${tecActivos.size}</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-top:4px">Activos ahora</div>
          <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:3px;margin-top:8px">
            ${[...tecActivos].slice(0,4).map(t=>`<span style="font-size:9px;background:#EBF2FF;color:#2563EB;border-radius:99px;padding:1px 6px;font-weight:600">${t.split(' ')[0]}</span>`).join('')}
          </div>
        </div>
        <!-- Repuestos pendientes -->
        <div class="card" style="padding:12px 14px;text-align:center">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--gris-mid);margin-bottom:8px">Repuestos</div>
          <div style="font-size:36px;font-weight:800;color:${solicitudesPend.length>0?'#DC2626':'#059669'};line-height:1">${solicitudesPend.length}</div>
          <div style="font-size:10px;color:var(--gris-mid);margin-top:4px">Pendientes</div>
          <div style="font-size:10px;font-weight:600;color:${solicitudesPend.length>0?'#DC2626':'#059669'};margin-top:2px">${solicitudesPend.length>0?'Atención requerida':'Al día'}</div>
        </div>
      </div>
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
