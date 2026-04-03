import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/colors";

interface MetadataBadgeProps {
  label: string;
  color?: string;
  icon?: string;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function MetadataBadge({ label, color, icon, size = "sm", style }: MetadataBadgeProps) {
  const { themeStyles, accent, settings } = useTheme();
  const tc = themeStyles.colors;
  const isTerminal = settings.visualStyle === "terminal";

  const badgeColor = color || accent;
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor + "15",
          borderColor: badgeColor + "35",
          borderRadius: isTerminal ? 4 : 8,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 10,
        },
        style,
      ]}
    >
      {icon && (
        <Feather
          name={icon as any}
          size={isSmall ? 10 : 13}
          color={badgeColor}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: badgeColor,
            fontSize: isSmall ? 10 : 12,
            fontFamily: isTerminal ? "monospace" : "Inter_600SemiBold",
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    letterSpacing: 0.2,
  },
});
