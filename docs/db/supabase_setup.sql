-- SCRIPT DE INICIALIZACIÓN: AI Language Coach (Supabase)

-- 1. TABLA DE PERFILES (Extensión de Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE RACHAS
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  last_completion_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE LOGS DE MISIONES
CREATE TABLE IF NOT EXISTS public.mission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL, -- 'word-matcher', 'ai-chat', etc.
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE VOCABULARIO (JUEGO)
CREATE TABLE IF NOT EXISTS public.vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme TEXT NOT NULL, -- 'comida', 'viajes', etc.
  word_es TEXT NOT NULL,
  word_en TEXT NOT NULL,
  difficulty TEXT DEFAULT 'basic'
);

-- 5. SEGURIDAD (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Permitir lectura y edición al dueño)
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own streak" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own streak" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own mission logs" ON public.mission_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mission logs" ON public.mission_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vocabulary is readable by all" ON public.vocabulary FOR SELECT USING (true);

-- 5. TABLA DEL BAÚL (Palabras del usuario)
CREATE TABLE IF NOT EXISTS public.user_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_es TEXT NOT NULL,
  word_en TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  status TEXT DEFAULT 'learning', -- 'learning', 'mastered'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own vault" ON public.user_vault 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. INSERT DE VOCABULARIO INICIAL
INSERT INTO public.vocabulary (theme, word_es, word_en) VALUES
('comida', 'Manzana', 'Apple'),
('comida', 'Pan', 'Bread'),
('comida', 'Agua', 'Water'),
('viajes', 'Avión', 'Plane'),
('viajes', 'Maleta', 'Suitcase'),
('viajes', 'Pasaporte', 'Passport'),
('saludos', 'Hola', 'Hello'),
('saludos', 'Adiós', 'Goodbye'),
('saludos', 'Gracias', 'Thank you')
ON CONFLICT DO NOTHING;
