"use client";

import type {
  SgdwConfig, SgdwDados, SgdwLinhaBruta, SgdwPeriodo, SgdwServico,
  SgdwPaginaDados, OsFiltros, CaixaFiltros, SgdwOsKpi, SgdwCaixaKpi,
} from "./types";

const MESES: Record<number, string> = {
  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr", 5: "Mai", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
};

async function sgdwPost<T>(_config: SgdwConfig, _endpoint: string, body: unknown): Promise<T> {
  const resp = await fetch("/api/sgdw-relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (resp.status === 503) {
    const err = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "SGDW indisponivel.");
  }
  if (resp.status === 401) throw new Error("Token invalido ou nao autorizado.");
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`API retornou HTTP ${resp.status}${txt ? ": " + txt.slice(0, 120) : ""}.`);
  }
  return resp.json() as Promise<T>;
}

export type DiagCampos = Record<string, number>;

export async function diagnosticarCamposValor(
  config: SgdwConfig, ano: number, mes: number
): Promise<DiagCampos> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ini = `${ano}-${pad(mes)}-01`;
  const fim = `${ano}-${pad(mes)}-31`;
  const params = [ini, fim];
  const where = `FROM tbordse o WHERE COALESCE(o.ordcanc,0)=0 AND o.orddtemi>=? AND o.orddtemi<=?`;
  const resultado: DiagCampos = {};
  const campos: Array<[string, string]> = [
    ["QTD",       `SELECT COUNT(*) AS V ${where}`],
    ["ordvltot",  `SELECT SUM(COALESCE(o.ordvltot,0)) AS V ${where}`],
    ["ordvalor",  `SELECT SUM(COALESCE(o.ordvalor,0)) AS V ${where}`],
    ["ordvlhon",  `SELECT SUM(COALESCE(o.ordvlhon,0)) AS V ${where}`],
    ["ordvlrec",  `SELECT SUM(COALESCE(o.ordvlrec,0)) AS V ${where}`],
    ["ordvlare",  `SELECT SUM(COALESCE(o.ordvlare,0)) AS V ${where}`],
    ["ordvlpago", `SELECT SUM(COALESCE(o.ordvlpago,0)) AS V ${where}`],
    ["ordvlpag",  `SELECT SUM(COALESCE(o.ordvlpag,0)) AS V ${where}`],
    ["ordvlserv", `SELECT SUM(COALESCE(o.ordvlserv,0)) AS V ${where}`],
  ];
  await Promise.allSettled(
    campos.map(async ([nome, sql]) => {
      try {
        const r = await sgdwPost<{ rows: Array<Record<string, number>> }>(config, "/api/sgdw-query", { sql, params });
        resultado[nome] = Number(r.rows?.[0]?.V ?? r.rows?.[0]?.v ?? 0);
      } catch { resultado[nome] = -1; }
    })
  );
  return resultado;
}

export async function descobrirSchema(config: SgdwConfig): Promise<{ tabela: string; colunas: string[] }[]> {
  const tabelas = ["TBORDSE", "TBSEROS", "TBCLIEN", "TBCIDADE", "TBHISTO", "TBUSUAR"];
  const resultados = await Promise.allSettled(
    tabelas.map(async (tabela) => {
      const r = await sgdwPost<{ rows: Array<{ CAMPO: string }> }>(config, "/api/sgdw-query", {
        sql: `SELECT TRIM(f.RDB$FIELD_NAME) AS CAMPO FROM RDB$RELATION_FIELDS f WHERE f.RDB$RELATION_NAME = '${tabela}' ORDER BY f.RDB$FIELD_POSITION`,
      });
      return { tabela, colunas: r.rows.map((row) => row.CAMPO) };
    })
  );
  return resultados.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean) as { tabela: string; colunas: string[] }[];
}

export async function testarConexaoSgdw(config: SgdwConfig): Promise<void> {
  const result = await sgdwPost<{ rows: unknown[] }>(config, "/api/sgdw-query", {
    sql: "SELECT 1 AS PING FROM RDB$DATABASE",
  });
  if (!Array.isArray(result.rows)) throw new Error("Resposta inesperada da API.");
}

