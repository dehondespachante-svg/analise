"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, X, AlertTriangle, CheckCircle } from "lucide-react";
import {
  buscarCaixaSgdw, buscarClientesSgdw, buscarDadosTabelaSgdw, buscarEmpresasSgdw,
  buscarEsquemaTiposSgdw, buscarFuncionariosSgdw, buscarKpiCaixaSgdw, buscarKpiOsSgdw,
  buscarOsSgdw, buscarOsVeiculoSgdw, buscarServicosSgdw, buscarVeiculosEmpresaSgdw, buscarVeiculosSgdw,
  cancelarOsSgdw, listarTabelasSgdw, reativarOsSgdw,
  SGDW_EMPRESAS_POR_PAGINA, SGDW_POR_PAGINA,
} from "@/src/features/sgdw/client";
import type {
  CaixaFiltros, OsFiltros, SgdwCaixaKpi, SgdwConfig,
  SgdwExplorerAba, SgdwOsKpi, SgdwPaginaDados,
} from "@/src/features/sgdw/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColDef = {
  key: string; label: string;
  format?: "moeda" | "data" | "bool" | "lancto" | "grupo" | "saldo" | "aprazo";
  align?: "right" | "center";
  w?: number;
};

type PendingAcao = { titulo: string; corpo: string; executar: () => Promise<void> };
type Notif = { tipo: "ok" | "erro"; msg: string };

// ─── Column definitions ───────────────────────────────────────────────────────

const COLS: Record<Exclude<SgdwExplorerAba, "schema" | "empresas">, ColDef[]> = {
  os: [
    { key: "ORDNUMER",   label: "Nro",           w: 68 },
    { key: "DATA",       label: "Data",           format: "data",   w: 88 },
    { key: "CLIENTE",    label: "Cliente" },
    { key: "PLACA",      label: "Placa",          w: 90 },
    { key: "SERVICO",    label: "Servico",        w: 150 },
    { key: "HONORARIOS", label: "Honorarios",    format: "moeda",  align: "right", w: 105 },
    { key: "RECEBIDO",   label: "Recebido",      format: "moeda",  align: "right", w: 105 },
    { key: "SALDO",      label: "A Receber",     format: "saldo",  align: "right", w: 100 },
    { key: "CANCELADO",  label: "Canc",          format: "bool",   align: "center", w: 42 },
  ],
  clientes: [
    { key: "CLINUMER",  label: "Cod",         w: 60 },
    { key: "NOME",      label: "Nome" },
    { key: "QTD_OS",    label: "OS",          align: "right", w: 55 },
    { key: "TOTAL_HON", label: "Honorarios", format: "moeda", align: "right", w: 110 },
    { key: "TOTAL_REC", label: "Recebido",   format: "moeda", align: "right", w: 110 },
    { key: "SALDO",     label: "A Receber",  format: "saldo", align: "right", w: 105 },
  ],
  veiculos: [
    { key: "VEINUMER",  label: "Nro",        w: 60 },
    { key: "PLACA",     label: "Placa",      w: 100 },
    { key: "RENAVAM",   label: "RENAVAM",    w: 150 },
    { key: "QTD_OS",    label: "OS",         align: "right", w: 52 },
    { key: "ULTIMA_OS", label: "Ultima OS", format: "data",  w: 92 },
    { key: "TOTAL_HON", label: "Honorarios",format: "moeda", align: "right", w: 110 },
  ],
  servicos: [
    { key: "SERNUMER",  label: "Cod",         w: 58 },
    { key: "DESCRICAO", label: "Descricao" },
    { key: "QTD_OS",    label: "OS",          align: "right", w: 60 },
    { key: "TOTAL_HON", label: "Honorarios", format: "moeda", align: "right", w: 110 },
    { key: "TOTAL_REC", label: "Recebido",   format: "moeda", align: "right", w: 110 },
  ],
  caixa: [
    { key: "CAIXA",      label: "Nro",    w: 68 },
    { key: "DTLANCTO",   label: "Lancto", format: "data",   w: 88 },
    { key: "TPLANCTO",   label: "D/C",    format: "lancto", align: "center", w: 38 },
    { key: "GRUPOCONTA", label: "Grupo",  format: "grupo",  w: 68 },
    { key: "VALOR",      label: "Valor",  format: "moeda",  align: "right", w: 110 },
    { key: "APRAZO",     label: "Status", format: "aprazo", w: 70 },
    { key: "CONTA",      label: "Conta" },
    { key: "ORIGEM",     label: "Cliente" },
  ],
  funcionarios: [
    { key: "USUNUMER", label: "Codigo", w: 70 },
    { key: "NOME",     label: "Nome" },
  ],
};

const ABAS: Array<{ id: SgdwExplorerAba; label: string; emoji: string }> = [
  { id: "os",           label: "Ordens de Servico",  emoji: "📋" },
  { id: "clientes",     label: "Clientes",            emoji: "👤" },
  { id: "empresas",     label: "Empresas / Frotas",   emoji: "🏢" },
  { id: "veiculos",     label: "Veiculos",            emoji: "🚗" },
  { id: "servicos",     label: "Servicos",            emoji: "⚙️" },
  { id: "caixa",        label: "Caixa / Financeiro",  emoji: "💰" },
  { id: "funcionarios", label: "Funcionarios",        emoji: "👥" },
  { id: "schema",       label: "Banco / Tabelas",     emoji: "🗄️" },
];

const HAS_SEARCH: Partial<Record<SgdwExplorerAba, boolean>> = { os: true, clientes: true, veiculos: true, caixa: true };
const HAS_PAGINATION: Partial<Record<SgdwExplorerAba, boolean>> = { os: true, clientes: true, veiculos: true, caixa: true };

// ─── Formatters ───────────────────────────────────────────────────────────────

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmtData(v: unknown): string {
  if (!v) return "-";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s.slice(0, 10);
}

function fmtCelula(v: unknown, format?: string): string {
  if (v === null || v === undefined) return "-";
  switch (format) {
    case "moeda":  return moeda.format(Number(v));
    case "saldo":  return Number(v) === 0 ? "Quitado" : moeda.format(Number(v));
    case "data":   return fmtData(v);
    case "bool":   return Number(v) === 1 ? "Canc" : "";
    case "lancto": return String(v) === "D" ? "Deb" : "Cre";
    case "grupo":  return String(v) === "1" || Number(v) === 1 ? "A/Rec" : "A/Pag";
    case "aprazo": return Number(v) === -1 ? "Pago" : "Aberto";
    default:       return String(v);
  }
}

function cellColor(v: unknown, format?: string): string {
  switch (format) {
    case "saldo":   return Number(v) <= 0 ? "#1a5c34" : "#c0392b";
    case "moeda":   return Number(v) > 0 ? "#1a5c34" : "#333";
    case "bool":    return Number(v) === 1 ? "#c0392b" : "#888";
    case "lancto":  return String(v) === "D" ? "#1a5c34" : "#c0392b";
    case "grupo":   return (String(v) === "1" || Number(v) === 1) ? "#1a5c34" : "#c0392b";
    case "aprazo":  return Number(v) === -1 ? "#1a5c34" : "#c0392b";
    default:        return "#333";
  }
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function isoHoje(): string { return new Date().toISOString().slice(0, 10); }
function isoDiasAtras(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function isoInicioMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function isoInicioAno(): string { return `${new Date().getFullYear()}-01-01`; }

type Preset = { label: string; ini: string; fim: string } | { label: string; ini: undefined; fim: undefined };

function getPresets(): Preset[] {
  const hoje = isoHoje();
  return [
    { label: "Hoje",      ini: hoje,             fim: hoje },
    { label: "7 dias",    ini: isoDiasAtras(7),  fim: hoje },
    { label: "Este mes",  ini: isoInicioMes(),   fim: hoje },
    { label: "Este ano",  ini: isoInicioAno(),   fim: hoje },
    { label: "Tudo",      ini: undefined,        fim: undefined },
  ];
}

function PresetButtons({
  dataIni, dataFim,
  onSelect,
}: {
  dataIni?: string; dataFim?: string;
  onSelect: (ini: string | undefined, fim: string | undefined) => void;
}) {
  const presets = getPresets();
  const hoje = isoHoje();
  const ativo = presets.find(p => {
    if (p.ini === undefined) return !dataIni && !dataFim;
    return dataIni === p.ini && dataFim === p.fim;
  });
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "3px 9px", borderRadius: 5, border: "1px solid",
    cursor: "pointer", fontSize: "0.68rem", fontWeight: 600,
    borderColor: active ? "var(--accent)" : "#d0ddd6",
    background: active ? "var(--accent)" : "#f8fbf8",
    color: active ? "#fff" : "#555",
    whiteSpace: "nowrap",
  });
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {presets.map(p => (
        <button key={p.label} type="button" style={btnStyle(ativo?.label === p.label)}
          onClick={() => onSelect(p.ini, p.fim)}>
          {p.label}
        </button>
      ))}
      <span style={{ fontSize: "0.65rem", color: "#aaa", marginLeft: 4, alignSelf: "center" }}>
        {hoje}
      </span>
    </div>
  );
}

