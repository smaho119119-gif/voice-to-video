"use client";

import { useState, useEffect } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Image as ImageIcon, Video, CheckCircle2, Mic, Sparkles, Globe, History, Trash2 } from "lucide-react";
import { saveVideoToSupabase, getUserVideos, loadVideoFromSupabase, deleteVideo, DBVideo } from "@/lib/supabase";
import { applyPronunciationDictionary } from "@/lib/pronunciation";
import axios from "axios";
import { Progress } from "@/components/ui/progress";
import { Player } from "@remotion/player";
import { MainVideo } from "@/remotion/MainVideo";

interface SoundEffect {
  type: "ambient" | "action" | "transition" | "emotion";
  keyword: string;
  timing: "start" | "middle" | "end" | "throughout";
  volume: number;
  url?: string;
}

interface Scene {
  duration: number;
  avatar_script: string;
  subtitle: string;
  image_prompt: string;
  imageUrl?: string;
  audioUrl?: string;
  sound_effects?: SoundEffect[];
}

interface BGMConfig {
  url: string;
  volume: number;
}

interface VideoConfig {
  title: string;
  scenes: Scene[];
  bgm?: BGMConfig;
}

type InputMode = "voice" | "theme" | "url";

const URL_HISTORY_KEY = "video-generator-url-history";
const MAX_URL_HISTORY = 10;

// Avatar characters with personalities
interface AvatarCharacter {
  id: string;
  name: string;
  gender: "female" | "male";
  emoji: string;
  personality: string;
  voiceId: string;
  color: string;
}

const AVATAR_CHARACTERS: AvatarCharacter[] = [
  {
    id: "yuki",
    name: "ユキ",
    gender: "female",
    emoji: "👩‍💼",
    personality: "明るく親しみやすいお姉さん。丁寧でわかりやすい説明が得意。",
    voiceId: "ja-JP-Neural2-C",
    color: "from-pink-400 to-rose-500",
  },
  {
    id: "sakura",
    name: "サクラ",
    gender: "female",
    emoji: "🌸",
    personality: "落ち着いた大人の女性。上品で知的な語り口が特徴。",
    voiceId: "ja-JP-Wavenet-A",
    color: "from-purple-400 to-pink-500",
  },
  {
    id: "miku",
    name: "ミク",
    gender: "female",
    emoji: "💫",
    personality: "元気いっぱいのアイドル風。ポップでキュートな話し方。",
    voiceId: "ja-JP-Wavenet-B",
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "takeshi",
    name: "タケシ",
    gender: "male",
    emoji: "👨‍🏫",
    personality: "頼れる先生タイプ。落ち着いて論理的に説明する。",
    voiceId: "ja-JP-Neural2-B",
    color: "from-blue-400 to-indigo-500",
  },
  {
    id: "ken",
    name: "ケン",
    gender: "male",
    emoji: "🎤",
    personality: "若くてエネルギッシュ。テンション高めでノリが良い。",
    voiceId: "ja-JP-Neural2-D",
    color: "from-green-400 to-emerald-500",
  },
  {
    id: "hiroshi",
    name: "ヒロシ",
    gender: "male",
    emoji: "📚",
    personality: "物静かな知識人。深みのある声で説得力がある。",
    voiceId: "ja-JP-Wavenet-C",
    color: "from-amber-400 to-orange-500",
  },
];

// Normalize URL: add https:// if missing
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