export async function buscarHonorariosSgdw(
  config: SgdwConfig, anoInicio: number, anoFim: number, mesInicio = 1, mesFim = 12
): Promise<SgdwDados> {
  const pad = (n: number) => String(n).padStart(2, "0");
  // Use exclusive upper bound (< first day of next period) to correctly include
  // all timestamps on the last day — ORDDTEMI is a TIMESTAMP field, so
  // '<= 2026-05-31' would be '2026-05-31 00:00:00' and miss afternoon entries.
  const dataInicio = `${anoInicio}-${pad(mesInicio)}-01`;
  const anoFimSeg  = mesFim === 12 ? anoFim + 1 : anoFim;
  const mesFimSeg  = mesFim === 12 ? 1 : mesFim + 1;
  const dataFim    = `${anoFimSeg}-${pad(mesFimSeg)}-01`; // exclusive: < first day of next period
  const LIMITE_GRUPOS = 100_000;

  // Normalize service name for matching between TBSEROS (has accents) and TBCAIXA (no accents).
  // Order matters: strip month suffix first (while accents intact), then NFD-strip accents.
  const MESES_SUFIXO = /\s*-\s*(JANEIRO|FEVEREIRO|MAR[CÇC]O|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\b.*/i;
  const MESES_SOLTO  = /\b(JANEIRO|FEVEREIRO|MAR[CÇC]O|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\b/gi;
  const normServ = (s: string) =>
    String(s).toUpperCase()
      .replace(MESES_SUFIXO, "")
      .replace(MESES_SOLTO, "")
      .normalize("NFD")                        // decompose: Ã→A+combining, Ê→E+combining …
      .replace(/[̀-ͯ]/g, "")         // strip all combining diacritical marks
      .replace(/\s+/g, " ").trim();

  // Run OS query (counts + total OS value) and TBCAIXA honorários query in parallel.
  // TBCAIXA.cdplanoconta=141 = "HONORARIOS" income account — the actual service fee receipts,
  // excluding government pass-through taxes (IPVA, DETRAN fees) that inflate ORDVLTOT.
  const [resultOS, resultCaixa] = await Promise.all([
    sgdwPost<{ rows: Array<{ ANO: number; MES: number; CODIGO_SERVICO: number; SERVICO: string; QUANTIDADE: number; RECEBIDO: number }> }>(config, "/api/sgdw-query", {
      sql: `SELECT FIRST ${LIMITE_GRUPOS}
         EXTRACT(YEAR FROM o.orddtemi) AS ANO,
         EXTRACT(MONTH FROM o.orddtemi) AS MES,
         COALESCE(s.SOSNUMER, 0) AS CODIGO_SERVICO,
         COALESCE(TRIM(s.SOSDESCR), 'SEM SERVICO') AS SERVICO,
         COUNT(*) AS QUANTIDADE,
         SUM(COALESCE(o.ordvltot, o.ordvalor, 0)) AS RECEBIDO
       FROM tbordse o
       LEFT JOIN TBSEROS s ON o.sosnumer = s.SOSNUMER
       WHERE COALESCE(o.ordcanc, 0) = 0
         AND COALESCE(o.ordvltot, o.ordvalor, 0) > 0
         AND o.orddtemi >= ? AND o.orddtemi < ?
       GROUP BY EXTRACT(YEAR FROM o.orddtemi), EXTRACT(MONTH FROM o.orddtemi), s.SOSNUMER, s.SOSDESCR
       ORDER BY EXTRACT(YEAR FROM o.orddtemi), EXTRACT(MONTH FROM o.orddtemi),
                SUM(COALESCE(o.ordvltot, o.ordvalor, 0)) DESC`,
      params: [dataInicio, dataFim],
    }),
    sgdwPost<{ rows: Array<{ ANO: number; MES: number; CODIGO_SERVICO: number; SERVICO: string; HONORARIOS: number }> }>(config, "/api/sgdw-query", {
      // Join TBCAIXA → TBORDSE (via ORDORIGEM) → TBSEROS to get the canonical service per payment.
      // Entries without a linked OS (ORDORIGEM=0/NULL) fall to CODIGO_SERVICO=0/'OUTROS HONORARIOS'.
      sql: `SELECT FIRST 200000
         EXTRACT(YEAR FROM c.orddtemi) AS ANO,
         EXTRACT(MONTH FROM c.orddtemi) AS MES,
         COALESCE(s.SOSNUMER, 0) AS CODIGO_SERVICO,
         COALESCE(TRIM(s.SOSDESCR), 'OUTROS HONORARIOS') AS SERVICO,
         SUM(c.valor) AS HONORARIOS
       FROM tbcaixa c
       LEFT JOIN tbordse o ON c.ordorigem = o.ordnumer AND c.ordorigem > 0
       LEFT JOIN TBSEROS s ON o.sosnumer = s.SOSNUMER
       WHERE c.cdplanoconta = 141
         AND c.tplancto = 'C'
         AND COALESCE(c.estorno, 0) = 0
         AND c.orddtemi >= ? AND c.orddtemi < ?
       GROUP BY EXTRACT(YEAR FROM c.orddtemi), EXTRACT(MONTH FROM c.orddtemi), s.SOSNUMER, s.SOSDESCR
       ORDER BY EXTRACT(YEAR FROM c.orddtemi), EXTRACT(MONTH FROM c.orddtemi), SUM(c.valor) DESC`,
      params: [dataInicio, dataFim],
    }),
  ]);

  const osLinhas = resultOS.rows || [];
  const caixaLinhas = resultCaixa.rows || [];

  // Build TBCAIXA lookup: period total and per-service amounts.
  // Key = "ano-mm::codigoServico" — numeric, no encoding issues.
  const caixaTotals = new Map<string, number>();
  const caixaByServ = new Map<string, number>(); // "pk::codigoServico" → honorários
  for (const row of caixaLinhas) {
    const ano = Number(row.ANO), mes = Number(row.MES);
    const pk = `${ano}-${pad(mes)}`;
    const hon = Number(row.HONORARIOS) || 0;
    caixaTotals.set(pk, (caixaTotals.get(pk) ?? 0) + hon);
    const key = `${pk}::${Number(row.CODIGO_SERVICO)}`;
    caixaByServ.set(key, (caixaByServ.get(key) ?? 0) + hon);
  }

  // Merge OS rows with TBCAIXA honorários by period + CODIGO_SERVICO (numeric key, reliable).
  const rawLinhas: SgdwLinhaBruta[] = [];
  const matchedCaixaKeys = new Set<string>();

  for (const row of osLinhas) {
    const ano = Number(row.ANO), mes = Number(row.MES);
    const pk = `${ano}-${pad(mes)}`;
    const key = `${pk}::${Number(row.CODIGO_SERVICO)}`;
    const hon = caixaByServ.get(key) ?? 0;
    if (hon > 0) matchedCaixaKeys.add(key);
    rawLinhas.push({
      ANO: row.ANO, MES: row.MES,
      CODIGO_SERVICO: row.CODIGO_SERVICO,
      SERVICO: row.SERVICO,
      QUANTIDADE: row.QUANTIDADE,
      HONORARIOS: hon,
      RECEBIDO: row.RECEBIDO,
    } as SgdwLinhaBruta);
  }

  // TBCAIXA entries with CODIGO_SERVICO=0 (no linked OS) go to a catch-all "OUTROS HONORARIOS" row.
  const unmatchedByPeriod = new Map<string, { ano: number; mes: number; hon: number }>();
  for (const row of caixaLinhas) {
    const ano = Number(row.ANO), mes = Number(row.MES);
    const pk = `${ano}-${pad(mes)}`;
    const key = `${pk}::${Number(row.CODIGO_SERVICO)}`;
    if (!matchedCaixaKeys.has(key)) {
      const cur = unmatchedByPeriod.get(pk) ?? { ano, mes, hon: 0 };
      cur.hon += Number(row.HONORARIOS) || 0;
      unmatchedByPeriod.set(pk, cur);
    }
  }
  for (const [pk, { ano, mes, hon }] of unmatchedByPeriod) {
    if (hon > 0) {
      rawLinhas.push({
        ANO: ano, MES: mes,
        CODIGO_SERVICO: 0,
        SERVICO: "OUTROS HONORARIOS",
        QUANTIDADE: 0,
        HONORARIOS: hon,
        RECEBIDO: 0,
      } as SgdwLinhaBruta);
    }
    void pk;
  }

  const porPeriodo = new Map<string, SgdwPeriodo>();
  const porServico = new Map<string, SgdwServico>();
  let totalRecebido = 0, totalQuantidade = 0;

  for (const row of rawLinhas) {
    const ano = Number(row.ANO), mes = Number(row.MES);
    const hon = Number(row.HONORARIOS) || 0, rec = Number(row.RECEBIDO) || 0, qtd = Number(row.QUANTIDADE) || 0;
    const pk = `${ano}-${pad(mes)}`;
    const p = porPeriodo.get(pk) ?? { ano, mes, label: `${MESES[mes] ?? mes}/${ano}`, honorarios: 0, recebido: 0, quantidade: 0, taxaRecebimento: 0 };
    p.recebido += rec; p.quantidade += qtd;
    porPeriodo.set(pk, p);
    const sk = `${Number(row.CODIGO_SERVICO)}-${row.SERVICO}`;
    const s = porServico.get(sk) ?? { codigo: Number(row.CODIGO_SERVICO), servico: String(row.SERVICO || "SEM SERVICO"), honorarios: 0, recebido: 0, quantidade: 0, participacao: 0 };
    s.honorarios += hon; s.recebido += rec; s.quantidade += qtd;
    porServico.set(sk, s);
    totalRecebido += rec; totalQuantidade += qtd;
  }

  // Per-period honorário comes from TBCAIXA totals (most accurate source)
  let totalHonorarios = 0;
  for (const [pk, p] of porPeriodo) {
    p.honorarios = caixaTotals.get(pk) ?? 0;
    totalHonorarios += p.honorarios;
  }

  const periodos: SgdwPeriodo[] = Array.from(porPeriodo.values())
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .map((p) => ({ ...p, taxaRecebimento: p.recebido > 0 && p.honorarios > 0 ? Math.min(p.recebido / p.honorarios, 1) : 0 }));
  const servicos: SgdwServico[] = Array.from(porServico.values())
    .sort((a, b) => b.honorarios - a.honorarios)
    .map((s) => ({ ...s, participacao: totalHonorarios > 0 ? s.honorarios / totalHonorarios : 0 }));

  return { periodos, servicos, rawLinhas, totalHonorarios, totalRecebido, totalQuantidade, taxaGlobal: totalHonorarios > 0 ? totalRecebido / totalHonorarios : 0, geradoEm: new Date().toISOString(), truncado: osLinhas.length >= LIMITE_GRUPOS };
}

// ─── Explorador ───────────────────────────────────────────────────────────────

export const SGDW_POR_PAGINA = 50;

function esc(s: string): string {
  return String(s).replace(/'/g, "''").slice(0, 120);
}

export async function listarTabelasSgdw(config: SgdwConfig): Promise<string[]> {
  const r = await sgdwPost<{ rows: Array<{ NOME: string }> }>(config, "/api/sgdw-query", {
    sql: `SELECT TRIM(RDB$RELATION_NAME) AS NOME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL ORDER BY RDB$RELATION_NAME`,
  });
  return r.rows.map(x => x.NOME).filter(Boolean);
}

export async function buscarEsquemaTiposSgdw(config: SgdwConfig, tabela: string): Promise<Array<{ CAMPO: string; TIPO: number }>> {
  const r = await sgdwPost<{ rows: Array<{ CAMPO: string; TIPO: number }> }>(config, "/api/sgdw-query", {
    sql: `SELECT TRIM(f.RDB$FIELD_NAME) AS CAMPO, t.RDB$FIELD_TYPE AS TIPO FROM RDB$RELATION_FIELDS f JOIN RDB$FIELDS t ON t.RDB$FIELD_NAME = f.RDB$FIELD_SOURCE WHERE f.RDB$RELATION_NAME = '${esc(tabela)}' ORDER BY f.RDB$FIELD_POSITION`,
  });
  return r.rows;
}

export async function buscarDadosTabelaSgdw(config: SgdwConfig, tabela: string, colunas: string[], pagina: number): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const cols = colunas.join(", ");
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql: `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip} ${cols} FROM ${tabela} ORDER BY 1 DESC` }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: `SELECT COUNT(*) AS TOTAL FROM ${tabela}` }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

// ─── OS ───────────────────────────────────────────────────────────────────────

function buildOsWhere(busca: string, filtros: OsFiltros): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (!filtros.incluirCanceladas) conds.push("COALESCE(o.ORDCANC, 0) = 0");
  if (filtros.dataIni) { conds.push("o.ORDDTEMI >= ?"); params.push(filtros.dataIni); }
  if (filtros.dataFim) { conds.push("o.ORDDTEMI <= ?"); params.push(filtros.dataFim); }
  if (busca) {
    const b = esc(busca);
    conds.push(`(CAST(o.ORDNUMER AS VARCHAR(10)) CONTAINING '${b}' OR COALESCE(TRIM(c.CLINOMES),'') CONTAINING '${b}' OR COALESCE(TRIM(v.VEIPLACA),'') CONTAINING '${b}')`);
  }
  return { where: conds.length ? `WHERE ${conds.join(" AND ")}` : "", params };
}

