"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ref as rtdbRef, push, get, update } from 'firebase/database';
import { rtdb } from '@/logic/firebase/config/app';
import { sgdwBuscarEmpresas } from './sgdw';
import type { EmpresaPortal } from './sgdw';

// ─── helpers ───────────────────────────────────────────────────────────────
function formatData(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function copyText(text: string) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const el = document.createElement('textarea');
  el.value = text; document.body.appendChild(el); el.select();
  document.execCommand('copy'); document.body.removeChild(el);
  return Promise.resolve();
}

// ─── styles ────────────────────────────────────────────────────────────────
const BG = '#f0f4f8';
const BG_GRAD = 'radial-gradient(ellipse 80% 60% at 20% 0%,rgba(22,163,74,0.07) 0%,transparent 60%)';
const GREEN = '#10b981';
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, boxShadow: '0 2px 16px rgba(22,163,74,0.08)' };
const labelSt: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#059669', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.1em' };
const inputSt: React.CSSProperties = { width: '100%', padding: '11px 14px', background: '#f9fafb', border: '1.5px solid rgba(16,185,129,0.25)', borderRadius: 11, fontSize: '0.92rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: '#111', transition: 'border-color 0.18s, box-shadow 0.18s' };

// ─── spin keyframes injected once ──────────────────────────────────────────
const SPIN_CSS = `@keyframes _spin{to{transform:rotate(360deg)}} ._spin{animation:_spin 0.9s linear infinite}`;

// ═══════════════════════════════════════════════════════════════════════════
export default function EmpresaCadastro() {

  // ── form state ────────────────────────────────────────────────────────────
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [sgdwBusca, setSgdwBusca] = useState('');
  const [sgdwResultados, setSgdwResultados] = useState<{ CLINUMER: number; NOME: string }[]>([]);
  const [sgdwSelecionada, setSgdwSelecionada] = useState<{ CLINUMER: number; NOME: string } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── list state ────────────────────────────────────────────────────────────
  const [empresas, setEmpresas] = useState<EmpresaPortal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [selecionada, setSelecionada] = useState<EmpresaPortal | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aba, setAba] = useState<'lista' | 'novo'>('lista'); // mobile tabs

  // ── global tab (portal / sgdw) ────────────────────────────────────────────
  const [abaGlobal, setAbaGlobal] = useState<'portal' | 'sgdw'>('portal');

  // ── sgdw list state ───────────────────────────────────────────────────────
  const [sgdwListaBusca, setSgdwListaBusca] = useState('');
  const [sgdwListaResultados, setSgdwListaResultados] = useState<{ CLINUMER: number; NOME: string }[]>([]);
  const [sgdwListaCarregando, setSgdwListaCarregando] = useState(false);
  const [sgdwListaCarregou, setSgdwListaCarregou] = useState(false);
  const sgdwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── quick-register state ──────────────────────────────────────────────────
  const [qrLoading, setQrLoading] = useState<number | null>(null); // CLINUMER being registered
  const [qrSucesso, setQrSucesso] = useState<number | null>(null); // CLINUMER just registered
  const [qrErro, setQrErro] = useState<{ clinumer: number; msg: string } | null>(null);

  // ── load firebase list ────────────────────────────────────────────────────
  const carregarEmpresas = useCallback(async () => {
    setCarregando(true);
    try {
      const snap = await get(rtdbRef(rtdb, 'empresas-portal'));
      const list: EmpresaPortal[] = [];
      if (snap.exists()) snap.forEach(child => { list.push({ id: child.key ?? undefined, ...child.val() } as EmpresaPortal); });
      setEmpresas(list.sort((a, b) => b.criadoEm - a.criadoEm));
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregarEmpresas(); }, [carregarEmpresas]);

  // ── sgdw list ─────────────────────────────────────────────────────────────
  const carregarSgdwLista = useCallback(async (busca: string) => {
    setSgdwListaCarregando(true);
    const res = await sgdwBuscarEmpresas(busca).catch(() => []);
    setSgdwListaResultados(res);
    setSgdwListaCarregando(false);
    setSgdwListaCarregou(true);
  }, []);

  useEffect(() => {
    if (abaGlobal === 'sgdw' && !sgdwListaCarregou) carregarSgdwLista('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaGlobal]);

  const onSgdwListaBusca = (val: string) => {
    setSgdwListaBusca(val);
    if (sgdwTimerRef.current) clearTimeout(sgdwTimerRef.current);
    sgdwTimerRef.current = setTimeout(() => carregarSgdwLista(val.trim()), 450);
  };

  // ── sgdw form search ──────────────────────────────────────────────────────
  const onBuscaSgdw = (val: string) => {
    setSgdwBusca(val); setSgdwSelecionada(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setSgdwResultados([]); return; }
    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      const res = await sgdwBuscarEmpresas(val.trim()).catch(() => []);
      setSgdwResultados(res); setBuscando(false);
    }, 400);
  };

  const selecionarSgdw = (emp: { CLINUMER: number; NOME: string }) => {
    setSgdwSelecionada(emp); setSgdwBusca(emp.NOME); setSgdwResultados([]);
    if (!nome) setNome(emp.NOME);
  };

  // ── quick register from SGDW row ─────────────────────────────────────────
  const handleCadastroRapido = async (emp: { CLINUMER: number; NOME: string }) => {
    const cod = String(emp.CLINUMER);
    setQrLoading(emp.CLINUMER); setQrErro(null);
    try {
      const snap = await get(rtdbRef(rtdb, 'empresas-portal'));
      if (snap.exists()) {
        let dup = false;
        snap.forEach(child => { if (child.val()?.codigo === cod || child.val()?.clinumer === emp.CLINUMER) dup = true; });
        if (dup) { setQrErro({ clinumer: emp.CLINUMER, msg: 'Empresa já cadastrada no portal.' }); return; }
      }
      const payload: EmpresaPortal = { nome: emp.NOME, codigo: cod, clinumer: emp.CLINUMER, sgdwNome: emp.NOME, criadoEm: Date.now(), ativo: true };
      const newRef = await push(rtdbRef(rtdb, 'empresas-portal'), payload);
      // optimistic update — instant reflect on portal list without page reload
      const newEntry: EmpresaPortal = { ...payload, id: newRef.key ?? undefined };
      setEmpresas(prev => [newEntry, ...prev]);
      setQrSucesso(emp.CLINUMER);
      setTimeout(() => setQrSucesso(null), 3000);
    } catch { setQrErro({ clinumer: emp.CLINUMER, msg: 'Erro ao salvar. Tente novamente.' }); }
    finally { setQrLoading(null); }
  };

  const gerarCodigo = () => {
    const base = (sgdwSelecionada?.NOME || nome || 'EMP').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
    setCodigo(`${base}${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // ── submit form ───────────────────────────────────────────────────────────
  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    if (!nome.trim()) { setErro('Informe o nome da empresa.'); return; }
    const cod = codigo.trim().toUpperCase();
    if (!cod) { setErro('Informe o código de acesso.'); return; }
    if (cod.length < 4) { setErro('O código deve ter pelo menos 4 caracteres.'); return; }
    if (!sgdwSelecionada) { setErro('Selecione a empresa no SGDW.'); return; }
    setLoadingForm(true);
    try {
      const snap = await get(rtdbRef(rtdb, 'empresas-portal'));
      if (snap.exists()) {
        let dup = false;
        snap.forEach(child => { if (child.val()?.codigo === cod) dup = true; });
        if (dup) { setErro('Este código já está em uso. Escolha outro.'); setLoadingForm(false); return; }
      }
      const payload: EmpresaPortal = { nome: nome.trim(), codigo: cod, clinumer: sgdwSelecionada.CLINUMER, sgdwNome: sgdwSelecionada.NOME, criadoEm: Date.now(), ativo: true };
      await push(rtdbRef(rtdb, 'empresas-portal'), payload);
      setSucesso(cod);
      setNome(''); setCodigo(''); setSgdwBusca(''); setSgdwSelecionada(null); setSgdwResultados([]);
      await carregarEmpresas();
      setAba('lista');
    } catch { setErro('Erro ao salvar. Verifique a conexão.'); }
    finally { setLoadingForm(false); }
  };

  // ── toggle ativo ──────────────────────────────────────────────────────────
  const toggleAtivo = async (emp: EmpresaPortal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!emp.id) return;
    const novoAtivo = !emp.ativo;
    await update(rtdbRef(rtdb, `empresas-portal/${emp.id}`), { ativo: novoAtivo });
    setEmpresas(prev => prev.map(x => x.id === emp.id ? { ...x, ativo: novoAtivo } : x));
    if (selecionada?.id === emp.id) setSelecionada(prev => prev ? { ...prev, ativo: novoAtivo } : null);
  };

  // ── copy code ─────────────────────────────────────────────────────────────
  const copiarCodigo = (cod: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    copyText(cod).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1400); });
  };

  // ── filtered list ─────────────────────────────────────────────────────────
  const lista = filtro.trim()
    ? empresas.filter(e => e.nome.toLowerCase().includes(filtro.toLowerCase()) || e.codigo.toLowerCase().includes(filtro.toLowerCase()) || e.sgdwNome.toLowerCase().includes(filtro.toLowerCase()))
    : empresas;

  const ativas = empresas.filter(e => e.ativo).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, backgroundImage: BG_GRAD, fontFamily: 'system-ui,sans-serif', color: '#111' }}>
      <style>{SPIN_CSS}{`
        @media(max-width:760px){.emp-grid{grid-template-columns:1fr!important;}.emp-right{display:none}.emp-right.show{display:block!important}.emp-left{display:none}.emp-left.show{display:block!important}.emp-tabs-desktop{display:none!important}.emp-tabs-mobile{display:flex!important}}
        .emp-card-item:hover{background:#f0f4f8!important;border-color:rgba(22,163,74,0.35)!important}
        .emp-card-item.sel{background:#dcfce7!important;border-color:rgba(22,163,74,0.55)!important}
        .emp-copy-btn:hover{background:rgba(22,163,74,0.12)!important}
        .emp-toggle:hover{opacity:0.8}
        .sgdw-row:hover{background:#f0f4f8!important}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(16,185,129,0.25)', background: '#fff', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(22,163,74,0.08)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a href="/empresa" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#6b7280', fontSize: '0.8rem', textDecoration: 'none', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = GREEN)} onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            Login
          </a>
          <div style={{ width: 1, height: 18, background: '#e5e7eb' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(28,184,112,0.14)', border: '1.5px solid rgba(28,184,112,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', color: GREEN, textTransform: 'uppercase' }}>Dehon Despachante</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111', lineHeight: 1.1 }}>Gerenciar Empresas</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!carregando && (
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ padding: '3px 10px', background: 'rgba(28,184,112,0.15)', border: '1px solid rgba(28,184,112,0.3)', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: GREEN }}>{empresas.length} cadastradas</span>
                <span style={{ padding: '3px 10px', background: '#f3f4f6', border: '1px solid #d1fae5', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: '#6b7280' }}>{ativas} ativas</span>
              </div>
            )}
            <button onClick={carregarEmpresas} title="Atualizar lista" style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', border: '1px solid #d1fae5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP TAB BAR ────────────────────────────────────────── */}
      <div className="emp-tabs-desktop" style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginTop: 18, gap: 2 }}>
          {([['portal', 'Empresas Cadastradas'], ['sgdw', 'Empresas SGDW']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setAbaGlobal(key)}
              style={{ padding: '11px 22px', background: 'none', border: 'none', borderBottom: `2.5px solid ${abaGlobal === key ? GREEN : 'transparent'}`, marginBottom: -1, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', color: abaGlobal === key ? GREEN : '#6b7280', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '0.01em' }}>
              {label}
              {key === 'portal' && !carregando && (
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: '0.7rem', background: abaGlobal === 'portal' ? 'rgba(28,184,112,0.18)' : '#e5e7eb', color: abaGlobal === 'portal' ? GREEN : '#6b7280', fontWeight: 700 }}>{empresas.length}</span>
              )}
              {key === 'sgdw' && sgdwListaResultados.length > 0 && (
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: '0.7rem', background: abaGlobal === 'sgdw' ? 'rgba(28,184,112,0.18)' : '#e5e7eb', color: abaGlobal === 'sgdw' ? GREEN : '#6b7280', fontWeight: 700 }}>{sgdwListaResultados.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── MOBILE TABS ────────────────────────────────────────────── */}
      <div style={{ display: 'none', maxWidth: 1160, margin: '0 auto', padding: '12px 16px 0', flexDirection: 'column', gap: 8 }} className="emp-tabs-mobile">
        {/* top-level selector */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(28,184,112,0.08)', border: '1px solid rgba(28,184,112,0.2)', borderRadius: 10, padding: 4 }}>
          {([['portal', 'Portal'], ['sgdw', 'SGDW']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setAbaGlobal(key)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.18s', background: abaGlobal === key ? GREEN : 'transparent', color: abaGlobal === key ? '#fff' : '#4b5563' }}>
              {label}
            </button>
          ))}
        </div>
        {/* sub-tabs for portal */}
        {abaGlobal === 'portal' && (
          <div style={{ display: 'flex', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4 }}>
            {(['lista', 'novo'] as const).map(t => (
              <button key={t} onClick={() => setAba(t)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.18s', background: aba === t ? 'rgba(28,184,112,0.7)' : 'transparent', color: aba === t ? '#fff' : '#4b5563' }}>
                {t === 'lista' ? `Lista (${empresas.length})` : '+ Cadastrar'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── SUCESSO BANNER ─────────────────────────────────────────── */}
      {sucesso && (
        <div style={{ maxWidth: 1160, margin: '20px auto 0', padding: '0 24px' }}>
          <div style={{ background: 'rgba(28,184,112,0.12)', border: '1.5px solid rgba(28,184,112,0.35)', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(28,184,112,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: GREEN, fontSize: '0.95rem', marginBottom: 2 }}>Empresa cadastrada com sucesso!</div>
              <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Código de acesso gerado — compartilhe com a empresa</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', background: 'rgba(28,184,112,0.18)', border: '1px solid rgba(28,184,112,0.3)', padding: '8px 14px', borderRadius: 10 }}>{sucesso}</code>
              <button onClick={() => copiarCodigo(sucesso)} style={{ padding: '8px 14px', background: copiado ? 'rgba(28,184,112,0.3)' : 'rgba(28,184,112,0.12)', border: '1.5px solid rgba(28,184,112,0.3)', borderRadius: 10, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: GREEN, whiteSpace: 'nowrap' }}>
                {copiado ? '✓ Copiado' : 'Copiar'}
              </button>
              <button onClick={() => setSucesso(null)} style={{ width: 30, height: 30, borderRadius: 8, background: '#f3f4f6', border: '1px solid #d1fae5', cursor: 'pointer', color: '#6b7280', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── PORTAL TAB: 2-column layout ─────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {abaGlobal === 'portal' && (
        <div className="emp-grid" style={{ maxWidth: 1160, margin: '24px auto', padding: '0 24px 40px', display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: 20, alignItems: 'start' }}>

          {/* ══ LEFT: FIREBASE LIST ═════════════════════════════════ */}
          <div className={`emp-left ${aba === 'lista' ? 'show' : ''}`}>
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
              {/* List header */}
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111' }}>
                    Empresas cadastradas
                    {!carregando && <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '0.8rem', color: '#9ca3af' }}>({lista.length}{filtro ? ` de ${empresas.length}` : ''})</span>}
                  </div>
                  {selecionada && (
                    <button onClick={() => setSelecionada(null)} style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1fae5', borderRadius: 7, cursor: 'pointer', color: '#6b7280', fontSize: '0.75rem' }}>
                      ✕ Fechar
                    </button>
                  )}
                </div>
                <input
                  placeholder="Filtrar por nome, código ou SGDW..."
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                  style={{ ...inputSt, padding: '9px 13px', fontSize: '0.85rem' }}
                  onFocus={e => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(16,185,129,0.25)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Selected company detail panel */}
              {selecionada && (
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(28,184,112,0.2)', background: 'rgba(28,184,112,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Empresa selecionada</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selecionada.nome}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>SGDW: {selecionada.sgdwNome} <span style={{ color: '#9ca3af' }}>#{selecionada.clinumer}</span></div>
                      <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: 3 }}>Cadastrada em {formatData(selecionada.criadoEm)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '0.14em', background: 'rgba(28,184,112,0.15)', border: '1px solid rgba(28,184,112,0.25)', padding: '7px 12px', borderRadius: 9 }}>{selecionada.codigo}</code>
                        <button className="emp-copy-btn" onClick={() => copiarCodigo(selecionada.codigo)} style={{ padding: '7px 13px', background: 'rgba(28,184,112,0.1)', border: '1.5px solid rgba(28,184,112,0.28)', borderRadius: 9, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: GREEN, transition: 'background 0.15s' }}>
                          {copiado ? '✓ Copiado' : 'Copiar código'}
                        </button>
                      </div>
                      <button
                        className="emp-toggle"
                        onClick={e => toggleAtivo(selecionada, e)}
                        style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s', background: selecionada.ativo ? 'rgba(239,68,68,0.15)' : 'rgba(28,184,112,0.15)', color: selecionada.ativo ? '#fca5a5' : GREEN, border: `1px solid ${selecionada.ativo ? 'rgba(239,68,68,0.3)' : 'rgba(28,184,112,0.3)'}` }}>
                        {selecionada.ativo ? 'Desativar acesso' : 'Reativar acesso'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* List body */}
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {carregando ? (
                  <div style={{ padding: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#9ca3af' }}>
                    <svg width="18" height="18" viewBox="0 0 40 40" className="_spin"><circle cx="20" cy="20" r="16" fill="none" stroke={GREEN} strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/></svg>
                    Carregando empresas...
                  </div>
                ) : lista.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
                    {filtro ? 'Nenhuma empresa encontrada para este filtro.' : 'Nenhuma empresa cadastrada ainda.'}
                  </div>
                ) : (
                  lista.map(emp => (
                    <div
                      key={emp.id}
                      className={`emp-card-item${selecionada?.id === emp.id ? ' sel' : ''}`}
                      onClick={() => setSelecionada(selecionada?.id === emp.id ? null : emp)}
                      style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s', background: selecionada?.id === emp.id ? 'rgba(28,184,112,0.09)' : 'transparent', borderLeft: `3px solid ${selecionada?.id === emp.id ? GREEN : 'transparent'}` }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: emp.ativo ? 'rgba(28,184,112,0.14)' : '#f3f4f6', border: `1.5px solid ${emp.ativo ? 'rgba(28,184,112,0.3)' : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem', fontWeight: 800, color: emp.ativo ? GREEN : '#9ca3af' }}>
                        {emp.nome.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: emp.ativo ? '#111' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.nome}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.sgdwNome}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <code style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: emp.ativo ? '#059669' : '#9ca3af', letterSpacing: '0.1em', background: '#f0f4f8', padding: '2px 8px', borderRadius: 6 }}>{emp.codigo}</code>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: emp.ativo ? GREEN : '#ef4444', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{emp.ativo ? '● ativo' : '○ inativo'}</span>
                      </div>
                      <button
                        className="emp-copy-btn"
                        onClick={e => copiarCodigo(emp.codigo, e)}
                        title="Copiar código"
                        style={{ width: 30, height: 30, borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ══ RIGHT: FORM ═════════════════════════════════════════ */}
          <div className={`emp-right ${aba === 'novo' ? 'show' : ''}`}>
            <div style={{ ...CARD, padding: '28px 26px' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111', marginBottom: 4 }}>Cadastrar Nova Empresa</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Crie o acesso ao portal para um cliente</div>
              </div>

              {erro && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, color: '#dc2626', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {erro}
                </div>
              )}

              <form onSubmit={handleCadastro}>
                <div style={{ marginBottom: 18 }}>
                  <label style={labelSt}>Nome da Empresa</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome no portal" style={inputSt}
                    onFocus={e => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(16,185,129,0.25)'; e.target.style.boxShadow = 'none'; }} />
                </div>

                <div style={{ marginBottom: 18, position: 'relative' }}>
                  <label style={labelSt}>Empresa no SGDW</label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" value={sgdwBusca} onChange={e => onBuscaSgdw(e.target.value)} placeholder="Buscar no SGDW..."
                      style={{ ...inputSt, borderColor: sgdwSelecionada ? 'rgba(28,184,112,0.6)' : 'rgba(16,185,129,0.25)', boxShadow: sgdwSelecionada ? '0 0 0 3px rgba(28,184,112,0.12)' : 'none', paddingRight: buscando ? 40 : 14 }}
                      onFocus={e => { if (!sgdwSelecionada) { e.target.style.borderColor = GREEN; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.15)'; } }}
                      onBlur={e => { if (!sgdwSelecionada) { e.target.style.borderColor = 'rgba(16,185,129,0.25)'; e.target.style.boxShadow = 'none'; } }} />
                    {buscando && (
                      <div style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)' }}>
                        <svg width="14" height="14" viewBox="0 0 40 40" className="_spin"><circle cx="20" cy="20" r="16" fill="none" stroke={GREEN} strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/></svg>
                      </div>
                    )}
                  </div>
                  {sgdwResultados.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 11, boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 50, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                      {sgdwResultados.map(r => (
                        <div key={r.CLINUMER} onClick={() => selecionarSgdw(r)}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(28,184,112,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ fontWeight: 600, color: '#222', fontSize: '0.85rem' }}>{r.NOME}</span>
                          <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace' }}>#{r.CLINUMER}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sgdwSelecionada && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: GREEN, fontSize: '0.76rem', fontWeight: 600 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                      {sgdwSelecionada.NOME} <span style={{ color: '#9ca3af', fontWeight: 400 }}>#{sgdwSelecionada.CLINUMER}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 26 }}>
                  <label style={labelSt}>Código de Acesso</label>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="Ex: BARI2024"
                      style={{ ...inputSt, fontFamily: 'monospace', letterSpacing: '0.12em', flex: 1 }}
                      onFocus={e => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.15)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(16,185,129,0.25)'; e.target.style.boxShadow = 'none'; }} />
                    <button type="button" onClick={gerarCodigo} style={{ padding: '0 14px', background: 'rgba(28,184,112,0.1)', border: '1.5px solid rgba(28,184,112,0.28)', borderRadius: 11, cursor: 'pointer', fontSize: '0.79rem', fontWeight: 700, color: GREEN, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(28,184,112,0.22)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(28,184,112,0.1)'; }}>
                      Gerar
                    </button>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 5 }}>Mínimo 4 caracteres — será o código de login da empresa</div>
                </div>

                <button type="submit" disabled={loadingForm} style={{ width: '100%', padding: '13px', background: loadingForm ? 'rgba(28,184,112,0.4)' : GREEN, color: '#fff', border: 'none', borderRadius: 11, fontSize: '0.92rem', fontWeight: 700, cursor: loadingForm ? 'default' : 'pointer', boxShadow: loadingForm ? 'none' : '0 4px 16px rgba(28,184,112,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.18s' }}>
                  {loadingForm ? (
                    <><svg width="16" height="16" viewBox="0 0 40 40" className="_spin"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/></svg>Cadastrando...</>
                  ) : 'Cadastrar Empresa →'}
                </button>
              </form>
            </div>

            <div style={{ marginTop: 12, padding: '12px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.6 }}>
                <span style={{ color: GREEN, fontWeight: 700 }}>Dica:</span> após cadastrar, selecione a empresa na lista à esquerda para copiar o código e gerenciar o acesso.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── SGDW TAB: full-width companies list ──────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {abaGlobal === 'sgdw' && (
        <div style={{ maxWidth: 1160, margin: '24px auto', padding: '0 24px 40px' }}>
          <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Empresas no SGDW
                    {!sgdwListaCarregando && sgdwListaResultados.length > 0 && (
                      <span style={{ padding: '1px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(28,184,112,0.15)', color: GREEN }}>{sgdwListaResultados.length} encontradas</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Clientes com OS registradas — verde indica que já têm portal ativo</div>
                </div>
                <button onClick={() => carregarSgdwLista(sgdwListaBusca)} title="Recarregar" style={{ width: 34, height: 34, borderRadius: 9, background: '#f3f4f6', border: '1px solid #d1fae5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
              <input
                placeholder="Buscar empresa no SGDW por nome..."
                value={sgdwListaBusca}
                onChange={e => onSgdwListaBusca(e.target.value)}
                style={{ ...inputSt, padding: '9px 13px', fontSize: '0.87rem' }}
                onFocus={e => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(16,185,129,0.25)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Legend */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#6b7280' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(28,184,112,0.45)', border: '1px solid rgba(28,184,112,0.6)' }} />
                Com portal cadastrado
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#6b7280' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
                Sem portal
              </div>
            </div>

            {/* List body */}
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {sgdwListaCarregando ? (
                <div style={{ padding: '52px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#9ca3af' }}>
                  <svg width="22" height="22" viewBox="0 0 40 40" className="_spin"><circle cx="20" cy="20" r="16" fill="none" stroke={GREEN} strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: '0.88rem' }}>Buscando empresas no SGDW...</span>
                </div>
              ) : !sgdwListaCarregou ? (
                <div style={{ padding: '52px 20px', textAlign: 'center' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.88rem', marginBottom: 12 }}>Digite um nome para buscar empresas no SGDW</div>
                </div>
              ) : sgdwListaResultados.length === 0 ? (
                <div style={{ padding: '52px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
                  {sgdwListaBusca ? `Nenhuma empresa encontrada para "${sgdwListaBusca}".` : 'Nenhuma empresa encontrada no SGDW.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 0 }}>
                  {sgdwListaResultados.map((emp, idx) => {
                    const portalEntry = empresas.find(e => e.clinumer === emp.CLINUMER);
                    const hasPortal = !!portalEntry;
                    return (
                      <div
                        key={emp.CLINUMER}
                        className="sgdw-row"
                        style={{
                          padding: '14px 20px',
                          borderBottom: '1px solid #f0f4f8',
                          borderRight: (idx % 2 === 0) ? '1px solid #e5e7eb' : 'none',
                          display: 'flex', alignItems: 'center', gap: 13,
                          transition: 'background 0.14s',
                          background: 'transparent',
                        }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 40, height: 40, borderRadius: 11,
                          background: hasPortal ? 'rgba(28,184,112,0.14)' : '#f3f4f6',
                          border: `1.5px solid ${hasPortal ? 'rgba(28,184,112,0.35)' : '#e5e7eb'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: '0.9rem', fontWeight: 800,
                          color: hasPortal ? GREEN : '#9ca3af',
                        }}>
                          {emp.NOME.charAt(0)}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.NOME}</div>
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 }}>CLINUMER #{emp.CLINUMER}</div>
                        </div>

                        {/* Status */}
                        {hasPortal ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em' }}>● Portal</span>
                            <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.1em', background: 'rgba(28,184,112,0.12)', border: '1px solid rgba(28,184,112,0.22)', padding: '2px 8px', borderRadius: 6 }}>{portalEntry!.codigo}</code>
                            {!portalEntry!.ativo && <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 700 }}>INATIVO</span>}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                            {qrErro?.clinumer === emp.CLINUMER && (
                              <span style={{ fontSize: '0.62rem', color: '#dc2626', maxWidth: 140, textAlign: 'right' }}>{qrErro.msg}</span>
                            )}
                            {qrSucesso === emp.CLINUMER ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: GREEN, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                                Cadastrado!
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCadastroRapido(emp)}
                                disabled={qrLoading === emp.CLINUMER}
                                title={`Cadastrar rapidamente — código: ${emp.CLINUMER}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1.5px solid rgba(28,184,112,0.35)`, background: qrLoading === emp.CLINUMER ? 'rgba(28,184,112,0.08)' : 'rgba(28,184,112,0.12)', cursor: qrLoading === emp.CLINUMER ? 'default' : 'pointer', color: GREEN, fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                                onMouseEnter={e => { if (qrLoading !== emp.CLINUMER) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(28,184,112,0.24)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = qrLoading === emp.CLINUMER ? 'rgba(28,184,112,0.08)' : 'rgba(28,184,112,0.12)'; }}
                              >
                                {qrLoading === emp.CLINUMER ? (
                                  <svg width="12" height="12" viewBox="0 0 40 40" className="_spin"><circle cx="20" cy="20" r="16" fill="none" stroke={GREEN} strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/></svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                )}
                                {qrLoading === emp.CLINUMER ? 'Cadastrando...' : 'Cadastrar'}
                              </button>
                            )}
                            <span style={{ fontSize: '0.6rem', color: '#9ca3af', fontFamily: 'monospace' }}>código: {emp.CLINUMER}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── MOBILE TABS CSS ─────────────────────────────────────────── */}
      <style>{`
        @media(max-width:760px){
          .emp-tabs-mobile{display:flex!important}
          .emp-tabs-desktop{display:none!important}
          .emp-left,.emp-right{display:none!important}
          .emp-left.show,.emp-right.show{display:block!important}
        }
      `}</style>

    </div>
  );
}
