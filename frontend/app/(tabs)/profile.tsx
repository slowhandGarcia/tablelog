import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useProfileStore } from "@/store/useProfileStore";
import { useWorkoutStore } from "@/store/useWorkoutStore";
import { usePostStore } from "@/store/usePostStore";
import { useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { SettingsModal } from "@/components/SettingsModal";

export default function ProfileScreen() {
  const { name, bio, location, email, createdAt, avatarUri, setName, setBio, setLocation, setAvatar } =
    useProfileStore();
  const workouts = useWorkoutStore((s) => s.workouts);
  const posts = usePostStore((s) => s.posts);
  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const colors = useThemeColors();

  const memberSince = new Date(user?.createdAt ?? createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [bioDraft, setBioDraft] = useState(bio);
  const [locationDraft, setLocationDraft] = useState(location);

  const completedWorkouts = workouts.filter((w) => w.completedAt);
  const userPostCount = posts.filter((p) => p.authorId === user?.id).length;

  const handleChangeAvatar = () => {
    Alert.alert("Change Profile Photo", undefined, [
      { text: "Take Photo", onPress: pickFromCamera },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access needed", "Enable camera access in Settings to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo access needed",
        "Enable photo library access in Settings to choose a photo."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const saveName = () => {
    setName(nameDraft.trim() || "Your Name");
    setIsEditingName(false);
  };

  const saveProfile = () => {
    setBio(bioDraft.trim());
    setLocation(locationDraft.trim());
    Alert.alert("Profile saved", "Your bio and location have been updated.");
  };

  const confirmLogout = () => {
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

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Settings gear */}
      <Pressable
        onPress={() => setIsSettingsVisible(true)}
        hitSlop={8}
        className="absolute top-4 right-4 z-10 w-9 h-9 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.surface }}
      >
        <Ionicons name="settings-outline" size={18} color={colors.muted} />
      </Pressable>

      {/* ── Avatar + Name ── */}
      <View className="items-center pt-8 pb-5 px-6">
        <Pressable onPress={handleChangeAvatar} className="relative">
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.surface }]} className="items-center justify-center">
              <Ionicons name="person" size={42} color={colors.muted} />
            </View>
          )}
          <View
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: "#3b82f6", borderWidth: 2, borderColor: colors.background }}
          >
            <Ionicons name="camera" size={14} color="#ffffff" />
          </View>
        </Pressable>

        {isEditingName ? (
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={saveName}
            onSubmitEditing={saveName}
            autoFocus
            className="text-2xl font-bold text-center mt-4"
            style={{ color: colors.text, minWidth: 160 }}
          />
        ) : (
          <Pressable onPress={() => setIsEditingName(true)} className="mt-4">
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>
              {name}
            </Text>
          </Pressable>
        )}

        {!!bio && (
          <Text
            className="text-sm text-center mt-1.5 px-6 leading-5"
            style={{ color: colors.muted }}
          >
            {bio}
          </Text>
        )}

        {!!location && (
          <View className="flex-row items-center gap-1 mt-1.5">
            <Ionicons name="location-outline" size={13} color={colors.muted} />
            <Text className="text-xs" style={{ color: colors.muted }}>
              {location}
            </Text>
          </View>
        )}
      </View>

      {/* ── Stats row ── */}
      <View className="flex-row mx-4 gap-3 mb-4">
        {[
          { value: completedWorkouts.length, label: "Visits" },
          { value: userPostCount, label: "Posts" },
        ].map(({ value, label }) => (
          <View
            key={label}
            className="flex-1 rounded-xl py-4 items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>
              {value}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Edit Profile ── */}
      <View
        className="mx-4 rounded-xl p-4 mb-3"
        style={{ backgroundColor: colors.surface }}
      >
        <Text className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: colors.muted }}>
          Edit Profile
        </Text>

        <Text className="text-xs font-medium mb-1.5" style={{ color: colors.muted }}>
          Short Bio
        </Text>
        <TextInput
          value={bioDraft}
          onChangeText={setBioDraft}
          placeholder="Add a short bio about yourself."
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          className="rounded-lg p-3"
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            minHeight: 80,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          }}
        />

        <Text className="text-xs font-medium mt-4 mb-1.5" style={{ color: colors.muted }}>
          Location
        </Text>
        <TextInput
          value={locationDraft}
          onChangeText={setLocationDraft}
          placeholder="City, Country"
          placeholderTextColor={colors.placeholder}
          className="rounded-lg p-3"
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          }}
        />

        <Pressable
          onPress={saveProfile}
          className="rounded-xl py-3.5 items-center mt-4 active:opacity-80"
          style={{ backgroundColor: "#3b82f6" }}
        >
          <Text className="font-semibold text-white">Save Profile</Text>
        </Pressable>
      </View>

      {/* ── Account info ── */}
      <View
        className="mx-4 rounded-xl overflow-hidden mb-4"
        style={{ backgroundColor: colors.surface }}
      >
        <Text className="text-xs font-semibold uppercase tracking-widest px-4 pt-4 pb-3" style={{ color: colors.muted }}>
          Account
        </Text>

        <View
          className="flex-row items-center justify-between px-4 py-3"
          style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
        >
          <View className="flex-row items-center gap-2.5">
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
            <Text className="text-sm" style={{ color: colors.muted }}>Email</Text>
          </View>
          <Text className="text-sm font-medium" style={{ color: colors.text }}>
            {isGuest ? "Guest Account" : email ?? "—"}
          </Text>
        </View>

        <View
          className="flex-row items-center justify-between px-4 py-3"
          style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
        >
          <View className="flex-row items-center gap-2.5">
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <Text className="text-sm" style={{ color: colors.muted }}>Member since</Text>
          </View>
          <Text className="text-sm font-medium" style={{ color: colors.text }}>
            {memberSince}
          </Text>
        </View>
      </View>

      {/* ── Auth action ── */}
      <View className="mx-4">
        {isGuest ? (
          <Pressable
            onPress={() => router.push("/auth/login")}
            className="rounded-xl py-4 items-center active:opacity-80"
            style={{ backgroundColor: "#3b82f6" }}
          >
            <Text className="text-base font-bold text-white">Log In</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={confirmLogout}
            className="rounded-xl py-4 items-center active:opacity-70"
            style={{
              borderWidth: 1.5,
              borderColor: "#dc2626",
            }}
          >
            <Text className="text-base font-bold" style={{ color: "#dc2626" }}>
              Log Out
            </Text>
          </Pressable>
        )}
      </View>

      <SettingsModal visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
});
