import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { KnowledgeItem } from "@/lib/database";
import { TagPill } from "@/components/TagPill";
import { BackgroundAccents } from "@/components/BackgroundAccents";
import { useTheme } from "@/context/ThemeContext";
import { MetadataBadge } from "@/components/MetadataBadge";
import { useVault } from "@/context/VaultContext";
import * as WebBrowser from "expo-web-browser";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, removeItem, definitions, metadataValues } = useVault();
  const { themeStyles, accent } = useTheme();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  useEffect(() => {
    const found = items.find((i) => String(i.id) === id);
    setItem(found ?? null);
  }, [items, id]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await removeItem(Number(id));
            router.back();
          },
        },
      ]
    );
  };

  if (!item) {
    return (
      <View style={[styles.container, themeStyles.screenBg, { paddingTop: topPadding }]}>
        <BackgroundAccents />
        <Pressable style={[styles.backBtn, { marginLeft: 16 }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Item not found</Text>
        </View>
      </View>
    );
  }

  const categoryValues = metadataValues["category"] || [];
  const catMetadata = categoryValues.find(v => v.slug === item.category);
  const catColor = catMetadata?.color || accent;
  const catIcon = catMetadata?.icon || "file-text";

  return (
    <View style={[styles.container, themeStyles.screenBg, { paddingTop: topPadding }]}>
      <BackgroundAccents />
      <View style={styles.header}>
        <Pressable 
          style={styles.backBtn} 
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
        >
          <Feather name="arrow-left" size={20} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: "/item/edit/[id]", params: { id: item.id } })}
          >
            <Feather name="edit-2" size={16} color={Colors.textSecondary} />
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
            <Feather name="trash-2" size={16} color={Colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryRow}>
          <View style={[styles.itemIcon, { backgroundColor: catColor + "15" }]}>
            <Feather name={catIcon as any} size={20} color={catColor} />
          </View>
          <MetadataBadge label={catMetadata?.label || item.category} color={catColor} icon={catIcon} size="md" />
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </View>
        )}

        {definitions.filter(d => d.slug !== 'category').map(def => {
          let valSlugs: string[] = [];
          if (item.metadata?.[def.slug]) valSlugs = item.metadata[def.slug];
          else if (def.slug === 'lifecycle') valSlugs = item.lifecyclePhases || [];
          else if (def.slug === 'domain') valSlugs = item.domainAreas || [];

          if (valSlugs.length === 0) return null;
          const sectionValues = metadataValues[def.slug] || [];

          return (
            <View key={def.id} style={styles.metaSection}>
              <View style={styles.metaGroup}>
                <View style={styles.metaLabelRow}>
                  {def.icon && <Feather name={def.icon as any} size={12} color={Colors.textMuted} />}
                  <Text style={styles.metaLabel}>{def.label}</Text>
                </View>
                <View style={styles.badgeRow}>
                  {valSlugs.map(vSlug => {
                    const val = sectionValues.find(v => v.slug === vSlug);
                    return (
                      <MetadataBadge 
                        key={vSlug} 
                        label={val?.label || vSlug} 
                        color={val?.color} 
                        icon={val?.icon}
                        size="md"
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}

        {item.links && item.links.length > 0 && (
          <View style={styles.linksSection}>
            <View style={styles.metaLabelRow}>
              <Feather name="link" size={12} color={Colors.textMuted} />
              <Text style={styles.metaLabel}>External Resources</Text>
            </View>
            <View style={styles.linkGrid}>
              {item.links.map((link, idx) => (
                <Pressable 
                  key={idx} 
                  style={styles.linkCard}
                  onPress={() => WebBrowser.openBrowserAsync(link)}
                >
                  <View style={styles.linkCardHeader}>
                    <Feather name="external-link" size={14} color={accent} />
                    <Text style={styles.linkHost} numberOfLines={1}>
                      {link.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                    </Text>
                  </View>
                  <Text style={styles.linkUrl} numberOfLines={1}>{link}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {item.images && item.images.length > 0 && (
          <View style={styles.imagesSection}>
            <View style={styles.metaLabelRow}>
              <Feather name="image" size={12} color={Colors.textMuted} />
              <Text style={styles.metaLabel}>Attachments ({item.images.length})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageGalleryStrip}>
              {item.images.map((uri, idx) => (
                <Pressable key={idx} onPress={() => setViewerIndex(idx)}>
                  <Image source={{ uri }} style={styles.galleryImage} />
                  <View style={styles.galleryImageOverlay}>
                    <Feather name="maximize-2" size={14} color="rgba(255,255,255,0.8)" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.divider} />
        <Markdown style={markdownStyles}>{item.content}</Markdown>
      </ScrollView>

      {/* Fullscreen Image Viewer */}
      {item.images && item.images.length > 0 && (
        <Modal
          visible={viewerIndex !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setViewerIndex(null)}
        >
          <StatusBar backgroundColor="#000" barStyle="light-content" />
          <View style={styles.viewerOverlay}>
            {/* Close button */}
            <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerIndex(null)}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>

            {/* Counter */}
            <Text style={styles.viewerCounter}>
              {(viewerIndex ?? 0) + 1} / {item.images.length}
            </Text>

            {/* Image */}
            <Image
              source={{ uri: item.images[viewerIndex ?? 0] }}
              style={styles.viewerImage}
              resizeMode="contain"
            />

            {/* Prev / Next */}
            <View style={styles.viewerNavRow}>
              <TouchableOpacity
                style={[styles.viewerNavBtn, (viewerIndex ?? 0) === 0 && { opacity: 0.3 }]}
                onPress={() => setViewerIndex(i => Math.max(0, (i ?? 0) - 1))}
                disabled={(viewerIndex ?? 0) === 0}
              >
                <Feather name="chevron-left" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewerNavBtn, (viewerIndex ?? 0) === item.images.length - 1 && { opacity: 0.3 }]}
                onPress={() => setViewerIndex(i => Math.min(item!.images!.length - 1, (i ?? 0) + 1))}
                disabled={(viewerIndex ?? 0) === item.images.length - 1}
              >
                <Feather name="chevron-right" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const markdownStyles = {
  body: { color: Colors.text, fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 26 },
  heading1: { color: Colors.text, fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 24, marginBottom: 8 },
  heading2: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 18, marginTop: 20, marginBottom: 6 },
  heading3: { color: Colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 16, marginBottom: 4 },
  paragraph: { marginBottom: 12, color: Colors.text, lineHeight: 26 },
  strong: { color: Colors.text, fontFamily: "Inter_600SemiBold" },
  em: { color: Colors.textSecondary, fontStyle: "italic" as const },
  code_inline: { backgroundColor: Colors.surfaceElevated, color: Colors.accent, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  fence: { backgroundColor: Colors.surfaceElevated, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.surfaceBorder },
  code_block: { backgroundColor: Colors.surfaceElevated, borderRadius: 10, padding: 14, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13, color: Colors.text, lineHeight: 20 },
  blockquote: { backgroundColor: Colors.surfaceElevated, borderLeftWidth: 3, borderLeftColor: Colors.accent, paddingLeft: 12, paddingVertical: 8, marginBottom: 12, borderRadius: 4 },
  list_item: { marginBottom: 6, color: Colors.text },
  bullet_list: { marginBottom: 12 },
  ordered_list: { marginBottom: 12 },
  hr: { backgroundColor: Colors.surfaceBorder, height: 1, marginVertical: 16 },
  table: { borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 8, marginBottom: 12, overflow: "hidden" as const },
  thead: { backgroundColor: Colors.surfaceElevated },
  th: { color: Colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13, padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, borderRightWidth: 1, borderRightColor: Colors.surfaceBorder },
  td: { color: Colors.text, fontSize: 13, padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, borderRightWidth: 1, borderRightColor: Colors.surfaceBorder },
  link: { color: Colors.accent },
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  deleteBtn: { borderColor: Colors.error + "40", backgroundColor: "rgba(248, 113, 113, 0.08)" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, lineHeight: 32, marginBottom: 14, letterSpacing: -0.3 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  metaSection: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, gap: 14, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: 16 },
  metaGroup: { gap: 8 },
  metaLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  metaLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, letterSpacing: 0.6, textTransform: "uppercase" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginBottom: 20 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  linksSection: { marginBottom: 20, gap: 10 },
  linkGrid: { gap: 8 },
  linkCard: { backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 4 },
  linkCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  linkHost: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  linkUrl: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  imagesSection: { marginBottom: 20, gap: 10 },
  imageGalleryStrip: { gap: 10, paddingVertical: 4 },
  galleryImage: { width: 160, height: 160, borderRadius: 14, backgroundColor: Colors.surface },
  galleryImageOverlay: { position: "absolute", bottom: 6, right: 6, width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  // Fullscreen viewer
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.97)", alignItems: "center", justifyContent: "center" },
  viewerClose: { position: "absolute", top: 52, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  viewerCounter: { position: "absolute", top: 58, alignSelf: "center", color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_500Medium", zIndex: 10 },
  viewerImage: { width: "100%", height: "75%" },
  viewerNavRow: { position: "absolute", bottom: 60, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 24 },
  viewerNavBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
});
