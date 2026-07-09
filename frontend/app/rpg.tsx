import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Canvas } from "@react-three/fiber/native";

import { DungeonScene, type ControlState, type NearId } from "@/components/rpg/DungeonScene";
import { PLAYER_START, EYE } from "@/components/rpg/levelData";

const RETRO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

// ── Quest data ────────────────────────────────────────────────────────────────
const STEP = { TALK: 0, FIND: 1, RETURN: 2, DONE: 3 } as const;
const QUEST_TITLE = "The Head Chef's Request";
const STEP_TEXT: Record<number, string> = {
  0: "Speak with the Head Chef.",
  1: "Find the Golden Ladle in the pantry (north).",
  2: "Return the Golden Ladle to the Head Chef.",
  3: "Complete! +100 Gold",
};
const DIALOG = {
  chefStart:
    "Ah, a brave soul! My prized Golden Ladle vanished into the pantry to the north. Fetch it and I'll reward you handsomely!",
  chefNag: "The Golden Ladle should be in the pantry — head north through the corridor.",
  pickup: "You picked up the Golden Ladle! ✨  Now return it to the chef.",
  chefEnd: "You found it! The dinner service is saved. Take this — 100 gold and my eternal thanks, hero!",
  chefDone: "Thanks again, hero. The kitchen runs smoothly because of you.",
};

export default function RpgScreen() {
  const insets = useSafeAreaInsets();

  const controls = useRef<ControlState>({ forward: false, back: false, left: false, right: false });
  const [nearby, setNearby] = useState<NearId>(null);
  const [step, setStep] = useState<number>(STEP.TALK);
  const [ladleCollected, setLadleCollected] = useState(false);
  const [dialog, setDialog] = useState<string | null>(null);

  const onNearby = useCallback((id: NearId) => setNearby(id), []);

  const handleInteract = () => {
    if (nearby === "chef") {
      if (step === STEP.TALK) {
        setStep(STEP.FIND);
        setDialog(DIALOG.chefStart);
      } else if (step === STEP.FIND) {
        setDialog(DIALOG.chefNag);
      } else if (step === STEP.RETURN) {
        setStep(STEP.DONE);
        setDialog(DIALOG.chefEnd);
      } else {
        setDialog(DIALOG.chefDone);
      }
    } else if (nearby === "ladle" && step === STEP.FIND) {
      setLadleCollected(true);
      setStep(STEP.RETURN);
      setDialog(DIALOG.pickup);
    }
  };

  const interactLabel = nearby === "chef" ? "Talk" : nearby === "ladle" ? "Pick Up" : "";
  const setBtn = (key: keyof ControlState, val: boolean) => () => {
    controls.current[key] = val;
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />

      <Canvas
        style={StyleSheet.absoluteFillObject}
        gl={{ antialias: false }}
        camera={{ fov: 72, near: 0.1, far: 60, position: [PLAYER_START.x, EYE, PLAYER_START.z] }}
      >
        <DungeonScene controls={controls} onNearby={onNearby} ladleCollected={ladleCollected} />
      </Canvas>

      {/* ── HUD: quest tracker ─────────────────────────────────────────────── */}
      <View style={[styles.questCard, { top: insets.top + 8 }]} pointerEvents="none">
        <Text style={[styles.questTitle, { fontFamily: RETRO }]}>◈ {QUEST_TITLE}</Text>
        <Text style={[styles.questStep, { fontFamily: RETRO }]}>
          {step === STEP.DONE ? "✓ " : "• "}
          {STEP_TEXT[step]}
        </Text>
      </View>

      {/* Exit */}
      <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.exitBtn, { top: insets.top + 8 }]}>
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>

      {/* ── Movement D-pad (bottom-left) ───────────────────────────────────── */}
      <View style={[styles.dpad, { bottom: insets.bottom + 24 }]}>
        <DpadButton label="▲" style={styles.dUp} onIn={setBtn("forward", true)} onOut={setBtn("forward", false)} />
        <DpadButton label="◄" style={styles.dLeft} onIn={setBtn("left", true)} onOut={setBtn("left", false)} />
        <DpadButton label="►" style={styles.dRight} onIn={setBtn("right", true)} onOut={setBtn("right", false)} />
        <DpadButton label="▼" style={styles.dDown} onIn={setBtn("back", true)} onOut={setBtn("back", false)} />
      </View>

      {/* ── Interact button (bottom-right) ─────────────────────────────────── */}
      {nearby && !dialog && (
        <Pressable
          onPress={handleInteract}
          style={[styles.interactBtn, { bottom: insets.bottom + 60 }]}
        >
          <Text style={[styles.interactText, { fontFamily: RETRO }]}>{interactLabel}</Text>
          <Text style={styles.interactHint}>
            {nearby === "chef" ? "🧑‍🍳" : "🥄"}
          </Text>
        </Pressable>
      )}

      {/* ── Dialog overlay ─────────────────────────────────────────────────── */}
      {dialog && (
        <View style={[styles.dialogWrap, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.dialogCard}>
            <Text style={[styles.dialogSpeaker, { fontFamily: RETRO }]}>
              {nearby === "ladle" ? "★ Item" : "Head Chef"}
            </Text>
            <Text style={styles.dialogText}>{dialog}</Text>
            <Pressable onPress={() => setDialog(null)} style={styles.dialogBtn}>
              <Text style={[styles.dialogBtnText, { fontFamily: RETRO }]}>Continue ▸</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function DpadButton({
  label,
  style,
  onIn,
  onOut,
}: {
  label: string;
  style: any;
  onIn: () => void;
  onOut: () => void;
}) {
  return (
    <Pressable style={[styles.dBtn, style]} onPressIn={onIn} onPressOut={onOut} hitSlop={4}>
      <Text style={styles.dGlyph}>{label}</Text>
    </Pressable>
  );
}

const DPAD = 168;
const CELL = 54;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b12" },

  questCard: {
    position: "absolute",
    left: 12,
    right: 64,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderColor: "rgba(255,210,138,0.35)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  questTitle: { color: "#ffd28a", fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  questStep: { color: "#e8e8ea", fontSize: 12, marginTop: 4, lineHeight: 17 },

  exitBtn: {
    position: "absolute",
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  dpad: { position: "absolute", left: 22, width: DPAD, height: DPAD },
  dBtn: {
    position: "absolute",
    width: CELL,
    height: CELL,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,30,40,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  dGlyph: { color: "#ffd28a", fontSize: 22, fontWeight: "800" },
  dUp: { top: 0, left: CELL + 3 },
  dDown: { bottom: 0, left: CELL + 3 },
  dLeft: { top: CELL + 3, left: 0 },
  dRight: { top: CELL + 3, left: (CELL + 3) * 2 },

  interactBtn: {
    position: "absolute",
    right: 26,
    minWidth: 96,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(201,75,59,0.92)",
    borderWidth: 2,
    borderColor: "#ffd28a",
  },
  interactText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  interactHint: { fontSize: 20, marginTop: 2 },

  dialogWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  dialogCard: {
    backgroundColor: "rgba(16,16,24,0.97)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ffd28a",
    padding: 18,
  },
  dialogSpeaker: { color: "#ffd28a", fontSize: 13, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  dialogText: { color: "#f2f2f4", fontSize: 15, lineHeight: 22 },
  dialogBtn: { alignSelf: "flex-end", marginTop: 14, paddingVertical: 6, paddingHorizontal: 10 },
  dialogBtnText: { color: "#ffd28a", fontSize: 14, fontWeight: "700" },
});