function filtroMesAtual(): { dataIni: string; dataFim: string } {
  return { dataIni: isoInicioMes(), dataFim: isoHoje() };
}

// ─── KPI Bar ─────────────────────────────────────────────────────────────────

function KpiBar({ cards }: { cards: Array<{ label: string; valor: string; cor?: string }> }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          flex: "1 1 140px", background: "#f4f9f5", border: "1px solid #d8e8d8",
          borderRadius: 8, padding: "10px 14px",
        }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a9a84", marginBottom: 4 }}>
            {c.label}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: c.cor ?? "#1a5c34" }}>
            {c.valor}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter Bars ─────────────────────────────────────────────────────────────

function OsFiltroBar({ filtros, onChange }: { filtros: OsFiltros; onChange: (f: OsFiltros) => void }) {
  return (
    <div style={{ marginBottom: 8, padding: "9px 12px", background: "#f8fbf8", borderRadius: 8, border: "1px solid #e0e8e0", display: "flex", flexDirection: "column", gap: 7 }}>
      {/* Preset row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "#7a9a84", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Periodo:</span>
        <PresetButtons
          dataIni={filtros.dataIni} dataFim={filtros.dataFim}
          onSelect={(ini, fim) => onChange({ ...filtros, dataIni: ini, dataFim: fim })}
        />
      </div>
      {/* Custom date row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#555" }}>
          De
          <input type="date" value={filtros.dataIni ?? ""} onChange={e => onChange({ ...filtros, dataIni: e.target.value || undefined })}
            style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.72rem" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#555" }}>
          Ate
          <input type="date" value={filtros.dataFim ?? ""} onChange={e => onChange({ ...filtros, dataFim: e.target.value || undefined })}
            style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.72rem" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#555", cursor: "pointer" }}>
          <input type="checkbox" checked={!!filtros.incluirCanceladas} onChange={e => onChange({ ...filtros, incluirCanceladas: e.target.checked })} />
          Incluir canceladas
        </label>
        {(filtros.dataIni || filtros.dataFim || filtros.incluirCanceladas) && (
          <button type="button" onClick={() => onChange({})}
            style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #d0ddd6", background: "#fff", cursor: "pointer", fontSize: "0.7rem", color: "#888", display: "flex", alignItems: "center", gap: 3 }}>
            <X size={10} /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}

function CaixaFiltroBar({ filtros, onChange }: { filtros: CaixaFiltros; onChange: (f: CaixaFiltros) => void }) {
  return (
    <div style={{ marginBottom: 8, padding: "9px 12px", background: "#f8fbf8", borderRadius: 8, border: "1px solid #e0e8e0", display: "flex", flexDirection: "column", gap: 7 }}>
      {/* Preset row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "#7a9a84", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Periodo:</span>
        <PresetButtons
          dataIni={filtros.dataIni} dataFim={filtros.dataFim}
          onSelect={(ini, fim) => onChange({ ...filtros, dataIni: ini, dataFim: fim })}
        />
      </div>
      {/* Custom options row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filtros.grupo ?? ""} onChange={e => onChange({ ...filtros, grupo: e.target.value as CaixaFiltros["grupo"] })}
          style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.72rem", background: "#fff" }}>
          <option value="">Todos</option>
          <option value="1">A Receber</option>
          <option value="2">A Pagar</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#555" }}>
          De
          <input type="date" value={filtros.dataIni ?? ""} onChange={e => onChange({ ...filtros, dataIni: e.target.value || undefined })}
            style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.72rem" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#555" }}>
          Ate
          <input type="date" value={filtros.dataFim ?? ""} onChange={e => onChange({ ...filtros, dataFim: e.target.value || undefined })}
            style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.72rem" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#555", cursor: "pointer" }}>
          <input type="checkbox" checked={!!filtros.apenasAberto} onChange={e => onChange({ ...filtros, apenasAberto: e.target.checked })} />
          Apenas abertos
        </label>
        {(filtros.grupo || filtros.dataIni || filtros.dataFim || filtros.apenasAberto) && (
          <button type="button" onClick={() => onChange({})}
            style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid #d0ddd6", background: "#fff", cursor: "pointer", fontSize: "0.7rem", color: "#888", display: "flex", alignItems: "center", gap: 3 }}>
            <X size={10} /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ acao, executando, onConfirmar, onCancelar }: {
  acao: PendingAcao; executando: boolean;
  onConfirmar: () => void; onCancelar: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", maxWidth: 420, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={20} style={{ color: "#e67e22", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#222" }}>{acao.titulo}</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#555", margin: "0 0 20px 0", lineHeight: 1.6 }}>{acao.corpo}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" disabled={executando} onClick={onCancelar}
            style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #d0ddd6", background: "#f5f5f5", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#555" }}>
            Cancelar
          </button>
          <button type="button" disabled={executando} onClick={onConfirmar}
            style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: "#c0392b", cursor: executando ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 700, color: "#fff", opacity: executando ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {executando && <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Data Grid ────────────────────────────────────────────────────────────────

function DataGrid({
  cols, linhas, renderAcoes,
}: {
  cols: ColDef[];
  linhas: Record<string, unknown>[];
  renderAcoes?: (row: Record<string, unknown>) => React.ReactNode;
}) {
  const thStyle = (c: ColDef): React.CSSProperties => ({
    padding: "7px 10px", textAlign: c.align ?? "left", fontWeight: 700,
    color: "#4a6555", fontSize: "0.63rem", textTransform: "uppercase",
    letterSpacing: "0.04em", borderBottom: "2px solid #d8e8d8",
    whiteSpace: "nowrap", ...(c.w ? { width: c.w, minWidth: c.w } : {}),
  });
  const tdStyle = (c: ColDef, v: unknown): React.CSSProperties => ({
    padding: "5px 10px", fontSize: "0.72rem", fontFamily: "inherit",
    textAlign: c.align ?? "left", whiteSpace: "nowrap",
    borderBottom: "1px solid #f0f4f0", color: cellColor(v, c.format),
  });
  return (
    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e0e8e0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
        <thead>
          <tr style={{ background: "#f4f9f5" }}>
            {cols.map(c => <th key={c.key} style={thStyle(c)}>{c.label}</th>)}
            {renderAcoes && <th style={{ ...thStyle({ key: "_", label: "Acoes" }), width: 90, minWidth: 90 }}>Acoes</th>}
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr><td colSpan={cols.length + (renderAcoes ? 1 : 0)} style={{ padding: 20, textAlign: "center", color: "#888", fontSize: "0.75rem" }}>
              Nenhum registro encontrado.
            </td></tr>
          )}
          {linhas.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fbf8" }}>
              {cols.map(c => <td key={c.key} style={tdStyle(c, row[c.key])}>{fmtCelula(row[c.key], c.format)}</td>)}
              {renderAcoes && <td style={{ padding: "4px 8px", borderBottom: "1px solid #f0f4f0" }}>{renderAcoes(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Paginacao({ pagina, total, carregando, onAnterior, onProximo }: {
  pagina: number; total: number; carregando: boolean;
  onAnterior: () => void; onProximo: () => void;
}) {
  const totalPag = Math.ceil(total / SGDW_POR_PAGINA);
  if (totalPag <= 1) return null;
  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: "5px 11px", borderRadius: 7, border: "1px solid #d0ddd6",
    background: "#f0f5f2", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1, display: "flex", alignItems: "center",
    gap: 4, fontSize: "0.73rem", fontWeight: 600, color: "#444",
  });
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 12 }}>
      <button type="button" style={btn(pagina === 0 || carregando)} disabled={pagina === 0 || carregando} onClick={onAnterior}>
        <ChevronLeft size={13} /> Anterior
      </button>
      <span style={{ fontSize: "0.73rem", color: "#666" }}>{pagina + 1} / {totalPag}</span>
      <button type="button" style={btn(pagina >= totalPag - 1 || carregando)} disabled={pagina >= totalPag - 1 || carregando} onClick={onProximo}>
        Proximo <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Schema Browser ───────────────────────────────────────────────────────────

function SchemaTab({ config, tabelas, tabelasLoading }: { config: SgdwConfig; tabelas: string[] | null; tabelasLoading: boolean }) {
  const [filtro, setFiltro]           = useState("");
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [colunas, setColunas]         = useState<string[] | null>(null);
  const [dados, setDados]             = useState<SgdwPaginaDados | null>(null);
  const [pagina, setPagina]           = useState(0);
  const [loading, setLoading]         = useState(false);
  const [erro, setErro]               = useState<string | null>(null);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  const listaFiltrada = (tabelas ?? []).filter(t => !filtro || t.toLowerCase().includes(filtro.toLowerCase()));
  const carregarTabela = useCallback(async (nome: string, pag = 0) => {
    setSelecionada(nome); setPagina(pag);
    if (pag === 0) { setColunas(null); setDados(null); }
    setLoading(true); setErro(null);
    try {
      let cols = colunas;
      if (pag === 0 || !cols) {
        const schema = await buscarEsquemaTiposSgdw(config, nome);
        cols = schema.filter(c => c.TIPO !== 261).map(c => c.CAMPO);
        if (montado.current) setColunas(cols);
      }
      if (cols && cols.length > 0) {
        const d = await buscarDadosTabelaSgdw(config, nome, cols, pag);
        if (montado.current) setDados(d);
      }
    } catch (e) {
      if (montado.current) setErro(e instanceof Error ? e.message : "Erro");
    } finally {
      if (montado.current) setLoading(false);
    }
  }, [config, colunas]);
  const totalPag = dados ? Math.ceil(dados.total / SGDW_POR_PAGINA) : 0;
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: "0 0 175px" }}>
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar tabela..."
          style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.72rem", boxSizing: "border-box", marginBottom: 6 }} />
        {tabelasLoading && <p style={{ fontSize: "0.72rem", color: "#888" }}>Carregando...</p>}
        <div style={{ maxHeight: 400, overflowY: "auto", borderRadius: 8, border: "1px solid #e0e8e0" }}>
          {listaFiltrada.map(t => (
            <button key={t} type="button" onClick={() => carregarTabela(t)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", fontSize: "0.68rem", fontFamily: "monospace", cursor: "pointer", border: "none", borderBottom: "1px solid #f0f4f0", background: selecionada === t ? "var(--accent)" : "transparent", color: selecionada === t ? "#fff" : "#333" }}>
              {t}
            </button>
          ))}
          {listaFiltrada.length === 0 && !tabelasLoading && <p style={{ padding: 10, fontSize: "0.72rem", color: "#888" }}>Nenhuma tabela.</p>}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selecionada && <p style={{ fontSize: "0.78rem", color: "#888", paddingTop: 4 }}>Clique em uma tabela para ver os dados.</p>}
        {selecionada && loading && !dados && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 0", color: "#888", fontSize: "0.78rem" }}>
            <RefreshCw size={13} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} /> Carregando {selecionada}...
          </div>
        )}
        {erro && <div style={{ background: "#fdf3f2", border: "1px solid #f0c0bc", borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem", color: "#c0392b", marginBottom: 8 }}>{erro}</div>}
        {selecionada && dados && colunas && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "monospace", color: "var(--accent)" }}>{selecionada}</span>
              <span style={{ fontSize: "0.68rem", color: "#888" }}>{dados.total.toLocaleString("pt-BR")} linhas · {colunas.length} colunas</span>
              {loading && <RefreshCw size={11} style={{ animation: "spin 1s linear infinite", color: "var(--accent)", marginLeft: "auto" }} />}
            </div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e0e8e0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem" }}>
                <thead><tr style={{ background: "#f4f9f5" }}>
                  {colunas.map(c => <th key={c} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#4a6555", fontSize: "0.62rem", textTransform: "uppercase", borderBottom: "2px solid #d8e8d8", whiteSpace: "nowrap", fontFamily: "monospace" }}>{c}</th>)}
                </tr></thead>
                <tbody>
                  {dados.linhas.length === 0 && <tr><td colSpan={colunas.length} style={{ padding: 16, textAlign: "center", color: "#888" }}>Sem dados.</td></tr>}
                  {dados.linhas.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fbf8" }}>
                      {colunas.map(c => <td key={c} style={{ padding: "4px 8px", borderBottom: "1px solid #f0f4f0", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{row[c] === null || row[c] === undefined ? "-" : String(row[c])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPag > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 10 }}>
                <button type="button" disabled={pagina === 0 || loading} onClick={() => carregarTabela(selecionada, pagina - 1)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d0ddd6", background: "#f0f5f2", cursor: pagina === 0 ? "not-allowed" : "pointer", opacity: pagina === 0 ? 0.4 : 1, fontSize: "0.7rem", display: "flex", alignItems: "center", gap: 3 }}>
                  <ChevronLeft size={11} /> Ant
                </button>
                <span style={{ fontSize: "0.7rem", color: "#666" }}>{pagina + 1}/{totalPag}</span>
                <button type="button" disabled={pagina >= totalPag - 1 || loading} onClick={() => carregarTabela(selecionada, pagina + 1)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d0ddd6", background: "#f0f5f2", cursor: pagina >= totalPag - 1 ? "not-allowed" : "pointer", opacity: pagina >= totalPag - 1 ? 0.4 : 1, fontSize: "0.7rem", display: "flex", alignItems: "center", gap: 3 }}>
                  Pro <ChevronRight size={11} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tier / RPG System ───────────────────────────────────────────────────────

type Tier = { nivel: number; nome: string; cor: string; bg: string; borda: string; emoji: string; min: number; max: number };

const TIERS: Tier[] = [
  { nivel: 1, nome: "Iniciante", cor: "#6b7280", bg: "#f9fafb", borda: "#d1d5db", emoji: "⭐", min: 1,  max: 1  },
  { nivel: 2, nome: "Bronze",    cor: "#92400e", bg: "#fef9f0", borda: "#d97706", emoji: "🥉", min: 2,  max: 4  },
  { nivel: 3, nome: "Prata",     cor: "#374151", bg: "#f8f9fa", borda: "#9ca3af", emoji: "🥈", min: 5,  max: 9  },
  { nivel: 4, nome: "Ouro",      cor: "#b45309", bg: "#fffbeb", borda: "#f59e0b", emoji: "🏆", min: 10, max: 19 },
  { nivel: 5, nome: "Elite",     cor: "#6d28d9", bg: "#f5f3ff", borda: "#8b5cf6", emoji: "💎", min: 20, max: 999 },
];

function getTier(qtdVeiculos: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (qtdVeiculos >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function getXp(qtdVeiculos: number, qtdOs: number, totalHon: number): number {
  return qtdVeiculos * 100 + qtdOs * 5 + Math.floor(totalHon / 500);
}

function getProgressoProximoNivel(qtdVeiculos: number, tier: Tier): { pct: number; faltam: number; proximoNome: string } {
  if (tier.nivel === 5) return { pct: 100, faltam: 0, proximoNome: "" };
  const proximo = TIERS[tier.nivel]; // tier.nivel é 1-based; próximo está em index tier.nivel
  const range = proximo.min - tier.min;
  const progresso = qtdVeiculos - tier.min;
  const pct = range > 0 ? Math.min(99, Math.round((progresso / range) * 100)) : 99;
  return { pct, faltam: proximo.min - qtdVeiculos, proximoNome: proximo.nome };
}

// ─── Empresa Card (accordion inline) ─────────────────────────────────────────

function EmpresaCard({
  empresa, expanded, onToggle, veiculos, carregandoVeiculos,
}: {
  empresa: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
  veiculos: SgdwPaginaDados | null;
  carregandoVeiculos: boolean;
}) {
  const qtdVeiculos = Number(empresa.QTD_VEICULOS ?? 0);
  const qtdOs = Number(empresa.QTD_OS ?? 0);
  const totalHon = Number(empresa.TOTAL_HON ?? 0);
  const totalRec = Number(empresa.TOTAL_REC ?? 0);
  const saldo = totalHon - totalRec;
  const tier = getTier(qtdVeiculos);
  const { pct, faltam, proximoNome } = getProgressoProximoNivel(qtdVeiculos, tier);
  const xp = getXp(qtdVeiculos, qtdOs, totalHon);
  const ultimaOs = !!empresa.ULTIMA_OS ? fmtData(empresa.ULTIMA_OS as string) : "-";
  const clinumer = Number(empresa.CLINUMER ?? 0);
  const nome = String(empresa.NOME ?? "-");
  const planilhaUrl = `/sgdw/empresa/${clinumer}?nome=${encodeURIComponent(nome)}&tier=${encodeURIComponent(`${tier.emoji} ${tier.nome}`)}`;

  return (
    <div style={{
      borderTop: `1px solid ${expanded ? tier.cor : tier.borda}`,
      borderRight: `1px solid ${expanded ? tier.cor : tier.borda}`,
      borderBottom: `1px solid ${expanded ? tier.cor : tier.borda}`,
      borderLeft: `5px solid ${tier.cor}`,
      borderRadius: 10,
      background: tier.bg,
      transition: "box-shadow 0.15s",
      boxShadow: expanded ? `0 4px 18px rgba(0,0,0,0.12)` : "none",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Clickable header ── */}
      <div onClick={onToggle} style={{ padding: "13px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = "0.92"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}>

        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1a202c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nome}
            </div>
            <div style={{ fontSize: "0.6rem", color: "#9ca3af" }}>Cod {String(empresa.CLINUMER ?? "")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", lineHeight: 1 }}>{tier.emoji}</div>
              <div style={{ fontSize: "0.57rem", fontWeight: 800, color: tier.cor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Nv.{tier.nivel} {tier.nome}
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", color: tier.cor, fontWeight: 700 }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "5px 4px" }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: tier.cor }}>{qtdVeiculos}</div>
            <div style={{ fontSize: "0.58rem", color: "#6b7280" }}>veiculos</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "5px 4px" }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#1a5c34" }}>{qtdOs}</div>
            <div style={{ fontSize: "0.58rem", color: "#6b7280" }}>OS total</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "5px 4px" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: saldo > 0 ? "#c0392b" : "#1a5c34" }}>
              {moeda.format(saldo)}
            </div>
            <div style={{ fontSize: "0.58rem", color: "#6b7280" }}>a receber</div>
          </div>
        </div>

        {/* XP bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: "0.58rem", color: "#9ca3af" }}>XP {xp.toLocaleString("pt-BR")}</span>
            <span style={{ fontSize: "0.58rem", color: "#9ca3af" }}>
              {tier.nivel < 5 ? `${faltam} veic. para ${proximoNome}` : "★ Frota Elite"}
            </span>
          </div>
          <div style={{ background: "rgba(0,0,0,0.08)", borderRadius: 4, height: 5 }}>
            <div style={{ background: tier.cor, width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.6s ease" }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: "0.6rem", color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
          <span>Tot: {moeda.format(totalHon)}</span>
          <span>Ultima OS: {ultimaOs}</span>
        </div>
      </div>

      {/* ── Expanded panel (accordion) ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${tier.borda}`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={planilhaUrl}
              style={{ padding: "6px 13px", borderRadius: 7, background: "#1a5c34", color: "#fff", fontWeight: 700, fontSize: "0.72rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
              📄 Ver Planilha / Imprimir
            </a>
            <a href={planilhaUrl}
              style={{ padding: "6px 13px", borderRadius: 7, background: tier.bg, color: tier.cor, fontWeight: 700, fontSize: "0.72rem", border: `1px solid ${tier.borda}`, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {tier.emoji} Página da Empresa
            </a>
          </div>

          {/* Vehicle list */}
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#374151" }}>
            🚗 Frota ({qtdVeiculos} veiculos)
          </div>

          {carregandoVeiculos && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#888", fontSize: "0.72rem" }}>
              <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Carregando frota...
            </div>
          )}

          {veiculos && veiculos.linhas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
              {veiculos.linhas.map((v, i) => {
                const vQtdOs = Number(v.QTD_OS ?? 0);
                const vHon = Number(v.TOTAL_HON ?? 0);
                const vRec = Number(v.TOTAL_REC ?? 0);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "rgba(255,255,255,0.7)", borderRadius: 6, fontSize: "0.68rem" }}>
                    <div>
                      <span style={{ fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.06em", color: "#1a202c" }}>{String(v.PLACA ?? "-")}</span>
                      <span style={{ color: "#9ca3af", marginLeft: 6, fontFamily: "monospace", fontSize: "0.62rem" }}>{String(v.RENAVAM ?? "")}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "#6b7280" }}>{vQtdOs} OS</span>
                      <span style={{ color: "#1a5c34", fontWeight: 700 }}>{moeda.format(vHon)}</span>
                      {vHon - vRec > 0 && <span style={{ color: "#c0392b", fontSize: "0.62rem" }}>+{moeda.format(vHon - vRec)} a rec.</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {veiculos && veiculos.linhas.length === 0 && !carregandoVeiculos && (
            <span style={{ fontSize: "0.7rem", color: "#888" }}>Nenhum veículo encontrado.</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empresa Detalhe Modal ────────────────────────────────────────────────────

function EmpresaDetalheModal({
  empresa, veiculos, carregandoVeiculos, onClose,
}: {
  empresa: Record<string, unknown>;
  veiculos: SgdwPaginaDados | null;
  carregandoVeiculos: boolean;
  onClose: () => void;
}) {
  const qtdVeiculos = Number(empresa.QTD_VEICULOS ?? 0);
  const tier = getTier(qtdVeiculos);
  const { pct, faltam, proximoNome } = getProgressoProximoNivel(qtdVeiculos, tier);
  const totalHon = Number(empresa.TOTAL_HON ?? 0);
  const totalRec = Number(empresa.TOTAL_REC ?? 0);
  const xp = getXp(qtdVeiculos, Number(empresa.QTD_OS ?? 0), totalHon);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 740, maxHeight: "88vh", overflow: "auto", boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }}>

        {/* Modal header */}
        <div style={{ background: tier.bg, borderBottom: `3px solid ${tier.cor}`, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderRadius: "14px 14px 0 0" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.5rem" }}>{tier.emoji}</span>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#1a202c" }}>{String(empresa.NOME ?? "-")}</div>
                <div style={{ fontSize: "0.65rem", color: tier.cor, fontWeight: 700 }}>
                  Nivel {tier.nivel} — Frota {tier.nome} · Cod {String(empresa.CLINUMER ?? "")}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
              {[
                { l: "Veiculos", v: String(qtdVeiculos), c: tier.cor },
                { l: "Ordens de Servico", v: String(empresa.QTD_OS ?? 0), c: "#1a5c34" },
                { l: "Honorarios", v: moeda.format(totalHon), c: "#1a5c34" },
                { l: "Recebido", v: moeda.format(totalRec), c: "#1a5c34" },
                { l: "A Receber", v: moeda.format(totalHon - totalRec), c: totalHon - totalRec > 0 ? "#c0392b" : "#1a5c34" },
                { l: "XP Total", v: xp.toLocaleString("pt-BR"), c: tier.cor },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: "0.58rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.l}</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {tier.nivel < 5 && (
              <div style={{ maxWidth: 340 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: "0.62rem", color: "#6b7280", fontWeight: 600 }}>{tier.nome}</span>
                  <span style={{ fontSize: "0.62rem", color: "#6b7280" }}>{faltam} veic. para {proximoNome}</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.1)", borderRadius: 5, height: 7 }}>
                  <div style={{ background: tier.cor, width: `${pct}%`, height: "100%", borderRadius: 5 }} />
                </div>
              </div>
            )}
            {tier.nivel === 5 && (
              <div style={{ fontSize: "0.72rem", color: tier.cor, fontWeight: 700 }}>★ Nivel Maximo — Frota Elite</div>
            )}
          </div>
          <button type="button" onClick={onClose}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", color: "#6b7280", fontSize: "0.8rem", flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* Vehicle fleet */}
        <div style={{ padding: "16px 22px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 12 }}>
            🚗 Frota de Veiculos ({qtdVeiculos})
          </div>

          {carregandoVeiculos && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: "0.78rem", padding: "20px 0" }}>
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} /> Carregando frota...
            </div>
          )}

          {veiculos && veiculos.linhas.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {veiculos.linhas.map((v, i) => {
                const vQtdOs = Number(v.QTD_OS ?? 0);
                const vHon = Number(v.TOTAL_HON ?? 0);
                const vRec = Number(v.TOTAL_REC ?? 0);
                const vTier = getTier(Math.max(1, Math.round(vQtdOs / 5)));
                return (
                  <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1a202c", letterSpacing: "0.06em" }}>
                        {String(v.PLACA ?? "-")}
                      </span>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fff", background: vTier.cor, padding: "1px 6px", borderRadius: 4 }}>
                        {vQtdOs} OS
                      </span>
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "#6b7280", marginBottom: 6, fontFamily: "monospace" }}>
                      {String(v.RENAVAM ?? "-")}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem" }}>
                      <span style={{ color: "#1a5c34", fontWeight: 700 }}>{moeda.format(vHon)}</span>
                      <span style={{ color: vHon - vRec > 0 ? "#c0392b" : "#888" }}>
                        {vHon - vRec > 0 ? `${moeda.format(vHon - vRec)} a rec.` : "Quitado"}
                      </span>
                    </div>
                    {!!v.ULTIMA_OS && (
                      <div style={{ fontSize: "0.58rem", color: "#9ca3af", marginTop: 4 }}>
                        Ult. OS: {fmtData(v.ULTIMA_OS as string)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {veiculos && veiculos.linhas.length === 0 && !carregandoVeiculos && (
            <p style={{ fontSize: "0.75rem", color: "#888" }}>Nenhum veiculo encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empresas Tab ─────────────────────────────────────────────────────────────

function EmpresasTab({ config }: { config: SgdwConfig }) {
  const [busca, setBusca]               = useState("");
  const [buscaInput, setBuscaInput]     = useState("");
  const [pagina, setPagina]             = useState(0);
  const [dados, setDados]               = useState<SgdwPaginaDados | null>(null);
  const [carregando, setCarregando]     = useState(false);
  const [erro, setErro]                 = useState<string | null>(null);
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [veiculosMap, setVeiculosMap]   = useState<Record<number, SgdwPaginaDados>>({});
  const [carregVeicId, setCarregVeicId] = useState<number | null>(null);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const r = await buscarEmpresasSgdw(config, pagina, busca);
      if (montado.current) setDados(r);
    } catch (e) {
      if (montado.current) setErro(e instanceof Error ? e.message : "Erro");
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, [config, pagina, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  async function toggleEmpresa(clinumer: number) {
    if (expandedId === clinumer) {
      setExpandedId(null);
      return;
    }
    setExpandedId(clinumer);
    if (veiculosMap[clinumer]) return; // already loaded
    setCarregVeicId(clinumer);
    try {
      const r = await buscarVeiculosEmpresaSgdw(config, clinumer);
      if (montado.current) setVeiculosMap(prev => ({ ...prev, [clinumer]: r }));
    } catch { /* ignore */ } finally {
      if (montado.current) setCarregVeicId(null);
    }
  }

  const total = dados?.total ?? 0;
  const totalPag = Math.ceil(total / SGDW_EMPRESAS_POR_PAGINA);

  return (
    <div>
      {/* Search toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <form onSubmit={e => { e.preventDefault(); setPagina(0); setBusca(buscaInput); setExpandedId(null); }} style={{ display: "flex", gap: 6, flex: 1, minWidth: 200 }}>
          <input value={buscaInput} onChange={e => setBuscaInput(e.target.value)}
            placeholder="Buscar empresa pelo nome..."
            style={{ flex: 1, padding: "5px 10px", borderRadius: 7, border: "1px solid #d0ddd6", fontSize: "0.75rem" }} />
          <button type="submit" style={{ padding: "5px 11px", borderRadius: 7, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem" }}>
            <Search size={12} /> Buscar
          </button>
          {busca && <button type="button" onClick={() => { setBusca(""); setBuscaInput(""); setPagina(0); setExpandedId(null); }} style={{ padding: "5px 10px", borderRadius: 7, background: "#f0f5f2", border: "1px solid #d0ddd6", cursor: "pointer", fontSize: "0.73rem" }}>Limpar</button>}
        </form>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dados && <span style={{ fontSize: "0.68rem", color: "#7a9a84" }}>{total} empresas com frota</span>}
          <button type="button" onClick={carregar} disabled={carregando}
            style={{ padding: "5px 11px", borderRadius: 7, background: "#f0f5f2", border: "1px solid #d0ddd6", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", opacity: carregando ? 0.6 : 1 }}>
            <RefreshCw size={11} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }} /> Atualizar
          </button>
        </div>
      </div>

      {/* Tier legend */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {TIERS.map(t => (
          <span key={t.nivel} style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: t.bg, color: t.cor, border: `1px solid ${t.borda}` }}>
            {t.emoji} {t.nome} ({t.nivel < 5 ? `${t.min}–${t.max}` : `${t.min}+`} veic.)
          </span>
        ))}
      </div>

      {/* Loading */}
      {carregando && !dados && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "28px 0", color: "#888", fontSize: "0.78rem" }}>
          <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} /> Buscando empresas com frota...
        </div>
      )}

      {/* Error */}
      {erro && <div style={{ background: "#fdf3f2", border: "1px solid #f0c0bc", borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem", color: "#c0392b", marginBottom: 10, whiteSpace: "pre-wrap" }}>{erro}</div>}

      {/* Card grid */}
      {dados && dados.linhas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))", gap: 12 }}>
          {dados.linhas.map((empresa) => {
            const clin = Number(empresa.CLINUMER ?? 0);
            return (
              <EmpresaCard
                key={clin}
                empresa={empresa}
                expanded={expandedId === clin}
                onToggle={() => toggleEmpresa(clin)}
                veiculos={veiculosMap[clin] ?? null}
                carregandoVeiculos={carregVeicId === clin}
              />
            );
          })}
        </div>
      )}

      {dados && dados.linhas.length === 0 && !carregando && (
        <div style={{ textAlign: "center", padding: "28px 0", color: "#888", fontSize: "0.78rem" }}>
          Nenhuma empresa com frota (2+ veiculos) encontrada.
        </div>
      )}

      {/* Pagination */}
      {totalPag > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 16 }}>
          <button type="button" disabled={pagina === 0 || carregando} onClick={() => setPagina(p => p - 1)}
            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #d0ddd6", background: "#f0f5f2", cursor: pagina === 0 ? "not-allowed" : "pointer", opacity: pagina === 0 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem", fontWeight: 600 }}>
            <ChevronLeft size={13} /> Anterior
          </button>
          <span style={{ fontSize: "0.73rem", color: "#666" }}>{pagina + 1} / {totalPag}</span>
          <button type="button" disabled={pagina >= totalPag - 1 || carregando} onClick={() => setPagina(p => p + 1)}
            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #d0ddd6", background: "#f0f5f2", cursor: pagina >= totalPag - 1 ? "not-allowed" : "pointer", opacity: pagina >= totalPag - 1 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem", fontWeight: 600 }}>
            Proximo <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Veículo Card ─────────────────────────────────────────────────────────────

function Spokes({ cx, cy, r1, r2, n, stroke }: { cx: number; cy: number; r1: number; r2: number; n: number; stroke: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i * Math.PI * 2) / n;
        return <line key={i}
          x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)}
          x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)}
          stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>;
      })}
    </>
  );
}

