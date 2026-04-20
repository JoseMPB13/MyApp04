import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Switch,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../src/api/auth';
import AuthSection from '../src/screens/AuthSection';
import { MissionsService, StreakData } from '../src/api/missions';
import ActividadesSection from '../src/screens/ActividadesSection';
import VaultSection from '../src/screens/VaultSection';
import { VaultService } from '../src/api/vault';
import { AITutorService } from '../src/api/ai_tutor';
import { useAppTheme } from '../src/context/ThemeContext';

// El USER_ID ahora se obtiene dinámicamente de la sesión de Supabase

// ... (Utilidades y TabIcon omitidos por brevedad en este chunk, se mantienen los existentes)

// --- Utilidades ---
const DAYS_NAMES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getGreeting = () => {
  const hours = new Date().getHours();
  if (hours < 12) return '¡Buenos días';
  if (hours < 18) return '¡Buenas tardes';
  return '¡Buenas noches';
};

const isCompleted = (date: Date, streak: StreakData | null) => {
  if (!streak || !streak.last_completion_date || streak.current_streak === 0) return false;
  // Parse last date 
  const [year, month, day] = streak.last_completion_date.split('-').map(Number);
  const lastDate = new Date(year, month - 1, day);
  // Normalize target date to start of day
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (target > lastDate) return false;
  
  const diffTime = lastDate.getTime() - target.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays < streak.current_streak;
};

// --- Componentes compartidos ---
const TabIcon = ({ name, active }: { name: string; active: boolean }) => {
  let iconName: any = 'home';
  if (name === 'inicio') iconName = active ? 'home' : 'home-outline';
  if (name === 'activities') iconName = active ? 'compass' : 'compass-outline';
  if (name === 'vault') iconName = active ? 'archive' : 'archive-outline';
  if (name === 'settings') iconName = active ? 'settings' : 'settings-outline';

  return (
    <View style={styles.iconContainer}>
      <Ionicons name={iconName} size={26} color={active ? '#575fcf' : '#d2dae2'} />
    </View>
  );
};

