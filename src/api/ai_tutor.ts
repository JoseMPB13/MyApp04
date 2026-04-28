/**
 * Servicio de Tutor IA para lecciones dinámicas (Tiny Lesson).
 * Utiliza Groq Cloud API (Llama 3.1) para procesar el lenguaje natural.
 */

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Interfaz de feedback devuelta por la IA en cada turno.
 * Reemplaza el esquema anterior (FeedbackCapsule + corrections[]).
 */
export interface LessonFeedback {
  /** Explicación breve del error en español, o null si no hubo error. */
  correction: string | null;
  /** Palabra del baúl que el usuario usó correctamente, o null. */
  vault_usage_detected: string | null;
  /** Puntuación del turno del 0 al 10. */
  score: number;
}

/** Mantener compatibilidad con otros componentes que aún importan estos tipos */
export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}
export interface FeedbackCapsule {
  grammar: string;
  vocabulary: string;
  naturalness: string;
}

export interface LessonResponse {
  /** Respuesta de Coach Raccoon, 100% en inglés, máximo 3 oraciones. */
  text: string;
  /** Traducción completa al español del campo 'text'. */
  translation: string;
  /** Respuesta sugerida en inglés a la pregunta que acaba de hacer la IA. */
  suggested_reply_en: string;
  /** Traducción literal al español de suggested_reply_en. */
  suggested_reply_es: string;
  /** Objeto de feedback pedagógico del turno. */
  feedback: LessonFeedback;
  // Legacy — mantenidos para no romper otros componentes durante la migración
  corrections?: Correction[];
  feedbackType?: "success" | "correction" | "neutral";
  suggested_reply?: string;
  feedbackCapsule?: FeedbackCapsule;
}

export interface WordPair {
  id: string;
  word: string;
  translation: string;
  matchId: number;
  inVault?: boolean;
}

export interface CrosswordItem {
  word: string;
  clue: string;
}

const fetchGroq = async (messages: any[], temperature: number = 0.7) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: messages,
      temperature: temperature,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in AI response");
  return JSON.parse(content);
};

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
  { word: "tierra", translation: "earth" },
  { word: "cielo", translation: "sky" },
  { word: "nube", translation: "cloud" },
  { word: "lluvia", translation: "rain" },
  { word: "nieve", translation: "snow" },
  { word: "viento", translation: "wind" },
  { word: "montaña", translation: "mountain" },
  { word: "río", translation: "river" },
  { word: "mar", translation: "sea" },
  { word: "playa", translation: "beach" },
  { word: "bosque", translation: "forest" },
  { word: "flor", translation: "flower" },
  { word: "hoja", translation: "leaf" },
];

