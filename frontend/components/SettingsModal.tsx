import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import Constants from "expo-constants";

import { useThemeStore, useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useProfileStore,
  DEFAULT_PROFILE_NAME,
  DEFAULT_PROFILE_BIO,
} from "@/store/useProfileStore";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { ContactDevModal } from "@/components/ContactDevModal";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const colors = useThemeColors();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const { name, bio, location, email, avatarUri } = useProfileStore();
  const isAdmin = !isGuest && (user?.isStaff ?? false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [isContactDevVisible, setIsContactDevVisible] = useState(false);

  const hasFilledProfile =
    !!avatarUri ||
    location.trim().length > 0 ||
    (name.trim().length > 0 && name !== DEFAULT_PROFILE_NAME) ||
    (bio.trim().length > 0 && bio !== DEFAULT_PROFILE_BIO);
  const showAccountSection = !isGuest || hasFilledProfile;

  const confirmLogout = () => {
    onClose();

    Alert.alert("Log out of your account?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  };

  const goToLogin = () => {
    onClose();
    router.push("/auth/login");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);

    if (!result.success) {
      Alert.alert("Couldn't delete account", result.error);
      return;
    }
    onClose();
    router.replace("/");
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete Account?",
      "This action is permanent. All your visits and posts will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "There is no undo. Your account, visits, and posts will be gone forever.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: handleDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* SafeAreaView's top inset isn't reliable on first mount inside a
          Modal (it only catches up after an unrelated re-render), so the
          top offset is applied manually via useSafeAreaInsets() instead. */}
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
            Settings
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="w-14 h-14 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          className="px-4 pt-2"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <Text className="text-sm font-semibold mb-2" style={{ color: colors.muted }}>
            Appearance
          </Text>

          <View
            className="rounded-xl p-4 flex-row items-center justify-between border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-blue-600/10 items-center justify-center">
                <Ionicons
                  name={isDark ? "moon" : "sunny"}
                  size={18}
                  color={isDark ? "#60a5fa" : "#2563eb"}
                />
              </View>
              <View>
                <Text className="text-base font-medium" style={{ color: colors.text }}>
                  Dark Mode
                </Text>
                <Text className="text-xs" style={{ color: colors.muted }}>
                  {isDark ? "On" : "Off"}
                </Text>
              </View>
            </View>

            <Switch
              value={isDark}
              onValueChange={(value) => setTheme(value ? "dark" : "light")}
              trackColor={{ false: "#d1d5db", true: "#2563eb" }}
              thumbColor="#ffffff"
            />
          </View>

          {showAccountSection && (
            <>
              <Text className="text-sm font-semibold mb-2 mt-6" style={{ color: colors.muted }}>
                Account
              </Text>

              <View
                className="rounded-xl p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <View className="flex-row items-center justify-between py-1">
                  <Text className="text-sm" style={{ color: colors.muted }}>
                    Username
                  </Text>
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    {user?.username ?? name}
                  </Text>
                </View>

                <View
                  className="flex-row items-center justify-between py-2 mt-1 border-t"
                  style={{ borderColor: colors.border }}
                >
                  <Text className="text-sm" style={{ color: colors.muted }}>
                    Email
                  </Text>
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    {isGuest ? "Guest" : user?.email ?? email ?? "—"}
                  </Text>
                </View>

                {!isGuest && (
                  <Pressable
                    onPress={() => setIsChangePasswordVisible(true)}
                    className="flex-row items-center justify-between py-2 mt-1 border-t active:opacity-60"
                    style={{ borderColor: colors.border }}
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
                      <Text className="text-sm" style={{ color: colors.text }}>
                        Change Password
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Pressable>
                )}
              </View>
            </>
          )}

          {isGuest ? (
            <Pressable
              onPress={goToLogin}
              className="rounded-xl py-3.5 items-center mt-6 active:opacity-80"
              style={{ backgroundColor: "#2563eb" }}
            >
              <Text className="text-base font-bold text-white">Log In</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={confirmLogout}
              className="rounded-xl py-3.5 items-center mt-6 border-2 border-red-600 active:opacity-70"
            >
              <Text className="text-base font-bold text-red-600">Log Out</Text>
            </Pressable>
          )}

          {isAdmin && (
            <>
              <Text className="text-sm font-semibold mb-2 mt-8" style={{ color: colors.muted }}>
                Admin
              </Text>
              <Pressable
                onPress={() => setIsContactDevVisible(true)}
                className="rounded-xl py-3.5 items-center border active:opacity-70 flex-row justify-center gap-2"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Ionicons name="mail-outline" size={18} color="#3b82f6" />
                <Text className="text-base font-semibold" style={{ color: "#3b82f6" }}>
                  Contact Developers
                </Text>
              </Pressable>
            </>
          )}

          {!isGuest && (
            <>
              <Text className="text-sm font-semibold mb-2 mt-8" style={{ color: colors.muted }}>
                Danger Zone
              </Text>
              <Pressable
                onPress={confirmDeleteAccount}
                disabled={isDeleting}
                className="rounded-xl py-3.5 items-center bg-red-600 active:opacity-80 flex-row justify-center gap-2"
                style={{ opacity: isDeleting ? 0.6 : 1 }}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#ffffff" />
                    <Text className="text-base font-bold text-white">Delete Account</Text>
                  </>
                )}
              </Pressable>
              <Text className="text-xs text-center mt-2 px-4" style={{ color: colors.muted }}>
                This permanently deletes your account and all your data. This cannot be undone.
              </Text>
            </>
          )}

          <Text className="text-sm font-semibold mb-2 mt-8" style={{ color: colors.muted }}>
            About
          </Text>
          <View
            className="rounded-xl border px-4 py-3 flex-row items-center justify-between"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text className="text-sm" style={{ color: colors.muted }}>
              Version
            </Text>
            <Text className="text-sm font-medium" style={{ color: colors.text }}>
              {Constants.expoConfig?.version ?? "1.0.0"}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ChangePasswordModal
        visible={isChangePasswordVisible}
        onClose={() => setIsChangePasswordVisible(false)}
      />
      <ContactDevModal
        visible={isContactDevVisible}
        onClose={() => setIsContactDevVisible(false)}
      />
    </Modal>
  );
}