export async function buscarOsSgdw(
  config: SgdwConfig, pagina: number, busca = "", filtros: OsFiltros = {}
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const { where, params } = buildOsWhere(busca, filtros);
  const joins = `FROM TBORDSE o
    LEFT JOIN TBCLIEN c ON c.CLINUMER = o.ORDORIGE
    LEFT JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
    LEFT JOIN TBSEROS s ON s.SOSNUMER = o.SOSNUMER
    LEFT JOIN TBUSUAR u ON u.USUNUMER = o.USUNUMER`;
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    o.ORDNUMER,
    o.ORDDTEMI AS DATA,
    COALESCE(
      (SELECT FIRST 1
         SUBSTRING(CAST(CAST(cx.DTLANCTO AS TIMESTAMP) AS VARCHAR(30)) FROM 12 FOR 5)
       FROM TBCAIXA cx
       WHERE cx.CDVENDA = o.ORDNUMER AND cx.TPVENDA = 13 AND cx.ESTORNO = 0
       ORDER BY cx.CAIXA),
      ''
    ) AS HORA,
    COALESCE(TRIM(c.CLINOMES), '-') AS CLIENTE,
    COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
    COALESCE(TRIM(s.SOSDESCR), '-') AS SERVICO,
    COALESCE(TRIM(u.USUNOMES), '-') AS CRIADOR,
    COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
    COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
    COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO,
    COALESCE(o.ORDCANC, 0) AS CANCELADO
  ${joins} ${where} ORDER BY o.ORDNUMER DESC`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM TBORDSE o
    LEFT JOIN TBCLIEN c ON c.CLINUMER = o.ORDORIGE
    LEFT JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
    ${where}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql, params }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN, params }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

export async function buscarKpiOsSgdw(config: SgdwConfig, filtros: OsFiltros = {}): Promise<SgdwOsKpi> {
  const conds = ["COALESCE(o.ORDCANC, 0) = 0"];
  const params: unknown[] = [];
  if (filtros.dataIni) { conds.push("o.ORDDTEMI >= ?"); params.push(filtros.dataIni); }
  if (filtros.dataFim) { conds.push("o.ORDDTEMI <= ?"); params.push(filtros.dataFim); }
  const r = await sgdwPost<{ rows: [{ TOTAL_OS: number; TOTAL_HON: number; TOTAL_REC: number; TOTAL_SALDO: number }] }>(
    config, "/api/sgdw-query",
    { sql: `SELECT COUNT(*) AS TOTAL_OS, SUM(COALESCE(o.ORDVLTOT,0)) AS TOTAL_HON, SUM(COALESCE(o.ORDVLREC,0)) AS TOTAL_REC, SUM(COALESCE(o.ORDVLTOT,0)-COALESCE(o.ORDVLREC,0)) AS TOTAL_SALDO FROM TBORDSE o WHERE ${conds.join(" AND ")}`, params }
  );
  const row = r.rows[0] ?? {};
  return { totalOs: Number(row.TOTAL_OS ?? 0), totalHonorarios: Number(row.TOTAL_HON ?? 0), totalRecebido: Number(row.TOTAL_REC ?? 0), totalSaldo: Number(row.TOTAL_SALDO ?? 0) };
}

export async function cancelarOsSgdw(config: SgdwConfig, ordnumer: number): Promise<void> {
  await sgdwPost(config, "/api/sgdw-query", { sql: "UPDATE TBORDSE SET ORDCANC = 1 WHERE ORDNUMER = ?", params: [ordnumer] });
}

export async function reativarOsSgdw(config: SgdwConfig, ordnumer: number): Promise<void> {
  await sgdwPost(config, "/api/sgdw-query", { sql: "UPDATE TBORDSE SET ORDCANC = 0 WHERE ORDNUMER = ?", params: [ordnumer] });
}

// ─── Nova OS — helpers ────────────────────────────────────────────────────────

const COMBU_LABEL: Record<number, string> = {
  1:"Álcool", 2:"Gasolina", 3:"Diesel",
  5:"GNV", 6:"Elétrico", 7:"Elétrico",
  12:"GNV", 13:"GNV", 14:"GNV", 15:"GNV",
  16:"Flex", 17:"Flex",
  18:"Híbrido", 19:"Híbrido",
};
const ESPEC_LABEL: Record<number, string> = {
  1:"Passageiro", 2:"Carga", 3:"Misto", 4:"Corrida", 6:"Especial",
};
const CORES_LABEL: Record<number, string> = {
  1:"Amarela",2:"Azul",3:"Bege",4:"Branca",5:"Cinza",6:"Dourada",7:"Grená",
  8:"Laranja",9:"Marrom",10:"Prata",11:"Preta",12:"Rosa",13:"Roxa",
  14:"Verde",15:"Vermelha",16:"Fantasia",99:"S/Registro",
};
const TIPOS_LABEL: Record<number, string> = {
  2:"Ciclomotor",3:"Motoneta",4:"Motocicleta",5:"Triciclo",6:"Automóvel",
  7:"Microônibus",8:"Ônibus",10:"Reboque",11:"Semi-Reboque",13:"Camioneta",
  14:"Caminhão",15:"Caminhão Trator",21:"Quadriciclo",23:"Caminhonete",
  25:"Utilitário",26:"Motor-Casa",99:"S/Registro",
};
const CATEG_LABEL: Record<number, string> = {
  1:"Particular",2:"Aluguel",3:"Oficial",4:"Experiência",5:"Aprendiz",6:"Fabricante",
};
const RESTR_LABEL: Record<number, string> = {
  1:"Arrendamento mercantil", 2:"Reserva de domínio", 3:"Alienação fiduciária",
  4:"Outras", 5:"Outras", 6:"Outras", 9:"Penhor", 10:"",
};

export interface SgdwVeiculoInfo {
  VEINUMER: number;
  PLACA: string;
  RENAVAM: string;
  CHASSI: string;
  MARCA_MODELO: string;
  ANO_FABRICACAO: number | null;
  ANO_MODELO: number | null;
  COR_NOME: string;
  TIPO_NOME: string;
  COMBUSTIVEL_NOME: string;
  ESPECIE_NOME: string;
  CATEGORIA_NOME: string;
  RESTRICAO_NOME: string;
  NR_CRV: string;
  DT_AQUISICAO: string;
  VALOR_NF: number | null;
  ZERO_KM: boolean;
  PROPRIETARIO_CLINUMER: number | null;
  PROPRIETARIO_NOME: string;
}

export interface SgdwClienteSimples {
  CLINUMER: number;
  NOME: string;
}

export interface SgdwClienteCompleto {
  CLINUMER: number;
  NOME: string;
  CPF_CNPJ: string;
  RG: string;
  RG_ORGAO: string;
  RG_UF: string;
  DT_NASC: string;
  SEXO: number | null;
  CIVIL: number | null;
  NOME_PAI: string;
  NOME_MAE: string;
  CONJUGE: string;
  PROFISSAO: string;
  OBSERVACAO: string;
  ATIVO: number;
  LOGRADOURO: string;
  NUMERO: string;
  BAIRRO: string;
  CEP: string;
  COMPLEMENTO: string;
  EMAIL: string;
  MUNICIPIO: string;
  UF: string;
  QTD_OS: number;
  TOTAL_HON: number;
  TOTAL_REC: number;
}

export interface NovaOsItem {
  sosnumer: number;
  descricao: string;
  vencimento: string;
  valor: number;
}

export async function buscarVeiculoPorPlacaSgdw(
  config: SgdwConfig, placa: string
): Promise<SgdwVeiculoInfo | null> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 1
      v.VEINUMER, TRIM(v.VEIPLACA) AS PLACA, TRIM(v.VEIRENAV) AS RENAVAM,
      TRIM(v.VEICHASS) AS CHASSI,
      COALESCE(TRIM(m.MARDESCR), '') AS MARCA_MODELO,
      v.VEIANOFA, v.VEIANOMO,
      v.VEICORES, v.VEITIPOS, v.VEIESPEC, v.VEICOMBU, v.VEICATEG, v.VEIRESTR,
      TRIM(v.VEINRCRV) AS NR_CRV,
      v.VEIDTAQU AS DT_AQUISICAO,
      v.VEIVALOR, v.VEIZEROK,
      v.VEIPROAT AS PROPRIETARIO_CLINUMER,
      COALESCE(TRIM(cli.CLINOMES), '') AS PROPRIETARIO_NOME
    FROM TBVEICU v
    LEFT JOIN TBMARCA m ON m.MARNUMER = v.MARNUMER
    LEFT JOIN TBCLIEN cli ON cli.CLINUMER = v.VEIPROAT
    WHERE TRIM(v.VEIPLACA) = ?`,
    params: [placa.toUpperCase().replace(/\s/g, "")],
  });
  const row = r.rows[0];
  if (!row) return null;
  const g = (k: string) => row[k] ?? row[k.toLowerCase()];
  return {
    VEINUMER: Number(g("VEINUMER")),
    PLACA: String(g("PLACA") ?? ""),
    RENAVAM: String(g("RENAVAM") ?? ""),
    CHASSI: String(g("CHASSI") ?? ""),
    MARCA_MODELO: String(g("MARCA_MODELO") ?? ""),
    ANO_FABRICACAO: g("VEIANOFA") != null ? Number(g("VEIANOFA")) : null,
    ANO_MODELO: g("VEIANOMO") != null ? Number(g("VEIANOMO")) : null,
    COR_NOME: CORES_LABEL[Number(g("VEICORES"))] ?? "",
    TIPO_NOME: TIPOS_LABEL[Number(g("VEITIPOS"))] ?? "",
    COMBUSTIVEL_NOME: COMBU_LABEL[Number(g("VEICOMBU"))] ?? "",
    ESPECIE_NOME: ESPEC_LABEL[Number(g("VEIESPEC"))] ?? "",
    CATEGORIA_NOME: CATEG_LABEL[Number(g("VEICATEG"))] ?? "",
    RESTRICAO_NOME: RESTR_LABEL[Number(g("VEIRESTR"))] ?? "",
    NR_CRV: String(g("NR_CRV") ?? ""),
    DT_AQUISICAO: g("DT_AQUISICAO") ? String(g("DT_AQUISICAO")).slice(0, 10) : "",
    VALOR_NF: g("VEIVALOR") != null ? Number(g("VEIVALOR")) : null,
    ZERO_KM: Boolean(Number(g("VEIZEROK"))),
    PROPRIETARIO_CLINUMER: g("PROPRIETARIO_CLINUMER") != null ? Number(g("PROPRIETARIO_CLINUMER")) : null,
    PROPRIETARIO_NOME: String(g("PROPRIETARIO_NOME") ?? ""),
  };
}

