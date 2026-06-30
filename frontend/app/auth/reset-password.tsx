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

import { api, getApiErrorMessage } from "@/lib/api";

export default function ResetPasswordScreen() {
  const { uid, token } = useLocalSearchParams<{ uid?: string; token?: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const hasValidLink = !!uid && !!token;

  const handleSubmit = async () => {
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/password-reset-confirm/", {
        uid,
        token,
        new_password: newPassword,
        new_password2: confirmPassword,
      });
      setIsDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "This reset link is invalid or has expired."));
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
          <Text className="text-white text-3xl font-extrabold">Reset Password</Text>

          {!hasValidLink ? (
            <>
              <Text className="text-gray-400 text-base mt-2 mb-6">
                This reset link is missing or invalid. Request a new one from the Forgot
                Password screen.
              </Text>
              <Pressable
                onPress={() => router.replace("/auth/forgot-password")}
                className="bg-blue-600 rounded-2xl py-4 items-center active:opacity-80"
              >
                <Text className="text-white text-lg font-bold">Back to Forgot Password</Text>
              </Pressable>
            </>
          ) : isDone ? (
            <>
              <View className="bg-green-600/10 border border-green-600 rounded-xl px-4 py-3 mt-6 mb-6 flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text className="text-green-500 text-sm flex-1">
                  Your password has been reset. You can now log in.
                </Text>
              </View>
              <Pressable
                onPress={() => router.replace("/auth/login")}
                className="bg-blue-600 rounded-2xl py-4 items-center active:opacity-80"
              >
                <Text className="text-white text-lg font-bold">Go to Login</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-gray-400 text-base mt-2 mb-6">
                Choose a new password for your account.
              </Text>

              {error && (
                <View className="bg-red-600/10 border border-red-600 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-red-500 text-sm">{error}</Text>
                </View>
              )}

              <Text className="text-gray-400 text-xs font-medium mb-1">New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor="#6b7280"
                secureTextEntry
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-white mb-4"
              />

              <Text className="text-gray-400 text-xs font-medium mb-1">
                Confirm New Password
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#6b7280"
                secureTextEntry
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3.5 text-white mb-6"
              />

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || !newPassword || !confirmPassword}
                className="bg-blue-600 rounded-2xl py-4 items-center active:opacity-80"
                style={{
                  opacity: isSubmitting || !newPassword || !confirmPassword ? 0.7 : 1,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white text-lg font-bold">Reset Password</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
