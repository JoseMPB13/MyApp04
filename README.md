# 🦝 LyricLearn: AI Language Coach (MyApp04)

¡Transforma tu aprendizaje de inglés de pasivo a activo con el poder de la Inteligencia Artificial! **LyricLearn** no es solo una app de vocabulario; es un ecosistema premium diseñado para llevar tu nivel de inglés (A1-B1) al siguiente nivel mediante una inmersión asistida por IA y un sistema de gamificación adictivo.

---

## 🌟 Pilares de la Aplicación

### 🤖 Coach Raccoon (IA en Tiempo Real)
El corazón de la app. Un tutor paciente disponible 24/7 impulsado por **Llama 3.1 (vía Groq)**.
- **Interacción Natural**: Conversaciones contextuales limitadas pedagógicamente (máximo 10 palabras por frase) para no abrumar al principiante.
- **Feedback Inteligente**: Cada turno del chat analiza tu gramática, detecta errores y te proporciona una explicación breve en español.
- **Persistencia de Aprendizaje**: El historial de chat se guarda en Supabase con metadatos de feedback, permitiendo que la IA recuerde tu progreso.

### 💎 The Knowledge Vault (Bento Grid)
Tu hub personal de conocimiento. Olvídate de las listas aburridas.
- **Categorización Automática**: Al guardar una palabra, la IA la clasifica automáticamente (Tecnología, Viajes, Emociones, etc.).
- **Niveles de Maestría**: Rastrea qué palabras has dominado y cuáles sigues aprendiendo.
- **Contexto Compartido**: Tus palabras guardadas alimentan dinámicamente el contexto del Coach Raccoon y los retos de los juegos.

### 🏆 Sistema de Gamificación Pro
Diseñado para mantenerte motivado todos los días.
- **Streak Inteligente**: Sistema de racha basado en fechas locales (`completed_dates`), asegurando que la constancia sea real y no solo un contador.
- **Progreso y Niveles**: Sistema de XP (Experiencia) y Niveles. Cada acción (misión, palabra dominada, logro) suma puntos a tu `Lifetime XP`.
- **Vitrina de Logros**: 15 logros desbloqueables con notificaciones globales estilo *glassmorphism* y feedback háptico.

### 🎮 Ecosistema de Juegos
Aprende jugando con retos que se adaptan a tu nivel.
- **Word Matcher**: Une pares de palabras. La dificultad escala (hasta 10 pares) según tu nivel de usuario.
- **Mini Crucigramas**: Generados proceduralmente por la IA, usando temas de tu interés y palabras de tu propio baúl.

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
| :--- | :--- |
| **Expo SDK 54** | Framework base para desarrollo nativo multiplataforma. |
| **React Native Reanimated 3** | Animaciones fluidas a 60fps y transiciones de layout. |
| **Gesture Handler** | Navegación intuitiva mediante gestos nativos. |
| **Supabase** | Backend as a Service (PostgreSQL, Auth, RLS). |
| **Groq API (Llama 3.1)** | Motor de IA de ultra baja latencia para respuestas instantáneas. |
| **Context API** | Gestión de estado global (Tema, Usuario, Navegación). |
| **Lucide / Ionicons** | Iconografía profesional y minimalista. |

---

## 🏗️ Arquitectura de Datos y Seguridad

El backend está construido sobre **PostgreSQL** dentro de Supabase, aprovechando al máximo la lógica de base de datos para garantizar rendimiento y seguridad:

- **Automatización vía Triggers**: Creación automática de perfiles y registros de progreso mediante disparadores de base de datos (`handle_new_user`).
- **Seguridad RLS (Row Level Security)**: Cada usuario solo puede leer y escribir sus propios datos. Las políticas de seguridad aseguran la privacidad total de las conversaciones y el baúl.
- **Integridad Referencial**: Uso de `ON DELETE CASCADE` para garantizar que, si un usuario decide borrar su cuenta, toda su información se elimine de forma limpia y permanente.

---

## 🎨 Filosofía de Diseño

LyricLearn apuesta por una estética **Premium Minimalista**:
- **Dark Mode Native**: Diseñado desde cero para ser cómodo a la vista en entornos nocturnos.
- **Feedback Háptico**: Uso sutil de `expo-haptics` para confirmar acciones, aciertos en juegos y desbloqueo de logros.
- **Navegación Fluida**: Transiciones suaves entre secciones que hacen que la app se sienta "viva".

---

## 🚀 Configuración del Entorno

Para ejecutar el proyecto localmente, asegúrate de configurar las siguientes variables en tu archivo `.env` en la raíz:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# AI Engine (Groq)
EXPO_PUBLIC_GROQ_API_KEY=tu_api_key_de_groq

# Gemini (Fallback/Tools)
EXPO_PUBLIC_GEMINI_API_KEY=tu_api_key_de_gemini
```

> [!IMPORTANT]
> Es vital usar el prefijo `EXPO_PUBLIC_` para que las variables sean accesibles en el bundle de la aplicación Expo.

---

**LyricLearn** - *Aprende inglés, no solo vocabulario.* 🦝✨
