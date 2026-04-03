import { router } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ItemForm } from "@/components/ItemForm";
import { CreateItemInput } from "@/lib/database";
import { useVault } from "@/context/VaultContext";
import { useTheme } from "@/context/ThemeContext";

export default function CreateItemScreen() {
  const { addItem } = useVault();
  const { themeStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const handleSubmit = async (input: CreateItemInput) => {
    const item = await addItem(input);
    router.replace({ pathname: "/item/[id]", params: { id: item.id } });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={[styles.container, themeStyles.screenBg, { paddingTop: topPadding }]}>
      <ItemForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
