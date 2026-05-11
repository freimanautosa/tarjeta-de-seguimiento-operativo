// ═══════════════════════════════════════════════════════════
// REPORTES — PDF + EXCEL
// Depende de: SheetJS (xlsx) para Excel, jsPDF para PDF
// Ambas se cargan desde CDN en index.html
// ═══════════════════════════════════════════════════════════

// ── Helpers ─────────────────────────────────────────────────
const fmtCOP = n => n != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
const fmtF   = f => f ? new Date(f).toLocaleDateString('es-CO') : '—';
const fmtTS  = f => f ? new Date(f).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'}) : '—';

// ── Modal de filtros de reporte ───────────────────────────────
function abrirModalReporte(tipo = 'ordenes') {
  // tipo: 'ordenes' | 'tecnico' | 'todos_tecnicos'
  const overlay = document.getElementById('modal-reporte');
  if (!overlay) return;
  overlay.dataset.tipo = tipo;

  const titulo = { ordenes:'Reporte de órdenes', tecnico:'Reporte del técnico', todos_tecnicos:'Reporte general de técnicos' };
  document.getElementById('modal-rep-titulo').textContent = titulo[tipo] || 'Reporte';

  // Precarga técnico si aplica
  const selTec = document.getElementById('rep-sel-tecnico');
  if (selTec) selTec.style.display = tipo === 'tecnico' ? 'block' : 'none';

  overlay.classList.add('show');
}

function cerrarModalReporte() {
  const overlay = document.getElementById('modal-reporte');
  if (overlay) overlay.classList.remove('show');
}

async function generarReporte() {
  const overlay  = document.getElementById('modal-reporte');
  const tipo     = overlay?.dataset.tipo || 'ordenes';
  const periodo  = document.getElementById('rep-periodo')?.value || 'todo';
  const formato  = document.getElementById('rep-formato')?.value || 'excel';
  const fechaVal = document.getElementById('rep-fecha')?.value || '';

  const btn = document.getElementById('btn-gen-reporte');
  if (btn) { btn.disabled = true; btn.textContent = 'Generando...'; }

  try {
    // ── Calcular rango de fechas ───────────────────────────
    let desde = null, hasta = null;
    const hoy = new Date();

    if (periodo === 'semana') {
      const d = fechaVal ? new Date(fechaVal) : new Date();
      const dow = d.getDay();
      desde = new Date(d); desde.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); desde.setHours(0,0,0,0);
      hasta = new Date(desde); hasta.setDate(desde.getDate() + 6); hasta.setHours(23,59,59,999);
    } else if (periodo === 'mes') {
      const ref = fechaVal ? new Date(fechaVal) : hoy;
      desde = new Date(ref.getFullYear(), ref.getMonth(), 1);
      hasta = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodo === 'ano') {
      const ref = fechaVal ? new Date(fechaVal) : hoy;
      desde = new Date(ref.getFullYear(), 0, 1);
      hasta = new Date(ref.getFullYear(), 11, 31, 23, 59, 59);
    }
    // 'todo' → desde/hasta null → sin filtro

    // ── Fetch datos ────────────────────────────────────────
    let qOrdenes = '/ordenes?order=creado_en.desc&limit=500';
    if (desde) qOrdenes += `&creado_en=gte.${desde.toISOString()}`;
    if (hasta) qOrdenes += `&creado_en=lte.${hasta.toISOString()}`;

    const [ordenes, etapas, mecanicos] = await Promise.all([
      api(qOrdenes).catch(()=>[]) || [],
      api('/etapas?select=id,orden_id,etapa,servicio,tecnico,mecanico_id,inicio,fin,valor,horas_estimadas&order=creado_en.asc').catch(()=>[]) || [],
      api('/mecanicos?activo=eq.true').catch(()=>[]) || []
    ]);

    if (tipo === 'ordenes') {
      await _generarReporteOrdenes(ordenes, etapas, formato, periodo, desde, hasta);
    } else if (tipo === 'tecnico') {
      const mecId = document.getElementById('rep-sel-tecnico-id')?.value;
      const mec   = mecanicos.find(m => String(m.id) === String(mecId));
      await _generarReporteTecnico(mec, ordenes, etapas, formato);
    } else {
      await _generarReporteTodosTecnicos(mecanicos, ordenes, etapas, formato);
    }

    cerrarModalReporte();
    toast('Reporte generado ✓');
  } catch(e) {
    toast('Error generando reporte: ' + e.message, 'err');
    console.error(e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Generar reporte'; }
  }
}

