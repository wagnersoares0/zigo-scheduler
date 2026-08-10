import type { AgendaSelectionSource } from "../utils/selection";

export type View = "day" | "week" | "month" | "list";

/** Legacy view ids accepted at runtime for older Zigo integrations. */
export type LegacyView = View | "lista";

export type Professional = {
  id: string;
  /** Display name. `nome` remains supported for existing Zigo backends. */
  name?: string;
  nome?: string;
  /** Public profile/avatar URL. `foto_url` remains supported for existing Zigo backends. */
  photoUrl?: string | null;
  foto_url?: string | null;
  opensAt?: string | null;
  horario_abertura?: string | null;
  closesAt?: string | null;
  horario_fechamento?: string | null;
  schedule?: ProfessionalDaySchedule[];
  horarios_profissional?: ProfessionalDaySchedule[];
};

export type ProfessionalDaySchedule = {
  dayOfWeek?: number;
  dia_semana?: number;
  startTime?: string | null;
  hora_inicio?: string | null;
  endTime?: string | null;
  hora_fim?: string | null;
  active?: boolean | string | number | null;
  ativo?: boolean | string | number | null;
  hasBreak?: boolean | string | number | null;
  tem_pausa?: boolean | string | number | null;
  breakStartsAt?: string | null;
  pausa_inicio?: string | null;
  breakEndsAt?: string | null;
  pausa_fim?: string | null;
};

export type Service = {
  id: string;
  /** Service name. `nome` remains supported for existing Zigo backends. */
  name?: string;
  nome?: string;
  durationMinutes?: number;
  duracao_minutos?: number;
  price?: number;
  preco?: number;
};

export type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado"
  | "domingo";

export type WeekdayBusinessHours = {
  active?: boolean | string | number | null;
  ativo?: boolean | string | number | null;
  opensAt?: string | null;
  abertura?: string | null;
  closesAt?: string | null;
  fechamento?: string | null;
};

export type BusinessHours = Partial<
  Record<WeekdayKey, WeekdayBusinessHours>
>;

export type AgendaMetadata = {
  professionals?: Professional[];
  profissionais?: Professional[];
  services?: Service[];
  servicos?: Service[];
  business?: {
    opensAt?: string | null;
    horario_abertura?: string | null;
    closesAt?: string | null;
    horario_fechamento?: string | null;
    businessHours?: BusinessHours | null;
    horarios_semana?: HorariosSemanaTenant | null;
    hasBreak?: boolean | string | null;
    tem_pausa?: boolean | string | null;
    breakStartsAt?: string | null;
    pausa_inicio?: string | null;
    breakEndsAt?: string | null;
    pausa_fim?: string | null;
    agendaGranularityMinutes?: number | null;
    granularidade_agenda?: number | null;
    weekScaleMinutes?: number | null;
    escala_visual_semana_agenda_minutos?: number | null;
    appointmentColorMode?: "default" | "appointment" | "padrao" | "por_cliente" | null;
    agenda_cor_modo?: "default" | "appointment" | "padrao" | "por_cliente" | null;
    defaultAppointmentColor?: string | null;
    agenda_cor_padrao?: string | null;
  } | null;
  /** @deprecated Use `business`. */
  tenant?: AgendaMetadata["business"];
};

export type AgendaInitialGridData = {
  range: { start: string; end: string };
  includeCancelado: boolean;
  professionalId: string | null;
  /** @deprecated Use `professionalId`. */
  profissionalId: string | null;
  loadedAt: number;
  appointments: Appointment[];
  blocks: Block[];
  /** @deprecated Use `appointments`. */
  agendamentos: Appointment[];
  /** @deprecated Use `blocks`. */
  bloqueios: Block[];
};

export type AppointmentServiceLink = {
  agendamento_id?: string;
  servico_id: string;
  ordem?: number;
  durationMinutes?: number;
  duracao_minutos?: number;
  price?: number;
  preco?: number;
  servicos?: {
    id?: string;
    name?: string;
    nome?: string;
    durationMinutes?: number;
    duracao_minutos?: number;
    price?: number;
    preco?: number;
  } | null;
};

