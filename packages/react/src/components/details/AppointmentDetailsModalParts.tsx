"use client";

import type { ReactNode, RefObject } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Check,
  Clock3,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Tag,
  Trash2,
  User,
  WalletCards,
  X,
} from "lucide-react";
import type { AgendaMessages } from "@zigoschedule/scheduler-core";
import type { AppointmentDetailsViewData, DetailsTone } from "./AppointmentDetailsData";
import type { AppointmentDetailsAction } from "./AppointmentDetailsModal";

export const DEFAULT_DETAILS_ACTIONS: readonly AppointmentDetailsAction[] = [
  "whatsapp",
  "reminder",
  "edit",
  "cancel",
];

const ACTION_META = {
  whatsapp: {
    icon: MessageCircle,
    labelKey: "whatsapp",
    className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
  reminder: {
    icon: Bell,
    labelKey: "reminder",
    className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
  edit: {
    icon: Pencil,
    labelKey: "edit",
    className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
  cancel: {
    icon: Trash2,
    labelKey: "cancel",
    className: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  },
  charge: {
    icon: WalletCards,
    labelKey: "charge",
    className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
} as const satisfies Record<
  AppointmentDetailsAction,
  {
    icon: typeof MessageCircle;
    labelKey: keyof Pick<AgendaMessages["details"], "whatsapp" | "reminder" | "edit" | "cancel" | "charge">;
    className: string;
  }
>;

const statusClassName = (tone: DetailsTone): string => {
  if (tone === "bad") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
};

export function DetailsShell({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 px-4 py-6" onClick={onClose}>
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-[460px] overflow-hidden rounded-[20px] bg-slate-50 shadow-2xl ring-1 ring-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}

export function DetailsHeader({
  details,
  accentColor,
  messages,
  closeButtonRef,
  onClose,
}: {
  details: AppointmentDetailsViewData;
  accentColor: string;
  messages: AgendaMessages;
  closeButtonRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
}) {
  return (
    <header className="flex items-center gap-3 px-5 py-4 text-white" style={{ backgroundColor: accentColor }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Check className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-base font-semibold">{details.statusLabel}</strong>
        <span className="block truncate text-xs font-medium opacity-85">
          {messages.details.referencePrefix} {details.reference}
        </span>
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/80"
        aria-label={messages.close}
        onClick={onClose}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}

function DetailsRow({
  icon: Icon,
  title,
  value,
  muted = false,
  aside,
}: {
  icon: typeof Clock3;
  title: string;
  value: string;
  muted?: boolean;
  aside?: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-semibold text-slate-900">{title}</strong>
        <span className={`block truncate text-sm ${muted ? "text-slate-400" : "text-slate-600"}`}>{value}</span>
      </div>
      {aside && <span className="shrink-0 self-center text-sm font-semibold text-slate-900">{aside}</span>}
    </div>
  );
}

function DetailsStatusRow({ details, messages }: { details: AppointmentDetailsViewData; messages: AgendaMessages }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Tag className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold text-slate-900">{messages.details.status}</strong>
        <span className="mt-1 flex flex-wrap gap-1.5">
          <em className={`rounded-full border px-2 py-0.5 text-xs not-italic ${statusClassName(details.statusTone)}`}>
            {details.statusLabel}
          </em>
          {details.paid && (
            <em className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs not-italic text-slate-700">
              {messages.status.paid}
            </em>
          )}
        </span>
      </div>
    </div>
  );
}

export function DetailsBody({
  details,
  messages,
  actionSet,
  onAction,
}: {
  details: AppointmentDetailsViewData;
  messages: AgendaMessages;
  actionSet: ReadonlySet<AppointmentDetailsAction>;
  onAction: (action: AppointmentDetailsAction) => void;
}) {
  return (
    <div className="max-h-[calc(100vh-11rem)] space-y-3 overflow-y-auto px-4 py-4">
      <DetailsRow icon={Clock3} title={details.timeRange} value={details.dateLabel} />
      <DetailsRow icon={User} title={details.clientName} value={details.phone ?? messages.details.noPhone} muted={!details.phone} />
      <DetailsRow icon={BriefcaseBusiness} title={details.serviceName} value={`${details.durationLabel}${details.professionalName ? ` · ${details.professionalName}` : ""}`} aside={details.priceLabel ?? undefined} />
      <DetailsRow icon={MessageSquareText} title={messages.details.notes} value={details.notes ?? messages.details.noNotes} muted={!details.notes} />
      <DetailsStatusRow details={details} messages={messages} />
      {details.price !== null && (
        <DetailsRow icon={WalletCards} title={messages.details.total} value={details.paid ? messages.details.received : messages.details.amountDue} aside={details.priceLabel ?? undefined} />
      )}
      <DetailsActionGrid messages={messages} actionSet={actionSet} onAction={onAction} />
    </div>
  );
}

function DetailsActionGrid({
  messages,
  actionSet,
  onAction,
}: {
  messages: AgendaMessages;
  actionSet: ReadonlySet<AppointmentDetailsAction>;
  onAction: (action: AppointmentDetailsAction) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      {DEFAULT_DETAILS_ACTIONS.filter((action) => actionSet.has(action)).map((action) => {
        const meta = ACTION_META[action];
        const Icon = meta.icon;
        return (
          <button key={action} type="button" className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${meta.className}`} onClick={() => onAction(action)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {messages.details[meta.labelKey]}
          </button>
        );
      })}
    </div>
  );
}

export function DetailsFooter({
  details,
  messages,
  actionSet,
  accentColor,
  onAction,
  onClose,
}: {
  details: AppointmentDetailsViewData;
  messages: AgendaMessages;
  actionSet: ReadonlySet<AppointmentDetailsAction>;
  accentColor: string;
  onAction: (action: AppointmentDetailsAction) => void;
  onClose: () => void;
}) {
  return (
    <footer className="flex gap-2 border-t border-slate-200 bg-white px-4 py-3">
      <button type="button" className="min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={onClose}>
        {messages.close}
      </button>
      {actionSet.has("charge") && (
        <button type="button" className="min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold text-white" style={{ backgroundColor: accentColor }} onClick={() => onAction("charge")}>
          {messages.details.charge}
          {details.priceLabel ? ` ${details.priceLabel}` : ""}
        </button>
      )}
    </footer>
  );
}
