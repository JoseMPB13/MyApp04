import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationProvider } from "../src/context/NavigationContext";
import { ThemeProvider, useAppTheme } from "../src/context/ThemeContext";
import { UserProvider } from "../src/context/UserContext";



function RootLayoutNav() {
  const { colors, isDarkMode } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          gestureEnabled: true,
          gestureDirection: "horizontal",
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <UserProvider>
          <NavigationProvider>
            <RootLayoutNav />
          </NavigationProvider>
        </UserProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}


