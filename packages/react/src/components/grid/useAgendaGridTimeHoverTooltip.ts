"use client";

import { useCallback, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { AgendaGridSelectionDragRef, DaySelection, BreakWindow } from "@zigoschedule/scheduler-engine";
import { isMinuteInsideBreakWindow } from "@zigoschedule/scheduler-engine";
import { getAgendaSelectionExclusiveRange } from "@zigoschedule/scheduler-engine";
import { formatAgendaTime, formatAgendaTimeRange } from "@zigoschedule/scheduler-core";
import { useAgendaLocale, useAgendaMessages } from "../../config/AgendaConfigContext";

type ShowTimeHoverTooltipOptions = {
  clientX: number;
  clientY: number;
  colKey: string;
  minute: number;
  colStartDay: number;
  colEndDay: number;
  pausaIntervalo: BreakWindow | null;
  outsideBusinessHoursLabel?: string;
};

type UseAgendaGridTimeHoverTooltipOptions = {
  scrollRef: RefObject<HTMLDivElement | null>;
  dayDragRef: MutableRefObject<AgendaGridSelectionDragRef>;
  pendingSelectionRef: MutableRefObject<DaySelection | null>;
  endDay: number;
  gridMin: number;
};

export function useAgendaGridTimeHoverTooltip({
  scrollRef,
  dayDragRef,
  pendingSelectionRef,
  endDay,
  gridMin,
}: UseAgendaGridTimeHoverTooltipOptions) {
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();
  const timeHoverTooltipRef = useRef<HTMLDivElement | null>(null);

  const hideTimeHoverTooltip = useCallback(() => {
    const tooltipEl = timeHoverTooltipRef.current;
    if (!tooltipEl) return;

    tooltipEl.style.display = "none";
  }, []);

  const showTimeHoverTooltip = useCallback(({
    clientX,
    clientY,
    colKey,
    minute,
    colStartDay,
    colEndDay,
    pausaIntervalo,
    outsideBusinessHoursLabel,
  }: ShowTimeHoverTooltipOptions) => {
    const tooltipEl = timeHoverTooltipRef.current;
    const scrollEl = scrollRef.current;
    if (!tooltipEl || !scrollEl) return;

    const drag = dayDragRef.current;
    const selection = pendingSelectionRef.current;
    const isActiveSelectionDrag = Boolean(
      drag?.active &&
      drag.selectionStarted &&
      drag.colKey === colKey &&
      selection,
    );

    let label = formatAgendaTime(minute, locale);
    if (isActiveSelectionDrag && selection) {
      const range = getAgendaSelectionExclusiveRange({
        startMinute: selection.start,
        endMinute: minute,
        maxMinute: endDay,
        snapMinutes: gridMin,
        isDrag: true,
      });
      label = formatAgendaTimeRange(range.startMinute, range.endMinute, locale);
    } else if (minute < colStartDay || minute > colEndDay) {
      label = `${formatAgendaTime(minute, locale)} - ${outsideBusinessHoursLabel ?? messages.outsideBusinessHoursShort}`;
    } else if (isMinuteInsideBreakWindow(minute, pausaIntervalo)) {
      label = `${formatAgendaTime(minute, locale)} · ${messages.lunchBreak}`;
    }

    const scrollRect = scrollEl.getBoundingClientRect();
    const left = Math.max(8, clientX - scrollRect.left + scrollEl.scrollLeft + 12);
    const top = Math.max(8, clientY - scrollRect.top + scrollEl.scrollTop - 34);

    tooltipEl.textContent = label;
    tooltipEl.style.display = "block";
    tooltipEl.style.transform = `translate(${left}px, ${top}px)`;
  }, [dayDragRef, endDay, gridMin, locale, messages.lunchBreak, messages.outsideBusinessHoursShort, pendingSelectionRef, scrollRef]);

  return {
    timeHoverTooltipRef,
    hideTimeHoverTooltip,
    showTimeHoverTooltip,
  };
}
