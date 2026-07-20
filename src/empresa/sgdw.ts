// Shared SGDW helpers for /empresa portal

export interface EmpresaPortal {
  id?: string;
  nome: string;
  codigo: string;
  clinumer: number;
  sgdwNome: string;
  criadoEm: number;
  ativo: boolean;
}

export interface OsRow {
  ORDNUMER: number;
  DATA: string;
  PLACA: string;
  CLIENTE: string;
  SERVICO: string;
  HONORARIOS: number;
  RECEBIDO: number;
  SALDO: number;
}

export interface FrotaRow {
  VEINUMER: number;
  PLACA: string;
  RENAVAM: string;
  PROPRIETARIO: string;
  MARCA: string;
  ULTIMO_SERVICO: string;
  ULTIMO_IPVA: string;
  TOTAL_OS: number;
  SALDO_PENDENTE: number;
}

export interface HistoricoMes {
  ANO: number;
  MES: number;
  TOTAL_OS: number;
  VALOR_TOTAL: number;
  RECEBIDO: number;
  SALDO: number;
}

export interface PendenciaRow extends OsRow {
  MESES_ATRASO: number;
}

export const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
export const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

async function sgdwPost<T>(sql: string, params?: unknown[], timeout = 20000): Promise<T[]> {
  try {
    const resp = await fetch('/api/sgdw-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { rows?: T[] };
    return data.rows ?? [];
  } catch { return []; }
}

export async function sgdwBuscarEmpresas(busca: string): Promise<{ CLINUMER: number; NOME: string }[]> {
  const termo = busca.trim().replace(/'/g, "''").slice(0, 100);
  const wh = termo ? `WHERE TRIM(c.CLINOMES) CONTAINING '${termo}'` : '';
  const rows = await sgdwPost<Record<string, unknown>>(
    `SELECT FIRST 20 c.CLINUMER, TRIM(c.CLINOMES) AS NOME
     FROM TBCLIEN c
     INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER
     ${wh}
     GROUP BY c.CLINUMER, c.CLINOMES
     HAVING COUNT(DISTINCT o.VEINUMER) >= 1
     ORDER BY c.CLINOMES`, [], 10000
  );
  return rows
    .map(r => ({ CLINUMER: Number(r.CLINUMER ?? 0), NOME: String(r.NOME ?? '').trim() }))
    .filter(r => r.CLINUMER > 0 && r.NOME);
}

export async function sgdwBuscarOs(clinumer: number, ano: number, mes: number): Promise<OsRow[]> {
  const rows = await sgdwPost<Record<string, unknown>>(
    `SELECT FIRST 500
      o.ORDNUMER,
      o.ORDDTEMI AS DATA,
      COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
      COALESCE(TRIM(v.VEINOMAN), '-') AS CLIENTE,
      COALESCE(
        (SELECT FIRST 1 TRIM(i.ITODESCR) FROM TBITORD i
         WHERE i.ORDNUMER = o.ORDNUMER ORDER BY i.ITANUMER),
        NULLIF(TRIM(s.SERDESCR), ''), '-'
      ) AS SERVICO,
      COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
      COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
      COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO
    FROM TBORDSE o
    LEFT JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
    LEFT JOIN TBSERVI s ON s.SERNUMER = o.SOSNUMER
    WHERE o.ORDORIGE = ?
      AND EXTRACT(YEAR FROM o.ORDDTEMI) = ?
      AND EXTRACT(MONTH FROM o.ORDDTEMI) = ?
    ORDER BY o.ORDDTEMI, o.ORDNUMER`,
    [clinumer, ano, mes]
  );
  return rows.map(r => ({
    ORDNUMER: Number(r.ORDNUMER ?? 0),
    DATA: String(r.DATA ?? ''),
    PLACA: String(r.PLACA ?? '-'),
    CLIENTE: String(r.CLIENTE ?? '-'),
    SERVICO: String(r.SERVICO ?? '-'),
    HONORARIOS: Number(r.HONORARIOS ?? 0),
    RECEBIDO: Number(r.RECEBIDO ?? 0),
    SALDO: Number(r.SALDO ?? 0),
  }));
}

export async function sgdwBuscarFrota(clinumer: number): Promise<FrotaRow[]> {
  const rows = await sgdwPost<Record<string, unknown>>(
    `SELECT FIRST 300
      v.VEINUMER,
      COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
      COALESCE(TRIM(v.VEIRENAV), '-') AS RENAVAM,
      COALESCE(TRIM(v.VEINOMAN), '-') AS PROPRIETARIO,
      COALESCE(TRIM(m.MARDESCR), '-') AS MARCA,
      (SELECT MAX(o2.ORDDTEMI) FROM TBORDSE o2
         WHERE o2.VEINUMER = v.VEINUMER AND o2.ORDORIGE = ?) AS ULTIMO_SERVICO,
      (SELECT MAX(o2.ORDDTEMI) FROM TBORDSE o2
         INNER JOIN TBITORD i2 ON i2.ORDNUMER = o2.ORDNUMER
         WHERE o2.VEINUMER = v.VEINUMER AND o2.ORDORIGE = ?
           AND (UPPER(TRIM(i2.ITODESCR)) CONTAINING 'IPVA'
             OR UPPER(TRIM(i2.ITODESCR)) CONTAINING 'LICENCIAMENTO')) AS ULTIMO_IPVA,
      (SELECT COUNT(*) FROM TBORDSE o2
         WHERE o2.VEINUMER = v.VEINUMER AND o2.ORDORIGE = ?) AS TOTAL_OS,
      COALESCE((SELECT SUM(o2.ORDVLTOT) - SUM(o2.ORDVLREC) FROM TBORDSE o2
         WHERE o2.VEINUMER = v.VEINUMER AND o2.ORDORIGE = ?), 0) AS SALDO_PENDENTE
    FROM TBVEICU v
    LEFT JOIN TBMARCA m ON m.MARNUMER = v.MARNUMER
    WHERE v.VEINUMER IN (
      SELECT DISTINCT o.VEINUMER FROM TBORDSE o WHERE o.ORDORIGE = ?
    )
    ORDER BY ULTIMO_SERVICO DESC NULLS LAST`,
    [clinumer, clinumer, clinumer, clinumer, clinumer], 30000
  );
  return rows.map(r => ({
    VEINUMER: Number(r.VEINUMER ?? 0),
    PLACA: String(r.PLACA ?? '-'),
    RENAVAM: String(r.RENAVAM ?? '-'),
    PROPRIETARIO: String(r.PROPRIETARIO ?? '-'),
    MARCA: String(r.MARCA ?? '-'),
    ULTIMO_SERVICO: String(r.ULTIMO_SERVICO ?? ''),
    ULTIMO_IPVA: String(r.ULTIMO_IPVA ?? ''),
    TOTAL_OS: Number(r.TOTAL_OS ?? 0),
    SALDO_PENDENTE: Number(r.SALDO_PENDENTE ?? 0),
  }));
}

export async function sgdwBuscarHistorico(clinumer: number): Promise<HistoricoMes[]> {
  const rows = await sgdwPost<Record<string, unknown>>(
    `SELECT
      EXTRACT(YEAR FROM o.ORDDTEMI) AS ANO,
      EXTRACT(MONTH FROM o.ORDDTEMI) AS MES,
      COUNT(*) AS TOTAL_OS,
      SUM(COALESCE(o.ORDVLTOT, 0)) AS VALOR_TOTAL,
      SUM(COALESCE(o.ORDVLREC, 0)) AS RECEBIDO,
      SUM(COALESCE(o.ORDVLTOT, 0)) - SUM(COALESCE(o.ORDVLREC, 0)) AS SALDO
    FROM TBORDSE o
    WHERE o.ORDORIGE = ?
      AND o.ORDDTEMI >= CURRENT_DATE - 730
    GROUP BY EXTRACT(YEAR FROM o.ORDDTEMI), EXTRACT(MONTH FROM o.ORDDTEMI)
    ORDER BY ANO DESC, MES DESC`,
    [clinumer], 25000
  );
  return rows.map(r => ({
    ANO: Number(r.ANO ?? 0),
    MES: Number(r.MES ?? 0),
    TOTAL_OS: Number(r.TOTAL_OS ?? 0),
    VALOR_TOTAL: Number(r.VALOR_TOTAL ?? 0),
    RECEBIDO: Number(r.RECEBIDO ?? 0),
    SALDO: Number(r.SALDO ?? 0),
  }));
}

export async function sgdwBuscarPendencias(clinumer: number): Promise<OsRow[]> {
  const rows = await sgdwPost<Record<string, unknown>>(
    `SELECT FIRST 300
      o.ORDNUMER,
      o.ORDDTEMI AS DATA,
      COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
      COALESCE(TRIM(v.VEINOMAN), '-') AS CLIENTE,
      COALESCE(
        (SELECT FIRST 1 TRIM(i.ITODESCR) FROM TBITORD i
         WHERE i.ORDNUMER = o.ORDNUMER ORDER BY i.ITANUMER),
        NULLIF(TRIM(s.SERDESCR), ''), '-'
      ) AS SERVICO,
      COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
      COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
      COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO
    FROM TBORDSE o
    LEFT JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
    LEFT JOIN TBSERVI s ON s.SERNUMER = o.SOSNUMER
    WHERE o.ORDORIGE = ?
      AND (COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0)) > 0
    ORDER BY o.ORDDTEMI DESC`,
    [clinumer], 25000
  );
  return rows.map(r => ({
    ORDNUMER: Number(r.ORDNUMER ?? 0),
    DATA: String(r.DATA ?? ''),
    PLACA: String(r.PLACA ?? '-'),
    CLIENTE: String(r.CLIENTE ?? '-'),
    SERVICO: String(r.SERVICO ?? '-'),
    HONORARIOS: Number(r.HONORARIOS ?? 0),
    RECEBIDO: Number(r.RECEBIDO ?? 0),
    SALDO: Number(r.SALDO ?? 0),
  }));
}

export async function sgdwBuscarOsVeiculo(veinumer: number, clinumer: number): Promise<OsRow[]> {
  const rows = await sgdwPost<Record<string, unknown>>(
    `SELECT FIRST 200
      o.ORDNUMER,
      o.ORDDTEMI AS DATA,
      COALESCE(
        (SELECT FIRST 1 TRIM(i.ITODESCR) FROM TBITORD i
         WHERE i.ORDNUMER = o.ORDNUMER ORDER BY i.ITANUMER),
        NULLIF(TRIM(s.SERDESCR), ''), '-'
      ) AS SERVICO,
      COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
      COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
      COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO
    FROM TBORDSE o
    LEFT JOIN TBSERVI s ON s.SERNUMER = o.SOSNUMER
    WHERE o.VEINUMER = ?
      AND o.ORDORIGE = ?
    ORDER BY o.ORDDTEMI DESC`,
    [veinumer, clinumer], 25000
  );
  return rows.map(r => ({
    ORDNUMER: Number(r.ORDNUMER ?? 0),
    DATA: String(r.DATA ?? ''),
    PLACA: '-',
    CLIENTE: '-',
    SERVICO: String(r.SERVICO ?? '-'),
    HONORARIOS: Number(r.HONORARIOS ?? 0),
    RECEBIDO: Number(r.RECEBIDO ?? 0),
    SALDO: Number(r.SALDO ?? 0),
  }));
}

export function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatData(iso: string) {
  if (!iso) return '-';
  const d = String(iso).split('T')[0].split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}

export function diasDesde(iso: string): number {
  if (!iso) return 9999;
  const d = new Date(String(iso).split('T')[0]);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function statusFrota(ultimoServico: string, ultimoIpva: string): 'ok' | 'alerta' | 'vencido' | 'sem-info' {
  const diasServ = diasDesde(ultimoServico);
  const diasIpva = diasDesde(ultimoIpva);
  if (diasServ === 9999) return 'sem-info';
  // IPVA/licenciamento: anual ~365 dias
  if (ultimoIpva && diasIpva > 365) return 'vencido';
  if (ultimoIpva && diasIpva > 300) return 'alerta';
  if (diasServ > 365) return 'alerta';
  return 'ok';
}