export async function buscarClienteCompletoPorNumeroSgdw(
  config: SgdwConfig, clinumer: number
): Promise<SgdwClienteCompleto | null> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 1
      CLI.CLINUMER,
      TRIM(CLI.CLINOMES) AS NOME,
      COALESCE(TRIM(CLI.CLICPFCG), '') AS CPF_CNPJ,
      COALESCE(TRIM(CLI.CLIIDENT), '') AS RG,
      COALESCE(TRIM(CLI.CLIORGAO), '') AS RG_ORGAO,
      COALESCE(TRIM(CLI.CLIUFIDE), '') AS RG_UF,
      CLI.CLIDTNAS AS DT_NASC,
      CLI.CLISEXOS AS SEXO,
      CLI.CLICIVIL AS CIVIL,
      COALESCE(TRIM(CLI.CLINOPAI), '') AS NOME_PAI,
      COALESCE(TRIM(CLI.CLINOMAE), '') AS NOME_MAE,
      COALESCE(TRIM(CLI.CLICONJUGE), '') AS CONJUGE,
      COALESCE(TRIM(CLI.CLIPROFI), '') AS PROFISSAO,
      COALESCE(TRIM(CLI.CLIOBSER), '') AS OBSERVACAO,
      COALESCE(CLI.CLIATIVO, 0) AS ATIVO,
      COALESCE(TRIM(EDD.ENDENDER), '') AS LOGRADOURO,
      COALESCE(TRIM(EDD.ENDNREND), '') AS NUMERO,
      COALESCE(TRIM(EDD.ENDBAIRR), '') AS BAIRRO,
      COALESCE(TRIM(EDD.ENDNRCEP), '') AS CEP,
      COALESCE(TRIM(EDD.ENDCOMPL), '') AS COMPLEMENTO,
      COALESCE(TRIM(EDD.ENDEMAIL), '') AS EMAIL,
      COALESCE(TRIM(MUN.MUNDESCR), '') AS MUNICIPIO,
      COALESCE(TRIM(MUN.ESTSIGLA), '') AS UF,
      COUNT(ORD.ORDNUMER) AS QTD_OS,
      SUM(COALESCE(ORD.ORDVLTOT, 0)) AS TOTAL_HON,
      SUM(COALESCE(ORD.ORDVLREC, 0)) AS TOTAL_REC
    FROM TBCLIEN CLI
    LEFT JOIN TBENDER EDD ON EDD.ENDNUMER = CLI.CLIENDER
    LEFT JOIN TBMUNIC MUN ON MUN.MUNNUMER = EDD.MUNNUMER
    LEFT JOIN TBORDSE ORD ON ORD.ORDORIGE = CLI.CLINUMER AND COALESCE(ORD.ORDCANC, 0) = 0
    WHERE CLI.CLINUMER = ?
    GROUP BY CLI.CLINUMER, CLI.CLINOMES, CLI.CLICPFCG, CLI.CLIIDENT,
      CLI.CLIORGAO, CLI.CLIUFIDE, CLI.CLIDTNAS, CLI.CLISEXOS, CLI.CLICIVIL,
      CLI.CLINOPAI, CLI.CLINOMAE, CLI.CLICONJUGE, CLI.CLIPROFI, CLI.CLIOBSER, CLI.CLIATIVO,
      EDD.ENDENDER, EDD.ENDNREND, EDD.ENDBAIRR, EDD.ENDNRCEP, EDD.ENDCOMPL, EDD.ENDEMAIL,
      MUN.MUNDESCR, MUN.ESTSIGLA`,
    params: [clinumer],
  });
  const row = r.rows[0];
  if (!row) return null;
  const g = (k: string) => String(row[k] ?? row[k.toLowerCase()] ?? "");
  const n = (k: string) => { const v = row[k] ?? row[k.toLowerCase()]; return v != null ? Number(v) : null; };
  return {
    CLINUMER: Number(row.CLINUMER ?? row.clinumer),
    NOME: g("NOME"),
    CPF_CNPJ: g("CPF_CNPJ"),
    RG: g("RG"),
    RG_ORGAO: g("RG_ORGAO"),
    RG_UF: g("RG_UF"),
    DT_NASC: g("DT_NASC").slice(0, 10),
    SEXO: n("SEXO"),
    CIVIL: n("CIVIL"),
    NOME_PAI: g("NOME_PAI"),
    NOME_MAE: g("NOME_MAE"),
    CONJUGE: g("CONJUGE"),
    PROFISSAO: g("PROFISSAO"),
    OBSERVACAO: g("OBSERVACAO"),
    ATIVO: Number(row.ATIVO ?? row.ativo ?? 0),
    LOGRADOURO: g("LOGRADOURO"),
    NUMERO: g("NUMERO"),
    BAIRRO: g("BAIRRO"),
    CEP: g("CEP"),
    COMPLEMENTO: g("COMPLEMENTO"),
    EMAIL: g("EMAIL"),
    MUNICIPIO: g("MUNICIPIO"),
    UF: g("UF"),
    QTD_OS: Number(row.QTD_OS ?? row.qtd_os ?? 0),
    TOTAL_HON: Number(row.TOTAL_HON ?? row.total_hon ?? 0),
    TOTAL_REC: Number(row.TOTAL_REC ?? row.total_rec ?? 0),
  };
}

export async function buscarOsOrigemSgdw(
  config: SgdwConfig, clinumer: number
): Promise<Record<string, unknown>[]> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 30 SKIP 0
      o.ORDNUMER, o.ORDDTEMI AS DATA,
      COALESCE(TRIM(s.SOSDESCR), '-') AS SERVICO,
      COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
      COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
      COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
      COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO
    FROM TBORDSE o
    LEFT JOIN TBSEROS s ON s.SOSNUMER = o.SOSNUMER
    LEFT JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
    WHERE o.ORDORIGE = ? AND COALESCE(o.ORDCANC, 0) = 0
    ORDER BY o.ORDDTEMI DESC, o.ORDNUMER DESC`,
    params: [clinumer],
  });
  return r.rows;
}

