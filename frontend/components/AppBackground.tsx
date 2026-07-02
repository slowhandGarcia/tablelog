import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Defs, Pattern, Rect, Circle } from "react-native-svg";

import { useThemeColors, useThemeStore } from "@/store/useThemeStore";

const { width, height } = Dimensions.get("screen");

export function AppBackground({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const colors = useThemeColors();

  // Dots are white on dark, dark on light — both at very low opacity
  const dotFill =
    theme === "dark" ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.048)";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="appdots"
            x="0"
            y="0"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="1.5" cy="1.5" r="1.2" fill={dotFill} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#appdots)" />
      </Svg>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
