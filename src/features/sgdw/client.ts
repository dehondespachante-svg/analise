"use client";

import type { SgdwConfig, SgdwDados, SgdwLinhaBruta, SgdwPeriodo, SgdwServico, SgdwPaginaDados } from "./types";

const URL_KEY = "sgdw:url";
const TOKEN_KEY = "sgdw:token";

const MESES: Record<number, string> = {
  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr", 5: "Mai", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
};

export function carregarConfigSgdw(): SgdwConfig {
  if (typeof window === "undefined") return { url: "http://localhost:8787", token: "" };
  return {
    url: localStorage.getItem(URL_KEY) || "http://localhost:8787",
    token: localStorage.getItem(TOKEN_KEY) || "",
  };
}

export function salvarConfigSgdw(config: SgdwConfig): void {
  localStorage.setItem(URL_KEY, config.url.replace(/\/$/, ""));
  localStorage.setItem(TOKEN_KEY, config.token.trim());
}

async function sgdwPost<T>(config: SgdwConfig, endpoint: string, body: unknown): Promise<T> {
  const base = config.url.replace(/\/$/, "");
  const resp = await fetch(`${base}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (resp.status === 401) throw new Error("Token invalido ou nao autorizado.");
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`API retornou HTTP ${resp.status}${txt ? ": " + txt.slice(0, 120) : ""}.`);
  }

  return resp.json() as Promise<T>;
}

export type DiagCampos = Record<string, number>;

export async function diagnosticarCamposValor(
  config: SgdwConfig,
  ano: number,
  mes: number
): Promise<DiagCampos> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ini = `${ano}-${pad(mes)}-01`;
  const fim = `${ano}-${pad(mes)}-31`;
  const params = [ini, fim];
  const where = `FROM tbordse o WHERE COALESCE(o.ordcanc,0)=0 AND o.orddtemi>=? AND o.orddtemi<=?`;

  const resultado: DiagCampos = {};

  // Testa cada campo individualmente — assim um campo inexistente nao quebra os outros
  const campos: Array<[string, string]> = [
    ["QTD",        `SELECT COUNT(*) AS V ${where}`],
    ["ordvltot",   `SELECT SUM(COALESCE(o.ordvltot,0)) AS V ${where}`],
    ["ordvalor",   `SELECT SUM(COALESCE(o.ordvalor,0)) AS V ${where}`],
    ["ordvlhon",   `SELECT SUM(COALESCE(o.ordvlhon,0)) AS V ${where}`],
    ["ordvlrec",   `SELECT SUM(COALESCE(o.ordvlrec,0)) AS V ${where}`],
    ["ordvlare",   `SELECT SUM(COALESCE(o.ordvlare,0)) AS V ${where}`],
    ["ordvlpago",  `SELECT SUM(COALESCE(o.ordvlpago,0)) AS V ${where}`],
    ["ordvlpag",   `SELECT SUM(COALESCE(o.ordvlpag,0)) AS V ${where}`],
    ["ordvlserv",  `SELECT SUM(COALESCE(o.ordvlserv,0)) AS V ${where}`],
  ];

  await Promise.allSettled(
    campos.map(async ([nome, sql]) => {
      try {
        const r = await sgdwPost<{ rows: Array<Record<string,number>> }>(config, "/api/sgdw-query", { sql, params });
        resultado[nome] = Number(r.rows?.[0]?.V ?? r.rows?.[0]?.v ?? 0);
      } catch {
        resultado[nome] = -1; // campo nao existe ou erro
      }
    })
  );

  return resultado;
}

export async function descobrirSchema(config: SgdwConfig): Promise<{ tabela: string; colunas: string[] }[]> {
  const tabelas = ["TBORDSE", "TBSERVI", "TBCLIEN", "TBCIDADE", "TBUSUARI"];
  const resultados = await Promise.allSettled(
    tabelas.map(async (tabela) => {
      const r = await sgdwPost<{ rows: Array<{ CAMPO: string }> }>(config, "/api/sgdw-query", {
        sql: `SELECT TRIM(f.RDB$FIELD_NAME) AS CAMPO
              FROM RDB$RELATION_FIELDS f
              WHERE f.RDB$RELATION_NAME = '${tabela}'
              ORDER BY f.RDB$FIELD_POSITION`,
      });
      return { tabela, colunas: r.rows.map((row) => row.CAMPO) };
    })
  );
  return resultados
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean) as { tabela: string; colunas: string[] }[];
}

export async function testarConexaoSgdw(config: SgdwConfig): Promise<void> {
  const result = await sgdwPost<{ rows: unknown[] }>(config, "/api/sgdw-query", {
    sql: "SELECT 1 AS PING FROM RDB$DATABASE",
  });
  if (!Array.isArray(result.rows)) throw new Error("Resposta inesperada da API.");
}

export async function buscarHonorariosSgdw(
  config: SgdwConfig,
  anoInicio: number,
  anoFim: number,
  mesInicio = 1,
  mesFim = 12
): Promise<SgdwDados> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dataInicio = `${anoInicio}-${pad(mesInicio)}-01`;
  const dataFim    = `${anoFim}-${pad(mesFim)}-31`;

  const result = await sgdwPost<{ rows: SgdwLinhaBruta[] }>(config, "/api/sgdw-query", {
    sql: `SELECT FIRST 5000
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
       AND o.orddtemi >= ?
       AND o.orddtemi <= ?
     GROUP BY EXTRACT(YEAR FROM o.orddtemi), EXTRACT(MONTH FROM o.orddtemi),
              s.sernumer, s.serdescr
     ORDER BY EXTRACT(YEAR FROM o.orddtemi), EXTRACT(MONTH FROM o.orddtemi),
              SUM(COALESCE(o.ordvltot, o.ordvalor, 0)) DESC`,
    params: [dataInicio, dataFim],
  });

  const linhas = result.rows || [];

  const porPeriodo = new Map<string, SgdwPeriodo>();
  const porServico = new Map<string, SgdwServico>();
  let totalHonorarios = 0;
  let totalRecebido = 0;
  let totalQuantidade = 0;

  for (const row of linhas) {
    const ano = Number(row.ANO);
    const mes = Number(row.MES);
    const hon = Number(row.HONORARIOS) || 0;
    const rec = Number(row.RECEBIDO) || 0;
    const qtd = Number(row.QUANTIDADE) || 0;

    const pk = `${ano}-${String(mes).padStart(2, "0")}`;
    const p = porPeriodo.get(pk) ?? {
      ano, mes, label: `${MESES[mes] ?? mes}/${ano}`,
      honorarios: 0, recebido: 0, quantidade: 0, taxaRecebimento: 0,
    };
    p.honorarios += hon;
    p.recebido += rec;
    p.quantidade += qtd;
    porPeriodo.set(pk, p);

    const sk = `${Number(row.CODIGO_SERVICO)}-${row.SERVICO}`;
    const s = porServico.get(sk) ?? {
      codigo: Number(row.CODIGO_SERVICO),
      servico: String(row.SERVICO || "SEM SERVICO"),
      honorarios: 0, recebido: 0, quantidade: 0, participacao: 0,
    };
    s.honorarios += hon;
    s.recebido += rec;
    s.quantidade += qtd;
    porServico.set(sk, s);

    totalHonorarios += hon;
    totalRecebido += rec;
    totalQuantidade += qtd;
  }

  const periodos: SgdwPeriodo[] = Array.from(porPeriodo.values())
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .map((p) => ({ ...p, taxaRecebimento: p.honorarios > 0 ? p.recebido / p.honorarios : 0 }));

  const servicos: SgdwServico[] = Array.from(porServico.values())
    .sort((a, b) => b.honorarios - a.honorarios)
    .map((s) => ({ ...s, participacao: totalHonorarios > 0 ? s.honorarios / totalHonorarios : 0 }));

  return {
    periodos,
    servicos,
    rawLinhas: linhas,
    totalHonorarios,
    totalRecebido,
    totalQuantidade,
    taxaGlobal: totalHonorarios > 0 ? totalRecebido / totalHonorarios : 0,
    geradoEm: new Date().toISOString(),
  };
}

// ─── Explorador de dados ──────────────────────────────────────────────────────

export const SGDW_POR_PAGINA = 50;

function esc(s: string): string {
  return String(s).replace(/'/g, "''").slice(0, 120);
}

export async function listarTabelasSgdw(config: SgdwConfig): Promise<string[]> {
  const r = await sgdwPost<{ rows: Array<{ NOME: string }> }>(config, "/api/sgdw-query", {
    sql: `SELECT TRIM(RDB$RELATION_NAME) AS NOME FROM RDB$RELATIONS
          WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL
          ORDER BY RDB$RELATION_NAME`,
  });
  return r.rows.map(x => x.NOME).filter(Boolean);
}

export async function buscarEsquemaTiposSgdw(
  config: SgdwConfig,
  tabela: string
): Promise<Array<{ CAMPO: string; TIPO: number }>> {
  const r = await sgdwPost<{ rows: Array<{ CAMPO: string; TIPO: number }> }>(config, "/api/sgdw-query", {
    sql: `SELECT TRIM(f.RDB$FIELD_NAME) AS CAMPO, t.RDB$FIELD_TYPE AS TIPO
          FROM RDB$RELATION_FIELDS f
          JOIN RDB$FIELDS t ON t.RDB$FIELD_NAME = f.RDB$FIELD_SOURCE
          WHERE f.RDB$RELATION_NAME = '${esc(tabela)}'
          ORDER BY f.RDB$FIELD_POSITION`,
  });
  return r.rows;
}

export async function buscarOsSgdw(
  config: SgdwConfig,
  pagina: number,
  busca = "",
  mostrarCanceladas = false
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const wCanc = mostrarCanceladas ? "" : "COALESCE(o.ORDCANC,0)=0";
  const wBusca = busca
    ? `CAST(o.ORDNUMER AS VARCHAR(10)) CONTAINING '${esc(busca)}'`
    : "";
  const conds = [wCanc, wBusca].filter(Boolean);
  const wh = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    o.ORDNUMER, o.ORDDTEMI AS DATA,
    COALESCE(TRIM(s.SERDESCR),'-') AS SERVICO,
    COALESCE(o.ORDVLTOT,0) AS HONORARIOS,
    COALESCE(o.ORDVLREC,0) AS RECEBIDO,
    COALESCE(o.ORDCANC,0) AS CANCELADO
  FROM TBORDSE o
  LEFT JOIN TBSERVI s ON o.SOSNUMER=s.SERNUMER
  ${wh} ORDER BY o.ORDNUMER DESC`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM TBORDSE o ${wh}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

export async function buscarClientesSgdw(
  config: SgdwConfig,
  pagina: number,
  busca = ""
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const wh = busca ? `WHERE TRIM(CLINOMES) CONTAINING '${esc(busca)}'` : "";
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    CLINUMER, TRIM(CLINOMES) AS NOME FROM TBCLIEN ${wh} ORDER BY CLINOMES`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM TBCLIEN ${wh}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

export async function buscarVeiculosSgdw(
  config: SgdwConfig,
  pagina: number,
  busca = ""
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const wh = busca
    ? `WHERE (TRIM(VEIPLACA) CONTAINING '${esc(busca)}' OR TRIM(VEIRENAV) CONTAINING '${esc(busca)}')`
    : "";
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    VEINUMER, TRIM(VEIPLACA) AS PLACA, TRIM(VEIRENAV) AS RENAVAM
    FROM TBVEICU ${wh} ORDER BY VEIPLACA`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM TBVEICU ${wh}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

export async function buscarServicosSgdw(config: SgdwConfig): Promise<SgdwPaginaDados> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT SERNUMER, TRIM(SERDESCR) AS DESCRICAO FROM TBSERVI ORDER BY SERNUMER`,
  });
  return { linhas: r.rows, total: r.rows.length };
}

export async function buscarCaixaSgdw(
  config: SgdwConfig,
  pagina: number,
  busca = ""
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const wBusca = busca
    ? `AND (TRIM(C.CLINOMES) CONTAINING '${esc(busca)}' OR CAST(CXA.CAIXA AS VARCHAR(10)) CONTAINING '${esc(busca)}')`
    : "";
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip}
    CXA.CAIXA, CXA.DTLANCTO, CXA.TPLANCTO, CXA.GRUPOCONTA, CXA.VALOR,
    COALESCE(TRIM(PC.NMCONTA),'-') AS CONTA,
    COALESCE(TRIM(C.CLINOMES),'-') AS ORIGEM
  FROM TBCAIXA CXA
  LEFT JOIN TBPLANOCONTA PC ON PC.PLANOCONTA=CXA.CDPLANOCONTA
  LEFT JOIN TBCLIEN C ON C.CLINUMER=CXA.ORIGEM
  WHERE CXA.ESTORNO=0 AND CXA.APRAZO<>-1 ${wBusca}
  ORDER BY CXA.DTLANCTO DESC, CXA.CAIXA DESC`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM TBCAIXA CXA
    LEFT JOIN TBCLIEN C ON C.CLINUMER=CXA.ORIGEM
    WHERE CXA.ESTORNO=0 AND CXA.APRAZO<>-1 ${wBusca}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}

export async function buscarFuncionariosSgdw(config: SgdwConfig): Promise<SgdwPaginaDados> {
  const r = await sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", {
    sql: `SELECT USUNUMER, TRIM(USUNOMES) AS NOME FROM TBUSUARI ORDER BY USUNOMES`,
  });
  return { linhas: r.rows, total: r.rows.length };
}

export async function buscarDadosTabelaSgdw(
  config: SgdwConfig,
  tabela: string,
  colunas: string[],
  pagina: number
): Promise<SgdwPaginaDados> {
  const skip = pagina * SGDW_POR_PAGINA;
  const cols = colunas.join(", ");
  const sql = `SELECT FIRST ${SGDW_POR_PAGINA} SKIP ${skip} ${cols} FROM ${tabela}`;
  const sqlN = `SELECT COUNT(*) AS TOTAL FROM ${tabela}`;
  const [r, n] = await Promise.all([
    sgdwPost<{ rows: Record<string, unknown>[] }>(config, "/api/sgdw-query", { sql }),
    sgdwPost<{ rows: [{ TOTAL: number }] }>(config, "/api/sgdw-query", { sql: sqlN }),
  ]);
  return { linhas: r.rows, total: Number(n.rows[0]?.TOTAL ?? 0) };
}
