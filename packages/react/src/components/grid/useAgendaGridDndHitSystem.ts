"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import { minuteFromAgendaGridY } from "@zigoschedule/scheduler-engine";
import {
  type AgendaHitSystem,
  buildAgendaHitSystem,
  queryAgendaHit,
} from "@zigoschedule/scheduler-engine";
import type { HitTestResult } from "@zigoschedule/scheduler-interaction";

type UseAgendaGridDndHitSystemOptions = {
  dayColRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  scrollRef: RefObject<HTMLDivElement | null>;
  startDay: number;
  endDay: number;
  axisEndDay: number;
  snapMinutes: number;
};

export function useAgendaGridDndHitSystem({
  dayColRefs,
  scrollRef,
  startDay,
  endDay,
  axisEndDay,
  snapMinutes,
}: UseAgendaGridDndHitSystemOptions) {
  const dndHitCacheRef = useRef<AgendaHitSystem | null>(null);
  const activeDropColKeyRef = useRef<string | null>(null);

  const buildDndHitCache = useCallback(
    () => buildAgendaHitSystem(Array.from(dayColRefs.current.values()), scrollRef.current),
    [dayColRefs, scrollRef],
  );

  const prepareDndHits = useCallback(() => {
    dndHitCacheRef.current = buildDndHitCache();
  }, [buildDndHitCache]);

  const releaseDndHits = useCallback(() => {
    dndHitCacheRef.current = null;
  }, []);

  const findDropColumnEntry = useCallback(
    (dayKey: string, profId: string | null): { key: string; el: HTMLDivElement } | null => {
      const expectedProfId = profId || "";
      const exactKey = `${dayKey}-${expectedProfId}`;
      const exactEl = dayColRefs.current.get(exactKey);
      if (exactEl) return { key: exactKey, el: exactEl };

      const fallback = Array.from(dayColRefs.current.entries()).find(
        ([, el]) => el.dataset.dndDay === dayKey && (el.dataset.dndProf || "") === expectedProfId,
      ) ?? Array.from(dayColRefs.current.entries()).find(
        ([, el]) => el.dataset.dndDay === dayKey && !(el.dataset.dndProf || ""),
      );

      return fallback ? { key: fallback[0], el: fallback[1] } : null;
    },
    [dayColRefs],
  );

  const clearDropColumnHighlight = useCallback(() => {
    const activeKey = activeDropColKeyRef.current;
    if (activeKey) {
      const activeEl = dayColRefs.current.get(activeKey);
      if (activeEl) activeEl.style.backgroundColor = "";
    }
    activeDropColKeyRef.current = null;
  }, [dayColRefs]);

  const updateDropColumnHighlight = useCallback(
    (hit: HitTestResult | null, blocked: boolean) => {
      const nextEntry = hit ? findDropColumnEntry(hit.dayKey, hit.profId) : null;
      const activeKey = activeDropColKeyRef.current;

      if (activeKey && (!nextEntry || nextEntry.key !== activeKey)) {
        const activeEl = dayColRefs.current.get(activeKey);
        if (activeEl) activeEl.style.backgroundColor = "";
      }

      if (!nextEntry) {
        activeDropColKeyRef.current = null;
        return;
      }

      nextEntry.el.style.backgroundColor = blocked ? "#FFF1F2" : "#EFF6FF";
      activeDropColKeyRef.current = nextEntry.key;
    },
    [dayColRefs, findDropColumnEntry],
  );

  useEffect(() => {
    return () => {
      clearDropColumnHighlight();
    };
  }, [clearDropColumnHighlight]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): HitTestResult | null => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return null;

      let cache = dndHitCacheRef.current;
      if (!cache) {
        cache = buildDndHitCache();
        dndHitCacheRef.current = cache;
      }

      const hit = queryAgendaHit(cache, scrollEl, clientX, clientY, snapMinutes, (y, height) => {
        return minuteFromAgendaGridY({
          y,
          height,
          startMinute: startDay,
          endMinute: axisEndDay,
          snapMinutes,
          maxMinute: Math.max(startDay, endDay - snapMinutes),
        });
      }, {
        minMinute: startDay,
        maxMinute: Math.max(startDay, endDay - snapMinutes),
        originMinute: startDay,
      });
      return hit ? { dayKey: hit.dayKey, profId: hit.resourceId, minute: hit.minute } : null;
    },
    [axisEndDay, buildDndHitCache, endDay, scrollRef, snapMinutes, startDay],
  );

  return {
    prepareDndHits,
    releaseDndHits,
    hitTest,
    updateDropColumnHighlight,
    clearDropColumnHighlight,
  };
}
