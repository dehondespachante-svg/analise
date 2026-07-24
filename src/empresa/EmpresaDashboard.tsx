"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  sgdwBuscarOs, sgdwBuscarFrota, sgdwBuscarHistorico, sgdwBuscarPendencias, sgdwBuscarOsVeiculo,
  formatBRL, formatData, diasDesde, statusFrota, MESES, MESES_CURTO,
} from './sgdw';
import type { EmpresaPortal, OsRow, FrotaRow, HistoricoMes } from './sgdw';

const ANO_ATUAL = new Date().getFullYear();
const MES_ATUAL = new Date().getMonth() + 1;
type TabId = 'resumo' | 'frota' | 'historico' | 'pendencias';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  pageBg: '#f0f4f8',
  contentBg: '#f0f4f8',
  sidebarBg: '#ffffff',
  accent: '#10b981',
  accentHover: '#059669',
  accentMuted: 'rgba(16,185,129,0.1)',
  accentGlow: '0 0 0 3px rgba(16,185,129,0.15)',
  cardBg: '#ffffff',
  cardBorder: 'rgba(0,0,0,0.07)',
  cardShadow: '0 1px 3px rgba(0,0,0,0.05), 0 6px 24px rgba(0,0,0,0.06)',
  textPrimary: '#0f172a',
  textSec: '#334155',
  textMuted: '#64748b',
  rowAlt: 'rgba(16,185,129,0.04)',
  rowHover: 'rgba(16,185,129,0.07)',
  tableBorder: 'rgba(0,0,0,0.06)',
  tableHeader: '#f0f4f8',
};

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ cor, label }: { cor: string; label: string }) {
  const m: Record<string, [string, string, string]> = {
    green:  ['rgba(21,128,61,0.09)',  '#15803d', 'rgba(21,128,61,0.22)'],
    yellow: ['rgba(146,64,14,0.09)',  '#92400e', 'rgba(146,64,14,0.22)'],
    red:    ['rgba(185,28,28,0.09)',  '#b91c1c', 'rgba(185,28,28,0.22)'],
    gray:   ['rgba(71,85,105,0.09)',  '#475569', 'rgba(71,85,105,0.22)'],
    blue:   ['rgba(29,78,216,0.09)',  '#1d4ed8', 'rgba(29,78,216,0.22)'],
  };
  const [bg, fg, bd] = m[cor] ?? m.gray;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, fontSize: '0.67rem', fontWeight: 700, background: bg, color: fg, letterSpacing: '0.03em', border: `1px solid ${bd}`, fontVariantNumeric: 'tabular-nums' }}>
      {label}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '56px 0', color: C.textMuted }}>
      <svg width="32" height="32" viewBox="0 0 40 40" style={{ animation: 'ep-spin 0.9s linear infinite' }}>
        <style>{`@keyframes ep-spin{to{transform:rotate(360deg)}}`}</style>
        <circle cx="20" cy="20" r="16" fill="none" stroke={C.accent} strokeWidth="3" strokeDasharray="55 25" strokeLinecap="round"/>
      </svg>
      <div style={{ marginTop: 14, fontSize: '0.8rem', fontWeight: 500, color: C.textMuted, letterSpacing: '0.01em' }}>Consultando SGDW...</div>
    </div>
  );
}

// ─── Vazio ────────────────────────────────────────────────────────────────────
function Vazio({ msg }: { msg: string }) {
  return <div style={{ padding: '52px 20px', textAlign: 'center', color: C.textMuted, fontSize: '0.84rem', fontWeight: 500, letterSpacing: '0.01em' }}>{msg}</div>;
}

