"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SgdwUser { USUNUMER: number; USUNOME: string; }

const SESSION_KEY = "sgdw-admin-auth";

const CSS = `
@keyframes orb-a{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-80px)}}
@keyframes orb-b{0%,100%{transform:translate(0,0)}50%{transform:translate(-50px,60px)}}
@keyframes orb-c{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,40px)}}
@keyframes spin-hl{to{transform:rotate(360deg)}}
@keyframes fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.hl-card{animation:fade-up .45s ease both}
.hl-menu{transition:transform .22s,border-color .22s,box-shadow .22s;animation:fade-up .45s ease both}
.hl-menu:hover{transform:translateY(-6px) scale(1.02);border-color:rgba(16,185,129,.5)!important;box-shadow:0 20px 60px rgba(0,0,0,.12),0 0 32px rgba(16,185,129,.12)!important}
.hl-drop-item{transition:background .12s}
.hl-drop-item:hover{background:rgba(16,185,129,.08)!important}
.hl-sair:hover{background:rgba(239,68,68,.07)!important;color:#ef4444!important;border-color:rgba(239,68,68,.25)!important}
.hl-inp:focus{border-color:rgba(16,185,129,.6)!important;box-shadow:0 0 0 3px rgba(16,185,129,.1)!important;outline:none!important}
`;

function Background() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", background:"#f0f4f8" }}>
      <div style={{ position:"absolute", width:700, height:700, left:"-12%", top:"-18%",
        background:"radial-gradient(circle,rgba(16,185,129,.13) 0%,transparent 60%)",
        animation:"orb-a 13s ease-in-out infinite", borderRadius:"50%" }} />
      <div style={{ position:"absolute", width:560, height:560, right:"-8%", bottom:"5%",
        background:"radial-gradient(circle,rgba(100,116,139,.10) 0%,transparent 60%)",
        animation:"orb-b 16s ease-in-out infinite", borderRadius:"50%" }} />
      <div style={{ position:"absolute", width:420, height:420, left:"38%", bottom:"-14%",
        background:"radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 60%)",
        animation:"orb-c 19s ease-in-out infinite", borderRadius:"50%" }} />
      {/* Grid pattern — dark on light */}
      <div style={{ position:"absolute", inset:0,
        backgroundImage:"linear-gradient(rgba(15,23,42,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.05) 1px,transparent 1px)",
        backgroundSize:"56px 56px" }} />
    </div>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 40 40" style={{ animation:"spin-hl .9s linear infinite", flexShrink:0 }}>
      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="4"
        strokeDasharray="60 20" strokeLinecap="round"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="sh-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="url(#sh-grad)" />
    </svg>
  );
}

