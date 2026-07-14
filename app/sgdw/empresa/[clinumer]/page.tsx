"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { buscarOsEmpresaMesSgdw } from "@/src/features/sgdw/client";
import type { SgdwConfig, SgdwPaginaDados } from "@/src/features/sgdw/types";

const DUMMY_CONFIG: SgdwConfig = { url: "", token: "" };

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function fmtData(v: unknown): string {
  if (!v) return "-";
  const s = String(v);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR");
}

function fmtNum(v: unknown): string {
  const n = Number(v ?? 0);
  return isNaN(n) ? "0,00" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

// ─── Print styles (injected in <head> via useEffect) ──────────────────────────

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #planilha-impressao, #planilha-impressao * { visibility: visible !important; }
  #planilha-impressao {
    position: fixed !important;
    inset: 0 !important;
    background: #fff !important;
    padding: 12mm 10mm !important;
    font-family: Arial, sans-serif !important;
    font-size: 9pt !important;
    z-index: 99999 !important;
  }
  #planilha-impressao table {
    border-collapse: collapse !important;
    width: 100% !important;
  }
  #planilha-impressao th,
  #planilha-impressao td {
    border: 1px solid #444 !important;
    padding: 3px 5px !important;
    font-size: 8pt !important;
  }
  #planilha-impressao th {
    background: #1a5c34 !important;
    color: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  #planilha-impressao .row-total {
    background: #f0faf4 !important;
    font-weight: bold !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;

