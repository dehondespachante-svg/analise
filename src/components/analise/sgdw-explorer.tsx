"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import {
  buscarCaixaSgdw,
  buscarClientesSgdw,
  buscarDadosTabelaSgdw,
  buscarEsquemaTiposSgdw,
  buscarFuncionariosSgdw,
  buscarOsSgdw,
  buscarServicosSgdw,
  buscarVeiculosSgdw,
  listarTabelasSgdw,
  SGDW_POR_PAGINA,
} from "@/src/features/sgdw/client";
import type { SgdwConfig, SgdwExplorerAba, SgdwPaginaDados } from "@/src/features/sgdw/types";

// ─── Column definitions ───────────────────────────────────────────────────────

type ColDef = {
  key: string;
  label: string;
  format?: "moeda" | "data" | "bool" | "lancto" | "grupo";
  align?: "right" | "center";
  w?: number;
};

const COLS: Record<Exclude<SgdwExplorerAba, "schema">, ColDef[]> = {
  os: [
    { key: "ORDNUMER",   label: "Nro",         w: 72 },
    { key: "DATA",       label: "Data",         format: "data",   w: 90 },
    { key: "SERVICO",    label: "Servico" },
    { key: "HONORARIOS", label: "Honorarios",  format: "moeda",  align: "right", w: 110 },
    { key: "RECEBIDO",   label: "Recebido",    format: "moeda",  align: "right", w: 110 },
    { key: "CANCELADO",  label: "Canc",        format: "bool",   w: 50 },
  ],
  clientes: [
    { key: "CLINUMER", label: "Codigo",  w: 72 },
    { key: "NOME",     label: "Nome" },
  ],
  veiculos: [
    { key: "VEINUMER", label: "Nro",      w: 72 },
    { key: "PLACA",    label: "Placa",    w: 100 },
    { key: "RENAVAM",  label: "RENAVAM" },
  ],
  servicos: [
    { key: "SERNUMER",  label: "Codigo",    w: 72 },
    { key: "DESCRICAO", label: "Descricao" },
  ],
  caixa: [
    { key: "CAIXA",      label: "Nro",    w: 72 },
    { key: "DTLANCTO",   label: "Data",   format: "data",   w: 90 },
    { key: "TPLANCTO",   label: "D/C",    format: "lancto", w: 45 },
    { key: "GRUPOCONTA", label: "Grupo",  format: "grupo",  w: 75 },
    { key: "VALOR",      label: "Valor",  format: "moeda",  align: "right", w: 110 },
    { key: "CONTA",      label: "Conta" },
    { key: "ORIGEM",     label: "Origem" },
  ],
  funcionarios: [
    { key: "USUNUMER", label: "Codigo", w: 72 },
    { key: "NOME",     label: "Nome" },
  ],
};

const ABAS: Array<{ id: SgdwExplorerAba; label: string }> = [
  { id: "os",           label: "Ordens de Servico" },
  { id: "clientes",     label: "Clientes" },
  { id: "veiculos",     label: "Veiculos" },
  { id: "servicos",     label: "Servicos" },
  { id: "caixa",        label: "Caixa / Financeiro" },
  { id: "funcionarios", label: "Funcionarios" },
  { id: "schema",       label: "Banco / Tabelas" },
];

const HAS_SEARCH: Partial<Record<SgdwExplorerAba, boolean>> = {
  os: true, clientes: true, veiculos: true, caixa: true,
};

const HAS_PAGINATION: Partial<Record<SgdwExplorerAba, boolean>> = {
  os: true, clientes: true, veiculos: true, caixa: true,
};

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
    case "moeda":   return moeda.format(Number(v));
    case "data":    return fmtData(v);
    case "bool":    return Number(v) === 1 ? "Sim" : "-";
    case "lancto":  return String(v) === "D" ? "Deb" : "Cre";
    case "grupo":   return String(v) === "1" ? "A/Rec" : "A/Pag";
    default:        return String(v);
  }
}

