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
  WandSparkles,
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

  // Sentiment border styling for highlighted mode, tied to the app's own status tokens.
  const highlightedBorderCls =
    item.sentiment === "negative"
      ? "border-[var(--viz-negative)]/30 shadow-[0_2px_8px_rgba(227,73,72,0.06)]"
      : item.sentiment === "positive"
        ? "border-[var(--status-good)]/30 shadow-[0_2px_8px_rgba(12,163,12,0.06)]"
        : "border-[var(--status-warning)]/30 shadow-[0_2px_8px_rgba(250,178,25,0.06)]";

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
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-mist bg-white"
            aria-hidden="true"
          >
            <ChannelIcon className="size-3.5 text-ink" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate leading-tight">
              {item.department}
            </p>
            <p className="text-[11px] text-pewter leading-tight mt-0.5">
              {CHANNEL_LABELS[item.channel]} · anonymous
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
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--viz-negative)]/30 bg-[var(--viz-negative)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--viz-negative)]">
              <ShieldAlert className="size-3" aria-hidden="true" />
              Risk signal
            </span>
          ) : item.sentiment === "positive" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-good)]/30 bg-[var(--status-good)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--status-good)]">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Positive
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#8a6412]">
              <AlertTriangle className="size-3" aria-hidden="true" />
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
              ? "bg-[var(--viz-negative)]/15 text-[var(--viz-negative)] border-b border-[var(--viz-negative)]/40"
              : seg.type === "positive"
                ? "bg-[var(--status-good)]/15 text-[var(--status-good)] border-b border-[var(--status-good)]/40"
                : "bg-[var(--status-warning)]/20 text-[#8a6412] border-b border-[var(--status-warning)]/50";

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
        {mode === "highlighted" && <span className="text-[10px] text-cobalt">Classified by Vocalyze</span>}
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

  // Respect prefers-reduced-motion: don't start the auto-sweep at all.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setIsAutoPlaying(false);
  }, []);

  // References for direct hardware-accelerated style mutation without React re-renders
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderLineRef = useRef<HTMLDivElement>(null);
  const overlayLayerRef = useRef<HTMLDivElement>(null);

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
          <div className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[var(--viz-negative)]" aria-hidden="true" />
            <span className="text-ink font-medium">Risk</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[var(--status-warning)]" aria-hidden="true" />
            <span className="text-ink font-medium">Worth a look</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[var(--status-good)]" aria-hidden="true" />
            <span className="text-ink font-medium">Positive</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        {/* Floating Side Indicators: Left = understood by Vocalyze, Right = as typed */}
        <div className="pointer-events-none absolute top-3 left-4 sm:left-6 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs backdrop-blur bg-cobalt/10 border border-cobalt/30 text-cobalt">
            <WandSparkles className="size-3" aria-hidden="true" />
            Understood by Vocalyze
          </span>
        </div>

        <div className="pointer-events-none absolute top-3 right-4 sm:right-6 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs backdrop-blur bg-paper/95 border border-edge text-graphite">
            As typed
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
      <p className="mt-3 text-xs text-pewter px-1">Drag the handle, or use the arrow keys, to compare the two sides.</p>
    </div>
  );
}

/**
 * Full Landing Page Section: AI Feedback Intelligence.
 */
export function FeedbackIntelligence() {
  return (
    <section id="intelligence" className="relative scroll-mt-20 overflow-hidden py-20 lg:py-28">
      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-[640px]">
          <p className="eyebrow">Under the hood</p>
          <h2 className="mt-3 text-[34px] leading-[1.08] font-semibold tracking-[-1.2px] text-obsidian sm:text-[46px] lg:text-heading">
            A sentence in, a decision out
          </h2>
          <p className="mt-5 text-subheading text-graphite leading-relaxed">
            Someone types, speaks, or writes a note by hand. Vocalyze reads the same words HR
            would, then marks what actually matters: a risk to flag, a theme to track, a thing
            worth celebrating. Drag the slider below to see it happen to real submissions from
            this demo.
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
