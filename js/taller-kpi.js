// ═══════════════════════════════════════════════════════════
// PANTALLA KPI — GESTIÓN OPERATIVA DEL TALLER
// Solo visible para perfil jefe y gerente
// ═══════════════════════════════════════════════════════════

function montarTallerKPI() {
  if (!esJefe()) { montarTaller(); return; }
  mostrarPagina('pag-taller-kpi');
  if (window._kpiInterval) clearInterval(window._kpiInterval);
  cargarKPITaller();
  window._kpiInterval = setInterval(cargarKPITaller, 60000);
}

// ── Helpers ──────────────────────────────────────────────
function _kpiDuracion(ms) {
  if (!ms || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), rm = m % 60;
  if (h < 24) return `${h}h ${rm}m`;
  return `${Math.floor(h/24)}d ${h%24}h`;
}
function _kpiDesde(isoStr) {
  if (!isoStr) return '—';
  return _kpiDuracion(Date.now() - new Date(isoStr).getTime());
}
function _kpiColor(val, umbralRojo, umbralAmarillo) {
  if (val >= umbralRojo) return 'rojo';
  if (val >= umbralAmarillo) return 'amarillo';
  return 'verde';
}

// ── Modal drilldown ──────────────────────────────────────
function kpiDrilldown(titulo, filas) {
  const ex = document.getElementById('_kpiModal');
  if (ex) ex.remove();

  const ov = document.createElement('div');
  ov.id = '_kpiModal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

  const filasHtml = filas.length
    ? filas.map(f => `
      <div class="kpi-drill-fila" onclick="${f.onclick || ''}">
        <div class="kpi-drill-main">
          <div class="kpi-drill-placa">${escapeHtml(f.placa || '—')}</div>
          <div class="kpi-drill-ot">${f.ot || ''}</div>
        </div>
        <div class="kpi-drill-info">
          <div class="kpi-drill-titulo">${escapeHtml(f.titulo || '')}</div>
          <div class="kpi-drill-sub">${escapeHtml(f.sub || '')}</div>
        </div>
        <div class="kpi-drill-badge kpi-${f.color || 'verde'}">${escapeHtml(f.badge || '')}</div>
        ${f.onclick ? `<span class="kpi-drill-arrow">→</span>` : ''}
      </div>`).join('')
    : '<div style="text-align:center;padding:24px;color:var(--gris-mid)">Sin alertas activas ✓</div>';

  ov.innerHTML = `
    <div style="background:white;border-radius:14px;width:100%;max-width:580px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1.5px solid var(--gris-borde);flex-shrink:0">
        <div style="font-size:15px;font-weight:700;color:var(--texto)">${escapeHtml(titulo)}</div>
        <button onclick="document.getElementById('_kpiModal').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--gris-mid);line-height:1">✕</button>
      </div>
      <div style="overflow-y:auto;padding:12px 16px;flex:1">${filasHtml}</div>
    </div>`;
  document.body.appendChild(ov);
}

