"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref as rtdbRef, get } from 'firebase/database';
import { rtdb } from '@/logic/firebase/config/app';
import type { EmpresaPortal } from './sgdw';

export default function EmpresaLogin() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();

  useEffect(() => {
    const saved = sessionStorage.getItem('empresa-portal');
    if (saved) router.replace('/empresa/dashboard');
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cod = codigo.trim().toUpperCase();
    if (!cod) { setErro('Informe o código de acesso.'); return; }
    setLoading(true);
    setErro('');
    try {
      const snap = await get(rtdbRef(rtdb, 'empresas-portal'));
      let empresa: EmpresaPortal | null = null;
      if (snap.exists()) {
        snap.forEach(child => {
          if (!empresa && child.val()?.codigo === cod) {
            empresa = { id: child.key ?? undefined, ...child.val() } as EmpresaPortal;
          }
        });
      }
      if (!empresa) { setErro('Código não encontrado. Verifique com o despachante.'); return; }
      if (!(empresa as EmpresaPortal).ativo) { setErro('Acesso inativo. Entre em contato com o despachante.'); return; }
      sessionStorage.setItem('empresa-portal', JSON.stringify(empresa));
      router.push('/empresa/dashboard');
    } catch {
      setErro('Erro de conexão. Tente novamente.');
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
      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(32px)',
        borderRadius: 24, padding: '52px 44px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(28,184,112,0.18)',
            border: '1.5px solid rgba(28,184,112,0.4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, boxShadow: '0 8px 24px rgba(28,184,112,0.25)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1cb870" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v5a2 2 0 0 1-2 2z"/>
              <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', color: '#1cb870', textTransform: 'uppercase', marginBottom: 6 }}>
            Dehon Despachante
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em' }}>
            Portal da Empresa
          </h1>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
            Acesse com seu código único de cliente
          </p>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 24,
            color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Código de Acesso
          </label>
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: BARIGUI2024"
            autoFocus
            style={{
              width: '100%', padding: '14px 18px',
              background: 'rgba(255,255,255,0.07)',
              border: '1.5px solid rgba(255,255,255,0.14)',
              borderRadius: 12, fontSize: '1.2rem',
              fontFamily: 'monospace', letterSpacing: '0.14em',
              boxSizing: 'border-box', outline: 'none',
              color: '#fff', marginBottom: 20,
              transition: 'border-color 0.18s, box-shadow 0.18s',
            }}
            onFocus={e => { e.target.style.borderColor = '#1cb870'; e.target.style.boxShadow = '0 0 0 3px rgba(28,184,112,0.18)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.14)'; e.target.style.boxShadow = 'none'; }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '15px',
              background: loading ? 'rgba(28,184,112,0.4)' : '#1cb870',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(28,184,112,0.4)',
              transition: 'all 0.18s',
            }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 40 40" style={{ animation: 'spin 1s linear infinite' }}>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeDasharray="60 20" strokeLinecap="round"/>
                </svg>
                Verificando...
              </>
            ) : 'Entrar →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.83rem' }}>Primeiro acesso? </span>
          <a href="/empresa/cadastro" style={{ color: '#1cb870', textDecoration: 'none', fontSize: '0.83rem', fontWeight: 700 }}>
            Cadastrar empresa →
          </a>
        </div>
      </div>
    </div>
  );
}