export async function buscarClientesPorNomeSgdw(
  config: SgdwConfig, busca: string
): Promise<SgdwClienteSimples[]> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 10 CLINUMER, TRIM(CLINOMES) AS NOME FROM TBCLIEN WHERE TRIM(CLINOMES) CONTAINING '${esc(busca)}' ORDER BY CLINOMES`,
  });
  return r.rows.map(row => ({ CLINUMER: Number(row.CLINUMER), NOME: String(row.NOME ?? "") }));
}

export async function buscarProximaOsSgdw(config: SgdwConfig): Promise<number> {
  const r = await sgdwPost<{ rows: [{ PROXIMO: number }] }>(config, "/api/sgdw-query", {
    sql: `SELECT MAX(ORDNUMER) + 1 AS PROXIMO FROM TBORDSE`,
  });
  return Number(r.rows[0]?.PROXIMO ?? 1);
}

// Detecta o valor de ORDTMP usado pelos OS ativos — SELECT puro, não toca dados
export async function buscarOrdTmpSgdw(config: SgdwConfig): Promise<number> {
  const r = await sgdwPost<{ rows: [{ ORDTMP: number }] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 1 ORDTMP FROM TBORDSE WHERE ORDCANC = 0 ORDER BY ORDNUMER DESC`,
  });
  return Number(r.rows[0]?.ORDTMP ?? 2);
}

export async function criarOsSgdw(
  config: SgdwConfig,
  dados: {
    ordnumer: number;
    dataEmissao: string;
    clinumer: number;
    veinumer: number;
    itens: NovaOsItem[];
    acrescimo: number;
    desconto: number;
    obs: string;
    exercicio?: number;
    ordtmp?: number;   // detectado em runtime via buscarOrdTmpSgdw
  }
): Promise<number[]> {
  const criadas: number[] = [];
  const exerc = dados.exercicio ?? new Date().getFullYear();
  const obsRef = dados.obs ? dados.obs.slice(0, 300) : null;
  const ordtmp = dados.ordtmp ?? 2;

  for (let i = 0; i < dados.itens.length; i++) {
    const item = dados.itens[i];
    const num = dados.ordnumer + i;
    // acrescimo/desconto aplicado apenas no primeiro item para evitar
    // multiplicação indevida quando há múltiplos serviços
    const acr = i === 0 ? dados.acrescimo : 0;
    const des = i === 0 ? dados.desconto   : 0;
    const total = item.valor + acr - des;
    await sgdwPost(config, "/api/sgdw-query", {
      sql: `INSERT INTO TBORDSE (
        ORDNUMER, CLINUMER, ORDDTEMI, ORDORIGE, SOSNUMER, VEINUMER,
        ORDVALOR, ORDVLTOT, ORDVLDES, ORDVLADI, ORDVLACR,
        ORDCANC, ORDTMP, ORDVLREC, ORDVLARE, ORDVLPAGO, ORDVLAPA,
        ORDEXERC, ORDREFIN
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, 0, ?, 0, 0, ?, ?)`,
      params: [
        num, dados.clinumer, dados.dataEmissao, dados.clinumer,
        item.sosnumer, dados.veinumer,
        item.valor, total, des, acr,
        ordtmp,
        total, exerc, obsRef,
      ],
    });
    criadas.push(num);
  }
  return criadas;
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export async function buscarClientesSgdw(
  config: SgdwConfig,
  busca = "",
  anoInicio?: number, mesInicio?: number, anoFim?: number, mesFim?: number
): Promise<SgdwPaginaDados> {
  const p2 = (n: number) => String(n).padStart(2, "0");
  const temPeriodo = !!(anoInicio && anoFim);
  const dataIni = temPeriodo ? `${anoInicio}-${p2(mesInicio ?? 1)}-01` : null;
  const dataFimStr = temPeriodo
    ? ((mesFim ?? 12) < 12 ? `${anoFim}-${p2((mesFim ?? 12) + 1)}-01` : `${anoFim! + 1}-01-01`)
    : null;

  const periodOn = temPeriodo ? `AND o.ORDDTEMI >= '${dataIni}' AND o.ORDDTEMI < '${dataFimStr}'` : "";
  const buscaCond = busca
    ? `WHERE (TRIM(c.CLINOMES) CONTAINING '${esc(busca)}' OR TRIM(c.CLICPFCG) CONTAINING '${esc(busca)}')`
    : "";

  const sql = `SELECT FIRST 200
    c.CLINUMER,
    TRIM(c.CLINOMES) AS NOME,
    COALESCE(TRIM(c.CLICPFCG), '') AS DOCUMENTO,
    COUNT(o.ORDNUMER) AS QTD_OS,
    SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_GASTO,
    SUM(COALESCE(o.ORDVLREC, 0)) AS TOTAL_HON
  FROM TBCLIEN c
  INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER
    AND COALESCE(o.ORDCANC, 0) = 0
    ${periodOn}
  ${buscaCond}
  GROUP BY c.CLINUMER, c.CLINOMES, c.CLICPFCG
  ORDER BY SUM(COALESCE(o.ORDVLTOT, 0)) DESC`;

  const sqlN = `SELECT COUNT(DISTINCT c.CLINUMER) AS TOTAL
  FROM TBCLIEN c
  INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER
    AND COALESCE(o.ORDCANC, 0) = 0
    ${periodOn}
  ${buscaCond}`;

  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

// ─── Veículos ─────────────────────────────────────────────────────────────────

export async function buscarVeiculosSgdw(config: SgdwConfig, pagina: number, busca = ""): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const wh = busca ? `WHERE (TRIM(v.VEIPLACA) CONTAINING '${esc(busca)}' OR TRIM(v.VEIRENAV) CONTAINING '${esc(busca)}')` : "";
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    v.VEINUMER, TRIM(v.VEIPLACA) AS PLACA, TRIM(v.VEIRENAV) AS RENAVAM,
    COUNT(o.ORDNUMER) AS QTD_OS,
    MAX(o.ORDDTEMI) AS ULTIMA_OS,
    SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON
  FROM TBVEICU v
  LEFT JOIN TBORDSE o ON o.VEINUMER = v.VEINUMER AND COALESCE(o.ORDCANC, 0) = 0
  ${wh} GROUP BY v.VEINUMER, v.VEIPLACA, v.VEIRENAV ORDER BY v.VEIPLACA`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM TBVEICU v ${wh}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

// ─── Serviços ─────────────────────────────────────────────────────────────────

export async function buscarServicosSgdw(config: SgdwConfig): Promise<SgdwPaginaDados> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT s.SOSNUMER, TRIM(s.SOSDESCR) AS DESCRICAO,
      COUNT(o.ORDNUMER) AS QTD_OS,
      SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON,
      SUM(COALESCE(o.ORDVLREC, 0)) AS TOTAL_REC
    FROM TBSEROS s
    LEFT JOIN TBORDSE o ON o.SOSNUMER = s.SOSNUMER AND COALESCE(o.ORDCANC, 0) = 0
    GROUP BY s.SOSNUMER, s.SOSDESCR ORDER BY s.SOSNUMER`,
  });
  return { linhas: r.rows, total: r.rows.length };
}

