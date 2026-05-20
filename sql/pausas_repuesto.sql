-- ═══════════════════════════════════════════════════════════
-- SISTEMA DE PAUSA DE ETAPAS POR SOLICITUD DE REPUESTO
-- Freimanautos — Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. CAMPOS DE PAUSA EN etapas ─────────────────────────
ALTER TABLE etapas
  ADD COLUMN IF NOT EXISTS pausado           BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pausa_inicio      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tiempo_pausado_min INTEGER   DEFAULT 0;

-- ── 2. TIEMPO DE ESPERA EN solicitudes_repuesto ───────────
ALTER TABLE solicitudes_repuesto
  ADD COLUMN IF NOT EXISTS tiempo_espera_min INTEGER;

-- ── 3. ÍNDICE PARA CONSULTAS DE ETAPAS PAUSADAS ──────────
CREATE INDEX IF NOT EXISTS etapas_pausado_idx
  ON etapas (pausado)
  WHERE pausado = TRUE;

-- ── 4. VISTA ÚTIL: etapas actualmente pausadas ───────────
-- (opcional, para reportes futuros)
CREATE OR REPLACE VIEW etapas_en_pausa AS
SELECT
  e.id,
  e.orden_id,
  e.etapa,
  e.mecanico_id,
  e.pausa_inicio,
  e.tiempo_pausado_min,
  EXTRACT(EPOCH FROM (NOW() - e.pausa_inicio)) / 60 AS minutos_pausa_actual,
  o.placa,
  o.propietario
FROM etapas e
JOIN ordenes o ON o.id = e.orden_id
WHERE e.pausado = TRUE AND e.fin IS NULL;