// ── 1. Reporte de órdenes ────────────────────────────────────
async function _generarReporteOrdenes(ordenes, etapas, formato, periodo, desde, hasta) {
  const rows = ordenes.map(o => {
    const ets   = etapas.filter(e => e.orden_id === o.id);
    const valor = ets.reduce((s,e) => s+(e.valor||0), 0);
    const horas = ets.reduce((s,e) => s+(e.horas_estimadas||0), 0);
    const comp  = ets.filter(e => e.fin).length;
    return {
      'Placa':           o.placa || '—',
      'Propietario':     o.propietario || '—',
      'Marca':           o.marca || '—',
      'Línea':           o.linea || '—',
      'Modelo':          o.modelo || '—',
      'Aseguradora':     o.aseguradora || '—',
      'Tipo cliente':    o.tipo_cliente || '—',
      'Estado':          o.pulmon ? 'En Pulmón' : (o.estado || 'Activa'),
      'Fecha ingreso':   fmtF(o.creado_en),
      'Fecha entrega 1': fmtF(o.fecha_entrega_1),
      'Fecha entrega 2': fmtF(o.fecha_entrega_2),
      'Etapas total':    ets.length,
      'Etapas completadas': comp,
      'Horas estimadas': horas,
      'Valor MO (COP)':  valor,
    };
  });

  const titulo = `Reporte_Ordenes_${_labelPeriodo(periodo, desde)}`;
  if (formato === 'excel') {
    _exportarExcel(rows, titulo, 'Órdenes');
  } else {
    _exportarPDF(rows, titulo, `Reporte de Órdenes — ${_labelPeriodo(periodo, desde)}`, [
      'Placa','Propietario','Estado','Fecha ingreso','Fecha entrega 1','Valor MO (COP)'
    ]);
  }
}

// ── 2. Reporte de un técnico ────────────────────────────────
async function _generarReporteTecnico(mec, ordenes, etapas, formato) {
  if (!mec) { toast('Selecciona un técnico', 'err'); return; }
  const misEtapas = etapas.filter(e => e.mecanico_id === mec.id && e.fin);
  const rows = misEtapas.map(e => {
    const o = ordenes.find(ord => ord.id === e.orden_id) || {};
    const mins = e.inicio && e.fin ? Math.round((new Date(e.fin)-new Date(e.inicio))/60000) : 0;
    return {
      'Placa':           o.placa || '—',
      'Propietario':     o.propietario || '—',
      'Servicio':        CATALOGO[e.servicio]?.nombre || e.servicio || '—',
      'Etapa':           e.etapa || '—',
      'Fecha inicio':    fmtTS(e.inicio),
      'Fecha fin':       fmtTS(e.fin),
      'Horas reales':    +(mins/60).toFixed(2),
      'Horas estimadas': e.horas_estimadas || 0,
      'Valor generado':  e.valor || 0,
    };
  });

  // Totales
  const totalHoras = rows.reduce((s,r)=>s+r['Horas reales'],0).toFixed(2);
  const totalValor = rows.reduce((s,r)=>s+r['Valor generado'],0);
  rows.push({
    'Placa':'TOTAL','Propietario':'','Servicio':'','Etapa':`${rows.length} etapas`,
    'Fecha inicio':'','Fecha fin':'',
    'Horas reales':+totalHoras,'Horas estimadas':'','Valor generado':totalValor
  });

  const titulo = `Reporte_${mec.nombre.replace(/\s+/g,'_')}`;
  if (formato === 'excel') {
    _exportarExcel(rows, titulo, mec.nombre);
  } else {
    _exportarPDF(rows, titulo, `Reporte Técnico — ${mec.nombre}`, [
      'Placa','Servicio','Etapa','Horas reales','Valor generado'
    ]);
  }
}

// ── 3. Reporte todos los técnicos ───────────────────────────
async function _generarReporteTodosTecnicos(mecanicos, ordenes, etapas, formato) {
  const rows = mecanicos.map(m => {
    const misEtapas = etapas.filter(e => e.mecanico_id === m.id && e.fin);
    const mins = misEtapas.reduce((s,e) => {
      if (!e.inicio || !e.fin) return s;
      return s + Math.round((new Date(e.fin)-new Date(e.inicio))/60000);
    }, 0);
    const valor  = misEtapas.reduce((s,e)=>s+(e.valor||0),0);
    const placas = [...new Set(misEtapas.map(e=>{const o=ordenes.find(ord=>ord.id===e.orden_id);return o?.placa||''}))].filter(Boolean);
    return {
      'Nombre':             m.nombre,
      'Cédula':             m.cedula || '—',
      'Rol':                m.rol || 'Técnico',
      'Etapas completadas': misEtapas.length,
      'Órdenes trabajadas': placas.length,
      'Horas totales':      +(mins/60).toFixed(2),
      'Valor generado':     valor,
    };
  });

  const titulo = 'Reporte_General_Tecnicos';
  if (formato === 'excel') {
    _exportarExcel(rows, titulo, 'Técnicos');
  } else {
    _exportarPDF(rows, titulo, 'Reporte General de Técnicos', [
      'Nombre','Cédula','Etapas completadas','Horas totales','Valor generado'
    ]);
  }
}

