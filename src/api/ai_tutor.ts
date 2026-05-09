/**
 * Este archivo actúa como una fachada (Facade) para mantener la compatibilidad hacia atrás
 * con los componentes existentes de la aplicación, mientras que la lógica de IA
 * se ha dividido en módulos más pequeños y mantenibles.
 */

import { AIVaultService } from './AIVaultService';
import { AIChatService } from './AIChatService';
import { AIGameService } from './AIGameService';
import { fetchGroq } from './GroqClient';

// Re-exportar los tipos para que los componentes puedan seguir importándolos desde aquí
export * from './ai_types';

export const AITutorService = {
  // Vault
  categorizeVaultWord: AIVaultService.categorizeVaultWord,
  generateTopicsForCategory: AIVaultService.generateTopicsForCategory,

  // Chat & Lessons
  getLessonResponse: AIChatService.getLessonResponse,
  getDailyTip: AIChatService.getDailyTip,
  getMiniLesson: AIChatService.getMiniLesson,
  saveChatMessage: AIChatService.saveChatMessage,

  // Games
  generateMatcherLevel: AIGameService.generateMatcherLevel,
  generateCrosswordData: AIGameService.generateCrosswordData,

  // Groq Client exportado para casos de uso heredados si los hubiera
  fetchGroq,
};
