"use client";
import { memo, useEffect } from "react";

type InlineGridNoticeProps = {
  message: string | null;
  onDismiss: () => void;
};

export const InlineGridNotice = memo(function InlineGridNotice({
  message,
  onDismiss,
}: InlineGridNoticeProps) {
  useEffect(() => {
    if (!message) return;
    const timerId = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timerId);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="pointer-events-none absolute bottom-4 left-1/2 z-[60] -translate-x-1/2 max-w-sm rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-[13px] font-medium text-[#B91C1C] shadow-lg"
    >
      {message}
    </div>
  );
});

