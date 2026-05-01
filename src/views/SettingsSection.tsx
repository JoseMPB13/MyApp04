import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { AuthService } from '../api/auth';

export default function SettingsSection({ user, onLogout, onProfileUpdate }: any) {
  const { colors, isDarkMode, toggleTheme } = useAppTheme();
  const { updateUser } = useUser();
  const [nameInput, setNameInput] = useState(user?.user_metadata?.username || '');
  const [saving, setSaving] = useState(false);

  const handleUpdateName = async () => {
    if (!nameInput.trim() || nameInput === user?.user_metadata?.username) return;
    setSaving(true);
    try {
      await AuthService.updateProfileUsername(user.id, nameInput.trim());
      updateUser({ username: nameInput.trim() }); // Actualización instantánea global
      onProfileUpdate({
        ...user,
        user_metadata: { ...user.user_metadata, username: nameInput.trim() }
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "🗑️ Borrar Cuenta",
      "¿Estás completamente seguro? Esta acción eliminará permanentemente tu racha, palabras guardadas y todo tu progreso. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Borrar Permanentemente", 
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await AuthService.deleteAccount();
              // No es necesario redirigir, onAuthStateChange lo hará solo
            } catch (e) {
              console.error(e);
              Alert.alert("Error", "No se pudo borrar la cuenta. Inténtalo de nuevo.");
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Ajustes</Text>
      
      <View style={[styles.chatBubble, styles.cardShadow, { marginBottom: 16, borderRadius: 20, backgroundColor: colors.card }]}>
        <Text style={[styles.coachName, { color: colors.text, opacity: 0.7, fontSize: 13, marginBottom: 10 }]}>TU CUENTA: {user?.email}</Text>
        
        <Text style={[styles.coachName, { color: colors.text, fontSize: 15 }]}>Nombre de Usuario</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.border, color: colors.text }]}
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Escribe tu nombre..."
          placeholderTextColor="#95a5a6"
        />
        <TouchableOpacity 
          style={[styles.authButton, { marginTop: 16, width: '100%' }]} 
          onPress={handleUpdateName}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authButtonText}>Guardar Perfil</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.chatBubble, styles.cardShadow, { marginBottom: 24, borderRadius: 20, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View>
          <Text style={[styles.coachName, { color: colors.text, fontSize: 15, marginBottom: 2 }]}>Modo Oscuro</Text>
          <Text style={[styles.coachMsg, { color: colors.text, opacity: 0.6, fontSize: 13 }]}>Aplica el tema nocturno</Text>
        </View>
        <Switch 
          value={isDarkMode} 
          onValueChange={toggleTheme}
          trackColor={{ false: "#d2dae2", true: colors.accent }}
        />
      </View>
      
      <TouchableOpacity 
        style={[styles.authButton, styles.logoutButton, { marginBottom: 24 }]} 
        onPress={onLogout}
      >
        <Text style={styles.authButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Tarjeta de Zona de Peligro Refinada */}
      <View style={[styles.chatBubble, styles.cardShadow, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderColor: '#ff475720', borderWidth: 1 }]}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning" size={18} color="#ff4757" />
          <Text style={[styles.dangerTitle, { color: '#ff4757' }]}>Zona de Peligro</Text>
        </View>
        
        <Text style={[styles.coachMsg, { color: colors.text, opacity: 0.6, fontSize: 13, marginBottom: 16 }]}>
          Si decides borrar tu cuenta, perderás permanentemente todo tu progreso, vocabulario y logros. Esta acción no se puede deshacer.
        </Text>

        <TouchableOpacity 
          style={[styles.deleteButton, { backgroundColor: isDarkMode ? '#ff475720' : '#fff5f5' }]} 
          onPress={handleDeleteAccount}
          disabled={saving}
        >
          <Ionicons name="trash-outline" size={20} color="#ff4757" />
          <Text style={styles.deleteButtonText}>Eliminar mi cuenta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#1e272e', marginBottom: 8 },
  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
  authButton: {
    backgroundColor: '#3c40c6',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#3c40c6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 5 },
      web: { boxShadow: '0px 8px 12px rgba(60, 64, 198, 0.3)' }
    })
  },
  authButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  logoutButton: {
    backgroundColor: '#ff4757',
    ...Platform.select({
      ios: { shadowColor: '#ff4757', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 5 },
      web: { boxShadow: '0px 8px 12px rgba(255, 71, 87, 0.3)' }
    })
  },
  chatBubble: { backgroundColor: '#FFF', padding: 18, borderRadius: 22, borderTopLeftRadius: 4, minHeight: 80 },
  coachName: { fontWeight: '900', color: '#575fcf', marginBottom: 6, fontSize: 15 },
  coachMsg: { color: '#485460', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff475740',
  },
  deleteButtonText: {
    color: '#ff4757',
    fontSize: 15,
    fontWeight: '700'
  }
});
