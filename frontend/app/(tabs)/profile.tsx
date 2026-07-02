import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useProfileStore } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeColors } from "@/store/useThemeStore";
import { AppBackground } from "@/components/AppBackground";
import { SettingsModal } from "@/components/SettingsModal";

const APP_VERSION = "1.0.0";

// ─── Tile (matches Home "EXPLORE" NavTile exactly) ────────────────────────────

function MoreTile({
  icon,
  iconColor,
  label,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.tileAccent, { backgroundColor: iconColor }]} />
      <View style={styles.tileBody}>
        <View style={[styles.tileIconWrap, { backgroundColor: iconColor + "22" }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <Text style={[styles.tileLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.tileSub, { color: colors.muted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Profile edit modal ───────────────────────────────────────────────────────

function ProfileEditModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { name, bio, location, avatarUri, setName, setBio, setLocation, setAvatar } =
    useProfileStore();
  const colors = useThemeColors();

  const [nameDraft, setNameDraft] = useState(name);
  const [bioDraft, setBioDraft] = useState(bio);
  const [locationDraft, setLocationDraft] = useState(location);

  useEffect(() => {
    if (visible) {
      setNameDraft(name);
      setBioDraft(bio);
      setLocationDraft(location);
    }
  }, [visible]);

  const handleSave = () => {
    setName(nameDraft.trim() || "Your Name");
    setBio(bioDraft.trim());
    setLocation(locationDraft.trim());
    onClose();
  };

  const handleChangeAvatar = () => {
    Alert.alert("Change Photo", undefined, [
      { text: "Take Photo", onPress: pickFromCamera },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access needed", "Enable camera in Settings.");
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
      Alert.alert("Photo access needed", "Enable photo library in Settings.");
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.modalSafe, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.modalAction, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
          <Pressable onPress={handleSave} hitSlop={12}>
            <Text style={[styles.modalAction, { color: "#f59e0b", fontWeight: "700" }]}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={handleChangeAvatar} style={styles.avatarEditWrap}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarLarge}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[styles.avatarLarge, styles.avatarFallback, { backgroundColor: "#f59e0b22" }]}
                >
                  <Text style={[styles.avatarInitial, { color: "#f59e0b" }]}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.avatarEditBadge, { borderColor: colors.background }]}>
                <Ionicons name="camera" size={13} color="#ffffff" />
              </View>
            </Pressable>
            <Text style={[styles.avatarEditHint, { color: colors.muted }]}>
              Tap to change photo
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Display Name</Text>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Your name"
                placeholderTextColor={colors.placeholder}
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Bio</Text>
              <TextInput
                value={bioDraft}
                onChangeText={setBioDraft}
                placeholder="A short bio about yourself"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  styles.fieldInput,
                  styles.fieldTextArea,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Location</Text>
              <TextInput
                value={locationDraft}
                onChangeText={setLocationDraft}
                placeholder="City, Country"
                placeholderTextColor={colors.placeholder}
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── About modal ──────────────────────────────────────────────────────────────

function AboutModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.modalSafe, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
          <View style={{ width: 56 }} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>About</Text>
          <Pressable onPress={onClose} hitSlop={12} style={{ width: 56, alignItems: "flex-end" }}>
            <Text style={[styles.modalAction, { color: colors.muted }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.aboutScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.aboutIconWrap}>
            <Ionicons name="restaurant" size={44} color="#f59e0b" />
          </View>
          <Text style={[styles.aboutAppName, { color: colors.text }]}>TableLog</Text>

          {/* Restaurant blurb */}
          <View style={[styles.aboutBlurb, { backgroundColor: colors.surface }]}>
            <Text style={[styles.aboutBlurbText, { color: colors.muted }]}>
              Local family-owned restaurant. Fresh ingredients daily. Open 11am – 10pm.
            </Text>
          </View>

          {/* Info rows — grouped card */}
          <View style={[styles.aboutInfoCard, { backgroundColor: colors.surface }]}>
            {(
              [
                { icon: "time-outline" as const,              label: "Hours",    value: "11am – 10pm, daily" },
                { icon: "location-outline" as const,          label: "Location", value: "123 Main Street" },
                { icon: "call-outline" as const,              label: "Phone",    value: "(555) 012-3456" },
                { icon: "shield-checkmark-outline" as const,  label: "Privacy",  value: "Data stays on device" },
              ] as const
            ).map(({ icon, label, value }, i, arr) => (
              <View key={label}>
                <View style={styles.aboutInfoRow}>
                  <Ionicons name={icon} size={16} color={colors.muted} />
                  <Text style={[styles.aboutInfoLabel, { color: colors.muted }]}>{label}</Text>
                  <Text style={[styles.aboutInfoValue, { color: colors.text }]}>{value}</Text>
                </View>
                {i < arr.length - 1 && (
                  <View style={[styles.infoSep, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>

          <Text style={[styles.aboutVersion, { color: colors.muted }]}>
            TableLog v{APP_VERSION}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const { name, avatarUri } = useProfileStore();
  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const colors = useThemeColors();

  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isAboutVisible, setIsAboutVisible] = useState(false);

  const email = user?.email ?? "";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

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
    <AppBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── Guest: full-width Log in tile ─────────────────────────────── */}
        {isGuest && (
          <Pressable
            onPress={() => router.push("/auth/login")}
            style={[styles.tile, styles.tileFullWidth, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.tileAccent, { backgroundColor: "#f59e0b" }]} />
            <View style={[styles.tileBody, styles.tileBodyRow]}>
              <View style={[styles.tileIconWrap, { backgroundColor: "#f59e0b22" }]}>
                <Ionicons name="person-add-outline" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tileLabel, { color: colors.text }]}>Log in or Sign up</Text>
                <Text style={[styles.tileSub, { color: colors.muted }]}>
                  Access rewards, profile and more
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Pressable>
        )}

        {/* ── Logged-in: profile summary card ──────────────────────────── */}
        {!isGuest && (
          <Pressable
            onPress={() => setIsProfileVisible(true)}
            style={[styles.tile, styles.tileFullWidth, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.tileAccent, { backgroundColor: "#f59e0b" }]} />
            <View style={[styles.tileBody, styles.tileBodyRow]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarFallback, { backgroundColor: "#f59e0b22" }]}>
                  <Text style={[styles.profileAvatarInitial, { color: "#f59e0b" }]}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={1}>
                  {name}
                </Text>
                {email ? (
                  <Text style={[styles.tileSub, { color: colors.muted }]} numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
                {memberSince ? (
                  <Text style={[styles.tileSub, { color: colors.muted }]}>
                    Member since {memberSince}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Pressable>
        )}

        {/* ── Section label ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>QUICK ACCESS</Text>

        {/* ── Logged-in: 2×2 tile grid ──────────────────────────────────── */}
        {!isGuest && (
          <>
            <View style={styles.tileRow}>
              <MoreTile
                icon="person-outline"
                iconColor="#f59e0b"
                label="Profile"
                subtitle="Edit name, bio & photo"
                onPress={() => setIsProfileVisible(true)}
              />
              <MoreTile
                icon="settings-outline"
                iconColor="#64748b"
                label="Settings"
                subtitle="Theme & preferences"
                onPress={() => setIsSettingsVisible(true)}
              />
            </View>
            <View style={styles.tileRow}>
              <MoreTile
                icon="information-circle-outline"
                iconColor="#3b82f6"
                label="About"
                subtitle="Restaurant & app info"
                onPress={() => setIsAboutVisible(true)}
              />
              <MoreTile
                icon="log-out-outline"
                iconColor="#dc2626"
                label="Log Out"
                subtitle="Sign out of account"
                onPress={confirmLogout}
              />
            </View>
          </>
        )}

        {/* ── Guest: Settings + About row ───────────────────────────────── */}
        {isGuest && (
          <View style={styles.tileRow}>
            <MoreTile
              icon="settings-outline"
              iconColor="#64748b"
              label="Settings"
              subtitle="Theme & preferences"
              onPress={() => setIsSettingsVisible(true)}
            />
            <MoreTile
              icon="information-circle-outline"
              iconColor="#3b82f6"
              label="About"
              subtitle="Restaurant & app info"
              onPress={() => setIsAboutVisible(true)}
            />
          </View>
        )}

        {/* ── App version ───────────────────────────────────────────────── */}
        <Text style={[styles.versionText, { color: colors.muted }]}>
          Version {APP_VERSION}
        </Text>

      </ScrollView>

      <ProfileEditModal visible={isProfileVisible} onClose={() => setIsProfileVisible(false)} />
      <SettingsModal visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
      <AboutModal visible={isAboutVisible} onClose={() => setIsAboutVisible(false)} />
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 12,
  },

  // Section label (same as home.tsx sectionLabel)
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 4,
  },

  // ── Tiles (exact mirror of home.tsx tile styles) ──────────────────────────
  tileRow: {
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 134,
  },
  tileFullWidth: {
    flex: 0,
    minHeight: 0,
  },
  tileAccent: {
    height: 3,
  },
  tileBody: {
    padding: 14,
    gap: 5,
    flex: 1,
  },
  tileBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
  },
  tileIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  tileSub: {
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Profile avatar in summary row ─────────────────────────────────────────
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  profileAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarInitial: {
    fontSize: 20,
    fontWeight: "700",
  },

  // ── App version ───────────────────────────────────────────────────────────
  versionText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  // ── Modal shared ──────────────────────────────────────────────────────────
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalAction: {
    fontSize: 16,
  },
  modalScroll: {
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },

  // ── Profile edit modal ────────────────────────────────────────────────────
  avatarEditWrap: {
    position: "relative",
    marginBottom: 6,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: "700",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarEditHint: {
    fontSize: 13,
    marginBottom: 28,
  },
  fieldGroup: {
    width: "100%",
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  fieldInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldTextArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },

  // ── About modal ───────────────────────────────────────────────────────────
  aboutScroll: {
    padding: 24,
    paddingBottom: 48,
    alignItems: "center",
    gap: 16,
  },
  aboutIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "#110d02",
    borderWidth: 1,
    borderColor: "#f59e0b30",
    alignItems: "center",
    justifyContent: "center",
  },
  aboutAppName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  aboutBlurb: {
    borderRadius: 16,
    padding: 18,
    width: "100%",
  },
  aboutBlurbText: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  aboutInfoCard: {
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
  },
  aboutInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aboutInfoLabel: {
    fontSize: 14,
    flex: 1,
  },
  aboutInfoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42,
  },
  aboutVersion: {
    fontSize: 12,
    marginTop: 4,
  },
});
