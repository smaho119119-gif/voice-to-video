import { useCurrentFrame, useVideoConfig, interpolate, spring, Img } from "remotion";

interface AvatarComponentProps {
  audioUrl?: string;
  avatarImageUrl?: string;
  emotion?: "neutral" | "happy" | "serious" | "excited" | "thoughtful";
  aspectRatio?: "16:9" | "9:16";
  position?: "left" | "right" | "center";
  size?: "small" | "medium" | "large";
}

// Simple avatar with timing-based lip sync animation
export const AvatarComponent: React.FC<AvatarComponentProps> = ({
  avatarImageUrl,
  emotion = "neutral",
  aspectRatio = "16:9",
  position = "right",
  size = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Size configurations
  const sizeConfig = {
    small: { container: 120, avatar: 100 },
    medium: { container: 160, avatar: 130 },
    large: { container: 200, avatar: 170 },
  };

  const isVertical = aspectRatio === "9:16";
  const currentSize = sizeConfig[size];

  // Position styles
  const positionStyles: React.CSSProperties = {
    position: "absolute",
    ...(position === "left" && { left: isVertical ? 20 : 40, bottom: isVertical ? 180 : 120 }),
    ...(position === "right" && { right: isVertical ? 20 : 40, bottom: isVertical ? 180 : 120 }),
    ...(position === "center" && { left: "50%", bottom: isVertical ? 180 : 120, transform: "translateX(-50%)" }),
  };

  // Emotion-based color accents
  const emotionColors = {
    neutral: "rgba(100, 116, 139, 0.2)",
    happy: "rgba(250, 204, 21, 0.3)",
    serious: "rgba(59, 130, 246, 0.2)",
    excited: "rgba(236, 72, 153, 0.3)",
    thoughtful: "rgba(139, 92, 246, 0.2)",
  };

  // Subtle breathing animation
  const breathingScale = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [1, 1.02]
  );

  // Eye blink animation (every ~3 seconds)
  const blinkFrame = frame % (fps * 3);
  const isBlinking = blinkFrame >= 0 && blinkFrame < 4;
  const eyeScale = isBlinking ? interpolate(blinkFrame, [0, 2, 4], [1, 0.1, 1]) : 1;

  // Head bob animation (subtle)
  const headBob = spring({
    frame: frame % (fps * 2),
    fps,
    config: { damping: 20, stiffness: 100, mass: 1 },
  });
  const headY = interpolate(headBob, [0, 1], [0, -3]);

  // Timing-based mouth animation (simulates speech pattern)
  // Uses multiple sine waves for natural-looking movement
  const talkingProgress = frame / durationInFrames;
  const isTalking = talkingProgress > 0.05 && talkingProgress < 0.95; // Talk during middle portion

  // Create natural speech rhythm with multiple frequencies
  const speechWave1 = Math.sin(frame * 0.5) * 0.5 + 0.5;
  const speechWave2 = Math.sin(frame * 0.8 + 1.5) * 0.3 + 0.5;
  const speechWave3 = Math.sin(frame * 0.3 + 0.7) * 0.2 + 0.5;

  // Combine waves for natural speech pattern
  const rawMouthOpenness = (speechWave1 + speechWave2 + speechWave3) / 3;

  // Add random-like variation using frame number
  const variation = Math.sin(frame * 1.7) * 0.15;
  const mouthOpenness = isTalking
    ? Math.max(0, Math.min(1, rawMouthOpenness + variation))
    : 0;

  // Mouth animation based on computed openness
  const mouthHeight = interpolate(mouthOpenness, [0, 1], [2, 18]);
  const mouthWidth = interpolate(mouthOpenness, [0, 1], [10, 16]);

  return (
    <div style={positionStyles}>
      {/* Glow effect behind avatar */}
      <div
        style={{
          position: "absolute",
          width: currentSize.container,
          height: currentSize.container,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${emotionColors[emotion]} 0%, transparent 70%)`,
          filter: "blur(20px)",
          transform: `scale(${breathingScale})`,
        }}
      />

      {/* Avatar container */}
      <div
        style={{
          width: currentSize.container,
          height: currentSize.container,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          border: "3px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transform: `translateY(${headY}px) scale(${breathingScale})`,
        }}
      >
        {avatarImageUrl ? (
          // Custom avatar image
          <Img
            src={avatarImageUrl}
            style={{
              width: currentSize.avatar,
              height: currentSize.avatar,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        ) : (
          // Default animated face
          <div
            style={{
              width: currentSize.avatar,
              height: currentSize.avatar,
              borderRadius: "50%",
              background: "linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Eyes */}
            <div
              style={{
                display: "flex",
                gap: currentSize.avatar * 0.25,
                marginBottom: currentSize.avatar * 0.1,
              }}
            >
              {/* Left eye */}
              <div
                style={{
                  width: currentSize.avatar * 0.12,
                  height: currentSize.avatar * 0.12 * eyeScale,
                  borderRadius: "50%",
                  background: "#1e293b",
                }}
              />
              {/* Right eye */}
              <div
                style={{
                  width: currentSize.avatar * 0.12,
                  height: currentSize.avatar * 0.12 * eyeScale,
                  borderRadius: "50%",
                  background: "#1e293b",
                }}
              />
            </div>

            {/* Mouth - animated with timing */}
            <div
              style={{
                width: mouthWidth,
                height: mouthHeight,
                borderRadius: mouthOpenness > 0.3 ? "50%" : "10px",
                background: mouthOpenness > 0.2 ? "#ef4444" : "#1e293b",
                transition: "all 0.05s ease",
                marginTop: 5,
              }}
            />

            {/* Cheek blush for happy emotion */}
            {emotion === "happy" && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: currentSize.avatar * 0.1,
                    top: currentSize.avatar * 0.5,
                    width: currentSize.avatar * 0.15,
                    height: currentSize.avatar * 0.08,
                    borderRadius: "50%",
                    background: "rgba(248, 113, 113, 0.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: currentSize.avatar * 0.1,
                    top: currentSize.avatar * 0.5,
                    width: currentSize.avatar * 0.15,
                    height: currentSize.avatar * 0.08,
                    borderRadius: "50%",
                    background: "rgba(248, 113, 113, 0.5)",
                  }}
                />
              </>
            )}

            {/* Sweat drop for excited emotion */}
            {emotion === "excited" && (
              <div
                style={{
                  position: "absolute",
                  right: currentSize.avatar * 0.05,
                  top: currentSize.avatar * 0.2,
                  width: 8,
                  height: 12,
                  borderRadius: "0 50% 50% 50%",
                  background: "rgba(147, 197, 253, 0.8)",
                  transform: "rotate(45deg)",
                }}
              />
            )}

            {/* Thought bubble for thoughtful emotion */}
            {emotion === "thoughtful" && (
              <div
                style={{
                  position: "absolute",
                  right: -10,
                  top: -10,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.8)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Speaking indicator */}
      {mouthOpenness > 0.1 && (
        <div
          style={{
            position: "absolute",
            bottom: -8,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 3,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: interpolate(
                  mouthOpenness,
                  [0, 1],
                  [4, 8 + i * 2]
                ),
                borderRadius: 2,
                background: "rgba(255, 255, 255, 0.6)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
