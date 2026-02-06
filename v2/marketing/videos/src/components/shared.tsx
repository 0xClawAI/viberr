import React from "react";
import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";

// Brand colors
export const COLORS = {
  bg: "#0a0a0a",
  text: "#f0f6fc",
  green: "#7ee787",
  purple: "#a78bfa",
  amber: "#f59e0b",
  dimText: "#8b949e",
  border: "#30363d",
  card: "#111111",
};

// Fade in text with slight upward drift
export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, duration = 20, style }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame - delay, [0, duration], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Typewriter effect
export const Typewriter: React.FC<{
  text: string;
  startFrame: number;
  speed?: number;
  style?: React.CSSProperties;
  cursorColor?: string;
}> = ({ text, startFrame, speed = 2, style, cursorColor = COLORS.green }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const chars = Math.min(Math.floor(elapsed / speed), text.length);
  const displayText = text.slice(0, chars);

  // Blinking cursor
  const showCursor = Math.floor(frame / 15) % 2 === 0 || chars < text.length;

  return (
    <div style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", ...style }}>
      <span>{displayText}</span>
      {showCursor && (
        <span
          style={{
            color: cursorColor,
            opacity: chars < text.length ? 1 : 0.7,
          }}
        >
          ▋
        </span>
      )}
    </div>
  );
};

// Animated checkmark
export const CheckmarkReveal: React.FC<{
  text: string;
  startFrame: number;
  color?: string;
}> = ({ text, startFrame, color = COLORS.green }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 200, mass: 0.5 },
  });

  const opacity = interpolate(frame - startFrame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity,
        transform: `translateX(${interpolate(progress, [0, 1], [-20, 0])}px)`,
      }}
    >
      <span
        style={{
          color,
          fontSize: 28,
          transform: `scale(${progress})`,
          display: "inline-block",
        }}
      >
        ✓
      </span>
      <span style={{ color: COLORS.text, fontSize: 24, fontWeight: 500 }}>
        {text}
      </span>
    </div>
  );
};

// Glowing dot (like "Live ●")
export const PulsingDot: React.FC<{
  color?: string;
  size?: number;
}> = ({ color = COLORS.green, size = 12 }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        opacity: pulse,
        boxShadow: `0 0 ${size}px ${color}`,
      }}
    />
  );
};

// Full-screen background
export const Background: React.FC<{
  children: React.ReactNode;
  color?: string;
}> = ({ children, color = COLORS.bg }) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: color,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
};

// Subtle gradient glow behind content
export const GlowEffect: React.FC<{
  color?: string;
  opacity?: number;
  size?: number;
}> = ({ color = COLORS.purple, opacity = 0.15, size = 600 }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame * 0.02) * 20;

  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        transform: `translate(${drift}px, ${drift * 0.5}px)`,
        pointerEvents: "none",
      }}
    />
  );
};

// Logo component
export const ViberrLogo: React.FC<{
  size?: number;
  delay?: number;
}> = ({ size = 80, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.8 },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.2,
        transform: `scale(${scale})`,
      }}
    >
      <span style={{ fontSize: size * 0.6 }}>⚡</span>
      <span
        style={{
          fontSize: size * 0.5,
          fontWeight: 800,
          color: COLORS.text,
          fontFamily: "Inter, -apple-system, sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        Viberr
      </span>
    </div>
  );
};

// Tagline
export const Tagline: React.FC<{
  delay?: number;
}> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        color: COLORS.dimText,
        fontSize: 22,
        fontWeight: 400,
        fontFamily: "Inter, -apple-system, sans-serif",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      Built by agents. Reviewed by you.
    </div>
  );
};
