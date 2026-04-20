# LESSON_15: Estabilización para Móvil (iOS/Expo Go) y SDK 54

## Contexto
Aunque la aplicación funcionaba en Web, el despliegue en dispositivos físicos (iOS) a través de Expo Go presentaba dos bloqueos críticos: fallos en los polyfills de red y desajustes en los módulos nativos de almacenamiento.

## 1. El Problema del Punto de Entrada (URL Polyfill)
En React Native, Supabase requiere que la clase `URL` sea polyfilleada. Expo Router a veces carga los módulos en un orden que impide que el parche de `react-native-url-polyfill` se aplique antes de que Supabase intente usarlo.

### Solución: Punto de Entrada Forzado (`index.js`)
Se creó un archivo `index.js` en la raíz para garantizar el orden de ejecución:
```javascript
import 'react-native-url-polyfill/auto'; // Cargado ANTES de todo
import 'expo-router/entry';               // Inicialización de Expo
```
Y se actualizó el `package.json`:
```json
"main": "index.js"
```

## 2. Inconsistencia de Módulos Nativos (AsyncStorage)
El error `AsyncStorageError: Native module is null` indicaba que la versión instalada de `@react-native-async-storage/async-storage` no coincidía con los binarios incluidos en la versión actual de Expo Go (SDK 54).

### Lección de Dependencias Nativas:
- **Error**: Instalar paquetes usando `npm install` directamente para módulos que tienen código nativo.
- **Solución**: Usar siempre **`npx expo install`**. Esta herramienta consulta la base de datos de compatibilidad de Expo y descarga la versión exacta validada para tu versión de SDK.

## Resumen Técnico
- **Entry Point**: `index.js` (Custom).
- **Polyfill**: `react-native-url-polyfill` cargado globalmente.
- **AsyncStorage**: Versión sincronizada con SDK 54.
