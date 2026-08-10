"use client";

import { Loader2 } from "lucide-react";
import { useAgendaMessages } from "../../config/AgendaConfigContext";

type AgendaHeaderProps = {
  loading: boolean;
};

export function AgendaHeader({ loading }: AgendaHeaderProps) {
  const messages = useAgendaMessages();
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 flex items-center gap-3">
      <h1 className="text-xl md:text-2xl font-bold text-[#020617]">{messages.agenda}</h1>
      <span className="text-xs md:text-sm text-[#475569]">{messages.appointments}</span>
      {loading && (
        <span className="inline-flex items-center gap-1 text-xs text-[#0284C7]">
          <Loader2 className="h-3 w-3 animate-spin" />
          {messages.updating}
        </span>
      )}
    </div>
  );
}
