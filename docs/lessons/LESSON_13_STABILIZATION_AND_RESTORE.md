# LESSON_13: Stabilization, Upsert & Gemini Restore

## Contexto
Tras una fase de inestabilidad donde se detectaron errores 409 (Conflict) en Supabase y problemas de cuota con la IA, se procedió a una limpieza técnica profunda para asegurar la persistencia y restaurar la inteligencia del sistema.

## Desafíos y Soluciones

### 1. Error 409 (Conflict) en Supabase
- **Problema**: El envío de un campo `id` vacío o nulo en la inserción de `user_vault` causaba conflictos en PostgreSQL al intentar generar el UUID.
- **Solución**: Se refinó el payload en `src/api/vault.ts` para excluir explícitamente el campo `id`, permitiendo que Supabase lo genere automáticamente.
- **Aprendizaje**: En inserciones donde el ID es autogenerado, es más seguro no incluir la clave `id` en el objeto de datos enviado a la API.

### 2. Sincronización de Perfiles con UPSERT
- **Problema**: `AuthService.ensureProfile` fallaba si el perfil ya existía (error de duplicidad) o si faltaban campos críticos como `email`.
- **Solución**: Migración de `.insert()` a `.upsert({ id, email }, { onConflict: 'id' })`.
- **Aprendizaje**: El uso de `upsert` es fundamental en apps offline-ready o con sincronización repetitiva para mantener la integridad sin lanzar errores de llave duplicada.

### 3. Restauración de Gemini 2.5 Flash (Zero-Dependency)
- **Problema**: Dependencia temporal de MyMemory API (limitada y menos precisa) tras fallos en la clave de Gemini.
- **Solución**: Restauración de Gemini 2.5 Flash usando `fetch` nativo al endpoint de Google Generative Language.
- **Prompting Estricto**: Se configuró un prompt del sistema para que la IA solo responda con la traducción literal, facilitando el parsing sin explicaciones adicionales.

## Implementación Técnica (VaultSection)
Se reactivó la lógica de auto-traducción bidireccional con un debounce de 1.2s y feedback visual mediante `ActivityIndicator` dentro de los inputs. Adicionalmente, se forzó la validación de `userId` antes de permitir cualquier operación de guardado.

## Resumen
La aplicación alcanza un estado de madurez técnica donde la persistencia es robusta, el perfil de usuario está siempre sincronizado y la IA es rápida, gratuita (plan Flash) y sin dependencias externas pesadas.
