import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const ACCENT = "#4F8EF7";

interface Slide {
  id: string;
  type: "hero" | "question" | "feature" | "cta";
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  heading: string;
  body: string;
  questions?: string[];
}

const SLIDES: Slide[] = [
  {
    id: "hero",
    type: "hero",
    icon: "zap",
    iconColor: "#4F8EF7",
    iconBg: "#4F8EF720",
    heading: "Your Knowledge,\nNever Forgotten.",
    body: "DevVault is your personal knowledge engine — built for developers, learners, and curious minds who refuse to let great ideas slip away.",
  },
  {
    id: "questions",
    type: "question",
    icon: "help-circle",
    iconColor: "#9B7FE8",
    iconBg: "#9B7FE820",
    heading: "Sound familiar?",
    body: "If you answered yes to any of these, DevVault was made for you.",
    questions: [
      "😩  You forget what you learned last week",
      "📚  You have tabs open for months to \"read later\"",
      "🔁  You Google the same thing over and over",
      "💡  Great ideas vanish before you write them down",
      "🗂  Your notes are scattered everywhere",
    ],
  },
  {
    id: "features",
    type: "feature",
    icon: "layers",
    iconColor: "#34D399",
    iconBg: "#34D39920",
    heading: "One vault.\nEverything inside.",
    body: "Organize your knowledge with rich metadata, visual graphs, and instant search — all searchable in seconds.",
    questions: [
      "🗺  Visual graph to see how ideas connect",
      "🏷  Tags, phases, domains — your way",
      "🔍  Full-text search across all your notes",
      "📷  Attach images and links to any note",
      "🌙  Beautiful themes that feel right",
    ],
  },
  {
    id: "cta",
    type: "cta",
    icon: "unlock",
    iconColor: "#FBBF24",
    iconBg: "#FBBF2420",
    heading: "Ready to stop\nforgetting things?",
    body: "Start building your personal knowledge vault. Add your first note in under 30 seconds.",
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const isLast = currentStep === SLIDES.length - 1;

  const goTo = (index: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    setCurrentStep(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: false });
  };

  const next = () => {
    if (isLast) { onFinish(); return; }
    goTo(currentStep + 1);
  };

  const slide = SLIDES[currentStep];

  return (
    <View style={styles.container}>
      {/* Background gradient blobs */}
      <View style={[styles.blob1, { backgroundColor: slide.iconColor + "18" }]} />
      <View style={[styles.blob2, { backgroundColor: "#9B7FE812" }]} />

      <View style={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>

        {/* Skip button */}
        {!isLast && (
          <Pressable style={styles.skipBtn} onPress={onFinish}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)}>
              <View style={[
                styles.dot,
                i === currentStep ? [styles.dotActive, { backgroundColor: slide.iconColor }] : styles.dotInactive,
              ]} />
            </Pressable>
          ))}
        </View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Icon */}
          <View style={[styles.iconRing, { borderColor: slide.iconColor + "30" }]}>
            <View style={[styles.iconBg, { backgroundColor: slide.iconBg }]}>
              <Feather name={slide.icon} size={36} color={slide.iconColor} />
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>{slide.heading}</Text>

          {/* Body */}
          <Text style={styles.body}>{slide.body}</Text>

          {/* Questions / feature list */}
          {slide.questions && (
            <View style={styles.questionList}>
              {slide.questions.map((q, i) => (
                <View key={i} style={[styles.questionRow, { borderColor: slide.iconColor + "20", backgroundColor: slide.iconColor + "08" }]}>
                  <Text style={styles.questionText}>{q}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* CTA Button */}
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: slide.iconColor }]}
          onPress={next}
        >
          <Text style={styles.ctaBtnText}>
            {isLast ? "Start My Vault  🚀" : "Continue"}
          </Text>
          {!isLast && <Feather name="arrow-right" size={18} color="#fff" />}
        </Pressable>

        {isLast && (
          <Pressable onPress={onFinish} style={styles.laterBtn}>
            <Text style={styles.laterText}>Maybe later</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#07080D",
    zIndex: 9999,
  },

  // Background blobs
  blob1: {
    position: "absolute", width: 340, height: 340, borderRadius: 170,
    top: -60, left: -80,
  },
  blob2: {
    position: "absolute", width: 280, height: 280, borderRadius: 140,
    bottom: 80, right: -60,
  },

  inner: {
    flex: 1, paddingHorizontal: 28,
    justifyContent: "space-between",
  },

  skipBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  skipText: {
    fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.45)",
  },

  dotsRow: {
    flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 8,
  },
  dot: {
    height: 8, borderRadius: 4,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    width: 8, backgroundColor: "rgba(255,255,255,0.15)",
  },

  content: {
    flex: 1, justifyContent: "center", paddingVertical: 20,
  },

  iconRing: {
    width: 96, height: 96, borderRadius: 28,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    marginBottom: 32, alignSelf: "flex-start",
  },
  iconBg: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },

  heading: {
    fontSize: 34, fontFamily: "Inter_700Bold",
    color: "#FFFFFF", letterSpacing: -0.8,
    lineHeight: 40, marginBottom: 16,
  },
  body: {
    fontSize: 16, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)", lineHeight: 26, marginBottom: 28,
  },

  questionList: { gap: 10 },
  questionRow: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
  },
  questionText: {
    fontSize: 15, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)", lineHeight: 22,
  },

  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  ctaBtnText: {
    fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.2,
  },

  laterBtn: { alignItems: "center", paddingTop: 14 },
  laterText: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
});
