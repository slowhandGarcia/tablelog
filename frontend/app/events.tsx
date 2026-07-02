import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/store/useThemeStore";
import { AppBackground } from "@/components/AppBackground";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface EventItem {
  id: string;
  name: string;
  day: string;
  month: string;
  time: string;
  recurrence: string;
  description: string;
  longDescription: string;
  location: string;
  price: string;
  capacity: string;
  tags: string[];
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const EVENTS: EventItem[] = [
  {
    id: "1",
    name: "Live Jazz Night",
    day: "4",
    month: "JUL",
    time: "7:00 PM – 10:00 PM",
    recurrence: "Every Friday",
    description:
      "Unwind to smooth live jazz performed by local artists in our dining room. Perfect for date night.",
    longDescription:
      "Join us every Friday evening as local jazz artists fill our dining room with smooth, soulful sounds. No reservation required — simply dine with us and enjoy the atmosphere. Sets run from 7:00 PM until 10:00 PM with a short intermission at 8:30 PM. The perfect backdrop for a relaxed dinner or a special evening out.",
    location: "Main Dining Room",
    price: "Free with dining",
    capacity: "All tables welcome",
    tags: ["Live Music", "Walk-ins Welcome"],
    icon: "musical-notes",
    color: "#8b5cf6",
  },
  {
    id: "2",
    name: "Wine & Dine Pairing",
    day: "5",
    month: "JUL",
    time: "6:30 PM – 9:30 PM",
    recurrence: "Monthly — Saturdays",
    description:
      "A curated 4-course dinner paired with hand-selected wines. Tickets required, limited seats.",
    longDescription:
      "Our sommelier selects four exceptional wines, each paired with a bespoke course crafted by our head chef. The evening begins with a welcome reception at 6:30 PM, followed by four tasting courses with guided commentary on each pairing. Includes a printed tasting card to take home. Advance booking is essential — this event sells out every month.",
    location: "Private Dining Room",
    price: "$65 per person",
    capacity: "Limited to 24 guests",
    tags: ["Ticketed", "Adults Only"],
    icon: "wine",
    color: "#f59e0b",
  },
  {
    id: "3",
    name: "Sunday Family Brunch",
    day: "6",
    month: "JUL",
    time: "11:00 AM – 3:00 PM",
    recurrence: "Every Sunday",
    description:
      "A relaxed brunch buffet with something for everyone — from fresh pastries to our full hot menu.",
    longDescription:
      "Our famous Sunday Brunch offers a rotating buffet of freshly baked pastries, eggs cooked your way, our full hot breakfast and lunch menu, fresh-squeezed juice and bottomless coffee. A warm, welcoming space for families of all sizes. Children under 5 eat free. Booking is recommended for groups of 6 or more.",
    location: "Full Restaurant",
    price: "$28 adults · $14 children",
    capacity: "Booking recommended",
    tags: ["Family Friendly", "Buffet", "Bottomless Coffee"],
    icon: "sunny",
    color: "#06b6d4",
  },
  {
    id: "4",
    name: "Chef's Tasting Menu",
    day: "10",
    month: "JUL",
    time: "7:00 PM – 10:00 PM",
    recurrence: "Selected Thursdays",
    description:
      "An exclusive 5-course tasting experience prepared personally by our head chef. Book early.",
    longDescription:
      "An intimate 5-course journey through the season's finest produce, prepared and narrated by our head chef at the exclusive chef's table. Each course is explained in detail as it arrives, giving you a behind-the-scenes look at the inspiration behind every dish. Optional wine pairings are available for an additional $40 per person. Space is extremely limited — we strongly recommend booking at least two weeks in advance.",
    location: "Chef's Table — Private Room",
    price: "$95 per person",
    capacity: "Limited to 10 guests",
    tags: ["Exclusive", "Ticketed", "Optional Wine Pairing"],
    icon: "restaurant",
    color: "#3b82f6",
  },
  {
    id: "5",
    name: "Birthday Dining Package",
    day: "—",
    month: "ANY",
    time: "All day",
    recurrence: "Daily",
    description:
      "Celebrating a birthday? Enjoy a complimentary dessert and our surprise birthday treat.",
    longDescription:
      "Let us make your birthday truly special. Simply mention the birthday when booking and we will take care of the rest. The birthday guest receives a complimentary dessert with a personalised message, a house cocktail or mocktail of their choice, and our signature birthday surprise. Available for the birthday guest and their entire party — no group size limit.",
    location: "Anywhere in the restaurant",
    price: "Complimentary add-on",
    capacity: "Any group size",
    tags: ["Celebration", "Complimentary", "All Ages"],
    icon: "gift",
    color: "#ec4899",
  },
];

// ─── Detail modal ─────────────────────────────────────────────────────────────

function EventDetailModal({
  event,
  onClose,
}: {
  event: EventItem | null;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  if (!event) return null;

  const detailRows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: "calendar-outline",  label: "Date",     value: `${event.day} ${event.month} · ${event.recurrence}` },
    { icon: "time-outline",      label: "Time",     value: event.time },
    { icon: "location-outline",  label: "Location", value: event.location },
    { icon: "people-outline",    label: "Capacity", value: event.capacity },
    { icon: "pricetag-outline",  label: "Price",    value: event.price },
  ];

  return (
    <Modal
      visible={!!event}
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
          <Text style={[styles.modalHeaderTitle, { color: colors.text }]} numberOfLines={1}>
            Event Details
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={{ width: 56, alignItems: "flex-end" }}>
            <Text style={[styles.modalCloseText, { color: colors.muted }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScroll}
        >
          {/* Colour banner */}
          <View style={[styles.banner, { backgroundColor: event.color + "18" }]}>
            <View style={[styles.bannerIconWrap, { backgroundColor: event.color + "22" }]}>
              <Ionicons name={event.icon} size={32} color={event.color} />
            </View>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>{event.name}</Text>
            <View style={[styles.bannerAccent, { backgroundColor: event.color }]} />
          </View>

          {/* Tags */}
          <View style={styles.tagRow}>
            {event.tags.map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: event.color + "18", borderColor: event.color + "40" }]}
              >
                <Text style={[styles.tagText, { color: event.color }]}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Detail rows */}
          <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
            {detailRows.map(({ icon, label, value }, i) => (
              <View key={label}>
                <View style={styles.detailRow}>
                  <View style={[styles.detailIconWrap, { backgroundColor: event.color + "18" }]}>
                    <Ionicons name={icon} size={15} color={event.color} />
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

          {/* Full description */}
          <View style={styles.descSection}>
            <Text style={[styles.descLabel, { color: colors.muted }]}>ABOUT THIS EVENT</Text>
            <Text style={[styles.descText, { color: colors.text }]}>{event.longDescription}</Text>
          </View>

          {/* CTA */}
          <Pressable
            onPress={() =>
              Alert.alert(
                "Reserve a Table",
                "Online reservations are coming soon!\n\nCall us to book your spot for this event.\n\n📞 (555) 012-3456",
                [{ text: "Got it" }]
              )
            }
            style={[styles.ctaBtn, { backgroundColor: event.color }]}
          >
            <Ionicons name="calendar-outline" size={18} color="#ffffff" />
            <Text style={styles.ctaBtnText}>Reserve a Table</Text>
          </Pressable>

          {/* Contact */}
          <View style={[styles.contactRow, { backgroundColor: colors.surface }]}>
            <Ionicons name="call-outline" size={15} color={colors.muted} />
            <Text style={[styles.contactText, { color: colors.muted }]}>
              Questions? Call us on{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>(555) 012-3456</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function EventCard({
  event,
  onPress,
}: {
  event: EventItem;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, opacity: pressed ? 0.82 : 1 },
      ]}
    >
      {/* Color accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: event.color }]} />

      <View style={styles.cardBody}>
        {/* Date badge */}
        <View style={[styles.dateBadge, { backgroundColor: event.color + "18" }]}>
          <Text style={[styles.dateDay, { color: event.color }]}>{event.day}</Text>
          <Text style={[styles.dateMonth, { color: event.color }]}>{event.month}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconWrap, { backgroundColor: event.color + "18" }]}>
              <Ionicons name={event.icon} size={14} color={event.color} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {event.name}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{event.time}</Text>
            <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.muted }]}>{event.recurrence}</Text>
          </View>

          <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={2}>
            {event.description}
          </Text>

          <View style={[styles.tapHint, { backgroundColor: event.color + "14" }]}>
            <Text style={[styles.tapHintText, { color: event.color }]}>Tap to see details</Text>
            <Ionicons name="chevron-forward" size={12} color={event.color} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const colors = useThemeColors();
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Hero strip */}
          <View style={[styles.hero, { backgroundColor: colors.surface }]}>
            <View style={[styles.heroIconWrap, { backgroundColor: "#10b98122" }]}>
              <Ionicons name="calendar" size={28} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>What's On</Text>
              <Text style={[styles.heroSub, { color: colors.muted }]}>
                Live music, tasting menus & more
              </Text>
            </View>
          </View>

          {/* Section label */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>UPCOMING EVENTS</Text>

          {/* Event cards */}
          {EVENTS.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => setSelectedEvent(event)}
            />
          ))}

          {/* Footer */}
          <View style={[styles.footer, { borderColor: colors.border }]}>
            <Ionicons name="call-outline" size={16} color={colors.muted} />
            <Text style={[styles.footerText, { color: colors.muted }]}>
              To book or enquire, call us on{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>(555) 012-3456</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 12,
  },

  // Hero
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 18,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    marginTop: 2,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 4,
  },

  // Card
  card: {
    borderRadius: 18,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
    gap: 14,
  },
  dateBadge: {
    width: 48,
    minHeight: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  tapHintText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    marginTop: 4,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
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
    overflow: "hidden",
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

  // Tags
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Detail card
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

  // CTA
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 17,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Contact
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
