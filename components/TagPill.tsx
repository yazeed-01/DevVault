import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface TagPillProps {
  tag: string;
}

export function TagPill({ tag }: TagPillProps) {
  const { themeStyles } = useTheme();
  const tc = themeStyles.colors;

  return (
    <View style={[styles.pill, themeStyles.surface, { borderColor: tc.border + "40" }]}>
      <Text style={[styles.text, { color: tc.textSecondary }]}>#{tag}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
