import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Chess } from "chess.js";

import { AppBackground } from "@/components/AppBackground";
import { ChessBoard, type BoardPiece } from "@/components/ChessBoard";
import { useThemeColors } from "@/store/useThemeStore";
import { chessApi, type ChessGameDTO, type PlayerColor } from "@/lib/chessApi";
import { getApiErrorMessage } from "@/lib/api";

const PROMO_PIECES: { label: string; glyph: string; letter: string }[] = [
  { label: "Queen", glyph: "♛", letter: "q" },
  { label: "Rook", glyph: "♜", letter: "r" },
  { label: "Bishop", glyph: "♝", letter: "b" },
  { label: "Knight", glyph: "♞", letter: "n" },
];

function kingSquare(chess: Chess, color: "w" | "b"): string | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === "k" && cell.color === color) return cell.square;
    }
  }
  return null;
}

export default function ChessGameScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 420);

  const chessRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);

  const [game, setGame] = useState<ChessGameDTO | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Apply the authoritative server state, but never let a *stale* poll (fewer
  // moves than we've already played locally, e.g. arriving mid-move) roll the
  // board backwards.
  const applyServer = useCallback((dto: ChessGameDTO) => {
    setGame(dto);
    const chess = chessRef.current;
    const localCount = chess.history().length;
    if (dto.moves.length >= localCount && dto.fen !== chess.fen()) {
      try {
        chess.load(dto.fen);
        setSelected(null);
        setLegalTargets([]);
        bump();
      } catch {
        // Ignore an unparseable FEN rather than crash the board.
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const dto = await chessApi.getGame(id);
      applyServer(dto);
    } catch {
      // transient
    } finally {
      setLoadingInitial(false);
    }
  }, [id, applyServer]);

  // Poll for opponent moves / status changes while the screen is open.
  useEffect(() => {
    let stop = false;
    refresh();
    const iv = setInterval(() => {
      if (!stop && !busy) refresh();
    }, 2000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [refresh, busy]);

  const chess = chessRef.current;
  const myColor = game?.my_color ?? null;
  const myLetter = myColor === "white" ? "w" : myColor === "black" ? "b" : null;
  const isActive = game?.status === "active";
  const isMyTurn = !!(isActive && myLetter && chess.turn() === myLetter);

  const performMove = useCallback(
    async (from: string, to: string, promotion?: string) => {
      const c = chessRef.current;
      let move;
      try {
        move = c.move({ from, to, promotion });
      } catch {
        setSelected(null);
        setLegalTargets([]);
        return;
      }

      setSelected(null);
      setLegalTargets([]);
      bump();

      const isOver = c.isGameOver();
      let result: "white" | "black" | "draw" | undefined;
      if (isOver) {
        result = c.isCheckmate() ? (c.turn() === "w" ? "black" : "white") : "draw";
      }

      setBusy(true);
      try {
        const dto = await chessApi.makeMove(id, {
          from,
          to,
          promotion,
          san: move.san,
          fen: c.fen(),
          is_game_over: isOver,
          result,
        });
        applyServer(dto);
      } catch (e) {
        c.undo(); // roll back the optimistic move
        bump();
        Alert.alert("Move rejected", getApiErrorMessage(e));
        refresh();
      } finally {
        setBusy(false);
      }
    },
    [id, applyServer, refresh]
  );

  const onSquarePress = useCallback(
    (sq: string) => {
      if (!isMyTurn || promo) return;
      const c = chessRef.current;

      if (selected) {
        if (sq === selected) {
          setSelected(null);
          setLegalTargets([]);
          return;
        }
        if (legalTargets.includes(sq)) {
          const piece = c.get(selected as any);
          const isPromo =
            piece?.type === "p" && (sq[1] === "8" || sq[1] === "1");
          if (isPromo) {
            setPromo({ from: selected, to: sq });
          } else {
            performMove(selected, sq);
          }
          return;
        }
      }

      // (Re)select one of my own pieces.
      const piece = c.get(sq as any);
      if (piece && piece.color === myLetter) {
        setSelected(sq);
        setLegalTargets(c.moves({ square: sq as any, verbose: true }).map((m: any) => m.to));
      } else {
        setSelected(null);
        setLegalTargets([]);
      }
    },
    [isMyTurn, promo, selected, legalTargets, myLetter, performMove]
  );

  // Return to the lobby by popping this screen off the stack — the lobby is
  // already underneath (we pushed the game on top of it), so `replace` would
  // stack a *duplicate* lobby and force multiple back-presses. Only fall back
  // to replace if there's genuinely nothing to pop (e.g. a direct deep link).
  const goToLobby = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/chess" as any);
  };

  const confirmResign = () => {
    Alert.alert("Resign game?", "Your opponent will be awarded the win.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Resign",
        style: "destructive",
        onPress: async () => {
          try {
            const dto = await chessApi.resignGame(id);
            applyServer(dto);
          } catch (e) {
            Alert.alert("Error", getApiErrorMessage(e));
          }
        },
      },
    ]);
  };

  const confirmCancel = () => {
    Alert.alert("Cancel game?", "This open game will be removed.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Game",
        style: "destructive",
        onPress: async () => {
          try {
            await chessApi.cancelGame(id);
            goToLobby();
          } catch (e) {
            Alert.alert("Error", getApiErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loadingInitial || !game) {
    return (
      <AppBackground>
        <Stack.Screen options={{ headerShown: true, title: "Chess" }} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.muted} />
        </View>
      </AppBackground>
    );
  }

  const orientation: "white" | "black" = myColor === "black" ? "black" : "white";
  const inCheck = chess.isCheck();
  const checkSq = inCheck ? kingSquare(chess, chess.turn()) : null;

  const white = game.white;
  const black = game.black;
  const opponent = myColor === "white" ? black : myColor === "black" ? white : null;
  const me = myColor === "white" ? white : myColor === "black" ? black : null;

  // Status line under the board
  let statusText = "";
  let statusColor = colors.muted;
  if (game.status === "waiting") {
    statusText = "Waiting for an opponent to join…";
  } else if (game.status === "finished") {
    if (game.result === "draw") statusText = "Draw";
    else if (myColor && game.result === myColor) {
      statusText = "You won! 🎉";
      statusColor = "#22c55e";
    } else if (myColor) {
      statusText = "You lost";
      statusColor = "#ef4444";
    } else {
      statusText = `${game.result === "white" ? "White" : "Black"} wins`;
    }
  } else if (isMyTurn) {
    statusText = inCheck ? "Your move — you're in check!" : "Your move";
    statusColor = "#22c55e";
  } else {
    statusText = inCheck ? "Opponent in check…" : "Opponent's move…";
  }

  return (
    <AppBackground>
      <Stack.Screen options={{ headerShown: true, title: `Chess · #${game.id}` }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Opponent bar */}
        <PlayerBar
          name={opponent?.username ?? (game.status === "waiting" ? "Waiting…" : "Opponent")}
          color={orientation === "white" ? "black" : "white"}
          toMove={game.status === "active" && game.turn !== myColor}
          colors={colors}
        />

        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <ChessBoard
            board={chess.board() as (BoardPiece | null)[][]}
            orientation={orientation}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={game.last_move}
            checkSquare={checkSq}
            interactive={isMyTurn && !busy}
            onSquarePress={onSquarePress}
            size={boardSize}
          />
        </View>

        {/* My bar */}
        <PlayerBar
          name={me?.username ? `${me.username} (you)` : "You"}
          color={orientation}
          toMove={isMyTurn}
          colors={colors}
        />

        {/* Status */}
        <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>

        {game.status === "waiting" && (
          <Text style={[styles.waitHint, { color: colors.muted }]}>
            Share game #{game.id} — a friend can join it from the Chess lobby under “Open
            Challenges”.
          </Text>
        )}

        {/* Move history */}
        {game.moves.length > 0 && (
          <View style={[styles.moves, { borderColor: colors.border }]}>
            <Text style={[styles.movesText, { color: colors.muted }]}>
              {game.moves
                .map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m))
                .join("  ")}
            </Text>
          </View>
        )}

        {/* Actions */}
        {game.status === "finished" ? (
          <Pressable onPress={goToLobby} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Back to Lobby</Text>
          </Pressable>
        ) : game.status === "waiting" ? (
          <Pressable onPress={confirmCancel} style={[styles.resignBtn, { borderColor: "#ef4444" }]}>
            <Text style={styles.resignText}>Cancel Game</Text>
          </Pressable>
        ) : (
          <Pressable onPress={confirmResign} style={[styles.resignBtn, { borderColor: "#ef4444" }]}>
            <Text style={styles.resignText}>Resign</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Promotion picker */}
      {promo && (
        <View style={styles.promoOverlay}>
          <View style={[styles.promoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.promoTitle, { color: colors.text }]}>Promote to</Text>
            <View style={styles.promoRow}>
              {PROMO_PIECES.map((p) => (
                <Pressable
                  key={p.letter}
                  onPress={() => {
                    const { from, to } = promo;
                    setPromo(null);
                    performMove(from, to, p.letter);
                  }}
                  style={[styles.promoPiece, { borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: 34, color: myColor === "white" ? "#f5f5f5" : "#1a1a1a" }}>
                    {p.glyph}
                  </Text>
                  <Text style={[styles.promoLabel, { color: colors.muted }]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}
    </AppBackground>
  );
}

function PlayerBar({
  name,
  color,
  toMove,
  colors,
}: {
  name: string;
  color: "white" | "black";
  toMove: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.playerBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.colorChip, { backgroundColor: color === "white" ? "#f5f5f5" : "#1a1a1a" }]}>
        <Text style={{ fontSize: 16 }}>{color === "white" ? "♔" : "♚"}</Text>
      </View>
      <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      {toMove && <View style={styles.turnDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  playerBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  colorChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  playerName: { flex: 1, fontSize: 15, fontWeight: "700" },
  turnDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e" },
  status: { textAlign: "center", fontSize: 16, fontWeight: "700", marginTop: 14 },
  waitHint: { textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 8, paddingHorizontal: 20 },
  moves: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  movesText: { fontSize: 13, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resignBtn: {
    borderWidth: 1.5,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  resignText: { color: "#ef4444", fontSize: 15, fontWeight: "700" },
  promoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  promoCard: { borderRadius: 18, borderWidth: 1, padding: 20, width: "100%" },
  promoTitle: { fontSize: 17, fontWeight: "800", textAlign: "center", marginBottom: 16 },
  promoRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  promoPiece: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  promoLabel: { fontSize: 11, fontWeight: "600" },
});
