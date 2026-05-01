import { supabase } from './supabase';

export interface StreakData {
  current_streak: number;
  max_streak: number;
  last_completion_date: string | null;
  completed_dates?: string[]; // Array de fechas en formato 'YYYY-MM-DD'
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

      const today = new Date().toLocaleDateString('en-CA');
      const currentDates = streak?.completed_dates || [];
      const updatedDates = currentDates.includes(today) ? currentDates : [...currentDates, today];

      let newStreak = 1;
      let newMax = 1;

      if (streak) {
        const lastDate = streak.last_completion_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

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
            completed_dates: updatedDates
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
            last_completion_date: today,
            completed_dates: [today]
          }]);
        if (insertError) throw insertError;
      }

      // -- LÓGICA DE LOGROS --
      // Importación dinámica para evitar dependencias circulares
      const { AchievementsService } = await import('./achievements');

      // 3. Revisar Logros de Racha
      if (newStreak === 1) await AchievementsService.unlockAchievement(userId, 'streak_1', 50, 'Racha Inicial');
      if (newStreak === 3) await AchievementsService.unlockAchievement(userId, 'streak_3', 100, 'Constancia');
      if (newStreak === 7) await AchievementsService.unlockAchievement(userId, 'streak_7', 300, 'Imparable');
      if (newStreak === 30) await AchievementsService.unlockAchievement(userId, 'streak_30', 1000, 'Maestro del Hábito');

      // 4. Revisar Logros de Misiones Totales
      const { count: missionCount } = await supabase
        .from('mission_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (missionCount === 1) await AchievementsService.unlockAchievement(userId, 'mission_1', 50, 'Primer Paso');
      if (missionCount === 10) await AchievementsService.unlockAchievement(userId, 'mission_10', 150, 'Aprendiz');
      if (missionCount === 50) await AchievementsService.unlockAchievement(userId, 'mission_50', 500, 'Estudiante Dedicado');
      if (missionCount === 100) await AchievementsService.unlockAchievement(userId, 'mission_100', 1500, 'Leyenda');

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
      .select('current_streak, max_streak, last_completion_date, completed_dates')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    const result: StreakData = { ...data };

    if (data.last_completion_date) {
      const today = new Date().toLocaleDateString('en-CA');
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toLocaleDateString('en-CA');

      if (data.last_completion_date < yesterday && data.last_completion_date !== today) {
        // La racha expiró, sobrescribimos para la UI (la DB se actualizará al completar otra misión)
        result.current_streak = 0;
      }
    }

    return result;
  },

  /**
   * Obtiene el progreso del usuario desde Supabase.
   * Si no existe, lo inicializa.
   */
  async getUserProgress(userId: string): Promise<{ total_exp: number; current_level: number; lifetime_xp: number }> {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('total_exp, current_level, lifetime_xp')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        return { 
          total_exp: data.total_exp, 
          current_level: data.current_level,
          lifetime_xp: data.lifetime_xp || 0
        };
      }

      // No existe, inicializar
      const { data: insertData, error: insertError } = await supabase
        .from('user_progress')
        .insert([{ user_id: userId, total_exp: 0, current_level: 1, lifetime_xp: 0 }])
        .select('total_exp, current_level, lifetime_xp')
        .single();

      if (insertError) throw insertError;

      return { 
        total_exp: insertData.total_exp, 
        current_level: insertData.current_level,
        lifetime_xp: insertData.lifetime_xp || 0
      };
    } catch (error) {
      console.error('Error in getUserProgress:', error);
        return { total_exp: 0, current_level: 1, lifetime_xp: 0 };
    }
  },

  /**
   * Añade experiencia al usuario y actualiza su nivel en Supabase.
   */
  async addUserExp(userId: string, amount: number): Promise<{ level: number; exp: number }> {
    try {
      const progress = await MissionsService.getUserProgress(userId);
      const newExp = progress.total_exp + amount;
      const newLifetimeXp = (progress.lifetime_xp || 0) + amount;
      const newLevel = Math.floor(newExp / 100) + 1;

      const { error } = await supabase
        .from('user_progress')
        .update({ 
          total_exp: newExp, 
          current_level: newLevel,
          lifetime_xp: newLifetimeXp
        })
        .eq('user_id', userId);

      if (error) throw error;

      return { level: newLevel, exp: newExp };
    } catch (error) {
      console.error('Error in addUserExp:', error);
      return { level: 1, exp: 0 };
    }
  },

  /**
   * Calcula el nivel a partir de la experiencia (100 EXP por nivel).
   */
  getLevelFromExp(exp: number): number {
    return Math.floor(exp / 100) + 1;
  }
};