export type AppointmentProductLink = {
  agendamento_id?: string;
  produto_id: string;
  quantidade: number;
  nome_snapshot: string;
  preco_unitario_snapshot: number;
};

export type Appointment = {
  id: string;
  /** ISO instant. `data_hora` remains supported for existing Zigo backends. */
  startsAt?: string;
  data_hora?: string;
  durationMinutes?: number;
  duracao_minutos?: number;
  /** Preparation/travel time reserved before the appointment, in minutes. */
  bufferBeforeMinutes?: number | null;
  buffer_antes_minutos?: number | null;
  /** Cleanup/travel time reserved after the appointment, in minutes. */
  bufferAfterMinutes?: number | null;
  buffer_depois_minutos?: number | null;
  clientName?: string;
  cliente_nome?: string;
  clientId?: string | null;
  cliente_id?: string | null;
  clientPhone?: string | null;
  cliente_telefone?: string | null;
  appointmentColor?: string | null;
  cor_agendamento?: string | null;
  appointmentColorIsCustom?: boolean | null;
  cor_agendamento_personalizada?: boolean | null;
  status: string;
  paymentStatus?: string | null;
  pagamento_status?: string | null;
  price?: number | null;
  preco?: number | null;
  cancellationReason?: string | null;
  motivo_cancelamento?: string | null;
  canceledAt?: string | null;
  cancelado_em?: string | null;
  canceledBy?: string | null;
  cancelado_por?: string | null;
  advancePaymentStatus?: string | null;
  adiantamento_status?: string | null;
  advancePaymentAmount?: number | null;
  adiantamento_valor_snapshot?: number | null;
  advancePaidAt?: string | null;
  adiantamento_pago_em?: string | null;
  prepaid?: boolean | null;
  cobranca_antecipada?: boolean | null;
  prepaidAt?: string | null;
  cobranca_antecipada_em?: string | null;
  notes?: string | null;
  notas?: string | null;
  serviceId?: string | null;
  servico_id?: string | null;
  servicesCount?: number | null;
  servicos_count?: number | null;
  professionalId?: string | null;
  profissional_id?: string | null;
  services?:
    | { name?: string; durationMinutes?: number | null; price?: number | null }
    | { name?: string; durationMinutes?: number | null; price?: number | null }[]
    | null;
  servicos?:
    | { name?: string; nome?: string; durationMinutes?: number | null; duracao_minutos?: number | null; price?: number | null; preco?: number | null }
    | { name?: string; nome?: string; durationMinutes?: number | null; duracao_minutos?: number | null; price?: number | null; preco?: number | null }[]
    | null;
  agendamento_servicos?: AppointmentServiceLink[] | null;
  agendamento_produtos?: AppointmentProductLink[] | null;
  profissionais?: { name?: string; nome?: string } | { name?: string; nome?: string }[] | null;

  // Recurrence.
  // These fields live on the appointment contract itself, not only in the
  // recurrence package. The host backend needs to see rule, exceptions and
  // overrides together even if the plugin is not installed. Without the plugin,
  // they are simply ignored and the appointment appears once on its own date.

  /** iCalendar RRULE (RFC 5545): `"FREQ=WEEKLY;BYDAY=TU"`. */
  recurrence?: string | null;
  recorrencia?: string | null;

  /** Canceled occurrences, as date keys: `["2026-08-18"]`. */
  recurrenceExceptions?: string[] | null;
  recorrencia_excecoes?: string[] | null;

  /**
   * Rescheduled occurrences, indexed by the original slot day.
   *
   * The key does not change when the occurrence moves to another day. It says
   * which repeat changed, the same role as iCalendar `RECURRENCE-ID`.
   *
   * `{ "2026-08-18": { startsAt: "...T20:00:00Z", durationMinutes: 90 } }`
   */
  recurrenceOverrides?: Record<string, AppointmentOccurrenceOverride> | null;
  recorrencia_alteracoes?: Record<string, AppointmentOccurrencePatch> | null;
};

