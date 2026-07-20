"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { sgdwBuscarOs, formatBRL, formatData, MESES } from './sgdw';
import type { EmpresaPortal, OsRow } from './sgdw';

const ANO_ATUAL = new Date().getFullYear();
const MES_ATUAL = new Date().getMonth() + 1;

export default function EmpresaDashboard() {
  const router = useRouter();
  const [empresa, setEmpresa] = useState<EmpresaPortal | null>(null);
  const [ano, setAno] = useState(ANO_ATUAL);
  const [mes, setMes] = useState(MES_ATUAL);
  const [rows, setRows] = useState<OsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('empresa-portal');
    if (!saved) { router.replace('/empresa'); return; }
    setEmpresa(JSON.parse(saved) as EmpresaPortal);
  }, [router]);

  const carregar = useCallback(async (emp: EmpresaPortal, a: number, m: number) => {
    setLoading(true);
    setErro('');
    try {
      const data = await sgdwBuscarOs(emp.clinumer, a, m);
      setRows(data);
      if (data.length === 0) setErro(`Nenhuma OS encontrada em ${MESES[m - 1]}/${a}.`);
    } catch {
      setErro('Erro ao buscar dados do SGDW.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (empresa) carregar(empresa, ano, mes);
  }, [empresa, ano, mes, carregar]);

  const handleMes = (novoMes: number) => setMes(novoMes);
  const handleAno = (novoAno: number) => setAno(novoAno);

  const logout = () => {
    sessionStorage.removeItem('empresa-portal');
    router.push('/empresa');
  };

  // KPIs
  const totalOs = rows.length;
  const totalHonorarios = rows.reduce((s, r) => s + r.HONORARIOS, 0);
  const totalRecebido = rows.reduce((s, r) => s + r.RECEBIDO, 0);
  const totalSaldo = rows.reduce((s, r) => s + r.SALDO, 0);

  if (!empresa) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ color: '#64748b' }}>Carregando...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#0f2744,#1a4a8a)', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>{empresa.nome}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>Portal da Empresa</div>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
          Sair
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
        {/* Filtro mês/ano */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Período:</span>
          <select
            value={mes}
            onChange={e => handleMes(Number(e.target.value))}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', cursor: 'pointer', color: '#0f172a', fontWeight: 500 }}
          >
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={ano}
            onChange={e => handleAno(Number(e.target.value))}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', cursor: 'pointer', color: '#0f172a', fontWeight: 500 }}
          >
            {[0, 1, 2].map(o => { const y = ANO_ATUAL - o; return <option key={y} value={y}>{y}</option>; })}
          </select>
          {loading && <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Carregando...</span>}
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
          <KpiCard label="Total de OS" value={String(totalOs)} sub={`${MESES[mes - 1]}/${ano}`} color="#1a4a8a" icon="📋" />
          <KpiCard label="Valor Total" value={formatBRL(totalHonorarios)} sub="Honorários" color="#0f766e" icon="💰" />
          <KpiCard label="Recebido" value={formatBRL(totalRecebido)} sub="Total pago" color="#15803d" icon="✅" />
          <KpiCard label="A Receber" value={formatBRL(totalSaldo)} sub="Saldo pendente" color={totalSaldo > 0 ? '#b45309' : '#64748b'} icon="⏳" />
        </div>

        {/* Tabela OS */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Ordens de Serviço — {MESES[mes - 1]}/{ano}
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: 20 }}>
              {totalOs} OS
            </span>
          </div>

          {erro && !loading && (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              {erro}
            </div>
          )}

          {!erro && rows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['OS#', 'Data', 'Serviço', 'Placa', 'Cliente/Veículo', 'Valor', 'Recebido', 'Saldo'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.ORDNUMER} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={td}><span style={{ fontWeight: 700, color: '#1a4a8a', fontFamily: 'monospace' }}>{r.ORDNUMER}</span></td>
                      <td style={td}>{formatData(r.DATA)}</td>
                      <td style={{ ...td, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.SERVICO}>{r.SERVICO}</td>
                      <td style={td}><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.PLACA}</span></td>
                      <td style={{ ...td, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.CLIENTE}>{r.CLIENTE}</td>
                      <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{formatBRL(r.HONORARIOS)}</td>
                      <td style={{ ...td, color: '#15803d', fontWeight: 600 }}>{formatBRL(r.RECEBIDO)}</td>
                      <td style={{ ...td, fontWeight: 700, color: r.SALDO > 0 ? '#b45309' : '#64748b' }}>{formatBRL(r.SALDO)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={5} style={{ ...td, fontWeight: 700, color: '#374151' }}>Total ({totalOs} OS)</td>
                    <td style={{ ...td, fontWeight: 700 }}>{formatBRL(totalHonorarios)}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#15803d' }}>{formatBRL(totalRecebido)}</td>
                    <td style={{ ...td, fontWeight: 700, color: totalSaldo > 0 ? '#b45309' : '#64748b' }}>{formatBRL(totalSaldo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const td: React.CSSProperties = { padding: '10px 14px', color: '#374151', verticalAlign: 'middle' };

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{sub}</div>
    </div>
  );
}
