"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GripVertical,
  Mic,
  Pause,
  Play,
  ScanText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  TWO_ROW_FEEDBACK_ITEMS,
  type FeedbackCardData,
  type HighlightSpan,
  type HighlightType,
  type PretokenizedCard,
} from "@/lib/feedback-comparison-data";

export type { HighlightType, HighlightSpan, FeedbackCardData };

const CHANNEL_ICONS = {
  text: FileText,
  voice: Mic,
  ocr: ScanText,
} as const;

const CHANNEL_LABELS = {
  text: "Written feedback",
  voice: "Voice note",
  ocr: "Handwritten note",
} as const;

/**
 * Individual Feedback Card Component (Memoized).
 * Supports "raw" and "highlighted" modes.
 *
 * CRITICAL ALIGNMENT GUARANTEE:
 * Both modes share identical DOM structure, padding, margins, line-height,
 * and font properties down to the character level to prevent any jump or shift.
 */
const FeedbackCard = memo(function FeedbackCard({
  item,
  mode,
}: {
  item: PretokenizedCard;
  mode: "raw" | "highlighted";
}) {
  const ChannelIcon = CHANNEL_ICONS[item.channel];

  // Subtle sentiment border styling for highlighted mode
  const highlightedBorderCls =
    item.sentiment === "negative"
      ? "border-red-200/90 shadow-[0_2px_8px_rgba(227,73,72,0.06)]"
      : item.sentiment === "positive"
        ? "border-emerald-200/90 shadow-[0_2px_8px_rgba(12,163,12,0.06)]"
        : "border-amber-200/90 shadow-[0_2px_8px_rgba(250,178,25,0.06)]";

  return (
    <article
      className={cn(
        "rounded-cards bg-paper p-4 sm:p-5 transition-shadow duration-200 flex flex-col justify-between h-full",
        mode === "raw"
          ? "border border-edge/80 shadow-field"
          : cn("border", highlightedBorderCls),
        item.tiltClass,
        item.responsiveVisibility
      )}
    >
      {/* Card Header: identical height & spacing in both modes */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-mist/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "size-8 shrink-0 rounded-full border flex items-center justify-center font-mono text-xs font-semibold select-none",
              item.authorBg
            )}
            aria-hidden="true"
          >
            {item.authorInitials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate leading-tight">
              {item.department}
            </p>
            <p className="text-[11px] text-pewter flex items-center gap-1 leading-tight mt-0.5">
              <ChannelIcon className="size-3 text-pewter" aria-hidden="true" />
              <span>{CHANNEL_LABELS[item.channel]}</span>
            </p>
          </div>
        </div>

        {/* Status Tag: identical container dimensions across modes */}
        <div className="shrink-0">
          {mode === "raw" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-mist bg-white px-2.5 py-0.5 text-[11px] font-mono text-pewter">
              Raw entry
            </span>
          ) : item.sentiment === "negative" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200/80 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-[#b91c1c]">
              <ShieldAlert className="size-3 text-[#d03b3b]" aria-hidden="true" />
              Risk signal
            </span>
          ) : item.sentiment === "positive" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-[#15803d]">
              <CheckCircle2 className="size-3 text-[#0ca30c]" aria-hidden="true" />
              Positive
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-[#b45309]">
              <AlertTriangle className="size-3 text-[#fab219]" aria-hidden="true" />
              Attention
            </span>
          )}
        </div>
      </div>

      {/* Card Body: Pre-tokenized segments rendered with subpixel alignment */}
      <p className="mt-3 text-[14px] sm:text-[14.5px] leading-relaxed text-ink font-normal flex-1">
        {item.segments.map((seg, idx) => {
          if (!seg.isHighlight) {
            return (
              <span key={idx} className="px-1 -mx-1 text-ink">
                {seg.text}
              </span>
            );
          }

          if (mode === "raw") {
            return (
              <span key={idx} className="px-1 -mx-1 text-ink bg-transparent font-normal">
                {seg.text}
              </span>
            );
          }

          const highlightStyles =
            seg.type === "negative"
              ? "bg-red-500/15 text-[#b91c1c] border-b border-red-300/60"
              : seg.type === "positive"
                ? "bg-emerald-500/15 text-[#15803d] border-b border-emerald-300/60"
                : "bg-amber-400/20 text-[#b45309] border-b border-amber-300/60";

          return (
            <mark
              key={idx}
              className={cn(
                "rounded-[4px] px-1 -mx-1 inline font-medium transition-colors duration-150",
                highlightStyles
              )}
              title={seg.label ?? `${seg.type} signal`}
            >
              {seg.text}
            </mark>
          );
        })}
      </p>

      {/* Card Footer: Theme meta */}
      <div className="mt-3.5 pt-2.5 border-t border-mist/50 flex items-center justify-between text-[11px]">
        <span className="text-pewter font-medium">{item.theme}</span>
        {mode === "highlighted" && (
          <span className="font-mono text-[10px] text-cobalt flex items-center gap-1">
            <Sparkles className="size-2.5 text-cobalt" aria-hidden="true" />
            AI classified
          </span>
        )}
      </div>
    </article>
  );
});