/** What can change on one occurrence without affecting the rest of the series. */
export type AppointmentOccurrencePatch = Partial<
  Pick<
    Appointment,
    | "startsAt"
    | "data_hora"
    | "durationMinutes"
    | "duracao_minutos"
    | "professionalId"
    | "profissional_id"
    | "status"
    | "clientName"
    | "cliente_nome"
    | "notes"
    | "notas"
    | "price"
    | "preco"
    | "paymentStatus"
    | "pagamento_status"
    | "services"
    | "servicos"
  >
>;

export type AppointmentOccurrenceOverride = AppointmentOccurrencePatch;

export type ClientLookup = {
  id: string;
  nome: string;
  sobrenome?: string | null;
  telefone?: string | null;
  cor_agendamento?: string | null;
};

export type Block = {
  id: string;
  date?: string;
  data?: string;
  startTime?: string;
  hora_inicio?: string;
  endTime?: string;
  hora_fim?: string;
  reason?: string | null;
  motivo?: string | null;
  professionalId?: string | null;
  profissional_id?: string | null;
};

export type DayProfCardTheme = {
  borderClass: string;
  bgClass: string;
  headerClass: string;
  ringClass: string;
  hoverClass: string;
  timeClass: string;
  clientClass: string;
  serviceClass: string;
};

export type BreakWindow = {
  startMinute?: number;
  endMinute?: number;
  startsAt?: string;
  endsAt?: string;
  /** @deprecated Use `startMinute`. */
  inicioMin?: number;
  /** @deprecated Use `endMinute`. */
  fimMin?: number;
  /** @deprecated Use `startsAt`. */
  inicioHHMM?: string;
  /** @deprecated Use `endsAt`. */
  fimHHMM?: string;
};

export type TimeSelectOption = {
  value: string;
  label: string;
  disabled: boolean;
};

export type SchedulerDrawerItem =
  | { kind: "appointment"; appointment: Appointment; dayKey: string; start: number; end: number }
  | { kind: "block"; block: Block; dayKey: string; start: number; end: number };

export type SelectedService = {
  servicoId: string;
  nome: string;
  duracaoMinutos: number;
  preco: number;
};

export type SelectedProduct = {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
};

export type AppointmentEditForm = {
  agendamentoId: string;
  data: string;
  horario: string;
  fimHorario: string;
  duracaoMinutos: number;
  preco: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado";
  notas: string;
  clienteNome: string;
  clienteTelefone: string;
  profissionalId: string;
  servicosSelecionados: SelectedService[];
  produtosSelecionados: SelectedProduct[];
};

export type AppointmentDrawerTab = "appointment" | "information";

export type CheckoutPaymentMethod =
  "dinheiro" | "pix" | "debito" | "credito" | "outro";

export type CheckoutSuccessState = {
  totalCobrado: number;
  formaPagamento: CheckoutPaymentMethod;
  descontoFinal: number;
  troco: number;
  dataPagamento: string;
  cobrancaAntecipada: boolean;
};

export type DaySelection = {
  dayKey: string;
  profId: string | null;
  start: number;
  end: number;
  colKey: string;
  source?: AgendaSelectionSource;
  isDrag?: boolean;
  isDragSelection?: boolean;
  startMinutes?: number;
  endExclusiveMinutes?: number;
  deferResourceValidation?: boolean;
};

export type DayActionMenu = { x: number; y: number; selection: DaySelection };

export type AgendaGridSelectionDragRef = {
  active: boolean;
  pointerId: number;
  colKey: string;
  dayKey: string;
  profId: string | null;
  originY: number;
  originClientX: number;
  originClientY: number;
  scrollEl: HTMLElement | null;
  lastClientX: number;
  lastClientY: number;
  selectionStarted: boolean;
} | null;

export type AppointmentCreateForm = {
  data: string;
  horarioFixo: string;
  horario: string;
  fimHorario: string;
  profissionalId: string;
  servicoId: string;
  clienteId: string | null;
  clienteNome: string;
  clienteTelefone: string;
  corAgendamento: string | null;
  corAgendamentoPersonalizada: boolean;
  preco: string;
  servicosSelecionados: SelectedService[];
  produtosSelecionados: SelectedProduct[];
};

