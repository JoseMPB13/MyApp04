import { DeviceEventEmitter } from "react-native";
import { MissionsService } from "./missions";
import { supabase } from "./supabase";

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  exp_reward: number;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export const AchievementsService = {
  /**
   * Obtiene el catálogo completo de logros disponibles.
   */
  async getAllAchievements(): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .order("exp_reward", { ascending: true });

    if (error) {
      console.error("Error fetching achievements:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Obtiene los logros que un usuario ya ha desbloqueado.
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const { data, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user achievements:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Intenta desbloquear un logro para el usuario.
   * Si tiene éxito, suma la recompensa de experiencia.
   */
  async unlockAchievement(
    userId: string,
    achievementId: string,
    expReward: number,
    achievementName: string,
  ) {
    try {
      const { error } = await supabase
        .from("user_achievements")
        .insert([{ user_id: userId, achievement_id: achievementId }]);

      if (error) {
        // Manejar silenciosamente si el logro ya fue desbloqueado (Violación de unicidad)
        if (error.code === "23505" || error.code === "PGRST204") {
          return { success: true, alreadyUnlocked: true };
        }
        throw error;
      }

      // Si se insertó correctamente, sumamos la EXP al progreso del usuario
      await MissionsService.addUserExp(userId, expReward);

      // Emitir evento para el Toast Global
      DeviceEventEmitter.emit("achievementUnlocked", { name: achievementName });

      return { success: true };
    } catch (error) {
      console.error("AchievementsService.unlockAchievement ERROR:", error);
      return { success: false, error };
    }
  },
};
