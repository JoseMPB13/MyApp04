import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSegments, usePathname } from "expo-router";
import { useAppTheme } from "../context/ThemeContext";
import { useAppNavigation } from "../context/NavigationContext";

export default function NavigationBar() {
  const { colors } = useAppTheme();
  const { activeTab, setActiveTab, isMissionActive } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const pathname = usePathname();
  const navAnim = useSharedValue(0);

  // Auto-hide logic
  const isGameRoute =
    segments.some((s) =>
      ["word-matcher", "crossword", "ai-scenario", "game"].includes(
        s.toLowerCase(),
      ),
    ) || pathname.includes("game");

  const isModal = segments.some((s) => s === "modal");
  const shouldHide = isGameRoute || isModal || isMissionActive;

  useEffect(() => {
    navAnim.value = withTiming(shouldHide ? 200 : 0, { duration: 300 });
  }, [shouldHide, navAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: navAnim.value }],
    opacity: withTiming(shouldHide ? 0 : 1, { duration: 200 }),
  }));

  if (shouldHide && Platform.OS === "web") return null;

  return (
    <Animated.View
      style={[
        styles.navContainer,
        {
          bottom: 0,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.navBar,
          styles.cardShadow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {[
          { id: "inicio", icon: "home", label: "Inicio" },
          { id: "activities", icon: "compass", label: "Misiones" },
          { id: "vault", icon: "archive", label: "Baúl" },
          { id: "profile", icon: "trophy", label: "Logros" },
          { id: "settings", icon: "settings", label: "Ajustes" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)}
            style={styles.navItem}
            activeOpacity={0.6}
          >
            <Ionicons
              name={
                activeTab === tab.id
                  ? (tab.icon as any)
                  : (`${tab.icon}-outline` as any)
              }
              size={24}
              color={activeTab === tab.id ? colors.accent : "#CBD5E0"}
            />
            <Text
              style={[
                styles.navText,
                { color: activeTab === tab.id ? colors.accent : "#CBD5E0" },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  navBar: {
    flexDirection: "row",
    height: 70,
    borderRadius: 35,
    width: "100%",
    maxWidth: 500,
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navText: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: { boxShadow: "0px 4px 12px rgba(0,0,0,0.15)" },
    }),
  },
});
