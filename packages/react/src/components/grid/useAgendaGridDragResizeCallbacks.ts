"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";

import type { Appointment } from "@zigoschedule/scheduler-engine";
import { getAgendaGridLocalY } from "@zigoschedule/scheduler-engine";
import { zonedTimeToUtc, type TimeZone } from "@zigoschedule/scheduler-core";
import type { DragPayload, DropResult, DraggableCallbacks, HitTestResult } from "@zigoschedule/scheduler-interaction";
import type { ResizableCallbacks, ResizePayload, ResizeResult } from "@zigoschedule/scheduler-interaction";
import { decideAppointmentMutation } from "./decideAppointmentMutation";
import {
  buildMoveMutation,
  buildResizeMutation,
  findAppointmentEvent,
  validateAppointmentMutation,
  type AgendaEngineContext,
  type AgendaValidationMessages,
} from "@zigoschedule/scheduler-engine";
import type { AgendaDragOverlayHandle, DragPreview, ResizePreview } from "./AgendaDragOverlay";
import { useAgendaMessages, useAgendaTimeZone } from "../../config/AgendaConfigContext";

const buildDataHora = (
  dayKey: string,
  minute: number,
  timeZone: TimeZone,
): string => zonedTimeToUtc(dayKey, minute, timeZone).toISOString();

type PointerMinuteResult = {
  minute: number;
  y: number;
  colEl: HTMLDivElement;
  scrollEl: HTMLDivElement;
};

type UseAgendaGridDragResizeCallbacksArgs = {
  dayColRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  dragOverlayRef: MutableRefObject<AgendaDragOverlayHandle | null>;
  dayMinuteFromY: (y: number, colHeight: number) => number;
  startDay: number;
  endDay: number;
  gridMin: number;
  prepareDndHits: () => void;
  releaseDndHits: () => void;
  hitTest: (clientX: number, clientY: number) => HitTestResult | null;
  findRenderedAgById: (agId: string) => Appointment | null;
  updateDropColumnHighlight: (hit: HitTestResult | null, blocked: boolean) => void;
  clearDropColumnHighlight: () => void;
  resolveDropResourceId: (hitProfId: string | null, fallbackProfId: string | null) => string | null;
  getDropBlockReason: (payload: DragPayload, dayKey: string, profId: string | null, minute: number) => string | null;
  agendaEngine: AgendaEngineContext;
  onDropAg: (agId: string, newDataHora: string, profissionalId: string | null) => Promise<void>;
  onResizeAg: (agId: string, result: { direction: "start" | "end"; duracaoMinutos: number; novaDataHora?: string }) => Promise<void>;
  onMutationError?: (message: string) => void;
  onSetDayClosedNotice: (msg: string | null) => void;
  setGridNotice: (msg: string | null) => void;
  validationMessages?: AgendaValidationMessages;
};

