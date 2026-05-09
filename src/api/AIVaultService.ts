import { fetchGroq, hasApiKey } from './GroqClient';

export const AIVaultService = {
  categorizeVaultWord: async (wordEn: string, wordEs: string): Promise<string> => {
    if (!hasApiKey()) return "General";

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
      console.error("AIVaultService.categorizeVaultWord Error:", error);
      return "General";
    }
  },

  generateTopicsForCategory: async (category: string): Promise<string[]> => {
    if (!hasApiKey()) return ["Presentarse", "Pedir direcciones", "Comprar algo"]; // fallback

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
      return data.topics || ["Presentarse", "Pedir direcciones", "Comprar algo"];
    } catch (error) {
      console.error("AIVaultService.generateTopics Error:", error);
      return ["Presentarse", "Pedir direcciones", "Comprar algo"];
    }
  }
};
