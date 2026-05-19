// ═══════════════════════════════════════════════════════════
// AUTENTICACIÓN Y SESIÓN
// ═══════════════════════════════════════════════════════════

// Perfiles que requieren Supabase Auth una vez que estén migrados.
// 'taller' queda EXCLUIDO — es la pantalla de TV del taller, siempre abierta.
const PERFILES_CON_AUTH = new Set(['jefe', 'mecanico', 'repuestos', 'cliente']);

async function doLogin() {
  const cedula = document.getElementById('login-cedula').value.trim();
  if (!cedula) { mostrarErrorLogin('Ingresa tu número de cédula.'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Verificando...';
  document.getElementById('login-error').classList.remove('show');

  try {
    // ── Intento 1: Supabase Auth (usuarios ya migrados) ───────────────
    const authData = await supabaseLogin(cedula);

    if (authData?.access_token) {
      // Usar el JWT real para detectar el perfil
      sesion = { access_token: authData.access_token };
      const perfil = await detectarPerfil(cedula);
      if (perfil) {
        iniciarSesion({
          ...perfil,
          cedula,
          access_token:  authData.access_token,
          refresh_token: authData.refresh_token,
          expires_at:    Date.now() + (authData.expires_in ?? 3600) * 1000
        });
        return;
      }
      sesion = null;
    }

    // ── Intento 2: login legacy ───────────────────────────────────────
    const perfil = await detectarPerfil(cedula);

    if (perfil) {
      if (perfil.perfil === 'taller') {
        // Taller siempre entra sin Auth — es la pantalla TV del taller
        iniciarSesion({ ...perfil, cedula });
        return;
      }

      if (perfil.perfil === 'cliente') {
        // Auto-crear cuenta de Auth la primera vez que un cliente ingresa.
        // Si ya existe, supabaseSignUp falla silenciosamente — está bien.
        // La próxima vez que ingrese, supabaseLogin (intento 1) lo capturará.
        supabaseSignUp(cedula).catch(() => {});

        if (MODO_ESTRICTO_AUTH) {
          // Con modo estricto activo, el cliente debe usar Supabase Auth.
          mostrarErrorLogin('Acceso no autorizado. Vuelve a intentarlo en un momento.');
          return;
        }

        iniciarSesion({ ...perfil, cedula });
        return;
      }

      if (MODO_ESTRICTO_AUTH) {
        // Jefe / mecánicos / repuestos deben usar Supabase Auth
        mostrarErrorLogin('Credenciales incorrectas. Contacta al administrador del taller.');
        return;
      }

      // Modo transición: staff aún no migrado puede seguir entrando
      iniciarSesion({ ...perfil, cedula });
      return;
    }

    mostrarErrorLogin('No encontramos ninguna cuenta con esa cédula. Contacta al taller.');
  } catch(e) {
    sesion = null;
    mostrarErrorLogin('Error de conexión. Intenta de nuevo.');
    console.error(e);
  } finally {
    btn.disabled = false; btn.textContent = 'Ingresar';
  }
}

// Determina perfil y datos del usuario a partir de la cédula
async function detectarPerfil(cedula) {
  const config = await api(`/configuracion?clave=eq.jefe_cedula`);
  if (config?.[0]?.valor === cedula) {
    const nombreJefe = (await api(`/configuracion?clave=eq.jefe_nombre`))?.[0]?.valor || 'Jefe de Taller';
    return { perfil: 'jefe', nombre: nombreJefe, id: null };
  }

  const mecs = await api(`/mecanicos?cedula=eq.${cedula}&activo=eq.true`);
  if (mecs?.length) {
    const rol = mecs[0].rol || '';
    const perfil = rol === 'taller' ? 'taller' : rol === 'repuestos' ? 'repuestos' : 'mecanico';
    return { perfil, nombre: mecs[0].nombre, id: mecs[0].id, datos: mecs[0] };
  }

  const clientes = await api(`/clientes?cedula_nit=eq.${cedula}`);
  if (clientes?.length) {
    return { perfil: 'cliente', nombre: clientes[0].nombre || 'Cliente', id: clientes[0].id, datos: clientes[0] };
  }

  return null;
}

function mostrarErrorLogin(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg; el.classList.add('show');
}

function iniciarSesion(datos) {
  sesion = datos;
  sessionStorage.setItem('sesion_freiman', JSON.stringify(datos));
  montarApp();
}

async function logout() {
  if (sesion?.access_token) await supabaseSignOut(sesion.access_token);
  sessionStorage.removeItem('sesion_freiman');
  sesion = null;
  document.getElementById('app').classList.remove('show');
  document.getElementById('pantalla-login').style.display = 'flex';
  document.getElementById('login-cedula').value = '';
  document.getElementById('login-error').classList.remove('show');
}

async function checkSesionGuardada() {
  try {
    const s = sessionStorage.getItem('sesion_freiman');
    if (!s) return;
    sesion = JSON.parse(s);

    // Renovar token si le quedan menos de 5 minutos de vida
    if (sesion.refresh_token && sesion.expires_at) {
      const minutosRestantes = (sesion.expires_at - Date.now()) / 60000;
      if (minutosRestantes < 5) {
        const ok = await refrescarToken();
        if (!ok) { await logout(); return; }
      }
    }

    montarApp();
  } catch(e) {
    sessionStorage.removeItem('sesion_freiman');
  }
}

async function refrescarToken() {
  if (!sesion?.refresh_token) return false;
  const data = await supabaseRefreshToken(sesion.refresh_token);
  if (!data?.access_token) return false;
  sesion.access_token  = data.access_token;
  sesion.refresh_token = data.refresh_token;
  sesion.expires_at    = Date.now() + (data.expires_in ?? 3600) * 1000;
  sessionStorage.setItem('sesion_freiman', JSON.stringify(sesion));
  return true;
}
