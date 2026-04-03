import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { themeStyles } = useTheme();
  const tc = themeStyles.colors;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: themeStyles.surface["backgroundColor"], borderColor: tc.border }]}>
        <Feather name={icon} size={40} color={tc.textMuted} />
      </View>
      <Text style={[styles.title, { color: tc.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: tc.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    minHeight: 300,
  },

  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
});
