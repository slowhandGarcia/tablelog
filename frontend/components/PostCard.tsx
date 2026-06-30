import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/store/useThemeStore";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  currentUserId: number | undefined;
  onPressPhoto: (index: number) => void;
  onToggleLike: () => void;
  onPressComment: () => void;
  onLongPress: () => void;
  onPressDelete: () => void;
}

const AVATAR_PALETTE = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PostCard({
  post,
  currentUserId,
  onPressPhoto,
  onToggleLike,
  onPressComment,
  onLongPress,
  onPressDelete,
}: PostCardProps) {
  const colors = useThemeColors();
  const isOwnPost = currentUserId !== undefined && post.authorId === currentUserId;
  const bgColor = avatarColor(post.username);
  const initial = post.username.charAt(0).toUpperCase();
  const liked = post.likedByMe;

  return (
    <Pressable
      onLongPress={onLongPress}
      className="mx-4 mb-3 rounded-2xl overflow-hidden"
      style={{ backgroundColor: colors.surface }}
    >
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 pt-4 pb-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: bgColor }}
        >
          <Text className="text-white font-bold text-base">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-sm" style={{ color: colors.text }}>
            {post.username}
          </Text>
          <Text className="text-xs" style={{ color: colors.muted }}>
            {formatRelativeTime(post.createdAt)}
          </Text>
        </View>
        {isOwnPost && (
          <Pressable
            onPress={onPressDelete}
            hitSlop={12}
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
          >
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
          </Pressable>
        )}
      </View>

      {/* ── Caption ── */}
      {post.text.length > 0 && (
        <Text
          className="px-4 pb-3 text-sm leading-relaxed"
          style={{ color: colors.text }}
        >
          {post.text}
        </Text>
      )}

      {/* ── Single image: full-width 4:3 ── */}
      {post.images.length === 1 && (
        <Pressable onPress={() => onPressPhoto(0)}>
          <Image
            source={{ uri: post.images[0] }}
            style={{ width: "100%", aspectRatio: 4 / 3 }}
            contentFit="cover"
          />
        </Pressable>
      )}

      {/* ── Multiple images: horizontal strip ── */}
      {post.images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 2 }}
        >
          {post.images.map((uri, index) => (
            <Pressable key={`${uri}-${index}`} onPress={() => onPressPhoto(index)}>
              <Image
                source={{ uri }}
                style={{ width: 200, height: 160 }}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ── Actions ── */}
      <View className="flex-row items-center px-4 py-3 gap-5">
        <Pressable onPress={onToggleLike} className="flex-row items-center gap-1.5">
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={22}
            color={liked ? "#ef4444" : colors.muted}
          />
          {post.likeCount > 0 && (
            <Text
              className="text-sm font-medium"
              style={{ color: liked ? "#ef4444" : colors.muted }}
            >
              {post.likeCount}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={onPressComment} className="flex-row items-center gap-1.5">
          <Ionicons name="chatbubble-outline" size={19} color={colors.muted} />
          {post.comments.length > 0 && (
            <Text className="text-sm" style={{ color: colors.muted }}>
              {post.comments.length}
            </Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth },
});
