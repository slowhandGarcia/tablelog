import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Chess } from "chess.js";

import { AppBackground } from "@/components/AppBackground";
import { ChessBoard, type BoardPiece } from "@/components/ChessBoard";
import { useThemeColors } from "@/store/useThemeStore";
import { bestMove, type Difficulty } from "@/lib/chessAI";

type Mode = "pass" | "cpu";

const PROMO_PIECES = [
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

export default function LocalChessScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ mode?: string; level?: string; side?: string }>();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 420);

  const mode: Mode = params.mode === "cpu" ? "cpu" : "pass";
  const level: Difficulty =
    params.level === "hard" ? "hard" : params.level === "easy" ? "easy" : "medium";

  // Human color is fixed once for vs-Computer (resolve "random" a single time).
  const humanColorRef = useRef<"w" | "b">(
    params.side === "black"
      ? "b"
      : params.side === "white"
        ? "w"
        : Math.random() < 0.5
          ? "w"
          : "b"
  );

  const chessRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);

  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);

  const chess = chessRef.current;
  const humanLetter = humanColorRef.current;
  const isOver = chess.isGameOver();

  // In pass-and-play the board flips to whoever is on move; vs CPU it stays on
  // the human's side.
  const orientation: "white" | "black" =
    mode === "cpu" ? (humanLetter === "w" ? "white" : "black") : chess.turn() === "w" ? "white" : "black";

  const humanToMove = mode === "pass" ? true : chess.turn() === humanLetter;
  const interactive = !isOver && !thinking && !promo && humanToMove;

  const runEngine = useCallback(() => {
    setThinking(true);
    // Defer so the human's move paints and the spinner shows before the
    // (synchronous) search briefly occupies the JS thread.
    setTimeout(() => {
      const c = chessRef.current;
      const mv = bestMove(c.fen(), level);
      if (mv) {
        try {
          c.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
        } catch {
          // Shouldn't happen — engine only returns legal moves.
        }
        bump();
      }
      setThinking(false);
    }, 220);
  }, [level]);

  // vs Computer where the human plays Black: engine opens the game.
  useEffect(() => {
    if (mode === "cpu" && chess.turn() !== humanLetter && !chess.isGameOver()) {
      runEngine();
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const afterHumanMove = useCallback(() => {
    const c = chessRef.current;
    if (mode === "cpu" && !c.isGameOver() && c.turn() !== humanLetter) {
      runEngine();
    }
  }, [mode, humanLetter, runEngine]);

  const performMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const c = chessRef.current;
      try {
        c.move({ from, to, promotion });
      } catch {
        setSelected(null);
        setLegalTargets([]);
        return;
      }
      setSelected(null);
      setLegalTargets([]);
      bump();
      afterHumanMove();
    },
    [afterHumanMove]
  );

  const onSquarePress = useCallback(
    (sq: string) => {
      if (!interactive) return;
      const c = chessRef.current;

      if (selected) {
        if (sq === selected) {
          setSelected(null);
          setLegalTargets([]);
          return;
        }
        if (legalTargets.includes(sq)) {
          const piece = c.get(selected as any);
          const isPromo = piece?.type === "p" && (sq[1] === "8" || sq[1] === "1");
          if (isPromo) setPromo({ from: selected, to: sq });
          else performMove(selected, sq);
          return;
        }
      }

      const piece = c.get(sq as any);
      if (piece && piece.color === c.turn()) {
        setSelected(sq);
        setLegalTargets(c.moves({ square: sq as any, verbose: true }).map((m: any) => m.to));
      } else {
        setSelected(null);
        setLegalTargets([]);
      }
    },
    [interactive, selected, legalTargets, performMove]
  );

  const undo = () => {
    const c = chessRef.current;
    if (thinking) return;
    // vs CPU: take back the engine reply and your move so it's your turn again.
    const plies = mode === "cpu" ? 2 : 1;
    for (let i = 0; i < plies; i++) c.undo();
    setSelected(null);
    setLegalTargets([]);
    bump();
  };

  const restart = () => {
    const c = chessRef.current;
    c.reset();
    setSelected(null);
    setLegalTargets([]);
    setPromo(null);
    setThinking(false);
    bump();
    if (mode === "cpu" && humanLetter === "b") {
      // Engine (White) opens.
      setTimeout(runEngine, 60);
    }
  };

  const inCheck = chess.isCheck();
  const checkSq = inCheck ? kingSquare(chess, chess.turn()) : null;
  const turnColor: "white" | "black" = chess.turn() === "w" ? "white" : "black";

  // Status line
  let statusText: string;
  let statusColor = colors.text;
  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    statusText =
      mode === "cpu"
        ? (chess.turn() === humanLetter ? "Checkmate — Computer wins" : "Checkmate — You win! 🎉")
        : `Checkmate — ${winner} wins`;
    statusColor = "#22c55e";
  } else if (chess.isDraw()) {
    statusText = "Draw";
  } else if (thinking) {
    statusText = "Computer is thinking…";
    statusColor = colors.muted;
  } else if (mode === "cpu") {
    statusText = humanToMove
      ? inCheck ? "Your move — check!" : "Your move"
      : "Computer's move";
    if (humanToMove) statusColor = "#22c55e";
  } else {
    statusText = `${turnColor === "white" ? "White" : "Black"} to move${inCheck ? " — check!" : ""}`;
  }

  const title = mode === "cpu" ? `vs Computer · ${level[0].toUpperCase()}${level.slice(1)}` : "Pass & Play";

  // vs CPU undo takes back a full pair (your move + the reply), so it only makes
  // sense once at least a pair exists — this also avoids landing on the engine's
  // turn with no auto-move queued.
  const undoDisabled =
    thinking || chess.history().length === 0 || (mode === "cpu" && chess.history().length < 2);

  return (
    <AppBackground>
      <Stack.Screen options={{ headerShown: true, title }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top label (opponent side) */}
        <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.chip, { backgroundColor: orientation === "white" ? "#1a1a1a" : "#f5f5f5" }]}>
            <Text style={{ fontSize: 16 }}>{orientation === "white" ? "♚" : "♔"}</Text>
          </View>
          <Text style={[styles.barLabel, { color: colors.text }]}>
            {mode === "cpu"
              ? "Computer"
              : orientation === "white"
                ? "Black"
                : "White"}
          </Text>
        </View>

        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <ChessBoard
            board={chess.board() as (BoardPiece | null)[][]}
            orientation={orientation}
            selected={selected}
            legalTargets={legalTargets}
            checkSquare={checkSq}
            interactive={interactive}
            onSquarePress={onSquarePress}
            size={boardSize}
          />
        </View>

        {/* Bottom label (side on move / human) */}
        <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.chip, { backgroundColor: orientation === "white" ? "#f5f5f5" : "#1a1a1a" }]}>
            <Text style={{ fontSize: 16 }}>{orientation === "white" ? "♔" : "♚"}</Text>
          </View>
          <Text style={[styles.barLabel, { color: colors.text }]}>
            {mode === "cpu" ? "You" : orientation === "white" ? "White" : "Black"}
          </Text>
        </View>

        <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>

        <View style={styles.actions}>
          <Pressable
            onPress={undo}
            disabled={undoDisabled}
            style={[
              styles.secondaryBtn,
              { borderColor: colors.border },
              undoDisabled && { opacity: 0.4 },
            ]}
          >
            <Text style={[styles.secondaryText, { color: colors.text }]}>Undo</Text>
          </Pressable>
          <Pressable onPress={restart} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>New Game</Text>
          </Pressable>
        </View>
      </ScrollView>

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
                  <Text style={{ fontSize: 34, color: chess.turn() === "w" ? "#f5f5f5" : "#1a1a1a" }}>
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

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 48 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  chip: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  barLabel: { fontSize: 15, fontWeight: "700" },
  status: { textAlign: "center", fontSize: 16, fontWeight: "700", marginTop: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 22 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryText: { fontSize: 15, fontWeight: "700" },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#8b5cf6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
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
