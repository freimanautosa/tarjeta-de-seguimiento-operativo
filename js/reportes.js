// ═══════════════════════════════════════════════════════════
// REPORTES — Sistema centralizado de análisis operativo
// PDF via ventana de impresión | Excel via SheetJS (xlsx)
// ═══════════════════════════════════════════════════════════

// ─── Cargar SheetJS dinámicamente ───────────────────────────
function _cargarSheetJS(cb) {
  if (window.XLSX) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}

// ─── Montar sección de reportes en el jefe ──────────────────
function montarReportes() {
  const cont = document.getElementById('reportes-contenido');
  if (!cont) return;

  const ahora  = new Date();
  const hoy    = ahora.toISOString().split('T')[0];
  // Lunes de la semana actual
  const lunes  = new Date(ahora);
  lunes.setDate(ahora.getDate() - ((ahora.getDay()+6)%7));
  const lunesStr = lunes.toISOString().split('T')[0];
  // Inicio del mes
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
  // Inicio del año
  const inicioAnio = `${ahora.getFullYear()}-01-01`;

  cont.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:18px;font-weight:700;color:var(--texto);margin-bottom:4px">Reportes operativos</div>
      <div style="font-size:13px;color:var(--gris-mid)">Análisis de tiempos, eficiencia y rendimiento financiero del taller</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px">

      <!-- Reporte del mes -->
      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Mes actual
        </div>
        <div style="font-size:12px;color:var(--gris-mid);margin:8px 0 14px">
          Reporte completo del mes en curso con métricas de eficiencia y productividad.
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('mes',null,null,'pdf')" style="flex:1;font-size:12px">📄 PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('mes',null,null,'excel')" style="flex:1;font-size:12px">📊 Excel</button>
        </div>
      </div>

      <!-- Reporte del año -->
      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Año completo
        </div>
        <div style="font-size:12px;color:var(--gris-mid);margin:8px 0 14px">
          Consolidado anual con evolución mensual, tendencias y comparativos.
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('anio',null,null,'pdf')" style="flex:1;font-size:12px">📄 PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('anio',null,null,'excel')" style="flex:1;font-size:12px">📊 Excel</button>
        </div>
      </div>

      <!-- Reporte por semana -->
      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Por semana
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 12px">
          <div class="field"><label style="font-size:11px">Desde</label><input type="date" id="rep-sem-ini" value="${lunesStr}" max="${hoy}"></div>
          <div class="field"><label style="font-size:11px">Hasta</label><input type="date" id="rep-sem-fin" value="${hoy}" max="${hoy}"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('rango',document.getElementById('rep-sem-ini').value,document.getElementById('rep-sem-fin').value,'pdf')" style="flex:1;font-size:12px">📄 PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('rango',document.getElementById('rep-sem-ini').value,document.getElementById('rep-sem-fin').value,'excel')" style="flex:1;font-size:12px">📊 Excel</button>
        </div>
      </div>

      <!-- Reporte por día -->
      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Por día específico
        </div>
        <div style="margin:10px 0 12px">
          <div class="field"><label style="font-size:11px">Selecciona el día</label><input type="date" id="rep-dia" value="${hoy}" max="${hoy}"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('dia',document.getElementById('rep-dia').value,null,'pdf')" style="flex:1;font-size:12px">📄 PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('dia',document.getElementById('rep-dia').value,null,'excel')" style="flex:1;font-size:12px">📊 Excel</button>
        </div>
      </div>

    </div>

    <div id="rep-loading" style="display:none" class="loading-state">Generando reporte, por favor espera...</div>
  `;
}

// ─── Función principal de generación ────────────────────────
async function generarReporte(tipo, fechaIni, fechaFin, formato) {
  const loading = document.getElementById('rep-loading');
  if (loading) loading.style.display = 'block';

  try {
    const ahora = new Date();
    let desde, hasta, tituloReporte, subtitulo;

    if (tipo === 'mes') {
      desde  = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      hasta  = new Date(ahora.getFullYear(), ahora.getMonth()+1, 0, 23, 59, 59);
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      tituloReporte = `Reporte Operativo — ${meses[ahora.getMonth()]} ${ahora.getFullYear()}`;
      subtitulo     = `Período: 1 al ${hasta.getDate()} de ${meses[ahora.getMonth()]} ${ahora.getFullYear()}`;
    } else if (tipo === 'anio') {
      desde  = new Date(ahora.getFullYear(), 0, 1);
      hasta  = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
      tituloReporte = `Reporte Anual ${ahora.getFullYear()}`;
      subtitulo     = `Período: 1 Enero — 31 Diciembre ${ahora.getFullYear()}`;
    } else if (tipo === 'dia') {
      desde  = new Date(fechaIni + 'T00:00:00');
      hasta  = new Date(fechaIni + 'T23:59:59');
      tituloReporte = `Reporte Diario — ${desde.toLocaleDateString('es-CO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}`;
      subtitulo     = '';
    } else {
      desde  = new Date(fechaIni + 'T00:00:00');
      hasta  = new Date(fechaFin  + 'T23:59:59');
      const fd = d => d.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});
      tituloReporte = `Reporte Operativo — ${fd(desde)} al ${fd(hasta)}`;
      subtitulo     = '';
    }

    const desdeISO = desde.toISOString();
    const hastaISO = hasta.toISOString();

    // ── Fetch de todos los datos necesarios ──────────────────
    const [
      etapas, ordenes, novedades,
      ordenesEntregadas, ordenesIngresadas
    ] = await Promise.all([
      api(`/etapas?fin=gte.${desdeISO}&fin=lte.${hastaISO}&select=id,orden_id,etapa,etapa_key,servicio,tecnico,inicio,fin,valor,horas_facturadas,horas_adicionales,horas_estimadas`).catch(()=>[]) || [],
      api(`/ordenes?select=id,placa,marca,linea,propietario,aseguradora,tipo_cliente,estado,creado_en,entregada_en,fecha_entrega_1,fecha_entrega_2`).catch(()=>[]) || [],
      api(`/novedades?creado_en=gte.${desdeISO}&creado_en=lte.${hastaISO}&select=id,orden_id,etapa_id,tipo,responsable,motivo,desde,creado_en`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Entregada&entregada_en=gte.${desdeISO}&entregada_en=lte.${hastaISO}&select=id,placa,marca,linea,propietario,aseguradora,tipo_cliente,creado_en,entregada_en,fecha_entrega_1`).catch(()=>[]) || [],
      api(`/ordenes?creado_en=gte.${desdeISO}&creado_en=lte.${hastaISO}&select=id,placa,marca,linea,propietario,aseguradora,tipo_cliente,creado_en,estado`).catch(()=>[]) || []
    ]);

    // ── Calcular métricas ────────────────────────────────────
    const datos = _calcularMetricas(etapas, ordenes, novedades, ordenesEntregadas, ordenesIngresadas, desdeISO, hastaISO);

    if (formato === 'pdf') {
      _generarPDF(datos, tituloReporte, subtitulo);
    } else {
      _cargarSheetJS(() => _generarExcel(datos, tituloReporte));
    }
  } catch(e) {
    toast('Error generando reporte: ' + e.message, 'err');
    console.error(e);
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// ─── Motor de cálculo de métricas ───────────────────────────
function _calcularMetricas(etapas, ordenes, novedades, ordenesEntregadas, ordenesIngresadas, desdeISO, hastaISO) {
  const minToHrs = ms => Math.round(ms / 3600000 * 10) / 10;
  const durHrs   = e  => (e.inicio && e.fin) ? minToHrs(new Date(e.fin) - new Date(e.inicio)) : null;
  const fmt      = n  => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '$0';

  // ── Resumen general ──
  const totalIngresos       = etapas.reduce((s,e) => s+(e.valor||0), 0);
  const totalHorasFacturadas= etapas.reduce((s,e) => s+(e.horas_facturadas||0), 0);
  const totalHorasAdicionales= etapas.reduce((s,e) => s+(e.horas_adicionales||0), 0);
  const etapasConDuracion   = etapas.filter(e => e.inicio && e.fin);

  // ── Tiempo promedio por servicio ──
  const srvMap = {};
  etapas.forEach(e => {
    const s   = e.servicio || 'otro';
    const dur = durHrs(e);
    if (!srvMap[s]) srvMap[s] = { count:0, totalHrs:0, totalVal:0, etapas:[] };
    srvMap[s].count++;
    srvMap[s].totalVal += (e.valor||0);
    if (dur !== null) { srvMap[s].totalHrs += dur; srvMap[s].etapas.push(dur); }
  });
  const servicios = Object.entries(srvMap).map(([srv, d]) => ({
    servicio:       srv,
    nombre:         (typeof CATALOGO !== 'undefined' && CATALOGO[srv]?.nombre) || srv,
    etapas:         d.count,
    ingresos:       d.totalVal,
    horasPromedio:  d.etapas.length ? Math.round((d.totalHrs / d.etapas.length)*10)/10 : 0,
    horasTotal:     Math.round(d.totalHrs*10)/10,
    etapaMasLenta:  d.etapas.length ? Math.round(Math.max(...d.etapas)*10)/10 : 0,
    etapaMasRapida: d.etapas.length ? Math.round(Math.min(...d.etapas)*10)/10 : 0
  })).sort((a,b) => b.etapas - a.etapas);

  // ── Eficiencia por técnico ──
  const tecMap = {};
  etapas.forEach(e => {
    if (!e.tecnico) return;
    const dur = durHrs(e);
    if (!tecMap[e.tecnico]) tecMap[e.tecnico] = {
      etapas:0, completadas:0, totalHrs:0, horasEst:0,
      horasFact:0, horasAdi:0, totalVal:0, servicios:{}, durs:[]
    };
    const t = tecMap[e.tecnico];
    t.etapas++;
    if (e.fin) t.completadas++;
    t.totalVal   += (e.valor||0);
    t.horasFact  += (e.horas_facturadas||0);
    t.horasAdi   += (e.horas_adicionales||0);
    t.horasEst   += (e.horas_estimadas||0);
    if (dur !== null) { t.totalHrs += dur; t.durs.push(dur); }
    const s = e.servicio || 'otro';
    t.servicios[s] = (t.servicios[s]||0)+1;
  });
  const tecnicos = Object.entries(tecMap).map(([tec, d]) => {
    const eficiencia = d.horasEst > 0
      ? Math.round((d.horasEst / Math.max(d.totalHrs, 0.1)) * 100)
      : null;
    return {
      tecnico:        tec,
      etapas:         d.etapas,
      completadas:    d.completadas,
      horasReales:    Math.round(d.totalHrs*10)/10,
      horasEstimadas: Math.round(d.horasEst*10)/10,
      horasFacturadas:Math.round(d.horasFact*10)/10,
      horasAdicionales:Math.round(d.horasAdi*10)/10,
      ingresos:       d.totalVal,
      eficiencia:     eficiencia, // >100 = más rápido que estimado
      promedioHrEtapa:d.durs.length ? Math.round((d.totalHrs/d.durs.length)*10)/10 : 0,
      servicioTop:    Object.entries(d.servicios).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—'
    };
  }).sort((a,b) => b.completadas - a.completadas);

  // ── Análisis de novedades ──
  const novPorTipo = { Detenido:0, Reproceso:0, Garantia:0 };
  const novPorOrden = {};
  novedades.forEach(n => {
    novPorTipo[n.tipo] = (novPorTipo[n.tipo]||0)+1;
    novPorOrden[n.orden_id] = (novPorOrden[n.orden_id]||0)+1;
  });
  const ordenesConNovedades = Object.keys(novPorOrden).length;

  // ── Tiempos de ciclo por orden ──
  const ordenesConTiempo = ordenesEntregadas.map(o => {
    const ets  = etapas.filter(e => e.orden_id === o.id);
    const durTotal = (o.creado_en && o.entregada_en)
      ? minToHrs(new Date(o.entregada_en) - new Date(o.creado_en))
      : null;
    const diasPromesa = (o.fecha_entrega_1 && o.entregada_en)
      ? Math.round((new Date(o.entregada_en) - new Date(o.fecha_entrega_1)) / 86400000)
      : null; // negativo = entregado antes, positivo = tarde
    return {
      placa:         o.placa,
      vehiculo:      [o.marca,o.linea].filter(Boolean).join(' ') || '—',
      propietario:   o.propietario || '—',
      aseguradora:   o.aseguradora || 'Particular',
      ingreso:       o.creado_en,
      entrega:       o.entregada_en,
      duracionHrs:   durTotal,
      diasVsPromesa: diasPromesa, // >0 tarde, <0 adelantado
      etapas:        ets.length,
      novedades:     novPorOrden[o.id] || 0
    };
  });
  const tiempoPromedioCiclo = ordenesConTiempo.filter(o => o.duracionHrs).length
    ? Math.round(ordenesConTiempo.filter(o => o.duracionHrs).reduce((s,o) => s+o.duracionHrs,0) / ordenesConTiempo.filter(o => o.duracionHrs).length * 10) / 10
    : 0;
  const ordenesATiempo = ordenesConTiempo.filter(o => o.diasVsPromesa !== null && o.diasVsPromesa <= 0).length;
  const ordenesTarde   = ordenesConTiempo.filter(o => o.diasVsPromesa !== null && o.diasVsPromesa > 0).length;

  // ── Cuellos de botella — etapas con mayor duración promedio ──
  const etapaMap = {};
  etapas.forEach(e => {
    const k = e.etapa || 'Sin nombre';
    const dur = durHrs(e);
    if (!etapaMap[k]) etapaMap[k] = { count:0, totalHrs:0, servicio: e.servicio };
    etapaMap[k].count++;
    if (dur !== null) etapaMap[k].totalHrs += dur;
  });
  const cuellos = Object.entries(etapaMap).map(([etapa, d]) => ({
    etapa,
    servicio:      d.servicio || '—',
    veces:         d.count,
    horaPromedio:  d.count > 0 ? Math.round((d.totalHrs/d.count)*10)/10 : 0
  })).sort((a,b) => b.horaPromedio - a.horaPromedio).slice(0, 10);

  return {
    resumen: {
      ordenesEntregadas:   ordenesEntregadas.length,
      ordenesIngresadas:   ordenesIngresadas.length,
      etapasCompletadas:   etapas.length,
      totalIngresos,
      totalHorasFacturadas:Math.round(totalHorasFacturadas*10)/10,
      totalHorasAdicionales:Math.round(totalHorasAdicionales*10)/10,
      tiempoPromedioCiclo,
      ordenesATiempo,
      ordenesTarde,
      novedadesTotal:      novedades.length,
      novPorTipo,
      ordenesConNovedades
    },
    servicios,
    tecnicos,
    cuellos,
    ordenesDetalle:   ordenesConTiempo,
    ordenesIngresadas,
    novedades,
    fmt
  };
}

// ─── Generador PDF ───────────────────────────────────────────
function _generarPDF(d, titulo, subtitulo) {
  const { resumen, servicios, tecnicos, cuellos, ordenesDetalle, ordenesIngresadas, novedades, fmt } = d;
  const fmtFecha = iso => iso ? new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const fmtHora  = iso => iso ? new Date(iso).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}) : '—';
  const pctColor = p => p == null ? '#666' : p >= 100 ? '#059669' : p >= 80 ? '#D97706' : '#DC2626';
  const barW     = p => p == null ? 0 : Math.min(p, 100);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;font-size:12px;line-height:1.5}
  .page{max-width:960px;margin:0 auto;padding:32px 36px}
  /* Header */
  .rpt-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1E3A5F;padding-bottom:18px;margin-bottom:26px}
  .rpt-brand{font-size:24px;font-weight:800;color:#1E3A5F;letter-spacing:1px}
  .rpt-sub{font-size:11px;color:#888;margin-top:3px}
  .rpt-meta{text-align:right}
  .rpt-titulo{font-size:14px;font-weight:700;color:#1E3A5F}
  .rpt-fecha{font-size:10px;color:#999;margin-top:4px}
  /* KPIs */
  .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;border-top:3px solid}
  .kpi-val{font-size:22px;font-weight:800;margin-bottom:4px}
  .kpi-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px}
  .kpi-sub{font-size:10px;color:#aaa;margin-top:2px}
  /* Secciones */
  .section{margin-bottom:28px;page-break-inside:avoid}
  .section-title{font-size:11px;font-weight:800;color:#1E3A5F;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  /* Tabla */
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f0;color:#374151}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafafa}
  .total-row td{font-weight:700;background:#f8fafc;border-top:2px solid #e2e8f0}
  /* Badges */
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.3px}
  .badge-green{background:#dcfce7;color:#166534}
  .badge-amber{background:#fef9c3;color:#854d0e}
  .badge-red{background:#fee2e2;color:#991b1b}
  .badge-blue{background:#dbeafe;color:#1e40af}
  .badge-gray{background:#f1f5f9;color:#64748b}
  /* Barra de eficiencia */
  .bar-wrap{background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden;width:80px;display:inline-block;vertical-align:middle;margin-left:6px}
  .bar-fill{height:100%;border-radius:4px}
  /* Novedades */
  .nov-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:10px}
  .nov-box{border-radius:8px;padding:14px;text-align:center}
  .nov-val{font-size:26px;font-weight:800;margin-bottom:4px}
  .nov-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.5px}
  /* Cuello */
  .cuello-bar{background:#f1f5f9;border-radius:4px;height:10px;overflow:hidden;flex:1}
  .cuello-row{display:flex;align-items:center;gap:10px;margin-bottom:7px}
  .cuello-lbl{width:140px;font-size:11px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cuello-val{width:50px;font-size:11px;font-weight:700;text-align:right}
  /* Footer */
  .footer{margin-top:36px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:9px;color:#aaa;text-align:center}
  @media print{body{font-size:11px}.page{padding:20px 24px}.section{page-break-inside:avoid}}
</style>
</head>
<body>
<div class="page">

  <!-- ENCABEZADO -->
  <div class="rpt-header">
    <div>
      <div class="rpt-brand">FREIMANAUTOS</div>
      <div class="rpt-sub">Simplemente profesional · Reporte Operativo</div>
      ${subtitulo ? `<div style="font-size:11px;color:#666;margin-top:6px">${subtitulo}</div>` : ''}
    </div>
    <div class="rpt-meta">
      <div class="rpt-titulo">${titulo}</div>
      <div class="rpt-fecha">Generado: ${new Date().toLocaleString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  </div>

  <!-- KPIs EJECUTIVOS -->
  <div class="kpi-row">
    <div class="kpi" style="border-top-color:#1E3A5F">
      <div class="kpi-val" style="color:#1E3A5F">${resumen.ordenesEntregadas}</div>
      <div class="kpi-lbl">Órdenes entregadas</div>
      <div class="kpi-sub">${resumen.ordenesATiempo} a tiempo · ${resumen.ordenesTarde} tarde</div>
    </div>
    <div class="kpi" style="border-top-color:#059669">
      <div class="kpi-val" style="color:#059669;font-size:16px">${fmt(resumen.totalIngresos)}</div>
      <div class="kpi-lbl">Ingresos generados</div>
      <div class="kpi-sub">${resumen.totalHorasFacturadas}h facturadas</div>
    </div>
    <div class="kpi" style="border-top-color:#D97706">
      <div class="kpi-val" style="color:#D97706">${resumen.tiempoPromedioCiclo}h</div>
      <div class="kpi-lbl">Ciclo promedio por orden</div>
      <div class="kpi-sub">${resumen.etapasCompletadas} etapas completadas</div>
    </div>
    <div class="kpi" style="border-top-color:#DC2626">
      <div class="kpi-val" style="color:#DC2626">${resumen.novedadesTotal}</div>
      <div class="kpi-lbl">Novedades registradas</div>
      <div class="kpi-sub">${resumen.ordenesConNovedades} órdenes afectadas</div>
    </div>
  </div>

  <!-- ANÁLISIS POR SERVICIO -->
  <div class="section">
    <div class="section-title">📊 Análisis por servicio</div>
    <table>
      <thead><tr>
        <th>Servicio</th><th>Etapas</th><th>Ingresos</th>
        <th>Hrs promedio/etapa</th><th>Más lenta</th><th>Más rápida</th><th>Hrs total</th>
      </tr></thead>
      <tbody>
        ${servicios.map(s => `<tr>
          <td><strong>${s.nombre}</strong></td>
          <td><span class="badge badge-blue">${s.etapas}</span></td>
          <td style="font-family:monospace">${fmt(s.ingresos)}</td>
          <td>${s.horasPromedio}h</td>
          <td style="color:#DC2626">${s.etapaMasLenta}h</td>
          <td style="color:#059669">${s.etapaMasRapida}h</td>
          <td>${s.horasTotal}h</td>
        </tr>`).join('')}
        <tr class="total-row">
          <td>TOTAL</td>
          <td>${servicios.reduce((s,x)=>s+x.etapas,0)}</td>
          <td style="font-family:monospace">${fmt(servicios.reduce((s,x)=>s+x.ingresos,0))}</td>
          <td colspan="4"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- CUELLOS DE BOTELLA -->
  <div class="section">
    <div class="section-title">🔴 Cuellos de botella — etapas con mayor duración promedio</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        ${cuellos.slice(0,5).map((c,i) => {
          const maxH = cuellos[0].horaPromedio || 1;
          const pct  = Math.round((c.horaPromedio/maxH)*100);
          const color= i === 0 ? '#DC2626' : i === 1 ? '#D97706' : '#2563EB';
          return `<div class="cuello-row">
            <span class="cuello-lbl">${c.etapa}</span>
            <div class="cuello-bar"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="cuello-val" style="color:${color}">${c.horaPromedio}h</span>
          </div>`;
        }).join('')}
      </div>
      <div>
        ${cuellos.slice(5,10).map((c,i) => {
          const maxH = cuellos[0].horaPromedio || 1;
          const pct  = Math.round((c.horaPromedio/maxH)*100);
          return `<div class="cuello-row">
            <span class="cuello-lbl">${c.etapa}</span>
            <div class="cuello-bar"><div class="bar-fill" style="width:${pct}%;background:#64748b"></div></div>
            <span class="cuello-val">${c.horaPromedio}h</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <!-- EFICIENCIA POR TÉCNICO -->
  <div class="section">
    <div class="section-title">👷 Eficiencia por técnico</div>
    <table>
      <thead><tr>
        <th>Técnico</th><th>Etapas</th><th>Hrs reales</th><th>Hrs estimadas</th>
        <th>Eficiencia</th><th>Hrs/etapa prom.</th><th>Ingresos</th><th>Horas adicionales</th>
      </tr></thead>
      <tbody>
        ${tecnicos.map(t => {
          const ef = t.eficiencia;
          const efBadge = ef == null ? '<span class="badge badge-gray">—</span>'
            : ef >= 100 ? `<span class="badge badge-green">${ef}% ↑</span>`
            : ef >= 80  ? `<span class="badge badge-amber">${ef}%</span>`
            : `<span class="badge badge-red">${ef}% ↓</span>`;
          return `<tr>
            <td><strong>${t.tecnico}</strong></td>
            <td>${t.completadas}/${t.etapas}</td>
            <td>${t.horasReales}h</td>
            <td>${t.horasEstimadas > 0 ? t.horasEstimadas+'h' : '—'}</td>
            <td>${efBadge}</td>
            <td>${t.promedioHrEtapa}h</td>
            <td style="font-family:monospace">${fmt(t.ingresos)}</td>
            <td style="color:${t.horasAdicionales > 0 ? '#D97706' : '#64748b'}">${t.horasAdicionales > 0 ? t.horasAdicionales+'h' : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- NOVEDADES -->
  <div class="section">
    <div class="section-title">⚠️ Novedades y detenciones</div>
    <div class="nov-grid">
      <div class="nov-box" style="background:#fee2e2">
        <div class="nov-val" style="color:#DC2626">${resumen.novPorTipo.Detenido||0}</div>
        <div class="nov-lbl" style="color:#DC2626">Detenidos</div>
      </div>
      <div class="nov-box" style="background:#fef9c3">
        <div class="nov-val" style="color:#D97706">${resumen.novPorTipo.Reproceso||0}</div>
        <div class="nov-lbl" style="color:#D97706">Reprocesos</div>
      </div>
      <div class="nov-box" style="background:#dbeafe">
        <div class="nov-val" style="color:#1E40AF">${resumen.novPorTipo.Garantia||0}</div>
        <div class="nov-lbl" style="color:#1E40AF">Garantías</div>
      </div>
    </div>
    ${novedades.length ? `<table>
      <thead><tr><th>Tipo</th><th>Motivo</th><th>Responsable</th><th>Fecha</th></tr></thead>
      <tbody>
        ${novedades.slice(0,20).map(n => `<tr>
          <td><span class="badge ${n.tipo==='Detenido'?'badge-red':n.tipo==='Reproceso'?'badge-amber':'badge-blue'}">${n.tipo}</span></td>
          <td>${n.motivo||'—'}</td>
          <td>${n.responsable||'—'}</td>
          <td>${fmtHora(n.creado_en)}</td>
        </tr>`).join('')}
        ${novedades.length > 20 ? `<tr><td colspan="4" style="text-align:center;color:#aaa;font-style:italic">... y ${novedades.length-20} más</td></tr>` : ''}
      </tbody>
    </table>` : '<div style="color:#aaa;font-style:italic;font-size:12px">Sin novedades en el período.</div>'}
  </div>

  <!-- DETALLE DE ÓRDENES ENTREGADAS -->
  ${ordenesDetalle.length ? `<div class="section">
    <div class="section-title">📦 Órdenes entregadas — detalle de ciclo</div>
    <table>
      <thead><tr>
        <th>Placa</th><th>Vehículo</th><th>Propietario</th><th>Aseguradora</th>
        <th>Ingreso</th><th>Entrega</th><th>Ciclo</th><th>Vs. prometido</th><th>Novedades</th>
      </tr></thead>
      <tbody>
        ${ordenesDetalle.map(o => {
          const vpColor = o.diasVsPromesa == null ? '#aaa' : o.diasVsPromesa <= 0 ? '#059669' : '#DC2626';
          const vpLabel = o.diasVsPromesa == null ? '—' : o.diasVsPromesa === 0 ? 'A tiempo' : o.diasVsPromesa < 0 ? `${Math.abs(o.diasVsPromesa)}d antes` : `${o.diasVsPromesa}d tarde`;
          return `<tr>
            <td><strong style="font-family:monospace">${o.placa}</strong></td>
            <td>${o.vehiculo}</td>
            <td>${o.propietario}</td>
            <td>${o.aseguradora}</td>
            <td>${fmtFecha(o.ingreso)}</td>
            <td>${fmtHora(o.entrega)}</td>
            <td>${o.duracionHrs ? o.duracionHrs+'h' : '—'}</td>
            <td style="color:${vpColor};font-weight:600">${vpLabel}</td>
            <td>${o.novedades > 0 ? `<span class="badge badge-amber">${o.novedades}</span>` : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <div class="footer">
    Freimanautos · Sistema Operativo · Reporte generado automáticamente el ${new Date().toLocaleString('es-CO')}
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
  }
  toast('Reporte PDF generado ✓');
}

// ─── Generador Excel con SheetJS ────────────────────────────
function _generarExcel(d, titulo) {
  const { resumen, servicios, tecnicos, cuellos, ordenesDetalle, ordenesIngresadas, novedades, fmt } = d;
  const wb = XLSX.utils.book_new();
  const fmtFecha = iso => iso ? new Date(iso).toLocaleDateString('es-CO') : '—';

  // ── Hoja 1: Resumen ejecutivo ──
  const resumenData = [
    ['REPORTE OPERATIVO — FREIMANAUTOS'],
    [titulo],
    ['Generado:', new Date().toLocaleString('es-CO')],
    [],
    ['MÉTRICAS CLAVE', ''],
    ['Órdenes entregadas', resumen.ordenesEntregadas],
    ['Órdenes ingresadas', resumen.ordenesIngresadas],
    ['Etapas completadas', resumen.etapasCompletadas],
    ['Ingresos generados (COP)', resumen.totalIngresos],
    ['Horas facturadas total', resumen.totalHorasFacturadas],
    ['Horas adicionales total', resumen.totalHorasAdicionales],
    ['Tiempo promedio ciclo (hrs)', resumen.tiempoPromedioCiclo],
    ['Órdenes entregadas a tiempo', resumen.ordenesATiempo],
    ['Órdenes entregadas tarde', resumen.ordenesTarde],
    ['Novedades totales', resumen.novedadesTotal],
    ['— Detenidos', resumen.novPorTipo.Detenido||0],
    ['— Reprocesos', resumen.novPorTipo.Reproceso||0],
    ['— Garantías', resumen.novPorTipo.Garantia||0],
    ['Órdenes con novedades', resumen.ordenesConNovedades],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resumenData);
  ws1['!cols'] = [{wch:35},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // ── Hoja 2: Por servicio ──
  const srvHeader = ['Servicio','Etapas','Ingresos (COP)','Hrs prom/etapa','Etapa más lenta (h)','Etapa más rápida (h)','Hrs total'];
  const srvRows   = servicios.map(s => [s.nombre, s.etapas, s.ingresos, s.horasPromedio, s.etapaMasLenta, s.etapaMasRapida, s.horasTotal]);
  const ws2 = XLSX.utils.aoa_to_sheet([srvHeader, ...srvRows]);
  ws2['!cols'] = [{wch:18},{wch:10},{wch:18},{wch:18},{wch:18},{wch:18},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Por Servicio');

  // ── Hoja 3: Técnicos ──
  const tecHeader = ['Técnico','Etapas completadas','Hrs reales','Hrs estimadas','Eficiencia (%)','Hrs/etapa prom.','Ingresos (COP)','Hrs adicionales','Servicio top'];
  const tecRows   = tecnicos.map(t => [t.tecnico, t.completadas, t.horasReales, t.horasEstimadas, t.eficiencia, t.promedioHrEtapa, t.ingresos, t.horasAdicionales, t.servicioTop]);
  const ws3 = XLSX.utils.aoa_to_sheet([tecHeader, ...tecRows]);
  ws3['!cols'] = [{wch:20},{wch:18},{wch:12},{wch:15},{wch:14},{wch:16},{wch:18},{wch:16},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Técnicos');

  // ── Hoja 4: Cuellos de botella ──
  const cuelloHeader = ['Etapa','Servicio','Veces ejecutada','Hrs promedio'];
  const cuelloRows   = cuellos.map(c => [c.etapa, c.servicio, c.veces, c.horaPromedio]);
  const ws4 = XLSX.utils.aoa_to_sheet([cuelloHeader, ...cuelloRows]);
  ws4['!cols'] = [{wch:24},{wch:16},{wch:18},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Cuellos de Botella');

  // ── Hoja 5: Detalle órdenes entregadas ──
  const ordHeader = ['Placa','Vehículo','Propietario','Aseguradora','Ingreso','Entrega','Ciclo (hrs)','Días vs prometido','Novedades'];
  const ordRows   = ordenesDetalle.map(o => [
    o.placa, o.vehiculo, o.propietario, o.aseguradora,
    fmtFecha(o.ingreso), fmtFecha(o.entrega),
    o.duracionHrs, o.diasVsPromesa, o.novedades
  ]);
  const ws5 = XLSX.utils.aoa_to_sheet([ordHeader, ...ordRows]);
  ws5['!cols'] = [{wch:10},{wch:18},{wch:20},{wch:16},{wch:12},{wch:12},{wch:12},{wch:16},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws5, 'Órdenes Entregadas');

  // ── Hoja 6: Novedades ──
  if (novedades.length) {
    const novHeader = ['Tipo','Motivo','Responsable','Fecha'];
    const novRows   = novedades.map(n => [n.tipo, n.motivo||'—', n.responsable||'—', fmtFecha(n.creado_en)]);
    const ws6 = XLSX.utils.aoa_to_sheet([novHeader, ...novRows]);
    ws6['!cols'] = [{wch:14},{wch:40},{wch:20},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws6, 'Novedades');
  }

  // ── Hoja 7: Órdenes ingresadas ──
  if (ordenesIngresadas.length) {
    const ingHeader = ['Placa','Vehículo','Propietario','Aseguradora','Tipo cliente','Fecha ingreso','Estado'];
    const ingRows   = ordenesIngresadas.map(o => [
      o.placa,
      [o.marca,o.linea].filter(Boolean).join(' ')||'—',
      o.propietario||'—', o.aseguradora||'Particular',
      o.tipo_cliente||'—', fmtFecha(o.creado_en), o.estado||'—'
    ]);
    const ws7 = XLSX.utils.aoa_to_sheet([ingHeader, ...ingRows]);
    ws7['!cols'] = [{wch:10},{wch:18},{wch:20},{wch:16},{wch:14},{wch:14},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws7, 'Órdenes Ingresadas');
  }

  // Descargar
  const nombreArchivo = titulo.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,'').replace(/\s+/g,'_').slice(0,60) + '.xlsx';
  XLSX.writeFile(wb, nombreArchivo);
  toast('Excel generado ✓');
}