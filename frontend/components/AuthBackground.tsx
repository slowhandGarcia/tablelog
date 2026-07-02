import { StyleSheet, View, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Pattern, Rect, Circle } from "react-native-svg";

const { width, height } = Dimensions.get("screen");

export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      {/* Subtle dot-grid texture */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="dotgrid"
            x="0"
            y="0"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="1.5" cy="1.5" r="1.2" fill="rgba(255,255,255,0.055)" />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#dotgrid)" />
      </Svg>

      {/* Vignette — darkens top and bottom so text stays crisp */}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.45)"]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0c0a06",
  },
});
