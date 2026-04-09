import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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

// ─── Local AI Service (llama.rn) ──────────────────────────────────────────
import { aiService, AIServiceState } from "@/lib/ai_service";

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

  // ── AI Assistant state ────────────────────────────────────────────────────
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiState, setAiState] = useState<AIServiceState>(aiService.getState());
  const aiScrollRef = useRef<ScrollView>(null);

  // Subscribe to AI service updates
  useEffect(() => {
    const unsubscribe = aiService.subscribe((state) => {
      setAiState(state);
    });
    return unsubscribe;
  }, []);


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

  // ── AI Assistant helpers ──────────────────────────────────────────────────
  const buildAiPrompt = (userInput: string) => {
    const allCategories = (metadataValues["category"] || []).map(c => c.slug).join(", ");
    const allPhases = (metadataValues["lifecycle"] || []).map(p => p.slug).join(", ");
    const allDomains = (metadataValues["domain"] || []).map(d => d.slug).join(", ");

    return `You are a technical knowledge-base assistant. Given the user's topic below, generate structured details for a knowledge item entry. 

IMPORTANT: Your response must start IMMEDIATELY with the opening '{' of the JSON object. Do not include a "Thinking Process", internal thought channels, or any explanation.

User topic: "${userInput}"

Available categories: ${allCategories}
Available lifecycle phases: ${allPhases}
Available domain areas: ${allDomains}

JSON Output Format (IMPORTANT: Respond with ONLY the JSON object, no extra text):
{
  "title": "Concise, descriptive title",
  "content": "## Overview\n\nMarkdown content here. Use ## for sections. Keep it under 200 words and educational.",
  "category": "exact_category_slug",
  "tags": ["tag1", "tag2"],
  "lifecyclePhases": ["phase_slug"],
  "domainAreas": ["domain_slug"]
}`;
  };

  const handleAiGenerate = async () => {
    if (!aiState.isNativeSupported) {
      Alert.alert(
        "Development Build Required",
        "The on-device AI requires a development build to access native LLM libraries. It cannot run in standard Expo Go.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!aiState.isReady) {
      setAiLoading(true); // Show spinner during download trigger
      try {
        await aiService.downloadModel();
      } finally {
        setAiLoading(false);
      }
      return;
    }

    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiResponse("");
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const prompt = buildAiPrompt(aiPrompt.trim());
      
      const response = await aiService.generateResponse(prompt, (token) => {
        setAiResponse((prev) => prev + token);
      });
      
      // Final response check (already streamed via onToken usually)
      if (response && !aiResponse) setAiResponse(response);
    } catch (e: any) {
      setAiResponse(`Error: ${e.message || "Could not generate response."}`);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiResponse = () => {
    if (!aiResponse) return;
    
    let jsonStr = aiResponse.trim();
    // Strip markdown fences
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```/g, "").trim();

    // ─── Simple Partial JSON Repair ──────────────────────────────────────────
    // If it doesn't end with }, try to close it
    if (!jsonStr.endsWith("}")) {
      // Heuristic: Add closing quotes and braces if missing
      let repaired = jsonStr;
      if (repaired.split('"').length % 2 === 0) repaired += '"'; // Close unclosed quote
      
      // Close open arrays/objects
      const counts = { '{': 0, '[': 0 };
      for (const char of repaired) {
        if (char === '{') counts['{']++;
        if (char === '}') counts['{']--;
        if (char === '[') counts['[']++;
        if (char === ']') counts['[']--;
      }
      
      while (counts['['] > 0) { repaired += ']'; counts['[']--; }
      while (counts['{'] > 0) { repaired += '}'; counts['{']--; }
      jsonStr = repaired;
    }

    try {
      const parsed = JSON.parse(jsonStr);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.content) setContent(parsed.content);
      if (parsed.category) setCategory(String(parsed.category));
      if (Array.isArray(parsed.tags)) setTags(parsed.tags);
      if (Array.isArray(parsed.lifecyclePhases)) setLifecyclePhases(parsed.lifecyclePhases);
      if (Array.isArray(parsed.domainAreas)) setDomainAreas(parsed.domainAreas);

      setAiModalVisible(false);
      setAiPrompt("");
      setAiResponse("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fallback: Regex extraction for all fields if JSON is too broken
      const extract = (key: string) => {
        const match = aiResponse.match(new RegExp(`"${key}"\\s*:\\s*("([^"]+)"|\\[([^\\]]+)\\])`));
        if (!match) return null;
        if (match[3]) return match[3].split(',').map(s => s.trim().replace(/"/g, '')); // Handle array
        return match[2] || null; // Handle string
      };

      const fields = {
        title: extract("title"),
        content: extract("content"),
        category: extract("category"),
        tags: extract("tags") as string[] | null,
        phases: extract("lifecyclePhases") as string[] | null,
        domains: extract("domainAreas") as string[] | null
      };
      
      if (fields.title || fields.content) {
        if (typeof fields.title === "string") setTitle(fields.title);
        if (typeof fields.content === "string") setContent(fields.content.replace(/\\n/g, "\n"));
        if (typeof fields.category === "string") setCategory(fields.category);
        if (Array.isArray(fields.tags)) setTags(fields.tags);
        if (Array.isArray(fields.phases)) setLifecyclePhases(fields.phases);
        if (Array.isArray(fields.domains)) setDomainAreas(fields.domains);
        
        setAiModalVisible(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Alert.alert(
          "Could Not Apply",
          "The AI returned an unexpected format. You can copy the text below and paste it manually."
        );
      }
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
    <>
    <KeyboardAvoidingView style={[{ flex: 1 }, themeStyles.screenBg]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <BackgroundAccents />
      <View style={styles.header}>
        <Pressable style={[styles.cancelBtn, { backgroundColor: sf.backgroundColor, borderColor: sf.borderColor }]} onPress={() => (router.canGoBack() ? onCancel() : router.replace("/(tabs)"))}>
          <Feather name="arrow-left" size={22} color={tc.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: tc.text }]}>{isEditing ? "Edit Item" : "New Item"}</Text>
        <View style={styles.headerRight}>
          {/* AI Assistant Button */}
          <Pressable
            style={[
              styles.aiBtn,
              {
                backgroundColor: aiState.isReady ? (accent + "20") : "rgba(120,120,200,0.12)",
                borderColor: aiState.isReady ? (accent + "60") : "rgba(120,120,200,0.3)",
              },
            ]}
            onPress={() => setAiModalVisible(true)}
          >
            <Text style={styles.aiBtnEmoji}>✦</Text>
            <Text style={[styles.aiBtnText, { color: aiState.isReady ? accent : "#9B7FE8" }]}>
              {aiState.isDownloading ? `${Math.round(aiState.downloadProgress * 100)}%` : "AI"}
            </Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, { backgroundColor: accent }, saving && styles.saveBtnDisabled]} onPress={handleSubmit} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>
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

    {/* ── AI Assistant Modal ─────────────────────────────────────────── */}
    <Modal
      visible={aiModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setAiModalVisible(false)}
    >
      <View style={styles.aiModalOverlay}>
        <View style={[styles.aiModalSheet, { backgroundColor: tc.isDark ? "#16181F" : "#FFFFFF", borderColor: accent + "30" }]}>
          {/* Header */}
          <View style={styles.aiModalHeader}>
            <View style={styles.aiModalTitleRow}>
              <Text style={styles.aiSparkle}>✦</Text>
              <Text style={[styles.aiModalTitle, { color: tc.text }]}>AI Assistant</Text>
            </View>
            <Pressable style={[styles.aiCloseBtn, { backgroundColor: tc.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]} onPress={() => setAiModalVisible(false)}>
              <Feather name="x" size={18} color={tc.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.aiModalSub, { color: tc.textMuted }]}>
            {aiState.isReady 
              ? "Describe a concept or term and the AI will generate a complete knowledge item — title, content, tags, and category."
              : "Download the local AI model to start using the assistant. This is a one-time download (~1.5GB)."}
          </Text>

          {/* Download Progress or Info */}
          {!aiState.isReady && (
            <View style={[styles.aiDownloadContainer, { backgroundColor: tc.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
              {!aiState.isNativeSupported ? (
                <View style={styles.aiDownloadInfo}>
                  <Feather name="alert-circle" size={16} color="#EF4444" />
                  <Text style={[styles.aiDownloadTitle, { color: "#EF4444" }]}>
                    Development Build Required
                  </Text>
                </View>
              ) : (
                <View style={styles.aiDownloadInfo}>
                  <Feather name="download" size={16} color={accent} />
                  <Text style={[styles.aiDownloadTitle, { color: tc.text }]}>
                    {aiState.isDownloading ? "Downloading Model..." : "Model Download Required"}
                  </Text>
                </View>
              )}
              
              {aiState.isNativeSupported && aiState.isDownloading && (
                <View style={styles.aiProgressBar}>
                  <View style={[styles.aiProgressFill, { backgroundColor: accent, width: `${aiState.downloadProgress * 100}%` }]} />
                </View>
              )}
              
              {!aiState.isNativeSupported && (
                <Text style={[styles.aiModalSub, { color: tc.textMuted, marginTop: 4, marginBottom: 0 }]}>
                  Please run "npx expo run:android" or "run:ios" to use local AI.
                </Text>
              )}

              {aiState.error && (
                <Text style={styles.aiErrorText}>{aiState.error}</Text>
              )}
            </View>
          )}

          {/* Prompt input */}
          <View style={[styles.aiInputContainer, { backgroundColor: tc.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", borderColor: accent + "40" }]}>
            <TextInput
              style={[styles.aiInput, { color: tc.text }]}
              placeholder="e.g. 'React Hooks', 'JWT Authentication', 'Binary Search Tree'..."
              placeholderTextColor={tc.textMuted}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline
              autoFocus
            />
          </View>

          {/* Generate button */}
          <Pressable
            style={[
              styles.aiGenerateBtn,
              { backgroundColor: accent },
              (aiLoading || (!aiState.isReady && !aiState.isDownloading) ? false : (aiLoading || !aiPrompt.trim())) && { opacity: 0.5 },
            ]}
            onPress={handleAiGenerate}
            disabled={aiLoading || (aiState.isReady && !aiPrompt.trim()) || aiState.isDownloading}
          >
            {aiLoading || aiState.isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.aiGenerateBtnText}>
                {aiState.isReady ? "✦ Generate" : "Download Model"}
              </Text>
            )}
          </Pressable>

          {/* Response area */}
          {aiResponse !== "" && (
            <>
              <ScrollView
                ref={aiScrollRef}
                style={[styles.aiResponseScroll, { borderColor: tc.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.aiResponseText, { color: tc.textSecondary }]}>
                  {(() => {
                    try {
                      const jsonStr = aiResponse.replace(/```json\n?/g, "").replace(/```/g, "").trim();
                      const p = JSON.parse(jsonStr);
                      return [
                        `📌 Title: ${p.title ?? "—"}`,
                        `🏷️ Category: ${p.category ?? "—"}`,
                        `🔖 Tags: ${(p.tags ?? []).join(", ") || "—"}`,
                        `⏱️ Lifecycle: ${(p.lifecyclePhases ?? []).join(", ") || "—"}`,
                        `🌐 Domains: ${(p.domainAreas ?? []).join(", ") || "—"}`,
                        `\n📄 Content preview:\n${(p.content ?? "").slice(0, 300)}...`,
                      ].join("\n");
                    } catch {
                      return aiResponse.slice(0, 600);
                    }
                  })()}
                </Text>
              </ScrollView>

              <Pressable
                style={[styles.aiApplyBtn, { backgroundColor: accent + "15", borderColor: accent + "50" }]}
                onPress={applyAiResponse}
              >
                <Feather name="check" size={16} color={accent} />
                <Text style={[styles.aiApplyBtnText, { color: accent }]}>Apply to Form</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  cancelBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  // AI button in header
  aiBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  aiBtnEmoji: { fontSize: 13 },
  aiBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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

  // ─── AI Modal Styles ───────────────────────────────────────────────────────
  aiModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  aiModalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    maxHeight: "90%",
  },
  aiModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  aiModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiSparkle: {
    fontSize: 20,
    color: "#9B7FE8",
  },
  aiModalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  aiCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  aiModalSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 16,
  },
  aiWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  aiWarningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  aiInputContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    minHeight: 140,
  },
  aiInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 110,
    textAlignVertical: "top",
  },
  aiGenerateBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  aiGenerateBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  aiResponseScroll: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    maxHeight: 380, // Increased height for better reading
    marginBottom: 12,
  },
  aiActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  aiSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  aiSecondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  aiResponseText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  aiApplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  aiApplyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  // ─── AI Download Styles ──────────────────────────────────────────────────
  aiDownloadContainer: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(120,120,200,0.2)",
    marginBottom: 16,
  },
  aiDownloadInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  aiDownloadTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  aiProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  aiProgressFill: {
    height: "100%",
  },
  aiErrorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 8,
    fontFamily: "Inter_400Regular",
  },
});

