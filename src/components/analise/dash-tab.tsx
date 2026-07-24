"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart, Bar, Line, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { CalendarDays, Database, Eye, EyeOff, RefreshCw, Search, Wifi, WifiOff } from "lucide-react";
import {
  buscarHonorariosSgdw,
  buscarClientesSgdw,
  buscarFuncionariosSgdw,
  buscarKpiOsSgdw,
  buscarKpiCaixaSgdw,
  buscarServicosSgdw,
  buscarColaboradoresHonorariosSgdw,
  buscarSemanalPorMesSgdw,
  buscarServicosColaboradorSgdw,
} from "@/src/features/sgdw/client";
import type { SemanalMesData } from "@/src/features/sgdw/client";
import { sgdwParaRelatorio } from "@/src/features/sgdw/adapter";
import type { SgdwDados, SgdwCaixaKpi, SgdwOsKpi } from "@/src/features/sgdw/types";
import type { RelatorioHonorarios } from "@/src/features/honorarios/modelo";

const RELAY_CONFIG = { url: "", token: "" } as const;
const ML = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Status   = "conectando" | "conectado" | "erro";
type Preset   = "mes" | "trim" | "sem" | "ano" | "ant" | "custom";
type DashAba  = "visao" | "semanal" | "setor" | "clientes" | "colaborador" | "metas" | "categorias" | "relatorio";

type ClienteRow  = { clinumer: number; nome: string; documento: string; qtdOs: number; totalGasto: number; totalHon: number };
type FuncRow     = { usunumer: number; nome: string };
type ColabRow    = { usunumer: number; nome: string; qtdOs: number; totalHon: number };

function getCategoria(servico: string): string {
  const n = servico.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("RENAVE"))                                                        return "RENAVE";
  if (n.includes("BAIXA"))                                                         return "Baixa de veículo";
  if (n.includes("INDICAC"))                                                       return "Indicação condutor";
  if (n.includes("ATPV") && (n.includes("ASS") || n.includes("COMUNICAC") || n.includes("VENDA"))) return "ATPV + ass + com";
  if (n.includes("COMUNICAC") && n.includes("VENDA"))                              return "ATPV + ass + com";
  if (n.includes("ATPV"))                                                          return "ATPV";
  if (n.includes("TRANSFER"))                                                      return "Transferência";
  if (n.includes("LICEN") && n.includes("BOLETO"))                                 return "Licen. boleto";
  if (n.includes("LICEN"))                                                         return "Licenciamento";
  if (n.includes("EMPLACAMENTO"))                                                  return "Primeiro emplacamento";
  if (/2[Aª]?\s*VIA|SEGUNDA.*VIA/.test(n))                                        return "2ª via CRV";
  if (n.includes("DEBITO") || n.includes("DIVIDA"))                                return "Pagamento débitos";
  if (n.includes("CERTIFICAD") || n.includes("PROCURA"))                           return "Certificado/procuração";
  if (n.includes("ALTERAC"))                                                       return "Alteração de dados";
  return "Outros";
}

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "mes",    label: "Mês" },
  { id: "trim",   label: "3 meses" },
  { id: "sem",    label: "6 meses" },
  { id: "ano",    label: "Ano atual" },
  { id: "ant",    label: "Ano ant." },
  { id: "custom", label: "Personalizado" },
];

const DASH_ABAS: Array<{ id: DashAba; label: string }> = [
  { id: "visao",       label: "Visão Geral" },
  { id: "semanal",     label: "Semanal" },
  { id: "setor",       label: "Setor Digital" },
  { id: "clientes",    label: "Por Clientes" },
  { id: "colaborador", label: "Por Colaborador" },
  { id: "metas",       label: "Calc. de Metas" },
  { id: "categorias",  label: "Categorias" },
  { id: "relatorio",   label: "Relatório" },
];

