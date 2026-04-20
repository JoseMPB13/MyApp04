# SYSTEM_LOG.md: Registro Técnico de Decisiones

## 18/04/2026 - Inicialización y Estructura
- **Decisión**: Reconstrucción de archivos de contexto en `MyApp03`.

## 19/04/2026 - Integración Cloud v9
- **Decisión**: Integración de Supabase con configuración Metro `.mjs`.

## 20/04/2026 - The Vault & Modular Refactor v10
- **Decisión**: Arquitectura modular en `src/screens`.
- **Decisión**: Layout Bento para el Baúl.

## 20/04/2026 - Gemini v2.5-flash Migration v17
- **Decisión**: Migrar al modelo **Gemini 2.5-flash**.
  - **Razón**: El modelo 1.5-flash fue retirado o movido a endpoints específicos que causaban errores 404 en v1beta.
  - **Acción**: Actualizada la URL a la versión estable `v1` y el modelo a `2.5-flash`.
- **Decisión**: Limpieza de referencias obsoletas.
  - **Acción**: Eliminadas todas las menciones a `v1beta` y `1.5-flash` en la documentación técnica para evitar confusiones futuras.