/* ─────────────── Dashboard ─────────────── */
function Dashboard({ nome, onLogout }: { nome: string; onLogout: () => void }) {
  const router = useRouter();

  const menus = [
    {
      label: "Análise", desc: "Honorários e desempenho", href: "/analise",
      color: "#059669", glow: "rgba(16,185,129,.1)", border: "rgba(16,185,129,.3)",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/>
        </svg>
      ),
    },
    {
      label: "Empresa", desc: "Portal de clientes", href: "/empresa",
      color: "#059669", glow: "rgba(16,185,129,.1)", border: "rgba(16,185,129,.3)",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4z"/>
          <path d="M9 21v-6h6v6"/>
        </svg>
      ),
    },
    {
      label: "Nota Fiscal", desc: "Emissão e consulta", href: "/nota",
      color: "#475569", glow: "rgba(100,116,139,.1)", border: "rgba(100,116,139,.3)",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
    {
      label: "Chateny", desc: "Atendimento omnichannel", href: "/chateny",
      color: "#25d366", glow: "rgba(37,211,102,.1)", border: "rgba(37,211,102,.3)",
      icon: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#25d366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.999 0C5.373 0 0 5.373 0 12c0 2.125.556 4.119 1.526 5.845L.057 23.999l6.306-1.654A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.626 0 11.999 0zm.001 21.818a9.814 9.814 0 0 1-5.006-1.367l-.359-.214-3.722.976.993-3.624-.234-.373A9.817 9.817 0 0 1 2.182 12c0-5.42 4.399-9.818 9.818-9.818S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
        </svg>
      ),
    },
  ];

  const firstName = nome.split(" ")[0] ?? nome;

  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 28px",
        borderBottom:"1px solid rgba(15,23,42,.08)",
        background:"rgba(255,255,255,.75)", backdropFilter:"blur(16px)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:30, height:30, borderRadius:8,
            background:"linear-gradient(135deg,rgba(16,185,129,.15),rgba(51,65,85,.12))",
            border:"1px solid rgba(16,185,129,.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <ShieldIcon />
          </div>
          <span style={{ color:"#64748b", fontSize:"0.7rem", letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>
            Dehon Despachante
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{
              width:28, height:28, borderRadius:8,
              background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.25)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#059669", fontSize:"0.7rem", fontWeight:700,
            }}>
              {firstName.charAt(0).toUpperCase()}
            </div>
            <span style={{ color:"#334155", fontSize:"0.83rem", fontWeight:500 }}>{nome}</span>
          </div>
          <button
            className="hl-sair"
            onClick={onLogout}
            style={{
              padding:"6px 14px",
              background:"rgba(15,23,42,.05)",
              border:"1px solid rgba(15,23,42,.12)",
              borderRadius:8,
              color:"#64748b", fontSize:"0.75rem", cursor:"pointer",
              transition:"all .15s", fontFamily:"inherit",
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Cards */}
      <div style={{
        flex:1,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"40px 24px",
      }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <p style={{ margin:"0 0 4px", color:"#94a3b8", fontSize:"0.7rem", letterSpacing:"0.2em", textTransform:"uppercase" }}>
            Bem-vindo de volta
          </p>
          <h1 style={{ margin:"0 0 6px", fontSize:"2.2rem", fontWeight:700, color:"#0f172a", letterSpacing:"-0.02em" }}>
            {firstName}
          </h1>
          <p style={{ margin:0, color:"#64748b", fontSize:"0.85rem" }}>
            Selecione um módulo para continuar
          </p>
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",
          gap:14,
          width:"100%", maxWidth:960,
        }}>
          {menus.map((m, i) => (
            <button
              key={m.href}
              className="hl-menu"
              onClick={() => router.push(m.href)}
              style={{
                animationDelay:`${i * 0.09}s`,
                background:"rgba(255,255,255,.9)",
                border:`1px solid ${m.border}`,
                borderRadius:20, padding:"30px 24px",
                cursor:"pointer", textAlign:"left",
                boxShadow:"0 4px 20px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04)",
                backdropFilter:"blur(12px)",
                fontFamily:"inherit",
              }}
            >
              <div style={{
                width:50, height:50, borderRadius:14,
                background:m.glow, border:`1px solid ${m.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                marginBottom:18,
              }}>
                {m.icon}
              </div>
              <div style={{ color:"#0f172a", fontSize:"1.05rem", fontWeight:600, marginBottom:5 }}>
                {m.label}
              </div>
              <div style={{ color:"#94a3b8", fontSize:"0.8rem", marginBottom:18 }}>
                {m.desc}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, color:m.color, fontSize:"0.75rem", fontWeight:600 }}>
                Acessar
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ textAlign:"center", padding:"14px", color:"#cbd5e1", fontSize:"0.68rem" }}>
        Eny-Analis · Dehon Despachante
      </div>
    </div>
  );
}

/* ─────────────── Main component ─────────────── */
export default function HomeLogin() {
  const [phase, setPhase] = useState<"checking" | "login" | "dashboard">("checking");
  const [users, setUsers] = useState<SgdwUser[]>([]);
  const [sgdw, setSgdw] = useState<"checking" | "online" | "offline">("checking");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  const loadUsers = async () => {
    setSgdw("checking");
    try {
      const r = await fetch("/api/sgdw-relay", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          sql:`SELECT FIRST 200 USUNUMER, TRIM(USUNOMES) AS USUNOME FROM tbusuar WHERE USUATIVO=1 ORDER BY USUNOMES`,
          params:[],
        }),
      });
      if (r.ok) {
        const d = await r.json() as { rows: SgdwUser[] };
        setUsers(d.rows ?? []);
        setSgdw("online");
      } else {
        setSgdw("offline");
      }
    } catch {
      setSgdw("offline");
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved) as { nome: string };
        setNome(d.nome);
        setPhase("dashboard");
        return;
      } catch { sessionStorage.removeItem(SESSION_KEY); }
    }
    setPhase("login");
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = usuario.length > 0
    ? users.filter(u => u.USUNOME.toLowerCase().includes(usuario.toLowerCase()))
    : users;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = usuario.trim();
    if (!u) { setErr("Informe o usuário."); return; }
    if (!senha) { setErr("Informe a senha."); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/sgdw-auth", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ username: u, password: senha }),
      });
      const d = await r.json() as { ok: boolean; error?: string; user?: { id: number; nome: string } };
      if (!d.ok) { setErr(d.error ?? "Usuário ou senha inválidos."); return; }
      const user = d.user!;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, nome: user.nome }));
      setNome(user.nome);
      setPhase("dashboard");
    } catch {
      setErr("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setNome(""); setUsuario(""); setSenha("");
    setPhase("login");
    loadUsers();
  };

  const statusColor = sgdw === "online" ? "#10b981" : sgdw === "offline" ? "#ef4444" : "#94a3b8";
  const statusLabel = sgdw === "online" ? "Online" : sgdw === "offline" ? "Offline" : "Conectando...";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Background />

      {phase === "checking" && (
        <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center", color:"#64748b", fontSize:"0.85rem" }}>
            <svg width="22" height="22" viewBox="0 0 40 40" style={{ animation:"spin-hl 1s linear infinite", display:"block", margin:"0 auto 10px" }}>
              <circle cx="20" cy="20" r="16" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/>
            </svg>
            Carregando...
          </div>
        </div>
      )}

      {phase === "dashboard" && <Dashboard nome={nome} onLogout={handleLogout} />}

      {phase === "login" && (
        <div style={{
          position:"relative", zIndex:1,
          minHeight:"100vh",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          padding:"24px",
        }}>
          {/* SGDW status */}
          <div style={{
            position:"absolute", top:18, right:18,
            display:"flex", alignItems:"center", gap:6,
            padding:"5px 12px",
            background:"rgba(255,255,255,.85)",
            border:"1px solid rgba(15,23,42,.1)",
            borderRadius:20, backdropFilter:"blur(12px)",
            fontSize:"0.68rem", color:statusColor, fontWeight:500,
          }}>
            <div style={{
              width:6, height:6, borderRadius:"50%",
              background:statusColor,
              boxShadow: sgdw === "online" ? `0 0 6px ${statusColor}` : "none",
            }} />
            SGDW {statusLabel}
          </div>

          {/* Card */}
          <div className="hl-card" style={{
            width:"100%", maxWidth:400,
            background:"rgba(255,255,255,.92)",
            border:"1px solid rgba(15,23,42,.08)",
            borderRadius:24, padding:"44px 38px",
            backdropFilter:"blur(22px)",
            boxShadow:"0 20px 60px rgba(0,0,0,.10), 0 4px 16px rgba(0,0,0,.06), 0 0 0 1px rgba(16,185,129,.06)",
          }}>
            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:34 }}>
              <div style={{
                width:58, height:58, borderRadius:16,
                background:"linear-gradient(135deg,rgba(16,185,129,.12),rgba(51,65,85,.08))",
                border:"1px solid rgba(16,185,129,.3)",
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                marginBottom:16,
                boxShadow:"0 0 24px rgba(16,185,129,.12)",
              }}>
                <ShieldIcon />
              </div>
              <div style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.25em", color:"#059669", textTransform:"uppercase", marginBottom:5 }}>
                Dehon Despachante
              </div>
              <h1 style={{ margin:"0 0 5px", fontSize:"1.7rem", fontWeight:700, color:"#0f172a", letterSpacing:"-0.025em" }}>
                Sistema Interno
              </h1>
              <p style={{ margin:0, color:"#94a3b8", fontSize:"0.82rem" }}>
                Credenciais SGDW
              </p>
            </div>

            {/* Error */}
            {err && (
              <div style={{
                background:"rgba(239,68,68,.05)", border:"1px solid rgba(239,68,68,.2)",
                borderRadius:10, padding:"10px 14px", marginBottom:18,
                color:"#dc2626", fontSize:"0.8rem",
                display:"flex", alignItems:"center", gap:8,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {err}
              </div>
            )}

            <form onSubmit={handleLogin}>
              {/* Username */}
              <div style={{ marginBottom:13 }}>
                <label style={{ display:"block", fontSize:"0.62rem", fontWeight:700, color:"#334155", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>
                  Usuário
                </label>
                <div ref={dropRef} style={{ position:"relative" }}>
                  <input
                    className="hl-inp"
                    type="text"
                    value={usuario}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Clique ou digite para buscar..."
                    onChange={e => { setUsuario(e.target.value); setShowDrop(true); setErr(""); }}
                    onFocus={() => setShowDrop(true)}
                    onKeyDown={e => { if (e.key === "Escape") setShowDrop(false); }}
                    style={{
                      width:"100%", padding:"11px 15px",
                      background:"#f8fafc",
                      border:"1px solid rgba(15,23,42,.14)",
                      borderRadius:9, color:"#0f172a", fontSize:"0.875rem",
                      boxSizing:"border-box", outline:"none",
                      transition:"border-color .15s,box-shadow .15s", fontFamily:"inherit",
                    }}
                  />
                  {showDrop && filtered.length > 0 && (
                    <div style={{
                      position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
                      background:"rgba(255,255,255,.98)",
                      border:"1px solid rgba(15,23,42,.1)",
                      borderRadius:10,
                      boxShadow:"0 12px 36px rgba(0,0,0,.12)",
                      zIndex:100, backdropFilter:"blur(12px)",
                      maxHeight:220, overflowY:"auto",
                    }}>
                      {filtered.slice(0, 15).map(u => (
                        <div
                          key={u.USUNUMER}
                          className="hl-drop-item"
                          onMouseDown={e => {
                            e.preventDefault();
                            setUsuario(u.USUNOME);
                            setShowDrop(false);
                          }}
                          style={{
                            padding:"9px 14px",
                            cursor:"pointer", color:"#1e293b", fontSize:"0.85rem",
                            display:"flex", alignItems:"center", gap:10,
                            borderBottom:"1px solid rgba(15,23,42,.05)",
                          }}
                        >
                          <div style={{
                            width:22, height:22, borderRadius:6,
                            background:"rgba(16,185,129,.1)",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:"0.62rem", color:"#059669", fontWeight:700, flexShrink:0,
                          }}>
                            {u.USUNOME.charAt(0).toUpperCase()}
                          </div>
                          {u.USUNOME}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom:22 }}>
                <label style={{ display:"block", fontSize:"0.62rem", fontWeight:700, color:"#334155", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>
                  Senha
                </label>
                <input
                  className="hl-inp"
                  type="password"
                  value={senha}
                  placeholder="••••••••"
                  onChange={e => { setSenha(e.target.value); setErr(""); }}
                  style={{
                    width:"100%", padding:"11px 15px",
                    background:"#f8fafc",
                    border:"1px solid rgba(15,23,42,.14)",
                    borderRadius:9, color:"#0f172a", fontSize:"0.875rem",
                    boxSizing:"border-box", outline:"none",
                    transition:"border-color .15s,box-shadow .15s", fontFamily:"inherit",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width:"100%", padding:"13px",
                  background: loading ? "rgba(16,185,129,.4)" : "linear-gradient(135deg,#059669,#334155)",
                  color:"#fff", border:"none", borderRadius:9,
                  fontSize:"0.875rem", fontWeight:600,
                  cursor: loading ? "default" : "pointer",
                  letterSpacing:"0.04em",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  boxShadow: loading ? "none" : "0 4px 20px rgba(5,150,105,.25)",
                  transition:"all .18s", fontFamily:"inherit",
                }}
              >
                {loading ? (
                  <><Spinner />Verificando...</>
                ) : (
                  <>
                    Entrar
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <div style={{ marginTop:22, color:"#94a3b8", fontSize:"0.68rem", letterSpacing:"0.06em" }}>
            Eny-Analis · Dehon Despachante
          </div>
        </div>
      )}
    </>
  );
}
