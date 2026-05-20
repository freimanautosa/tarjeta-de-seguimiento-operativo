// ═══════════════════════════════════════════════════════════
// INICIALIZACIÓN Y NAVEGACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════

function montarApp() {
  document.getElementById('pantalla-login').style.display = 'none';
  document.getElementById('app').classList.add('show');

  const rolLabels = {
    jefe:      'Jefe de Taller',
    mecanico:  'Mecánico',
    taller:    'Pantalla Taller',
    repuestos: 'Repuestos',
    cliente:   'Cliente'
  };

  document.getElementById('sb-nombre').textContent = sesion.nombre;
  document.getElementById('sb-avatar').innerHTML = '<img src="icons/logoFreimanpfp.png" style="width:100%;height:100%;object-fit:contain;border-radius:50%">';
  document.getElementById('sb-rol').textContent = rolLabels[sesion.perfil] || sesion.perfil;

  const capEl = document.getElementById('sidebar-capacidad');
  if (capEl) capEl.style.display = sesion.perfil === 'jefe' ? 'block' : 'none';

  switch (sesion.perfil) {
    case 'jefe':      montarJefe();      break;
    case 'mecanico':  montarMecanico();  break;
    case 'taller':    montarTaller();    break;
    case 'repuestos': montarRepuestos(); break;
    default:          montarCliente();   break;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Si la URL tiene ?view=monitor, montar el monitor sin login
  if (typeof esVistaMonitor === 'function' && esVistaMonitor()) {
    if (typeof montarMonitor === 'function') montarMonitor();
    return;
  }

  checkSesionGuardada();
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target === this) cerrarLightbox();
    });
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.warn('Error al registrar Service Worker:', err));
  });
}