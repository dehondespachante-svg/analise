import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AnaliseDadosLocais, CidadeLocal, EstrategiaPNVALocal, FiltroListaLocal } from "./types";

type RegistroLocal = {
  colecao?: string;
  cepComprador?: string;
  municipioComprador?: string;
  dataCriacao?: string | null;
  concluido?: boolean;
  status?: string;
};

type SnapshotLocal = {
  sincronizadoEm?: string;
  limiteLeituras?: number;
  leiturasExecutadas?: number;
  truncado?: boolean;
  colecoes?: Record<string, number>;
  registros?: RegistroLocal[];
};

const SNAPSHOT_PATH = path.join(process.cwd(), "data", "dados-locais-vendas.json");
const COLECAO_OFICIAL = "Betodespachanteintrncaodevendaoficial";
const COLECAO_DIGITAL = "Betodespachanteintrncaodevendaoficialdigital";

function nomeDoFiltro(filtro: FiltroListaLocal) {
  if (filtro === "oficial") return "Somente lista oficial";
  if (filtro === "digital") return "Somente lista digital";
  return "As duas listas";
}

function textoDoFiltro(filtro: FiltroListaLocal) {
  if (filtro === "oficial") return "na lista oficial";
  if (filtro === "digital") return "na lista digital";
  return "nas duas listas";
}

function registroDoFiltro(record: RegistroLocal, filtro: FiltroListaLocal) {
  if (filtro === "oficial") return record.colecao === COLECAO_OFICIAL;
  if (filtro === "digital") return record.colecao === COLECAO_DIGITAL;
  return true;
}

function periodoDosRegistros(records: RegistroLocal[]) {
  let primeira: string | null = null;
  let ultima: string | null = null;
  let primeiroTempo = Number.POSITIVE_INFINITY;
  let ultimoTempo = Number.NEGATIVE_INFINITY;

  for (const record of records) {
    const value = record.dataCriacao;
    if (!value) continue;
    const time = Date.parse(value);
    if (!Number.isFinite(time)) continue;
    if (time < primeiroTempo) {
      primeiroTempo = time;
      primeira = value;
    }
    if (time > ultimoTempo) {
      ultimoTempo = time;
      ultima = value;
    }
  }

  return { primeiroDocumentoEm: primeira, ultimoDocumentoEm: ultima };
}

function normalizarCep(value?: string) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
}

function normalizarCidade(value?: string) {
  const city = repararTextoCompleto(value || "")
    .trim()
    .replace(/\s*[-/]\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i, "")
    .replace(/\s+/g, " ");
  if (!city) return "";
  const title = city
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
  return title.replace(/\b(De|Do|Da|Dos|Das|E)\b/g, (word) => word.toLocaleLowerCase("pt-BR"));
}

function repararTexto(value: string) {
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    return repaired.includes("\uFFFD") ? value : repaired;
  } catch {
    return value;
  }
}

