"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Database,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { buscarHonorariosSgdw, diagnosticarCamposValor, descobrirSchema, type DiagCampos } from "@/src/features/sgdw/client";
import { sgdwParaRelatorio } from "@/src/features/sgdw/adapter";
import SgdwExplorer from "@/src/components/analise/sgdw-explorer";
import type { SgdwDados } from "@/src/features/sgdw/types";
import type { RelatorioHonorarios } from "@/src/features/honorarios/modelo";
import styles from "@/src/styles/AnaliseHonorarios.module.css";

// RTDB — lido apenas para exibir status de sincronização e ativar SSE de pedidos
const FIREBASE_TUNNEL  = "https://beto-58a10-default-rtdb.firebaseio.com/sgdw-tunnel.json";
const FIREBASE_ORDERS  = "https://beto-58a10-default-rtdb.firebaseio.com/sgdw-orders.json";

// Config vazia passada ao explorer — sgdwPost ignora url/token e usa o relay
const RELAY_CONFIG = { url: "", token: "" } as const;

const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Status = "conectando" | "conectado" | "erro";
type Preset = "mes" | "trim" | "sem" | "ano" | "ant" | "custom";

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "mes",    label: "Mes" },
  { id: "trim",   label: "3 meses" },
  { id: "sem",    label: "6 meses" },
  { id: "ano",    label: "Ano atual" },
  { id: "ant",    label: "Ano ant." },
  { id: "custom", label: "Personalizado" },
];

function hoje() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

function rangeFromPreset(p: Preset): { ai: number; mi: number; af: number; mf: number } {
  const { ano, mes } = hoje();
  if (p === "mes")  return { ai: ano, mi: mes, af: ano, mf: mes };
  if (p === "trim") { const d = new Date(); d.setMonth(d.getMonth()-2); return { ai: d.getFullYear(), mi: d.getMonth()+1, af: ano, mf: mes }; }
  if (p === "sem")  { const d = new Date(); d.setMonth(d.getMonth()-5); return { ai: d.getFullYear(), mi: d.getMonth()+1, af: ano, mf: mes }; }
  if (p === "ano")  return { ai: ano, mi: 1, af: ano, mf: 12 };
  if (p === "ant")  return { ai: ano-1, mi: 1, af: ano-1, mf: 12 };
  return { ai: ano-1, mi: 1, af: ano, mf: 12 };
}