// ── Render principal ──────────────────────────────────────
async function cargarKPITaller() {
  const cont = document.getElementById('taller-kpi-contenido');
  if (!cont) return;

  const ahora = Date.now();
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  try {
    const [ordenesActivas, todasEtapas, solicitudesRep, mecanicosData] = await Promise.all([
      api('/ordenes?estado=eq.Activa&order=creado_en.asc').catch(() => []) || [],
      api('/etapas?select=id,orden_id,etapa,servicio,mecanico_id,tecnico,creado_en,inicio,fin,pausado,tiempo_pausado_min&order=creado_en.asc').catch(() => []) || [],
      api('/solicitudes_repuesto?estado=not.in.(entregado,rechazado)&order=creado_en.asc').catch(() => []) || [],
      api('/mecanicos?activo=eq.true&order=nombre.asc').catch(() => []) || []
    ]);

    const etapasActivas = todasEtapas.filter(e => e.inicio && !e.fin);

    // ── KPI 1: Órdenes sin etapas asignadas ────────────────
    const ordenessinAsignar = ordenesActivas.filter(o => {
      const ets = todasEtapas.filter(e => e.orden_id === o.id);
      return ets.length === 0 || ets.every(e => !e.mecanico_id);
    });
    const k1Color = _kpiColor(ordenessinAsignar.length, 3, 1);
    const k1Max = ordenessinAsignar.reduce((max, o) => {
      const ms = ahora - new Date(o.creado_en).getTime();
      return ms > max ? ms : max;
    }, 0);

    // ── KPI 2: Etapas asignadas sin iniciar ────────────────
    const etapasSinIniciar = todasEtapas.filter(e => e.mecanico_id && !e.inicio && !e.fin);
    const k2Color = _kpiColor(etapasSinIniciar.length, 5, 2);
    const k2Max = etapasSinIniciar.reduce((max, e) => {
      const ms = ahora - new Date(e.creado_en).getTime();
      return ms > max ? ms : max;
    }, 0);

    // ── KPI 3: Entretiempos entre etapas ───────────────────
    const entretiempos = [];
    ordenesActivas.forEach(o => {
      const ets = todasEtapas.filter(e => e.orden_id === o.id && e.fin)
        .sort((a,b) => new Date(a.fin) - new Date(b.fin));
      const etsSig = todasEtapas.filter(e => e.orden_id === o.id && e.inicio && !e.fin);
      if (ets.length && etsSig.length) {
        const ultimaFin = new Date(ets[ets.length-1].fin).getTime();
        const sigInicio = new Date(etsSig[0].inicio).getTime();
        if (sigInicio > ultimaFin) return; // ya inició
        // Etapa pendiente de iniciar — tiempo desde que la anterior terminó
        const gapMs = ahora - ultimaFin;
        if (gapMs > 30 * 60000) {
          entretiempos.push({ orden: o, gapMs, etapaFin: ets[ets.length-1] });
        }
      } else if (ets.length && !etsSig.length) {
        // Todas las etapas terminadas pero hay pendientes sin inicio
        const etsPend = todasEtapas.filter(e => e.orden_id === o.id && !e.inicio && !e.fin);
        if (etsPend.length) {
          const ultimaFin = new Date(ets[ets.length-1].fin).getTime();
          const gapMs = ahora - ultimaFin;
          if (gapMs > 30 * 60000) {
            entretiempos.push({ orden: o, gapMs, etapaFin: ets[ets.length-1] });
          }
        }
      }
    });
    const k3Color = _kpiColor(entretiempos.length, 3, 1);
    const k3Max = entretiempos.reduce((max, e) => e.gapMs > max ? e.gapMs : max, 0);

    // ── KPI 4: Solicitudes de repuesto atascadas ───────────
    const UMBRAL_REP = { pendiente_jefe: 2*3600000, enviado_repuestos: 24*3600000, cotizado: 48*3600000, pedido: 72*3600000, recibido_taller: 4*3600000 };
    const repAtascadas = solicitudesRep.filter(s => {
      const umbral = UMBRAL_REP[s.estado] || 48*3600000;
      return (ahora - new Date(s.creado_en).getTime()) > umbral;
    });
    const k4Color = _kpiColor(repAtascadas.length, 3, 1);
    const k4Max = repAtascadas.reduce((max, s) => {
      const ms = ahora - new Date(s.creado_en).getTime();
      return ms > max ? ms : max;
    }, 0);

    // ── KPI 5: Órdenes vencidas ────────────────────────────
    const ordenesVencidas = ordenesActivas.filter(o => {
      if (!o.fecha_entrega_1) return false;
      return new Date(o.fecha_entrega_1) < hoy;
    });
    const k5Color = ordenesVencidas.length > 0 ? 'rojo' : 'verde';

    // ── KPI 6: Tiempo promedio asignación → arranque ───────
    const tiemposArr = todasEtapas
      .filter(e => e.mecanico_id && e.inicio && e.creado_en)
      .map(e => new Date(e.inicio).getTime() - new Date(e.creado_en).getTime())
      .filter(t => t > 0 && t < 7 * 24 * 3600000);
    const k6Prom = tiemposArr.length ? tiemposArr.reduce((a,b) => a+b, 0) / tiemposArr.length : 0;
    const k6Color = _kpiColor(k6Prom, 4*3600000, 2*3600000);

    // ── KPI 7: Mecánicos sin actividad ────────────────────
    const mecSinActividad = mecanicosData.filter(m => {
      if (['jefe_taller','gerente','prueba','repuestos','pantalla_taller'].includes(m.rol)) return false;
      return !etapasActivas.some(e => e.mecanico_id === m.id);
    });
    const k7Color = mecSinActividad.length >= mecanicosData.filter(m => !['jefe_taller','gerente','prueba','repuestos','pantalla_taller'].includes(m.rol)).length
      ? 'amarillo' : 'verde';

    // ── KPI 8: Órdenes sin movimiento > 4h ────────────────
    const SIN_MOV_UMBRAL = 4 * 3600000;
    const ordenesSinMovimiento = ordenesActivas.filter(o => {
      const antiguedad = ahora - new Date(o.ingreso_en || o.creado_en).getTime();
      if (antiguedad < SIN_MOV_UMBRAL) return false;
      const ets = todasEtapas.filter(e => e.orden_id === o.id);
      if (!ets.length) return true; // sin etapas, cuenta como sin movimiento
      const ultimaActiv = ets.reduce((max, e) => {
        const t = new Date(e.inicio || e.creado_en).getTime();
        return t > max ? t : max;
      }, 0);
      return (ahora - ultimaActiv) > SIN_MOV_UMBRAL;
    });
    const k8Color = _kpiColor(ordenesSinMovimiento.length, 3, 1);

    // ── Tiempo actualización ───────────────────────────────
    const horaActual = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });

    // ── Render ─────────────────────────────────────────────
    cont.innerHTML = `
      <div class="kpi-shell">

        <!-- HEADER -->
        <div class="kpi-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-weight:700;font-size:16px;color:var(--texto)">Gestión Operativa</div>
            <div style="font-size:11px;color:var(--gris-mid);background:var(--gris-bg);padding:3px 10px;border-radius:99px;border:1px solid var(--gris-borde)">
              Actualizado ${horaActual}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-ghost btn-sm" onclick="cargarKPITaller()">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              Actualizar
            </button>
            <button class="btn btn-primary btn-sm" onclick="_irPantallaTV()">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              Pantalla taller TV
            </button>
          </div>
        </div>

        <!-- RESUMEN RÁPIDO -->
        <div class="kpi-resumen">
          <div class="kpi-res-item">
            <div class="kpi-res-num">${ordenesActivas.length}</div>
            <div class="kpi-res-lbl">Órdenes activas</div>
          </div>
          <div class="kpi-res-item">
            <div class="kpi-res-num" style="color:var(--verde)">${etapasActivas.length}</div>
            <div class="kpi-res-lbl">Etapas en proceso</div>
          </div>
          <div class="kpi-res-item">
            <div class="kpi-res-num" style="color:var(--azul)">${mecanicosData.filter(m=>!['jefe_taller','gerente','prueba','repuestos','pantalla_taller'].includes(m.rol)).length - mecSinActividad.length}</div>
            <div class="kpi-res-lbl">Técnicos activos</div>
          </div>
          <div class="kpi-res-item">
            <div class="kpi-res-num" style="color:var(--amarillo)">${solicitudesRep.length}</div>
            <div class="kpi-res-lbl">Repuestos pendientes</div>
          </div>
        </div>

        <!-- GRID KPIs -->
        <div class="kpi-grid">

          <!-- K1: Órdenes sin asignar -->
          <div class="kpi-card kpi-${k1Color}" onclick="kpiDrilldown('Órdenes sin técnico asignado', ${JSON.stringify(ordenessinAsignar.map(o => ({
            placa: o.placa,
            ot: formatOT(o.id),
            titulo: [o.marca, o.linea].filter(Boolean).join(' ') || 'Sin datos vehículo',
            sub: 'Sin asignar hace ' + _kpiDesde(o.creado_en),
            badge: _kpiDesde(o.creado_en),
            color: _kpiColor(ahora - new Date(o.creado_en).getTime(), 4*3600000, 2*3600000),
            onclick: 'document.getElementById(\\'_kpiModal\\').remove();navJefe(\\'ordenes\\');setTimeout(()=>abrirOrden(' + o.id + '),350)'
          })))})">
            <div class="kpi-card-ico">📋</div>
            <div class="kpi-card-num">${ordenessinAsignar.length}</div>
            <div class="kpi-card-lbl">Sin técnico asignado</div>
            <div class="kpi-card-sub">${k1Max > 0 ? 'Más antigua: ' + _kpiDuracion(k1Max) : 'Sin alertas'}</div>
            <div class="kpi-card-link">Ver detalle →</div>
          </div>

          <!-- K2: Etapas asignadas sin iniciar -->
          <div class="kpi-card kpi-${k2Color}" onclick="kpiDrilldown('Etapas asignadas sin iniciar', ${JSON.stringify(etapasSinIniciar.map(e => {
            const o = ordenesActivas.find(or => or.id === e.orden_id) || {};
            return {
              placa: o.placa || '—',
              ot: formatOT(e.orden_id),
              titulo: escapeHtml(e.etapa || '—') + ' · ' + escapeHtml(e.tecnico || 'Sin técnico'),
              sub: 'Asignada hace ' + _kpiDesde(e.creado_en),
              badge: _kpiDesde(e.creado_en),
              color: _kpiColor(ahora - new Date(e.creado_en).getTime(), 3*3600000, 1*3600000),
              onclick: 'document.getElementById(\\'_kpiModal\\').remove();navJefe(\\'ordenes\\');setTimeout(()=>abrirOrden(' + e.orden_id + '),350)'
            };
          }))})">
            <div class="kpi-card-ico">⏳</div>
            <div class="kpi-card-num">${etapasSinIniciar.length}</div>
            <div class="kpi-card-lbl">Etapas sin iniciar</div>
            <div class="kpi-card-sub">${k2Max > 0 ? 'Esperando hace ' + _kpiDuracion(k2Max) : 'Sin alertas'}</div>
            <div class="kpi-card-link">Ver detalle →</div>
          </div>

          <!-- K3: Entretiempos -->
          <div class="kpi-card kpi-${k3Color}" onclick="kpiDrilldown('Entretiempos en operación', ${JSON.stringify(entretiempos.map(et => ({
            placa: et.orden.placa || '—',
            ot: formatOT(et.orden.id),
            titulo: 'Parado desde que terminó ' + escapeHtml(et.etapaFin.etapa || '—'),
            sub: 'Sin avance hace ' + _kpiDuracion(et.gapMs),
            badge: _kpiDuracion(et.gapMs),
            color: _kpiColor(et.gapMs, 4*3600000, 2*3600000),
            onclick: 'document.getElementById(\\'_kpiModal\\').remove();navJefe(\\'ordenes\\');setTimeout(()=>abrirOrden(' + et.orden.id + '),350)'
          })))})">
            <div class="kpi-card-ico">⏸</div>
            <div class="kpi-card-num">${entretiempos.length}</div>
            <div class="kpi-card-lbl">Entretiempos activos</div>
            <div class="kpi-card-sub">${k3Max > 0 ? 'Mayor brecha: ' + _kpiDuracion(k3Max) : 'Sin brechas'}</div>
            <div class="kpi-card-link">Ver detalle →</div>
          </div>

          <!-- K4: Repuestos atascados -->
          <div class="kpi-card kpi-${k4Color}" onclick="kpiDrilldown('Solicitudes de repuesto atascadas', ${JSON.stringify(repAtascadas.map(s => {
            const o = ordenesActivas.find(or => or.id === s.orden_id) || {};
            const LABELS = { pendiente_jefe:'Pendiente jefe', enviado_repuestos:'En gestión', cotizado:'Cotizado', pedido:'Pedido', recibido_taller:'Llegó al taller' };
            return {
              placa: o.placa || 'OT-' + s.orden_id,
              ot: formatOT(s.orden_id),
              titulo: escapeHtml(s.repuesto || 'Repuesto sin nombre'),
              sub: (LABELS[s.estado] || s.estado) + ' · desde hace ' + _kpiDesde(s.creado_en),
              badge: _kpiDesde(s.creado_en),
              color: _kpiColor(ahora - new Date(s.creado_en).getTime(), 48*3600000, 24*3600000),
              onclick: 'document.getElementById(\\'_kpiModal\\').remove();navJefe(\\'ordenes\\');setTimeout(()=>abrirOrden(' + s.orden_id + '),350)'
            };
          })))})">
            <div class="kpi-card-ico">🔧</div>
            <div class="kpi-card-num">${repAtascadas.length}</div>
            <div class="kpi-card-lbl">Repuestos atascados</div>
            <div class="kpi-card-sub">${k4Max > 0 ? 'Más antigua: ' + _kpiDuracion(k4Max) : 'Sin alertas'}</div>
            <div class="kpi-card-link">Ver detalle →</div>
          </div>

          <!-- K5: Órdenes vencidas -->
          <div class="kpi-card kpi-${k5Color}" onclick="kpiDrilldown('Órdenes vencidas', ${JSON.stringify(ordenesVencidas.map(o => {
            const diasRetraso = Math.round((hoy.getTime() - new Date(o.fecha_entrega_1).getTime()) / 86400000);
            return {
              placa: o.placa,
              ot: formatOT(o.id),
              titulo: [o.marca, o.linea].filter(Boolean).join(' ') || 'Sin datos',
              sub: diasRetraso + ' día' + (diasRetraso !== 1 ? 's' : '') + ' de retraso · Entrega: ' + (o.fecha_entrega_1 ? new Date(o.fecha_entrega_1).toLocaleDateString('es-CO') : '—'),
              badge: diasRetraso + 'd retraso',
              color: 'rojo',
              onclick: 'document.getElementById(\\'_kpiModal\\').remove();navJefe(\\'ordenes\\');setTimeout(()=>abrirOrden(' + o.id + '),350)'
            };
          })))})">
            <div class="kpi-card-ico">🚨</div>
            <div class="kpi-card-num">${ordenesVencidas.length}</div>
            <div class="kpi-card-lbl">Órdenes vencidas</div>
            <div class="kpi-card-sub">${ordenesVencidas.length ? 'Requieren atención inmediata' : 'Todo en fecha'}</div>
            <div class="kpi-card-link">Ver detalle →</div>
          </div>

          <!-- K6: Promedio asignación→arranque -->
          <div class="kpi-card kpi-${k6Color}" onclick="kpiDrilldown('Tiempo asignación → arranque (últimas etapas)', ${JSON.stringify(todasEtapas.filter(e=>e.mecanico_id&&e.inicio&&e.creado_en&&(new Date(e.inicio)-new Date(e.creado_en))>0).slice(-30).map(e=>{
            const o = ordenesActivas.find(or=>or.id===e.orden_id)||{};
            const ms = new Date(e.inicio)-new Date(e.creado_en);
            return {
              placa: o.placa||'—',
              ot: formatOT(e.orden_id),
              titulo: escapeHtml(e.etapa||'—') + ' · ' + escapeHtml(e.tecnico||'—'),
              sub: 'Tardó ' + _kpiDuracion(ms) + ' en arrancar',
              badge: _kpiDuracion(ms),
              color: _kpiColor(ms, 4*3600000, 2*3600000)
            };
          }))})">
            <div class="kpi-card-ico">⚡</div>
            <div class="kpi-card-num">${_kpiDuracion(k6Prom)}</div>
            <div class="kpi-card-lbl">Prom. asig. → arranque</div>
            <div class="kpi-card-sub">Basado en ${tiemposArr.length} etapas</div>
            <div class="kpi-card-link">Ver historial →</div>
          </div>

          <!-- K7: Técnicos sin actividad -->
          <div class="kpi-card kpi-${k7Color}" onclick="kpiDrilldown('Técnicos sin actividad activa', ${JSON.stringify(mecSinActividad.map(m=>({
            placa: m.nombre.charAt(0).toUpperCase(),
            ot: '',
            titulo: escapeHtml(m.nombre),
            sub: escapeHtml(m.rol||'Técnico') + ' · Sin etapa en proceso',
            badge: 'Libre',
            color: 'amarillo'
          })))})">
            <div class="kpi-card-ico">👷</div>
            <div class="kpi-card-num">${mecSinActividad.length}</div>
            <div class="kpi-card-lbl">Técnicos libres</div>
            <div class="kpi-card-sub">${mecSinActividad.length ? mecSinActividad.slice(0,2).map(m=>m.nombre.split(' ')[0]).join(', ') + (mecSinActividad.length > 2 ? '...' : '') : 'Todos ocupados'}</div>
            <div class="kpi-card-link">Ver quiénes →</div>
          </div>

          <!-- K8: Órdenes sin movimiento -->
          <div class="kpi-card kpi-${k8Color}" onclick="kpiDrilldown('Órdenes sin movimiento > 4h', ${JSON.stringify(ordenesSinMovimiento.map(o=>({
            placa: o.placa,
            ot: formatOT(o.id),
            titulo: [o.marca,o.linea].filter(Boolean).join(' ')||'Sin datos',
            sub: 'Sin actividad hace ' + _kpiDesde(o.ingreso_en||o.creado_en),
            badge: _kpiDesde(o.ingreso_en||o.creado_en),
            color: _kpiColor(ahora-new Date(o.ingreso_en||o.creado_en).getTime(), 8*3600000, 4*3600000),
            onclick: 'document.getElementById(\\'_kpiModal\\').remove();navJefe(\\'ordenes\\');setTimeout(()=>abrirOrden('+o.id+'),350)'
          })))})">
            <div class="kpi-card-ico">🕐</div>
            <div class="kpi-card-num">${ordenesSinMovimiento.length}</div>
            <div class="kpi-card-lbl">Sin movimiento +4h</div>
            <div class="kpi-card-sub">${ordenesSinMovimiento.length ? 'Revisar prioridad' : 'Todas con actividad'}</div>
            <div class="kpi-card-link">Ver detalle →</div>
          </div>

        </div><!-- /kpi-grid -->

        <!-- TABLA RÁPIDA: Todas las órdenes activas -->
        <div class="kpi-tabla-wrap">
          <div class="kpi-tabla-titulo">Estado de todas las órdenes activas</div>
          <table class="kpi-tabla">
            <thead>
              <tr>
                <th>Placa / OT</th>
                <th>Vehículo</th>
                <th>Estado etapas</th>
                <th>Técnico activo</th>
                <th>Entrega</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              ${ordenesActivas.map(o => {
                const ets = todasEtapas.filter(e => e.orden_id === o.id);
                const etAct = etapasActivas.find(e => e.orden_id === o.id);
                const total = ets.length;
                const comp = ets.filter(e => e.fin).length;
                const sinAsig = ets.length === 0 || ets.every(e => !e.mecanico_id);
                const vencida = o.fecha_entrega_1 && new Date(o.fecha_entrega_1) < hoy;
                const sinMov = ordenesSinMovimiento.some(x => x.id === o.id);
                const alertas = [
                  sinAsig ? '<span class="kpi-badge rojo">Sin asignar</span>' : '',
                  vencida ? '<span class="kpi-badge rojo">Vencida</span>' : '',
                  sinMov  ? '<span class="kpi-badge amarillo">Sin movimiento</span>' : ''
                ].filter(Boolean).join(' ');

                const entInfo = o.fecha_entrega_1
                  ? (() => {
                      const d = Math.round((new Date(o.fecha_entrega_1) - hoy) / 86400000);
                      const color = d < 0 ? 'var(--rojo)' : d === 0 ? 'var(--amarillo)' : d <= 2 ? 'var(--amarillo)' : 'var(--verde)';
                      return `<span style="color:${color};font-weight:600;font-size:12px">${d < 0 ? Math.abs(d)+'d venció' : d === 0 ? 'Hoy' : d+'d'}</span>`;
                    })()
                  : '<span style="color:var(--gris-mid);font-size:12px">—</span>';

                return `<tr class="kpi-tabla-fila" onclick="navJefe('ordenes');setTimeout(()=>abrirOrden(${o.id}),350)" style="cursor:pointer">
                  <td>
                    <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px">${escapeHtml(o.placa||'—')}</div>
                    <div style="font-size:10px;color:var(--gris-mid)">${formatOT(o.id)}</div>
                  </td>
                  <td style="font-size:12px">${escapeHtml([o.marca,o.linea].filter(Boolean).join(' ')||'—')}</td>
                  <td>
                    <div style="font-size:11px;color:var(--gris-mid);margin-bottom:3px">${comp}/${total} etapas</div>
                    <div style="height:4px;background:var(--gris-borde);border-radius:99px;width:80px">
                      <div style="height:4px;background:${comp===total&&total>0?'var(--verde)':'var(--azul)'};border-radius:99px;width:${total?Math.round((comp/total)*80):0}px"></div>
                    </div>
                  </td>
                  <td style="font-size:12px;color:var(--texto)">${escapeHtml(etAct?.tecnico||'—')}</td>
                  <td>${entInfo}</td>
                  <td>${alertas || '<span style="color:var(--verde);font-size:12px">✓ OK</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>

      </div><!-- /kpi-shell -->
    `;
  } catch(e) {
    if (cont) cont.innerHTML = `<div class="empty-state">Error cargando KPIs: ${e.message}</div>`;
  }
}

function _irPantallaTV() {
  if (window._kpiInterval) { clearInterval(window._kpiInterval); window._kpiInterval = null; }
  montarTaller();
}
