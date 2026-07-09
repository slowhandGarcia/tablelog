import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
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

// Warm amber/brown palette gives each category a distinct restaurant feel
const CATEGORY_COLORS: Record<MuscleGroup, string> = {
  specials:  "#c2410c",
  starters:  "#b45309",
  breakfast: "#0369a1",
  mains:     "#92400e",
  sides:     "#166534",
  desserts:  "#be185d",
  drinks:    "#6d28d9",
  snacks:    "#1e40af",
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
          contentContainerStyle={styles.searchContent}
          renderItem={({ item }) => {
            const color = CATEGORY_COLORS[item.muscleGroup];
            return (
              <Pressable
                onPress={() => router.push(`/exercise/${item.id}`)}
                style={[styles.searchItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.searchAccent, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.searchItemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.searchItemCat, { color: colors.muted }]}>
                    {CATEGORY_LABELS[item.muscleGroup]}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={colors.muted} style={{ marginRight: 14 }} />
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

        /* ── Accordion category list ────────────────────────────────────── */
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
        >
          {/* Outer container matches the screenshot's single-surface card feel */}
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {sections.map(({ category, data }, idx) => {
              const isOpen = openCategories.has(category);
              const color = CATEGORY_COLORS[category];
              const icon = CATEGORY_ICONS[category];
              const isLast = idx === sections.length - 1;

              return (
                <View key={category}>

                  {/* ── Category header row ─────────────────────────────── */}
                  <Pressable
                    onPress={() => toggleCategory(category)}
                    style={styles.categoryRow}
                  >
                    {/* Category image placeholder — swap src for a real food photo */}
                    <View style={[styles.categoryImg, { backgroundColor: color + "25" }]}>
                      <Ionicons name={icon} size={32} color={color} />
                    </View>

                    {/* Name + count */}
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {CATEGORY_LABELS[category]}
                      </Text>
                      <Text style={[styles.categoryCount, { color: colors.muted }]}>
                        {data.length} {data.length === 1 ? "item" : "items"} to choose from
                      </Text>
                    </View>

                    {/* Chevron */}
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={22}
                      color={colors.muted}
                    />
                  </Pressable>

                  {/* ── Expanded dish rows ──────────────────────────────── */}
                  {isOpen && (
                    <View style={[styles.dishList, { borderTopColor: colors.border }]}>
                      {data.map((item, dishIdx) => (
                        <View key={item.id}>
                          <Pressable
                            onPress={() => router.push(`/exercise/${item.id}`)}
                            style={styles.dishRow}
                          >
                            <View style={[styles.dishDot, { backgroundColor: color }]} />
                            <Text
                              numberOfLines={1}
                              style={[styles.dishName, { color: colors.text }]}
                            >
                              {item.name}
                            </Text>
                            <Ionicons name="chevron-forward" size={15} color={colors.muted} />
                          </Pressable>
                          {dishIdx < data.length - 1 && (
                            <View style={[styles.dishDivider, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Separator between categories */}
                  {!isLast && (
                    <View style={[styles.categorySeparator, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // Search bar
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

  // Scroll padding
  listPad: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Outer menu card (wraps all categories)
  menuCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },

  // Category accordion header
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  // Replace this View with an <Image> once you have real category photos
  categoryImg: {
    width: 82,
    height: 82,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categoryInfo: {
    flex: 1,
    gap: 5,
  },
  categoryName: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  categoryCount: {
    fontSize: 13,
    fontStyle: "italic",
  },

  // Hairline between categories
  categorySeparator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  // Expanded dish list
  dishList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dishRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  dishDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  dishName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  dishDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },

  // Search result list
  searchContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  searchAccent: {
    width: 3,
    alignSelf: "stretch",
    marginRight: 14,
  },
  searchItemName: {
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 14,
  },
  searchItemCat: {
    fontSize: 12,
    textTransform: "capitalize",
    marginTop: 1,
    marginBottom: 2,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
});
