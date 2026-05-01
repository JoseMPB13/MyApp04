import { supabase } from './supabase';

export interface VaultWord {
  id?: string;
  user_id: string;
  word_es: string;
  word_en: string;
  category?: string;
  status?: 'learning' | 'mastered';
  mastery_percent?: number;
  difficulty_score?: number;
  created_at?: string;
}

export const VaultService = {
  /**
   * Obtiene todas las palabras en el baúl del usuario.
   */
  async getWords(userId: string): Promise<VaultWord[]> {
    const { data, error } = await supabase
      .from('user_vault')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vault:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Agrega una nueva palabra al baúl.
   * Se construye el payload explícitamente para evitar enviar un 'id' (aunque sea null)
   * y permitir que Supabase genere el UUID automáticamente (evita error 409).
   */
  async addVaultItem(word: VaultWord) {
    if (!word.user_id) {
      console.error('VaultService.addVaultItem: Missing user_id');
      return { success: false, error: { message: 'ID de usuario faltante' } };
    }

    const payload = {
      user_id: word.user_id,
      word_en: word.word_en,
      word_es: word.word_es,
      category: word.category || 'General',
      status: word.status || 'learning',
      mastery_percent: word.mastery_percent ?? 0,
      difficulty_score: word.difficulty_score ?? 1.0
    };

    console.log('VaultService.addVaultItem: Intentando guardar...', payload);

    const { data, error } = await supabase
      .from('user_vault')
      .insert([payload])
      .select();

    if (error) {
      console.error('VaultService.addVaultItem ERROR:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return { success: false, error };
    }

    console.log('VaultService.addVaultItem SUCCESS:', data);
    return { success: true, data };
  },

  /**
   * Actualiza el estado de una palabra (ej: de learning a mastered).
   */
  async updateWordStatus(wordId: string, status: 'learning' | 'mastered') {
    const { error } = await supabase
      .from('user_vault')
      .update({ status })
      .eq('id', wordId);

    if (error) {
      console.error('Error updating status:', error);
      return { success: false, error };
    }
    return { success: true };
  },

  /**
   * Elimina una palabra del baúl.
   */
  async deleteWord(wordId: string) {
    const { error } = await supabase
      .from('user_vault')
      .delete()
      .eq('id', wordId);

    if (error) {
      console.error('Error deleting word:', error);
      return { success: false, error };
    }
    return { success: true };
  },

  /**
   * Sincroniza palabras acertadas en un juego.
   * Si la palabra ya existe, puede aumentar su maestría (en este caso lo fijamos al 20% inicial).
   * Si no existe, se crea con 20%.
   */
  async syncMatchedWords(userId: string, words: { word: string, translation: string }[]) {
    try {
      // Filtrar duplicados locales para optimizar peticiones
      const uniqueWords = words.filter((w, index, self) =>
        index === self.findIndex((t) => t.translation === w.translation)
      );

      const tasks = uniqueWords.map(async (w) => {
        const { data: existing, error: fetchError } = await supabase
          .from('user_vault')
          .select('id, mastery_percent')
          .eq('user_id', userId)
          .eq('word_en', w.translation)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          // Si ya existe, actualizamos a 20% si es menor, sin tocar fechas (lo hace el Trigger)
          if ((existing.mastery_percent || 0) < 20) {
            const { error: updateError } = await supabase
              .from('user_vault')
              .update({ mastery_percent: 20 })
              .eq('id', existing.id);
            
            if (updateError) throw updateError;
          }
        } else {
          // Si no existe, creamos el registro con valores base
          const { success, error: insertError } = await this.addVaultItem({
            user_id: userId,
            word_es: w.word,
            word_en: w.translation,
            status: 'learning',
            mastery_percent: 20,
            difficulty_score: 1.0
          });
          
          if (!success) throw insertError;
        }
      });

      await Promise.all(tasks);
      return { success: true };
    } catch (error) {
      console.error('VaultService.syncMatchedWords ERROR:', error);
      return { success: false, error };
    }
  },

  /**
   * Obtiene vocabulario inicial para nuevos usuarios desde la tabla 'vocabulary'.
   */
  async getStarterVocabulary() {
    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('theme, word_en, word_es, difficulty')
        .eq('is_active', true)
        .limit(30); // Traemos un pool y barajamos en memoria
      
      if (error) throw error;
      
      if (!data || data.length === 0) return [];

      // Barajar y tomar 8 palabras aleatorias
      return data
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);
    } catch (error) {
      console.error('VaultService.getStarterVocabulary ERROR:', error);
      return [];
    }
  }
};
