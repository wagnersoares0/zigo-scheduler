"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_TIME_ZONE,
  getAgendaMessages,
  isValidTimeZone,
  normalizeAgendaLocale,
  type AgendaMessages,
  type AgendaMessagesInput,
  type AgendaSupportedLocale,
  type TimeZone,
} from "@zigoschedule/scheduler-core";

/**
 * Calendar-wide configuration.
 *
 * The pure layer (`core/`, `utils/`, `engine/`) never reads this; every one of
 * those functions takes the time zone as an argument, which is what keeps them
 * testable without a React tree. This context exists purely so the component
 * layer does not have to thread the same value through thirty props.
 *
 * Read it with `useAgendaConfig()`, or `useAgendaTimeZone()` when the zone is
 * all you need.
 */
export type AgendaConfig = {
  /** IANA zone the business operates in, e.g. "America/Manaus". */
  timeZone: TimeZone;
  /** Locale used for built-in labels and Intl formatting. */
  locale: AgendaSupportedLocale;
  /** Built-in UI copy, already resolved for the locale and host overrides. */
  messages: AgendaMessages;
};

const AgendaConfigContext = createContext<AgendaConfig | null>(null);

export type AgendaConfigProviderProps = {
  children: ReactNode;
  /**
   * Defaults to `DEFAULT_TIME_ZONE`. An invalid or fixed-offset value falls back
   * to the default rather than silently shifting every appointment on screen;
   * see `isValidTimeZone`.
   */
  timeZone?: TimeZone;
  /** UI locale. Unsupported regional variants fall back by language. */
  locale?: string;
  /** Optional host overrides for product-specific copy. */
  messages?: AgendaMessagesInput;
};

export function AgendaConfigProvider({
  children,
  timeZone,
  locale,
  messages,
}: AgendaConfigProviderProps) {
  const value = useMemo<AgendaConfig>(
    () => ({
      timeZone: timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE,
      locale: normalizeAgendaLocale(locale),
      messages: getAgendaMessages(locale, messages),
    }),
    [locale, messages, timeZone]
  );

  return <AgendaConfigContext.Provider value={value}>{children}</AgendaConfigContext.Provider>;
}

/**
 * Configuration for the surrounding calendar.
 *
 * Falls back to the defaults when there is no provider, so a component can be
 * rendered in isolation, in a test or a Storybook story, without ceremony.
 */
export function useAgendaConfig(): AgendaConfig {
  return (
    useContext(AgendaConfigContext) ?? {
      timeZone: DEFAULT_TIME_ZONE,
      locale: normalizeAgendaLocale(),
      messages: getAgendaMessages(),
    }
  );
}

/** Shorthand for `useAgendaConfig().timeZone`. */
export function useAgendaTimeZone(): TimeZone {
  return useAgendaConfig().timeZone;
}

export function useAgendaLocale(): AgendaSupportedLocale {
  return useAgendaConfig().locale;
}

export function useAgendaMessages(): AgendaMessages {
  return useAgendaConfig().messages;
}
