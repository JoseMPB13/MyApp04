import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../src/api/auth';
import AuthSection from '../src/views/AuthSection';
import { MissionsService, StreakData } from '../src/api/missions';
import ActivitiesSection from '../src/views/ActivitiesSection';
import VaultSection from '../src/views/VaultSection';
import InicioSection from '../src/views/InicioSection';
import SettingsSection from '../src/views/SettingsSection';
import { useAppTheme } from '../src/context/ThemeContext';
import { useUser } from '../src/context/UserContext';

export default function HomeScreen() {
  const { colors, isDarkMode } = useAppTheme();
  const { updateUsername } = useUser();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState('inicio');
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const navAnim = useSharedValue(0);

  const toggleNav = () => {
    const toValue = isNavVisible ? 130 : 0;
    navAnim.value = withSpring(toValue, {
      damping: 8,
      stiffness: 40,
    });
    setIsNavVisible(!isNavVisible);
  };

  const handleMissionStateChange = (active: boolean) => {
    const toValue = active ? 130 : 0;
    navAnim.value = withSpring(toValue, {
      damping: 8,
      stiffness: 40,
    });
    setIsNavVisible(!active);
  };

  const animatedNavStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: navAnim.value }],
    };
  });

  const fetchFullProfile = useCallback(async (user: any) => {
    await AuthService.ensureProfile(user.id, user.email || '');
    const profile = await AuthService.getProfile(user.id);
    if (profile?.username) {
      updateUsername(profile.username);
    }
    return { ...user, user_metadata: { ...user.user_metadata, username: profile?.username } };
  }, [updateUsername]);

  const loadGlobalData = useCallback(async () => {
    if (!session?.user?.id) return;
    const data = await MissionsService.getStreak(session.user.id);
    setStreak(data);
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;

    AuthService.getCurrentUser().then(async (user) => {
      if (user) {
        const fullUser = await fetchFullProfile(user);
        if (isMounted) setSession({ user: fullUser });
      } else {
        if (isMounted) setSession(null);
      }
      if (isMounted) setInitializing(false);
    });

    const { data: authListener } = AuthService.onAuthStateChange(async (newSession) => {
      if (newSession?.user) {
        const fullUser = await fetchFullProfile(newSession.user);
        if (isMounted) setSession({ ...newSession, user: fullUser });
      } else {
        if (isMounted) setSession(null);
      }
    });

    return () => {
      isMounted = false;
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, [fetchFullProfile]);

  useEffect(() => {
    loadGlobalData();
  }, [loadGlobalData]);

  const handleMissionComplete = async (missionType: string, data?: any) => {
    if (!session?.user?.id) return;
    
    const result = await MissionsService.completeMission(session.user.id, missionType);
    
    if (result.success) {
      loadGlobalData();
      handleMissionStateChange(false);
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.mainContent}>
        {activeTab === 'inicio' && <InicioSection streak={streak} user={session.user} />}
        {activeTab === 'activities' && (
          <ActivitiesSection 
            userId={session.user.id} 
            onComplete={handleMissionComplete} 
            onMissionStateChange={handleMissionStateChange}
          />
        )}
        {activeTab === 'vault' && <VaultSection userId={session.user.id} />}
        {activeTab === 'settings' && (
          <SettingsSection 
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
          { bottom: isNavVisible ? insets.bottom + 85 : insets.bottom, backgroundColor: colors.card, borderColor: colors.border }
        ]} 
        onPress={toggleNav}
      >
        <Ionicons 
          name={isNavVisible ? "chevron-down" : "chevron-up"} 
          size={20} 
          color={colors.accent} 
        />
      </TouchableOpacity>

      <Animated.View style={[styles.navContainer, { bottom: insets.bottom }, animatedNavStyle]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  mainContent: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }
    })
  },
  navContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  navBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', height: 80, borderRadius: 40, width: '100%', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#FFF' },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navText: { fontSize: 10, fontWeight: '900', color: '#CBD5E0', marginTop: 6, letterSpacing: 0.2 },
  iconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
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
  }
});
