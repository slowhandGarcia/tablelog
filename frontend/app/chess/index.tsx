import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppBackground } from "@/components/AppBackground";
import { useThemeColors } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { chessApi, type ChessGameDTO, type PlayerColor } from "@/lib/chessApi";
import { getApiErrorMessage } from "@/lib/api";

type ThemeColors = ReturnType<typeof useThemeColors>;
type Difficulty = "easy" | "medium" | "hard";

export default function ChessLobby() {
  const colors = useThemeColors();
  const isGuest = useAuthStore((s) => s.isGuest);

  const [mine, setMine] = useState<ChessGameDTO[]>([]);
  const [open, setOpen] = useState<ChessGameDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cpuConfig, setCpuConfig] = useState(false);

  const load = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    try {
      const [m, o] = await Promise.all([chessApi.listMyGames(), chessApi.listOpenGames()]);
      setMine(m);
      setOpen(o);
    } catch {
      // Silent — a transient network blip shouldn't nuke the list.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest]);

  useFocusEffect(
    useCallback(() => {
      load();
      if (isGuest) return;
      const iv = setInterval(load, 3000);
      return () => clearInterval(iv);
    }, [load, isGuest])
  );

  const create = async (color: PlayerColor | "random") => {
    if (creating) return;
    setCreating(true);
    try {
      const game = await chessApi.createGame(color);
      router.push(`/chess/${game.id}` as any);
    } catch (e) {
      Alert.alert("Couldn't create game", getApiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const join = async (game: ChessGameDTO) => {
    try {
      const joined = await chessApi.joinGame(game.id);
      router.push(`/chess/${joined.id}` as any);
    } catch (e) {
      Alert.alert("Couldn't join", getApiErrorMessage(e));
      load();
    }
  };

  return (
    <AppBackground>
      <Stack.Screen options={{ headerShown: true, title: "Chess" }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.muted}
          />
        }
      >
        {/* ── Offline (available to everyone) ─────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Play Offline</Text>
        <ModeCard
          colors={colors}
          emoji="👥"
          tint="#22c55e22"
          title="Pass & Play"
          desc="Two players share this device, taking turns."
          onPress={() => router.push("/chess/local?mode=pass" as any)}
        />
        <ModeCard
          colors={colors}
          emoji="🤖"
          tint="#f59e0b22"
          title="vs Computer"
          desc="Play the built-in engine — choose your color and difficulty."
          onPress={() => setCpuConfig(true)}
        />

        {/* ── Online ──────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 28 }]}>Play Online</Text>

        {isGuest ? (
          <View style={[styles.guestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.guestText, { color: colors.muted }]}>
              Sign in to create a game and play live against other players.
            </Text>
            <Pressable onPress={() => router.push("/auth/login" as any)} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Log In</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.newGameRow}>
              <ColorButton label="White" glyph="♔" onPress={() => create("white")} colors={colors} light />
              <ColorButton label="Random" glyph="⚄" onPress={() => create("random")} colors={colors} />
              <ColorButton label="Black" glyph="♚" onPress={() => create("black")} colors={colors} />
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={colors.muted} />
            ) : (
              <>
                <Text style={[styles.subTitle, { color: colors.text }]}>Your Games</Text>
                {mine.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.muted }]}>
                    No active games. Start one above!
                  </Text>
                ) : (
                  mine.map((g) => (
                    <GameRow
                      key={g.id}
                      game={g}
                      colors={colors}
                      onPress={() => router.push(`/chess/${g.id}` as any)}
                    />
                  ))
                )}

                <Text style={[styles.subTitle, { color: colors.text }]}>Open Challenges</Text>
                {open.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.muted }]}>
                    No open games right now. Create one and wait for an opponent.
                  </Text>
                ) : (
                  open.map((g) => (
                    <GameRow key={g.id} game={g} colors={colors} joinable onPress={() => join(g)} />
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <CpuConfigModal
        visible={cpuConfig}
        colors={colors}
        onClose={() => setCpuConfig(false)}
        onStart={(side, level) => {
          setCpuConfig(false);
          router.push(`/chess/local?mode=cpu&side=${side}&level=${level}` as any);
        }}
      />
    </AppBackground>
  );
}

function ModeCard({
  colors,
  emoji,
  tint,
  title,
  desc,
  onPress,
}: {
  colors: ThemeColors;
  emoji: string;
  tint: string;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.modeIcon, { backgroundColor: tint }]}>
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.modeTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.modeDesc, { color: colors.muted }]}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

function CpuConfigModal({
  visible,
  colors,
  onClose,
  onStart,
}: {
  visible: boolean;
  colors: ThemeColors;
  onClose: () => void;
  onStart: (side: PlayerColor | "random", level: Difficulty) => void;
}) {
  const [side, setSide] = useState<PlayerColor | "random">("white");
  const [level, setLevel] = useState<Difficulty>("medium");

  const seg = (
    current: string,
    value: string,
    label: string,
    set: () => void
  ) => (
    <Pressable
      key={value}
      onPress={set}
      style={[
        styles.seg,
        { borderColor: colors.border },
        current === value && styles.segActive,
      ]}
    >
      <Text style={[styles.segText, { color: current === value ? "#fff" : colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>vs Computer</Text>

          <Text style={[styles.modalLabel, { color: colors.muted }]}>Your color</Text>
          <View style={styles.segRow}>
            {seg(side, "white", "White", () => setSide("white"))}
            {seg(side, "random", "Random", () => setSide("random"))}
            {seg(side, "black", "Black", () => setSide("black"))}
          </View>

          <Text style={[styles.modalLabel, { color: colors.muted }]}>Difficulty</Text>
          <View style={styles.segRow}>
            {seg(level, "easy", "Easy", () => setLevel("easy"))}
            {seg(level, "medium", "Medium", () => setLevel("medium"))}
            {seg(level, "hard", "Hard", () => setLevel("hard"))}
          </View>

          <Pressable onPress={() => onStart(side, level)} style={[styles.primaryBtn, { marginTop: 20 }]}>
            <Text style={styles.primaryBtnText}>Start Game</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ColorButton({
  label,
  glyph,
  onPress,
  colors,
  light,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  colors: ThemeColors;
  light?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.colorBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.colorGlyph, { color: light ? "#f5f5f5" : colors.text }]}>{glyph}</Text>
      <Text style={[styles.colorLabel, { color: colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

function GameRow({
  game,
  colors,
  onPress,
  joinable,
}: {
  game: ChessGameDTO;
  colors: ThemeColors;
  onPress: () => void;
  joinable?: boolean;
}) {
  const opponent =
    game.my_color === "white" ? game.black : game.my_color === "black" ? game.white : game.creator;
  const label = joinable
    ? `${game.creator.username} wants to play`
    : game.status === "waiting"
      ? "Waiting for opponent…"
      : opponent
        ? `vs ${opponent.username}`
        : "In progress";

  const yourTurn = game.status === "active" && game.my_color && game.turn === game.my_color;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.gameRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.rowIcon}>
        <Text style={{ fontSize: 22 }}>♟️</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.rowSub, { color: colors.muted }]}>
          Game #{game.id} · {game.moves.length} moves
        </Text>
      </View>
      {yourTurn && <View style={styles.turnDot} />}
      {joinable ? (
        <View style={styles.joinPill}>
          <Text style={styles.joinPillText}>Join</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: "800", marginTop: 24, marginBottom: 10 },

  // Offline mode cards
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  modeIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modeTitle: { fontSize: 16, fontWeight: "700" },
  modeDesc: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },

  // Online
  newGameRow: { flexDirection: "row", gap: 12 },
  colorBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
  },
  colorGlyph: { fontSize: 30 },
  colorLabel: { fontSize: 12, fontWeight: "600" },
  empty: { fontSize: 14, lineHeight: 20 },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf622",
  },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowSub: { fontSize: 12, marginTop: 2 },
  turnDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e", marginRight: 4 },
  joinPill: { backgroundColor: "#8b5cf6", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  joinPillText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Guest
  guestCard: { borderRadius: 14, borderWidth: 1, padding: 18, alignItems: "center", gap: 14 },
  guestText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  primaryBtn: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    alignSelf: "stretch",
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // CPU config modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 22 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 8 },
  segRow: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  segActive: { backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" },
  segText: { fontSize: 14, fontWeight: "700" },
});
