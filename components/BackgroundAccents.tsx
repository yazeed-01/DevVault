import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

const { width, height } = Dimensions.get("window");

interface BackgroundAccentsProps {
  hide?: boolean;
}

export function BackgroundAccents({ hide }: BackgroundAccentsProps) {
  const { settings, accent } = useTheme();
  
  if (hide) return null;
  
  // Animation values
  const move1 = useRef(new Animated.Value(0)).current;
  const move2 = useRef(new Animated.Value(0)).current;
  const move3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (settings.visualStyle !== "glassmorphism") return;

    const createAnimation = (value: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createAnimation(move1, 12000);
    const anim2 = createAnimation(move2, 15000);
    const anim3 = createAnimation(move3, 10000);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [settings.visualStyle]);

  if (settings.visualStyle !== "glassmorphism") {
    return null;
  }

  // Floating styles
  const blob1Style = {
    transform: [
      {
        translateX: move1.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 40],
        }),
      },
      {
        translateY: move1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 40],
        }),
      },
    ],
  };

  const blob2Style = {
    transform: [
      {
        translateX: move2.interpolate({
          inputRange: [0, 1],
          outputRange: [30, -50],
        }),
      },
      {
        translateY: move2.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 60],
        }),
      },
    ],
  };

  const blob3Style = {
    transform: [
      {
        scale: move3.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
      {
        translateX: move3.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -30],
        }),
      },
    ],
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View 
        style={[
          styles.bgBlob, 
          blob1Style,
          { 
            top: "10%", 
            left: "-10%", 
            backgroundColor: accent + "20",
            width: 300,
            height: 300,
            borderRadius: 150,
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bgBlob, 
          blob2Style,
          { 
            bottom: "20%", 
            right: "-15%", 
            backgroundColor: "#9B7FE820", // Purple blob
            width: 350,
            height: 350,
            borderRadius: 175,
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bgBlob, 
          blob3Style,
          { 
            top: "40%", 
            right: "10%", 
            backgroundColor: "#34D39912", // Green blob
            width: 250,
            height: 250,
            borderRadius: 125,
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bgBlob: {
    position: "absolute",
    zIndex: -1,
    opacity: 0.8,
  },
});
