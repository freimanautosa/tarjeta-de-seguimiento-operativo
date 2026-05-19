-- ═══════════════════════════════════════════════════════════
-- RLS POLÍTICAS — Freimanautos Sistema Operativo
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════
-- Habilita RLS en todas las tablas y define políticas por perfil.
-- Los perfiles se determinan via JWT (auth.email()) usando el
-- esquema {cedula}@freimanautos.com para clientes, y la tabla
-- mecanicos / configuracion para staff.
-- ═══════════════════════════════════════════════════════════

-- ── 1. HABILITAR RLS EN TODAS LAS TABLAS ──────────────────

ALTER TABLE ordenes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_etapas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_ingreso     ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones_etapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_repuesto ENABLE ROW LEVEL SECURITY;
ALTER TABLE mecanicos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE aseguradoras      ENABLE ROW LEVEL SECURITY;
ALTER TABLE flotillas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion     ENABLE ROW LEVEL SECURITY;

-- ── 2. FUNCIONES HELPER ───────────────────────────────────

-- Extrae la cédula del email JWT (ej: 12345678@freimanautos.com → '12345678')
CREATE OR REPLACE FUNCTION auth_cedula()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT split_part(auth.email(), '@', 1);
$$;

-- Devuelve true si el usuario autenticado es el jefe de taller
CREATE OR REPLACE FUNCTION es_jefe()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM configuracion
    WHERE clave = 'jefe_cedula' AND valor = auth_cedula()
  );
$$;

-- Devuelve el rol del mecánico autenticado (NULL si no es mecánico)
CREATE OR REPLACE FUNCTION rol_mecanico()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT rol FROM mecanicos
  WHERE cedula = auth_cedula() AND activo = true
  LIMIT 1;
$$;

-- Devuelve el id del mecánico autenticado (NULL si no es mecánico)
CREATE OR REPLACE FUNCTION id_mecanico()
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT id FROM mecanicos
  WHERE cedula = auth_cedula() AND activo = true
  LIMIT 1;
$$;

-- Devuelve el id del cliente autenticado (NULL si no es cliente)
CREATE OR REPLACE FUNCTION id_cliente()
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT id FROM clientes
  WHERE cedula_nit = auth_cedula()
  LIMIT 1;
$$;

-- ── 3. ORDENES ────────────────────────────────────────────

-- Jefe: acceso total
CREATE POLICY "jefe_ordenes_all" ON ordenes
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

-- Mecánico: ve todas las órdenes activas (necesita la lista)
CREATE POLICY "mecanico_ordenes_select" ON ordenes
  FOR SELECT USING (rol_mecanico() IN ('mecanico','latoneria','pintura','mecanica','adicionales','taller'));

-- Repuestos: ve todas las órdenes activas
CREATE POLICY "repuestos_ordenes_select" ON ordenes
  FOR SELECT USING (rol_mecanico() = 'repuestos');

-- Cliente: solo ve sus propias órdenes
CREATE POLICY "cliente_ordenes_select" ON ordenes
  FOR SELECT USING (
    cliente_id = id_cliente()
    OR cedula_cliente = auth_cedula()
  );

-- ── 4. ETAPAS ─────────────────────────────────────────────

CREATE POLICY "jefe_etapas_all" ON etapas
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

-- Mecánico: ve y edita sus etapas asignadas
CREATE POLICY "mecanico_etapas_select" ON etapas
  FOR SELECT USING (rol_mecanico() IS NOT NULL);

CREATE POLICY "mecanico_etapas_update" ON etapas
  FOR UPDATE USING (mecanico_id = id_mecanico())
  WITH CHECK (mecanico_id = id_mecanico());

-- Repuestos: solo lectura
CREATE POLICY "repuestos_etapas_select" ON etapas
  FOR SELECT USING (rol_mecanico() = 'repuestos');

-- Cliente: ve las etapas de sus órdenes
CREATE POLICY "cliente_etapas_select" ON etapas
  FOR SELECT USING (
    orden_id IN (
      SELECT id FROM ordenes
      WHERE cliente_id = id_cliente()
         OR cedula_cliente = auth_cedula()
    )
  );

-- ── 5. NOVEDADES ──────────────────────────────────────────

CREATE POLICY "jefe_novedades_all" ON novedades
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "mecanico_novedades_select" ON novedades
  FOR SELECT USING (rol_mecanico() IS NOT NULL);

CREATE POLICY "mecanico_novedades_insert" ON novedades
  FOR INSERT WITH CHECK (rol_mecanico() IS NOT NULL);

CREATE POLICY "cliente_novedades_select" ON novedades
  FOR SELECT USING (
    orden_id IN (
      SELECT id FROM ordenes
      WHERE cliente_id = id_cliente()
         OR cedula_cliente = auth_cedula()
    )
  );

-- ── 6. FOTOS ETAPAS ───────────────────────────────────────

CREATE POLICY "jefe_fotos_etapas_all" ON fotos_etapas
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "mecanico_fotos_etapas_all" ON fotos_etapas
  FOR ALL USING (rol_mecanico() IS NOT NULL)
  WITH CHECK (rol_mecanico() IS NOT NULL);

CREATE POLICY "cliente_fotos_etapas_select" ON fotos_etapas
  FOR SELECT USING (
    orden_id IN (
      SELECT id FROM ordenes
      WHERE cliente_id = id_cliente()
         OR cedula_cliente = auth_cedula()
    )
  );

