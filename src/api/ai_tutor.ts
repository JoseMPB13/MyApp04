/**
 * Servicio de Tutor IA para lecciones dinámicas (Tiny Lesson).
 * Utiliza Groq Cloud API (Llama 3.1) para procesar el lenguaje natural.
 */

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface FeedbackCapsule {
  grammar: string;
  vocabulary: string;
  naturalness: string;
}

export interface LessonResponse {
  text: string;
  feedbackType: 'success' | 'correction' | 'neutral';
  translation: string;
  feedbackCapsule: FeedbackCapsule;
  nextGoal?: string;
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
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: messages,
      temperature: temperature,
      response_format: { type: 'json_object' }
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in AI response');
  return JSON.parse(content);
};

const FALLBACK_WORDS = [
  { word: 'casa', translation: 'house' },
  { word: 'perro', translation: 'dog' },
  { word: 'gato', translation: 'cat' },
  { word: 'árbol', translation: 'tree' },
  { word: 'coche', translation: 'car' },
  { word: 'sol', translation: 'sun' },
  { word: 'luna', translation: 'moon' },
  { word: 'agua', translation: 'water' },
  { word: 'fuego', translation: 'fire' },
  { word: 'tierra', translation: 'earth' },
  { word: 'cielo', translation: 'sky' },
  { word: 'nube', translation: 'cloud' },
  { word: 'lluvia', translation: 'rain' },
  { word: 'nieve', translation: 'snow' },
  { word: 'viento', translation: 'wind' },
  { word: 'montaña', translation: 'mountain' },
  { word: 'río', translation: 'river' },
  { word: 'mar', translation: 'sea' },
  { word: 'playa', translation: 'beach' },
  { word: 'bosque', translation: 'forest' },
  { word: 'flor', translation: 'flower' },
  { word: 'hoja', translation: 'leaf' }
];

