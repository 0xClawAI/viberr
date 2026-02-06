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
  PulsingDot,
  ViberrLogo,
  Tagline,
  FadeIn,
  COLORS,
} from "../components/shared";

// V2: The Build — 30 seconds @ 30fps = 900 frames
// 0-60: Hook: "Watch it happen"
// 60-120: Empty kanban appears
// 120-450: Tasks flow from todo → in_progress → done (animated)
// 450-540: Phase tabs advance
// 540-630: Progress bar fills
// 630-720: "Real-time. Transparent. Autonomous."
// 720-850: Logo
// 850-900: Tagline

interface TaskItem {
  id: string;
  label: string;
  moveToProgress: number;
  moveToDone: number;
}

const TASKS: TaskItem[] = [
  { id: "t1", label: "Project Setup", moveToProgress: 20, moveToDone: 60 },
  { id: "t2", label: "Auth System", moveToProgress: 40, moveToDone: 100 },
  { id: "t3", label: "Landing Page", moveToProgress: 70, moveToDone: 140 },
  { id: "t4", label: "Walker Profiles", moveToProgress: 100, moveToDone: 180 },
  { id: "t5", label: "Booking Flow", moveToProgress: 140, moveToDone: 220 },
  { id: "t6", label: "Payments", moveToProgress: 180, moveToDone: 260 },
  { id: "t7", label: "Reviews", moveToProgress: 220, moveToDone: 300 },
  { id: "t8", label: "Notifications", moveToProgress: 260, moveToDone: 330 },
];

const KanbanBoard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const getTaskColumn = (task: TaskItem): "todo" | "progress" | "done" => {
    if (frame >= task.moveToDone) return "done";
    if (frame >= task.moveToProgress) return "progress";
    return "todo";
  };

  const columns = {
    todo: TASKS.filter((t) => getTaskColumn(t) === "todo"),
    progress: TASKS.filter((t) => getTaskColumn(t) === "progress"),
    done: TASKS.filter((t) => getTaskColumn(t) === "done"),
  };

  const columnStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: COLORS.card,
    borderRadius: 12,
    padding: 12,
    border: `1px solid ${COLORS.border}`,
  };

  const headerStyle = (color: string): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 700,
    color,
    fontFamily: "Inter, sans-serif",
    marginBottom: 10,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  });

  const renderTask = (task: TaskItem, col: "todo" | "progress" | "done") => {
    const moveFrame = col === "done" ? task.moveToDone : col === "progress" ? task.moveToProgress : 0;
    const anim = spring({
      frame: Math.max(0, frame - moveFrame),
      fps,
      config: { damping: 15, stiffness: 120 },
    });

    return (
      <div
        key={task.id + col}
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: "8px 10px",
          marginBottom: 6,
          fontSize: 13,
          fontFamily: "Inter, sans-serif",
          color: col === "done" ? COLORS.green : COLORS.text,
          opacity: anim,
          transform: `translateY(${interpolate(anim, [0, 1], [10, 0])}px)`,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {col === "done" && <span style={{ color: COLORS.green }}>✓</span>}
        {col === "progress" && (
          <span style={{ color: COLORS.amber }}>●</span>
        )}
        <span style={{ textDecoration: col === "done" ? "line-through" : "none", opacity: col === "done" ? 0.7 : 1 }}>
          {task.label}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        width: "90%",
        maxWidth: 700,
      }}
    >
      <div style={columnStyle}>
        <div style={headerStyle(COLORS.dimText)}>
          Todo ({columns.todo.length})
        </div>
        {columns.todo.map((t) => renderTask(t, "todo"))}
      </div>
      <div style={columnStyle}>
        <div style={headerStyle(COLORS.amber)}>
          In Progress ({columns.progress.length})
        </div>
        {columns.progress.map((t) => renderTask(t, "progress"))}
      </div>
      <div style={columnStyle}>
        <div style={headerStyle(COLORS.green)}>
          Done ({columns.done.length})
        </div>
        {columns.done.map((t) => renderTask(t, "done"))}
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame - startFrame, [0, 60], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        width: "80%",
        maxWidth: 500,
        height: 8,
        background: COLORS.border,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.purple})`,
          borderRadius: 4,
          transition: "width 0.1s",
        }}
      />
    </div>
  );
};

export const V2Build: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  return (
    <Background>
      <GlowEffect color={COLORS.green} opacity={0.05} size={isPortrait ? 900 : 1200} />

      {/* Hook */}
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
                fontSize: isPortrait ? 42 : 48,
                fontWeight: 600,
                color: COLORS.text,
                fontFamily: "Inter, -apple-system, sans-serif",
              }}
            >
              Watch it{" "}
              <span style={{ color: COLORS.green }}>happen</span>
            </span>
          </FadeIn>
        </div>
      </Sequence>

      {/* Kanban board */}
      <Sequence from={60} durationInFrames={480}>
        <div
          style={{
            position: "absolute",
            top: isPortrait ? "15%" : "12%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PulsingDot color={COLORS.green} size={10} />
            <span
              style={{
                color: COLORS.green,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Live
            </span>
          </div>

          <KanbanBoard />

          {/* Progress bar */}
          <Sequence from={300}>
            <ProgressBar startFrame={0} />
          </Sequence>
        </div>
      </Sequence>

      {/* "Real-time. Transparent. Autonomous." */}
      <Sequence from={630} durationInFrames={90}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            width: "85%",
          }}
        >
          <FadeIn delay={0}>
            <span
              style={{
                fontSize: isPortrait ? 30 : 36,
                fontWeight: 500,
                color: COLORS.text,
                fontFamily: "Inter, -apple-system, sans-serif",
                lineHeight: 1.6,
              }}
            >
              Real-time. Transparent.{"\n"}
              <span style={{ color: COLORS.green, fontWeight: 700 }}>
                Autonomous.
              </span>
            </span>
          </FadeIn>
        </div>
      </Sequence>

      {/* Logo + Tagline */}
      <Sequence from={720} durationInFrames={180}>
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

      <Sequence from={800} durationInFrames={100}>
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
