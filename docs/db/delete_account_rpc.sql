-- ==============================================================================
-- FUNCIÓN PARA BORRADO DE CUENTA (RPC)
-- Ejecutar en el SQL Editor de Supabase.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void AS $$
BEGIN
  -- Borrar el usuario de la tabla de autenticación de Supabase
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
