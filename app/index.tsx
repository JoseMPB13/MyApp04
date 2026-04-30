import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../src/api/auth';
import AuthSection from '../src/views/AuthSection';
import { MissionsService, StreakData } from '../src/api/missions';
import ActivitiesSection from '../src/views/ActivitiesSection';
import VaultSection from '../src/views/VaultSection';
import InicioSection from '../src/views/InicioSection';
import SettingsSection from '../src/views/SettingsSection';
import { useAppTheme } from '../src/context/ThemeContext';
import { useUser } from '../src/context/UserContext';
import { useAppNavigation } from '../src/context/NavigationContext';

export default function HomeScreen() {
  const { colors, isDarkMode } = useAppTheme();
  const { updateUsername } = useUser();
  const { activeTab, setActiveTab, setIsMissionActive } = useAppNavigation();
  const insets = useSafeAreaInsets();
  
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  const handleMissionStateChange = (active: boolean) => {
    setIsMissionActive(active);
  };

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

  const handleMissionComplete = async (missionType: string, _data?: any) => {
    if (!session?.user?.id) return;
    
    const result = await MissionsService.completeMission(session.user.id, missionType);
    
    if (result.success) {
      loadGlobalData();
      handleMissionStateChange(false);
      setActiveTab('activities');
    }
  };

  if (initializing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <AuthSection />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.mainContent}>
        {/* Premium transition between tabs */}
        <Animated.View 
          key={activeTab} 
          entering={FadeIn.duration(250)} 
          exiting={FadeOut.duration(200)}
          style={{ flex: 1 }}
        >
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
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
