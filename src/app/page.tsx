"use client";

import { useState } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Image as ImageIcon, Video, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { Progress } from "@/components/ui/progress";
import { Player } from "@remotion/player";
import { MainVideo } from "@/remotion/MainVideo";

interface Scene {
  duration: number;
  avatar_script: string;
  subtitle: string;
  image_prompt: string;
  imageUrl?: string;
}

interface VideoConfig {
  title: string;
  scenes: Scene[];
}

export default function Home() {
  const [transcribedText, setTranscribedText] = useState("");
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [step, setStep] = useState<"record" | "edit" | "generating" | "complete">("record");

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
        setGenerationProgress(40 + ((i + 1) / updatedScenes.length) * 40);
      }

      setVideoConfig({ ...config, scenes: updatedScenes });
      setGenerationProgress(90);

      // 3. HeyGen / Remotion Prep (This would be next)
      // For now, move to complete
      setGenerationProgress(100);
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === "record" && "Step 1: 音声を録音"}
              {step === "edit" && "Step 2: テキスト確認"}
              {step === "generating" && "Step 3: 動画生成"}
            </CardTitle>
            <CardDescription>
              {step === "record" && "マイクに向かって話しかけてください。AIが自動で文字起こしします。"}
              {step === "edit" && "認識されたテキストを修正し、「動画を生成」ボタンを押してください。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "record" && (
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                isProcessing={isProcessing}
              />
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
                    {generationProgress < 40 && "Claude 3.5 Sonnet が構成を作成しています"}
                    {generationProgress >= 40 && generationProgress < 90 && "Gemini (Nanobanana Pro) が背景画像を生成しています"}
                    {generationProgress >= 90 && "最終調整を行っています"}
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
                  <Button variant="outline" className="flex-1" onClick={() => setStep("record")}>
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
