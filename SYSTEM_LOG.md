# SYSTEM_LOG.md: Registro Técnico de Decisiones

## 18/04/2026 - Inicialización y Estructura
- **Decisión**: Reconstrucción de archivos de contexto en `MyApp03`.

## 19/04/2026 - Integración Cloud v9
- **Decisión**: Integración de Supabase con configuración Metro `.mjs`.

## 20/04/2026 - The Vault & Modular Refactor v10
- **Decisión**: Arquitectura modular en `src/screens`.
- **Decisión**: Layout Bento para el Baúl.

## 20/04/2026 - AI Stabilization v11 (UUID & Translation)
- **Decisión**: Corrección de tipos a UUID.
- **Decisión**: Lógica de Debounce de 1000ms.

## 20/04/2026 - Gemini Restore & 409 Resolution v16
- **Decisión**: Restaurar Gemini 1.5 Flash.
  - **Contexto**: Inestabilidad con MyMemory y necesidad de mayor precisión.
  - **Acción**: Restablecido fetch directo a Google AI Studio con prompt de una sola palabra.
- **Decisión**: Resolución de Error 409 (Conflict).
  - **Contexto**: Fallos en inserción por ID vacío.
  - **Acción**: Refactorización de `VaultService` para omitir `id` en inserciones y dejar que PostgreSQL lo genere.
- **Decisión**: Fortalecimiento de Perfiles con UPSERT.
  - **Contexto**: Errores RLS y de clave foránea al crear perfiles duplicados.
  - **Acción**: Uso de `.upsert()` en `AuthService` para garantizar sincronización de `email` y `userId`.
- **Decisión**: Validación de Sesión en UI.
  - **Acción**: Bloqueo del botón "Guardar" si `userId` no está presente, previniendo errores de base de datos en el cliente.