// Get audio duration from base64 data URL
async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl);
    audio.addEventListener("loadedmetadata", () => {
      resolve(audio.duration);
    });
    audio.addEventListener("error", () => {
      resolve(5); // Default 5 seconds on error
    });
  });
}

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>("theme");
  const [themeText, setThemeText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [transcribedText, setTranscribedText] = useState("");
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [step, setStep] = useState<"select" | "record" | "theme" | "url" | "edit" | "generating" | "complete" | "history">("select");
  const [currentUser] = useState<string>("00000000-0000-0000-0000-000000000001");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarCharacter>(AVATAR_CHARACTERS[0]);
  const [videoHistory, setVideoHistory] = useState<DBVideo[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load URL history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(URL_HISTORY_KEY);
    if (saved) {
      try {
        setUrlHistory(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save URL to history
  const saveUrlToHistory = (url: string) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;

    setUrlHistory(prev => {
      const filtered = prev.filter(u => u !== normalized);
      const updated = [normalized, ...filtered].slice(0, MAX_URL_HISTORY);
      localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Delete URL from history
  const deleteUrlFromHistory = (url: string) => {
    setUrlHistory(prev => {
      const updated = prev.filter(u => u !== url);
      localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Load video history from Supabase
  const loadVideoHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const videos = await getUserVideos(currentUser);
      setVideoHistory(videos);
    } catch (error) {
      console.error("Failed to load video history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Save completed video to Supabase
  const saveCompletedVideo = async (config: VideoConfig, sourceUrl?: string) => {
    try {
      const result = await saveVideoToSupabase(
        currentUser,
        {
          title: config.title,
          inputMode: inputMode,
          themeText: inputMode === "theme" ? themeText : undefined,
          sourceUrl: sourceUrl,
          transcribedText: inputMode === "voice" ? transcribedText : undefined,
          bgmUrl: config.bgm?.url,
          bgmVolume: config.bgm?.volume,
        },
        config.scenes.map((scene, index) => ({
          sceneIndex: index,
          avatarScript: scene.avatar_script,
          subtitle: scene.subtitle,
          imagePrompt: scene.image_prompt,
          imageUrl: scene.imageUrl,
          audioUrl: scene.audioUrl,
          duration: scene.duration,
          soundEffects: scene.sound_effects,
        }))
      );
      if (result) {
        console.log("Video saved to Supabase:", result.videoId);
      }
    } catch (error) {
      console.error("Failed to save video:", error);
    }
  };

  // Load video from history
  const loadVideoFromHistory = async (videoId: string) => {
    setIsProcessing(true);
    try {
      const data = await loadVideoFromSupabase(videoId);
      if (data) {
        const loadedConfig: VideoConfig = {
          title: data.video.title,
          scenes: data.scenes.map(scene => ({
            duration: scene.duration,
            avatar_script: scene.avatar_script || "",
            subtitle: scene.subtitle || "",
            image_prompt: scene.image_prompt || "",
            imageUrl: scene.image_url,
            audioUrl: scene.audio_url,
            sound_effects: scene.sound_effects as SoundEffect[],
          })),
          bgm: data.video.bgm_url ? {
            url: data.video.bgm_url,
            volume: data.video.bgm_volume || 0.15,
          } : undefined,
        };
        setVideoConfig(loadedConfig);
        setStep("complete");
      }
    } catch (error) {
      console.error("Failed to load video:", error);
      alert("動画の読み込みに失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete video from history
  const deleteVideoFromHistory = async (videoId: string) => {
    if (!confirm("この動画を削除しますか？")) return;
    try {
      const success = await deleteVideo(videoId);
      if (success) {
        setVideoHistory(prev => prev.filter(v => v.id !== videoId));
      }
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      // Whisper expects a file with an extension usually
      formData.append("file", audioBlob, "recording.mp4");

      const response = await axios.post("/api/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTranscribedText(response.data.text);
      setStep("edit");
    } catch (error) {
      console.error("Upload failed", error);
      alert("文字起こしに失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFromUrl = async () => {
    const normalizedUrl = normalizeUrl(urlInput);
    if (!normalizedUrl) {
      alert("URLを入力してください");
      return;
    }

    setIsProcessing(true);
    setStep("generating");
    setGenerationProgress(5);

    // Save to history
    saveUrlToHistory(normalizedUrl);

    try {
      // 1. Scrape URL and Generate Script
      const scriptRes = await axios.post("/api/generate-script-from-url", {
        url: normalizedUrl,
        targetDuration: 60,
        style: "educational"
      });
      const config = scriptRes.data.script as VideoConfig;
      setVideoConfig(config);
      setGenerationProgress(25);

      // 2. Generate Images
      const updatedScenes = [...config.scenes];
      for (let i = 0; i < updatedScenes.length; i++) {
        const imgRes = await axios.post("/api/generate-image", { prompt: updatedScenes[i].image_prompt });
        updatedScenes[i].imageUrl = imgRes.data.imageUrl;
        setGenerationProgress(25 + ((i + 1) / updatedScenes.length) * 30);
      }
      setGenerationProgress(55);

      // 3. Generate Audio with Google TTS and calculate duration
      console.log("🎤 Using voice:", selectedAvatar.voiceId, "Character:", selectedAvatar.name);
      for (let i = 0; i < updatedScenes.length; i++) {
        try {
          const audioRes = await axios.post("/api/generate-voice", {
            text: applyPronunciationDictionary(updatedScenes[i].avatar_script),
            config: { provider: "google", voice: selectedAvatar.voiceId, speed: 1.0 }
          });
          updatedScenes[i].audioUrl = audioRes.data.audioUrl;

          // Get actual audio duration and update scene duration
          const audioDuration = await getAudioDuration(audioRes.data.audioUrl);
          updatedScenes[i].duration = Math.ceil(audioDuration) + 1; // Add 1 second padding
          console.log(`Scene ${i + 1}: Audio duration = ${audioDuration}s, Scene duration = ${updatedScenes[i].duration}s`);
        } catch (err) {
          console.error(`Audio generation failed for scene ${i + 1}:`, err);
        }
        setGenerationProgress(55 + ((i + 1) / updatedScenes.length) * 25);
      }
      setGenerationProgress(80);

      // 4. Fetch Sound Effects
      for (let i = 0; i < updatedScenes.length; i++) {
        const scene = updatedScenes[i];
        if (scene.sound_effects && scene.sound_effects.length > 0) {
          for (let j = 0; j < scene.sound_effects.length; j++) {
            try {
              const sfxRes = await axios.post("/api/sound-effects", {
                keyword: scene.sound_effects[j].keyword,
                type: scene.sound_effects[j].type
              });
              if (sfxRes.data.success) {
                scene.sound_effects[j].url = sfxRes.data.sound.url;
              }
            } catch (err) {
              console.error(`Sound effect fetch failed:`, err);
            }
          }
        }
        setGenerationProgress(80 + ((i + 1) / updatedScenes.length) * 10);
      }
      setGenerationProgress(90);

      // 5. Fetch BGM
      let bgmConfig: BGMConfig | undefined;
      try {
        const bgmRes = await axios.post("/api/bgm", { style: "educational" });
        if (bgmRes.data.success) {
          bgmConfig = {
            url: bgmRes.data.bgm.url,
            volume: bgmRes.data.bgm.recommendedVolume
          };
        }
      } catch (err) {
        console.error("BGM fetch failed:", err);
      }
      setGenerationProgress(95);

      const finalConfig = { ...config, scenes: updatedScenes, bgm: bgmConfig };
      setVideoConfig(finalConfig);
      setGenerationProgress(100);

      // Save to Supabase
      await saveCompletedVideo(finalConfig, normalizedUrl);

      setStep("complete");
    } catch (error) {
      console.error("URL generation failed", error);
      alert("URL からの動画生成に失敗しました。");
      setStep("url");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFromTheme = async () => {
    setIsProcessing(true);
    setStep("generating");
    setGenerationProgress(5);

    try {
      // 1. Generate Script from Theme
      const scriptRes = await axios.post("/api/generate-script-from-theme", {
        theme: themeText,
        targetDuration: 60,
        style: "educational"
      });
      const config = scriptRes.data.script as VideoConfig;
      setVideoConfig(config);
      setGenerationProgress(20);

      // 2. Generate Images
      const updatedScenes = [...config.scenes];
      for (let i = 0; i < updatedScenes.length; i++) {
        const imgRes = await axios.post("/api/generate-image", { prompt: updatedScenes[i].image_prompt });
        updatedScenes[i].imageUrl = imgRes.data.imageUrl;
        setGenerationProgress(20 + ((i + 1) / updatedScenes.length) * 35);
      }
      setGenerationProgress(55);

      // 3. Generate Audio with TTS and calculate duration
      console.log("🎤 Using voice:", selectedAvatar.voiceId, "Character:", selectedAvatar.name);
      for (let i = 0; i < updatedScenes.length; i++) {
        try {
          const audioRes = await axios.post("/api/generate-voice", {
            text: applyPronunciationDictionary(updatedScenes[i].avatar_script),
            config: { provider: "google", voice: selectedAvatar.voiceId, speed: 1.0 }
          });
          updatedScenes[i].audioUrl = audioRes.data.audioUrl;

          // Get actual audio duration and update scene duration
          const audioDuration = await getAudioDuration(audioRes.data.audioUrl);
          updatedScenes[i].duration = Math.ceil(audioDuration) + 1; // Add 1 second padding
          console.log(`Scene ${i + 1}: Audio duration = ${audioDuration}s, Scene duration = ${updatedScenes[i].duration}s`);
        } catch (err) {
          console.error(`Audio generation failed for scene ${i + 1}:`, err);
        }
        setGenerationProgress(55 + ((i + 1) / updatedScenes.length) * 25);
      }
      setGenerationProgress(80);

      // 4. Fetch Sound Effects
      for (let i = 0; i < updatedScenes.length; i++) {
        const scene = updatedScenes[i];
        if (scene.sound_effects && scene.sound_effects.length > 0) {
          for (let j = 0; j < scene.sound_effects.length; j++) {
            try {
              const sfxRes = await axios.post("/api/sound-effects", {
                keyword: scene.sound_effects[j].keyword,
                type: scene.sound_effects[j].type
              });
              if (sfxRes.data.success) {
                scene.sound_effects[j].url = sfxRes.data.sound.url;
              }
            } catch (err) {
              console.error(`Sound effect fetch failed:`, err);
            }
          }
        }
        setGenerationProgress(80 + ((i + 1) / updatedScenes.length) * 10);
      }
      setGenerationProgress(90);

      // 5. Fetch BGM
      let bgmConfig: BGMConfig | undefined;
      try {
        const bgmRes = await axios.post("/api/bgm", { style: "educational" });
        if (bgmRes.data.success) {
          bgmConfig = {
            url: bgmRes.data.bgm.url,
            volume: bgmRes.data.bgm.recommendedVolume
          };
        }
      } catch (err) {
        console.error("BGM fetch failed:", err);
      }
      setGenerationProgress(95);

      const finalConfig = { ...config, scenes: updatedScenes, bgm: bgmConfig };
      setVideoConfig(finalConfig);
      setGenerationProgress(100);

      // Save to Supabase
      await saveCompletedVideo(finalConfig);

      setStep("complete");
    } catch (error) {
      console.error("Theme generation failed", error);
      alert("動画生成に失敗しました。");
      setStep("theme");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVideo = async () => {
    setIsProcessing(true);
    setStep("generating");
    setGenerationProgress(10);

    try {
      // 1. Generate Script with Claude 3.5 Sonnet
      const scriptRes = await axios.post("/api/generate-script", { text: transcribedText });
      const config = scriptRes.data as VideoConfig;
      setVideoConfig(config);
      setGenerationProgress(40);

      // 2. Generate Images with Gemini (Nanobanana Pro)
      const updatedScenes = [...config.scenes];
      for (let i = 0; i < updatedScenes.length; i++) {
        const imgRes = await axios.post("/api/generate-image", { prompt: updatedScenes[i].image_prompt });
        updatedScenes[i].imageUrl = imgRes.data.imageUrl;
        setGenerationProgress(40 + ((i + 1) / updatedScenes.length) * 25);
      }

      setVideoConfig({ ...config, scenes: updatedScenes });
      setGenerationProgress(65);

      // 3. Generate Audio with TTS and calculate duration
      console.log("🎤 Using voice:", selectedAvatar.voiceId, "Character:", selectedAvatar.name);
      for (let i = 0; i < updatedScenes.length; i++) {
        try {
          const audioRes = await axios.post("/api/generate-voice", {
            text: applyPronunciationDictionary(updatedScenes[i].avatar_script),
            config: { provider: "google", voice: selectedAvatar.voiceId, speed: 1.0 }
          });
          updatedScenes[i].audioUrl = audioRes.data.audioUrl;

          // Get actual audio duration and update scene duration
          const audioDuration = await getAudioDuration(audioRes.data.audioUrl);
          updatedScenes[i].duration = Math.ceil(audioDuration) + 1; // Add 1 second padding
          console.log(`Scene ${i + 1}: Audio duration = ${audioDuration}s, Scene duration = ${updatedScenes[i].duration}s`);
        } catch (err) {
          console.error(`Audio generation failed for scene ${i + 1}:`, err);
        }
        setGenerationProgress(65 + ((i + 1) / updatedScenes.length) * 25);
      }

      setVideoConfig({ ...config, scenes: updatedScenes });
      setGenerationProgress(85);

      // 4. Fetch BGM
      let bgmConfig: BGMConfig | undefined;
      try {
        const bgmRes = await axios.post("/api/bgm", { style: "educational" });
        if (bgmRes.data.success) {
          bgmConfig = {
            url: bgmRes.data.bgm.url,
            volume: bgmRes.data.bgm.recommendedVolume
          };
        }
      } catch (err) {
        console.error("BGM fetch failed:", err);
      }
      setGenerationProgress(95);

      const finalConfig = { ...config, scenes: updatedScenes, bgm: bgmConfig };
      setVideoConfig(finalConfig);
      setGenerationProgress(100);

      // Save to Supabase
      await saveCompletedVideo(finalConfig);

      setStep("complete");
    } catch (error) {
      console.error("Generation failed", error);
      alert("動画構成の生成に失敗しました。");
      setStep("edit");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Voice to Video AI
          </h1>
          <p className="text-slate-500">
            あなたの声を、AIアバターが解説する動画に変換します。
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <Button variant="ghost" size="sm" onClick={async () => {
              const res = await axios.get("/api/setup-demo");
              alert(res.data.message);
            }} className="text-blue-600 hover:text-blue-700">
              🛠 デモユーザー(test/NSX)を初期設定する
            </Button>
            <div className="bg-white px-3 py-1 rounded-full border shadow-sm flex items-center gap-2">
              <span className="text-slate-400">ログイン中:</span>
              <span className="font-bold">{currentUser}</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === "select" && "作成方法を選択"}
              {step === "history" && "動画履歴"}
              {step === "record" && "Step 1: 音声を録音"}
              {step === "theme" && "Step 1: テーマを入力"}
              {step === "url" && "Step 1: URLを入力"}
              {step === "edit" && "Step 2: テキスト確認"}
              {step === "generating" && "動画を生成中..."}
              {step === "complete" && "完成！"}
            </CardTitle>
            <CardDescription>
              {step === "select" && "音声、テーマ、またはURLから動画を作成できます。"}
              {step === "history" && "過去に生成した動画を選択して再生できます。"}
              {step === "record" && "マイクに向かって話しかけてください。AIが自動で文字起こしします。"}
              {step === "theme" && "テーマを入力するだけで、AIが台本・音声・映像を全て自動生成します。"}
              {step === "url" && "Webページの内容をAIが分析して、動画を自動生成します。"}
              {step === "edit" && "認識されたテキストを修正し、「動画を生成」ボタンを押してください。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "select" && (
              <div className="space-y-6 animate-in fade-in">
                {/* Avatar/Character Selection - Compact 6-column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎭</span>
                      <p className="font-medium text-sm">ナレーター</p>
                    </div>
                    <p className="text-xs text-slate-400">
                      選択中: <span className="font-bold text-slate-600">{selectedAvatar.name}</span>
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    {AVATAR_CHARACTERS.map((avatar) => (
                      <div key={avatar.id} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => setSelectedAvatar(avatar)}
                          className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-2xl shadow-sm transition-all ${
                            selectedAvatar.id === avatar.id
                              ? "ring-4 ring-blue-500 ring-offset-2 scale-110"
                              : "hover:scale-105 opacity-70 hover:opacity-100"
                          }`}
                          title={avatar.name}
                        >
                          {avatar.emoji}
                          {selectedAvatar.id === avatar.id && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-white text-[10px]">✓</span>
                            </div>
                          )}
                        </button>
                        <span className="text-[10px] font-medium text-slate-600">{avatar.name}</span>
                        <button
                          onClick={() => alert(`【${avatar.name}】\n${avatar.gender === "female" ? "♀ 女性" : "♂ 男性"}\n\n${avatar.personality}`)}
                          className="text-[9px] text-blue-500 hover:text-blue-700 hover:underline"
                        >
                          詳細
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => { setInputMode("voice"); setStep("record"); }}
                    className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                  >
                    <Mic className="w-10 h-10 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-lg mb-1">🎤 音声から作成</h3>
                    <p className="text-sm text-slate-500">
                      話した内容をAIが文字起こしして動画を作成します。
                    </p>
                  </button>
                  <button
                    onClick={() => { setInputMode("theme"); setStep("theme"); }}
                    className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                  >
                    <Sparkles className="w-10 h-10 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-lg mb-1">✨ テーマから自動生成</h3>
                    <p className="text-sm text-slate-500">
                      テーマを入れるだけ！台本・音声・映像を全てAIが作成します。
                    </p>
                  </button>
                  <button
                    onClick={() => { setInputMode("url"); setStep("url"); }}
                    className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all text-left"
                  >
                    <Globe className="w-10 h-10 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-lg mb-1">🌐 URLから自動生成</h3>
                    <p className="text-sm text-slate-500">
                      Webページの内容からAIが動画を自動作成します。
                    </p>
                  </button>
                </div>

                {/* History Button */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { loadVideoHistory(); setStep("history"); }}
                  >
                    <History className="w-4 h-4 mr-2" />
                    過去の動画を見る
                  </Button>
                </div>
              </div>
            )}

            {step === "history" && (
              <div className="space-y-4 animate-in fade-in">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                ) : videoHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>まだ動画がありません</p>
                    <p className="text-sm mt-2">新しい動画を作成してみましょう！</p>
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                    {videoHistory.map((video) => (
                      <div
                        key={video.id}
                        className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <button
                          onClick={() => loadVideoFromHistory(video.id)}
                          className="flex-1 text-left"
                        >
                          <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(video.created_at).toLocaleDateString("ja-JP", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" · "}
                            {video.input_mode === "url" ? "🌐 URL" : video.input_mode === "theme" ? "✨ テーマ" : "🎤 音声"}
                          </p>
                        </button>
                        <button
                          onClick={() => deleteVideoFromHistory(video.id)}
                          className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" onClick={() => setStep("select")} className="w-full">
                  ← 戻る
                </Button>
              </div>
            )}

            {step === "record" && (
              <div className="space-y-4">
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  isProcessing={isProcessing}
                />
                <Button variant="ghost" size="sm" onClick={() => setStep("select")} className="w-full text-slate-400">
                  ← 選択に戻る
                </Button>
              </div>
            )}

            {step === "theme" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">動画のテーマ</label>
                  <Textarea
                    value={themeText}
                    onChange={(e) => setThemeText(e.target.value)}
                    placeholder="例: 初心者向けプログラミング入門、健康的な朝食の作り方、東京観光おすすめスポット..."
                    className="min-h-[100px] leading-relaxed"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("select")}>
                    ← 戻る
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    onClick={handleGenerateFromTheme}
                    disabled={isProcessing || !themeText.trim()}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    AIで全自動生成
                  </Button>
                </div>
              </div>
            )}

            {step === "url" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">WebページのURL</label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="example.com/article （https://は自動追加）"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-slate-400">
                    ブログ記事、ニュース、製品ページなど。https://は省略可能です。
                  </p>
                </div>

                {/* URL History */}
                {urlHistory.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">履歴から選択</label>
                    <div className="flex flex-wrap gap-2">
                      {urlHistory.map((url, i) => (
                        <div key={i} className="group flex items-center gap-1 bg-slate-100 hover:bg-green-100 rounded-full pl-3 pr-1 py-1 text-xs transition-colors">
                          <button
                            onClick={() => setUrlInput(url)}
                            className="text-slate-600 hover:text-green-700 truncate max-w-[200px]"
                            title={url}
                          >
                            {url.replace(/^https?:\/\//, "")}
                          </button>
                          <button
                            onClick={() => deleteUrlFromHistory(url)}
                            className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="削除"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("select")}>
                    ← 戻る
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                    onClick={handleGenerateFromUrl}
                    disabled={isProcessing || !urlInput.trim()}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                    URLから動画生成
                  </Button>
                </div>
              </div>
            )}

            {step === "edit" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">認識されたテキスト</label>
                  <Textarea
                    value={transcribedText}
                    onChange={(e) => setTranscribedText(e.target.value)}
                    placeholder="ここに話した内容が表示されます..."
                    className="min-h-[150px] leading-relaxed"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("record")}>
                    録り直す
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleGenerateVideo} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    動画を生成
                  </Button>
                </div>
              </div>
            )}

            {step === "generating" && (
              <div className="py-12 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold">{generationProgress}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">AIが動画を制作中...</h3>
                  <p className="text-sm text-slate-500 max-w-[300px]">
                    {generationProgress < 20 && "🤖 Gemini が台本を作成しています"}
                    {generationProgress >= 20 && generationProgress < 55 && "🎨 Gemini が背景画像を生成しています"}
                    {generationProgress >= 55 && generationProgress < 80 && "🎙️ Google TTS が日本語音声を生成しています"}
                    {generationProgress >= 80 && generationProgress < 90 && "🔊 効果音を追加しています"}
                    {generationProgress >= 90 && generationProgress < 95 && "🎵 BGMを選択しています"}
                    {generationProgress >= 95 && "✨ 最終調整を行っています"}
                  </p>
                </div>
                <Progress value={generationProgress} className="w-full max-w-[240px]" />
              </div>
            )}

            {step === "complete" && videoConfig && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-center gap-3 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">動画の構成が完了しました！</span>
                </div>

                <div className="grid gap-4">
                  <h3 className="font-bold text-xl">{videoConfig.title}</h3>

                  {/* Remotion Player Preview */}
                  <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-2xl border-4 border-white">
                    <Player
                      component={MainVideo as any}
                      inputProps={videoConfig}
                      durationInFrames={videoConfig.scenes.reduce((acc, scene) => acc + scene.duration * 30, 0)}
                      fps={30}
                      compositionWidth={1920}
                      compositionHeight={1080}
                      style={{
                        width: "100%",
                      }}
                      controls
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {videoConfig.scenes.map((scene, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden bg-slate-50 group transition-all hover:border-blue-200">
                        <div className="aspect-video relative bg-slate-200">
                          {scene.imageUrl ? (
                            <img src={scene.imageUrl} alt={`Scene ${i + 1}`} className="object-cover w-full h-full" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            Scene {i + 1}
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-xs font-bold text-blue-600 uppercase">Script</p>
                          <p className="text-sm leading-snug line-clamp-3">{scene.avatar_script}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep("select"); setVideoConfig(null); setThemeText(""); setUrlInput(""); setTranscribedText(""); }}>
                    新しく作る
                  </Button>
                  <Button className="flex-1 bg-black text-white hover:bg-slate-800">
                    <Video className="w-4 h-4 mr-2" />
                    HeyGenでアバター動画を連結
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
