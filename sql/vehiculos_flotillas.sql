-- ═══════════════════════════════════════════════════════════
-- TABLA VEHICULOS + FLOTILLAS — Freimanautos
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. ASEGURAR COLUMNAS EN flotillas ─────────────────────
ALTER TABLE flotillas
  ADD COLUMN IF NOT EXISTS nombre      TEXT,
  ADD COLUMN IF NOT EXISTS nit         TEXT,
  ADD COLUMN IF NOT EXISTS direccion   TEXT,
  ADD COLUMN IF NOT EXISTS telefono    TEXT,
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS activa      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS creado_en   TIMESTAMPTZ DEFAULT NOW();

-- ── 2. CREAR TABLA VEHICULOS ──────────────────────────────
CREATE TABLE IF NOT EXISTS vehiculos (
  id               BIGSERIAL PRIMARY KEY,
  placa            TEXT NOT NULL,
  marca            TEXT,
  linea            TEXT,
  modelo           TEXT,
  color            TEXT,
  vin              TEXT,
  propietario      TEXT,
  cedula_nit       TEXT,
  telefono         TEXT,
  flotilla_id      BIGINT REFERENCES flotillas(id) ON DELETE SET NULL,
  foto_tarjeta_url TEXT,
  creado_en        TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT vehiculos_placa_unica UNIQUE (placa)
);

CREATE INDEX IF NOT EXISTS vehiculos_placa_idx    ON vehiculos (placa);
CREATE INDEX IF NOT EXISTS vehiculos_flotilla_idx ON vehiculos (flotilla_id);
CREATE INDEX IF NOT EXISTS vehiculos_cedula_idx   ON vehiculos (cedula_nit);

-- Trigger actualizado_en
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_vehiculos_actualizado ON vehiculos;
CREATE TRIGGER trg_vehiculos_actualizado
  BEFORE UPDATE ON vehiculos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ── 3. RLS VEHICULOS ──────────────────────────────────────
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jefe_vehiculos_all"    ON vehiculos;
DROP POLICY IF EXISTS "staff_vehiculos_select" ON vehiculos;
DROP POLICY IF EXISTS "auth_vehiculos_select"  ON vehiculos;

CREATE POLICY "jefe_vehiculos_all" ON vehiculos
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "staff_vehiculos_select" ON vehiculos
  FOR SELECT USING (rol_mecanico() IS NOT NULL);

CREATE POLICY "auth_vehiculos_select" ON vehiculos
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── 4. RLS FLOTILLAS (refresh) ────────────────────────────
ALTER TABLE flotillas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jefe_flotillas_all"    ON flotillas;
DROP POLICY IF EXISTS "auth_flotillas_select" ON flotillas;

CREATE POLICY "jefe_flotillas_all" ON flotillas
  FOR ALL USING (es_jefe()) WITH CHECK (es_jefe());

CREATE POLICY "auth_flotillas_select" ON flotillas
  FOR SELECT USING (auth.role() = 'authenticated');