// ── Exportar Excel (SheetJS) ─────────────────────────────────
function _exportarExcel(rows, nombreArchivo, nombreHoja) {
  if (typeof XLSX === 'undefined') { toast('Librería Excel no cargada', 'err'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja.substring(0,31));

  // Ancho automático de columnas
  const cols = Object.keys(rows[0]||{}).map(k => ({
    wch: Math.max(k.length, ...rows.map(r=>String(r[k]||'').length)) + 2
  }));
  ws['!cols'] = cols;

  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

// ── Exportar PDF (jsPDF + autoTable) ────────────────────────
function _exportarPDF(rows, nombreArchivo, titulo, columnas) {
  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    toast('Librería PDF no cargada', 'err'); return;
  }
  const { jsPDF: PDF } = window.jspdf || {};
  const doc = new (PDF || jsPDF)({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 297, 18, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('Freimanautos — Sistema Operativo', 10, 11);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('es-CO', {dateStyle:'full'}), 297-10, 11, {align:'right'});

  doc.setTextColor(30,58,95);
  doc.setFontSize(13); doc.setFont('helvetica','bold');
  doc.text(titulo, 10, 26);

  // Tabla
  const cols = columnas || Object.keys(rows[0]||{});
  const head = [cols];
  const body = rows.map(r => cols.map(c => {
    const v = r[c];
    if (typeof v === 'number' && c.toLowerCase().includes('valor')) return fmtCOP(v);
    return v != null ? String(v) : '—';
  }));

  doc.autoTable({
    head, body,
    startY: 30,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30,58,95], textColor: 255, fontStyle:'bold' },
    alternateRowStyles: { fillColor: [245,246,248] },
    margin: { left:10, right:10 }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, 297-10, 205, {align:'right'});
  }

  doc.save(`${nombreArchivo}.pdf`);
}

function _labelPeriodo(periodo, desde) {
  if (!desde || periodo === 'todo') return 'Completo';
  if (periodo === 'semana') return `Semana_${desde.toLocaleDateString('es-CO')}`;
  if (periodo === 'mes')    return `${desde.toLocaleDateString('es-CO',{month:'long',year:'numeric'})}`;
  if (periodo === 'ano')    return String(desde.getFullYear());
  return desde.toLocaleDateString('es-CO');
}