export default function SgdwConexao({
  onRelatorio,
  ocultarExplorador = false,
}: {
  onRelatorio: (r: RelatorioHonorarios | null) => void;
  ocultarExplorador?: boolean;
}) {
  const [status, setStatus]         = useState<Status>("conectando");
  const [erro, setErro]             = useState<string | null>(null);
  const [dados, setDados]           = useState<SgdwDados | null>(null);
  const [dadosAnt, setDadosAnt]     = useState<SgdwDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [syncToast, setSyncToast]   = useState(false);
  const [diag, setDiag]             = useState<DiagCampos | null>(null);
  const [diagCarregando, setDiagCarregando] = useState(false);
  const [schema, setSchema]         = useState<{ tabela: string; colunas: string[] }[] | null>(null);
  const [schemaCarregando, setSchemaCarregando] = useState(false);

  const [preset, setPreset]       = useState<Preset>("ano");
  const [anoInicio, setAnoInicio] = useState(() => hoje().ano);
  const [mesInicio, setMesInicio] = useState(1);
  const [anoFim, setAnoFim]       = useState(() => hoje().ano);
  const [mesFim, setMesFim]       = useState(12);

  const montado     = useRef(false);
  const statusRef   = useRef<Status>("conectando");
  const periodoRef  = useRef({ anoInicio, mesInicio, anoFim, mesFim });
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { periodoRef.current = { anoInicio, mesInicio, anoFim, mesFim }; }, [anoInicio, mesInicio, anoFim, mesFim]);

  const anoOpts = Array.from({ length: 8 }, (_, i) => hoje().ano - 7 + i);

  const emitirRelatorio = useCallback((d: SgdwDados, dAnt: SgdwDados | null) => {
    onRelatorio(sgdwParaRelatorio(d, dAnt));
  }, [onRelatorio]);

  const buscarDados = useCallback(async (
    ai: number, mi: number, af: number, mf: number
  ) => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await buscarHonorariosSgdw(RELAY_CONFIG, ai, af, mi, mf);
      setDados(resultado);
      setStatus("conectado");
      buscarHonorariosSgdw(RELAY_CONFIG, ai - 1, af - 1, mi, mf)
        .then((ant) => { setDadosAnt(ant); emitirRelatorio(resultado, ant); })
        .catch(() => { setDadosAnt(null); emitirRelatorio(resultado, null); });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao buscar dados.";
      setErro(msg);
      // Qualquer erro de conectividade (tunnel caiu, URL velha, sem resposta) → modo erro
      const isConectividade = /tunnel|indisponivel|desconectado|sem resposta|iniciar\.bat/i.test(msg)
        || /50[23]|404/.test(msg);
      if (isConectividade) setStatus("erro");
    } finally {
      setCarregando(false);
    }
  }, [emitirRelatorio]);

  // Ref estável para SSE usar sem causar re-subscribe
  const buscarDadosRef = useRef(buscarDados);
  useEffect(() => { buscarDadosRef.current = buscarDados; }, [buscarDados]);

  // Testa conexão via relay (server-side)
  const autoConectar = useCallback(async (): Promise<boolean> => {
    setStatus("conectando");
    setErro(null);
    try {
      const r = await fetch("/api/sgdw-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: "SELECT 1 AS PING FROM RDB$DATABASE" }),
        signal: AbortSignal.timeout(35000),
      });
      if (r.ok) { setStatus("conectado"); return true; }
      const d = await r.json().catch(() => ({})) as { error?: string };
      setErro(d.error ?? `Erro HTTP ${r.status}`);
      setStatus("erro");
      return false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sem resposta do SGDW.";
      const isTimeout = /timed out|timeout/i.test(msg);
      setErro(isTimeout ? "Sem resposta — servidor aguardando conexao do SGDW." : msg);
      setStatus("erro");
      return false;
    }
  }, []);

  const aplicarPreset = useCallback((p: Preset) => {
    if (p !== "custom") {
      const r = rangeFromPreset(p);
      setAnoInicio(r.ai); setMesInicio(r.mi);
      setAnoFim(r.af);   setMesFim(r.mf);
      if (statusRef.current === "conectado") buscarDadosRef.current(r.ai, r.mi, r.af, r.mf);
    }
    setPreset(p);
  }, []);

  // Conexão inicial
  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    autoConectar().then((ok) => {
      if (ok) {
        const r = rangeFromPreset("ano");
        buscarDados(r.ai, r.mi, r.af, r.mf);
      }
    });
  }, [autoConectar, buscarDados]);

  // Auto-refresh a cada 5 min quando conectado (coincide com ciclo do webSync)
  useEffect(() => {
    if (status !== "conectado") return;
    const id = setInterval(() => {
      const p = periodoRef.current;
      buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim);
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [status]);

  // Reconexão em background quando em erro (a cada 30s)
  useEffect(() => {
    if (status !== "erro") return;
    let cancelado = false;
    const id = setInterval(async () => {
      if (cancelado) return;
      const ok = await autoConectar();
      if (ok && !cancelado) {
        const p = periodoRef.current;
        buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim);
      }
    }, 8_000);
    return () => { cancelado = true; clearInterval(id); };
  }, [status, autoConectar]);

  // SSE Firebase sgdw-tunnel — mostra toast quando tunnel muda, tenta reconectar se em erro
  useEffect(() => {
    let source: EventSource | null = null;
    let ativo = true;
    let lastTunnelUrl: string | null = null;

    const abrir = () => {
      if (!ativo) return;
      try { source = new EventSource(FIREBASE_TUNNEL); } catch { return; }

      const processar = (d: { url?: string } | null) => {
        if (!ativo || !d?.url) return;
        if (d.url === lastTunnelUrl) return;
        lastTunnelUrl = d.url;
        // Tunnel URL mudou: se estava em erro, tenta reconectar agora
        if (statusRef.current === "erro") {
          autoConectar().then((ok) => {
            if (ok) {
              const p = periodoRef.current;
              buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim);
            }
          });
        }
      };

      source.addEventListener("put",   (ev: MessageEvent) => {
        try { processar((JSON.parse(ev.data) as { data?: { url?: string } }).data ?? null); } catch {}
      });
      source.addEventListener("patch", (ev: MessageEvent) => {
        try { processar((JSON.parse(ev.data) as { data?: { url?: string } }).data ?? null); } catch {}
      });
      source.onerror = () => { source?.close(); source = null; if (ativo) setTimeout(abrir, 8000); };
    };

    abrir();
    return () => { ativo = false; source?.close(); };
  }, [autoConectar]);

  // SSE Firebase sgdw-orders — refresh imediato quando webSync publica nova sincronização
  useEffect(() => {
    let source: EventSource | null = null;
    let ativo = true;
    let lastAt: string | null = null;

    const abrir = () => {
      if (!ativo) return;
      try { source = new EventSource(FIREBASE_ORDERS); } catch { return; }

      const processar = (d: { generatedAt?: string } | null) => {
        if (!ativo || !d?.generatedAt) return;
        if (d.generatedAt === lastAt) return;
        lastAt = d.generatedAt;
        if (statusRef.current === "conectado") {
          setSyncToast(true);
          setTimeout(() => setSyncToast(false), 4000);
          const p = periodoRef.current;
          buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim);
        }
      };

      source.addEventListener("put",   (ev: MessageEvent) => {
        try { processar((JSON.parse(ev.data) as { data?: { generatedAt?: string } }).data ?? null); } catch {}
      });
      source.addEventListener("patch", (ev: MessageEvent) => {
        try { processar((JSON.parse(ev.data) as { data?: { generatedAt?: string } }).data ?? null); } catch {}
      });
      source.onerror = () => { source?.close(); source = null; if (ativo) setTimeout(abrir, 15000); };
    };

    abrir();
    return () => { ativo = false; source?.close(); };
  }, []);

  // ── Estado: sem dados e sem conexão ────────────────────────────────────────
  if (status !== "conectado" && dados === null) {
    return (
      <div className={styles.sectionStack}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <Database size={20} />
            <h2>SGDW — Sistema de Gestao</h2>
            {status === "erro" && (
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#d13b3b", fontWeight: 700 }}>
                <WifiOff size={15} /> Sem conexao
              </span>
            )}
          </div>
          {status === "conectando" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <RefreshCw size={18} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>Conectando ao SGDW...</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#fdf3f2", padding: "10px 14px", borderRadius: 8, border: "1px solid #f0c0bc" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c0392b", margin: "0 0 6px 0" }}>SGDW sem resposta:</p>
                {erro?.split("\n").map((linha, i) => (
                  <p key={i} style={{ fontSize: "0.75rem", color: "#7a3030", margin: "2px 0", fontFamily: "monospace" }}>✗ {linha}</p>
                ))}
                <p style={{ fontSize: "0.75rem", color: "#555", marginTop: 8, marginBottom: 0 }}>
                  Abra o <strong>iniciar.bat</strong> no servidor SGDW e aguarde a conexao automatica.
                </p>
              </div>
              <button
                type="button"
                onClick={() => autoConectar().then(ok => {
                  if (ok) { const r = rangeFromPreset("ano"); buscarDados(r.ai, r.mi, r.af, r.mf); }
                })}
                style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: "transparent", color: "var(--text-secondary)", border: "1px solid #d0ddd6", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                <RefreshCw size={13} /> Tentar novamente
              </button>
            </div>
          )}
        </article>
      </div>
    );
  }

  // ── Estado: conectado (ou reconectando com dados antigos visíveis) ──────────
  return (
    <>
      {/* Toast: nova sincronização do webSync */}
      {syncToast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: "#1a7d50", color: "#fff", borderRadius: 10,
          padding: "10px 20px", fontWeight: 700, fontSize: "0.84rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
          display: "flex", alignItems: "center", gap: 8,
          pointerEvents: "none",
        }}>
          <RefreshCw size={14} /> Dados atualizados automaticamente
        </div>
      )}

      {/* Banner de reconexão (quando há dados mas perdeu conexão) */}
      {status !== "conectado" && (
        <article className={styles.panel} style={{ padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RefreshCw size={13} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {status === "conectando" ? "Reconectando ao SGDW..." : "Sem conexao — tentando automaticamente..."}
            </span>
            {status === "erro" && (
              <button
                type="button"
                onClick={() => autoConectar().then(ok => {
                  if (ok) buscarDados(anoInicio, mesInicio, anoFim, mesFim);
                })}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                <RefreshCw size={11} /> Tentar agora
              </button>
            )}
          </div>
        </article>
      )}

      {/* Painel principal de controles */}
      <article className={styles.panel} style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "#1cb870", fontWeight: 700, whiteSpace: "nowrap" }}>
              <Wifi size={13} /> Conectado ao SGDW
            </span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
              {PRESETS.map(p => (
                <button key={p.id} type="button" onClick={() => aplicarPreset(p.id)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap",
                    background: preset === p.id ? "var(--accent)" : "#f0f5f2",
                    color: preset === p.id ? "#fff" : "var(--text-secondary)",
                    border: preset === p.id ? "1px solid var(--accent)" : "1px solid #d0ddd6",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => buscarDados(anoInicio, mesInicio, anoFim, mesFim)}
              disabled={carregando}
              style={{ padding: "5px 14px", borderRadius: 7, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: carregando ? 0.6 : 1 }}>
              <RefreshCw size={12} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }} />
              {carregando ? "Buscando..." : "Atualizar"}
            </button>
          </div>

          {preset === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid #e8eee8" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>De:</span>
              <select value={mesInicio} onChange={e => setMesInicio(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.8rem", background: "#f8fbf9" }}>
                {MESES_LABEL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={anoInicio} onChange={e => setAnoInicio(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.8rem", background: "#f8fbf9" }}>
                {anoOpts.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Ate:</span>
              <select value={mesFim} onChange={e => setMesFim(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.8rem", background: "#f8fbf9" }}>
                {MESES_LABEL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={anoFim} onChange={e => setAnoFim(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #d0ddd6", fontSize: "0.8rem", background: "#f8fbf9" }}>
                {anoOpts.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          {dados && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                <CalendarDays size={12} />
                <span>
                  {MESES_LABEL[mesInicio-1]}/{anoInicio}
                  {(anoInicio !== anoFim || mesInicio !== mesFim) && ` → ${MESES_LABEL[mesFim-1]}/${anoFim}`}
                  {" · "}<strong style={{ color: "var(--text)" }}>{dados.periodos.length} {dados.periodos.length === 1 ? "mes" : "meses"}</strong>
                  {" · "}<strong style={{ color: "var(--text)" }}>{dados.rawLinhas.length.toLocaleString("pt-BR")} grupos</strong>
                  {dadosAnt && <span style={{ color: "#1a7d50", marginLeft: 6 }}>· Comparacao carregada</span>}
                  {" · "}{new Date(dados.geradoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {dados.truncado && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#b7580a", background: "#fff8f0", border: "1px solid #f0d0a0", borderRadius: 6, padding: "4px 8px" }}>
                  <span>⚠ Limite de leitura atingido — estreite o periodo para ver todos os dados.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {erro && status !== "erro" && (
          <p style={{ marginTop: 8, fontSize: "0.78rem", color: "#c0392b" }}>{erro}</p>
        )}

        {/* Ferramentas de diagnóstico */}
        <div style={{ marginTop: 8, borderTop: "1px solid #e8eee8", paddingTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={diagCarregando}
              onClick={async () => {
                setDiagCarregando(true); setDiag(null);
                try {
                  const r = await diagnosticarCamposValor(RELAY_CONFIG, anoFim, mesFim);
                  setDiag(r);
                } catch { setDiag({ ERRO: -1 } as DiagCampos); }
                finally { setDiagCarregando(false); }
              }}
              style={{ fontSize: "0.72rem", color: "var(--text-secondary)", background: "transparent", border: "1px solid #d0ddd6", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
              {diagCarregando ? "Verificando..." : "Diagnostico de campos"}
            </button>
            <button
              type="button"
              disabled={schemaCarregando}
              onClick={async () => {
                setSchemaCarregando(true); setSchema(null);
                try {
                  const r = await descobrirSchema(RELAY_CONFIG);
                  setSchema(r);
                } catch { setSchema([]); }
                finally { setSchemaCarregando(false); }
              }}
              style={{ fontSize: "0.72rem", color: "var(--text-secondary)", background: "transparent", border: "1px solid #d0ddd6", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
              {schemaCarregando ? "Lendo..." : "Ver schema do banco"}
            </button>
          </div>

          {diag && (
            <div style={{ fontSize: "0.75rem", fontFamily: "monospace", background: "#f8fbf9", border: "1px solid #d0ddd6", borderRadius: 8, padding: "8px 12px", minWidth: 280 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontFamily: "inherit" }}>Valores — {MESES_LABEL[mesFim-1]}/{anoFim}:</p>
              {Object.entries(diag).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "#555" }}>{k}</span>
                  <span style={{ fontWeight: 600, color: v === -1 ? "#c0392b" : "inherit" }}>
                    {v === -1 ? "nao existe" : typeof v === "number" && k !== "QTD"
                      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {schema && (
            <div style={{ fontSize: "0.72rem", fontFamily: "monospace", background: "#f8fbf9", border: "1px solid #d0ddd6", borderRadius: 8, padding: "8px 12px", maxHeight: 320, overflowY: "auto" }}>
              {schema.map(({ tabela, colunas }) => (
                <div key={tabela} style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 3px", fontWeight: 700, color: "var(--accent)", fontFamily: "inherit" }}>{tabela} ({colunas.length} campos)</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
                    {colunas.map((c) => <span key={c} style={{ color: "#444" }}>{c}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>

      {!ocultarExplorador && <SgdwExplorer config={RELAY_CONFIG} />}
    </>
  );
}
