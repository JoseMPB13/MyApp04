-- ==============================================================================
-- LOGROS DE GAMIFICACIÓN (SEMILLA)
-- Ejecutar en el SQL Editor de Supabase para poblar el catálogo de logros.
-- ==============================================================================

INSERT INTO public.achievements (id, name, description, icon, exp_reward) VALUES
  -- Categoría: Rachas (Streaks)
  ('streak_1', 'Racha Inicial', '¡Completaste tu primer día de racha!', 'flame', 50),
  ('streak_3', 'Constancia', 'Mantén una racha de 3 días seguidos', 'flame', 100),
  ('streak_7', 'Imparable', 'Mantén una racha de 7 días seguidos', 'flame', 300),
  ('streak_30', 'Maestro del Hábito', 'Mantén una racha de 30 días seguidos', 'flame', 1000),

  -- Categoría: Misiones (Missions)
  ('mission_1', 'Primer Paso', 'Completa tu primera misión en la app', 'star', 50),
  ('mission_10', 'Aprendiz', 'Completa 10 misiones en total', 'star', 150),
  ('mission_50', 'Estudiante Dedicado', 'Completa 50 misiones en total', 'star', 500),
  ('mission_100', 'Leyenda', 'Completa 100 misiones en total', 'star', 1500),

  -- Categoría: Baúl (Vault)
  ('vault_1', 'Curioso', 'Guarda tu primera palabra en el baúl', 'archive', 25),
  ('vault_10', 'Coleccionista', 'Guarda 10 palabras en tu baúl', 'archive', 100),
  ('vault_50', 'Bibliotecario', 'Guarda 50 palabras en tu baúl', 'archive', 400),
  ('vault_100', 'Diccionario Andante', 'Guarda 100 palabras en tu baúl', 'archive', 1000),

  -- Categoría: Maestría (Mastery)
  ('master_1', 'Primera Victoria', 'Domina tu primera palabra (marca verde)', 'trophy', 50),
  ('master_10', 'Dominador', 'Domina 10 palabras del baúl', 'trophy', 200),
  ('master_50', 'Erudito', 'Domina 50 palabras del baúl', 'trophy', 800)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  exp_reward = EXCLUDED.exp_reward;
