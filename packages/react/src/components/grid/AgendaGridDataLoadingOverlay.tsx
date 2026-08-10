"use client";

import { memo } from "react";
import { Loader2 } from "lucide-react";
import { useAgendaMessages } from "../../config/AgendaConfigContext";

type AgendaGridDataLoadingOverlayProps = {
  visible: boolean;
};

export const AgendaGridDataLoadingOverlay = memo(function AgendaGridDataLoadingOverlay({
  visible,
}: AgendaGridDataLoadingOverlayProps) {
  const messages = useAgendaMessages();
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[80] inline-flex items-center gap-2 rounded-lg border border-[#BAE6FD] bg-white/95 px-3 py-2 text-xs font-medium text-[#0369A1] shadow-sm">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {messages.loading} {messages.agenda.toLowerCase()}
    </div>
  );
});
