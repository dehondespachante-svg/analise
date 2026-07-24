"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Plus, Trash2, CheckCircle, AlertTriangle, Loader } from "lucide-react";
import {
  buscarVeiculoPorPlacaSgdw, buscarClientesPorNomeSgdw,
  buscarClienteCompletoPorNumeroSgdw,
  buscarProximaOsSgdw, buscarOrdTmpSgdw, criarOsSgdw, buscarServicosSgdw,
} from "@/src/features/sgdw/client";
import type { SgdwConfig } from "@/src/features/sgdw/types";
import type { SgdwVeiculoInfo, SgdwClienteSimples, NovaOsItem } from "@/src/features/sgdw/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function hoje(): string { return new Date().toISOString().slice(0, 10); }

// ─── Sub-components ───────────────────────────────────────────────────────────

function Campo({
  label, children, w, obrigatorio,
}: { label: string; children: React.ReactNode; w?: string; obrigatorio?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, width: w ?? "auto", flexShrink: w ? 0 : 1 }}>
      <label style={{ fontSize: "0.62rem", color: "#4a5568", fontWeight: 600, whiteSpace: "nowrap" }}>
        {label}{obrigatorio && <span style={{ color: "#e53e3e", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  padding: "4px 7px", borderRadius: 4, border: "1px solid #b0bec5",
  fontSize: "0.73rem", background: "#fff", width: "100%", boxSizing: "border-box",
  outline: "none", fontFamily: "inherit",
};
const inputReadonly: React.CSSProperties = {
  ...inputBase, background: "#f0f4f8", color: "#718096", cursor: "default",
};
const btnAcao = (primary = false): React.CSSProperties => ({
  padding: "5px 11px", borderRadius: 4, border: primary ? "none" : "1px solid #b0bec5",
  background: primary ? "#1a5c34" : "#f7fafc", color: primary ? "#fff" : "#2d3748",
  fontWeight: primary ? 700 : 500, fontSize: "0.72rem", cursor: "pointer",
  display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  fontFamily: "inherit",
});

// ─── NovaOsModal ─────────────────────────────────────────────────────────────

export function NovaOsModal({
  config, onFechar, onCriada,
}: {
  config: SgdwConfig;
  onFechar: () => void;
  onCriada: (numeros: number[]) => void;
}) {
  // ── OS info ─────────────────────────────────────────────
  const [numOs, setNumOs] = useState<number | null>(null);
  const [dataEmissao, setDataEmissao] = useState(hoje());

  // ── Veículo ──────────────────────────────────────────────
  const [placaInput, setPlacaInput] = useState("");
  const [veiculo, setVeiculo] = useState<SgdwVeiculoInfo | null>(null);
  const [buscandoVeic, setBuscandoVeic] = useState(false);
  const [erroVeic, setErroVeic] = useState("");

  // ── Cliente / Origem ─────────────────────────────────────
  const [clienteInput, setClienteInput] = useState("");
  const [clienteSel, setClienteSel] = useState<SgdwClienteSimples | null>(null);
  const [clientesBusca, setClientesBusca] = useState<SgdwClienteSimples[]>([]);
  const [mostraSugCliente, setMostraSugCliente] = useState(false);
  const [buscandoCli, setBuscandoCli] = useState(false);

  // ── Dados do veículo (complementares — visuais) ──────────
  const [marca, setMarca] = useState("");
  const [fabMod, setFabMod] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [combustivel, setCombustivel] = useState("");
  const [especie, setEspecie] = useState("");
  const [valorNf, setValorNf] = useState("");
  const [crvNf, setCrvNf] = useState("");
  const [dtCrv, setDtCrv] = useState("");
  const [veiZeroKm, setVeiZeroKm] = useState(false);
  const [restricao, setRestricao] = useState("");
  const [fechOs, setFechOs] = useState("");

  // ── Dados do cliente (complementares — visuais) ──────────
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [rg, setRg] = useState("");
  const [ufCliente, setUfCliente] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [ufMun, setUfMun] = useState("");
  const [email, setEmail] = useState("");
  const [foneRes, setFoneRes] = useState("");
  const [foneCom, setFoneCom] = useState("");
  const [celular, setCelular] = useState("");
  const [cor, setCor] = useState("");

  // ── Itens / Serviços ─────────────────────────────────────
  const [exercicio, setExercicio] = useState(String(new Date().getFullYear()));
  const [servicoInput, setServicoInput] = useState("");
  const [servicosBusca, setServicosBusca] = useState<Array<{ SERNUMER: number; DESCRICAO: string }>>([]);
  const [mostraSugServico, setMostraSugServico] = useState(false);
  const [itens, setItens] = useState<NovaOsItem[]>([]);
  const todosServicos = useRef<Array<{ SERNUMER: number; DESCRICAO: string }>>([]);
  const servicosCarregados = useRef(false);

  // ── Origem / Resp. Financeiro (display-only — colunas TBOS não confirmadas)
  const [origem, setOrigem]     = useState("");
  const [respFin, setRespFin]   = useState("");

  // ── Observação ───────────────────────────────────────────
  const [obs, setObs] = useState("");

  // ── Financeiro ───────────────────────────────────────────
  const [acrescimo, setAcrescimo] = useState(0);
  const [desconto, setDesconto] = useState(0);

  // ── Tab ativa ────────────────────────────────────────────
  const [tabAtiva, setTabAtiva] = useState<"itens" | "obs" | "hist">("itens");

  // ── Estado de criação ────────────────────────────────────
  const [gerando, setGerando] = useState(false);
  const [notif, setNotif] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  // ORDTMP detectado por SELECT no SGDW (read-only) para evitar status incorreto
  const [ordtmp, setOrdtmp] = useState<number>(2);

  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  // ── Carrega próximo número de OS e detecta ORDTMP ao abrir ──
  useEffect(() => {
    buscarProximaOsSgdw(config).then(n => { if (montado.current) setNumOs(n); }).catch(() => {});
    buscarOrdTmpSgdw(config).then(v => { if (montado.current) setOrdtmp(v); }).catch(() => {});
  }, [config]);

  // ── Carrega catálogo de serviços uma vez ─────────────────
  async function garantirServicosCarregados() {
    if (servicosCarregados.current) return;
    try {
      const r = await buscarServicosSgdw(config);
      todosServicos.current = (r.linhas as Array<Record<string, unknown>>).map(s => ({
        SERNUMER: Number(s.SERNUMER),
        DESCRICAO: String(s.DESCRICAO ?? "").trim(),
      }));
      servicosCarregados.current = true;
    } catch {}
  }

  // ── Filtra serviços localmente por código ou nome ─────────
  function filtrarServicos(v: string) {
    const q = v.trim().toLowerCase();
    if (!q) return [];
    return todosServicos.current
      .filter(s =>
        String(s.SERNUMER).includes(q) ||
        s.DESCRICAO.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }

  // ── Busca serviços ao digitar ─────────────────────────────
  const timerServico = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onServicoInput(v: string) {
    setServicoInput(v);
    if (timerServico.current) clearTimeout(timerServico.current);
    if (!v.trim()) { setServicosBusca([]); setMostraSugServico(false); return; }
    timerServico.current = setTimeout(async () => {
      await garantirServicosCarregados();
      if (!montado.current) return;
      const filtrados = filtrarServicos(v);
      setServicosBusca(filtrados);
      setMostraSugServico(true);
    }, 150);
  }

  // ── Busca clientes ao digitar ─────────────────────────────
  const timerCliente = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onClienteInput(v: string) {
    setClienteInput(v);
    setClienteSel(null);
    if (timerCliente.current) clearTimeout(timerCliente.current);
    if (v.trim().length < 2) { setClientesBusca([]); setMostraSugCliente(false); return; }
    setBuscandoCli(true);
    timerCliente.current = setTimeout(async () => {
      try {
        const lista = await buscarClientesPorNomeSgdw(config, v);
        if (montado.current) { setClientesBusca(lista); setMostraSugCliente(true); setBuscandoCli(false); }
      } catch { if (montado.current) setBuscandoCli(false); }
    }, 300);
  }

  // ── Busca veículo pela placa ──────────────────────────────
  async function buscarVeiculo() {
    const p = placaInput.trim();
    if (!p) return;
    setBuscandoVeic(true); setErroVeic("");
    try {
      const v = await buscarVeiculoPorPlacaSgdw(config, p);
      if (montado.current) {
        if (v) {
          setVeiculo(v);
          setErroVeic("");
          // Auto-fill dados complementares do veículo
          setMarca(v.MARCA_MODELO);
          setFabMod(
            v.ANO_FABRICACAO && v.ANO_MODELO
              ? `${v.ANO_FABRICACAO}/${v.ANO_MODELO}`
              : v.ANO_FABRICACAO ? String(v.ANO_FABRICACAO) : ""
          );
          setTipo(v.TIPO_NOME);
          setCategoria(v.CATEGORIA_NOME);
          setCombustivel(v.COMBUSTIVEL_NOME);
          setEspecie(v.ESPECIE_NOME);
          setCor(v.COR_NOME);
          setCrvNf(v.NR_CRV);
          if (v.DT_AQUISICAO) setDtCrv(v.DT_AQUISICAO);
          if (v.VALOR_NF) setValorNf(String(v.VALOR_NF));
          setVeiZeroKm(v.ZERO_KM);
          setRestricao(v.RESTRICAO_NOME);
          // Se tem proprietário e ainda não selecionou cliente, sugerir
          if (v.PROPRIETARIO_CLINUMER && !clienteSel) {
            const prop: SgdwClienteSimples = {
              CLINUMER: v.PROPRIETARIO_CLINUMER,
              NOME: v.PROPRIETARIO_NOME,
            };
            setClienteSel(prop);
            setClienteInput(v.PROPRIETARIO_NOME);
            // Carregar dados completos do proprietário
            buscarClienteCompletoPorNumeroSgdw(config, v.PROPRIETARIO_CLINUMER)
              .then(det => { if (!det || !montado.current) return; preencherDadosCliente(det); })
              .catch(() => {});
          }
        } else {
          setErroVeic(`Placa "${p}" não encontrada no sistema.`);
        }
      }
    } catch (e) {
      if (montado.current) setErroVeic(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      if (montado.current) setBuscandoVeic(false);
    }
  }

  function preencherDadosCliente(det: { CPF_CNPJ: string; RG: string; LOGRADOURO: string; NUMERO: string; BAIRRO: string; CEP: string; COMPLEMENTO: string; EMAIL: string; MUNICIPIO: string; UF: string }) {
    if (det.CPF_CNPJ) setCpfCnpj(det.CPF_CNPJ);
    if (det.RG) setRg(det.RG);
    if (det.LOGRADOURO) setEndereco(det.LOGRADOURO);
    if (det.NUMERO) setNumero(det.NUMERO);
    if (det.BAIRRO) setBairro(det.BAIRRO);
    if (det.CEP) setCep(det.CEP);
    if (det.COMPLEMENTO) setComplemento(det.COMPLEMENTO);
    if (det.EMAIL) setEmail(det.EMAIL);
    if (det.MUNICIPIO) setMunicipio(det.MUNICIPIO);
    if (det.UF) setUfMun(det.UF);
  }

  // ── Adiciona item à lista ─────────────────────────────────
  function adicionarItem(sernumer: number, descricao: string) {
    const venc = exercicio ? `${exercicio}-12-31` : hoje();
    setItens(prev => [...prev, { sosnumer: sernumer, descricao, vencimento: venc, valor: 0 }]);
    setServicoInput(""); setServicosBusca([]); setMostraSugServico(false);
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx));
  }

  function atualizarItem(idx: number, campo: keyof NovaOsItem, valor: string | number) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  }

  // ── Totais ────────────────────────────────────────────────
  const vlrBruto    = itens.reduce((s, it) => s + Number(it.valor), 0);
  const vlrTotal    = vlrBruto + acrescimo - desconto;

  // ── Gerar OS ──────────────────────────────────────────────
  async function gerarOs() {
    if (!clienteSel) { setNotif({ tipo: "erro", msg: "Selecione um cliente (Origem)." }); return; }
    if (!veiculo)    { setNotif({ tipo: "erro", msg: "Informe e pesquise a Placa do veículo." }); return; }
    if (itens.length === 0) { setNotif({ tipo: "erro", msg: "Adicione pelo menos um serviço." }); return; }
    if (itens.some(it => !it.sosnumer)) { setNotif({ tipo: "erro", msg: "Todos os itens precisam de serviço." }); return; }
    if (!numOs) { setNotif({ tipo: "erro", msg: "Aguarde o número da OS ser carregado." }); return; }

    setGerando(true); setNotif(null);
    try {
      const criadas = await criarOsSgdw(config, {
        ordnumer: numOs,
        dataEmissao,
        clinumer: clienteSel.CLINUMER,
        veinumer: veiculo.VEINUMER,
        itens,
        acrescimo,
        desconto,
        obs,
        exercicio: exercicio ? parseInt(exercicio, 10) : undefined,
        ordtmp,
      });
      setNotif({ tipo: "ok", msg: `OS ${criadas.join(", ")} criada com sucesso!` });
      setTimeout(() => { onCriada(criadas); }, 1500);
    } catch (e) {
      setNotif({ tipo: "erro", msg: e instanceof Error ? e.message : "Erro ao criar OS." });
    } finally {
      if (montado.current) setGerando(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "12px",
    }} onClick={e => { if (e.target === e.currentTarget) onFechar(); }}>

      <div style={{
        width: "100%", maxWidth: 980, maxHeight: "96vh", overflowY: "auto",
        background: "#f0f4f0", borderRadius: 8,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        fontFamily: "system-ui, Arial, sans-serif", fontSize: "0.75rem",
        display: "flex", flexDirection: "column",
      }}>

        {/* ── Barra de título ─────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #1a3a2a 0%, #1a5c34 100%)",
          color: "#fff", padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 10,
          borderRadius: "8px 8px 0 0", flexShrink: 0,
        }}>
          <span style={{ fontSize: "0.9rem" }}>🔷</span>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", flex: 1 }}>Ordem de Serviço</span>
          <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)", marginRight: 8 }}>
            Próxima OS: <b style={{ color: "#7effc8" }}>#{numOs ?? "..."}</b>
          </span>
          <button type="button" onClick={onFechar} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", borderRadius: 4, padding: "2px 6px", fontSize: "1rem", lineHeight: 1 }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Corpo do form ────────────────────────────────────── */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>

          {/* Notificação */}
          {notif && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
              borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
              background: notif.tipo === "ok" ? "#f0faf4" : "#fff5f5",
              border: `1px solid ${notif.tipo === "ok" ? "#9ae6b4" : "#fc8181"}`,
              color: notif.tipo === "ok" ? "#1a5c34" : "#c53030",
            }}>
              {notif.tipo === "ok" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {notif.msg}
            </div>
          )}

          {/* ── Seção: Ordem de Serviço ───────────────────────── */}
          <fieldset style={{ border: "1px solid #b0c8b8", borderRadius: 6, padding: "10px 12px", margin: 0 }}>
            <legend style={{ fontSize: "0.67rem", fontWeight: 700, color: "#1a5c34", padding: "0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Ordem de Serviço
            </legend>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>

              <Campo label="Número O.S." w="90px">
                <input value={numOs ?? "..."} readOnly style={inputReadonly} />
              </Campo>

              <Campo label="Placa" w="120px" obrigatorio>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    value={placaInput} onChange={e => { setPlacaInput(e.target.value.toUpperCase()); setVeiculo(null); setErroVeic(""); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); buscarVeiculo(); } }}
                    placeholder="AAA0000" maxLength={8}
                    style={{ ...inputBase, width: 78, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}
                  />
                  <button type="button" onClick={buscarVeiculo} disabled={buscandoVeic}
                    style={{ ...btnAcao(true), padding: "4px 8px", minWidth: 0 }}>
                    {buscandoVeic ? <Loader size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={11} />}
                  </button>
                </div>
                {erroVeic && <span style={{ fontSize: "0.58rem", color: "#e53e3e", marginTop: 1 }}>{erroVeic}</span>}
                {veiculo && <span style={{ fontSize: "0.58rem", color: "#1a5c34", marginTop: 1 }}>✓ Veículo #{veiculo.VEINUMER}</span>}
              </Campo>

              <Campo label="Chassi" w="170px">
                <input value={veiculo?.CHASSI ?? ""} readOnly placeholder="—" style={inputReadonly} />
              </Campo>

              <Campo label="RENAVAM" w="130px">
                <input value={veiculo?.RENAVAM ?? ""} readOnly placeholder="—" style={inputReadonly} />
              </Campo>

              <Campo label="Emissão" w="130px" obrigatorio>
                <input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} style={inputBase} />
              </Campo>

              <Campo label="Fech. O.S." w="130px">
                <input type="date" value={fechOs} onChange={e => setFechOs(e.target.value)} style={inputBase} />
              </Campo>
            </div>
          </fieldset>

          {/* ── Seção: Dados Complementares ───────────────────── */}
          <fieldset style={{ border: "1px solid #b0c8b8", borderRadius: 6, padding: "10px 12px", margin: 0 }}>
            <legend style={{ fontSize: "0.67rem", fontWeight: 700, color: "#2563eb", padding: "0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Dados Complementares
            </legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              {/* Linha 1: Nome + CPF/CNPJ + RG + UF */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Campo label="Nome / Origem (Cliente)" obrigatorio>
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        value={clienteInput}
                        onChange={e => onClienteInput(e.target.value)}
                        onBlur={() => setTimeout(() => setMostraSugCliente(false), 150)}
                        placeholder="Digite o nome do cliente..."
                        style={{ ...inputBase, width: 260 }}
                      />
                      {buscandoCli && <Loader size={11} style={{ position: "absolute", right: 8, top: 7, animation: "spin 1s linear infinite", color: "#888" }} />}
                    </div>
                    {clienteSel && (
                      <span style={{ fontSize: "0.58rem", color: "#1a5c34" }}>✓ Cod. {clienteSel.CLINUMER}</span>
                    )}
                    {mostraSugCliente && clientesBusca.length > 0 && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, zIndex: 100, background: "#fff",
                        border: "1px solid #b0c8b8", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        maxHeight: 200, overflowY: "auto", minWidth: 280,
                      }}>
                        {clientesBusca.map(c => (
                          <div key={c.CLINUMER} onMouseDown={() => {
                            setClienteSel(c);
                            setClienteInput(c.NOME);
                            setMostraSugCliente(false);
                            buscarClienteCompletoPorNumeroSgdw(config, c.CLINUMER)
                              .then(det => { if (!det || !montado.current) return; preencherDadosCliente(det); })
                              .catch(() => {});
                          }}
                            style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #e8f0e9", fontSize: "0.72rem" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f0faf4")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                            <span style={{ fontWeight: 700, color: "#1a5c34" }}>{c.CLINUMER}</span>{" — "}{c.NOME}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Campo>
                <Campo label="CPF/CNPJ" w="130px">
                  <input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" style={inputBase} />
                </Campo>
                <Campo label="RG" w="90px">
                  <input value={rg} onChange={e => setRg(e.target.value)} style={inputBase} />
                </Campo>
                <Campo label="UF" w="50px">
                  <input value={ufCliente} onChange={e => setUfCliente(e.target.value.toUpperCase())} maxLength={2} style={{ ...inputBase, textTransform: "uppercase" }} />
                </Campo>
              </div>

              {/* Linha 2: CEP + Endereço + Número */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Campo label="CEP" w="90px">
                  <input value={cep} onChange={e => setCep(e.target.value)} placeholder="00000-000" maxLength={9} style={inputBase} />
                </Campo>
                <Campo label="Endereço">
                  <input value={endereco} onChange={e => setEndereco(e.target.value)} style={{ ...inputBase, width: 280 }} />
                </Campo>
                <Campo label="Número" w="80px">
                  <input value={numero} onChange={e => setNumero(e.target.value)} style={inputBase} />
                </Campo>
              </div>

              {/* Linha 3: Bairro + Complemento */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Campo label="Bairro">
                  <input value={bairro} onChange={e => setBairro(e.target.value)} style={{ ...inputBase, width: 200 }} />
                </Campo>
                <Campo label="Complemento">
                  <input value={complemento} onChange={e => setComplemento(e.target.value)} style={{ ...inputBase, width: 240 }} />
                </Campo>
              </div>

              {/* Linha 4: Município + UF + E-Mail */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Campo label="Município">
                  <input value={municipio} onChange={e => setMunicipio(e.target.value)} style={{ ...inputBase, width: 200 }} />
                </Campo>
                <Campo label="UF" w="50px">
                  <input value={ufMun} onChange={e => setUfMun(e.target.value.toUpperCase())} maxLength={2} style={{ ...inputBase, textTransform: "uppercase" }} />
                </Campo>
                <Campo label="E-Mail">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputBase, width: 220 }} />
                </Campo>
              </div>

              {/* Linha 5: Fones + Cor */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Campo label="Fone Res." w="130px">
                  <input value={foneRes} onChange={e => setFoneRes(e.target.value)} placeholder="55 XXXXX-XXXX" style={inputBase} />
                </Campo>
                <Campo label="Fone Com." w="130px">
                  <input value={foneCom} onChange={e => setFoneCom(e.target.value)} placeholder="55 XXXXX-XXXX" style={inputBase} />
                </Campo>
                <Campo label="Celular" w="130px">
                  <input value={celular} onChange={e => setCelular(e.target.value)} placeholder="55 XXXXX-XXXX" style={inputBase} />
                </Campo>
                <Campo label="Cor" w="90px">
                  <input value={cor} onChange={e => setCor(e.target.value)} style={inputBase} />
                </Campo>
              </div>

              {/* Linha 6: Veículo detalhes */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Campo label="Marca" w="140px">
                  <input value={marca} onChange={e => setMarca(e.target.value)} style={inputBase} />
                </Campo>
                <Campo label="Fab/Mod" w="90px">
                  <input value={fabMod} onChange={e => setFabMod(e.target.value)} style={inputBase} />
                </Campo>
                <Campo label="Tipo" w="90px">
                  <input value={tipo} onChange={e => setTipo(e.target.value)} style={inputBase} />
                </Campo>
                <Campo label="Categoria" w="100px">
                  <input value={categoria} onChange={e => setCategoria(e.target.value)} style={inputBase} />
                </Campo>
              </div>

              {/* Linha 7: Combustível + Espécie + Valor NF + CRV */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Campo label="Combustível" w="110px">
                  <select value={combustivel} onChange={e => setCombustivel(e.target.value)}
                    style={{ ...inputBase, appearance: "none" }}>
                    <option value="">—</option>
                    <option>Gasolina</option>
                    <option>Álcool</option>
                    <option>Flex</option>
                    <option>Diesel</option>
                    <option>GNV</option>
                    <option>Elétrico</option>
                    <option>Híbrido</option>
                  </select>
                </Campo>
                <Campo label="Espécie" w="100px">
                  <select value={especie} onChange={e => setEspecie(e.target.value)}
                    style={{ ...inputBase, appearance: "none" }}>
                    <option value="">—</option>
                    <option>Passageiro</option>
                    <option>Carga</option>
                    <option>Misto</option>
                    <option>Corrida</option>
                    <option>Especial</option>
                  </select>
                </Campo>
                <Campo label="Valor NF" w="100px">
                  <input type="number" value={valorNf} onChange={e => setValorNf(e.target.value)} min="0" step="0.01" style={inputBase} />
                </Campo>
                <Campo label="CRV/NF" w="110px">
                  <input value={crvNf} onChange={e => setCrvNf(e.target.value)} style={inputBase} />
                </Campo>
                <Campo label="Dt. CRV" w="120px">
                  <input type="date" value={dtCrv} onChange={e => setDtCrv(e.target.value)} style={inputBase} />
                </Campo>
                <Campo label="" w="110px">
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={veiZeroKm} onChange={e => setVeiZeroKm(e.target.checked)} />
                    <span style={{ fontSize: "0.68rem", color: "#4a5568" }}>Veículo 0 Km</span>
                  </label>
                </Campo>
              </div>

              {/* Linha 8: Restrição + Fech. O.S. */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Campo label="Restrição">
                  <select value={restricao} onChange={e => setRestricao(e.target.value)}
                    style={{ ...inputBase, width: 260, appearance: "none" }}>
                    <option value="">Sem restrição</option>
                    <option>Alienação fiduciária</option>
                    <option>Arrendamento mercantil</option>
                    <option>Reserva de domínio</option>
                    <option>Penhor</option>
                    <option>Outras</option>
                  </select>
                </Campo>
              </div>

              {/* Linha 9: Origem + Resp. Fin. */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Campo label="Origem">
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      value={origem} onChange={e => setOrigem(e.target.value)}
                      placeholder="Origem do pedido..."
                      style={{ ...inputBase, width: 220 }}
                    />
                    <button type="button" title="Buscar origem (visual)"
                      style={{ ...btnAcao(), padding: "4px 7px", opacity: 0.55, cursor: "not-allowed" }}>
                      <Search size={11} />
                    </button>
                  </div>
                </Campo>
                <Campo label="Resp. Fin.">
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      value={respFin} onChange={e => setRespFin(e.target.value)}
                      placeholder="Responsável financeiro..."
                      style={{ ...inputBase, width: 220 }}
                    />
                    <button type="button" title="Buscar responsável (visual)"
                      style={{ ...btnAcao(), padding: "4px 7px", opacity: 0.55, cursor: "not-allowed" }}>
                      <Search size={11} />
                    </button>
                  </div>
                </Campo>
              </div>
            </div>
          </fieldset>

          {/* ── Tabs: Itens / Observação / Histórico ─────────── */}
          <div style={{ border: "1px solid #b0c8b8", borderRadius: 6, overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", background: "#e8f0e9", borderBottom: "1px solid #b0c8b8" }}>
              {([
                { id: "itens", label: "Itens O.S." },
                { id: "obs",   label: "Observação" },
                { id: "hist",  label: "Histórico"  },
              ] as const).map(t => (
                <button key={t.id} type="button" onClick={() => setTabAtiva(t.id)}
                  style={{
                    padding: "6px 16px", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                    background: tabAtiva === t.id ? "#fff" : "transparent",
                    color: tabAtiva === t.id ? "#1a5c34" : "#4a5568",
                    borderBottom: tabAtiva === t.id ? "2px solid #1a5c34" : "2px solid transparent",
                    fontFamily: "inherit",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Itens O.S. */}
            {tabAtiva === "itens" && (
              <div style={{ padding: 12 }}>
                {/* Seletor de serviço */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
                  <Campo label="Exercício" w="80px">
                    <input value={exercicio} onChange={e => setExercicio(e.target.value)} maxLength={4} style={inputBase} />
                  </Campo>
                  <Campo label="Serviço — busque e adicione">
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          value={servicoInput}
                          onChange={e => onServicoInput(e.target.value)}
                          onFocus={() => { if (servicoInput.trim()) onServicoInput(servicoInput); }}
                          onBlur={() => setTimeout(() => setMostraSugServico(false), 150)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.preventDefault(); if (servicosBusca[0]) adicionarItem(servicosBusca[0].SERNUMER, servicosBusca[0].DESCRICAO); }
                            if (e.key === "Escape") { setMostraSugServico(false); }
                          }}
                          placeholder="Cód. ou nome do serviço..."
                          style={{ ...inputBase, width: 340 }}
                        />
                        <button type="button" disabled={servicosBusca.length === 0}
                          onClick={() => { if (servicosBusca[0]) adicionarItem(servicosBusca[0].SERNUMER, servicosBusca[0].DESCRICAO); }}
                          style={{ ...btnAcao(true), padding: "4px 10px" }}>
                          <Plus size={12} /> Add
                        </button>
                      </div>
                      {mostraSugServico && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, zIndex: 100, background: "#fff",
                          border: "1px solid #b0c8b8", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                          maxHeight: 220, overflowY: "auto", minWidth: 340,
                        }}>
                          {servicosBusca.length === 0 ? (
                            <div style={{ padding: "10px 12px", fontSize: "0.7rem", color: "#9ca3af" }}>
                              Nenhum serviço encontrado para "{servicoInput}"
                            </div>
                          ) : servicosBusca.map(s => {
                            const q = servicoInput.trim().toLowerCase();
                            const descLow = s.DESCRICAO.toLowerCase();
                            const idx = descLow.indexOf(q);
                            const descEl = idx >= 0
                              ? <>{s.DESCRICAO.slice(0, idx)}<mark style={{ background: "#fef08a", padding: 0 }}>{s.DESCRICAO.slice(idx, idx + q.length)}</mark>{s.DESCRICAO.slice(idx + q.length)}</>
                              : <>{s.DESCRICAO}</>;
                            return (
                              <div key={s.SERNUMER} onMouseDown={() => adicionarItem(s.SERNUMER, s.DESCRICAO)}
                                style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #e8f0e9", fontSize: "0.72rem", display: "flex", gap: 8, alignItems: "center" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f0faf4")}
                                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                                <span style={{ fontWeight: 700, color: "#1a5c34", minWidth: 32, fontSize: "0.68rem", background: "#e8f5ee", borderRadius: 3, padding: "1px 5px", textAlign: "center" }}>
                                  {String(s.SERNUMER).includes(q)
                                    ? <mark style={{ background: "#fef08a", padding: 0 }}>{s.SERNUMER}</mark>
                                    : s.SERNUMER}
                                </span>
                                <span>{descEl}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Campo>
                </div>

                {/* Tabela de itens */}
                <div style={{ border: "1px solid #b0c8b8", borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                    <thead>
                      <tr style={{ background: "#1a5c34", color: "#fff" }}>
                        <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, width: 60 }}>Código</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700 }}>Descrição dos Serviços</th>
                        <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, width: 120 }}>Vencimento</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, width: 110 }}>Valor (R$)</th>
                        <th style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "18px", textAlign: "center", color: "#9ca3af", fontSize: "0.7rem" }}>
                            Nenhum serviço adicionado. Busque acima e clique em Add.
                          </td>
                        </tr>
                      )}
                      {itens.map((it, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f7faf8", borderBottom: "1px solid #e8f0e9" }}>
                          <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: 700, color: "#1a5c34" }}>
                            {it.sosnumer}
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input value={it.descricao} onChange={e => atualizarItem(i, "descricao", e.target.value)}
                              style={{ ...inputBase, border: "none", background: "transparent", padding: "1px 0" }} />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input type="date" value={it.vencimento} onChange={e => atualizarItem(i, "vencimento", e.target.value)}
                              style={{ ...inputBase, textAlign: "center" }} />
                          </td>
                          <td style={{ padding: "4px 8px" }}>
                            <input type="number" value={it.valor} min="0" step="0.01"
                              onChange={e => atualizarItem(i, "valor", parseFloat(e.target.value) || 0)}
                              style={{ ...inputBase, textAlign: "right" }} />
                          </td>
                          <td style={{ padding: "4px 4px", textAlign: "center" }}>
                            <button type="button" onClick={() => removerItem(i)}
                              style={{ border: "none", background: "none", cursor: "pointer", color: "#c0392b", padding: "2px" }}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Acréscimo / Desconto */}
                {itens.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end", alignItems: "flex-end" }}>
                    <Campo label="Vlr. Acréscimo" w="120px">
                      <input type="number" value={acrescimo} min="0" step="0.01"
                        onChange={e => setAcrescimo(parseFloat(e.target.value) || 0)}
                        style={{ ...inputBase, textAlign: "right" }} />
                    </Campo>
                    <Campo label="Vlr. Desconto" w="120px">
                      <input type="number" value={desconto} min="0" step="0.01"
                        onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
                        style={{ ...inputBase, textAlign: "right" }} />
                    </Campo>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Observação */}
            {tabAtiva === "obs" && (
              <div style={{ padding: 12 }}>
                <textarea value={obs} onChange={e => setObs(e.target.value)}
                  placeholder="Observações da OS..."
                  style={{ ...inputBase, width: "100%", minHeight: 100, resize: "vertical", boxSizing: "border-box" }} />
              </div>
            )}

            {/* Tab: Histórico */}
            {tabAtiva === "hist" && (
              <div style={{ padding: 12, color: "#9ca3af", fontSize: "0.72rem", textAlign: "center", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                Histórico disponível após criação da OS.
              </div>
            )}
          </div>

        </div>

        {/* ── Barra de totais ──────────────────────────────────── */}
        <div style={{
          background: "#e8f0e9", borderTop: "1px solid #b0c8b8",
          padding: "8px 16px", display: "flex", gap: 20, alignItems: "center",
          flexShrink: 0, flexWrap: "wrap",
        }}>
          {[
            { label: "Vlr.Bruto",      val: vlrBruto,    cor: "#2d3748" },
            { label: "Vlr.Acréscimo",  val: acrescimo,   cor: "#2d3748" },
            { label: "Vlr.Desconto",   val: desconto,    cor: "#2d3748" },
            { label: "Vlr.Pago",       val: 0,           cor: "#2d3748" },
            { label: "Vlr.Recebido",   val: 0,           cor: "#1a5c34" },
            { label: "Vlr. A Receber", val: vlrTotal,    cor: vlrTotal > 0 ? "#c0392b" : "#1a5c34" },
          ].map(k => (
            <div key={k.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.55rem", color: "#718096", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: k.cor }}>{moeda.format(k.val)}</div>
            </div>
          ))}
        </div>

        {/* ── Barra de ações ───────────────────────────────────── */}
        <div style={{
          background: "#f0f4f0", borderTop: "1px solid #b0c8b8",
          padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap",
          alignItems: "center", borderRadius: "0 0 8px 8px", flexShrink: 0,
        }}>
          {/* Botões informativos (sem backend) */}
          {[
            { label: "WhatsApp",   emoji: "💬" },
            { label: "Débitos",    emoji: "📋" },
            { label: "Dossiê",     emoji: "📁" },
            { label: "Danfe",      emoji: "🧾" },
            { label: "Calc. IPVA", emoji: "🧮" },
            { label: "Exportar",   emoji: "📤" },
            { label: "Imprimir",   emoji: "🖨️" },
            { label: "Visualizar", emoji: "👁️" },
          ].map(b => (
            <button key={b.label} type="button"
              title="Disponível no SGDW desktop"
              style={{ ...btnAcao(), fontSize: "0.65rem", opacity: 0.65, cursor: "not-allowed" }}>
              {b.emoji} {b.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button type="button" onClick={onFechar}
            style={{ ...btnAcao(), fontSize: "0.72rem" }}>
            Cancelar
          </button>
          <button type="button" onClick={onFechar}
            style={{ ...btnAcao(), fontSize: "0.72rem" }}>
            Sair
          </button>
          <button type="button" onClick={gerarOs} disabled={gerando}
            style={{
              ...btnAcao(true), fontSize: "0.78rem", padding: "7px 18px",
              opacity: gerando ? 0.7 : 1, cursor: gerando ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(26,92,52,0.35)",
            }}>
            {gerando
              ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Gerando...</>
              : <>✅ Gerar O.S.</>}
          </button>
        </div>
      </div>
    </div>
  );
}
