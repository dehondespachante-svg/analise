"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Copy,
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

const TOKEN      = "6ad74bc2cdc8d84953ea21ad89c25715d49ad614757b8aea5c599050b5d6e6dc";
const URL_LOCAL  = "http://localhost:8787";
const LS_URL_KEY = "sgdw:url-manual";
const FIREBASE_RTDB = "https://beto-58a10-default-rtdb.firebaseio.com/sgdw-tunnel.json";
const WATCH_INTERVAL = 30_000; // 30s — verifica se URL do tunnel mudou

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

async function registrarUrlFirebase(url: string): Promise<void> {
  try {
    await fetch("/api/sgdw-tunnel", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ tunnelUrl: url }),
    });
  } catch { /* silencioso */ }
}

async function testar(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/sgdw-query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "SELECT 1 AS PING FROM RDB$DATABASE" }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch { return false; }
}

// Leitura direta do Firebase — sem cache, retorna url e timestamp
async function lerUrlFirebaseDireto(): Promise<{ url: string | null; at: string | null }> {
  try {
    const res = await fetch(FIREBASE_RTDB, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { url: null, at: null };
    const d = await res.json() as { url?: string; at?: string } | null;
    return { url: d?.url ?? null, at: d?.at ?? null };
  } catch { return { url: null, at: null }; }
}


export default function SgdwConexao({
  onRelatorio,
}: {
  onRelatorio: (r: RelatorioHonorarios | null) => void;
}) {
  const [status, setStatus]         = useState<Status>("conectando");
  const [apiUrl, setApiUrl]         = useState(URL_LOCAL);
  const [erro, setErro]             = useState<string | null>(null);
  const [dados, setDados]           = useState<SgdwDados | null>(null);
  const [dadosAnt, setDadosAnt]     = useState<SgdwDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado]       = useState(false);
  const [urlInput, setUrlInput]     = useState("");
  const [firebaseAt, setFirebaseAt] = useState<string | null>(null);
  const [diag, setDiag]             = useState<DiagCampos | null>(null);
  const [diagCarregando, setDiagCarregando] = useState(false);
  const [schema, setSchema]         = useState<{ tabela: string; colunas: string[] }[] | null>(null);
  const [schemaCarregando, setSchemaCarregando] = useState(false);

  const [preset, setPreset]       = useState<Preset>("ano");
  const [anoInicio, setAnoInicio] = useState(() => hoje().ano);
  const [mesInicio, setMesInicio] = useState(1);
  const [anoFim, setAnoFim]       = useState(() => hoje().ano);
  const [mesFim, setMesFim]       = useState(12);

  const montado = useRef(false);
  const anoOpts = Array.from({ length: 8 }, (_, i) => hoje().ano - 7 + i);
  const usandoTunnel = apiUrl !== URL_LOCAL && status === "conectado";

  const emitirRelatorio = useCallback((d: SgdwDados, dAnt: SgdwDados | null) => {
    onRelatorio(sgdwParaRelatorio(d, dAnt));
  }, [onRelatorio]);

  const buscarDados = useCallback(async (
    url: string, ai: number, mi: number, af: number, mf: number
  ) => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await buscarHonorariosSgdw({ url, token: TOKEN }, ai, af, mi, mf);
      setDados(resultado);
      buscarHonorariosSgdw({ url, token: TOKEN }, ai - 1, af - 1, mi, mf)
        .then((ant) => { setDadosAnt(ant); emitirRelatorio(resultado, ant); })
        .catch(() => { setDadosAnt(null); emitirRelatorio(resultado, null); });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao buscar dados.";
      const isRede = msg.toLowerCase().includes("fetch") || msg.includes("502") || msg.includes("504") || msg.includes("530");
      if (isRede) {
        // Tunnel mudou — busca nova URL direto do Firebase e retenta
        const { url: novaUrl, at: novaAt } = await lerUrlFirebaseDireto();
        if (novaAt) setFirebaseAt(novaAt);
        if (novaUrl && novaUrl !== url && await testar(novaUrl)) {
          setApiUrl(novaUrl);
          setStatus("conectado");
          if (typeof window !== "undefined") localStorage.setItem(LS_URL_KEY, novaUrl);
          try {
            const r2 = await buscarHonorariosSgdw({ url: novaUrl, token: TOKEN }, ai, af, mi, mf);
            setDados(r2);
            buscarHonorariosSgdw({ url: novaUrl, token: TOKEN }, ai - 1, af - 1, mi, mf)
              .then((ant) => { setDadosAnt(ant); emitirRelatorio(r2, ant); })
              .catch(() => { setDadosAnt(null); emitirRelatorio(r2, null); });
            return;
          } catch { /* cai no erro abaixo */ }
        }
        setStatus("conectando");
      } else {
        setErro(msg);
      }
    } finally {
      setCarregando(false);
    }
  }, [emitirRelatorio]);

  const aplicarPreset = useCallback((p: Preset, urlOverride?: string) => {
    if (p !== "custom") {
      const r = rangeFromPreset(p);
      setAnoInicio(r.ai); setMesInicio(r.mi);
      setAnoFim(r.af);   setMesFim(r.mf);
      const url = urlOverride ?? apiUrl;
      if (status === "conectado" || urlOverride) buscarDados(url, r.ai, r.mi, r.af, r.mf);
    }
    setPreset(p);
  }, [apiUrl, status, buscarDados]);

  const autoConectar = useCallback(async () => {
    setStatus("conectando"); setErro(null);
    if (await testar(URL_LOCAL)) { setApiUrl(URL_LOCAL); setStatus("conectado"); return URL_LOCAL; }
    // Tenta Firebase com ate 4 tentativas — tunnel pode estar trocando de URL
    for (let i = 0; i < 4; i++) {
      if (i > 0) await new Promise<void>(r => setTimeout(r, 5000));
      const { url: tunnelUrl, at } = await lerUrlFirebaseDireto();
      if (at) setFirebaseAt(at);
      if (tunnelUrl && await testar(tunnelUrl)) {
        setApiUrl(tunnelUrl);
        setStatus("conectado");
        if (typeof window !== "undefined") localStorage.setItem(LS_URL_KEY, tunnelUrl);
        return tunnelUrl;
      }
      setErro(`Tentativa ${i + 1}/4 — aguardando tunnel...\n${tunnelUrl ?? "Firebase sem URL"}`);
    }
    const { url: ultimaUrl, at: ultimaAt } = await lerUrlFirebaseDireto();
    if (ultimaAt) setFirebaseAt(ultimaAt);
    setStatus("erro");
    setErro(ultimaUrl
      ? `Tunnel encontrado mas sem resposta:\n${ultimaUrl}`
      : "localhost:8787 sem resposta e Firebase sem URL"
    );
    return null;
  }, []);

  // Conexao inicial
  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    autoConectar().then((url) => {
      if (url) {
        const r = rangeFromPreset("ano");
        buscarDados(url, r.ai, r.mi, r.af, r.mf);
      }
    });
  }, [autoConectar, buscarDados]);

  // Auto-retry silencioso em "erro" — verifica Firebase a cada 30s sem mudar tela
  useEffect(() => {
    if (status !== "erro") return;
    let cancelado = false;
    const verificar = async () => {
      const { url: novaUrl, at } = await lerUrlFirebaseDireto();
      if (cancelado) return;
      if (at) setFirebaseAt(at);
      if (novaUrl && await testar(novaUrl)) {
        if (cancelado) return;
        setApiUrl(novaUrl);
        setStatus("conectado");
        if (typeof window !== "undefined") localStorage.setItem(LS_URL_KEY, novaUrl);
        buscarDados(novaUrl, anoInicio, mesInicio, anoFim, mesFim);
      }
    };
    const t = setTimeout(verificar, 30_000);
    return () => { cancelado = true; clearTimeout(t); };
  }, [status, buscarDados, anoInicio, mesInicio, anoFim, mesFim]);

  // Monitoramento continuo — detecta mudanca de URL do tunnel a cada 30s
  useEffect(() => {
    if (status !== "conectado") return;
    const id = setInterval(async () => {
      const { url: novaUrl } = await lerUrlFirebaseDireto();
      if (!novaUrl || novaUrl === apiUrl) return;
      if (await testar(novaUrl)) {
        setApiUrl(novaUrl);
        if (typeof window !== "undefined") localStorage.setItem(LS_URL_KEY, novaUrl);
      }
    }, WATCH_INTERVAL);
    return () => clearInterval(id);
  }, [status, apiUrl]);

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
                <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c0392b", margin: "0 0 6px 0" }}>Sem resposta do banco (ping falhou):</p>
                {erro?.split("\n").map((linha, i) => (
                  <p key={i} style={{ fontSize: "0.75rem", color: "#7a3030", margin: "2px 0", fontFamily: "monospace" }}>✗ {linha}</p>
                ))}
                {firebaseAt && (() => {
                  const minAgo = Math.round((Date.now() - new Date(firebaseAt).getTime()) / 60000);
                  return (
                    <p style={{ fontSize: "0.72rem", color: minAgo > 5 ? "#c0392b" : "#888", marginTop: 6, marginBottom: 0 }}>
                      Firebase atualizado: <strong>{minAgo < 1 ? "agora" : `${minAgo} min atrás`}</strong>
                      {minAgo > 5 ? " — tunnel provavelmente mudou de URL" : ""}
                    </p>
                  );
                })()}
                <p style={{ fontSize: "0.75rem", color: "#555", marginTop: 8, marginBottom: 0 }}>
                  Cole a URL do tunnel do <strong>iniciar.bat</strong> abaixo ou verifique se o Firebird esta rodando.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="url" placeholder="https://xxx.trycloudflare.com" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  style={{ flex: 1, minWidth: 260, padding: "8px 12px", borderRadius: 8, border: "1px solid #d0ddd6", fontSize: "0.82rem", fontFamily: "monospace" }} />
                <button type="button"
                  onClick={async () => {
                    const url = urlInput.trim().replace(/\/$/, "");
                    if (!url) return;
                    if (await testar(url)) {
                      if (typeof window !== "undefined") localStorage.setItem(LS_URL_KEY, url);
                      void registrarUrlFirebase(url);
                      setApiUrl(url); setStatus("conectado"); aplicarPreset("ano", url);
                    } else setErro(`Nao foi possivel conectar em:\n${url} — sem resposta do banco`);
                  }}
                  style={{ padding: "8px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                  Conectar
                </button>
              </div>
              <button type="button" onClick={() => autoConectar().then(url => { if (url) aplicarPreset("ano", url); })}
                style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: "transparent", color: "var(--text-secondary)", border: "1px solid #d0ddd6", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                <RefreshCw size={13} /> Tentar novamente
              </button>
            </div>
          )}
        </article>
      </div>
    );
  }

  return (
  <>
    {status !== "conectado" && (
      <article className={styles.panel} style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RefreshCw size={13} style={{ color: "var(--accent)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {status === "conectando" ? "Reconectando ao SGDW..." : "Sem conexão — tentando reconectar em 15s..."}
          </span>
          {status === "erro" && (
            <button type="button"
              onClick={() => autoConectar().then(u => { if (u) buscarDados(u, anoInicio, mesInicio, anoFim, mesFim); })}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
              <RefreshCw size={11} /> Tentar agora
            </button>
          )}
        </div>
      </article>
    )}
    <article className={styles.panel} style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "#1cb870", fontWeight: 700, whiteSpace: "nowrap" }}>
            <Wifi size={13} /> Conectado
          </span>
          {usandoTunnel && <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", background: "#f0fdf6", border: "1px solid #b2dfcb", borderRadius: 5, padding: "2px 7px" }}>tunnel</span>}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
            {PRESETS.map(p => (
              <button key={p.id} type="button" onClick={() => aplicarPreset(p.id)}
                style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                  background: preset === p.id ? "var(--accent)" : "#f0f5f2",
                  color: preset === p.id ? "#fff" : "var(--text-secondary)",
                  border: preset === p.id ? "1px solid var(--accent)" : "1px solid #d0ddd6" }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {usandoTunnel && (
              <button type="button" onClick={() => navigator.clipboard.writeText(apiUrl).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); })}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #b2dfcb", background: copiado ? "#1a7d50" : "#fff", color: copiado ? "#fff" : "#1a7d50", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                <Copy size={11} /> {copiado ? "Copiado!" : "URL"}
              </button>
            )}
            <button type="button" onClick={() => buscarDados(apiUrl, anoInicio, mesInicio, anoFim, mesFim)} disabled={carregando}
              style={{ padding: "5px 14px", borderRadius: 7, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: carregando ? 0.6 : 1 }}>
              <RefreshCw size={12} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }} />
              {carregando ? "Buscando..." : "Atualizar"}
            </button>
          </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            <CalendarDays size={12} />
            <span>
              {MESES_LABEL[mesInicio-1]}/{anoInicio}
              {(anoInicio !== anoFim || mesInicio !== mesFim) && ` → ${MESES_LABEL[mesFim-1]}/${anoFim}`}
              {" · "}<strong style={{ color: "var(--text)" }}>{dados.periodos.length} {dados.periodos.length === 1 ? "mes" : "meses"}</strong>
              {dadosAnt && <span style={{ color: "#1a7d50", marginLeft: 6 }}>· Comparacao carregada</span>}
              {" · "}{new Date(dados.geradoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </div>
      {erro && <p style={{ marginTop: 8, fontSize: "0.78rem", color: "#c0392b" }}>{erro}</p>}
      <div style={{ marginTop: 8, borderTop: "1px solid #e8eee8", paddingTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" disabled={diagCarregando}
            onClick={async () => {
              setDiagCarregando(true); setDiag(null);
              try {
                const r = await diagnosticarCamposValor({ url: apiUrl, token: TOKEN }, anoFim, mesFim);
                setDiag(r);
              } catch { setDiag({ ERRO: -1 } as DiagCampos); }
              finally { setDiagCarregando(false); }
            }}
            style={{ fontSize: "0.72rem", color: "var(--text-secondary)", background: "transparent", border: "1px solid #d0ddd6", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
            {diagCarregando ? "Verificando..." : "Diagnostico de campos"}
          </button>
          <button type="button" disabled={schemaCarregando}
            onClick={async () => {
              setSchemaCarregando(true); setSchema(null);
              try {
                const r = await descobrirSchema({ url: apiUrl, token: TOKEN });
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
    <SgdwExplorer config={{ url: apiUrl, token: TOKEN }} />
  </>
  );
}
