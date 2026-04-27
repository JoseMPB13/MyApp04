import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StreakData {
  current_streak: number;
  max_streak: number;
  last_completion_date: string | null;
  historical_streak?: number;
}

export const MissionsService = {
  /**
   * Registra una misión completada y actualiza la racha.
   */
  async completeMission(userId: string, missionType: string) {
    try {
      // 1. Insertar log de misión
      const { error: logError } = await supabase
        .from('mission_logs')
        .insert([{ user_id: userId, mission_type: missionType }]);

      if (logError) throw logError;

      // 2. Obtener racha actual
      const { data: streak, error: streakFetchError } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (streakFetchError && streakFetchError.code !== 'PGRST116') throw streakFetchError;

      const today = new Date().toISOString().split('T')[0];
      let newStreak = 1;
      let newMax = 1;

      if (streak) {
        const lastDate = streak.last_completion_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === today) {
          // Ya completó una hoy, la racha se mantiene igual
          newStreak = streak.current_streak;
          newMax = streak.max_streak;
        } else if (lastDate === yesterdayStr) {
          // Continuidad de racha
          newStreak = streak.current_streak + 1;
          newMax = Math.max(newStreak, streak.max_streak);
        } else {
          // Racha perdida, empieza en 1
          newStreak = 1;
          newMax = streak.max_streak;
        }

        const { error: updateError } = await supabase
          .from('user_streaks')
          .update({ 
            current_streak: newStreak, 
            max_streak: newMax, 
            last_completion_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        if (updateError) throw updateError;
      } else {
        // Primera vez
        const { error: insertError } = await supabase
          .from('user_streaks')
          .insert([{ 
            user_id: userId, 
            current_streak: 1, 
            max_streak: 1, 
            last_completion_date: today 
          }]);
        if (insertError) throw insertError;
      }

      return { success: true, streak: newStreak };
    } catch (error) {
      console.error('Error in completeMission:', error);
      return { success: false, error };
    }
  },

  /**
   * Obtiene la racha actual del usuario.
   */
  async getStreak(userId: string): Promise<StreakData | null> {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('current_streak, max_streak, last_completion_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    const result = { ...data, historical_streak: data.current_streak };

    if (data.last_completion_date) {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      if (data.last_completion_date < yesterday) {
        // La racha expiró, sobrescribimos para la UI (la DB se actualizará al completar otra misión)
        result.current_streak = 0;
      }
    }

    return result;
  },

  /**
   * Obtiene la experiencia actual del Matcher guardada en AsyncStorage.
   */
  async getMatcherExp(userId: string): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(`matcher_exp_${userId}`);
      if (val) return parseInt(val, 10);
      return 0;
    } catch {
      return 0;
    }
  },

  /**
   * Añade experiencia al Matcher y la guarda.
   */
  async addMatcherExp(userId: string, amount: number): Promise<number> {
    try {
      const current = await MissionsService.getMatcherExp(userId);
      const next = current + amount;
      await AsyncStorage.setItem(`matcher_exp_${userId}`, next.toString());
      return next;
    } catch {
      return 0;
    }
  },

  /**
   * Calcula el nivel a partir de la experiencia (100 EXP por nivel).
   */
  getLevelFromExp(exp: number): number {
    return Math.floor(exp / 100) + 1;
  }
};