/**
 * Grid rendering cards strictly constrained to exactly 2 rows:
 * - Mobile: 1 col x 2 items = 2 rows
 * - Tablet: 2 cols x 2 items = 2 rows
 * - Desktop: 3 cols x 2 items = 2 rows
 */
const CardsGrid = memo(function CardsGrid({
  items,
  mode,
}: {
  items: PretokenizedCard[];
  mode: "raw" | "highlighted";
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 p-4 sm:p-6 lg:p-8">
      {items.map((item) => (
        <FeedbackCard key={item.id} item={item} mode={mode} />
      ))}
    </div>
  );
});

const SWEEP_MIN = 12;
const SWEEP_MAX = 88;
const SWEEP_DURATION_MS = 6000;

/**
 * Computes cosine oscillation phase corresponding to a given position.
 * Guarantees zero velocity discontinuities or position jumps.
 */
function computePhaseFromPosition(pos: number): number {
  const clamped = Math.max(SWEEP_MIN, Math.min(SWEEP_MAX, pos));
  const progress = (clamped - SWEEP_MIN) / (SWEEP_MAX - SWEEP_MIN);
  const cosVal = Math.max(-1, Math.min(1, 1 - 2 * progress));
  return Math.acos(cosVal);
}

/**
 * High-Performance Interactive Comparison Slider Component.
 * - Direction: Left-to-Right scanning (AI Understood on Left, Raw Feedback on Right).
 * - Exactly 2 rows displayed across all devices.
 * - Hardware-accelerated continuous smooth animation via requestAnimationFrame.
 * - Zero React re-renders during animation for minimum latency and maximum FPS.
 */
