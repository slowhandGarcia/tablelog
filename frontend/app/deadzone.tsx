import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { DEADZONE_HTML } from "@/constants/deadzoneGame";

// Full-screen host for the DEADZONE canvas shooter. The entire game runs inside
// the WebView (see constants/deadzoneGame.ts); this screen only frames it,
// unlocks full-screen/immersive mode, and overlays an exit button.
export default function DeadzoneScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />

      <WebView
        style={styles.web}
        originWhitelist={["*"]}
        source={{ html: DEADZONE_HTML }}
        // Immersive canvas game — no scrolling, bouncing or zoom.
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        // Perf + behaviour
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        // Let the game's Web Audio start without a separate gesture gate
        // (it still unlocks on the first touch inside the canvas).
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        // Keep the retro dark backdrop while the engine boots.
        containerStyle={styles.web}
        onLoadEnd={() => setLoading(false)}
        // iOS: avoid content inset shifting the canvas under the notch.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      />

      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#ff3344" />
          <Text style={styles.loaderText}>LOADING DEADZONE…</Text>
        </View>
      )}

      {/* Exit back to the Game Room */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[styles.exitBtn, { top: insets.top + 6 }]}
      >
        <Ionicons name="close" size={22} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080810" },
  web: { flex: 1, backgroundColor: "#080810" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#080810",
  },
  loaderText: {
    color: "#ff5566",
    letterSpacing: 3,
    fontSize: 13,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
  exitBtn: {
    position: "absolute",
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
});
