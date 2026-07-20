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
      // Verificar se código já existe (leitura de todos e filtro client-side)
      const snap = await get(rtdbRef(rtdb, 'empresas-portal'));
      if (snap.exists()) {
        let duplicado = false;
        snap.forEach(child => { if (child.val()?.codigo === cod) duplicado = true; });
        if (duplicado) {
          setErro('Este código já está em uso. Escolha outro.');
          setLoading(false);
          return;
        }
      }
      const payload: EmpresaPortal = {
        nome: nome.trim(),
        codigo: cod,
        clinumer: sgdwSelecionada.CLINUMER,
        sgdwNome: sgdwSelecionada.NOME,
        criadoEm: Date.now(),
        ativo: true,
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f2744 0%,#1a4a8a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
        <div style={{ marginBottom: 28 }}>
          <a href="/empresa" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            ← Voltar ao login
          </a>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f2744' }}>Cadastrar Empresa</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Crie o acesso para o portal da empresa</p>
        </div>

        {sucesso && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 4 }}>✓ Empresa cadastrada!</div>
            <div style={{ color: '#166534', fontSize: '0.875rem' }}>Código de acesso gerado:</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, color: '#0f2744', letterSpacing: '0.1em', margin: '8px 0', background: '#dcfce7', padding: '8px 12px', borderRadius: 6, display: 'inline-block' }}>
              {sucesso}
            </div>
            <div style={{ color: '#166534', fontSize: '0.8rem', marginTop: 4 }}>Compartilhe este código com a empresa para que façam login.</div>
            <button onClick={() => setSucesso(null)} style={{ marginTop: 12, padding: '8px 16px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              Cadastrar outra empresa
            </button>
          </div>
        )}

        {!sucesso && (
          <form onSubmit={handleCadastro}>
            {erro && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: '0.875rem' }}>
                {erro}
              </div>
            )}

            {/* Nome da empresa */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nome da Empresa</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome que aparecerá no portal"
                style={inputStyle}
              />
            </div>

            {/* SGDW Search */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label style={labelStyle}>Empresa no SGDW</label>
              <input
                type="text"
                value={sgdwBusca}
                onChange={e => onBuscaSgdw(e.target.value)}
                placeholder="Buscar empresa no SGDW..."
                style={{ ...inputStyle, borderColor: sgdwSelecionada ? '#86efac' : undefined, background: sgdwSelecionada ? '#f0fdf4' : undefined }}
              />
              {buscando && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>Buscando...</div>}
              {sgdwResultados.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
                  {sgdwResultados.map(r => (
                    <div
                      key={r.CLINUMER}
                      onClick={() => selecionarSgdw(r)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <span style={{ fontWeight: 600 }}>{r.NOME}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: 8 }}>#{r.CLINUMER}</span>
                    </div>
                  ))}
                </div>
              )}
              {sgdwSelecionada && (
                <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: 4 }}>
                  ✓ SGDW vinculado: {sgdwSelecionada.NOME} (#{sgdwSelecionada.CLINUMER})
                </div>
              )}
            </div>

            {/* Código */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Código de Acesso</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="Ex: BARI2024"
                  style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.1em', flex: 1, marginBottom: 0 }}
                />
                <button
                  type="button"
                  onClick={gerarCodigo}
                  style={{ padding: '0 14px', background: '#f1f5f9', border: '2px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}
                >
                  Gerar
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Mínimo 4 caracteres. Compartilhe com a empresa.</div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#93c5fd' : '#1a4a8a', color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginBottom: 0 };
