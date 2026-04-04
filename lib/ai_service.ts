import * as FileSystem from "expo-file-system/legacy";
import { initLlama, LlamaContext } from "llama.rn";

const MODEL_URL = "https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf";
const MODEL_NAME = "gemma-4-E2B-it-Q4_K_M.gguf";
const MODEL_PATH = `${FileSystem.documentDirectory ?? ""}${MODEL_NAME}`;

export interface AIServiceState {
  isDownloading: boolean;
  downloadProgress: number;
  isReady: boolean;
  error: string | null;
  isNativeSupported: boolean;
}

class AIService {
  private context: LlamaContext | null = null;
  private state: AIServiceState = {
    isDownloading: false,
    downloadProgress: 0,
    isReady: false,
    error: null,
    isNativeSupported: typeof initLlama === "function",
  };
  private listeners: ((state: AIServiceState) => void)[] = [];

  constructor() {
    this.checkIfModelExists();
  }

  private async checkIfModelExists() {
    try {
      const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
      if (fileInfo.exists) {
        this.updateState({ isReady: true });
      }
    } catch (e) {
      console.error("Error checking model existence:", e);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener: (state: AIServiceState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(newState: Partial<AIServiceState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((l) => l(this.state));
  }

  async downloadModel() {
    if (this.state.isDownloading || this.state.isReady) return;

    this.updateState({ isDownloading: true, downloadProgress: 0, error: null });

    const downloadResumable = FileSystem.createDownloadResumable(
      MODEL_URL,
      MODEL_PATH,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        this.updateState({ downloadProgress: progress });
      }
    );

    try {
      const downloadResult = await downloadResumable.downloadAsync();
      if (downloadResult) {
        this.updateState({ isDownloading: false, isReady: true, downloadProgress: 1 });
      }
    } catch (e: any) {
      console.error("Download failed:", e);
      this.updateState({ isDownloading: false, error: "Download failed. Please try again." });
    }
  }

  async initialize() {
    if (this.context) return true;
    if (!this.state.isReady) return false;

    try {
      // llama.rn (llama.cpp) expects a raw filesystem path, not a file:// URI
      const path = MODEL_PATH.replace("file://", "");
      
      const isNative = typeof initLlama === "function";
      if (!isNative) {
        throw new Error("Native LLM bridge not found. This feature requires a development build (npx expo run:android).");
      }

      this.context = await initLlama({
        model: path,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });
      return true;
    } catch (e: any) {
      console.error("Llama initialization failed:", e);
      let errorMsg = "Failed to load AI model.";
      if (e.message?.includes("property 'install' of null") || e.message?.includes("Native module")) {
        errorMsg = "Native AI module not found. Please use a development build.";
        this.updateState({ isNativeSupported: false });
      }
      this.updateState({ error: errorMsg });
      return false;
    }
  }

  async generateResponse(prompt: string, onToken?: (token: string) => void) {
    if (!this.context) {
      const ok = await this.initialize();
      if (!ok) {
        const error = this.state.error || "AI not ready.";
        throw new Error(error);
      }
    }

    try {
      // Use Gemma's specific instruction format
      // For Gemma 4, we also add a constraint to prevent thinking channels
      const formattedPrompt = `<start_of_turn>user\n${prompt}<end_of_turn>\n<start_of_turn>model\n{`;
      
      let fullText = "{"; // Force-start with the JSON opening
      if (onToken) onToken("{");

      const result = await this.context!.completion(
        {
          prompt: formattedPrompt,
          n_predict: 2048, // More tokens for content
          stop: ["<end_of_turn>", "user", "model", "<|channel|>", "<thought>"],
          temperature: 0.4, // Lower temperature for more stable JSON
        },
        (data) => {
          // Filter out any accidentally returned internal tags
          if (data.token.includes("<|channel|") || data.token.includes("thought")) return;
          fullText += data.token;
          if (onToken) onToken(data.token);
        }
      );

      return fullText;
    } catch (e: any) {
      console.error("Generation failed:", e);
      throw new Error("Failed to generate response.");
    }
  }

  async deleteModel() {
    try {
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      if (this.context) {
        // llama.rn doesn't have an explicit release in JS context yet (usually GC'd or released on native)
        this.context = null;
      }
      this.updateState({ isReady: false, downloadProgress: 0 });
    } catch (e) {
      console.error("Error deleting model:", e);
    }
  }
}

export const aiService = new AIService();
