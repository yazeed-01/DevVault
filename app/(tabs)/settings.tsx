import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  ACCENT_COLORS,
  AccentColor,
  FontSize,
  VisualStyle,
  useTheme,
} from "@/context/ThemeContext";
import { useVault } from "@/context/VaultContext";
import { BackgroundAccents } from "@/components/BackgroundAccents";

const VISUAL_STYLES: {
  key: VisualStyle;
  label: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
  preview: { bg: string; card: string; text: string; border: string };
}[] = [
  {
    key: "minimal",
    label: "Minimal",
    desc: "Dark & sharp",
    icon: "minus-square",
    preview: { bg: "#0A0B0E", card: "#131519", text: "#F0F2F7", border: "#252933" },
  },
  {
    key: "white",
    label: "Modern",
    desc: "Clean light mode",
    icon: "sun",
    preview: { bg: "#EEF2F8", card: "#FFFFFF", text: "#1A202C", border: "#E2E8F0" },
  },
  {
    key: "terminal",
    label: "Terminal",
    desc: "Green-on-black",
    icon: "terminal",
    preview: { bg: "#060A06", card: "#0C140C", text: "#00FF41", border: "rgba(0,255,65,0.3)" },
  },
  {
    key: "glassmorphism",
    label: "Glass",
    desc: "Frosted blur",
    icon: "layers",
    preview: { bg: "#08090E", card: "rgba(255,255,255,0.07)", text: "#F0F2F7", border: "rgba(255,255,255,0.15)" },
  },
  {
    key: "skeuomorphism",
    label: "Tactile",
    desc: "Depth & texture",
    icon: "box",
    preview: { bg: "#0D1018", card: "#1C2030", text: "#D8DFF0", border: "#2A3048" },
  },
];

const FONT_SIZES: { key: FontSize; label: string; size: number }[] = [
  { key: "small",  label: "S", size: 12 },
  { key: "medium", label: "M", size: 15 },
  { key: "large",  label: "L", size: 18 },
];

function SectionHeader({ title, textColor }: { title: string; textColor: string }) {
  return <Text style={[styles.sectionHeader, { color: textColor }]}>{title}</Text>;
}

