import type { AgendaSelectionSource } from "../utils/selection";

export type View = "day" | "week" | "month" | "list";

/** Legacy view ids accepted at runtime for older Zigo integrations. */
export type LegacyView = View | "lista";

export type SchedulerProfessional = {
  id: string;
  name?: string;
  photoUrl?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  schedule?: ProfessionalDaySchedule[];
};

export type LegacyProfessionalFields = {
  /** @deprecated Use `name`. */
  nome?: string;
  /** @deprecated Use `photoUrl`. */
  foto_url?: string | null;
  /** @deprecated Use `opensAt`. */
  horario_abertura?: string | null;
  /** @deprecated Use `closesAt`. */
  horario_fechamento?: string | null;
  /** @deprecated Use `schedule`. */
  horarios_profissional?: ProfessionalDaySchedule[];
};

/**
 * Backward-compatible professional input.
 *
 * New integrations should prefer `SchedulerProfessional`; the extra fields are
 * accepted only to keep older Zigo-shaped backends working.
 */
export type Professional = SchedulerProfessional & LegacyProfessionalFields;

export type SchedulerProfessionalDaySchedule = {
  dayOfWeek?: number;
  startTime?: string | null;
  endTime?: string | null;
  active?: boolean | string | number | null;
  hasBreak?: boolean | string | number | null;
  breakStartsAt?: string | null;
  breakEndsAt?: string | null;
};

export type LegacyProfessionalDayScheduleFields = {
  /** @deprecated Use `dayOfWeek`. */
  dia_semana?: number;
  /** @deprecated Use `startTime`. */
  hora_inicio?: string | null;
  /** @deprecated Use `endTime`. */
  hora_fim?: string | null;
  /** @deprecated Use `active`. */
  ativo?: boolean | string | number | null;
  /** @deprecated Use `hasBreak`. */
  tem_pausa?: boolean | string | number | null;
  /** @deprecated Use `breakStartsAt`. */
  pausa_inicio?: string | null;
  /** @deprecated Use `breakEndsAt`. */
  pausa_fim?: string | null;
};

/**
 * Backward-compatible professional schedule input.
 *
 * New integrations should prefer `SchedulerProfessionalDaySchedule`.
 */
export type ProfessionalDaySchedule = SchedulerProfessionalDaySchedule & LegacyProfessionalDayScheduleFields;

export type SchedulerService = {
  id: string;
  name?: string;
  durationMinutes?: number;
  price?: number;
};

export type LegacyServiceFields = {
  /** @deprecated Use `name`. */
  nome?: string;
  /** @deprecated Use `durationMinutes`. */
  duracao_minutos?: number;
  /** @deprecated Use `price`. */
  preco?: number;
};

/**
 * Backward-compatible service input.
 *
 * New integrations should prefer `SchedulerService`.
 */
export type Service = SchedulerService & LegacyServiceFields;

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

export type SchedulerWeekdayBusinessHours = {
  active?: boolean | string | number | null;
  opensAt?: string | null;
  closesAt?: string | null;
};

export type LegacyWeekdayBusinessHoursFields = {
  /** @deprecated Use `active`. */
  ativo?: boolean | string | number | null;
  /** @deprecated Use `opensAt`. */
  abertura?: string | null;
  /** @deprecated Use `closesAt`. */
  fechamento?: string | null;
};

/**
 * Backward-compatible weekday business-hours input.
 *
 * New integrations should prefer `SchedulerWeekdayBusinessHours`.
 */
export type WeekdayBusinessHours = SchedulerWeekdayBusinessHours & LegacyWeekdayBusinessHoursFields;

export type BusinessHours = Partial<
  Record<WeekdayKey, WeekdayBusinessHours>
>;

