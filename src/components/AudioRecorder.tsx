"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Waveform } from "./Waveform";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isProcessing?: boolean;
}

export function AudioRecorder({
  onRecordingComplete,
  isProcessing = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = audioStream;
      mediaRecorderRef.current = new MediaRecorder(audioStream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/mp4" }); // Using mp4 for compatibility
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);

        // Stop all tracks
        streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioUrl(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("マイクへのアクセスを許可してください。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setAudioUrl(null);
    chunksRef.current = [];
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 border rounded-xl bg-card text-card-foreground shadow-sm w-full max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-3 h-3 rounded-full bg-slate-200 transition-colors", isRecording && "bg-red-500 animate-pulse")} />
        <span className="font-medium text-sm">
          {isRecording ? "録音中..." : audioUrl ? "録音完了" : "マイク待機中"}
        </span>
      </div>

      {isRecording && (
        <div className="w-full px-4 mb-2 h-20">
          <Waveform stream={streamRef.current} isRecording={isRecording} />
        </div>
      )}

      {!audioUrl ? (
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className={cn("w-24 h-24 rounded-full flex flex-col gap-2 transition-all", isRecording && "scale-110")}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          <span className="text-xs font-normal">{isRecording ? "停止" : "録音開始"}</span>
        </Button>
      ) : (
        <div className="w-full space-y-4">
          <audio src={audioUrl} controls className="w-full" />
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={resetRecording} disabled={isProcessing}>
              <Trash2 className="w-4 h-4 mr-2" />
              撮り直す
            </Button>
            {/* Parent component handles the 'Next' step usually, but this component just records */}
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-muted-foreground mt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">音声処理中...</span>
        </div>
      )}
    </div>
  );
}
