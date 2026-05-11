// ═══════════════════════════════════════════════════════════
// DASHBOARD DE METAS — Tab "Metas"
// El contador sube un CSV mensual con la meta.
// Formato esperado del CSV:
//   mes,ano,meta_ordenes,meta_ingresos,nota
//   Mayo,2026,45,85000000,Meta conservadora Q2
// ═══════════════════════════════════════════════════════════

let _metasData = []; // Cache en memoria de la sesión

async function cargarDashboardMetas() {
  const cont = document.getElementById('dash-metas-contenido');
  if (!cont) return;
  cont.innerHTML = '<div class="loading-state">Cargando metas...</div>';

  try {
    // Leer metas guardadas en Supabase (tabla: metas_taller)
    const metas = await api('/metas_taller?order=ano.desc,mes_num.desc&limit=24').catch(()=>[]) || [];
    _metasData = metas;

    // Leer órdenes entregadas del mes actual para comparar
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
    const [ordenesEnt, etapasMes] = await Promise.all([
      api(`/ordenes?estado=eq.Entregada&creado_en=gte.${inicioMes}&select=id,placa,creado_en`).catch(()=>[]) || [],
      api(`/etapas?fin=gte.${inicioMes}&select=orden_id,valor&fin=not.is.null`).catch(()=>[]) || []
    ]);

    const ingresosMes = etapasMes.reduce((s,e)=>s+(e.valor||0), 0);
    const ordenesMes  = ordenesEnt.length;

    // Meta del mes actual
    const mesActual = ahora.toLocaleDateString('es-CO',{month:'long'});
    const metaMes = metas.find(m =>
      m.ano === ahora.getFullYear() &&
      (m.mes_num === ahora.getMonth()+1 || m.mes?.toLowerCase() === mesActual.toLowerCase())
    );

    const fmt = n => n!=null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n) : '—';
    const pct = (real, meta) => meta > 0 ? Math.min(Math.round((real/meta)*100), 999) : 0;

    // KPIs mes actual
    const pctOrd = metaMes ? pct(ordenesMes, metaMes.meta_ordenes) : null;
    const pctIng = metaMes ? pct(ingresosMes, metaMes.meta_ingresos) : null;
    const colorBar = p => p >= 100 ? '#059669' : p >= 70 ? '#D97706' : '#DC2626';

    const kpisHtml = metaMes ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#EBF2FF;color:#2563EB">
            <svg width="22" height="22" fill="none" stroke="#2563EB" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/></svg>
          </div>
          <div class="dash-card-val" style="color:var(--azul)">${ordenesMes} <span style="font-size:14px;color:var(--gris-mid)">/ ${metaMes.meta_ordenes}</span></div>
          <div class="dash-card-label">Órdenes cerradas este mes</div>
          <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
              <span style="color:var(--gris-mid)">Progreso</span>
              <span style="font-weight:700;color:${colorBar(pctOrd)}">${pctOrd}%</span>
            </div>
            <div style="height:8px;background:var(--gris-borde);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${Math.min(pctOrd,100)}%;background:${colorBar(pctOrd)};border-radius:99px;transition:width 0.6s"></div>
            </div>
          </div>
        </div>
        <div class="dash-card">
          <div class="dash-card-icon" style="background:#E6F5EF;color:#059669">
            <svg width="22" height="22" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="dash-card-val" style="color:var(--verde);font-size:18px">${fmt(ingresosMes)}</div>
          <div class="dash-card-label">Ingresos este mes</div>
          <div style="margin-top:4px;font-size:11px;color:var(--gris-mid)">Meta: ${fmt(metaMes.meta_ingresos)}</div>
          <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
              <span style="color:var(--gris-mid)">Progreso</span>
              <span style="font-weight:700;color:${colorBar(pctIng)}">${pctIng}%</span>
            </div>
            <div style="height:8px;background:var(--gris-borde);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${Math.min(pctIng,100)}%;background:${colorBar(pctIng)};border-radius:99px;transition:width 0.6s"></div>
            </div>
          </div>
        </div>
      </div>
      ${metaMes.nota ? `<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;font-size:13px;color:#92400E;margin-bottom:20px"><strong>Nota del contador:</strong> ${metaMes.nota}</div>` : ''}
    ` : `<div style="background:var(--gris-bg);border:1px dashed var(--gris-borde);border-radius:8px;padding:20px;text-align:center;color:var(--gris-mid);margin-bottom:20px;font-size:13px">
      No hay meta cargada para este mes. Sube el CSV del contador abajo.
    </div>`;

    // Historial de metas
    const historialHtml = metas.length ? `
      <div class="dash-panel" style="margin-bottom:20px">
        <div class="dash-panel-titulo">Historial de metas</div>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px">
          <thead>
            <tr style="background:var(--gris-bg);border-bottom:1px solid var(--gris-borde)">
              <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Período</th>
              <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Meta órdenes</th>
              <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Meta ingresos</th>
              <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--gris-mid);text-transform:uppercase">Nota</th>
            </tr>
          </thead>
          <tbody>
            ${metas.map(m=>`
              <tr style="border-bottom:1px solid var(--gris-borde)">
                <td style="padding:8px 12px;font-weight:600">${m.mes} ${m.ano}</td>
                <td style="padding:8px 12px;text-align:right">${m.meta_ordenes}</td>
                <td style="padding:8px 12px;text-align:right;font-family:'DM Mono',monospace">${fmt(m.meta_ingresos)}</td>
                <td style="padding:8px 12px;color:var(--gris-mid);font-size:12px">${m.nota||'—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    // Uploader CSV
    const uploaderHtml = `
      <div class="dash-panel">
        <div class="dash-panel-titulo">Cargar meta mensual (CSV del contador)</div>
        <div style="margin-top:12px;font-size:12px;color:var(--gris-mid);margin-bottom:10px">
          Formato esperado del CSV: <code style="background:var(--gris-bg);padding:2px 6px;border-radius:4px">mes,ano,meta_ordenes,meta_ingresos,nota</code>
        </div>
        <div class="upload-zone" onclick="document.getElementById('csv-meta-input').click()" style="padding:20px">
          <input type="file" id="csv-meta-input" accept=".csv" style="display:none" onchange="procesarCSVMeta(this)">
          <svg width="24" height="24" fill="none" stroke="var(--gris-mid)" stroke-width="1.5" viewBox="0 0 24 24" style="display:block;margin:0 auto 8px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p style="margin:0;font-size:13px;color:var(--gris-mid)">Clic para subir CSV de metas</p>
        </div>
      </div>`;

    cont.innerHTML = `
      <div style="margin-bottom:16px">
        <div style="font-size:18px;font-weight:700;color:var(--texto);margin-bottom:4px">
          ${mesActual.charAt(0).toUpperCase()+mesActual.slice(1)} ${ahora.getFullYear()}
        </div>
        <div style="font-size:13px;color:var(--gris-mid)">Seguimiento de metas según análisis del contador</div>
      </div>
      ${kpisHtml}
      ${historialHtml}
      ${uploaderHtml}
    `;
  } catch(e) {
    cont.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`;
  }
}