function repararTextoCompleto(value: string) {
  const windows1252 = new Map<number, number>([
    [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
    [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
    [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
    [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
    [0x017e, 0x9e], [0x0178, 0x9f],
  ]);
  let atual = value.includes("ƒ") ? value : repararTexto(value);
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    if (!/[ÃÂƒ]/.test(atual)) break;
    const bytes = [...atual].map((character) => {
      const code = character.codePointAt(0) || 0;
      return code <= 0xff ? code : windows1252.get(code) ?? 0x3f;
    });
    const repaired = Buffer.from(bytes).toString("utf8");
    if (repaired === atual || repaired.includes("\uFFFD")) break;
    atual = repaired;
  }
  return atual;
}

function chaveCidade(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function qualidadeNomeCidade(value: string) {
  const semAcentos = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return semAcentos !== value ? 1 : 0;
}

function montarEstrategiaPNVA(params: {
  total: number;
  comCep: number;
  cities: CidadeLocal[];
  concluidos: number;
  concluidosComCep: number;
  quantidadeListas: number;
  nomeFiltro: string;
  textoFiltro: string;
}): EstrategiaPNVALocal {
  const { total, comCep, cities, concluidos, concluidosComCep, quantidadeListas, nomeFiltro, textoFiltro } = params;
  const cobertura = total ? comCep / total : 0;
  const concentracaoTop2 = (cities[0]?.percentual || 0) + (cities[1]?.percentual || 0);
  const conclusao = total ? concluidos / total : 0;
  const confianca = Math.round(Math.min(100, cobertura * 72 + Math.min(1, total / 5_000) * 18 + (cities.length ? 10 : 0)));
  const foraTop2 = Math.max(0, comCep - (cities[0]?.quantidade || 0) - (cities[1]?.quantidade || 0));
  const semCep = Math.max(0, total - comCep);
  const concluidosTop2 = (cities[0]?.concluidos || 0) + (cities[1]?.concluidos || 0);
  const concluidosForaTop2 = Math.max(0, concluidosComCep - concluidosTop2);
  const leituraConcentracao = concentracaoTop2 >= 0.5
    ? "mais da metade dos compradores"
    : concentracaoTop2 >= 0.3
      ? "cerca de 1 de cada 3 compradores"
      : concentracaoTop2 >= 0.22
        ? "cerca de 1 de cada 4 compradores"
        : `${Math.round(concentracaoTop2 * 1000) / 10}% dos compradores`;

  return {
    versao: "pnva-core-dados-locais-v1",
    responsavel: "Gustavo Martins",
    confianca,
    diagnostico: `${cities[0]?.cidade || "A primeira cidade"} e ${cities[1]?.cidade || "a segunda cidade"} juntas trazem ${leituraConcentracao}.`,
    proximaAcao: `Comece por ${cities[0]?.cidade || "a cidade lider"}. Depois repita o que funcionar em ${cities[1]?.cidade || "a segunda cidade"}.`,
    sinais: [
      `${Math.round(cobertura * 1000) / 10}% dos cadastros tem CEP com 8 numeros.`,
      `Existem compradores em ${cities.length} cidades.`,
      `${cities[0]?.cidade || "A primeira cidade"} e ${cities[1]?.cidade || "a segunda cidade"} juntas tem ${((cities[0]?.quantidade || 0) + (cities[1]?.quantidade || 0)).toLocaleString("pt-BR")} compradores.`,
      `${concluidos.toLocaleString("pt-BR")} vendas aparecem como concluidas.`,
    ],
    travasPreservadas: [
      "A pagina abre sem gastar novas leituras do banco.",
      "CPF, telefone, e-mail e assinatura ficam fora desta tela.",
      "Sem CEP e sem cidade, o cadastro nao entra no mapa.",
      "Toda dica precisa mostrar o numero usado.",
    ],
    etapas: [
      {
        etapa: "Olhar",
        titulo: "Onde estao os compradores?",
        leitura: `${cities[0]?.cidade || "A primeira cidade"} e ${cities[1]?.cidade || "a segunda cidade"} sao os dois melhores lugares para comecar.`,
        indicador: `${cities.length} cidades encontradas`,
        status: cities.length >= 20 ? "bom" : "alerta",
      },
      {
        etapa: "Arrumar",
        titulo: "Os nomes estao organizados?",
        leitura: "O sistema corrige acentos e junta nomes iguais antes de contar.",
        indicador: `${Math.round(cobertura * 1000) / 10}% com CEP de 8 numeros`,
        status: cobertura >= 0.95 ? "bom" : cobertura >= 0.8 ? "alerta" : "critico",
      },
      {
        etapa: "Conferir",
        titulo: "Da para confiar nos numeros?",
        leitura: "A leitura usa somente os dados baixados e mostra quando falta informacao.",
        indicador: `Qualidade ${confianca}/100`,
        status: confianca >= 85 ? "bom" : confianca >= 65 ? "alerta" : "critico",
      },
      {
        etapa: "Fazer",
        titulo: "O que fazer agora?",
        leitura: `Comece por ${cities[0]?.cidade || "a cidade lider"} e depois leve a mesma acao para ${cities[1]?.cidade || "a segunda cidade"}.`,
        indicador: `${Math.round(concentracaoTop2 * 1000) / 10}% nas 2 primeiras`,
        status: "bom",
      },
    ],
    marcos: [
      {
        titulo: "Listas prontas",
        valor: `${total.toLocaleString("pt-BR")} vendas`,
        detalhe: quantidadeListas === 1 ? `${nomeFiltro} esta pronta para usar.` : "As duas listas estao prontas para usar.",
        status: "atingido",
      },
      {
        titulo: "Cadastros com local",
        valor: `${Math.round(cobertura * 1000) / 10}% com CEP`,
        detalhe: cobertura >= 0.98 ? "Quase todos os cadastros podem ser colocados no mapa." : "Ainda existem cadastros sem localizacao.",
        status: cobertura >= 0.98 ? "atingido" : "em-progresso",
      },
      {
        titulo: "Duas melhores cidades",
        valor: `${Math.round(concentracaoTop2 * 1000) / 10}% do total`,
        detalhe: "Vale fazer uma campanha propria para essas duas cidades.",
        status: concentracaoTop2 >= 0.25 ? "atingido" : "em-progresso",
      },
      {
        titulo: "Compradores em outras cidades",
        valor: `${foraTop2.toLocaleString("pt-BR")} compradores`,
        detalhe: "Pessoas que podem entrar na proxima campanha.",
        status: "proximo",
      },
    ],
    ganhos: [
      {
        titulo: "Vendas concluidas",
        valor: concluidos.toLocaleString("pt-BR"),
        detalhe: `Vendas marcadas como concluidas ${textoFiltro}.`,
        acao: "Use esse numero como base real para acompanhar crescimento.",
      },
      {
        titulo: "Concluidas nas 2 cidades lideres",
        valor: concluidosTop2.toLocaleString("pt-BR"),
        detalhe: `Vendas reais concluidas em ${cities[0]?.cidade || "primeira cidade"} e ${cities[1]?.cidade || "segunda cidade"}.`,
        acao: "Repita nessas cidades as acoes que ja trouxeram vendas.",
      },
      {
        titulo: "Concluidas fora do top 2",
        valor: concluidosForaTop2.toLocaleString("pt-BR"),
        detalhe: "Vendas concluidas com CEP de 8 numeros nas outras cidades.",
        acao: `Escolha a terceira cidade do ranking e teste uma campanha. Existem ${semCep.toLocaleString("pt-BR")} CEPs para revisar.`,
      },
    ],
    campos: [
      {
        campo: "cepcomprador",
        uso: "Mostra onde o comprador esta.",
        cobertura: `${Math.round(cobertura * 1000) / 10}%`,
      },
      {
        campo: "municipiocomprador",
        uso: "Diz o nome da cidade.",
        cobertura: `${cities.length} cidades`,
      },
      {
        campo: "status + concluido",
        uso: "Mostra se a venda foi concluida.",
        cobertura: `${Math.round(conclusao * 1000) / 10}%`,
      },
      {
        campo: "colecao",
        uso: "Mostra de qual lista a venda veio.",
        cobertura: `${quantidadeListas} ${quantidadeListas === 1 ? "lista" : "listas"}`,
      },
    ],
  };
}

export async function carregarAnaliseDadosLocais(filtro: FiltroListaLocal = "todas"): Promise<AnaliseDadosLocais> {
  let snapshot: SnapshotLocal;
  try {
    const content = await readFile(SNAPSHOT_PATH, "utf8");
    snapshot = JSON.parse(content.replace(/^\uFEFF/, "")) as SnapshotLocal;
  } catch {
    return {
      disponivel: false,
      filtroAtivo: filtro,
      nomeFiltro: nomeDoFiltro(filtro),
      sincronizadoEm: null,
      primeiroDocumentoEm: null,
      ultimoDocumentoEm: null,
      totalRegistros: 0,
      comCep: 0,
      semCep: 0,
      cepFormatoInvalido: 0,
      semCepInformado: 0,
      cidadeSemCep: 0,
      cepSemCidade: 0,
      semLocalizacao: 0,
      cidadesIdentificadas: 0,
      leiturasExecutadas: 0,
      limiteLeituras: 12_000,
      truncado: false,
      colecoes: [],
      topCidades: [],
      estrategiaPNVA: null,
    };
  }

  const records = (snapshot.registros || []).filter((record) => registroDoFiltro(record, filtro));
  const periodo = periodoDosRegistros(records);
  const colecoesSelecionadas = Object.entries(snapshot.colecoes || {})
    .filter(([nome]) => filtro === "todas" || (filtro === "oficial" ? nome === COLECAO_OFICIAL : nome === COLECAO_DIGITAL))
    .map(([nome, quantidade]) => ({
      nome,
      quantidade,
      ...periodoDosRegistros(records.filter((record) => record.colecao === nome)),
    }));
  const cities = new Map<string, { cidade: string; quantidade: number; concluidos: number; ceps: Set<string> }>();
  let comCep = 0;
  let cepFormatoInvalido = 0;
  let semCepInformado = 0;
  let cidadeSemCep = 0;
  let cepSemCidade = 0;
  let semLocalizacao = 0;
  let concluidos = 0;
  let concluidosComCep = 0;

  for (const record of records) {
    const status = repararTextoCompleto(record.status || "").toLocaleLowerCase("pt-BR");
    const finalizado = record.concluido || status.includes("conclu");
    if (finalizado) concluidos += 1;
    const cepInformado = (record.cepComprador || "").trim();
    const cep = normalizarCep(cepInformado);
    const city = normalizarCidade(record.municipioComprador);
    if (!cep) {
      if (cepInformado) cepFormatoInvalido += 1;
      else semCepInformado += 1;
      if (city) cidadeSemCep += 1;
      else semLocalizacao += 1;
      continue;
    }
    comCep += 1;
    if (finalizado) concluidosComCep += 1;
    if (!city) {
      cepSemCidade += 1;
      continue;
    }
    const cityKey = chaveCidade(city);
    const current = cities.get(cityKey) || { cidade: city, quantidade: 0, concluidos: 0, ceps: new Set<string>() };
    if (qualidadeNomeCidade(city) > qualidadeNomeCidade(current.cidade)) current.cidade = city;
    current.quantidade += 1;
    current.concluidos += finalizado ? 1 : 0;
    current.ceps.add(cep);
    cities.set(cityKey, current);
  }

  const cidadesOrdenadas: CidadeLocal[] = [...cities.values()]
    .map((value) => ({
      cidade: value.cidade,
      quantidade: value.quantidade,
      percentual: comCep ? value.quantidade / comCep : 0,
      concluidos: value.concluidos,
      cepsUnicos: value.ceps.size,
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.cidade.localeCompare(b.cidade, "pt-BR"));
  const topCidades = cidadesOrdenadas.slice(0, 20);

  return {
    disponivel: true,
    filtroAtivo: filtro,
    nomeFiltro: nomeDoFiltro(filtro),
    sincronizadoEm: snapshot.sincronizadoEm || null,
    ...periodo,
    totalRegistros: records.length,
    comCep,
    semCep: records.length - comCep,
    cepFormatoInvalido,
    semCepInformado,
    cidadeSemCep,
    cepSemCidade,
    semLocalizacao,
    cidadesIdentificadas: cities.size,
    leiturasExecutadas: snapshot.leiturasExecutadas || records.length,
    limiteLeituras: snapshot.limiteLeituras || 12_000,
    truncado: snapshot.truncado === true,
    colecoes: colecoesSelecionadas,
    topCidades,
    estrategiaPNVA: montarEstrategiaPNVA({
      total: records.length,
      comCep,
      cities: cidadesOrdenadas,
      concluidos,
      concluidosComCep,
      quantidadeListas: colecoesSelecionadas.length,
      nomeFiltro: nomeDoFiltro(filtro),
      textoFiltro: textoDoFiltro(filtro),
    }),
  };
}
