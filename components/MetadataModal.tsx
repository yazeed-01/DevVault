import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface MetadataModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (value: string, color?: string, icon?: string) => Promise<void>;
  title: string;
  placeholder?: string;
  initialValue?: string;
  initialColor?: string;
  initialIcon?: string;
  showColor?: boolean;
  showIcon?: boolean;
}

const PRESET_COLORS = [
  "#4F8EF7", "#4CD964", "#FF9500", "#FF2D55", 
  "#5856D6", "#AF52DE", "#FFCC00", "#5AC8FA",
  "#FF3B30", "#8E8E93", "#34C759", "#007AFF"
];

const PRESET_ICONS = [
  "folder", "git-branch", "globe", "zap", "book-open", 
  "play-circle", "tool", "code", "file-text", "hash",
  "star", "heart", "smile", "cpu", "database", "layers"
];

export function MetadataModal({
  isVisible,
  onClose,
  onSave,
  title,
  placeholder,
  initialValue = "",
  initialColor,
  initialIcon,
  showColor = false,
  showIcon = false,
}: MetadataModalProps) {
  const [value, setValue] = useState(initialValue);
  const [selectedColor, setSelectedColor] = useState(initialColor || PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon || PRESET_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isVisible) {
      setValue(initialValue);
      setSelectedColor(initialColor || PRESET_COLORS[0]);
      setSelectedIcon(initialIcon || PRESET_ICONS[0]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible, initialValue, initialColor, initialIcon]);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onSave(value.trim(), selectedColor, selectedIcon);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
              <View style={styles.body}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder={placeholder || "Enter label..."}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />

                {showIcon && (
                  <View style={styles.pickerSection}>
                    <Text style={styles.pickerLabel}>Icon</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                      {PRESET_ICONS.map((icon) => (
                        <Pressable
                          key={icon}
                          onPress={() => setSelectedIcon(icon)}
                          style={[styles.iconItem, selectedIcon === icon && { backgroundColor: Colors.accent + "30", borderColor: Colors.accent }]}
                        >
                          <Feather name={icon as any} size={18} color={selectedIcon === icon ? Colors.accent : Colors.textSecondary} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {showColor && (
                  <View style={styles.pickerSection}>
                    <Text style={styles.pickerLabel}>Color</Text>
                    <View style={styles.colorGrid}>
                      {PRESET_COLORS.map((color) => (
                        <Pressable
                          key={color}
                          onPress={() => setSelectedColor(color)}
                          style={[styles.colorItem, { backgroundColor: color }, selectedColor === color && styles.colorItemSelected]}
                        >
                          {selectedColor === color && <Feather name="check" size={12} color="#fff" />}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.saveBtn, !value.trim() && styles.saveBtnDisabled, saving && styles.saveBtnLoading]} 
                onPress={handleSave}
                disabled={!value.trim() || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  modalCard: {
    width: Math.min(width - 60, 360),
    backgroundColor: "rgba(30, 34, 45, 0.95)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnLoading: {
    opacity: 0.8,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  scrollBody: {
    maxHeight: 400,
  },
  pickerSection: {
    marginTop: 20,
  },
  pickerLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  iconScroll: {
    flexDirection: "row",
    gap: 10,
  },
  iconItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginRight: 10,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorItemSelected: {
    borderWidth: 2,
    borderColor: "#fff",
  },
});
