"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
    stream: MediaStream | null;
    isRecording: boolean;
}

export function Waveform({ stream, isRecording }: WaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const analyzerRef = useRef<AnalyserNode | null>(null);

    useEffect(() => {
        if (!isRecording || !stream || !canvasRef.current) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        analyzerRef.current = analyzer;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d")!;

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyzer.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;

                // Beautiful gradient
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, "#3b82f6"); // blue-500
                gradient.addColorStop(1, "#60a5fa"); // blue-400

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 2;
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            audioContext.close();
        };
    }, [isRecording, stream]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={80}
            className="w-full h-20 rounded-lg bg-slate-50 border border-slate-100"
        />
    );
}
