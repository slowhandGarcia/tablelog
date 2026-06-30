import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { usePostStore } from "@/store/usePostStore";
import { useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PostCard } from "@/components/PostCard";
import { NewPostModal } from "@/components/NewPostModal";
import { CommentModal } from "@/components/CommentModal";
import { FullScreenImageViewer } from "@/components/FullScreenImageViewer";

export default function FeedScreen() {
  const posts = usePostStore((s) => s.posts);
  const isLoading = usePostStore((s) => s.isLoading);
  const fetchPosts = usePostStore((s) => s.fetchPosts);
  const createPost = usePostStore((s) => s.createPost);
  const toggleLike = usePostStore((s) => s.toggleLike);
  const deletePost = usePostStore((s) => s.deletePost);
  const addComment = usePostStore((s) => s.addComment);
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const { isLoggedIn, requireAuth } = useRequireAuth();

  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPosts();
    setIsRefreshing(false);
  };

  const activeCommentPost = posts.find((p) => p.id === activeCommentPostId);
  const authorUsername = user?.username ?? "You";

  const openViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setIsViewerVisible(true);
  };

  const confirmDeletePost = (postId: string) => {
    Alert.alert("Delete this post?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deletePost(postId);
          if (!result.success) Alert.alert("Couldn't delete post", result.error);
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.muted}
            colors={["#3b82f6"]}
          />
        }
        ListHeaderComponent={
          <View>
            <Text
              className="text-sm px-4 pb-4"
              style={{ color: colors.muted }}
            >
              Share your dining experiences with the community!
            </Text>
            {!isLoggedIn && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/auth/login",
                    params: { message: "Log in to share your dining experience" },
                  })
                }
                className="mx-4 mb-4 rounded-2xl py-4 flex-row items-center justify-center gap-2"
                style={{ backgroundColor: "#1d3a6e" }}
              >
                <Ionicons name="log-in-outline" size={18} color="#60a5fa" />
                <Text className="text-sm font-semibold" style={{ color: "#60a5fa" }}>
                  Log in to share and interact
                </Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id}
            onPressPhoto={(index) => openViewer(item.images, index)}
            onToggleLike={() => requireAuth(() => toggleLike(item.id), "Log in to like posts")}
            onPressComment={() =>
              requireAuth(() => setActiveCommentPostId(item.id), "Log in to comment")
            }
            onLongPress={() => confirmDeletePost(item.id)}
            onPressDelete={() => confirmDeletePost(item.id)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-24" color="#3b82f6" size="large" />
          ) : (
            <View className="items-center mt-24 px-8">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-5"
                style={{ backgroundColor: colors.surface }}
              >
                <Ionicons name="people-outline" size={36} color={colors.muted} />
              </View>
              <Text
                className="text-lg font-semibold mb-2"
                style={{ color: colors.text }}
              >
                Nothing here yet
              </Text>
              <Text
                className="text-sm text-center leading-5"
                style={{ color: colors.muted }}
              >
                Be the first to share your dining experience with the community.
              </Text>
              {isLoggedIn && (
                <Pressable
                  onPress={() => setIsComposerVisible(true)}
                  className="mt-6 px-6 py-3 rounded-xl"
                  style={{ backgroundColor: "#3b82f6" }}
                >
                  <Text className="text-white font-semibold text-sm">Share a Post</Text>
                </Pressable>
              )}
            </View>
          )
        }
      />

      {/* Floating action button */}
      {isLoggedIn && (
        <Pressable
          onPress={() =>
            requireAuth(() => setIsComposerVisible(true), "Log in to share your dining experience")
          }
          className="absolute bottom-8 right-5 w-14 h-14 rounded-full items-center justify-center"
          style={{
            backgroundColor: "#3b82f6",
            shadowColor: "#3b82f6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </Pressable>
      )}

      <NewPostModal
        visible={isComposerVisible && isLoggedIn}
        onClose={() => setIsComposerVisible(false)}
        onPost={(text, images) => createPost(text, images, user?.id ?? 0, authorUsername)}
      />

      <FullScreenImageViewer
        visible={isViewerVisible}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setIsViewerVisible(false)}
      />

      <CommentModal
        visible={activeCommentPostId !== null}
        comments={activeCommentPost?.comments ?? []}
        onClose={() => setActiveCommentPostId(null)}
        onSendComment={async (text) => {
          if (!activeCommentPostId) return;
          const result = await addComment(activeCommentPostId, text, authorUsername);
          if (!result.success) Alert.alert("Couldn't add comment", result.error);
        }}
      />
    </View>
  );
}
