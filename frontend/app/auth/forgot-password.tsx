import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, getApiErrorMessage } from "@/lib/api";

const SUCCESS_MESSAGE = "If an account exists with this email, a reset link has been sent.";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/password-reset/", { email: email.trim().toLowerCase() });
      setIsSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Text className="text-white text-3xl font-extrabold">Forgot Password</Text>
          <Text className="text-gray-400 text-base mt-2 mb-6">
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>

          {isSent ? (
            <View className="bg-green-600/10 border border-green-600 rounded-xl px-4 py-3 mb-6 flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <Text className="text-green-500 text-sm flex-1">{SUCCESS_MESSAGE}</Text>
            </View>
          ) : (
            <>
              {error && (
                <View className="bg-red-600/10 border border-red-600 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-red-500 text-sm">{error}</Text>
                </View>
              )}

              <Text className="text-gray-400 text-xs font-medium mb-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-white mb-6"
              />

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || email.trim().length === 0}
                className="bg-blue-600 rounded-2xl py-4 items-center active:opacity-80"
                style={{ opacity: isSubmitting || email.trim().length === 0 ? 0.7 : 1 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white text-lg font-bold">Send Reset Link</Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            onPress={() => router.replace("/auth/login")}
            className="items-center mt-6 mb-6"
          >
            <Text className="text-gray-400 text-sm">
              Remembered your password?{" "}
              <Text className="text-blue-500 font-semibold">Back to Login</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
