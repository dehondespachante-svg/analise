import type { IntervaloFonte } from "@/src/lib/honorariosParser";
import type { RelatorioHonorarios, ServicoDestaque } from "@/src/features/honorarios/modelo";
import type { SgdwDados } from "./types";

const MESES: Record<number, string> = {
  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr", 5: "Mai", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
};

const MESES_FULL: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Marco", 4: "Abril", 5: "Maio", 6: "Junho",
  7: "Julho", 8: "Agosto", 9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate();
}

function d2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Converte SgdwDados (API do servidor) para RelatorioHonorarios (shape do app).
 * dadosAnt = mesmo periodo do ano anterior, para comparacao ano-a-ano dos servicos.
 */
export function sgdwParaRelatorio(
  dados: SgdwDados,
  dadosAnt: SgdwDados | null
): RelatorioHonorarios {
  const periodos = [...dados.periodos].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  const primeiro = periodos[0];
  const ultimo   = periodos[periodos.length - 1];

  if (!primeiro || !ultimo) {
    return {
      resumo: [],
      comparativo: [],
      periodos: [],
      periodosImportados: [],
      servicos: [],
      servicosPorPeriodo: [],
      auditoria: [],
      anos: { anterior: new Date().getFullYear() - 1, atual: new Date().getFullYear() },
      comparacao: { tipo: "mes", anteriorLabel: "-", atualLabel: "-", metaCrescimento: 0.3 },
      camposDisponiveis: { valorOs: false },
      arquivos: [],
      totalLinhas: 0,
    };
  }

  const anoAtual   = ultimo.ano;
  const anoAnterior = dadosAnt?.periodos[0]?.ano ?? anoAtual - 1;
  const META_CRESC = 0.3;

  // ── periodosImportados ──
  // Cada mes do SGDW vira um periodo com cobertura completa do mes.
  const periodosImportados: NonNullable<RelatorioHonorarios["periodosImportados"]> = periodos.map((p) => {
    const totalDias = diasNoMes(p.ano, p.mes);
    const intervalo: IntervaloFonte = {
      ano: p.ano, mesNumero: p.mes,
      anoFinal: p.ano, mesFinal: p.mes,
      diaInicial: 1, diaFinal: totalDias,
      inicio: `01/${d2(p.mes)}/${p.ano}`,
      fim: `${d2(totalDias)}/${d2(p.mes)}/${p.ano}`,
      label: `01/${d2(p.mes)}/${p.ano} - ${d2(totalDias)}/${d2(p.mes)}/${p.ano}`,
      corte: `01-${d2(totalDias)}`,
    };
    return {
      ano: p.ano,
      mesNumero: p.mes,
      mes: MESES[p.mes] ?? String(p.mes),
      label: p.label,
      arquivos: [`SGDW/${p.label}`],
      intervalos: [intervalo],
      linhas: p.quantidade,
      quantidade: p.quantidade,
      valorOs: 0,
      honorarios: p.honorarios,
      ticket: 0,
      honorarioMedio: p.quantidade > 0 ? p.honorarios / p.quantidade : 0,
    };
  });

  // ── periodos (analysis shape, mes a mes) ──
  const periodosAnalise: NonNullable<RelatorioHonorarios["periodos"]> = periodos.map((p, i) => {
    const ant = periodos[i - 1];
    const crescHon = ant && ant.honorarios > 0 ? (p.honorarios - ant.honorarios) / ant.honorarios : null;
    return {
      mes: MESES_FULL[p.mes] ?? String(p.mes),
      label: p.label,
      quantidade: p.quantidade,
      valorOs: 0,
      honorarios: p.honorarios,
      ticket: 0,
      honorarioMedio: p.quantidade > 0 ? p.honorarios / p.quantidade : 0,
      crescimentoHonorarios: crescHon,
      meta30: ant ? ant.honorarios * 1.3 : 0,
      atingiuMeta: crescHon !== null && crescHon >= META_CRESC,
    };
  });

  // ── comparativo (sequential, same period shape as honorarios "mes" mode) ──
  const comparativo: RelatorioHonorarios["comparativo"] = periodos.map((p, i) => {
    const ant = periodos[i - 1];
    return {
      mes: MESES[p.mes] ?? String(p.mes),
      qtd2025: ant?.quantidade ?? 0,
      qtd2026: p.quantidade,
      os2025: 0,
      os2026: 0,
      honorarios2025: ant?.honorarios ?? 0,
      honorarios2026: p.honorarios,
      ticket2025: ant?.quantidade ? ant.honorarios / ant.quantidade : 0,
      ticket2026: p.quantidade > 0 ? p.honorarios / p.quantidade : 0,
      crescimentoHonorarios: ant && ant.honorarios > 0 ? (p.honorarios - ant.honorarios) / ant.honorarios : null,
    };
  });

  // ── servicos (ServicoDestaque[]) ──
  const mapAntServ = new Map(
    (dadosAnt?.servicos ?? []).map((s) => [`${s.codigo}::${s.servico}`, s])
  );
  const servicos: ServicoDestaque[] = dados.servicos.map((s) => {
    const ant = mapAntServ.get(`${s.codigo}::${s.servico}`);
    return {
      codigo: s.codigo,
      servico: s.servico,
      qtd2025: ant?.quantidade ?? 0,
      qtd2026: s.quantidade,
      honorarios2025: ant?.honorarios ?? 0,
      honorarios2026: s.honorarios,
      valorOs2026: 0,
      honorarioMedio2026: s.quantidade > 0 ? s.honorarios / s.quantidade : 0,
      crescimento: ant && ant.honorarios > 0 ? (s.honorarios - ant.honorarios) / ant.honorarios : null,
    };
  });

  // ── servicosPorPeriodo (cross-tab: service × period from rawLinhas) ──
  type EntradaServico = {
    codigo: number; servico: string; totalHonorarios: number;
    periodoMap: Map<string, { ano: number; mesNumero: number; label: string; quantidade: number; valorOs: number; honorarios: number; honorarioMedio: number }>;
  };
  const mapServPer = new Map<string, EntradaServico>();
  const labelMap = new Map(periodos.map((p) => [`${p.ano}-${String(p.mes).padStart(2, "0")}`, p.label]));

  for (const row of dados.rawLinhas) {
    const sKey = `${Number(row.CODIGO_SERVICO)}::${String(row.SERVICO)}`;
    const hon  = Number(row.HONORARIOS) || 0;
    const qtd  = Number(row.QUANTIDADE) || 0;
    const ano  = Number(row.ANO);
    const mes  = Number(row.MES);
    const pKey = `${ano}-${String(mes).padStart(2, "0")}`;
    const label = labelMap.get(pKey) ?? `${MESES[mes] ?? mes}/${ano}`;

    if (!mapServPer.has(sKey)) {
      mapServPer.set(sKey, {
        codigo: Number(row.CODIGO_SERVICO), servico: String(row.SERVICO),
        totalHonorarios: 0, periodoMap: new Map(),
      });
    }
    const entry = mapServPer.get(sKey)!;
    entry.totalHonorarios += hon;

    const ex = entry.periodoMap.get(pKey);
    if (ex) {
      ex.quantidade += qtd; ex.honorarios += hon;
      ex.honorarioMedio = ex.quantidade > 0 ? ex.honorarios / ex.quantidade : 0;
    } else {
      entry.periodoMap.set(pKey, { ano, mesNumero: mes, label, quantidade: qtd, valorOs: 0, honorarios: hon, honorarioMedio: qtd > 0 ? hon / qtd : 0 });
    }
  }

  const servicosPorPeriodo = Array.from(mapServPer.values())
    .map((e) => ({
      codigo: e.codigo, servico: e.servico, totalHonorarios: e.totalHonorarios,
      periodos: Array.from(e.periodoMap.values()).sort((a, b) => a.ano - b.ano || a.mesNumero - b.mesNumero),
    }))
    .sort((a, b) => b.totalHonorarios - a.totalHonorarios);

  // ── resumo ──
  const totHon25 = dadosAnt?.totalHonorarios ?? 0;
  const totHon26 = dados.totalHonorarios;
  const totQtd25 = dadosAnt?.totalQuantidade ?? 0;
  const totQtd26 = dados.totalQuantidade;
  const tick25   = totQtd25 > 0 ? totHon25 / totQtd25 : 0;
  const tick26   = totQtd26 > 0 ? totHon26 / totQtd26 : 0;
  const var_ = (a: number, b: number) => b > 0 ? (a - b) / b : 0;

  const resumo: RelatorioHonorarios["resumo"] = [
    { indicador: "Quantidade total",   valor2025: totQtd25, valor2026: totQtd26, variacao: var_(totQtd26, totQtd25), tipo: "numero" },
    { indicador: "Honorarios totais",  valor2025: totHon25, valor2026: totHon26, variacao: var_(totHon26, totHon25), tipo: "moeda"  },
    { indicador: "Honorario medio",    valor2025: tick25,   valor2026: tick26,   variacao: var_(tick26, tick25),     tipo: "moeda"  },
  ];

  return {
    resumo,
    comparativo,
    periodos: periodosAnalise,
    periodosImportados,
    servicos,
    servicosPorPeriodo,
    auditoria: [],
    anos: { anterior: anoAnterior, atual: anoAtual },
    comparacao: {
      tipo: "mes",
      anteriorLabel: primeiro.label,
      atualLabel: ultimo.label,
      metaCrescimento: META_CRESC,
    },
    camposDisponiveis: { valorOs: false },
    arquivos: [`SGDW - ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`],
    totalLinhas: dados.rawLinhas.length,
  };
}
