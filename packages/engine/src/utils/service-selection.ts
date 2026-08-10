import type { SelectedService, Service } from "../types";

export type SelectedServicesSummary = {
  itens: SelectedService[];
  totalDuracao: number;
  totalPreco: number;
  resumoNome: string;
};

/** @deprecated Use `SelectedServicesSummary`. */
export type ServicosSelecionadosResumo = SelectedServicesSummary;

type FormWithSelectedServices = {
  servicosSelecionados?: SelectedService[] | null;
};

const DEFAULT_SERVICE_LABEL = "Service";

export function getEmptySelectedServicesSummary(): SelectedServicesSummary {
  return {
    itens: [],
    totalDuracao: 0,
    totalPreco: 0,
    resumoNome: DEFAULT_SERVICE_LABEL,
  };
}

/** @deprecated Use `getEmptySelectedServicesSummary`. */
export const getEmptyServicosSelecionadosResumo = getEmptySelectedServicesSummary;

export function summarizeSelectedServices({
  form,
  servicosCatalogo,
  duracaoMinima,
}: {
  form: FormWithSelectedServices | null;
  servicosCatalogo: Service[];
  duracaoMinima: number;
}): SelectedServicesSummary {
  if (!form) return getEmptySelectedServicesSummary();

  const items = (form.servicosSelecionados ?? []).map((item) => {
    const catalogEntry = servicosCatalogo.find((serv) => serv.id === item.servicoId);
    const baseDuration = catalogEntry?.duracao_minutos ?? item.duracaoMinutos;
    const basePrice = catalogEntry?.preco ?? item.preco;
    return {
      servicoId: item.servicoId,
      nome: catalogEntry?.nome ?? item.nome,
      duracaoMinutos: Math.max(duracaoMinima, Number(baseDuration) || duracaoMinima),
      preco: Math.max(0, Number(basePrice) || 0),
    };
  });

  const totalDuracao = items.reduce((acc, item) => acc + item.duracaoMinutos, 0);
  const totalPreco = items.reduce((acc, item) => acc + item.preco, 0);
  const resumoNome =
    items.length === 0
      ? DEFAULT_SERVICE_LABEL
      : items.length === 1
        ? items[0].nome
        : `${items[0].nome} +${items.length - 1}`;

  return { itens: items, totalDuracao, totalPreco, resumoNome };
}

/** @deprecated Use `summarizeSelectedServices`. */
export const resumirServicosSelecionados = summarizeSelectedServices;

export function getAvailableServicesToAdd({
  servicosSelecionados,
  servicosCatalogo,
}: {
  servicosSelecionados?: SelectedService[] | null;
  servicosCatalogo: Service[];
}): Service[] {
  const selectedIds = new Set((servicosSelecionados ?? []).map((item) => item.servicoId));
  return servicosCatalogo.filter((serv) => !selectedIds.has(serv.id));
}

/** @deprecated Use `getAvailableServicesToAdd`. */
export const getServicosDisponiveisParaAdicionar = getAvailableServicesToAdd;