function CarSvg({ uid, cor }: { uid: string; cor: string }) {
  const b = `${uid}_b`; const g = `${uid}_g`; const w = `${uid}_w`; const r = `${uid}_r`;
  return (
    <svg viewBox="0 0 290 118" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", filter: `drop-shadow(0 10px 24px ${cor}70)` }}>
      <defs>
        <linearGradient id={b} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor}/>
          <stop offset="50%" stopColor={cor} stopOpacity="0.82"/>
          <stop offset="100%" stopColor="#060c14"/>
        </linearGradient>
        <linearGradient id={`${b}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={g} x1="0.15" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor="#c8eaff" stopOpacity="0.96"/>
          <stop offset="55%" stopColor="#6aaad8" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#2460a0" stopOpacity="0.78"/>
        </linearGradient>
        <radialGradient id={w}>
          <stop offset="0%" stopColor="#606878"/>
          <stop offset="50%" stopColor="#282e3c"/>
          <stop offset="100%" stopColor="#0c1018"/>
        </radialGradient>
        <radialGradient id={r}>
          <stop offset="0%" stopColor="#f0f4ff"/>
          <stop offset="35%" stopColor="#c0c8e0"/>
          <stop offset="70%" stopColor="#7888b0"/>
          <stop offset="100%" stopColor="#384060"/>
        </radialGradient>
        <radialGradient id={`${uid}_hl`} cx="50%" cy="30%">
          <stop offset="0%" stopColor={cor} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={cor} stopOpacity="0"/>
        </radialGradient>
      </defs>

      <ellipse cx="145" cy="108" rx="118" ry="7" fill="rgba(0,0,0,0.45)"/>
      <ellipse cx="145" cy="108" rx="80" ry="4" fill={cor} opacity="0.08"/>

      <circle cx="74"  cy="90" r="28" fill={`url(#${w})`}/>
      <circle cx="74"  cy="90" r="20" fill={`url(#${r})`}/>
      <Spokes cx={74}  cy={90} r1={6} r2={19} n={10} stroke="#5868a0"/>
      <circle cx="74"  cy="90" r="5.5" fill="#1a2030"/>
      <circle cx="74"  cy="90" r="2.8" fill={cor}/>

      <circle cx="216" cy="90" r="28" fill={`url(#${w})`}/>
      <circle cx="216" cy="90" r="20" fill={`url(#${r})`}/>
      <Spokes cx={216} cy={90} r1={6} r2={19} n={10} stroke="#5868a0"/>
      <circle cx="216" cy="90" r="5.5" fill="#1a2030"/>
      <circle cx="216" cy="90" r="2.8" fill={cor}/>

      <path d="M 10,92 L 10,72 Q 14,58 28,50 L 54,34 Q 72,20 96,18 L 180,18 Q 208,18 228,34 L 258,58 Q 272,68 275,78 L 276,92 Z"
        fill={`url(#${b})`}/>
      <path d="M 28,92 A 34,34 0 0 1 104,92" fill="#06090e"/>
      <path d="M 170,92 A 34,34 0 0 1 246,92" fill="#06090e"/>

      <path d="M 58,34 Q 80,14 100,12 L 180,12 Q 208,12 226,34 L 222,56 L 62,56 Z"
        fill={`url(#${g})`}/>
      <path d="M 66,16 Q 104,8 152,12 L 148,26 Q 106,22 70,30 Z" fill="rgba(255,255,255,0.24)"/>
      <path d="M 180,14 Q 208,14 222,34 L 214,38 Q 202,18 182,18 Z" fill="rgba(255,255,255,0.14)"/>
      <rect x="153" y="12" width="5" height="44" rx="2" fill="#101820"/>
      <path d="M 62,56 L 57,92" stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none"/>
      <path d="M 222,56 L 228,92" stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none"/>
      <path d="M 12,70 Q 145,58 274,70" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none"/>
      <path d="M 10,72 Q 145,54 276,72 L 276,62 Q 145,44 10,62 Z" fill={`url(#${`${b}s`})`}/>
      <path d="M 68,12 Q 145,6 220,12" stroke="rgba(255,255,255,0.32)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M 226,34 Q 254,52 272,76" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" fill="none"/>

      <path d="M 246,44 L 274,34 L 276,46 L 248,56 Z" fill="#fff8e0" opacity="0.96"/>
      <path d="M 250,46 L 272,37 L 273,44 L 251,52 Z" fill="white" opacity="0.55"/>
      <path d="M 248,50 L 272,41" stroke={cor} strokeWidth="1.5" opacity="0.6"/>
      <path d="M 276,36 L 292,28 L 292,48 L 276,48 Z" fill="#fff8c0" opacity="0.1"/>

      <path d="M 10,50 L 17,46 L 17,64 L 10,64 Z" fill="#ff1a1a" opacity="0.95"/>
      <path d="M 11,52 L 16,49 L 16,62 L 11,62 Z" fill="#ff8080" opacity="0.5"/>
      <ellipse cx="9" cy="58" rx="5" ry="10" fill="#ff0000" opacity="0.1"/>

      <path d="M 248,80 L 277,68 L 278,84 L 248,90 Z" fill="#0e1420"/>
      {[252,258,264,270].map(x => (
        <line key={x} x1={x} y1={70} x2={x+1} y2={88} stroke="#1e2a38" strokeWidth="1.2"/>
      ))}
      <path d="M 10,78 L 34,72 L 34,92 L 10,92 Z" fill="#0e1420"/>
      {[16,22,28].map(x => (
        <line key={x} x1={x} y1={72} x2={x} y2={92} stroke="#1e2a38" strokeWidth="1.2"/>
      ))}
      <path d="M 36,84 L 248,84 L 246,90 L 38,90 Z" fill="rgba(255,255,255,0.05)"/>

      <ellipse cx="26" cy="91" rx="6" ry="3.5" fill="#141c28"/>
      <ellipse cx="26" cy="91" rx="3.5" ry="2" fill="#060c14"/>
      <ellipse cx="37" cy="91" rx="5" ry="3" fill="#141c28"/>
      <ellipse cx="37" cy="91" rx="2.8" ry="1.6" fill="#060c14"/>

      <ellipse cx="145" cy="54" rx="100" ry="36" fill={`url(#${`${uid}_hl`})`}/>
    </svg>
  );
}

const CAR_CORES = [
  "#1e6fc8", "#c82828", "#18a040", "#c89018",
  "#8820c8", "#08a8b0", "#c05818", "#4860c0",
];

function VeiculoCard({ veiculo, onOpen }: {
  veiculo: Record<string, unknown>; onOpen: () => void;
}) {
  const veinumer = Number(veiculo.VEINUMER ?? 0);
  const placa    = String(veiculo.PLACA ?? "-").toUpperCase();
  const renavam  = String(veiculo.RENAVAM ?? "-");
  const qtdOs    = Number(veiculo.QTD_OS ?? 0);
  const totalHon = Number(veiculo.TOTAL_HON ?? 0);
  const ultimaOs = !!veiculo.ULTIMA_OS ? fmtData(veiculo.ULTIMA_OS as string) : "-";
  const cor      = CAR_CORES[veinumer % CAR_CORES.length];
  const uid      = `cv${veinumer}`;
  const isMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa);

  return (
    <div onClick={onOpen} style={{
      borderRadius: 16, overflow: "hidden", cursor: "pointer",
      background: "#ffffff", border: `1px solid #e5e7eb`,
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      transition: "box-shadow 0.2s, transform 0.15s",
    }}
    onMouseEnter={e => {
      const d = e.currentTarget as HTMLDivElement;
      d.style.transform = "translateY(-3px)";
      d.style.boxShadow = `0 10px 28px rgba(0,0,0,0.14), 0 0 0 2px ${cor}55`;
    }}
    onMouseLeave={e => {
      const d = e.currentTarget as HTMLDivElement;
      d.style.transform = "none";
      d.style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)";
    }}>

      <div style={{ height: 5, background: `linear-gradient(90deg, ${cor}, ${cor}bb)` }}/>

      <div style={{ padding: "14px 10px 6px", background: `radial-gradient(ellipse at 50% 20%, ${cor}15 0%, transparent 70%)`, display: "flex", justifyContent: "center" }}>
        <img src="/veiculos.png" alt="veiculo" style={{ width: "100%", maxWidth: 220, objectFit: "contain" }}/>
      </div>

      {/* Placa */}
      <div style={{ display: "flex", justifyContent: "center", padding: "2px 0 12px" }}>
        <div style={{ background: cor, borderRadius: 6, boxShadow: `0 2px 8px ${cor}55`, padding: "4px 18px", textAlign: "center" }}>
          <div style={{ fontSize: "0.32rem", color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 1 }}>
            {isMercosul ? "MERCOSUL" : "BRASIL"}
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#ffffff", letterSpacing: "0.2em", fontFamily: "'Courier New', monospace", lineHeight: 1 }}>
            {placa}
          </div>
        </div>
      </div>

      {/* Stats sempre visíveis */}
      <div style={{ margin: "0 12px 10px", borderRadius: 10, overflow: "hidden", border: "1px solid #f0f0f0", background: "#f8f9fa" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr" }}>
          <div style={{ padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: cor, lineHeight: 1 }}>{qtdOs}</div>
            <div style={{ fontSize: "0.5rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3, fontWeight: 700 }}>Ordens de Serv.</div>
          </div>
          <div style={{ background: "#e5e7eb" }}/>
          <div style={{ padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#111827", lineHeight: 1.1 }}>{moeda.format(totalHon)}</div>
            <div style={{ fontSize: "0.5rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3, fontWeight: 700 }}>Total Honor.</div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "6px 12px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.52rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Ultima OS</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#374151" }}>{ultimaOs}</span>
        </div>
      </div>

      {/* Dados cadastro sempre visíveis */}
      <div style={{ margin: "0 12px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Codigo", value: `#${veinumer}` },
          { label: "RENAVAM", value: renavam },
        ].map(f => (
          <div key={f.label} style={{ background: "#f8f9fa", borderRadius: 8, padding: "7px 10px", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "0.48rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2, fontWeight: 700 }}>{f.label}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1f2937", fontFamily: "monospace" }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* Botão abrir modal */}
      <div style={{ margin: "0 12px 12px", background: cor, borderRadius: 8, padding: "8px", textAlign: "center", color: "#fff", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>
        Ver Historico Completo →
      </div>
    </div>
  );
}

// ─── Modal veículo ─────────────────────────────────────────────────────────────

function VeiculoModal({ config, veiculo, onClose }: {
  config: SgdwConfig; veiculo: Record<string, unknown>; onClose: () => void;
}) {
  const veinumer = Number(veiculo.VEINUMER ?? 0);
  const placa    = String(veiculo.PLACA ?? "-").toUpperCase();
  const renavam  = String(veiculo.RENAVAM ?? "-");
  const qtdOs    = Number(veiculo.QTD_OS ?? 0);
  const totalHon = Number(veiculo.TOTAL_HON ?? 0);
  const ultimaOs = !!veiculo.ULTIMA_OS ? fmtData(veiculo.ULTIMA_OS as string) : "-";
  const cor      = CAR_CORES[veinumer % CAR_CORES.length];
  const uid      = `mv${veinumer}`;
  const isMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa);

  const [os, setOs]               = useState<Record<string, unknown>[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]           = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true); setErro(null);
    buscarOsVeiculoSgdw(config, veinumer)
      .then(r => { if (ativo) { setOs(r.linhas); setCarregando(false); } })
      .catch(e => { if (ativo) { setErro(e instanceof Error ? e.message : "Erro"); setCarregando(false); } });
    return () => { ativo = false; };
  }, [config, veinumer]);

  const totalRec  = os.reduce((s, r) => s + Number(r.RECEBIDO ?? 0), 0);
  const totalSaldo = os.reduce((s, r) => s + Number(r.SALDO ?? 0), 0);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 860,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ background: cor, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>
              {isMercosul ? "Mercosul" : "Brasil"} · Codigo #{veinumer}
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff", letterSpacing: "0.18em", fontFamily: "'Courier New', monospace", lineHeight: 1 }}>
              {placa}
            </div>
            <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              RENAVAM: <strong style={{ color: "#fff" }}>{renavam}</strong>
            </div>
          </div>
          <div style={{ width: 160, flexShrink: 0 }}>
            <img src="/veiculos.png" alt="veiculo" style={{ width: "100%", objectFit: "contain" }}/>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: "1.1rem", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
          {[
            { label: "Total OS", value: String(qtdOs), color: cor },
            { label: "Honorarios", value: moeda.format(totalHon), color: "#111827" },
            { label: "Recebido", value: moeda.format(totalRec), color: "#16a34a" },
            { label: "Saldo", value: moeda.format(totalSaldo), color: totalSaldo > 0 ? "#dc2626" : "#16a34a" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "0.5rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontWeight: 700 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Lista OS */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px" }}>
          <div style={{ padding: "14px 20px 8px", fontSize: "0.72rem", fontWeight: 700, color: "#374151", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Historico de Servicos — {os.length} ordens</span>
            <span style={{ fontSize: "0.6rem", color: "#9ca3af" }}>Ultima: {ultimaOs}</span>
          </div>

          {carregando && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 20px", color: "#888", fontSize: "0.78rem" }}>
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", color: cor }}/> Carregando historico...
            </div>
          )}
          {erro && (
            <div style={{ margin: "12px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem", color: "#dc2626" }}>{erro}</div>
          )}

          {!carregando && os.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e5e7eb" }}>
                  {["OS", "Data", "Servico", "Cliente", "Honorarios", "Recebido", "Saldo"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "OS" ? "center" : "left", fontWeight: 700, color: "#6b7280", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {os.map((row, i) => {
                  const hon  = Number(row.HONORARIOS ?? 0);
                  const rec  = Number(row.RECEBIDO ?? 0);
                  const sld  = Number(row.SALDO ?? 0);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "7px 12px", textAlign: "center", fontWeight: 700, color: cor, fontFamily: "monospace" }}>{String(row.ORDNUMER ?? "-")}</td>
                      <td style={{ padding: "7px 12px", color: "#374151", whiteSpace: "nowrap" }}>{fmtData(String(row.DATA ?? ""))}</td>
                      <td style={{ padding: "7px 12px", color: "#1f2937", maxWidth: 180 }}>{String(row.SERVICO ?? "-")}</td>
                      <td style={{ padding: "7px 12px", color: "#1f2937", maxWidth: 160 }}>{String(row.CLIENTE ?? "-")}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>{moeda.format(hon)}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600, color: "#16a34a", whiteSpace: "nowrap" }}>{moeda.format(rec)}</td>
                      <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600, color: sld > 0 ? "#dc2626" : "#16a34a", whiteSpace: "nowrap" }}>{moeda.format(sld)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8f9fa", borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={4} style={{ padding: "8px 12px", fontWeight: 700, color: "#374151", fontSize: "0.65rem" }}>TOTAL ({os.length} OS)</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: "#111827", whiteSpace: "nowrap" }}>{moeda.format(totalHon)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: "#16a34a", whiteSpace: "nowrap" }}>{moeda.format(totalRec)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: totalSaldo > 0 ? "#dc2626" : "#16a34a", whiteSpace: "nowrap" }}>{moeda.format(totalSaldo)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {!carregando && os.length === 0 && !erro && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: "0.78rem" }}>Nenhuma ordem de servico encontrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Veículos Tab ─────────────────────────────────────────────────────────────

function VeiculosTab({ config }: { config: SgdwConfig }) {
  const [busca, setBusca]           = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [pagina, setPagina]         = useState(0);
  const [dados, setDados]           = useState<SgdwPaginaDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [modalVeiculo, setModalVeiculo] = useState<Record<string, unknown> | null>(null);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const r = await buscarVeiculosSgdw(config, pagina, busca);
      if (montado.current) setDados(r);
    } catch (e) {
      if (montado.current) setErro(e instanceof Error ? e.message : "Erro");
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, [config, pagina, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  const total    = dados?.total ?? 0;
  const totalPag = Math.ceil(total / SGDW_POR_PAGINA);

  return (
    <div>
      {/* Modal */}
      {modalVeiculo && (
        <VeiculoModal config={config} veiculo={modalVeiculo} onClose={() => setModalVeiculo(null)}/>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <form onSubmit={e => { e.preventDefault(); setPagina(0); setBusca(buscaInput); }} style={{ display: "flex", gap: 6, flex: 1, minWidth: 200 }}>
          <input value={buscaInput} onChange={e => setBuscaInput(e.target.value)}
            placeholder="Buscar por placa ou RENAVAM..."
            style={{ flex: 1, padding: "5px 10px", borderRadius: 7, border: "1px solid #d0ddd6", fontSize: "0.75rem" }}/>
          <button type="submit" style={{ padding: "5px 11px", borderRadius: 7, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem" }}>
            <Search size={12}/> Buscar
          </button>
          {busca && <button type="button" onClick={() => { setBusca(""); setBuscaInput(""); setPagina(0); }} style={{ padding: "5px 10px", borderRadius: 7, background: "#f0f5f2", border: "1px solid #d0ddd6", cursor: "pointer", fontSize: "0.73rem" }}>Limpar</button>}
        </form>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dados && <span style={{ fontSize: "0.68rem", color: "#7a9a84" }}>{total.toLocaleString("pt-BR")} veiculos</span>}
          <button type="button" onClick={carregar} disabled={carregando}
            style={{ padding: "5px 11px", borderRadius: 7, background: "#f0f5f2", border: "1px solid #d0ddd6", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", opacity: carregando ? 0.6 : 1 }}>
            <RefreshCw size={11} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }}/> Atualizar
          </button>
        </div>
      </div>

      {/* Loading */}
      {carregando && !dados && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "28px 0", color: "#888", fontSize: "0.78rem" }}>
          <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }}/> Carregando veiculos...
        </div>
      )}

      {erro && <div style={{ background: "#fdf3f2", border: "1px solid #f0c0bc", borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem", color: "#c0392b", marginBottom: 10, whiteSpace: "pre-wrap" }}>{erro}</div>}

      {/* Cards grid */}
      {dados && dados.linhas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}>
          {dados.linhas.map(v => (
            <VeiculoCard key={Number(v.VEINUMER ?? 0)} veiculo={v} onOpen={() => setModalVeiculo(v)}/>
          ))}
        </div>
      )}

      {dados && dados.linhas.length === 0 && !carregando && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#888", fontSize: "0.8rem" }}>Nenhum veiculo encontrado.</div>
      )}

      {/* Pagination */}
      {totalPag > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 18 }}>
          <button type="button" disabled={pagina === 0 || carregando} onClick={() => setPagina(p => p - 1)}
            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #d0ddd6", background: "#f0f5f2", cursor: pagina === 0 ? "not-allowed" : "pointer", opacity: pagina === 0 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem", fontWeight: 600 }}>
            <ChevronLeft size={13}/> Anterior
          </button>
          <span style={{ fontSize: "0.73rem", color: "#666" }}>{pagina + 1} / {totalPag}</span>
          <button type="button" disabled={pagina >= totalPag - 1 || carregando} onClick={() => setPagina(p => p + 1)}
            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #d0ddd6", background: "#f0f5f2", cursor: pagina >= totalPag - 1 ? "not-allowed" : "pointer", opacity: pagina >= totalPag - 1 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem", fontWeight: 600 }}>
            Proximo <ChevronRight size={13}/>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Explorer ────────────────────────────────────────────────────────────

export default function SgdwExplorer({ config }: { config: SgdwConfig }) {
  const [aba, setAba]               = useState<SgdwExplorerAba>("os");
  const [pagina, setPagina]         = useState(0);
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca]           = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados]           = useState<SgdwPaginaDados | null>(null);
  const [erro, setErro]             = useState<string | null>(null);

  // Tab-specific filters — default: este mês
  const [osFiltros, setOsFiltros]       = useState<OsFiltros>(filtroMesAtual);
  const [caixaFiltros, setCaixaFiltros] = useState<CaixaFiltros>(filtroMesAtual);

  // KPI
  const [osKpi, setOsKpi]       = useState<SgdwOsKpi | null>(null);
  const [caixaKpi, setCaixaKpi] = useState<SgdwCaixaKpi | null>(null);

  // Confirm modal
  const [pendingAcao, setPendingAcao]   = useState<PendingAcao | null>(null);
  const [executando, setExecutando]     = useState(false);

  // Notification
  const [notif, setNotif]               = useState<Notif | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schema tab
  const [tabelas, setTabelas]           = useState<string[] | null>(null);
  const [tabelasLoading, setTabelasLoading] = useState(false);

  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  function showNotif(tipo: "ok" | "erro", msg: string) {
    setNotif({ tipo, msg });
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => { if (montado.current) setNotif(null); }, 4000);
  }

  const fetchDados = useCallback(async () => {
    if (aba === "schema" || aba === "empresas" || aba === "veiculos") return;
    setCarregando(true); setErro(null);
    try {
      let r: SgdwPaginaDados;
      switch (aba) {
        case "os": {
          const [osData, kpi] = await Promise.all([
            buscarOsSgdw(config, pagina, busca, osFiltros),
            buscarKpiOsSgdw(config, osFiltros),
          ]);
          r = osData;
          if (montado.current) setOsKpi(kpi);
          break;
        }
        case "clientes":     r = await buscarClientesSgdw(config, pagina, busca); break;
        case "servicos":     r = await buscarServicosSgdw(config); break;
        case "caixa": {
          const [cxData, kpi] = await Promise.all([
            buscarCaixaSgdw(config, pagina, busca, caixaFiltros),
            buscarKpiCaixaSgdw(config, caixaFiltros),
          ]);
          r = cxData;
          if (montado.current) setCaixaKpi(kpi);
          break;
        }
        case "funcionarios": r = await buscarFuncionariosSgdw(config); break;
        default: return;
      }
      if (montado.current) setDados(r);
    } catch (e) {
      if (montado.current) setErro(e instanceof Error ? e.message : "Erro ao buscar dados");
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, [aba, pagina, busca, config, osFiltros, caixaFiltros]);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  const mudarAba = (nova: SgdwExplorerAba) => {
    setAba(nova); setPagina(0); setBusca(""); setBuscaInput(""); setDados(null); setErro(null);
    if (nova === "schema" && !tabelas && !tabelasLoading) {
      setTabelasLoading(true);
      listarTabelasSgdw(config)
        .then(ts => { if (montado.current) { setTabelas(ts); setTabelasLoading(false); } })
        .catch(() => { if (montado.current) setTabelasLoading(false); });
    }
  };

  function triggerAcaoOs(row: Record<string, unknown>) {
    const num = Number(row.ORDNUMER);
    const cancelado = Number(row.CANCELADO) === 1;
    if (cancelado) {
      setPendingAcao({
        titulo: `Reativar OS #${num}`,
        corpo: `Esta acao ira reativar a OS #${num} no banco SGDW.\nO registro sera marcado como ativo novamente.\n\nCliente: ${row.CLIENTE ?? "-"} | Placa: ${row.PLACA ?? "-"}`,
        executar: async () => { await reativarOsSgdw(config, num); },
      });
    } else {
      setPendingAcao({
        titulo: `Cancelar OS #${num}`,
        corpo: `Esta acao ira CANCELAR a OS #${num} no banco SGDW.\nEsta operacao afeta os dados do sistema local.\n\nCliente: ${row.CLIENTE ?? "-"} | Placa: ${row.PLACA ?? "-"}\nHonorarios: ${row.HONORARIOS ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(row.HONORARIOS)) : "-"}`,
        executar: async () => { await cancelarOsSgdw(config, num); },
      });
    }
  }

  async function confirmarAcao() {
    if (!pendingAcao) return;
    setExecutando(true);
    try {
      await pendingAcao.executar();
      setPendingAcao(null);
      showNotif("ok", `${pendingAcao.titulo} — concluido com sucesso.`);
      fetchDados();
    } catch (e) {
      setPendingAcao(null);
      showNotif("erro", e instanceof Error ? e.message : "Erro ao executar acao.");
    } finally {
      if (montado.current) setExecutando(false);
    }
  }

  const total = dados?.total ?? 0;
  const cols = (aba !== "schema" && aba !== "empresas") ? COLS[aba as Exclude<SgdwExplorerAba, "schema" | "empresas">] : [];

  // OS KPI cards
  const osKpiCards = osKpi ? [
    { label: "Ordens Abertas",  valor: osKpi.totalOs.toLocaleString("pt-BR") },
    { label: "Total Honorarios",valor: moeda.format(osKpi.totalHonorarios) },
    { label: "Total Recebido",  valor: moeda.format(osKpi.totalRecebido), cor: "#1a5c34" },
    { label: "A Receber",       valor: moeda.format(osKpi.totalSaldo),    cor: osKpi.totalSaldo > 0 ? "#c0392b" : "#1a5c34" },
  ] : [];

  // Caixa KPI cards
  const caixaKpiCards = caixaKpi ? [
    { label: "A Receber",   valor: moeda.format(caixaKpi.totalReceber), cor: "#c0392b" },
    { label: "Recebido",    valor: moeda.format(caixaKpi.totalRecebido), cor: "#1a5c34" },
    { label: "A Pagar",     valor: moeda.format(caixaKpi.totalPagar),    cor: "#e67e22" },
    { label: "Pago",        valor: moeda.format(caixaKpi.totalPago),     cor: "#888" },
  ] : [];

  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#7a9a84", margin: "0 0 10px 0" }}>
        Explorador de Dados SGDW
      </p>

      {/* Notification */}
      {notif && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
          padding: "9px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
          background: notif.tipo === "ok" ? "#f0faf4" : "#fdf3f2",
          border: `1px solid ${notif.tipo === "ok" ? "#b0dfc0" : "#f0c0bc"}`,
          color: notif.tipo === "ok" ? "#1a5c34" : "#c0392b",
        }}>
          {notif.tipo === "ok" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {notif.msg}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap", borderBottom: "2px solid #d8e8d8", marginBottom: 0 }}>
        {ABAS.map(a => {
          const ativa = aba === a.id;
          return (
            <button key={a.id} type="button" onClick={() => mudarAba(a.id)} style={{
              padding: "6px 11px", fontSize: "0.72rem", fontWeight: 600,
              cursor: "pointer", border: "1px solid transparent", borderBottom: "none",
              borderRadius: "6px 6px 0 0", background: ativa ? "#fff" : "transparent",
              color: ativa ? "var(--accent)" : "#6a8a76",
              borderColor: ativa ? "#d8e8d8" : "transparent",
              marginBottom: ativa ? "-2px" : 0, transition: "color 0.15s, background 0.15s",
            }}>
              {a.emoji} {a.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ border: "1px solid #d8e8d8", borderTop: "none", borderRadius: "0 0 10px 10px", background: "#fff", padding: "14px 16px", minHeight: 140 }}>
        {aba === "schema" ? (
          <SchemaTab config={config} tabelas={tabelas} tabelasLoading={tabelasLoading} />
        ) : aba === "empresas" ? (
          <EmpresasTab config={config} />
        ) : aba === "veiculos" ? (
          <VeiculosTab config={config} />
        ) : (
          <>
            {/* KPI bar */}
            {aba === "os" && osKpiCards.length > 0 && <KpiBar cards={osKpiCards} />}
            {aba === "caixa" && caixaKpiCards.length > 0 && <KpiBar cards={caixaKpiCards} />}

            {/* Filter bars */}
            {aba === "os" && <OsFiltroBar filtros={osFiltros} onChange={f => { setOsFiltros(f); setPagina(0); }} />}
            {aba === "caixa" && <CaixaFiltroBar filtros={caixaFiltros} onChange={f => { setCaixaFiltros(f); setPagina(0); }} />}

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              {HAS_SEARCH[aba] && (
                <form onSubmit={e => { e.preventDefault(); setPagina(0); setBusca(buscaInput); }} style={{ display: "flex", gap: 6, flex: 1, minWidth: 180 }}>
                  <input value={buscaInput} onChange={e => setBuscaInput(e.target.value)}
                    placeholder={aba === "os" ? "Buscar por nro, cliente ou placa..." : "Buscar..."}
                    style={{ flex: 1, padding: "5px 10px", borderRadius: 7, border: "1px solid #d0ddd6", fontSize: "0.75rem" }} />
                  <button type="submit" style={{ padding: "5px 11px", borderRadius: 7, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem" }}>
                    <Search size={12} /> Buscar
                  </button>
                  {busca && (
                    <button type="button" onClick={() => { setBusca(""); setBuscaInput(""); setPagina(0); }}
                      style={{ padding: "5px 10px", borderRadius: 7, background: "#f0f5f2", border: "1px solid #d0ddd6", cursor: "pointer", fontSize: "0.73rem" }}>
                      Limpar
                    </button>
                  )}
                </form>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
                {dados && (
                  <span style={{ fontSize: "0.68rem", color: "#7a9a84" }}>
                    {total.toLocaleString("pt-BR")} registros
                    {HAS_PAGINATION[aba] && total > SGDW_POR_PAGINA && ` · Pag ${pagina + 1}/${Math.ceil(total / SGDW_POR_PAGINA)}`}
                  </span>
                )}
                <button type="button" onClick={fetchDados} disabled={carregando}
                  style={{ padding: "5px 11px", borderRadius: 7, background: "#f0f5f2", border: "1px solid #d0ddd6", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", opacity: carregando ? 0.6 : 1 }}>
                  <RefreshCw size={11} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }} /> Atualizar
                </button>
              </div>
            </div>

            {/* Loading */}
            {carregando && !dados && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 0", color: "#888", fontSize: "0.78rem" }}>
                <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} /> Carregando...
              </div>
            )}

            {/* Error */}
            {erro && (
              <div style={{ background: "#fdf3f2", border: "1px solid #f0c0bc", borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem", color: "#c0392b", marginBottom: 8, whiteSpace: "pre-wrap" }}>
                {erro}
              </div>
            )}

            {/* Data grid */}
            {dados && (
              <DataGrid
                cols={cols}
                linhas={dados.linhas}
                renderAcoes={aba === "os" ? (row) => {
                  const cancelado = Number(row.CANCELADO) === 1;
                  return (
                    <button type="button" onClick={() => triggerAcaoOs(row)}
                      style={{
                        padding: "3px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                        fontSize: "0.67rem", fontWeight: 700,
                        background: cancelado ? "#eaf5ee" : "#fdf3f2",
                        color: cancelado ? "#1a5c34" : "#c0392b",
                      }}>
                      {cancelado ? "Reativar" : "Cancelar"}
                    </button>
                  );
                } : undefined}
              />
            )}

            {/* Pagination */}
            {dados && HAS_PAGINATION[aba] && (
              <Paginacao pagina={pagina} total={total} carregando={carregando}
                onAnterior={() => setPagina(p => p - 1)} onProximo={() => setPagina(p => p + 1)} />
            )}
          </>
        )}
      </div>

      {/* Confirm modal */}
      {pendingAcao && (
        <ConfirmModal acao={pendingAcao} executando={executando}
          onConfirmar={confirmarAcao} onCancelar={() => setPendingAcao(null)} />
      )}
    </div>
  );
}
