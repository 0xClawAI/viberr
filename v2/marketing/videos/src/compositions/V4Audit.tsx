import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  spring,
} from "remotion";
import {
  Background,
  GlowEffect,
  CheckmarkReveal,
  ViberrLogo,
  Tagline,
  FadeIn,
  COLORS,
} from "../components/shared";

// V4: The Audit — 20 seconds @ 30fps = 600 frames
// 0-60: "Before your app ships..."
// 60-90: Terminal window appears
// 90-360: Audit checks animate one by one
// 360-420: Big "AUDIT: PASS ✅"
// 420-500: "Every build. Every time. No exceptions."
// 500-560: Logo
// 560-600: Tagline + hold

const TerminalWindow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.8 },
  });

  return (
    <div
      style={{
        width: "85%",
        maxWidth: 700,
        opacity: appear,
        transform: `scale(${interpolate(appear, [0, 1], [0.9, 1])})`,
      }}
    >
      {/* Terminal chrome */}
      <div
        style={{
          background: "#1a1a2e",
          borderRadius: "12px 12px 0 0",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
        <span
          style={{
            marginLeft: 12,
            color: COLORS.dimText,
            fontSize: 13,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
          }}
        >
          viberr-auditor
        </span>
      </div>
      {/* Terminal body */}
      <div
        style={{
          background: "#0d1117",
          borderRadius: "0 0 12px 12px",
          padding: 24,
          border: `1px solid ${COLORS.border}`,
          borderTop: "none",
          minHeight: 300,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const AuditCheck: React.FC<{
  text: string;
  startFrame: number;
  isPass?: boolean;
}> = ({ text, startFrame, isPass = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = frame - startFrame;

  // First show "Running..." then show result
  const runningDuration = 15;
  const isRunning = elapsed >= 0 && elapsed < runningDuration;
  const isDone = elapsed >= runningDuration;

  const opacity = interpolate(elapsed, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const checkScale = spring({
    frame: Math.max(0, elapsed - runningDuration),
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  if (elapsed < 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 0",
        opacity,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: 16,
      }}
    >
      {isRunning && (
        <span style={{ color: COLORS.amber, width: 24, textAlign: "center" }}>
          {["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"][
            Math.floor(frame * 0.5) % 10
          ]}
        </span>
      )}
      {isDone && (
        <span
          style={{
            color: isPass ? COLORS.green : "#f85149",
            width: 24,
            textAlign: "center",
            transform: `scale(${checkScale})`,
            display: "inline-block",
          }}
        >
          {isPass ? "✓" : "✗"}
        </span>
      )}
      <span style={{ color: isDone && isPass ? COLORS.text : COLORS.dimText }}>
        {text}
      </span>
      {isDone && (
        <span
          style={{
            marginLeft: "auto",
            color: isPass ? COLORS.green : "#f85149",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {isPass ? "PASS" : "FAIL"}
        </span>
      )}
    </div>
  );
};

export const V4Audit: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  const checks = [
    { text: "7/7 pages load", delay: 0 },
    { text: "API health check", delay: 30 },
    { text: "Build passes", delay: 60 },
    { text: "No exposed secrets", delay: 90 },
    { text: "Auth: bcrypt verified", delay: 120 },
    { text: "SQL: parameterized queries", delay: 150 },
    { text: "Client crash check", delay: 180 },
  ];

  return (
    <Background>
      <GlowEffect color={COLORS.green} opacity={0.06} size={isPortrait ? 900 : 1200} />

      {/* "Before your app ships..." */}
      <Sequence from={0} durationInFrames={90}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <FadeIn delay={10}>
            <span
              style={{
                fontSize: isPortrait ? 38 : 44,
                fontWeight: 300,
                color: COLORS.text,
                fontFamily: "Inter, -apple-system, sans-serif",
              }}
            >
              Before your app ships...
            </span>
          </FadeIn>
        </div>
      </Sequence>

      {/* Terminal with audit checks */}
      <Sequence from={60} durationInFrames={360}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <TerminalWindow>
            <div
              style={{
                color: COLORS.dimText,
                fontSize: 13,
                fontFamily: "'SF Mono', monospace",
                marginBottom: 16,
              }}
            >
              $ viberr audit --security --smoke --build
            </div>
            {checks.map((check) => (
              <AuditCheck
                key={check.text}
                text={check.text}
                startFrame={30 + check.delay}
              />
            ))}
          </TerminalWindow>
        </div>
      </Sequence>

      {/* Big AUDIT: PASS */}
      <Sequence from={360} durationInFrames={60}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <FadeIn delay={0}>
            <div
              style={{
                fontSize: isPortrait ? 56 : 64,
                fontWeight: 800,
                color: COLORS.green,
                fontFamily: "Inter, -apple-system, sans-serif",
                textShadow: `0 0 40px ${COLORS.green}40`,
              }}
            >
              AUDIT: PASS ✅
            </div>
          </FadeIn>
        </div>
      </Sequence>

      {/* "Every build. Every time. No exceptions." */}
      <Sequence from={420} durationInFrames={80}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            width: "80%",
          }}
        >
          <FadeIn delay={0}>
            <span
              style={{
                fontSize: isPortrait ? 32 : 38,
                fontWeight: 500,
                color: COLORS.text,
                fontFamily: "Inter, -apple-system, sans-serif",
                lineHeight: 1.4,
              }}
            >
              Every build. Every time.{"\n"}
              <span style={{ color: COLORS.green, fontWeight: 700 }}>
                No exceptions.
              </span>
            </span>
          </FadeIn>
        </div>
      </Sequence>

      {/* Logo + Tagline */}
      <Sequence from={500} durationInFrames={100}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -55%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <ViberrLogo size={isPortrait ? 90 : 110} delay={0} />
        </div>
      </Sequence>

      <Sequence from={540} durationInFrames={60}>
        <div
          style={{
            position: "absolute",
            top: "55%",
            left: "50%",
            transform: "translate(-50%, 0)",
          }}
        >
          <Tagline delay={0} />
        </div>
      </Sequence>
    </Background>
  );
};
