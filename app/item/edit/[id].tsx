import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVault } from "@/context/VaultContext";
import { useTheme } from "@/context/ThemeContext";
import { CreateItemInput, KnowledgeItem } from "@/lib/database";
import { ItemForm } from "@/components/ItemForm";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, editItem } = useVault();
  const { themeStyles } = useTheme();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  useEffect(() => {
    const found = items.find((i) => String(i.id) === id);
    setItem(found ?? null);
  }, [items, id]);

  const handleSubmit = async (input: CreateItemInput) => {
    await editItem(Number(id), input);
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (!item) return null;

  return (
    <View style={[styles.container, themeStyles.screenBg, { paddingTop: topPadding }]}>
      <ItemForm
        initialValues={item}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
