import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

function SkeletonBlock({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as number, height, borderRadius, opacity },
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SkeletonBlock width={32} height={32} borderRadius={8} />
        <SkeletonBlock width={56} height={20} borderRadius={6} />
      </View>
      <SkeletonBlock width="90%" height={16} borderRadius={4} />
      <View style={{ height: 6 }} />
      <SkeletonBlock width="70%" height={16} borderRadius={4} />
      <View style={{ height: 10 }} />
      <SkeletonBlock width="60%" height={12} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: Colors.surfaceElevated,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
});
