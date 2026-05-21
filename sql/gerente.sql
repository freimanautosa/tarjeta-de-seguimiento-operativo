-- ═══════════════════════════════════════════════════════════
-- GERENTE GENERAL — Configuración y gestión de contraseñas
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════

-- 1. Registrar al gerente en la tabla de configuración
--    Reemplaza '' con tu número de cédula y tu nombre
INSERT INTO configuracion (clave, valor) VALUES
  ('gerente_cedula', ''),       -- ← Pon aquí tu cédula
  ('gerente_nombre', 'Gerente General')  -- ← Pon aquí tu nombre
ON CONFLICT (clave) DO NOTHING;

-- Para actualizar si ya existen los registros:
-- UPDATE configuracion SET valor = 'TU_CEDULA' WHERE clave = 'gerente_cedula';
-- UPDATE configuracion SET valor = 'Tu Nombre' WHERE clave = 'gerente_nombre';


-- ═══════════════════════════════════════════════════════════
-- 2. Función para cambiar contraseñas (solo jefe/gerente)
--    Llamada desde el frontend vía PostgREST /rpc/admin_cambiar_contrasena
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_cambiar_contrasena(
  p_target_cedula TEXT,
  p_nueva_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_email    TEXT;
  v_caller_cedula   TEXT;
  v_jefe_cedula     TEXT;
  v_gerente_cedula  TEXT;
  v_es_admin        BOOLEAN := FALSE;
  v_target_id       UUID;
BEGIN
  -- Obtener la cédula del usuario que hace la llamada desde su JWT
  SELECT email INTO v_caller_email
  FROM auth.users WHERE id = auth.uid();

  v_caller_cedula := REPLACE(v_caller_email, '@freimanautos.com', '');

  -- Verificar si es jefe o gerente
  SELECT valor INTO v_jefe_cedula    FROM configuracion WHERE clave = 'jefe_cedula';
  SELECT valor INTO v_gerente_cedula FROM configuracion WHERE clave = 'gerente_cedula';

  IF v_caller_cedula = v_jefe_cedula OR v_caller_cedula = v_gerente_cedula THEN
    v_es_admin := TRUE;
  END IF;

  IF NOT v_es_admin THEN
    RAISE EXCEPTION 'No autorizado para cambiar contraseñas';
  END IF;

  -- El jefe NO puede cambiar la contraseña del gerente
  IF v_caller_cedula = v_jefe_cedula AND p_target_cedula = v_gerente_cedula THEN
    RAISE EXCEPTION 'El jefe no puede modificar la contraseña del gerente';
  END IF;

  -- Buscar el usuario en Supabase Auth
  SELECT id INTO v_target_id
  FROM auth.users
  WHERE email = p_target_cedula || '@freimanautos.com';

  IF v_target_id IS NULL THEN
    -- Usuario no existe aún en Auth, no es error crítico
    RETURN FALSE;
  END IF;

  -- Actualizar la contraseña
  UPDATE auth.users
  SET encrypted_password = crypt(p_nueva_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_target_id;

  RETURN TRUE;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION admin_cambiar_contrasena(TEXT, TEXT) TO authenticated;
