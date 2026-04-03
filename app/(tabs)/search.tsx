import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { useVault } from "@/context/VaultContext";
import { KnowledgeItem } from "@/lib/database";
import { EmptyState } from "@/components/EmptyState";
import { ItemCard } from "@/components/ItemCard";
import { BackgroundAccents } from "@/components/BackgroundAccents";

// A virtual section key for tags
const TAGS_KEY = "__tags__";

export default function SearchScreen() {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<KnowledgeItem[]>([]);
  const [searching, setSearching] = useState(false);

  // selectedFilters: { defSlug -> string[] of selected value slugs }
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [selectedTags, setSelectedTags]       = useState<string[]>([]);

  // Which section tab is active in Row 1
  const [activeSection, setActiveSection] = useState<string>("");

  const { search, items, definitions, metadataValues } = useVault();
  const { accent, themeStyles } = useTheme();
  const tc = themeStyles.colors;
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(item => item.tags.forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }, [items]);

  // Build the full list of sections (defs + tags if there are any)
  const allSections = useMemo(() => {
    const defs = definitions.filter(d => (metadataValues[d.slug] || []).length > 0);
    const sections: { key: string; label: string; icon: string }[] = defs.map(d => ({
      key: d.slug,
      label: d.label,
      icon: d.icon || "list",
    }));
    if (allTags.length > 0) sections.push({ key: TAGS_KEY, label: "Tags", icon: "tag" });
    return sections;
  }, [definitions, metadataValues, allTags]);

  // Default to first section when sections load
  useEffect(() => {
    if (allSections.length > 0 && !activeSection) {
      setActiveSection(allSections[0].key);
    }
  }, [allSections]);

  // Search debounce
  useEffect(() => {
    const h = setTimeout(async () => {
      if (!query.trim()) { setResults([]); setSearching(false); return; }
      setSearching(true);
      setResults(await search(query));
      setSearching(false);
    }, 300);
    return () => clearTimeout(h);
  }, [query, search]);

  // Apply all active filters
  const filteredResults = useMemo(() => {
    let base = query.trim() ? results : items;
    for (const [defSlug, selected] of Object.entries(selectedFilters)) {
      if (!selected.length) continue;
      base = base.filter(item => {
        if (defSlug === "lifecycle") return selected.some(s => (item.lifecyclePhases || []).includes(s));
        if (defSlug === "domain")    return selected.some(s => (item.domainAreas || []).includes(s));
        if (defSlug === "category")  return selected.includes(item.category);
        return selected.some(s => (item.metadata?.[defSlug] || []).includes(s));
      });
    }
    if (selectedTags.length > 0) {
      base = base.filter(item => selectedTags.some(t => item.tags.includes(t)));
    }
    return base;
  }, [results, items, query, selectedFilters, selectedTags]);

  const hasFilters = Object.values(selectedFilters).some(a => a.length > 0) || selectedTags.length > 0;
  const clearAll   = () => { setSelectedFilters({}); setSelectedTags([]); };

  const toggleFilter = (defSlug: string, valSlug: string) => {
    setSelectedFilters(prev => {
      const cur = prev[defSlug] || [];
      return { ...prev, [defSlug]: cur.includes(valSlug) ? cur.filter(s => s !== valSlug) : [...cur, valSlug] };
    });
  };

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const getChipStyle = (v?: any) => {
    if (v?.color) return { bg: v.color + "20", text: v.color, border: v.color + "55" };
    return { bg: accent + "20", text: accent, border: accent + "55" };
  };

  // Count how many chips are active for a given section key (for the dot indicator)
  const sectionActiveCount = (key: string) => {
    if (key === TAGS_KEY) return selectedTags.length;
    return (selectedFilters[key] || []).length;
  };

  // Row 2: values for the currently active section
  const activeSectionValues = useMemo(() => {
    if (activeSection === TAGS_KEY) return null; // handled separately
    return metadataValues[activeSection] || [];
  }, [activeSection, metadataValues]);

  const getItemCount = (defSlug: string, valSlug: string) => {
    return items.filter(item => {
      if (defSlug === "lifecycle") return (item.lifecyclePhases || []).includes(valSlug);
      if (defSlug === "domain")    return (item.domainAreas || []).includes(valSlug);
      if (defSlug === "category")  return item.category === valSlug;
      return (item.metadata?.[defSlug] || []).includes(valSlug);
    }).length;
  };

  return (
    <View style={[styles.container, themeStyles.screenBg, { paddingTop: topPadding }]}>
      <BackgroundAccents />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: tc.text }]}>Search</Text>
        {hasFilters && (
          <Pressable
            onPress={clearAll}
            style={[styles.clearBtn, { borderColor: accent + "40", backgroundColor: accent + "12" }]}
          >
            <Feather name="x" size={12} color={accent} />
            <Text style={[styles.clearBtnText, { color: accent }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* ── Search box ── */}
      <View style={[styles.searchBox, { backgroundColor: themeStyles.surface.backgroundColor, borderColor: themeStyles.surface.borderColor }]}>
        <Feather name="search" size={16} color={tc.textMuted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles, content, tags..."
          placeholderTextColor={tc.textMuted}
          style={[styles.input, { color: tc.text }]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Feather name="x-circle" size={16} color={tc.textMuted} />
          </Pressable>
        )}
      </View>

      {/* ── 2-row filter ── */}
      {allSections.length > 0 && (
        <View style={[styles.filterBlock, { borderColor: themeStyles.surface.borderColor }]}>

          {/* ROW 1 — section tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row1}
          >
            {allSections.map(sec => {
              const isActive = activeSection === sec.key;
              const count = sectionActiveCount(sec.key);
              return (
                <Pressable
                  key={sec.key}
                  style={[
                    styles.sectionTab,
                    { borderColor: themeStyles.surface.borderColor, backgroundColor: themeStyles.surface.backgroundColor },
                    isActive && { borderColor: accent + "60", backgroundColor: accent + "15" },
                  ]}
                  onPress={() => setActiveSection(sec.key)}
                >
                  <Feather name={sec.icon as any} size={13} color={isActive ? accent : tc.textMuted} />
                  <Text style={[styles.sectionTabText, { color: isActive ? accent : tc.textMuted }]}>
                    {sec.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.sectionBadge, { backgroundColor: accent }]}>
                      <Text style={styles.sectionBadgeText}>{count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ROW 2 — values for the selected section */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row2}
          >
            {activeSection === TAGS_KEY ? (
              allTags.length === 0 ? (
                <Text style={[styles.emptyRow, { color: tc.textMuted }]}>No tags yet</Text>
              ) : (
                allTags.map(tag => {
                  const isActive = selectedTags.includes(tag);
                  const count = items.filter(i => i.tags.includes(tag)).length;
                  return (
                    <Pressable
                      key={tag}
                      style={[
                        styles.valueChip,
                        { borderColor: isActive ? accent + "60" : themeStyles.surface.borderColor, backgroundColor: isActive ? accent + "18" : themeStyles.surface.backgroundColor },
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[styles.valueChipText, { color: isActive ? accent : tc.textSecondary }]}>
                        #{tag}
                      </Text>
                      <View style={[styles.valueBadge, { backgroundColor: isActive ? accent + "30" : tc.border + "60" }]}>
                        <Text style={[styles.valueBadgeText, { color: isActive ? accent : tc.textMuted }]}>{count}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )
            ) : (
              (activeSectionValues || []).length === 0 ? (
                <Text style={[styles.emptyRow, { color: tc.textMuted }]}>No values yet</Text>
              ) : (
                (activeSectionValues || []).map(v => {
                  const isActive = (selectedFilters[activeSection] || []).includes(v.slug);
                  const cs = getChipStyle(v);
                  const count = getItemCount(activeSection, v.slug);
                  return (
                    <Pressable
                      key={v.slug}
                      style={[
                        styles.valueChip,
                        { borderColor: isActive ? cs.border : themeStyles.surface.borderColor, backgroundColor: isActive ? cs.bg : themeStyles.surface.backgroundColor },
                      ]}
                      onPress={() => toggleFilter(activeSection, v.slug)}
                    >
                      {v.icon && (
                        <Feather name={v.icon as any} size={12} color={isActive ? cs.text : tc.textSecondary} />
                      )}
                      <Text style={[styles.valueChipText, { color: isActive ? cs.text : tc.textSecondary }]}>
                        {v.label}
                      </Text>
                      <View style={[styles.valueBadge, { backgroundColor: isActive ? cs.text + "30" : tc.border + "60" }]}>
                        <Text style={[styles.valueBadgeText, { color: isActive ? cs.text : tc.textMuted }]}>{count}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Results ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 140 : 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {searching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={accent} />
          </View>
        ) : filteredResults.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultCount, { color: tc.textMuted }]}>
              {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
              {hasFilters ? " · filtered" : ""}
            </Text>
            {filteredResults.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="search"
            title={query.trim() || hasFilters ? "No results found" : "Start searching"}
            subtitle={
              query.trim() || hasFilters
                ? "Try different keywords or remove filters"
                : "Search by text, phase, domain, or tag"
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  searchBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, marginHorizontal: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, gap: 10, marginBottom: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  // 2-row filter block
  filterBlock: {
    borderTopWidth: 1, borderBottomWidth: 1,
    marginBottom: 8,
  },

  // Row 1 — sections
  row1: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  sectionTab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
    position: "relative",
  },
  sectionTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionBadge: {
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    alignItems: "center", justifyContent: "center",
  },
  sectionBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  // Row 2 — values
  row2: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
    gap: 8,
  },
  valueChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingLeft: 10, paddingRight: 8, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  valueChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  valueBadge: {
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1,
    minWidth: 20, alignItems: "center",
  },
  valueBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  emptyRow: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", paddingVertical: 8 },

  // Results
  scroll: { paddingTop: 4 },
  resultsContainer: { paddingHorizontal: 16, paddingTop: 4 },
  resultCount: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 12, paddingHorizontal: 4 },
  loadingContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
});
