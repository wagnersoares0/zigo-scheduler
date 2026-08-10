import { describe, expect, it } from "vitest";
import type { SelectedService, Service } from "../../types";
import {
  getAvailableServicesToAdd,
  getEmptySelectedServicesSummary,
  summarizeSelectedServices,
} from "../service-selection";

const servicesCatalog: Service[] = [
  { id: "serv-consultation", nome: "Consultation", duracao_minutos: 30, preco: 45 },
  { id: "serv-review", nome: "Review", duracao_minutos: 20, preco: 25 },
];

describe("service-selection helpers", () => {
  it("keeps the empty summary used by create and edit forms", () => {
    expect(getEmptySelectedServicesSummary()).toEqual({
      itens: [],
      totalDuracao: 0,
      totalPreco: 0,
      resumoNome: "Service",
    });
  });

  it("summarizes selected services using catalog values when available", () => {
    const selected: SelectedService[] = [
      { servicoId: "serv-consultation", nome: "Old consultation", duracaoMinutos: 10, preco: 1 },
      { servicoId: "serv-custom", nome: "Follow-up", duracaoMinutos: 15, preco: 35 },
    ];

    const summary = summarizeSelectedServices({
      form: { servicosSelecionados: selected },
      servicosCatalogo: servicesCatalog,
      duracaoMinima: 20,
    });

    expect(summary).toEqual({
      itens: [
        { servicoId: "serv-consultation", nome: "Consultation", duracaoMinutos: 30, preco: 45 },
        { servicoId: "serv-custom", nome: "Follow-up", duracaoMinutos: 20, preco: 35 },
      ],
      totalDuracao: 50,
      totalPreco: 80,
      resumoNome: "Consultation +1",
    });
  });

  it("filters already selected services from add-service options", () => {
    const available = getAvailableServicesToAdd({
      servicosSelecionados: [{ servicoId: "serv-consultation", nome: "Consultation", duracaoMinutos: 30, preco: 45 }],
      servicosCatalogo: servicesCatalog,
    });

    expect(available).toEqual([{ id: "serv-review", nome: "Review", duracao_minutos: 20, preco: 25 }]);
  });
});