function SettingRow({
  icon,
  label,
  sublabel,
  value,
  onToggle,
  accent,
  textColor,
  subtextColor,
  borderColor,
  borderTop = true,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accent: string;
  textColor: string;
  subtextColor: string;
  borderColor: string;
  borderTop?: boolean;
}) {
  return (
    <View style={[styles.settingRow, borderTop && { borderTopWidth: 1, borderTopColor: borderColor }]}>
      <View style={styles.settingRowLeft}>
        <View style={[styles.settingIcon, { backgroundColor: accent + "1A" }]}>
          <Feather name={icon} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, { color: textColor }]}>{label}</Text>
          {sublabel && <Text style={[styles.settingSubLabel, { color: subtextColor }]}>{sublabel}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: borderColor, true: accent + "80" }}
        thumbColor={value ? accent : subtextColor}
        ios_backgroundColor={borderColor}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSetting, resetSettings, accent, accentGlow, themeStyles } = useTheme();
  const tc = themeStyles.colors;
  const { items, exportData, importData, clearAllData } = useVault();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const isTerminal = settings.visualStyle === "terminal";

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "This will restore all app settings to their defaults.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetSettings },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const fileName = `devvault-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, data);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Vault Data',
        UTI: 'public.json'
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Export Failed", "Could not export your data.");
    }
  };

  const handleImport = async () => {
    Alert.alert(
      "Import Data",
      "This will OVERWRITE all current data in your vault. Are you sure you want to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Import & Overwrite", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true
              });

              if (res.canceled) return;

              const content = await FileSystem.readAsStringAsync(res.assets[0].uri);
              await importData(content);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Import Successful", "Your vault data has been restored.");
            } catch (err) {
              Alert.alert("Import Failed", "The selected file is not a valid DevVault backup.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      "DELETE ALL DATA",
      "This action is CATASTROPHIC and cannot be undone. Every note, tag, and category will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "DELETE EVERYTHING", 
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Are you absolutely sure? Your entire knowledge base will be wiped.",
              [
                { text: "Abort", style: "cancel" },
                { 
                  text: "YES, CLEAR MY VAULT", 
                  style: "destructive",
                  onPress: async () => {
                    await clearAllData();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, themeStyles.screenBg, { paddingTop: topPadding }]}>
      <StatusBar barStyle={tc.statusBar} backgroundColor={themeStyles.screenBg["backgroundColor"]} />
      <BackgroundAccents />

      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: tc.text, fontFamily: isTerminal ? "monospace" : "Inter_700Bold" }]}>
            {isTerminal ? "> Settings_" : "Settings"}
          </Text>
          <Text style={[styles.subtitle, { color: tc.textSecondary, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>
            Customize your vault
          </Text>
        </View>
        <View style={[styles.avatarBadge, { backgroundColor: accent + "22", borderColor: accent + "44" }]}>
          <Feather name="cpu" size={20} color={accent} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
      >
        {/* Stats strip */}
        <View style={[styles.statsStrip, { backgroundColor: accent + "11", borderColor: accent + "25" }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: accent, fontFamily: isTerminal ? "monospace" : "Inter_700Bold" }]}>
              {items.length}
            </Text>
            <Text style={[styles.statLabel, { color: tc.textSecondary, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>
              Total Items
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: accent + "30" }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: accent, fontFamily: isTerminal ? "monospace" : "Inter_700Bold" }]}>
              {[...new Set(items.flatMap((i) => i.tags ?? []))].length}
            </Text>
            <Text style={[styles.statLabel, { color: tc.textSecondary, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>
              Unique Tags
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: accent + "30" }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: accent, fontFamily: isTerminal ? "monospace" : "Inter_700Bold" }]}>
              {[...new Set(items.map((i) => i.category))].length}
            </Text>
            <Text style={[styles.statLabel, { color: tc.textSecondary, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>
              Categories
            </Text>
          </View>
        </View>

        {/* Visual Style */}
        <SectionHeader title="VISUAL STYLE" textColor={tc.textMuted} />
        <View style={[styles.card, themeStyles.card]}>
          <View style={[styles.visualStyleRow, { borderBottomWidth: 1, borderBottomColor: tc.border }]}>
            {VISUAL_STYLES.slice(0, 3).map((vs) => {
              const isActive = settings.visualStyle === vs.key;
              return (
                <Pressable
                  key={vs.key}
                  style={[
                    styles.visualCard,
                    { borderColor: isActive ? accent : tc.border },
                    isActive && { backgroundColor: accentGlow },
                  ]}
                  onPress={() => updateSetting("visualStyle", vs.key)}
                >
                  <View style={[styles.miniPreview, { backgroundColor: vs.preview.bg }]}>
                    <View style={[styles.miniCard, { backgroundColor: vs.preview.card, borderColor: vs.preview.border }]}>
                      <View style={[styles.miniLine, { backgroundColor: vs.preview.text, opacity: 0.9 }]} />
                      <View style={[styles.miniLine, { backgroundColor: vs.preview.text, opacity: 0.5, width: "60%" }]} />
                    </View>
                  </View>
                  <Text style={[styles.visualLabel, { color: isActive ? accent : tc.text, fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold" }]}>
                    {vs.label}
                  </Text>
                  <Text style={[styles.visualDesc, { color: tc.textMuted, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>
                    {vs.desc}
                  </Text>
                  {isActive && (
                    <View style={[styles.visualCheck, { backgroundColor: accent }]}>
                      <Feather name="check" size={9} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.visualStyleRow}>
            {VISUAL_STYLES.slice(3, 5).map((vs) => {
              const isActive = settings.visualStyle === vs.key;
              return (
                <Pressable
                  key={vs.key}
                  style={[
                    styles.visualCard,
                    { borderColor: isActive ? accent : tc.border, flex: 0.5 },
                    isActive && { backgroundColor: accentGlow },
                  ]}
                  onPress={() => updateSetting("visualStyle", vs.key)}
                >
                  <View style={[styles.miniPreview, { backgroundColor: vs.preview.bg }]}>
                    <View style={[styles.miniCard, { backgroundColor: vs.preview.card, borderColor: vs.preview.border }]}>
                      <View style={[styles.miniLine, { backgroundColor: vs.preview.text, opacity: 0.9 }]} />
                      <View style={[styles.miniLine, { backgroundColor: vs.preview.text, opacity: 0.5, width: "60%" }]} />
                    </View>
                  </View>
                  <Text style={[styles.visualLabel, { color: isActive ? accent : tc.text, fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold" }]}>
                    {vs.label}
                  </Text>
                  <Text style={[styles.visualDesc, { color: tc.textMuted, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>
                    {vs.desc}
                  </Text>
                  {isActive && (
                    <View style={[styles.visualCheck, { backgroundColor: accent }]}>
                      <Feather name="check" size={9} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
            <View style={[styles.visualCard, { flex: 0.5, opacity: 0, borderColor: "transparent" }]} />
          </View>
        </View>

        {/* Accent Color */}
        <SectionHeader title="ACCENT COLOR" textColor={tc.textMuted} />
        <View style={[styles.card, themeStyles.card, styles.colorCard]}>
          <View style={styles.colorGrid}>
            {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(
              ([key, val]) => {
                const isActive = settings.accentColor === key;
                return (
                  <Pressable
                    key={key}
                    style={styles.colorItem}
                    onPress={() => updateSetting("accentColor", key)}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: val.primary },
                        isActive && { borderWidth: 3, borderColor: "#fff" },
                      ]}
                    >
                      {isActive && <Feather name="check" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.colorName, { color: isActive ? val.primary : tc.textSecondary, fontFamily: isTerminal ? "monospace" : "Inter_500Medium" }]}>
                      {val.name}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>
        </View>

        {/* Font Size */}
        <SectionHeader title="TEXT SIZE" textColor={tc.textMuted} />
        <View style={[styles.card, themeStyles.card]}>
          <View style={styles.fontSizeRow}>
            {FONT_SIZES.map((f) => {
              const isActive = settings.fontSize === f.key;
              return (
                <Pressable
                  key={f.key}
                  style={[
                    styles.fontBtn,
                    { borderColor: tc.border, backgroundColor: isActive ? accent : "transparent" },
                  ]}
                  onPress={() => updateSetting("fontSize", f.key)}
                >
                  <Text
                    style={[
                      { fontSize: f.size, fontFamily: isTerminal ? "monospace" : "Inter_700Bold" },
                      { color: isActive ? "#fff" : tc.textSecondary },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={[styles.fontPreview, { color: tc.textMuted, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>
              The quick dev vaults fast
            </Text>
          </View>
        </View>

        {/* Display */}
        <SectionHeader title="DISPLAY" textColor={tc.textMuted} />
        <View style={[styles.card, themeStyles.card]}>
          <SettingRow
            icon="bar-chart-2"
            label="Stats Row"
            sublabel="Show category counts on home"
            value={settings.showStatsRow}
            onToggle={(v) => updateSetting("showStatsRow", v)}
            accent={accent}
            textColor={tc.text}
            subtextColor={tc.textMuted}
            borderColor={tc.border}
            borderTop={false}
          />
          <SettingRow
            icon="align-justify"
            label="Compact Cards"
            sublabel="Shorter preview cards in lists"
            value={settings.compactCards}
            onToggle={(v) => updateSetting("compactCards", v)}
            accent={accent}
            textColor={tc.text}
            subtextColor={tc.textMuted}
            borderColor={tc.border}
          />
        </View>

        {/* Interaction */}
        <SectionHeader title="INTERACTION" textColor={tc.textMuted} />
        <View style={[styles.card, themeStyles.card]}>
          <SettingRow
            icon="zap"
            label="Haptic Feedback"
            sublabel="Vibration on actions (native only)"
            value={settings.hapticFeedback}
            onToggle={(v) => updateSetting("hapticFeedback", v)}
            accent={accent}
            textColor={tc.text}
            subtextColor={tc.textMuted}
            borderColor={tc.border}
            borderTop={false}
          />
        </View>

        {/* Data Management */}
        <SectionHeader title="DATA MANAGEMENT" textColor={tc.textMuted} />
        <View style={[styles.card, themeStyles.card]}>
          <Pressable style={styles.dataActionRow} onPress={handleExport}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.success + "1A" }]}>
              <Feather name="download" size={16} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: tc.text }]}>Export Vault (JSON)</Text>
              <Text style={[styles.settingSubLabel, { color: tc.textMuted }]}>Backup all your notes and metadata</Text>
            </View>
            <Feather name="chevron-right" size={16} color={tc.border} />
          </Pressable>
          
          <Pressable style={[styles.dataActionRow, { borderTopWidth: 1, borderTopColor: tc.border }]} onPress={handleImport}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.warning + "1A" }]}>
              <Feather name="upload" size={16} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: tc.text }]}>Import Vault (JSON)</Text>
              <Text style={[styles.settingSubLabel, { color: tc.textMuted }]}>Restore from a previous backup</Text>
            </View>
            <Feather name="chevron-right" size={16} color={tc.border} />
          </Pressable>

          <Pressable style={[styles.dataActionRow, { borderTopWidth: 1, borderTopColor: tc.border }]} onPress={handleDeleteAll}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.error + "1A" }]}>
              <Feather name="trash-2" size={16} color={Colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: Colors.error }]}>Delete All Data</Text>
              <Text style={[styles.settingSubLabel, { color: tc.textMuted }]}>Permanently wipe your entire vault</Text>
            </View>
            <Feather name="alert-triangle" size={16} color={Colors.error + "80"} />
          </Pressable>
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" textColor={tc.textMuted} />
        <View style={[styles.card, themeStyles.card]}>
          {[
            { icon: "shield" as const,   color: accent,         label: "Data Privacy",  sub: "All data stored locally on-device" },
            { icon: "wifi-off" as const, color: Colors.success, label: "Offline First", sub: "Works 100% without internet" },
            { icon: "info" as const,     color: Colors.warning, label: "DevVault v1.1", sub: "Personal knowledge base for engineers" },
          ].map((row, i) => (
            <View key={row.label} style={[styles.aboutRow, i > 0 && { borderTopWidth: 1, borderTopColor: tc.border }]}>
              <View style={[styles.settingIcon, { backgroundColor: row.color + "20" }]}>
                <Feather name={row.icon} size={16} color={row.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: tc.text, fontFamily: isTerminal ? "monospace" : "Inter_500Medium" }]}>{row.label}</Text>
                <Text style={[styles.settingSubLabel, { color: tc.textMuted, fontFamily: isTerminal ? "monospace" : "Inter_400Regular" }]}>{row.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={[styles.resetBtn, { borderColor: Colors.error + "30", backgroundColor: Colors.error + "0C" }]} onPress={handleReset}>
          <Feather name="rotate-ccw" size={15} color={Colors.error} />
          <Text style={[styles.resetText, { color: Colors.error }]}>Reset App Settings</Text>
        </Pressable>
      </ScrollView>
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
    paddingBottom: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 16,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statNum: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 2,
  },
  visualStyleRow: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
  },
  visualCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    alignItems: "center",
    gap: 5,
    position: "relative",
  },
  miniPreview: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    padding: 6,
    justifyContent: "center",
    marginBottom: 4,
  },
  miniCard: {
    borderRadius: 5,
    borderWidth: 1,
    padding: 5,
    gap: 4,
  },
  miniLine: {
    height: 3,
    width: "80%",
    borderRadius: 2,
  },
  visualLabel: {
    fontSize: 12,
  },
  visualDesc: {
    fontSize: 9,
    textAlign: "center",
    lineHeight: 13,
  },
  visualCheck: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  colorCard: {},
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 16,
  },
  colorItem: {
    alignItems: "center",
    gap: 6,
    width: "30%",
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  colorName: {
    fontSize: 10,
    textAlign: "center",
  },
  fontSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    flexWrap: "wrap",
  },
  fontBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  fontPreview: {
    flex: 1,
    fontSize: 12,
    fontStyle: "italic",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  settingSubLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  dataActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
