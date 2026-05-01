import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthService } from "../src/api/auth";
import { MissionsService, StreakData } from "../src/api/missions";
import { useAppNavigation } from "../src/context/NavigationContext";
import { useAppTheme } from "../src/context/ThemeContext";
import { useUser } from "../src/context/UserContext";
import ActivitiesSection from "../src/views/ActivitiesSection";
import AuthSection from "../src/views/AuthSection";
import InicioSection from "../src/views/InicioSection";
import ProfileSection from "../src/views/ProfileSection";
import SettingsSection from "../src/views/SettingsSection";
import VaultSection from "../src/views/VaultSection";
import NavigationBar from "../src/components/NavigationBar";

export default function HomeScreen() {
  const { colors, isDarkMode } = useAppTheme();
  const { session, isLoading: initializing } = useUser();
  const { activeTab, setActiveTab, setIsMissionActive } = useAppNavigation();
  const insets = useSafeAreaInsets();

  const [streak, setStreak] = useState<StreakData | null>(null);

  const handleMissionStateChange = (active: boolean) => {
    setIsMissionActive(active);
  };

  const loadGlobalData = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const data = await MissionsService.getStreak(session.user.id);
      setStreak(data);
    } catch (error) {
      console.error("Error loading global data:", error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user) {
      loadGlobalData();
    }
  }, [session, loadGlobalData]);

  const handleMissionComplete = async (missionType: string, _data?: any) => {
    if (!session?.user?.id) return;

    const result = await MissionsService.completeMission(
      session.user.id,
      missionType,
    );

    if (result.success) {
      loadGlobalData();
      handleMissionStateChange(false);
      setActiveTab("activities");
    }
  };

  if (initializing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40, marginBottom: 20 }}>🦝</Text>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <AuthSection />;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={styles.mainContent}>
        <Animated.View
          key={activeTab}
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(200)}
          style={{ flex: 1 }}
        >
          {activeTab === "inicio" && (
            <InicioSection streak={streak} user={session.user} />
          )}
          {activeTab === "activities" && (
            <ActivitiesSection
              userId={session.user.id}
              onComplete={handleMissionComplete}
              onMissionStateChange={handleMissionStateChange}
            />
          )}
          {activeTab === "vault" && <VaultSection userId={session.user.id} />}
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "settings" && (
            <SettingsSection
              user={session.user}
              onLogout={() => AuthService.signOut()}
              onProfileUpdate={() => loadGlobalData()}
            />
          )}
        </Animated.View>
      </View>
      <NavigationBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});

