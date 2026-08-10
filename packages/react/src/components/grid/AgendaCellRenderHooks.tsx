"use client";

import { memo, useEffect, useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import type {
  AgendaDayCellRenderArg,
  AgendaResolvedOptions,
  AgendaSlotRenderArg,
  AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import {
  createAgendaDayCellRenderArg,
  createAgendaSlotRenderArg,
  dispatchAgendaDayCellDidMount,
  dispatchAgendaDayCellWillUnmount,
  dispatchAgendaSlotLabelDidMount,
  dispatchAgendaSlotLabelWillUnmount,
  dispatchAgendaSlotLaneDidMount,
  dispatchAgendaSlotLaneWillUnmount,
  resolveAgendaDayCellClassNames,
  resolveAgendaDayCellContent,
  resolveAgendaSlotLabelClassNames,
  resolveAgendaSlotLabelContent,
  resolveAgendaSlotLaneClassNames,
  resolveAgendaSlotLaneContent,
} from "@zigoschedule/scheduler-engine";

type UseAgendaDayCellRenderInput<ElementType extends HTMLElement> = {
  options: AgendaResolvedOptions;
  date: Date;
  dateStr: string;
  dayNumberText: string;
  view: AgendaViewId;
  resourceId?: string | null;
  isToday?: boolean;
  isPast?: boolean;
  isFuture?: boolean;
  isOther?: boolean;
  isDisabled?: boolean;
  isWeekend?: boolean;
  eventCount?: number;
  appointmentCount?: number;
  blockCount?: number;
  elementRef?: RefObject<ElementType | null>;
  onCallbackError?: (error: Error | null) => void;
};

export const useAgendaDayCellRender = <ElementType extends HTMLElement>({
  options,
  date,
  dateStr,
  dayNumberText,
  view,
  resourceId = null,
  isToday = false,
  isPast = false,
  isFuture = false,
  isOther = false,
  isDisabled = false,
  isWeekend = false,
  eventCount = 0,
  appointmentCount = 0,
  blockCount = 0,
  elementRef,
  onCallbackError,
}: UseAgendaDayCellRenderInput<ElementType>) => {
  const renderArg = useMemo(
    () =>
      createAgendaDayCellRenderArg({
        date,
        dateStr,
        dayNumberText,
        view,
        resourceId,
        isToday,
        isPast,
        isFuture,
        isOther,
        isDisabled,
        isWeekend,
        eventCount,
        appointmentCount,
        blockCount,
      }),
    [
      appointmentCount,
      blockCount,
      date,
      dateStr,
      dayNumberText,
      eventCount,
      isDisabled,
      isFuture,
      isOther,
      isPast,
      isToday,
      isWeekend,
      resourceId,
      view,
    ],
  );

  const optionClassName = useMemo(
    () => resolveAgendaDayCellClassNames(options.dayCellClassNames, renderArg).join(" "),
    [options.dayCellClassNames, renderArg],
  );

  useEffect(() => {
    const el = elementRef?.current ?? null;
    if (!el) return;

    if (options.dayCellDidMount) {
      const result = dispatchAgendaDayCellDidMount({ options, arg: renderArg, el });
      onCallbackError?.(result.error);
    }

    return () => {
      if (!options.dayCellWillUnmount) return;
      const result = dispatchAgendaDayCellWillUnmount({ options, arg: renderArg, el });
      onCallbackError?.(result.error);
    };
  }, [elementRef, onCallbackError, options, renderArg]);

  return {
    optionClassName,
    renderArg,
  };
};

type UseAgendaSlotRenderInput<ElementType extends HTMLElement> = {
  options: AgendaResolvedOptions;
  date?: Date | null;
  dateStr?: string | null;
  timeText: string;
  minute: number;
  view: AgendaViewId;
  resourceId?: string | null;
  isMajor?: boolean;
  isBusinessHour?: boolean;
  isPast?: boolean;
  isToday?: boolean;
  isPausa?: boolean;
  isClosed?: boolean;
  elementRef?: RefObject<ElementType | null>;
  onCallbackError?: (error: Error | null) => void;
};

const useAgendaSlotRenderArg = <ElementType extends HTMLElement>({
  date = null,
  dateStr = null,
  timeText,
  minute,
  view,
  resourceId = null,
  isMajor = false,
  isBusinessHour = true,
  isPast = false,
  isToday = false,
  isPausa = false,
  isClosed = false,
}: UseAgendaSlotRenderInput<ElementType>) =>
  useMemo(
    () =>
      createAgendaSlotRenderArg({
        date,
        dateStr,
        timeText,
        minute,
        view,
        resourceId,
        isMajor,
        isBusinessHour,
        isPast,
        isToday,
        isPausa,
        isClosed,
      }),
    [
      date,
      dateStr,
      isBusinessHour,
      isClosed,
      isMajor,
      isPast,
      isPausa,
      isToday,
      minute,
      resourceId,
      timeText,
      view,
    ],
  );

export const useAgendaSlotLaneRender = <ElementType extends HTMLElement>(
  input: UseAgendaSlotRenderInput<ElementType>,
) => {
  const { options, elementRef, onCallbackError } = input;
  const renderArg = useAgendaSlotRenderArg(input);
  const optionClassName = useMemo(
    () => resolveAgendaSlotLaneClassNames(options.slotLaneClassNames, renderArg).join(" "),
    [options.slotLaneClassNames, renderArg],
  );

  useEffect(() => {
    const el = elementRef?.current ?? null;
    if (!el) return;

    if (options.slotLaneDidMount) {
      const result = dispatchAgendaSlotLaneDidMount({ options, arg: renderArg, el });
      onCallbackError?.(result.error);
    }

    return () => {
      if (!options.slotLaneWillUnmount) return;
      const result = dispatchAgendaSlotLaneWillUnmount({ options, arg: renderArg, el });
      onCallbackError?.(result.error);
    };
  }, [elementRef, onCallbackError, options, renderArg]);

  return {
    optionClassName,
    renderArg,
  };
};

export const useAgendaSlotLabelRender = <ElementType extends HTMLElement>(
  input: UseAgendaSlotRenderInput<ElementType>,
) => {
  const { options, elementRef, onCallbackError } = input;
  const renderArg = useAgendaSlotRenderArg(input);
  const optionClassName = useMemo(
    () => resolveAgendaSlotLabelClassNames(options.slotLabelClassNames, renderArg).join(" "),
    [options.slotLabelClassNames, renderArg],
  );

  useEffect(() => {
    const el = elementRef?.current ?? null;
    if (!el) return;

    if (options.slotLabelDidMount) {
      const result = dispatchAgendaSlotLabelDidMount({ options, arg: renderArg, el });
      onCallbackError?.(result.error);
    }

    return () => {
      if (!options.slotLabelWillUnmount) return;
      const result = dispatchAgendaSlotLabelWillUnmount({ options, arg: renderArg, el });
      onCallbackError?.(result.error);
    };
  }, [elementRef, onCallbackError, options, renderArg]);

  return {
    optionClassName,
    renderArg,
  };
};

export const AgendaDayCellContent = memo(function AgendaDayCellContent({
  options,
  renderArg,
  defaultContent,
}: {
  options: AgendaResolvedOptions;
  renderArg: AgendaDayCellRenderArg;
  defaultContent: ReactNode;
}) {
  const customContent = resolveAgendaDayCellContent(options.dayCellContent, renderArg);
  return <>{customContent ?? defaultContent}</>;
});

export const AgendaSlotLaneContent = memo(function AgendaSlotLaneContent({
  options,
  renderArg,
  defaultContent = null,
}: {
  options: AgendaResolvedOptions;
  renderArg: AgendaSlotRenderArg;
  defaultContent?: ReactNode;
}) {
  const customContent = resolveAgendaSlotLaneContent(options.slotLaneContent, renderArg);
  return <>{customContent ?? defaultContent}</>;
});

export const AgendaSlotLabelContent = memo(function AgendaSlotLabelContent({
  options,
  renderArg,
  defaultContent,
}: {
  options: AgendaResolvedOptions;
  renderArg: AgendaSlotRenderArg;
  defaultContent: ReactNode;
}) {
  const customContent = resolveAgendaSlotLabelContent(options.slotLabelContent, renderArg);
  return <>{customContent ?? defaultContent}</>;
});
