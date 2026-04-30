-- ==============================================================================
-- SCRIPT MAESTRO DE INICIALIZACIÓN: LyricLearn / MyApp04 (Supabase)
-- Versión: 3.0 (Optimizada para Producción)
-- Mejoras: Triggers de actualización, RLS corregido para INSERTS, Seed Data temático.
-- ==============================================================================

-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. FUNCIONES AUTOMÁTICAS (Triggers base)
-- ==========================================

-- Función maestra para actualizar la columna updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- 3. ESTRUCTURA DE USUARIO Y PERFILES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'es',
  is_premium BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_exp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  lifetime_xp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_progress BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  last_completion_date DATE,
  completed_dates TEXT[] DEFAULT '{}', -- Registro estricto 'YYYY-MM-DD' local
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_updated_at_streaks BEFORE UPDATE ON public.user_streaks FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- ==========================================
-- 4. APRENDIZAJE Y VOCABULARIO
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_vault (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_es TEXT NOT NULL,
  word_en TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  status TEXT CHECK (status IN ('learning', 'mastered')) DEFAULT 'learning',
  mastery_percent INTEGER DEFAULT 0 CHECK (mastery_percent >= 0 AND mastery_percent <= 100),
  difficulty_score FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_vault_user_word ON public.user_vault(user_id, word_en);
CREATE TRIGGER set_updated_at_vault BEFORE UPDATE ON public.user_vault FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.vocabulary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme TEXT NOT NULL,
  word_es TEXT NOT NULL,
  word_en TEXT NOT NULL,
  difficulty TEXT DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true
);


-- ==========================================
-- 5. INTERACCIÓN Y GAMIFICACIÓN
-- ==========================================

CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  scenario_id TEXT,
  feedback JSONB, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mission_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL,
  exp_gained INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  exp_reward INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);


-- ==========================================
-- 6. SEGURIDAD (Row Level Security - RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura para el dueño del registro
CREATE POLICY "Full access own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Full access own progress" ON public.user_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Full access own streaks" ON public.user_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Full access own vault" ON public.user_vault FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Full access own chat" ON public.chat_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CORRECCIÓN: Permitir a la app insertar datos cuando el usuario completa misiones o gana logros
CREATE POLICY "Select own mission logs" ON public.mission_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own mission logs" ON public.mission_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Select own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- El vocabulario global es público solo para lectura
CREATE POLICY "Public read vocabulary" ON public.vocabulary FOR SELECT USING (true);


-- ==========================================
-- 7. AUTOMATIZACIÓN (Nuevos Usuarios)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  
  INSERT INTO public.user_progress (user_id) VALUES (new.id);
  INSERT INTO public.user_streaks (user_id) VALUES (new.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 8. DATOS SEMILLA (Seed Data Estratégico)
-- ==========================================

INSERT INTO public.achievements (id, name, description, icon) VALUES
('first_step', 'Primer Paso', 'Completa tu primera misión', 'star'),
('streaker_3', 'Constancia', 'Mantén una racha de 3 días', 'flame'),
('vault_10', 'Coleccionista', 'Guarda 10 palabras en tu baúl', 'archive')
ON CONFLICT (id) DO NOTHING;

-- Vocabulario inicial temático para nutrir el contexto del Coach Raccoon
INSERT INTO public.vocabulary (theme, word_es, word_en, difficulty) VALUES
('Filosofía', 'Epistemología', 'Epistemology', 'advanced'),
('Filosofía', 'Ética', 'Ethics', 'intermediate'),
('Música', 'Ritmo', 'Rhythm', 'basic'),
('Música', 'Armonía', 'Harmony', 'intermediate'),
('Fútbol', 'Fuera de juego', 'Offside', 'intermediate'),
('Fútbol', 'Tiro libre', 'Free kick', 'basic'),
('Anime', 'Animación', 'Animation', 'basic'),
('Anime', 'Doblaje', 'Dubbing', 'intermediate'),
('Cine', 'Guion', 'Screenplay', 'advanced'),
('Cine', 'Director', 'Director', 'basic')
ON CONFLICT DO NOTHING;