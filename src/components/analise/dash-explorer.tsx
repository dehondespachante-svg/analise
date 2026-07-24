"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, X, AlertTriangle, CheckCircle, Download, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import {
  buscarCaixaSgdw, buscarClientesSgdw, buscarDadosTabelaSgdw, buscarEmpresasSgdw,
  buscarEsquemaTiposSgdw, buscarFuncionariosSgdw, buscarKpiCaixaSgdw, buscarKpiOsSgdw,
  buscarMunicipiosSgdw, buscarOsSgdw, buscarOsVeiculoSgdw, buscarServicosSgdw,
  buscarTodasEmpresasSgdw, buscarVeiculosEmpresaSgdw, buscarVeiculosSgdw,
  cancelarOsSgdw, criarClienteSgdw, listarTabelasSgdw, reativarOsSgdw,
  buscarClienteCompletoPorNumeroSgdw,
  buscarOsOrigemSgdw,
  SGDW_EMPRESAS_POR_PAGINA, SGDW_POR_PAGINA,
} from "@/src/features/sgdw/client";
import type {
  CaixaFiltros, OsFiltros, SgdwCaixaKpi, SgdwConfig,
  SgdwExplorerAba, SgdwOsKpi, SgdwPaginaDados,
} from "@/src/features/sgdw/types";
import type { SgdwClienteCompleto } from "@/src/features/sgdw/client";
import { NovaOsModal } from "@/src/components/analise/nova-os-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColDef = {
  key: string; label: string;
  format?: "moeda" | "data" | "hora" | "bool" | "lancto" | "grupo" | "saldo" | "aprazo" | "ostatus";
  align?: "right" | "center";
  w?: number;
  render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode;
};

type PendingAcao = { titulo: string; corpo: string; executar: () => Promise<void> };
type Notif = { tipo: "ok" | "erro"; msg: string };

// ─── Column definitions ───────────────────────────────────────────────────────

