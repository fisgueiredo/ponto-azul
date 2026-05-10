"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Snap = "min" | "mid" | "max";

const SAFE_BOTTOM_OFFSET = 56;

function snapHeights(): Record<Snap, number> {
  if (typeof window === "undefined") return { min: 64, mid: 280, max: 600 };
  const vh = window.innerHeight;
  return {
    min: 64,
    mid: Math.max(220, Math.min(320, Math.round(vh * 0.35))),
    max: Math.max(360, vh - SAFE_BOTTOM_OFFSET),
  };
}

type Props = {
  defaultSnap?: Snap;
  onHeightChange?: (h: number) => void;
  onSnapChange?: (s: Snap) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export default function BottomSheet({
  defaultSnap = "mid",
  onHeightChange,
  onSnapChange,
  header,
  footer,
  children,
}: Props) {
  const [snap, setSnap] = useState<Snap>(defaultSnap);
  const [height, setHeight] = useState<number>(0);
  const [transitioning, setTransitioning] = useState(true);
  const startYRef = useRef<number | null>(null);
  const startHeightRef = useRef<number>(0);
  const lastReportedRef = useRef<number>(0);

  const reportHeight = useCallback(
    (h: number) => {
      if (Math.abs(h - lastReportedRef.current) < 1) return;
      lastReportedRef.current = h;
      onHeightChange?.(h);
    },
    [onHeightChange]
  );

  useEffect(() => {
    const target = snapHeights()[snap];
    setHeight(target);
    reportHeight(target);
    onSnapChange?.(snap);
  }, [snap, reportHeight, onSnapChange]);

  useEffect(() => {
    const handler = () => {
      const target = snapHeights()[snap];
      setHeight(target);
      reportHeight(target);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [snap, reportHeight]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    setTransitioning(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startYRef.current == null) return;
    const dy = startYRef.current - e.clientY;
    const heights = snapHeights();
    const next = Math.max(
      heights.min,
      Math.min(heights.max, startHeightRef.current + dy)
    );
    setHeight(next);
    reportHeight(next);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startYRef.current == null) return;
    startYRef.current = null;
    setTransitioning(true);
    const heights = snapHeights();
    const candidates: Snap[] = ["min", "mid", "max"];
    let best: Snap = "mid";
    let bestDist = Infinity;
    for (const c of candidates) {
      const d = Math.abs(height - heights[c]);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    setSnap(best);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        background: "var(--card-glass)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTop: "0.5px solid var(--border)",
        boxShadow: "0 -8px 28px rgba(20,30,50,0.08)",
        zIndex: 14,
        transition: transitioning
          ? "height 0.4s cubic-bezier(0.32, 0.72, 0, 1)"
          : "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          padding: "10px 16px 6px",
          touchAction: "none",
          cursor: "grab",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 5,
            borderRadius: 3,
            background: "rgba(0,0,0,0.18)",
            margin: "0 auto",
          }}
        />
        {header && <div style={{ marginTop: 10 }}>{header}</div>}
      </div>
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: snap === "max" ? "auto" : "hidden",
          padding: footer
            ? "0 16px 0"
            : "0 16px calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        {children}
      </div>
      {footer && (
        <div
          style={{
            padding:
              "12px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)",
            background: "var(--card-glass)",
            backdropFilter: "blur(18px) saturate(160%)",
            WebkitBackdropFilter: "blur(18px) saturate(160%)",
            borderTop: "0.5px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
