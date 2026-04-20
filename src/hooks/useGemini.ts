import { useState } from 'react';

/**
 * Hook de traducción usando Google Gemini 1.5 Flash (Free Tier).
 * Usa fetch directo para evitar dependencias pesadas.
 */
export const useGemini = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = async (text: string, targetLanguage: 'Spanish' | 'English'): Promise<string | null> => {
    if (!text.trim()) return null;

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini API Key missing');
      return null;
    }

    setLoading(true);
    setError(null);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Translate the following word or short phrase to ${targetLanguage}. 
    Response rules:
    - Output ONLY the translated text.
    - No explanations, no punctuation unless part of the word.
    - Match the capitalization of the input.
    Input: "${text.trim()}"`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 20,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const translated = data.candidates[0].content.parts[0].text.trim();
        setLoading(false);
        return translated;
      }

      console.error('Gemini API Error Response:', data);
      throw new Error('Error en la respuesta de Gemini');
    } catch (err: any) {
      console.error('Gemini Translation Error:', err);
      setError('IA no disponible. Escribe manualmente.');
      setLoading(false);
      return null;
    }
  };

  return { translate, loading, error };
};
