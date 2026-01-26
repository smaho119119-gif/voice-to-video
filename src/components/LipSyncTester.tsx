"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Play, Download, X, CheckCircle, AlertCircle, Zap, Camera, Volume2 } from "lucide-react";

interface LipSyncTesterProps {
    onClose?: () => void;
}

interface AvatarPreset {
    id: string;
    name: string;
    path: string;
}

type LipSyncMode = "2d" | "realphoto";
type TTSProvider = "google" | "elevenlabs" | "gemini";

interface VoiceOption {
    id: string;
    name: string;
    gender: "male" | "female";
    emoji: string;
    description: string;
}

// Google Cloud TTS 日本語音声
const GOOGLE_VOICE_OPTIONS: VoiceOption[] = [
    { id: "ja-JP-Wavenet-A", name: "ハナ", gender: "female", emoji: "🌷", description: "落ち着いた女性" },
    { id: "ja-JP-Wavenet-D", name: "タケシ", gender: "male", emoji: "👨‍🏫", description: "信頼感のある男性" },
];

const ELEVENLABS_VOICE_OPTIONS: VoiceOption[] = [
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", emoji: "👩", description: "ニュースキャスター風" },
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", emoji: "💃", description: "落ち着いた大人の女性" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "female", emoji: "🎵", description: "元気で明るい女性" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", emoji: "🎤", description: "深みのある男性" },
    { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", gender: "male", emoji: "📻", description: "若々しい男性" },
];

const GEMINI_VOICE_OPTIONS: VoiceOption[] = [
    { id: "Aoede", name: "Aoede", gender: "female", emoji: "🎭", description: "自然で表現豊かな女性" },
    { id: "Kore", name: "Kore", gender: "female", emoji: "🌙", description: "若く明るい女性" },
    { id: "Charon", name: "Charon", gender: "male", emoji: "⚓", description: "落ち着いた男性" },
    { id: "Fenrir", name: "Fenrir", gender: "male", emoji: "🐺", description: "力強い男性" },
    { id: "Puck", name: "Puck", gender: "male", emoji: "🧚", description: "軽快で若い男性" },
];

function getVoiceOptionsForProvider(provider: TTSProvider): VoiceOption[] {
    switch (provider) {
        case "google": return GOOGLE_VOICE_OPTIONS;
        case "elevenlabs": return ELEVENLABS_VOICE_OPTIONS;
        case "gemini": return GEMINI_VOICE_OPTIONS;
        default: return GOOGLE_VOICE_OPTIONS;
    }
}