export const useAgendaGridDragResizeCallbacks = ({
  dayColRefs,
  scrollRef,
  dragOverlayRef,
  dayMinuteFromY,
  startDay,
  endDay,
  gridMin,
  prepareDndHits,
  releaseDndHits,
  hitTest,
  findRenderedAgById,
  updateDropColumnHighlight,
  clearDropColumnHighlight,
  resolveDropResourceId,
  getDropBlockReason,
  agendaEngine,
  onDropAg,
  onResizeAg,
  onMutationError,
  onSetDayClosedNotice,
  setGridNotice,
  validationMessages,
}: UseAgendaGridDragResizeCallbacksArgs) => {
  const messages = useAgendaMessages();
  const timeZone = useAgendaTimeZone();
  const overlayResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (overlayResetTimerRef.current !== null) {
        window.clearTimeout(overlayResetTimerRef.current);
      }
    };
  }, []);

  const getPointerMinuteInColumn = useCallback((colKey: string, clientY: number): PointerMinuteResult | null => {
    const colEl = dayColRefs.current.get(colKey);
    const scrollEl = scrollRef.current;
    if (!colEl || !scrollEl) return null;

    const scrollRect = scrollEl.getBoundingClientRect();
    const y = getAgendaGridLocalY({
      clientY,
      gridRectTop: scrollRect.top,
      scrollTop: scrollEl.scrollTop,
      contentTop: colEl.offsetTop,
      maxY: colEl.clientHeight - 1,
    });

    return {
      minute: dayMinuteFromY(y, colEl.clientHeight),
      y,
      colEl,
      scrollEl,
    };
  }, [dayColRefs, dayMinuteFromY, scrollRef]);

  const clampDragMinute = useCallback(
    (minute: number, durationMinutes: number) => {
      const latestStart = Math.max(startDay, endDay - durationMinutes);
      return Math.max(startDay, Math.min(latestStart, minute));
    },
    [endDay, startDay],
  );

  const clampResizeEndMinute = useCallback(
    (startMinute: number, endMinute: number) =>
      Math.max(startMinute + gridMin, Math.min(endDay, endMinute)),
    [endDay, gridMin],
  );

  const getResizeRange = useCallback(
    (payload: ResizePayload, boundaryMinute: number) => {
      if (payload.direction === "start") {
        const latestStart = Math.max(startDay, payload.endMinute - gridMin);
        return {
          startMinute: Math.max(startDay, Math.min(latestStart, boundaryMinute)),
          endMinute: payload.endMinute,
        };
      }

      return {
        startMinute: payload.startMinute,
        endMinute: clampResizeEndMinute(payload.startMinute, boundaryMinute),
      };
    },
    [clampResizeEndMinute, gridMin, startDay],
  );

  const clearOverlayResetTimer = useCallback(() => {
    if (overlayResetTimerRef.current !== null) {
      window.clearTimeout(overlayResetTimerRef.current);
      overlayResetTimerRef.current = null;
    }
  }, []);

  const clearDragOverlay = useCallback(() => {
    clearOverlayResetTimer();
    dragOverlayRef.current?.setDragPreview(null);
    dragOverlayRef.current?.setResizePreview(null);
    dragOverlayRef.current?.setDraggedAg(null);
  }, [clearOverlayResetTimer, dragOverlayRef]);

  const clearDragOverlaySoon = useCallback(() => {
    clearOverlayResetTimer();
    overlayResetTimerRef.current = window.setTimeout(() => {
      overlayResetTimerRef.current = null;
      dragOverlayRef.current?.setDragPreview(null);
      dragOverlayRef.current?.setResizePreview(null);
      dragOverlayRef.current?.setDraggedAg(null);
    }, 120);
  }, [clearOverlayResetTimer, dragOverlayRef]);

  const mutationErrorMessage = useCallback(
    (error: unknown): string => {
      if (error instanceof RangeError && error.message) return error.message;
      if (error instanceof Error && error.message) return error.message;
      return messages.invalidDuration;
    },
    [messages.invalidDuration],
  );

  const getResizeBlockReason = useCallback(
    (payload: ResizePayload, hit: HitTestResult | null, nextBoundaryMinute: number): string | null => {
      if (!hit) return messages.resizeWithinAppointmentColumn;
      const sameResourceColumn = hit.profId === null || (hit.profId ?? "") === (payload.profId ?? "");
      if (hit.dayKey !== payload.dayKey || !sameResourceColumn) {
        return messages.resizeWithinAppointmentColumn;
      }

      const appointment = findAppointmentEvent(agendaEngine, payload.agId);
      const range = getResizeRange(payload, nextBoundaryMinute);
      const mutation = appointment
        ? payload.direction === "start"
          ? buildMoveMutation(appointment, {
              dayKey: payload.dayKey,
              resourceId: payload.profId,
              startMinute: range.startMinute,
              endMinute: range.endMinute,
            })
          : buildResizeMutation(appointment, range.endMinute)
        : null;
      const validation = validateAppointmentMutation(agendaEngine, appointment, mutation, {
        messages: validationMessages,
      });

      return validation.ok ? null : validation.message;
    },
    [agendaEngine, getResizeRange, messages.resizeWithinAppointmentColumn, validationMessages],
  );

  const dndCallbacks = useMemo<DraggableCallbacks>(
    () => ({
      prepareHits: prepareDndHits,
      releaseHits: releaseDndHits,
      onDragStart: (payload, hit) => {
        clearOverlayResetTimer();
        dragOverlayRef.current?.setResizePreview(null);
        dragOverlayRef.current?.setDraggedAg(findRenderedAgById(payload.agId));
        if (!hit) {
          dragOverlayRef.current?.setDragPreview(null);
          updateDropColumnHighlight(null, false);
          return;
        }
        const clamped = clampDragMinute(payload.startMinute, payload.durationMinutes);
        const targetProfId = resolveDropResourceId(hit.profId, payload.profId);
        const blockedMessage = getDropBlockReason(payload, hit.dayKey, targetProfId, clamped);
        updateDropColumnHighlight(hit, Boolean(blockedMessage));
        dragOverlayRef.current?.setDragPreview({
          agId: payload.agId,
          dayKey: hit.dayKey,
          profId: targetProfId,
          minute: clamped,
          durationMinutes: payload.durationMinutes,
          phase: "dragging",
          blockedMessage,
        });
      },
      onDragMove: (payload, hit, nextStartMinute) => {
        if (!hit) {
          dragOverlayRef.current?.setDragPreview(null);
          updateDropColumnHighlight(null, false);
          return;
        }
        const clamped = clampDragMinute(nextStartMinute, payload.durationMinutes);
        const targetProfId = resolveDropResourceId(hit.profId, payload.profId);
        const blockedMessage = getDropBlockReason(payload, hit.dayKey, targetProfId, clamped);
        updateDropColumnHighlight(hit, Boolean(blockedMessage));
        dragOverlayRef.current?.setDragPreview({
          agId: payload.agId,
          dayKey: hit.dayKey,
          profId: targetProfId,
          minute: clamped,
          durationMinutes: payload.durationMinutes,
          phase: "dragging",
          blockedMessage,
        });
      },
      onDrop: async (result: DropResult) => {
        clearDropColumnHighlight();
        const clamped = clampDragMinute(result.newMinute, result.durationMinutes);
        const appointment = findAppointmentEvent(agendaEngine, result.agId);
        const targetProfId = resolveDropResourceId(result.profId, appointment?.resourceId ?? result.oldProfId);
        const nextPreview: DragPreview = {
          agId: result.agId,
          dayKey: result.newDayKey,
          profId: targetProfId,
          minute: clamped,
          durationMinutes: result.durationMinutes,
          phase: "dragging",
          blockedMessage: null,
        };
        const mutation = appointment
          ? buildMoveMutation(appointment, {
              dayKey: result.newDayKey,
              resourceId: targetProfId,
              startMinute: clamped,
              endMinute: clamped + result.durationMinutes,
            })
          : null;

        const decision = decideAppointmentMutation(agendaEngine, appointment, mutation, validationMessages);

        if (decision.status === "noop") {
          onSetDayClosedNotice(null);
          clearDragOverlay();
          return;
        }

        if (decision.status !== "ready") {
          onSetDayClosedNotice(decision.message);
          if (decision.status === "blocked") {
            setGridNotice(decision.message);
            onMutationError?.(decision.message);
          }
          dragOverlayRef.current?.setDragPreview({
            ...nextPreview,
            phase: "reverting",
            blockedMessage: decision.message,
          });
          clearDragOverlaySoon();
          return;
        }

        onSetDayClosedNotice(null);
        dragOverlayRef.current?.setDragPreview({
          ...nextPreview,
          dayKey: decision.mutation.nextRange.dayKey,
          profId: decision.mutation.nextRange.resourceId,
          minute: decision.mutation.nextRange.startMinute,
          phase: "committing",
          blockedMessage: null,
        });
        try {
          await onDropAg(
            result.agId,
            buildDataHora(decision.mutation.nextRange.dayKey, decision.mutation.nextRange.startMinute, timeZone),
            decision.mutation.nextRange.resourceId,
          );
          clearDragOverlay();
        } catch (error) {
          const message = mutationErrorMessage(error);
          onSetDayClosedNotice(message);
          setGridNotice(message);
          onMutationError?.(message);
          dragOverlayRef.current?.setDragPreview({
            ...nextPreview,
            phase: "reverting",
            blockedMessage: message,
          });
          clearDragOverlaySoon();
        } finally {
          clearDropColumnHighlight();
        }
      },
      onDragCancel: () => {
        clearDropColumnHighlight();
        clearDragOverlay();
      },
      getScrollContainer: () => scrollRef.current,
      hitTest,
    }),
    [
      agendaEngine,
      clampDragMinute,
      clearDragOverlay,
      clearDragOverlaySoon,
      clearDropColumnHighlight,
      clearOverlayResetTimer,
      dragOverlayRef,
      findRenderedAgById,
      getDropBlockReason,
      hitTest,
      mutationErrorMessage,
      onDropAg,
      onMutationError,
      onSetDayClosedNotice,
      prepareDndHits,
      releaseDndHits,
      resolveDropResourceId,
      scrollRef,
      setGridNotice,
      timeZone,
      updateDropColumnHighlight,
      validationMessages,
    ],
  );

  const resizeCallbacks = useMemo<ResizableCallbacks>(
    () => ({
      prepareHits: prepareDndHits,
      releaseHits: releaseDndHits,
      onResizeStart: (payload) => {
        clearOverlayResetTimer();
        dragOverlayRef.current?.setDragPreview(null);
        dragOverlayRef.current?.setDraggedAg(findRenderedAgById(payload.agId));
        const range = getResizeRange(
          payload,
          payload.direction === "start" ? payload.startMinute : payload.endMinute,
        );
        dragOverlayRef.current?.setResizePreview({
          agId: payload.agId,
          dayKey: payload.dayKey,
          profId: payload.profId,
          startMinute: range.startMinute,
          endMinute: range.endMinute,
          phase: "resizing",
          blockedMessage: null,
        });
      },
      onResizeMove: (payload, hit, nextBoundaryMinute) => {
        const range = getResizeRange(payload, nextBoundaryMinute);
        const blockedMessage = getResizeBlockReason(payload, hit, nextBoundaryMinute);
        dragOverlayRef.current?.setResizePreview({
          agId: payload.agId,
          dayKey: payload.dayKey,
          profId: payload.profId,
          startMinute: range.startMinute,
          endMinute: range.endMinute,
          phase: "resizing",
          blockedMessage,
        });
      },
      onResizeEnd: async (result: ResizeResult) => {
        const payload: ResizePayload = {
          agId: result.agId,
          dayKey: result.dayKey,
          profId: result.profId,
          startMinute: result.oldStartMinute,
          endMinute: result.oldEndMinute,
          snapMinutes: gridMin,
          direction: result.direction,
        };
        const range = getResizeRange(
          payload,
          result.direction === "start" ? result.newStartMinute : result.newEndMinute,
        );
        const nextPreview: ResizePreview = {
          agId: result.agId,
          dayKey: result.dayKey,
          profId: result.profId,
          startMinute: range.startMinute,
          endMinute: range.endMinute,
          phase: "resizing",
          blockedMessage: null,
        };
        const appointment = findAppointmentEvent(agendaEngine, result.agId);
        const mutation = appointment
          ? result.direction === "start"
            ? buildMoveMutation(appointment, {
                dayKey: result.dayKey,
                resourceId: result.profId,
                startMinute: range.startMinute,
                endMinute: range.endMinute,
              })
            : buildResizeMutation(appointment, range.endMinute)
          : null;

        const decision = decideAppointmentMutation(agendaEngine, appointment, mutation, validationMessages);

        if (decision.status === "noop") {
          onSetDayClosedNotice(null);
          clearDragOverlay();
          return;
        }

        if (decision.status !== "ready") {
          onSetDayClosedNotice(decision.message);
          if (decision.status === "blocked") {
            setGridNotice(decision.message);
            onMutationError?.(decision.message);
          }
          dragOverlayRef.current?.setResizePreview({
            ...nextPreview,
            phase: "reverting",
            blockedMessage: decision.message,
          });
          clearDragOverlaySoon();
          return;
        }

        onSetDayClosedNotice(null);
        dragOverlayRef.current?.setResizePreview({
          ...nextPreview,
          startMinute: decision.mutation.nextRange.startMinute,
          endMinute: decision.mutation.nextRange.endMinute,
          phase: "committing",
          blockedMessage: null,
        });
        try {
          await onResizeAg(result.agId, {
            direction: result.direction,
            duracaoMinutos: decision.mutation.durationMinutes,
            novaDataHora: result.direction === "start"
              ? buildDataHora(decision.mutation.nextRange.dayKey, decision.mutation.nextRange.startMinute, timeZone)
              : undefined,
          });
          clearDragOverlay();
        } catch (error) {
          const message = mutationErrorMessage(error);
          onSetDayClosedNotice(message);
          setGridNotice(message);
          onMutationError?.(message);
          dragOverlayRef.current?.setResizePreview({
            ...nextPreview,
            phase: "reverting",
            blockedMessage: message,
          });
          clearDragOverlaySoon();
        }
      },
      onResizeCancel: () => {
        clearDragOverlay();
      },
      getScrollContainer: () => scrollRef.current,
      hitTest,
    }),
    [
      agendaEngine,
      clearDragOverlay,
      clearDragOverlaySoon,
      clearOverlayResetTimer,
      dragOverlayRef,
      findRenderedAgById,
      getResizeBlockReason,
      getResizeRange,
      gridMin,
      hitTest,
      mutationErrorMessage,
      onMutationError,
      onResizeAg,
      onSetDayClosedNotice,
      prepareDndHits,
      releaseDndHits,
      scrollRef,
      setGridNotice,
      timeZone,
      validationMessages,
    ],
  );

  return {
    getPointerMinuteInColumn,
    dndCallbacks,
    resizeCallbacks,
  };
};
