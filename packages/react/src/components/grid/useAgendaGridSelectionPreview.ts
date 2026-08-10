"use client";

import { useCallback } from "react";

import type { DaySelection } from "@zigoschedule/scheduler-engine";
import type { AgendaEngineContext } from "@zigoschedule/scheduler-engine";
import { validateAgendaRange } from "@zigoschedule/scheduler-engine";
import type { AgendaValidationMessages } from "@zigoschedule/scheduler-engine";
import {
  getAgendaSelectionExclusiveRange,
  getAgendaSelectionOverlayVisualRange,
} from "@zigoschedule/scheduler-engine";

type UseAgendaGridSelectionPreviewOptions = {
  agendaEngine: AgendaEngineContext;
  startDay: number;
  endDay: number;
  axisEndDay: number;
  gridMin: number;
  validationMessages?: AgendaValidationMessages;
};

export function useAgendaGridSelectionPreview({
  agendaEngine,
  startDay,
  endDay,
  axisEndDay,
  gridMin,
  validationMessages,
}: UseAgendaGridSelectionPreviewOptions) {
  return useCallback(
    (selection: DaySelection) => {
      const isDrag = selection.source === "drag" || selection.source === "range" || Boolean(selection.isDragSelection ?? selection.isDrag);
      const range = getAgendaSelectionExclusiveRange({
        startMinute: selection.start,
        endMinute: selection.end,
        maxMinute: endDay,
        snapMinutes: gridMin,
        isDrag,
      });
      const visualRange = getAgendaSelectionOverlayVisualRange({
        startMinute: selection.start,
        endMinute: selection.end,
        maxMinute: endDay,
        visualMaxMinute: axisEndDay,
        snapMinutes: gridMin,
        isDrag,
      });

      const startMinute = Math.max(startDay, Math.min(endDay, range.startMinute));
      const endMinute = Math.max(startDay, Math.min(endDay, range.endMinute));
      const visualEndMinute = Math.max(startDay, Math.min(axisEndDay, visualRange.endMinute));
      const validationOptions = selection.deferResourceValidation
        ? {
            skipAppointmentConflicts: true,
            skipBlockConflicts: true,
            messages: validationMessages,
          }
        : {
            messages: validationMessages,
          };
      const validation = validateAgendaRange(
        agendaEngine,
        {
          dayKey: selection.dayKey,
          resourceId: selection.profId ?? null,
          startMinute,
          endMinute,
        },
        validationOptions,
      );

      return {
        startMinute,
        endMinute,
        visualEndMinute,
        blockedMessage: validation.ok ? null : validation.message,
      };
    },
    [agendaEngine, axisEndDay, endDay, gridMin, startDay, validationMessages],
  );
}