export type AgendaMetadata = {
  professionals?: Professional[];
  /** @deprecated Use `professionals`. */
  profissionais?: Professional[];
  services?: Service[];
  /** @deprecated Use `services`. */
  servicos?: Service[];
  business?: {
    opensAt?: string | null;
    /** @deprecated Use `opensAt`. */
    horario_abertura?: string | null;
    closesAt?: string | null;
    /** @deprecated Use `closesAt`. */
    horario_fechamento?: string | null;
    businessHours?: BusinessHours | null;
    /** @deprecated Use `businessHours`. */
    horarios_semana?: HorariosSemanaTenant | null;
    hasBreak?: boolean | string | null;
    /** @deprecated Use `hasBreak`. */
    tem_pausa?: boolean | string | null;
    breakStartsAt?: string | null;
    /** @deprecated Use `breakStartsAt`. */
    pausa_inicio?: string | null;
    breakEndsAt?: string | null;
    /** @deprecated Use `breakEndsAt`. */
    pausa_fim?: string | null;
    agendaGranularityMinutes?: number | null;
    /** @deprecated Use `agendaGranularityMinutes`. */
    granularidade_agenda?: number | null;
    weekScaleMinutes?: number | null;
    /** @deprecated Use `weekScaleMinutes`. */
    escala_visual_semana_agenda_minutos?: number | null;
    appointmentColorMode?: "default" | "appointment" | "padrao" | "por_cliente" | null;
    /** @deprecated Use `appointmentColorMode`. */
    agenda_cor_modo?: "default" | "appointment" | "padrao" | "por_cliente" | null;
    defaultAppointmentColor?: string | null;
    /** @deprecated Use `defaultAppointmentColor`. */
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
  /** @deprecated Use `durationMinutes`. */
  duracao_minutos?: number;
  price?: number;
  /** @deprecated Use `price`. */
  preco?: number;
  servicos?: {
    id?: string;
    name?: string;
    /** @deprecated Use `name`. */
    nome?: string;
    durationMinutes?: number;
    /** @deprecated Use `durationMinutes`. */
    duracao_minutos?: number;
    price?: number;
    /** @deprecated Use `price`. */
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

export type SchedulerAppointment = {
  id: string;
  /** ISO instant. */
  startsAt?: string;
  durationMinutes?: number;
  /** Preparation/travel time reserved before the appointment, in minutes. */
  bufferBeforeMinutes?: number | null;
  /** Cleanup/travel time reserved after the appointment, in minutes. */
  bufferAfterMinutes?: number | null;
  clientName?: string;
  clientId?: string | null;
  clientPhone?: string | null;
  appointmentColor?: string | null;
  appointmentColorIsCustom?: boolean | null;
  status: string;
  paymentStatus?: string | null;
  price?: number | null;
  cancellationReason?: string | null;
  canceledAt?: string | null;
  canceledBy?: string | null;
  advancePaymentStatus?: string | null;
  advancePaymentAmount?: number | null;
  advancePaidAt?: string | null;
  prepaid?: boolean | null;
  prepaidAt?: string | null;
  notes?: string | null;
  serviceId?: string | null;
  servicesCount?: number | null;
  professionalId?: string | null;
  services?:
    | { name?: string; durationMinutes?: number | null; price?: number | null }
    | { name?: string; durationMinutes?: number | null; price?: number | null }[]
    | null;
  recurrence?: string | null;
  recurrenceExceptions?: string[] | null;
  recurrenceOverrides?: Record<string, AppointmentOccurrenceOverride> | null;
};

export type LegacyAppointmentFields = {
  /** @deprecated Use `startsAt`. */
  data_hora?: string;
  /** @deprecated Use `durationMinutes`. */
  duracao_minutos?: number;
  /** @deprecated Use `bufferBeforeMinutes`. */
  buffer_antes_minutos?: number | null;
  /** @deprecated Use `bufferAfterMinutes`. */
  buffer_depois_minutos?: number | null;
  /** @deprecated Use `clientName`. */
  cliente_nome?: string;
  /** @deprecated Use `clientId`. */
  cliente_id?: string | null;
  /** @deprecated Use `clientPhone`. */
  cliente_telefone?: string | null;
  /** @deprecated Use `appointmentColor`. */
  cor_agendamento?: string | null;
  /** @deprecated Use `appointmentColorIsCustom`. */
  cor_agendamento_personalizada?: boolean | null;
  /** @deprecated Use `paymentStatus`. */
  pagamento_status?: string | null;
  /** @deprecated Use `price`. */
  preco?: number | null;
  /** @deprecated Use `cancellationReason`. */
  motivo_cancelamento?: string | null;
  /** @deprecated Use `canceledAt`. */
  cancelado_em?: string | null;
  /** @deprecated Use `canceledBy`. */
  cancelado_por?: string | null;
  /** @deprecated Use `advancePaymentStatus`. */
  adiantamento_status?: string | null;
  /** @deprecated Use `advancePaymentAmount`. */
  adiantamento_valor_snapshot?: number | null;
  /** @deprecated Use `advancePaidAt`. */
  adiantamento_pago_em?: string | null;
  /** @deprecated Use `prepaid`. */
  cobranca_antecipada?: boolean | null;
  /** @deprecated Use `prepaidAt`. */
  cobranca_antecipada_em?: string | null;
  /** @deprecated Use `notes`. */
  notas?: string | null;
  /** @deprecated Use `serviceId`. */
  servico_id?: string | null;
  /** @deprecated Use `servicesCount`. */
  servicos_count?: number | null;
  /** @deprecated Use `professionalId`. */
  profissional_id?: string | null;
  /** @deprecated Use `services`. */
  servicos?:
    | { name?: string; nome?: string; durationMinutes?: number | null; duracao_minutos?: number | null; price?: number | null; preco?: number | null }
    | { name?: string; nome?: string; durationMinutes?: number | null; duracao_minutos?: number | null; price?: number | null; preco?: number | null }[]
    | null;
  /** @deprecated Use `services`. */
  agendamento_servicos?: AppointmentServiceLink[] | null;
  /** @deprecated Use host-managed product metadata. */
  agendamento_produtos?: AppointmentProductLink[] | null;
  /** @deprecated Use `professionalId` and the `professionals` metadata collection. */
  profissionais?: { name?: string; nome?: string } | { name?: string; nome?: string }[] | null;
  /** @deprecated Use `recurrence`. */
  recorrencia?: string | null;
  /** @deprecated Use `recurrenceExceptions`. */
  recorrencia_excecoes?: string[] | null;
  /** @deprecated Use `recurrenceOverrides`. */
  recorrencia_alteracoes?: Record<string, AppointmentOccurrencePatch> | null;
};

/**
 * Backward-compatible appointment input.
 *
 * New integrations should prefer `SchedulerAppointment`; the extra fields are
 * accepted only to keep older Zigo-shaped backends working.
 */
export type Appointment = SchedulerAppointment & LegacyAppointmentFields;

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
