# LESSON_11: AI Auto-Translation & UUID Fix

## Contexto
Se reportaron errores 400 (Bad Request) al intentar persistir datos en Supabase y se solicitó automatizar la traducción de términos dentro del Baúl de conocimiento.

## Desafíos Técnicos

### 1. Estricticidad de Tipos (UUID)
- **Error**: Se usaba la cadena `'test-user-robert-123'` como `user_id`. Supabase, basado en PostgreSQL, rechaza cadenas que no sigan el estándar UUID para columnas de ese tipo.
- **Lección**: Siempre usar generadores de UUID o constantes que cumplan con el formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` cuando se interactúe con esquemas de base de datos relacionales modernos.

### 2. Integración de IA con Debounce
- **Problema**: Realizar una llamada a la API de Gemini por cada tecla presionada es ineficiente y costoso.
- **Solución**: Se implementó un "Debounce" de 1000ms. La traducción solo se dispara después de que el usuario ha dejado de escribir por un segundo.
- **Control de Flujo**: Se añadió la lógica de "Solo traducir si el campo opuesto está vacío" para evitar bucles infinitos de traducción y para no sobrescribir correcciones manuales del usuario.

## Implementación del Hook `useGemini`
Siguiendo la arquitectura **Zero-Dependency**, se implementó un hook que usa `fetch` nativo hacia los endpoints de Google AI Studio (Gemini 2.5-flash), evitando librerías pesadas como el `@google/generative-ai`.

```tsx
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
const data = await response.json();
const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
```

## Feedback Visual
Se agregaron indicadores de carga (`ActivityIndicator`) condicionales dentro de los inputs. Esto mejora la UX al informar al usuario que la app está "pensando" en la traducción.

## Resumen
Esta fase estabiliza la infraestructura de datos y añade la primera pieza de inteligencia real a la aplicación.