export const AITutorService = {
  categorizeVaultWord: async (wordEn: string, wordEs: string): Promise<string> => {
    if (!API_KEY) return 'General';

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
      const data = await fetchGroq([{ role: 'system', content: systemPrompt }]);
      return data.category || 'General';
    } catch (error) {
      console.error('AITutorService.categorizeVaultWord Error:', error);
      return 'General';
    }
  },

  generateTopicsForCategory: async (category: string): Promise<string[]> => {
    if (!API_KEY) return ['Presentarse', 'Pedir direcciones', 'Comprar algo']; // fallback
    
    const systemPrompt = `
      Genera exactamente 3 temas de conversación muy cortos (máximo 6 palabras cada uno) 
      para practicar inglés, basados en la categoría: "${category}".
      
      Devuelve SOLO un JSON con este formato exacto:
      {
        "topics": ["Tema 1", "Tema 2", "Tema 3"]
      }
    `;

    try {
      const data = await fetchGroq([{ role: 'system', content: systemPrompt }]);
      return data.topics || ['Presentarse', 'Pedir direcciones', 'Comprar algo'];
    } catch (error) {
      console.error('AITutorService.generateTopics Error:', error);
      return ['Presentarse', 'Pedir direcciones', 'Comprar algo'];
    }
  },

  getDailyTip: async (): Promise<{ english: string; spanish: string }> => {
    if (!API_KEY) return { english: "Practice makes perfect!", spanish: "¡La práctica hace al maestro!" };
    
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
      const data = await fetchGroq([{ role: 'system', content: systemPrompt }]);
      return { 
        english: data.english || "Keep pushing forward!", 
        spanish: data.spanish || "¡Sigue avanzando!" 
      };
    } catch (error) {
      console.error('AITutorService.getDailyTip Error:', error);
      return { 
        english: "Keep going, you're doing great!", 
        spanish: "¡Sigue así, lo estás haciendo genial!" 
      };
    }
  },

  getMiniLesson: async (): Promise<{ title: string; explanation: string; exampleEn: string; exampleEs: string }> => {
    if (!API_KEY) {
      return {
        title: "In / On / At",
        explanation: "'In' es para espacios cerrados, 'On' para superficies y 'At' para puntos específicos.",
        exampleEn: "I am in the car, on the street, at the corner.",
        exampleEs: "Estoy en el coche, en la calle, en la esquina."
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
      const data = await fetchGroq([{ role: 'system', content: systemPrompt }]);
      return {
        title: data.title || "Mini Lección",
        explanation: data.explanation || "¡Sigue practicando para mejorar!",
        exampleEn: data.exampleEn || "Keep going!",
        exampleEs: data.exampleEs || "¡Sigue adelante!"
      };
    } catch (error) {
      console.error('AITutorService.getMiniLesson Error:', error);
      return {
        title: "In / On / At",
        explanation: "'In' es para espacios cerrados, 'On' para superficies y 'At' para puntos específicos.",
        exampleEn: "I am in the car, on the street, at the corner.",
        exampleEs: "Estoy en el coche, en la calle, en la esquina."
      };
    }
  },

  generateMatcherLevel: async (level: number, vaultWords: string[], recentWords: string[] = []): Promise<WordPair[]> => {
    const themes = ["Comida y Bebida", "Animales Salvajes", "Profesiones", "Tecnología", "Viajes", "Ropa", "Deportes", "Hogar", "Cuerpo Humano", "Arte y Música"];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    console.log("🎯 [AI_TUTOR] Tema forzado para esta partida:", randomTheme);

    let pairCount = 3;
    let difficultyRule = "";

    if (level <= 3) {
      pairCount = 3;
      difficultyRule = "Genera exactamente 3 pares de palabras. El vocabulario debe ser muy básico y COMPLETAMENTE NUEVO para el usuario. No uses palabras complicadas.";
    } else if (level >= 4 && level <= 7) {
      pairCount = 4;
      difficultyRule = `Genera exactamente 4 pares de palabras. Mezcla algunas palabras conocidas del usuario: [${vaultWords.slice(0, 5).join(', ')}] con palabras NUEVAS de nivel intermedio.`;
    } else {
      pairCount = 5;
      difficultyRule = `Genera exactamente 5 pares de palabras. Mezcla palabras de su baúl: [${vaultWords.slice(0, 5).join(', ')}] con palabras NUEVAS de nivel avanzado o phrasal verbs complejos.`;
    }

    const systemPrompt = `
Eres un generador de vocabulario para nivel A1-B2 de inglés.
REGLA CRÍTICA DE DIFICULTAD: ${difficultyRule}

REGLAS ABSOLUTAS:
1. TEMA OBLIGATORIO: Todas las palabras NUEVAS que generes DEBEN estar relacionadas estrictamente con la categoría: '${randomTheme}'. No uses vocabulario de familia o mascotas a menos que ese sea el tema.
2. NO INVENTES PALABRAS. Usa únicamente sustantivos, verbos o adjetivos básicos y reales del diccionario Oxford.
3. TRADUCCIÓN ÚNICA. La traducción al español debe ser una sola palabra exacta (ej. NO "madrina, tía", solo "Madrina").
4. FORMATO DE TEXTO: Solo la primera letra debe ser mayúscula, el resto en minúscula. NUNCA uses todo en mayúsculas.
5. HISTORIAL PROHIBIDO: No generes estas palabras: [${recentWords.join(', ')}].

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
      console.log("🧠 [AI_TUTOR] Solicitando pares. Nivel:", level, "| Evitando:", recentWords);
      const data = await fetchGroq([{ role: 'system', content: systemPrompt }], 0.1);
      const rawPairs = data.pairs || [];
      console.log("✅ [AI_TUTOR] Respuesta cruda de Groq:", JSON.stringify(rawPairs));
      
      // Limitar al pairCount solicitado por si la IA se excede
      return rawPairs.slice(0, pairCount).map((p: any, index: number) => ({
        id: `gen-${level}-${index}-${Date.now()}`,
        matchId: index + 1,
        word: p.word,
        translation: p.translation
      }));
    } catch (error) {
      console.error('AITutorService.generateMatcherLevel Error:', error);
      // Fallback dinámico aleatorio sin repetir recientes
      const availableFallback = FALLBACK_WORDS.filter(
        w => !recentWords.includes(w.translation.toLowerCase()) && !recentWords.includes(w.word.toLowerCase())
      );
      const pool = availableFallback.length >= pairCount ? availableFallback : FALLBACK_WORDS;
      const shuffledFallback = [...pool].sort(() => Math.random() - 0.5);
      return shuffledFallback.slice(0, pairCount).map((p: any, index: number) => ({
        id: `f-${level}-${index}-${Date.now()}`,
        matchId: index + 1,
        word: p.word,
        translation: p.translation
      }));
    }
  },

  getLessonResponse: async (
    messages: any[], 
    scenarioGoal: string, 
    targetWords: string[] = [],
    turnCount: number = 1
  ): Promise<LessonResponse> => {
    if (!API_KEY) {
      throw new Error('Groq API Key missing');
    }

    const wordsConstraint = targetWords.length > 0 
      ? `Tus palabras objetivo para que el usuario use son: [${targetWords.join(', ')}].`
      : 'Usa vocabulario variado y natural.';

    const systemPrompt = `
      Eres un tutor de inglés experto para una app estilo Duolingo.
      ESCENARIO ACTUAL: "${scenarioGoal}"
      
      OBJETIVO:
      ${wordsConstraint}
      
      ESTADO DE LA LECCIÓN:
      Actualmente estamos en el turno ${turnCount} de 5.
      - Si estás en los turnos 1 a 4: Mantén la conversación fluida y haz una pregunta corta para continuar.
      - Si estás en el turno 5: Esta debe ser tu ÚLTIMA respuesta. Cierra la conversación de forma natural y felicita al usuario. NO hagas más preguntas.
      
      POR CADA RESPUESTA DEBES:
      1. Evaluar el mensaje del usuario (errores o aciertos).
      2. Proporcionar feedback detallado en 'feedbackCapsule'.
      3. Responder en inglés (campo 'text').
      
      FORMATO DE RESPUESTA (Responde ÚNICAMENTE en JSON):
      {
        "text": "Tu respuesta en inglés aquí",
        "feedbackType": "success" | "correction" | "neutral",
        "translation": "Traducción completa al español aquí",
        "feedbackCapsule": {
          "grammar": "Análisis corto de gramática en español",
          "vocabulary": "Análisis corto de vocabulario en español (menciona si usó las palabras objetivo)",
          "naturalness": "Cómo sonar más natural en inglés"
        },
        "nextGoal": "Siguiente paso de la historia"
      }
    `;

    // Convertir historial al formato de OpenAI
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
    ];

    try {
      const data = await fetchGroq(formattedMessages);
      return data as LessonResponse;
    } catch (error) {
      console.error('AITutorService Error:', error);
      return {
        text: "I'm having some trouble connecting, but let's keep trying!",
        feedbackType: 'neutral',
        translation: "Tengo problemas de conexión, ¡pero sigamos intentándolo!",
        feedbackCapsule: {
          grammar: "No disponible",
          vocabulary: "No disponible",
          naturalness: "No disponible"
        }
      };
    }
  },

  generateCrosswordData: async (level: number, vaultWords: string[]): Promise<CrosswordItem[]> => {
    const systemPrompt = `
      Genera exactamente 5 palabras en inglés con sus pistas en español para un mini crucigrama.
      REGLA 1: Las palabras en inglés deben ser cortas (entre 3 y 6 letras máximo).
      REGLA 2: Devuelve palabras de diccionario reales, todo en MAYÚSCULAS.
      REGLA 3: La 'clue' (pista) debe ser una oración corta o definición en español.
      Mezcla palabras del baúl del usuario: [${vaultWords.slice(0, 5).join(', ')}] con palabras nuevas.
      
      FORMATO DE RESPUESTA (Responde ÚNICAMENTE en JSON):
      {
        "items": [
          { "word": "APPLE", "clue": "Fruta roja o verde que cruje al morder." }
        ]
      }
    `;

    try {
      const data = await fetchGroq([{ role: 'system', content: systemPrompt }], 0.2);
      if (data.items && Array.isArray(data.items)) {
        return data.items;
      }
      throw new Error('Formato de respuesta inválido');
    } catch (error) {
      console.error('AITutorService.generateCrosswordData Error:', error);
      return [
        { word: 'CAT', clue: 'Mascota felina que maúlla.' },
        { word: 'SUN', clue: 'Estrella que ilumina el día.' },
        { word: 'BOOK', clue: 'Objeto con páginas para leer.' },
        { word: 'TREE', clue: 'Planta alta con tronco de madera.' },
        { word: 'WATER', clue: 'Líquido vital transparente.' }
      ];
    }
  },

  fetchGroq
};
