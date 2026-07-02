import { useEffect } from "react";
import { View, Text, Pressable, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useAuthStore } from "@/store/useAuthStore";

export default function WelcomeScreen() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isLoggedIn = useAuthStore((s) => s.user?.isLoggedIn ?? false);

  // Skip the Welcome screen for a user who's already signed in on this
  // device — only once persisted auth state has finished loading.
  useEffect(() => {
    if (hasHydrated && isLoggedIn) {
      router.replace("/(tabs)/home");
    }
  }, [hasHydrated, isLoggedIn]);

  const overlayOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(16);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(12);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(10);

  useEffect(() => {
    const timing = { duration: 650, easing: Easing.out(Easing.quad) };
    overlayOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
    titleOpacity.value = withDelay(300, withTiming(1, timing));
    titleTranslateY.value = withDelay(300, withTiming(0, timing));
    subtitleOpacity.value = withDelay(500, withTiming(1, timing));
    subtitleTranslateY.value = withDelay(500, withTiming(0, timing));
    buttonOpacity.value = withDelay(700, withTiming(1, timing));
    buttonTranslateY.value = withDelay(700, withTiming(0, timing));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  if (hasHydrated && isLoggedIn) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <ImageBackground
      source={require("../assets/welcome-bg.png")}
      resizeMode="cover"
      style={{ flex: 1, backgroundColor: "#000000" }}
    >
      {/* Gradient overlay: darkest at the bottom (behind the title/button) so
          text stays legible over a busy photo, lighter near the top so the
          image itself still reads as the hero element. Fades in on its own
          timer, independent of the text/button stagger below, so the photo
          "reveals" before the copy animates in over it. */}
      <Animated.View style={[{ flex: 1 }, overlayStyle]}>
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.92)"]}
          locations={[0, 0.45, 1]}
          style={{ flex: 1 }}
        >
          <SafeAreaView className="flex-1 justify-between px-6 pt-14 pb-10">
            {/* Empty spacer — keeps the title vertically centered and the
                button pinned to the bottom via justify-between, without
                rendering anything in the top section. */}
            <View />

            <View className="items-center px-2">
              <Animated.View style={titleStyle}>
                <Text className="text-white text-5xl font-extrabold text-center leading-tight tracking-tight">
                  Welcome to{"\n"}
                  <Text className="text-blue-500">TABLELOG</Text>
                </Text>
              </Animated.View>
              <Animated.View style={subtitleStyle}>
                <Text className="text-gray-300 text-base text-center mt-5 leading-relaxed">
                  Sign up for appetizing rewards, exclusive app discounts, fresh news and a lot more!
                </Text>
              </Animated.View>
            </View>

            <Animated.View style={buttonStyle}>
              <Pressable
                onPress={() => router.push("/onboarding")}
                className="bg-blue-600 rounded-2xl py-5 items-center active:opacity-80"
              >
                <Text className="text-white text-xl font-bold tracking-wide">Get Started</Text>
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>
    </ImageBackground>
  );
}
