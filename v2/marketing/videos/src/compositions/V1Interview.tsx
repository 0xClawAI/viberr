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
  Typewriter,
  ViberrLogo,
  Tagline,
  FadeIn,
  COLORS,
} from "../components/shared";

// V1: The Interview — 30 seconds @ 30fps = 900 frames
// 0-60: Hook text: "Your app starts with a conversation"
// 60-120: Chat UI appears
// 120-240: User types message
// 240-420: AI responds with streaming animation
// 420-540: AI asks follow-up questions
// 540-660: "No forms. No specs. Just talk."
// 660-750: Spec document appears
// 750-850: Logo
// 850-900: Tagline

const ChatBubble: React.FC<{
  text: string;
  isUser: boolean;
  startFrame: number;
  typeSpeed?: number;
}> = ({ text, isUser, startFrame, typeSpeed = 1.5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 150 },
  });

  if (frame < startFrame) return null;

  const chars = Math.min(
    Math.floor((frame - startFrame) / typeSpeed),
    text.length
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        opacity: appear,
        transform: `translateY(${interpolate(appear, [0, 1], [10, 0])}px)`,
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "12px 18px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser ? COLORS.green + "20" : COLORS.card,
          border: `1px solid ${isUser ? COLORS.green + "40" : COLORS.border}`,
          fontSize: 16,
          lineHeight: 1.5,
          fontFamily: "Inter, sans-serif",
          color: COLORS.text,
        }}
      >
        {!isUser && (
          <div
            style={{
              fontSize: 12,
              color: COLORS.green,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            ⚡ Viberr Agent
          </div>
        )}
        {isUser ? text.slice(0, chars) : text.slice(0, chars)}
        {chars < text.length && (
          <span style={{ opacity: 0.5 }}>▋</span>
        )}
      </div>
    </div>
  );
};

export const V1Interview: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  return (
    <Background>
      <GlowEffect color={COLORS.purple} opacity={0.06} size={isPortrait ? 800 : 1200} />

      {/* Hook */}
      <Sequence from={0} durationInFrames={90}>
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
          <FadeIn delay={10}>
            <span
              style={{
                fontSize: isPortrait ? 36 : 42,
                fontWeight: 300,
                color: COLORS.text,
                fontFamily: "Inter, -apple-system, sans-serif",
                lineHeight: 1.4,
              }}
            >
              Your app starts with{" "}
              <span style={{ color: COLORS.purple, fontWeight: 600 }}>
                a conversation
              </span>
            </span>
          </FadeIn>
        </div>
      </Sequence>

      {/* Chat interface */}
      <Sequence from={60} durationInFrames={600}>
        <div
          style={{
            position: "absolute",
            top: isPortrait ? "25%" : "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "85%",
            maxWidth: 600,
          }}
        >
          {/* Chat window */}
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: 20,
              minHeight: 350,
            }}
          >
            <ChatBubble
              text="I want to build a dog walking marketplace for Dallas"
              isUser={true}
              startFrame={60}
              typeSpeed={1.5}
            />
            <ChatBubble
              text="Great idea! Let me understand your vision. Who's your target audience — dog owners looking for walkers, or walkers looking for clients?"
              isUser={false}
              startFrame={180}
              typeSpeed={1}
            />
            <ChatBubble
              text="Both! Owners post their dogs and walkers can browse and book"
              isUser={true}
              startFrame={330}
              typeSpeed={1.5}
            />
            <ChatBubble
              text="Got it — a two-sided marketplace. Should walkers set their own rates, or do you want standard pricing? Also, do you need real-time GPS tracking during walks?"
              isUser={false}
              startFrame={420}
              typeSpeed={1}
            />
          </div>
        </div>
      </Sequence>

      {/* "No forms. No specs. Just talk." */}
      <Sequence from={540} durationInFrames={120}>
        <div
          style={{
            position: "absolute",
            bottom: isPortrait ? "25%" : "20%",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <FadeIn delay={0}>
            <span
              style={{
                fontSize: isPortrait ? 28 : 34,
                fontWeight: 500,
                color: COLORS.dimText,
                fontFamily: "Inter, -apple-system, sans-serif",
              }}
            >
              No forms. No specs.{" "}
              <span style={{ color: COLORS.text, fontWeight: 700 }}>
                Just talk.
              </span>
            </span>
          </FadeIn>
        </div>
      </Sequence>

      {/* Logo + Tagline */}
      <Sequence from={750} durationInFrames={150}>
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

      <Sequence from={830} durationInFrames={70}>
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
