// ═══════════════════════════════════════════════════════════
// REPORTES — Sistema centralizado de análisis operativo
// PDF via ventana de impresión | Excel via SheetJS (xlsx)
// ═══════════════════════════════════════════════════════════

const _RPT_EMPRESA = {
  nombre:    'FREIMANAUTOS',
  slogan:    'Simplemente profesional',
  nit:       '800.012.186',
  direccion: 'Calle 98A # 68D – 15',
  telefono:  '320 902 5804',
  email:     'freimanautossa@yahoo.com'
};

// ─── Cargar SheetJS dinámicamente ───────────────────────────
function _cargarSheetJS(cb) {
  if (window.XLSX) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload = cb; document.head.appendChild(s);
}

// ─── Montar sección de reportes en el jefe ──────────────────
async function montarReportes() {
  const cont = document.getElementById('reportes-contenido');
  if (!cont) return;

  const ahora    = new Date();
  const hoy      = ahora.toISOString().split('T')[0];
  const lunes    = new Date(ahora);
  lunes.setDate(ahora.getDate() - ((ahora.getDay()+6)%7));
  const lunesStr = lunes.toISOString().split('T')[0];
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];

  const mecanicos = await api('/mecanicos?activo=eq.true&order=nombre.asc').catch(()=>[]) || [];
  const mecOpts   = mecanicos.map(m => `<option value="${m.id}">${escapeHtml(m.nombre)}</option>`).join('');

  cont.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:18px;font-weight:700;color:var(--texto);margin-bottom:4px">Reportes operativos</div>
      <div style="font-size:13px;color:var(--gris-mid)">Tiempos, costos, repuestos, eficiencia y rendimiento del taller</div>
    </div>

    <div class="grid-2-resp" style="margin-bottom:24px">

      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Mes actual
        </div>
        <div style="font-size:12px;color:var(--gris-mid);margin:8px 0 14px">
          Tiempos, costos de repuestos, tipo de cliente y rendimiento del mes en curso.
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('mes',null,null,'pdf')" style="flex:1;font-size:12px">${ico('file',13)} PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('mes',null,null,'excel')" style="flex:1;font-size:12px">${ico('chart',13)} Excel</button>
        </div>
      </div>

      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Año completo
        </div>
        <div style="font-size:12px;color:var(--gris-mid);margin:8px 0 14px">
          Consolidado anual: evolución mensual, costos acumulados y comparativos.
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('anio',null,null,'pdf')" style="flex:1;font-size:12px">${ico('file',13)} PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('anio',null,null,'excel')" style="flex:1;font-size:12px">${ico('chart',13)} Excel</button>
        </div>
      </div>

      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Por rango de fechas
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 12px">
          <div class="field"><label style="font-size:11px">Desde</label><input type="date" id="rep-sem-ini" value="${lunesStr}" max="${hoy}"></div>
          <div class="field"><label style="font-size:11px">Hasta</label><input type="date" id="rep-sem-fin" value="${hoy}" max="${hoy}"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('rango',document.getElementById('rep-sem-ini').value,document.getElementById('rep-sem-fin').value,'pdf')" style="flex:1;font-size:12px">${ico('file',13)} PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('rango',document.getElementById('rep-sem-ini').value,document.getElementById('rep-sem-fin').value,'excel')" style="flex:1;font-size:12px">${ico('chart',13)} Excel</button>
        </div>
      </div>

      <div class="dash-panel">
        <div class="dash-panel-titulo">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Por día específico
        </div>
        <div style="margin:10px 0 12px">
          <div class="field"><label style="font-size:11px">Selecciona el día</label><input type="date" id="rep-dia" value="${hoy}" max="${hoy}"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="generarReporte('dia',document.getElementById('rep-dia').value,null,'pdf')" style="flex:1;font-size:12px">${ico('file',13)} PDF</button>
          <button class="btn btn-primary btn-sm" onclick="generarReporte('dia',document.getElementById('rep-dia').value,null,'excel')" style="flex:1;font-size:12px">${ico('chart',13)} Excel</button>
        </div>
      </div>

      <!-- COMPARATIVO DE TÉCNICOS -->
      <div class="dash-panel" style="grid-column:1/-1">
        <div class="dash-panel-titulo">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          Comparativo general de técnicos
        </div>
        <div style="font-size:12px;color:var(--gris-mid);margin:6px 0 12px">
          Tabla comparativa de todos los técnicos: etapas completadas, horas netas, ingresos generados, eficiencia y novedades (reprocesos/garantías) en el período seleccionado.
        </div>
        <div class="grid-2-resp" style="margin-bottom:12px;max-width:420px">
          <div class="field"><label style="font-size:11px">Desde</label><input type="date" id="rep-tec-ini" value="${inicioMes}" max="${hoy}"></div>
          <div class="field"><label style="font-size:11px">Hasta</label><input type="date" id="rep-tec-fin" value="${hoy}" max="${hoy}"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="_lanzarReporteTecnicos('pdf')" style="font-size:12px">${ico('file',13)} PDF</button>
          <button class="btn btn-primary btn-sm" onclick="_lanzarReporteTecnicos('excel')" style="font-size:12px">${ico('chart',13)} Excel</button>
        </div>
      </div>

      <!-- REPORTE POR MECÁNICO -->
      <div class="dash-panel" style="grid-column:1/-1;border:1.5px solid var(--azul);background:var(--azul-light,#EBF2FF)">
        <div class="dash-panel-titulo" style="color:var(--azul)">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Reporte individual por mecánico
        </div>
        <div style="font-size:12px;color:var(--gris-mid);margin:6px 0 12px">
          Detalle completo de un técnico: etapas realizadas, tiempo neto trabajado, pausas por repuestos, ingresos generados y novedades.
        </div>
        <div class="grid-3-resp" style="margin-bottom:12px">
          <div class="field">
            <label style="font-size:11px">Técnico</label>
            <select id="rep-mec-sel" style="width:100%">
              <option value="">— Selecciona —</option>
              ${mecOpts}
            </select>
          </div>
          <div class="field"><label style="font-size:11px">Desde</label><input type="date" id="rep-mec-ini" value="${inicioMes}" max="${hoy}"></div>
          <div class="field"><label style="font-size:11px">Hasta</label><input type="date" id="rep-mec-fin" value="${hoy}" max="${hoy}"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="_lanzarReporteMec('pdf')" style="font-size:12px">${ico('file',13)} PDF</button>
          <button class="btn btn-primary btn-sm" onclick="_lanzarReporteMec('excel')" style="font-size:12px">${ico('chart',13)} Excel</button>
        </div>
      </div>

    </div>
    <div id="rep-loading" style="display:none" class="loading-state">Generando reporte, por favor espera...</div>
  `;
}

function _lanzarReporteTecnicos(formato) {
  const ini = document.getElementById('rep-tec-ini')?.value;
  const fin = document.getElementById('rep-tec-fin')?.value;
  if (!ini || !fin) { toast('Define el rango de fechas', 'err'); return; }
  generarReporte('rango', ini, fin, formato);
}

function _lanzarReporteMec(formato) {
  const mecId = document.getElementById('rep-mec-sel')?.value;
  const ini   = document.getElementById('rep-mec-ini')?.value;
  const fin   = document.getElementById('rep-mec-fin')?.value;
  if (!mecId) { toast('Selecciona un técnico', 'err'); return; }
  if (!ini || !fin) { toast('Define el rango de fechas', 'err'); return; }
  generarReporteMecanico(mecId, ini, fin, formato);
}

// ─── Función principal de generación ────────────────────────
async function generarReporte(tipo, fechaIni, fechaFin, formato) {
  const loading = document.getElementById('rep-loading');
  if (loading) loading.style.display = 'block';
  try {
    const ahora = new Date();
    let desde, hasta, tituloReporte, subtitulo;
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    if (tipo === 'mes') {
      desde  = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      hasta  = new Date(ahora.getFullYear(), ahora.getMonth()+1, 0, 23, 59, 59);
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

    const [
      etapas, ordenes, novedades,
      ordenesEntregadas, ordenesIngresadas,
      solicitudesRep, cotizaciones, flotillas
    ] = await Promise.all([
      api(`/etapas?fin=gte.${desdeISO}&fin=lte.${hastaISO}&select=id,orden_id,etapa,etapa_key,servicio,tecnico,mecanico_id,inicio,fin,valor,horas_facturadas,horas_adicionales,horas_estimadas,tiempo_pausado_min`).catch(()=>[]) || [],
      api(`/ordenes?select=id,placa,marca,linea,propietario,aseguradora,tipo_cliente,flotilla_id,estado,creado_en,entregada_en,fecha_entrega_1,fecha_entrega_2`).catch(()=>[]) || [],
      api(`/novedades?creado_en=gte.${desdeISO}&creado_en=lte.${hastaISO}&select=id,orden_id,etapa_id,tipo,responsable,motivo,desde,creado_en`).catch(()=>[]) || [],
      api(`/ordenes?estado=eq.Entregada&entregada_en=gte.${desdeISO}&entregada_en=lte.${hastaISO}&select=id,placa,marca,linea,propietario,aseguradora,tipo_cliente,flotilla_id,creado_en,entregada_en,fecha_entrega_1,pulmon,pulmon_desde,pulmon_fin,pulmon_tipo`).catch(()=>[]) || [],
      api(`/ordenes?creado_en=gte.${desdeISO}&creado_en=lte.${hastaISO}&select=id,placa,marca,linea,propietario,aseguradora,tipo_cliente,flotilla_id,creado_en,estado,pulmon,pulmon_desde,pulmon_fin,pulmon_tipo`).catch(()=>[]) || [],
      api(`/solicitudes_repuesto?creado_en=gte.${desdeISO}&creado_en=lte.${hastaISO}&select=id,orden_id,etapa_id,repuesto,unidades,estado,tiempo_espera_min,creado_en`).catch(()=>[]) || [],
      api(`/cotizaciones_repuesto?select=id,solicitud_id,opcion,precio_costo,precio_venta_jefe,estado_opcion`).catch(()=>[]) || [],
      api(`/flotillas?select=id,nombre&order=nombre.asc`).catch(()=>[]) || []
    ]);

    const datos = _calcularMetricas(etapas, ordenes, novedades, ordenesEntregadas, ordenesIngresadas, solicitudesRep, cotizaciones, flotillas, desdeISO, hastaISO);

    if (formato === 'pdf') _generarPDF(datos, tituloReporte, subtitulo);
    else _cargarSheetJS(() => _generarExcel(datos, tituloReporte));

  } catch(e) {
    toast('Error generando reporte: ' + e.message, 'err');
    console.error(e);
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// ─── Reporte individual por mecánico ────────────────────────
async function generarReporteMecanico(mecId, fechaIni, fechaFin, formato) {
  const loading = document.getElementById('rep-loading');
  if (loading) loading.style.display = 'block';
  try {
    const desde    = new Date(fechaIni + 'T00:00:00');
    const hasta    = new Date(fechaFin  + 'T23:59:59');
    const desdeISO = desde.toISOString();
    const hastaISO = hasta.toISOString();
    const fd       = d => d.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});

    // Primero obtener datos del mecánico (necesitamos su nombre para las novedades)
    const mecData = await api(`/mecanicos?id=eq.${mecId}&select=id,nombre,rol`).then(r=>r?.[0]).catch(()=>null);

    // Luego las demás consultas en paralelo
    const [etapas, novedades] = await Promise.all([
      api(`/etapas?mecanico_id=eq.${mecId}&fin=gte.${desdeISO}&fin=lte.${hastaISO}&select=id,orden_id,etapa,servicio,inicio,fin,valor,horas_facturadas,horas_adicionales,tiempo_pausado_min&order=fin.asc`).catch(()=>[]) || [],
      mecData?.nombre
        ? api(`/novedades?responsable=eq.${encodeURIComponent(mecData.nombre)}&creado_en=gte.${desdeISO}&creado_en=lte.${hastaISO}&select=*`).catch(()=>[]) || []
        : Promise.resolve([])
    ]);

    // Obtener etapas del mecánico también por solicitudes usando etapa_id
    const ordenIds = [...new Set(etapas.map(e => e.orden_id))];
    const ordenes = ordenIds.length
      ? await api(`/ordenes?id=in.(${ordenIds.join(',')})&select=id,placa,marca,linea,propietario`).catch(()=>[]) || []
      : [];
    const omOrden = {}; ordenes.forEach(o => { omOrden[o.id] = o; });

    // También solicitudes de repuesto vinculadas a etapas del mecánico
    const etapaIds = etapas.map(e => e.id);
    const solsRep  = etapaIds.length
      ? await api(`/solicitudes_repuesto?etapa_id=in.(${etapaIds.join(',')})&select=id,repuesto,estado,tiempo_espera_min,creado_en`).catch(()=>[]) || []
      : [];

    const nombreMec = mecData?.nombre || `Mecánico #${mecId}`;
    const titulo    = `Reporte Técnico — ${nombreMec}`;
    const subtitulo = `Período: ${fd(desde)} al ${fd(hasta)}`;

    // Calcular métricas
    const fmt = n => n!=null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '$0';
    const fmtHora = iso => iso ? new Date(iso).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}) : '—';
    const fmtFecha = iso => iso ? new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';

    let totalBrutoMin = 0, totalPausadoMin = 0, totalValor = 0, totalHorasFact = 0;
    const srvMap = {};
    etapas.forEach(e => {
      if (!e.inicio || !e.fin) return;
      const bruto   = Math.round((new Date(e.fin) - new Date(e.inicio)) / 60000);
      const pausado = e.tiempo_pausado_min || 0;
      totalBrutoMin   += bruto;
      totalPausadoMin += pausado;
      totalValor      += (e.valor || 0);
      totalHorasFact  += (e.horas_facturadas || 0);
      const s = e.servicio || 'otro';
      if (!srvMap[s]) srvMap[s] = { count: 0, neto: 0 };
      srvMap[s].count++;
      srvMap[s].neto += Math.max(0, bruto - pausado);
    });

    const totalNetoMin = Math.max(0, totalBrutoMin - totalPausadoMin);
    const esperas      = solsRep.filter(s => s.tiempo_espera_min != null).map(s => s.tiempo_espera_min);
    const promEspera   = esperas.length ? Math.round(esperas.reduce((a,b)=>a+b,0)/esperas.length) : 0;

    const hrStr = m => { const h=Math.floor(m/60); return h>0?`${h}h ${m%60}m`:`${m%60}m`; };

    if (formato === 'excel') {
      _cargarSheetJS(() => {
        const wb = XLSX.utils.book_new();
        // Hoja resumen
        const ws1 = XLSX.utils.aoa_to_sheet([
          [`REPORTE TÉCNICO — ${nombreMec.toUpperCase()}`],
          [subtitulo],
          ['Generado:', new Date().toLocaleString('es-CO')],
          [],
          ['RESUMEN', ''],
          ['Etapas completadas', etapas.length],
          ['Tiempo bruto (horas)', Math.round(totalBrutoMin/60*10)/10],
          ['Tiempo pausado repuestos (min)', totalPausadoMin],
          ['Tiempo neto trabajado (horas)', Math.round(totalNetoMin/60*10)/10],
          ['Ingresos generados (COP)', totalValor],
          ['Horas facturadas', totalHorasFact],
          ['Solicitudes de repuesto', solsRep.length],
          ['Espera promedio por repuesto (min)', promEspera],
        ]);
        ws1['!cols'] = [{wch:35},{wch:22}];
        XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
        // Hoja detalle etapas
        const hdr = ['Placa','Vehículo','Etapa','Servicio','Inicio','Fin','Tiempo bruto (h)','Pausado (min)','Tiempo neto (h)','Valor (COP)','H.Facturadas'];
        const rows = etapas.map(e => {
          const o = omOrden[e.orden_id] || {};
          const bruto = (e.inicio && e.fin) ? Math.round((new Date(e.fin)-new Date(e.inicio))/60000) : 0;
          const neto  = Math.max(0, bruto - (e.tiempo_pausado_min||0));
          return [
            o.placa||'—', [o.marca,o.linea].filter(Boolean).join(' ')||'—',
            e.etapa||'—', e.servicio||'—',
            fmtFecha(e.inicio), fmtFecha(e.fin),
            Math.round(bruto/60*10)/10, e.tiempo_pausado_min||0, Math.round(neto/60*10)/10,
            e.valor||0, e.horas_facturadas||0
          ];
        });
        const ws2 = XLSX.utils.aoa_to_sheet([hdr,...rows]);
        ws2['!cols'] = [{wch:10},{wch:18},{wch:20},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:16},{wch:12}];
        XLSX.utils.book_append_sheet(wb, ws2, 'Etapas');
        // Hoja repuestos
        if (solsRep.length) {
          const rHdr = ['Repuesto','Estado','Tiempo espera (min)','Fecha solicitud'];
          const rRows = solsRep.map(s => [s.repuesto||'—', s.estado||'—', s.tiempo_espera_min||'—', fmtFecha(s.creado_en)]);
          const ws3 = XLSX.utils.aoa_to_sheet([rHdr,...rRows]);
          ws3['!cols'] = [{wch:30},{wch:18},{wch:20},{wch:16}];
          XLSX.utils.book_append_sheet(wb, ws3, 'Solicitudes repuesto');
        }
        const nombre = `${nombreMec.replace(/\s+/g,'_')}_${fechaIni}_${fechaFin}.xlsx`;
        XLSX.writeFile(wb, nombre);
        toast('Excel generado ✓');
      });
      return;
    }

    // PDF
    const srvColor = { latoneria:'#DC2626', pintura:'#D97706', mecanica:'#2563EB', adicionales:'#059669' };
    const serviciosHtml = Object.entries(srvMap).map(([srv, d]) => {
      const h = Math.floor(d.neto/60), m = d.neto%60;
      const color = srvColor[srv]||'#6B7280';
      const nombre = (typeof CATALOGO!=='undefined'&&CATALOGO[srv]?.nombre)||srv;
      return `<tr><td style="font-weight:600;color:${color}">${nombre}</td><td>${d.count}</td><td>${h>0?h+'h ':''} ${m}m</td></tr>`;
    }).join('');

    const etapasHtml = etapas.map(e => {
      const o = omOrden[e.orden_id] || {};
      const bruto = (e.inicio&&e.fin) ? Math.round((new Date(e.fin)-new Date(e.inicio))/60000) : 0;
      const neto  = Math.max(0, bruto-(e.tiempo_pausado_min||0));
      const hN = Math.floor(neto/60), mN = neto%60;
      const pausaBadge = (e.tiempo_pausado_min||0) > 0
        ? `<span style="font-size:9px;background:#FEF3C7;color:#92400E;padding:1px 5px;border-radius:3px">⏸ ${e.tiempo_pausado_min}m esp.</span>`
        : '';
      return `<tr>
        <td style="font-family:monospace;font-weight:700">${o.placa||'—'}</td>
        <td>${[o.marca,o.linea].filter(Boolean).join(' ')||'—'}</td>
        <td>${e.etapa||'—'}</td>
        <td>${(typeof CATALOGO!=='undefined'&&CATALOGO[e.servicio]?.nombre)||e.servicio||'—'}</td>
        <td style="font-size:10px">${fmtHora(e.inicio)}</td>
        <td style="font-size:10px">${fmtHora(e.fin)}</td>
        <td style="font-weight:700;color:#2563EB">${hN>0?hN+'h ':''} ${mN}m ${pausaBadge}</td>
        <td style="font-family:monospace">${fmt(e.valor)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px;line-height:1.5}
      .page{max-width:960px;margin:0 auto;padding:32px 36px}
      .rpt-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1E3A5F;padding-bottom:16px;margin-bottom:24px}
      .rpt-brand{font-size:22px;font-weight:800;color:#1E3A5F;letter-spacing:1px}
      .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;border-top:3px solid}
      .kpi-val{font-size:20px;font-weight:800;margin-bottom:2px}
      .kpi-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px}
      .section{margin-bottom:26px;page-break-inside:avoid}
      .section-title{font-size:11px;font-weight:800;color:#1E3A5F;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:7px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#f1f5f9;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;border-bottom:1px solid #e2e8f0}
      td{padding:6px 10px;border-bottom:1px solid #f1f5f0}
      .footer{margin-top:30px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:9px;color:#aaa;text-align:center}
      @media print{.page{padding:18px 22px}}
    </style></head><body><div class="page">
      <div class="rpt-header">
        <div>
          <div class="rpt-brand">${_RPT_EMPRESA.nombre}</div>
          <div style="font-size:10px;color:#888;margin-top:3px">${_RPT_EMPRESA.slogan} · NIT ${_RPT_EMPRESA.nit}</div>
          <div style="font-size:10px;color:#888">${_RPT_EMPRESA.direccion} · Tel: ${_RPT_EMPRESA.telefono}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:15px;font-weight:700;color:#1E3A5F">${titulo}</div>
          <div style="font-size:11px;color:#555;margin-top:4px">${subtitulo}</div>
          <div style="font-size:10px;color:#999;margin-top:3px">Generado: ${new Date().toLocaleString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi" style="border-top-color:#1E3A5F">
          <div class="kpi-val" style="color:#1E3A5F">${etapas.length}</div>
          <div class="kpi-lbl">Etapas completadas</div>
        </div>
        <div class="kpi" style="border-top-color:#2563EB">
          <div class="kpi-val" style="color:#2563EB">${hrStr(totalNetoMin)}</div>
          <div class="kpi-lbl">Tiempo neto trabajado</div>
        </div>
        <div class="kpi" style="border-top-color:#F59E0B">
          <div class="kpi-val" style="color:#D97706">${totalPausadoMin > 0 ? hrStr(totalPausadoMin) : '0m'}</div>
          <div class="kpi-lbl">⏸ Pausado (repuestos)</div>
        </div>
        <div class="kpi" style="border-top-color:#059669">
          <div class="kpi-val" style="color:#059669;font-size:15px">${fmt(totalValor)}</div>
          <div class="kpi-lbl">Ingresos generados</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Por servicio</div>
        <table><thead><tr><th>Servicio</th><th>Etapas</th><th>Tiempo neto</th></tr></thead>
        <tbody>${serviciosHtml}</tbody></table>
      </div>

      ${solsRep.length ? `<div class="section">
        <div class="section-title">Solicitudes de repuesto · ${solsRep.length} total · Espera promedio: ${promEspera}m</div>
        <table><thead><tr><th>Repuesto</th><th>Estado</th><th>Tiempo de espera</th><th>Fecha</th></tr></thead>
        <tbody>${solsRep.map(s=>`<tr>
          <td>${s.repuesto||'—'}</td>
          <td>${s.estado||'—'}</td>
          <td>${s.tiempo_espera_min!=null?s.tiempo_espera_min+'m':'En curso'}</td>
          <td>${fmtFecha(s.creado_en)}</td>
        </tr>`).join('')}</tbody></table>
      </div>` : ''}

      <div class="section">
        <div class="section-title">Detalle de etapas completadas</div>
        <table><thead><tr>
          <th>Placa</th><th>Vehículo</th><th>Etapa</th><th>Servicio</th>
          <th>Inicio</th><th>Fin</th><th>Tiempo neto</th><th>Valor</th>
        </tr></thead>
        <tbody>${etapasHtml}</tbody></table>
      </div>

      <div class="footer">
        ${_RPT_EMPRESA.nombre} · NIT ${_RPT_EMPRESA.nit} · ${_RPT_EMPRESA.direccion} · Tel: ${_RPT_EMPRESA.telefono} ·
        Reporte generado el ${new Date().toLocaleString('es-CO')}
      </div>
    </div></body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 800); }
    toast('Reporte PDF generado ✓');
  } catch(e) {
    toast('Error generando reporte: ' + e.message, 'err'); console.error(e);
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// ─── Motor de cálculo de métricas ───────────────────────────
function _calcularMetricas(etapas, ordenes, novedades, ordenesEntregadas, ordenesIngresadas, solicitudesRep, cotizaciones, flotillas, desdeISO, hastaISO) {
  const minToHrs = ms => Math.round(ms / 3600000 * 10) / 10;
  const fmt      = n  => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '$0';
  const hrStr    = m  => { const h=Math.floor(m/60); return h>0?`${h}h ${m%60}m`:`${m%60}m`; };

  // ── Duración bruta (inicio→fin) en horas ──
  const durBrutoHrs = e => (e.inicio && e.fin) ? minToHrs(new Date(e.fin) - new Date(e.inicio)) : null;
  // ── Duración neta (descontando pausas por repuesto) ──
  const durNetaHrs  = e => {
    const bruto = durBrutoHrs(e);
    if (bruto === null) return null;
    return Math.max(0, bruto - ((e.tiempo_pausado_min||0) / 60));
  };

  // ── Resumen general ──
  const totalIngresos          = etapas.reduce((s,e) => s+(e.valor||0), 0);
  const totalHorasFacturadas   = etapas.reduce((s,e) => s+(e.horas_facturadas||0), 0);
  const totalHorasAdicionales  = etapas.reduce((s,e) => s+(e.horas_adicionales||0), 0);
  const totalMinutosPausados   = etapas.reduce((s,e) => s+(e.tiempo_pausado_min||0), 0);

  // ── Tiempo promedio por servicio ──
  const srvMap = {};
  etapas.forEach(e => {
    const s    = e.servicio || 'otro';
    const neta = durNetaHrs(e);
    if (!srvMap[s]) srvMap[s] = { count:0, totalHrs:0, totalVal:0, durs:[] };
    srvMap[s].count++;
    srvMap[s].totalVal += (e.valor||0);
    if (neta !== null) { srvMap[s].totalHrs += neta; srvMap[s].durs.push(neta); }
  });
  const servicios = Object.entries(srvMap).map(([srv, d]) => ({
    servicio:       srv,
    nombre:         (typeof CATALOGO!=='undefined'&&CATALOGO[srv]?.nombre)||srv,
    etapas:         d.count,
    ingresos:       d.totalVal,
    horasPromedio:  d.durs.length ? Math.round((d.totalHrs/d.durs.length)*10)/10 : 0,
    horasTotal:     Math.round(d.totalHrs*10)/10,
    etapaMasLenta:  d.durs.length ? Math.round(Math.max(...d.durs)*10)/10 : 0,
    etapaMasRapida: d.durs.length ? Math.round(Math.min(...d.durs)*10)/10 : 0
  })).sort((a,b) => b.etapas - a.etapas);

  // ── Calidad por técnico: novedades atribuibles ──
  const calidadTecMap = {};
  novedades.forEach(n => {
    if (!n.responsable) return;
    if (!calidadTecMap[n.responsable]) calidadTecMap[n.responsable] = { reprocesos:0, garantias:0, detenidos:0 };
    if (n.tipo === 'Reproceso') calidadTecMap[n.responsable].reprocesos++;
    if (n.tipo === 'Garantia')  calidadTecMap[n.responsable].garantias++;
    if (n.tipo === 'Detenido')  calidadTecMap[n.responsable].detenidos++;
  });

  // ── Eficiencia por técnico — con tiempos netos ──
  const tecMap = {};
  etapas.forEach(e => {
    if (!e.tecnico) return;
    const neta  = durNetaHrs(e);
    const bruta = durBrutoHrs(e);
    if (!tecMap[e.tecnico]) tecMap[e.tecnico] = {
      etapas:0, completadas:0,
      totalHrsNeto:0, totalHrsBruto:0, totalPausadoMin:0,
      horasEst:0, horasFact:0, horasAdi:0, totalVal:0,
      servicios:{}, dursNeto:[]
    };
    const t = tecMap[e.tecnico];
    t.etapas++;
    if (e.fin) t.completadas++;
    t.totalVal         += (e.valor||0);
    t.horasFact        += (e.horas_facturadas||0);
    t.horasAdi         += (e.horas_adicionales||0);
    t.horasEst         += (e.horas_estimadas||0);
    t.totalPausadoMin  += (e.tiempo_pausado_min||0);
    if (bruta !== null) t.totalHrsBruto += bruta;
    if (neta  !== null) { t.totalHrsNeto += neta; t.dursNeto.push(neta); }
    const s = e.servicio || 'otro';
    t.servicios[s] = (t.servicios[s]||0)+1;
  });
  const tecnicos = Object.entries(tecMap).map(([tec, d]) => {
    const eficienciaEst = d.horasEst > 0
      ? Math.round((d.horasEst / Math.max(d.totalHrsNeto, 0.1)) * 100) : null;
    const cal = calidadTecMap[tec] || { reprocesos:0, garantias:0, detenidos:0 };
    return {
      tecnico:            tec,
      etapas:             d.etapas,
      completadas:        d.completadas,
      horasNetas:         Math.round(d.totalHrsNeto*10)/10,
      horasBrutas:        Math.round(d.totalHrsBruto*10)/10,
      minutosPausados:    d.totalPausadoMin,
      horasEstimadas:     Math.round(d.horasEst*10)/10,
      horasFacturadas:    Math.round(d.horasFact*10)/10,
      horasAdicionales:   Math.round(d.horasAdi*10)/10,
      ingresos:           d.totalVal,
      eficiencia:         eficienciaEst,
      promedioHrEtapa:    d.dursNeto.length ? Math.round((d.totalHrsNeto/d.dursNeto.length)*10)/10 : 0,
      servicioTop:        Object.entries(d.servicios).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—',
      reprocesos:         cal.reprocesos,
      garantias:          cal.garantias,
      detenidos:          cal.detenidos
    };
  }).sort((a,b) => b.completadas - a.completadas);

  // ── Análisis de solicitudes de repuesto ──
  const esperas = solicitudesRep.filter(s => s.tiempo_espera_min != null).map(s => s.tiempo_espera_min);
  const tiempoEsperaPromedio = esperas.length ? Math.round(esperas.reduce((a,b)=>a+b,0)/esperas.length) : 0;
  const topRepMap = {};
  solicitudesRep.forEach(s => { topRepMap[s.repuesto] = (topRepMap[s.repuesto]||0)+1; });
  const topRepuestos = Object.entries(topRepMap)
    .sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([rep, n]) => ({ repuesto: rep, veces: n }));

  // ── Costos y márgenes de repuestos ──
  const cotPorSol = {};
  cotizaciones.forEach(c => {
    if (!cotPorSol[c.solicitud_id]) cotPorSol[c.solicitud_id] = [];
    cotPorSol[c.solicitud_id].push(c);
  });
  let totalCostoRep = 0, totalVentaRep = 0;
  solicitudesRep.filter(s => s.estado === 'entregado').forEach(s => {
    const cots = cotPorSol[s.id] || [];
    const entregado = cots.find(c => c.estado_opcion === 'entregado');
    if (entregado) {
      totalCostoRep += (entregado.precio_costo||0) * (s.unidades||1);
      totalVentaRep += (entregado.precio_venta_jefe||0) * (s.unidades||1);
    }
  });
  const margenRep = totalCostoRep > 0 ? Math.round(((totalVentaRep-totalCostoRep)/totalCostoRep)*100) : 0;

  // ── Análisis por tipo de cliente ──
  const valPorOrden = {};
  etapas.forEach(e => { valPorOrden[e.orden_id] = (valPorOrden[e.orden_id]||0)+(e.valor||0); });

  const tipoMap = {};
  ordenes.forEach(o => {
    const key = o.aseguradora ? 'Aseguradora' : (o.tipo_cliente==='flotilla'?'Flotilla':'Particular');
    if (!tipoMap[key]) tipoMap[key] = { ordenes:0, valor:0 };
    tipoMap[key].ordenes++;
    tipoMap[key].valor += (valPorOrden[o.id]||0);
  });
  const tiposCliente = Object.entries(tipoMap)
    .map(([tipo, d]) => ({ tipo, ...d }))
    .sort((a,b) => b.ordenes - a.ordenes);

  // ── Ranking aseguradoras ──
  const asegMap = {};
  ordenes.filter(o=>o.aseguradora).forEach(o => {
    if (!asegMap[o.aseguradora]) asegMap[o.aseguradora] = { ordenes:0, valor:0 };
    asegMap[o.aseguradora].ordenes++;
    asegMap[o.aseguradora].valor += (valPorOrden[o.id]||0);
  });
  const rankingAseguradoras = Object.entries(asegMap)
    .map(([nombre, d]) => ({ nombre, ...d }))
    .sort((a,b) => b.ordenes - a.ordenes).slice(0,10);

  // ── Ranking flotillas / empresas ──
  const flotillaById = {};
  (flotillas || []).forEach(f => { flotillaById[f.id] = f.nombre; });
  const flotMap2 = {};
  ordenes.filter(o => o.tipo_cliente === 'flotilla' && o.flotilla_id).forEach(o => {
    const nombre = flotillaById[o.flotilla_id] || `Empresa #${o.flotilla_id}`;
    if (!flotMap2[o.flotilla_id]) flotMap2[o.flotilla_id] = { nombre, ordenes:0, valor:0 };
    flotMap2[o.flotilla_id].ordenes++;
    flotMap2[o.flotilla_id].valor += (valPorOrden[o.id]||0);
  });
  const rankingFlotillas = Object.values(flotMap2)
    .sort((a,b) => b.ordenes - a.ordenes);

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
    const durTotal = (o.creado_en && o.entregada_en)
      ? minToHrs(new Date(o.entregada_en) - new Date(o.creado_en)) : null;
    const diasPromesa = (o.fecha_entrega_1 && o.entregada_en)
      ? Math.round((new Date(o.entregada_en) - new Date(o.fecha_entrega_1)) / 86400000) : null;
    return {
      placa: o.placa, vehiculo: [o.marca,o.linea].filter(Boolean).join(' ')||'—',
      propietario: o.propietario||'—', aseguradora: o.aseguradora||'Particular',
      ingreso: o.creado_en, entrega: o.entregada_en,
      duracionHrs: durTotal, diasVsPromesa: diasPromesa,
      novedades: novPorOrden[o.id]||0
    };
  });
  const tiempoPromedioCiclo = ordenesConTiempo.filter(o=>o.duracionHrs).length
    ? Math.round(ordenesConTiempo.filter(o=>o.duracionHrs).reduce((s,o)=>s+o.duracionHrs,0)/ordenesConTiempo.filter(o=>o.duracionHrs).length*10)/10 : 0;
  const ordenesATiempo    = ordenesConTiempo.filter(o=>o.diasVsPromesa!==null&&o.diasVsPromesa<=0).length;
  const ordenesTarde      = ordenesConTiempo.filter(o=>o.diasVsPromesa!==null&&o.diasVsPromesa>0).length;
  const totalConPromesa   = ordenesATiempo + ordenesTarde;
  const tasaCumplimiento  = totalConPromesa > 0 ? Math.round(ordenesATiempo / totalConPromesa * 100) : null;

  // ── Análisis de tiempos en pulmón ──
  // Unir ordenesIngresadas + ordenesEntregadas sin duplicados
  const todasOrdenesIdsVistas = new Set();
  const todasOrdenesPeriodo = [...ordenesIngresadas, ...ordenesEntregadas].filter(o => {
    if (todasOrdenesIdsVistas.has(o.id)) return false;
    todasOrdenesIdsVistas.add(o.id); return true;
  });
  const ordenesConPulmon = todasOrdenesPeriodo.filter(o => o.pulmon_desde);

  const tiemposPulmonHrs = ordenesConPulmon.map(o => {
    const fin = o.pulmon_fin || (o.pulmon ? new Date().toISOString() : null);
    if (!fin) return null;
    return (new Date(fin) - new Date(o.pulmon_desde)) / 3600000;
  }).filter(t => t !== null);

  const promedioPulmonHrs = tiemposPulmonHrs.length
    ? Math.round(tiemposPulmonHrs.reduce((a,b)=>a+b,0)/tiemposPulmonHrs.length * 10) / 10 : 0;
  const maxPulmonHrs      = tiemposPulmonHrs.length ? Math.round(Math.max(...tiemposPulmonHrs)*10)/10 : 0;
  const ordenesEnPulmonAhora = ordenesConPulmon.filter(o => o.pulmon).length;

  const distPulmon = { menos1d:0, uno3d:0, mas3d:0 };
  tiemposPulmonHrs.forEach(h => {
    if (h < 24) distPulmon.menos1d++;
    else if (h < 72) distPulmon.uno3d++;
    else distPulmon.mas3d++;
  });

  const pulmonPorTipoMap = {};
  ordenesConPulmon.filter(o => o.pulmon_desde && o.pulmon_fin).forEach(o => {
    const tipo = o.pulmon_tipo || 'sin tipo';
    if (!pulmonPorTipoMap[tipo]) pulmonPorTipoMap[tipo] = { count:0, totalHrs:0 };
    pulmonPorTipoMap[tipo].count++;
    pulmonPorTipoMap[tipo].totalHrs += (new Date(o.pulmon_fin) - new Date(o.pulmon_desde)) / 3600000;
  });
  const pulmonPorTipo = Object.entries(pulmonPorTipoMap).map(([tipo, d]) => ({
    tipo: tipo.charAt(0).toUpperCase()+tipo.slice(1),
    count: d.count,
    promedioHrs: Math.round(d.totalHrs/d.count*10)/10
  }));

  // ── Cuellos de botella ──
  const etapaMap = {};
  etapas.forEach(e => {
    const k = e.etapa||'Sin nombre';
    const neta = durNetaHrs(e);
    if (!etapaMap[k]) etapaMap[k] = { count:0, totalHrs:0, servicio: e.servicio };
    etapaMap[k].count++;
    if (neta !== null) etapaMap[k].totalHrs += neta;
  });
  const cuellos = Object.entries(etapaMap).map(([etapa, d]) => ({
    etapa, servicio: d.servicio||'—', veces: d.count,
    horaPromedio: d.count>0 ? Math.round((d.totalHrs/d.count)*10)/10 : 0
  })).sort((a,b) => b.horaPromedio - a.horaPromedio).slice(0,10);

  return {
    resumen: {
      ordenesEntregadas:      ordenesEntregadas.length,
      ordenesIngresadas:      ordenesIngresadas.length,
      etapasCompletadas:      etapas.length,
      totalIngresos,
      totalHorasFacturadas:   Math.round(totalHorasFacturadas*10)/10,
      totalHorasAdicionales:  Math.round(totalHorasAdicionales*10)/10,
      totalMinutosPausados,
      tiempoPromedioCiclo,
      ordenesATiempo, ordenesTarde, tasaCumplimiento,
      novedadesTotal:         novedades.length,
      novPorTipo, ordenesConNovedades,
      // repuestos
      solicitudesRep:         solicitudesRep.length,
      tiempoEsperaPromedio,
      totalCostoRep, totalVentaRep, margenRep,
      // totales economicos
      totalMOmasRep:          totalIngresos + totalVentaRep,
      // pulmón
      ordenesConPulmon:       ordenesConPulmon.length,
      promedioPulmonHrs,      maxPulmonHrs,
      ordenesEnPulmonAhora,   distPulmon, pulmonPorTipo
    },
    servicios, tecnicos, cuellos,
    ordenesDetalle: ordenesConTiempo,
    ordenesIngresadas, novedades,
    topRepuestos, tiposCliente, rankingAseguradoras, rankingFlotillas,
    fmt, hrStr
  };
}

