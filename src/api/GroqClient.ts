/**
 * 🚨 ATENCIÓN SOBRE SEGURIDAD 🚨
 * Este cliente actualmente usa una clave de API pública desde el frontend.
 * 
 * PARA MIGRAR A SUPABASE (Recomendado):
 * 1. Crea una Edge Function en Supabase (ej. supabase/functions/groq-chat/index.ts)
 * 2. Esa función debe usar la llave de Groq que guardarás en los secrets de Supabase.
 * 3. Modifica la función 'fetchGroq' aquí para que llame a supabase.functions.invoke('groq-chat', { body: { messages, temperature } })
 * 
 * Así ocultas la llave y proteges tu facturación.
 */

const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const fetchGroq = async (messages: any[], temperature: number = 0.7) => {
  if (!API_KEY) throw new Error("Groq API Key missing");

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

export const hasApiKey = () => !!API_KEY;
