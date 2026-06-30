import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { api, getApiErrorMessage } from "@/lib/api";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setIsLoading(false);
    setFieldError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setFieldError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFieldError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setFieldError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password2: confirmPassword,
      });
      setSuccess(true);
    } catch (error) {
      setFieldError(getApiErrorMessage(error, "Failed to change password. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    router.replace("/");
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.text,
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView
        className="flex-1"
        edges={["bottom"]}
        style={{ backgroundColor: colors.background }}
      >
        <View
          className="flex-row items-center px-3"
          style={{ paddingTop: insets.top + 20, paddingBottom: 8 }}
        >
          <View className="w-14" />
          <Text
            className="flex-1 text-base font-semibold text-center"
            style={{ color: colors.text }}
          >
            Change Password
          </Text>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            className="w-14 h-14 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          className="px-4 pt-2"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {success ? (
            <View className="items-center pt-8 gap-4">
              <View className="w-20 h-20 rounded-full bg-green-500/15 items-center justify-center">
                <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
              </View>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                Password Changed
              </Text>
              <Text className="text-center text-sm px-4" style={{ color: colors.muted }}>
                Your password has been updated. For security, you've been signed out of all other
                devices. Please log in again with your new password.
              </Text>
              <Pressable
                onPress={handleLogout}
                className="mt-4 w-full rounded-xl py-3.5 items-center active:opacity-80"
                style={{ backgroundColor: "#2563eb" }}
              >
                <Text className="text-base font-bold text-white">Log In Again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text className="text-sm mb-4" style={{ color: colors.muted }}>
                Enter your current password and choose a new one. After saving, you'll need to log
                in again.
              </Text>

              <Text className="text-sm font-semibold mb-2 mt-2" style={{ color: colors.muted }}>
                Current Password
              </Text>
              <View
                className="flex-row items-center rounded-xl px-4 border mb-4"
                style={{ ...inputStyle, height: 52 }}
              >
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: colors.text }}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.placeholder}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showCurrent ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              <Text className="text-sm font-semibold mb-2" style={{ color: colors.muted }}>
                New Password
              </Text>
              <View
                className="flex-row items-center rounded-xl px-4 border mb-4"
                style={{ ...inputStyle, height: 52 }}
              >
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: colors.text }}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.placeholder}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showNew ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              <Text className="text-sm font-semibold mb-2" style={{ color: colors.muted }}>
                Confirm New Password
              </Text>
              <View
                className="flex-row items-center rounded-xl px-4 border mb-4"
                style={{ ...inputStyle, height: 52 }}
              >
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: colors.text }}
                  placeholder="Repeat new password"
                  placeholderTextColor={colors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>

              {fieldError && (
                <View className="flex-row items-center gap-2 mb-4 p-3 rounded-xl bg-red-500/10">
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <Text className="text-sm flex-1" style={{ color: "#ef4444" }}>
                    {fieldError}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                className="rounded-xl py-3.5 items-center active:opacity-80 flex-row justify-center gap-2"
                style={{ backgroundColor: "#2563eb", opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-bold text-white">Save New Password</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
