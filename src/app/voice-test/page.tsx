"use client";

import { useState, useRef } from "react";
import { Loader2, Play, Pause, Volume2, RefreshCw } from "lucide-react";
import Link from "next/link";

type TTSProvider = "gemini" | "google" | "elevenlabs";

// Gemini 2.5 TTS voices
const GEMINI_VOICES = [
  { id: "Zephyr", name: "Zephyr", gender: "female", description: "明るい女性声" },
  { id: "Kore", name: "Kore", gender: "female", description: "柔らかい女性声" },
  { id: "Leda", name: "Leda", gender: "female", description: "温かみのある女性声" },
  { id: "Aoede", name: "Aoede", gender: "female", description: "自然な女性声" },
  { id: "Puck", name: "Puck", gender: "male", description: "活発な男性声" },
  { id: "Charon", name: "Charon", gender: "male", description: "落ち着いた男性声" },
  { id: "Fenrir", name: "Fenrir", gender: "male", description: "力強い男性声" },
  { id: "Orus", name: "Orus", gender: "male", description: "知的な男性声" },
];

// Preset emotions/styles
const EMOTION_PRESETS = [
  { id: "happy", label: "嬉しい", style: "嬉しそうに、明るく弾んだ声で、笑顔が伝わるように" },
  { id: "excited", label: "興奮", style: "興奮して、テンション高く、早口気味に、ワクワクを込めて" },
  { id: "calm", label: "穏やか", style: "穏やかに、落ち着いて、ゆっくりと、安心感を込めて" },
  { id: "serious", label: "真剣", style: "真剣に、力強く、はっきりと、重要性を込めて" },
  { id: "sad", label: "悲しい", style: "悲しげに、少し沈んだ声で、ゆっくりと、切なさを込めて" },
  { id: "angry", label: "怒り", style: "怒りを込めて、強い口調で、力を入れて" },
  { id: "surprised", label: "驚き", style: "驚いて、『えっ！？』という感情を込めて、声を上げて" },
  { id: "whisper", label: "ささやき", style: "ささやくように、小声で、秘密を打ち明けるように" },
  { id: "narrator", label: "ナレーター", style: "プロのナレーターのように、聞き取りやすく、落ち着いて" },
  { id: "teacher", label: "先生", style: "優しい先生のように、わかりやすく丁寧に、教えるように" },
  { id: "news", label: "ニュース", style: "ニュースキャスターのように、客観的に、はっきりと" },
  { id: "friend", label: "友達", style: "友達に話しかけるように、カジュアルに、親しみを込めて" },
];

// Sample texts
const SAMPLE_TEXTS = [
  { id: "greeting", label: "挨拶", text: "こんにちは！今日もお会いできて嬉しいです。" },
  { id: "news", label: "ニュース", text: "本日のトップニュースをお伝えします。日本経済に大きな影響を与える決定がありました。" },
  { id: "question", label: "質問", text: "プログラミングって、難しそうだと思っていませんか？" },
  { id: "explanation", label: "解説", text: "実は、これにはとても重要な理由があるんです。今から詳しく説明しますね。" },
  { id: "surprise", label: "驚き", text: "えっ！？本当ですか！？それは知りませんでした！" },
  { id: "conclusion", label: "まとめ", text: "というわけで、今日のポイントをおさらいしましょう。" },
  { id: "cta", label: "CTA", text: "ぜひチャンネル登録と高評価をお願いします！次回もお楽しみに！" },
  { id: "custom", label: "カスタム", text: "" },
];

interface GeneratedAudio {
  id: string;
  voice: string;
  style: string;
  text: string;
  audioUrl: string;
  timestamp: Date;
}

