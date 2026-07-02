import { useEffect } from "react";
import { View, Text, ImageBackground, Pressable, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useAuthStore } from "@/store/useAuthStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.48;

export default function OnboardingScreen() {
  const setGuest = useAuthStore((s) => s.setGuest);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isLoggedIn = useAuthStore((s) => s.user?.isLoggedIn ?? false);

  useEffect(() => {
    if (hasHydrated && isLoggedIn) {
      router.replace("/(tabs)/home");
    }
  }, [hasHydrated, isLoggedIn]);

  const heroOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(14);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(10);

  useEffect(() => {
    const timing = { duration: 600, easing: Easing.out(Easing.quad) };
    heroOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
    textOpacity.value = withDelay(250, withTiming(1, timing));
    textTranslateY.value = withDelay(250, withTiming(0, timing));
    buttonOpacity.value = withDelay(450, withTiming(1, timing));
    buttonTranslateY.value = withDelay(450, withTiming(0, timing));
  }, []);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  if (hasHydrated && isLoggedIn) {
    return <View style={{ flex: 1, backgroundColor: "#000000" }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>

      {/* ── Hero image — top half ────────────────────────────────────────── */}
      <Animated.View style={[{ height: HERO_HEIGHT }, heroStyle]}>
        <ImageBackground
          source={require("../assets/welcome-bg.png")}
          resizeMode="cover"
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.10)", "rgba(15,23,42,0.85)"]}
            locations={[0.55, 1]}
            style={{ flex: 1 }}
          />
        </ImageBackground>
      </Animated.View>

      {/* ── Guest button — top-right corner (absolute) ───────────────────── */}
      <SafeAreaView
        edges={["top"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>

          <Pressable
            onPress={() => {
              setGuest(true);
              router.replace("/(tabs)/home");
            }}
            style={styles.guestBtn}
            hitSlop={8}
          >
            <Text style={styles.guestBtnText}>Guest</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ── Content — bottom half ────────────────────────────────────────── */}
      <View style={styles.content}>
        <Animated.View style={textStyle}>
          <Text style={styles.heading}>TableLog Rewards</Text>
          <Text style={styles.subheading}>
            Become a TableLog rewards member to earn points for every dollar spent! Also enjoy a free appetizer on your birthday!
          </Text>
        </Animated.View>

        <Animated.View style={[styles.buttonGroup, buttonStyle]}>
          <Pressable
            onPress={() => router.push("/auth/login")}
            style={[styles.btn, styles.btnOutline]}
          >
            <Text style={styles.btnOutlineText}>Log In</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/auth/signup")}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>Sign Up</Text>
          </Pressable>
        </Animated.View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    padding: 8,
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  guestBtnText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "space-between",
    paddingTop: 28,
  },
  heading: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subheading: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 23,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
  },
  btnOutlineText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  btnPrimary: {
    backgroundColor: "#f59e0b",
  },
  btnPrimaryText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
  },
});