// ─── Caixa ────────────────────────────────────────────────────────────────────

function buildCaixaWhere(busca: string, filtros: CaixaFiltros): { where: string; params: unknown[] } {
  const conds = ["CXA.ESTORNO = 0"];
  const params: unknown[] = [];
  if (filtros.grupo) { conds.push("CXA.GRUPOCONTA = ?"); params.push(Number(filtros.grupo)); }
  if (filtros.dataIni) { conds.push("CXA.DTLANCTO >= ?"); params.push(filtros.dataIni); }
  if (filtros.dataFim) { conds.push("CXA.DTLANCTO <= ?"); params.push(filtros.dataFim); }
  if (filtros.apenasAberto)  conds.push("CXA.APRAZO <> -1");
  if (filtros.apenasQuitado) conds.push("CXA.APRAZO = -1");
  if (busca) {
    const b = esc(busca);
    conds.push(`(CAST(CXA.CAIXA AS VARCHAR(10)) CONTAINING '${b}' OR COALESCE(TRIM(C.CLINOMES),'') CONTAINING '${b}' OR COALESCE(TRIM(PC.NMCONTA),'') CONTAINING '${b}')`);
  }
  return { where: `WHERE ${conds.join(" AND ")}`, params };
}

export async function buscarCaixaSgdw(
  config: SgdwConfig, pagina: number, busca = "", filtros: CaixaFiltros = {}
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const { where, params } = buildCaixaWhere(busca, filtros);
  const joins = `FROM TBCAIXA CXA LEFT JOIN TBPLANOCONTA PC ON PC.PLANOCONTA=CXA.CDPLANOCONTA LEFT JOIN TBCLIEN C ON C.CLINUMER=CXA.ORIGEM`;
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    CXA.CAIXA, CXA.DTLANCTO, CXA.TPLANCTO, CXA.GRUPOCONTA, CXA.VALOR, CXA.APRAZO,
    COALESCE(TRIM(PC.NMCONTA), '-') AS CONTA,
    COALESCE(TRIM(C.CLINOMES), '-') AS ORIGEM
  ${joins} ${where} ORDER BY CXA.DTLANCTO DESC, CXA.CAIXA DESC`;
  const sqlN = `SELECT COUNT(*) AS TOTAL ${joins} ${where}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql, params }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN, params }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

export async function buscarKpiCaixaSgdw(config: SgdwConfig, filtros: CaixaFiltros = {}): Promise<SgdwCaixaKpi> {
  const conds = ["CXA.ESTORNO = 0"];
  const params: unknown[] = [];
  if (filtros.dataIni) { conds.push("CXA.DTLANCTO >= ?"); params.push(filtros.dataIni); }
  if (filtros.dataFim) { conds.push("CXA.DTLANCTO <= ?"); params.push(filtros.dataFim); }
  const r = await sgdwPost<{ rows: [{ TR: number; TRE: number; TP: number; TPO: number }] }>(
    config, "/api/sgdw-query",
    { sql: `SELECT SUM(CASE WHEN CXA.GRUPOCONTA=1 AND CXA.APRAZO<>-1 THEN CXA.VALOR ELSE 0 END) AS TR, SUM(CASE WHEN CXA.GRUPOCONTA=1 AND CXA.APRAZO=-1 THEN CXA.VALOR ELSE 0 END) AS TRE, SUM(CASE WHEN CXA.GRUPOCONTA=2 AND CXA.APRAZO<>-1 THEN CXA.VALOR ELSE 0 END) AS TP, SUM(CASE WHEN CXA.GRUPOCONTA=2 AND CXA.APRAZO=-1 THEN CXA.VALOR ELSE 0 END) AS TPO FROM TBCAIXA CXA WHERE ${conds.join(" AND ")}`, params }
  );
  const row = r.rows[0] ?? {};
  return { totalReceber: Number(row.TR ?? 0), totalRecebido: Number(row.TRE ?? 0), totalPagar: Number(row.TP ?? 0), totalPago: Number(row.TPO ?? 0) };
}

// ─── Empresas / Frotas ────────────────────────────────────────────────────────

export const SGDW_EMPRESAS_POR_PAGINA = 18;

export async function buscarTodasEmpresasSgdw(
  config: SgdwConfig, busca = ""
): Promise<Record<string, unknown>[]> {
  const wh = busca ? `WHERE TRIM(c.CLINOMES) CONTAINING '${esc(busca)}'` : "";
  const sql = `SELECT FIRST 9999 SKIP 0
    c.CLINUMER, TRIM(c.CLINOMES) AS NOME,
    COUNT(DISTINCT o.VEINUMER) AS QTD_VEICULOS,
    COUNT(o.ORDNUMER) AS QTD_OS,
    SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON,
    SUM(COALESCE(o.ORDVLREC, 0)) AS TOTAL_REC,
    MAX(o.ORDDTEMI) AS ULTIMA_OS
  FROM TBCLIEN c
    INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER AND COALESCE(o.ORDCANC, 0) = 0
    ${wh} GROUP BY c.CLINUMER, c.CLINOMES
    HAVING COUNT(DISTINCT o.VEINUMER) >= 2
  ORDER BY COUNT(DISTINCT o.VEINUMER) DESC, COUNT(o.ORDNUMER) DESC`;
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql });
  return r.rows;
}

export async function buscarEmpresasSgdw(
  config: SgdwConfig, pagina: number, busca = ""
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_EMPRESAS_POR_PAGINA;
  const wh = busca ? `WHERE TRIM(c.CLINOMES) CONTAINING '${esc(busca)}'` : "";
  const inner = `FROM TBCLIEN c
    INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER AND COALESCE(o.ORDCANC, 0) = 0
    ${wh} GROUP BY c.CLINUMER, c.CLINOMES
    HAVING COUNT(DISTINCT o.VEINUMER) >= 2`;
  const sql = `SELECT FIRST ${SGDW_EMPRESAS_POR_PAGINA} SKIP ${skip}
    c.CLINUMER, TRIM(c.CLINOMES) AS NOME,
    COUNT(DISTINCT o.VEINUMER) AS QTD_VEICULOS,
    COUNT(o.ORDNUMER) AS QTD_OS,
    SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON,
    SUM(COALESCE(o.ORDVLREC, 0)) AS TOTAL_REC,
    MAX(o.ORDDTEMI) AS ULTIMA_OS
  ${inner} ORDER BY COUNT(DISTINCT o.VEINUMER) DESC, COUNT(o.ORDNUMER) DESC`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM (
    SELECT c.CLINUMER FROM TBCLIEN c
    INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER AND COALESCE(o.ORDCANC, 0) = 0
    ${wh} GROUP BY c.CLINUMER HAVING COUNT(DISTINCT o.VEINUMER) >= 2
  ) TMP_E`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

export async function buscarVeiculosEmpresaSgdw(
  config: SgdwConfig, clinumer: number
): Promise<SgdwPaginaDados> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT v.VEINUMER, TRIM(v.VEIPLACA) AS PLACA, TRIM(v.VEIRENAV) AS RENAVAM,
      COUNT(o.ORDNUMER) AS QTD_OS,
      MAX(o.ORDDTEMI) AS ULTIMA_OS,
      SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON,
      SUM(COALESCE(o.ORDVLREC, 0)) AS TOTAL_REC
    FROM TBORDSE o
    JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
    WHERE o.ORDORIGE = ? AND COALESCE(o.ORDCANC, 0) = 0
    GROUP BY v.VEINUMER, v.VEIPLACA, v.VEIRENAV
    ORDER BY COUNT(o.ORDNUMER) DESC`,
    params: [clinumer],
  });
  return { linhas: r.rows, total: r.rows.length };
}

// ─── Criar Cliente ───────────────────────────────────────────────────────────

