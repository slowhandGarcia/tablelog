import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useThemeColors } from "@/store/useThemeStore";
import { AppBackground } from "@/components/AppBackground";
import { useExerciseStore } from "@/store/useExerciseStore";

type ActiveGame = "hangman" | "trivia" | null;

// ─── Trivia questions ─────────────────────────────────────────────────────────
const TRIVIA: { q: string; options: string[]; a: number }[] = [
  {
    q: "What internal temperature must cooked chicken reach to be safe to eat?",
    options: ["145°F", "155°F", "165°F", "180°F"],
    a: 2,
  },
  {
    q: "What does 'al dente' mean when cooking pasta?",
    options: ["Well done", "With cheese", "Firm to the bite", "Extra soft"],
    a: 2,
  },
  {
    q: "Which country is credited with inventing pizza?",
    options: ["Greece", "Italy", "France", "Spain"],
    a: 1,
  },
  {
    q: "What is the main ingredient in guacamole?",
    options: ["Tomato", "Lime", "Avocado", "Jalapeño"],
    a: 2,
  },
  {
    q: "Which pasta shape is traditionally used in carbonara?",
    options: ["Penne", "Fusilli", "Rigatoni", "Spaghetti"],
    a: 3,
  },
  {
    q: "What fish is most commonly used in British fish & chips?",
    options: ["Salmon", "Cod", "Tuna", "Tilapia"],
    a: 1,
  },
  {
    q: "What gives blue cheese its distinctive color and flavor?",
    options: ["Food dye", "Penicillium mold", "Blueberries", "Age alone"],
    a: 1,
  },
  {
    q: "What does 'wagyu' literally mean in Japanese?",
    options: ["Black cow", "Japanese cattle", "Fatty meat", "Farm animal"],
    a: 1,
  },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_WRONG = 6;
const STRIKE_ICONS = ["🍗", "🍖", "🦴", "🍔", "🍟", "😵"];
const OPTION_LABELS = ["A", "B", "C", "D"];

// ─── Hangman ──────────────────────────────────────────────────────────────────
function HangmanGame({ onExit }: { onExit: () => void }) {
  const colors = useThemeColors();
  const exercises = useExerciseStore((s) => s.exercises);

  const pickDish = useCallback(() => {
    const pool = exercises.filter(
      (e) => !e.isCustom && e.name.replace(/ /g, "").length >= 4 && e.name.length <= 14
    );
    return pool[Math.floor(Math.random() * pool.length)];
  }, [exercises]);

  const [dish, setDish] = useState(pickDish);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());

  const word = dish.name.toUpperCase();
  const wrongGuesses = [...guessed].filter((l) => !word.includes(l));
  const isWon = word.split("").filter((c) => c !== " ").every((c) => guessed.has(c));
  const isLost = wrongGuesses.length >= MAX_WRONG;
  const isDone = isWon || isLost;

  const guess = (letter: string) => {
    if (isDone || guessed.has(letter)) return;
    setGuessed((prev) => new Set([...prev, letter]));
  };

  const restart = () => {
    setDish(pickDish());
    setGuessed(new Set());
  };

  return (
    <AppBackground>
      {/* Back row */}
      <Pressable onPress={onExit} hitSlop={12} style={[styles.backRow, { borderBottomColor: colors.border }]}>
        <Ionicons name="chevron-back" size={20} color={colors.muted} />
        <Text style={[styles.backText, { color: colors.muted }]}>Back to Games</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.hangmanScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.gameHeading, { color: colors.text }]}>Name That Dish 🍗</Text>

        {/* Strike tracker */}
        <View style={styles.strikeRow}>
          {STRIKE_ICONS.map((icon, i) => (
            <Text key={i} style={{ fontSize: 26, opacity: i < wrongGuesses.length ? 1 : 0.15 }}>
              {icon}
            </Text>
          ))}
        </View>
        <Text style={[styles.attemptsText, { color: colors.muted }]}>
          {MAX_WRONG - wrongGuesses.length} {MAX_WRONG - wrongGuesses.length === 1 ? "guess" : "guesses"} left
        </Text>

        {/* Word display */}
        <View style={styles.wordRow}>
          {word.split("").map((char, i) =>
            char === " " ? (
              <View key={i} style={styles.wordGap} />
            ) : (
              <View key={i} style={styles.letterSlot}>
                <Text style={[styles.letterChar, { color: colors.text }]}>
                  {guessed.has(char) ? char : ""}
                </Text>
                <View style={[styles.letterLine, { backgroundColor: colors.muted }]} />
              </View>
            )
          )}
        </View>

        <Text style={[styles.hintLabel, { color: colors.muted }]}>
          Category:{" "}
          <Text style={{ color: colors.text, textTransform: "capitalize" }}>
            {dish.muscleGroup}
          </Text>
        </Text>

        {/* Result */}
        {isDone && (
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: isWon ? "#15803d15" : "#dc262615",
                borderColor: isWon ? "#15803d" : "#dc2626",
              },
            ]}
          >
            <Text style={styles.resultEmoji}>{isWon ? "🎉" : "😢"}</Text>
            <Text style={[styles.resultTitle, { color: isWon ? "#15803d" : "#dc2626" }]}>
              {isWon ? "You got it!" : "Game Over"}
            </Text>
            {!isWon && (
              <Text style={[styles.resultAnswer, { color: colors.text }]}>
                It was: <Text style={{ fontWeight: "800" }}>{dish.name}</Text>
              </Text>
            )}
            <Pressable onPress={restart} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Play Again</Text>
            </Pressable>
          </View>
        )}

        {/* Keyboard */}
        {!isDone && (
          <View style={styles.keyboard}>
            {[ALPHABET.slice(0, 13), ALPHABET.slice(13)].map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map((letter) => {
                  const hit = guessed.has(letter);
                  const correct = hit && word.includes(letter);
                  const wrong = hit && !word.includes(letter);
                  return (
                    <Pressable
                      key={letter}
                      onPress={() => guess(letter)}
                      disabled={hit}
                      style={[
                        styles.key,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        correct && styles.keyCorrect,
                        wrong && styles.keyWrong,
                      ]}
                    >
                      <Text style={[styles.keyText, { color: hit ? "#fff" : colors.text }]}>
                        {letter}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AppBackground>
  );
}

// ─── Trivia ───────────────────────────────────────────────────────────────────
function TriviaGame({ onExit }: { onExit: () => void }) {
  const colors = useThemeColors();
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const question = TRIVIA[qIdx];

  const pick = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === question.a) setScore((s) => s + 1);
    setTimeout(() => {
      if (qIdx + 1 >= TRIVIA.length) {
        setDone(true);
      } else {
        setQIdx((q) => q + 1);
        setSelected(null);
      }
    }, 1100);
  };

  const restart = () => {
    setQIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const emoji = score >= 7 ? "🏆" : score >= 5 ? "🎯" : "🍟";
    const title = score >= 7 ? "Master Chef!" : score >= 5 ? "Good Taste!" : "Keep Exploring!";
    return (
      <AppBackground>
        <Pressable onPress={onExit} hitSlop={12} style={[styles.backRow, { borderBottomColor: colors.border }]}>
          <Ionicons name="chevron-back" size={20} color={colors.muted} />
          <Text style={[styles.backText, { color: colors.muted }]}>Back to Games</Text>
        </Pressable>
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>{emoji}</Text>
          <Text style={[styles.doneTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.doneScore, { color: colors.muted }]}>
            {score} / {TRIVIA.length} correct — {Math.round((score / TRIVIA.length) * 100)}%
          </Text>
          <Pressable onPress={restart} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Play Again</Text>
          </Pressable>
          <Pressable onPress={onExit} style={[styles.outlineBtn, { borderColor: colors.border }]}>
            <Text style={[styles.outlineBtnText, { color: colors.muted }]}>Back to Games</Text>
          </Pressable>
        </View>
      </AppBackground>
    );
  }

  const progress = (qIdx / TRIVIA.length) * 100;

  return (
    <AppBackground>
      <Pressable onPress={onExit} hitSlop={12} style={[styles.backRow, { borderBottomColor: colors.border }]}>
        <Ionicons name="chevron-back" size={20} color={colors.muted} />
        <Text style={[styles.backText, { color: colors.muted }]}>Back to Games</Text>
        <Text style={[styles.qCounter, { color: colors.muted }]}>
          {qIdx + 1} / {TRIVIA.length}
        </Text>
      </Pressable>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
      </View>

      <ScrollView contentContainerStyle={styles.triviaScroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.gameHeading, { color: colors.text }]}>Menu Master 🧠</Text>

        <Text style={[styles.scoreLine, { color: colors.muted }]}>
          Score:{" "}
          <Text style={{ color: "#f59e0b", fontWeight: "700" }}>{score}</Text>
        </Text>

        <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.questionText, { color: colors.text }]}>{question.q}</Text>
        </View>

        <View style={styles.optionsWrap}>
          {question.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === question.a;
            const showCorrect = selected !== null && isCorrect;
            const showWrong = isSelected && !isCorrect;
            return (
              <Pressable
                key={i}
                onPress={() => pick(i)}
                disabled={selected !== null}
                style={[
                  styles.optionBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                ]}
              >
                <View style={[styles.optionBadge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.optionBadgeText, { color: colors.muted }]}>
                    {OPTION_LABELS[i]}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    (showCorrect || showWrong) && { fontWeight: "700" },
                  ]}
                  numberOfLines={2}
                >
                  {opt}
                </Text>
                {showCorrect && <Ionicons name="checkmark-circle" size={20} color="#15803d" />}
                {showWrong && <Ionicons name="close-circle" size={20} color="#dc2626" />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
export default function GamesScreen() {
  const colors = useThemeColors();
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  if (activeGame === "hangman") return <HangmanGame onExit={() => setActiveGame(null)} />;
  if (activeGame === "trivia") return <TriviaGame onExit={() => setActiveGame(null)} />;

  return (
    <AppBackground>
      <ScrollView
        contentContainerStyle={styles.lobbyScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lobbyTitle, { color: colors.text }]}>Game Room</Text>
        <Text style={[styles.lobbySubtitle, { color: colors.muted }]}>
          Restaurant-themed mini-games
        </Text>

        {/* Name That Dish */}
        <Pressable
          onPress={() => setActiveGame("hangman")}
          style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: "#f59e0b22" }]}>
            <Text style={styles.cardEmoji}>🍗</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Name That Dish</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Guess a dish from the menu one letter at a time. 6 strikes and you're out!
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        {/* Menu Master */}
        <Pressable
          onPress={() => setActiveGame("trivia")}
          style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: "#3b82f622" }]}>
            <Text style={styles.cardEmoji}>🧠</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Menu Master</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              8 restaurant trivia questions. Test your food knowledge — can you score 100%?
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        {/* Food Invaders — arcade shooter */}
        <Pressable
          onPress={() => router.push("/shooter" as any)}
          style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: "#00ff8822" }]}>
            <Text style={styles.cardEmoji}>👾</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Food Invaders</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Retro arcade shooter! Blast waves of flying wings, burgers & fries before they reach you.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        {/* DEADZONE — top-down twin-stick shooter */}
        <Pressable
          onPress={() => router.push("/deadzone" as any)}
          style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: "#ff334422" }]}>
            <Text style={styles.cardEmoji}>🔫</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>DEADZONE</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Twin-stick survival shooter. Move with the left thumb, aim & blast with the right across 5 levels and a boss.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        {/* Food Adventure — 3D dungeon crawler RPG */}
        <Pressable
          onPress={() => router.push("/rpg" as any)}
          style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: "#c94b3b22" }]}>
            <Text style={styles.cardEmoji}>🏰</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Food Adventure</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              A 3D dungeon crawler — explore the kitchen, take on quests, and recover the Golden Ladle.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>

        {/* Chess — real-time multiplayer */}
        <Pressable
          onPress={() => router.push("/chess" as any)}
          style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: "#8b5cf622" }]}>
            <Text style={styles.cardEmoji}>♟️</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Chess</Text>
            <Text style={[styles.cardDesc, { color: colors.muted }]}>
              Play real-time multiplayer chess. Create or join a game and challenge another player.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // ── Lobby ────────────────────────────────────────────────────────────────
  lobbyScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  lobbyTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  lobbySubtitle: {
    fontSize: 14,
    marginBottom: 28,
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 14,
  },
  cardIcon: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Shared game chrome ────────────────────────────────────────────────────
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    flex: 1,
  },
  qCounter: {
    fontSize: 13,
  },
  gameHeading: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 11,
    marginTop: 6,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Hangman ───────────────────────────────────────────────────────────────
  hangmanScroll: {
    padding: 20,
    paddingBottom: 60,
    alignItems: "center",
  },
  strikeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  attemptsText: {
    fontSize: 13,
    marginBottom: 32,
  },
  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  wordGap: {
    width: 18,
  },
  letterSlot: {
    alignItems: "center",
    minWidth: 22,
  },
  letterChar: {
    fontSize: 22,
    fontWeight: "700",
    height: 28,
    lineHeight: 28,
  },
  letterLine: {
    height: 2,
    width: "100%",
    minWidth: 22,
    borderRadius: 1,
    marginTop: 3,
  },
  hintLabel: {
    fontSize: 13,
    marginBottom: 28,
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    width: "100%",
  },
  resultEmoji: {
    fontSize: 44,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  resultAnswer: {
    fontSize: 16,
    fontWeight: "500",
  },
  keyboard: {
    gap: 6,
    alignSelf: "stretch",
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  key: {
    width: 26,
    height: 38,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  keyCorrect: {
    backgroundColor: "#15803d",
    borderColor: "#15803d",
  },
  keyWrong: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  keyText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Trivia ────────────────────────────────────────────────────────────────
  progressTrack: {
    height: 3,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 2,
  },
  triviaScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  scoreLine: {
    fontSize: 14,
    marginBottom: 16,
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 18,
  },
  questionText: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 25,
  },
  optionsWrap: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  optionCorrect: {
    backgroundColor: "#15803d18",
    borderColor: "#15803d",
  },
  optionWrong: {
    backgroundColor: "#dc262618",
    borderColor: "#dc2626",
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },

  // ── Trivia done ───────────────────────────────────────────────────────────
  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  doneEmoji: {
    fontSize: 68,
    marginBottom: 8,
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  doneScore: {
    fontSize: 15,
    marginBottom: 14,
  },
});