export default function LipSyncTester({ onClose }: LipSyncTesterProps) {
    // Mode selection
    const [mode, setMode] = useState<LipSyncMode>("2d");

    // 2D mode state
    const [presets, setPresets] = useState<AvatarPreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [rhubarb2DAvailable, setRhubarb2DAvailable] = useState<boolean | null>(null);

    // Real photo mode state
    const [avatarImage, setAvatarImage] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [realPhotoAvailable, setRealPhotoAvailable] = useState<boolean | null>(null);

    // Voice settings
    const [ttsProvider, setTtsProvider] = useState<TTSProvider>("google");
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>(GOOGLE_VOICE_OPTIONS[0].id);

    // Common state
    const [testText, setTestText] = useState("こんにちは！リップシンクのテストです。音声に合わせて口が動きます。");
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState<string>("");
    const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update voice when provider changes
    useEffect(() => {
        const voices = getVoiceOptionsForProvider(ttsProvider);
        setSelectedVoiceId(voices[0].id);
    }, [ttsProvider]);

    // Check availability on mount
    useEffect(() => {
        checkAvailability();
    }, []);

    async function checkAvailability() {
        // Check 2D (Rhubarb) availability
        try {
            const response2D = await fetch("/api/lipsync-2d");
            const data2D = await response2D.json();
            setRhubarb2DAvailable(data2D.status === "available");
            if (data2D.presets) {
                setPresets(data2D.presets);
                if (data2D.presets.length > 0) {
                    setSelectedPreset(data2D.presets[0].id);
                }
            }
        } catch {
            setRhubarb2DAvailable(false);
        }

        // Check real photo (Easy-Wav2Lip) availability
        try {
            const responseReal = await fetch("/api/lipsync");
            const dataReal = await responseReal.json();
            setRealPhotoAvailable(dataReal.status === "available");
        } catch {
            setRealPhotoAvailable(false);
        }
    }

    function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarImage(file);
            setAvatarPreview(URL.createObjectURL(file));
            setResultVideoUrl(null);
            setError(null);
        }
    }

    async function generateLipSync() {
        if (mode === "realphoto" && !avatarImage) {
            setError("アバター画像を選択してください");
            return;
        }
        if (mode === "2d" && !selectedPreset) {
            setError("2Dアバターを選択してください");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setResultVideoUrl(null);

        try {
            // Step 1: Generate audio
            setStatus("音声を生成中...");
            const voiceResponse = await fetch("/api/generate-voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: testText,
                    config: {
                        provider: ttsProvider,
                        voice: selectedVoiceId,
                        speed: ttsProvider === "google" ? 1.0 : undefined,
                    },
                }),
            });

            if (!voiceResponse.ok) {
                throw new Error("音声生成に失敗しました");
            }

            const voiceData = await voiceResponse.json();
            const audioUrl = voiceData.audioUrl;

            // Step 2: Download audio as blob
            setStatus("音声をダウンロード中...");
            const audioResponse = await fetch(audioUrl);
            const audioBlob = await audioResponse.blob();

            // Step 3: Call appropriate lip sync API
            if (mode === "2d") {
                setStatus("2Dリップシンク処理中... (数秒)");
                const formData = new FormData();
                formData.append("audio", audioBlob, "audio.mp3");
                formData.append("avatarId", selectedPreset!);

                const lipSyncResponse = await fetch("/api/lipsync-2d", {
                    method: "POST",
                    body: formData,
                });

                if (!lipSyncResponse.ok) {
                    const errorData = await lipSyncResponse.json();
                    throw new Error(errorData.error || "2Dリップシンク処理に失敗しました");
                }

                const lipSyncData = await lipSyncResponse.json();
                setResultVideoUrl(lipSyncData.videoData);
            } else {
                setStatus("実写リップシンク処理中... (数分かかる場合があります)");
                const formData = new FormData();
                formData.append("video", avatarImage!);
                formData.append("audio", audioBlob, "audio.mp3");
                formData.append("quality", "Enhanced");

                const lipSyncResponse = await fetch("/api/lipsync", {
                    method: "POST",
                    body: formData,
                });

                if (!lipSyncResponse.ok) {
                    const errorData = await lipSyncResponse.json();
                    throw new Error(errorData.error || "リップシンク処理に失敗しました");
                }

                const lipSyncData = await lipSyncResponse.json();
                setResultVideoUrl(lipSyncData.videoData);
            }

            setStatus("完了！");
        } catch (err: unknown) {
            console.error("Lip sync error:", err);
            setError(err instanceof Error ? err.message : "エラーが発生しました");
            setStatus("");
        } finally {
            setIsGenerating(false);
        }
    }

    function downloadVideo() {
        if (!resultVideoUrl) return;
        const link = document.createElement("a");
        link.href = resultVideoUrl;
        link.download = "lipsync_test.mp4";
        link.click();
    }

    const isAvailable = mode === "2d" ? rhubarb2DAvailable : realPhotoAvailable;
    const canGenerate = mode === "2d"
        ? (selectedPreset && rhubarb2DAvailable)
        : (avatarImage && realPhotoAvailable);

    const voiceOptions = getVoiceOptionsForProvider(ttsProvider);

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">リップシンクテスト</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode("2d")}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                mode === "2d"
                                    ? "border-purple-500 bg-purple-500/20 text-purple-300"
                                    : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
                            }`}
                        >
                            <Zap className="w-5 h-5" />
                            <div className="text-left">
                                <div className="font-medium">2Dアバター</div>
                                <div className="text-xs opacity-70">高速（数秒）</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setMode("realphoto")}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                mode === "realphoto"
                                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                    : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
                            }`}
                        >
                            <Camera className="w-5 h-5" />
                            <div className="text-left">
                                <div className="font-medium">実写アバター</div>
                                <div className="text-xs opacity-70">高品質（数分）</div>
                            </div>
                        </button>
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-800">
                        {isAvailable === null ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : isAvailable ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-300">
                            {isAvailable === null
                                ? "サーバー確認中..."
                                : mode === "2d"
                                ? isAvailable
                                    ? "Rhubarbサーバー: 稼働中"
                                    : "Rhubarbがインストールされていません"
                                : isAvailable
                                ? "Easy-Wav2Lipサーバー: 稼働中"
                                : "Easy-Wav2Lipサーバー: 停止中"}
                        </span>
                    </div>

                    {/* 2D Avatar Selection */}
                    {mode === "2d" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                2Dアバターを選択
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setSelectedPreset(preset.id)}
                                        className={`p-3 rounded-lg border-2 transition-all ${
                                            selectedPreset === preset.id
                                                ? "border-purple-500 bg-purple-500/20"
                                                : "border-gray-600 bg-gray-800 hover:border-gray-500"
                                        }`}
                                    >
                                        <img
                                            src={`/avatars/2d/${preset.id}/base.svg`}
                                            alt={preset.name}
                                            className="w-full aspect-square object-contain rounded"
                                        />
                                        <div className="mt-2 text-sm text-center text-gray-300">
                                            {preset.name}
                                        </div>
                                    </button>
                                ))}
                                {presets.length === 0 && (
                                    <div className="col-span-3 text-center text-gray-500 py-8">
                                        2Dアバターが見つかりません
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Real Photo Upload */}
                    {mode === "realphoto" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                アバター画像（正面向きの顔写真）
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Preview"
                                        className="max-h-48 mx-auto rounded-lg"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Upload className="w-10 h-10" />
                                        <span>クリックして画像をアップロード</span>
                                        <span className="text-xs">JPG, PNG対応</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Voice Settings */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-gray-400" />
                            <label className="text-sm font-medium text-gray-300">
                                音声設定
                            </label>
                        </div>

                        {/* TTS Provider Selection */}
                        <div className="flex gap-2">
                            {(["google", "elevenlabs", "gemini"] as TTSProvider[]).map((provider) => (
                                <button
                                    key={provider}
                                    onClick={() => setTtsProvider(provider)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                        ttsProvider === provider
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    {provider === "google" && "Google"}
                                    {provider === "elevenlabs" && "ElevenLabs"}
                                    {provider === "gemini" && "Gemini"}
                                </button>
                            ))}
                        </div>

                        {/* Voice Selection */}
                        <div className="grid grid-cols-2 gap-2">
                            {voiceOptions.map((voice) => (
                                <button
                                    key={voice.id}
                                    onClick={() => setSelectedVoiceId(voice.id)}
                                    className={`p-2 rounded-lg border-2 text-left transition-all ${
                                        selectedVoiceId === voice.id
                                            ? "border-indigo-500 bg-indigo-500/20"
                                            : "border-gray-600 bg-gray-800 hover:border-gray-500"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{voice.emoji}</span>
                                        <div>
                                            <div className="text-sm font-medium text-white">{voice.name}</div>
                                            <div className="text-xs text-gray-400">{voice.description}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Test Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            テスト用テキスト
                        </label>
                        <textarea
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={generateLipSync}
                        disabled={!canGenerate || isGenerating}
                        className={`w-full ${
                            mode === "2d"
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                        }`}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {status}
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                リップシンク生成
                            </>
                        )}
                    </Button>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Result Video */}
                    {resultVideoUrl && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-300">
                                生成結果
                            </label>
                            <video
                                src={resultVideoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full rounded-lg bg-black"
                            />
                            <Button
                                onClick={downloadVideo}
                                variant="outline"
                                className="w-full"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                動画をダウンロード
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
                    {mode === "2d" ? (
                        <>
                            <p>※ 2Dアバターモードは高速ですが、イラスト向けです</p>
                            <p>※ 処理は数秒で完了します</p>
                        </>
                    ) : (
                        <>
                            <p>※ 正面向きの実写顔写真で最も良い結果が得られます</p>
                            <p>※ 処理には数分かかる場合があります</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
