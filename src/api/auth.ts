import { supabase } from './supabase';

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
    });
    if (error) throw error;
    
    // Once signed up, store the username inside their profile immediately
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, email, username }, { onConflict: 'id' });
      if (profileError) console.error("Error creating initial profile", profileError);
    }
    
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
      await AuthService.ensureProfile(data.user.id, data.user.email || '');
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
   * Obtener el usuario actual.
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },



  /**
   * Obtener perfil extra de un usuario
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) console.error('AuthService: error al obtener perfil:', error);
    return data;
  },

  /**
   * Actualizar username
   */
  async updateProfileUsername(userId: string, newName: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: newName })
      .eq('id', userId);
      
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
      console.log(`AuthService: Sincronizando perfil para ${userId} (${email})`);
      
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', userId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            { id: userId, email, username: email.split('@')[0] },
            { onConflict: 'id' }
          );

        if (error) {
          console.error('AuthService: Error en upsert profile:', error.message);
        } else {
          console.log('AuthService: Perfil sincronizado con éxito');
          lastSyncedUserId = userId; // Marcar como sincronizado
        }
      } else {
        lastSyncedUserId = userId; // Marcar como sincronizado
      }
    } catch (err) {
      console.error('AuthService: ensureProfile error crítico:', err);
    }
  }
};
