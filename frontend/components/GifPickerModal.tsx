import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/store/useThemeStore";

// ─── Giphy types ──────────────────────────────────────────────────────────────

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height_small: GiphyImage;
    fixed_height: GiphyImage;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY ?? "";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

const COLS = 2;
const PADDING = 16;
const GAP = 8;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP * (COLS - 1)) / COLS;
const ITEM_HEIGHT = Math.round(ITEM_WIDTH * 0.75);

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function GifPickerModal({ visible, onClose, onSelect }: Props) {
  const colors = useThemeColors();

  // useSafeAreaInsets() reads from the React context tree and works correctly
  // inside Modals. SafeAreaView (the component) renders into a separate native
  // view hierarchy and can miss the provider — hence using the hook + manual
  // paddingTop instead.
  const insets = useSafeAreaInsets();
  const statusBarHeight: number = Constants.statusBarHeight ?? 0;
  // Take whichever is larger: the dynamic-island/notch inset or the status bar
  // height reported by Constants. On most devices they're the same value.
  const topInset = Math.max(insets.top, statusBarHeight);
  const bottomInset = insets.bottom;

  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      loadGifs("");
    } else {
      setQuery("");
      setGifs([]);
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => loadGifs(query.trim()), query.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [query]);

  const loadGifs = async (q: string) => {
    if (!API_KEY) {
      setError("Add EXPO_PUBLIC_GIPHY_API_KEY to frontend/.env to enable GIF search.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = q
        ? `${GIPHY_BASE}/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=30&rating=g`
        : `${GIPHY_BASE}/trending?api_key=${API_KEY}&limit=30&rating=g`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Giphy error ${res.status}`);
      const json = await res.json();
      setGifs((json.data as GiphyGif[]) ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load GIFs. Check your connection.");
      setGifs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (gif: GiphyGif) => {
    onSelect(gif.images.fixed_height.url);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/*
        Plain View as the root — not SafeAreaView — so we control insets
        manually via the hook. paddingTop pushes all content below the
        status bar / notch / dynamic island on every device.
      */}
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topInset }]}>

        {/* ── Header ── */}
        <View style={[styles.header, { borderColor: colors.border }]}>
          {/* Close — explicit 44×44 so the whole square is tappable */}
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>

          {/* Title centered between the two 44px columns */}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Choose a GIF
          </Text>

          {/* Spacer mirrors the close button so the title stays optically centered */}
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Search bar ── */}
        <View style={styles.searchWrapper}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              ref={searchRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search GIFs…"
              placeholderTextColor={colors.placeholder}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        </View>

        {/* ── Section label ── */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          {query.trim() ? "Results" : "Trending"}
        </Text>

        {/* ── Grid / error / spinner ── */}
        {error ? (
          <View style={styles.centerFill}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.muted} />
            <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
            {API_KEY ? (
              <Pressable
                onPress={() => loadGifs(query.trim())}
                style={[styles.retryBtn, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.retryLabel, { color: colors.text }]}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : isLoading && gifs.length === 0 ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color="#3b82f6" size="large" />
          </View>
        ) : (
          <FlatList
            data={gifs}
            keyExtractor={(item) => item.id}
            numColumns={COLS}
            contentContainerStyle={{
              paddingHorizontal: PADDING,
              paddingBottom: 16,
              gap: GAP,
            }}
            columnWrapperStyle={{ gap: GAP }}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>No GIFs found.</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={styles.gifItem}
              >
                <Image
                  source={{ uri: item.images.fixed_height_small.url }}
                  style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT }}
                  contentFit="cover"
                />
              </Pressable>
            )}
          />
        )}

        {/* ── Giphy attribution (required by API ToS) ── */}
        <View
          style={[
            styles.footer,
            { borderColor: colors.border, paddingBottom: Math.max(bottomInset, 8) },
          ]}
        >
          <Text style={[styles.footerText, { color: colors.muted }]}>Powered by GIPHY</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryLabel: {
    fontWeight: "600",
    fontSize: 15,
  },
  emptyState: {
    paddingVertical: 64,
    alignItems: "center",
  },
  gifItem: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
  },
  footer: {
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 11,
  },
});
