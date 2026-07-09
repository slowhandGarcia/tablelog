import "../global.css";

import { useEffect } from "react";
import { Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useThemeStore } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function RootLayout() {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Validate any tokens left on the device against the API once at startup,
  // before any screen (e.g. Welcome's auto-redirect) trusts `user`/`isGuest`.
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: isDark ? "#09090b" : "#ffffff" },
            headerTintColor: isDark ? "#ffffff" : "#09090b",
            headerTitleStyle: { fontWeight: "600" },
            // Global back button: 44×44 touch target, icon perfectly centred.
            // Screens that need custom back logic (e.g. workout/[id]) override
            // this via their own Stack.Screen options.
            headerLeft: ({ canGoBack }) =>
              canGoBack ? (
                <Pressable
                  onPress={() => router.back()}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: -8,
                  }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={28}
                    color={isDark ? "#ffffff" : "#09090b"}
                  />
                </Pressable>
              ) : null,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/forgot-password" />
          <Stack.Screen name="auth/reset-password" />
          <Stack.Screen
            name="workout/[id]"
            options={{
              headerShown: true,
              headerBackTitle: "Back",
              presentation: "card",
              gestureEnabled: true,
              title: "Visit Details",
            }}
          />
          <Stack.Screen name="exercise/[id]" options={{ headerShown: true }} />
          <Stack.Screen
            name="events"
            options={{
              headerShown: true,
              title: "Events",
              presentation: "card",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen name="shooter" options={{ headerShown: false }} />
          <Stack.Screen name="deadzone" options={{ headerShown: false }} />
          <Stack.Screen name="rpg" options={{ headerShown: false }} />
          <Stack.Screen name="chess/index" options={{ headerShown: true, title: "Chess" }} />
          <Stack.Screen name="chess/[id]" options={{ headerShown: true, title: "Chess" }} />
          <Stack.Screen name="chess/local" options={{ headerShown: true, title: "Chess" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
