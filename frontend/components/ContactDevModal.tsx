import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useThemeColors } from "@/store/useThemeStore";
import { api } from "@/lib/api";

const UPDATE_TYPES = ["Specials", "Events", "Menu", "Hours", "App Issue", "Other"];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ContactDevModal({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const [updateType, setUpdateType] = useState(UPDATE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const reset = () => {
    setUpdateType(UPDATE_TYPES[0]);
    setDescription("");
    setImages([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert("Maximum 3 photos", "Remove one before adding another.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Enable photo library access in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!description.trim()) {
      Alert.alert("Description required", "Please describe the changes needed.");
      return;
    }
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("update_type", updateType);
      formData.append("description", description.trim());
      images.forEach((uri, index) => {
        const filename = uri.split("/").pop() ?? `photo-${index}.jpg`;
        const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase() ?? "jpg";
        formData.append("images", {
          uri,
          name: filename,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        } as unknown as Blob);
      });
      await api.post("/auth/contact-dev/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Sent!", "Your message has been delivered to the dev team.");
      handleClose();
    } catch {
      Alert.alert("Failed to send", "Please check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.headerBtn}>
            <Text style={styles.headerCancel}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Contact Developers
          </Text>
          <Pressable
            onPress={handleSend}
            disabled={isSending}
            hitSlop={12}
            style={styles.headerBtn}
          >
            {isSending ? (
              <ActivityIndicator color="#3b82f6" />
            ) : (
              <Text style={styles.headerSend}>Send</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Update type */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            Type of Update
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pills}
          >
            {UPDATE_TYPES.map((type) => {
              const selected = type === updateType;
              return (
                <Pressable
                  key={type}
                  onPress={() => setUpdateType(type)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected ? "#f59e0b" : colors.surface,
                      borderColor: selected ? "#f59e0b" : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: selected ? "#000" : colors.text },
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: 24 }]}>
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the changes needed..."
            placeholderTextColor={colors.placeholder}
            multiline
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          {/* Photos */}
          <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: 24 }]}>
            Photos (Optional)
          </Text>
          <View style={styles.imageRow}>
            {images.map((uri, index) => (
              <View key={uri} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} />
                <Pressable
                  onPress={() => removeImage(index)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close" size={11} color="#fff" />
                </Pressable>
              </View>
            ))}
            {images.length < 3 && (
              <Pressable
                onPress={pickImage}
                style={[
                  styles.addPhoto,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <Ionicons name="camera-outline" size={22} color={colors.muted} />
                <Text style={[styles.addPhotoLabel, { color: colors.muted }]}>
                  Add
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 64 },
  headerCancel: { color: "#3b82f6", fontSize: 16 },
  headerSend: { color: "#3b82f6", fontSize: 16, fontWeight: "600", textAlign: "right" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  pills: { gap: 8, paddingRight: 16 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: "600" },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 130,
    textAlignVertical: "top",
  },
  imageRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbWrap: { position: "relative" },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoLabel: { fontSize: 11, fontWeight: "600" },
});
