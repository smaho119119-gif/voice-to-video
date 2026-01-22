import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface OpeningSceneProps {
  title: string;
  subtitle?: string;
  aspectRatio?: "16:9" | "9:16";
}

export const OpeningScene: React.FC<OpeningSceneProps> = ({
  title,
  subtitle,
  aspectRatio = "16:9",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isVertical = aspectRatio === "9:16";

  // Title animation with spring physics
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const titleOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title Y position (slide up)
  const titleY = interpolate(frame, [0, fps * 0.5], [50, 0], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out
  });

  // Subtitle delayed entrance
  const subtitleDelay = fps * 0.5;
  const subtitleOpacity = interpolate(
    frame,
    [subtitleDelay, subtitleDelay + fps * 0.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const subtitleY = interpolate(
    frame,
    [subtitleDelay, subtitleDelay + fps * 0.4],
    [30, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),
    }
  );

  // Animated background gradient
  const gradientRotation = interpolate(frame, [0, fps * 3], [0, 360]);

  // Particle effect (subtle floating dots)
  const particles = Array.from({ length: 20 }, (_, i) => {
    const seed = i * 123.456;
    const startX = ((Math.sin(seed) + 1) / 2) * 100;
    const startY = ((Math.cos(seed) + 1) / 2) * 100;
    const speed = 0.5 + ((Math.sin(seed * 2) + 1) / 2) * 1;
    const size = 2 + ((Math.cos(seed * 3) + 1) / 2) * 4;

    const y = (startY + (frame * speed * 0.5)) % 120 - 10;
    const x = startX + Math.sin(frame * 0.02 + seed) * 10;
    const opacity = interpolate(frame, [0, fps * 0.5], [0, 0.3 + ((Math.sin(seed) + 1) / 2) * 0.3], {
      extrapolateRight: "clamp",
    });

    return { x, y, size, opacity, key: i };
  });

  // Glow pulse effect
  const glowPulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [20, 40]);

  // Light beam effect
  const beamOpacity = interpolate(frame, [fps * 0.2, fps * 0.8], [0, 0.15], {
    extrapolateRight: "clamp",
  });
  const beamRotation = interpolate(frame, [0, fps * 3], [-30, 30]);

  return (
    <AbsoluteFill>
      {/* Animated gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            conic-gradient(
              from ${gradientRotation}deg at 50% 50%,
              #0f172a 0deg,
              #1e293b 90deg,
              #0f172a 180deg,
              #1e293b 270deg,
              #0f172a 360deg
            )
          `,
        }}
      />

      {/* Radial gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)`,
        }}
      />

      {/* Light beams */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: beamOpacity,
          transform: `rotate(${beamRotation}deg)`,
          background: `
            linear-gradient(
              90deg,
              transparent 0%,
              transparent 40%,
              rgba(255, 255, 255, 0.1) 50%,
              transparent 60%,
              transparent 100%
            )
          `,
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px rgba(147, 197, 253, 0.5)`,
          }}
        />
      ))}

      {/* Title container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isVertical ? "40px 30px" : "40px 60px",
        }}
      >
        {/* Main title */}
        <h1
          style={{
            fontSize: isVertical ? "3.5rem" : "4.5rem",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: isVertical ? "90%" : "80%",
            transform: `scale(${titleScale}) translateY(${titleY}px)`,
            opacity: titleOpacity,
            textShadow: `
              0 0 ${glowPulse}px rgba(147, 197, 253, 0.8),
              0 4px 20px rgba(0, 0, 0, 0.5)
            `,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              fontSize: isVertical ? "1.5rem" : "1.8rem",
              fontWeight: 500,
              color: "rgba(203, 213, 225, 0.9)",
              textAlign: "center",
              marginTop: isVertical ? 20 : 30,
              maxWidth: isVertical ? "85%" : "70%",
              transform: `translateY(${subtitleY}px)`,
              opacity: subtitleOpacity,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Decorative line */}
        <div
          style={{
            width: interpolate(frame, [fps * 0.3, fps * 0.8], [0, isVertical ? 200 : 300], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            height: 3,
            background: "linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.8), transparent)",
            marginTop: 30,
            opacity: interpolate(frame, [fps * 0.3, fps * 0.6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            borderRadius: 2,
          }}
        />
      </div>

      {/* Corner decorations */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          width: 60,
          height: 60,
          borderTop: "3px solid rgba(147, 197, 253, 0.5)",
          borderLeft: "3px solid rgba(147, 197, 253, 0.5)",
          opacity: interpolate(frame, [fps * 0.5, fps * 0.8], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          width: 60,
          height: 60,
          borderBottom: "3px solid rgba(147, 197, 253, 0.5)",
          borderRight: "3px solid rgba(147, 197, 253, 0.5)",
          opacity: interpolate(frame, [fps * 0.5, fps * 0.8], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};
