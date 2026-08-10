"use client";

import { useEffect, useState } from "react";

export function useAgendaClock(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return tick;
}