async function procesarCSVMeta(input) {
  const file = input.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.trim().split('\n').filter(l=>l.trim());
  const headers = lines[0].split(',').map(h=>h.trim().toLowerCase());

  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v=>v.trim());
    const obj = {};
    headers.forEach((h,i)=>obj[h]=vals[i]||'');
    return obj;
  }).filter(r=>r.mes&&r.ano);

  if (!rows.length) { toast('CSV vacío o formato incorrecto','err'); return; }

  const mesesMap = {
    enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,
    julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12
  };

  try {
    for (const r of rows) {
      const mesNum = mesesMap[r.mes?.toLowerCase()] || parseInt(r.mes_num||r.mes) || null;
      await api('/metas_taller', 'POST', {
        mes:       r.mes,
        mes_num:   mesNum,
        ano:       parseInt(r.ano),
        meta_ordenes:  parseInt(r.meta_ordenes)||0,
        meta_ingresos: parseFloat(r.meta_ingresos)||0,
        nota:      r.nota || null
      }, { Prefer:'resolution=merge-duplicates,return=minimal' });
    }
    toast(`${rows.length} meta(s) cargada(s) ✓`);
    input.value = '';
    cargarDashboardMetas();
  } catch(e) {
    toast('Error guardando metas: '+e.message,'err');
  }
}
