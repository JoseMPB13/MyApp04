import { supabase } from './supabase';

/**
 * Servicio para manejar la autenticación con Supabase.
 */
export const AuthService = {
  /**
   * Registro de un nuevo usuario.
   */
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
      await AuthService.ensureProfile(data.user.id, data.user.email || '');
    }
    return data;
  },

  /**
   * Cierre de sesión.
   */
  async signOut() {
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
    try {
      console.log(`AuthService: Sincronizando perfil para ${userId} (${email})`);
      
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, email },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('AuthService: Error en upsert profile:', error.message);
      } else {
        console.log('AuthService: Perfil sincronizado con éxito');
      }
    } catch (err) {
      console.error('AuthService: ensureProfile error crítico:', err);
    }
  }
};
