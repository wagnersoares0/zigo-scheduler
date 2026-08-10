"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { AgendaMessages, TimeZone } from "@zigoschedule/scheduler-core";
import type { Appointment, Professional } from "@zigoschedule/scheduler-engine";
import {
  DEFAULT_DETAILS_ACTIONS,
  DetailsBody,
  DetailsFooter,
  DetailsHeader,
  DetailsShell,
} from "./AppointmentDetailsModalParts";
import { readAppointmentDetails } from "./AppointmentDetailsData";

const FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const focusableElements = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true"
  );

const keepFocusInside = (event: KeyboardEvent, shell: HTMLElement): void => {
  const tabbables = focusableElements(shell);
  if (tabbables.length === 0) {
    event.preventDefault();
    shell.focus();
    return;
  }

  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];
  const active = shell.ownerDocument.activeElement;
  const leavingStart = event.shiftKey && (active === first || !shell.contains(active));
  const leavingEnd = !event.shiftKey && (active === last || !shell.contains(active));

  if (!leavingStart && !leavingEnd) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
};

function useModalFocus({
  appointment,
  closeButtonRef,
  dialogRef,
  onClose,
}: {
  appointment: Appointment | null;
  closeButtonRef: RefObject<HTMLButtonElement>;
  dialogRef: RefObject<HTMLElement>;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!appointment) return;
    const focusedBeforeOpen = document.activeElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      keepFocusInside(event, dialogRef.current);
    };
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (focusedBeforeOpen instanceof HTMLElement && focusedBeforeOpen.isConnected) {
        focusedBeforeOpen.focus({ preventScroll: true });
      }
    };
  }, [appointment, closeButtonRef, dialogRef, onClose]);
}

export type AppointmentDetailsMode = "auto" | "modal" | "callback";

export type AppointmentDetailsAction =
  | "whatsapp"
  | "reminder"
  | "edit"
  | "cancel"
  | "charge";

export type AppointmentDetailsActionEvent = {
  action: AppointmentDetailsAction;
  appointment: Appointment;
};

export type AppointmentDetailsModalProps = {
  appointment: Appointment | null;
  professionals: Professional[];
  timeZone: TimeZone;
  locale?: string;
  messages: AgendaMessages;
  accentColor: string;
  actions?: readonly AppointmentDetailsAction[];
  onAction?: (event: AppointmentDetailsActionEvent) => void | Promise<void>;
  onClose: () => void;
};

export function AppointmentDetailsModal({
  appointment,
  professionals,
  timeZone,
  locale,
  messages,
  accentColor,
  actions = DEFAULT_DETAILS_ACTIONS,
  onAction,
  onClose,
}: AppointmentDetailsModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionSet = useMemo(() => new Set(actions), [actions]);
  useModalFocus({ appointment, closeButtonRef, dialogRef, onClose });

  if (!appointment) return null;

  const details = readAppointmentDetails({ appointment, professionals, timeZone, locale, messages });
  const emitAction = (action: AppointmentDetailsAction) => {
    void onAction?.({ action, appointment });
    onClose();
  };

  return (
    <DetailsShell dialogRef={dialogRef} label={messages.openAppointment(details.clientName)} onClose={onClose}>
      <DetailsHeader
        closeButtonRef={closeButtonRef}
        details={details}
        accentColor={accentColor}
        messages={messages}
        onClose={onClose}
      />
      <DetailsBody
        details={details}
        messages={messages}
        actionSet={actionSet}
        onAction={emitAction}
      />
      <DetailsFooter
        details={details}
        messages={messages}
        actionSet={actionSet}
        accentColor={accentColor}
        onAction={emitAction}
        onClose={onClose}
      />
    </DetailsShell>
  );
}
