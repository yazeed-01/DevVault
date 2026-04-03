import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "react-native";
import React, { useState, useEffect } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import {
  CreateItemInput,
  KnowledgeItem,
} from "@/lib/database";
import { useVault } from "@/context/VaultContext";
import { BackgroundAccents } from "@/components/BackgroundAccents";
import { useTheme } from "@/context/ThemeContext";

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = () => {};

try {
  const SpeechModule = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = SpeechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = SpeechModule.useSpeechRecognitionEvent;
} catch (e) {}

interface ItemFormProps {
  initialValues?: KnowledgeItem;
  onSubmit: (input: CreateItemInput) => Promise<void>;
  onCancel: () => void;
}

export function ItemForm({ initialValues, onSubmit, onCancel }: ItemFormProps) {
  const { definitions, metadataValues, initialized } = useVault();
  const { themeStyles, accent } = useTheme();
  const tc = themeStyles.colors;
  const sf = themeStyles.surface;

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [category, setCategory] = useState<string>(initialValues?.category ?? "");
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [links, setLinks] = useState<string[]>(initialValues?.links ?? []);
  const [linkInput, setLinkInput] = useState("");
  const [images, setImages] = useState<string[]>(initialValues?.images ?? []);
  const [lifecyclePhases, setLifecyclePhases] = useState<string[]>(initialValues?.lifecyclePhases ?? []);
  const [domainAreas, setDomainAreas] = useState<string[]>(initialValues?.domainAreas ?? []);
  const [customMetadata, setCustomMetadata] = useState<Record<string, string[]>>(initialValues?.metadata ?? {});
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<"title" | "content" | null>(null);

  useEffect(() => {
    if (initialized && !category && !initialValues) {
      const firstVal = metadataValues["category"]?.[0]?.slug;
      if (firstVal) setCategory(firstVal);
    }
  }, [initialized, definitions, metadataValues]);

  const isSpeechAvailable = !!ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.start === "function";

  useSpeechRecognitionEvent("result", (event: any) => {
    const text = event.results[0]?.transcript;
    if (!text) return;
    if (recordingTarget === "title") setTitle(text);
    else if (recordingTarget === "content") setContent((prev) => (prev ? prev + " " + text : text));
  });

  useSpeechRecognitionEvent("start", () => setIsRecording(true));
  useSpeechRecognitionEvent("end", () => {
    setIsRecording(false);
    setRecordingTarget(null);
  });

  const toggleSpeech = async (target: "title" | "content") => {
    if (!isSpeechAvailable) {
      Alert.alert("Speech Recognition Unavailable", "Requires a native dev build.");
      return;
    }
    try {
      if (isRecording && recordingTarget === target) {
        ExpoSpeechRecognitionModule.stop();
        return;
      }
      setRecordingTarget(target);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: false, continuous: target === "content" });
    } catch (err) {
      setIsRecording(false);
    }
  };

  const isEditing = !!initialValues;

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const addLink = () => {
    let url = linkInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    if (!links.includes(url)) {
      setLinks([...links, url]);
      setLinkInput("");
    }
  };

  const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index));

  const VAULT_IMAGES_DIR = FileSystem.documentDirectory + "DevVaultImages/";

  const ensureVaultDir = async () => {
    const info = await FileSystem.getInfoAsync(VAULT_IMAGES_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(VAULT_IMAGES_DIR, { intermediates: true });
    }
  };

  const saveImageToVault = async (sourceUri: string): Promise<string> => {
    await ensureVaultDir();
    const ext = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
    const filename = `img_${Date.now()}.${ext}`;
    const destUri = VAULT_IMAGES_DIR + filename;
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    return destUri;
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const saved = await Promise.all(result.assets.map(a => saveImageToVault(a.uri)));
      setImages(prev => [...prev, ...saved]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    });
    if (!result.canceled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const saved = await saveImageToVault(result.assets[0].uri);
      setImages(prev => [...prev, saved]);
    }
  };

  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const togglePhase = (phase: string) =>
    setLifecyclePhases((prev) => (prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase]));

  const toggleDomain = (domain: string) =>
    setDomainAreas((prev) => (prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]));

  const toggleCustomMetadata = (defSlug: string, valSlug: string) => {
    setCustomMetadata((prev) => {
      const current = prev[defSlug] || [];
      const updated = current.includes(valSlug) ? current.filter((s) => s !== valSlug) : [...current, valSlug];
      return { ...prev, [defSlug]: updated };
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return Alert.alert("Missing info", "Please fill title and content.");
    setSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onSubmit({ title: title.trim(), content: content.trim(), category, tags, lifecyclePhases, domainAreas, customMetadata, links, images });
    } finally {
      setSaving(false);
    }
  };

  if (!initialized) {
    return (
      <View style={[styles.container, themeStyles.screenBg, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, themeStyles.screenBg]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <BackgroundAccents />
      <View style={styles.header}>
        <Pressable style={[styles.cancelBtn, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }]} onPress={() => (router.canGoBack() ? onCancel() : router.replace("/(tabs)"))}>
          <Feather name="arrow-left" size={22} color={tc.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: tc.text }]}>{isEditing ? "Edit Item" : "New Item"}</Text>
        <Pressable style={[styles.saveBtn, { backgroundColor: accent }, saving && styles.saveBtnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>Title</Text>
            <Pressable onPress={() => toggleSpeech("title")} style={[styles.micBtn, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }, isRecording && recordingTarget === "title" && { borderColor: accent + "60", backgroundColor: accent + "15" }]}>
              <Feather name={isRecording && recordingTarget === "title" ? "mic" : "mic-off"} size={14} color={isRecording && recordingTarget === "title" ? accent : tc.textMuted} />
            </Pressable>
          </View>
          <TextInput style={[styles.titleInput, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor, color: tc.text }]} value={title} onChangeText={setTitle} placeholder="Title..." placeholderTextColor={tc.textMuted} maxLength={120} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>Content</Text>
            <Pressable onPress={() => toggleSpeech("content")} style={[styles.micBtn, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }, isRecording && recordingTarget === "content" && { borderColor: accent + "60", backgroundColor: accent + "15" }]}>
              <Feather name={isRecording && recordingTarget === "content" ? "mic" : "mic-off"} size={14} color={isRecording && recordingTarget === "content" ? accent : tc.textMuted} />
            </Pressable>
          </View>
          <TextInput style={[styles.contentInput, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor, color: tc.text }]} value={content} onChangeText={setContent} placeholder="Content..." placeholderTextColor={tc.textMuted} multiline />
          <Text style={[styles.hint, { color: tc.textMuted }]}>Supports Markdown — **bold**, `code`, ## headers</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>Tags</Text>
          <View style={styles.tagInputRow}>
            <TextInput style={[styles.tagInput, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor, color: tc.text }]} value={tagInput} onChangeText={setTagInput} placeholder="Add tag..." placeholderTextColor={tc.textMuted} onSubmitEditing={addTag} />
            <Pressable style={[styles.tagAddBtn, { backgroundColor: accent + "15" }]} onPress={addTag}><Feather name="plus" size={16} color={accent} /></Pressable>
          </View>
          <View style={styles.tagList}>
            {tags.map((tag) => (
              <Pressable key={tag} style={[styles.tagChip, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }]} onPress={() => removeTag(tag)}>
                <Text style={[styles.tagChipText, { color: tc.textSecondary }]}>#{tag}</Text>
                <Feather name="x" size={11} color={tc.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>Links & Resources</Text>
          <View style={styles.tagInputRow}>
            <TextInput style={[styles.tagInput, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor, color: tc.text }]} value={linkInput} onChangeText={setLinkInput} placeholder="Add URL (e.g. github.com)..." placeholderTextColor={tc.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url" onSubmitEditing={addLink} />
            <Pressable style={[styles.tagAddBtn, { backgroundColor: accent + "15" }]} onPress={addLink}><Feather name="link" size={16} color={accent} /></Pressable>
          </View>
          <View style={styles.linkList}>
            {links.map((link, idx) => (
              <View key={idx} style={[styles.linkRow, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }]}>
                <Feather name="external-link" size={12} color={tc.textSecondary} />
                <Text style={[styles.linkText, { color: tc.textSecondary }]} numberOfLines={1}>{link}</Text>
                <Pressable onPress={() => removeLink(idx)}><Feather name="x" size={14} color={tc.textMuted} /></Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Images Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>Images</Text>
          <View style={styles.imageActionRow}>
            <Pressable style={[styles.imageActionBtn, { backgroundColor: accent + "15", borderColor: accent + "30" }]} onPress={takePhoto}>
              <Feather name="camera" size={18} color={accent} />
              <Text style={[styles.imageActionText, { color: accent }]}>Camera</Text>
            </Pressable>
            <Pressable style={[styles.imageActionBtn, { backgroundColor: accent + "15", borderColor: accent + "30" }]} onPress={pickFromGallery}>
              <Feather name="image" size={18} color={accent} />
              <Text style={[styles.imageActionText, { color: accent }]}>Gallery</Text>
            </Pressable>
          </View>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageStrip}>
              {images.map((uri, idx) => (
                <View key={idx} style={styles.imageThumbContainer}>
                  <Image source={{ uri }} style={[styles.imageThumb, { backgroundColor: sf.backgroundColor }]} />
                  <Pressable style={styles.imageRemoveBtn} onPress={() => removeImage(idx)}>
                    <Feather name="x" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {definitions.map((def) => {
          const values = metadataValues[def.slug] || [];
          const isCategory = def.slug === "category";
          const isLifecycle = def.slug === "lifecycle";
          const isDomain = def.slug === "domain";

          return (
            <View key={def.id} style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>{def.label}</Text>
                <Pressable style={[styles.inlineAddBtn, { backgroundColor: sf.backgroundColor }]} onPress={() => router.push("/metadata/manage")}><Feather name="plus" size={14} color={accent} /></Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                {values.map((v) => {
                  let isActive = false;
                  if (isCategory) isActive = category === v.slug;
                  else if (isLifecycle) isActive = lifecyclePhases.includes(v.slug);
                  else if (isDomain) isActive = domainAreas.includes(v.slug);
                  else isActive = (customMetadata[def.slug] || []).includes(v.slug);

                  const chipStyle = v.color ? { bg: v.color + "15", text: v.color } : { bg: accent + "15", text: accent };

                  return (
                    <Pressable
                      key={v.id}
                      style={[styles.selectChip, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }, isActive && { backgroundColor: chipStyle.bg, borderColor: chipStyle.text + "60" }]}
                      onPress={() => {
                        if (isCategory) setCategory(v.slug);
                        else if (isLifecycle) togglePhase(v.slug);
                        else if (isDomain) toggleDomain(v.slug);
                        else toggleCustomMetadata(def.slug, v.slug);
                      }}
                    >
                      {v.icon && <Feather name={v.icon as any} size={11} color={isActive ? chipStyle.text : tc.textSecondary} />}
                      <Text style={[styles.selectChipText, { color: tc.textSecondary }, isActive && { color: chipStyle.text }]}>{v.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        {definitions.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }]}>
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>No organizational sections yet.</Text>
            <Pressable style={[styles.manageBtn, { backgroundColor: accent }]} onPress={() => router.push("/metadata/manage")}><Text style={styles.manageBtnText}>Create First Section</Text></Pressable>
          </View>
        )}

        <View style={styles.footerActions}>
          <Pressable style={[styles.manageBtn, { backgroundColor: accent }]} onPress={() => router.push("/metadata/manage")}><Text style={styles.manageBtnText}>Manage Dynamic Sections</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  cancelBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  micBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  inlineAddBtn: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  horizontalChips: { gap: 8, paddingRight: 20 },
  titleInput: { borderRadius: 12, padding: 14, fontSize: 17, fontFamily: "Inter_500Medium", borderWidth: 1 },
  contentInput: { borderRadius: 12, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, minHeight: 160 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6 },
  tagInputRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tagInput: { flex: 1, borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1 },
  tagAddBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  tagChipText: { fontSize: 12 },
  selectChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  selectChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyState: { padding: 30, borderRadius: 16, alignItems: "center", borderWidth: 1, borderStyle: "dashed" },
  emptyText: { fontSize: 14, marginBottom: 12 },
  footerActions: { marginTop: 10, alignItems: "center" },
  manageBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  manageBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  linkList: { gap: 8 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  linkText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  imageActionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  imageActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12, borderWidth: 1 },
  imageActionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  imageStrip: { gap: 10, paddingVertical: 4 },
  imageThumbContainer: { position: "relative", width: 100, height: 100 },
  imageThumb: { width: 100, height: 100, borderRadius: 12 },
  imageRemoveBtn: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
});
