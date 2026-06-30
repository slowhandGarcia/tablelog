import { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/store/useThemeStore";
import type { Comment } from "@/types";

interface CommentModalProps {
  visible: boolean;
  comments: Comment[];
  onClose: () => void;
  onSendComment: (text: string) => void;
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function CommentModal({
  visible,
  comments,
  onClose,
  onSendComment,
}: CommentModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendComment(trimmed);
    setText("");
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => inputRef.current?.focus()}
    >
      {/* Plain full-screen container, NOT a SafeAreaView, so the close
          button below can be positioned from the true screen edge using
          insets.top directly without SafeAreaView padding being applied
          twice. */}
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          <View className="items-center py-3">
            <Text className="text-base font-semibold" style={{ color: colors.text }}>
              Comments
            </Text>
          </View>

          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={(comment) => comment.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, flexGrow: 1 }}
              renderItem={({ item }) => (
                <View className="flex-row mb-4">
                  <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-3">
                    <Text className="text-white font-bold text-xs">
                      {item.username.charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-semibold text-sm" style={{ color: colors.text }}>
                        {item.username}
                      </Text>
                      <Text className="text-xs" style={{ color: colors.muted }}>
                        {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text className="mt-0.5" style={{ color: colors.text }}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View className="items-center mt-16">
                  <Ionicons name="chatbubble-outline" size={32} color={colors.muted} />
                  <Text className="mt-3" style={{ color: colors.muted }}>
                    No comments yet.
                  </Text>
                  <Text className="text-sm" style={{ color: colors.muted }}>
                    Be the first to comment.
                  </Text>
                </View>
              }
            />

            <View
              className="flex-row items-center gap-2 px-4 py-3 border-t"
              style={{ borderColor: colors.border }}
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder="Add a comment..."
                placeholderTextColor={colors.placeholder}
                multiline
                className="flex-1 rounded-2xl px-4 py-2.5"
                style={{ maxHeight: 100, backgroundColor: colors.surface, color: colors.text }}
              />
              <Pressable
                onPress={handleSend}
                disabled={text.trim().length === 0}
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: text.trim().length > 0 ? "#2563eb" : colors.surface }}
              >
                <Ionicons name="send" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <Pressable
          onPress={onClose}
          hitSlop={16}
          style={{ position: "absolute", top: insets.top + 12, right: 16 }}
          className="w-14 h-14 items-center justify-center rounded-full bg-black/60"
        >
          <Ionicons name="close" size={28} color="#ffffff" />
        </Pressable>
      </View>
    </Modal>
  );
}