export default function VoiceTestPage() {
  const [provider] = useState<TTSProvider>("gemini");
  const [selectedVoice, setSelectedVoice] = useState(GEMINI_VOICES[0]);
  const [selectedEmotion, setSelectedEmotion] = useState(EMOTION_PRESETS[0]);
  const [customStyle, setCustomStyle] = useState("");
  const [selectedSample, setSelectedSample] = useState(SAMPLE_TEXTS[0]);
  const [customText, setCustomText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const femaleVoices = GEMINI_VOICES.filter(v => v.gender === "female");
  const maleVoices = GEMINI_VOICES.filter(v => v.gender === "male");

  const currentText = selectedSample.id === "custom" ? customText : selectedSample.text;
  const currentStyle = customStyle || selectedEmotion.style;

  const handleGenerate = async () => {
    if (!currentText.trim()) {
      setError("テキストを入力してください");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentText,
          config: {
            provider,
            voice: selectedVoice.id,
            style: currentStyle,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.audioUrl) {
        const newAudio: GeneratedAudio = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          voice: selectedVoice.name,
          style: currentStyle,
          text: currentText,
          audioUrl: data.audioUrl,
          timestamp: new Date(),
        };
        setGeneratedAudios(prev => [newAudio, ...prev]);

        // Auto-play
        playAudio(newAudio);
      } else {
        setError(data.error || "音声生成に失敗しました");
      }
    } catch (err) {
      console.error("Voice generation error:", err);
      setError("音声生成中にエラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = (audio: GeneratedAudio) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const newAudio = new Audio(audio.audioUrl);
    audioRef.current = newAudio;

    newAudio.onplay = () => setPlayingId(audio.id);
    newAudio.onended = () => setPlayingId(null);
    newAudio.onerror = () => {
      setPlayingId(null);
      setError("音声の再生に失敗しました");
    };

    newAudio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  };

  const generateComparison = async () => {
    // Generate same text with all voices
    if (!currentText.trim()) {
      setError("テキストを入力してください");
      return;
    }

    setIsGenerating(true);
    setError(null);

    const voicesToTest = [femaleVoices[0], maleVoices[0]]; // First female and male

    for (const voice of voicesToTest) {
      try {
        const response = await fetch("/api/generate-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: currentText,
            config: {
              provider,
              voice: voice.id,
              style: currentStyle,
            },
          }),
        });

        const data = await response.json();

        if (data.success && data.audioUrl) {
          const newAudio: GeneratedAudio = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            voice: voice.name,
            style: currentStyle,
            text: currentText,
            audioUrl: data.audioUrl,
            timestamp: new Date(),
          };
          setGeneratedAudios(prev => [newAudio, ...prev]);
        }
      } catch (err) {
        console.error(`Voice generation error for ${voice.name}:`, err);
      }
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Volume2 className="w-7 h-7 text-purple-400" />
              Gemini 2.5 TTS 音声テスト
            </h1>
            <p className="text-gray-400 mt-1">演技指導による感情表現をテストできます</p>
          </div>
          <Link
            href="/editor"
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            エディタに戻る
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-6">
            {/* Voice Selection */}
            <section className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>🎤</span> ボイス選択
              </h2>

              {/* Female voices */}
              <div className="mb-4">
                <h3 className="text-sm text-pink-400 mb-2">♀ 女性ボイス</h3>
                <div className="grid grid-cols-2 gap-2">
                  {femaleVoices.map(voice => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedVoice.id === voice.id
                          ? "bg-pink-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <div className="font-medium">{voice.name}</div>
                      <div className="text-xs opacity-70">{voice.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Male voices */}
              <div>
                <h3 className="text-sm text-blue-400 mb-2">♂ 男性ボイス</h3>
                <div className="grid grid-cols-2 gap-2">
                  {maleVoices.map(voice => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedVoice.id === voice.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <div className="font-medium">{voice.name}</div>
                      <div className="text-xs opacity-70">{voice.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Emotion Presets */}
            <section className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>🎭</span> 感情プリセット
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {EMOTION_PRESETS.map(emotion => (
                  <button
                    key={emotion.id}
                    onClick={() => {
                      setSelectedEmotion(emotion);
                      setCustomStyle("");
                    }}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      selectedEmotion.id === emotion.id && !customStyle
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {emotion.label}
                  </button>
                ))}
              </div>

              {/* Custom style input */}
              <div className="mt-4">
                <label className="text-sm text-gray-400 block mb-2">
                  カスタム演技指導（自由入力）
                </label>
                <textarea
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  placeholder={selectedEmotion.style}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
                />
              </div>

              {/* Current style preview */}
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">適用される演技指導:</div>
                <div className="text-sm text-purple-300">{currentStyle}</div>
              </div>
            </section>

            {/* Sample Text */}
            <section className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📝</span> テスト文章
              </h2>

              <div className="flex flex-wrap gap-2 mb-4">
                {SAMPLE_TEXTS.map(sample => (
                  <button
                    key={sample.id}
                    onClick={() => setSelectedSample(sample)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedSample.id === sample.id
                        ? "bg-green-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              <textarea
                value={selectedSample.id === "custom" ? customText : selectedSample.text}
                onChange={(e) => {
                  if (selectedSample.id === "custom") {
                    setCustomText(e.target.value);
                  } else {
                    setSelectedSample({ ...selectedSample, text: e.target.value });
                  }
                }}
                placeholder="読み上げるテキストを入力..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </section>

            {/* Generate Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !currentText.trim()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                  isGenerating || !currentText.trim()
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    音声生成
                  </>
                )}
              </button>

              <button
                onClick={generateComparison}
                disabled={isGenerating || !currentText.trim()}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  isGenerating || !currentText.trim()
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                title="女性・男性ボイスを同時に生成"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right: Generated Audio History */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>🔊</span> 生成履歴
              {generatedAudios.length > 0 && (
                <span className="text-sm text-gray-500">({generatedAudios.length}件)</span>
              )}
            </h2>

            {generatedAudios.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
                <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>音声を生成すると、ここに表示されます</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
                {generatedAudios.map(audio => (
                  <div
                    key={audio.id}
                    className={`bg-gray-900 rounded-xl p-4 transition-all ${
                      playingId === audio.id ? "ring-2 ring-purple-500" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => playingId === audio.id ? stopAudio() : playAudio(audio)}
                        className={`p-3 rounded-full transition-all ${
                          playingId === audio.id
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {playingId === audio.id ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            GEMINI_VOICES.find(v => v.name === audio.voice)?.gender === "female"
                              ? "bg-pink-600/30 text-pink-300"
                              : "bg-blue-600/30 text-blue-300"
                          }`}>
                            {audio.voice}
                          </span>
                          <span className="text-xs text-gray-500">
                            {audio.timestamp.toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-sm text-white mb-2 line-clamp-2">
                          {audio.text}
                        </div>

                        <div className="text-xs text-purple-400/70 line-clamp-1">
                          🎭 {audio.style}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {generatedAudios.length > 0 && (
              <button
                onClick={() => setGeneratedAudios([])}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-400"
              >
                履歴をクリア
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