export function FeedbackComparisonSlider({
  items = TWO_ROW_FEEDBACK_ITEMS,
  initialPosition = 18,
}: {
  items?: PretokenizedCard[];
  initialPosition?: number;
}) {
  const [sliderPos, setSliderPos] = useState(initialPosition);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // References for direct hardware-accelerated style mutation without React re-renders
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderLineRef = useRef<HTMLDivElement>(null);
  const overlayLayerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  const posRef = useRef(initialPosition);
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef(computePhaseFromPosition(initialPosition));

  // Direct DOM application helper (bypasses React state overhead for 60/120fps smoothness)
  const applyPositionToDOM = useCallback((pos: number) => {
    posRef.current = pos;
    const clampedPos = Math.max(0, Math.min(100, pos));

    if (sliderLineRef.current) {
      sliderLineRef.current.style.left = `${clampedPos}%`;
    }
    // Left-to-right reveal: AI layer is on the left, clipped at (100 - clampedPos)% from the right
    if (overlayLayerRef.current) {
      overlayLayerRef.current.style.clipPath = `inset(0 ${100 - clampedPos}% 0 0)`;
      (overlayLayerRef.current.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath = `inset(0 ${100 - clampedPos}% 0 0)`;
    }
    if (readoutRef.current) {
      readoutRef.current.textContent = `${Math.round(clampedPos)}%`;
    }
  }, []);

  // Continuous smooth left-to-right scanning animation
  useEffect(() => {
    if (!isAutoPlaying) return;

    let lastTime = performance.now();

    const tick = (now: number) => {
      // Pause only while user is actively dragging the slider
      if (isDraggingRef.current) {
        lastTime = now;
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const delta = Math.min(now - lastTime, 100);
      lastTime = now;

      // Smooth cosine oscillation (infinitely smooth velocity, zero sudden jumps at edges)
      phaseRef.current += (delta / SWEEP_DURATION_MS) * Math.PI;
      const progress = 0.5 - 0.5 * Math.cos(phaseRef.current);
      const newPos = SWEEP_MIN + progress * (SWEEP_MAX - SWEEP_MIN);

      applyPositionToDOM(newPos);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoPlaying, applyPositionToDOM]);

  // Pointer event handlers for instant manual drag control
  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relativeX = clientX - rect.left;
      const clampedX = Math.max(0, Math.min(rect.width, relativeX));
      const pct = (clampedX / rect.width) * 100;
      applyPositionToDOM(pct);
    },
    [applyPositionToDOM]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe release
      }
      setSliderPos(posRef.current);
      phaseRef.current = computePhaseFromPosition(posRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let nextPos = posRef.current;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextPos = Math.max(0, nextPos - (e.shiftKey ? 10 : 2));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextPos = Math.min(100, nextPos + (e.shiftKey ? 10 : 2));
    } else if (e.key === "Home") {
      e.preventDefault();
      nextPos = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextPos = 100;
    }
    applyPositionToDOM(nextPos);
    setSliderPos(nextPos);
    phaseRef.current = computePhaseFromPosition(nextPos);
  };

  const setPreset = (targetPos: number) => {
    applyPositionToDOM(targetPos);
    setSliderPos(targetPos);
    setIsAutoPlaying(false);
    phaseRef.current = computePhaseFromPosition(targetPos);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying((prev) => {
      if (!prev) {
        phaseRef.current = computePhaseFromPosition(posRef.current);
      }
      return !prev;
    });
  };

  return (
    <div className="w-full">
      {/* Visual Controls & Legend Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5 rounded-cards border border-edge/80 bg-paper/90 px-4 py-3 shadow-field sm:px-6">
        {/* Semantic Color Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="font-mono uppercase tracking-wider text-pewter font-medium mr-1">
            Semantic Highlights:
          </span>
          <div className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500 ring-2 ring-red-200/80" aria-hidden="true" />
            <span className="text-ink font-medium">Negative / Risk</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200/80" aria-hidden="true" />
            <span className="text-ink font-medium">Attention / Concerns</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200/80" aria-hidden="true" />
            <span className="text-ink font-medium">Positive / Strengths</span>
          </div>
        </div>

        {/* Animation Play/Pause & Snap Presets */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center rounded-navlinks border border-mist bg-mist/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPreset(0)}
              className="rounded-full px-2.5 py-1 font-medium text-pewter hover:text-ink transition-colors cursor-pointer"
            >
              Raw (0%)
            </button>
            <button
              type="button"
              onClick={() => setPreset(50)}
              className="rounded-full px-2.5 py-1 font-medium text-pewter hover:text-ink transition-colors cursor-pointer"
            >
              50 / 50
            </button>
            <button
              type="button"
              onClick={() => setPreset(100)}
              className="rounded-full px-2.5 py-1 font-medium text-pewter hover:text-ink transition-colors cursor-pointer"
            >
              AI (100%)
            </button>
          </div>

          <button
            type="button"
            onClick={toggleAutoPlay}
            className="inline-flex items-center gap-1.5 rounded-navlinks border border-edge bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-field hover:bg-mist/60 cursor-pointer transition-colors"
            title={isAutoPlaying ? "Pause continuous scan" : "Resume continuous scan"}
            aria-label={isAutoPlaying ? "Pause scanner animation" : "Play scanner animation"}
          >
            {isAutoPlaying ? (
              <>
                <Pause className="size-3 text-cobalt" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3 text-cobalt" aria-hidden="true" />
                <span>Auto-scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Draggable Comparison Stage: Exactly 2 Rows */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "relative w-full overflow-hidden rounded-cards border border-edge bg-mist/30 select-none shadow-screenshot touch-none cursor-ew-resize",
          "contain-paint"
        )}
        style={{ WebkitUserSelect: "none" }}
      >
        {/* Floating Side Indicators: Left = AI Understood, Right = Raw Feedback */}
        <div className="pointer-events-none absolute top-3 left-4 sm:left-6 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs backdrop-blur bg-cobalt/10 border border-cobalt/30 text-cobalt">
            <Sparkles className="size-3 text-cobalt" aria-hidden="true" />
            AI Understood
          </span>
        </div>

        <div className="pointer-events-none absolute top-3 right-4 sm:right-6 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs backdrop-blur bg-paper/95 border border-edge text-graphite">
            Raw Feedback
          </span>
        </div>

        {/* LAYER 1 (Base): Raw Feedback Presentation */}
        <div className="relative w-full pt-10 sm:pt-11 pb-2">
          <CardsGrid items={items} mode="raw" />
        </div>

        {/* LAYER 2 (Overlay): AI-Highlighted Interpretation (Clipped from left to right) */}
        <div
          ref={overlayLayerRef}
          className="absolute inset-0 w-full h-full pointer-events-none pt-10 sm:pt-11 pb-2"
          style={{
            clipPath: `inset(0 ${100 - initialPosition}% 0 0)`,
            WebkitClipPath: `inset(0 ${100 - initialPosition}% 0 0)`,
            willChange: "clip-path",
          }}
          aria-hidden="true"
        >
          <CardsGrid items={items} mode="highlighted" />
        </div>

        {/* DRAGGABLE VERTICAL DIVIDER & HANDLE */}
        <div
          ref={sliderLineRef}
          className="absolute top-0 bottom-0 z-30 flex flex-col items-center pointer-events-none"
          style={{
            left: `${initialPosition}%`,
            willChange: "left",
          }}
        >
          {/* Vertical divider line */}
          <div className="w-[2px] h-full bg-obsidian dark:bg-white shadow-[0_0_8px_rgba(10,13,22,0.35)]" />

          {/* Draggable Capsule Handle */}
          <div
            tabIndex={0}
            role="slider"
            aria-label="Drag slider horizontally to compare raw feedback with AI semantic highlighting"
            aria-valuenow={Math.round(sliderPos)}
            aria-valuemin={0}
            aria-valuemax={100}
            onKeyDown={handleKeyDown}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 pointer-events-auto",
              "w-8 h-16 sm:w-8 sm:h-18 rounded-full bg-obsidian text-paper shadow-screenshot",
              "border-2 border-paper/90 flex flex-col items-center justify-center gap-1",
              "cursor-ew-resize transition-transform duration-100",
              "hover:scale-105 active:scale-105 active:ring-4 active:ring-cobalt/30",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt"
            )}
          >
            {/* Extended invisible touch target for mobile devices */}
            <div className="absolute -inset-4 sm:-inset-6 touch-none cursor-ew-resize" aria-hidden="true" />

            {/* Handle grab icons */}
            <div className="flex items-center text-paper/90" aria-hidden="true">
              <GripVertical className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Helper caption below slider */}
      <div className="mt-3 flex items-center justify-between text-xs text-pewter px-1">
        <span>Continuous left-to-right AI scan (drag or use Arrow keys to control)</span>
        <div className="flex items-center gap-1 font-mono font-medium text-ink tabular-nums">
          <span>Scan:</span>
          <span ref={readoutRef}>{Math.round(initialPosition)}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Full Landing Page Section: AI Feedback Intelligence.
 */
export function FeedbackIntelligence() {
  return (
    <section id="intelligence" className="relative scroll-mt-20 overflow-hidden py-20 lg:py-28">
      {/* Background blueprint grid canvas */}
      <div className="grid-paper grid-paper-fade pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-[820px] text-center">
          <p className="eyebrow">AI Feedback Intelligence</p>
          <h2 className="mt-3 text-[34px] leading-[1.08] font-semibold tracking-[-1.2px] text-obsidian sm:text-[46px] lg:text-heading">
            Analyze large employee feedback data{" "}
            <span className="brush">within seconds</span>
          </h2>
          <p className="mt-5 text-subheading text-graphite leading-relaxed">
            Open-ended employee responses are the goldmine of actionable insights. But the
            employee data are mostly unstructured and impossible to analyze at scale.{" "}
            <strong className="font-semibold text-ink">Vocalyze</strong> understands all your
            employee feedback responses and tells you what matters the most to your employees.
          </p>
        </div>

        {/* Interactive Comparison Visualization — Limited to Exactly 2 Rows */}
        <div className="mt-12 lg:mt-14">
          <FeedbackComparisonSlider />
        </div>
      </div>
    </section>
  );
}