// ─── Generador PDF ───────────────────────────────────────────
function _generarPDF(d, titulo, subtitulo) {
  const { resumen, servicios, tecnicos, cuellos, ordenesDetalle, ordenesIngresadas, novedades,
          topRepuestos, tiposCliente, rankingAseguradoras, rankingFlotillas, fmt, hrStr } = d;

  const fmtFecha = iso => iso ? new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const fmtHora  = iso => iso ? new Date(iso).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}) : '—';
  const pctColor = p => p==null?'#666':p>=100?'#059669':p>=80?'#D97706':'#DC2626';

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;font-size:12px;line-height:1.5}
  .page{max-width:960px;margin:0 auto;padding:32px 36px}
  .rpt-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1E3A5F;padding-bottom:16px;margin-bottom:24px}
  .rpt-brand{font-size:22px;font-weight:800;color:#1E3A5F;letter-spacing:1px}
  .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
  .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;border-top:3px solid}
  .kpi-val{font-size:20px;font-weight:800;margin-bottom:3px}
  .kpi-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px}
  .kpi-sub{font-size:10px;color:#aaa;margin-top:2px}
  .section{margin-bottom:26px;page-break-inside:avoid}
  .section-title{font-size:11px;font-weight:800;color:#1E3A5F;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding-bottom:7px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#f1f5f9;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:#64748b;font-weight:700;border-bottom:1px solid #e2e8f0}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f0;color:#374151}
  tr:last-child td{border-bottom:none}
  .total-row td{font-weight:700;background:#f8fafc;border-top:2px solid #e2e8f0}
  .badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700}
  .badge-green{background:#dcfce7;color:#166534}
  .badge-amber{background:#fef9c3;color:#854d0e}
  .badge-red{background:#fee2e2;color:#991b1b}
  .badge-blue{background:#dbeafe;color:#1e40af}
  .badge-gray{background:#f1f5f9;color:#64748b}
  .badge-pause{background:#FEF3C7;color:#92400E}
  .bar-wrap{background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden;width:80px;display:inline-block;vertical-align:middle;margin-left:6px}
  .bar-fill{height:100%;border-radius:4px}
  .nov-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:10px}
  .nov-box{border-radius:8px;padding:12px;text-align:center}
  .nov-val{font-size:24px;font-weight:800;margin-bottom:3px}
  .cuello-row{display:flex;align-items:center;gap:10px;margin-bottom:6px}
  .cuello-lbl{width:140px;font-size:11px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cuello-bar{background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden;flex:1}
  .cuello-val{width:50px;font-size:11px;font-weight:700;text-align:right}
  .tipo-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9}
  .footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:9px;color:#aaa;text-align:center}
  @media print{body{font-size:11px}.page{padding:18px 22px}.section{page-break-inside:avoid}}
</style></head><body><div class="page">

  <!-- ENCABEZADO -->
  <div class="rpt-header">
    <div>
      <div class="rpt-brand">${_RPT_EMPRESA.nombre}</div>
      <div style="font-size:11px;color:#888;margin-top:3px">${_RPT_EMPRESA.slogan} · NIT ${_RPT_EMPRESA.nit}</div>
      <div style="font-size:10px;color:#aaa;margin-top:2px">${_RPT_EMPRESA.direccion} · Tel: ${_RPT_EMPRESA.telefono} · ${_RPT_EMPRESA.email}</div>
      ${subtitulo ? `<div style="font-size:11px;color:#666;margin-top:5px">${subtitulo}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;font-weight:700;color:#1E3A5F">${titulo}</div>
      <div style="font-size:10px;color:#999;margin-top:4px">Generado: ${new Date().toLocaleString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  </div>

  <!-- KPIs EJECUTIVOS -->
  <div class="kpi-row">
    <div class="kpi" style="border-top-color:#1E3A5F">
      <div class="kpi-val" style="color:#1E3A5F">${resumen.ordenesEntregadas}</div>
      <div class="kpi-lbl">Órdenes entregadas</div>
      <div class="kpi-sub">
        ${resumen.tasaCumplimiento !== null
          ? `<span style="font-weight:700;color:${resumen.tasaCumplimiento>=90?'#059669':resumen.tasaCumplimiento>=70?'#D97706':'#DC2626'}">${resumen.tasaCumplimiento}% a tiempo</span> · ${resumen.ordenesTarde} tarde`
          : `${resumen.ordenesATiempo} a tiempo · ${resumen.ordenesTarde} tarde`}
      </div>
    </div>
    <div class="kpi" style="border-top-color:#059669">
      <div class="kpi-val" style="color:#059669;font-size:14px">${fmt(resumen.totalIngresos)}</div>
      <div class="kpi-lbl">Ingresos mano de obra</div>
      <div class="kpi-sub">${resumen.totalHorasFacturadas}h facturadas</div>
    </div>
    <div class="kpi" style="border-top-color:#D97706">
      <div class="kpi-val" style="color:#D97706">${resumen.tiempoPromedioCiclo}h</div>
      <div class="kpi-lbl">Ciclo promedio / orden</div>
      <div class="kpi-sub">${resumen.etapasCompletadas} etapas completadas</div>
    </div>
    <div class="kpi" style="border-top-color:#F59E0B">
      <div class="kpi-val" style="color:#D97706;font-size:15px">${resumen.totalMinutosPausados > 0 ? hrStr(resumen.totalMinutosPausados) : '—'}</div>
      <div class="kpi-lbl">⏸ Total pausado (repuestos)</div>
      <div class="kpi-sub">${resumen.solicitudesRep} solicitudes · ${resumen.tiempoEsperaPromedio}m espera prom.</div>
    </div>
  </div>

  <!-- SEGUNDA FILA KPIs: REPUESTOS + COSTOS -->
  ${(resumen.totalCostoRep > 0 || resumen.totalVentaRep > 0) ? `
  <div class="kpi-row" style="margin-bottom:24px">
    <div class="kpi" style="border-top-color:#7C3AED">
      <div class="kpi-val" style="color:#7C3AED;font-size:14px">${fmt(resumen.totalCostoRep)}</div>
      <div class="kpi-lbl">Costo repuestos (proveedor)</div>
      <div class="kpi-sub">Repuestos entregados en el período</div>
    </div>
    <div class="kpi" style="border-top-color:#0891B2">
      <div class="kpi-val" style="color:#0891B2;font-size:14px">${fmt(resumen.totalVentaRep)}</div>
      <div class="kpi-lbl">Venta repuestos (al cliente)</div>
      <div class="kpi-sub">Margen: <strong style="color:${resumen.margenRep>=30?'#059669':resumen.margenRep>=15?'#D97706':'#DC2626'}">${resumen.margenRep}%</strong></div>
    </div>
    <div class="kpi" style="border-top-color:#059669">
      <div class="kpi-val" style="color:#059669;font-size:14px">${fmt(resumen.totalIngresos + resumen.totalVentaRep)}</div>
      <div class="kpi-lbl">Total facturado (MO + repuestos)</div>
      <div class="kpi-sub">Combinado del período</div>
    </div>
    <div class="kpi" style="border-top-color:#DC2626">
      <div class="kpi-val" style="color:#DC2626">${resumen.novedadesTotal}</div>
      <div class="kpi-lbl">Novedades registradas</div>
      <div class="kpi-sub">${resumen.ordenesConNovedades} órdenes afectadas</div>
    </div>
  </div>` : `
  <div class="kpi-row" style="margin-bottom:24px">
    <div class="kpi" style="border-top-color:#DC2626">
      <div class="kpi-val" style="color:#DC2626">${resumen.novedadesTotal}</div>
      <div class="kpi-lbl">Novedades registradas</div>
      <div class="kpi-sub">${resumen.ordenesConNovedades} órdenes afectadas</div>
    </div>
    <div class="kpi" style="border-top-color:#6B7280">
      <div class="kpi-val" style="color:#6B7280">${resumen.solicitudesRep}</div>
      <div class="kpi-lbl">Solicitudes de repuesto</div>
      <div class="kpi-sub">Espera promedio: ${resumen.tiempoEsperaPromedio}min</div>
    </div>
    <div class="kpi" style="border-top-color:#1E3A5F;grid-column:span 2">
      <div class="kpi-val" style="color:#1E3A5F">${resumen.ordenesIngresadas}</div>
      <div class="kpi-lbl">Órdenes ingresadas al período</div>
    </div>
  </div>`}

  <!-- PANEL PULMÓN -->
  ${resumen.ordenesConPulmon > 0 ? `
  <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:14px 20px;margin-bottom:22px">
    <div style="font-size:10px;font-weight:800;color:#92400E;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">
      ⏰ Análisis de tiempo en pulmón — ${resumen.ordenesConPulmon} órdenes registradas
    </div>
    <div style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start">
      <div>
        <div style="font-size:11px;color:#92400E;margin-bottom:2px">Promedio</div>
        <div style="font-size:24px;font-weight:800;color:#D97706">${resumen.promedioPulmonHrs}h</div>
      </div>
      <div style="border-left:1px solid #FDE68A;padding-left:24px">
        <div style="font-size:11px;color:#92400E;margin-bottom:2px">Máximo registrado</div>
        <div style="font-size:24px;font-weight:800;color:#D97706">${resumen.maxPulmonHrs}h</div>
      </div>
      <div style="border-left:1px solid #FDE68A;padding-left:24px">
        <div style="font-size:11px;color:#92400E;margin-bottom:6px">Distribución</div>
        <div style="font-size:12px;line-height:1.8;color:#78350F">
          <span style="font-weight:700">${resumen.distPulmon.menos1d}</span> menor a 1 día &nbsp;·&nbsp;
          <span style="font-weight:700">${resumen.distPulmon.uno3d}</span> de 1 a 3 días &nbsp;·&nbsp;
          <span style="font-weight:700;color:${resumen.distPulmon.mas3d>0?'#DC2626':'#78350F'}">${resumen.distPulmon.mas3d}</span> más de 3 días
        </div>
      </div>
      ${resumen.pulmonPorTipo.length ? `<div style="border-left:1px solid #FDE68A;padding-left:24px">
        <div style="font-size:11px;color:#92400E;margin-bottom:6px">Por tipo</div>
        ${resumen.pulmonPorTipo.map(p => `<div style="font-size:12px;color:#78350F"><strong>${p.tipo}</strong>: ${p.count} ord. · prom. ${p.promedioHrs}h</div>`).join('')}
      </div>` : ''}
      ${resumen.ordenesEnPulmonAhora > 0 ? `<div style="border-left:1px solid #FDE68A;padding-left:24px">
        <div style="font-size:11px;color:#DC2626;margin-bottom:2px">Actualmente en pulmón</div>
        <div style="font-size:24px;font-weight:800;color:#DC2626">${resumen.ordenesEnPulmonAhora}</div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- ANÁLISIS POR SERVICIO -->
  <div class="section">
    <div class="section-title">Análisis por servicio (tiempo neto — descontando pausas)</div>
    <table><thead><tr>
      <th>Servicio</th><th>Etapas</th><th>Ingresos</th>
      <th>Hrs promedio/etapa</th><th>Más lenta</th><th>Más rápida</th><th>Hrs total neto</th>
    </tr></thead><tbody>
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
    </tbody></table>
  </div>

  <!-- RENDIMIENTO POR TÉCNICO — con tiempo neto, pausas y calidad -->
  <div class="section">
    <div class="section-title">Rendimiento por técnico</div>
    <div style="font-size:10px;color:#888;margin-bottom:8px;font-style:italic">
      * Tiempo neto = tiempo bruto menos minutos pausados esperando repuestos.
        Eficiencia: tiempo neto vs estimado (>100% = más rápido que estimado).
    </div>
    <table><thead><tr>
      <th>Técnico</th><th>Etapas</th><th>T. Neto (h)</th><th>T. Bruto (h)</th>
      <th>⏸ Pausado</th><th>Eficiencia</th><th>Ingresos</th><th>Reprocesos</th><th>Garantías</th>
    </tr></thead><tbody>
      ${tecnicos.map(t => {
        const ef = t.eficiencia;
        const efBadge = ef==null ? '<span class="badge badge-gray">—</span>'
          : ef>=100 ? `<span class="badge badge-green">${ef}% ↑</span>`
          : ef>=80  ? `<span class="badge badge-amber">${ef}%</span>`
          : `<span class="badge badge-red">${ef}% ↓</span>`;
        const pausBadge = t.minutosPausados > 0
          ? `<span class="badge badge-pause">⏸ ${t.minutosPausados}m</span>`
          : '<span style="color:#aaa">—</span>';
        const reproBadge = t.reprocesos > 0
          ? `<span class="badge badge-amber">${t.reprocesos}</span>`
          : '<span style="color:#aaa">0</span>';
        const garBadge = t.garantias > 0
          ? `<span class="badge badge-red">${t.garantias}</span>`
          : '<span style="color:#aaa">0</span>';
        return `<tr>
          <td><strong>${t.tecnico}</strong></td>
          <td>${t.completadas}/${t.etapas}</td>
          <td style="color:#2563EB;font-weight:600">${t.horasNetas}h</td>
          <td style="color:#94A3B8">${t.horasBrutas}h</td>
          <td>${pausBadge}</td>
          <td>${efBadge}</td>
          <td style="font-family:monospace">${fmt(t.ingresos)}</td>
          <td style="text-align:center">${reproBadge}</td>
          <td style="text-align:center">${garBadge}</td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div>

  <!-- CALIDAD POR TÉCNICO — sección destacada si hay novedades -->
  ${tecnicos.some(t => t.reprocesos > 0 || t.garantias > 0) ? `<div class="section">
    <div class="section-title">Calidad por técnico — reprocesos y garantías</div>
    <div style="font-size:10px;color:#888;margin-bottom:10px;font-style:italic">
      * Un reproceso es trabajo que tuvo que rehacerse. Una garantía es un reclamo posterior a la entrega.
        Ambos afectan la rentabilidad real del trabajo.
    </div>
    <table><thead><tr>
      <th>Técnico</th><th>Etapas completadas</th><th>Reprocesos</th>
      <th>Garantías</th><th>Detenidos</th><th>Total incidencias</th><th>Tasa incidencia</th>
    </tr></thead><tbody>
      ${tecnicos.filter(t => t.reprocesos>0||t.garantias>0||t.detenidos>0).map(t => {
        const total = t.reprocesos + t.garantias + t.detenidos;
        const tasa  = t.completadas > 0 ? Math.round(total/t.completadas*100) : 0;
        const tasaColor = tasa===0?'#059669':tasa<=10?'#D97706':'#DC2626';
        return `<tr>
          <td><strong>${t.tecnico}</strong></td>
          <td>${t.completadas}</td>
          <td style="text-align:center">${t.reprocesos>0?`<span class="badge badge-amber">${t.reprocesos}</span>`:'—'}</td>
          <td style="text-align:center">${t.garantias>0?`<span class="badge badge-red">${t.garantias}</span>`:'—'}</td>
          <td style="text-align:center">${t.detenidos>0?`<span class="badge badge-gray">${t.detenidos}</span>`:'—'}</td>
          <td style="text-align:center;font-weight:700">${total}</td>
          <td style="color:${tasaColor};font-weight:700">${tasa}%</td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div>` : ''}

  <!-- CUELLOS DE BOTELLA -->
  <div class="section">
    <div class="section-title">Cuellos de botella — etapas con mayor duración promedio (neta)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>${cuellos.slice(0,5).map((c,i) => {
        const maxH = cuellos[0].horaPromedio||1;
        const pct  = Math.round((c.horaPromedio/maxH)*100);
        const color= i===0?'#DC2626':i===1?'#D97706':'#2563EB';
        return `<div class="cuello-row">
          <span class="cuello-lbl">${c.etapa}</span>
          <div class="cuello-bar"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="cuello-val" style="color:${color}">${c.horaPromedio}h</span>
        </div>`;
      }).join('')}</div>
      <div>${cuellos.slice(5,10).map(c => {
        const maxH = cuellos[0].horaPromedio||1;
        const pct  = Math.round((c.horaPromedio/maxH)*100);
        return `<div class="cuello-row">
          <span class="cuello-lbl">${c.etapa}</span>
          <div class="cuello-bar"><div class="bar-fill" style="width:${pct}%;background:#64748b"></div></div>
          <span class="cuello-val">${c.horaPromedio}h</span>
        </div>`;
      }).join('')}</div>
    </div>
  </div>

  <!-- POR TIPO DE CLIENTE -->
  ${tiposCliente.length ? `<div class="section">
    <div class="section-title">Análisis por tipo de cliente</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <table><thead><tr><th>Tipo</th><th>Órdenes</th><th>Valor MO</th></tr></thead><tbody>
          ${tiposCliente.map(t => {
            const color = t.tipo==='Aseguradora'?'#2563EB':t.tipo==='Flotilla'?'#7C3AED':'#059669';
            return `<tr>
              <td><span style="font-weight:700;color:${color}">${t.tipo}</span></td>
              <td><span class="badge badge-blue">${t.ordenes}</span></td>
              <td style="font-family:monospace">${fmt(t.valor)}</td>
            </tr>`;
          }).join('')}
        </tbody></table>
      </div>
      ${rankingAseguradoras.length ? `<div>
        <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Top aseguradoras</div>
        ${rankingAseguradoras.slice(0,6).map((a,i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px">
            <span style="font-weight:600">${i+1}. ${a.nombre}</span>
            <span>${a.ordenes} órd. · <span style="font-family:monospace">${fmt(a.valor)}</span></span>
          </div>`).join('')}
      </div>` : ''}
    </div>
    ${rankingFlotillas.length ? `
    <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Flotillas / Empresas</div>
    <table><thead><tr><th>Empresa / Flotilla</th><th>Órdenes</th><th>Valor MO</th></tr></thead><tbody>
      ${rankingFlotillas.map((f,i) => `<tr>
        <td><span style="font-weight:${i===0?'700':'400'};color:#7C3AED">${f.nombre}</span></td>
        <td><span class="badge" style="background:#F3E8FF;color:#7C3AED">${f.ordenes}</span></td>
        <td style="font-family:monospace">${fmt(f.valor)}</td>
      </tr>`).join('')}
    </tbody></table>` : ''}
  </div>` : ''}

  <!-- REPUESTOS — COSTOS Y TIEMPOS -->
  ${topRepuestos.length ? `<div class="section">
    <div class="section-title">Repuestos más solicitados y análisis de espera</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <table><thead><tr><th>Repuesto</th><th>Veces solicitado</th></tr></thead><tbody>
          ${topRepuestos.map((r,i) => `<tr>
            <td>${i===0?`<strong>${r.repuesto}</strong>`:r.repuesto}</td>
            <td><span class="badge badge-blue">${r.veces}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:14px;border:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:700;color:#1E3A5F;margin-bottom:10px">Resumen de costos</div>
        <div style="display:grid;gap:8px;font-size:12px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748b">Solicitudes en período</span>
            <strong>${resumen.solicitudesRep}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748b">Espera promedio</span>
            <strong>${resumen.tiempoEsperaPromedio > 0 ? resumen.tiempoEsperaPromedio+'min' : '—'}</strong>
          </div>
          ${resumen.totalCostoRep > 0 ? `
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #e2e8f0">
            <span style="color:#64748b">Costo proveedor</span>
            <strong style="font-family:monospace">${fmt(resumen.totalCostoRep)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748b">Precio venta cliente</span>
            <strong style="font-family:monospace">${fmt(resumen.totalVentaRep)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#64748b">Margen bruto</span>
            <strong style="color:${resumen.margenRep>=30?'#059669':resumen.margenRep>=15?'#D97706':'#DC2626'}">${resumen.margenRep}%</strong>
          </div>` : '<div style="color:#aaa;font-size:11px;font-style:italic">Sin datos de costos en el período.</div>'}
        </div>
      </div>
    </div>
  </div>` : ''}

  <!-- NOVEDADES -->
  <div class="section">
    <div class="section-title">Novedades y detenciones</div>
    <div class="nov-grid">
      <div class="nov-box" style="background:#fee2e2">
        <div class="nov-val" style="color:#DC2626">${resumen.novPorTipo.Detenido||0}</div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#DC2626">Detenidos</div>
      </div>
      <div class="nov-box" style="background:#fef9c3">
        <div class="nov-val" style="color:#D97706">${resumen.novPorTipo.Reproceso||0}</div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#D97706">Reprocesos</div>
      </div>
      <div class="nov-box" style="background:#dbeafe">
        <div class="nov-val" style="color:#1E40AF">${resumen.novPorTipo.Garantia||0}</div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#1E40AF">Garantías</div>
      </div>
    </div>
    ${novedades.length ? `<table>
      <thead><tr><th>Tipo</th><th>Motivo</th><th>Responsable</th><th>Fecha</th></tr></thead>
      <tbody>
        ${novedades.slice(0,20).map(n => `<tr>
          <td><span class="badge ${n.tipo==='Detenido'?'badge-red':n.tipo==='Reproceso'?'badge-amber':'badge-blue'}">${n.tipo}</span></td>
          <td>${n.motivo||'—'}</td><td>${n.responsable||'—'}</td><td>${fmtHora(n.creado_en)}</td>
        </tr>`).join('')}
        ${novedades.length>20?`<tr><td colspan="4" style="text-align:center;color:#aaa;font-style:italic">... y ${novedades.length-20} más</td></tr>`:''}
      </tbody>
    </table>` : '<div style="color:#aaa;font-style:italic;font-size:12px">Sin novedades en el período.</div>'}
  </div>

  <!-- DETALLE ÓRDENES ENTREGADAS -->
  ${ordenesDetalle.length ? `<div class="section">
    <div class="section-title">Órdenes entregadas — detalle de ciclo</div>
    <table><thead><tr>
      <th>Placa</th><th>Vehículo</th><th>Propietario</th><th>Aseguradora</th>
      <th>Ingreso</th><th>Entrega</th><th>Ciclo</th><th>Vs. prometido</th><th>Novedades</th>
    </tr></thead><tbody>
      ${ordenesDetalle.map(o => {
        const vpColor = o.diasVsPromesa==null?'#aaa':o.diasVsPromesa<=0?'#059669':'#DC2626';
        const vpLabel = o.diasVsPromesa==null?'—':o.diasVsPromesa===0?'A tiempo':o.diasVsPromesa<0?`${Math.abs(o.diasVsPromesa)}d antes`:`${o.diasVsPromesa}d tarde`;
        return `<tr>
          <td><strong style="font-family:monospace">${o.placa}</strong></td>
          <td>${o.vehiculo}</td><td>${o.propietario}</td><td>${o.aseguradora}</td>
          <td>${fmtFecha(o.ingreso)}</td><td>${fmtHora(o.entrega)}</td>
          <td>${o.duracionHrs?o.duracionHrs+'h':'—'}</td>
          <td style="color:${vpColor};font-weight:600">${vpLabel}</td>
          <td>${o.novedades>0?`<span class="badge badge-amber">${o.novedades}</span>`:'—'}</td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div>` : ''}

  <div class="footer">
    ${_RPT_EMPRESA.nombre} · NIT ${_RPT_EMPRESA.nit} · ${_RPT_EMPRESA.direccion} · Tel: ${_RPT_EMPRESA.telefono} ·
    Reporte generado el ${new Date().toLocaleString('es-CO')}
  </div>
</div></body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 800); }
  toast('Reporte PDF generado ✓');
}

// ─── Generador Excel con SheetJS ────────────────────────────
function _generarExcel(d, titulo) {
  const { resumen, servicios, tecnicos, cuellos, ordenesDetalle, ordenesIngresadas, novedades,
          topRepuestos, tiposCliente, rankingAseguradoras, rankingFlotillas, fmt } = d;
  const wb = XLSX.utils.book_new();
  const fmtFecha = iso => iso ? new Date(iso).toLocaleDateString('es-CO') : '—';

  // Hoja 1: Resumen ejecutivo
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['REPORTE OPERATIVO — FREIMANAUTOS · NIT 800.012.186'],
    [titulo], ['Generado:', new Date().toLocaleString('es-CO')], [],
    ['MÉTRICAS CLAVE', ''],
    ['Órdenes entregadas', resumen.ordenesEntregadas],
    ['Órdenes ingresadas', resumen.ordenesIngresadas],
    ['Etapas completadas', resumen.etapasCompletadas],
    ['Ingresos MO (COP)', resumen.totalIngresos],
    ['Venta repuestos (COP)', resumen.totalVentaRep],
    ['Total facturado MO + repuestos (COP)', resumen.totalIngresos + resumen.totalVentaRep],
    ['Costo repuestos proveedor (COP)', resumen.totalCostoRep],
    ['Margen repuestos (%)', resumen.margenRep],
    ['Horas facturadas total', resumen.totalHorasFacturadas],
    ['Horas adicionales total', resumen.totalHorasAdicionales],
    ['Total minutos pausados (repuestos)', resumen.totalMinutosPausados],
    ['Tiempo promedio ciclo (hrs)', resumen.tiempoPromedioCiclo],
    ['Órdenes a tiempo', resumen.ordenesATiempo],
    ['Órdenes tarde', resumen.ordenesTarde],
    ['Tasa de cumplimiento (%)', resumen.tasaCumplimiento !== null ? resumen.tasaCumplimiento : 'Sin datos'],
    ['Solicitudes de repuesto', resumen.solicitudesRep],
    ['Espera promedio por repuesto (min)', resumen.tiempoEsperaPromedio],
    ['Órdenes que pasaron por pulmón', resumen.ordenesConPulmon],
    ['Tiempo promedio en pulmón (hrs)', resumen.promedioPulmonHrs],
    ['Tiempo máximo en pulmón (hrs)', resumen.maxPulmonHrs],
    ['Actualmente en pulmón', resumen.ordenesEnPulmonAhora],
    ['Distribución pulmón < 1 día', resumen.distPulmon.menos1d],
    ['Distribución pulmón 1–3 días', resumen.distPulmon.uno3d],
    ['Distribución pulmón > 3 días', resumen.distPulmon.mas3d],
    [],
    ['Novedades totales', resumen.novedadesTotal],
    ['— Detenidos', resumen.novPorTipo.Detenido||0],
    ['— Reprocesos', resumen.novPorTipo.Reproceso||0],
    ['— Garantías', resumen.novPorTipo.Garantia||0],
    ['Órdenes con novedades', resumen.ordenesConNovedades],
  ]);
  ws1['!cols'] = [{wch:38},{wch:22}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // Hoja 2: Servicios
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Servicio','Etapas','Ingresos (COP)','Hrs prom/etapa (neto)','Más lenta (h)','Más rápida (h)','Hrs total neto'],
    ...servicios.map(s => [s.nombre,s.etapas,s.ingresos,s.horasPromedio,s.etapaMasLenta,s.etapaMasRapida,s.horasTotal])
  ]);
  ws2['!cols'] = [{wch:18},{wch:10},{wch:18},{wch:20},{wch:16},{wch:16},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Por Servicio');

  // Hoja 3: Técnicos — con tiempo neto, pausas y calidad
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Técnico','Etapas completadas','T. Neto (h)','T. Bruto (h)','Pausado (min)','T. Estimado (h)','Eficiencia (%)','Prom/etapa (h)','Ingresos (COP)','H. Adicionales','Reprocesos','Garantías','Detenidos','Servicio top'],
    ...tecnicos.map(t => [t.tecnico,t.completadas,t.horasNetas,t.horasBrutas,t.minutosPausados,t.horasEstimadas,t.eficiencia,t.promedioHrEtapa,t.ingresos,t.horasAdicionales,t.reprocesos,t.garantias,t.detenidos,t.servicioTop])
  ]);
  ws3['!cols'] = [{wch:20},{wch:18},{wch:12},{wch:12},{wch:14},{wch:14},{wch:14},{wch:14},{wch:18},{wch:14},{wch:12},{wch:10},{wch:10},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Técnicos');

  // Hoja 4: Cuellos de botella
  const ws4 = XLSX.utils.aoa_to_sheet([
    ['Etapa','Servicio','Veces ejecutada','Hrs promedio (neto)'],
    ...cuellos.map(c => [c.etapa,c.servicio,c.veces,c.horaPromedio])
  ]);
  ws4['!cols'] = [{wch:24},{wch:16},{wch:18},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Cuellos de Botella');

  // Hoja 5: Por tipo de cliente + aseguradoras + flotillas
  const ws5 = XLSX.utils.aoa_to_sheet([
    ['TIPO DE CLIENTE','Órdenes','Valor MO (COP)'], [],
    ...tiposCliente.map(t => [t.tipo, t.ordenes, t.valor]),
    [],
    ['TASA DE CUMPLIMIENTO', resumen.tasaCumplimiento !== null ? resumen.tasaCumplimiento + '%' : 'Sin datos'],
    ['Órdenes a tiempo', resumen.ordenesATiempo],
    ['Órdenes tarde',    resumen.ordenesTarde],
    [],
    ['RANKING ASEGURADORAS','Órdenes','Valor MO (COP)'], [],
    ...rankingAseguradoras.map(a => [a.nombre, a.ordenes, a.valor]),
    [],
    ['FLOTILLAS / EMPRESAS','Órdenes','Valor MO (COP)'], [],
    ...rankingFlotillas.map(f => [f.nombre, f.ordenes, f.valor])
  ]);
  ws5['!cols'] = [{wch:28},{wch:12},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws5, 'Por Tipo Cliente');

  // Hoja 6: Repuestos
  const ws6 = XLSX.utils.aoa_to_sheet([
    ['REPUESTOS MÁS SOLICITADOS','Veces'], [],
    ...topRepuestos.map(r => [r.repuesto, r.veces]),
    [], ['RESUMEN COSTOS',''],
    ['Solicitudes en período', resumen.solicitudesRep],
    ['Espera promedio (min)', resumen.tiempoEsperaPromedio],
    ['Costo proveedor (COP)', resumen.totalCostoRep],
    ['Precio venta cliente (COP)', resumen.totalVentaRep],
    ['Margen bruto (%)', resumen.margenRep],
  ]);
  ws6['!cols'] = [{wch:34},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws6, 'Repuestos');

  // Hoja 7: Detalle órdenes
  if (ordenesDetalle.length) {
    const ws7 = XLSX.utils.aoa_to_sheet([
      ['Placa','Vehículo','Propietario','Aseguradora','Ingreso','Entrega','Ciclo (hrs)','Días vs prometido','Novedades'],
      ...ordenesDetalle.map(o => [o.placa,o.vehiculo,o.propietario,o.aseguradora,fmtFecha(o.ingreso),fmtFecha(o.entrega),o.duracionHrs,o.diasVsPromesa,o.novedades])
    ]);
    ws7['!cols'] = [{wch:10},{wch:18},{wch:20},{wch:16},{wch:12},{wch:12},{wch:12},{wch:16},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws7, 'Órdenes Entregadas');
  }

  // Hoja 8: Novedades
  if (novedades.length) {
    const ws8 = XLSX.utils.aoa_to_sheet([
      ['Tipo','Motivo','Responsable','Fecha'],
      ...novedades.map(n => [n.tipo,n.motivo||'—',n.responsable||'—',fmtFecha(n.creado_en)])
    ]);
    ws8['!cols'] = [{wch:14},{wch:40},{wch:20},{wch:14}];
    XLSX.utils.book_append_sheet(wb, ws8, 'Novedades');
  }

  // Hoja 9: Órdenes ingresadas
  if (ordenesIngresadas.length) {
    const ws9 = XLSX.utils.aoa_to_sheet([
      ['Placa','Vehículo','Propietario','Aseguradora','Tipo cliente','Fecha ingreso','Estado'],
      ...ordenesIngresadas.map(o => [o.placa,[o.marca,o.linea].filter(Boolean).join(' ')||'—',o.propietario||'—',o.aseguradora||'Particular',o.tipo_cliente||'—',fmtFecha(o.creado_en),o.estado||'—'])
    ]);
    ws9['!cols'] = [{wch:10},{wch:18},{wch:20},{wch:16},{wch:14},{wch:14},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws9, 'Órdenes Ingresadas');
  }

  const nombre = titulo.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g,'').replace(/\s+/g,'_').slice(0,60)+'.xlsx';
  XLSX.writeFile(wb, nombre);
  toast('Excel generado ✓');
}