function hoje() { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() + 1 }; }
function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1).replace(".", ",")}K`;
  return R.format(v);
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

const R = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const N = new Intl.NumberFormat("pt-BR");

function Spinner({ size = 16 }: { size?: number }) {
  return <RefreshCw size={size} style={{ color: "#1a7d50", animation: "spin 1s linear infinite", display: "block", margin: "28px auto" }} />;
}

export default function DashConexao({
  onRelatorio,
  ocultarExplorador: _ocultarExplorador = false,
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

  // Full-year data for evolution charts (independe dos filtros)
  const [dadosFull, setDadosFull]       = useState<SgdwDados | null>(null);
  const [dadosAntFull, setDadosAntFull] = useState<SgdwDados | null>(null);
  const fullFetchedYearRef = useRef(0);

  // Period
  const [preset, setPreset]       = useState<Preset>("ano");
  const [anoInicio, setAnoInicio] = useState(() => hoje().ano);
  const [mesInicio, setMesInicio] = useState(1);
  const [anoFim, setAnoFim]       = useState(() => hoje().ano);
  const [mesFim, setMesFim]       = useState(12);

  // Dashboard UI
  const [dashAba, setDashAba]               = useState<DashAba>("visao");
  const [ocultarValores, setOcultarValores] = useState(false);
  const [metaAjuste, setMetaAjuste]         = useState(30);

  type CatAdj = { modo: "%" | "±" | "="; valor: number };
  const [metasCatAdj, setMetasCatAdj] = useState<Record<string, CatAdj>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("sgdw_metas_cat") ?? "{}") as Record<string, CatAdj>; }
    catch { return {}; }
  });
  const [metaTotalDistr, setMetaTotalDistr] = useState(0);

  // Collaborator data (loaded on connect and when period changes)
  const [colabData, setColabData]             = useState<ColabRow[]>([]);
  const [colabCarregando, setColabCarregando] = useState(false);
  const [colabErro, setColabErro]             = useState<string | null>(null);
  const colabPeriodoRef = useRef("");

  // Clients tab
  const [clientesData, setClientesData]             = useState<ClienteRow[]>([]);
  const [clientesTotal, setClientesTotal]           = useState(0);
  const [clientesBusca, setClientesBusca]           = useState("");
  const [clientesBuscaInput, setClientesBuscaInput] = useState("");
  const [clientesSortKey, setClientesSortKey]       = useState<"gasto"|"hon"|"os">("gasto");
  const [clientesSortDir, setClientesSortDir]       = useState<1|-1>(1); // 1=desc, -1=asc
  const [clientesCarregando, setClientesCarregando] = useState(false);

  // Employees tab
  const [funcionariosData, setFuncionariosData]             = useState<FuncRow[]>([]);
  const [funcionariosCarregando, setFuncionariosCarregando] = useState(false);
  const funcionariosCarregouRef = useRef(false);

  // Colaborador tab — filtro VER + serviços do colaborador selecionado + metas por categoria
  const [colabFiltro, setColabFiltro]   = useState<string>("");
  const [colabServicos, setColabServicos]             = useState<Array<{ codigo: number; servico: string; qtdOs: number; totalHon: number }>>([]);
  const [colabServicosCarregando, setColabServicosCarregando] = useState(false);
  const [catExpandidas, setCatExpandidas] = useState<Set<string>>(new Set());
  const [metasCategoria, setMetasCategoria] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("sgdw_meta_cat") ?? "{}") as Record<string, number>; }
    catch { return {}; }
  });

  // Semanal KPIs (legacy — mantidos para compatibilidade de tipos importados)
  const [osKpi, setOsKpi]             = useState<SgdwOsKpi | null>(null);
  const [caixaKpi, setCaixaKpi]       = useState<SgdwCaixaKpi | null>(null);
  const [kpiCarregando, setKpiCarregando] = useState(false);

  // Semanal tab — por mês independente do período global
  const [semanalAno, setSemanalAno]       = useState(() => hoje().ano);
  const [semanalMes, setSemanalMes]       = useState(() => hoje().mes);
  const [semanalDados, setSemanalDados]   = useState<SemanalMesData | null>(null);
  const [semanalCarregando, setSemanalCarregando] = useState(false);
  const semanalChaveRef = useRef("");

  // Colaborador semáforo — sempre mês corrente, independente do picker da aba Semanal
  const [colabSemDados, setColabSemDados] = useState<SemanalMesData | null>(null);
  const colabSemRef = useRef("");

  // Setor services
  const [setorServicos, setSetorServicos]     = useState<Array<{ descricao: string; qtdOs: number; totalHon: number; totalRec: number }>>([]);
  const [setorCarregando, setSetorCarregando] = useState(false);
  const setorCarregouRef = useRef(false);

  const montado    = useRef(false);
  const statusRef  = useRef<Status>("conectando");
  const periodoRef = useRef({ anoInicio, mesInicio, anoFim, mesFim });
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { periodoRef.current = { anoInicio, mesInicio, anoFim, mesFim }; }, [anoInicio, mesInicio, anoFim, mesFim]);

  const anoOpts = Array.from({ length: 8 }, (_, i) => hoje().ano - 7 + i);

  const emitirRelatorio = useCallback((d: SgdwDados, dAnt: SgdwDados | null) => {
    onRelatorio(sgdwParaRelatorio(d, dAnt));
  }, [onRelatorio]);

  const buscarDadosFull = useCallback(async (ano: number) => {
    if (fullFetchedYearRef.current === ano) return;
    fullFetchedYearRef.current = ano;
    try {
      const [full, fullAnt] = await Promise.all([
        buscarHonorariosSgdw(RELAY_CONFIG, ano,   ano,   1, 12),
        buscarHonorariosSgdw(RELAY_CONFIG, ano-1, ano-1, 1, 12),
      ]);
      setDadosFull(full); setDadosAntFull(fullAnt);
    } catch { fullFetchedYearRef.current = 0; }
  }, []);

  const buscarDados = useCallback(async (ai: number, mi: number, af: number, mf: number) => {
    setCarregando(true); setErro(null);
    try {
      const r = await buscarHonorariosSgdw(RELAY_CONFIG, ai, af, mi, mf);
      setDados(r); setStatus("conectado");
      const ano = r.periodos[r.periodos.length - 1]?.ano ?? hoje().ano;
      buscarDadosFull(ano);
      buscarHonorariosSgdw(RELAY_CONFIG, ai - 1, af - 1, mi, mf)
        .then(ant => { setDadosAnt(ant); emitirRelatorio(r, ant); })
        .catch(() => { setDadosAnt(null); emitirRelatorio(r, null); });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao buscar dados.";
      setErro(msg);
      if (/tunnel|indisponivel|desconectado|sem resposta|iniciar\.bat/i.test(msg) || /50[23]|404/.test(msg)) setStatus("erro");
    } finally { setCarregando(false); }
  }, [emitirRelatorio, buscarDadosFull]);

  const buscarDadosRef = useRef(buscarDados);
  useEffect(() => { buscarDadosRef.current = buscarDados; }, [buscarDados]);

  const autoConectar = useCallback(async (): Promise<boolean> => {
    setStatus("conectando"); setErro(null);
    try {
      const r = await fetch("/api/sgdw-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: "SELECT 1 AS PING FROM RDB$DATABASE" }),
        signal: AbortSignal.timeout(35000),
      });
      if (r.ok) { setStatus("conectado"); return true; }
      const d = await r.json().catch(() => ({})) as { error?: string };
      setErro(d.error ?? `Erro HTTP ${r.status}`); setStatus("erro"); return false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sem resposta.";
      setErro(/timed out|timeout/i.test(msg) ? "Sem resposta — aguardando conexão do SGDW." : msg);
      setStatus("erro"); return false;
    }
  }, []);

  const aplicarPreset = useCallback((p: Preset) => {
    if (p !== "custom") {
      const r = rangeFromPreset(p);
      setAnoInicio(r.ai); setMesInicio(r.mi); setAnoFim(r.af); setMesFim(r.mf);
      if (statusRef.current === "conectado") buscarDadosRef.current(r.ai, r.mi, r.af, r.mf);
    }
    setPreset(p);
  }, []);

  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    autoConectar().then(ok => { if (ok) { const r = rangeFromPreset("ano"); buscarDados(r.ai, r.mi, r.af, r.mf); } });
  }, [autoConectar, buscarDados]);

  useEffect(() => {
    if (status !== "conectado") return;
    const id = setInterval(() => { const p = periodoRef.current; buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "erro") return;
    let cancelado = false;
    const id = setInterval(async () => {
      if (cancelado) return;
      const ok = await autoConectar();
      if (ok && !cancelado) { const p = periodoRef.current; buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim); }
    }, 8_000);
    return () => { cancelado = true; clearInterval(id); };
  }, [status, autoConectar]);

  useEffect(() => {
    let source: EventSource | null = null; let ativo = true; let lastUrl: string | null = null;
    const abrir = () => {
      if (!ativo) return;
      try { source = new EventSource("https://beto-58a10-default-rtdb.firebaseio.com/sgdw-tunnel.json"); } catch { return; }
      const proc = (d: { url?: string } | null) => {
        if (!ativo || !d?.url || d.url === lastUrl) return;
        lastUrl = d.url;
        if (statusRef.current === "erro") autoConectar().then(ok => { if (ok) { const p = periodoRef.current; buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim); } });
      };
      source.addEventListener("put",   (ev: MessageEvent) => { try { proc((JSON.parse(ev.data) as { data?: { url?: string } }).data ?? null); } catch {} });
      source.addEventListener("patch", (ev: MessageEvent) => { try { proc((JSON.parse(ev.data) as { data?: { url?: string } }).data ?? null); } catch {} });
      source.onerror = () => { source?.close(); source = null; if (ativo) setTimeout(abrir, 8000); };
    };
    abrir();
    return () => { ativo = false; source?.close(); };
  }, [autoConectar]);

  useEffect(() => {
    let source: EventSource | null = null; let ativo = true; let lastAt: string | null = null;
    const abrir = () => {
      if (!ativo) return;
      try { source = new EventSource("https://beto-58a10-default-rtdb.firebaseio.com/sgdw-orders.json"); } catch { return; }
      const proc = (d: { generatedAt?: string } | null) => {
        if (!ativo || !d?.generatedAt || d.generatedAt === lastAt) return;
        lastAt = d.generatedAt;
        if (statusRef.current === "conectado") {
          setSyncToast(true); setTimeout(() => setSyncToast(false), 4000);
          const p = periodoRef.current; buscarDadosRef.current(p.anoInicio, p.mesInicio, p.anoFim, p.mesFim);
        }
      };
      source.addEventListener("put",   (ev: MessageEvent) => { try { proc((JSON.parse(ev.data) as { data?: { generatedAt?: string } }).data ?? null); } catch {} });
      source.addEventListener("patch", (ev: MessageEvent) => { try { proc((JSON.parse(ev.data) as { data?: { generatedAt?: string } }).data ?? null); } catch {} });
      source.onerror = () => { source?.close(); source = null; if (ativo) setTimeout(abrir, 15000); };
    };
    abrir();
    return () => { ativo = false; source?.close(); };
  }, []);

  // Lazy load: collaborator data (auto-loads when period/status changes)
  useEffect(() => {
    if (status !== "conectado" || !dados) return;
    const key = `${anoInicio}-${mesInicio}-${anoFim}-${mesFim}`;
    if (colabPeriodoRef.current === key) return;
    colabPeriodoRef.current = key;
    let cancelado = false;
    setColabCarregando(true);
    setColabErro(null);
    buscarColaboradoresHonorariosSgdw(RELAY_CONFIG, anoInicio, anoFim, mesInicio, mesFim)
      .then(r => {
        if (cancelado) return;
        setColabData(r.linhas.map(l => ({
          usunumer: Number(l.USUNUMER), nome: String(l.NOME ?? ""),
          qtdOs: Number(l.QTD_OS ?? 0), totalHon: Number(l.TOTAL_HON ?? 0),
        })));
      })
      .catch((e: unknown) => { if (!cancelado) { setColabErro(String(e instanceof Error ? e.message : e)); colabPeriodoRef.current = ""; } })
      .finally(() => { if (!cancelado) setColabCarregando(false); });
    return () => { cancelado = true; };
  }, [status, dados, anoInicio, mesInicio, anoFim, mesFim]);

  // Lazy load: clients
  useEffect(() => {
    if (dashAba !== "clientes" || status !== "conectado") return;
    let cancelado = false;
    setClientesCarregando(true);
    buscarClientesSgdw(RELAY_CONFIG, clientesBusca, anoInicio, mesInicio, anoFim, mesFim)
      .then(r => {
        if (cancelado) return;
        setClientesData(r.linhas.map(l => ({
          clinumer: Number(l.CLINUMER), nome: String(l.NOME ?? ""),
          documento: String(l.DOCUMENTO ?? ""),
          qtdOs: Number(l.QTD_OS ?? 0),
          totalGasto: Number(l.TOTAL_GASTO ?? 0),
          totalHon: Number(l.TOTAL_HON ?? 0),
        })));
        setClientesTotal(r.total);
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setClientesCarregando(false); });
    return () => { cancelado = true; };
  }, [dashAba, status, clientesBusca, anoInicio, mesInicio, anoFim, mesFim]);

  // Lazy load: employees
  useEffect(() => {
    if (dashAba !== "colaborador" || status !== "conectado" || funcionariosCarregouRef.current) return;
    funcionariosCarregouRef.current = true;
    setFuncionariosCarregando(true);
    buscarFuncionariosSgdw(RELAY_CONFIG, hoje().ano)
      .then(r => setFuncionariosData(r.linhas.map(l => ({ usunumer: Number(l.USUNUMER), nome: String(l.NOME ?? "") }))))
      .catch(() => { funcionariosCarregouRef.current = false; })
      .finally(() => setFuncionariosCarregando(false));
  }, [dashAba, status]);

  // Lazy load: setor
  useEffect(() => {
    if (dashAba !== "setor" || status !== "conectado" || setorCarregouRef.current) return;
    setorCarregouRef.current = true;
    setSetorCarregando(true);
    buscarServicosSgdw(RELAY_CONFIG)
      .then(r => setSetorServicos(r.linhas.map(l => ({
        descricao: String(l.DESCRICAO ?? ""), qtdOs: Number(l.QTD_OS ?? 0),
        totalHon: Number(l.TOTAL_HON ?? 0), totalRec: Number(l.TOTAL_REC ?? 0),
      }))))
      .catch(() => { setorCarregouRef.current = false; })
      .finally(() => setSetorCarregando(false));
  }, [dashAba, status]);

  // Lazy load: serviços do colaborador selecionado no filtro VER
  useEffect(() => {
    if (!colabFiltro || status !== "conectado") return;
    let cancelado = false;
    setColabServicosCarregando(true);
    buscarServicosColaboradorSgdw(RELAY_CONFIG, Number(colabFiltro), anoInicio, anoFim, mesInicio, mesFim)
      .then(r => { if (!cancelado) setColabServicos(r); })
      .catch(() => {})
      .finally(() => { if (!cancelado) setColabServicosCarregando(false); });
    return () => { cancelado = true; };
  }, [colabFiltro, status, anoInicio, mesInicio, anoFim, mesFim]);

  // Colaborador semáforo — sempre busca o mês corrente (não depende do picker da aba Semanal)
  useEffect(() => {
    if (dashAba !== "colaborador" || status !== "conectado") return;
    const h = hoje();
    const chave = `${h.ano}-${h.mes}`;
    if (colabSemRef.current === chave) return;
    colabSemRef.current = chave;
    let cancelado = false;
    buscarSemanalPorMesSgdw(RELAY_CONFIG, h.ano, h.mes)
      .then(d => { if (!cancelado) setColabSemDados(d); })
      .catch(() => { if (!cancelado) colabSemRef.current = ""; });
    return () => { cancelado = true; };
  }, [dashAba, status]);

  // Lazy load: semanal — por mês independente do período global
  useEffect(() => {
    if (dashAba !== "semanal" || status !== "conectado") return;
    const chave = `${semanalAno}-${semanalMes}`;
    if (semanalChaveRef.current === chave) return;
    semanalChaveRef.current = chave;
    let cancelado = false;
    setSemanalCarregando(true);
    buscarSemanalPorMesSgdw(RELAY_CONFIG, semanalAno, semanalMes)
      .then(d => { if (!cancelado) setSemanalDados(d); })
      .catch(() => { if (!cancelado) { semanalChaveRef.current = ""; } })
      .finally(() => { if (!cancelado) setSemanalCarregando(false); });
    return () => { cancelado = true; };
  }, [dashAba, status, semanalAno, semanalMes]);

  // ── Computed ──────────────────────────────────────────────────────
  const anoAtual = dados?.periodos[dados.periodos.length - 1]?.ano ?? hoje().ano;
  const anoAnt   = dadosAnt?.periodos[0]?.ano ?? anoAtual - 1;

  const evolucaoAnoFull = useMemo(() => {
    const src  = dadosFull    ?? dados;
    const srcA = dadosAntFull ?? dadosAnt;
    const m = new Map<number, { mes: string; hon2025: number; os2025: number; hon2026: number; os2026: number }>();
    for (const p of srcA?.periodos ?? []) m.set(p.mes, { mes: ML[p.mes-1], hon2025: p.honorarios, os2025: p.quantidade, hon2026: 0, os2026: 0 });
    for (const p of src?.periodos ?? []) {
      const ex = m.get(p.mes);
      if (ex) { ex.hon2026 = p.honorarios; ex.os2026 = p.quantidade; }
      else m.set(p.mes, { mes: ML[p.mes-1], hon2025: 0, os2025: 0, hon2026: p.honorarios, os2026: p.quantidade });
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [dados, dadosAnt, dadosFull, dadosAntFull]);

  const servicosSorted   = useMemo(() => [...(dados?.servicos ?? [])].sort((a, b) => b.honorarios - a.honorarios), [dados]);
  const ticketMedio      = dados && dados.totalQuantidade > 0 ? dados.totalHonorarios / dados.totalQuantidade : 0;
  const ultimoMes        = dados?.periodos[dados.periodos.length - 1];
  const mesAntCorr       = dadosAnt?.periodos.find(p => p.mes === ultimoMes?.mes);
  const metaMensal       = mesAntCorr ? mesAntCorr.honorarios * (1 + metaAjuste / 100) : null;
  const realizadoMes     = ultimoMes?.honorarios ?? 0;
  const pctMetaMensal    = metaMensal && metaMensal > 0 ? realizadoMes / metaMensal : null;
  const totalAnt         = dadosAnt?.totalHonorarios ?? 0;
  const metaAnual        = totalAnt > 0 ? totalAnt * (1 + metaAjuste / 100) : 0;
  const pctMetaAnual     = metaAnual > 0 ? (dados?.totalHonorarios ?? 0) / metaAnual : null;
  const mesAtualNum      = hoje().mes;
  const esperadoAteAgui  = metaAnual > 0 ? metaAnual * (mesAtualNum / 12) : 0;
  const ritmoAnual       = esperadoAteAgui > 0 ? ((dados?.totalHonorarios ?? 0) / esperadoAteAgui) * 100 : 0;
  const faltaMes         = metaMensal && realizadoMes < metaMensal ? metaMensal - realizadoMes : 0;

  const badgeMensal = pctMetaMensal === null ? null
    : pctMetaMensal >= 1   ? { label: "Atingida!",     bg: "#e0f5ea", color: "#1a7d50", icon: "🟢" }
    : pctMetaMensal >= 0.8 ? { label: "Perto do ritmo", bg: "#fff8e0", color: "#b07000", icon: "🟡" }
    : { label: "Abaixo", bg: "#fde8e8", color: "#c0392b", icon: "🔴" };

  const badgeAnual = pctMetaAnual === null ? null
    : pctMetaAnual >= 1   ? { label: "Atingida!",     bg: "#e0f5ea", color: "#1a7d50", icon: "🟢" }
    : pctMetaAnual >= 0.8 ? { label: "Perto do ritmo", bg: "#fff8e0", color: "#b07000", icon: "🟡" }
    : { label: "Abaixo", bg: "#fde8e8", color: "#c0392b", icon: "🔴" };

  const topColabHon  = colabData[0] ?? null;
  const topColabOs   = colabData.length > 0 ? [...colabData].sort((a, b) => b.qtdOs - a.qtdOs)[0] : null;
  const colabGrafico   = useMemo(() => [...colabData].sort((a, b) => b.totalHon - a.totalHon).slice(0, 10), [colabData]);
  const colabOsGrafico = useMemo(() => [...colabData].sort((a, b) => b.qtdOs - a.qtdOs).slice(0, 10), [colabData]);
  const periodoLabel   = `${ML[mesInicio-1]}/${String(anoInicio).slice(2)} – ${ML[mesFim-1]}/${String(anoFim).slice(2)}`;

  const metasPorServico = useMemo(() => {
    const antMap = new Map((dadosAnt?.servicos ?? []).map(s => [s.codigo, s]));
    return servicosSorted.map(s => {
      const ant = antMap.get(s.codigo);
      const base = ant?.honorarios ?? 0;
      const meta = base > 0 ? base * (1 + metaAjuste / 100) : 0;
      return { ...s, base, meta, pctMeta: meta > 0 ? s.honorarios / meta : 0 };
    }).filter(s => s.base > 0 || s.honorarios > 0);
  }, [servicosSorted, dadosAnt, metaAjuste]);

  const setorCategorias = useMemo(() => {
    const src = setorServicos.length > 0 ? setorServicos : servicosSorted.map(s => ({
      descricao: s.servico, qtdOs: s.quantidade, totalHon: s.honorarios, totalRec: s.recebido,
    }));
    const cats: Record<string, typeof src> = { "PF": [], "PJ": [], "Boleto / Digital": [], "Outros": [] };
    for (const s of src) {
      const n = s.descricao.toUpperCase();
      if (/\bPJ\b|JURÍDIC|JURIDIC|CNPJ|EMPRESA/.test(n)) cats["PJ"].push(s);
      else if (/BOLETO|PARCELAD|DIGITAL|ONLINE|MENSAL|ASSINA/.test(n)) cats["Boleto / Digital"].push(s);
      else cats["PF"].push(s);
    }
    return Object.entries(cats).map(([cat, servs]) => ({
      cat, servs: servs.sort((a, b) => b.totalHon - a.totalHon),
      totalHon: servs.reduce((a, b) => a + b.totalHon, 0),
      totalOs:  servs.reduce((a, b) => a + b.qtdOs, 0),
    })).filter(c => c.servs.length > 0);
  }, [setorServicos, servicosSorted]);

  const clientesTotalGasto = useMemo(() => dados?.totalRecebido ?? clientesData.reduce((a,b) => a + b.totalGasto, 0), [dados, clientesData]);
  const clientesTotalHon   = useMemo(() => dados?.totalHonorarios ?? clientesData.reduce((a,b) => a + b.totalHon, 0), [dados, clientesData]);
  const clientesTicket     = clientesTotal > 0 ? clientesTotalGasto / clientesTotal : 0;

  // ── Error/loading screen ──────────────────────────────────────────
  if (status !== "conectado" && dados === null) {
    return (
      <div style={{ background: "#fff", border: "1px solid #dce8e2", borderRadius: 12, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Database size={20} />
          <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Dashboard SGDW</h2>
          {status === "erro" && <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#d13b3b", fontWeight: 700 }}><WifiOff size={15} /> Sem conexão</span>}
        </div>
        {status === "conectando" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
            <RefreshCw size={18} style={{ color: "#1a7d50", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.84rem", color: "#888" }}>Conectando ao SGDW...</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#fdf3f2", padding: "10px 14px", borderRadius: 8, border: "1px solid #f0c0bc" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c0392b", margin: "0 0 6px" }}>SGDW sem resposta:</p>
              {erro?.split("\n").map((l, i) => <p key={i} style={{ fontSize: "0.75rem", color: "#7a3030", margin: "2px 0", fontFamily: "monospace" }}>✗ {l}</p>)}
              <p style={{ fontSize: "0.75rem", color: "#555", marginTop: 8, marginBottom: 0 }}>Abra o <strong>iniciar.bat</strong> no servidor SGDW.</p>
            </div>
            <button type="button" onClick={() => autoConectar().then(ok => { if (ok) { const r = rangeFromPreset("ano"); buscarDados(r.ai, r.mi, r.af, r.mf); } })}
              style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: "transparent", color: "#555", border: "1px solid #d0ddd6", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
              <RefreshCw size={13} /> Tentar novamente
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {syncToast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "#1a7d50", color: "#fff", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: "0.84rem", boxShadow: "0 4px 20px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", gap: 8, pointerEvents: "none" }}>
          <RefreshCw size={14} /> Dados atualizados automaticamente
        </div>
      )}

      {/* Header — glass */}
      <div style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16,
        padding: "14px 20px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
        border: "1px solid rgba(16,185,129,0.18)",
        boxShadow: "0 4px 24px rgba(16,185,129,0.08), 0 1px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 40,
            height: 40,
            background: "linear-gradient(135deg,#10b981,#059669)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: "1.1rem",
            color: "#fff",
            boxShadow: "0 2px 10px rgba(16,185,129,0.35)",
            flexShrink: 0,
          }}>B</div>

          {/* Name */}
          <div>
            <p style={{ margin: 0, fontSize: "0.62rem", color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Despachante</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>Beto Dehon</p>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Status pill */}
          <span style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: status === "conectado" ? "#059669" : "#f59e0b",
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: status === "conectado" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
            border: `1px solid ${status === "conectado" ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
            borderRadius: 20,
            padding: "4px 10px",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: status === "conectado" ? "#10b981" : "#f59e0b",
              boxShadow: status === "conectado" ? "0 0 0 3px rgba(16,185,129,0.2)" : "0 0 0 3px rgba(245,158,11,0.2)",
              flexShrink: 0,
            }} />
            {status === "conectado" ? "Conectado" : status === "conectando" ? "Conectando..." : "Sem conexão"}
          </span>

          {/* Hide values button */}
          <button
            type="button"
            onClick={() => setOcultarValores(v => !v)}
            style={{
              background: "rgba(15,23,42,0.05)",
              border: "1px solid rgba(15,23,42,0.1)",
              borderRadius: 8,
              padding: "5px 12px",
              color: "#334155",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "inherit",
              transition: "background .12s",
            }}
          >
            {ocultarValores ? <Eye size={12} /> : <EyeOff size={12} />}
            {ocultarValores ? "Mostrar" : "Ocultar valores"}
          </button>
        </div>
      </div>

      {status !== "conectado" && dados !== null && (
        <div style={{ background: "#fff", border: "1px solid #dce8e2", borderRadius: 10, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <RefreshCw size={13} style={{ color: "#1a7d50", animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: "0.8rem", color: "#888" }}>{status === "conectando" ? "Reconectando..." : "Sem conexão — tentando automaticamente..."}</span>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ background: "#fff", border: "1px solid #dce8e2", borderRadius: 12, padding: "10px 14px", marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", color: "#666", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><CalendarDays size={13} /> Período:</span>
        {PRESETS.map(p => (
          <button key={p.id} type="button" onClick={() => aplicarPreset(p.id)}
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.73rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", background: preset===p.id?"#1a7d50":"#f0f5f2", color: preset===p.id?"#fff":"#555", border: preset===p.id?"1px solid #1a7d50":"1px solid #d0ddd6" }}>
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <>
            <select value={mesInicio} onChange={e=>setMesInicio(Number(e.target.value))} style={{ padding:"4px 7px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.78rem" }}>{ML.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
            <select value={anoInicio} onChange={e=>setAnoInicio(Number(e.target.value))} style={{ padding:"4px 7px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.78rem" }}>{anoOpts.map(a=><option key={a} value={a}>{a}</option>)}</select>
            <span style={{ fontSize:"0.73rem", color:"#888" }}>até</span>
            <select value={mesFim} onChange={e=>setMesFim(Number(e.target.value))} style={{ padding:"4px 7px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.78rem" }}>{ML.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
            <select value={anoFim} onChange={e=>setAnoFim(Number(e.target.value))} style={{ padding:"4px 7px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.78rem" }}>{anoOpts.map(a=><option key={a} value={a}>{a}</option>)}</select>
          </>
        )}
        <button type="button" onClick={() => buscarDados(anoInicio, mesInicio, anoFim, mesFim)} disabled={carregando}
          style={{ padding:"4px 12px", borderRadius:6, background:"#1a7d50", color:"#fff", border:"none", fontWeight:700, fontSize:"0.73rem", cursor:"pointer", display:"flex", alignItems:"center", gap:4, opacity:carregando?0.6:1, marginLeft:"auto" }}>
          <RefreshCw size={11} style={{ animation:carregando?"spin 1s linear infinite":"none" }} />
          {carregando ? "Buscando..." : "Atualizar"}
        </button>
      </div>

      {/* Tab nav — glass */}
      <div style={{
        display: "flex",
        gap: 0,
        alignItems: "center",
        overflowX: "auto",
        marginBottom: 18,
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 12,
        border: "1px solid rgba(16,185,129,0.13)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
        padding: "4px 6px",
      }}>
        {DASH_ABAS.map(a => (
          <button key={a.id} type="button" onClick={() => setDashAba(a.id)}
            style={{
              padding: "7px 13px",
              background: dashAba === a.id ? "rgba(16,185,129,0.12)" : "transparent",
              border: "none",
              borderRadius: 8,
              fontWeight: dashAba === a.id ? 700 : 400,
              fontSize: "0.78rem",
              color: dashAba === a.id ? "#059669" : "#64748b",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all .15s",
              outline: dashAba === a.id ? "1px solid rgba(16,185,129,0.25)" : "none",
              fontFamily: "inherit",
            }}>
            {a.label}
          </button>
        ))}
        <button type="button" onClick={() => setDashAba("relatorio")}
          style={{
            marginLeft: "auto",
            padding: "6px 13px",
            borderRadius: 8,
            background: dashAba === "relatorio" ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
            color: "#059669",
            border: "1px solid rgba(16,185,129,0.2)",
            fontWeight: 700,
            fontSize: "0.74rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
            fontFamily: "inherit",
          }}>
          📋 Relatório
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ABA: VISÃO GERAL
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "visao" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* INDICADORES */}
          <section>
            <p style={{ margin:"0 0 8px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>
              INDICADORES – {periodoLabel}
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(168px, 1fr))", gap:10 }}>

              <div style={{ background:"#fff", border:"1px solid #e8e0c0", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #d4a017" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>🏅 HONORÁRIOS</p>
                <p style={{ margin:"0 0 1px", fontSize:"1.25rem", fontWeight:900, color:"#c47d00", fontVariantNumeric:"tabular-nums" }}>
                  {dados ? (ocultarValores?"••••":fmtShort(dados.totalHonorarios)) : "—"}
                </p>
                {dados && <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(dados.totalHonorarios)}</p>}
              </div>

              <div style={{ background:"#fff", border:"1px solid #c0d4e8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #2a7fc0" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>💱 VALORES TOTAIS</p>
                <p style={{ margin:"0 0 1px", fontSize:"1.25rem", fontWeight:900, color:"#1a5c9a", fontVariantNumeric:"tabular-nums" }}>
                  {dados ? (ocultarValores?"••••":fmtShort(dados.totalRecebido)) : "—"}
                </p>
                {dados && <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(dados.totalRecebido)}</p>}
              </div>

              <div style={{ background:"#fff", border:"1px solid #c0d4e8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #2a7fc0" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>📋 QTD. DE O.S.</p>
                <p style={{ margin:"0 0 1px", fontSize:"1.25rem", fontWeight:900, color:"#1a5c9a", fontVariantNumeric:"tabular-nums" }}>
                  {dados ? N.format(dados.totalQuantidade) : "—"}
                </p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>Ticket médio: {ticketMedio>0?(ocultarValores?"••••":R.format(ticketMedio)):"—"}</p>
              </div>

              <div style={{ background:"#fff", border:"1px solid #ddd0f5", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #7c3aed" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>🏆 TOP COLAB. (R$)</p>
                {colabCarregando ? <p style={{ margin:"0 0 1px", fontSize:"1.1rem", color:"#ddd" }}>...</p>
                  : topColabHon ? (
                    <>
                      <p style={{ margin:"0 0 1px", fontSize:"1.25rem", fontWeight:900, color:"#6d28d9" }}>{topColabHon.nome}</p>
                      <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":R.format(topColabHon.totalHon)}</p>
                    </>
                  ) : <p style={{ margin:0, fontSize:"0.8rem", color:"#ddd" }}>—</p>}
              </div>

              <div style={{ background:"#fff", border:"1px solid #f5d0e4", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #db2777" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>🏆 TOP COLAB. (O.S.)</p>
                {colabCarregando ? <p style={{ margin:"0 0 1px", fontSize:"1.1rem", color:"#ddd" }}>...</p>
                  : topColabOs ? (
                    <>
                      <p style={{ margin:"0 0 1px", fontSize:"1.25rem", fontWeight:900, color:"#be185d" }}>{topColabOs.nome}</p>
                      <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>{N.format(topColabOs.qtdOs)} O.S.</p>
                    </>
                  ) : <p style={{ margin:0, fontSize:"0.8rem", color:"#ddd" }}>—</p>}
              </div>
            </div>
          </section>

          {/* ACOMPANHAMENTO DE META */}
          <section>
            <p style={{ margin:"0 0 8px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>
              ACOMPANHAMENTO DE META — HONORÁRIOS
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {/* Meta Mensal */}
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 18px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <p style={{ margin:0, fontSize:"0.85rem", fontWeight:700, color:"#1a1a1a" }}>
                      Meta Mensal{ultimoMes ? ` · ${ML[ultimoMes.mes-1]}/${String(ultimoMes.ano).slice(2)}` : ""}
                    </p>
                    <p style={{ margin:"2px 0 0", fontSize:"0.65rem", color:"#aaa" }}>Meta = mesma mês de {anoAnt} + {metaAjuste}%</p>
                  </div>
                  {badgeMensal && (
                    <span style={{ padding:"3px 9px", borderRadius:6, fontSize:"0.7rem", fontWeight:700, background:badgeMensal.bg, color:badgeMensal.color, whiteSpace:"nowrap" }}>
                      {badgeMensal.icon} {badgeMensal.label}
                    </span>
                  )}
                </div>
                <p style={{ margin:"12px 0 2px", fontSize:"1.7rem", fontWeight:900, color:"#1a3d2b", fontVariantNumeric:"tabular-nums" }}>
                  {ocultarValores ? "••••" : fmtShort(realizadoMes)}
                </p>
                {metaMensal && <p style={{ margin:"0 0 8px", fontSize:"0.72rem", color:"#666" }}>Meta: {ocultarValores?"••••":R.format(metaMensal)}</p>}
                {metaMensal && (
                  <div style={{ height:7, background:"#f0f4f2", borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                    <div style={{ height:"100%", borderRadius:4, width:`${Math.min((pctMetaMensal??0)*100,100)}%`, background:(pctMetaMensal??0)>=1?"#1a7d50":(pctMetaMensal??0)>=0.8?"#e0a000":"#d13b3b", transition:"width 0.4s" }} />
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.7rem", flexWrap:"wrap", gap:2 }}>
                  <span style={{ color:(pctMetaMensal??0)>=1?"#1a7d50":(pctMetaMensal??0)>=0.8?"#b07000":"#c0392b", fontWeight:700 }}>
                    {pctMetaMensal!==null ? `${(pctMetaMensal*100).toFixed(1)}% da meta` : "—"}
                  </span>
                  {faltaMes > 0 && <span style={{ color:"#999" }}>Faltam {ocultarValores?"••••":R.format(faltaMes)} no mês</span>}
                  {faltaMes === 0 && (pctMetaMensal??0) >= 1 && <span style={{ color:"#1a7d50" }}>✓ Meta atingida!</span>}
                </div>
              </div>

              {/* Meta Anual */}
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 18px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <p style={{ margin:0, fontSize:"0.85rem", fontWeight:700, color:"#1a1a1a" }}>Meta Anual · {anoAtual}</p>
                    <p style={{ margin:"2px 0 0", fontSize:"0.65rem", color:"#aaa" }}>Meta = meses de {anoAnt} + {metaAjuste}% (acumulado)</p>
                  </div>
                  {badgeAnual && (
                    <span style={{ padding:"3px 9px", borderRadius:6, fontSize:"0.7rem", fontWeight:700, background:badgeAnual.bg, color:badgeAnual.color, whiteSpace:"nowrap" }}>
                      {badgeAnual.icon} {badgeAnual.label}
                    </span>
                  )}
                </div>
                <p style={{ margin:"12px 0 2px", fontSize:"1.7rem", fontWeight:900, color:"#1a3d2b", fontVariantNumeric:"tabular-nums" }}>
                  {ocultarValores ? "••••" : fmtShort(dados?.totalHonorarios ?? 0)}
                </p>
                {metaAnual > 0 && <p style={{ margin:"0 0 8px", fontSize:"0.72rem", color:"#666" }}>Meta: {ocultarValores?"••••":R.format(metaAnual)}</p>}
                {metaAnual > 0 && (
                  <div style={{ height:7, background:"#f0f4f2", borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                    <div style={{ height:"100%", borderRadius:4, width:`${Math.min((pctMetaAnual??0)*100,100)}%`, background:(pctMetaAnual??0)>=1?"#1a7d50":(pctMetaAnual??0)>=0.8?"#e0a000":"#d13b3b", transition:"width 0.4s" }} />
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.7rem", flexWrap:"wrap", gap:2 }}>
                  <span style={{ color:(pctMetaAnual??0)>=1?"#1a7d50":(pctMetaAnual??0)>=0.8?"#b07000":"#c0392b", fontWeight:700 }}>
                    {pctMetaAnual!==null ? `${(pctMetaAnual*100).toFixed(1)}% da meta` : "—"}
                  </span>
                  {esperadoAteAgui > 0 && (
                    <span style={{ color:"#999" }}>
                      Esperado até aqui ({mesAtualNum}/12 meses): {ocultarValores?"••••":R.format(esperadoAteAgui)} · ritmo {ritmoAnual.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, fontSize:"0.72rem", color:"#888" }}>
              <span>Ajuste:</span>
              <input type="range" min={0} max={100} value={metaAjuste} onChange={e=>setMetaAjuste(Number(e.target.value))} style={{ width:80, accentColor:"#1a7d50" }} />
              <span style={{ fontWeight:700, color:"#1a7d50", minWidth:28 }}>{metaAjuste}%</span>
              <span style={{ color:"#ccc" }}>acima de {anoAnt}</span>
            </div>
          </section>

          {/* EVOLUÇÃO MENSAL — ano cheio */}
          <section>
            <p style={{ margin:"0 0 8px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>
              EVOLUÇÃO MENSAL — {anoAnt} VS {anoAtual}
              <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}> (ano cheio — independe dos filtros)</span>
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 16px" }}>
                <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>Evolução Mensal — Honorários</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={evolucaoAnoFull} margin={{ top:4, right:4, bottom:0, left:0 }} barCategoryGap="25%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:10 }} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} width={48} />
                    <Tooltip formatter={(v: unknown) => R.format(Number(v))} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    <Bar dataKey="hon2025" name={String(anoAnt)}   fill="#93c5fd" radius={[2,2,0,0]} />
                    <Bar dataKey="hon2026" name={String(anoAtual)} fill="#16a34a" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 16px" }}>
                <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>Evolução Mensal — O.S.</p>
                <p style={{ margin:"0 0 6px", fontSize:"0.67rem", color:"#aaa" }}>Qtd. de O.S. por mês</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={evolucaoAnoFull} margin={{ top:4, right:4, bottom:0, left:0 }} barCategoryGap="25%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:10 }} width={38} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                    <Bar dataKey="os2025" name={String(anoAnt)}   fill="#93c5fd" radius={[2,2,0,0]} />
                    <Bar dataKey="os2026" name={String(anoAtual)} fill="#16a34a" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* POR COLABORADOR */}
          <section>
            <p style={{ margin:"0 0 8px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>
              POR COLABORADOR · {periodoLabel}
              {colabCarregando && <RefreshCw size={10} style={{ marginLeft:6, animation:"spin 1s linear infinite", verticalAlign:"middle" }} />}
            </p>
            {colabData.length === 0 && !colabCarregando ? (
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"20px", textAlign:"center" }}>
                {colabErro
                  ? <p style={{ color:"#e53e3e", fontSize:"0.75rem", margin:0, wordBreak:"break-all" }}>Erro: {colabErro}</p>
                  : <p style={{ color:"#ccc", fontSize:"0.8rem", margin:0 }}>Sem dados de colaboradores para o período selecionado</p>
                }
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 16px" }}>
                  <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>Honorários por Colaborador</p>
                  <p style={{ margin:"0 0 8px", fontSize:"0.67rem", color:"#aaa" }}>Filtra Colaborador/Setor/Período</p>
                  {colabCarregando ? <Spinner /> : (
                    <ResponsiveContainer width="100%" height={Math.max(180, colabGrafico.length * 28)}>
                      <BarChart layout="vertical" data={colabGrafico} margin={{ top:2, right:58, bottom:2, left:4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize:9 }} tickFormatter={v=>`R$${(v/1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="nome" tick={{ fontSize:10 }} width={58} />
                        <Tooltip formatter={(v: unknown) => R.format(Number(v))} />
                        <Bar dataKey="totalHon" name="Honorários" fill="#16a34a" radius={[0,3,3,0]}
                          label={{ position:"right", formatter:(v: unknown)=>`R$${(Number(v)/1000).toFixed(0)}K`, fontSize:9, fill:"#555" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 16px" }}>
                  <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>O.S. por Colaborador</p>
                  <p style={{ margin:"0 0 8px", fontSize:"0.67rem", color:"#aaa" }}>Filtra Colaborador/Setor/Período</p>
                  {colabCarregando ? <Spinner /> : (
                    <ResponsiveContainer width="100%" height={Math.max(180, colabOsGrafico.length * 28)}>
                      <BarChart layout="vertical" data={colabOsGrafico} margin={{ top:2, right:40, bottom:2, left:4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize:9 }} />
                        <YAxis type="category" dataKey="nome" tick={{ fontSize:10 }} width={58} />
                        <Tooltip />
                        <Bar dataKey="qtdOs" name="O.S." fill="#93c5fd" radius={[0,3,3,0]}
                          label={{ position:"right", formatter:(v: unknown)=>Number(v), fontSize:9, fill:"#555" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ABA: SEMANAL
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "semanal" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Filtro de mês — independente do período global */}
          <div style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"10px 16px", flexWrap:"wrap" }}>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.78rem", color:"#555", fontWeight:600 }}>
              VER:
              <select style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.78rem" }}>
                <option>Geral</option>
              </select>
            </label>
            <span style={{ color:"#d0ddd6" }}>|</span>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.78rem", color:"#555", fontWeight:600 }}>
              MÊS:
              <input
                type="month"
                value={`${semanalAno}-${pad2(semanalMes)}`}
                onChange={e => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  if (y && m) { setSemanalAno(y); setSemanalMes(m); semanalChaveRef.current = ""; }
                }}
                style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.78rem" }}
              />
            </label>
            <span style={{ fontSize:"0.72rem", color:"#888" }}>
              Semana a semana de {ML[semanalMes-1]}/{semanalAno} — fonte SGDW (independe do filtro de período). Dados em tempo real.
            </span>
          </div>

          {semanalCarregando && !semanalDados ? <Spinner /> : (
            <>
              {/* KPI Cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10 }}>
                {[
                  { emoji:"📋", label:"O.S. NO MÊS",  value: N.format(semanalDados?.totalOs ?? 0), sub:"soma das semanas", color:"#1a5c9a", border:"#2a7fc0" },
                  { emoji:"💰", label:"HONORÁRIOS",    value: ocultarValores?"••••":fmtShort(semanalDados?.totalHon ?? 0), sub: ocultarValores?"":R.format(semanalDados?.totalHon ?? 0), color:"#c47d00", border:"#d4a017" },
                  { emoji:"📊", label:"TICKET MÉDIO",  value: semanalDados && semanalDados.totalOs>0?(ocultarValores?"••••":R.format(semanalDados.totalHon/semanalDados.totalOs)):"—", sub:"honorário por O.S.", color:"#7c3aed", border:"#9333ea" },
                  { emoji:"🧾", label:"A RECEBER",     value: semanalDados?(ocultarValores?"••••":R.format(Math.max(0,semanalDados.totalHon-semanalDados.totalRec))):"—", sub:"honorários pendentes", color:"#1a7d50", border:"#16a34a" },
                ].map(k => (
                  <div key={k.label} style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:10, padding:"14px 16px", borderTop:`3px solid ${k.border}` }}>
                    <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>{k.emoji} {k.label}</p>
                    <p style={{ margin:"0 0 1px", fontSize:"1.25rem", fontWeight:900, color:k.color, fontVariantNumeric:"tabular-nums" }}>{k.value}</p>
                    <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* METAS SEMANAIS & RITMO */}
              {semanalDados && (() => {
                const daysInMonth  = new Date(semanalAno, semanalMes, 0).getDate();
                const metaTotal    = Math.round(semanalDados.metaBase * (1 + metaAjuste / 100));
                const hoje_d       = new Date();
                const isMesAtual   = hoje_d.getFullYear() === semanalAno && hoje_d.getMonth()+1 === semanalMes;
                const diaHoje      = isMesAtual ? hoje_d.getDate() : 0;
                const pctTot       = metaTotal > 0 ? semanalDados.totalOs / metaTotal : 0;
                const esperado     = metaTotal > 0 && diaHoje > 0 ? Math.round(metaTotal * diaHoje / daysInMonth) : 0;
                const badgeTot     = metaTotal === 0 ? null
                  : pctTot >= 1   ? { label:"Atingida!",      bg:"#e0f5ea", color:"#1a7d50",  icon:"🟢" }
                  : pctTot >= 0.8 ? { label:"Perto do ritmo", bg:"#fff8e0", color:"#b07000",  icon:"🟡" }
                  :                 { label:"Um pouco abaixo", bg:"#fff8e0", color:"#b07000",  icon:"🟡" };

                return (
                  <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 20px" }}>
                    <p style={{ margin:"0 0 14px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>
                      METAS SEMANAIS & RITMO
                    </p>

                    {semanalDados.semanas.map(s => {
                      const weekDays  = s.diaFim - s.diaIni + 1;
                      const metaSem   = metaTotal > 0 ? Math.round(metaTotal * weekDays / daysInMonth) : 0;
                      const pct       = metaSem > 0 ? s.qtdOs / metaSem : 0;
                      const isFuture  = isMesAtual && s.diaIni > diaHoje;
                      const dotColor  = isFuture ? "#e0e0e0" : pct >= 1 ? "#16a34a" : "#e0a000";
                      const barColor  = isFuture ? "#f0f0f0" : pct >= 1 ? "#16a34a" : "#e0a000";

                      return (
                        <div key={s.semana} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
                          <div style={{ width:9, height:9, borderRadius:"50%", background:dotColor, flexShrink:0 }} />
                          <span style={{ fontSize:"0.72rem", fontWeight:600, color:"#555", minWidth:100, whiteSpace:"nowrap" }}>
                            Sem {s.semana} {pad2(s.diaIni)}/{pad2(semanalMes)}-{pad2(s.diaFim)}/{pad2(semanalMes)}
                          </span>
                          <div style={{ flex:1, height:14, background:"#f0f4f2", borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${isFuture?0:Math.min(pct*100,100)}%`, background:barColor, borderRadius:4, transition:"width 0.4s" }} />
                          </div>
                          <span style={{ fontSize:"0.72rem", color:"#666", minWidth:90, textAlign:"right", whiteSpace:"nowrap" }}>
                            {isFuture?"—":N.format(s.qtdOs)} / {metaSem>0?N.format(metaSem):"—"} OS
                          </span>
                          <span style={{ fontSize:"0.72rem", fontWeight:700, minWidth:50, textAlign:"right",
                            color: isFuture?"#aaa":pct>=1?"#16a34a":"#b07000" }}>
                            {isFuture ? "próxima semana" : `${Math.round(pct*100)}%`}
                          </span>
                        </div>
                      );
                    })}

                    <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #f0f4f2" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                        <div style={{ width:9, height:9, borderRadius:"50%", background:"transparent", flexShrink:0 }} />
                        <span style={{ fontSize:"0.72rem", fontWeight:700, color:"#555", minWidth:100 }}>Total no mês</span>
                        <div style={{ flex:1, height:14, background:"#f0f4f2", borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${Math.min(pctTot*100,100)}%`, background:"#e0a000", borderRadius:4 }} />
                        </div>
                        <span style={{ fontSize:"0.72rem", color:"#666", minWidth:90, textAlign:"right", whiteSpace:"nowrap" }}>
                          {N.format(semanalDados.totalOs)} / {metaTotal>0?N.format(metaTotal):"—"} OS
                        </span>
                        <span style={{ fontSize:"0.72rem", fontWeight:700, color:"#b07000", minWidth:50, textAlign:"right" }}>
                          {metaTotal>0?`${Math.round(pctTot*100)}%`:"—"}
                        </span>
                        {badgeTot && (
                          <span style={{ padding:"2px 9px", borderRadius:6, fontSize:"0.7rem", fontWeight:700, background:badgeTot.bg, color:badgeTot.color, flexShrink:0, whiteSpace:"nowrap" }}>
                            {badgeTot.icon} {badgeTot.label}
                          </span>
                        )}
                      </div>
                      {metaTotal > 0 && (
                        <>
                          <p style={{ margin:"2px 0 0 19px", fontSize:"0.7rem", color:"#888" }}>
                            Mês {N.format(semanalDados.totalOs)} de {N.format(metaTotal)} O.S. ({Math.round(pctTot*100)}%).
                            {esperado > 0 && ` Esperado até aqui (${diaHoje} dias): ${N.format(esperado)} — ${semanalDados.totalOs < esperado ? `faltam ${N.format(esperado-semanalDados.totalOs)} para o ritmo. ` : `${N.format(semanalDados.totalOs-esperado)} acima do ritmo. `}Restante para fechar o mês: ${N.format(Math.max(0,metaTotal-semanalDados.totalOs))} O.S.`}
                          </p>
                          {metaTotal > 0 && semanalDados.metaBase > 0 && (
                            <p style={{ margin:"2px 0 0 19px", fontSize:"0.68rem", color:"#bbb" }}>
                              Meta = mesmo mês {semanalAno-1} ({N.format(semanalDados.metaBase)} OS) + {metaAjuste}%. Ajuste no controle de Metas (aba Visão Geral).
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Gráfico + Tabela de serviços */}
              {semanalDados && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                  {/* Gráfico OS por semana vs Meta */}
                  <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 16px" }}>
                    <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>O.S. por semana vs Meta</p>
                    <p style={{ margin:"0 0 8px", fontSize:"0.67rem", color:"#aaa" }}>Barra = realizado · linha = meta semanal</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart
                        data={(() => {
                          const daysInMonth = new Date(semanalAno, semanalMes, 0).getDate();
                          const metaTotal   = Math.round(semanalDados.metaBase * (1 + metaAjuste / 100));
                          return semanalDados.semanas.map(s => ({
                            name: `Sem ${s.semana}`,
                            "OS realizadas": s.qtdOs,
                            "Meta semanal": metaTotal > 0 ? Math.round(metaTotal * (s.diaFim - s.diaIni + 1) / daysInMonth) : 0,
                          }));
                        })()}
                        margin={{ top:4, right:8, bottom:0, left:0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize:10 }} />
                        <YAxis tick={{ fontSize:10 }} width={36} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize:11 }} />
                        <Bar dataKey="OS realizadas" fill="#16a34a" radius={[3,3,0,0]} />
                        <Line type="monotone" dataKey="Meta semanal" stroke="#f59e0b" dot={{ r:4, fill:"#f59e0b" }} strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabela de serviços */}
                  <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 18px" }}>
                    <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>Serviços no mês</p>
                    <p style={{ margin:"0 0 10px", fontSize:"0.67rem", color:"#aaa" }}>Clique na categoria para ver os produtos (detalhe do relatório mensal)</p>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem" }}>
                      <thead>
                        <tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                          <th style={{ textAlign:"left",  padding:"5px 8px", fontWeight:700, color:"#555" }}>CATEGORIA</th>
                          <th style={{ textAlign:"right", padding:"5px 8px", fontWeight:700, color:"#555" }}>O.S.</th>
                          <th style={{ textAlign:"right", padding:"5px 8px", fontWeight:700, color:"#555" }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semanalDados.servicos.map(s => (
                          <tr key={s.descricao} style={{ borderBottom:"1px solid #f5f5f5" }}>
                            <td style={{ padding:"5px 8px", color:"#333" }}>· {s.descricao}</td>
                            <td style={{ padding:"5px 8px", textAlign:"right", color:"#555" }}>{N.format(s.qtdOs)}</td>
                            <td style={{ padding:"5px 8px", textAlign:"right", color:"#888" }}>
                              {semanalDados.totalOs > 0 ? `${((s.qtdOs/semanalDados.totalOs)*100).toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                        {semanalDados.servicos.length === 0 && (
                          <tr><td colSpan={3} style={{ padding:"16px", textAlign:"center", color:"#bbb" }}>Nenhum serviço</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DETALHE SEMANA A SEMANA */}
              {semanalDados && (() => {
                const daysInMonth = new Date(semanalAno, semanalMes, 0).getDate();
                const metaTotal   = Math.round(semanalDados.metaBase * (1 + metaAjuste / 100));
                const hoje_d      = new Date();
                const isMesAtual  = hoje_d.getFullYear()===semanalAno && hoje_d.getMonth()+1===semanalMes;

                return (
                  <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 18px" }}>
                    <p style={{ margin:"0 0 12px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>
                      Detalhe Semana a Semana
                    </p>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem" }}>
                        <thead>
                          <tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                            <th style={{ textAlign:"left",  padding:"6px 10px", fontWeight:700, color:"#555" }}>SEMANA</th>
                            <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>O.S.</th>
                            <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>HONORÁRIO</th>
                            <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>TICKET</th>
                            <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>CONTATOS</th>
                            <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>TEMPO MÉDIO</th>
                            <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>META SEM.</th>
                            <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>SALDO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {semanalDados.semanas.map((s, i) => {
                            const weekDays = s.diaFim - s.diaIni + 1;
                            const metaSem  = metaTotal > 0 ? Math.round(metaTotal * weekDays / daysInMonth) : 0;
                            const ticket   = s.qtdOs > 0 ? s.totalHon / s.qtdOs : 0;
                            const saldo    = metaSem > 0 ? s.qtdOs - metaSem : null;
                            const isFuture = isMesAtual && s.diaIni > hoje_d.getDate();
                            return (
                              <tr key={s.semana} style={{ borderBottom:"1px solid #f0f4f2", background:i%2===0?"#fff":"#fafcfb", opacity:isFuture?0.45:1 }}>
                                <td style={{ padding:"7px 10px", fontWeight:700, color:"#1a3d2b", whiteSpace:"nowrap" }}>
                                  {pad2(s.diaIni)}/{pad2(semanalMes)}-{pad2(s.diaFim)}/{pad2(semanalMes)}
                                </td>
                                <td style={{ padding:"7px 10px", textAlign:"right", color:"#333" }}>{isFuture?"—":N.format(s.qtdOs)}</td>
                                <td style={{ padding:"7px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#16a34a", fontWeight:600 }}>
                                  {isFuture?"—":(ocultarValores?"••••":R.format(s.totalHon))}
                                </td>
                                <td style={{ padding:"7px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#555" }}>
                                  {isFuture||ticket===0?"—":(ocultarValores?"••••":R.format(ticket))}
                                </td>
                                <td style={{ padding:"7px 10px", textAlign:"right", color:"#bbb" }}>—</td>
                                <td style={{ padding:"7px 10px", textAlign:"right", color:"#bbb" }}>—</td>
                                <td style={{ padding:"7px 10px", textAlign:"right", color:"#555" }}>{metaSem>0?N.format(metaSem):"—"}</td>
                                <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700,
                                  color: saldo===null||isFuture?"#bbb":saldo>=0?"#16a34a":"#ef4444" }}>
                                  {saldo===null||isFuture?"—":saldo>0?`+${N.format(saldo)}`:N.format(saldo)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ABA: SETOR DIGITAL
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "setor" && (() => {
        const normUp = (s: string) =>
          s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const getGrupo = (servico: string): string | null => {
          const n = normUp(servico);
          if (/LOGIST/.test(n)) return "Serviços mensais logistas";
          if (/MENSAL/.test(n) && /EMPRES/.test(n)) return "Honorário mensal empresas";
          if (/DIGITAL|PROCURA|CERTIFICADO|ASSINATURA/.test(n)) return "Serviços digitais";
          return null;
        };

        // Source data: full period for KPIs; full-year per-year for evolution/detail
        const sdGlobal = (dados?.rawLinhas ?? []).filter(l => getGrupo(l.SERVICO) !== null);
        const sd2026   = ((dadosFull    ?? dados)?.rawLinhas ?? []).filter(l => l.ANO === anoFim     && getGrupo(l.SERVICO) !== null);
        const sd2025   = ((dadosAntFull ?? dadosAnt)?.rawLinhas ?? []).filter(l => l.ANO === anoFim-1 && getGrupo(l.SERVICO) !== null);

        // For subscription/digital services there is no DETRAN pass-through, so ordvltot
        // (RECEBIDO) = the actual charge. Fall back to RECEBIDO when TBCAIXA gives 0.
        const effHon = (l: { HONORARIOS: number; RECEBIDO: number }) =>
          l.HONORARIOS > 0 ? l.HONORARIOS : l.RECEBIDO;

        // KPIs (full selected period)
        const totalHonSD  = sdGlobal.reduce((a, b) => a + effHon(b), 0);
        const totalRecSD  = sdGlobal.reduce((a, b) => a + b.RECEBIDO, 0);
        const totalOsSD   = sdGlobal.reduce((a, b) => a + b.QUANTIDADE, 0);
        const ticketSD    = totalOsSD > 0 ? totalHonSD / totalOsSD : 0;

        // Group totals
        const GRUPOS_SD = ["Serviços digitais", "Honorário mensal empresas", "Serviços mensais logistas"];
        const GRUPO_CLR: Record<string, string> = {
          "Serviços digitais":            "#7c3aed",
          "Honorário mensal empresas":    "#2a7fc0",
          "Serviços mensais logistas":    "#d4a017",
        };
        const grupoTotais = GRUPOS_SD.map(g => {
          const ls = sdGlobal.filter(l => getGrupo(l.SERVICO) === g);
          return { nome: g, hon: ls.reduce((a,b)=>a+effHon(b),0), rec: ls.reduce((a,b)=>a+b.RECEBIDO,0), os: ls.reduce((a,b)=>a+b.QUANTIDADE,0) };
        });

        // Monthly evolution (full years for comparison)
        const evolSD = Array.from({ length: 12 }, (_, i) => {
          const mes = i + 1;
          const h25 = sd2025.filter(l=>l.MES===mes).reduce((a,b)=>a+effHon(b),0);
          const o25 = sd2025.filter(l=>l.MES===mes).reduce((a,b)=>a+b.QUANTIDADE,0);
          const h26 = sd2026.filter(l=>l.MES===mes).reduce((a,b)=>a+effHon(b),0);
          const o26 = sd2026.filter(l=>l.MES===mes).reduce((a,b)=>a+b.QUANTIDADE,0);
          return { mes: ML[i], honAnt: h25, osAnt: o25, honAtual: h26, osAtual: o26 };
        });

        // Service detail table (year-over-year)
        type SDRow = { codigo: number; servico: string; grupo: string; honAnt: number; honAtual: number; osAtual: number };
        const sdMap = new Map<string, SDRow>();
        for (const l of sd2025) {
          const g = getGrupo(l.SERVICO)!;
          const k = String(l.CODIGO_SERVICO);
          const hon = effHon(l);
          const ex = sdMap.get(k);
          if (ex) ex.honAnt += hon;
          else sdMap.set(k, { codigo: l.CODIGO_SERVICO, servico: l.SERVICO, grupo: g, honAnt: hon, honAtual: 0, osAtual: 0 });
        }
        for (const l of sd2026) {
          const g = getGrupo(l.SERVICO)!;
          const k = String(l.CODIGO_SERVICO);
          const hon = effHon(l);
          const ex = sdMap.get(k);
          if (ex) { ex.honAtual += hon; ex.osAtual += l.QUANTIDADE; }
          else sdMap.set(k, { codigo: l.CODIGO_SERVICO, servico: l.SERVICO, grupo: g, honAnt: 0, honAtual: hon, osAtual: l.QUANTIDADE });
        }
        const servicosSD = Array.from(sdMap.values()).sort((a,b) => b.honAtual - a.honAtual);

        return (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Header */}
            <p style={{ margin:0, fontSize:"0.72rem", fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.06em" }}>
              SERVIÇOS MENSAIS &amp; DIGITAIS · {periodoLabel}{" "}
              <span style={{ fontWeight:400, color:"#bbb" }}>(fora dos demais indicadores)</span>
            </p>

            {/* KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(168px,1fr))", gap:10 }}>
              <div style={{ background:"#fff", border:"1px solid #e0d8f0", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #7c3aed" }}>
                <p style={{ margin:"0 0 4px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>HONORÁRIOS</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.3rem", fontWeight:900, color:"#6d28d9", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(totalHonSD)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(totalHonSD)}</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #f0e8c0", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #d4a017" }}>
                <p style={{ margin:"0 0 4px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>VALORES TOTAIS</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.3rem", fontWeight:900, color:"#a86800", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(totalRecSD)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(totalRecSD)}</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #c0d4e8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #2a7fc0" }}>
                <p style={{ margin:"0 0 4px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>QTD. DE O.S.</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.3rem", fontWeight:900, color:"#1a5c9a", fontVariantNumeric:"tabular-nums" }}>{N.format(totalOsSD)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>Ticket médio: {ticketSD>0?(ocultarValores?"••••":R.format(ticketSD)):"—"}</p>
              </div>
            </div>

            {/* POR GRUPO */}
            <div>
              <p style={{ margin:"0 0 8px", fontSize:"0.67rem", fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em" }}>POR GRUPO</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px,1fr))", gap:10 }}>
                {grupoTotais.map(g => (
                  <div key={g.nome} style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:10, padding:"14px 16px", borderTop:`3px solid ${GRUPO_CLR[g.nome]??'#888'}` }}>
                    <p style={{ margin:"0 0 6px", fontSize:"0.63rem", fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.05em" }}>{g.nome.toUpperCase()}</p>
                    <p style={{ margin:"0 0 2px", fontSize:"1.2rem", fontWeight:900, color:GRUPO_CLR[g.nome]??"#333", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(g.hon)}</p>
                    <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>{N.format(g.os)} OS · {ocultarValores?"••••":R.format(g.rec)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* EVOLUÇÃO MENSAL */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 18px" }}>
              <p style={{ margin:"0 0 12px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>
                EVOLUÇÃO MENSAL — {anoFim-1} VS {anoFim}
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div>
                  <p style={{ margin:"0 0 6px", fontSize:"0.65rem", fontWeight:600, color:"#888" }}>Honorários (serv. mensais + digitais)</p>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={evolSD} margin={{ top:2, right:4, bottom:0, left:0 }} barSize={7}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize:9 }} />
                      <YAxis tick={{ fontSize:9 }} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} width={32} />
                      <Tooltip formatter={(v: unknown) => R.format(Number(v))} />
                      <Legend wrapperStyle={{ fontSize:"0.65rem" }} />
                      <Bar dataKey="honAnt"   name={String(anoFim-1)} fill="#93c5fd" radius={[3,3,0,0]} />
                      <Bar dataKey="honAtual" name={String(anoFim)}   fill="#7c3aed" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p style={{ margin:"0 0 6px", fontSize:"0.65rem", fontWeight:600, color:"#888" }}>O.S. (qtd. por mês)</p>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={evolSD} margin={{ top:2, right:4, bottom:0, left:0 }} barSize={7}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize:9 }} />
                      <YAxis tick={{ fontSize:9 }} width={28} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize:"0.65rem" }} />
                      <Bar dataKey="osAnt"   name={String(anoFim-1)} fill="#93c5fd" radius={[3,3,0,0]} />
                      <Bar dataKey="osAtual" name={String(anoFim)}   fill="#16a34a" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* DETALHE POR SERVIÇO */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 18px" }}>
              <p style={{ margin:"0 0 10px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>DETALHE POR SERVIÇO</p>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem" }}>
                  <thead>
                    <tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                      <th style={{ textAlign:"left",  padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>SERVIÇO</th>
                      <th style={{ textAlign:"left",  padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>GRUPO</th>
                      <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>HON. {anoFim-1}</th>
                      <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>HON. {anoFim}</th>
                      <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>OS {anoFim}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicosSD.map((s, i) => (
                      <tr key={s.codigo || s.servico} style={{ borderBottom:"1px solid #f0f4f2", background:i%2===0?"#fff":"#fafcfb" }}>
                        <td style={{ padding:"6px 10px", color:"#333" }}>
                          {s.servico}{s.codigo>0 && <span style={{ color:"#bbb", fontSize:"0.68rem" }}> #{s.codigo}</span>}
                        </td>
                        <td style={{ padding:"6px 10px" }}>
                          <span style={{ padding:"2px 8px", borderRadius:10, background:`${GRUPO_CLR[s.grupo]??'#888'}22`, color:GRUPO_CLR[s.grupo]??"#888", fontSize:"0.67rem", fontWeight:600, whiteSpace:"nowrap" }}>
                            {s.grupo}
                          </span>
                        </td>
                        <td style={{ padding:"6px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#999" }}>{s.honAnt>0?(ocultarValores?"••••":R.format(s.honAnt)):"—"}</td>
                        <td style={{ padding:"6px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#1a3d2b", fontWeight:600 }}>{s.honAtual>0?(ocultarValores?"••••":R.format(s.honAtual)):"—"}</td>
                        <td style={{ padding:"6px 10px", textAlign:"right", color:"#555" }}>{s.osAtual>0?N.format(s.osAtual):"—"}</td>
                      </tr>
                    ))}
                    {servicosSD.length===0 && (
                      <tr><td colSpan={5} style={{ padding:"28px", textAlign:"center", color:"#bbb" }}>Sem dados de Serviços Mensais &amp; Digitais no período</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p style={{ margin:"10px 0 0", fontSize:"0.65rem", color:"#bbb", fontStyle:"italic" }}>
                Estes serviços foram retirados da Visão Geral, Evolução, Metas e Categorias para manter coerência com {anoFim-1}.
              </p>
            </div>

          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          ABA: POR CLIENTES
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "clientes" && (() => {
        const sortFn = (a: ClienteRow, b: ClienteRow) => {
          const va = clientesSortKey === "hon" ? a.totalHon : clientesSortKey === "os" ? a.qtdOs : a.totalGasto;
          const vb = clientesSortKey === "hon" ? b.totalHon : clientesSortKey === "os" ? b.qtdOs : b.totalGasto;
          return clientesSortDir * (vb - va);
        };
        const sorted = [...clientesData].sort(sortFn);

        const thSort = (key: "gasto"|"hon"|"os", label: string) => {
          const active = clientesSortKey === key;
          const arrow = active ? (clientesSortDir === 1 ? " ↓" : " ↑") : "";
          return (
            <th onClick={() => { if (active) setClientesSortDir(d => (d === 1 ? -1 : 1)); else { setClientesSortKey(key); setClientesSortDir(1); } }}
              style={{ textAlign:"right", padding:"7px 10px", fontWeight:700, color: active?"#1a7d50":"#1a3d2b", cursor:"pointer", userSelect:"none", whiteSpace:"nowrap" }}>
              {label}{arrow}
            </th>
          );
        };

        return (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Label */}
            <p style={{ margin:0, fontSize:"0.67rem", fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em" }}>
              CLIENTES · {periodoLabel}
            </p>

            {/* KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(168px,1fr))", gap:10 }}>
              <div style={{ background:"#fff", border:"1px solid #c0d4e8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #2a7fc0" }}>
                <p style={{ margin:"0 0 4px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>CLIENTES</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.3rem", fontWeight:900, color:"#1a5c9a", fontVariantNumeric:"tabular-nums" }}>{clientesCarregando?"…":N.format(clientesTotal)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>com O.S. no período</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #f0e8c0", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #d4a017" }}>
                <p style={{ margin:"0 0 4px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>VALOR GASTO TOTAL</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.3rem", fontWeight:900, color:"#a86800", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(clientesTotalGasto)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(clientesTotalGasto)}</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #d0e8d8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #16a34a" }}>
                <p style={{ margin:"0 0 4px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>HONORÁRIOS</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.3rem", fontWeight:900, color:"#15803d", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(clientesTotalHon)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(clientesTotalHon)}</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #e0d8f0", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #7c3aed" }}>
                <p style={{ margin:"0 0 4px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>TICKET MÉDIO/CLIENTE</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.3rem", fontWeight:900, color:"#6d28d9", fontVariantNumeric:"tabular-nums" }}>{clientesTicket>0?(ocultarValores?"••••":fmtShort(clientesTicket)):"—"}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>valor gasto médio/cliente</p>
              </div>
            </div>

            {/* Table card */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a3d2b" }}>
                    Ranking de Clientes{clientesBusca ? ` · "${clientesBusca}"` : ""}
                    {clientesCarregando && <RefreshCw size={12} style={{ marginLeft:6, animation:"spin 1s linear infinite", verticalAlign:"middle" }} />}
                  </p>
                  {clientesTotal > 0 && <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>{N.format(clientesTotal)} clientes (mostrando top {clientesData.length})</p>}
                </div>
                <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
                  <div style={{ position:"relative" }}>
                    <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"#aaa" }} />
                    <input type="text" value={clientesBuscaInput}
                      onChange={e => setClientesBuscaInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") setClientesBusca(clientesBuscaInput); }}
                      placeholder="Buscar por nome ou CPF/CNPJ..."
                      style={{ padding:"6px 10px 6px 28px", borderRadius:8, border:"1px solid #d0ddd6", fontSize:"0.77rem", width:230, boxSizing:"border-box" }} />
                  </div>
                  <button type="button" onClick={() => setClientesBusca(clientesBuscaInput)}
                    style={{ padding:"6px 12px", borderRadius:7, background:"#1a7d50", color:"#fff", border:"none", fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }}>Buscar</button>
                  {clientesBusca && <button type="button" onClick={() => { setClientesBusca(""); setClientesBuscaInput(""); }}
                    style={{ padding:"6px 10px", borderRadius:7, background:"#f0f5f2", color:"#555", border:"1px solid #d0ddd6", fontSize:"0.75rem", cursor:"pointer" }}>✕</button>}
                </div>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.77rem" }}>
                  <thead>
                    <tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                      <th style={{ textAlign:"center", padding:"7px 8px", fontWeight:700, color:"#1a3d2b", width:36 }}>#</th>
                      <th style={{ textAlign:"left",  padding:"7px 10px", fontWeight:700, color:"#1a3d2b" }}>CLIENTE</th>
                      <th style={{ textAlign:"left",  padding:"7px 10px", fontWeight:700, color:"#1a3d2b" }}>CPF/CNPJ</th>
                      {thSort("gasto", "VALOR GASTO")}
                      {thSort("hon",   "HONORÁRIOS")}
                      {thSort("os",    "QTD. O.S.")}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c, i) => (
                      <tr key={c.clinumer} style={{ borderBottom:"1px solid #f0f4f2", background:i%2===0?"#fff":"#fafcfb" }}>
                        <td style={{ padding:"6px 8px", textAlign:"center", color:"#999", fontSize:"0.7rem" }}>{i+1}</td>
                        <td style={{ padding:"6px 10px", color:"#222", fontWeight:600 }}>{c.nome}</td>
                        <td style={{ padding:"6px 10px", color:"#888", fontSize:"0.72rem", fontVariantNumeric:"tabular-nums" }}>{c.documento || "—"}</td>
                        <td style={{ padding:"6px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#16a34a", fontWeight:700 }}>{ocultarValores?"••••":R.format(c.totalGasto)}</td>
                        <td style={{ padding:"6px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#555" }}>{ocultarValores?"••••":R.format(c.totalHon)}</td>
                        <td style={{ padding:"6px 10px", textAlign:"right", color:"#555" }}>{N.format(c.qtdOs)}</td>
                      </tr>
                    ))}
                    {!clientesCarregando && clientesData.length === 0 && (
                      <tr><td colSpan={6} style={{ padding:"28px", textAlign:"center", color:"#bbb" }}>Nenhum cliente no período</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p style={{ margin:"10px 0 0", fontSize:"0.65rem", color:"#bbb", fontStyle:"italic" }}>
                Valor Gasto = soma do Vlr. O.S. (valor total do serviço) no período. Clique nos títulos para ordenar. Dados por transação (tolerância ~1-2% vs. totalizadores).
              </p>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          ABA: POR COLABORADOR
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "colaborador" && (() => {
        const colabSel     = colabFiltro ? colabData.find(c => String(c.usunumer) === colabFiltro) : null;
        const kpiHon       = colabSel ? colabSel.totalHon : dados?.totalHonorarios ?? 0;
        const kpiOs        = colabSel ? colabSel.qtdOs    : dados?.totalQuantidade ?? 0;
        const kpiTick      = kpiOs > 0 ? kpiHon / kpiOs : 0;
        const servicosBase = colabFiltro
          ? colabServicos
          : servicosSorted.map(s => ({ codigo: s.codigo, servico: s.servico, qtdOs: s.quantidade, totalHon: s.honorarios }));

        const PIE_COLORS: Record<string, string> = { "PJ":"#2a7fc0", "PF":"#16a34a", "Boleto / Digital":"#f59e0b", "Outros":"#aaa" };

        const atualizarMeta = (cat: string, val: number) => {
          setMetasCategoria(prev => {
            const next = { ...prev, [cat]: val };
            try { localStorage.setItem("sgdw_meta_cat", JSON.stringify(next)); } catch {}
            return next;
          });
        };

        return (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* VER selector */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#555" }}>VER:</span>
              <div style={{ position:"relative" }}>
                <select
                  value={colabFiltro}
                  onChange={e => { setColabFiltro(e.target.value); setColabServicos([]); }}
                  style={{ padding:"5px 28px 5px 10px", borderRadius:8, border:"1px solid #d0ddd6", fontSize:"0.8rem", appearance:"none", background:"#f9fbf9", cursor:"pointer", fontWeight:colabFiltro?"600":"400" }}>
                  <option value="">🏢 Toda a empresa</option>
                  {colabData.map(c => <option key={c.usunumer} value={String(c.usunumer)}>👤 {c.nome}</option>)}
                </select>
                <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:"0.65rem", color:"#aaa" }}>▾</span>
              </div>
              <span style={{ fontSize:"0.72rem", color:"#888" }}>
                Escopo: {colabSel ? colabSel.nome : "Toda a empresa"} · {periodoLabel}
              </span>
              {colabFiltro && (
                <button type="button" onClick={() => { setColabFiltro(""); setColabServicos([]); }}
                  style={{ marginLeft:"auto", padding:"4px 10px", borderRadius:6, background:"#f0f5f2", color:"#555", border:"1px solid #d0ddd6", fontSize:"0.72rem", cursor:"pointer" }}>
                  ✕ Limpar filtro
                </button>
              )}
            </div>

            {/* KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(168px, 1fr))", gap:10 }}>
              <div style={{ background:"#fff", border:"1px solid #e0d8f0", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #7c3aed" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>💰 HONORÁRIOS</p>
                <p style={{ margin:"0 0 1px", fontSize:"1.3rem", fontWeight:900, color:"#6d28d9", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(kpiHon)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(kpiHon)}</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #c0d4e8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #2a7fc0" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>📋 TOTAL DE O.S.</p>
                <p style={{ margin:"0 0 1px", fontSize:"1.3rem", fontWeight:900, color:"#1a5c9a", fontVariantNumeric:"tabular-nums" }}>{N.format(kpiOs)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>no escopo/período</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #d0e8d8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #16a34a" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>📊 TICKET MÉDIO</p>
                <p style={{ margin:"0 0 1px", fontSize:"1.3rem", fontWeight:900, color:"#15803d", fontVariantNumeric:"tabular-nums" }}>{kpiTick>0?(ocultarValores?"••••":R.format(kpiTick)):"—"}</p>
                {mesAntCorr && <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>alvo {ML[mesAntCorr.mes-1]}/{anoAnt}: {R.format(mesAntCorr.honorarios > 0 && mesAntCorr.quantidade > 0 ? mesAntCorr.honorarios/mesAntCorr.quantidade : 0)}</p>}
              </div>
              <div style={{ background:"#fff", border:"1px solid #e8d8a0", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #d4a017" }}>
                <p style={{ margin:"0 0 5px", fontSize:"0.67rem", fontWeight:700, color:"#888" }}>🎯 META DE O.S. ({ultimoMes?`${ML[ultimoMes.mes-1]}/${String(ultimoMes.ano).slice(2)}`:""})</p>
                <p style={{ margin:"0 0 1px", fontSize:"1.3rem", fontWeight:900, color:"#b07000", fontVariantNumeric:"tabular-nums" }}>{metaMensal?N.format(Math.round(metaMensal/Math.max(ticketMedio,1))):"—"}</p>
                {metaMensal && <p style={{ margin:0, fontSize:"0.67rem", color:"#bbb" }}>Realizado {N.format(dados?.totalQuantidade??0)} · {pctMetaMensal?`${((pctMetaMensal??0)*100).toFixed(0)}% da meta`:"—"}</p>}
              </div>
            </div>

            {/* Semáforo semanal — sempre mês corrente */}
            {colabSemDados && (() => {
              const h           = hoje();
              const daysInMonth = new Date(h.ano, h.mes, 0).getDate();
              const metaTot     = Math.round(colabSemDados.metaBase * (1 + metaAjuste / 100));
              const hoje_d      = new Date();
              return (
                <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:"0.75rem", fontWeight:700, color:"#555", whiteSpace:"nowrap" }}>
                    Semáforo semanal ({ML[h.mes-1]}/{h.ano}):
                  </span>
                  {colabSemDados.semanas.map(s => {
                    const weekDays = s.diaFim - s.diaIni + 1;
                    const metaSem  = metaTot > 0 ? Math.round(metaTot * weekDays / daysInMonth) : 0;
                    const pct      = metaSem > 0 ? s.qtdOs / metaSem : 0;
                    const isFuture = hoje_d.getFullYear()===h.ano && hoje_d.getMonth()+1===h.mes && s.diaIni > hoje_d.getDate();
                    const cor      = isFuture ? "#d0d0d0" : pct >= 1 ? "#16a34a" : pct >= 0.7 ? "#f59e0b" : "#ef4444";
                    return <div key={s.semana} title={`Sem ${s.semana}: ${N.format(s.qtdOs)}/${N.format(metaSem)} OS`} style={{ width:12, height:12, borderRadius:"50%", background:cor, cursor:"default", flexShrink:0 }} />;
                  })}
                  <span style={{ fontSize:"0.68rem", color:"#555", marginLeft:4 }}>🟢 bateu a meta · 🟡 ≥70% · 🔴 abaixo</span>
                </div>
              );
            })()}

            {/* SERVIÇOS POR CATEGORIA */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 18px" }}>
              <p style={{ margin:"0 0 12px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>Serviços por Categoria</p>
              {colabServicosCarregando ? <Spinner /> : (() => {
                const catMap = new Map<string, { hon: number; os: number; itens: typeof servicosBase }>();
                for (const s of servicosBase) {
                  const cat = getCategoria(s.servico);
                  const ex  = catMap.get(cat) ?? { hon: 0, os: 0, itens: [] };
                  ex.hon += s.totalHon; ex.os += s.qtdOs; ex.itens.push(s);
                  catMap.set(cat, ex);
                }
                const cats = Array.from(catMap.entries())
                  .sort((a, b) => b[1].hon - a[1].hon)
                  .map(([cat, d]) => ({ cat, hon: d.hon, os: d.os, itens: d.itens.sort((a, b) => b.totalHon - a.totalHon) }));
                if (cats.length === 0) return <p style={{ color:"#bbb", fontSize:"0.78rem", padding:"12px 0" }}>Sem dados</p>;
                return (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem" }}>
                      <thead>
                        <tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                          <th style={{ textAlign:"left",  padding:"6px 10px", fontWeight:700, color:"#555" }}>CATEGORIA</th>
                          <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>HONORÁRIO</th>
                          <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>QTD. O.S.</th>
                          <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>TICKET MÉDIO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cats.map(({ cat, hon, os, itens }) => {
                          const expanded = catExpandidas.has(cat);
                          const ticket   = os > 0 ? hon / os : 0;
                          return (
                            <React.Fragment key={cat}>
                              <tr
                                onClick={() => setCatExpandidas(prev => {
                                  const next = new Set(prev);
                                  if (next.has(cat)) next.delete(cat); else next.add(cat);
                                  return next;
                                })}
                                style={{ cursor:"pointer", borderTop:"1px solid #e8f0e8", background:"#fafcfb" }}
                              >
                                <td style={{ padding:"8px 10px", fontWeight:700, color:"#333" }}>
                                  <span style={{ display:"inline-block", width:14, fontSize:"0.65rem", color:"#888" }}>{expanded ? "▾" : "▸"}</span>
                                  {cat}
                                </td>
                                <td style={{ padding:"8px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#16a34a", fontWeight:700 }}>
                                  {ocultarValores ? "••••" : R.format(hon)}
                                </td>
                                <td style={{ padding:"8px 10px", textAlign:"right", color:"#555" }}>{N.format(os)}</td>
                                <td style={{ padding:"8px 10px", textAlign:"right", color:"#555" }}>
                                  {ticket > 0 ? (ocultarValores ? "••••" : R.format(ticket)) : "—"}
                                </td>
                              </tr>
                              {expanded && itens.map(s => (
                                <tr key={s.servico} style={{ background:"#fff", borderBottom:"1px solid #f4f8f4" }}>
                                  <td style={{ padding:"5px 10px 5px 30px", color:"#666", fontSize:"0.72rem" }}>
                                    · {s.servico}{s.codigo ? ` #${s.codigo}` : ""}
                                  </td>
                                  <td style={{ padding:"5px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#555", fontSize:"0.72rem" }}>
                                    {ocultarValores ? "••••" : R.format(s.totalHon)}
                                  </td>
                                  <td style={{ padding:"5px 10px", textAlign:"right", color:"#777", fontSize:"0.72rem" }}>{N.format(s.qtdOs)}</td>
                                  <td style={{ padding:"5px 10px", textAlign:"right", color:"#777", fontSize:"0.72rem" }}>
                                    {s.qtdOs > 0 ? (ocultarValores ? "••••" : R.format(s.totalHon / s.qtdOs)) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    <p style={{ margin:"8px 0 0", fontSize:"0.68rem", color:"#aaa" }}>Clique em uma categoria para expandir os produtos que a compõem.</p>
                  </div>
                );
              })()}
            </div>

            {/* META DE O.S. POR CATEGORIA */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 18px" }}>
              <p style={{ margin:"0 0 12px", fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>Meta de O.S. por Categoria</p>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem" }}>
                  <thead>
                    <tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                      <th style={{ textAlign:"left",  padding:"6px 10px", fontWeight:700, color:"#555" }}>CATEGORIA</th>
                      <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>O.S. REALIZADAS</th>
                      <th style={{ textAlign:"center", padding:"6px 10px", fontWeight:700, color:"#555" }}>META (O.S.)</th>
                      <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#555" }}>% DA META</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicosBase.map((s, i) => {
                      const meta = metasCategoria[s.servico] ?? 0;
                      const pct  = meta > 0 ? s.qtdOs / meta : 0;
                      return (
                        <tr key={s.servico} style={{ borderBottom:"1px solid #f0f4f2", background:i%2===0?"#fff":"#fafcfb" }}>
                          <td style={{ padding:"6px 10px", color:"#333", fontWeight:600 }}>{s.servico}</td>
                          <td style={{ padding:"6px 10px", textAlign:"right", color:"#555" }}>{N.format(s.qtdOs)}</td>
                          <td style={{ padding:"6px 8px", textAlign:"center" }}>
                            <input
                              type="number"
                              min={0}
                              placeholder="—"
                              value={meta || ""}
                              onChange={e => atualizarMeta(s.servico, Number(e.target.value))}
                              style={{ width:72, padding:"3px 6px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.75rem", textAlign:"center", color:"#333" }}
                            />
                          </td>
                          <td style={{ padding:"6px 10px", textAlign:"right" }}>
                            {meta > 0
                              ? <span style={{ padding:"2px 8px", borderRadius:4, fontSize:"0.7rem", fontWeight:700, background:pct>=1?"#e0f5ea":pct>=0.7?"#fff8e0":"#fde8e8", color:pct>=1?"#1a7d50":pct>=0.7?"#b07000":"#c0392b" }}>{(pct*100).toFixed(0)}%</span>
                              : <span style={{ color:"#bbb", fontSize:"0.7rem" }}>defina a meta</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ margin:"8px 0 0", fontSize:"0.68rem", color:"#aaa" }}>Digite a meta de O.S. de cada categoria — salva no navegador. A meta aqui é apenas de O.S.</p>
            </div>

            {/* Gráficos: Honorários por Colaborador + por Setor */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

              {/* Honorários por Colaborador (barras horizontais) */}
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 16px" }}>
                <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>Honorários por Colaborador</p>
                <p style={{ margin:"0 0 8px", fontSize:"0.67rem", color:"#aaa" }}>Todos os colaboradores no período</p>
                {colabCarregando ? <Spinner /> : (
                  <ResponsiveContainer width="100%" height={Math.max(180, colabGrafico.length * 28)}>
                    <BarChart layout="vertical" data={colabGrafico} margin={{ top:2, right:64, bottom:2, left:4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:9 }} tickFormatter={v=>`R$${(v/1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize:10 }} width={60} />
                      <Tooltip formatter={(v: unknown) => R.format(Number(v))} />
                      <Bar dataKey="totalHon" name="Honorários" fill="#16a34a" radius={[0,3,3,0]}
                        label={{ position:"right", formatter:(v:unknown)=>`R$${(Number(v)/1000).toFixed(0)}K`, fontSize:9, fill:"#555" }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Honorários por Setor (donut) */}
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 16px" }}>
                <p style={{ margin:"0 0 2px", fontSize:"0.82rem", fontWeight:700, color:"#1a1a1a" }}>Honorários por Setor</p>
                <p style={{ margin:"0 0 8px", fontSize:"0.67rem", color:"#aaa" }}>PF · PJ · Boleto</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={setorCategorias.filter(c => c.cat !== "Outros").map(c => ({ name: c.cat.replace(" / Digital",""), value: c.totalHon }))}
                      cx="40%" cy="50%"
                      innerRadius={64} outerRadius={108}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {setorCategorias.filter(c => c.cat !== "Outros").map(c => (
                        <Cell key={c.cat} fill={PIE_COLORS[c.cat] ?? "#aaa"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => R.format(Number(v))} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize:"0.75rem" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          ABA: CALC. DE METAS
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "metas" && (() => {
        // Exclude setor-digital services (same logic as getGrupo in the setor tab)
        const normUp = (s: string) => s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const isSD   = (sv: string) => {
          const n = normUp(sv);
          return /LOGIST|DIGITAL|PROCURA|CERTIFICADO|ASSINATURA/.test(n) || (/MENSAL/.test(n) && /EMPRES/.test(n));
        };

        // BASE = full-year previous year (2025), REALIZADO = current year (2026) within period
        const baseLines = ((dadosAntFull ?? dadosAnt)?.rawLinhas ?? []).filter(l => l.ANO === anoFim-1 && !isSD(l.SERVICO));
        const realLines = (dados?.rawLinhas ?? []).filter(l => l.ANO === anoFim && !isSD(l.SERVICO));

        const baseMap = new Map<string, number>();
        for (const l of baseLines) { const c = getCategoria(l.SERVICO); baseMap.set(c, (baseMap.get(c) ?? 0) + l.HONORARIOS); }
        const realMap = new Map<string, number>();
        for (const l of realLines) { const c = getCategoria(l.SERVICO); realMap.set(c, (realMap.get(c) ?? 0) + l.HONORARIOS); }

        const getMeta = (cat: string, base: number): number => {
          const adj = metasCatAdj[cat];
          if (!adj) return base * (1 + metaAjuste / 100);
          if (adj.modo === "±") return base + adj.valor;
          if (adj.modo === "=") return adj.valor;
          return base * (1 + adj.valor / 100);
        };

        const allCats = Array.from(new Set([...baseMap.keys(), ...realMap.keys()]));
        const rows = allCats.map(cat => {
          const base = baseMap.get(cat) ?? 0;
          const real = realMap.get(cat) ?? 0;
          const meta = getMeta(cat, base);
          return { cat, base, real, meta, pct: meta > 0 ? real / meta : 0 };
        }).sort((a, b) => b.base - a.base);

        const totBase = rows.reduce((s, r) => s + r.base, 0);
        const totMeta = rows.reduce((s, r) => s + r.meta, 0);
        const totReal = rows.reduce((s, r) => s + r.real, 0);
        const totPct  = totMeta > 0 ? totReal / totMeta : 0;

        const updateAdj = (cat: string, field: "modo"|"valor", val: unknown) =>
          setMetasCatAdj(prev => {
            const cur = prev[cat] ?? { modo: "%" as const, valor: metaAjuste };
            const next = { ...cur, [field]: val } as CatAdj;
            const all  = { ...prev, [cat]: next };
            try { localStorage.setItem("sgdw_metas_cat", JSON.stringify(all)); } catch {}
            return all;
          });

        const aplicarGlobal = () => {
          const next: Record<string, CatAdj> = {};
          for (const r of rows) next[r.cat] = { modo: "%", valor: metaAjuste };
          try { localStorage.setItem("sgdw_metas_cat", JSON.stringify(next)); } catch {}
          setMetasCatAdj(next);
        };

        const distribuir = () => {
          if (metaTotalDistr <= 0 || totBase <= 0) return;
          const next: Record<string, CatAdj> = {};
          for (const r of rows) next[r.cat] = { modo: "=", valor: Math.round(totBase > 0 ? (r.base / totBase) * metaTotalDistr * 100 : 0) / 100 };
          try { localStorage.setItem("sgdw_metas_cat", JSON.stringify(next)); } catch {}
          setMetasCatAdj(next);
        };

        const resetar = () => {
          setMetaAjuste(30); setMetasCatAdj({});
          try { localStorage.removeItem("sgdw_metas_cat"); } catch {}
        };

        const pctCor = (p: number) => p >= 1 ? "#16a34a" : p >= 0.7 ? "#d4a017" : "#ef4444";
        const btnSt  = (modo: string, cur: string) => ({
          padding:"3px 7px", borderRadius:5, border:"1px solid #d0ddd6",
          fontSize:"0.7rem", fontWeight:700 as const, cursor:"pointer" as const,
          background: cur === modo ? "#16a34a" : "#f6f8f6",
          color:      cur === modo ? "#fff"     : "#555",
        });

        return (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Title */}
            <p style={{ margin:0, fontSize:"0.65rem", fontWeight:700, color:"#888", letterSpacing:"0.07em", textTransform:"uppercase" }}>
              METAS POR CATEGORIA · {periodoLabel}
            </p>

            {/* Info + controls */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
              <p style={{ margin:0, fontSize:"0.75rem", color:"#555" }}>
                <strong>Base:</strong> Honorários reais de {anoFim-1} por categoria (sem serviços mensais e digitais). <strong>Realizado</strong> = {anoFim} no período selecionado.
              </p>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:"0.78rem", color:"#555" }}>Aumentar todas as metas em</span>
                <input type="number" value={metaAjuste} onChange={e => setMetaAjuste(Number(e.target.value))}
                  style={{ width:52, padding:"4px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.8rem", textAlign:"center" }} />
                <span style={{ fontSize:"0.78rem", color:"#555" }}>%</span>
                <button type="button" onClick={aplicarGlobal}
                  style={{ padding:"5px 12px", borderRadius:7, background:"#16a34a", color:"#fff", border:"none", fontWeight:700, fontSize:"0.78rem", cursor:"pointer" }}>
                  Aplicar
                </button>
                <span style={{ color:"#d0d0d0", margin:"0 2px" }}>|</span>
                <span style={{ fontSize:"0.78rem", color:"#555" }}>ou meta total (R$)</span>
                <input type="number" value={metaTotalDistr || ""} onChange={e => setMetaTotalDistr(Number(e.target.value))}
                  placeholder="R$ 0"
                  style={{ width:100, padding:"4px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.8rem", textAlign:"center" }} />
                <button type="button" onClick={distribuir}
                  style={{ padding:"5px 12px", borderRadius:7, background:"#d4a017", color:"#fff", border:"none", fontWeight:700, fontSize:"0.78rem", cursor:"pointer" }}>
                  Distribuir
                </button>
                <button type="button" onClick={resetar}
                  style={{ padding:"5px 12px", borderRadius:7, background:"#f0f5f2", color:"#555", border:"1px solid #d0ddd6", fontWeight:600, fontSize:"0.78rem", cursor:"pointer" }}>
                  ↺ Resetar (+30%)
                </button>
              </div>
            </div>

            {/* KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(168px, 1fr))", gap:10 }}>
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #555" }}>
                <p style={{ margin:"0 0 3px", fontSize:"0.6rem", fontWeight:700, color:"#888", textTransform:"uppercase" }}>BASE{anoFim-1} (TOTAL)</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.25rem", fontWeight:900, color:"#333", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(totBase)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#aaa" }}>real, sem serviços digitais</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #d0e8d8", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #16a34a" }}>
                <p style={{ margin:"0 0 3px", fontSize:"0.6rem", fontWeight:700, color:"#888", textTransform:"uppercase" }}>META {anoFim} (TOTAL)</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.25rem", fontWeight:900, color:"#16a34a", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(totMeta)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#aaa" }}>soma das metas</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:10, padding:"14px 16px", borderTop:"3px solid #1a5c9a" }}>
                <p style={{ margin:"0 0 3px", fontSize:"0.6rem", fontWeight:700, color:"#888", textTransform:"uppercase" }}>REALIZADO · {periodoLabel}</p>
                <p style={{ margin:"0 0 2px", fontSize:"1.25rem", fontWeight:900, color:"#333", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":fmtShort(totReal)}</p>
                <p style={{ margin:0, fontSize:"0.67rem", color:"#aaa", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"":R.format(totReal)}</p>
              </div>
              <div style={{ background:"#fff", border:"1px solid #fce8e8", borderRadius:10, padding:"14px 16px", borderTop:`3px solid ${pctCor(totPct)}` }}>
                <p style={{ margin:"0 0 3px", fontSize:"0.6rem", fontWeight:700, color:"#888", textTransform:"uppercase" }}>% DA META</p>
                <p style={{ margin:"0 0 6px", fontSize:"1.25rem", fontWeight:900, color:pctCor(totPct), fontVariantNumeric:"tabular-nums" }}>{(totPct*100).toFixed(1)}%</p>
                <div style={{ height:6, background:"#f0f0f0", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(totPct*100,100)}%`, background:pctCor(totPct), borderRadius:3, transition:"width .4s" }} />
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 18px" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
                  <thead>
                    <tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                      <th style={{ textAlign:"left",   padding:"7px 10px", fontWeight:700, color:"#555", whiteSpace:"nowrap" }}>CATEGORIA</th>
                      <th style={{ textAlign:"right",  padding:"7px 10px", fontWeight:700, color:"#555", whiteSpace:"nowrap" }}>BASE {anoFim-1}</th>
                      <th style={{ textAlign:"center", padding:"7px 10px", fontWeight:700, color:"#555", whiteSpace:"nowrap" }}>AJUSTE DA META</th>
                      <th style={{ textAlign:"right",  padding:"7px 10px", fontWeight:700, color:"#16a34a", whiteSpace:"nowrap" }}>META {anoFim}</th>
                      <th style={{ textAlign:"right",  padding:"7px 10px", fontWeight:700, color:"#555", whiteSpace:"nowrap", lineHeight:1.3 }}>
                        REALIZADO<br/><span style={{ fontWeight:400, fontSize:"0.65rem" }}>{periodoLabel}</span>
                      </th>
                      <th style={{ textAlign:"right",  padding:"7px 10px", fontWeight:700, color:"#555", whiteSpace:"nowrap" }}>% DA META</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const adj    = metasCatAdj[r.cat] ?? { modo: "%" as const, valor: metaAjuste };
                      const pc     = pctCor(r.pct);
                      return (
                        <tr key={r.cat} style={{ borderBottom:"1px solid #f0f4f2", background:i%2===0?"#fff":"#fafcfb" }}>
                          <td style={{ padding:"8px 10px", fontWeight:600, color:"#333" }}>{r.cat}</td>
                          <td style={{ padding:"8px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#555" }}>
                            {ocultarValores ? "••••" : R.format(r.base)}
                          </td>
                          <td style={{ padding:"8px 6px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:3, justifyContent:"center" }}>
                              <input type="number" value={adj.valor}
                                onChange={e => updateAdj(r.cat, "valor", Number(e.target.value))}
                                style={{ width:50, padding:"3px 5px", borderRadius:5, border:"1px solid #d0ddd6", fontSize:"0.75rem", textAlign:"center" }} />
                              <button type="button" onClick={() => updateAdj(r.cat, "modo", "%")} style={btnSt("%", adj.modo)}>%</button>
                              <button type="button" onClick={() => updateAdj(r.cat, "modo", "±")} style={btnSt("±", adj.modo)}>±</button>
                              <button type="button" onClick={() => updateAdj(r.cat, "modo", "=")} style={btnSt("=", adj.modo)}>=</button>
                            </div>
                          </td>
                          <td style={{ padding:"8px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#16a34a", fontWeight:700 }}>
                            {ocultarValores ? "••••" : R.format(r.meta)}
                          </td>
                          <td style={{ padding:"8px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#333" }}>
                            {ocultarValores ? "••••" : R.format(r.real)}
                          </td>
                          <td style={{ padding:"8px 10px", textAlign:"right" }}>
                            {r.meta > 0 ? (
                              <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"flex-end" }}>
                                <div style={{ width:55, height:5, background:"#f0f0f0", borderRadius:3, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${Math.min(r.pct*100,100)}%`, background:pc, borderRadius:3 }} />
                                </div>
                                <span style={{ fontWeight:700, color:pc, minWidth:34, textAlign:"right" }}>{(r.pct*100).toFixed(0)}%</span>
                              </div>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr><td colSpan={6} style={{ padding:"24px", textAlign:"center", color:"#bbb" }}>Sem dados. Aguarde carregar ou ajuste o período para incluir {anoFim-1}.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p style={{ margin:"10px 0 0", fontSize:"0.68rem", color:"#aaa" }}>
                % aumenta/reduz a base · ± soma/subtrai R$ · = define a meta total. O Realizado segue o filtro de Período.
              </p>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          ABA: CATEGORIAS
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "categorias" && (
        <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"16px 18px" }}>
          <h3 style={{ margin:"0 0 10px", fontSize:"0.85rem", fontWeight:700, color:"#1a3d2b" }}>Todos os Serviços</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {servicosSorted.map(s => (
              <div key={s.codigo} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:8, border:"1px solid #f0f4f2", background:"#fafcfb" }}>
                <div><p style={{ margin:0, fontSize:"0.8rem", fontWeight:600, color:"#333" }}>{s.servico}</p><p style={{ margin:0, fontSize:"0.68rem", color:"#aaa" }}>Cód. {s.codigo}</p></div>
                <div style={{ display:"flex", gap:18, textAlign:"right" }}>
                  <div><p style={{ margin:0, fontSize:"0.65rem", color:"#aaa" }}>Honorário</p><p style={{ margin:0, fontSize:"0.8rem", fontWeight:700, color:"#1a3d2b", fontVariantNumeric:"tabular-nums" }}>{ocultarValores?"••••":R.format(s.honorarios)}</p></div>
                  <div><p style={{ margin:0, fontSize:"0.65rem", color:"#aaa" }}>Qtd</p><p style={{ margin:0, fontSize:"0.8rem", color:"#555" }}>{N.format(s.quantidade)}</p></div>
                  <div><p style={{ margin:0, fontSize:"0.65rem", color:"#aaa" }}>Ticket</p><p style={{ margin:0, fontSize:"0.8rem", color:"#555" }}>{s.quantidade>0?(ocultarValores?"••••":R.format(s.honorarios/s.quantidade)):"—"}</p></div>
                </div>
              </div>
            ))}
            {servicosSorted.length===0 && <p style={{ color:"#bbb", fontSize:"0.8rem", textAlign:"center", padding:"24px 0" }}>Sem serviços</p>}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ABA: RELATÓRIO
      ════════════════════════════════════════════════════════════════ */}
      {dashAba === "relatorio" && (
        <div style={{ background:"#fff", border:"1px solid #dce8e2", borderRadius:12, padding:"20px" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:"0.85rem", fontWeight:700, color:"#1a3d2b" }}>Relatório</h3>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end", marginBottom:20 }}>
            <div>
              <label style={{ display:"block", fontSize:"0.72rem", color:"#666", marginBottom:4 }}>Início</label>
              <div style={{ display:"flex", gap:4 }}>
                <select value={mesInicio} onChange={e=>setMesInicio(Number(e.target.value))} style={{ padding:"6px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.8rem" }}>{ML.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
                <select value={anoInicio} onChange={e=>setAnoInicio(Number(e.target.value))} style={{ padding:"6px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.8rem" }}>{anoOpts.map(a=><option key={a} value={a}>{a}</option>)}</select>
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:"0.72rem", color:"#666", marginBottom:4 }}>Fim</label>
              <div style={{ display:"flex", gap:4 }}>
                <select value={mesFim} onChange={e=>setMesFim(Number(e.target.value))} style={{ padding:"6px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.8rem" }}>{ML.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
                <select value={anoFim} onChange={e=>setAnoFim(Number(e.target.value))} style={{ padding:"6px 8px", borderRadius:6, border:"1px solid #d0ddd6", fontSize:"0.8rem" }}>{anoOpts.map(a=><option key={a} value={a}>{a}</option>)}</select>
              </div>
            </div>
            <button type="button" onClick={()=>buscarDados(anoInicio,mesInicio,anoFim,mesFim)} disabled={carregando}
              style={{ padding:"7px 18px", borderRadius:7, background:"#1a7d50", color:"#fff", border:"none", fontWeight:700, fontSize:"0.8rem", cursor:"pointer", opacity:carregando?0.7:1 }}>Gerar</button>
            <button type="button" onClick={()=>window.print()}
              style={{ padding:"7px 18px", borderRadius:7, background:"#f0f5f2", color:"#1a3d2b", border:"1px solid #d0ddd6", fontWeight:700, fontSize:"0.8rem", cursor:"pointer" }}>🖨️ Imprimir</button>
          </div>
          {dados && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:8, marginBottom:16 }}>
                <div style={{ background:"#fafcfb", border:"1px solid #e8f0ec", borderRadius:8, padding:"10px 12px" }}><p style={{ margin:"0 0 4px", fontSize:"0.68rem", fontWeight:700, color:"#888" }}>💰 Honorários</p><p style={{ margin:0, fontSize:"1rem", fontWeight:900, color:"#c47d00" }}>{ocultarValores?"••••":R.format(dados.totalHonorarios)}</p></div>
                <div style={{ background:"#fafcfb", border:"1px solid #e8f0ec", borderRadius:8, padding:"10px 12px" }}><p style={{ margin:"0 0 4px", fontSize:"0.68rem", fontWeight:700, color:"#888" }}>📋 Total O.S.</p><p style={{ margin:0, fontSize:"1rem", fontWeight:900, color:"#1a5c9a" }}>{N.format(dados.totalQuantidade)}</p></div>
                <div style={{ background:"#fafcfb", border:"1px solid #e8f0ec", borderRadius:8, padding:"10px 12px" }}><p style={{ margin:"0 0 4px", fontSize:"0.68rem", fontWeight:700, color:"#888" }}>📊 Ticket</p><p style={{ margin:0, fontSize:"1rem", fontWeight:900, color:"#333" }}>{ticketMedio>0?(ocultarValores?"••••":R.format(ticketMedio)):"—"}</p></div>
                <div style={{ background:"#fafcfb", border:"1px solid #e8f0ec", borderRadius:8, padding:"10px 12px" }}><p style={{ margin:"0 0 4px", fontSize:"0.68rem", fontWeight:700, color:"#888" }}>🧾 Vlr. O.S.</p><p style={{ margin:0, fontSize:"1rem", fontWeight:900, color:"#555" }}>{ocultarValores?"••••":R.format(dados.totalRecebido)}</p></div>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.75rem" }}>
                  <thead><tr style={{ background:"#f6f8f6", borderBottom:"2px solid #e0e8e4" }}>
                    <th style={{ textAlign:"left", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>Serviço</th>
                    <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>Honorário</th>
                    <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>Qtd</th>
                    <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>Ticket</th>
                    <th style={{ textAlign:"right", padding:"6px 10px", fontWeight:700, color:"#1a3d2b" }}>Vlr. O.S.</th>
                  </tr></thead>
                  <tbody>
                    {servicosSorted.map((s,i) => (
                      <tr key={s.codigo} style={{ borderBottom:"1px solid #f0f4f2", background:i%2===0?"#fff":"#fafcfb" }}>
                        <td style={{ padding:"5px 10px", color:"#333" }}>{s.servico}</td>
                        <td style={{ padding:"5px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", fontWeight:600, color:"#1a3d2b" }}>{ocultarValores?"••••":R.format(s.honorarios)}</td>
                        <td style={{ padding:"5px 10px", textAlign:"right", color:"#555" }}>{N.format(s.quantidade)}</td>
                        <td style={{ padding:"5px 10px", textAlign:"right", color:"#555" }}>{s.quantidade>0?(ocultarValores?"••••":R.format(s.honorarios/s.quantidade)):"—"}</td>
                        <td style={{ padding:"5px 10px", textAlign:"right", color:"#555" }}>{ocultarValores?"••••":R.format(s.recebido)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ background:"#f0f5f2", fontWeight:700, borderTop:"2px solid #d0e0d8" }}>
                    <td style={{ padding:"7px 10px", color:"#1a3d2b" }}>Total</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", color:"#1a3d2b" }}>{ocultarValores?"••••":R.format(dados.totalHonorarios)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:"#1a3d2b" }}>{N.format(dados.totalQuantidade)}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:"#1a3d2b" }}>{ticketMedio>0?(ocultarValores?"••••":R.format(ticketMedio)):"—"}</td>
                    <td style={{ padding:"7px 10px", textAlign:"right", color:"#1a3d2b" }}>{ocultarValores?"••••":R.format(dados.totalRecebido)}</td>
                  </tr></tfoot>
                </table>
              </div>
              <p style={{ margin:"12px 0 0", fontSize:"0.68rem", color:"#aaa" }}>{ML[mesInicio-1]}/{anoInicio}–{ML[mesFim-1]}/{anoFim} · {dados.rawLinhas.length.toLocaleString("pt-BR")} grupos · {new Date(dados.geradoEm).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>
            </>
          )}
        </div>
      )}

      {dados && (
        <div style={{ marginTop:14, padding:"8px 12px", background:"#f6f8f6", borderRadius:8, fontSize:"0.68rem", color:"#aaa", display:"flex", gap:12, flexWrap:"wrap" }}>
          <span>Dashboard SGDW</span>
          <span>· {ML[mesInicio-1]}/{anoInicio}–{ML[mesFim-1]}/{anoFim}</span>
          {dadosAnt && <span>· Comp. {anoAnt}</span>}
          <span>· {new Date(dados.geradoEm).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
          {dados.truncado && <span style={{ color:"#b7580a" }}>⚠ Dados truncados</span>}
        </div>
      )}
    </div>
  );
}
