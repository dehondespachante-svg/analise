"use client";
import React, { useState, useRef } from 'react';
import { ref as rtdbRef, push, get } from 'firebase/database';
import { rtdb } from '@/logic/firebase/config/app';
import { sgdwBuscarEmpresas } from './sgdw';
import type { EmpresaPortal } from './sgdw';

export default function EmpresaCadastro() {
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [sgdwBusca, setSgdwBusca] = useState('');
  const [sgdwResultados, setSgdwResultados] = useState<{ CLINUMER: number; NOME: string }[]>([]);
  const [sgdwSelecionada, setSgdwSelecionada] = useState<{ CLINUMER: number; NOME: string } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onBuscaSgdw = (val: string) => {
    setSgdwBusca(val);
    setSgdwSelecionada(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setSgdwResultados([]); return; }
    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      const res = await sgdwBuscarEmpresas(val.trim()).catch(() => []);
      setSgdwResultados(res);
      setBuscando(false);
    }, 400);
  };

  const selecionarSgdw = (emp: { CLINUMER: number; NOME: string }) => {
    setSgdwSelecionada(emp);
    setSgdwBusca(emp.NOME);
    setSgdwResultados([]);
    if (!nome) setNome(emp.NOME);
  };

  const gerarCodigo = () => {
    const base = (sgdwSelecionada?.NOME || nome || 'EMP').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
    const num = Math.floor(1000 + Math.random() * 9000);
    setCodigo(`${base}${num}`);
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) { setErro('Informe o nome da empresa.'); return; }
    const cod = codigo.trim().toUpperCase();
    if (!cod) { setErro('Informe o código de acesso.'); return; }
    if (cod.length < 4) { setErro('O código deve ter pelo menos 4 caracteres.'); return; }
    if (!sgdwSelecionada) { setErro('Selecione a empresa no SGDW.'); return; }

    setLoading(true);
    try {
      const snap = await get(rtdbRef(rtdb, 'empresas-portal'));
      if (snap.exists()) {
        let dup = false;
        snap.forEach(child => { if (child.val()?.codigo === cod) dup = true; });
        if (dup) { setErro('Este código já está em uso. Escolha outro.'); setLoading(false); return; }
      }
      const payload: EmpresaPortal = {
        nome: nome.trim(), codigo: cod,
        clinumer: sgdwSelecionada.CLINUMER,
        sgdwNome: sgdwSelecionada.NOME,
        criadoEm: Date.now(), ativo: true,
      };
      await push(rtdbRef(rtdb, 'empresas-portal'), payload);
      setSucesso(cod);
      setNome(''); setCodigo(''); setSgdwBusca(''); setSgdwSelecionada(null); setSgdwResultados([]);
    } catch {
      setErro('Erro ao salvar. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1e12',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 20% 0%,rgba(28,184,112,0.22) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 100%,rgba(13,90,50,0.28) 0%,transparent 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'system-ui,sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(32px)',
        borderRadius: 24, padding: '44px 40px',
        width: '100%', maxWidth: 500,
        boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <a href="/empresa" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none', marginBottom: 24, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1cb870')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            Voltar ao login
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(28,184,112,0.15)',
              border: '1.5px solid rgba(28,184,112,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1cb870" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em' }}>Cadastrar Empresa</h1>
              <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem' }}>Crie o acesso para o portal da empresa</p>
            </div>
          </div>
        </div>

        {/* Sucesso */}
        {sucesso && (
          <div style={{ background: 'rgba(28,184,112,0.12)', border: '1.5px solid rgba(28,184,112,0.35)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(28,184,112,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1cb870" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <span style={{ fontWeight: 700, color: '#1cb870', fontSize: '1rem' }}>Empresa cadastrada com sucesso!</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginBottom: 10 }}>Código de acesso gerado — compartilhe com a empresa:</div>
            <div style={{
              fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 800,
              color: '#fff', letterSpacing: '0.12em',
              background: 'rgba(28,184,112,0.18)', border: '1px solid rgba(28,184,112,0.3)',
              padding: '12px 18px', borderRadius: 12, display: 'inline-block', marginBottom: 14,
            }}>{sucesso}</div>
            <div/>
            <button onClick={() => setSucesso(null)} style={{ padding: '10px 20px', background: '#1cb870', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.87rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(28,184,112,0.35)' }}>
              Cadastrar outra empresa
            </button>
          </div>
        )}

        {!sucesso && (
          <form onSubmit={handleCadastro}>
            {erro && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {erro}
              </div>
            )}

            {/* Nome */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Nome da Empresa</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome que aparecerá no portal" style={inputSt}
                onFocus={e => { e.target.style.borderColor = '#1cb870'; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.18)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.14)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* SGDW */}
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <label style={labelSt}>Empresa no SGDW</label>
              <div style={{ position: 'relative' }}>
                <input type="text" value={sgdwBusca} onChange={e => onBuscaSgdw(e.target.value)} placeholder="Buscar empresa no SGDW..."
                  style={{ ...inputSt, borderColor: sgdwSelecionada ? 'rgba(28,184,112,0.6)' : 'rgba(255,255,255,0.14)', boxShadow: sgdwSelecionada ? '0 0 0 3px rgba(28,184,112,0.12)' : 'none', paddingRight: buscando ? 42 : 16 }}
                  onFocus={e => { if (!sgdwSelecionada) { e.target.style.borderColor = '#1cb870'; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.18)'; }}}
                  onBlur={e => { if (!sgdwSelecionada) { e.target.style.borderColor = 'rgba(255,255,255,0.14)'; e.target.style.boxShadow = 'none'; }}} />
                {buscando && (
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                    <svg width="16" height="16" viewBox="0 0 40 40" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#1cb870" strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
              {sgdwResultados.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d2117', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 50, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                  {sgdwResultados.map(r => (
                    <div key={r.CLINUMER} onClick={() => selecionarSgdw(r)}
                      style={{ padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(28,184,112,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>{r.NOME}</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', fontFamily: 'monospace' }}>#{r.CLINUMER}</span>
                    </div>
                  ))}
                </div>
              )}
              {sgdwSelecionada && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#1cb870', fontSize: '0.8rem', fontWeight: 600 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                  SGDW vinculado: {sgdwSelecionada.NOME} (#{sgdwSelecionada.CLINUMER})
                </div>
              )}
            </div>

            {/* Código */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelSt}>Código de Acesso</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="Ex: BARI2024"
                  style={{ ...inputSt, fontFamily: 'monospace', letterSpacing: '0.12em', flex: 1, marginBottom: 0 }}
                  onFocus={e => { e.target.style.borderColor = '#1cb870'; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.18)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.14)'; e.target.style.boxShadow = 'none'; }} />
                <button type="button" onClick={gerarCodigo} style={{
                  padding: '0 16px', background: 'rgba(28,184,112,0.12)',
                  border: '1.5px solid rgba(28,184,112,0.3)',
                  borderRadius: 12, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
                  color: '#1cb870', whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(28,184,112,0.22)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(28,184,112,0.12)'; }}>
                  Gerar
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Mínimo 4 caracteres. Será o código de login da empresa.</div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '15px',
              background: loading ? 'rgba(28,184,112,0.4)' : '#1cb870',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(28,184,112,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.18s',
            }}>
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 40 40" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/>
                  </svg>
                  Cadastrando...
                </>
              ) : 'Cadastrar Empresa →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' };
const inputSt: React.CSSProperties = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: '#fff', marginBottom: 0, transition: 'border-color 0.18s, box-shadow 0.18s' };