-- ── 7. FOTOS INGRESO ──────────────────────────────────────

CREATE POLICY "jefe_fotos_ingreso_all" ON fotos_ingreso
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "staff_fotos_ingreso_all" ON fotos_ingreso
  FOR ALL USING (rol_mecanico() IS NOT NULL)
  WITH CHECK (rol_mecanico() IS NOT NULL);

CREATE POLICY "cliente_fotos_ingreso_select" ON fotos_ingreso
  FOR SELECT USING (
    orden_id IN (
      SELECT id FROM ordenes
      WHERE cliente_id = id_cliente()
         OR cedula_cliente = auth_cedula()
    )
  );

-- ── 8. APROBACIONES ETAPA ─────────────────────────────────

CREATE POLICY "jefe_aprobaciones_all" ON aprobaciones_etapa
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "mecanico_aprobaciones_select" ON aprobaciones_etapa
  FOR SELECT USING (rol_mecanico() IS NOT NULL);

-- ── 9. SOLICITUDES REPUESTO ───────────────────────────────

CREATE POLICY "jefe_solicitudes_all" ON solicitudes_repuesto
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "mecanico_solicitudes_all" ON solicitudes_repuesto
  FOR ALL USING (rol_mecanico() IS NOT NULL)
  WITH CHECK (rol_mecanico() IS NOT NULL);

CREATE POLICY "repuestos_solicitudes_all" ON solicitudes_repuesto
  FOR ALL USING (rol_mecanico() = 'repuestos')
  WITH CHECK (rol_mecanico() = 'repuestos');

-- ── 10. MECANICOS ─────────────────────────────────────────

-- Jefe: acceso total
CREATE POLICY "jefe_mecanicos_all" ON mecanicos
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

-- Staff: solo lectura (para poplar selects)
CREATE POLICY "staff_mecanicos_select" ON mecanicos
  FOR SELECT USING (rol_mecanico() IS NOT NULL);

-- Mecánico: puede ver su propio registro
CREATE POLICY "mecanico_propio_select" ON mecanicos
  FOR SELECT USING (cedula = auth_cedula());

-- Login: cualquier usuario autenticado puede leer para detectar perfil
CREATE POLICY "auth_mecanicos_login" ON mecanicos
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 11. CLIENTES ──────────────────────────────────────────

CREATE POLICY "jefe_clientes_all" ON clientes
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "staff_clientes_select" ON clientes
  FOR SELECT USING (rol_mecanico() IS NOT NULL);

-- Cliente: solo su propio registro
CREATE POLICY "cliente_propio" ON clientes
  FOR SELECT USING (cedula_nit = auth_cedula());

-- Login: detectar perfil de cliente
CREATE POLICY "auth_clientes_login" ON clientes
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 12. COTIZACIONES ──────────────────────────────────────

CREATE POLICY "jefe_cotizaciones_all" ON cotizaciones
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "staff_cotizaciones_select" ON cotizaciones
  FOR SELECT USING (rol_mecanico() IS NOT NULL);

-- ── 13. PROVEEDORES ───────────────────────────────────────

CREATE POLICY "jefe_proveedores_all" ON proveedores
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "repuestos_proveedores_all" ON proveedores
  FOR ALL USING (rol_mecanico() = 'repuestos')
  WITH CHECK (rol_mecanico() = 'repuestos');

-- ── 14. ASEGURADORAS Y FLOTILLAS ──────────────────────────

CREATE POLICY "jefe_aseguradoras_all" ON aseguradoras
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "auth_aseguradoras_select" ON aseguradoras
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "jefe_flotillas_all" ON flotillas
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "auth_flotillas_select" ON flotillas
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 15. CONFIGURACION ─────────────────────────────────────

-- Solo el jefe puede modificar; cualquier autenticado puede leer
-- (necesario para detectar perfil en el login)
CREATE POLICY "jefe_configuracion_all" ON configuracion
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "auth_configuracion_select" ON configuracion
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 16. STORAGE (Storage Policies — ejecutar separado si es necesario) ──
-- Las políticas de storage se configuran en el dashboard de Supabase
-- en Storage > Policies, o con la siguiente sintaxis:
--
-- INSERT INTO storage.policies (name, bucket_id, operation, definition)
-- VALUES
--   ('staff_upload', 'fotos', 'INSERT',
--    '(auth.role() = ''authenticated'' AND (
--      EXISTS(SELECT 1 FROM mecanicos WHERE cedula=split_part(auth.email(),''@'',1) AND activo=true)
--      OR EXISTS(SELECT 1 FROM configuracion WHERE clave=''jefe_cedula'' AND valor=split_part(auth.email(),''@'',1))
--    ))'),
--   ('auth_read', 'fotos', 'SELECT', '(auth.role() = ''authenticated'')'),
--   ('staff_delete', 'fotos', 'DELETE',
--    '(auth.role() = ''authenticated'' AND (
--      EXISTS(SELECT 1 FROM mecanicos WHERE cedula=split_part(auth.email(),''@'',1) AND activo=true)
--      OR EXISTS(SELECT 1 FROM configuracion WHERE clave=''jefe_cedula'' AND valor=split_part(auth.email(),''@'',1))
--    ))');
