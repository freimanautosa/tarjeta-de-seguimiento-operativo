-- ═══════════════════════════════════════════════════════════
-- TIEMPO EN PULMÓN — Historial completo de pausas
-- Freimanautos — Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. CAMPO PULMON_FIN en ordenes ────────────────────────
-- Registra cuándo salió del pulmón (antes se borraba pulmon_desde)
ALTER TABLE ordenes
  ADD COLUMN IF NOT EXISTS pulmon_fin TIMESTAMPTZ;

-- ── 2. VISTA ÚTIL — tiempos de pulmón históricos ──────────
CREATE OR REPLACE VIEW ordenes_historial_pulmon AS
SELECT
  o.id,
  o.placa,
  o.propietario,
  o.aseguradora,
  o.tipo_cliente,
  o.pulmon_tipo,
  o.pulmon_desde,
  o.pulmon_fin,
  CASE
    WHEN o.pulmon_fin IS NOT NULL AND o.pulmon_desde IS NOT NULL
      THEN ROUND(EXTRACT(EPOCH FROM (o.pulmon_fin - o.pulmon_desde)) / 3600.0, 2)
    WHEN o.pulmon = TRUE AND o.pulmon_desde IS NOT NULL
      THEN ROUND(EXTRACT(EPOCH FROM (NOW() - o.pulmon_desde)) / 3600.0, 2)
    ELSE NULL
  END AS horas_en_pulmon,
  o.pulmon AS actualmente_en_pulmon,
  o.creado_en
FROM ordenes o
WHERE o.pulmon_desde IS NOT NULL;
