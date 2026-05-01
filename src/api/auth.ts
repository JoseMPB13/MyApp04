import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  preferred_language: string;
  is_premium: boolean;
  updated_at?: string;
}

/**
 * Servicio para manejar la autenticación con Supabase.
 */
// Variable interna para evitar bucles de sincronización infinitos
let lastSyncedUserId: string | null = null;

export const AuthService = {
  /**
   * Registro de un nuevo usuario.
   */
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) throw error;

    return data;
  },

  /**
   * Inicio de sesión.
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // Asegurar que el perfil existe después de login
    if (data.user) {
      await AuthService.ensureProfile(data.user.id, data.user.email || "");
    }
    return data;
  },

  /**
   * Cierre de sesión.
   */
  async signOut() {
    lastSyncedUserId = null; // Limpiar al salir
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Recuperación de contraseña.
   */
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  },

  /**
   * Eliminar cuenta de usuario permanentemente.
   * Llama a la función RPC delete_user() que borra de auth.users.
   */
  async deleteAccount() {
    const { error } = await supabase.rpc("delete_user");
    if (error) throw error;
    await AuthService.signOut();
  },

  /**
   * Obtener el usuario actual.
   */
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Obtener perfil completo de un usuario
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, username, avatar_url, preferred_language, is_premium")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("AuthService: error al obtener perfil:", error);
      return null;
    }
    return data;
  },

  /**
   * Actualizar username
   */
  async updateProfileUsername(userId: string, newName: string) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ username: newName })
      .eq("id", userId);

    if (error) throw error;
    return data;
  },

  /**
   * Listener para cambios en el estado de autenticación.
   */
  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },

  /**
   * Asegura que el usuario tenga un registro en la tabla 'profiles'.
   * Usa upsert para evitar errores de duplicidad y sincronizar el email.
   */
  async ensureProfile(userId: string, email: string) {
    if (lastSyncedUserId === userId) return; // Evitar bucles redundantes

    try {
      console.log(
        `AuthService: Sincronizando perfil para ${userId} (${email})`,
      );

      const { data: existing } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from("profiles")
          .upsert(
            { id: userId, email, username: email.split("@")[0] },
            { onConflict: "id" },
          );

        if (error) {
          console.error("AuthService: Error en upsert profile:", error.message);
        } else {
          console.log("AuthService: Perfil sincronizado con éxito");
          lastSyncedUserId = userId; // Marcar como sincronizado
        }
      } else {
        lastSyncedUserId = userId; // Marcar como sincronizado
      }
    } catch (err) {
      console.error("AuthService: ensureProfile error crítico:", err);
    }
  },
};
