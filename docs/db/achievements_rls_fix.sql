-- ==============================================================================
-- CORRECCIÓN DE RLS: Política de lectura pública para la tabla achievements
-- Ejecutar en el SQL Editor de Supabase.
-- ==============================================================================

-- 1. Habilitar RLS en la tabla achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 2. Política: cualquier usuario autenticado puede leer el catálogo de logros
CREATE POLICY "Public read achievements"
  ON public.achievements
  FOR SELECT
  USING (true);
