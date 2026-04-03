import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

export type VisualStyle =
  | "minimal"
  | "white"
  | "terminal"
  | "glassmorphism"
  | "skeuomorphism";

export type AccentColor = "blue" | "purple" | "green" | "orange" | "red" | "teal";
export type FontSize = "small" | "medium" | "large";
export type ViewMode = "list" | "graph";

export interface ThemeSettings {
  visualStyle: VisualStyle;
  accentColor: AccentColor;
  fontSize: FontSize;
  showStatsRow: boolean;
  compactCards: boolean;
  hapticFeedback: boolean;
  viewMode: ViewMode;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  visualStyle: "minimal",
  accentColor: "blue",
  fontSize: "medium",
  showStatsRow: true,
  compactCards: false,
  hapticFeedback: true,
  viewMode: "list",
};

const STORAGE_KEY = "@devvault_theme";

export const ACCENT_COLORS: Record<AccentColor, { primary: string; glow: string; name: string }> = {
  blue:   { primary: "#4F8EF7", glow: "rgba(79,142,247,0.15)",  name: "Ocean Blue" },
  purple: { primary: "#9B7FE8", glow: "rgba(155,127,232,0.15)", name: "Violet" },
  green:  { primary: "#34D399", glow: "rgba(52,211,153,0.15)",  name: "Emerald" },
  orange: { primary: "#FB923C", glow: "rgba(251,146,60,0.15)",  name: "Amber" },
  red:    { primary: "#F87171", glow: "rgba(248,113,113,0.15)", name: "Ruby" },
  teal:   { primary: "#2DD4BF", glow: "rgba(45,212,191,0.15)",  name: "Teal" },
};

export const FONT_SCALE: Record<FontSize, number> = {
  small: 0.88,
  medium: 1,
  large: 1.15,
};

export interface ThemeColors {
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  isDark: boolean;
  tabBarBg: string;
  tabBarBorder: string;
  statusBar: "light-content" | "dark-content";
  fontFamily?: string;
}

export interface ThemeStyles {
  card: Record<string, any>;
  surface: Record<string, any>;
  screenBg: Record<string, any>;
  statCard: Record<string, any>;
  colors: ThemeColors;
  componentBlur: number;
}