// ── Preliquidación ───────────────────────────────────────────
async function generarPreliquidacion(ordenId) {
  try {
    const [orden, etapas, novedades, repSols] = await Promise.all([
      api(`/ordenes?id=eq.${ordenId}`).then(r=>r[0]),
      api(`/etapas?orden_id=eq.${ordenId}&select=*`).catch(()=>[]) || [],
      api(`/novedades?orden_id=eq.${ordenId}&order=creado_en.asc`).catch(()=>[]) || [],
      api(`/repuestos_solicitud?orden_id=eq.${ordenId}&estado=in.(aprobado,enviado,recibido)`).catch(()=>[]) || []
    ]);

    // Repuestos items
    let repItems = [];
    if (repSols.length) {
      const ids = repSols.map(s=>s.id).join(',');
      repItems = await api(`/repuestos_items?solicitud_id=in.(${ids})`).catch(()=>[]) || [];
    }

    const totalMO  = etapas.reduce((s,e)=>s+(e.valor||0),0);
    const totalRep = repItems.reduce((s,i)=>s+((i.precio_lista||0)*(i.cantidad||1)),0);
    const totalGen = totalMO + totalRep;

    // Generar PDF
    const { jsPDF: PDF } = window.jspdf || {};
    const doc = new (PDF || jsPDF)({ unit:'mm', format:'a4' });

    // Header azul
    doc.setFillColor(30,58,95);
    doc.rect(0,0,210,28,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('PRELIQUIDACIÓN', 14, 13);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('Freimanautos — Sistema Operativo', 14, 20);
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 210-14, 20, {align:'right'});

    let y = 36;

    // Info del vehículo / cliente
    doc.setTextColor(30,58,95); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('INFORMACIÓN DE LA ORDEN', 14, y); y+=5;
    doc.setDrawColor(30,58,95); doc.setLineWidth(0.3); doc.line(14,y,196,y); y+=5;

    const infoLeft = [
      ['Placa',      orden.placa||'—'],
      ['Vehículo',   [orden.marca,orden.linea,orden.modelo,orden.color].filter(Boolean).join(' ')||'—'],
      ['Propietario',orden.propietario||'—'],
      ['Aseguradora',orden.aseguradora||'—'],
    ];
    const infoRight = [
      ['Tipo cliente', orden.tipo_cliente||'—'],
      ['Ingreso',      fmtF(orden.creado_en)],
      ['Entrega est.', fmtF(orden.fecha_entrega_1)],
      ['Nivel daño',   orden.nivel_dano||'—'],
    ];
    doc.setFontSize(8); doc.setTextColor(0);
    infoLeft.forEach(([k,v],i) => {
      doc.setFont('helvetica','bold'); doc.text(k+':',14,y+i*6);
      doc.setFont('helvetica','normal'); doc.text(v,50,y+i*6);
    });
    infoRight.forEach(([k,v],i) => {
      doc.setFont('helvetica','bold'); doc.text(k+':',115,y+i*6);
      doc.setFont('helvetica','normal'); doc.text(v,148,y+i*6);
    });
    y += infoLeft.length * 6 + 8;

    // Tabla mano de obra
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,58,95);
    doc.text('MANO DE OBRA', 14, y); y+=3;

    doc.autoTable({
      startY: y,
      head: [['Servicio','Etapa','Técnico','Horas','Valor']],
      body: etapas.filter(e=>e.valor!=null).map(e=>[
        CATALOGO[e.servicio]?.nombre||e.servicio||'—',
        e.etapa||'—',
        e.tecnico||'—',
        e.horas_estimadas!=null ? String(e.horas_estimadas)+'h' : '—',
        fmtCOP(e.valor)
      ]),
      foot: [['','','','SUBTOTAL MO', fmtCOP(totalMO)]],
      styles:{fontSize:8,cellPadding:2.5},
      headStyles:{fillColor:[30,58,95],textColor:255,fontStyle:'bold'},
      footStyles:{fontStyle:'bold',fillColor:[240,244,248]},
      alternateRowStyles:{fillColor:[248,249,251]},
      columnStyles:{4:{halign:'right'},3:{halign:'center'}},
      margin:{left:14,right:14}
    });
    y = doc.lastAutoTable.finalY + 8;

    // Tabla repuestos
    if (repItems.length) {
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,58,95);
      doc.text('REPUESTOS', 14, y); y+=3;
      doc.autoTable({
        startY: y,
        head: [['Descripción','N° Parte','Operación','Cant.','P. Unitario','Total']],
        body: repItems.map(i=>[
          i.descripcion||'—',
          i.numero_parte_oem||'—',
          i.operacion||'—',
          String(i.cantidad||1),
          fmtCOP(i.precio_lista),
          fmtCOP((i.precio_lista||0)*(i.cantidad||1))
        ]),
        foot: [['','','','','SUBTOTAL REP.',fmtCOP(totalRep)]],
        styles:{fontSize:8,cellPadding:2.5},
        headStyles:{fillColor:[30,58,95],textColor:255,fontStyle:'bold'},
        footStyles:{fontStyle:'bold',fillColor:[240,244,248]},
        alternateRowStyles:{fillColor:[248,249,251]},
        columnStyles:{3:{halign:'center'},4:{halign:'right'},5:{halign:'right'}},
        margin:{left:14,right:14}
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Novedades
    if (novedades.length) {
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,58,95);
      doc.text('NOVEDADES / IMPREVISTOS', 14, y); y+=3;
      doc.autoTable({
        startY: y,
        head: [['Tipo','Motivo','Responsable','Valor adicional','Fecha']],
        body: novedades.map(n=>[
          n.tipo||'—', n.motivo||'—', n.responsable||'—',
          n.valor ? fmtCOP(n.valor) : '—',
          fmtTS(n.creado_en)
        ]),
        styles:{fontSize:8,cellPadding:2.5},
        headStyles:{fillColor:[146,64,14],textColor:255,fontStyle:'bold'},
        alternateRowStyles:{fillColor:[255,251,235]},
        margin:{left:14,right:14}
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Total general — caja destacada
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFillColor(30,58,95);
    doc.roundedRect(14, y, 182, 20, 3, 3, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
    doc.setFontSize(10); doc.text('TOTAL GENERAL', 20, y+8);
    doc.setFontSize(14); doc.text(fmtCOP(totalGen), 196, y+12, {align:'right'});
    y+=26;

    // Firma
    doc.setTextColor(100); doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text('Firma cliente: ____________________________', 14, y+10);
    doc.text('Firma taller: ____________________________', 120, y+10);

    doc.save(`Preliquidacion_${orden.placa}_${new Date().toLocaleDateString('es-CO').replace(/\//g,'-')}.pdf`);
    toast(`Preliquidación generada para ${orden.placa} ✓`);
  } catch(e) {
    toast('Error: '+e.message,'err');
    console.error(e);
  }
}
