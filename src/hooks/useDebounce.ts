import { useState, useEffect } from 'react';

/**
 * Hook para retrasar la actualización de un valor (debouncing).
 * Muy útil para inputs de búsqueda y auto-guardado, evitando llamadas
 * continuas y posibles memory leaks.
 * 
 * @param value Valor a observar
 * @param delay Tiempo de espera en milisegundos
 * @returns Valor retrasado
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Establecer un timeout para actualizar el valor después del retraso
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timeout si el valor cambia (o el componente se desmonta)
    // antes de que se cumpla el tiempo
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
