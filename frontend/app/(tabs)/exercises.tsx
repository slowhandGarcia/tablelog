import { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useExerciseStore } from "@/store/useExerciseStore";
import { useThemeColors } from "@/store/useThemeStore";
import { AppBackground } from "@/components/AppBackground";
import type { MuscleGroup } from "@/types";

const CATEGORY_ORDER: MuscleGroup[] = [
  "specials",
  "starters",
  "breakfast",
  "mains",
  "sides",
  "desserts",
  "drinks",
  "snacks",
];

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

export default function MenuScreen() {
  const exercises = useExerciseStore((s) => s.exercises);
  const colors = useThemeColors();

  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<MuscleGroup>>(new Set());

  const toggleCategory = (cat: MuscleGroup) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const sections = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        category: cat,
        data: exercises.filter((e) => e.muscleGroup === cat),
      })).filter((s) => s.data.length > 0),
    [exercises]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  const isSearching = query.trim().length > 0;

  return (
    <AppBackground>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.placeholder} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search menu…"
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.placeholder} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Search results ─────────────────────────────────────────────── */}
      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const color = CATEGORY_COLORS[item.muscleGroup];
            return (
              <Pressable
                onPress={() => router.push(`/exercise/${item.id}`)}
                style={[styles.flatItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.itemAccent, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemCategory, { color: colors.muted }]}>
                    {CATEGORY_LABELS[item.muscleGroup]}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={colors.muted} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No dishes match "{query}"
            </Text>
          }
        />
      ) : (

        /* ── Accordion sections ──────────────────────────────────────────── */
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {sections.map(({ category, data }) => {
            const isOpen = openCategories.has(category);
            const color = CATEGORY_COLORS[category];
            const icon = CATEGORY_ICONS[category];

            return (
              <View
                key={category}
                style={[styles.accordionCard, { backgroundColor: colors.surface }]}
              >
                {/* Header */}
                <Pressable
                  onPress={() => toggleCategory(category)}
                  style={styles.accordionHeader}
                >
                  <View style={[styles.accordionIconWrap, { backgroundColor: color + "22" }]}>
                    <Ionicons name={icon} size={16} color={color} />
                  </View>

                  <Text style={[styles.accordionLabel, { color: colors.text }]}>
                    {CATEGORY_LABELS[category]}
                  </Text>

                  <View style={[styles.countBadge, { backgroundColor: color + "18" }]}>
                    <Text style={[styles.countText, { color }]}>{data.length}</Text>
                  </View>

                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>

                {/* Items */}
                {isOpen && (
                  <>
                    <View style={[styles.headerDivider, { backgroundColor: colors.border }]} />
                    {data.map((item, idx) => (
                      <View key={item.id}>
                        <Pressable
                          onPress={() => router.push(`/exercise/${item.id}`)}
                          style={styles.accordionItem}
                        >
                          <View style={[styles.itemAccent, { backgroundColor: color }]} />
                          <Text style={[styles.itemText, { color: colors.text }]}>
                            {item.name}
                          </Text>
                          <Ionicons name="chevron-forward" size={15} color={colors.muted} style={{ marginRight: 14 }} />
                        </Pressable>
                        {idx < data.length - 1 && (
                          <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>
            );
          })}

        </ScrollView>
      )}
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // Search
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },

  // Shared list padding
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },

  // Accordion card
  accordionCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  accordionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accordionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Dividers inside accordion
  headerDivider: {
    height: StyleSheet.hairlineWidth,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 17, // aligns with item text (3px accent + 14px gap)
  },

  // Accordion items
  accordionItem: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  itemAccent: {
    width: 3,
    alignSelf: "stretch",
    marginRight: 14,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 14,
  },

  // Flat search results
  flatItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
    paddingRight: 14,
  },
  itemCategory: {
    fontSize: 12,
    textTransform: "capitalize",
    marginTop: 1,
    marginBottom: 2,
  },

  // Empty search state
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
});
