"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

/**
 * Measures the scroll viewport, keeping the tallest value seen per layout.
 *
 * Rows stretch to fill the space, so the grid needs to know how much there is.
 * The measurement is kept per `key`, a string of everything that changes the
 * layout, because the container briefly reports a smaller height while it is
 * being laid out, and taking the smaller number would make the rows twitch.
 *
 * The key must include every input that affects density, row height included:
 * leaving one out means a density change silently reuses a stale measurement.
 */
export function useAgendaViewportHeight(
  scrollRef: MutableRefObject<HTMLDivElement | null>,
  key: string
): number {
  const stable = useRef<{ key: string; height: number }>({ key: "", height: 0 });
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const measured = Math.floor(scrollEl.getBoundingClientRect().height);
      if (measured <= 0) return;

      const previous = stable.current;
      const next = previous.key === key ? Math.max(previous.height, measured) : measured;

      stable.current = { key, height: next };
      setHeight((current) => (current === next ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [key, scrollRef]);

  return height;
}
