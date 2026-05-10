"use client";
import { useCallback, useLayoutEffect, useRef } from "react";

type Pos = { top: number; left: number };

export function useFlipList() {
  const refs = useRef<Map<string, HTMLElement>>(new Map());
  const prevPositions = useRef<Map<string, Pos>>(new Map());
  const running = useRef<Map<string, Animation>>(new Map());

  useLayoutEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const next = new Map<string, Pos>();
    refs.current.forEach((el, id) => {
      const pos: Pos = { top: el.offsetTop, left: el.offsetLeft };
      next.set(id, pos);
      const old = prevPositions.current.get(id);
      if (!old || reduced) return;
      const dy = old.top - pos.top;
      const dx = old.left - pos.left;
      if (Math.abs(dy) < 1 && Math.abs(dx) < 1) return;
      running.current.get(id)?.cancel();
      const anim = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 380,
          easing: "cubic-bezier(0.32, 0.72, 0, 1)",
          fill: "none",
        }
      );
      running.current.set(id, anim);
      anim.onfinish = () => {
        if (running.current.get(id) === anim) running.current.delete(id);
      };
      anim.oncancel = () => {
        if (running.current.get(id) === anim) running.current.delete(id);
      };
    });
    prevPositions.current = next;
  });

  const register = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) {
        refs.current.set(id, el);
      } else {
        refs.current.delete(id);
        prevPositions.current.delete(id);
        running.current.get(id)?.cancel();
        running.current.delete(id);
      }
    },
    []
  );

  return register;
}