const COLS: Record<Exclude<SgdwExplorerAba, "schema" | "empresas" | "veiculos" | "atpv">, ColDef[]> = {
  os: [
    { key: "ORDNUMER",   label: "N° OS",         align: "center",  w: 72 },
    { key: "DATA",       label: "Data",           format: "data",   w: 92 },
    { key: "HORA",       label: "Hora",           format: "hora",   align: "center", w: 58 },
    { key: "CLIENTE",    label: "Cliente" },
    { key: "PLACA",      label: "Placa",          align: "center",  w: 90 },
    { key: "SERVICO",    label: "Serviço",        w: 170 },
    { key: "CRIADOR",    label: "Criado por",     w: 120 },
    { key: "HONORARIOS", label: "Honorários",    format: "moeda",  align: "right", w: 108 },
    { key: "RECEBIDO",   label: "Recebido",      format: "moeda",  align: "right", w: 108 },
    { key: "SALDO",      label: "A Receber",     format: "saldo",  align: "right", w: 108 },
    {
      key: "CANCELADO", label: "Status", align: "center", w: 86,
      render: (v) => {
        const canc = Number(v) === 1;
        return (
          <span style={{
            display: "inline-block", padding: "2px 10px", borderRadius: 12,
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.04em",
            background: canc ? "#fde8e8" : "#e8f5ee",
            color: canc ? "#b91c1c" : "#1a5c34",
            border: `1px solid ${canc ? "#fca5a5" : "#86efac"}`,
          }}>
            {canc ? "✕ Cancelado" : "● Ativo"}
          </span>
        );
      },
    },
  ],
  clientes: [
    { key: "CLINUMER",  label: "Cod",         w: 60 },
    { key: "NOME",      label: "Nome" },
    { key: "QTD_OS",    label: "OS",          align: "right", w: 55 },
    { key: "TOTAL_HON", label: "Honorarios", format: "moeda", align: "right", w: 110 },
    { key: "TOTAL_REC", label: "Recebido",   format: "moeda", align: "right", w: 110 },
    { key: "SALDO",     label: "A Receber",  format: "saldo", align: "right", w: 105 },
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

function fmtHora(v: unknown): string {
  const s = String(v ?? "");
  if (!s || s === "-" || s === "null") return "—";
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
}

function fmtCelula(v: unknown, format?: string): string {
  if (v === null || v === undefined) return "-";
  switch (format) {
    case "moeda":   return moeda.format(Number(v));
    case "saldo":   return Number(v) === 0 ? "Quitado" : moeda.format(Number(v));
    case "data":    return fmtData(v);
    case "hora":    return fmtHora(v);
    case "bool":    return Number(v) === 1 ? "Canc" : "";
    case "ostatus": return Number(v) === 1 ? "✕ Cancelado" : "● Ativo";
    case "lancto":  return String(v) === "D" ? "Deb" : "Cre";
    case "grupo":   return String(v) === "1" || Number(v) === 1 ? "A/Rec" : "A/Pag";
    case "aprazo":  return Number(v) === -1 ? "Pago" : "Aberto";
    default:        return String(v);
  }
}

function cellColor(v: unknown, format?: string): string {
  switch (format) {
    case "saldo":   return Number(v) <= 0 ? "#1a5c34" : "#c0392b";
    case "moeda":   return Number(v) > 0 ? "#1a5c34" : "#333";
    case "bool":    return Number(v) === 1 ? "#c0392b" : "#888";
    case "ostatus": return Number(v) === 1 ? "#b91c1c" : "#1a5c34";
    case "hora":    return "#6b7280";
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
  const temFiltro = !!(filtros.dataIni || filtros.dataFim || filtros.incluirCanceladas);
  return (
    <div style={{ marginBottom: 10, borderRadius: 8, border: "1px solid #d8e8d0", background: "#f6fbf7", overflow: "hidden" }}>
      {/* Linha 1: Período */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #e0ecd8", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#4a6555", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 48 }}>Período</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <PresetButtons
            dataIni={filtros.dataIni} dataFim={filtros.dataFim}
            onSelect={(ini, fim) => onChange({ ...filtros, dataIni: ini, dataFim: fim })}
          />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.71rem", color: "#555" }}>
            <span style={{ color: "#4a6555", fontWeight: 600 }}>De</span>
            <input type="date" value={filtros.dataIni ?? ""} onChange={e => onChange({ ...filtros, dataIni: e.target.value || undefined })}
              style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid #c8dcc8", fontSize: "0.71rem" }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.71rem", color: "#555" }}>
            <span style={{ color: "#4a6555", fontWeight: 600 }}>Até</span>
            <input type="date" value={filtros.dataFim ?? ""} onChange={e => onChange({ ...filtros, dataFim: e.target.value || undefined })}
              style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid #c8dcc8", fontSize: "0.71rem" }} />
          </label>
        </div>
        {temFiltro && (
          <button type="button" onClick={() => onChange({})}
            style={{ marginLeft: "auto", padding: "2px 9px", borderRadius: 5, border: "1px solid #d0ddd6", background: "#fff", cursor: "pointer", fontSize: "0.68rem", color: "#888", display: "flex", alignItems: "center", gap: 3 }}>
            <X size={10} /> Limpar
          </button>
        )}
      </div>

      {/* Linha 2: Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#4a6555", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 48 }}>Status</span>
        {(
          [
            { label: "Somente ativas",    val: false },
            { label: "Incluir canceladas", val: true  },
          ] as const
        ).map(opt => (
          <button key={String(opt.val)} type="button"
            onClick={() => onChange({ ...filtros, incluirCanceladas: opt.val })}
            style={{
              padding: "3px 12px", borderRadius: 12, fontSize: "0.68rem", fontWeight: 600, cursor: "pointer",
              border: `1px solid ${(!!filtros.incluirCanceladas) === opt.val ? (opt.val ? "#fca5a5" : "#86efac") : "#d0ddd6"}`,
              background: (!!filtros.incluirCanceladas) === opt.val ? (opt.val ? "#fde8e8" : "#e8f5ee") : "#fff",
              color: (!!filtros.incluirCanceladas) === opt.val ? (opt.val ? "#b91c1c" : "#1a5c34") : "#666",
            }}>
            {opt.val ? "✕ Canceladas" : "● Ativas"}
          </button>
        ))}
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
  cols, linhas, renderAcoes, rowStyle,
}: {
  cols: ColDef[];
  linhas: Record<string, unknown>[];
  renderAcoes?: (row: Record<string, unknown>) => React.ReactNode;
  rowStyle?: (row: Record<string, unknown>, i: number) => React.CSSProperties;
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
    borderBottom: "1px solid #f0f4f0",
    color: c.render ? undefined : cellColor(v, c.format),
  });
  return (
    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e0e8e0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
        <thead>
          <tr style={{ background: "#f4f9f5" }}>
            {cols.map(c => <th key={c.key} style={thStyle(c)}>{c.label}</th>)}
            {renderAcoes && <th style={{ ...thStyle({ key: "_", label: "Ações" }), width: 90, minWidth: 90 }}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr><td colSpan={cols.length + (renderAcoes ? 1 : 0)} style={{ padding: 20, textAlign: "center", color: "#888", fontSize: "0.75rem" }}>
              Nenhum registro encontrado.
            </td></tr>
          )}
          {linhas.map((row, i) => {
            const baseBg = i % 2 === 0 ? "#fff" : "#f8fbf8";
            const extra = rowStyle?.(row, i) ?? {};
            return (
              <tr key={i} style={{ background: baseBg, ...extra }}>
                {cols.map(c => (
                  <td key={c.key} style={tdStyle(c, row[c.key])}>
                    {c.render ? c.render(row[c.key], row) : fmtCelula(row[c.key], c.format)}
                  </td>
                ))}
                {renderAcoes && <td style={{ padding: "4px 8px", borderBottom: "1px solid #f0f4f0" }}>{renderAcoes(row)}</td>}
              </tr>
            );
          })}
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
  const [exportando, setExportando]     = useState(false);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  async function handleExportarExcel() {
    setExportando(true);
    try {
      const empresas = await buscarTodasEmpresasSgdw(config, busca);

      const VERDE_ESCURO  = "1B6B3A";
      const VERDE_MED     = "2E8B57";
      const VERDE_CLARO   = "D6EEE0";
      const CINZA_TOTAL   = "EBEBEB";
      const BRANCO        = "FFFFFF";
      const PRETO         = "1A1A1A";
      const VERDE_TEXTO   = "1A5C34";
      const VERM_TEXTO    = "C0392B";

      const borda = (cor = "B0C8B8") => ({
        top:    { style: "thin" as const, color: { rgb: cor } },
        bottom: { style: "thin" as const, color: { rgb: cor } },
        left:   { style: "thin" as const, color: { rgb: cor } },
        right:  { style: "thin" as const, color: { rgb: cor } },
      });
      const bordaForte = (cor = VERDE_ESCURO) => ({
        top:    { style: "medium" as const, color: { rgb: cor } },
        bottom: { style: "medium" as const, color: { rgb: cor } },
        left:   { style: "thin"   as const, color: { rgb: cor } },
        right:  { style: "thin"   as const, color: { rgb: cor } },
      });

      const FMT_MOEDA = '"R$"\\ #,##0.00';

      const totalHon      = empresas.reduce((s, e) => s + Number(e.TOTAL_HON ?? 0), 0);
      const totalRec      = empresas.reduce((s, e) => s + Number(e.TOTAL_REC ?? 0), 0);
      const totalAReceber = totalHon - totalRec;
      const totalOS       = empresas.reduce((s, e) => s + Number(e.QTD_OS ?? 0), 0);
      const totalVeic     = empresas.reduce((s, e) => s + Number(e.QTD_VEICULOS ?? 0), 0);

      const ws: XLSX.WorkSheet = {};
      const NCOLS = 9;

      // ── Row 0: Título
      ws["A1"] = {
        v: "EMPRESAS COM FROTA  –  RELATÓRIO DE HONORÁRIOS",
        t: "s",
        s: {
          fill: { patternType: "solid", fgColor: { rgb: VERDE_ESCURO } },
          font: { bold: true, color: { rgb: BRANCO }, sz: 15, name: "Calibri" },
          alignment: { horizontal: "center", vertical: "center" },
        },
      };

      // ── Row 1: Subtítulo
      const agora   = new Date();
      const dataStr = agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const filtroStr = busca ? `   |   Filtro: "${busca}"` : "";
      ws["A2"] = {
        v: `Gerado em: ${dataStr} às ${horaStr}   |   Total: ${empresas.length} empresas${filtroStr}`,
        t: "s",
        s: {
          fill: { patternType: "solid", fgColor: { rgb: VERDE_MED } },
          font: { color: { rgb: BRANCO }, sz: 10, name: "Calibri", italic: true },
          alignment: { horizontal: "center", vertical: "center" },
        },
      };

      // ── Row 2: Linha separadora vazia
      for (let c = 0; c < NCOLS; c++) {
        ws[XLSX.utils.encode_cell({ r: 2, c })] = {
          v: "", t: "s",
          s: { fill: { patternType: "solid", fgColor: { rgb: VERDE_CLARO } } },
        };
      }

      // ── Row 3: Cabeçalhos
      const HEADERS = [
        { label: "#",               align: "center" },
        { label: "Código",          align: "center" },
        { label: "Empresa",         align: "left"   },
        { label: "Tier",            align: "center" },
        { label: "Veículos",        align: "center" },
        { label: "OS",              align: "center" },
        { label: "Honorários (R$)", align: "right"  },
        { label: "Recebido (R$)",   align: "right"  },
        { label: "A Receber (R$)",  align: "right"  },
      ];
      HEADERS.forEach(({ label, align }, ci) => {
        ws[XLSX.utils.encode_cell({ r: 3, c: ci })] = {
          v: label, t: "s",
          s: {
            fill:      { patternType: "solid", fgColor: { rgb: VERDE_MED } },
            font:      { bold: true, color: { rgb: BRANCO }, sz: 10, name: "Calibri" },
            alignment: { horizontal: align as "center" | "left" | "right", vertical: "center" },
            border:    bordaForte(),
          },
        };
      });

      // ── Linhas de dados
      empresas.forEach((emp, ri) => {
        const rowIdx    = 4 + ri;
        const bgRgb     = ri % 2 === 0 ? BRANCO : "F4FAF6";
        const qtdVeic   = Number(emp.QTD_VEICULOS ?? 0);
        const qtdOs     = Number(emp.QTD_OS ?? 0);
        const hon       = Number(emp.TOTAL_HON ?? 0);
        const rec       = Number(emp.TOTAL_REC ?? 0);
        const saldo     = hon - rec;
        const tier      = getTier(qtdVeic);
        const ultimaOs  = emp.ULTIMA_OS ? fmtData(emp.ULTIMA_OS as string) : "-";

        const base = {
          fill:   { patternType: "solid" as const, fgColor: { rgb: bgRgb } },
          font:   { sz: 9, name: "Calibri", color: { rgb: PRETO } },
          border: borda(),
        };
        const center  = { ...base, alignment: { horizontal: "center" as const } };
        const left    = { ...base, alignment: { horizontal: "left"   as const } };
        const right   = { ...base, alignment: { horizontal: "right"  as const } };
        const moeda   = { ...right, numFmt: FMT_MOEDA };
        const saldoS  = {
          ...moeda,
          font: { ...base.font, color: { rgb: saldo < 0 ? VERM_TEXTO : saldo > 0 ? VERDE_TEXTO : PRETO } },
        };

        const cells = [
          { v: ri + 1,                     t: "n" as const, s: center },
          { v: Number(emp.CLINUMER ?? 0),  t: "n" as const, s: center },
          { v: String(emp.NOME ?? "-"),    t: "s" as const, s: left   },
          { v: `${tier.emoji} ${tier.nome}`, t: "s" as const, s: center },
          { v: qtdVeic,                    t: "n" as const, s: center },
          { v: qtdOs,                      t: "n" as const, s: center },
          { v: hon,                        t: "n" as const, s: moeda  },
          { v: rec,                        t: "n" as const, s: moeda  },
          { v: saldo,                      t: "n" as const, s: saldoS },
        ];
        cells.forEach((cell, ci) => {
          ws[XLSX.utils.encode_cell({ r: rowIdx, c: ci })] = cell;
        });
      });

      // ── Linha de totais
      const totalRow = 4 + empresas.length;
      const boldBase = {
        fill:   { patternType: "solid" as const, fgColor: { rgb: CINZA_TOTAL } },
        font:   { bold: true, sz: 10, name: "Calibri", color: { rgb: PRETO } },
        border: {
          top:    { style: "medium" as const, color: { rgb: "888888" } },
          bottom: { style: "medium" as const, color: { rgb: "888888" } },
          left:   { style: "thin"   as const, color: { rgb: "B0B0B0" } },
          right:  { style: "thin"   as const, color: { rgb: "B0B0B0" } },
        },
      };
      const boldCenter = { ...boldBase, alignment: { horizontal: "center" as const } };
      const boldMoeda  = { ...boldBase, alignment: { horizontal: "right"  as const }, numFmt: FMT_MOEDA };
      const saldoTotalS = {
        ...boldMoeda,
        font: { ...boldBase.font, color: { rgb: totalAReceber < 0 ? VERM_TEXTO : VERDE_TEXTO } },
      };

      [
        { v: "",          t: "s" as const, s: boldBase   },
        { v: "",          t: "s" as const, s: boldBase   },
        { v: "TOTAL",     t: "s" as const, s: { ...boldBase, font: { ...boldBase.font }, alignment: { horizontal: "left" as const } } },
        { v: "",          t: "s" as const, s: boldBase   },
        { v: totalVeic,   t: "n" as const, s: boldCenter },
        { v: totalOS,     t: "n" as const, s: boldCenter },
        { v: totalHon,    t: "n" as const, s: boldMoeda  },
        { v: totalRec,    t: "n" as const, s: boldMoeda  },
        { v: totalAReceber, t: "n" as const, s: saldoTotalS },
      ].forEach((cell, ci) => {
        ws[XLSX.utils.encode_cell({ r: totalRow, c: ci })] = cell;
      });

      // ── Configuração da planilha
      ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRow, c: NCOLS - 1 } });
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: NCOLS - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: NCOLS - 1 } },
      ];
      ws["!cols"] = [
        { wch: 5  }, // #
        { wch: 8  }, // Código
        { wch: 40 }, // Empresa
        { wch: 14 }, // Tier
        { wch: 10 }, // Veículos
        { wch: 8  }, // OS
        { wch: 18 }, // Honorários
        { wch: 18 }, // Recebido
        { wch: 18 }, // A Receber
      ];
      ws["!rows"] = [
        { hpx: 38 }, // título
        { hpx: 22 }, // subtítulo
        { hpx: 8  }, // separador
        { hpx: 22 }, // cabeçalhos
        ...Array(empresas.length).fill({ hpx: 17 }),
        { hpx: 22 }, // totais
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Empresas com Frota");
      XLSX.writeFile(wb, `empresas-frota-${dataStr.replace(/\//g, "-")}.xlsx`);
    } catch (e) {
      console.error("Erro ao exportar Excel:", e);
    } finally {
      setExportando(false);
    }
  }

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
          <button type="button" onClick={handleExportarExcel} disabled={exportando || carregando}
            title="Exportar todas as empresas para Excel"
            style={{ padding: "5px 12px", borderRadius: 7, background: exportando ? "#cce8d8" : "#1B6B3A", border: "none", cursor: exportando ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 600, color: "#fff", opacity: exportando ? 0.75 : 1, whiteSpace: "nowrap" }}>
            <Download size={11} style={{ animation: exportando ? "spin 1s linear infinite" : "none" }} />
            {exportando ? "Gerando..." : "Exportar Excel"}
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

const VEI_GREEN = "#16a34a";
const VEI_GREEN_LIGHT = "#f0fdf4";
const VEI_GREEN_MID   = "#dcfce7";
const VEI_GREEN_BORDER = "#bbf7d0";

function VeiculoCard({ veiculo, onOpen }: {
  veiculo: Record<string, unknown>; onOpen: () => void;
}) {
  const veinumer     = Number(veiculo.VEINUMER ?? 0);
  const placa        = String(veiculo.PLACA ?? "-").toUpperCase();
  const renavam      = String(veiculo.RENAVAM ?? "-");
  const qtdOs        = Number(veiculo.QTD_OS ?? 0);
  const totalHon     = Number(veiculo.TOTAL_HON ?? 0);
  const ultimaOs     = !!veiculo.ULTIMA_OS ? fmtData(veiculo.ULTIMA_OS as string) : "-";
  const isMercosul   = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa);
  const renavamShort = renavam.length > 12 ? renavam.slice(0, 12) + "…" : renavam;

  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 22, overflow: "hidden", cursor: "pointer",
        background: "#ffffff",
        border: "1.5px solid " + VEI_GREEN_BORDER,
        boxShadow: "0 2px 12px rgba(22,163,74,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        const d = e.currentTarget as HTMLDivElement;
        d.style.transform = "translateY(-5px) scale(1.012)";
        d.style.boxShadow = "0 20px 48px rgba(22,163,74,0.18), 0 0 0 2px " + VEI_GREEN;
      }}
      onMouseLeave={e => {
        const d = e.currentTarget as HTMLDivElement;
        d.style.transform = "none";
        d.style.boxShadow = "0 2px 12px rgba(22,163,74,0.10), 0 1px 3px rgba(0,0,0,0.06)";
      }}
    >
      {/* green top bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, " + VEI_GREEN + ", #4ade80)" }}/>

      {/* Logo — sem fundo, direto no branco */}
      <div style={{ padding: "16px 22px 4px", display: "flex", justifyContent: "center" }}>
        <img src="/veiculos.png" alt="veículo"
          style={{ width: "100%", maxWidth: 200, objectFit: "contain" }}/>
      </div>

      {/* License plate */}
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 10px" }}>
        <div style={{
          background: VEI_GREEN,
          borderRadius: 10,
          padding: "5px 22px 7px",
          textAlign: "center",
          boxShadow: "0 3px 12px rgba(22,163,74,0.35)",
        }}>
          <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.75)", letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 2, fontWeight: 800 }}>
            {isMercosul ? "MERCOSUL" : "BRASIL"}
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#fff", letterSpacing: "0.22em", fontFamily: "'Courier New', monospace", lineHeight: 1 }}>
            {placa}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ margin: "0 14px 12px", borderRadius: 14, overflow: "hidden", background: VEI_GREEN_LIGHT, border: "1.5px solid " + VEI_GREEN_BORDER }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr" }}>
          <div style={{ padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: VEI_GREEN, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{qtdOs}</div>
            <div style={{ fontSize: "0.5rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3, fontWeight: 700 }}>Ordens</div>
          </div>
          <div style={{ background: VEI_GREEN_BORDER }}/>
          <div style={{ padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 900, color: "#111827", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{moeda.format(totalHon)}</div>
            <div style={{ fontSize: "0.5rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3, fontWeight: 700 }}>Honorários</div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid " + VEI_GREEN_BORDER, padding: "7px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: VEI_GREEN_MID }}>
          <span style={{ fontSize: "0.52rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Última OS</span>
          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#111827" }}>{ultimaOs}</span>
        </div>
      </div>

      {/* Meta fields */}
      <div style={{ margin: "0 14px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        {[
          { label: "Código", value: `#${veinumer}` },
          { label: "RENAVAM", value: renavamShort },
        ].map(f => (
          <div key={f.label} style={{ background: VEI_GREEN_LIGHT, borderRadius: 11, padding: "8px 11px", border: "1px solid " + VEI_GREEN_BORDER }}>
            <div style={{ fontSize: "0.48rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3, fontWeight: 700 }}>{f.label}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1f2937", fontFamily: "monospace" }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ margin: "0 14px 14px", background: VEI_GREEN, borderRadius: 13, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#fff", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", boxShadow: "0 4px 14px rgba(22,163,74,0.40)" }}>
        Ver Histórico Completo
        <span style={{ opacity: 0.85 }}>→</span>
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
  const cor      = VEI_GREEN;
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
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)" as any,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "rgba(12,16,24,0.97)",
        backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)" as any,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 26,
        width: "100%", maxWidth: 900,
        maxHeight: "92vh",
        display: "flex", flexDirection: "column",
        boxShadow: `0 48px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), 0 0 80px ${cor}18`,
        overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 20,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 25% 60%, ${cor}22 0%, transparent 60%)`, pointerEvents: "none" }}/>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${cor}cc, ${cor}44, transparent)` }}/>


          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.58rem", color: cor, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 800, marginBottom: 7 }}>
              {isMercosul ? "MERCOSUL" : "BRASIL"} · Veículo #{veinumer}
            </div>
            {/* plate */}
            <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.06)", border: `1.5px solid ${cor}60`, borderRadius: 12, padding: "6px 20px", marginBottom: 12, boxShadow: `0 0 28px ${cor}28` }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fff", letterSpacing: "0.22em", fontFamily: "'Courier New', monospace", lineHeight: 1 }}>{placa}</div>
            </div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              {[
                { label: "RENAVAM", value: renavam },
                { label: "Última OS", value: ultimaOs },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.82)", fontFamily: "monospace" }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, alignSelf: "flex-start", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
          >✕</button>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {[
            { label: "Total OS",    value: String(qtdOs),          color: cor },
            { label: "Honorários", value: moeda.format(totalHon),  color: "#f1f5f9" },
            { label: "Recebido",   value: moeda.format(totalRec),   color: "#4ade80" },
            { label: "Saldo",      value: moeda.format(totalSaldo), color: totalSaldo > 0 ? "#f87171" : "#4ade80" },
          ].map((k, i) => (
            <div key={k.label} style={{ padding: "15px 18px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.36)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 5, fontWeight: 700 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── OS list ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "13px 24px 11px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "sticky", top: 0, background: "rgba(12,16,24,0.97)", backdropFilter: "blur(12px)", zIndex: 1 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
              Histórico de Serviços
              {!carregando && <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.32)", marginLeft: 6 }}>— {os.length} ordens</span>}
            </span>
            <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>Última: {ultimaOs}</span>
          </div>

          {carregando && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "28px 24px", color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", color: cor }}/>
              Carregando histórico...
            </div>
          )}
          {erro && (
            <div style={{ margin: "14px 24px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 11, padding: "11px 15px", fontSize: "0.75rem", color: "#fca5a5" }}>{erro}</div>
          )}

          {!carregando && os.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {[
                    { h: "OS",          align: "center" },
                    { h: "Data",        align: "left" },
                    { h: "Serviço",     align: "left" },
                    { h: "Cliente",     align: "left" },
                    { h: "Honorários",  align: "right" },
                    { h: "Recebido",    align: "right" },
                    { h: "Saldo",       align: "right" },
                  ].map(({ h, align }) => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: align as any, fontWeight: 700, color: "rgba(255,255,255,0.32)", fontSize: "0.57rem", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", background: "rgba(255,255,255,0.02)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {os.map((row, i) => {
                  const hon = Number(row.HONORARIOS ?? 0);
                  const rec = Number(row.RECEBIDO ?? 0);
                  const sld = Number(row.SALDO ?? 0);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.018)" }}>
                      <td style={{ padding: "9px 14px", textAlign: "center", fontWeight: 800, color: cor, fontFamily: "monospace" }}>{String(row.ORDNUMER ?? "-")}</td>
                      <td style={{ padding: "9px 14px", color: "rgba(255,255,255,0.58)", whiteSpace: "nowrap" }}>{fmtData(String(row.DATA ?? ""))}</td>
                      <td style={{ padding: "9px 14px", color: "rgba(255,255,255,0.82)", maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(row.SERVICO ?? "-")}</td>
                      <td style={{ padding: "9px 14px", color: "rgba(255,255,255,0.65)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(row.CLIENTE ?? "-")}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{moeda.format(hon)}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: "#4ade80", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{moeda.format(rec)}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: sld > 0 ? "#f87171" : "#4ade80", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{moeda.format(sld)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
                  <td colSpan={4} style={{ padding: "10px 14px", fontWeight: 700, color: "rgba(255,255,255,0.5)", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.09em" }}>TOTAL — {os.length} OS</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#f1f5f9", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{moeda.format(totalHon)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#4ade80", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{moeda.format(totalRec)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: totalSaldo > 0 ? "#f87171" : "#4ade80", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{moeda.format(totalSaldo)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {!carregando && os.length === 0 && !erro && (
            <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem" }}>Nenhuma ordem de serviço encontrada.</div>
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

// ─── Cliente Detalhe Modal ────────────────────────────────────────────────────

const CIVIL_LABEL: Record<number, string> = { 1:"Solteiro(a)", 2:"Casado(a)", 3:"Viúvo(a)", 4:"Divorciado(a)", 5:"Outros" };
const SEXO_LABEL:  Record<number, string> = { 1:"Masculino", 2:"Feminino", 3:"Não informado" };
const moedaDet = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function ClienteDetalheModal({ clinumer, config, onFechar }: {
  clinumer: number;
  config: SgdwConfig;
  onFechar: () => void;
}) {
  const [dados, setDados]       = useState<SgdwClienteCompleto | null>(null);
  const [os, setOs]             = useState<Record<string, unknown>[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tabAtiva, setTabAtiva] = useState<"geral" | "endereco" | "os">("geral");
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    setCarregando(true);
    Promise.all([
      buscarClienteCompletoPorNumeroSgdw(config, clinumer),
      buscarOsOrigemSgdw(config, clinumer),
    ]).then(([det, osLista]) => {
      if (!montado.current) return;
      setDados(det);
      setOs(osLista);
      setCarregando(false);
    }).catch(() => { if (montado.current) setCarregando(false); });
    return () => { montado.current = false; };
  }, [clinumer, config]);

  const d = dados;
  const saldo = d ? d.TOTAL_HON - d.TOTAL_REC : 0;

  const campo = (label: string, valor: string | number | null | undefined, opts?: { mono?: boolean; w?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, ...(opts?.w ? { width: opts.w, flexShrink: 0 } : { flex: 1 }) }}>
      <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: "0.78rem", color: valor ? "#111" : "#9ca3af", fontFamily: opts?.mono ? "monospace" : "inherit", fontWeight: valor ? 600 : 400 }}>
        {valor || "—"}
      </span>
    </div>
  );

  const secTit = (t: string) => (
    <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#1a5c34", textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1.5px solid #bbf7d0", paddingBottom: 4, marginBottom: 10 }}>{t}</div>
  );

  const tabSty = (a: boolean): React.CSSProperties => ({
    padding: "7px 16px", border: "none", cursor: "pointer", fontSize: "0.72rem", fontFamily: "inherit",
    background: a ? "#fff" : "#f0fdf4", color: a ? "#1a5c34" : "#6b7280",
    fontWeight: a ? 700 : 400, borderBottom: a ? "2px solid #1a5c34" : "2px solid transparent",
  });

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar(); }}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>

      <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 820, maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)", fontFamily: "system-ui,Arial,sans-serif", overflow: "hidden" }}>

        {/* ── Barra título */}
        <div style={{ background: "linear-gradient(135deg,#1a3a2a,#1a5c34)", padding: "12px 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
                SGDW · Cadastro do Cliente · Cod. {clinumer}
              </div>
              {carregando
                ? <div style={{ fontSize: "1rem", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>Carregando...</div>
                : <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{d?.NOME ?? "—"}</div>
              }
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {d && (
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: d.ATIVO ? "rgba(134,239,172,0.25)" : "rgba(239,68,68,0.25)", color: d.ATIVO ? "#86efac" : "#fca5a5", border: `1px solid ${d.ATIVO ? "rgba(134,239,172,0.4)" : "rgba(239,68,68,0.4)"}` }}>
                  {d.ATIVO ? "● Ativo" : "○ Inativo"}
                </span>
              )}
              <button type="button" onClick={onFechar} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: "0.9rem" }}>✕</button>
            </div>
          </div>

          {/* KPI rápido */}
          {d && (
            <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
              {[
                { l: "OS Emitidas", v: String(d.QTD_OS) },
                { l: "Honorários", v: moedaDet.format(d.TOTAL_HON) },
                { l: "Recebido", v: moedaDet.format(d.TOTAL_REC) },
                { l: "Saldo", v: moedaDet.format(saldo), destaque: saldo > 0 },
              ].map(k => (
                <div key={k.l}>
                  <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.l}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: k.destaque ? "#fca5a5" : "#fff" }}>{k.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs */}
        <div style={{ display: "flex", background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", flexShrink: 0 }}>
          <button type="button" style={tabSty(tabAtiva === "geral")}   onClick={() => setTabAtiva("geral")}>Dados Pessoais</button>
          <button type="button" style={tabSty(tabAtiva === "endereco")} onClick={() => setTabAtiva("endereco")}>Endereço</button>
          <button type="button" style={tabSty(tabAtiva === "os")}      onClick={() => setTabAtiva("os")}>Histórico de OS ({os.length})</button>
        </div>

        {/* ── Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {carregando && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280", padding: 20, justifyContent: "center" }}>
              <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Carregando dados do cliente...
            </div>
          )}

          {!carregando && !d && (
            <div style={{ color: "#c0392b", padding: 20, textAlign: "center" }}>Erro ao carregar dados do cliente #{clinumer}.</div>
          )}

          {!carregando && d && tabAtiva === "geral" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Identificação */}
              <div>
                {secTit("Identificação")}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  {campo("CPF / CNPJ", d.CPF_CNPJ, { mono: true, w: "160px" })}
                  {campo("Identidade (RG / IE)", d.RG, { mono: true, w: "150px" })}
                  {campo("Órgão Expedidor", d.RG_ORGAO, { w: "110px" })}
                  {campo("UF RG", d.RG_UF, { w: "50px" })}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {campo("Data de Nascimento", d.DT_NASC ? d.DT_NASC.split("-").reverse().join("/") : "", { w: "140px" })}
                  {campo("Sexo", d.SEXO ? SEXO_LABEL[d.SEXO] : "", { w: "120px" })}
                  {campo("Estado Civil", d.CIVIL ? CIVIL_LABEL[d.CIVIL] : "", { w: "130px" })}
                </div>
              </div>

              {/* Filiação */}
              <div>
                {secTit("Filiação")}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  {campo("Nome do Pai", d.NOME_PAI)}
                  {campo("Nome da Mãe", d.NOME_MAE)}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {campo("Cônjuge", d.CONJUGE)}
                  {campo("Profissão", d.PROFISSAO)}
                </div>
              </div>

              {/* Complementar */}
              {d.OBSERVACAO && (
                <div>
                  {secTit("Observações")}
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 12px", fontSize: "0.78rem", color: "#374151", lineHeight: 1.5 }}>
                    {d.OBSERVACAO}
                  </div>
                </div>
              )}
            </div>
          )}

          {!carregando && d && tabAtiva === "endereco" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {secTit("Endereço Cadastrado")}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                {campo("CEP", d.CEP, { mono: true, w: "100px" })}
                {campo("Logradouro", d.LOGRADOURO)}
                {campo("Número", d.NUMERO, { w: "70px" })}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                {campo("Bairro", d.BAIRRO)}
                {campo("Complemento", d.COMPLEMENTO)}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                {campo("Município", d.MUNICIPIO)}
                {campo("UF", d.UF, { w: "50px" })}
              </div>
              {d.EMAIL && (
                <div style={{ display: "flex", gap: 12 }}>
                  {campo("E-mail", d.EMAIL)}
                </div>
              )}
            </div>
          )}

          {!carregando && tabAtiva === "os" && (
            <div>
              {secTit(`Últimas OS (${os.length})`)}
              {os.length === 0
                ? <div style={{ color: "#9ca3af", textAlign: "center", padding: 20, fontSize: "0.78rem" }}>Nenhuma OS encontrada para este cliente.</div>
                : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                    <thead>
                      <tr style={{ background: "#1a5c34", color: "#fff" }}>
                        {["OS", "Data", "Serviço", "Placa", "Honorários", "Recebido", "Saldo"].map(h => (
                          <th key={h} style={{ padding: "6px 8px", textAlign: h === "OS" || h === "Placa" ? "center" : h === "Data" ? "left" : "right", fontWeight: 700, fontSize: "0.65rem", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {os.map((row, i) => {
                        const hon  = Number(row.HONORARIOS ?? 0);
                        const rec  = Number(row.RECEBIDO   ?? 0);
                        const sal  = Number(row.SALDO      ?? 0);
                        const data = String(row.DATA ?? "").slice(0, 10).split("-").reverse().join("/");
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700, color: "#1a5c34", fontFamily: "monospace" }}>{String(row.ORDNUMER ?? "")}</td>
                            <td style={{ padding: "4px 8px" }}>{data}</td>
                            <td style={{ padding: "4px 8px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(row.SERVICO ?? "—")}</td>
                            <td style={{ padding: "4px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>{String(row.PLACA ?? "—")}</td>
                            <td style={{ padding: "4px 8px", textAlign: "right" }}>{moedaDet.format(hon)}</td>
                            <td style={{ padding: "4px 8px", textAlign: "right", color: rec > 0 ? "#1a5c34" : "#9ca3af" }}>{moedaDet.format(rec)}</td>
                            <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: sal > 0 ? "#c0392b" : "#1a5c34" }}>{moedaDet.format(sal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                        <td colSpan={4} style={{ padding: "5px 8px", fontSize: "0.65rem", color: "#6b7280", fontWeight: 600 }}>TOTAL ({os.length} OS)</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, color: "#1a5c34" }}>{moedaDet.format(d?.TOTAL_HON ?? 0)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, color: "#1a5c34" }}>{moedaDet.format(d?.TOTAL_REC ?? 0)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, color: saldo > 0 ? "#c0392b" : "#1a5c34" }}>{moedaDet.format(saldo)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )
              }
            </div>
          )}
        </div>

        {/* ── Footer */}
        <div style={{ flexShrink: 0, padding: "10px 18px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onFechar}
            style={{ padding: "7px 20px", borderRadius: 7, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Criar Cliente Modal ──────────────────────────────────────────────────────

type MunOption = { MUNNUMER: number; MUNDESCR: string; ESTSIGLA: string };

const CIVIL_OPTS = [
  { v: 1, l: "Solteiro(a)" }, { v: 2, l: "Casado(a)" },
  { v: 3, l: "Viúvo(a)" },    { v: 4, l: "Divorciado(a)" }, { v: 5, l: "Outros" },
];
const SEXO_OPTS = [
  { v: 1, l: "Masculino" }, { v: 2, l: "Feminino" }, { v: 3, l: "Não informado" },
];

function CriarClienteForm({ config, onFechar, onCriado }: {
  config: SgdwConfig;
  onFechar: () => void;
  onCriado: (clinumer: number, nome: string) => void;
}) {
  // ── Tabs
  const [tabPrincipal, setTabPrincipal] = useState<"cadastro" | "documentos">("cadastro");
  const [tabSec, setTabSec]             = useState("end_corr");

  // ── Dados pessoais → TBCLIEN (colunas confirmadas)
  const [nome, setNome]             = useState("");
  const [cpf, setCpf]               = useState("");
  const [rg, setRg]                 = useState("");
  const [rgOrgao, setRgOrgao]       = useState("");
  const [rgUf, setRgUf]             = useState("");
  const [dtNasc, setDtNasc]         = useState("");
  const [sexo, setSexo]             = useState<number>(0);
  const [civil, setCivil]           = useState<number>(0);
  const [nomePai, setNomePai]       = useState("");
  const [nomeMae, setNomeMae]       = useState("");
  const [conjuge, setConjuge]       = useState("");
  const [profissao, setProfissao]   = useState("");
  const [observacao, setObservacao] = useState("");

  // ── Campos visuais — coluna TBCLIEN não confirmada, não gravados
  const [naturalidade, setNaturalidade]   = useState("");
  const [ufNatur, setUfNatur]             = useState("");
  const [nacao, setNacao]                 = useState("");
  const [escolaridade, setEscolaridade]   = useState("");
  const [antt, setAntt]                   = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [cndInss, setCndInss]             = useState("");
  const [validadeCnd, setValidadeCnd]     = useState("");
  // Telefones — TBFONES colunas não confirmadas, não gravados
  const [foneResDdd, setFoneResDdd] = useState("");
  const [foneResNum, setFoneResNum] = useState("");
  const [contato, setContato]       = useState("");
  const [celDdd, setCelDdd]         = useState("");
  const [celNum, setCelNum]         = useState("");

  // ── Endereço → TBENDER
  const [cep, setCep]                 = useState("");
  const [logradouro, setLogradouro]   = useState("");
  const [numero, setNumero]           = useState("");
  const [bairro, setBairro]           = useState("");
  const [complemento, setComplemento] = useState("");
  const [email, setEmail]             = useState("");
  const [munBusca, setMunBusca]       = useState("");
  const [munOpts, setMunOpts]         = useState<MunOption[]>([]);
  const [munSel, setMunSel]           = useState<MunOption | null>(null);
  const [buscandoMun, setBuscandoMun] = useState(false);
  // ── Meta
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState<string | null>(null);
  const munTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onMunInput(val: string) {
    setMunBusca(val); setMunSel(null);
    if (munTimer.current) clearTimeout(munTimer.current);
    if (val.length < 2) { setMunOpts([]); return; }
    munTimer.current = setTimeout(async () => {
      setBuscandoMun(true);
      try { setMunOpts(await buscarMunicipiosSgdw(config, val)); }
      catch { /* silent */ } finally { setBuscandoMun(false); }
    }, 320);
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    const nomeTrim = nome.trim();
    if (!nomeTrim) { setErro("Nome é obrigatório."); return; }
    setSalvando(true); setErro(null);
    try {
      const clinumer = await criarClienteSgdw(config, {
        nome: nomeTrim,
        cpf_cnpj:      cpf.trim() || undefined,
        rg:            rg.trim() || undefined,
        rg_orgao:      rgOrgao.trim() || undefined,
        rg_uf:         rgUf.trim() || undefined,
        dt_nascimento: dtNasc || undefined,
        sexo:          sexo || undefined,
        civil:         civil || undefined,
        nome_pai:      nomePai.trim() || undefined,
        nome_mae:      nomeMae.trim() || undefined,
        conjuge:       conjuge.trim() || undefined,
        profissao:     profissao.trim() || undefined,
        observacao:    observacao.trim() || undefined,
        email:         email.trim() || undefined,
        logradouro:    logradouro.trim() || undefined,
        numero:        numero.trim() || undefined,
        bairro:        bairro.trim() || undefined,
        cep:           cep.trim() || undefined,
        complemento:   complemento.trim() || undefined,
        munnumer:      munSel?.MUNNUMER,
      });
      onCriado(clinumer, nomeTrim.toUpperCase());
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar cliente.");
    } finally { setSalvando(false); }
  }

  // ── Styles (compacto, igual ao SGDW desktop)
  const inp: React.CSSProperties = {
    padding: "3px 5px", borderRadius: 2, boxSizing: "border-box",
    border: "1px solid #a0b4a8", fontSize: "0.72rem", background: "#fff",
    color: "#111", outline: "none", width: "100%",
  };
  const lbl = (w?: string): React.CSSProperties => ({
    fontSize: "0.62rem", color: "#374151", whiteSpace: "nowrap",
    flexShrink: 0, ...(w ? { width: w } : {}),
  });
  const row: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5, marginBottom: 4,
  };
  const grp = (title: string): React.CSSProperties => ({
    fontSize: "0.6rem", fontWeight: 700, color: "#1a5c34",
    marginBottom: 5, marginTop: 8, borderBottom: "1px solid #c0d8c0", paddingBottom: 2,
  });
  const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "#1a5c34"; };
  const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "#a0b4a8"; };
  const mainTabSty = (a: boolean): React.CSSProperties => ({
    padding: "5px 14px", border: "none", cursor: "pointer", fontSize: "0.72rem",
    background: a ? "#fff" : "#ddeedd", color: a ? "#1a5c34" : "#555",
    fontWeight: a ? 700 : 400, borderBottom: a ? "2px solid #1a5c34" : "2px solid transparent",
    fontFamily: "inherit",
  });
  const secTabSty = (a: boolean): React.CSSProperties => ({
    padding: "4px 10px", border: "none", cursor: "pointer", fontSize: "0.62rem",
    background: "transparent", color: a ? "#1a5c34" : "#6b7280",
    fontWeight: a ? 700 : 400, borderBottom: a ? "2px solid #1a5c34" : "2px solid transparent",
    fontFamily: "inherit", whiteSpace: "nowrap",
  });
  const chkLbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 3, fontSize: "0.62rem", cursor: "not-allowed", opacity: 0.55 };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onFechar(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>

      <div style={{ background: "#f0f4f0", borderRadius: 4, width: "100%", maxWidth: 740, maxHeight: "96vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", fontFamily: "system-ui,Arial,sans-serif", overflow: "hidden" }}>

        {/* Barra título */}
        <div style={{ background: "linear-gradient(135deg,#1a3a2a,#1a5c34)", padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔷</span>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#fff" }}>Cadastro do Cliente — Novo</span>
          </div>
          <button type="button" onClick={onFechar} style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "#fff", borderRadius: 3, padding: "2px 8px", cursor: "pointer", fontSize: "0.9rem" }}>✕</button>
        </div>

        {/* Tabs principais */}
        <div style={{ display: "flex", background: "#ddeedd", borderBottom: "1px solid #b0c8b0", flexShrink: 0 }}>
          <button type="button" style={mainTabSty(tabPrincipal === "cadastro")} onClick={() => setTabPrincipal("cadastro")}>Cadastro</button>
          <button type="button" style={mainTabSty(tabPrincipal === "documentos")} onClick={() => setTabPrincipal("documentos")}>Documentos *</button>
        </div>

        {/* Corpo scrollável */}
        <form onSubmit={handleSalvar} style={{ flex: 1, overflowY: "auto", padding: "8px 12px 0" }}>

          {erro && <div style={{ background: "#fdf3f2", border: "1px solid #f0c0bc", borderRadius: 3, padding: "5px 10px", marginBottom: 6, fontSize: "0.72rem", color: "#c0392b" }}>{erro}</div>}

          {tabPrincipal === "cadastro" && (<>

            {/* ── Linha: Nome + CPF + busca */}
            <div style={row}>
              <span style={lbl("40px")}>Nome:</span>
              <input value={nome} onChange={e => setNome(e.target.value)} style={{ ...inp, flex: 2 }}
                placeholder="Nome completo" required onFocus={fo} onBlur={bl} />
              <input value={cpf} onChange={e => setCpf(e.target.value)} style={{ ...inp, width: 130, flex: "none" }}
                placeholder="CPF / CNPJ" onFocus={fo} onBlur={bl} />
              <button type="button" style={{ padding: "2px 6px", fontSize: "0.65rem", border: "1px solid #a0b4a8", borderRadius: 2, background: "#e8f0e8", cursor: "pointer" }}>🔍</button>
            </div>

            {/* ── Linha: Identidade + Data Exp + Órgão + UF */}
            <div style={row}>
              <span style={lbl("58px")}>Identidade:</span>
              <input value={rg} onChange={e => setRg(e.target.value)} style={{ ...inp, width: 130, flex: "none" }}
                placeholder="RG / IE" onFocus={fo} onBlur={bl} />
              <span style={lbl("62px")}>Data Exp.:</span>
              <input type="date" style={{ ...inp, width: 110, flex: "none" }} onFocus={fo} onBlur={bl} />
              <span style={lbl("90px")}>Órgão Expedidor:</span>
              <input value={rgOrgao} onChange={e => setRgOrgao(e.target.value)} style={{ ...inp, flex: 1 }}
                onFocus={fo} onBlur={bl} />
              <span style={lbl("22px")}>UF:</span>
              <input value={rgUf} onChange={e => setRgUf(e.target.value.toUpperCase().slice(0,2))} style={{ ...inp, width: 30, flex: "none" }} maxLength={2} onFocus={fo} onBlur={bl} />
            </div>

            {/* ══ Informações Gerais ══ */}
            <div style={{ border: "1px solid #b8d0b8", borderRadius: 3, padding: "6px 8px", marginBottom: 6 }}>
              <div style={grp("Informações Gerais")}>Informações Gerais</div>

              {/* Data Nasc + Estado Civil + Nationalidade */}
              <div style={row}>
                <span style={lbl("90px")}>Data Nascimento:</span>
                <input type="date" value={dtNasc} onChange={e => setDtNasc(e.target.value)} style={{ ...inp, width: 110, flex: "none" }} onFocus={fo} onBlur={bl} />
                <span style={lbl("70px")}>Estado Civil:</span>
                <select value={civil} onChange={e => setCivil(Number(e.target.value))} style={{ ...inp, width: 120, flex: "none" }} onFocus={fo} onBlur={bl}>
                  <option value={0}></option>
                  {CIVIL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <span style={lbl("80px")}>Nacionalidade:</span>
                <select value={nacao} onChange={e => setNacao(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl}>
                  <option value=""></option>
                  <option>Brasileira</option>
                  <option>Estrangeira</option>
                  <option>Naturalizada</option>
                </select>
              </div>

              {/* Naturalidade + UF + Sexo + checkboxes */}
              <div style={row}>
                <span style={lbl("68px")}>Naturalidade:</span>
                <input value={naturalidade} onChange={e => setNaturalidade(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <span style={lbl("22px")}>UF:</span>
                <input value={ufNatur} onChange={e => setUfNatur(e.target.value.toUpperCase().slice(0,2))} style={{ ...inp, width: 30, flex: "none" }} maxLength={2} onFocus={fo} onBlur={bl} />
                <span style={lbl("34px")}>Sexo:</span>
                <select value={sexo} onChange={e => setSexo(Number(e.target.value))} style={{ ...inp, width: 100, flex: "none" }} onFocus={fo} onBlur={bl}>
                  <option value={0}></option>
                  {SEXO_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <label style={chkLbl}><input type="checkbox" disabled /> Origem</label>
                <label style={chkLbl}><input type="checkbox" disabled /> Simples Nacional</label>
              </div>

              {/* Nome do Pai + checkbox */}
              <div style={row}>
                <span style={lbl("68px")}>Nome do Pai:</span>
                <input value={nomePai} onChange={e => setNomePai(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <label style={chkLbl}><input type="checkbox" disabled /> Recibo OS nome do cliente</label>
              </div>

              {/* Nome da Mãe */}
              <div style={row}>
                <span style={lbl("68px")}>Nome da Mãe:</span>
                <input value={nomeMae} onChange={e => setNomeMae(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
              </div>

              {/* Cônjuge */}
              <div style={row}>
                <span style={lbl("68px")}>Cônjuge:</span>
                <input value={conjuge} onChange={e => setConjuge(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
              </div>

              {/* Conta contábil (visual) */}
              <div style={{ ...row, marginBottom: 0 }}>
                <span style={lbl("80px")}>Conta contábil:</span>
                <select disabled style={{ ...inp, width: 80, flex: "none", opacity: 0.45 }}><option></option></select>
                <button type="button" disabled style={{ padding: "2px 6px", fontSize: "0.6rem", border: "1px solid #ccc", borderRadius: 2, background: "#f0f0f0", cursor: "not-allowed", opacity: 0.45 }}>🔍</button>
              </div>
            </div>

            {/* ══ Informações do Endereço ══ */}
            <div style={{ border: "1px solid #b8d0b8", borderRadius: 3, padding: "6px 8px", marginBottom: 6 }}>
              <div style={grp("Informações do Endereço")}>Informações do Endereço</div>

              {/* CEP + Endereço + busca */}
              <div style={row}>
                <span style={lbl("28px")}>CEP:</span>
                <input value={cep} onChange={e => setCep(e.target.value)} style={{ ...inp, width: 80, flex: "none" }} placeholder="00000-000" maxLength={9} onFocus={fo} onBlur={bl} />
                <span style={lbl("54px")}>Endereço:</span>
                <input value={logradouro} onChange={e => setLogradouro(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Rua, Av., Trav..." onFocus={fo} onBlur={bl} />
                <button type="button" style={{ padding: "2px 6px", fontSize: "0.65rem", border: "1px solid #a0b4a8", borderRadius: 2, background: "#e8f0e8", cursor: "pointer" }}>🔍</button>
              </div>

              {/* Número + Bairro + Complemento */}
              <div style={row}>
                <span style={lbl("46px")}>Número:</span>
                <input value={numero} onChange={e => setNumero(e.target.value)} style={{ ...inp, width: 50, flex: "none" }} placeholder="S/N" onFocus={fo} onBlur={bl} />
                <span style={lbl("36px")}>Bairro:</span>
                <input value={bairro} onChange={e => setBairro(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <span style={lbl("72px")}>Complemento:</span>
                <input value={complemento} onChange={e => setComplemento(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
              </div>

              {/* Município + UF */}
              <div style={{ ...row, position: "relative" }}>
                <span style={lbl("60px")}>Município:</span>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    value={munSel ? munSel.MUNDESCR : munBusca}
                    onChange={e => { if (!munSel) onMunInput(e.target.value); }}
                    onFocus={e => { if (munSel) { setMunSel(null); setMunBusca(""); setMunOpts([]); } fo(e); }}
                    onBlur={bl}
                    style={{ ...inp, background: munSel ? "#f0fdf4" : "#fff" }}
                    placeholder="Buscar cidade..." autoComplete="off"
                  />
                  {buscandoMun && <span style={{ position: "absolute", right: 4, top: 4, fontSize: "0.55rem", color: "#9ca3af" }}>...</span>}
                  {munOpts.length > 0 && !munSel && (
                    <div style={{ position: "absolute", top: "calc(100% + 1px)", left: 0, right: 0, background: "#fff", border: "1px solid #a0b4a8", borderRadius: 3, zIndex: 400, maxHeight: 140, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                      {munOpts.map(m => (
                        <div key={m.MUNNUMER} onClick={() => { setMunSel(m); setMunBusca(""); setMunOpts([]); }}
                          style={{ padding: "4px 8px", cursor: "pointer", fontSize: "0.7rem", borderBottom: "1px solid #eee" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                          <b>{m.MUNDESCR}</b> <span style={{ color: "#9ca3af" }}>— {m.ESTSIGLA}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={lbl("22px")}>UF:</span>
                <input value={munSel?.ESTSIGLA ?? ""} readOnly style={{ ...inp, width: 32, flex: "none", background: "#f5f5f5" }} />
              </div>

              {/* Fone Res. + Contato + Celular */}
              <div style={{ ...row, marginBottom: 0 }}>
                <span style={lbl("56px")}>Fone Res.:</span>
                <input readOnly value="55" style={{ ...inp, width: 28, flex: "none", background: "#f0f0f0", textAlign: "center", color: "#555" }} />
                <input value={foneResDdd} onChange={e => setFoneResDdd(e.target.value)} style={{ ...inp, width: 30, flex: "none" }} maxLength={2} placeholder="DDD" onFocus={fo} onBlur={bl} />
                <input value={foneResNum} onChange={e => setFoneResNum(e.target.value)} style={{ ...inp, width: 88, flex: "none" }} placeholder="Número" onFocus={fo} onBlur={bl} />
                <span style={lbl("48px")}>Contato:</span>
                <input value={contato} onChange={e => setContato(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <span style={lbl("40px")}>Celular:</span>
                <input readOnly value="55" style={{ ...inp, width: 28, flex: "none", background: "#f0f0f0", textAlign: "center", color: "#555" }} />
                <input value={celDdd} onChange={e => setCelDdd(e.target.value)} style={{ ...inp, width: 30, flex: "none" }} maxLength={2} placeholder="DDD" onFocus={fo} onBlur={bl} />
                <input value={celNum} onChange={e => setCelNum(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Número" onFocus={fo} onBlur={bl} />
              </div>
            </div>

            {/* ══ Informações Complementares ══ */}
            <div style={{ border: "1px solid #b8d0b8", borderRadius: 3, padding: "6px 8px", marginBottom: 6 }}>
              <div style={grp("Informações Complementares")}>Informações Complementares</div>

              {/* Profissão + Escolaridade */}
              <div style={row}>
                <span style={lbl("56px")}>Profissão:</span>
                <input value={profissao} onChange={e => setProfissao(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <span style={lbl("70px")}>Escolaridade:</span>
                <select value={escolaridade} onChange={e => setEscolaridade(e.target.value)} style={{ ...inp, width: 130, flex: "none" }} onFocus={fo} onBlur={bl}>
                  <option value=""></option>
                  <option>Fundamental</option><option>Médio</option>
                  <option>Superior</option><option>Pós-graduação</option>
                </select>
              </div>

              {/* ANTT + Email */}
              <div style={row}>
                <span style={lbl("32px")}>ANTT:</span>
                <input value={antt} onChange={e => setAntt(e.target.value)} style={{ ...inp, width: 120, flex: "none" }} onFocus={fo} onBlur={bl} />
                <span style={lbl("36px")}>Email:</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#6b7280", marginLeft: 2 }}>F6</span>
              </div>

              {/* Observação + Classificação */}
              <div style={row}>
                <span style={lbl("68px")}>Observação:</span>
                <input value={observacao} onChange={e => setObservacao(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <span style={lbl("76px")}>Classificação:</span>
                <select value={classificacao} onChange={e => setClassificacao(e.target.value)} style={{ ...inp, width: 120, flex: "none" }} onFocus={fo} onBlur={bl}>
                  <option value=""></option><option>A</option><option>B</option><option>C</option>
                </select>
              </div>

              {/* Nº CND INSS + Validade */}
              <div style={{ ...row, marginBottom: 0 }}>
                <span style={lbl("78px")}>Nº CND INSS:</span>
                <input value={cndInss} onChange={e => setCndInss(e.target.value)} style={{ ...inp, flex: 1 }} onFocus={fo} onBlur={bl} />
                <span style={lbl("50px")}>Validade:</span>
                <input type="date" value={validadeCnd} onChange={e => setValidadeCnd(e.target.value)} style={{ ...inp, width: 110, flex: "none" }} onFocus={fo} onBlur={bl} />
              </div>
            </div>

          </>)}

          {tabPrincipal === "documentos" && (
            <div style={{ padding: 20, color: "#9ca3af", fontSize: "0.72rem", textAlign: "center" }}>
              Aba Documentos — disponível após criação do cliente no SGDW.
            </div>
          )}

        </form>

        {/* ── Abas secundárias */}
        <div style={{ background: "#e8f0e9", borderTop: "1px solid #c0d8c0", borderBottom: "1px solid #c0d8c0", display: "flex", overflowX: "auto", flexShrink: 0 }}>
          {([
            ["end_corr","Endereço correspondência"],
            ["dados_emp","Dados da Empresa"],
            ["dados_cnh","Dados da CNH"],
            ["integ","Integração Site"],
            ["nf","Nota Fiscal"],
            ["obs","Observações"],
            ["hist","Histórico"],
          ] as [string,string][]).map(([id, label]) => (
            <button key={id} type="button" style={secTabSty(tabSec === id)} onClick={() => setTabSec(id)}>{label}</button>
          ))}
        </div>

        {/* Conteúdo aba secundária — "Endereço correspondência" espelha o SGDW */}
        <div style={{ padding: "6px 12px 8px", background: "#f5f8f5", flexShrink: 0, fontSize: "0.68rem", minHeight: 50 }}>
          {tabSec === "end_corr" ? (
            <div>
              <div style={{ fontWeight: 700, color: "#4a5568", marginBottom: 4 }}>Dados do Endereço:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                <span style={lbl("60px")}>Município:</span>
                <input readOnly style={{ ...inp, width: 160 }} />
                <span style={lbl("22px")}>UF:</span>
                <input readOnly style={{ ...inp, width: 30 }} />
                <span style={lbl("28px")}>CEP:</span>
                <input readOnly style={{ ...inp, width: 72 }} />
                <span style={lbl("54px")}>Endereço:</span>
                <input readOnly style={{ ...inp, flex: 1, minWidth: 80 }} />
                <span style={lbl("46px")}>Número:</span>
                <input readOnly style={{ ...inp, width: 40 }} />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={lbl("36px")}>Bairro:</span>
                <input readOnly style={{ ...inp, width: 120 }} />
                <span style={lbl("72px")}>Complemento:</span>
                <input readOnly style={{ ...inp, flex: 1 }} />
              </div>
              <div style={{ marginTop: 4, color: "#16a34a", fontStyle: "italic" }}>* &lt;F3&gt; Repetir endereço</div>
            </div>
          ) : (
            <div style={{ color: "#9ca3af", textAlign: "center", lineHeight: "32px" }}>Disponível após criação do cliente.</div>
          )}
        </div>

        {/* ── Footer */}
        <div style={{ flexShrink: 0, padding: "7px 12px", background: "#e8f0e9", borderTop: "1px solid #b0c8b0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {["Enviar carta","Enviar SMS","Enviar e-mail"].map(l => (
              <label key={l} style={chkLbl}><input type="checkbox" disabled /> {l}</label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Imprimir","Visualizar","Homônimo"].map(b => (
              <button key={b} type="button" title="Disponível no SGDW desktop"
                style={{ padding: "4px 9px", borderRadius: 2, border: "1px solid #b0c8b0", background: "#f0f4f0", fontSize: "0.65rem", cursor: "not-allowed", opacity: 0.6 }}>
                {b}
              </button>
            ))}
            <button type="button" onClick={onFechar}
              style={{ padding: "4px 10px", borderRadius: 2, border: "1px solid #b0c8b0", background: "#f0f4f0", fontSize: "0.72rem", cursor: "pointer" }}>
              Cancelar
            </button>
            <button type="button" onClick={onFechar}
              style={{ padding: "4px 10px", borderRadius: 2, border: "1px solid #b0c8b0", background: "#f0f4f0", fontSize: "0.72rem", cursor: "pointer" }}>
              Sair
            </button>
            <button type="submit" disabled={salvando || !nome.trim()}
              style={{ padding: "4px 16px", borderRadius: 2, border: "none", background: "#1a5c34", color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: salvando || !nome.trim() ? "not-allowed" : "pointer", opacity: !nome.trim() ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}>
              {salvando ? <><RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> Gravando...</> : "✔ Gravar"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Explorer ────────────────────────────────────────────────────────────

export default function DashExplorer({ config }: { config: SgdwConfig }) {
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

  // Nova OS modal
  const [novaOsAberta, setNovaOsAberta] = useState(false);

  // Novo Cliente form
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);

  // Cliente detalhe modal
  const [clienteDetalhe, setClienteDetalhe] = useState<number | null>(null);

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
        case "clientes":     r = await buscarClientesSgdw(config, busca); break;
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
    setNovoClienteAberto(false);
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
  const cols = (aba !== "schema" && aba !== "empresas" && aba !== "veiculos" && aba !== "atpv") ? COLS[aba as Exclude<SgdwExplorerAba, "schema" | "empresas" | "veiculos" | "atpv">] : [];

  // OS KPI cards
  const osKpiCards = osKpi ? [
    { label: "Ordens Abertas",  valor: osKpi.totalOs.toLocaleString("pt-BR") },
    { label: "Total Honorarios",valor: moeda.format(osKpi.totalHonorarios) },
    { label: "Total Recebido",  valor: moeda.format(osKpi.totalRecebido), cor: "#1a5c34" },
    { label: "A Receber",       valor: moeda.format(osKpi.totalSaldo),    cor: osKpi.totalSaldo > 0 ? "#c0392b" : "#1a5c34" },
  ] : [];

  // helpers para identificar qual card de caixa está ativo
  const caixaCardAtivo = !caixaFiltros.grupo ? null
    : caixaFiltros.grupo === "1" && caixaFiltros.apenasAberto  ? "receber"
    : caixaFiltros.grupo === "1" && caixaFiltros.apenasQuitado ? "recebido"
    : caixaFiltros.grupo === "2" && caixaFiltros.apenasAberto  ? "pagar"
    : caixaFiltros.grupo === "2" && caixaFiltros.apenasQuitado ? "pago"
    : null;

  function setCaixaCardFiltro(key: "receber" | "recebido" | "pagar" | "pago") {
    const same = caixaCardAtivo === key;
    const base: CaixaFiltros = { dataIni: caixaFiltros.dataIni, dataFim: caixaFiltros.dataFim };
    if (same) { setCaixaFiltros(base); }
    else if (key === "receber")  { setCaixaFiltros({ ...base, grupo: "1", apenasAberto: true }); }
    else if (key === "recebido") { setCaixaFiltros({ ...base, grupo: "1", apenasQuitado: true }); }
    else if (key === "pagar")    { setCaixaFiltros({ ...base, grupo: "2", apenasAberto: true }); }
    else if (key === "pago")     { setCaixaFiltros({ ...base, grupo: "2", apenasQuitado: true }); }
    setPagina(0);
  }

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
            {aba === "caixa" && caixaKpi && (
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                {([
                  { key: "receber",  label: "A Receber",  valor: moeda.format(caixaKpi.totalReceber),  cor: "#c0392b", bg: "#fef2f2", borda: "#fecaca" },
                  { key: "recebido", label: "Recebido",   valor: moeda.format(caixaKpi.totalRecebido), cor: "#16a34a", bg: "#f0fdf4", borda: "#bbf7d0" },
                  { key: "pagar",    label: "A Pagar",    valor: moeda.format(caixaKpi.totalPagar),    cor: "#d97706", bg: "#fffbeb", borda: "#fde68a" },
                  { key: "pago",     label: "Pago",       valor: moeda.format(caixaKpi.totalPago),     cor: "#6b7280", bg: "#f9fafb", borda: "#e5e7eb" },
                ] as const).map(c => {
                  const ativo = caixaCardAtivo === c.key;
                  return (
                    <div key={c.key} onClick={() => setCaixaCardFiltro(c.key)}
                      style={{
                        flex: "1 1 140px", borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                        background: ativo ? c.cor : c.bg,
                        border: `2px solid ${ativo ? c.cor : c.borda}`,
                        boxShadow: ativo ? `0 4px 14px ${c.cor}44` : "none",
                        transition: "all 0.15s",
                        userSelect: "none",
                      }}>
                      <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: ativo ? "rgba(255,255,255,0.8)" : c.cor, marginBottom: 4 }}>
                        {c.label} {ativo ? "✕" : ""}
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: ativo ? "#fff" : c.cor }}>
                        {c.valor}
                      </div>
                      <div style={{ fontSize: "0.5rem", color: ativo ? "rgba(255,255,255,0.65)" : "#9ca3af", marginTop: 3 }}>
                        {ativo ? "clique para limpar filtro" : "clique para filtrar"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
                {aba === "os" && (
                  <button type="button" onClick={() => setNovaOsAberta(true)}
                    style={{ padding: "5px 13px", borderRadius: 7, background: "#1a5c34", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: "0.73rem", fontWeight: 700, boxShadow: "0 2px 6px rgba(26,92,52,0.3)" }}>
                    ✚ Nova OS
                  </button>
                )}
                {aba === "clientes" && (
                  <button type="button" onClick={() => setNovoClienteAberto(v => !v)}
                    style={{ padding: "5px 13px", borderRadius: 7, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: "0.73rem", fontWeight: 700, background: novoClienteAberto ? "#f0fdf4" : "#1a5c34", color: novoClienteAberto ? "#1a5c34" : "#fff", boxShadow: novoClienteAberto ? "none" : "0 2px 6px rgba(26,92,52,0.3)", transition: "all 0.15s" }}>
                    {novoClienteAberto ? "✕ Cancelar" : "✚ Novo Cliente"}
                  </button>
                )}
                <button type="button" onClick={fetchDados} disabled={carregando}
                  style={{ padding: "5px 11px", borderRadius: 7, background: "#f0f5f2", border: "1px solid #d0ddd6", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", opacity: carregando ? 0.6 : 1 }}>
                  <RefreshCw size={11} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }} /> Atualizar
                </button>
              </div>
            </div>

            {/* Novo Cliente Form */}
            {aba === "clientes" && novoClienteAberto && (
              <CriarClienteForm
                config={config}
                onFechar={() => setNovoClienteAberto(false)}
                onCriado={(clinumer, nome) => {
                  setNovoClienteAberto(false);
                  fetchDados();
                  showNotif("ok", `Cliente #${clinumer} — ${nome} — criado com sucesso!`);
                }}
              />
            )}

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
                rowStyle={aba === "os" ? (row) => {
                  if (Number(row.CANCELADO) === 1)
                    return { opacity: 0.72, background: "#fff5f5" };
                  if (Number(row.SALDO) <= 0)
                    return { background: "#f0fff4" };
                  return {};
                } : undefined}
                renderAcoes={
                  aba === "os" ? (row) => {
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
                  } :
                  aba === "clientes" ? (row) => (
                    <button type="button" onClick={() => setClienteDetalhe(Number(row.CLINUMER ?? 0))}
                      title="Ver detalhes do cadastro no portal"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28, borderRadius: 7, border: "1px solid #d0ddd6",
                        background: "#f0f8f2", cursor: "pointer", color: "#1a5c34",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1a5c34"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f0f8f2"; (e.currentTarget as HTMLButtonElement).style.color = "#1a5c34"; }}>
                      <Eye size={13} />
                    </button>
                  ) :
                  undefined
                }
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

      {/* Nova OS modal */}
      {novaOsAberta && (
        <NovaOsModal
          config={config}
          onFechar={() => setNovaOsAberta(false)}
          onCriada={() => { setNovaOsAberta(false); fetchDados(); showNotif("ok", "OS criada com sucesso!"); }}
        />
      )}

      {/* Cliente detalhe modal */}
      {clienteDetalhe !== null && clienteDetalhe > 0 && (
        <ClienteDetalheModal
          clinumer={clienteDetalhe}
          config={config}
          onFechar={() => setClienteDetalhe(null)}
        />
      )}
    </div>
  );
}