export async function buscarMunicipiosSgdw(
  config: SgdwConfig, busca: string
): Promise<Array<{ MUNNUMER: number; MUNDESCR: string; ESTSIGLA: string }>> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 15 MUNNUMER, TRIM(MUNDESCR) AS MUNDESCR, TRIM(ESTSIGLA) AS ESTSIGLA FROM TBMUNIC WHERE TRIM(MUNDESCR) CONTAINING '${esc(busca)}' ORDER BY MUNDESCR`,
  });
  return r.rows.map(row => ({
    MUNNUMER: Number(row.MUNNUMER ?? row.munnumer),
    MUNDESCR: String(row.MUNDESCR ?? row.mundescr ?? ""),
    ESTSIGLA: String(row.ESTSIGLA ?? row.estsigla ?? ""),
  }));
}

export async function criarClienteSgdw(
  config: SgdwConfig,
  dados: {
    nome: string;
    cpf_cnpj?: string;
    rg?: string;
    rg_orgao?: string;
    rg_uf?: string;
    dt_nascimento?: string;   // YYYY-MM-DD
    sexo?: number;            // 1=Masc 2=Fem 3=N/Inf
    civil?: number;           // 1=Solt 2=Cas 3=Viúv 4=Div 5=Outros
    nome_pai?: string;
    nome_mae?: string;
    conjuge?: string;
    profissao?: string;
    observacao?: string;
    email?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cep?: string;
    complemento?: string;
    munnumer?: number;
  }
): Promise<number> {
  const rCli = await sgdwPost<{ rows: [{ PROXIMO: number }] }>(config, "/api/sgdw-query", {
    sql: `SELECT MAX(CLINUMER) + 1 AS PROXIMO FROM TBCLIEN`,
  });
  const clinumer = Number(rCli.rows[0]?.PROXIMO ?? 1);

  let cliender: number | null = null;
  const temEndereco = !!(dados.logradouro || dados.bairro || dados.cep || dados.email || dados.munnumer);
  if (temEndereco) {
    const rEnd = await sgdwPost<{ rows: [{ PROXIMO: number }] }>(config, "/api/sgdw-query", {
      sql: `SELECT MAX(ENDNUMER) + 1 AS PROXIMO FROM TBENDER`,
    });
    const endnumer = Number(rEnd.rows[0]?.PROXIMO ?? 1);
    await sgdwPost(config, "/api/sgdw-query", {
      sql: `INSERT INTO TBENDER (ENDNUMER, ENDENDER, ENDNREND, ENDBAIRR, ENDNRCEP, ENDCOMPL, ENDEMAIL, MUNNUMER) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        endnumer,
        dados.logradouro || null,
        dados.numero || null,
        dados.bairro || null,
        dados.cep || null,
        dados.complemento || null,
        dados.email || null,
        dados.munnumer || null,
      ],
    });
    cliender = endnumer;
  }

  await sgdwPost(config, "/api/sgdw-query", {
    sql: `INSERT INTO TBCLIEN (
      CLINUMER, CLINOMES, CLICPFCG, CLIIDENT, CLIORGAO, CLIUFIDE,
      CLIDTNAS, CLISEXOS, CLICIVIL,
      CLINOPAI, CLINOMAE, CLICONJUGE,
      CLIPROFI, CLIOBSER,
      CLIENDER, CLIATIVO
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    params: [
      clinumer,
      dados.nome.trim().toUpperCase(),
      dados.cpf_cnpj?.trim() || null,
      dados.rg?.trim() || null,
      dados.rg_orgao?.trim() || null,
      dados.rg_uf?.trim() || null,
      dados.dt_nascimento || null,
      dados.sexo || null,
      dados.civil || null,
      dados.nome_pai?.trim().toUpperCase() || null,
      dados.nome_mae?.trim().toUpperCase() || null,
      dados.conjuge?.trim().toUpperCase() || null,
      dados.profissao?.trim().toUpperCase() || null,
      dados.observacao?.trim() || null,
      cliender,
    ],
  });

  return clinumer;
}

// ─── Funcionários ─────────────────────────────────────────────────────────────

export async function buscarFuncionariosSgdw(config: SgdwConfig, anoAtivo?: number): Promise<SgdwPaginaDados> {
  const tabelaUsu = await resolverTabelaUsuarios(config);
  if (!tabelaUsu) return { linhas: [], total: 0 };
  const ano = anoAtivo ?? new Date().getFullYear();
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT u.USUNUMER, TRIM(u.USUNOMES) AS NOME FROM ${tabelaUsu} u WHERE EXISTS (SELECT 1 FROM TBORDSE o WHERE o.USUNUMER = u.USUNUMER AND COALESCE(o.ORDCANC,0) = 0 AND EXTRACT(YEAR FROM o.ORDDTEMI) = ?) ORDER BY u.USUNOMES`,
    params: [ano],
  });
  return { linhas: r.rows, total: r.rows.length };
}

// Tabela de usuários SGDW confirmada: TBUSUAR
async function resolverTabelaUsuarios(_config: SgdwConfig): Promise<string | null> {
  return "TBUSUAR";
}

// Honorários por colaborador — usa TBORDSE.USUNUMER (quem criou a OS) + TBUSUAR
export async function buscarColaboradoresHonorariosSgdw(
  config: SgdwConfig,
  anoInicio: number, anoFim: number, mesInicio = 1, mesFim = 12
): Promise<SgdwPaginaDados> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dataInicio = `${anoInicio}-${pad(mesInicio)}-01`;
  const anoFimSeg  = mesFim === 12 ? anoFim + 1 : anoFim;
  const mesFimSeg  = mesFim === 12 ? 1 : mesFim + 1;
  const dataFim    = `${anoFimSeg}-${pad(mesFimSeg)}-01`;
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 50
      o.USUNUMER,
      TRIM(u.USUNOMES) AS NOME,
      COUNT(o.ORDNUMER) AS QTD_OS,
      SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON
    FROM TBORDSE o
    INNER JOIN TBUSUAR u ON u.USUNUMER = o.USUNUMER
    WHERE COALESCE(o.ORDCANC, 0) = 0
      AND o.ORDDTEMI >= ? AND o.ORDDTEMI < ?
    GROUP BY o.USUNUMER, u.USUNOMES
    ORDER BY SUM(COALESCE(o.ORDVLTOT, 0)) DESC`,
    params: [dataInicio, dataFim],
  });
  return { linhas: r.rows, total: r.rows.length };
}

// ─── ATPV ─────────────────────────────────────────────────────────────────────

export async function buscarAtpvSgdw(
  config: SgdwConfig, pagina: number, busca = ""
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const term = busca ? `%${busca.toUpperCase()}%` : null;
  const where = busca
    ? `WHERE UPPER(VEND_NOME) LIKE ? OR UPPER(COMP_NOME) LIKE ? OR CAST(CRV_NRO AS VARCHAR(40)) LIKE ?`
    : "";
  const params = busca ? [term, term, term] : [];
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
      sql: `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
        ID, VEINUMER, DATAVENDA,
        SUBSTRING(CAST(CAST(DATAVENDA AS TIMESTAMP) AS VARCHAR(30)) FROM 12 FOR 5) AS HORA,
        CRV_NRO,
        TRIM(VEND_NOME) AS VEND_NOME, TRIM(VEND_CPFCG) AS VEND_CPFCG,
        TRIM(VEND_ENDER) AS VEND_ENDER, TRIM(VEND_MUNIC) AS VEND_MUNIC,
        TRIM(VEND_EMAIL) AS VEND_EMAIL, TRIM(VEND_COMPL) AS VEND_COMPL,
        TRIM(COMP_NOME) AS COMP_NOME, TRIM(COMP_CPFCG) AS COMP_CPFCG,
        TRIM(COMP_ENDER) AS COMP_ENDER, TRIM(COMP_MUNIC) AS COMP_MUNIC,
        TRIM(COMP_EMAIL) AS COMP_EMAIL, TRIM(COMP_COMPL) AS COMP_COMPL,
        ODOMETRO_KM, ODOMETRO_DH, VLRVENDA,
        FLAIMPEDIRLIC, FLAOBRIGARTRA
      FROM TBVEICUATPVE ${where}
      ORDER BY DATAVENDA DESC, ID DESC`,
      params,
    }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", {
      sql: `SELECT COUNT(*) AS TOTAL FROM TBVEICUATPVE ${where}`,
      params,
    }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

// ─── OS por veículo ───────────────────────────────────────────────────────────

export async function buscarOsVeiculoSgdw(
  config: SgdwConfig,
  veinumer: number
): Promise<SgdwPaginaDados> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 500 SKIP 0
      o.ORDNUMER,
      o.ORDDTEMI AS DATA,
      COALESCE(TRIM(s.SOSDESCR), '-') AS SERVICO,
      COALESCE(TRIM(c.CLINOMES), '-') AS CLIENTE,
      COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
      COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
      COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO
    FROM TBORDSE o
    LEFT JOIN TBCLIEN c ON c.CLINUMER = o.ORDORIGE
    LEFT JOIN TBSEROS s ON s.SOSNUMER = o.SOSNUMER
    WHERE o.VEINUMER = ?
      AND COALESCE(o.ORDCANC, 0) = 0
    ORDER BY o.ORDDTEMI DESC, o.ORDNUMER DESC`,
    params: [veinumer],
  });
  return { linhas: r.rows, total: r.rows.length };
}

