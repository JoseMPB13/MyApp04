# Stack Tecnológico y Arquitectura

## Frontend Core
- **Framework**: React Native (Expo SDK 54).
- **Componentes**: Pure Core Components (`View`, `Text`, `StyleSheet`, `ScrollView`).
- **Navegación**: Basada en estados simples y `expo-router` para la jerarquía básica.
- **Animaciones**: `Animated` de React Native o `react-native-reanimated` (incluida en Expo).

## Inteligencia Artificial
- **Modelo**: Gemini Flash 2.5 (v1 estable).
- **Integración**: `fetch` directo a la API de Google AI Studio (Zero-SDK pesados).
- **Formato de Salida**: JSON estructurado para parsing automático de feedback.

## Persistencia y Datos
- **Local**: `AsyncStorage` para configuraciones y caché rápida.
- **Backend (Fase Final)**: Supabase para sincronización del "Knowledge Vault" y progreso de usuario.

## Arquitectura de Carpetas
- `src/components`: UI atómica y componentes de mascota.
- `src/screens`: Lógica de pantalla y orquestación.
- `src/hooks`: Lógica de negocio reutilizable (ej. `useGemini`, `useVault`).
- `src/utils`: Helpers para formateo de texto y parsing de JSON.
- `docs/lessons`: Memoria técnica para agentes IA.
