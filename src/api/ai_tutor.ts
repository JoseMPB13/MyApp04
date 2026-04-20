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
      const data = await AITutorService.fetchGroq([{ role: 'system', content: systemPrompt }]);
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
      const data = await AITutorService.fetchGroq([{ role: 'system', content: systemPrompt }]);
      return data.topics || ['Presentarse', 'Pedir direcciones', 'Comprar algo'];
    } catch (error) {
      console.error('AITutorService.generateTopics Error:', error);
      return ['Presentarse', 'Pedir direcciones', 'Comprar algo'];
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
      const data = await AITutorService.fetchGroq(formattedMessages);
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

  fetchGroq: async (messages: any[]) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');
    return JSON.parse(content);
  }
};
