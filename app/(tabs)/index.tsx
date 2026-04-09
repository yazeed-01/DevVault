import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useVault } from "@/context/VaultContext";
import { useTheme } from "@/context/ThemeContext";
import { KnowledgeItem } from "@/lib/database";
import { EmptyState } from "@/components/EmptyState";
import { GraphView } from "@/components/GraphView";
import { ItemCard } from "@/components/ItemCard";
import { SkeletonCard } from "@/components/SkeletonLoader";
import { BackgroundAccents } from "@/components/BackgroundAccents";
import { KanbanView } from "@/components/KanbanView";

// Dynamic categories and stats will be fetched from useVault

export default function ExploreScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  const { items, loading, metadataValues } = useVault();
  const { settings, updateSetting, accent, accentGlow, themeStyles, fontScale } = useTheme();
  const tc = themeStyles.colors;
  const insets = useSafeAreaInsets();

  const categories = metadataValues["category"] || [];

  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const isTerminal = settings.visualStyle === "terminal";
  const isGraph = settings.viewMode === "graph";
  const isKanban = settings.viewMode === "kanban";

  const toggleViewMode = () => {
    if (settings.viewMode === "list") updateSetting("viewMode", "kanban");
    else if (settings.viewMode === "kanban") updateSetting("viewMode", "graph");
    else updateSetting("viewMode", "list");
  };

  const viewIcon = isGraph ? "list" : isKanban ? "share-2" : "trello";

  // Helper for chip colors
  const getCategoryStyle = (cat?: any) => {
    if (!cat || cat === "all") return { bg: accentGlow, text: accent };
    if (cat.color) return { bg: cat.color + "15", text: cat.color };
    // Fallback
    return { bg: accentGlow, text: accent };
  };

  const renderItem = ({ item }: { item: KnowledgeItem }) => (
    <ItemCard
      item={item}
      onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
    />
  );

  const ListEmpty = () => {
    if (loading) {
      return (
        <>
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </>
      );
    }
    return (
      <EmptyState
        icon="inbox"
        title="Nothing here yet"
        subtitle={
          selectedCategory === "all"
            ? "Add your first knowledge item using the + button"
            : `No items in this category yet`
        }
      />
    );
  };

  return (
    <View style={[styles.container, themeStyles.screenBg, { paddingTop: topPadding }]}>
      <StatusBar
        barStyle={tc.statusBar}
        backgroundColor={themeStyles.screenBg["backgroundColor"]}
      />

      <BackgroundAccents hide={isGraph || isKanban} />

      {/* ── Fixed header ── */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.greeting, { color: tc.text, fontFamily: isTerminal ? "monospace" : "Inter_700Bold" }]}>
            {isTerminal ? "> DevVault_" : "DevVault"}
          </Text>
          <View style={[styles.headerBadge, { backgroundColor: accent + "15", borderColor: accent + "30" }]}>
            <Text style={[styles.headerBadgeText, { color: accent, fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold" }]}>
              {items.length}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* View toggle button */}
          <Pressable
            style={[
              styles.actionBtn,
              (isGraph || isKanban)
                ? { backgroundColor: accent + "25", borderColor: accent + "60" }
                : { backgroundColor: accentGlow, borderColor: tc.border },
            ]}
            onPress={toggleViewMode}
          >
            <Feather
              name={viewIcon}
              size={18}
              color={(isGraph || isKanban) ? accent : tc.textSecondary}
            />
          </Pressable>
          {/* Add button */}
          <Pressable
            style={[styles.actionBtn, { backgroundColor: accentGlow, borderColor: accent + "40" }]}
            onPress={() => router.push("/item/create")}
          >
            <Feather name="plus" size={22} color={accent} />
          </Pressable>
        </View>
      </View>


      {/* ── Persistent Filter Tabs (Universal) ── */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={[styles.filterRow, { paddingHorizontal: 16 }]}
        >
          {/* "All" chip first */}
          <Pressable
            key="all"
            style={[
              styles.filterChip,
              isTerminal && styles.filterChipTerminal,
              selectedCategory === "all"
                ? { backgroundColor: accent, borderColor: accent }
                : [themeStyles.surface, { borderColor: tc.border }],
            ]}
            onPress={() => setSelectedCategory("all")}
          >
            <View style={[styles.filterDot, { backgroundColor: selectedCategory === "all" ? "rgba(255,255,255,0.35)" : accent }]} />
            <Text style={[styles.filterText, selectedCategory === "all" ? { color: "#fff", fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold" } : { color: tc.textSecondary, fontFamily: isTerminal ? "monospace" : "Inter_500Medium" }]}>
              All
            </Text>
            <View style={[styles.filterCount, { backgroundColor: selectedCategory === "all" ? "rgba(255,255,255,0.2)" : (tc.border + "40"), marginLeft: 6 }]}>
              <Text style={[styles.filterCountText, { color: selectedCategory === "all" ? "#fff" : tc.textMuted, fontFamily: isTerminal ? "monospace" : "Inter_700Bold" }]}>
                {items.length}
              </Text>
            </View>
          </Pressable>

          {categories.map((cat) => {
            const isActive = selectedCategory === cat.slug;
            const catItems = items.filter(i => i.category === cat.slug);
            const count = catItems.length;
            
            if (count === 0 && !isActive) return null;

            const catStyle = getCategoryStyle(cat);
            const activeChipBg = catStyle.bg;
            const activeChipBorder = catStyle.text + "70";
            const activeTextColor = catStyle.text;

            return (
              <Pressable
                key={cat.slug}
                style={[
                  styles.filterChip,
                  isTerminal && styles.filterChipTerminal,
                  isActive
                    ? { backgroundColor: activeChipBg, borderColor: activeChipBorder }
                    : [themeStyles.surface, { borderColor: tc.border }],
                ]}
                onPress={() => setSelectedCategory(cat.slug)}
              >
                <View style={[styles.filterDot, { backgroundColor: isActive ? catStyle.text + "50" : catStyle.text }]} />
                <Text
                  style={[
                    styles.filterText,
                    isActive
                      ? { color: activeTextColor, fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold" }
                      : { color: tc.textSecondary, fontFamily: isTerminal ? "monospace" : "Inter_500Medium" },
                  ]}
                >
                  {cat.label}
                </Text>
                
                <View style={[styles.filterCount, {
                  backgroundColor: isActive ? catStyle.text + "28" : (tc.border + "40"),
                  marginLeft: 6,
                }]}>
                  <Text style={[styles.filterCountText, {
                    color: isActive ? catStyle.text : tc.textMuted,
                    fontFamily: isTerminal ? "monospace" : "Inter_700Bold",
                  }]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content area ── */}
      <View style={{ flex: 1 }}>
        {isGraph && !loading ? (
          filteredItems.length === 0 ? (
            <View style={styles.emptyGraphWrapper}>
              <EmptyState
                icon="share-2"
                title="Nothing to graph"
                subtitle={
                  selectedCategory === "all"
                    ? "Add your first knowledge item using the + button"
                    : `No ${selectedCategory} added yet`
                }
              />
            </View>
          ) : (
            <GraphView
              items={filteredItems}
              onNodePress={(item) => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
            />
          )
        ) : isKanban && !loading ? (
          <KanbanView
            items={filteredItems}
            onItemPress={(item) => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
          />
        ) : (
          <FlatList
            key="list"
            data={loading ? [] : filteredItems}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListEmptyComponent={<ListEmpty />}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: Platform.OS === "web" ? 120 : 100, paddingTop: 8, flexGrow: 1 },
            ]}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            removeClippedSubviews={false}
          />
        )}
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  headerBadgeText: {
    fontSize: 12,
  },
  greeting: {
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterScroll: {
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  filterRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 0,
    paddingBottom: 8,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 9,
    paddingRight: 10,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1.5,
    marginRight: 7,
  },
  filterChipTerminal: {
    borderRadius: 4,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  filterText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  filterCount: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  filterCountText: {
    fontSize: 10,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statCount: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 10,
  },
  list: {
    paddingHorizontal: 16,
  },
  emptyGraphWrapper: {
    flex: 1,
  },
  floatingOverlays: {
    position: 'absolute',
    bottom: 24, // Place them floating at the bottom!
    left: 0,
    right: 0,
    zIndex: 10,
    gap: 12,
  },
});
