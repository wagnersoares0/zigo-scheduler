"use client";

import { useEffect, useMemo, useRef } from "react";
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
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionSet = useMemo(() => new Set(actions), [actions]);

  useEffect(() => {
    if (!appointment) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appointment, onClose]);

  if (!appointment) return null;

  const details = readAppointmentDetails({ appointment, professionals, timeZone, locale, messages });
  const emitAction = (action: AppointmentDetailsAction) => {
    void onAction?.({ action, appointment });
    onClose();
  };

  return (
    <DetailsShell label={messages.openAppointment(details.clientName)} onClose={onClose}>
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
