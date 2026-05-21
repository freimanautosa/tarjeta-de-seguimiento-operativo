// ═══════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════
let sesion = null;

// Cambiar a true DESPUÉS de crear todos los usuarios en Supabase Auth.
// Con true: solo 'taller' puede entrar sin Supabase Auth.
// Con false: todos pueden entrar con login legacy (modo transición).
const MODO_ESTRICTO_AUTH = true;

// Helper: true si el usuario logueado tiene permisos de administración del taller
function esJefe() { return sesion?.perfil === 'jefe' || sesion?.perfil === 'gerente'; }

let mecanicos = [];
let ordenActual = null;
let filtroEstado = 'Activa';
let modalOrdenId = null;
let srvSeleccionados = [];
let modalPaso = 1;
let fotosIngresoPendientes = [];
let aprobEtapaId = null;
let todasCotizaciones = [];

const CATALOGO = {
  latoneria: {
    nombre: 'Latonería', clase: 'latoneria',
    etapas: [
      { key: 'lat_desarmado', nombre: 'Desarmado / Armado' },
      { key: 'lat_tapiceria', nombre: 'Tapicería' },
      { key: 'lat_latoneria', nombre: 'Latonería' },
      { key: 'lat_blindaje',  nombre: 'Blindaje' },
      { key: 'lat_vidrieria', nombre: 'Vidriería' },
      { key: 'lat_alistador', nombre: 'Alistador' },
      { key: 'lat_tot',       nombre: 'T.O.T', tot: true },
    ]
  },




  pintura: {
    nombre: 'Pintura', clase: 'pintura',
    etapas: [
      { key: 'pin_alistador', nombre: 'Alistador' },
      { key: 'pin_pintor',    nombre: 'Pintor' },
      { key: 'pin_tot',       nombre: 'T.O.T', tot: true },
    ]
  },
  mecanica: {
    nombre: 'Mecánica', clase: 'mecanica',
    etapas: [
      { key: 'mec_mecanica',  nombre: 'Mecánica' },
      { key: 'mec_electrica', nombre: 'Eléctrica' },
      { key: 'mec_tot',       nombre: 'T.O.T', tot: true },
    ]
  },
  adicionales: {
    nombre: 'Adicionales', clase: 'adicionales',
    etapas: [
      { key: 'adi_polarizados', nombre: 'Polarizados' },
      { key: 'adi_radio',       nombre: 'Radio' },
      { key: 'adi_lavado',      nombre: 'Lavado' },
      { key: 'adi_tot',         nombre: 'T.O.T', tot: true },
      { key: 'adi_otro',        nombre: 'Otro', otro: true },
    ]
  }
};

const INV_LABELS = {
  llantas: '4 Llantas', llanta_repuesto: 'Llanta repuesto', gato: 'Gato',
  radio: 'Radio/Pantalla', documentos: 'Documentos', tapetes: 'Tapetes',
  herramientas: 'Herramientas', extintor: 'Extintor'
};

const CAPACIDAD_TALLER = 34;