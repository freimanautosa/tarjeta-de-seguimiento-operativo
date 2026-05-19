// ═══════════════════════════════════════════════════════════
// CONEXIÓN A SUPABASE
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://xjavnpwuhpmvpjdbjdeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYXZucHd1aHBtdnBqZGJqZGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Njc5MDcsImV4cCI6MjA5MjQ0MzkwN30.07f6cGVrFhtm-B-I7iBLaHnPSuozFDpEf9vOHrliGRs';
const BUCKET = 'fotos-etapas';
const N8N_WEBHOOK = 'https://automatizacionesfreimanautos-n8n.qs0sgf.easypanel.host/webhook/notificar-etapa';
const API_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
]);

function validarApiPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\r\n]/.test(path)) {
    throw new Error('Ruta de API invalida');
  }
  return path;
}

function extensionSegura(file) {
  const porMime = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf'
  };
  return porMime[file.type] || '';
}

function validarArchivo(file) {
  if (!file) throw new Error('Archivo invalido');
  if (!ALLOWED_UPLOAD_MIME.has(file.type)) throw new Error('Tipo de archivo no permitido');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Archivo demasiado grande. Maximo 10 MB');
}

function normalizarStoragePath(file, path) {
  const ext = extensionSegura(file);
  if (!ext) throw new Error('Extension de archivo no permitida');
  const limpio = String(path || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map(p => p.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/');
  if (!limpio || limpio.includes('..')) throw new Error('Ruta de archivo invalida');
  return limpio.replace(/\.[^.\/]+$/, `.${ext}`);
}

async function api(path, method = 'GET', body = null, extra = {}) {
  const verb = String(method || 'GET').toUpperCase();
  if (!API_METHODS.has(verb)) throw new Error('Metodo no permitido');
  const opts = {
    method: verb,
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, ...extra }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL + '/rest/v1' + validarApiPath(path), opts);
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || res.statusText); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function storageUpload(file, path) {
  validarArchivo(file);
  const safePath = normalizarStoragePath(file, path);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(BUCKET)}/${safePath}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type, 'x-upsert': 'true' },
    body: file
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Error subiendo foto'); }
<<<<<<< HEAD
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function formatoDuracionMinutos(mins) {
  if (!mins || mins <= 0) return 'Sin historico';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function promedioServicio(servicio) {
  if (!servicio) return { minutos: null, texto: 'Sin historico', muestras: 0 };
  const etapas = await api(`/etapas?servicio=eq.${servicio}&inicio=not.is.null&fin=not.is.null&select=inicio,fin`).catch(() => []) || [];
  const tiempos = etapas
    .map(e => Math.round((new Date(e.fin) - new Date(e.inicio)) / 60000))
    .filter(mins => mins > 0);
  if (!tiempos.length) return { minutos: null, texto: 'Sin historico', muestras: 0 };
  const minutos = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
  return { minutos, texto: formatoDuracionMinutos(minutos), muestras: tiempos.length };
}

async function notificarEtapaIniciada(eid, inicioISO, ordenFallback = null) {
  const etapa = await api(`/etapas?id=eq.${eid}&select=id,orden_id,etapa,servicio,etapa_key,mecanico_id,tecnico,inicio,horas_estimadas`)
    .then(d => d?.[0])
    .catch(() => null);
  if (!etapa) return;

  const orden = ordenFallback || await api(`/ordenes?id=eq.${etapa.orden_id}`)
    .then(d => d?.[0])
    .catch(() => ({}));
  const prom = await promedioServicio(etapa.servicio);
  const servicioNombre = CATALOGO[etapa.servicio]?.nombre || etapa.servicio || 'Sin servicio';

  fetch(N8N_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evento: 'etapa_iniciada',
      destino: 'grupo_taller',
      orden: {
        id: orden?.id || etapa.orden_id,
        placa: orden?.placa,
        propietario: orden?.propietario,
        marca: orden?.marca,
        linea: orden?.linea,
        modelo: orden?.modelo,
        color: orden?.color,
        aseguradora: orden?.aseguradora,
        fecha_entrega_1: orden?.fecha_entrega_1,
        nivel_dano: orden?.nivel_dano
      },
      etapa_iniciada: {
        id: etapa.id,
        nombre: etapa.etapa,
        servicio: etapa.servicio,
        servicio_nombre: servicioNombre,
        tecnico: etapa.tecnico,
        mecanico_id: etapa.mecanico_id,
        hora_inicio: inicioISO,
        horas_estimadas: etapa.horas_estimadas || null
      },
      promedio_servicio: {
        servicio: etapa.servicio,
        nombre: servicioNombre,
        minutos: prom.minutos,
        texto: prom.texto,
        muestras: prom.muestras
      },
      link: `${window.location.origin}${window.location.pathname}`
    })
  }).catch(() => {});
=======
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${safePath}`;
>>>>>>> 358993382b52985b1e102fbbec9d72915dea36ec
}