// ─── Paginação ────────────────────────────────────────────────────────────────
function usePagination<T>(items: T[], defaultSize = 25) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(defaultSize);
  const total = Math.ceil(items.length / size) || 1;
  const safePage = Math.min(page, total);
  const slice = items.slice((safePage - 1) * size, safePage * size);

  // reset to page 1 whenever items change
  const itemKey = items.length;
  React.useEffect(() => { setPage(1); }, [itemKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { slice, page: safePage, total, size, setPage, setSize };
}

function Paginacao({ page, total, size, setPage, setSize, count, totalItems }: {
  page: number; total: number; size: number;
  setPage: (p: number) => void; setSize: (s: number) => void;
  count: number; totalItems: number;
}) {
  if (totalItems === 0) return null;
  const ini = (page - 1) * size + 1;
  const fim = Math.min(page * size, totalItems);
  const pages = Array.from({ length: Math.min(total, 7) }, (_, i) => {
    if (total <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= total - 3) return total - 6 + i;
    return page - 3 + i;
  });

  const btnBase: React.CSSProperties = {
    minWidth: 30, height: 30, border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 7, background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.8rem', fontWeight: 600, color: C.textSec,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
    transition: 'all 0.13s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  };
  const btnActive: React.CSSProperties = { ...btnBase, background: C.accent, color: '#fff', border: `1px solid ${C.accent}`, boxShadow: `0 2px 8px rgba(28,184,112,0.4)` };
  const btnDisabled: React.CSSProperties = { ...btnBase, opacity: 0.3, cursor: 'default', boxShadow: 'none' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '11px 20px', borderTop: `1px solid ${C.tableBorder}`, background: '#fafcfb' }}>
      <span style={{ fontSize: '0.76rem', fontWeight: 500, color: C.textMuted }}>
        <strong style={{ color: C.textSec, fontWeight: 600 }}>{ini}–{fim}</strong> de <strong style={{ color: C.textSec, fontWeight: 600 }}>{totalItems}</strong> registros
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button style={page === 1 ? btnDisabled : btnBase} disabled={page === 1}
          onClick={() => setPage(1)} title="Primeira">«</button>
        <button style={page === 1 ? btnDisabled : btnBase} disabled={page === 1}
          onClick={() => setPage(page - 1)} title="Anterior">‹</button>
        {pages.map(p => (
          <button key={p} style={p === page ? btnActive : btnBase} onClick={() => setPage(p)}>{p}</button>
        ))}
        <button style={page === total ? btnDisabled : btnBase} disabled={page === total}
          onClick={() => setPage(page + 1)} title="Próxima">›</button>
        <button style={page === total ? btnDisabled : btnBase} disabled={page === total}
          onClick={() => setPage(total)} title="Última">»</button>
        <select value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}
          style={{ marginLeft: 8, padding: '4px 8px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 7, fontSize: '0.78rem', color: C.textPrimary, background: '#fff', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s} / pág.</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Chip de filtro ───────────────────────────────────────────────────────────
function FiltroChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', fontWeight: 700, color: C.accent, background: C.accentMuted, border: `1px solid rgba(28,184,112,0.22)`, padding: '2px 8px 2px 10px', borderRadius: 7 }}>
      {label}
      <button onClick={onClear} style={{ background: 'rgba(28,184,112,0.12)', border: 'none', cursor: 'pointer', color: C.accent, padding: '1px 4px', lineHeight: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', borderRadius: 4, fontWeight: 800 }}>✕</button>
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, onClick, active }: {
  label: string; value: string; sub?: string; color: string; icon: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <div onClick={onClick} style={{
      background: active ? `${color}12` : C.cardBg,
      border: `1px solid ${active ? color + '50' : C.cardBorder}`,
      borderRadius: 14, padding: '15px 16px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: active ? `0 4px 24px ${color}25, 0 1px 4px rgba(0,0,0,0.05)` : C.cardShadow,
      minWidth: 0, position: 'relative', overflow: 'hidden',
    }}>
      {/* Accent top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: active ? color : 'transparent', borderRadius: '14px 14px 0 0', transition: 'background 0.2s' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? color : C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
        <span style={{ fontSize: '1.1rem', lineHeight: 1, opacity: active ? 1 : 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: active ? color : C.textPrimary, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.67rem', fontWeight: 500, color: active ? `${color}bb` : C.textMuted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Table primitives ─────────────────────────────────────────────────────────
const thSt: React.CSSProperties = {
  padding: '11px 16px', textAlign: 'left', fontWeight: 700,
  color: '#3d6b4e', fontSize: '0.65rem', textTransform: 'uppercase',
  letterSpacing: '0.09em', whiteSpace: 'nowrap',
  background: C.tableHeader, borderBottom: `1.5px solid ${C.tableBorder}`,
};
const tdSt: React.CSSProperties = {
  padding: '11px 16px', color: C.textPrimary, fontSize: '0.875rem',
  borderBottom: `1px solid ${C.tableBorder}`, verticalAlign: 'middle',
  fontVariantNumeric: 'tabular-nums',
};

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 14, overflow: 'hidden', boxShadow: C.cardShadow }}>
      {children}
    </div>
  );
}
function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.tableBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: '#fafcfb' }}>
      {children}
    </div>
  );
}

// ─── Helpers status ───────────────────────────────────────────────────────────
type FiltroStatus = null | 'todos' | 'pago' | 'parcial' | 'pendente';
function osStatus(r: OsRow): 'pago' | 'parcial' | 'pendente' {
  if (r.SALDO <= 0) return 'pago';
  if (r.RECEBIDO > 0) return 'parcial';
  return 'pendente';
}
const selSt: React.CSSProperties = {
  padding: '7px 11px', background: '#fff',
  border: `1px solid ${C.cardBorder}`, borderRadius: 9,
  color: C.textPrimary, fontSize: '0.84rem', cursor: 'pointer', outline: 'none',
  fontFamily: 'inherit', fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: DETALHES DA OS
// ═══════════════════════════════════════════════════════════════════════════════
function OsModal({ os, onClose }: { os: OsRow; onClose: () => void }) {
  const st = os.SALDO <= 0 ? 'pago' : os.RECEBIDO > 0 ? 'parcial' : 'pendente';
  const stConf: Record<string, { cor: string; label: string }> = {
    pago:    { cor: 'green',  label: 'Pago' },
    parcial: { cor: 'yellow', label: 'Parcial' },
    pendente:{ cor: 'red',    label: 'Pendente' },
  };
  const { cor, label } = stConf[st];
  const pct = os.HONORARIOS > 0 ? Math.min((os.RECEBIDO / os.HONORARIOS) * 100, 100) : 0;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,16,10,0.72)', backdropFilter: 'blur(12px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 96px rgba(0,0,0,0.5), 0 0 0 1px rgba(28,184,112,0.15)' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', background: C.tableHeader, borderBottom: `1px solid ${C.tableBorder}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: C.accentMuted, border: '1px solid rgba(28,184,112,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 800, color: C.accent }}>OS #{os.ORDNUMER}</span>
              <Badge cor={cor} label={label} />
            </div>
            <div style={{ color: C.textSec, fontSize: '0.82rem', marginTop: 1 }}>{formatData(os.DATA)}{os.PLACA !== '-' ? ` · ${os.PLACA}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Serviço + Cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: os.CLIENTE !== '-' ? '1fr 1fr' : '1fr', gap: 10 }}>
            <div style={{ background: '#f9fdfb', border: '1px solid rgba(28,184,112,0.13)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Serviço</div>
              <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '0.92rem' }}>{os.SERVICO}</div>
            </div>
            {os.CLIENTE !== '-' && (
              <div style={{ background: '#f9fdfb', border: '1px solid rgba(28,184,112,0.13)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Proprietário / Cliente</div>
                <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '0.92rem' }}>{os.CLIENTE}</div>
              </div>
            )}
          </div>

          {/* Placa + Data */}
          {os.PLACA !== '-' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f9fdfb', border: '1px solid rgba(28,184,112,0.13)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Placa</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1d4ed8', fontSize: '1.15rem', letterSpacing: '0.05em' }}>{os.PLACA}</div>
              </div>
              <div style={{ background: '#f9fdfb', border: '1px solid rgba(28,184,112,0.13)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Data de Emissão</div>
                <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '0.98rem' }}>{formatData(os.DATA)}</div>
              </div>
            </div>
          )}

          {/* Financeiro */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <div style={{ background: '#f9fdfb', border: '1px solid rgba(28,184,112,0.13)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Honorários</div>
              <div style={{ fontWeight: 800, color: C.textPrimary, fontSize: '1.05rem' }}>{formatBRL(os.HONORARIOS)}</div>
            </div>
            <div style={{ background: '#f9fdfb', border: '1px solid rgba(28,184,112,0.13)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Recebido</div>
              <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1.05rem' }}>{formatBRL(os.RECEBIDO)}</div>
            </div>
            <div style={{ background: os.SALDO > 0 ? '#fff7ed' : '#f9fdfb', border: `1px solid ${os.SALDO > 0 ? 'rgba(180,83,9,0.25)' : 'rgba(28,184,112,0.13)'}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Saldo</div>
              <div style={{ fontWeight: 800, color: os.SALDO > 0 ? '#b45309' : C.textMuted, fontSize: '1.05rem' }}>{formatBRL(os.SALDO)}</div>
            </div>
          </div>

          {/* Barra de pagamento */}
          {os.HONORARIOS > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.72rem', color: C.textMuted }}>
                <span>Pagamento realizado</span>
                <span style={{ fontWeight: 700, color: os.SALDO <= 0 ? '#15803d' : '#b45309' }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ background: 'rgba(28,184,112,0.12)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: os.SALDO <= 0 ? 'linear-gradient(90deg,#1cb870,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: 6, transition: 'width 0.6s' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: RESUMO
// ═══════════════════════════════════════════════════════════════════════════════
function TabResumo({ clinumer, ano, mes, onAno, onMes }: { clinumer: number; ano: number; mes: number; onAno: (a: number) => void; onMes: (m: number) => void }) {
  const [rows, setRows] = useState<OsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>(null);
  const [selectedOs, setSelectedOs] = useState<OsRow | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true); setFiltroStatus(null);
    sgdwBuscarOs(clinumer, ano, mes).then(r => { setRows(r); setLoading(false); });
  }, [clinumer, ano, mes]);

  const totalHon   = rows.reduce((s, r) => s + r.HONORARIOS, 0);
  const totalRec   = rows.reduce((s, r) => s + r.RECEBIDO, 0);
  const totalSaldo = rows.reduce((s, r) => s + r.SALDO, 0);
  const nPago      = rows.filter(r => osStatus(r) === 'pago').length;
  const nParcial   = rows.filter(r => osStatus(r) === 'parcial').length;
  const nPendente  = rows.filter(r => osStatus(r) === 'pendente').length;
  const placas     = new Set(rows.map(r => r.PLACA).filter(p => p !== '-')).size;

  const toggle = (f: FiltroStatus) => setFiltroStatus(p => p === f ? null : f);
  const visivel = !filtroStatus || filtroStatus === 'todos' ? rows : rows.filter(r => osStatus(r) === filtroStatus);
  const totalVisHon = visivel.reduce((s, r) => s + r.HONORARIOS, 0);
  const totalVisRec = visivel.reduce((s, r) => s + r.RECEBIDO, 0);
  const totalVisSal = visivel.reduce((s, r) => s + r.SALDO, 0);
  const filtroLabel: Record<string, string> = { pago: 'Pagas', parcial: 'Parciais', pendente: 'Pendentes', todos: 'Todas' };
  const pag = usePagination(visivel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Filtro período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Período</span>
        <select value={mes} onChange={e => onMes(Number(e.target.value))} style={selSt}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => onAno(Number(e.target.value))} style={selSt}>
          {[0, 1, 2].map(o => { const y = ANO_ATUAL - o; return <option key={y} value={y}>{y}</option>; })}
        </select>
      </div>

      {/* KPIs financeiros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12 }}>
        <KpiCard label="OS no mês" value={String(rows.length)} sub={`${MESES[mes-1]} ${ano}`} color={C.accent} icon="📋" />
        <KpiCard label="Valor total" value={formatBRL(totalHon)} sub="Honorários" color="#0f766e" icon="💰" />
        <KpiCard label="Recebido" value={formatBRL(totalRec)} sub="Total pago" color="#15803d" icon="✅" />
        <KpiCard label="A receber" value={formatBRL(totalSaldo)} sub="Saldo" color={totalSaldo > 0 ? '#b45309' : C.textMuted} icon="⏳" />
        <KpiCard label="Veículos" value={String(placas)} sub="Placas únicas" color="#6d28d9" icon="🚛" />
      </div>

      {/* Status cards clicáveis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KpiCard label="Pagas" value={String(nPago)} sub="Saldo zerado" color="#15803d" icon="✅"
          onClick={() => toggle('pago')} active={filtroStatus === 'pago'} />
        <KpiCard label="Parcialmente pagas" value={String(nParcial)} sub="Saldo restante" color="#b45309" icon="🔶"
          onClick={() => toggle('parcial')} active={filtroStatus === 'parcial'} />
        <KpiCard label="Pendentes" value={String(nPendente)} sub="Sem pagamento" color="#b91c1c" icon="⏳"
          onClick={() => toggle('pendente')} active={filtroStatus === 'pendente'} />
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: C.textPrimary }}>OS — {MESES[mes-1]} {ano}</span>
            {filtroStatus && filtroStatus !== 'todos' && <FiltroChip label={filtroLabel[filtroStatus]} onClear={() => setFiltroStatus(null)} />}
          </div>
          <Badge cor="blue" label={`${visivel.length}${filtroStatus ? ` / ${rows.length}` : ''} OS`} />
        </CardHeader>
        {loading ? <Spinner /> : rows.length === 0 ? <Vazio msg={`Nenhuma OS em ${MESES[mes-1]} ${ano}`} /> :
         visivel.length === 0 ? <Vazio msg="Nenhuma OS com esse status" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['OS#','Data','Serviço','Placa','Proprietário','Valor','Recebido','Saldo','Status',''].map((h, idx) => (
                  <th key={idx} style={{ ...thSt, ...(idx === 9 ? { width: 44 } : {}) }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pag.slice.map((r, i) => {
                  const hov = hoveredRow === r.ORDNUMER;
                  return (
                    <tr key={r.ORDNUMER}
                      style={{ background: hov ? C.rowHover : i % 2 ? C.rowAlt : 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => setSelectedOs(r)}
                      onMouseEnter={() => setHoveredRow(r.ORDNUMER)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={tdSt}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.accent }}>{r.ORDNUMER}</span></td>
                      <td style={{ ...tdSt, color: C.textSec }}>{formatData(r.DATA)}</td>
                      <td style={{ ...tdSt, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.SERVICO}>{r.SERVICO}</td>
                      <td style={tdSt}><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1d4ed8' }}>{r.PLACA}</span></td>
                      <td style={{ ...tdSt, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.textSec }}>{r.CLIENTE}</td>
                      <td style={{ ...tdSt, fontWeight: 600 }}>{formatBRL(r.HONORARIOS)}</td>
                      <td style={{ ...tdSt, color: '#15803d', fontWeight: 600 }}>{formatBRL(r.RECEBIDO)}</td>
                      <td style={{ ...tdSt, fontWeight: 700, color: r.SALDO > 0 ? '#b45309' : C.textMuted }}>{formatBRL(r.SALDO)}</td>
                      <td style={tdSt}>
                        {r.SALDO <= 0 ? <Badge cor="green" label="Pago" /> :
                         r.RECEBIDO > 0 ? <Badge cor="yellow" label="Parcial" /> :
                         <Badge cor="red" label="Pendente" />}
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', padding: '6px 8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: hov ? C.accentMuted : 'transparent', color: hov ? C.accent : C.textMuted, transition: 'all 0.12s' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(28,184,112,0.06)', borderTop: `2px solid rgba(28,184,112,0.25)` }}>
                  <td colSpan={5} style={{ ...tdSt, fontWeight: 700, color: C.accent }}>
                    Total {filtroStatus && filtroStatus !== 'todos' ? `(${visivel.length} de ${rows.length})` : `(${rows.length} OS)`}
                  </td>
                  <td style={{ ...tdSt, fontWeight: 700 }}>{formatBRL(totalVisHon)}</td>
                  <td style={{ ...tdSt, fontWeight: 700, color: '#15803d' }}>{formatBRL(totalVisRec)}</td>
                  <td style={{ ...tdSt, fontWeight: 700, color: totalVisSal > 0 ? '#b45309' : C.textMuted }}>{formatBRL(totalVisSal)}</td>
                  <td colSpan={2} style={tdSt} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <Paginacao {...pag} count={pag.slice.length} totalItems={visivel.length} />
      </Card>

      {selectedOs && <OsModal os={selectedOs} onClose={() => setSelectedOs(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: DETALHES DO VEÍCULO
// ═══════════════════════════════════════════════════════════════════════════════
function VeiculoModal({ veiculo, clinumer, onClose }: { veiculo: FrotaRow; clinumer: number; onClose: () => void }) {
  const [osRows, setOsRows] = useState<OsRow[]>([]);
  const [loadingOs, setLoadingOs] = useState(true);
  const pagOs = usePagination(osRows, 10);

  const st = statusFrota(veiculo.ULTIMO_SERVICO, veiculo.ULTIMO_IPVA);
  const stConf: Record<string, { cor: string; label: string }> = {
    ok: { cor: 'green', label: 'Em dia' },
    alerta: { cor: 'yellow', label: 'Atenção' },
    vencido: { cor: 'red', label: 'Vencido' },
    'sem-info': { cor: 'gray', label: 'Sem data' },
  };
  const { cor, label } = stConf[st];
  const diasIpva = veiculo.ULTIMO_IPVA ? diasDesde(veiculo.ULTIMO_IPVA) : null;
  const diasServ = veiculo.ULTIMO_SERVICO ? diasDesde(veiculo.ULTIMO_SERVICO) : null;

  useEffect(() => {
    sgdwBuscarOsVeiculo(veiculo.VEINUMER, clinumer)
      .then(r => { setOsRows(r); setLoadingOs(false); });
  }, [veiculo.VEINUMER, clinumer]);

  const infoItems = [
    { label: 'Marca / Modelo',   value: veiculo.MARCA || '—',           mono: false },
    { label: 'RENAVAM',          value: veiculo.RENAVAM || '—',         mono: true  },
    { label: 'Cód. Veículo',     value: String(veiculo.VEINUMER),       mono: true  },
    { label: 'Último Serviço',   value: formatData(veiculo.ULTIMO_SERVICO), sub: diasServ != null ? `${diasServ} dias atrás` : '', mono: false },
    { label: 'Último IPVA/Lic.', value: veiculo.ULTIMO_IPVA ? formatData(veiculo.ULTIMO_IPVA) : '—', sub: diasIpva != null ? `${diasIpva} dias atrás` : '', mono: false },
    { label: 'Total OS',         value: String(veiculo.TOTAL_OS),       sub: 'ordens de serviço', mono: false },
    { label: 'Saldo Pendente',   value: formatBRL(veiculo.SALDO_PENDENTE), highlight: veiculo.SALDO_PENDENTE > 0, mono: false },
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(7,16,10,0.72)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 800, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 96px rgba(0,0,0,0.5), 0 0 0 1px rgba(28,184,112,0.15)' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', background: C.tableHeader, borderBottom: `1px solid ${C.tableBorder}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: C.accentMuted, border: '1px solid rgba(28,184,112,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.06em' }}>{veiculo.PLACA}</span>
              <Badge cor={cor} label={label} />
            </div>
            <div style={{ color: C.textSec, fontSize: '0.85rem', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{veiculo.PROPRIETARIO}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10, marginBottom: 22 }}>
            {infoItems.map(item => (
              <div key={item.label} style={{ background: '#f9fdfb', border: '1px solid rgba(28,184,112,0.13)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: (item as any).highlight ? '#b45309' : C.textPrimary, fontFamily: item.mono ? 'monospace' : undefined }}>
                  {item.value}
                </div>
                {(item as any).sub && <div style={{ fontSize: '0.7rem', color: C.textMuted, marginTop: 2 }}>{(item as any).sub}</div>}
              </div>
            ))}
          </div>

          {/* OS history */}
          <div style={{ borderTop: `1px solid rgba(28,184,112,0.13)`, paddingTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: C.textPrimary, fontSize: '0.9rem' }}>Histórico de Serviços</span>
              {!loadingOs && <Badge cor="blue" label={`${osRows.length} OS`} />}
              {!loadingOs && osRows.reduce((s, r) => s + r.SALDO, 0) > 0 && (
                <Badge cor="yellow" label={`Saldo: ${formatBRL(osRows.reduce((s, r) => s + r.SALDO, 0))}`} />
              )}
            </div>
            {loadingOs ? <Spinner /> : osRows.length === 0 ? <Vazio msg="Nenhuma OS encontrada para este veículo" /> : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {['Nº OS', 'Data', 'Serviço', 'Honorários', 'Recebido', 'Saldo'].map(h => (
                        <th key={h} style={thSt}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {pagOs.slice.map((o, i) => (
                        <tr key={o.ORDNUMER} style={{ background: i % 2 ? C.rowAlt : 'transparent' }}>
                          <td style={{ ...tdSt, fontFamily: 'monospace', fontWeight: 700, color: C.accent }}>{o.ORDNUMER}</td>
                          <td style={tdSt}>{formatData(o.DATA)}</td>
                          <td style={{ ...tdSt, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.SERVICO}</td>
                          <td style={tdSt}>{formatBRL(o.HONORARIOS)}</td>
                          <td style={{ ...tdSt, color: '#15803d', fontWeight: 600 }}>{formatBRL(o.RECEBIDO)}</td>
                          <td style={{ ...tdSt, fontWeight: 700, color: o.SALDO > 0 ? '#b45309' : C.textMuted }}>{formatBRL(o.SALDO)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {osRows.length > 0 && (
                      <tfoot>
                        <tr style={{ background: 'rgba(28,184,112,0.06)', borderTop: `2px solid rgba(28,184,112,0.22)` }}>
                          <td colSpan={3} style={{ ...tdSt, fontWeight: 700, color: C.accent }}>Total ({osRows.length} OS)</td>
                          <td style={{ ...tdSt, fontWeight: 700 }}>{formatBRL(osRows.reduce((s, r) => s + r.HONORARIOS, 0))}</td>
                          <td style={{ ...tdSt, fontWeight: 700, color: '#15803d' }}>{formatBRL(osRows.reduce((s, r) => s + r.RECEBIDO, 0))}</td>
                          <td style={{ ...tdSt, fontWeight: 700, color: '#b45309' }}>{formatBRL(osRows.reduce((s, r) => s + r.SALDO, 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <Paginacao {...pagOs} count={pagOs.slice.length} totalItems={osRows.length} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: FROTA
// ═══════════════════════════════════════════════════════════════════════════════
type FiltroFrota = null | 'ok' | 'alerta' | 'vencido' | 'sem-info' | 'com-saldo';

function TabFrota({ clinumer }: { clinumer: number }) {
  const [rows, setRows] = useState<FrotaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroFrota, setFiltroFrota] = useState<FiltroFrota>(null);
  const [selectedVeiculo, setSelectedVeiculo] = useState<FrotaRow | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => { sgdwBuscarFrota(clinumer).then(r => { setRows(r); setLoading(false); }); }, [clinumer]);

  const stConf = { ok: { cor: 'green', label: 'Em dia' }, alerta: { cor: 'yellow', label: 'Atenção' }, vencido: { cor: 'red', label: 'Vencido' }, 'sem-info': { cor: 'gray', label: 'Sem data' } };
  const nOk      = rows.filter(r => statusFrota(r.ULTIMO_SERVICO, r.ULTIMO_IPVA) === 'ok').length;
  const nAlerta  = rows.filter(r => statusFrota(r.ULTIMO_SERVICO, r.ULTIMO_IPVA) === 'alerta').length;
  const nVencido = rows.filter(r => statusFrota(r.ULTIMO_SERVICO, r.ULTIMO_IPVA) === 'vencido').length;
  const nSemInfo = rows.filter(r => statusFrota(r.ULTIMO_SERVICO, r.ULTIMO_IPVA) === 'sem-info').length;
  const nComSaldo = rows.filter(r => r.SALDO_PENDENTE > 0).length;
  const toggle = (f: FiltroFrota) => setFiltroFrota(p => p === f ? null : f);
  const filtroLabel: Record<string, string> = { ok: 'Em dia', alerta: 'Atenção', vencido: 'Vencido', 'sem-info': 'Sem data', 'com-saldo': 'Com saldo' };

  const visible = rows.filter(r => {
    const st = statusFrota(r.ULTIMO_SERVICO, r.ULTIMO_IPVA);
    const passaSt = !filtroFrota || (filtroFrota === 'com-saldo' ? r.SALDO_PENDENTE > 0 : st === filtroFrota);
    const passaBusca = !busca || r.PLACA.includes(busca.toUpperCase()) || r.PROPRIETARIO.toLowerCase().includes(busca.toLowerCase()) || r.MARCA.toLowerCase().includes(busca.toLowerCase());
    return passaSt && passaBusca;
  });
  const pagF = usePagination(visible);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        <KpiCard label="Total frota" value={String(rows.length)} sub="Veículos" color={C.accent} icon="🚛" />
        <KpiCard label="Em dia" value={String(nOk)} sub="IPVA/Licenc." color="#15803d" icon="✅"
          onClick={() => toggle('ok')} active={filtroFrota === 'ok'} />
        <KpiCard label="Atenção" value={String(nAlerta)} sub="Próx. vencimento" color="#b45309" icon="⚠️"
          onClick={() => toggle('alerta')} active={filtroFrota === 'alerta'} />
        <KpiCard label="Vencido" value={String(nVencido)} sub="Renovar já" color="#b91c1c" icon="🔴"
          onClick={() => toggle('vencido')} active={filtroFrota === 'vencido'} />
        <KpiCard label="Sem data" value={String(nSemInfo)} sub="Sem histórico" color="#475569" icon="❓"
          onClick={() => toggle('sem-info')} active={filtroFrota === 'sem-info'} />
        <KpiCard label="Com saldo" value={String(nComSaldo)} sub="A receber" color="#6d28d9" icon="💳"
          onClick={() => toggle('com-saldo')} active={filtroFrota === 'com-saldo'} />
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: C.textPrimary }}>Frota da Empresa</span>
            {filtroFrota && <FiltroChip label={filtroLabel[filtroFrota]} onClear={() => setFiltroFrota(null)} />}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="Buscar placa, proprietário, marca..." value={busca} onChange={e => setBusca(e.target.value)}
              style={{ ...selSt, width: 240, padding: '7px 12px' }} />
            <Badge cor="blue" label={`${visible.length}${filtroFrota ? ` / ${rows.length}` : ''} veículos`} />
          </div>
        </CardHeader>
        {loading ? <Spinner /> : rows.length === 0 ? <Vazio msg="Nenhum veículo encontrado" /> :
         visible.length === 0 ? <Vazio msg="Nenhum veículo com esse filtro" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Placa','Proprietário','Marca','RENAVAM','Último Serviço','Último IPVA/Lic.','Dias sem IPVA','Total OS','Saldo','Status',''].map((h, idx) => <th key={idx} style={{ ...thSt, ...(idx === 10 ? { width: 48, textAlign: 'center' } : {}) }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {pagF.slice.map((r, i) => {
                  const st = statusFrota(r.ULTIMO_SERVICO, r.ULTIMO_IPVA);
                  const { cor, label } = stConf[st];
                  const diasIpva = r.ULTIMO_IPVA ? diasDesde(r.ULTIMO_IPVA) : null;
                  const hovered = hoveredRow === r.VEINUMER;
                  return (
                    <tr
                      key={r.VEINUMER}
                      style={{ background: hovered ? 'rgba(28,184,112,0.09)' : i % 2 ? C.rowAlt : 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => setSelectedVeiculo(r)}
                      onMouseEnter={() => setHoveredRow(r.VEINUMER)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={tdSt}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', fontSize: '0.95rem' }}>{r.PLACA}</span></td>
                      <td style={{ ...tdSt, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.textSec }}>{r.PROPRIETARIO}</td>
                      <td style={{ ...tdSt, color: C.textSec }}>{r.MARCA}</td>
                      <td style={{ ...tdSt, fontFamily: 'monospace', fontSize: '0.8rem', color: C.textMuted }}>{r.RENAVAM}</td>
                      <td style={{ ...tdSt, color: C.textSec }}>{formatData(r.ULTIMO_SERVICO)}</td>
                      <td style={{ ...tdSt, color: C.textSec }}>{r.ULTIMO_IPVA ? formatData(r.ULTIMO_IPVA) : <span style={{ color: C.textMuted }}>—</span>}</td>
                      <td style={{ ...tdSt, fontWeight: 700, color: diasIpva && diasIpva > 300 ? '#b91c1c' : C.textSec }}>
                        {diasIpva != null ? `${diasIpva}d` : '—'}
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', color: C.textSec }}>{r.TOTAL_OS}</td>
                      <td style={{ ...tdSt, fontWeight: 600, color: r.SALDO_PENDENTE > 0 ? '#b45309' : C.textMuted }}>{formatBRL(r.SALDO_PENDENTE)}</td>
                      <td style={tdSt}><Badge cor={cor} label={label} /></td>
                      <td style={{ ...tdSt, textAlign: 'center', padding: '6px 8px' }}>
                        <span title="Ver detalhes" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: hovered ? C.accentMuted : 'transparent', color: hovered ? C.accent : C.textMuted, transition: 'all 0.12s' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Paginacao {...pagF} count={pagF.slice.length} totalItems={visible.length} />
      </Card>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.75rem', color: C.textMuted }}>
        <span>🟢 Em dia — IPVA/Lic. nos últimos 300 dias</span>
        <span>🟡 Atenção — entre 300–365 dias</span>
        <span>🔴 Vencido — mais de 365 dias sem IPVA/Licenciamento</span>
      </div>

      {selectedVeiculo && (
        <VeiculoModal veiculo={selectedVeiculo} clinumer={clinumer} onClose={() => setSelectedVeiculo(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: OS DO MÊS (Histórico)
// ═══════════════════════════════════════════════════════════════════════════════
function MesModal({ mes, clinumer, onClose }: { mes: HistoricoMes; clinumer: number; onClose: () => void }) {
  const [osRows, setOsRows] = useState<OsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOs, setSelectedOs] = useState<OsRow | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const pagMes = usePagination(osRows, 15);

  useEffect(() => {
    sgdwBuscarOs(clinumer, mes.ANO, mes.MES).then(r => { setOsRows(r); setLoading(false); });
  }, [clinumer, mes.ANO, mes.MES]);

  const nomeMes = MESES[mes.MES - 1];
  const totalHon = osRows.reduce((s, r) => s + r.HONORARIOS, 0);
  const totalRec = osRows.reduce((s, r) => s + r.RECEBIDO, 0);
  const totalSal = osRows.reduce((s, r) => s + r.SALDO, 0);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,16,10,0.72)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 96px rgba(0,0,0,0.5), 0 0 0 1px rgba(28,184,112,0.15)' }}>
          {/* Header */}
          <div style={{ padding: '18px 24px', background: C.tableHeader, borderBottom: `1px solid ${C.tableBorder}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: C.accentMuted, border: '1px solid rgba(28,184,112,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: C.textPrimary }}>{nomeMes} {mes.ANO}</span>
                {!loading && <Badge cor="blue" label={`${osRows.length} OS`} />}
              </div>
              <div style={{ fontSize: '0.8rem', color: C.textSec, marginTop: 1 }}>
                {!loading && `Honorários: ${formatBRL(totalHon)} · Recebido: ${formatBRL(totalRec)}${totalSal > 0 ? ` · Saldo aberto: ${formatBRL(totalSal)}` : ''}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <Spinner /> : osRows.length === 0 ? <Vazio msg={`Nenhuma OS em ${nomeMes} ${mes.ANO}`} /> : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {['OS#','Data','Placa','Serviço','Honorários','Recebido','Saldo','Status',''].map((h, idx) => (
                        <th key={idx} style={{ ...thSt, ...(idx === 8 ? { width: 44 } : {}) }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {pagMes.slice.map((r, i) => {
                        const hov = hoveredRow === r.ORDNUMER;
                        return (
                          <tr key={r.ORDNUMER}
                            style={{ background: hov ? C.rowHover : i % 2 ? C.rowAlt : 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
                            onClick={() => setSelectedOs(r)}
                            onMouseEnter={() => setHoveredRow(r.ORDNUMER)}
                            onMouseLeave={() => setHoveredRow(null)}
                          >
                            <td style={{ ...tdSt, fontFamily: 'monospace', fontWeight: 700, color: C.accent }}>{r.ORDNUMER}</td>
                            <td style={{ ...tdSt, color: C.textSec }}>{formatData(r.DATA)}</td>
                            <td style={tdSt}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{r.PLACA}</span></td>
                            <td style={{ ...tdSt, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.SERVICO}</td>
                            <td style={{ ...tdSt, fontWeight: 600 }}>{formatBRL(r.HONORARIOS)}</td>
                            <td style={{ ...tdSt, color: '#15803d', fontWeight: 600 }}>{formatBRL(r.RECEBIDO)}</td>
                            <td style={{ ...tdSt, fontWeight: 700, color: r.SALDO > 0 ? '#b45309' : C.textMuted }}>{formatBRL(r.SALDO)}</td>
                            <td style={tdSt}>
                              {r.SALDO <= 0 ? <Badge cor="green" label="Pago" /> :
                               r.RECEBIDO > 0 ? <Badge cor="yellow" label="Parcial" /> :
                               <Badge cor="red" label="Pendente" />}
                            </td>
                            <td style={{ ...tdSt, textAlign: 'center', padding: '6px 8px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: hov ? C.accentMuted : 'transparent', color: hov ? C.accent : C.textMuted, transition: 'all 0.12s' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'rgba(28,184,112,0.06)', borderTop: '2px solid rgba(28,184,112,0.22)' }}>
                        <td colSpan={4} style={{ ...tdSt, fontWeight: 700, color: C.accent }}>Total ({osRows.length} OS)</td>
                        <td style={{ ...tdSt, fontWeight: 700 }}>{formatBRL(totalHon)}</td>
                        <td style={{ ...tdSt, fontWeight: 700, color: '#15803d' }}>{formatBRL(totalRec)}</td>
                        <td style={{ ...tdSt, fontWeight: 700, color: totalSal > 0 ? '#b45309' : C.textMuted }}>{formatBRL(totalSal)}</td>
                        <td colSpan={2} style={tdSt} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <Paginacao {...pagMes} count={pagMes.slice.length} totalItems={osRows.length} />
              </>
            )}
          </div>
        </div>
      </div>
      {selectedOs && <OsModal os={selectedOs} onClose={() => setSelectedOs(null)} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: HISTÓRICO
// ═══════════════════════════════════════════════════════════════════════════════
type FiltroHist = null | 'quitado' | 'com-saldo';

function TabHistorico({ clinumer }: { clinumer: number }) {
  const [rows, setRows] = useState<HistoricoMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroHist, setFiltroHist] = useState<FiltroHist>(null);
  const [selectedMes, setSelectedMes] = useState<HistoricoMes | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => { sgdwBuscarHistorico(clinumer).then(r => { setRows(r); setLoading(false); }); }, [clinumer]);

  const totalGeral = rows.reduce((s, r) => s + r.VALOR_TOTAL, 0);
  const totalOs    = rows.reduce((s, r) => s + r.TOTAL_OS, 0);
  const nQuitado   = rows.filter(r => r.SALDO <= 0).length;
  const nComSaldo  = rows.filter(r => r.SALDO > 0).length;
  const toggle = (f: FiltroHist) => setFiltroHist(p => p === f ? null : f);
  const filtroLabel: Record<string, string> = { quitado: 'Quitados', 'com-saldo': 'Com saldo' };
  const visivel = !filtroHist ? rows : filtroHist === 'quitado' ? rows.filter(r => r.SALDO <= 0) : rows.filter(r => r.SALDO > 0);
  const maxValor = Math.max(...visivel.map(r => r.VALOR_TOTAL), 1);
  const pagH = usePagination(visivel, 25);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        <KpiCard label="Meses" value={String(rows.length)} sub="Últimos 24 meses" color={C.accent} icon="📅" />
        <KpiCard label="Total OS" value={String(totalOs)} sub="Acumulado" color="#0f766e" icon="📋" />
        <KpiCard label="Valor total" value={formatBRL(totalGeral)} sub="Acumulado" color="#15803d" icon="💰" />
        <KpiCard label="Média/mês" value={rows.length ? formatBRL(totalGeral / rows.length) : 'R$ 0'} sub="Honorários" color="#6d28d9" icon="📊" />
        <KpiCard label="Quitados" value={String(nQuitado)} sub="Meses sem saldo" color="#15803d" icon="✅"
          onClick={() => toggle('quitado')} active={filtroHist === 'quitado'} />
        <KpiCard label="Com saldo" value={String(nComSaldo)} sub="Meses a receber" color="#b45309" icon="⏳"
          onClick={() => toggle('com-saldo')} active={filtroHist === 'com-saldo'} />
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: C.textPrimary }}>Histórico Mensal — últimos 24 meses</span>
            {filtroHist && <FiltroChip label={filtroLabel[filtroHist]} onClear={() => setFiltroHist(null)} />}
          </div>
          <Badge cor="blue" label={`${visivel.length}${filtroHist ? ` / ${rows.length}` : ''} meses`} />
        </CardHeader>
        {loading ? <Spinner /> : rows.length === 0 ? <Vazio msg="Nenhum dado histórico encontrado" /> :
         visivel.length === 0 ? <Vazio msg="Nenhum mês com esse filtro" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Mês/Ano','OS','Valor Total','Recebido','Saldo','Evolução',''].map((h, idx) => (
                  <th key={idx} style={{ ...thSt, ...(idx === 6 ? { width: 44 } : {}) }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pagH.slice.map((r, i) => {
                  const pct = (r.VALOR_TOTAL / maxValor) * 100;
                  const atual = r.ANO === ANO_ATUAL && r.MES === MES_ATUAL;
                  const rowKey = `${r.ANO}-${r.MES}`;
                  const hov = hoveredRow === rowKey;
                  return (
                    <tr key={rowKey}
                      style={{ background: hov ? C.rowHover : atual ? 'rgba(28,184,112,0.055)' : i % 2 ? C.rowAlt : 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => setSelectedMes(r)}
                      onMouseEnter={() => setHoveredRow(rowKey)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ ...tdSt, fontWeight: atual ? 700 : 400 }}>
                        <span style={{ color: atual ? C.accent : C.textPrimary }}>{MESES_CURTO[r.MES - 1]}/{r.ANO}</span>
                        {atual && <> <Badge cor="green" label="Atual" /></>}
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', fontWeight: 600 }}>{r.TOTAL_OS}</td>
                      <td style={{ ...tdSt, fontWeight: 600 }}>{formatBRL(r.VALOR_TOTAL)}</td>
                      <td style={{ ...tdSt, color: '#15803d', fontWeight: 600 }}>{formatBRL(r.RECEBIDO)}</td>
                      <td style={{ ...tdSt, fontWeight: 700, color: r.SALDO > 0 ? '#b45309' : C.textMuted }}>{formatBRL(r.SALDO)}</td>
                      <td style={{ ...tdSt, minWidth: 120 }}>
                        <div style={{ background: 'rgba(28,184,112,0.15)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${C.accent}, #34d399)`, borderRadius: 4, transition: 'width 0.6s' }} />
                        </div>
                      </td>
                      <td style={{ ...tdSt, textAlign: 'center', padding: '6px 8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: hov ? C.accentMuted : 'transparent', color: hov ? C.accent : C.textMuted, transition: 'all 0.12s' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(28,184,112,0.06)', borderTop: `2px solid rgba(28,184,112,0.25)` }}>
                  <td style={{ ...tdSt, fontWeight: 700, color: C.accent }}>{filtroHist ? `${visivel.length} / ${rows.length} meses` : 'Total'}</td>
                  <td style={{ ...tdSt, fontWeight: 700, textAlign: 'center' }}>{visivel.reduce((s,r) => s + r.TOTAL_OS, 0)}</td>
                  <td style={{ ...tdSt, fontWeight: 700 }}>{formatBRL(visivel.reduce((s,r) => s + r.VALOR_TOTAL, 0))}</td>
                  <td style={{ ...tdSt, fontWeight: 700, color: '#15803d' }}>{formatBRL(visivel.reduce((s,r) => s + r.RECEBIDO, 0))}</td>
                  <td style={{ ...tdSt, fontWeight: 700, color: '#b45309' }}>{formatBRL(visivel.reduce((s,r) => s + r.SALDO, 0))}</td>
                  <td colSpan={2} style={tdSt} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <Paginacao {...pagH} count={pagH.slice.length} totalItems={visivel.length} />
      </Card>

      {selectedMes && <MesModal mes={selectedMes} clinumer={clinumer} onClose={() => setSelectedMes(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: PENDÊNCIAS
// ═══════════════════════════════════════════════════════════════════════════════
type FiltroPend = null | 'recente' | 'antigo' | 'critico';

function TabPendencias({ clinumer }: { clinumer: number }) {
  const [rows, setRows] = useState<OsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPend, setFiltroPend] = useState<FiltroPend>(null);
  const [selectedOs, setSelectedOs] = useState<OsRow | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => { sgdwBuscarPendencias(clinumer).then(r => { setRows(r); setLoading(false); }); }, [clinumer]);

  const total    = rows.reduce((s, r) => s + r.SALDO, 0);
  const nRecente = rows.filter(r => diasDesde(r.DATA) <= 30).length;
  const nAntigo  = rows.filter(r => { const d = diasDesde(r.DATA); return d > 30 && d <= 90; }).length;
  const nCritico = rows.filter(r => diasDesde(r.DATA) > 90).length;
  const toggle = (f: FiltroPend) => setFiltroPend(p => p === f ? null : f);
  const filtroLabel: Record<string, string> = { recente: 'Recentes ≤30d', antigo: 'Antigos 30–90d', critico: 'Críticos >90d' };
  const visivel = !filtroPend ? rows
    : filtroPend === 'recente' ? rows.filter(r => diasDesde(r.DATA) <= 30)
    : filtroPend === 'antigo'  ? rows.filter(r => { const d = diasDesde(r.DATA); return d > 30 && d <= 90; })
    : rows.filter(r => diasDesde(r.DATA) > 90);
  const totalVis = visivel.reduce((s, r) => s + r.SALDO, 0);
  const pagP = usePagination(visivel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        <KpiCard label="OS pendentes" value={String(rows.length)} sub="Com saldo" color="#b91c1c" icon="⏳" />
        <KpiCard label="Total a receber" value={formatBRL(total)} sub="Saldo em aberto" color="#b45309" icon="💳" />
        <KpiCard label="Recentes" value={String(nRecente)} sub="Até 30 dias" color="#15803d" icon="🟢"
          onClick={() => toggle('recente')} active={filtroPend === 'recente'} />
        <KpiCard label="Antigos" value={String(nAntigo)} sub="30 a 90 dias" color="#b45309" icon="🟡"
          onClick={() => toggle('antigo')} active={filtroPend === 'antigo'} />
        <KpiCard label="Críticos" value={String(nCritico)} sub="Mais de 90 dias" color="#b91c1c" icon="🔴"
          onClick={() => toggle('critico')} active={filtroPend === 'critico'} />
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: C.textPrimary }}>OS com Saldo Pendente</span>
            {filtroPend && <FiltroChip label={filtroLabel[filtroPend]} onClear={() => setFiltroPend(null)} />}
          </div>
          <Badge cor={rows.length > 0 ? 'red' : 'green'} label={rows.length === 0 ? 'Tudo em dia!' : `${visivel.length}${filtroPend ? ` / ${rows.length}` : ''} pendentes`} />
        </CardHeader>
        {loading ? <Spinner /> : rows.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(28,184,112,0.15)', border: '1.5px solid rgba(28,184,112,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: '1.6rem' }}>🎉</div>
            <div style={{ fontWeight: 700, color: C.accent, marginBottom: 4, fontSize: '1rem' }}>Nenhuma pendência!</div>
            <div style={{ color: C.textMuted, fontSize: '0.875rem' }}>Todas as OS estão com pagamento em dia.</div>
          </div>
        ) : visivel.length === 0 ? <Vazio msg="Nenhuma OS com esse filtro" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['OS#','Data','Em aberto','Serviço','Placa','Valor','Recebido','Saldo',''].map((h, idx) => (
                  <th key={idx} style={{ ...thSt, ...(idx === 8 ? { width: 44 } : {}) }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pagP.slice.map((r, i) => {
                  const dias = diasDesde(r.DATA);
                  const hov = hoveredRow === r.ORDNUMER;
                  return (
                    <tr key={r.ORDNUMER}
                      style={{ background: hov ? C.rowHover : i % 2 ? C.rowAlt : 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => setSelectedOs(r)}
                      onMouseEnter={() => setHoveredRow(r.ORDNUMER)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={tdSt}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.accent }}>{r.ORDNUMER}</span></td>
                      <td style={{ ...tdSt, color: C.textSec }}>{formatData(r.DATA)}</td>
                      <td style={tdSt}>
                        <span style={{ fontWeight: 700, color: dias > 90 ? '#b91c1c' : dias > 30 ? '#b45309' : '#15803d', fontFamily: 'monospace' }}>{dias}d</span>
                        {dias > 90 && <span style={{ marginLeft: 6 }}><Badge cor="red" label="Crítico" /></span>}
                        {dias > 30 && dias <= 90 && <span style={{ marginLeft: 6 }}><Badge cor="yellow" label="Antigo" /></span>}
                      </td>
                      <td style={{ ...tdSt, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.textSec }} title={r.SERVICO}>{r.SERVICO}</td>
                      <td style={tdSt}><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1d4ed8' }}>{r.PLACA}</span></td>
                      <td style={{ ...tdSt, fontWeight: 600 }}>{formatBRL(r.HONORARIOS)}</td>
                      <td style={{ ...tdSt, color: '#15803d' }}>{formatBRL(r.RECEBIDO)}</td>
                      <td style={{ ...tdSt, fontWeight: 700, color: '#b45309' }}>{formatBRL(r.SALDO)}</td>
                      <td style={{ ...tdSt, textAlign: 'center', padding: '6px 8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: hov ? C.accentMuted : 'transparent', color: hov ? C.accent : C.textMuted, transition: 'all 0.12s' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(239,68,68,0.07)', borderTop: `2px solid rgba(239,68,68,0.25)` }}>
                  <td colSpan={7} style={{ ...tdSt, fontWeight: 700, color: '#b91c1c' }}>
                    {filtroPend ? `${visivel.length} de ${rows.length} OS` : 'Total pendente'}
                  </td>
                  <td style={{ ...tdSt, fontWeight: 800, color: '#b45309', fontSize: '1rem' }}>{formatBRL(totalVis)}</td>
                  <td style={tdSt} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <Paginacao {...pagP} count={pagP.slice.length} totalItems={visivel.length} />
      </Card>

      {selectedOs && <OsModal os={selectedOs} onClose={() => setSelectedOs(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const NAV_ITEMS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'resumo',     label: 'Resumo Mensal',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: 'frota',      label: 'Frota',          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { id: 'historico',  label: 'Histórico',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { id: 'pendencias', label: 'Pendências',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
];

export default function EmpresaDashboard() {
  const router = useRouter();
  const [empresa, setEmpresa] = useState<EmpresaPortal | null>(null);
  const [tab, setTab] = useState<TabId>('resumo');
  const [ano, setAno] = useState(ANO_ATUAL);
  const [mes, setMes] = useState(MES_ATUAL);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('empresa-portal');
    if (!saved) { router.replace('/empresa'); return; }
    setEmpresa(JSON.parse(saved) as EmpresaPortal);
  }, [router]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('empresa-portal');
    router.push('/empresa');
  }, [router]);

  if (!empresa) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Spinner />
    </div>
  );

  const initials = empresa.nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.pageBg, fontFamily: "'Inter',system-ui,sans-serif", overflow: 'hidden' }}>

      {/* Overlay mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150 }} />}

      {/* ─── Sidebar ──────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: 248, zIndex: 200,
        background: C.sidebarBg,
        borderRight: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '2px 0 16px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

        {/* Brand */}
        <div style={{ padding: '24px 18px 18px', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 1 }}>Dehon Despachante</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary, lineHeight: 1, letterSpacing: '-0.01em' }}>Portal Empresa</div>
            </div>
          </div>

          {/* Empresa badge */}
          <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', color: '#fff', flexShrink: 0, letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{empresa.nome}</div>
              <div style={{ fontSize: '0.63rem', color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{empresa.codigo}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 11,
                width: '100%', padding: '10px 13px', border: 'none',
                borderRadius: 10,
                background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
                color: active ? C.accent : C.textSec,
                fontFamily: "'Inter',system-ui,sans-serif", fontSize: '0.855rem', fontWeight: active ? 700 : 500,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.16s',
                borderLeft: `2.5px solid ${active ? C.accent : 'transparent'}`,
                letterSpacing: active ? '-0.005em' : '0',
              }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = C.textPrimary; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.textSec; } }}>
                <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6, transition: 'opacity 0.16s' }}>{item.icon}</span>
                {item.label}
                {active && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(15,23,42,0.07)' }}>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 13px', border: 'none',
            borderRadius: 10, background: 'transparent', cursor: 'pointer',
            color: C.textMuted, fontFamily: "'Inter',system-ui,sans-serif", fontSize: '0.84rem', fontWeight: 500,
            textAlign: 'left', transition: 'all 0.16s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.textMuted; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair do portal
          </button>
        </div>
      </aside>

      {/* ─── Main ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, marginLeft: 248, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: C.contentBg }}>
        {/* Topbar */}
        <header style={{
          height: 58, flexShrink: 0,
          background: 'rgba(255,255,255,0.96)',
          borderBottom: `1px solid ${C.cardBorder}`,
          boxShadow: '0 1px 0 rgba(0,0,0,0.05), 0 2px 12px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 14,
          backdropFilter: 'blur(16px)',
        }}>
          {/* Mobile menu */}
          <button onClick={() => setSidebarOpen(s => !s)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
            <span style={{ fontSize: '0.77rem', fontWeight: 500, color: C.textMuted, letterSpacing: '0.01em' }}>Portal</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: '0.855rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.01em' }}>
              {NAV_ITEMS.find(n => n.id === tab)?.label}
            </span>
          </div>

          {/* Company chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.accentMuted, border: '1px solid rgba(28,184,112,0.2)', borderRadius: 8, padding: '4px 10px 4px 6px' }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.62rem', color: '#fff', flexShrink: 0 }}>{initials}</div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.textSec }}>{empresa.nome}</span>
          </div>

          {/* SGDW status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(28,184,112,0.08)', border: '1px solid rgba(28,184,112,0.18)', borderRadius: 8, padding: '4px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, boxShadow: `0 0 5px ${C.accent}` }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: C.textSec, letterSpacing: '0.02em' }}>SGDW</span>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px 48px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(28,184,112,0.15) transparent' }}>
          {/* Page title */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.025em', lineHeight: 1 }}>
              {NAV_ITEMS.find(n => n.id === tab)?.label}
            </h2>
            <p style={{ margin: '5px 0 0', fontSize: '0.8rem', fontWeight: 500, color: C.textMuted }}>
              {empresa.sgdwNome} · SGDW #{empresa.clinumer}
            </p>
          </div>

          {tab === 'resumo'     && <TabResumo clinumer={empresa.clinumer} ano={ano} mes={mes} onAno={setAno} onMes={setMes} />}
          {tab === 'frota'      && <TabFrota clinumer={empresa.clinumer} />}
          {tab === 'historico'  && <TabHistorico clinumer={empresa.clinumer} />}
          {tab === 'pendencias' && <TabPendencias clinumer={empresa.clinumer} />}
        </div>
      </main>
    </div>
  );
}
