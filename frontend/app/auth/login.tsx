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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/useAuthStore";

export default function LogInScreen() {
  const login = useAuthStore((s) => s.login);
  const { message } = useLocalSearchParams<{ message?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await login({ email, password });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.replace("/(tabs)/home");
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
          <Text className="text-white text-3xl font-extrabold">Welcome Back</Text>
          <Text className="text-gray-400 text-base mt-2 mb-6">
            Log in to access your account.
          </Text>

          {message && (
            <View className="bg-blue-600/10 border border-blue-600 rounded-xl px-4 py-3 mb-4 flex-row items-center gap-2">
              <Ionicons name="information-circle" size={18} color="#3b82f6" />
              <Text className="text-blue-500 text-sm flex-1">{message}</Text>
            </View>
          )}

          {error && (
            <View className="bg-red-600/10 border border-red-600 rounded-xl px-4 py-3 mb-4">
              {error.split("\n").map((line, index) => (
                <Text
                  key={index}
                  className="text-red-500 text-sm"
                  style={{ marginTop: index > 0 ? 4 : 0 }}
                >
                  {line}
                </Text>
              ))}
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
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-white mb-4"
          />

          <Text className="text-gray-400 text-xs font-medium mb-1">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-white mb-2"
          />

          <Pressable
            onPress={() => router.push("/auth/forgot-password")}
            className="self-end mb-6"
            hitSlop={8}
          >
            <Text className="text-blue-500 text-sm font-medium">Forgot Password?</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 rounded-2xl py-4 items-center active:opacity-80"
            style={{ opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-bold">Log In</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace("/auth/signup")}
            className="items-center mt-5 mb-6"
          >
            <Text className="text-gray-400 text-sm">
              Don&apos;t have an account?{" "}
              <Text className="text-blue-500 font-semibold">Sign Up</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
