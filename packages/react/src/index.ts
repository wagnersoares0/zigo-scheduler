/**
 * @zigoschedule/scheduler-react - the calendar, assembled.
 *
 * The only package that requires React. Everything below it - the domain rules,
 * the geometry, the pointer gestures - works in any JavaScript runtime.
 */
export { Agenda, type AgendaProps } from "./Agenda";
export type {
  AppointmentDetailsAction,
  AppointmentDetailsActionEvent,
  AppointmentDetailsMode,
} from "./components/details/AppointmentDetailsModal";
export {
  AgendaConfigProvider,
  useAgendaConfig,
  useAgendaLocale,
  useAgendaMessages,
  useAgendaTimeZone,
  type AgendaConfig,
  type AgendaConfigProviderProps,
} from "./config/AgendaConfigContext";
