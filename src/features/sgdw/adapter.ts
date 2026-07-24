import type { IntervaloFonte } from "@/src/lib/honorariosParser";
import type { RelatorioHonorarios, ServicoDestaque } from "@/src/features/honorarios/modelo";
import type { SgdwDados, SgdwPeriodo } from "./types";

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

function varPercent(novo: number, base: number): number {
  return base > 0 ? (novo - base) / base : 0;
}

function periodoImportado(
  p: SgdwPeriodo
): NonNullable<RelatorioHonorarios["periodosImportados"]>[number] {
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
    valorOs: p.recebido,
    honorarios: p.honorarios,
    ticket: p.quantidade > 0 ? p.recebido / p.quantidade : 0,
    honorarioMedio: p.quantidade > 0 ? p.honorarios / p.quantidade : 0,
  };
}

/**
 * Converte SgdwDados → RelatorioHonorarios.
 * dadosAnt = mesmo intervalo do ano anterior (para comparação real ano vs ano).
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

  const anoAtual    = ultimo.ano;
  const anoAnterior = dadosAnt?.periodos[0]?.ano ?? anoAtual - 1;
  const META_CRESC  = 0.3;

  // ── Mapa do ano anterior por mês (para comparação real ano vs ano) ──
  const mapAnt = new Map<number, SgdwPeriodo>();
  for (const p of dadosAnt?.periodos ?? []) {
    mapAnt.set(p.mes, p);
  }

  // ── periodosImportados — inclui AMBOS os anos ──
  // Ano anterior primeiro (para base2025Info funcionar)
  const periodosImportados: NonNullable<RelatorioHonorarios["periodosImportados"]> = [
    ...(dadosAnt?.periodos ?? [])
      .sort((a, b) => a.mes - b.mes)
      .map(periodoImportado),
    ...periodos.map(periodoImportado),
  ];

  // ── periodos (análise mês a mês — apenas ano atual) ──
  const periodosAnalise: NonNullable<RelatorioHonorarios["periodos"]> = periodos.map((p, i) => {
    const ant = periodos[i - 1];
    const crescHon = ant && ant.honorarios > 0 ? (p.honorarios - ant.honorarios) / ant.honorarios : null;
    return {
      mes: MESES_FULL[p.mes] ?? String(p.mes),
      label: p.label,
      quantidade: p.quantidade,
      valorOs: p.recebido,
      honorarios: p.honorarios,
      ticket: p.quantidade > 0 ? p.recebido / p.quantidade : 0,
      honorarioMedio: p.quantidade > 0 ? p.honorarios / p.quantidade : 0,
      crescimentoHonorarios: crescHon,
      meta30: ant ? ant.honorarios * 1.3 : 0,
      atingiuMeta: crescHon !== null && crescHon >= META_CRESC,
    };
  });

  // ── comparativo — comparação real: mesmo mês ano atual vs ano anterior ──
  // Fallback sequencial quando não há dadosAnt (ex: primeiro ano da empresa)
  const temDadosAnt = dadosAnt !== null && dadosAnt.periodos.length > 0;
  const comparativo: RelatorioHonorarios["comparativo"] = periodos.map((p, i) => {
    let antQ = 0, antH = 0, antOs = 0;
    if (temDadosAnt) {
      const antP = mapAnt.get(p.mes);
      if (antP) { antQ = antP.quantidade; antH = antP.honorarios; antOs = antP.recebido; }
    } else {
      const antSeq = periodos[i - 1];
      if (antSeq) { antQ = antSeq.quantidade; antH = antSeq.honorarios; antOs = antSeq.recebido; }
    }
    return {
      mes: MESES[p.mes] ?? String(p.mes),
      qtd2025: antQ,
      qtd2026: p.quantidade,
      os2025: antOs,
      os2026: p.recebido,
      honorarios2025: antH,
      honorarios2026: p.honorarios,
      ticket2025: antQ > 0 ? antOs / antQ : 0,
      ticket2026: p.quantidade > 0 ? p.recebido / p.quantidade : 0,
      crescimentoHonorarios: antH > 0 ? (p.honorarios - antH) / antH : null,
    };
  });

  // ── servicos ──
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
      valorOs2026: s.recebido,
      honorarioMedio2026: s.quantidade > 0 ? s.honorarios / s.quantidade : 0,
      crescimento: ant && ant.honorarios > 0 ? (s.honorarios - ant.honorarios) / ant.honorarios : null,
    };
  });

  // ── servicosPorPeriodo — usando rawLinhas com RECEBIDO ──
  type EntradaPeriodo = {
    ano: number; mesNumero: number; label: string;
    quantidade: number; valorOs: number; honorarios: number; honorarioMedio: number;
  };
  type EntradaServico = {
    codigo: number; servico: string; totalHonorarios: number;
    periodoMap: Map<string, EntradaPeriodo>;
  };
  const mapServPer = new Map<string, EntradaServico>();
  const labelMap = new Map(periodos.map((p) => [`${p.ano}-${d2(p.mes)}`, p.label]));

  for (const row of dados.rawLinhas) {
    const sKey = `${Number(row.CODIGO_SERVICO)}::${String(row.SERVICO)}`;
    const hon  = Number(row.HONORARIOS) || 0;
    const rec  = Number(row.RECEBIDO)   || 0;
    const qtd  = Number(row.QUANTIDADE) || 0;
    const ano  = Number(row.ANO);
    const mes  = Number(row.MES);
    const pKey = `${ano}-${d2(mes)}`;
    const label = labelMap.get(pKey) ?? `${MESES[mes] ?? mes}/${ano}`;

    if (!mapServPer.has(sKey)) {
      mapServPer.set(sKey, {
        codigo: Number(row.CODIGO_SERVICO),
        servico: String(row.SERVICO),
        totalHonorarios: 0,
        periodoMap: new Map(),
      });
    }
    const entry = mapServPer.get(sKey)!;
    entry.totalHonorarios += hon;

    const ex = entry.periodoMap.get(pKey);
    if (ex) {
      ex.quantidade += qtd;
      ex.honorarios += hon;
      ex.valorOs    += rec;
      ex.honorarioMedio = ex.quantidade > 0 ? ex.honorarios / ex.quantidade : 0;
    } else {
      entry.periodoMap.set(pKey, {
        ano, mesNumero: mes, label, quantidade: qtd,
        valorOs: rec, honorarios: hon,
        honorarioMedio: qtd > 0 ? hon / qtd : 0,
      });
    }
  }

  const servicosPorPeriodo = Array.from(mapServPer.values())
    .map((e) => ({
      codigo: e.codigo,
      servico: e.servico,
      totalHonorarios: e.totalHonorarios,
      periodos: Array.from(e.periodoMap.values())
        .sort((a, b) => a.ano - b.ano || a.mesNumero - b.mesNumero),
    }))
    .sort((a, b) => b.totalHonorarios - a.totalHonorarios);

  // ── resumo ──
  const totHon25  = dadosAnt?.totalHonorarios ?? 0;
  const totHon26  = dados.totalHonorarios;
  const totRec25  = dadosAnt?.totalRecebido   ?? 0;
  const totRec26  = dados.totalRecebido;
  const totQtd25  = dadosAnt?.totalQuantidade ?? 0;
  const totQtd26  = dados.totalQuantidade;
  const tick25    = totQtd25 > 0 ? totHon25 / totQtd25 : 0;
  const tick26    = totQtd26 > 0 ? totHon26 / totQtd26 : 0;

  const tickOs25 = totQtd25 > 0 ? totRec25 / totQtd25 : 0;
  const tickOs26 = totQtd26 > 0 ? totRec26 / totQtd26 : 0;

  const resumo: RelatorioHonorarios["resumo"] = [
    { indicador: "Quantidade total",   valor2025: totQtd25, valor2026: totQtd26, variacao: varPercent(totQtd26, totQtd25), tipo: "numero" },
    { indicador: "Honorarios totais",  valor2025: totHon25, valor2026: totHon26, variacao: varPercent(totHon26, totHon25), tipo: "moeda"  },
    { indicador: "Honorario medio",    valor2025: tick25,   valor2026: tick26,   variacao: varPercent(tick26, tick25),     tipo: "moeda"  },
    { indicador: "Valor O.S. total",   valor2025: totRec25, valor2026: totRec26, variacao: varPercent(totRec26, totRec25), tipo: "moeda"  },
    { indicador: "Valor recebido",     valor2025: totRec25, valor2026: totRec26, variacao: varPercent(totRec26, totRec25), tipo: "moeda"  },
    { indicador: "Ticket medio O.S.",  valor2025: tickOs25, valor2026: tickOs26, variacao: varPercent(tickOs26, tickOs25), tipo: "moeda"  },
  ];

  // ── auditoria — insights automáticos ──
  const auditoria: RelatorioHonorarios["auditoria"] = [];

  // Períodos com saldo a receber alto (> 30%)
  for (const p of periodos) {
    const saldo = p.honorarios - p.recebido;
    if (p.honorarios > 0 && saldo / p.honorarios > 0.3) {
      auditoria.push({
        arquivo: `SGDW/${p.label}`,
        tipo: "financeiro",
        detalhe: `${p.label}: ${Math.round((1 - p.taxaRecebimento) * 100)}% do honorário não recebido (R$ ${saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
        valor: saldo,
        acao: "Verificar cobrança e recebimentos",
      });
    }
  }

  // Serviços com queda de honorários > 20%
  for (const s of dados.servicos) {
    const ant = mapAntServ.get(`${s.codigo}::${s.servico}`);
    if (ant && ant.honorarios > 0) {
      const cresc = (s.honorarios - ant.honorarios) / ant.honorarios;
      if (cresc < -0.2) {
        auditoria.push({
          arquivo: "SGDW/Serviços",
          tipo: "alerta",
          detalhe: `"${s.servico}" caiu ${Math.round(Math.abs(cresc) * 100)}% vs período anterior`,
          valor: ant.honorarios - s.honorarios,
          acao: "Investigar redução de demanda ou preço",
        });
      } else if (cresc > 0.2) {
        auditoria.push({
          arquivo: "SGDW/Serviços",
          tipo: "destaque",
          detalhe: `"${s.servico}" cresceu ${Math.round(cresc * 100)}% vs período anterior`,
          valor: s.honorarios - ant.honorarios,
          acao: "Replicar estratégia em outros serviços",
        });
      }
    }
  }

  // Serviços com OS sem honorário
  for (const s of dados.servicos.slice(0, 10)) {
    if (s.quantidade > 0 && s.honorarios === 0) {
      auditoria.push({
        arquivo: "SGDW/Serviços",
        tipo: "alerta",
        detalhe: `"${s.servico}": ${s.quantidade} OS sem honorário registrado`,
        valor: 0,
        acao: "Verificar lançamento de valores",
      });
    }
  }

  return {
    resumo,
    comparativo,
    periodos: periodosAnalise,
    periodosImportados,
    servicos,
    servicosPorPeriodo,
    auditoria,
    anos: { anterior: anoAnterior, atual: anoAtual },
    comparacao: {
      tipo: "mes",
      anteriorLabel: primeiro.label,
      atualLabel: ultimo.label,
      metaCrescimento: META_CRESC,
    },
    camposDisponiveis: { valorOs: dados.totalRecebido > 0 },
    arquivos: [`SGDW - ${new Date(dados.geradoEm).toLocaleString("pt-BR")}`],
    totalLinhas: dados.rawLinhas.length,
  };
}
