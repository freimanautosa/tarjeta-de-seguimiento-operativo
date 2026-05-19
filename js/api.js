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
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${safePath}`;
}