export const AITutorService = {
  categorizeVaultWord: async (
    wordEn: string,
    wordEs: string,
  ): Promise<string> => {
    if (!API_KEY) return "General";

    const systemPrompt = `
      Eres un asistente experto en lingüística.
      Tu única tarea es clasificar la siguiente palabra de vocabulario en inglés y español en una ÚNICA categoría general de una sola palabra.
      
      Prioriza usar una de estas categorías si encaja bien: Comida, Viajes, Negocios, Verbos, Naturaleza, Tecnología, Salud, Emociones, Tiempo, Hogar, Ropa, Animales, Adjetivos.
      Si no encaja en ninguna, inventa una sola palabra que describa la categoría.
      
      Palabra en Inglés: ${wordEn}
      Palabra en Español: ${wordEs}
      
      FORMATO DE RESPUESTA (Responde ÚNICAMENTE en JSON):
      {
        "category": "NombreDeCategoria"
      }
    `;

    try {
      const data = await fetchGroq([{ role: "system", content: systemPrompt }]);
      return data.category || "General";
    } catch (error) {
      console.error("AITutorService.categorizeVaultWord Error:", error);
      return "General";
    }
  },

  generateTopicsForCategory: async (category: string): Promise<string[]> => {
    if (!API_KEY) return ["Presentarse", "Pedir direcciones", "Comprar algo"]; // fallback

    const systemPrompt = `
      Genera exactamente 3 temas de conversación muy cortos (máximo 6 palabras cada uno) 
      para practicar inglés, basados en la categoría: "${category}".
      
      Devuelve SOLO un JSON con este formato exacto:
      {
        "topics": ["Tema 1", "Tema 2", "Tema 3"]
      }
    `;

    try {
      const data = await fetchGroq([{ role: "system", content: systemPrompt }]);
      return (
        data.topics || ["Presentarse", "Pedir direcciones", "Comprar algo"]
      );
    } catch (error) {
      console.error("AITutorService.generateTopics Error:", error);
      return ["Presentarse", "Pedir direcciones", "Comprar algo"];
    }
  },

  getDailyTip: async (): Promise<{ english: string; spanish: string }> => {
    if (!API_KEY)
      return {
        english: "Practice makes perfect!",
        spanish: "¡La práctica hace al maestro!",
      };

    const systemPrompt = `
      Eres un coach simpático para una app de aprendizaje de inglés (estilo Duolingo).
      Tu trabajo es dar UN solo tip diario o frase motivacional muy corta en inglés (máximo 10 palabras), 
      junto con su traducción o explicación en español para animar al estudiante.
      
      Devuelve SOLO un JSON con este formato exacto:
      {
        "english": "Frase motivacional o tip corto en inglés",
        "spanish": "Traducción o breve explicación en español"
      }
    `;

    try {
      const data = await fetchGroq([{ role: "system", content: systemPrompt }]);
      return {
        english: data.english || "Keep pushing forward!",
        spanish: data.spanish || "¡Sigue avanzando!",
      };
    } catch (error) {
      console.error("AITutorService.getDailyTip Error:", error);
      return {
        english: "Keep going, you're doing great!",
        spanish: "¡Sigue así, lo estás haciendo genial!",
      };
    }
  },

  getMiniLesson: async (): Promise<{
    title: string;
    explanation: string;
    exampleEn: string;
    exampleEs: string;
  }> => {
    if (!API_KEY) {
      return {
        title: "In / On / At",
        explanation:
          "'In' es para espacios cerrados, 'On' para superficies y 'At' para puntos específicos.",
        exampleEn: "I am in the car, on the street, at the corner.",
        exampleEs: "Estoy en el coche, en la calle, en la esquina.",
      };
    }

    const systemPrompt = `
      Eres un coach de inglés. Genera una micro-lección aleatoria de inglés muy básica y útil (ej. diferencia entre in/on/at, un phrasal verb común, saludos informales, etc.).
      
      Devuelve ESTRICTAMENTE un JSON con este formato exacto:
      {
        "title": "Título corto",
        "explanation": "Explicación muy breve en español",
        "exampleEn": "Ejemplo corto en inglés",
        "exampleEs": "Traducción del ejemplo al español"
      }
    `;

    try {
      const data = await fetchGroq([{ role: "system", content: systemPrompt }]);
      return {
        title: data.title || "Mini Lección",
        explanation: data.explanation || "¡Sigue practicando para mejorar!",
        exampleEn: data.exampleEn || "Keep going!",
        exampleEs: data.exampleEs || "¡Sigue adelante!",
      };
    } catch (error) {
      console.error("AITutorService.getMiniLesson Error:", error);
      return {
        title: "In / On / At",
        explanation:
          "'In' es para espacios cerrados, 'On' para superficies y 'At' para puntos específicos.",
        exampleEn: "I am in the car, on the street, at the corner.",
        exampleEs: "Estoy en el coche, en la calle, en la esquina.",
      };
    }
  },

  generateMatcherLevel: async (
    level: number,
    vaultWords: string[],
    recentWords: string[] = [],
  ): Promise<WordPair[]> => {
    const themes = [
      "Comida y Bebida",
      "Animales Salvajes",
      "Profesiones",
      "Tecnología",
      "Viajes",
      "Ropa",
      "Deportes",
      "Hogar",
      "Cuerpo Humano",
      "Arte y Música",
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    console.log("🎯 [AI_TUTOR] Tema forzado para esta partida:", randomTheme);

    let pairCount = 3;
    let difficultyRule = "";

    if (level <= 3) {
      pairCount = 3;
      difficultyRule =
        "Genera exactamente 3 pares de palabras. El vocabulario debe ser muy básico y COMPLETAMENTE NUEVO para el usuario. No uses palabras complicadas.";
    } else if (level >= 4 && level <= 7) {
      pairCount = 4;
      difficultyRule = `Genera exactamente 4 pares de palabras. Mezcla algunas palabras conocidas del usuario: [${vaultWords.slice(0, 5).join(", ")}] con palabras NUEVAS de nivel intermedio.`;
    } else {
      pairCount = 5;
      difficultyRule = `Genera exactamente 5 pares de palabras. Mezcla palabras de su baúl: [${vaultWords.slice(0, 5).join(", ")}] con palabras NUEVAS de nivel avanzado o phrasal verbs complejos.`;
    }

    const systemPrompt = `
Eres un generador de vocabulario para nivel A1-B2 de inglés.
REGLA CRÍTICA DE DIFICULTAD: ${difficultyRule}

REGLAS ABSOLUTAS:
1. TEMA OBLIGATORIO: Todas las palabras NUEVAS que generes DEBEN estar relacionadas estrictamente con la categoría: '${randomTheme}'. No uses vocabulario de familia o mascotas a menos que ese sea el tema.
2. NO INVENTES PALABRAS. Usa únicamente sustantivos, verbos o adjetivos básicos y reales del diccionario Oxford.
3. TRADUCCIÓN ÚNICA. La traducción al español debe ser una sola palabra exacta (ej. NO "madrina, tía", solo "Madrina").
4. FORMATO DE TEXTO: Solo la primera letra debe ser mayúscula, el resto en minúscula. NUNCA uses todo en mayúsculas.
5. HISTORIAL PROHIBIDO: No generes estas palabras: [${recentWords.join(", ")}].

EJEMPLOS DE LO QUE DEBES DEVOLVER:
CORRECTO: { "word": "Abuela", "translation": "Grandmother" }
CORRECTO: { "word": "Manzana", "translation": "Apple" }
INCORRECTO (No usar): { "word": "ABUELA", "translation": "GRANDMOTHER" } -> (Error: Todo mayúsculas)
INCORRECTO (No usar): { "word": "Madrina", "translation": "Goodmother" } -> (Error: Palabra inventada)

FORMATO DE RESPUESTA (Responde ÚNICAMENTE en JSON estricto):
{
  "pairs": [
    { "word": "palabra_en_español", "translation": "palabra_en_inglés" }
  ]
}
`;

    try {
      console.log(
        "🧠 [AI_TUTOR] Solicitando pares. Nivel:",
        level,
        "| Evitando:",
        recentWords,
      );
      const data = await fetchGroq(
        [{ role: "system", content: systemPrompt }],
        0.1,
      );
      const rawPairs = data.pairs || [];
      console.log(
        "✅ [AI_TUTOR] Respuesta cruda de Groq:",
        JSON.stringify(rawPairs),
      );

      // Limitar al pairCount solicitado por si la IA se excede
      return rawPairs.slice(0, pairCount).map((p: any, index: number) => ({
        id: `gen-${level}-${index}-${Date.now()}`,
        matchId: index + 1,
        word: p.word,
        translation: p.translation,
      }));
    } catch (error) {
      console.error("AITutorService.generateMatcherLevel Error:", error);
      // Fallback dinámico aleatorio sin repetir recientes
      const availableFallback = FALLBACK_WORDS.filter(
        (w) =>
          !recentWords.includes(w.translation.toLowerCase()) &&
          !recentWords.includes(w.word.toLowerCase()),
      );
      const pool =
        availableFallback.length >= pairCount
          ? availableFallback
          : FALLBACK_WORDS;
      const shuffledFallback = [...pool].sort(() => Math.random() - 0.5);
      return shuffledFallback
        .slice(0, pairCount)
        .map((p: any, index: number) => ({
          id: `f-${level}-${index}-${Date.now()}`,
          matchId: index + 1,
          word: p.word,
          translation: p.translation,
        }));
    }
  },

  getLessonResponse: async (
    messages: any[],
    scenarioGoal: string,
    targetWords: string[] = [],
    turnCount: number = 1,
  ): Promise<LessonResponse> => {
    if (!API_KEY) throw new Error("Groq API Key missing");

    const isLastTurn = turnCount >= 5;

    // Palabras Objetivo: hasta 6 palabras del baúl del usuario
    const vaultList = targetWords.length > 0
      ? targetWords.slice(0, 6).join(", ")
      : null;
    const vaultRule = vaultList
      ? `TARGET VOCABULARY (from student's Vault): [${vaultList}]. Try to naturally encourage the student to use ONE of these words in their reply. In "vault_usage_detected", write the exact vault word if the student correctly used it in their message, otherwise null.`
      : 'No vault words available. Use simple everyday vocabulary.';

    const systemPrompt = `
You are Coach Raccoon, a patient English tutor for ABSOLUTE BEGINNERS (CEFR A1).
The student is a native Spanish speaker. They are practicing English conversation.

CRITICAL RULES — violating any rule is NOT acceptable:
1. SIMPLICITY: Use MAXIMUM 10 words per sentence. Vocabulary must be extremely simple (A1 level).
2. LANGUAGE: The "text" field MUST be 100% in English. No Spanish words in "text".
3. ONE QUESTION: ${isLastTurn
  ? 'This is TURN 5 (LAST). Warmly congratulate the student. Do NOT ask any question.'
  : 'You MUST end "text" with EXACTLY ONE simple, easy question for the student to answer.'}
4. SUGGESTED REPLY: "suggested_reply_en" = a short example answer IN ENGLISH to your question (max 8 words). "suggested_reply_es" = its EXACT literal Spanish translation.
5. VAULT USAGE: ${vaultRule}
6. CORRECTION: In "correction", write a SHORT explanation IN SPANISH if the student made a grammar mistake. Write null if the message is correct.
7. SCORE: In "score", rate the student's message quality from 0 to 10 (10 = perfect grammar + used a vault word).
8. TRANSLATION: "translation" = complete Spanish translation of your "text" field.

SCENARIO: "${scenarioGoal}"
TURN: ${turnCount} of 5.

MANDATORY JSON (respond ONLY with this exact structure, no markdown, no extra keys):
{
  "text": "Your English response here. End with one question.",
  "translation": "Traducci\u00f3n completa al espa\u00f1ol de 'text'",
  "suggested_reply_en": "Short example answer in English",
  "suggested_reply_es": "Traducci\u00f3n literal al espa\u00f1ol",
  "feedback": {
    "correction": "Explicaci\u00f3n breve del error en espa\u00f1ol, o null",
    "vault_usage_detected": "palabra_del_vault o null",
    "score": 7
  }
}
    `;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages
        .filter((m: any) => !m.text?.startsWith('[INSTRUCCI'))
        .map((m: any) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
    ];

    console.log("\ud83e\udde0 [AI_TUTOR] Payload enviado a Groq:", JSON.stringify(
      { scenarioGoal, turnCount, vaultWords: targetWords.slice(0, 6), messagesCount: formattedMessages.length - 1 },
      null, 2
    ));

    try {
      const raw = await fetchGroq(formattedMessages, 0.6);
      console.log("\ud83d\udfe3 [AI_TUTOR] Respuesta cruda recibida:", JSON.stringify(raw));

      // Normalize feedback object defensively
      if (!raw.feedback || typeof raw.feedback !== 'object') {
        raw.feedback = { correction: null, vault_usage_detected: null, score: 5 };
      }
      raw.feedback.correction = raw.feedback.correction ?? null;
      raw.feedback.vault_usage_detected = raw.feedback.vault_usage_detected ?? null;
      raw.feedback.score = typeof raw.feedback.score === 'number' ? raw.feedback.score : 5;

      // Normalize legacy fields for backward compatibility
      if (!Array.isArray(raw.corrections)) raw.corrections = [];

      return raw as LessonResponse;
    } catch (error) {
      console.error("\ud83d\udd34 [AI_TUTOR] Error cr\u00edtico en la llamada:", error);
      return {
        text: "Sorry! Connection issue. Are you ready to try again?",
        translation: "\u00a1Lo siento! Problema de conexi\u00f3n. \u00bfEst\u00e1s listo para intentarlo de nuevo?",
        suggested_reply_en: "Yes, I am ready!",
        suggested_reply_es: "\u00a1S\u00ed, estoy listo!",
        feedback: { correction: null, vault_usage_detected: null, score: 0 },
        corrections: [],
      };
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
      vocabRule = `Vocabulario intermedio. Mezcla palabras del baúl del usuario: [${vaultWords.slice(0, 5).join(", ")}] con palabras nuevas.`;
    } else if (level >= 8) {
      wordLengthRule = "largas (5-8 letras)";
      minLen = 5;
      maxLen = 8;
      gridSize = 12;
      vocabRule = "Vocabulario avanzado.";
    }

    const themes = [
      "Comida",
      "Animales",
      "Hogar",
      "Cuerpo",
      "Ropa",
      "Ciudad",
      "Naturaleza",
      "Deportes",
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    const systemPrompt = `
Eres un creador de crucigramas en inglés.
REGLA 1 (LONGITUD Y SELECCIÓN): Tienes prohibido recortar, abreviar o inventar palabras. Las palabras en inglés deben tener NATURALMENTE entre ${wordLengthRule}. Si quieres usar "Fútbol" (SOCCER - 6 letras) pero tu límite es 5, NO la uses. Elige otra palabra válida como "Sol" (SUN - 3 letras).
REGLA 2 (TEMA): Usa la categoría '${randomTheme}'.
REGLA 3 (ORTOGRAFÍA): 'word' DEBE estar en INGLÉS, TODO EN MAYÚSCULAS, y contener ÚNICAMENTE letras de la A a la Z.
REGLA 4 (PISTAS): 'clue' DEBE ser la traducción al ESPAÑOL. Una sola palabra exacta.

EJEMPLOS DE LO QUE DEBES HACER:
{ "word": "APPLE", "clue": "Manzana" }
{ "word": "CAT", "clue": "Gato" }

EJEMPLOS DE LO QUE TIENES PROHIBIDO HACER:
{ "word": "SOCC", "clue": "Fútbol" } -> ERROR: Palabra mutilada/inventada.
{ "word": "PERRO", "clue": "Dog" } -> ERROR: Idiomas invertidos.

FORMATO JSON REQUERIDO:
{
  "items": [
    { "word": "PALABRA", "clue": "Traduccion" }
  ]
}
`;

    try {
      const data = await fetchGroq(
        [{ role: "system", content: systemPrompt }],
        0.2,
      );
      if (data.items && Array.isArray(data.items)) {
        const validItems = data.items.filter((item: any) => {
          if (!item.word || !item.clue) return false;
          const isAlpha = /^[A-Z]+$/.test(item.word);
          const validLen = item.word.length >= minLen && item.word.length <= maxLen;
          return isAlpha && validLen;
        });

        if (validItems.length > 0) {
          return { items: validItems, gridSize };
        }
      }
      throw new Error("Formato de respuesta inválido o sin palabras válidas");
    } catch (error) {
      console.error("AITutorService.generateCrosswordData Error:", error);
      return {
        items: [
          { word: "CAT", clue: "Gato" },
          { word: "SUN", clue: "Sol" },
          { word: "BOOK", clue: "Libro" },
          { word: "TREE", clue: "Árbol" },
          { word: "WATER", clue: "Agua" },
          { word: "PLANET", clue: "Planeta" },
        ].slice(0, wordCount),
        gridSize,
      };
    }
  },

  fetchGroq,
};
