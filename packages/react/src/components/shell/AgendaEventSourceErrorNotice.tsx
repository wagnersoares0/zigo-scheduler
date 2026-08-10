"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

type AgendaEventSourceErrorNoticeProps = {
  errorCount: number;
  summary: string;
  loading: boolean;
  onRetry: () => void;
};

export function AgendaEventSourceErrorNotice({
  errorCount,
  summary,
  loading,
  onRetry,
}: AgendaEventSourceErrorNoticeProps) {
  if (errorCount === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-3 text-sm text-[#991B1B] md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">Failed to update part of the scheduler</p>
          <p className="mt-0.5 break-words text-xs font-medium text-[#B91C1C]">{summary}</p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#FCA5A5] bg-white px-3 text-xs font-semibold text-[#991B1B] hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onRetry}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Try again
      </button>
    </div>
  );
}
