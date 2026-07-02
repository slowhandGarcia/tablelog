import { useState } from "react";
import { Pressable } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useThemeStore } from "@/store/useThemeStore";
import { SideMenu } from "@/components/SideMenu";
import { SettingsModal } from "@/components/SettingsModal";

export default function TabsLayout() {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: isDark ? "#4b5563" : "#9ca3af",
        tabBarStyle: {
          backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          borderTopColor: isDark ? "#1a1a1a" : "#e4e4e7",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        headerStyle: {
          backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          // removes the iOS/Android hairline under the header
          shadowColor: "transparent",
          elevation: 0,
        },
        headerShadowVisible: false,
        headerTintColor: isDark ? "#f5f5f5" : "#111827",
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
          headerLeft: () => (
            <Pressable
              onPress={() => setIsMenuVisible(true)}
              hitSlop={12}
              className="px-4"
            >
              <Ionicons
                name="menu"
                size={26}
                color={isDark ? "#ffffff" : "#09090b"}
              />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Specials",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tabs>

    <SideMenu
      visible={isMenuVisible}
      onClose={() => setIsMenuVisible(false)}
      onOpenSettings={() => setIsSettingsVisible(true)}
    />
    <SettingsModal visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
    </>
  );
}
