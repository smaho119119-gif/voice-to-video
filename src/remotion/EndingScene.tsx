import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface EndingSceneProps {
  title: string;
  callToAction?: string;
  channelName?: string;
  aspectRatio?: "16:9" | "9:16";
}

export const EndingScene: React.FC<EndingSceneProps> = ({
  title,
  callToAction = "ご視聴ありがとうございました",
  channelName,
  aspectRatio = "16:9",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isVertical = aspectRatio === "9:16";

  // Fade out at the end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Thank you message animation
  const thankYouScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const thankYouOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title animation (delayed)
  const titleDelay = fps * 0.4;
  const titleOpacity = interpolate(
    frame,
    [titleDelay, titleDelay + fps * 0.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleY = interpolate(
    frame,
    [titleDelay, titleDelay + fps * 0.4],
    [30, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),
    }
  );

  // CTA animation (more delayed)
  const ctaDelay = fps * 0.8;
  const ctaOpacity = interpolate(
    frame,
    [ctaDelay, ctaDelay + fps * 0.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subscribe button pulse
  const buttonPulse = interpolate(
    Math.sin((frame - ctaDelay) * 0.15),
    [-1, 1],
    [1, 1.05]
  );

  // Animated gradient background
  const gradientPosition = interpolate(frame, [0, fps * 4], [0, 100]);

  // Particle effect (celebratory)
  const celebrationParticles = Array.from({ length: 30 }, (_, i) => {
    const seed = i * 789.123;
    const startX = ((Math.sin(seed) + 1) / 2) * 100;
    const startY = 110; // Start from bottom
    const speed = 0.8 + ((Math.cos(seed) + 1) / 2) * 1.5;
    const size = 3 + ((Math.sin(seed * 2) + 1) / 2) * 5;
    const hue = (seed * 30) % 360;

    const y = startY - (frame * speed * 0.8);
    const x = startX + Math.sin(frame * 0.03 + seed) * 15;
    const opacity =
      y > 0 && y < 100
        ? interpolate(frame, [0, fps * 0.5], [0, 0.6], { extrapolateRight: "clamp" })
        : 0;

    return { x, y, size, opacity, hue, key: i };
  });

  // Glow effect
  const glowIntensity = interpolate(Math.sin(frame * 0.08), [-1, 1], [15, 30]);

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Animated gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            linear-gradient(
              ${135 + gradientPosition * 0.5}deg,
              #0f172a 0%,
              #1e1b4b 30%,
              #312e81 60%,
              #1e293b 100%
            )
          `,
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.2) 0%, transparent 60%)`,
        }}
      />

      {/* Celebration particles */}
      {celebrationParticles.map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: `hsla(${p.hue}, 70%, 60%, 0.8)`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px hsla(${p.hue}, 70%, 60%, 0.5)`,
          }}
        />
      ))}

      {/* Content container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isVertical ? "40px 30px" : "40px 60px",
          gap: isVertical ? 25 : 35,
        }}
      >
        {/* Thank you message */}
        <div
          style={{
            fontSize: isVertical ? "2rem" : "2.5rem",
            fontWeight: 600,
            color: "rgba(203, 213, 225, 0.9)",
            textAlign: "center",
            transform: `scale(${thankYouScale})`,
            opacity: thankYouOpacity,
            textShadow: "0 2px 15px rgba(0, 0, 0, 0.5)",
          }}
        >
          {callToAction}
        </div>

        {/* Video title */}
        <h1
          style={{
            fontSize: isVertical ? "2.5rem" : "3.5rem",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: isVertical ? "90%" : "75%",
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            textShadow: `
              0 0 ${glowIntensity}px rgba(167, 139, 250, 0.8),
              0 4px 20px rgba(0, 0, 0, 0.5)
            `,
          }}
        >
          {title}
        </h1>

        {/* Channel name if provided */}
        {channelName && (
          <div
            style={{
              fontSize: isVertical ? "1.3rem" : "1.5rem",
              fontWeight: 500,
              color: "rgba(167, 139, 250, 0.9)",
              textAlign: "center",
              opacity: titleOpacity,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
          >
            {channelName}
          </div>
        )}

        {/* Subscribe/Follow CTA */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 20,
            opacity: ctaOpacity,
            transform: `scale(${frame > ctaDelay ? buttonPulse : 0.8})`,
          }}
        >
          {/* Subscribe button */}
          <div
            style={{
              padding: isVertical ? "15px 35px" : "18px 45px",
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              borderRadius: 30,
              fontSize: isVertical ? "1.2rem" : "1.4rem",
              fontWeight: 700,
              color: "white",
              boxShadow: `
                0 4px 20px rgba(239, 68, 68, 0.4),
                0 0 ${glowIntensity}px rgba(239, 68, 68, 0.3)
              `,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: isVertical ? "1.4rem" : "1.6rem" }}>▶</span>
            チャンネル登録
          </div>
        </div>

        {/* Social icons hint */}
        <div
          style={{
            display: "flex",
            gap: 25,
            marginTop: 15,
            opacity: interpolate(
              frame,
              [ctaDelay + fps * 0.3, ctaDelay + fps * 0.5],
              [0, 0.7],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          {["♡", "↗", "💬"].map((icon, i) => (
            <div
              key={i}
              style={{
                width: isVertical ? 45 : 55,
                height: isVertical ? 45 : 55,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isVertical ? "1.3rem" : "1.5rem",
                transform: `translateY(${interpolate(
                  frame,
                  [ctaDelay + fps * 0.3 + i * 5, ctaDelay + fps * 0.5 + i * 5],
                  [20, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )}px)`,
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Decorative corner elements */}
      <div
        style={{
          position: "absolute",
          top: 30,
          right: 30,
          width: 80,
          height: 80,
          borderTop: "3px solid rgba(167, 139, 250, 0.4)",
          borderRight: "3px solid rgba(167, 139, 250, 0.4)",
          opacity: interpolate(frame, [fps * 0.3, fps * 0.6], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 30,
          width: 80,
          height: 80,
          borderBottom: "3px solid rgba(167, 139, 250, 0.4)",
          borderLeft: "3px solid rgba(167, 139, 250, 0.4)",
          opacity: interpolate(frame, [fps * 0.3, fps * 0.6], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};
