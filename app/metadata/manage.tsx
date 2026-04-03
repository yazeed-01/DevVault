import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVault } from "@/context/VaultContext";
import { useTheme } from "@/context/ThemeContext";
import { MetadataModal } from "@/components/MetadataModal";
import { BackgroundAccents } from "@/components/BackgroundAccents";
import * as Haptics from "expo-haptics";

export default function ManageMetadataScreen() {
  const { definitions, metadataValues, addValue, updateValue, removeValue, addDefinition, updateDefinition, removeDefinition } = useVault();
  const { themeStyles, accent } = useTheme();
  const tc = themeStyles.colors;
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const [selectedDefId, setSelectedDefId] = useState<number | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorConfig, setEditorConfig] = useState<{
    mode: "add" | "edit";
    type: "def" | "val";
    id?: number;
    defId?: number;
    label: string;
    icon?: string;
    color?: string;
  }>({ mode: "add", type: "def", label: "" });

  const activeDef = useMemo(() =>
    definitions.find(d => d.id === selectedDefId),
  [definitions, selectedDefId]);

  const activeValues = useMemo(() =>
    selectedDefId ? (metadataValues[definitions.find(d => d.id === selectedDefId)?.slug || ""] || []) : [],
  [metadataValues, definitions, selectedDefId]);

  const openEditor = (config: typeof editorConfig) => {
    setEditorConfig(config);
    setEditorVisible(true);
  };

  const handleSave = async (label: string) => {
    const { mode, type, id, defId, color, icon } = editorConfig;
    if (type === "def") {
      if (mode === "add") await addDefinition(label, icon);
      else if (id) await updateDefinition(id, label, icon);
    } else {
      if (mode === "add" && defId) await addValue(defId, label, color, icon);
      else if (id) await updateValue(id, label, color, icon);
    }
  };

  const handleDelete = (type: "def" | "val", id: number, name: string) => {
    Alert.alert(
      "Confirm Delete",
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (type === "def") await removeDefinition(id);
            else await removeValue(id);
            if (type === "def" && selectedDefId === id) setSelectedDefId(null);
          }
        }
      ]
    );
  };

  const surfaceBg    = themeStyles.surface.backgroundColor;
  const surfaceBorder = themeStyles.surface.borderColor;

  return (
    <View style={[styles.container, themeStyles.screenBg]}>
      {/* Hide the native header */}
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundAccents />

      {/* ── Custom header ── */}
      <View style={[styles.header, { paddingTop: topPadding, borderBottomColor: surfaceBorder, backgroundColor: themeStyles.screenBg.backgroundColor }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
        >
          <Feather name="arrow-left" size={20} color={tc.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: tc.text }]}>Manage Sections</Text>
        <Pressable
          style={[styles.addDefBtn, { backgroundColor: accent + "18", borderColor: accent + "40" }]}
          onPress={() => openEditor({ mode: "add", type: "def", label: "" })}
        >
          <Feather name="plus" size={16} color={accent} />
          <Text style={[styles.addDefBtnText, { color: accent }]}>New</Text>
        </Pressable>
      </View>

      {/* ── Body: sidebar + main ── */}
      <View style={styles.body}>

        {/* Sidebar — list of sections */}
        <View style={[styles.sidebar, { borderRightColor: surfaceBorder }]}>
          <Text style={[styles.sidebarHeading, { color: tc.textMuted }]}>SECTIONS</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {definitions.length === 0 && (
              <Text style={[styles.emptySidebar, { color: tc.textMuted }]}>No sections yet</Text>
            )}
            {definitions.map(def => {
              const isSelected = selectedDefId === def.id;
              const valCount = (metadataValues[def.slug] || []).length;
              return (
                <Pressable
                  key={def.id}
                  style={[
                    styles.defItem,
                    { borderColor: "transparent", backgroundColor: "transparent" },
                    isSelected && { backgroundColor: accent + "18", borderColor: accent + "40" },
                  ]}
                  onPress={() => {
                    setSelectedDefId(def.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  onLongPress={() => openEditor({ mode: "edit", type: "def", id: def.id, label: def.label, icon: def.icon })}
                >
                  <View style={[styles.defIconBg, { backgroundColor: isSelected ? accent + "25" : surfaceBg }]}>
                    <Feather name={(def.icon as any) || "hash"} size={13} color={isSelected ? accent : tc.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.defLabel, { color: isSelected ? accent : tc.textSecondary }]} numberOfLines={1}>
                      {def.label}
                    </Text>
                    <Text style={[styles.defCount, { color: tc.textMuted }]}>{valCount} labels</Text>
                  </View>
                  {isSelected && <Feather name="chevron-right" size={14} color={accent} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Main panel — values for selected section */}
        <View style={styles.main}>
          {activeDef ? (
            <>
              <View style={styles.mainHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mainTitle, { color: tc.text }]}>{activeDef.label}</Text>
                  <Text style={[styles.mainSubtitle, { color: tc.textMuted }]}>
                    {activeValues.length} label{activeValues.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View style={styles.mainActions}>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}
                    onPress={() => openEditor({ mode: "edit", type: "def", id: activeDef.id, label: activeDef.label, icon: activeDef.icon })}
                  >
                    <Feather name="edit-2" size={15} color={accent} />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.3)" }]}
                    onPress={() => handleDelete("def", activeDef.id, activeDef.label)}
                  >
                    <Feather name="trash-2" size={15} color="#F87171" />
                  </Pressable>
                </View>
              </View>

              <ScrollView contentContainerStyle={styles.valGrid} showsVerticalScrollIndicator={false}>
                {activeValues.map(val => (
                  <Pressable
                    key={val.id}
                    style={[styles.valCard, { backgroundColor: surfaceBg, borderColor: surfaceBorder, borderLeftColor: val.color || accent }]}
                    onPress={() => openEditor({ mode: "edit", type: "val", id: val.id, defId: val.defId, label: val.label, color: val.color, icon: val.icon })}
                  >
                    <View style={styles.valLeft}>
                      <View style={[styles.valIconBg, { backgroundColor: (val.color || accent) + "20" }]}>
                        <Feather name={(val.icon as any) || "tag"} size={14} color={val.color || accent} />
                      </View>
                      <View>
                        <Text style={[styles.valLabel, { color: tc.text }]}>{val.label}</Text>
                        {val.color && (
                          <View style={[styles.colorDot, { backgroundColor: val.color }]} />
                        )}
                      </View>
                    </View>
                    <Pressable
                      hitSlop={12}
                      onPress={() => handleDelete("val", val.id, val.label)}
                      style={[styles.valDelBtn, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}
                    >
                      <Feather name="x" size={12} color={tc.textMuted} />
                    </Pressable>
                  </Pressable>
                ))}

                {/* Add value card */}
                <Pressable
                  style={[styles.addValCard, { borderColor: accent + "35" }]}
                  onPress={() => openEditor({ mode: "add", type: "val", defId: activeDef.id, label: "" })}
                >
                  <View style={[styles.addValIconBg, { backgroundColor: accent + "18" }]}>
                    <Feather name="plus" size={18} color={accent} />
                  </View>
                  <Text style={[styles.addValText, { color: accent }]}>Add Label</Text>
                </Pressable>
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptyMain}>
              <View style={[styles.emptyIconBg, { backgroundColor: surfaceBg, borderColor: surfaceBorder }]}>
                <Feather name="layers" size={32} color={tc.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: tc.textSecondary }]}>Select a Section</Text>
              <Text style={[styles.emptySubtitle, { color: tc.textMuted }]}>
                Pick a section from the left to manage its labels
              </Text>
            </View>
          )}
        </View>
      </View>

      <MetadataModal
        isVisible={editorVisible}
        onClose={() => setEditorVisible(false)}
        onSave={handleSave}
        title={editorConfig.mode === "add"
          ? `New ${editorConfig.type === "def" ? "Section" : "Label"}`
          : `Edit ${editorConfig.label}`}
        placeholder="Enter name..."
        initialValue={editorConfig.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 11, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  addDefBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  addDefBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Body layout
  body: { flex: 1, flexDirection: "row" },

  // Sidebar
  sidebar: { width: 148, borderRightWidth: 1, paddingHorizontal: 10, paddingTop: 16 },
  sidebarHeading: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
  emptySidebar: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", paddingLeft: 4, marginTop: 8 },
  defItem: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12,
    marginBottom: 4, borderWidth: 1,
  },
  defIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  defLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  defCount: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },

  // Main panel
  main: { flex: 1, paddingHorizontal: 18, paddingTop: 16 },
  mainHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  mainTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  mainSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  mainActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  // Value cards
  valGrid: { gap: 10, paddingBottom: 60 },
  valCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderLeftWidth: 4,
  },
  valLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  valIconBg: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  valLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  valDelBtn: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addValCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14, marginTop: 4,
  },
  addValIconBg: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  addValText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Empty state
  emptyMain: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 80 },
  emptyIconBg: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 200 },
});
