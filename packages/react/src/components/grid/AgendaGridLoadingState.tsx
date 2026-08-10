"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";

import { InlineGridNotice } from "./InlineGridNotice";
import { useAgendaMessages } from "../../config/AgendaConfigContext";

type AgendaGridLoadingStateProps = {
  gridNotice: string | null;
  dismissGridNotice: () => void;
};

export const AgendaGridLoadingState = memo(function AgendaGridLoadingState({
  gridNotice,
  dismissGridNotice,
}: AgendaGridLoadingStateProps) {
  const messages = useAgendaMessages();
  return (
    <section className="relative flex-1 min-w-0 min-h-0 bg-white flex flex-col overflow-hidden">
      <div className="flex min-h-[420px] flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <div className="flex max-w-sm flex-col items-center rounded-xl border border-[#E2E8F0] bg-white px-6 py-5 text-center shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0F2FE] text-[#0284C7]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[#020617]">
            {messages.loading} {messages.agenda.toLowerCase()}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#475569]">
            {messages.appointments} / {messages.blocks}
          </p>
        </div>
      </div>
      <InlineGridNotice message={gridNotice} onDismiss={dismissGridNotice} />
    </section>
  );
});
