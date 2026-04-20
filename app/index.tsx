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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../src/api/auth';
import AuthSection from '../src/screens/AuthSection';
import { MissionsService, StreakData } from '../src/api/missions';
import ActividadesSection from '../src/screens/ActividadesSection';
import VaultSection from '../src/screens/VaultSection';
import { VaultService } from '../src/api/vault';

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
const InicioSection = ({ streak }: { streak: StreakData | null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewDate] = useState(new Date());
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setIsExpanded(!isExpanded);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sectionPadding}>
      <Text style={styles.greetingText}>{getGreeting()}, Robert! 👋</Text>
      
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
              {DAYS_NAMES.map((d, i) => (
                <View key={i} style={styles.weekDay}>
                  <Text style={styles.weekDayLabel}>{d}</Text>
                  <View style={[styles.weekDayCircle, i < 5 ? styles.doneDay : styles.pendingDay]}>
                    {i < 5 ? <Ionicons name="checkmark" size={16} color="#FFF" /> : <View style={styles.emptyDot} />}
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.expandHint}>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.tapToExpand}>{isExpanded ? 'Ver menos' : 'Ver historial completo'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.expandedContainer, { height: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }), opacity: expandAnim }]}>
        <View style={styles.calendarFull}>
           <Text style={styles.monthTitle}>{MONTHS_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
           {/* Simplificado para el ejemplo, aquí iría el grid del calendario real */}
           <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
             <Text style={{ color: '#A4B0BE' }}>Visualización de racha sincronizada</Text>
           </View>
        </View>
      </Animated.View>

      <View style={styles.coachContext}>
        <View style={[styles.raccoonAvatar, styles.cardShadow]}>
          <Text style={{ fontSize: 32 }}>🦝</Text>
        </View>
        <View style={[styles.chatBubble, styles.cardShadow]}>
          <Text style={styles.coachName}>Coach Raccoon</Text>
          <Text style={styles.coachMsg}>
            &quot;Tu progreso se está sincronizando con la nube. ¡Cada palabra cuenta!&quot;
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

// --- APP PRINCIPAL ---
export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const navAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    // 1. Obtener sesión inicial
    AuthService.getCurrentUser().then(async (user) => {
      if (user) {
        // Asegurar que el perfil existe en la tabla profiles
        await AuthService.ensureProfile(user.id, user.email || '');
        setSession({ user });
      } else {
        setSession(null);
      }
      setInitializing(false);
    });

    // 2. Escuchar cambios de sesión
    const { data: authListener } = AuthService.onAuthStateChange(async (newSession) => {
      if (newSession?.user) {
        await AuthService.ensureProfile(newSession.user.id, newSession.user.email || '');
      }
      setSession(newSession);
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#575fcf" /></View>;
  }

  if (!session) {
    return <AuthSection />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.mainContent}>
        {activeTab === 'inicio' && <InicioSection streak={streak} />}
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
            email={session.user.email} 
            onLogout={() => AuthService.signOut()} 
            onToggleNav={toggleNav}
            navHidden={!isNavVisible}
          />
        )}
      </View>

      <TouchableOpacity 
        style={[
          styles.navHandle, 
          styles.cardShadow, 
          { bottom: isNavVisible ? 120 : 20 }
        ]} 
        onPress={toggleNav}
      >
        <Ionicons 
          name={isNavVisible ? "chevron-down" : "chevron-up"} 
          size={20} 
          color="#575fcf" 
        />
      </TouchableOpacity>

      <Animated.View style={[styles.navContainer, { transform: [{ translateY: navAnim }] }]}>
        <View style={[styles.navBar, styles.cardShadow]}>
          {['inicio', 'activities', 'vault', 'settings'].map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.navItem} activeOpacity={0.6}>
              <TabIcon name={tab} active={activeTab === tab} />
              <Text style={[styles.navText, activeTab === tab ? styles.navTextActive : null]}>
                {tab === 'inicio' ? 'Inicio' : tab === 'activities' ? 'Misiones' : tab === 'vault' ? 'Baúl' : 'Ajustes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const SettingsScreen = ({ email, onLogout, onToggleNav, navHidden }: any) => (
  <View style={styles.sectionPadding}>
    <Text style={styles.sectionTitle}>Ajustes</Text>
    
    <View style={[styles.chatBubble, styles.cardShadow, { marginBottom: 16, borderRadius: 20 }]}>
      <Text style={styles.coachName}>Modo Inmersivo</Text>
      <Text style={styles.coachMsg}>Usa este botón para ocultar o mostrar la barra de navegación.</Text>
      <TouchableOpacity 
        style={[styles.miniButton, { marginTop: 12, backgroundColor: navHidden ? '#575fcf' : '#d2dae2' }]} 
        onPress={onToggleNav}
      >
        <Text style={{ color: '#FFF', fontWeight: '900' }}>{navHidden ? 'Mostrar Barra' : 'Ocultar Barra'}</Text>
      </TouchableOpacity>
    </View>

    <View style={[styles.chatBubble, styles.cardShadow, { marginBottom: 24, borderRadius: 20 }]}>
      <Text style={styles.coachName}>Tu Cuenta</Text>
      <Text style={styles.coachMsg}>{email}</Text>
    </View>
    
    <TouchableOpacity 
      style={[styles.authButton, styles.logoutButton]} 
      onPress={onLogout}
    >
      <Text style={styles.authButtonText}>Cerrar Sesión</Text>
    </TouchableOpacity>
  </View>
);

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
  // Nuevos estilos Nav
  navHandle: { 
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center', 
    backgroundColor: '#FFF', 
    width: 60, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#eee',
    zIndex: 100
  },
  miniButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
