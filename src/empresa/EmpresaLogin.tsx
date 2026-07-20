"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref as rtdbRef, get, query as rtdbQuery, orderByChild, equalTo } from 'firebase/database';
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
      const snap = await get(rtdbQuery(rtdbRef(rtdb, 'empresas-portal'), orderByChild('codigo'), equalTo(cod)));
      if (!snap.exists()) {
        setErro('Código não encontrado. Verifique com o despachante.');
        return;
      }
      let empresa: EmpresaPortal | null = null;
      snap.forEach(child => {
        if (!empresa) empresa = { id: child.key ?? undefined, ...child.val() } as EmpresaPortal;
      });
      if (!empresa || !(empresa as EmpresaPortal).ativo) {
        setErro('Acesso inativo. Entre em contato com o despachante.');
        return;
      }
      sessionStorage.setItem('empresa-portal', JSON.stringify(empresa));
      router.push('/empresa/dashboard');
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f2744 0%,#1a4a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '44px 40px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#1a4a8a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f2744' }}>Portal da Empresa</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Acesse com seu código único</p>
        </div>

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#b91c1c', fontSize: '0.875rem' }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Código de Acesso
          </label>
          <input
            type="text"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: BARIGUI2024"
            autoFocus
            style={{ width: '100%', padding: '13px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '1.15rem', fontFamily: 'monospace', letterSpacing: '0.12em', boxSizing: 'border-box', outline: 'none', marginBottom: 20, transition: 'border-color 0.15s' }}
            onFocus={e => (e.target.style.borderColor = '#1a4a8a')}
            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#93c5fd' : '#1a4a8a', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer', letterSpacing: '0.03em' }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
          <a href="/empresa/cadastro" style={{ color: '#1a4a8a', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            Primeiro acesso? Cadastre sua empresa →
          </a>
        </div>
      </div>
    </div>
  );
}
