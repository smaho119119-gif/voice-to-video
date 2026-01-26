"use client";

import { useState, useEffect } from "react";

interface AivisStyle {
  id: number;
  name: string;
}

interface AivisSpeaker {
  name: string;
  styles: AivisStyle[];
}

export default function AivisTestPage() {
  const [text, setText] = useState("こんにちは、AivisSpeechのテストです。感情豊かな音声合成を体験してみてください。");
  const [speakers, setSpeakers] = useState<AivisSpeaker[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<number>(888753760);
  const [speed, setSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Check server status and load speakers
  useEffect(() => {
    async function checkServer() {
      try {
        const res = await fetch("http://localhost:10101/speakers");
        if (res.ok) {
          const data = await res.json();
          setSpeakers(data);
          setServerStatus("online");
        } else {
          setServerStatus("offline");
        }
      } catch {
        setServerStatus("offline");
      }
    }
    checkServer();
  }, []);

  const generateAudio = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      const res = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          config: {
            provider: "aivis",
            styleId: selectedStyleId,
            speed,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAudioUrl(data.audioUrl);
      } else {
        setError(data.error || "音声生成に失敗しました");
      }
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">AivisSpeech テスト</h1>
        <p className="text-gray-400 mb-6">完全無料・ローカル実行の音声合成</p>

        {/* Server Status */}
        <div className="mb-6 p-4 rounded-lg bg-gray-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                serverStatus === "online"
                  ? "bg-green-500"
                  : serverStatus === "offline"
                  ? "bg-red-500"
                  : "bg-yellow-500 animate-pulse"
              }`}
            />
            <span>
              AivisSpeech サーバー:{" "}
              {serverStatus === "online"
                ? "オンライン (localhost:10101)"
                : serverStatus === "offline"
                ? "オフライン - AivisSpeechを起動してください"
                : "確認中..."}
            </span>
          </div>
        </div>

        {/* Text Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">テキスト</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            rows={4}
            placeholder="読み上げるテキストを入力..."
          />
        </div>

        {/* Style Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">スタイル（感情）</label>
          <div className="grid grid-cols-2 gap-2">
            {speakers.length > 0 ? (
              speakers.flatMap((speaker) =>
                speaker.styles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyleId(style.id)}
                    className={`p-3 rounded-lg text-left transition ${
                      selectedStyleId === style.id
                        ? "bg-blue-600 border-blue-500"
                        : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                    } border`}
                  >
                    <div className="font-medium">{speaker.name}</div>
                    <div className="text-sm text-gray-300">{style.name}</div>
                  </button>
                ))
              )
            ) : (
              <>
                {[
                  { id: 888753760, name: "ノーマル" },
                  { id: 888753761, name: "ふつー" },
                  { id: 888753762, name: "あまあま" },
                  { id: 888753763, name: "おちつき" },
                  { id: 888753764, name: "からかい" },
                  { id: 888753765, name: "せつなめ" },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyleId(style.id)}
                    className={`p-3 rounded-lg text-left transition ${
                      selectedStyleId === style.id
                        ? "bg-blue-600 border-blue-500"
                        : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                    } border`}
                  >
                    <div className="font-medium">まお</div>
                    <div className="text-sm text-gray-300">{style.name}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Speed Control */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            速度: {speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={generateAudio}
          disabled={isGenerating || serverStatus !== "online"}
          className={`w-full py-3 px-4 rounded-lg font-medium transition ${
            isGenerating || serverStatus !== "online"
              ? "bg-gray-700 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isGenerating ? "生成中..." : "音声を生成"}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Audio Player */}
        {audioUrl && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-3">生成された音声</h3>
            <audio controls className="w-full" src={audioUrl} autoPlay />
            <div className="mt-2 text-sm text-gray-400">
              URL: {audioUrl}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg text-sm text-gray-400">
          <h3 className="font-medium text-white mb-2">AivisSpeechについて</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>完全無料・商用利用OK</li>
            <li>ローカル実行のため高速</li>
            <li>VOICEVOX互換API</li>
            <li>感情スタイルで表現を変更可能</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
