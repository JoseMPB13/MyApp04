<div align="center">
  <h1>🦝 Raccoon</h1>
  <p><em>AI Language Coach</em></p>
  <p>
    <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" /></a>
    <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  </p>
</div>

<br/>

> ¡Transforma tu aprendizaje de inglés de pasivo a activo con el poder de la Inteligencia Artificial! **Raccoon** no es solo una app de vocabulario; es un ecosistema premium diseñado para llevar tu nivel de inglés (A1-B1) al siguiente nivel mediante una inmersión asistida por IA y un sistema de gamificación adictivo.

---

## 📖 Tabla de Contenidos

- [✨ Características Principales](#-características-principales)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🏗️ Arquitectura y Seguridad](#-arquitectura-y-seguridad)
- [🎨 Filosofía de Diseño](#-filosofía-de-diseño)
- [🚀 Instalación y Uso](#-instalación-y-uso)

---

## ✨ Características Principales

### 🤖 Coach Raccoon (IA en Tiempo Real)
El corazón de la app. Un tutor paciente disponible 24/7 impulsado por **Llama 3.1 (vía Groq)**.
- **Interacción Natural**: Conversaciones contextuales limitadas pedagógicamente (máximo 10 palabras por frase) para no abrumar al principiante.
- **Feedback Inteligente**: Cada turno del chat analiza tu gramática, detecta errores y te proporciona una explicación breve en español.
- **Persistencia de Aprendizaje**: El historial de chat se guarda en Supabase con metadatos de feedback, permitiendo que la IA recuerde tu progreso.

### 💎 The Knowledge Vault (Bento Grid UI)
Tu hub personal de conocimiento. Olvídate de las listas aburridas.
- **Categorización Automática**: Al guardar una palabra, la IA la clasifica automáticamente (Tecnología, Viajes, Emociones, etc.).
- **Niveles de Maestría**: Rastrea qué palabras has dominado y cuáles sigues aprendiendo.
- **Contexto Compartido**: Tus palabras guardadas alimentan dinámicamente el contexto del Coach Raccoon y los retos de los juegos.

### 🏆 Sistema de Gamificación Pro
Diseñado para mantenerte motivado todos los días.
- **Streak Inteligente**: Sistema de racha basado en fechas locales (`completed_dates`), asegurando que la constancia sea real.
- **Progreso y Niveles**: Sistema de XP (Experiencia) y Niveles. Cada acción suma puntos a tu `Lifetime XP`.
- **Vitrina de Logros**: 15 logros desbloqueables con notificaciones globales estilo *glassmorphism* y feedback háptico.

### 🎮 Ecosistema de Juegos
Aprende jugando con retos que se adaptan a tu nivel.
- **Word Matcher**: Une pares de palabras. La dificultad escala (hasta 10 pares) según tu nivel de usuario.
- **Mini Crucigramas**: Generados proceduralmente por la IA, usando temas de tu interés y palabras de tu propio baúl.

---

## 🛠️ Stack Tecnológico

La aplicación está construida con las tecnologías más modernas y robustas del ecosistema móvil:

| Categoría | Tecnología | Descripción |
| :--- | :--- | :--- |
| **Frontend** | **Expo SDK 54 / React Native** | Framework base para desarrollo nativo multiplataforma. |
| **Animaciones** | **Reanimated 3 & Gesture Handler** | Animaciones fluidas a 60fps y navegación intuitiva por gestos. |
| **Backend** | **Supabase** | Backend as a Service (PostgreSQL, Auth, RLS). |
| **Inteligencia Artificial** | **Groq API (Llama 3.1)** | Motor de IA de ultra baja latencia para respuestas instantáneas. |
| **Estado Global** | **React Context API** | Gestión eficiente de estado (Tema, Usuario, Navegación). |
| **UI/UX** | **Lucide / Ionicons** | Iconografía profesional y minimalista. |

---

## 🏗️ Arquitectura y Seguridad

El backend está construido sobre **PostgreSQL** dentro de Supabase, aprovechando al máximo la lógica de base de datos para garantizar rendimiento y seguridad:

- 🛡️ **Seguridad RLS (Row Level Security)**: Cada usuario solo puede leer y escribir sus propios datos. Las políticas de seguridad aseguran la privacidad total de las conversaciones y el baúl.
- ⚙️ **Automatización vía Triggers**: Creación automática de perfiles y registros de progreso mediante disparadores de base de datos (`handle_new_user`).
- 🧹 **Integridad Referencial**: Uso de `ON DELETE CASCADE` para garantizar que, si un usuario decide borrar su cuenta, toda su información se elimine de forma limpia y permanente.

---

## 🎨 Filosofía de Diseño

Raccoon apuesta por una estética **Premium Minimalista**:
- **Dark Mode Native**: Diseñado desde cero para ser cómodo a la vista en entornos nocturnos.
- **Glassmorphism**: Uso de transparencias y desenfoques para dar profundidad a la interfaz.
- **Feedback Háptico**: Uso sutil de `expo-haptics` para confirmar acciones, aciertos en juegos y desbloqueos.
- **Navegación Fluida**: Transiciones suaves entre secciones que hacen que la app se sienta viva.

---

## 🚀 Instalación y Uso

Sigue estos pasos para correr el proyecto localmente:

### 1. Clonar el repositorio
```bash
git clone https://github.com/JoseMPB13/MyApp04.git
cd MyApp04
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto y añade tus credenciales:

```env
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

### 4. Iniciar la aplicación
```bash
npx expo start
```
*Escanea el código QR con la app **Expo Go** en tu dispositivo físico, o presiona `a` para Android Emulator / `i` para iOS Simulator.*

---

<div align="center">
  <p><b>Raccoon</b> - <i>Aprende inglés, no solo vocabulario.</i> 🦝✨</p>
  <p>Desarrollado con ❤️ por <a href="https://github.com/JoseMPB13">JoseMPB13</a></p>
</div>
