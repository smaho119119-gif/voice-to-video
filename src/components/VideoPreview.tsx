"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { MainVideo, VideoProps } from "@/remotion/MainVideo";
import { TRANSITION_OVERLAP } from "@/remotion/utils/constants";
import { formatTime } from "@/lib/video-presets";

interface VideoPreviewProps {
  videoProps: VideoProps;
  width?: number;
  height?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPreview({
  videoProps,
  width = 720,
  height = 1280,
  onTimeUpdate,
}: VideoPreviewProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [duration, setDuration] = useState(0);

  const fps = 30;

  // Calculate total duration from scenes, accounting for transition overlaps
  useEffect(() => {
    const sceneCount = videoProps.scenes.length;
    const totalSeconds = videoProps.scenes.reduce(
      (sum, scene) => sum + scene.duration,
      0
    );
    // Add opening and ending if enabled
    const openingDuration = videoProps.opening?.enabled
      ? videoProps.opening.duration || 3
      : 0;
    const endingDuration = videoProps.ending?.enabled
      ? videoProps.ending.duration || 4
      : 0;
    // Subtract transition overlap time: (N-1) overlaps for N scenes
    // The overlap is in frames, so convert to seconds (fps = 30)
    const overlapSeconds = sceneCount > 1 ? ((sceneCount - 1) * TRANSITION_OVERLAP) / fps : 0;
    setDuration(totalSeconds + openingDuration + endingDuration - overlapSeconds);
  }, [videoProps]);

  const totalFrames = Math.round(duration * fps);
  const currentTime = currentFrame / fps;

  // Handle frame change
  const handleFrameUpdate = useCallback(
    (frame: number) => {
      setCurrentFrame(frame);
      onTimeUpdate?.(frame / fps);
    },
    [fps, onTimeUpdate]
  );

  // Play/Pause toggle
  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Seek to specific time
  const handleSeek = (time: number) => {
    if (playerRef.current) {
      const frame = Math.floor(time * fps);
      playerRef.current.seekTo(frame);
      setCurrentFrame(frame);
      onTimeUpdate?.(time);
    }
  };

  // Seek via slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = Number(e.target.value);
    if (playerRef.current) {
      playerRef.current.seekTo(frame);
      setCurrentFrame(frame);
      onTimeUpdate?.(frame / fps);
    }
  };

  // Step forward/backward
  const handleStep = (direction: "forward" | "backward") => {
    if (playerRef.current) {
      const stepFrames = fps * 5; // 5 seconds
      const newFrame =
        direction === "forward"
          ? Math.min(currentFrame + stepFrames, totalFrames - 1)
          : Math.max(currentFrame - stepFrames, 0);
      playerRef.current.seekTo(newFrame);
      setCurrentFrame(newFrame);
      onTimeUpdate?.(newFrame / fps);
    }
  };

  // Reset to start
  const handleReset = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      setCurrentFrame(0);
      onTimeUpdate?.(0);
    }
  };

  // Monitor playing state
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentFrame(0);
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Poll for current frame while playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current) {
        const frame = playerRef.current.getCurrentFrame();
        if (frame !== currentFrame) {
          setCurrentFrame(frame);
          onTimeUpdate?.(frame / fps);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentFrame, fps, onTimeUpdate]);

  // Determine aspect ratio for player
  const aspectRatio = videoProps.aspectRatio || "16:9";
  const isVertical = aspectRatio === "9:16";
  const playerWidth = isVertical ? 270 : 480;
  const playerHeight = isVertical ? 480 : 270;

  return (
    <div className="space-y-4">
      {/* Player */}
      <div className="flex justify-center">
        <div
          className="bg-black rounded-lg overflow-hidden shadow-lg"
          style={{ width: playerWidth, height: playerHeight }}
        >
          {duration > 0 && (
            <Player
              ref={playerRef}
              component={MainVideo as any}
              inputProps={videoProps as any}
              durationInFrames={totalFrames || 1}
              compositionWidth={isVertical ? 720 : 1280}
              compositionHeight={isVertical ? 1280 : 720}
              fps={fps}
              style={{
                width: "100%",
                height: "100%",
              }}
              controls={false}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        {/* Time display and slider */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 w-20">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={totalFrames - 1 || 0}
            value={currentFrame}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-sm text-gray-400 w-20 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="最初に戻る"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => handleStep("backward")}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="5秒戻る"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={handlePlayPause}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors"
            title={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => handleStep("forward")}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="5秒進む"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Export seek function for external use
export function useVideoPreviewSeek(playerRef: React.RefObject<PlayerRef>) {
  const seekTo = useCallback(
    (time: number) => {
      if (playerRef.current) {
        const fps = 30;
        playerRef.current.seekTo(Math.floor(time * fps));
      }
    },
    [playerRef]
  );

  return { seekTo };
}
