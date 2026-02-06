import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  spring,
  Easing,
} from "remotion";
import {
  Background,
  GlowEffect,
  Typewriter,
  ViberrLogo,
  Tagline,
  COLORS,
  FadeIn,
} from "../components/shared";

// V0: Teaser — 15 seconds @ 30fps = 450 frames
// Structure:
// 0-30: Black, breathing space
// 30-120: "What if you could describe an app..."
// 120-150: Pause
// 150-270: "...and an AI built it for you?"
// 270-330: Quick product flash (simulated dashboard)
// 330-380: Logo appears
// 380-430: Tagline fades in
// 430-450: Hold

const DashboardFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashIn = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.8 },
  });

  // Simulated task items moving across
  const tasks = [
    { label: "Authentication System", delay: 5 },
    { label: "Landing Page", delay: 10 },
    { label: "Booking System", delay: 15 },
    { label: "Walker Profiles", delay: 20 },
    { label: "Reviews & Ratings", delay: 25 },
  ];

  return (
    <div
      style={{
        width: "85%",
        maxWidth: 800,
        opacity: flashIn,
        transform: `scale(${interpolate(flashIn, [0, 1], [0.95, 1])})`,
      }}
    >
      {/* Simulated dashboard */}
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Phase indicator */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {["Research", "Backend", "Frontend", "Revisions", "Launch"].map(
            (phase, i) => (
              <div
                key={phase}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  background:
                    i < 3 ? COLORS.green + "20" : COLORS.border,
                  color: i < 3 ? COLORS.green : COLORS.dimText,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {i < 3 ? "✓ " : ""}
                {phase}
              </div>
            )
          )}
        </div>

        {/* Task items with checkmarks animating */}
        {tasks.map((task, i) => {
          const taskProgress = spring({
            frame: frame - task.delay,
            fps,
            config: { damping: 20, stiffness: 180 },
          });

          return (
            <div
              key={task.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                opacity: interpolate(
                  frame - task.delay,
                  [0, 8],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: COLORS.green + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${taskProgress})`,
                }}
              >
                <span style={{ color: COLORS.green, fontSize: 14, fontWeight: 700 }}>
                  ✓
                </span>
              </div>
              <span
                style={{
                  color: COLORS.text,
                  fontSize: 16,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                }}
              >
                {task.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  color: COLORS.green,
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Done
              </span>
            </div>
          );
        })}

        {/* Live indicator */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: COLORS.green,
              opacity: Math.sin(frame * 0.2) * 0.3 + 0.7,
              boxShadow: `0 0 8px ${COLORS.green}`,
            }}
          />
          <span
            style={{
              color: COLORS.green,
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
            }}
          >
            Live
          </span>
        </div>
      </div>
    </div>
  );
};

export const V0Teaser: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Determine if portrait or landscape
  const isPortrait = height > width;
  const textSize = isPortrait ? 42 : 48;

  return (
    <Background>
      {/* Ambient glow */}
      <GlowEffect color={COLORS.purple} opacity={0.08} size={isPortrait ? 800 : 1200} />

      {/* Line 1: "What if you could describe an app..." */}
      <Sequence from={30} durationInFrames={240}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            textAlign: "center",
          }}
        >
          <Typewriter
            text="What if you could describe an app..."
            startFrame={0}
            speed={2}
            style={{
              fontSize: textSize,
              fontWeight: 300,
              color: COLORS.text,
              lineHeight: 1.4,
              fontFamily: "Inter, -apple-system, sans-serif",
            }}
          />
        </div>
      </Sequence>

      {/* Line 2: "...and an AI built it for you?" */}
      <Sequence from={150} durationInFrames={180}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -30%)",
            width: "80%",
            textAlign: "center",
          }}
        >
          <Typewriter
            text="...and an AI built it for you?"
            startFrame={0}
            speed={2}
            style={{
              fontSize: textSize,
              fontWeight: 600,
              color: COLORS.green,
              lineHeight: 1.4,
              fontFamily: "Inter, -apple-system, sans-serif",
            }}
          />
        </div>
      </Sequence>

      {/* Dashboard flash */}
      <Sequence from={270} durationInFrames={60}>
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
          <DashboardFlash />
        </div>
      </Sequence>

      {/* Logo */}
      <Sequence from={330} durationInFrames={120}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <ViberrLogo size={isPortrait ? 100 : 120} delay={0} />
        </div>
      </Sequence>

      {/* Tagline */}
      <Sequence from={380} durationInFrames={70}>
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