export default function EmpresaPlanilhaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const clinumer = Number(params?.clinumer ?? 0);
  const nomeParam = searchParams?.get("nome") ?? `Empresa #${clinumer}`;
  const tierParam = searchParams?.get("tier") ?? "";

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1-12

  const [dados, setDados] = useState<SgdwPaginaDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  // Inject print CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "empresa-print-css";
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    return () => { document.getElementById("empresa-print-css")?.remove(); };
  }, []);

  const buscar = useCallback(async () => {
    if (!clinumer) return;
    setCarregando(true); setErro(null);
    try {
      const r = await buscarOsEmpresaMesSgdw(DUMMY_CONFIG, clinumer, ano, mes);
      if (montado.current) setDados(r);
    } catch (e) {
      if (montado.current) setErro(e instanceof Error ? e.message : "Erro ao buscar dados");
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, [clinumer, ano, mes]);

  useEffect(() => { buscar(); }, [buscar]);

  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }
  function mesSeguinte() {
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }

  // Totals
  const totHon = dados?.linhas.reduce((s, r) => s + Number(r.HONORARIOS ?? 0), 0) ?? 0;
  const totRec = dados?.linhas.reduce((s, r) => s + Number(r.RECEBIDO ?? 0), 0) ?? 0;
  const totSaldo = totHon - totRec;

  const titulo = `PLANILHA ${nomeParam.toUpperCase()} - REF. SERVIÇOS PRESTADOS ${MESES[mes - 1].toUpperCase()}/${ano}`;

  return (
    <div style={{ minHeight: "100vh", background: "#f7faf8", fontFamily: "system-ui, Arial, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ background: "#1a5c34", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => router.back()}
          style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 5 }}>
          ← Voltar
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {tierParam} Empresa / Planilha Mensal
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>{nomeParam}</div>
        </div>
        <button type="button" onClick={() => window.print()}
          style={{ padding: "7px 16px", borderRadius: 8, background: "#fff", color: "#1a5c34", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}>
          🖨️ Imprimir / Exportar PDF
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px" }}>

        {/* Month selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <button type="button" onClick={mesAnterior}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #c4d8c8", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>
            ‹
          </button>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MESES.map((m, i) => {
              const ativo = mes === i + 1;
              return (
                <button key={m} type="button" onClick={() => setMes(i + 1)}
                  style={{ padding: "5px 10px", borderRadius: 20, border: ativo ? "2px solid #1a5c34" : "1px solid #d0ddd6", background: ativo ? "#1a5c34" : "#fff", color: ativo ? "#fff" : "#374151", fontWeight: ativo ? 700 : 400, cursor: "pointer", fontSize: "0.72rem", transition: "all 0.12s" }}>
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={mesSeguinte}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #c4d8c8", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>
            ›
          </button>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="button" onClick={() => setAno(a => a - 1)}
              style={{ padding: "4px 9px", borderRadius: 6, border: "1px solid #d0ddd6", background: "#fff", cursor: "pointer", fontWeight: 700 }}>−</button>
            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1a5c34", minWidth: 44, textAlign: "center" }}>{ano}</span>
            <button type="button" onClick={() => setAno(a => a + 1)}
              style={{ padding: "4px 9px", borderRadius: 6, border: "1px solid #d0ddd6", background: "#fff", cursor: "pointer", fontWeight: 700 }}>+</button>
          </div>

          {carregando && (
            <span style={{ fontSize: "0.72rem", color: "#888" }}>Carregando...</span>
          )}
          {dados && !carregando && (
            <span style={{ fontSize: "0.72rem", color: "#7a9a84", marginLeft: "auto" }}>
              {dados.total} OS encontradas · {MESES[mes - 1]} {ano}
            </span>
          )}
        </div>

        {/* Error */}
        {erro && (
          <div style={{ background: "#fdf3f2", border: "1px solid #f0c0bc", borderRadius: 8, padding: "10px 14px", fontSize: "0.78rem", color: "#c0392b", marginBottom: 14, whiteSpace: "pre-wrap" }}>
            {erro}
          </div>
        )}

        {/* Planilha */}
        {dados && (
          <div id="planilha-impressao" style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", overflow: "hidden" }}>

            {/* Title */}
            <div style={{ background: "#1a5c34", color: "#fff", padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.03em" }}>{titulo}</div>
            </div>

            {/* KPI summary bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "2px solid #e5f0e8" }}>
              {[
                { label: "Total Honorários", valor: moeda.format(totHon), cor: "#1a5c34" },
                { label: "Total Recebido",   valor: moeda.format(totRec), cor: "#2563eb" },
                { label: "A Receber",        valor: moeda.format(totSaldo), cor: totSaldo > 0 ? "#c0392b" : "#1a5c34" },
              ].map(k => (
                <div key={k.label} style={{ padding: "8px 14px", textAlign: "center", borderRight: "1px solid #e5f0e8" }}>
                  <div style={{ fontSize: "0.58rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: k.cor }}>{k.valor}</div>
                </div>
              ))}
            </div>

            {dados.linhas.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#888", fontSize: "0.78rem" }}>
                Nenhuma OS encontrada para {MESES[mes - 1]}/{ano}.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.73rem" }}>
                  <thead>
                    <tr style={{ background: "#1a5c34", color: "#fff" }}>
                      {["OS.", "DATA", "SERVIÇO", "PLACA", "RENAVAM", "CLIENTE", "HONORÁRIOS", "RECEBIDO", "SALDO"].map(h => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: h === "OS." ? "center" : "left", fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.linhas.map((row, i) => {
                      const hon = Number(row.HONORARIOS ?? 0);
                      const rec = Number(row.RECEBIDO ?? 0);
                      const saldo = hon - rec;
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f7faf8", borderBottom: "1px solid #e8f0e9" }}>
                          <td style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: "#1a5c34", fontFamily: "monospace", fontSize: "0.7rem" }}>
                            {String(row.ORDNUMER ?? "")}
                          </td>
                          <td style={{ padding: "6px 10px", whiteSpace: "nowrap", color: "#374151" }}>
                            {fmtData(row.DATA)}
                          </td>
                          <td style={{ padding: "6px 10px", color: "#374151", maxWidth: 180 }}>
                            {String(row.SERVICO ?? "-")}
                          </td>
                          <td style={{ padding: "6px 10px", fontWeight: 700, fontFamily: "monospace", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
                            {String(row.PLACA ?? "-")}
                          </td>
                          <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: "0.68rem", color: "#6b7280" }}>
                            {String(row.RENAVAM ?? "-")}
                          </td>
                          <td style={{ padding: "6px 10px", color: "#374151" }}>
                            {String(row.CLIENTE ?? "-")}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: "#1a5c34", whiteSpace: "nowrap" }}>
                            {fmtNum(row.HONORARIOS)}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: "#2563eb", whiteSpace: "nowrap" }}>
                            {fmtNum(row.RECEBIDO)}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: saldo > 0 ? "#c0392b" : "#1a5c34", whiteSpace: "nowrap" }}>
                            {fmtNum(saldo)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Totals row */}
                    <tr className="row-total" style={{ background: "#e8f5ed", borderTop: "2px solid #1a5c34", fontWeight: 800 }}>
                      <td colSpan={6} style={{ padding: "7px 10px", color: "#1a5c34", fontSize: "0.72rem", letterSpacing: "0.03em" }}>
                        TOTAL — {dados.total} Ordens de Serviço · {MESES[mes - 1].toUpperCase()}/{ano}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: "#1a5c34", whiteSpace: "nowrap" }}>
                        {fmtNum(totHon)}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: "#2563eb", whiteSpace: "nowrap" }}>
                        {fmtNum(totRec)}
                      </td>
                      <td style={{ padding: "7px 10px", textAlign: "right", color: totSaldo > 0 ? "#c0392b" : "#1a5c34", whiteSpace: "nowrap" }}>
                        {fmtNum(totSaldo)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer for print */}
            <div style={{ padding: "8px 16px", fontSize: "0.62rem", color: "#9ca3af", borderTop: "1px solid #e5f0e8", display: "flex", justifyContent: "space-between" }}>
              <span>Cod {clinumer} — {nomeParam}</span>
              <span>Gerado em {new Date().toLocaleString("pt-BR")}</span>
            </div>
          </div>
        )}

        {!dados && !carregando && !erro && (
          <div style={{ textAlign: "center", padding: "40px", color: "#888", fontSize: "0.8rem" }}>
            Selecione um mês para carregar a planilha.
          </div>
        )}
      </div>
    </div>
  );
}
