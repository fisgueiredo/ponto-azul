"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Snap = "min" | "mid" | "max";

function computeSnapHeights(
  vh: number,
  midHeight?: (vh: number) => number
): Record<Snap, number> {
  const max = Math.max(360, Math.round(vh * 0.62));
  const mid = midHeight ? midHeight(vh) : Math.max(240, Math.round(vh * 0.32));
  return {
    min: 64,
    mid: Math.min(mid, max),
    max,
  };
}

function snapHeights(midHeight?: (vh: number) => number): Record<Snap, number> {
  if (typeof window === "undefined") {
    return { min: 64, mid: midHeight?.(800) ?? 260, max: 600 };
  }
  return computeSnapHeights(window.innerHeight, midHeight);
}

type Props = {
  defaultSnap?: Snap;
  midHeight?: (vh: number) => number;
  onHeightChange?: (h: number) => void;
  onSnapChange?: (s: Snap) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  outerStyle?: React.CSSProperties;
  ariaHidden?: boolean;
};

export default function BottomSheet({
  defaultSnap = "mid",
  midHeight,
  onHeightChange,
  onSnapChange,
  outerStyle,
  ariaHidden,
  header,
  footer,
  children,
}: Props) {
  const [snap, setSnap] = useState<Snap>(defaultSnap);
  const [height, setHeight] = useState<number>(0);
  const [transitioning, setTransitioning] = useState(true);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const startHeightRef = useRef<number>(0);
  const lastReportedRef = useRef<number>(0);
  const heightRef = useRef<number>(0);
  const dragRafRef = useRef<number>(0);
  const pendingDragHeightRef = useRef<number | null>(null);
  const cachedSnapHeightsRef = useRef<Record<Snap, number> | null>(null);
  const cachedVhRef = useRef<number>(0);
  const tapMovedRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);

  const getSnapHeights = useCallback((): Record<Snap, number> => {
    if (typeof window === "undefined") {
      return snapHeights(midHeight);
    }
    const vh = window.innerHeight;
    if (cachedSnapHeightsRef.current && cachedVhRef.current === vh) {
      return cachedSnapHeightsRef.current;
    }
    const h = computeSnapHeights(vh, midHeight);
    cachedSnapHeightsRef.current = h;
    cachedVhRef.current = vh;
    return h;
  }, [midHeight]);

  const reportHeight = useCallback(
    (h: number) => {
      if (Math.abs(h - lastReportedRef.current) < 1) return;
      lastReportedRef.current = h;
      onHeightChange?.(h);
    },
    [onHeightChange]
  );

  useEffect(() => {
    const target = getSnapHeights()[snap];
    heightRef.current = target;
    setHeight(target);
    reportHeight(target);
    onSnapChange?.(snap);
  }, [snap, getSnapHeights, reportHeight, onSnapChange]);

  useEffect(() => {
    const handler = () => {
      cachedSnapHeightsRef.current = null;
      const target = getSnapHeights()[snap];
      heightRef.current = target;
      setHeight(target);
      reportHeight(target);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [snap, getSnapHeights, reportHeight]);

  useEffect(() => {
    return () => {
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    startHeightRef.current = heightRef.current || height;
    tapMovedRef.current = false;
    setTransitioning(false);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startYRef.current == null) return;
    const dy = startYRef.current - e.clientY;
    if (Math.abs(dy) > 5) tapMovedRef.current = true;
    const heights = getSnapHeights();
    const next = Math.max(
      heights.min,
      Math.min(heights.max, startHeightRef.current + dy)
    );
    pendingDragHeightRef.current = next;
    if (dragRafRef.current) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = 0;
      const h = pendingDragHeightRef.current;
      if (h == null) return;
      heightRef.current = h;
      setHeight(h);
      reportHeight(h);
    });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startYRef.current == null) return;
    startYRef.current = null;
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = 0;
      const h = pendingDragHeightRef.current;
      if (h != null) {
        heightRef.current = h;
        setHeight(h);
        reportHeight(h);
      }
    }
    pendingDragHeightRef.current = null;
    setTransitioning(true);
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const wasTap = !tapMovedRef.current;
    if (wasTap) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        lastTapTimeRef.current = 0;
        setSnap("mid");
        return;
      }
      lastTapTimeRef.current = now;
    }

    const heights = getSnapHeights();
    const candidates: Snap[] = ["min", "mid", "max"];
    let best: Snap = "mid";
    let bestDist = Infinity;
    for (const c of candidates) {
      const d = Math.abs(heightRef.current - heights[c]);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    setSnap(best);
  };

  return (
    <div
      aria-hidden={ariaHidden}
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
          ? "height var(--dur-slow) var(--ease-spring), transform 0.7s cubic-bezier(0.32, 0.72, 0, 1)"
          : "transform 0.7s cubic-bezier(0.32, 0.72, 0, 1)",
        willChange: dragging ? "height" : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...outerStyle,
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="separator"
        aria-label="Arrastar para redimensionar"
        aria-orientation="horizontal"
        style={{
          padding: "14px 16px 10px",
          minHeight: 44,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "stretch",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: dragging ? 52 : 40,
            height: 5,
            borderRadius: 3,
            background: dragging
              ? "rgba(39,116,174,0.6)"
              : "rgba(0,0,0,0.18)",
            margin: "0 auto",
            transition: "all var(--dur-base) var(--ease-pop)",
          }}
        />
        {header && <div style={{ marginTop: 10 }}>{header}</div>}
      </div>
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: snap === "min" ? "hidden" : "auto",
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
