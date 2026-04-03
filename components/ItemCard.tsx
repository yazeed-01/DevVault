import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { KnowledgeItem } from "@/lib/database";
import { useVault } from "@/context/VaultContext";
import { MetadataBadge } from "./MetadataBadge";
import { TagPill } from "./TagPill";

interface ItemCardProps {
  item: KnowledgeItem;
  onPress: () => void;
  compact?: boolean;
}

export function ItemCard({ item, onPress, compact }: ItemCardProps) {
  const { themeStyles, fontScale, settings, accent } = useTheme();
  const { metadataValues } = useVault();
  const tc = themeStyles.colors;
  const isCompact = compact ?? settings.compactCards;
  const isTerminal = settings.visualStyle === "terminal";

  // Find dynamic category metadata
  const categories = metadataValues["category"] || [];
  const catMetadata = categories.find(c => c.slug === item.category);
  
  const catColor = catMetadata?.color || accent;
  const iconName = (catMetadata?.icon || "file-text") as keyof typeof Feather.glyphMap;

  const monoFont = "monospace";
  const titleFont = isTerminal ? monoFont : "Inter_700Bold";
  const bodyFont = isTerminal ? monoFont : "Inter_400Regular";
  const labelFont = isTerminal ? monoFont : "Inter_400Regular";

  const preview = item.content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\n+/g, " ")
    .trim();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        themeStyles.card,
        pressed && styles.cardPressed,
        { 
          borderLeftWidth: 4, 
          borderLeftColor: catColor + "80", 
          overflow: "hidden",
          backgroundColor: themeStyles.componentBlur > 0 ? "transparent" : themeStyles.card.backgroundColor 
        }
      ]}
      onPress={onPress}
    >
      {themeStyles.componentBlur > 0 && (
        <BlurView
          intensity={themeStyles.componentBlur}
          tint={tc.isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.contentWrap}>
        <View style={styles.mainInfo}>
          <View style={styles.topRow}>
            <View style={[styles.iconBox, { backgroundColor: catColor + "15" }]}>
              <Feather name={iconName} size={14} color={catColor} />
            </View>
            <Text 
              style={[styles.categoryTitle, { color: catColor, fontFamily: labelFont }]}
              numberOfLines={1}
            >
              {catMetadata?.label.toUpperCase() || item.category.toUpperCase()}
            </Text>
          </View>
          
          <Text
            style={[styles.title, { fontSize: 16 * fontScale, color: tc.text, fontFamily: titleFont }]}
            numberOfLines={2}
          >
            {isTerminal ? `> ${item.title}` : item.title}
          </Text>

          {!isCompact && (
            <Text
              style={[styles.preview, { fontSize: 13 * fontScale, color: tc.textSecondary, fontFamily: bodyFont }]}
              numberOfLines={2}
            >
              {preview}
            </Text>
          )}

          {item.tags.length > 0 && (
            <View style={styles.tags}>
              {item.tags.slice(0, isCompact ? 2 : 3).map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
              {item.tags.length > (isCompact ? 2 : 3) && (
                <Text style={[styles.moreTags, { color: tc.textMuted, fontFamily: labelFont }]}>
                  +{item.tags.length - (isCompact ? 2 : 3)}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.chevronWrap}>
          <Feather name="chevron-right" size={18} color={tc.textMuted + "80"} />
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: tc.border + "40" }]}>
        {item.lifecyclePhases.length > 0 ? (
          <View style={styles.footerLeft}>
            {item.lifecyclePhases.slice(0, 2).map(pSlug => {
              const phase = (metadataValues["lifecycle"] || []).find(v => v.slug === pSlug);
              return (
                <MetadataBadge 
                  key={pSlug} 
                  label={phase?.label || pSlug} 
                  color={phase?.color} 
                  icon={phase?.icon}
                  size="sm"
                />
              );
            })}
          </View>
        ) : <View />}
        <Text style={[styles.footerText, { fontSize: 10 * fontScale, color: tc.textMuted + "80", fontFamily: labelFont }]}>
          {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  contentWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mainInfo: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    lineHeight: 22,
    marginBottom: 4,
  },
  preview: {
    lineHeight: 18,
    marginBottom: 8,
    opacity: 0.8,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  moreTags: {
    fontSize: 11,
    alignSelf: "center",
  },
  chevronWrap: {
    paddingLeft: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    lineHeight: 14,
  },
});