function fmtStyle(v: unknown, format?: string, align?: string): React.CSSProperties {
  const s: React.CSSProperties = {
    padding: "5px 10px", fontSize: "0.72rem", fontFamily: "inherit",
    textAlign: align === "right" ? "right" : "left",
    whiteSpace: "nowrap", borderBottom: "1px solid #f0f4f0", color: "#333",
  };
  if (format === "moeda" && Number(v) > 0)   s.color = "#1a5c34";
  if (format === "bool"  && Number(v) === 1)  s.color = "#c0392b";
  if (format === "lancto") s.color = String(v) === "D" ? "#1a5c34" : "#c0392b";
  if (format === "grupo")  s.color = String(v) === "1" ? "#1a5c34" : "#c0392b";
  return s;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataGrid({ cols, linhas }: { cols: ColDef[]; linhas: Record<string, unknown>[] }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e0e8e0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
        <thead>
          <tr style={{ background: "#f4f9f5" }}>
            {cols.map(c => (
              <th key={c.key} style={{
                padding: "7px 10px", textAlign: c.align ?? "left", fontWeight: 700,
                color: "#4a6555", fontSize: "0.65rem", textTransform: "uppercase",
                letterSpacing: "0.04em", borderBottom: "2px solid #d8e8d8",
                whiteSpace: "nowrap", ...(c.w ? { width: c.w, minWidth: c.w } : {}),
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{ padding: 20, textAlign: "center", color: "#888", fontSize: "0.75rem" }}>
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
          {linhas.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fbf8" }}>
              {cols.map(c => (
                <td key={c.key} style={fmtStyle(row[c.key], c.format, c.align)}>
                  {fmtCelula(row[c.key], c.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Paginacao({
  pagina, total, carregando,
  onAnterior, onProximo,
}: {
  pagina: number; total: number; carregando: boolean;
  onAnterior: () => void; onProximo: () => void;
}) {
  const totalPag = Math.ceil(total / SGDW_POR_PAGINA);
  if (totalPag <= 1) return null;
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "5px 11px", borderRadius: 7, border: "1px solid #d0ddd6",
    background: "#f0f5f2", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1, display: "flex", alignItems: "center",
    gap: 4, fontSize: "0.73rem", fontWeight: 600, color: "#444",
  });
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 12 }}>
      <button type="button" style={btnStyle(pagina === 0 || carregando)}
        disabled={pagina === 0 || carregando} onClick={onAnterior}>
        <ChevronLeft size={13} /> Anterior
      </button>
      <span style={{ fontSize: "0.73rem", color: "#666" }}>
        {pagina + 1} / {totalPag}
      </span>
      <button type="button" style={btnStyle(pagina >= totalPag - 1 || carregando)}
        disabled={pagina >= totalPag - 1 || carregando} onClick={onProximo}>
        Proximo <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Schema browser ───────────────────────────────────────────────────────────

function SchemaTab({
  config, tabelas, tabelasLoading,
}: {
  config: SgdwConfig;
  tabelas: string[] | null;
  tabelasLoading: boolean;
}) {
  const [filtro, setFiltro]           = useState("");
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [colunas, setColunas]         = useState<string[] | null>(null);
  const [dados, setDados]             = useState<SgdwPaginaDados | null>(null);
  const [pagina, setPagina]           = useState(0);
  const [loading, setLoading]         = useState(false);
  const [erro, setErro]               = useState<string | null>(null);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const listaFiltrada = (tabelas ?? []).filter(t =>
    !filtro || t.toLowerCase().includes(filtro.toLowerCase())
  );

  const carregarTabela = useCallback(async (nome: string, pag = 0) => {
    setSelecionada(nome);
    setPagina(pag);
    if (pag === 0) { setColunas(null); setDados(null); }
    setLoading(true);
    setErro(null);
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
      {/* Table list */}
      <div style={{ flex: "0 0 180px", minWidth: 150 }}>
        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Filtrar tabela..."
          style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.72rem", boxSizing: "border-box", marginBottom: 6 }}
        />
        {tabelasLoading && <p style={{ fontSize: "0.72rem", color: "#888" }}>Carregando...</p>}
        <div style={{ maxHeight: 400, overflowY: "auto", borderRadius: 8, border: "1px solid #e0e8e0" }}>
          {listaFiltrada.map(t => (
            <button key={t} type="button" onClick={() => carregarTabela(t)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "6px 10px", fontSize: "0.68rem", fontFamily: "monospace",
                cursor: "pointer", border: "none", borderBottom: "1px solid #f0f4f0",
                background: selecionada === t ? "var(--accent)" : "transparent",
                color: selecionada === t ? "#fff" : "#333",
              }}>
              {t}
            </button>
          ))}
          {listaFiltrada.length === 0 && !tabelasLoading && (
            <p style={{ padding: 10, fontSize: "0.72rem", color: "#888" }}>Nenhuma tabela.</p>
          )}
        </div>
      </div>

      {/* Table data */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selecionada && (
          <p style={{ fontSize: "0.78rem", color: "#888", paddingTop: 4 }}>
            Clique em uma tabela para ver os dados.
          </p>
        )}
        {selecionada && loading && !dados && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 0", color: "#888", fontSize: "0.78rem" }}>
            <RefreshCw size={13} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
            Carregando {selecionada}...
          </div>
        )}
        {erro && (
          <div style={{ background: "#fdf3f2", border: "1px solid #f0c0bc", borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem", color: "#c0392b", marginBottom: 8 }}>
            {erro}
          </div>
        )}
        {selecionada && dados && colunas && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "monospace", color: "var(--accent)" }}>{selecionada}</span>
              <span style={{ fontSize: "0.68rem", color: "#888" }}>
                {dados.total.toLocaleString("pt-BR")} linhas · {colunas.length} colunas
              </span>
              {loading && <RefreshCw size={11} style={{ animation: "spin 1s linear infinite", color: "var(--accent)", marginLeft: "auto" }} />}
            </div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e0e8e0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem" }}>
                <thead>
                  <tr style={{ background: "#f4f9f5" }}>
                    {colunas.map(c => (
                      <th key={c} style={{
                        padding: "6px 8px", textAlign: "left", fontWeight: 700,
                        color: "#4a6555", fontSize: "0.62rem", textTransform: "uppercase",
                        borderBottom: "2px solid #d8e8d8", whiteSpace: "nowrap", fontFamily: "monospace",
                      }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.linhas.length === 0 && (
                    <tr><td colSpan={colunas.length} style={{ padding: 16, textAlign: "center", color: "#888", fontSize: "0.73rem" }}>
                      Sem dados.
                    </td></tr>
                  )}
                  {dados.linhas.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fbf8" }}>
                      {colunas.map(c => (
                        <td key={c} style={{
                          padding: "4px 8px", borderBottom: "1px solid #f0f4f0",
                          whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {row[c] === null || row[c] === undefined ? "-" : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPag > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 10 }}>
                <button type="button" disabled={pagina === 0 || loading}
                  onClick={() => { const p = pagina - 1; carregarTabela(selecionada, p); }}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d0ddd6", background: "#f0f5f2", cursor: pagina === 0 ? "not-allowed" : "pointer", opacity: pagina === 0 ? 0.4 : 1, fontSize: "0.7rem", display: "flex", alignItems: "center", gap: 3 }}>
                  <ChevronLeft size={11} /> Ant
                </button>
                <span style={{ fontSize: "0.7rem", color: "#666" }}>{pagina + 1}/{totalPag}</span>
                <button type="button" disabled={pagina >= totalPag - 1 || loading}
                  onClick={() => { const p = pagina + 1; carregarTabela(selecionada, p); }}
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

// ─── Main Explorer component ──────────────────────────────────────────────────

export default function SgdwExplorer({ config }: { config: SgdwConfig }) {
  const [aba, setAba]               = useState<SgdwExplorerAba>("os");
  const [pagina, setPagina]         = useState(0);
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca]           = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados]           = useState<SgdwPaginaDados | null>(null);
  const [erro, setErro]             = useState<string | null>(null);

  // schema tab
  const [tabelas, setTabelas]               = useState<string[] | null>(null);
  const [tabelasLoading, setTabelasLoading] = useState(false);

  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const fetchDados = useCallback(async () => {
    if (aba === "schema") return;
    setCarregando(true);
    setErro(null);
    try {
      let r: SgdwPaginaDados;
      switch (aba) {
        case "os":           r = await buscarOsSgdw(config, pagina, busca); break;
        case "clientes":     r = await buscarClientesSgdw(config, pagina, busca); break;
        case "veiculos":     r = await buscarVeiculosSgdw(config, pagina, busca); break;
        case "servicos":     r = await buscarServicosSgdw(config); break;
        case "caixa":        r = await buscarCaixaSgdw(config, pagina, busca); break;
        case "funcionarios": r = await buscarFuncionariosSgdw(config); break;
        default: return;
      }
      if (montado.current) setDados(r);
    } catch (e) {
      if (montado.current) setErro(e instanceof Error ? e.message : "Erro ao buscar dados");
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, [aba, pagina, busca, config]);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  const mudarAba = (nova: SgdwExplorerAba) => {
    setAba(nova);
    setPagina(0);
    setBusca("");
    setBuscaInput("");
    setDados(null);
    setErro(null);
    if (nova === "schema" && !tabelas && !tabelasLoading) {
      setTabelasLoading(true);
      listarTabelasSgdw(config)
        .then(ts => { if (montado.current) { setTabelas(ts); setTabelasLoading(false); } })
        .catch(() => { if (montado.current) setTabelasLoading(false); });
    }
  };

  const cols = aba !== "schema" ? COLS[aba] : [];
  const total = dados?.total ?? 0;

  return (
    <div style={{ marginTop: 18 }}>
      <p style={{
        fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.07em", color: "#7a9a84", margin: "0 0 10px 0",
      }}>
        Explorador de Dados SGDW
      </p>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap", borderBottom: "2px solid #d8e8d8", marginBottom: 0 }}>
        {ABAS.map(a => {
          const ativa = aba === a.id;
          return (
            <button key={a.id} type="button" onClick={() => mudarAba(a.id)}
              style={{
                padding: "6px 12px", fontSize: "0.72rem", fontWeight: 600,
                cursor: "pointer", border: "1px solid transparent",
                borderBottom: "none", borderRadius: "6px 6px 0 0",
                background: ativa ? "#fff" : "transparent",
                color: ativa ? "var(--accent)" : "#6a8a76",
                borderColor: ativa ? "#d8e8d8" : "transparent",
                marginBottom: ativa ? "-2px" : 0,
                transition: "color 0.15s, background 0.15s",
              }}>
              {a.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{
        border: "1px solid #d8e8d8", borderTop: "none",
        borderRadius: "0 0 10px 10px", background: "#fff",
        padding: "14px 16px", minHeight: 140,
      }}>
        {aba === "schema" ? (
          <SchemaTab config={config} tabelas={tabelas} tabelasLoading={tabelasLoading} />
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              {HAS_SEARCH[aba] && (
                <form
                  onSubmit={e => { e.preventDefault(); setPagina(0); setBusca(buscaInput); }}
                  style={{ display: "flex", gap: 6, flex: 1, minWidth: 180 }}>
                  <input
                    value={buscaInput}
                    onChange={e => setBuscaInput(e.target.value)}
                    placeholder="Buscar..."
                    style={{
                      flex: 1, padding: "5px 10px", borderRadius: 7,
                      border: "1px solid #d0ddd6", fontSize: "0.75rem",
                    }}
                  />
                  <button type="submit"
                    style={{
                      padding: "5px 11px", borderRadius: 7, background: "var(--accent)",
                      color: "#fff", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4, fontSize: "0.73rem",
                    }}>
                    <Search size={12} /> Buscar
                  </button>
                  {busca && (
                    <button type="button"
                      onClick={() => { setBusca(""); setBuscaInput(""); setPagina(0); }}
                      style={{
                        padding: "5px 10px", borderRadius: 7, background: "#f0f5f2",
                        border: "1px solid #d0ddd6", cursor: "pointer", fontSize: "0.73rem",
                      }}>
                      Limpar
                    </button>
                  )}
                </form>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
                {dados && (
                  <span style={{ fontSize: "0.68rem", color: "#7a9a84" }}>
                    {total.toLocaleString("pt-BR")} registros
                    {HAS_PAGINATION[aba] && total > SGDW_POR_PAGINA &&
                      ` · Pag ${pagina + 1}/${Math.ceil(total / SGDW_POR_PAGINA)}`}
                  </span>
                )}
                <button type="button" onClick={fetchDados} disabled={carregando}
                  style={{
                    padding: "5px 11px", borderRadius: 7, background: "#f0f5f2",
                    border: "1px solid #d0ddd6", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: "0.72rem", opacity: carregando ? 0.6 : 1,
                  }}>
                  <RefreshCw size={11} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }} />
                  Atualizar
                </button>
              </div>
            </div>

            {/* Loading */}
            {carregando && !dados && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 0", color: "#888", fontSize: "0.78rem" }}>
                <RefreshCw size={14} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
                Carregando...
              </div>
            )}

            {/* Error */}
            {erro && (
              <div style={{
                background: "#fdf3f2", border: "1px solid #f0c0bc",
                borderRadius: 8, padding: "10px 14px", fontSize: "0.75rem",
                color: "#c0392b", marginBottom: 8,
              }}>
                {erro}
              </div>
            )}

            {/* Data grid */}
            {dados && <DataGrid cols={cols} linhas={dados.linhas} />}

            {/* Pagination */}
            {dados && HAS_PAGINATION[aba] && (
              <Paginacao
                pagina={pagina}
                total={total}
                carregando={carregando}
                onAnterior={() => setPagina(p => p - 1)}
                onProximo={() => setPagina(p => p + 1)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
