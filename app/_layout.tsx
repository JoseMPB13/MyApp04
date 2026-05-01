import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationProvider } from "../src/context/NavigationContext";
import { ThemeProvider, useAppTheme } from "../src/context/ThemeContext";
import { UserProvider, useUser } from "../src/context/UserContext";
import { supabase } from "../src/api/supabase";
import { AuthService } from "../src/api/auth";
import AchievementToast from "../src/components/AchievementToast";
import GlobalToast from "../src/components/GlobalToast";

function RootLayoutNav() {
  const { colors, isDarkMode } = useAppTheme();
  const { setSession, setIsLoading, updateUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    // 1. Manejar Deep Linking para confirmación de email
    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      
      // Supabase envía tokens en el fragmento (#) de la URL
      const hash = url.split("#")[1];
      if (hash) {
        const params = Object.fromEntries(new URLSearchParams(hash));
        const access_token = params.access_token;
        const refresh_token = params.refresh_token;

        if (access_token && refresh_token) {
          supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    };

    // Suscribirse a cambios de URL mientras la app está abierta
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    // Manejar la URL con la que se abrió la app
    Linking.getInitialURL().then(handleDeepLink);

    // 2. Escuchar cambios de autenticación
    const { data: authListener } = AuthService.onAuthStateChange(async (session) => {
      setSession(session);
      
      if (session?.user) {
        // Asegurar que el perfil existe y actualizar contexto
        await AuthService.ensureProfile(session.user.id, session.user.email || "");
        const profile = await AuthService.getProfile(session.user.id);
        if (profile) {
          updateUser({ 
            username: profile.username || "", 
            avatarUrl: profile.avatar_url 
          });
        }
        // Redirigir a la pantalla principal si se verificó con éxito
        router.replace("/");
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.remove();
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, [setSession, setIsLoading, updateUser, router]);

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
      
      {/* Notificaciones Globales */}
      <AchievementToast />
      <GlobalToast />
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