export type AppointmentCreateTab = "appointment" | "notes";

export type AddServiceForm = {
  servicoId: string;
  inicio: string;
  fim: string;
  profissionalId: string;
};

export type BlockCreateForm = {
  data: string;
  horaInicio: string;
  horaFim: string;
  profissionalId: string;
  motivo: string;
  isFolga: boolean;
};

export type AgendaListRow = {
  id: string;
  kind: "appointment" | "block";
  dayKey: string;
  start: number;
  end: number;
  clientName: string;
  serviceName: string;
  professionalName: string;
  clienteNome: string;
  servicoNome: string;
  profissionalNome: string;
  status: string;
  preco: number | null;
  appointment?: Appointment;
  block?: Block;
  /** @deprecated Use `appointment`. */
  ag?: Appointment;
  /** @deprecated Use `block`. */
  bloq?: Block;
};

/**
 * Compatibility aliases for the original Zigo backend vocabulary.
 *
 * They stay exported so existing local integrations can migrate gradually, but
 * the public API and documentation should prefer the English names above.
 */
/** @deprecated Use `Professional`. */
export type Prof = Professional;
/** @deprecated Use `ProfessionalDaySchedule`. */
export type ProfHorarioDia = ProfessionalDaySchedule;
/** @deprecated Use `Service`. */
export type Serv = Service;
/** @deprecated Use `WeekdayKey`. */
export type DiaSemanaKey = WeekdayKey;
/** @deprecated Use `WeekdayBusinessHours`. */
export type HorarioDiaSemana = WeekdayBusinessHours;
/** @deprecated Use `BusinessHours`. */
export type HorariosSemanaTenant = BusinessHours;
/** @deprecated Use `AgendaMetadata`. */
export type AgendaMetaPayload = AgendaMetadata;
/** @deprecated Use `AppointmentServiceLink`. */
export type AgServicoVinculo = AppointmentServiceLink;
/** @deprecated Use `AppointmentProductLink`. */
export type AgProdutoVinculo = AppointmentProductLink;
/** @deprecated Use `Appointment`. */
export type Ag = Appointment;
/** @deprecated Use `AppointmentOccurrencePatch`. */
export type AgOcorrenciaAlterada = AppointmentOccurrencePatch;
/** @deprecated Use `AppointmentOccurrenceOverride`. */
export type AgOccurrenceOverride = AppointmentOccurrenceOverride;
/** @deprecated Use `ClientLookup`. */
export type ClienteLookup = ClientLookup;
/** @deprecated Use `Block`. */
export type Bloq = Block;
/** @deprecated Use `BreakWindow`. */
export type PausaIntervalo = BreakWindow;
/** @deprecated Use `TimeSelectOption`. */
export type HorarioSelectOption = TimeSelectOption;
/** @deprecated Use `SchedulerDrawerItem`. */
export type DrawerItem = SchedulerDrawerItem;
/** @deprecated Use `SelectedService`. */
export type AgServicoSelecionado = SelectedService;
/** @deprecated Use `SelectedProduct`. */
export type AgProdutoSelecionado = SelectedProduct;
/** @deprecated Use `AppointmentEditForm`. */
export type AgEditForm = AppointmentEditForm;
/** @deprecated Use `AppointmentDrawerTab`. */
export type AgDrawerTab = AppointmentDrawerTab | "agendamento" | "informacoes";
/** @deprecated Use `CheckoutPaymentMethod`. */
export type FormaPagamentoCheckout = CheckoutPaymentMethod;
/** @deprecated Use `AppointmentCreateForm`. */
export type AgCreateForm = AppointmentCreateForm;
/** @deprecated Use `AppointmentCreateTab`. */
export type AgCreateTab = AppointmentCreateTab;
/** @deprecated Use `AddServiceForm`. */
export type AddServicoForm = AddServiceForm;
/** @deprecated Use `BlockCreateForm`. */
export type BloqCreateForm = BlockCreateForm;
