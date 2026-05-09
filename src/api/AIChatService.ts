import { fetchGroq, hasApiKey } from './GroqClient';
import { supabase } from './supabase';
import { LessonResponse } from './ai_types';

export const AIChatService = {
  getLessonResponse: async (
    messages: any[],
    scenarioGoal: string,
    targetWords: string[] = [],
    turnCount: number = 1,
  ): Promise<LessonResponse> => {
    if (!hasApiKey()) throw new Error("Groq API Key missing");

    const isLastTurn = turnCount >= 5;

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

    try {
      const raw = await fetchGroq(formattedMessages, 0.6);
      
      if (!raw.feedback || typeof raw.feedback !== 'object') {
        raw.feedback = { correction: null, vault_usage_detected: null, score: 5 };
      }
      raw.feedback.correction = raw.feedback.correction ?? null;
      raw.feedback.vault_usage_detected = raw.feedback.vault_usage_detected ?? null;
      raw.feedback.score = typeof raw.feedback.score === 'number' ? raw.feedback.score : 5;
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

  getDailyTip: async (): Promise<{ english: string; spanish: string }> => {
    if (!hasApiKey())
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
    } catch {
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
    if (!hasApiKey()) {
      return {
        title: "In / On / At",
        explanation: "'In' es para espacios cerrados, 'On' para superficies y 'At' para puntos específicos.",
        exampleEn: "I am in the car, on the street, at the corner.",
        exampleEs: "Estoy en el coche, en la calle, en la esquina.",
      };
    }

    const systemPrompt = `
      Actúa como un profesor de inglés nativo y experto en pedagogía para hispanohablantes (Nivel A1-B1).
      Tu objetivo es generar una "Cápsula de Aprendizaje" de alto valor.

      ESTRUCTURA DE LA LECCIÓN:
      1. Título: El concepto (ej: "Diferencia entre DO y MAKE").
      2. Explicación: No solo definas, explica la REGLA DE ORO o el CONTEXTO de uso (máx 150 caracteres).
      3. Ejemplo: Una frase natural y cotidiana en inglés.
      4. Traducción: La traducción exacta.

      REGLAS CRÍTICAS:
      - Responde ÚNICAMENTE con el objeto JSON.
    `;

    try {
      const data = await fetchGroq([{ role: "system", content: systemPrompt }], 0.7);
      return {
        title: data.title || "Mini Lección",
        explanation: data.explanation || "¡Sigue practicando para mejorar!",
        exampleEn: data.exampleEn || "Learning is a journey.",
        exampleEs: data.exampleEs || "Aprender es un viaje.",
      };
    } catch (error) {
      return {
        title: "In / On / At",
        explanation: "'In' es para espacios cerrados, 'On' para superficies y 'At' para puntos específicos.",
        exampleEn: "I am in the car, on the street, at the corner.",
        exampleEs: "Estoy en el coche, en la calle, en la esquina.",
      };
    }
  },

  saveChatMessage: async (
    userId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    scenarioId?: string, 
    feedback?: any
  ) => {
    try {
      const { error } = await supabase
        .from('chat_history')
        .insert([{
          user_id: userId,
          role: role,
          content: content,
          scenario_id: scenarioId,
          feedback: feedback
        }]);
      
      if (error) {
        console.warn('AIChatService.saveChatMessage failed:', error.message);
      }
    } catch {
      console.warn('AIChatService.saveChatMessage error occurred');
    }
  }
};
