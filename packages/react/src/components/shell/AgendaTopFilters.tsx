"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Circle, Filter, UsersRound } from "lucide-react";

import { STATUS_OPTIONS } from "@zigoschedule/scheduler-engine";
import { getAgendaStatusLabel } from "@zigoschedule/scheduler-core";
import type { Professional } from "@zigoschedule/scheduler-engine";
import {
  getProfessionalName,
  getProfessionalPhotoUrl,
  truncateProfessionalName,
} from "@zigoschedule/scheduler-engine";
import { ProfessionalAvatar } from "./ProfessionalAvatar";
import { useAgendaMessages } from "../../config/AgendaConfigContext";

type Props = {
  canViewAllAppointments: boolean;
  allProfSelected: boolean;
  agendaProfs: Professional[];
  visibleProfIds: string[];
  selectedStatuses: string[];
  onToggleAllProf: () => void;
  onToggleProf: (id: string) => void;
  onToggleAllStatuses: () => void;
  onToggleStatus: (status: string) => void;
};

export const AgendaTopFilters = memo(function AgendaTopFilters({
  canViewAllAppointments,
  allProfSelected,
  agendaProfs,
  visibleProfIds,
  selectedStatuses,
  onToggleAllProf,
  onToggleProf,
  onToggleAllStatuses,
  onToggleStatus,
}: Props) {
  const messages = useAgendaMessages();
  const [openMenu, setOpenMenu] = useState<"professionals" | "status" | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const visibleProfIdSet = useMemo(() => new Set(visibleProfIds), [visibleProfIds]);
  const selectedStatusSet = useMemo(() => new Set(selectedStatuses), [selectedStatuses]);
  const allStatusesSelected = selectedStatuses.length === 0 || selectedStatuses.length === STATUS_OPTIONS.length;

  const professionalsLabel = useMemo(() => {
    if (!canViewAllAppointments) return messages.filters.myAgenda;
    if (!agendaProfs.length) return messages.filters.professionals;
    if (allProfSelected) return messages.filters.allProfessionals;
    if (visibleProfIds.length === 1) {
      const selected = agendaProfs.find((prof) => prof.id === visibleProfIds[0]);
      return selected ? truncateProfessionalName(getProfessionalName(selected), 18) : messages.filters.oneProfessional;
    }
    return messages.filters.manyProfessionals(visibleProfIds.length);
  }, [agendaProfs, allProfSelected, canViewAllAppointments, messages, visibleProfIds]);

  const statusLabel = useMemo(() => {
    if (selectedStatuses.length === 0 || selectedStatuses.length === STATUS_OPTIONS.length) return messages.filters.allStatuses;
    const defaultOpenStatuses = ["pendente", "confirmado", "concluido"];
    const isDefault =
      selectedStatuses.length === defaultOpenStatuses.length &&
      defaultOpenStatuses.every((status) => selectedStatuses.includes(status));

    if (isDefault) return messages.filters.activeBookings;
    if (selectedStatuses.length === 1) {
      return selectedStatuses[0]
        ? getAgendaStatusLabel(selectedStatuses[0], messages)
        : messages.filters.oneStatus;
    }
    return messages.filters.manyStatuses(selectedStatuses.length);
  }, [messages, selectedStatuses]);

  const hasProfessionalMenu = canViewAllAppointments && agendaProfs.length > 1;

  useEffect(() => {
    if (!openMenu) return;

    const shouldKeepOpen = (target: EventTarget | null) =>
      target instanceof Node && rootRef.current?.contains(target);

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (shouldKeepOpen(event.target)) return;
      setOpenMenu(null);
    };

    const closeOnOutsideScroll = (event: Event) => {
      if (shouldKeepOpen(event.target)) return;
      setOpenMenu(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("scroll", closeOnOutsideScroll, true);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("scroll", closeOnOutsideScroll, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  return (
    <div ref={rootRef} className="flex flex-wrap items-center justify-end gap-2">
        {hasProfessionalMenu ? (
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === "professionals"}
              onClick={() => setOpenMenu((current) => (current === "professionals" ? null : "professionals"))}
              className="inline-flex h-9 min-w-[190px] items-center justify-between gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#020617] shadow-sm transition hover:border-[#0284C7] hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <UsersRound className="h-4 w-4 shrink-0 text-[#0284C7]" />
                <span className="truncate">{professionalsLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" />
            </button>

            {openMenu === "professionals" && (
              <div className="absolute right-0 z-[90] mt-2 w-[280px] rounded-lg border border-[#E2E8F0] bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={onToggleAllProf}
                  className="flex h-9 w-full items-center justify-between rounded-md px-2 text-left text-xs font-semibold text-[#020617] transition hover:bg-[#F8FAFC]"
                >
                  <span>{messages.filters.allProfessionals}</span>
                  {allProfSelected ? <Check className="h-4 w-4 text-[#0284C7]" /> : null}
                </button>
                <div className="mt-1 max-h-72 overflow-y-auto pr-1">
                  {agendaProfs.map((prof) => {
                    const selected = visibleProfIdSet.has(prof.id);
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => onToggleProf(prof.id)}
                        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-[#020617] transition hover:bg-[#F8FAFC]"
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-[#0284C7] bg-[#0284C7]" : "border-[#CBD5E1] bg-white"}`}>
                          {selected ? <Check className="h-3 w-3 text-white" /> : null}
                        </span>
                        <ProfessionalAvatar
                          nome={getProfessionalName(prof)}
                          fotoUrl={getProfessionalPhotoUrl(prof)}
                          className="h-6 w-6 shrink-0 rounded-full border border-[#CBD5E1] object-cover"
                          fallbackClassName="flex items-center justify-center bg-[#E2E8F0]"
                          initialsClassName="text-[10px] font-semibold text-[#334155]"
                        />
                        <span title={getProfessionalName(prof)} className="min-w-0 flex-1 truncate">
                          {getProfessionalName(prof)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="relative">
          <button
            type="button"
            aria-expanded={openMenu === "status"}
            onClick={() => setOpenMenu((current) => (current === "status" ? null : "status"))}
            className="inline-flex h-9 min-w-[160px] items-center justify-between gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#020617] shadow-sm transition hover:border-[#0284C7] hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Filter className="h-4 w-4 shrink-0 text-[#0284C7]" />
              <span className="truncate">{statusLabel}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" />
          </button>

          {openMenu === "status" && (
            <div className="absolute right-0 z-[90] mt-2 w-[220px] rounded-lg border border-[#E2E8F0] bg-white p-2 shadow-lg">
              <button
                type="button"
                onClick={onToggleAllStatuses}
                className="flex h-9 w-full items-center justify-between rounded-md px-2 text-left text-xs font-semibold text-[#020617] transition hover:bg-[#F8FAFC]"
              >
                <span>{messages.filters.allStatusMenu}</span>
                {allStatusesSelected ? <Check className="h-4 w-4 text-[#0284C7]" /> : null}
              </button>
              <div className="mt-1">
                {STATUS_OPTIONS.map((status) => {
                  const selected = allStatusesSelected || selectedStatusSet.has(status.value);
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => onToggleStatus(status.value)}
                      className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-[#020617] transition hover:bg-[#F8FAFC]"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-[#0284C7] bg-[#0284C7]" : "border-[#CBD5E1] bg-white"}`}>
                        {selected ? <Check className="h-3 w-3 text-white" /> : <Circle className="h-2 w-2 text-transparent" />}
                      </span>
                      <span>{getAgendaStatusLabel(status.value, messages)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
    </div>
  );
});
