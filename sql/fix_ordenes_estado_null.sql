-- ═══════════════════════════════════════════════════════════
-- FIX: Normalizar estado y pulmon NULL en tabla ordenes
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════

-- 1. Ver cuántas órdenes tienen estado NULL (diagnóstico)
SELECT
  estado,
  pulmon,
  COUNT(*) as total
FROM ordenes
GROUP BY estado, pulmon
ORDER BY total DESC;

-- ─────────────────────────────────────────────────────────────
-- 2. Asignar 'Activa' a todas las órdenes sin estado
-- ─────────────────────────────────────────────────────────────
UPDATE ordenes
SET estado = 'Activa'
WHERE estado IS NULL;

-- 3. Asignar false a pulmon NULL
UPDATE ordenes
SET pulmon = false
WHERE pulmon IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. Agregar valores por defecto en la columna para nuevas filas
-- ─────────────────────────────────────────────────────────────
ALTER TABLE ordenes
  ALTER COLUMN estado SET DEFAULT 'Activa';

ALTER TABLE ordenes
  ALTER COLUMN pulmon SET DEFAULT false;

-- 5. Verificar resultado
SELECT
  estado,
  pulmon,
  COUNT(*) as total
FROM ordenes
GROUP BY estado, pulmon
ORDER BY total DESC;
