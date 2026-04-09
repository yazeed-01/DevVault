import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useVault } from "@/context/VaultContext";
import { KnowledgeItem } from "@/lib/database";

interface KanbanViewProps {
  items: KnowledgeItem[];
  onItemPress: (item: KnowledgeItem) => void;
}

function KanbanCard({ item, onPress }: { item: KnowledgeItem; onPress: () => void }) {
  const { themeStyles, accent, settings } = useTheme();
  const { metadataValues } = useVault();
  const tc = themeStyles.colors;
  const isTerminal = settings.visualStyle === "terminal";

  const categories = metadataValues["category"] || [];
  const catMetadata = categories.find((c) => c.slug === item.category);
  const catColor = catMetadata?.color || accent;

  const preview = item.content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 100);

  return (
    <Pressable
      style={[
        styles.card,
        themeStyles.card,
        { borderLeftWidth: 3, borderLeftColor: catColor },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.cardTitle,
          { color: tc.text, fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold" },
        ]}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      {preview.length > 0 && (
        <Text
          style={[
            styles.cardPreview,
            { color: tc.textMuted, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" },
          ]}
          numberOfLines={3}
        >
          {preview}
        </Text>
      )}

      {item.tags.length > 0 && (
        <View style={styles.cardTags}>
          {item.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={[styles.cardTag, { backgroundColor: catColor + "18", borderColor: catColor + "30" }]}
            >
              <Text style={[styles.cardTagText, { color: catColor }]}>#{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={[styles.cardTagMore, { color: tc.textMuted }]}>
              +{item.tags.length - 3}
            </Text>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        {item.links.length > 0 && (
          <View style={styles.cardMeta}>
            <Feather name="link" size={10} color={tc.textMuted} />
            <Text style={[styles.cardMetaText, { color: tc.textMuted }]}>{item.links.length}</Text>
          </View>
        )}
        {item.images.length > 0 && (
          <View style={styles.cardMeta}>
            <Feather name="image" size={10} color={tc.textMuted} />
            <Text style={[styles.cardMetaText, { color: tc.textMuted }]}>{item.images.length}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function KanbanView({ items, onItemPress }: KanbanViewProps) {
  const { themeStyles, accent, accentGlow, settings } = useTheme();
  const { metadataValues } = useVault();
  const tc = themeStyles.colors;
  const isTerminal = settings.visualStyle === "terminal";

  const categories = metadataValues["category"] || [];

  // Group items by category
  const columns = categories.map((cat) => ({
    cat,
    items: items.filter((i) => i.category === cat.slug),
  })).filter((col) => col.items.length > 0 || categories.length <= 6);

  // Add uncategorized items
  const knownSlugs = new Set(categories.map((c) => c.slug));
  const uncategorized = items.filter((i) => !knownSlugs.has(i.category));
  if (uncategorized.length > 0) {
    columns.push({
      cat: { id: -1, slug: "other", label: "Other", color: undefined, icon: undefined } as any,
      items: uncategorized,
    });
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="trello" size={40} color={tc.textMuted} />
        <Text style={[styles.emptyTitle, { color: tc.textMuted }]}>No items yet</Text>
        <Text style={[styles.emptySubtitle, { color: tc.textMuted }]}>
          Add your first knowledge item using the + button
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {columns.map(({ cat, items: colItems }) => {
        const colColor = (cat as any).color || accent;

        return (
          <View key={cat.slug} style={styles.column}>
            {/* Column header */}
            <View style={[styles.columnHeader, { borderBottomColor: colColor + "40" }]}>
              <View style={[styles.columnDot, { backgroundColor: colColor }]} />
              <Text
                style={[
                  styles.columnTitle,
                  { color: tc.text, fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold" },
                ]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
              <View style={[styles.columnCount, { backgroundColor: colColor + "20", borderColor: colColor + "40" }]}>
                <Text style={[styles.columnCountText, { color: colColor }]}>{colItems.length}</Text>
              </View>
            </View>

            {/* Cards */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.columnScroll}
              contentContainerStyle={styles.columnContent}
            >
              {colItems.length === 0 ? (
                <View style={[styles.emptyCol, { borderColor: tc.border }]}>
                  <Text style={[styles.emptyColText, { color: tc.textMuted }]}>Empty</Text>
                </View>
              ) : (
                colItems.map((item) => (
                  <KanbanCard key={item.id} item={item} onPress={() => onItemPress(item)} />
                ))
              )}

              {/* Add to column button */}
              <Pressable
                style={[styles.addColBtn, { borderColor: colColor + "30", backgroundColor: colColor + "08" }]}
                onPress={() => router.push("/item/create")}
              >
                <Feather name="plus" size={14} color={colColor} />
                <Text style={[styles.addColText, { color: colColor }]}>Add</Text>
              </Pressable>
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "web" ? 120 : 100,
    paddingTop: 4,
    gap: 10,
    alignItems: "flex-start",
  },
  column: {
    width: 220,
    borderRadius: 16,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    fontSize: 13,
    flex: 1,
    letterSpacing: 0.2,
  },
  columnCount: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderWidth: 1,
  },
  columnCountText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  columnScroll: {
    maxHeight: 600,
  },
  columnContent: {
    padding: 8,
    gap: 8,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardPreview: {
    fontSize: 11,
    lineHeight: 16,
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  cardTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  cardTagText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  cardTagMore: {
    fontSize: 10,
    alignSelf: "center",
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardMetaText: {
    fontSize: 10,
  },
  addColBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 10,
    marginTop: 4,
  },
  addColText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  emptyCol: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyColText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
