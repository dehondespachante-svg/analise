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

export const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export async function sgdwBuscarEmpresas(busca: string): Promise<{ CLINUMER: number; NOME: string }[]> {
  const termo = busca.trim().replace(/'/g, "''").slice(0, 100);
  const wh = termo ? `WHERE TRIM(c.CLINOMES) CONTAINING '${termo}'` : '';
  const resp = await fetch('/api/sgdw-relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: `SELECT FIRST 20 c.CLINUMER, TRIM(c.CLINOMES) AS NOME
            FROM TBCLIEN c
            INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER
            ${wh}
            GROUP BY c.CLINUMER, c.CLINOMES
            HAVING COUNT(DISTINCT o.VEINUMER) >= 1
            ORDER BY c.CLINOMES`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return [];
  const data = await resp.json() as { rows?: Record<string, unknown>[] };
  return (data.rows ?? [])
    .map(r => ({ CLINUMER: Number(r.CLINUMER ?? 0), NOME: String(r.NOME ?? '').trim() }))
    .filter(r => r.CLINUMER > 0 && r.NOME);
}

export async function sgdwBuscarOs(clinumer: number, ano: number, mes: number): Promise<OsRow[]> {
  const resp = await fetch('/api/sgdw-relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: `SELECT FIRST 500 SKIP 0
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
      params: [clinumer, ano, mes],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) return [];
  const data = await resp.json() as { rows?: Record<string, unknown>[] };
  return (data.rows ?? []).map(r => ({
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

export function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatData(iso: string) {
  if (!iso) return '-';
  const d = String(iso).split('T')[0].split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}