// ─── Planilha empresa/mês ──────────────────────────────────────────────────────

export async function buscarOsEmpresaMesSgdw(
  config: SgdwConfig,
  clinumer: number,
  ano: number,
  mes: number
): Promise<SgdwPaginaDados> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 500 SKIP 0
      o.ORDNUMER,
      o.ORDDTEMI AS DATA,
      COALESCE(TRIM(s.SOSDESCR), '-') AS SERVICO,
      COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
      COALESCE(TRIM(v.VEIRENAV), '-') AS RENAVAM,
      COALESCE(TRIM(c.CLINOMES), '-') AS CLIENTE,
      COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
      COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
      COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO
    FROM TBORDSE o
    LEFT JOIN TBCLIEN c ON c.CLINUMER = o.ORDORIGE
    LEFT JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
    LEFT JOIN TBSEROS s ON s.SOSNUMER = o.SOSNUMER
    WHERE o.ORDORIGE = ?
      AND EXTRACT(YEAR FROM o.ORDDTEMI) = ?
      AND EXTRACT(MONTH FROM o.ORDDTEMI) = ?
      AND COALESCE(o.ORDCANC, 0) = 0
    ORDER BY o.ORDDTEMI, o.ORDNUMER`,
    params: [clinumer, ano, mes],
  });
  return { linhas: r.rows, total: r.rows.length };
}

// ─── Serviços por colaborador ─────────────────────────────────────────────────

export async function buscarServicosColaboradorSgdw(
  config: SgdwConfig,
  usunumer: number,
  anoInicio: number, anoFim: number, mesInicio: number, mesFim: number,
): Promise<Array<{ codigo: number; servico: string; qtdOs: number; totalHon: number }>> {
  const p2 = (n: number) => String(n).padStart(2, "0");
  const dataIni = `${anoInicio}-${p2(mesInicio)}-01`;
  const nextAno = mesFim === 12 ? anoFim + 1 : anoFim;
  const nextMes = mesFim === 12 ? 1 : mesFim + 1;
  const dataFim = `${nextAno}-${p2(nextMes)}-01`;
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT COALESCE(s.SOSNUMER,0) AS CODIGO_SERVICO, COALESCE(TRIM(s.SOSDESCR),'Outros') AS SERVICO, COUNT(*) AS QTD_OS, SUM(COALESCE(o.ORDVLTOT,0)) AS TOTAL_HON FROM TBORDSE o LEFT JOIN TBSEROS s ON s.SOSNUMER=o.SOSNUMER WHERE COALESCE(o.ORDCANC,0)=0 AND o.USUNUMER=? AND o.ORDDTEMI>=? AND o.ORDDTEMI<? GROUP BY 1, 2 ORDER BY 3 DESC`,
    params: [usunumer, dataIni, dataFim],
  });
  return r.rows.map(row => ({
    codigo:   Number(row.CODIGO_SERVICO ?? 0),
    servico:  String(row.SERVICO ?? ""),
    qtdOs:    Number(row.QTD_OS ?? 0),
    totalHon: Number(row.TOTAL_HON ?? 0),
  }));
}

// ─── Semanal por mês ──────────────────────────────────────────────────────────

export type SemanaResumo = {
  semana: number;
  diaIni: number;
  diaFim: number;
  qtdOs: number;
  totalHon: number;
  totalRec: number;
};

export type SemanalMesData = {
  semanas: SemanaResumo[];
  servicos: Array<{ descricao: string; qtdOs: number }>;
  totalOs: number;
  totalHon: number;
  totalRec: number;
  metaBase: number;
};

function computarSemanasMes(ano: number, mes: number): Array<{ ini: number; fim: number }> {
  const daysInMonth = new Date(ano, mes, 0).getDate();
  const result: Array<{ ini: number; fim: number }> = [];
  let dia = 1;
  while (dia <= daysInMonth) {
    let fim = dia;
    for (let d = dia; d <= daysInMonth; d++) {
      fim = d;
      if (new Date(ano, mes - 1, d).getDay() === 0) break;
    }
    result.push({ ini: dia, fim: Math.min(fim, daysInMonth) });
    dia = fim + 1;
  }
  return result;
}

export async function buscarSemanalPorMesSgdw(
  config: SgdwConfig,
  ano: number,
  mes: number,
): Promise<SemanalMesData> {
  const p2 = (n: number) => String(n).padStart(2, "0");
  const nextAno = mes === 12 ? ano + 1 : ano;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const dataIni     = `${ano}-${p2(mes)}-01`;
  const dataFimNext = `${nextAno}-${p2(nextMes)}-01`;
  const metaIni     = `${ano - 1}-${p2(mes)}-01`;
  const metaFimNext = `${mes === 12 ? ano : ano - 1}-${p2(nextMes)}-01`;

  const semsJs = computarSemanasMes(ano, mes);
  const cases = semsJs
    .slice(0, semsJs.length - 1)
    .map((s, i) => `WHEN EXTRACT(DAY FROM o.ORDDTEMI) <= ${s.fim} THEN ${i + 1}`)
    .join(" ");
  const caseExpr = `CASE ${cases} ELSE ${semsJs.length} END`;

  const [rsWeeks, rsServicos, rsMeta] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
      sql: `SELECT ${caseExpr} AS SEMANA, COUNT(*) AS QTD_OS, SUM(COALESCE(o.ORDVLTOT,0)) AS TOTAL_HON, SUM(COALESCE(o.ORDVLREC,0)) AS TOTAL_REC FROM TBORDSE o WHERE COALESCE(o.ORDCANC,0)=0 AND o.ORDDTEMI>=? AND o.ORDDTEMI<? GROUP BY 1 ORDER BY 1`,
      params: [dataIni, dataFimNext],
    }),
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
      sql: `SELECT FIRST 20 COALESCE(TRIM(s.SOSDESCR),'Outros') AS DESCRICAO, COUNT(*) AS QTD_OS FROM TBORDSE o LEFT JOIN TBSEROS s ON s.SOSNUMER=o.SOSNUMER WHERE COALESCE(o.ORDCANC,0)=0 AND o.ORDDTEMI>=? AND o.ORDDTEMI<? GROUP BY 1 ORDER BY COUNT(*) DESC`,
      params: [dataIni, dataFimNext],
    }),
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
      sql: `SELECT COUNT(*) AS QTD_OS FROM TBORDSE WHERE COALESCE(ORDCANC,0)=0 AND ORDDTEMI>=? AND ORDDTEMI<?`,
      params: [metaIni, metaFimNext],
    }).catch(() => ({ rows: [{ QTD_OS: 0 }] })),
  ]);

  const weekMap = new Map(rsWeeks.rows.map(r => [Number(r.SEMANA), r]));
  const semanas: SemanaResumo[] = semsJs.map((s, i) => {
    const w = weekMap.get(i + 1);
    return {
      semana: i + 1,
      diaIni: s.ini,
      diaFim: s.fim,
      qtdOs:    Number(w?.QTD_OS    ?? 0),
      totalHon: Number(w?.TOTAL_HON ?? 0),
      totalRec: Number(w?.TOTAL_REC ?? 0),
    };
  });

  const totalOs  = semanas.reduce((a, b) => a + b.qtdOs, 0);
  const totalHon = semanas.reduce((a, b) => a + b.totalHon, 0);
  const totalRec = semanas.reduce((a, b) => a + b.totalRec, 0);
  const servicos = rsServicos.rows.map(r => ({
    descricao: String(r.DESCRICAO ?? ""),
    qtdOs:     Number(r.QTD_OS ?? 0),
  }));
  const metaBase = Number(rsMeta.rows[0]?.QTD_OS ?? 0);

  return { semanas, servicos, totalOs, totalHon, totalRec, metaBase };
}
