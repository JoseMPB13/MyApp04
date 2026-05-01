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
} from 'react-native';
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
        style={[styles.authButton, styles.logoutButton]} 
        onPress={onLogout}
      >
        <Text style={styles.authButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
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
  chatBubble: { flex: 1, backgroundColor: '#FFF', padding: 18, borderRadius: 22, borderTopLeftRadius: 4, minHeight: 80 },
  coachName: { fontWeight: '900', color: '#575fcf', marginBottom: 6, fontSize: 15 },
  coachMsg: { color: '#485460', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8
  }
});