// --- SECCIÓN 1: INICIO ---
const InicioSection = ({ streak, user }: { streak: StreakData | null, user: any }) => {
  const { colors, username } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewDate] = useState(new Date());
  const expandAnim = useRef(new Animated.Value(0)).current;
  
  const [dailyTip, setDailyTip] = useState<{english: string, spanish: string} | null>(null);
  const [loadingTip, setLoadingTip] = useState(true);

  useEffect(() => {
    AITutorService.getDailyTip().then(tip => {
      setDailyTip(tip);
      setLoadingTip(false);
    });
  }, []);

  const toggleExpand = () => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const displayName = username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Amigo';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sectionPadding}>
      <Text style={[styles.greetingText, { color: colors.text }]}>
        {getGreeting()}, <Text style={{ color: colors.accent }}>{displayName}</Text>! 👋
      </Text>
      
      <View style={styles.cardShadow}>
        <TouchableOpacity activeOpacity={0.9} onPress={toggleExpand} style={styles.streakPanel}>
          <LinearGradient colors={['#575fcf', '#3c40c6']} style={styles.streakGradient}>
            <View style={styles.streakInfo}>
              <View style={styles.streakIconMain}>
                <Ionicons name="flame" size={30} color="#FFF" />
              </View>
              <View>
                <Text style={styles.streakCount}>{streak?.current_streak || 0} Días</Text>
                <Text style={styles.streakSub}>¡Racha imparable!</Text>
              </View>
            </View>

            <View style={styles.weeklyRow}>
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const dayLabel = DAYS_NAMES[d.getDay()];
                const isDone = isCompleted(d, streak);
                
                return (
                  <View key={i} style={styles.weekDay}>
                    <Text style={styles.weekDayLabel}>{dayLabel}</Text>
                    <View style={[styles.weekDayCircle, isDone ? styles.doneDay : styles.pendingDay]}>
                      {isDone ? <Ionicons name="checkmark" size={16} color="#FFF" /> : <View style={styles.emptyDot} />}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.expandHint}>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.tapToExpand}>{isExpanded ? 'Ver menos' : 'Ver historial completo'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.expandedContainer, { backgroundColor: colors.card, height: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }), opacity: expandAnim }]}>
        <View style={styles.calendarFull}>
           <Text style={[styles.monthTitle, { color: colors.text }]}>{MONTHS_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
           <View style={styles.calendarGrid}>
             {(() => {
               const year = viewDate.getFullYear();
               const month = viewDate.getMonth();
               const daysInMonth = new Date(year, month + 1, 0).getDate();
               const firstDayIndex = new Date(year, month, 1).getDay(); // 0 represents Sunday
               
               const paddingDays = Array.from({ length: firstDayIndex }).map((_, i) => (
                 <View key={`pad-${i}`} style={[styles.calendarDay, { backgroundColor: 'transparent' }]} />
               ));
               
               const monthDays = Array.from({ length: daysInMonth }).map((_, i) => {
                 const d = new Date(year, month, i + 1);
                 const isDone = isCompleted(d, streak);
                 const isToday = new Date().toDateString() === d.toDateString();
                 
                 return (
                   <View key={i} style={[
                     styles.calendarDay,
                     { backgroundColor: colors.border },
                     isDone ? styles.calendarDayDone : null,
                     isToday && !isDone ? { borderWidth: 2, borderColor: colors.accent } : null
                   ]}>
                     <Text style={[styles.calendarDayText, { color: colors.text }, isDone ? { color: '#FFF' } : null]}>{i + 1}</Text>
                   </View>
                 );
               });

               const weekHeader = DAYS_NAMES.map((d, i) => (
                 <View key={`hdr-${i}`} style={[styles.calendarDay, { backgroundColor: 'transparent', height: 20 }]}>
                    <Text style={{ fontSize: 10, color: '#A4B0BE', fontWeight: 'bold' }}>{d}</Text>
                 </View>
               ));

               return [
                 ...weekHeader,
                 ...paddingDays,
                 ...monthDays
               ];
             })()}
           </View>
        </View>
      </Animated.View>

      <View style={styles.coachContext}>
        <View style={[styles.raccoonAvatar, styles.cardShadow, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={{ fontSize: 32 }}>🦝</Text>
        </View>
        <View style={[styles.chatBubble, styles.cardShadow, { backgroundColor: colors.card }]}>
          <Text style={[styles.coachName, { color: colors.accent }]}>Coach Raccoon</Text>
          {loadingTip ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
          ) : (
            <>
              <Text style={[styles.coachMsg, { fontWeight: 'bold', color: colors.text }]}>
                &quot;{dailyTip?.english}&quot;
              </Text>
              <Text style={[styles.coachMsg, { marginTop: 4, fontSize: 13, color: colors.text, opacity: 0.8 }]}>
                {dailyTip?.spanish}
              </Text>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

// --- APP PRINCIPAL ---
export default function HomeScreen() {
  const { colors, isDarkMode, updateUsername } = useAppTheme();
  
  const [activeTab, setActiveTab] = useState('inicio');
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const navAnim = useRef(new Animated.Value(0)).current;

  // ...
  const toggleNav = () => {
    const toValue = isNavVisible ? 130 : 0;
    Animated.spring(navAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsNavVisible(!isNavVisible);
  };

  const handleMissionStateChange = (active: boolean) => {
    const toValue = active ? 130 : 0;
    Animated.spring(navAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsNavVisible(!active);
  };

  const fetchFullProfile = async (user: any) => {
    await AuthService.ensureProfile(user.id, user.email || '');
    const profile = await AuthService.getProfile(user.id);
    if (profile?.username) {
      updateUsername(profile.username);
    }
    return { ...user, user_metadata: { ...user.user_metadata, username: profile?.username } };
  };

  useEffect(() => {
    AuthService.getCurrentUser().then(async (user) => {
      if (user) {
        const fullUser = await fetchFullProfile(user);
        setSession({ user: fullUser });
      } else {
        setSession(null);
      }
      setInitializing(false);
    });

    const { data: authListener } = AuthService.onAuthStateChange(async (newSession) => {
      if (newSession?.user) {
        const fullUser = await fetchFullProfile(newSession.user);
        setSession({ ...newSession, user: fullUser });
      } else {
        setSession(null);
      }
    });

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadGlobalData();
    }
  }, [session]);

  const loadGlobalData = async () => {
    if (!session?.user?.id) return;
    const data = await MissionsService.getStreak(session.user.id);
    setStreak(data);
  };



  const handleMissionComplete = async (missionType: string, data?: any) => {
    if (!session?.user?.id) return;
    
    const result = await MissionsService.completeMission(session.user.id, missionType);
    
    if (result.success) {
      // Si es Word Matcher, sincronizar palabras al Baúl con 20% de maestría
      if (missionType === 'word-matcher' && data) {
        await VaultService.syncMatchedWords(session.user.id, data);
      }
      
      loadGlobalData();
      handleMissionStateChange(false); // Asegurar que la barra vuelva al completar
      setActiveTab('inicio');
    }
  };

  if (initializing) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  if (!session) {
    return <AuthSection />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.mainContent}>
        {activeTab === 'inicio' && <InicioSection streak={streak} user={session.user} />}
        {activeTab === 'activities' && (
          <ActividadesSection 
            userId={session.user.id} 
            onComplete={handleMissionComplete} 
            onMissionStateChange={handleMissionStateChange}
          />
        )}
        {activeTab === 'vault' && <VaultSection userId={session.user.id} />}
        {activeTab === 'settings' && (
          <SettingsScreen 
            user={session.user}
            onLogout={() => AuthService.signOut()} 
            onProfileUpdate={(newSessionUser: any) => setSession({ ...session, user: newSessionUser })}
          />
        )}
      </View>

      <TouchableOpacity 
        style={[
          styles.navHandle, 
          styles.cardShadow, 
          { bottom: isNavVisible ? 120 : 20, backgroundColor: colors.card, borderColor: colors.border }
        ]} 
        onPress={toggleNav}
      >
        <Ionicons 
          name={isNavVisible ? "chevron-down" : "chevron-up"} 
          size={20} 
          color={colors.accent} 
        />
      </TouchableOpacity>

      <Animated.View style={[styles.navContainer, { transform: [{ translateY: navAnim }] }]}>
        <View style={[styles.navBar, styles.cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {['inicio', 'activities', 'vault', 'settings'].map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.navItem} activeOpacity={0.6}>
              <View style={styles.iconContainer}>
                 <Ionicons name={
                    tab === 'inicio' ? (activeTab === tab ? 'home' : 'home-outline') :
                    tab === 'activities' ? (activeTab === tab ? 'compass' : 'compass-outline') :
                    tab === 'vault' ? (activeTab === tab ? 'archive' : 'archive-outline') :
                    (activeTab === tab ? 'settings' : 'settings-outline')
                 } size={26} color={activeTab === tab ? colors.accent : '#CBD5E0'} />
              </View>
              <Text style={[styles.navText, activeTab === tab ? { color: colors.accent } : null]}>
                {tab === 'inicio' ? 'Inicio' : tab === 'activities' ? 'Misiones' : tab === 'vault' ? 'Baúl' : 'Ajustes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const SettingsScreen = ({ user, onLogout, onProfileUpdate }: any) => {
  const { colors, isDarkMode, toggleTheme, updateUsername } = useAppTheme();
  const [nameInput, setNameInput] = useState(user?.user_metadata?.username || '');
  const [saving, setSaving] = useState(false);

  const handleUpdateName = async () => {
    if (!nameInput.trim() || nameInput === user?.user_metadata?.username) return;
    setSaving(true);
    try {
      await AuthService.updateProfileUsername(user.id, nameInput.trim());
      updateUsername(nameInput.trim()); // Actualización instantánea global
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
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  mainContent: { flex: 1 },
  sectionPadding: { padding: 20, paddingBottom: 130 },
  greetingText: { fontSize: 28, fontWeight: '900', color: '#1e272e', marginBottom: 24, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#1e272e', marginBottom: 8 },
  sectionSubtitle: { fontSize: 16, color: '#7f8c8d', marginBottom: 20 },
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
  
  // Streak Inicio
  streakPanel: { borderRadius: 28, overflow: 'hidden' },
  streakGradient: { padding: 24 },
  streakInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  streakIconMain: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  streakCount: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  streakSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  weeklyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  weekDay: { alignItems: 'center' },
  weekDayLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', marginBottom: 8 },
  weekDayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  doneDay: { backgroundColor: '#05c46b' },
  pendingDay: { backgroundColor: 'rgba(255,255,255,0.15)' },
  emptyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  expandHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  tapToExpand: { color: '#FFF', fontSize: 12, fontWeight: '800', opacity: 0.9 },

  // Coach
  coachContext: { flexDirection: 'row', marginTop: 32, alignItems: 'flex-start' },
  raccoonAvatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#575fcf' },
  chatBubble: { flex: 1, marginLeft: 16, backgroundColor: '#FFF', padding: 18, borderRadius: 22, borderTopLeftRadius: 4, minHeight: 80 },
  coachName: { fontWeight: '900', color: '#575fcf', marginBottom: 6, fontSize: 15 },
  coachMsg: { color: '#485460', fontSize: 14, lineHeight: 22, fontWeight: '500' },

  // Nav
  navContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  navBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', height: 80, borderRadius: 40, width: '100%', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#FFF' },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navText: { fontSize: 10, fontWeight: '900', color: '#CBD5E0', marginTop: 6, letterSpacing: 0.2 },
  navTextActive: { color: '#575fcf' },
  iconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionPlaceholderTitle: { fontSize: 24, fontWeight: '900', color: '#2f3542' },
  expandedContainer: { backgroundColor: '#FFF', borderRadius: 28, marginTop: 12, overflow: 'hidden' },
  calendarFull: { padding: 20 },
  monthTitle: { fontSize: 18, fontWeight: '900', color: '#2f3542', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, justifyContent: 'flex-start' },
  calendarDay: { width: '13%', aspectRatio: 1, margin: '0.6%', alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#f1f2f6' },
  calendarDayDone: { backgroundColor: '#05c46b' },
  calendarDayToday: { borderWidth: 2, borderColor: '#575fcf' },
  calendarDayText: { fontSize: 13, fontWeight: '700', color: '#2f3542' },
  // Nuevos estilos Nav
  navHandle: { 
    position: 'absolute', 
    alignSelf: 'center', 
    width: 60, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    zIndex: 100
  },
  miniButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8
  }
});
