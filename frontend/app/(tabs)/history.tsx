import { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useSpecialsStore } from "@/store/useSpecialsStore";
import { useThemeColors } from "@/store/useThemeStore";
import { AppBackground } from "@/components/AppBackground";
import type { MuscleGroup, Special } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<MuscleGroup, string> = {
  specials:  "#f97316",
  starters:  "#ef4444",
  breakfast: "#06b6d4",
  mains:     "#3b82f6",
  sides:     "#22c55e",
  desserts:  "#f59e0b",
  drinks:    "#8b5cf6",
  snacks:    "#ec4899",
};

const CATEGORY_ICONS: Record<MuscleGroup, keyof typeof Ionicons.glyphMap> = {
  specials:  "star",
  starters:  "leaf",
  breakfast: "sunny",
  mains:     "restaurant",
  sides:     "grid",
  desserts:  "ice-cream",
  drinks:    "wine",
  snacks:    "pizza",
};

const CATEGORY_LABELS: Record<MuscleGroup, string> = {
  specials:  "Specials",
  starters:  "Starters",
  breakfast: "Breakfast",
  mains:     "Mains",
  sides:     "Sides",
  desserts:  "Desserts",
  drinks:    "Drinks",
  snacks:    "Snacks",
};

// ─── Detail modal ─────────────────────────────────────────────────────────────

