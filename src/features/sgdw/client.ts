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
  const tabelas = ["TBORDSE", "TBSERVI", "TBCLIEN", "TBCIDADE", "TBUSUARI"];
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
  const dataInicio = `${anoInicio}-${pad(mesInicio)}-01`;
  const dataFim    = `${anoFim}-${pad(mesFim)}-31`;
  const LIMITE_GRUPOS = 100_000;
  const result = await sgdwPost<{ rows: SgdwLinhaBruta[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST ${LIMITE_GRUPOS}
       EXTRACT(YEAR FROM o.orddtemi) AS ANO,
       EXTRACT(MONTH FROM o.orddtemi) AS MES,
       COALESCE(s.sernumer, 0) AS CODIGO_SERVICO,
       COALESCE(TRIM(s.serdescr), 'SEM SERVICO') AS SERVICO,
       COUNT(*) AS QUANTIDADE,
       SUM(COALESCE(o.ordvltot, o.ordvalor, 0)) AS HONORARIOS,
       SUM(COALESCE(o.ordvlrec, 0)) AS RECEBIDO
     FROM tbordse o
     LEFT JOIN tbservi s ON o.sosnumer = s.sernumer
     WHERE COALESCE(o.ordcanc, 0) = 0
       AND o.orddtemi >= ? AND o.orddtemi <= ?
     GROUP BY EXTRACT(YEAR FROM o.orddtemi), EXTRACT(MONTH FROM o.orddtemi), s.sernumer, s.serdescr
     ORDER BY EXTRACT(YEAR FROM o.orddtemi), EXTRACT(MONTH FROM o.orddtemi),
              SUM(COALESCE(o.ordvltot, o.ordvalor, 0)) DESC`,
    params: [dataInicio, dataFim],
  });
  const linhas = result.rows || [];
  const porPeriodo = new Map<string, SgdwPeriodo>();
  const porServico = new Map<string, SgdwServico>();
  let totalHonorarios = 0, totalRecebido = 0, totalQuantidade = 0;
  for (const row of linhas) {
    const ano = Number(row.ANO), mes = Number(row.MES);
    const hon = Number(row.HONORARIOS) || 0, rec = Number(row.RECEBIDO) || 0, qtd = Number(row.QUANTIDADE) || 0;
    const pk = `${ano}-${String(mes).padStart(2, "0")}`;
    const p = porPeriodo.get(pk) ?? { ano, mes, label: `${MESES[mes] ?? mes}/${ano}`, honorarios: 0, recebido: 0, quantidade: 0, taxaRecebimento: 0 };
    p.honorarios += hon; p.recebido += rec; p.quantidade += qtd;
    porPeriodo.set(pk, p);
    const sk = `${Number(row.CODIGO_SERVICO)}-${row.SERVICO}`;
    const s = porServico.get(sk) ?? { codigo: Number(row.CODIGO_SERVICO), servico: String(row.SERVICO || "SEM SERVICO"), honorarios: 0, recebido: 0, quantidade: 0, participacao: 0 };
    s.honorarios += hon; s.recebido += rec; s.quantidade += qtd;
    porServico.set(sk, s);
    totalHonorarios += hon; totalRecebido += rec; totalQuantidade += qtd;
  }
  const periodos: SgdwPeriodo[] = Array.from(porPeriodo.values()).sort((a, b) => a.ano - b.ano || a.mes - b.mes).map((p) => ({ ...p, taxaRecebimento: p.honorarios > 0 ? p.recebido / p.honorarios : 0 }));
  const servicos: SgdwServico[] = Array.from(porServico.values()).sort((a, b) => b.honorarios - a.honorarios).map((s) => ({ ...s, participacao: totalHonorarios > 0 ? s.honorarios / totalHonorarios : 0 }));
  return { periodos, servicos, rawLinhas: linhas, totalHonorarios, totalRecebido, totalQuantidade, taxaGlobal: totalHonorarios > 0 ? totalRecebido / totalHonorarios : 0, geradoEm: new Date().toISOString(), truncado: linhas.length >= LIMITE_GRUPOS };
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
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql: `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip} ${cols} FROM ${tabela}` }),
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
    LEFT JOIN TBSERVI s ON s.SERNUMER = o.SOSNUMER`;
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    o.ORDNUMER, o.ORDDTEMI AS DATA,
    COALESCE(TRIM(c.CLINOMES), '-') AS CLIENTE,
    COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
    COALESCE(TRIM(s.SERDESCR), '-') AS SERVICO,
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

// ─── Clientes ─────────────────────────────────────────────────────────────────

export async function buscarClientesSgdw(config: SgdwConfig, pagina: number, busca = ""): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const wh = busca ? `WHERE TRIM(c.CLINOMES) CONTAINING '${esc(busca)}'` : "";
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    c.CLINUMER, TRIM(c.CLINOMES) AS NOME,
    COUNT(o.ORDNUMER) AS QTD_OS,
    SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON,
    SUM(COALESCE(o.ORDVLREC, 0)) AS TOTAL_REC,
    SUM(COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0)) AS SALDO
  FROM TBCLIEN c
  LEFT JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER AND COALESCE(o.ORDCANC, 0) = 0
  ${wh} GROUP BY c.CLINUMER, c.CLINOMES ORDER BY c.CLINOMES`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM TBCLIEN c ${wh}`;
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
    sql: `SELECT s.SERNUMER, TRIM(s.SERDESCR) AS DESCRICAO,
      COUNT(o.ORDNUMER) AS QTD_OS,
      SUM(COALESCE(o.ORDVLTOT, 0)) AS TOTAL_HON,
      SUM(COALESCE(o.ORDVLREC, 0)) AS TOTAL_REC
    FROM TBSERVI s
    LEFT JOIN TBORDSE o ON o.SOSNUMER = s.SERNUMER AND COALESCE(o.ORDCANC, 0) = 0
    GROUP BY s.SERNUMER, s.SERDESCR ORDER BY s.SERNUMER`,
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
  if (filtros.apenasAberto) conds.push("CXA.APRAZO <> -1");
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

// ─── Funcionários ─────────────────────────────────────────────────────────────

export async function buscarFuncionariosSgdw(config: SgdwConfig): Promise<SgdwPaginaDados> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT USUNUMER, TRIM(USUNOMES) AS NOME FROM TBUSUARI ORDER BY USUNOMES`,
  });
  return { linhas: r.rows, total: r.rows.length };
}
