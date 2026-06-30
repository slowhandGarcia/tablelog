import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, getApiErrorMessage } from "@/lib/api";
import { applyAuthSession } from "@/store/useAuthStore";

export default function ConfirmRegistrationScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No confirmation token found. Try signing up again.");
      return;
    }

    let cancelled = false;

    api
      .post<{ user: object; access: string; refresh: string }>("/auth/confirm-registration/", {
        token,
      })
      .then(async ({ data }) => {
        if (cancelled) return;
        await applyAuthSession(data.user as any, data.access, data.refresh);
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          getApiErrorMessage(err, "This confirmation link is invalid or has expired.")
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-4 pt-2">
          <Pressable onPress={() => router.back()} hitSlop={8} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-white text-3xl font-extrabold">Confirm Account</Text>

          {status === "loading" && (
            <>
              <Text className="text-gray-400 text-base mt-2 mb-8">
                Verifying your confirmation link…
              </Text>
              <ActivityIndicator color="#3b82f6" size="large" />
            </>
          )}

          {status === "success" && (
            <>
              <View className="bg-green-600/10 border border-green-600 rounded-xl px-4 py-4 mt-6 mb-6 flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text className="text-green-500 text-sm flex-1">
                  Your account has been confirmed. Welcome!
                </Text>
              </View>
              <Pressable
                onPress={() => router.replace("/(tabs)/home")}
                className="bg-blue-600 rounded-2xl py-4 items-center active:opacity-80"
              >
                <Text className="text-white text-lg font-bold">Go to Home</Text>
              </Pressable>
            </>
          )}

          {status === "error" && (
            <>
              <View className="bg-red-600/10 border border-red-600 rounded-xl px-4 py-4 mt-6 mb-6 flex-row items-start gap-2">
                <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginTop: 1 }} />
                <Text className="text-red-500 text-sm flex-1">{errorMessage}</Text>
              </View>
              <Pressable
                onPress={() => router.replace("/auth/signup")}
                className="bg-blue-600 rounded-2xl py-4 items-center active:opacity-80"
              >
                <Text className="text-white text-lg font-bold">Sign Up Again</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