function buildThemeStyles(style: VisualStyle, accent: string): ThemeStyles {
  const isWeb = Platform.OS === "web";

  switch (style) {
    case "white":
      return {
        card: {
          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8F0",
          borderWidth: 1,
          ...(isWeb
            ? { boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)" }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }),
        },
        surface: {
          backgroundColor: "#F1F5FB",
          borderColor: "#DDE3EE",
        },
        screenBg: {
          backgroundColor: "#EEF2F8",
        },
        statCard: {
          backgroundColor: "#FFFFFF",
          borderColor: "#E2E8F0",
          borderWidth: 1,
          ...(isWeb
            ? { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }),
        },
        colors: {
          text: "#1A202C",
          textSecondary: "#4A5568",
          textMuted: "#A0AEC0",
          border: "#E2E8F0",
          isDark: false,
          tabBarBg: "#FFFFFF",
          tabBarBorder: "#E2E8F0",
          statusBar: "dark-content",
        },
        componentBlur: 0,
      };

    case "terminal":
      return {
        card: {
          backgroundColor: "#0C140C",
          borderColor: "rgba(0,255,65,0.2)",
          borderWidth: 1,
          ...(isWeb
            ? { boxShadow: "0 0 12px rgba(0,255,65,0.05), inset 0 0 0 1px rgba(0,255,65,0.15)" }
            : {
                shadowColor: "#00FF41",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 4,
              }),
        },
        surface: {
          backgroundColor: "#0A100A",
          borderColor: "rgba(0,255,65,0.15)",
        },
        screenBg: {
          backgroundColor: "#060A06",
        },
        statCard: {
          backgroundColor: "#0C140C",
          borderColor: "rgba(0,255,65,0.25)",
          borderWidth: 1,
          ...(isWeb
            ? { boxShadow: "0 0 16px rgba(0,255,65,0.08)" }
            : {
                shadowColor: "#00FF41",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 3,
              }),
        },
        colors: {
          text: "#00FF41",
          textSecondary: "#00CC33",
          textMuted: "#007A1F",
          border: "rgba(0,255,65,0.2)",
          isDark: true,
          tabBarBg: "#070A07",
          tabBarBorder: "rgba(0,255,65,0.2)",
          statusBar: "light-content",
          fontFamily: "monospace",
        },
        componentBlur: 0,
      };

    case "glassmorphism":
      return {
        card: {
          backgroundColor: "rgba(255,255,255,0.07)",
          borderColor: "rgba(255,255,255,0.15)",
          borderWidth: 1,
          ...(isWeb
            ? {
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.2)`,
              }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              }),
        },
        surface: {
          backgroundColor: "rgba(255,255,255,0.05)",
          borderColor: "rgba(255,255,255,0.12)",
          ...(isWeb
            ? {
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }
            : {}),
        },
        screenBg: {
          backgroundColor: "#08090E",
        },
        statCard: {
          backgroundColor: "rgba(255,255,255,0.08)",
          borderColor: "rgba(255,255,255,0.18)",
          borderWidth: 1.5,
          ...(isWeb
            ? {
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 20px rgba(0,0,0,0.3)`,
              }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }),
        },
        colors: {
          text: "#FFFFFF",
          textSecondary: "rgba(255,255,255,0.7)",
          textMuted: "rgba(255,255,255,0.45)",
          border: "rgba(255,255,255,0.2)",
          isDark: true,
          tabBarBg: "rgba(10,11,14,0.75)",
          tabBarBorder: "rgba(255,255,255,0.15)",
          statusBar: "light-content",
        },
        componentBlur: 60,
      };

    case "skeuomorphism":
      return {
        card: {
          backgroundColor: "#1C2030",
          borderColor: "#2A3048",
          borderWidth: 1,
          borderBottomColor: "#0D1020",
          ...(isWeb
            ? {
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 20px rgba(0,0,0,0.5), 0 1px 0 rgba(0,0,0,0.8)`,
              }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
                elevation: 8,
              }),
        },
        surface: {
          backgroundColor: "#161A28",
          borderColor: "#242840",
          ...(isWeb
            ? { boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }
            : {}),
        },
        screenBg: {
          backgroundColor: "#0D1018",
        },
        statCard: {
          backgroundColor: "#1C2030",
          borderColor: "#2A3048",
          borderWidth: 1,
          borderBottomWidth: 3,
          borderBottomColor: "#0D1020",
          ...(isWeb
            ? { boxShadow: `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)` }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
              }),
        },
        colors: {
          text: "#D8DFF0",
          textSecondary: "#7A8499",
          textMuted: "#404658",
          border: "#2A3048",
          isDark: true,
          tabBarBg: "#131825",
          tabBarBorder: "#2A3048",
          statusBar: "light-content",
        },
        componentBlur: 0,
      };

    case "minimal":
    default:
      return {
        card: {
          backgroundColor: "#131519",
          borderColor: "#252933",
          borderWidth: 1,
        },
        surface: {
          backgroundColor: "#131519",
          borderColor: "#252933",
        },
        screenBg: {
          backgroundColor: "#0A0B0E",
        },
        statCard: {
          backgroundColor: "#131519",
          borderWidth: 1,
          borderColor: "#252933",
        },
        colors: {
          text: "#F0F2F7",
          textSecondary: "#8A92A8",
          textMuted: "#4A5168",
          border: "#252933",
          isDark: true,
          tabBarBg: "#131519",
          tabBarBorder: "#252933",
          statusBar: "light-content",
        },
        componentBlur: 0,
      };
  }
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateSetting: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  resetSettings: () => void;
  accent: string;
  accentGlow: string;
  themeStyles: ThemeStyles;
  fontScale: number;
}

const ThemeContext = createContext<ThemeContextType>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
  accent: ACCENT_COLORS.blue.primary,
  accentGlow: ACCENT_COLORS.blue.glow,
  themeStyles: buildThemeStyles("minimal", ACCENT_COLORS.blue.primary),
  fontScale: 1,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {}
      }
    });
  }, []);

  const updateSetting = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  };

  const accentData = ACCENT_COLORS[settings.accentColor];
  const themeStyles = buildThemeStyles(settings.visualStyle, accentData.primary);
  const fontScale = FONT_SCALE[settings.fontSize];

  return (
    <ThemeContext.Provider
      value={{
        settings,
        updateSetting,
        resetSettings,
        accent: accentData.primary,
        accentGlow: accentData.glow,
        themeStyles,
        fontScale,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
