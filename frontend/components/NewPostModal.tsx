import { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { GifPickerModal } from "@/components/GifPickerModal";

const MAX_CHARS = 500;

const AVATAR_PALETTE = [
  "#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626",
];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

interface NewPostModalProps {
  visible: boolean;
  onClose: () => void;
  onPost: (text: string, images: string[]) => Promise<{ success: boolean; error?: string }>;
}

export function NewPostModal({ visible, onClose, onPost }: NewPostModalProps) {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const avatarUri = useProfileStore((s) => s.avatarUri);

  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [gif, setGif] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGifPickerVisible, setIsGifPickerVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const username = user?.username ?? "you";
  const bgColor = avatarColor(username);
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasContent = text.trim().length > 0 || images.length > 0 || gif !== null;
  const canPost = hasContent && !isSubmitting && !isOverLimit;

  const charColor =
    isOverLimit ? "#ef4444" : charCount >= MAX_CHARS * 0.8 ? "#f59e0b" : colors.muted;

  const reset = () => {
    setText("");
    setImages([]);
    setGif(null);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    reset();
    onClose();
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
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Photo access needed", "Enable photo library access in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0 && !gif) return;

    setIsSubmitting(true);
    const allImages = gif ? [...images, gif] : images;
    const result = await onPost(trimmed, allImages);
    setIsSubmitting(false);

    if (!result.success) {
      Alert.alert("Couldn't post", result.error ?? "Something went wrong. Please try again.");
      return;
    }
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1" edges={["top", "bottom"]} style={{ backgroundColor: colors.background }}>

        {/* ── Top bar: Cancel / New Post / Post ── */}
        <View
          className="flex-row items-center justify-between px-4 h-12"
          style={[styles.topBar, { borderColor: colors.border }]}
        >
          <Pressable onPress={handleClose} hitSlop={12} className="min-w-[56px]">
            <Text className="text-base" style={{ color: colors.text }}>
              Cancel
            </Text>
          </Pressable>

          <Text className="text-base font-bold" style={{ color: colors.text }}>
            New Post
          </Text>

          <View className="min-w-[56px] items-end">
            <Pressable
              onPress={handlePost}
              disabled={!canPost}
              className="px-4 py-1.5 rounded-full"
              style={{ backgroundColor: canPost ? "#3b82f6" : colors.surface }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text
                  className="text-sm font-semibold"
                  style={{ color: canPost ? "#ffffff" : colors.muted }}
                >
                  Post
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Body + keyboard ── */}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Scrollable compose area */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Author row */}
            <View className="flex-row items-start mb-4">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: bgColor }]} className="items-center justify-center">
                  <Text className="text-white font-bold text-base">
                    {username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View className="ml-3 pt-0.5">
                <Text className="font-semibold text-sm" style={{ color: colors.text }}>
                  {username}
                </Text>
                <Text className="text-xs" style={{ color: colors.muted }}>
                  @{username.toLowerCase()}
                </Text>
              </View>
            </View>

            {/* Text field */}
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.placeholder}
              multiline
              autoFocus
              style={[styles.input, { color: colors.text }]}
            />

            {/* GIF preview */}
            {gif && (
              <View className="mt-4 rounded-xl overflow-hidden" style={styles.gifPreview}>
                <Image
                  source={{ uri: gif }}
                  style={{ width: "100%", height: 200 }}
                  contentFit="cover"
                />
                <Pressable
                  onPress={() => setGif(null)}
                  hitSlop={6}
                  style={styles.removeGifBtn}
                >
                  <Ionicons name="close" size={13} color="#ffffff" />
                </Pressable>
              </View>
            )}

            {/* Attached images */}
            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingTop: 16 }}
              >
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`}>
                    <Image
                      source={{ uri }}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                      hitSlop={6}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close" size={13} color="#ffffff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </ScrollView>

          {/* ── Bottom toolbar ── */}
          <View
            className="flex-row items-center justify-between px-4 py-3"
            style={[styles.toolbar, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            {/* Left: Camera, Gallery, GIF */}
            <View className="flex-row items-center gap-5">
              <Pressable onPress={pickFromCamera} hitSlop={10}>
                <Ionicons name="camera-outline" size={24} color="#3b82f6" />
              </Pressable>

              <Pressable onPress={pickFromLibrary} hitSlop={10}>
                <Ionicons name="image-outline" size={24} color="#3b82f6" />
              </Pressable>

              <Pressable
                hitSlop={10}
                onPress={() => setIsGifPickerVisible(true)}
              >
                <View
                  className="px-2 py-0.5 rounded"
                  style={{
                    borderWidth: 1.5,
                    borderColor: gif ? "#22c55e" : "#3b82f6",
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: gif ? "#22c55e" : "#3b82f6" }}
                  >
                    GIF
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Right: char count + Done */}
            <View className="flex-row items-center gap-3">
              <Text className="text-sm font-medium tabular-nums" style={{ color: charColor }}>
                {charCount}/{MAX_CHARS}
              </Text>

              <Pressable
                onPress={() => Keyboard.dismiss()}
                hitSlop={10}
                className="px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <GifPickerModal
        visible={isGifPickerVisible}
        onClose={() => setIsGifPickerVisible(false)}
        onSelect={(url) => setGif(url)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: "top",
  },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  gifPreview: {
    position: "relative",
  },
  removeGifBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