function SpecialDetailModal({
  special,
  highlighted,
  onClose,
}: {
  special: Special | null;
  highlighted: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  if (!special) return null;

  const accentColor = CATEGORY_COLORS[special.category];
  const icon = CATEGORY_ICONS[special.category];
  const hasDiscount =
    special.originalPrice !== undefined && special.originalPrice > (special.price ?? 0);
  const savings =
    hasDiscount ? (special.originalPrice! - (special.price ?? 0)).toFixed(0) : null;

  const detailRows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    {
      icon: CATEGORY_ICONS[special.category],
      label: "Category",
      value: CATEGORY_LABELS[special.category],
    },
    ...(special.expiresAt
      ? [{ icon: "time-outline" as const, label: "Available", value: special.expiresAt }]
      : []),
    {
      icon: "checkmark-circle-outline" as const,
      label: "Status",
      value: highlighted ? "Featured today" : "Ongoing offer",
    },
  ];

  return (
    <Modal
      visible={!!special}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.modalSafe, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
          <View style={{ width: 56 }} />
          <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Special Details</Text>
          <Pressable onPress={onClose} hitSlop={12} style={{ width: 56, alignItems: "flex-end" }}>
            <Text style={[styles.modalCloseText, { color: colors.muted }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScroll}
        >
          {/* Banner */}
          <View style={[styles.banner, { backgroundColor: accentColor + "18" }]}>
            {highlighted && (
              <View style={styles.todayBanner}>
                <Ionicons name="star" size={11} color="#ffffff" />
                <Text style={styles.todayBannerText}>TODAY'S SPECIAL</Text>
              </View>
            )}
            <View style={[styles.bannerIconWrap, { backgroundColor: accentColor + "22" }]}>
              <Ionicons name={icon} size={32} color={accentColor} />
            </View>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>{special.name}</Text>
            <View style={[styles.bannerAccent, { backgroundColor: accentColor }]} />
          </View>

          {/* Price block */}
          {special.price !== undefined && (
            <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
              <View style={styles.priceRow}>
                <Text style={[styles.modalPrice, { color: accentColor }]}>
                  ${special.price}
                </Text>
                {hasDiscount && (
                  <Text style={[styles.modalOriginalPrice, { color: colors.muted }]}>
                    ${special.originalPrice}
                  </Text>
                )}
                {savings && (
                  <View style={[styles.savingsPill, { backgroundColor: "#16a34a22" }]}>
                    <Text style={styles.savingsText}>Save ${savings}</Text>
                  </View>
                )}
              </View>
              {hasDiscount && (
                <Text style={[styles.priceNote, { color: colors.muted }]}>
                  Regular price ${special.originalPrice} · You save ${savings}
                </Text>
              )}
            </View>
          )}

          {/* Detail rows */}
          <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
            {detailRows.map(({ icon: rowIcon, label, value }, i) => (
              <View key={label}>
                <View style={styles.detailRow}>
                  <View style={[styles.detailIconWrap, { backgroundColor: accentColor + "18" }]}>
                    <Ionicons name={rowIcon} size={15} color={accentColor} />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
                  </View>
                </View>
                {i < detailRows.length - 1 && (
                  <View style={[styles.detailSep, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={[styles.descLabel, { color: colors.muted }]}>DESCRIPTION</Text>
            <Text style={[styles.descText, { color: colors.text }]}>{special.description}</Text>
          </View>

          {/* CTA */}
          <View style={[styles.ctaCard, { backgroundColor: accentColor + "14", borderColor: accentColor + "30" }]}>
            <View style={[styles.ctaIconWrap, { backgroundColor: accentColor + "22" }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaTitle, { color: colors.text }]}>How to order</Text>
              <Text style={[styles.ctaSub, { color: colors.muted }]}>
                Ask your server about this special or mention it when placing your order.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Special card ─────────────────────────────────────────────────────────────

function SpecialCard({
  special,
  highlighted,
  onPress,
}: {
  special: Special;
  highlighted: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const accentColor = CATEGORY_COLORS[special.category];
  const icon = CATEGORY_ICONS[special.category];
  const hasDiscount =
    special.originalPrice !== undefined && special.originalPrice > (special.price ?? 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, opacity: pressed ? 0.82 : 1 },
        highlighted && styles.cardHighlighted,
      ]}
    >
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

      <View style={styles.cardBody}>
        {/* Name + price */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            {highlighted && (
              <View style={styles.todayBadge}>
                <Ionicons name="star" size={10} color="#ffffff" />
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
            )}
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
              {special.name}
            </Text>
          </View>

          <View style={styles.priceBlock}>
            {special.price !== undefined && (
              <Text style={[styles.price, { color: accentColor }]}>${special.price}</Text>
            )}
            {hasDiscount && (
              <Text style={[styles.originalPrice, { color: colors.muted }]}>
                ${special.originalPrice}
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>
          {special.description}
        </Text>

        {/* Footer: category + expiry */}
        <View style={styles.cardFooter}>
          <View style={[styles.categoryBadge, { backgroundColor: accentColor + "20" }]}>
            <Ionicons name={icon} size={11} color={accentColor} />
            <Text style={[styles.categoryBadgeText, { color: accentColor }]}>
              {CATEGORY_LABELS[special.category]}
            </Text>
          </View>

          {special.expiresAt && (
            <View style={[styles.expiryBadge, { backgroundColor: colors.background }]}>
              <Ionicons name="time-outline" size={11} color={colors.muted} />
              <Text style={[styles.expiryText, { color: colors.muted }]}>
                {special.expiresAt}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }} />
          <View style={[styles.detailsHint, { backgroundColor: accentColor + "14" }]}>
            <Text style={[styles.detailsHintText, { color: accentColor }]}>Details</Text>
            <Ionicons name="chevron-forward" size={11} color={accentColor} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SpecialsScreen() {
  const specials = useSpecialsStore((s) => s.specials);
  const colors = useThemeColors();
  const [selectedSpecial, setSelectedSpecial] = useState<Special | null>(null);

  const todaySpecials = specials.filter((s) => s.isToday);
  const otherSpecials = specials.filter((s) => !s.isToday);
  const isHighlighted = selectedSpecial
    ? todaySpecials.some((s) => s.id === selectedSpecial.id)
    : false;

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Hero banner ─────────────────────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="star" size={22} color="#f97316" />
            </View>
            <View>
              <Text style={styles.heroTitle}>Today's Specials</Text>
              <Text style={styles.heroSub}>
                {todaySpecials.length > 0
                  ? `${todaySpecials.length} featured deal${todaySpecials.length !== 1 ? "s" : ""} available now`
                  : "No specials today — check back soon!"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Today's Specials ────────────────────────────────────────────── */}
        {todaySpecials.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#f97316" }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Specials</Text>
            </View>
            {todaySpecials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                highlighted
                onPress={() => setSelectedSpecial(special)}
              />
            ))}
          </View>
        )}

        {/* ── Ongoing Offers ──────────────────────────────────────────────── */}
        {otherSpecials.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: colors.muted }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ongoing Offers</Text>
            </View>
            {otherSpecials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                highlighted={false}
                onPress={() => setSelectedSpecial(special)}
              />
            ))}
          </View>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {specials.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="pricetag-outline" size={32} color={colors.muted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No specials right now</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Check back soon for exclusive deals and featured dishes.
            </Text>
          </View>
        )}
      </ScrollView>

      <SpecialDetailModal
        special={selectedSpecial}
        highlighted={isHighlighted}
        onClose={() => setSelectedSpecial(null)}
      />
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroBanner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#431407",
    borderWidth: 1,
    borderColor: "#f9731630",
    flexDirection: "row",
    alignItems: "center",
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f9731622",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f9731640",
  },
  heroTitle: {
    color: "#fed7aa",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  heroSub: {
    color: "#92400e",
    fontSize: 13,
    marginTop: 3,
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Card (unchanged visually)
  card: {
    borderRadius: 18,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHighlighted: {
    shadowColor: "#f97316",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardAccent: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  todayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: "#f97316",
  },
  todayBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  priceBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: "line-through",
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: "500",
  },
  detailsHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailsHintText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Modal
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
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },

  // Banner
  banner: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  todayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f97316",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "center",
  },
  todayBannerText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  bannerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  bannerAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },

  // Price card
  priceCard: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalPrice: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  modalOriginalPrice: {
    fontSize: 18,
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  savingsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  savingsText: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "700",
  },
  priceNote: {
    fontSize: 12,
    marginTop: 2,
  },

  // Detail rows card
  detailCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    flex: 1,
    gap: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },

  // Description
  descSection: {
    gap: 10,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  descText: {
    fontSize: 15,
    lineHeight: 24,
  },

  // How to order CTA
  ctaCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  ctaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  ctaSub: {
    fontSize: 13,
    lineHeight: 19,
  },
});
