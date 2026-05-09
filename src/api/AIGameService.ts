import { fetchGroq } from './GroqClient';
import { WordPair, CrosswordItem } from './ai_types';

const FALLBACK_WORDS = [
  { word: "casa", translation: "house" },
  { word: "perro", translation: "dog" },
  { word: "gato", translation: "cat" },
  { word: "árbol", translation: "tree" },
  { word: "coche", translation: "car" },
  { word: "sol", translation: "sun" },
  { word: "luna", translation: "moon" },
  { word: "agua", translation: "water" },
  { word: "fuego", translation: "fire" },
];

export const AIGameService = {
  generateMatcherLevel: async (
    level: number,
    vaultWords: string[],
    recentWords: string[] = [],
  ): Promise<WordPair[]> => {
    const numPairs = Math.min(3 + Math.floor(level / 2), 10);

    const themes = ["Comida y Bebida", "Animales", "Profesiones", "Tecnología", "Viajes"];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    const systemPrompt = `
      Eres un generador de vocabulario para un juego de unir pares.
      Debes generar EXACTAMENTE ${numPairs} pares de palabras (Español - Inglés).
      
      TEMÁTICA: '${randomTheme}'.
      
      VOCABULARIO DEL USUARIO (Prioridad Alta): ${vaultWords.slice(0, numPairs).join(", ")}
      
      REGLAS ABSOLUTAS:
      1. TEMA OBLIGATORIO: Todas las palabras NUEVAS DEBEN estar relacionadas con: '${randomTheme}'.
      2. NO INVENTES PALABRAS. 
      3. TRADUCCIÓN ÚNICA.
      4. HISTORIAL PROHIBIDO: No generes estas palabras: [${recentWords.join(", ")}].
      
      FORMATO DE RESPUESTA (Responde ÚNICAMENTE en JSON estricto):
      {
        "pairs": [
          { "word": "palabra_en_español", "translation": "palabra_en_inglés" }
        ]
      }
    `;

    try {
      const data = await fetchGroq([{ role: "system", content: systemPrompt }], 0.1);
      const rawPairs = data.pairs || [];
      return rawPairs.slice(0, numPairs).map((p: any, index: number) => ({
        id: "gen-" + level + "-" + index + "-" + Date.now(),
        matchId: index + 1,
        word: p.word,
        translation: p.translation,
      }));
    } catch (error) {
      console.error("AIGameService.generateMatcherLevel Error:", error);
      const shuffledFallback = [...FALLBACK_WORDS].sort(() => Math.random() - 0.5);
      return shuffledFallback.slice(0, numPairs).map((p: any, index: number) => ({
        id: "f-" + level + "-" + index + "-" + Date.now(),
        matchId: index + 1,
        word: p.word,
        translation: p.translation,
      }));
    }
  },

  generateCrosswordData: async (
    level: number,
    vaultWords: string[],
    recentWords: string[] = [],
  ): Promise<{ items: CrosswordItem[]; gridSize: number }> => {
    const wordCount = 12;
    let wordLengthRule = "cortas (3-5 letras)";
    let minLen = 3;
    let maxLen = 5;
    let gridSize = 8;
    let vocabRule = "Vocabulario básico.";

    if (level >= 4 && level <= 7) {
      wordLengthRule = "medias (4-6 letras)";
      minLen = 4;
      maxLen = 6;
      gridSize = 10;
      vocabRule = "Vocabulario intermedio. Mezcla palabras del baúl: [" + vaultWords.slice(0, 5).join(", ") + "].";
    } else if (level >= 8) {
      wordLengthRule = "largas (5-8 letras)";
      minLen = 5;
      maxLen = 8;
      gridSize = 12;
      vocabRule = "Vocabulario avanzado.";
    }

    const themes = ["Comida", "Animales", "Hogar", "Cuerpo", "Ropa"];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    const systemPrompt = `
Eres un creador de crucigramas en inglés.
REGLA 1 (LONGITUD): Las palabras deben tener entre ${wordLengthRule}. 
REGLA 2 (TEMA): Usa la categoría '${randomTheme}'.
REGLA 3 (ORTOGRAFÍA): 'word' DEBE estar en INGLÉS, TODO EN MAYÚSCULAS.
REGLA 4 (PISTAS): 'clue' DEBE ser la traducción al ESPAÑOL. Una sola palabra exacta.
REGLA 5 (VOCABULARIO): ${vocabRule}

FORMATO JSON REQUERIDO:
{
  "items": [
    { "word": "PALABRA", "clue": "Traduccion" }
  ]
}
`;

    try {
      const data = await fetchGroq([{ role: "system", content: systemPrompt }], 0.2);
      if (data.items && Array.isArray(data.items)) {
        const validItems = data.items.filter((item: any) => {
          if (!item.word || !item.clue) return false;
          const isAlpha = /^[A-Z]+$/.test(item.word);
          const validLen = item.word.length >= minLen && item.word.length <= maxLen;
          return isAlpha && validLen;
        });

        if (validItems.length > 0) return { items: validItems, gridSize };
      }
      throw new Error("Formato inválido");
    } catch (error) {
      console.error("AIGameService.generateCrosswordData Error:", error);
      return {
        items: [
          { word: "CAT", clue: "Gato" },
          { word: "SUN", clue: "Sol" },
          { word: "BOOK", clue: "Libro" },
          { word: "TREE", clue: "Árbol" },
        ].slice(0, wordCount),
        gridSize,
      };
    }
  }
};
