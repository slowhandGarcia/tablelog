import { create } from "zustand";

import { api, getApiErrorMessage } from "@/lib/api";
import type { Comment, Post } from "@/types";

interface ApiUser {
  id: number;
  username: string;
}

interface ApiComment {
  id: number;
  author: ApiUser;
  text: string;
  created_at: string;
}

interface ApiPost {
  id: number;
  author: ApiUser;
  text: string;
  images: string[];
  created_at: string;
  comments: ApiComment[];
  like_count: number;
  is_liked: boolean;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

const toComment = (comment: ApiComment): Comment => ({
  id: String(comment.id),
  username: comment.author.username,
  text: comment.text,
  createdAt: comment.created_at,
});

const toPost = (post: ApiPost): Post => ({
  id: String(post.id),
  authorId: post.author.id,
  username: post.author.username,
  text: post.text,
  images: post.images,
  createdAt: post.created_at,
  likedByMe: post.is_liked,
  likeCount: post.like_count,
  comments: post.comments.map(toComment),
});

const newLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface PostStore {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: () => Promise<void>;
  createPost: (
    text: string,
    images: string[],
    authorId: number,
    authorUsername: string
  ) => Promise<ActionResult>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string, authorUsername: string) => Promise<ActionResult>;
  deletePost: (postId: string) => Promise<ActionResult>;
  clearAllPosts: () => void;
}

export const usePostStore = create<PostStore>()((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  fetchPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ results: ApiPost[] } | ApiPost[]>("/posts/");
      const results = Array.isArray(data) ? data : data.results;
      set({ posts: results.map(toPost), isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: getApiErrorMessage(error, "Failed to load posts.") });
    }
  },

  createPost: async (text, images, authorId, authorUsername) => {
    const tempId = newLocalId();
    const optimisticPost: Post = {
      id: tempId,
      authorId,
      username: authorUsername,
      text,
      images,
      createdAt: new Date().toISOString(),
      likedByMe: false,
      likeCount: 0,
      comments: [],
    };
    set((state) => ({ posts: [optimisticPost, ...state.posts] }));

    try {
      const formData = new FormData();
      formData.append("text", text);

      // Separate local file URIs (uploaded as multipart files) from remote
      // URLs such as Giphy GIFs (sent as a plain text field instead).
      const localImages = images.filter((uri) => !uri.startsWith("http"));
      const gifUrl = images.find((uri) => uri.startsWith("http")) ?? null;

      localImages.forEach((uri, index) => {
        const filename = uri.split("/").pop() ?? `photo-${index}.jpg`;
        const extension = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase() ?? "jpg";
        const mimeType = extension === "jpg" ? "jpeg" : extension;
        // React Native's FormData accepts this { uri, name, type } shape for
        // file parts, but the DOM FormData/Blob types don't model it — hence
        // the cast.
        formData.append("images", {
          uri,
          name: filename,
          type: `image/${mimeType}`,
        } as unknown as Blob);
      });

      if (gifUrl) {
        formData.append("gif_url", gifUrl);
      }

      const { data } = await api.post<ApiPost>("/posts/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      set((state) => ({
        posts: state.posts.map((p) => (p.id === tempId ? toPost(data) : p)),
      }));
      return { success: true };
    } catch (error) {
      set((state) => ({ posts: state.posts.filter((p) => p.id !== tempId) }));
      return { success: false, error: getApiErrorMessage(error, "Failed to create post.") };
    }
  },

  toggleLike: async (postId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.likedByMe;
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id !== postId
          ? p
          : { ...p, likedByMe: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }
      ),
    }));

    try {
      const { data } = await api.post<{ liked: boolean; like_count: number }>(
        `/posts/${postId}/like/`
      );
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id !== postId ? p : { ...p, likedByMe: data.liked, likeCount: data.like_count }
        ),
      }));
    } catch {
      // Roll back to the pre-tap state — the like never actually happened.
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id !== postId
            ? p
            : { ...p, likedByMe: wasLiked, likeCount: p.likeCount + (wasLiked ? 1 : -1) }
        ),
      }));
    }
  },

  addComment: async (postId, text, authorUsername) => {
    const tempId = newLocalId();
    const optimisticComment: Comment = {
      id: tempId,
      username: authorUsername,
      text,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id !== postId ? p : { ...p, comments: [...p.comments, optimisticComment] }
      ),
    }));

    try {
      const { data } = await api.post<ApiComment>(`/posts/${postId}/comments/`, { text });
      const realComment = toComment(data);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id !== postId
            ? p
            : { ...p, comments: p.comments.map((c) => (c.id === tempId ? realComment : c)) }
        ),
      }));
      return { success: true };
    } catch (error) {
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id !== postId ? p : { ...p, comments: p.comments.filter((c) => c.id !== tempId) }
        ),
      }));
      return { success: false, error: getApiErrorMessage(error, "Failed to add comment.") };
    }
  },

  deletePost: async (postId) => {
    const previousPosts = get().posts;
    set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) }));
    try {
      await api.delete(`/posts/${postId}/`);
      return { success: true };
    } catch (error) {
      set({ posts: previousPosts });
      return { success: false, error: getApiErrorMessage(error, "Failed to delete post.") };
    }
  },

  clearAllPosts: () => set({ posts: [], isLoading: false, error: null }),
}));
