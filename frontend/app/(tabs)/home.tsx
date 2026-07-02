import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  useRewardsStore,
  getTierInfo,
  getNextMilestone,
} from "@/store/useRewardsStore";
import { useThemeColors } from "@/store/useThemeStore";
import { AppBackground } from "@/components/AppBackground";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Scan Receipt Modal ───────────────────────────────────────────────────────

function ScanReceiptModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const addPoints = useRewardsStore((s) => s.addPointsFromReceipt);
  const [amountText, setAmountText] = useState("");
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);

  const amount = parseFloat(amountText) || 0;
  const preview = Math.floor(amount);
  const canSubmit = preview > 0;

  const handleSubmit = () => {
    const earned = addPoints(amount);
    setEarnedPoints(earned);
  };

  const handleClose = () => {
    setAmountText("");
    setEarnedPoints(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.modalSafe, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {earnedPoints === null ? (
            // ── Input phase ──────────────────────────────────────────────────
            <View style={styles.modalInputPhase}>
              <View style={[styles.modalHeader, { borderColor: colors.border }]}>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Scan Receipt</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={styles.modalCenter}>
                <View style={[styles.receiptIconCircle, { backgroundColor: "#f59e0b22" }]}>
                  <Ionicons name="receipt-outline" size={40} color="#f59e0b" />
                </View>
                <Text style={[styles.modalHeading, { color: colors.text }]}>
                  Enter Receipt Total
                </Text>
                <Text style={[styles.modalSubheading, { color: colors.muted }]}>
                  Earn 1 point for every $1 spent
                </Text>
              </View>

              <View
                style={[
                  styles.amountRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.dollarSign, { color: colors.muted }]}>$</Text>
                <TextInput
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholder}
                  autoFocus
                  style={[styles.amountInput, { color: colors.text }]}
                />
              </View>

              {canSubmit && (
                <View style={[styles.previewBadge, { backgroundColor: colors.surface }]}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={[styles.previewText, { color: colors.muted }]}>
                    You'll earn{" "}
                    <Text style={{ color: "#f59e0b", fontWeight: "700" }}>
                      {preview} point{preview !== 1 ? "s" : ""}
                    </Text>
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={[
                  styles.submitBtn,
                  { backgroundColor: canSubmit ? "#f59e0b" : colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.submitBtnText,
                    { color: canSubmit ? "#000000" : colors.muted },
                  ]}
                >
                  {canSubmit ? `Add ${preview} Points` : "Enter a receipt total"}
                </Text>
              </Pressable>
            </View>
          ) : (
            // ── Success phase ─────────────────────────────────────────────────
            <View style={styles.successPhase}>
              <View style={[styles.successCircle, { backgroundColor: "#16a34a22" }]}>
                <Ionicons name="checkmark-circle" size={60} color="#16a34a" />
              </View>
              <Text style={[styles.successHeading, { color: colors.text }]}>Points Added!</Text>
              <Text style={[styles.successPoints, { color: "#f59e0b" }]}>
                +{earnedPoints}
              </Text>
              <Text style={[styles.successSub, { color: colors.muted }]}>
                points earned from this visit
              </Text>
              <Pressable
                onPress={handleClose}
                style={styles.doneBtn}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Nav Tile ─────────────────────────────────────────────────────────────────

interface NavTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  badge?: string;
}

function NavTile({ icon, label, subtitle, color, onPress, badge }: NavTileProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, { backgroundColor: colors.surface }]}
    >
      {/* Colour accent bar along top */}
      <View style={[styles.tileAccent, { backgroundColor: color }]} />

      <View style={styles.tileBody}>
        <View style={[styles.tileIconWrap, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.tileLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.tileSub, { color: colors.muted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      {badge && (
        <View style={[styles.tileBadge, { backgroundColor: color }]}>
          <Text style={styles.tileBadgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const NAV_TILES: NavTileProps[] = [
  {
    icon: "book-outline",
    label: "Menu",
    subtitle: "Browse our full menu",
    color: "#3b82f6",
    onPress: () => router.push("/(tabs)/exercises"),
  },
  {
    icon: "pricetag",
    label: "Specials",
    subtitle: "Today's deals & offers",
    color: "#f97316",
    onPress: () => router.push("/(tabs)/history"),
  },
  {
    icon: "people",
    label: "Community",
    subtitle: "Share your experience",
    color: "#8b5cf6",
    onPress: () => router.push("/(tabs)/feed"),
  },
  {
    icon: "calendar",
    label: "Events",
    subtitle: "Live music & more",
    color: "#10b981",
    onPress: () => router.push("/events" as any),
  },
];

export default function HomeScreen() {
  const [isScanVisible, setIsScanVisible] = useState(false);
  const colors = useThemeColors();
  const { requireAuth } = useRequireAuth();
  const points = useRewardsStore((s) => s.points);

  const { tier, next, progress } = getTierInfo(points);
  const nextMilestone = getNextMilestone(points);
  const progressPct = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <AppBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Welcome banner ────────────────────────────────────────────── */}
        <View style={styles.banner}>
          <View style={styles.bannerAccentBar} />
          <View style={styles.bannerBody}>
            <View style={styles.bannerIconCircle}>
              <Ionicons name="restaurant" size={28} color="#f59e0b" />
            </View>
            <Text style={styles.bannerGreeting}>{getGreeting()}</Text>
            <Text style={styles.bannerTitle}>TableLog</Text>
            <View style={styles.bannerRule} />
            <Text style={styles.bannerTagline}>Your favourite local spot.</Text>
          </View>
        </View>

        {/* ── Explore section ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>EXPLORE</Text>
          <View style={styles.tileRow}>
            <NavTile {...NAV_TILES[0]} />
            <NavTile {...NAV_TILES[1]} />
          </View>
          <View style={styles.tileRow}>
            <NavTile {...NAV_TILES[2]} />
            <NavTile {...NAV_TILES[3]} />
          </View>
        </View>

        {/* ── Rewards section ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>REWARDS</Text>

          <View
            style={[
              styles.rewardsCard,
              { backgroundColor: colors.surface, borderColor: tier.color + "50" },
            ]}
          >
            {/* Header row */}
            <View style={styles.rewardsHeaderRow}>
              <View style={[styles.trophyCircle, { backgroundColor: tier.color + "22" }]}>
                <Ionicons name="trophy" size={19} color={tier.color} />
              </View>
              <Text style={[styles.rewardsCardTitle, { color: colors.text }]}>
                Your Rewards
              </Text>
              <View
                style={[
                  styles.tierPill,
                  { backgroundColor: tier.color + "22", borderColor: tier.color + "55" },
                ]}
              >
                <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.name}</Text>
              </View>
            </View>

            {/* Points */}
            <View style={styles.pointsDisplay}>
              <Text style={[styles.pointsNumber, { color: colors.text }]}>
                {points.toLocaleString()}
              </Text>
              <Text style={[styles.pointsSuffix, { color: colors.muted }]}> pts</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBlock}>
              <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: progressPct, backgroundColor: tier.color },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabelLeft, { color: colors.muted }]}>
                  {tier.name}
                </Text>
                {next ? (
                  <Text style={[styles.progressLabelRight, { color: tier.color }]}>
                    {next.name} at {next.minPoints} pts
                  </Text>
                ) : (
                  <Text style={[styles.progressLabelRight, { color: tier.color }]}>
                    Max tier! 🎉
                  </Text>
                )}
              </View>
            </View>

            {/* Next milestone */}
            {nextMilestone && (
              <View style={[styles.milestoneStrip, { backgroundColor: colors.background }]}>
                <Ionicons name="gift-outline" size={15} color="#f59e0b" />
                <Text style={[styles.milestoneText, { color: colors.muted }]}>
                  Next reward:{" "}
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {nextMilestone.title}
                  </Text>
                  {"  ·  "}{nextMilestone.points - points} pts away
                </Text>
              </View>
            )}

            {/* Scan button */}
            <Pressable
              onPress={() =>
                requireAuth(
                  () => setIsScanVisible(true),
                  "Log in to earn rewards points"
                )
              }
              style={styles.scanBtn}
            >
              <Ionicons name="scan-outline" size={20} color="#000000" />
              <Text style={styles.scanBtnText}>Scan Receipt</Text>
            </Pressable>

            <Text style={[styles.rateNote, { color: colors.muted }]}>
              1 point per $1 spent · redeemable in-store
            </Text>
          </View>
        </View>
      </ScrollView>

      <ScanReceiptModal visible={isScanVisible} onClose={() => setIsScanVisible(false)} />
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 48,
  },

  // ── Banner ──────────────────────────────────────────────────────────────────
  banner: {
    margin: 16,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2d1f00",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  bannerAccentBar: {
    height: 3,
    backgroundColor: "#f59e0b",
  },
  bannerBody: {
    backgroundColor: "#110d02",
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    gap: 4,
  },
  bannerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#f59e0b22",
    borderWidth: 1,
    borderColor: "#f59e0b35",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bannerGreeting: {
    color: "#78350f",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  bannerTitle: {
    color: "#fde68a",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  bannerRule: {
    width: 44,
    height: 2,
    backgroundColor: "#f59e0b",
    borderRadius: 1,
    marginVertical: 10,
  },
  bannerTagline: {
    color: "#92400e",
    fontSize: 14,
  },

  // ── Section wrapper ──────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  // ── Nav tiles ────────────────────────────────────────────────────────────────
  tileRow: {
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 134,
  },
  tileAccent: {
    height: 3,
  },
  tileBody: {
    padding: 14,
    gap: 5,
    flex: 1,
  },
  tileIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  tileSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  tileBadge: {
    position: "absolute",
    top: 14,
    right: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tileBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },

  // ── Rewards card ─────────────────────────────────────────────────────────────
  rewardsCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  rewardsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trophyCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardsCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  tierPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pointsDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  pointsNumber: {
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  pointsSuffix: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6,
  },
  progressBlock: {
    gap: 8,
    marginTop: -4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabelLeft: {
    fontSize: 12,
  },
  progressLabelRight: {
    fontSize: 12,
    fontWeight: "600",
  },
  milestoneStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 13,
    borderRadius: 12,
  },
  milestoneText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  scanBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  rateNote: {
    textAlign: "center",
    fontSize: 12,
    marginTop: -6,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalInputPhase: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalCenter: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
  },
  receiptIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  modalHeading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSubheading: {
    fontSize: 14,
    textAlign: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 76,
    paddingHorizontal: 22,
  },
  dollarSign: {
    fontSize: 34,
    fontWeight: "300",
    marginRight: 2,
    marginTop: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 13,
    borderRadius: 12,
    marginTop: 14,
  },
  previewText: {
    fontSize: 14,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 14,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  successPhase: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successHeading: {
    fontSize: 28,
    fontWeight: "700",
  },
  successPoints: {
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 80,
  },
  successSub: {
    fontSize: 15,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 52,
    marginTop: 8,
  },
  doneBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
});
