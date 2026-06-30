import { useEffect } from "react";
import { View, Text, Image, Pressable } from "react-native";
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

export default function OnboardingScreen() {
  const setGuest = useAuthStore((s) => s.setGuest);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isLoggedIn = useAuthStore((s) => s.user?.isLoggedIn ?? false);

  // Same guard as the Welcome screen: if a signed-in user somehow lands
  // here (e.g. navigating back into a stale stack), skip straight past.
  useEffect(() => {
    if (hasHydrated && isLoggedIn) {
      router.replace("/(tabs)/home");
    }
  }, [hasHydrated, isLoggedIn]);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(10);

  useEffect(() => {
    const timing = { duration: 600, easing: Easing.out(Easing.quad) };
    logoOpacity.value = withTiming(1, timing);
    logoScale.value = withTiming(1, timing);
    textOpacity.value = withDelay(200, withTiming(1, timing));
    textTranslateY.value = withDelay(200, withTiming(0, timing));
    buttonOpacity.value = withDelay(450, withTiming(1, timing));
    buttonTranslateY.value = withDelay(450, withTiming(0, timing));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  if (hasHydrated && isLoggedIn) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <LinearGradient colors={["#1e293b", "#0f172a", "#000000"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 justify-between px-6 pt-4 pb-10">
        <Pressable onPress={() => router.back()} hitSlop={8} className="p-2 -ml-2 self-start">
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>

        <View className="items-center">
          <Animated.View style={logoStyle}>
            <Image
              source={require("../logo.png")}
              className="w-[120px] h-[68px]"
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <View className="items-center px-2">
          <Animated.View style={textStyle}>
            <Text className="text-white text-4xl font-extrabold text-center leading-tight tracking-tight">
              Choose Your Path
            </Text>
            <Text className="text-gray-400 text-base text-center mt-5 leading-relaxed">
              Jump in as a guest, or create an account{"\n"}to save your progress everywhere.
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={buttonStyle}>
          <View className="gap-3">
            <Pressable
              onPress={() => {
                setGuest(true);
                router.replace("/(tabs)/home");
              }}
              className="bg-blue-600 rounded-2xl py-5 items-center active:opacity-80"
            >
              <Text className="text-white text-xl font-bold tracking-wide">
                Get Started (Guest)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/auth/signup")}
              className="bg-white rounded-2xl py-5 items-center active:opacity-80"
            >
              <Text className="text-black text-xl font-bold tracking-wide">Sign Up</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/auth/login")}
              className="bg-transparent border-2 border-gray-600 rounded-2xl py-5 items-center active:opacity-80"
            >
              <Text className="text-white text-xl font-bold tracking-wide">Log In</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}
