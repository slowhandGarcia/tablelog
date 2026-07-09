import { useEffect, useRef } from "react";
import { Modal, View, Text, Pressable, Animated, Dimensions, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useProfileStore,
  DEFAULT_PROFILE_NAME,
  DEFAULT_PROFILE_BIO,
} from "@/store/useProfileStore";
import type { Href } from "expo-router";

const MENU_WIDTH = Math.min(300, Dimensions.get("window").width * 0.8);

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export function SideMenu({ visible, onClose, onOpenSettings }: SideMenuProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isGuest = useAuthStore((s) => s.isGuest);
  const logout = useAuthStore((s) => s.logout);
  const resetGuestData = useAuthStore((s) => s.resetGuestData);
  const { name, bio, location, avatarUri } = useProfileStore();

  // Status bars sit at ~20-50px depending on device; add a fixed buffer on
  // top of the measured inset so the header never feels flush with the notch.
  const menuTopPadding = Math.max(insets.top + 16, 56);
  const menuBottomPadding = Math.max(insets.bottom, 16);

  const hasCustomBio = bio.trim().length > 0 && bio !== DEFAULT_PROFILE_BIO;
  const hasCustomName = name.trim().length > 0 && name !== DEFAULT_PROFILE_NAME;
  const hasFilledProfile = !!avatarUri || hasCustomBio || hasCustomName || location.trim().length > 0;
  const showProfileHeader = !isGuest || hasFilledProfile;

  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -MENU_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const goTo = (href: Href) => {
    onClose();
    router.push(href);
  };

  const confirmLogout = () => {
    onClose();

    if (isGuest) {
      Alert.alert(
        "Clear guest data?",
        "This will erase your profile and all logged visits on this device. This can't be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear Data",
            style: "destructive",
            onPress: () => {
              resetGuestData();
              router.replace("/");
            },
          },
        ]
      );
      return;
    }

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

  const items: MenuItem[] = [
    { label: "Home", icon: "home", onPress: () => goTo("/(tabs)/home") },
    { label: "Menu", icon: "restaurant", onPress: () => goTo("/(tabs)/exercises") },
    { label: "Specials", icon: "pricetag", onPress: () => goTo("/(tabs)/history") },
    { label: "Community", icon: "people", onPress: () => goTo("/(tabs)/feed") },
    { label: "Games", icon: "game-controller", onPress: () => goTo("/(tabs)/games" as Href) },
    { label: "More", icon: "ellipsis-horizontal", onPress: () => goTo("/(tabs)/profile") },
    {
      label: "Settings",
      icon: "settings",
      onPress: () => {
        onClose();
        onOpenSettings();
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 flex-row">
        <Animated.View
          style={{ width: MENU_WIDTH, transform: [{ translateX }] }}
        >
          <View
            className="flex-1 border-r"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingTop: menuTopPadding,
              paddingBottom: menuBottomPadding,
            }}
          >
            <View className="flex-row items-center justify-between px-5 pb-4">
              <Text className="text-2xl font-extrabold" style={{ color: colors.text }}>
                Menu
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                className="w-9 h-9 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.background }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {showProfileHeader && (
              <Pressable
                onPress={() => goTo("/(tabs)/profile")}
                className="px-5 pb-4 mb-2 border-b active:opacity-70"
                style={{ borderColor: colors.border }}
              >
                <View className="flex-row items-center gap-3">
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{ width: 56, height: 56, borderRadius: 28 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center border"
                      style={{ backgroundColor: colors.background, borderColor: colors.border }}
                    >
                      <Ionicons name="person" size={26} color={colors.muted} />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text
                      className="text-base font-bold"
                      numberOfLines={1}
                      style={{ color: colors.text }}
                    >
                      {name}
                    </Text>

                    {hasCustomBio && (
                      <Text
                        className="text-xs mt-0.5"
                        numberOfLines={2}
                        style={{ color: colors.muted }}
                      >
                        {bio}
                      </Text>
                    )}

                    {!!location.trim() && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location-outline" size={12} color={colors.muted} />
                        <Text
                          className="text-xs ml-1"
                          numberOfLines={1}
                          style={{ color: colors.muted }}
                        >
                          {location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            )}

            <View className="flex-1 px-2 pt-2">
              {items.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  className="flex-row items-center gap-3 px-3 py-3 rounded-xl active:opacity-70"
                >
                  <Ionicons name={item.icon} size={22} color={colors.text} />
                  <Text className="text-base font-medium" style={{ color: colors.text }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="px-4 pt-2 border-t" style={{ borderColor: colors.border }}>
              {isGuest && (
                <Pressable
                  onPress={() => goTo("/auth/login")}
                  className="bg-blue-600 rounded-xl py-3.5 items-center active:opacity-80 mt-2"
                >
                  <Text className="text-white text-base font-bold">Log In</Text>
                </Pressable>
              )}

              <Pressable
                onPress={confirmLogout}
                className="rounded-xl py-3.5 items-center mt-2 border-2 border-red-600 active:opacity-70"
              >
                <Text className="text-base font-bold text-red-600">
                  {isGuest ? "Clear Guest Data" : "Logout"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: backdropOpacity }}>
          <Pressable className="flex-1 bg-black/50" onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}
