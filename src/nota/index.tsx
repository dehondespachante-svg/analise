import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import Head from 'next/head';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Button, Typography, Paper, TextField, IconButton, CircularProgress, Tabs, Tab, Divider, Chip, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, makeStyles, LinearProgress, Table, TableRow, TableCell, TableBody, TableHead, TableContainer, Card, MenuItem, Collapse, Tooltip, Popover, useTheme, useMediaQuery } from './mui-compat';
import { File as InsertDriveFile, Plus as Add, FolderOpen, Trash2 as Delete, CloudUpload, Table2 as TableChart, Wrench as Build, CheckCircle2 as CheckCircle, Pencil as Edit, List as ListAlt, Download, Settings, Save, ArrowRight as ArrowForward, ArrowLeft as ArrowBack, FileText as Description, Folder, Eye as Visibility, Download as GetApp, Printer as Print, RefreshCw as Refresh, ChevronDown as ExpandMore, ChevronUp as ExpandLess, Bell as Alarm, BellRing as NotificationsActive, Clock as Schedule, X as Close, RefreshCw as Autorenew, Copy as FileCopy, Filter as FilterList, Building2 as Business } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { ref as rtdbRef, get as rtdbGet, push as rtdbPush, update as rtdbUpdate, remove as rtdbRemove } from 'firebase/database';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { rtdb, db } from '@/logic/firebase/config/app';
import AutenticacaoContext from '@/data/contexts/AutenticacaoContext';

// ============ ALERT STYLES ============
const useAlertStyles = makeStyles((theme) => ({
  alertSuccess: {
    padding: 12,
    backgroundColor: '#c8e6c9',
    borderLeft: '4px solid #81c784',
    marginBottom: 24,
    borderRadius: 8,
    '& p': { color: '#2e7d32', margin: 0 }
  },
  alertError: {
    padding: 12,
    backgroundColor: '#ffcdd2',
    borderLeft: '4px solid #ef5350',
    marginBottom: 24,
    borderRadius: 8,
    '& p': { color: '#c62828', margin: 0 }
  },
  alertWarning: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ffc107',
    marginBottom: 24,
    borderRadius: 8,
    '& p': { color: '#856404', margin: 0 }
  },
  alertInfo: {
    padding: 12,
    backgroundColor: '#bbdefb',
    borderLeft: '4px solid #2196f3',
    marginBottom: 24,
    borderRadius: 8,
    '& p': { color: '#0d47a1', margin: 0 }
  },
  // Novos estilos v4
  ocrPage: {
    minHeight: '100vh',
    background: '#f8fafc',
  },
  ocrMainScroll: {
    height: 'calc(100vh - 64px)',
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
    padding: 24,
  },
  ocrCard: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 6px 18px rgba(16, 24, 40, 0.06)',
    border: '1px solid #e6eef8',
    transition: 'all 0.15s ease',
    padding: 12,
    marginBottom: 0,
    width: '100%',
  },
  uploadZone: {
    border: '2px dashed #cbd5e1',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    background: 'linear-gradient(180deg, #fbfdff 0%, #f7fbff 100%)',
    '&:hover': {
      borderColor: '#1565c0',
      background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
    },
    '&.active': {
      borderColor: '#2e7d32',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)',
    }
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
    color: 'white',
    borderRadius: 10,
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 14px rgba(21, 101, 192, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(21, 101, 192, 0.4)',
    }
  },
  btnSuccess: {
    background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
    color: 'white',
    borderRadius: 10,
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 14px rgba(46, 125, 50, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(46, 125, 50, 0.4)',
    }
  },
  stepper: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 50,
    transition: 'all 0.3s ease',
    cursor: 'default',
    minWidth: 'fit-content',
  },
  stepActive: {
    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
    color: 'white',
    boxShadow: '0 4px 14px rgba(21, 101, 192, 0.3)',
  },
  stepCompleted: {
    background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
    color: 'white',
  },
  stepPending: {
    background: '#e2e8f0',
    color: '#64748b',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    background: 'rgba(255,255,255,0.2)',
  },
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },

  // Estilos para a linha TOTAL e impressão
  totalsRow: {
    backgroundColor: '#4caf50',
    position: 'sticky',
    bottom: 0,
    zIndex: 1,
    WebkitPrintColorAdjust: 'exact',
    '@media print': {
      position: 'static',
      backgroundColor: '#e8f5e9', // verde claro para impressão
      color: '#000',
      WebkitPrintColorAdjust: 'exact',
    }
  },
  totalFirstCell: {
    fontWeight: 700,
    color: '#fff',
    border: '1px solid #2e7d32',
    textAlign: 'center',
    padding: '10px 8px',
    '@media print': {
      color: '#000',
    }
  },
  totalCell: {
    fontWeight: 700,
    backgroundColor: '#4caf50',
    color: '#fff',
    border: '1px solid #2e7d32',
    padding: '10px 12px',
    whiteSpace: 'nowrap',
    WebkitPrintColorAdjust: 'exact',
    '@media print': {
      backgroundColor: '#e8f5e9',
      color: '#000',
      WebkitPrintColorAdjust: 'exact',
    }
  },
  totalValue: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  totalEmpty: {
    color: 'rgba(255,255,255,0.5)',
    '@media print': {
      color: '#666',
    }
  },
  // Botão de recalcular por coluna (escondido na impressão)
  totalButtonWrap: {
    marginTop: 6,
    display: 'flex',
    justifyContent: 'center',
    '@media print': { display: 'none' }
  },
  totalButton: {
    padding: 4,
    width: 28,
    height: 28,
  },
  previewTotalCell: {
    backgroundColor: '#4caf50',
    border: '1px solid #2e7d32',
    '@media print': {
      backgroundColor: '#e8f5e9',
    }
  },
  headerGradient: {
    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
    padding: 16,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  successMsg: {
    padding: 16,
    background: '#e8f5e9',
    borderLeft: '4px solid #4caf50',
    borderRadius: 8,
    color: '#2e7d32',
    fontWeight: 600,
  },
  infoMsg: {
    padding: 16,
    background: '#e3f2fd',
    borderLeft: '4px solid #2196f3',
    borderRadius: 8,
    color: '#1565c0',
    fontWeight: 600,
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
    color: 'white',
    boxShadow: '0 4px 14px rgba(21, 101, 192, 0.3)',
  },
  modelCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#fff',
    '&:hover': {
      transform: 'translateY(-2px)',
    }
  },
  modelCardSelected: {
    border: '2px solid #1976d2',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  },
  // Texto responsivo para nome do modelo
  modelName: {
    fontWeight: 600,
    fontSize: 16,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    '@media (max-width:600px)': {
      fontSize: 14,
    },
    '@media (max-width:360px)': {
      fontSize: 13,
    }
  },
  modelCaption: {
    color: '#64748b',
    fontSize: 12,
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%'
  },
  modelChipsWrap: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
    '& > *': {
      fontSize: '0.7rem',
      height: 24,
      background: '#e2e8f0',
      color: '#475569',
      marginRight: 4,
      marginBottom: 4
    },
    '@media (max-width:600px)': {
      '& > *': { fontSize: '0.65rem' }
    }
  },
  // Card fixo e responsivo
  modelCardFixed: {
    minHeight: 64,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 8,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    overflow: 'hidden'
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0
  },
  // Esconder elementos conforme o breakpoint
  hideOnMd: {
    '@media (max-width:900px)': { display: 'none' }
  },
  hideOnSm: {
    '@media (max-width:600px)': { display: 'none' }
  },
  compactIconButton: {
    padding: 6,
    width: 34,
    height: 34,
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px 16px',
    background: '#f8fafc',
    borderRadius: 12,
    border: '1px dashed #cbd5e1',
  },
  scrollableList: {
    maxHeight: 350,
    overflowY: 'auto',
    paddingRight: 8,
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #e0e0e0',
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    padding: 16,
    textAlign: 'center',
    minWidth: 120,
    borderRadius: 8,
  },
  statCardSuccess: {
    backgroundColor: '#e3f2fd',
  },
  statCardSecondary: {
    backgroundColor: '#f3e5f5',
  },
  statCardGreen: {
    backgroundColor: '#e8f5e9',
  },
  previewTable: {
    borderRadius: 8,
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    maxHeight: 300,
  },
  contentHeader: {
    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
    padding: 10,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  contentBox: {
    padding: 16,
  },
  divider: {
    margin: '24px 0',
  },
  progressBox: {
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    background: 'linear-gradient(90deg, #1976d2, #42a5f5)',
    transition: 'width 0.3s ease',
  },
  fileListContainer: {
    maxHeight: 250,
    overflow: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
  },
  fileListItem: {
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.2s',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  uploadZoneActive: {
    border: '3px dashed #4caf50',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'rgba(76, 175, 80, 0.04)',
    marginBottom: 24,
  },
  uploadZoneInactive: {
    border: '3px dashed #e0e0e0',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'rgba(25, 118, 210, 0.02)',
    marginBottom: 24,
  },
}));

// Runtime import checker (helps diagnose "Element type is invalid" by reporting undefined imports)
// DISABLED - causing potential issues
/*
if (typeof window !== 'undefined') {
  const importsToCheck: { [k: string]: any } = {
    Button, Typography, Paper, TextField, IconButton, CircularProgress, Tooltip, Tabs, Tab, Divider, Chip, CardContent,
    Dialog, DialogActions, DialogContent, DialogTitle, Table, TableRow, TableCell, TableBody, TableHead, TableContainer, Card, MenuItem,
    useTheme, useMediaQuery,
    InsertDriveFile, Add, FolderOpen, Delete, CloudUpload, TableChart, Build, CheckCircle, ListAlt, Download, Settings, Save, ArrowForward, ArrowBack, Description, Folder, Visibility, GetApp, Refresh
  };
  Object.entries(importsToCheck).forEach(([k, v]) => {
    if (typeof v === 'undefined') console.error(`[OCR-IMPORT-ERROR] '${k}' is undefined`);
  });
}
*/

// ============ TIPOS ============
interface MapeamentoSalvo {
  colunaModelo: string;
  campoExtraido: string;
}

interface ModeloSaida {
  id: string;
  nome: string;
  codigoAcesso?: string; // código usado para empresa/modelo pública
  colunas: string[];
  criadoEm: number;
  mapeamentosSalvos?: MapeamentoSalvo[];
  firestoreId?: string; // ID do documento no Firestore
  dadosSalvos?: DadosExtraidos[]; // Dados extraídos salvos persistentemente
  camposSalvos?: string[]; // Campos extraídos salvos
  notificacoes?: NotificacaoLinha[]; // Notificações de vencimento por linha
  empresaVinculada?: { clinumer: number; nome: string } | null; // Empresa SGDW vinculada
  // Estado de preview e edição associados individualmente ao modelo (UI-only)
  previewSalvo?: { [key: string]: string | number }[];
  previewEditMode?: boolean;
} 

interface DadosExtraidos {
  [key: string]: string;
}

// Interface para notificação de vencimento por linha
interface NotificacaoLinha {
  linhaIndex: number; // Índice da linha
  dataVencimento: string; // Data no formato ISO
  horaNotificacao: string; // Hora no formato HH:mm
  descricao?: string; // Descrição opcional (ex: OS, arquivo)
  notificado: boolean; // Se já foi notificado (uso legado)
  criadoEm: number;
  criadoPor?: string; // UID do usuário que criou a notificação
  dismissed?: boolean; // Se o usuário descartou/viu a notificação (visível apenas para o criador)
}

interface MapeamentoCampo {
  colunaModelo: string;
  campoExtraido: string;
  confianca: number;
}

// ============ COLUNAS PADRÃO ============
const COLUNAS_PADRAO: string[] = [
  'OS.',
  'DATA.',
  'SERVIÇO',
  'MARCA/MODELO',
  'PLACA',
  'CLIENTE',
  'LICENCIAMENTO',
  'IPVA',
  'MULTA',
  'PLACA MERCOSUL',
  'VISTORIA',
  'CARTORIO',
  'CORREIO',
  'CERTIFICADODIGITAL',
  'COMUNICAÇÃO DE VENDA',
  'ALTERACAO DE DADOS',
  'ALTERACAO DE DADOS A PRAZO',
  'ASSINATURA DIGITAL',
  'ATPVE',
  'ATPVE + ASS',
  'ATPVE + COMUNICAÇÃO DE VENDA',
  'ATPVE + ASS + COMUNICAÇÃO DE VENDA',
  'SEGUNDA VIA CRV',
  'REGISTRO DE VEICULO',
  'DEBITOS DE FORA',
  'DESPACHANTE DE FORA',
  'COMUNICAÇÃO DE VENDA DE FORA',
  'EMISSAO DE LICENCIAMENTO DE FORA',
  'ALTERACAO DE DADOS DE FORA',
  'MOTO TAXI',
  'TRANSFERENCIA',
  'CRÉDITO RENAVE',
  'REGISTRO DE VEICULO - RENAVE',
  'RENAVE',
  'AUTORIZACAO DE ESTAMPAGEM',
  'BAIXA DE RESTRICAO ADMINISTRATIVA',
  'BAIXA DE VEICULO',
  'INDICACAO DE CONDUTOR',
  'LICENCIAMENTO DE FORA A VISTA',
  'PRIMEIRO EMPLACAMENTO',
  'PAGAMENTO DE DEBITOS',
  'LICENCIAMENTO A VISTA',
  'PRIMEIRO EMPLACAMENTO DE FORA',
  'PROCURAÇÃO ELETRÔNICA',
  'SEGUNDA VIA CRV DE FORA',
  'BAIXA DE VEÍCULO DE FORA',
  'TRANSFERENCIA DE FORA',
  'PROCURAÇÃO ELETRÔNICA COM CERTIFICADO DIGITAL',
  'TRANSFERENCIA COM ALTERAÇÃO',
  'INMETRO MODIFICADO CAMINHÃO',
  'SERVIÇO DESPACHANTE (HONORÁRIO)',
  'TOTAL',
];

// ============ STORAGE HELPERS (localStorage) ============
// Armazena modelos em localStorage enquanto as regras do Firebase não permitem escrita pública.
const LS_KEY = 'ocr-modelos-v1';
const LS_EMPRESA_KEY = 'ocr-empresa-por-modelo-v1';

function lsGetEmpresas(): Record<string, { clinumer: number; nome: string }> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_EMPRESA_KEY) || '{}'); } catch { return {}; }
}
function lsSaveEmpresas(data: Record<string, { clinumer: number; nome: string }>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_EMPRESA_KEY, JSON.stringify(data));
}

function lsGetAll(): Record<string, Record<string, unknown>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { return {}; }
}

function lsSave(all: Record<string, Record<string, unknown>>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

function lsPost(payload: Record<string, unknown>): string {
  const id = `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const all = lsGetAll();
  all[id] = payload;
  lsSave(all);
  return id;
}

function lsPatch(id: string, payload: Record<string, unknown>) {
  const all = lsGetAll();
  if (all[id]) Object.assign(all[id], payload);
  lsSave(all);
}

function lsDelete(id: string) {
  const all = lsGetAll();
  delete all[id];
  lsSave(all);
}

// Seed "CIA DA MOTO" model once if not already present
if (typeof window !== 'undefined') {
  const _existing = lsGetAll();
  const _hasCiaDaMoto = Object.values(_existing).some(
    (m) => String(m.nome) === 'CIA DA MOTO'
  );
  if (!_hasCiaDaMoto) {
    lsPost({
      nome: 'CIA DA MOTO',
      codigoAcesso: '2026',
      colunas: [
        'OS',
        'DATA',
        'SERVIÇO',
        'MARCA/MODELO',
        'PLACA',
        'CLIENTE',
        'COMUNICAÇÃO DE VENDA',
        'ASSINATURA DIGITAL',
        'REGISTRO DE VEICULO',
        'SERVIÇO DESPACHANTE (HONORÁRIO)',
        'TOTAL',
      ],
      criadoEm: 1721088000000,
      mapeamentosSalvos: [],
      dadosSalvos: [],
      camposSalvos: [],
      notificacoes: [],
      userId: 'publico',
    });
  }
}

const salvarModeloNoFirebase = async (modelo: ModeloSaida, userId?: string): Promise<string | null> => {
  const payload: Record<string, unknown> = {
    nome: modelo.nome,
    codigoAcesso: modelo.codigoAcesso || '',
    colunas: modelo.colunas,
    criadoEm: modelo.criadoEm || Date.now(),
    mapeamentosSalvos: modelo.mapeamentosSalvos || [],
    notificacoes: modelo.notificacoes || [],
    empresaVinculada: modelo.empresaVinculada ?? null,
    userId: userId || 'publico',
  };
  try {
    const ref = await rtdbPush(rtdbRef(rtdb, 'modelos-nota'), payload);
    return ref.key;
  } catch (err) {
    console.warn('Firebase RTDB push falhou, usando localStorage', err);
  }
  return lsPost(payload);
};

const atualizarMapeamentoNoFirebase = async (modelo: ModeloSaida) => {
  if (!modelo.firestoreId) return;
  const changes = { mapeamentosSalvos: modelo.mapeamentosSalvos || [], atualizadoEm: Date.now() };
  try {
    await rtdbUpdate(rtdbRef(rtdb, `modelos-nota/${modelo.firestoreId}`), changes); return;
  } catch (err) { console.warn('Firebase RTDB update mapeamento falhou', err); }
  lsPatch(modelo.firestoreId, changes);
};

const salvarDadosExtraidosNoFirebase = async (firestoreId: string, dados: DadosExtraidos[], campos: string[]) => {
  if (!firestoreId) return;
  lsPatch(firestoreId, { dadosSalvos: dados, camposSalvos: campos, atualizadoEm: Date.now() });
};

const salvarNotificacoesNoFirebase = async (firestoreId: string, notificacoes: NotificacaoLinha[]) => {
  if (!firestoreId) return;
  const changes = { notificacoes, atualizadoEm: Date.now() };
  try {
    await rtdbUpdate(rtdbRef(rtdb, `modelos-nota/${firestoreId}`), changes); return;
  } catch (err) { console.warn('Firebase RTDB update notificacoes falhou', err); }
  lsPatch(firestoreId, changes);
};

// ============ SGDW HELPERS ============
async function buscarServicosSgdw(): Promise<string[]> {
  try {
    const resp = await fetch('/api/sgdw-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT TRIM(s.SERDESCR) AS NOME FROM TBSERVI s WHERE COALESCE(TRIM(s.SERDESCR),'') <> '' ORDER BY s.SERDESCR`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { rows?: Array<{ NOME: string }> };
    return (data.rows ?? []).map(r => String(r.NOME || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// ─── SGDW: busca de empresas e OS para vincular ao modelo ────────────────────

async function buscarEmpresasNota(busca: string): Promise<{ CLINUMER: number; NOME: string }[]> {
  try {
    const termo = busca.trim().replace(/'/g, "''").slice(0, 100);
    const wh = termo ? `WHERE TRIM(c.CLINOMES) CONTAINING '${termo}'` : '';
    const resp = await fetch('/api/sgdw-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT FIRST 20 c.CLINUMER, TRIM(c.CLINOMES) AS NOME
          FROM TBCLIEN c
          INNER JOIN TBORDSE o ON o.ORDORIGE = c.CLINUMER AND COALESCE(o.ORDCANC,0)=0
          ${wh}
          GROUP BY c.CLINUMER, c.CLINOMES
          HAVING COUNT(DISTINCT o.VEINUMER) >= 1
          ORDER BY c.CLINOMES`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { rows?: Record<string, unknown>[] };
    return (data.rows ?? []).map(r => ({
      CLINUMER: Number(r.CLINUMER ?? 0),
      NOME: String(r.NOME ?? '').trim(),
    })).filter(r => r.CLINUMER > 0 && r.NOME);
  } catch { return []; }
}

const MESES_NOTA = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

async function buscarOsEmpresaMesNota(
  clinumer: number, ano: number, mes: number
): Promise<Record<string, unknown>[]> {
  try {
    const resp = await fetch('/api/sgdw-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT FIRST 500 SKIP 0
          o.ORDNUMER,
          o.ORDDTEMI AS DATA,
          COALESCE(
            (SELECT FIRST 1 TRIM(i.ITODESCR) FROM TBITORD i
             WHERE i.ORDNUMER = o.ORDNUMER
               AND (
                 UPPER(TRIM(i.ITODESCR)) CONTAINING 'TRANSFER'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'ATPVE'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'EMISS'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'SEGUNDA VIA'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'EMPLAC'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'REMARC'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'CANCELAMENTO'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'INMETRO'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'RESTRIC'
                 OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'DE DADO'
               )
             ORDER BY i.ITANUMER),
            NULLIF(TRIM(s.SERDESCR), ''),
            '-'
          ) AS SERVICO,
          COALESCE(TRIM(v.VEIPLACA), '-') AS PLACA,
          COALESCE(TRIM(v.VEIRENAV), '-') AS RENAVAM,
          COALESCE(TRIM(v.VEINOMAN), '-') AS CLIENTE,
          COALESCE(TRIM(m.MARDESCR), '-') AS MARCAMODELO,
          COALESCE(o.ORDVLTOT, 0) AS HONORARIOS,
          COALESCE(o.ORDVLREC, 0) AS RECEBIDO,
          COALESCE(o.ORDVLTOT, 0) - COALESCE(o.ORDVLREC, 0) AS SALDO,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'ATPVE'
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'COMUNICA'), 0) AS ITEM_ATPVE_COMBINED,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND (UPPER(TRIM(i.ITODESCR)) CONTAINING 'PLACA MERCOSUL'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'PLACA-MERCOSUL'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'EMPLACAMENTO MERCOSUL'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'EMPLACAMENTO')), 0) AS ITEM_MERCOSUL,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'REGISTRO DE VEICULO'
            AND UPPER(TRIM(i.ITODESCR)) NOT CONTAINING 'DIFEREN'), 0) AS ITEM_REGISTRO,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'VISTORI'), 0) AS ITEM_VISTORIA,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND (UPPER(TRIM(i.ITODESCR)) CONTAINING 'IPVA'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'LICENCIAMENTO'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'MULTA'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'DARE'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'UF:'
              OR UPPER(TRIM(i.ITODESCR)) CONTAINING 'PAGAMENTO')), 0) AS ITEM_DEBITOS,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND (UPPER(TRIM(i.ITODESCR)) CONTAINING 'MULTA'
              OR UPPER(TRIM(i.ITODESCR)) STARTING WITH 'UF:')), 0) AS ITEM_MULTA,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'GRAVAME'), 0) AS ITEM_GRAVAME,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'COMUNICA'
            AND UPPER(TRIM(i.ITODESCR)) NOT CONTAINING 'ATPVE'), 0) AS ITEM_COMUNICAC,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'ASSINATURA'
            AND UPPER(TRIM(i.ITODESCR)) NOT CONTAINING 'ATPVE'), 0) AS ITEM_ASSINATURA,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'CARTORI'), 0) AS ITEM_CARTORIO,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'MOTO'
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'TAXI'), 0) AS ITEM_MOTO_TAXI,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'DIFEREN'), 0) AS ITEM_DIFERENCA,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'INMETRO'), 0) AS ITEM_INMETRO,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'DESPACHANTE'
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'FORA'), 0) AS ITEM_DESP_FORA,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'ALTERACAO'
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'DADO'
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'FORA'), 0) AS ITEM_ALTDADOS_FORA,
          COALESCE((SELECT SUM(i.ITOVLLIQ) FROM TBITORD i WHERE i.ORDNUMER = o.ORDNUMER
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'ALTERACAO'
            AND UPPER(TRIM(i.ITODESCR)) CONTAINING 'DADO'
            AND UPPER(TRIM(i.ITODESCR)) NOT CONTAINING 'FORA'), 0) AS ITEM_ALTDADOS
        FROM TBORDSE o
        LEFT JOIN TBVEICU v ON v.VEINUMER = o.VEINUMER
        LEFT JOIN TBMARCA m ON m.MARNUMER = v.MARNUMER
        LEFT JOIN TBSERVI s ON s.SERNUMER = o.SOSNUMER
        WHERE o.ORDORIGE = ?
          AND EXTRACT(YEAR FROM o.ORDDTEMI) = ?
          AND EXTRACT(MONTH FROM o.ORDDTEMI) = ?
        ORDER BY o.ORDDTEMI, o.ORDNUMER`,
        params: [clinumer, ano, mes],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { rows?: Record<string, unknown>[] };
    const rows = data.rows ?? [];
    // Busca itens de todos OS onde ITEM_MERCOSUL = 0 (até 5) para identificar ITODESCR correto
    const semMercosul = rows.filter(r => Number(r.ITEM_MERCOSUL ?? 0) === 0).slice(0, 5);
    semMercosul.forEach(r => {
      fetch('/api/sgdw-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT i.ITANUMER, i.ITODESCR, i.ITOVLLIQ FROM TBITORD i WHERE i.ORDNUMER = ? ORDER BY i.ITANUMER`,
          params: [r.ORDNUMER]
        })
      }).then(res => res.json()).then((d: { rows?: Record<string, unknown>[] }) => {
        console.log('[SGDW itens OS', r.ORDNUMER, 'MERCOSUL=0]', JSON.stringify(d.rows));
      }).catch(() => {});
    });
    return rows;
  } catch { return []; }
}

function _normCol(col: string): string {
  return col.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

interface SgdwCampoInfo { alias: string; campo: string; tabela: string }
function sgdwCampoParaColuna(colunaModelo: string): SgdwCampoInfo | null {
  const n = _normCol(colunaModelo);
  if (/\bOS\b/.test(n) || /ORDEM/.test(n))                                     return { alias: 'ORDNUMER',     campo: 'ORDNUMER',  tabela: 'TBORDSE' };
  if (/\bDATA\b/.test(n) || /\bVENCTO\b/.test(n) || /^DT\b/.test(n))          return { alias: 'DATA',          campo: 'ORDDTEMI',  tabela: 'TBORDSE' };
  if (/MERCOSUL/.test(n))                                                        return { alias: 'PLACA_MERCOSUL',campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/TAXA.?REGIST/.test(n))                                                    return { alias: 'TAXA_REGISTRO', campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/VISTORIA/.test(n))                                                        return { alias: 'VISTORIA',      campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/\bMULTA\b/.test(n))                                                       return { alias: 'MULTA',          campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/DEBITO/.test(n))                                                          return { alias: 'DEBITOS',        campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/GRAVAME/.test(n))                                                         return { alias: 'GRAVAME',        campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/CARTORI/.test(n))                                                         return { alias: 'CARTORIO',       campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/MOTO.?TAXI/.test(n))                                                      return { alias: 'MOTO_TAXI',      campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/DIFERENC/.test(n))                                                        return { alias: 'DIFERENCA',      campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/INMETRO/.test(n))                                                         return { alias: 'INMETRO',        campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/DESPACHA/.test(n) && /FORA/.test(n))                                     return { alias: 'DESP_FORA',      campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/ALTERAC/.test(n) && /DADO/.test(n) && /FORA/.test(n))                   return { alias: 'ALTDADOS_FORA',  campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/ALTERAC/.test(n) && /DADO/.test(n))                                      return { alias: 'ALTDADOS',       campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/COMUNICAC/.test(n))                                                       return { alias: 'COMUNICACAO',    campo: 'calculado', tabela: 'TBITORD' };
  if (/ASSINATURA/.test(n))                                                      return { alias: 'ASSINATURA',     campo: 'calculado', tabela: 'TBITORD' };
  if (/HONORAR/.test(n) || /DESPACHA/.test(n))                                  return { alias: 'SERV_DESPACHA',  campo: 'calculado', tabela: 'TBITORD' };
  if (/REGISTRO\s*DE\s*VEICULO/.test(n) || (/REGISTRO/.test(n) && /VEIC/.test(n))) return { alias: 'REGISTRO',    campo: 'ITOVLLIQ',  tabela: 'TBITORD' };
  if (/\bRENAVAM\b/.test(n))                                                    return { alias: 'RENAVAM',        campo: 'VEIRENAV',  tabela: 'TBVEICU' };
  if (/\bTOTAL\b/.test(n) || /\bVALOR\b/.test(n))                              return { alias: 'TOTAL',           campo: 'ORDVLTOT',  tabela: 'TBORDSE' };
  if (/SERV[IC]/.test(n))                                                        return { alias: 'SERVICO',        campo: 'ITODESCR',  tabela: 'TBITORD' };
  if (/MARCA/.test(n))                                                           return { alias: 'MARCAMODELO',    campo: 'MARDESCR',  tabela: 'TBMARCA' };
  if (/\bPLACA\b/.test(n))                                                       return { alias: 'PLACA',          campo: 'VEIPLACA',  tabela: 'TBVEICU' };
  if (/CLIENTE/.test(n) || /RAZAO/.test(n) || /\bNOME\b/.test(n))              return { alias: 'CLIENTE',         campo: 'VEINOMAN',  tabela: 'TBVEICU' };
  if (/RECEBIDO/.test(n))                                                        return { alias: 'RECEBIDO',        campo: 'ORDVLREC',  tabela: 'TBORDSE' };
  if (/SALDO/.test(n))                                                           return { alias: 'SALDO',           campo: 'calculado', tabela: 'TBORDSE' };
  return null;
}

function mapearLinhaSgdwParaModelo(
  linha: Record<string, unknown>,
  colunas: string[]
): Record<string, string> {
  const fmtData = (val: unknown) => {
    const s = String(val ?? '');
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };
  const fmtNum = (val: unknown) => {
    const n = Number(val);
    return isNaN(n) || n === 0 ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalHonorarios  = Number(linha.HONORARIOS ?? 0);
  const atpveCombined    = Number(linha.ITEM_ATPVE_COMBINED ?? 0); // combined ATPVE+ASS+COM bundle
  const itemMercosul     = Number(linha.ITEM_MERCOSUL   ?? 0);
  const itemRegistro     = Number(linha.ITEM_REGISTRO   ?? 0);
  const itemVistoria     = Number(linha.ITEM_VISTORIA   ?? 0);
  const itemDebitos      = Number(linha.ITEM_DEBITOS    ?? 0);
  const itemGravame      = Number(linha.ITEM_GRAVAME    ?? 0);
  const itemComunicac    = Number(linha.ITEM_COMUNICAC  ?? 0); // individual COMUNICAÇÃO items only
  const itemAssinatura   = Number(linha.ITEM_ASSINATURA ?? 0); // individual ASSINATURA items only
  const itemCartorio     = Number(linha.ITEM_CARTORIO   ?? 0);
  const itemMotoTaxi     = Number(linha.ITEM_MOTO_TAXI  ?? 0);
  const itemDiferenca    = Number(linha.ITEM_DIFERENCA   ?? 0);
  const itemMulta        = Number(linha.ITEM_MULTA       ?? 0);
  const itemInmetro      = Number(linha.ITEM_INMETRO     ?? 0);
  const itemDespFora     = Number(linha.ITEM_DESP_FORA   ?? 0);
  const itemAltDadosFora = Number(linha.ITEM_ALTDADOS_FORA ?? 0);
  const itemAltDados     = Number(linha.ITEM_ALTDADOS    ?? 0);

  // Known splits for the ATPVE+ASS+COM bundle (government fees vary by company/region)
  const knownSplits: Record<number, { comun: number; ass: number }> = {
    66:  { comun: 17, ass: 9 },  // CIA DA MOTO
    103: { comun: 25, ass: 9 },  // BARIGUI CAMINHOES
  };
  const atpveSplit = atpveCombined > 0 ? (knownSplits[Math.round(atpveCombined)] ?? null) : null;

  const efectiveComunicac  = atpveCombined > 0 ? (atpveSplit?.comun ?? 0) : itemComunicac;
  const efectiveAssinatura = atpveCombined > 0 ? (atpveSplit?.ass  ?? 0) : itemAssinatura;

  const allCategorized = itemMercosul + itemRegistro + itemVistoria + itemDebitos + itemGravame +
    efectiveComunicac + efectiveAssinatura + itemCartorio + itemMotoTaxi + itemDiferenca +
    itemInmetro + itemDespFora + itemAltDadosFora + itemAltDados;
  const feeDesp = Math.max(0, totalHonorarios - allCategorized);

  const result: Record<string, string> = {};
  for (const col of colunas) {
    const n = _normCol(col);
    let v = '';

    // --- Identifier / metadata columns ---
    if (n === 'OS' || /^OS\b/.test(n) || /NUM(ERO)?.*(OS|ORDEM)/.test(n)) {
      v = String(linha.ORDNUMER ?? '');
    } else if (/\bDATA\b/.test(n) || /\bVENCTO\b/.test(n) || /^DT\b/.test(n)) {
      v = fmtData(linha.DATA);
    } else if (/MARCA/.test(n) || /MODELO/.test(n)) {
      v = String(linha.MARCAMODELO ?? '');
    } else if (/\bPLACA\b/.test(n) && !/MERCOSUL/.test(n)) {
      v = String(linha.PLACA ?? '');
    } else if (/CLIENTE/.test(n) || /RAZAO/.test(n) || /\bNOME\b/.test(n)) {
      v = String(linha.CLIENTE ?? '');
    } else if (/\bRENAVAM\b/.test(n)) {
      v = String(linha.RENAVAM ?? '');
    } else if (/\bTOTAL\b/.test(n) || /\bVALOR\b/.test(n)) {
      v = totalHonorarios > 0 ? fmtNum(totalHonorarios) : '';
    } else if (/RECEBIDO/.test(n)) {
      v = fmtNum(linha.RECEBIDO);
    } else if (/SALDO/.test(n)) {
      v = fmtNum(linha.SALDO);
    // --- Financial columns (pre-computed SQL SUM subqueries) ---
    } else if (/MERCOSUL/.test(n)) {
      v = itemMercosul > 0 ? fmtNum(itemMercosul) : '';
    } else if (/TAXA.?REGIST/.test(n) || (/REGISTRO/.test(n) && /VEIC/.test(n))) {
      v = itemRegistro > 0 ? fmtNum(itemRegistro) : '';
    } else if (/VISTORIA/.test(n)) {
      v = itemVistoria > 0 ? fmtNum(itemVistoria) : '';
    } else if (/\bMULTA\b/.test(n)) {
      v = itemMulta > 0 ? fmtNum(itemMulta) : '';
    } else if (/DEBITO/.test(n)) {
      v = itemDebitos > 0 ? fmtNum(itemDebitos) : '';
    } else if (/GRAVAME/.test(n)) {
      v = itemGravame > 0 ? fmtNum(itemGravame) : '';
    } else if (/COMUNICAC/.test(n)) {
      v = efectiveComunicac > 0 ? fmtNum(efectiveComunicac) : '';
    } else if (/ASSINATURA/.test(n)) {
      v = efectiveAssinatura > 0 ? fmtNum(efectiveAssinatura) : '';
    } else if (/CARTORI/.test(n)) {
      v = itemCartorio > 0 ? fmtNum(itemCartorio) : '';
    } else if (/MOTO.?TAXI/.test(n)) {
      v = itemMotoTaxi > 0 ? fmtNum(itemMotoTaxi) : '';
    } else if (/DIFERENC/.test(n)) {
      v = itemDiferenca > 0 ? fmtNum(itemDiferenca) : '';
    } else if (/INMETRO/.test(n)) {
      v = itemInmetro > 0 ? fmtNum(itemInmetro) : '';
    } else if (/DESPACHA/.test(n) && /FORA/.test(n)) {
      v = itemDespFora > 0 ? fmtNum(itemDespFora) : '';
    } else if (/ALTERAC/.test(n) && /DADO/.test(n) && /FORA/.test(n)) {
      v = itemAltDadosFora > 0 ? fmtNum(itemAltDadosFora) : '';
    } else if (/ALTERAC/.test(n) && /DADO/.test(n)) {
      v = itemAltDados > 0 ? fmtNum(itemAltDados) : '';
    } else if (/HONORAR/.test(n) || /DESPACHA/.test(n)) {
      v = feeDesp > 0 ? fmtNum(feeDesp) : '';
    // --- Service name: LAST so SERVIÇO DESPACHANTE matches DESPACHA/HONORAR above ---
    } else if (/SERVIC/.test(n)) {
      v = String(linha.SERVICO ?? '');
    }

    result[col] = v;
  }
  return result;
}

// Flag de nível de módulo — reseta em todo hot-reload do Next.js,
// garantindo que o auto-load re-busque os dados com o código mais recente.
let _autoCarregouEmpresa = false;

// ============ COMPONENTE PRINCIPAL ============
export default function OCRInteligente() {
  const classes = useAlertStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = isMobile && !isSmall; // md down but not sm -> tablet
  const gridCols = isSmall ? 1 : isTablet ? 2 : 3;
  const gridGap = isSmall ? 8 : isTablet ? 10 : 12;
  
  // Contexto de autenticação
  const { usuario } = useContext(AutenticacaoContext);

  
  // Estados do fluxo
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [tabAtiva, setTabAtiva] = useState(0);

  // --- Planilhas Finalizadas (lista paginada) ---
  const [planilhasFinalizadas, setPlanilhasFinalizadas] = useState<any[]>([]);
  const [planilhasLoading, setPlanilhasLoading] = useState(false);
  const [planilhasPage, setPlanilhasPage] = useState(0);
  const [expandedPlanilhaId, setExpandedPlanilhaId] = useState<string | null>(null);
  const [selectedPlanilhaFinalizada, setSelectedPlanilhaFinalizada] = useState<any | null>(null);
  // Mostrar/ocultar preview explicitamente (o preview só aparece quando `showPreview` ou ao visualizar uma planilha finalizada)
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Refs usados para detectar clique fora (fechar preview ao clicar no background)
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);
  const modelsGridRef = useRef<HTMLDivElement | null>(null);
  const planilhasTabRef = useRef<HTMLDivElement | null>(null);
  // autoCarregouEmpresaRef removido — usando _autoCarregouEmpresa no nível de módulo (reseta no hot-reload)

  // Edit/remove states for Planilhas Finalizadas
  const [editPlanilhaOpen, setEditPlanilhaOpen] = useState(false);
  const [planilhaEditing, setPlanilhaEditing] = useState<any | null>(null);
  const [editPlanilhaName, setEditPlanilhaName] = useState('');
  const [editPlanilhaLoading, setEditPlanilhaLoading] = useState(false);

  const PLANILHAS_PER_PAGE = 10;
  
  // Estados do modelo de saída
  const [modelosSalvos, setModelosSalvos] = useState<ModeloSaida[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloSaida | null>(null);
  const [nomeNovoModelo, setNomeNovoModelo] = useState('');
  const [codigoNovoModelo, setCodigoNovoModelo] = useState('');
  const [colunasNovoModelo, setColunasNovoModelo] = useState<string[]>(COLUNAS_PADRAO);
  const [novaColuna, setNovaColuna] = useState('');
  const [servicosSgdw, setServicosSgdw] = useState<string[]>([]);
  const [sugestoesFiltradas, setSugestoesFiltradas] = useState<string[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [empresaDialogModeloId, setEmpresaDialogModeloId] = useState<string | null>(null);
  const [sgdwAno, setSgdwAno] = useState(() => new Date().getFullYear());
  const [sgdwMes, setSgdwMes] = useState(() => new Date().getMonth() + 1);
  const [empresaBusca, setEmpresaBusca] = useState('');
  const [empresasResultados, setEmpresasResultados] = useState<{ CLINUMER: number; NOME: string }[]>([]);
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(false);
  const [empresaCarregandoModeloId, setEmpresaCarregandoModeloId] = useState<string | null>(null);
  const [empresaSelecionadaPorModelo, setEmpresaSelecionadaPorModelo] = useState<Record<string, { clinumer: number; nome: string }>>(() => lsGetEmpresas());
  const [novoModeloEmpresa, setNovoModeloEmpresa] = useState<{ CLINUMER: number; NOME: string } | null>(null);
  const [arquivoModelo, setArquivoModelo] = useState<File | null>(null);
  const [arquivoMarcaModelo, setArquivoMarcaModelo] = useState<File | null>(null);
  const [marcaModeloMap, setMarcaModeloMap] = useState<Record<string, {marca?: string; modelo?: string}> | null>(null);
  const [linhasPreview, setLinhasPreview] = useState<string[][]>([]);
  const [linhaHeaderSelecionada, setLinhaHeaderSelecionada] = useState<number>(0);
  
  // Estados de processamento
  const [arquivosEntrada, setArquivosEntrada] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos[]>([]);
  const [camposExtraidos, setCamposExtraidos] = useState<string[]>([]);
  const [mapeamentos, setMapeamentos] = useState<MapeamentoCampo[]>([]);

  // Visual: arquivos pendentes por modelo (mostra nomes no card) e progresso por modelo
  const [pendingFilesByModel, setPendingFilesByModel] = useState<Record<string, File[]>>({});
  const [progressByModel, setProgressByModel] = useState<Record<string, number>>({});
  
  // Estados de UI
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'success' | 'error' | 'info' } | null>(null);
  const [dialogConfirmacao, setDialogConfirmacao] = useState(false);
  const [modeloParaExcluir, setModeloParaExcluir] = useState<string | null>(null);

  // --- Duplicar modelo (diálogo + estado temporário) ---
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingModel, setDuplicatingModel] = useState<ModeloSaida | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicatingLoading, setDuplicatingLoading] = useState(false);

  // --- Finalizar planilha (salvar em PlanilhasFinalizadas) ---
  const [finalizandoModeloId, setFinalizandoModeloId] = useState<string | null>(null);

  // Depuração de totais: diálogo que mostra valores brutos e valores parseados por linha para uma coluna
  const [debugTotalsOpen, setDebugTotalsOpen] = useState(false);
  const [debugTotalsColumn, setDebugTotalsColumn] = useState<string | null>(null);
  const [debugTotalsRows, setDebugTotalsRows] = useState<Array<{ idx: number; raw: string; parsed: number | null }>>([]);

  // Alerts real-time: tick for forcing re-evaluation and timers storage (avoid polling)
  const [alertsTick, setAlertsTick] = useState(0);
  const notificationTimersRef = useRef<Record<string, number | null>>({});
  // Editor de modelo salvo
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingModelData, setEditingModelData] = useState<{ nome: string; codigoAcesso?: string; colunas: string[]; mapeamentosSalvos?: MapeamentoSalvo[] } | null>(null);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [editingColValue, setEditingColValue] = useState<string>('');
  // Mostrar/ocultar seção de mapeamento
  const [mapOpen, setMapOpen] = useState(false);

  // --- Preview edit mode (permite editar/apagar/salvar linhas do preview) ---
  const [previewEditMode, setPreviewEditMode] = useState(false);
  type PreviewRow = { [key: string]: string | number } & { __originalIndex: number };
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);

  // rows after marca/modelo preenchidos automaticamente (não altera dadosExtraidos)
  const [filledRows, setFilledRows] = useState<PreviewRow[] | null>(null);

  // Paginação do preview/table para melhorar performance (renderizar apenas uma página)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Toggle to hide/show columns that have no data (affects only preview rendering)
  const [hideEmptyColumns, setHideEmptyColumns] = useState<boolean>(false);
  // Ref to expose computed visible columns for preview rendering (avoids re-computing everywhere)
  const visibleColumnsRef = useRef<string[] | null>(null);

  // Edição inline por duplo clique (apenas a célula clicada)
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Recalcular totais por coluna (tick para forçar recomputar e nome da coluna em recalculando)
  const [recalcTick, setRecalcTick] = useState(0);
  const [recalculatingCol, setRecalculatingCol] = useState<string | null>(null);
  // Totais manuais por coluna (quando recalculado apenas o total, sem modificar linhas)
  const [manualTotals, setManualTotals] = useState<Record<string, { total: number; isCurrency: boolean } | undefined>>({});

  // Paginação handlers
  const handlePrevPage = useCallback(() => setPage(p => Math.max(0, p - 1)), []);
  const handleNextPage = useCallback(() => setPage(p => p + 1), []);
  const handleSetRowsPerPage = (n: number) => { setRowsPerPage(n); setPage(0); };

  const getCurrentPreviewRowsForExport = () => {
    if (selectedPlanilhaFinalizada) return Array.isArray(selectedPlanilhaFinalizada.dados) ? selectedPlanilhaFinalizada.dados : [];
    if (filledRows && filledRows.length) return filledRows;
    if (previewEditMode && previewRows) return previewRows;
    return gerarDadosFinais();
  };

  const getCurrentPreviewColumnsForExport = () => {
    const rows = getCurrentPreviewRowsForExport();
    if (selectedPlanilhaFinalizada) {
      const baseCols = Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length
        ? selectedPlanilhaFinalizada.campos
        : ((Array.isArray(selectedPlanilhaFinalizada.dados) && selectedPlanilhaFinalizada.dados.length)
          ? Object.keys(selectedPlanilhaFinalizada.dados[0])
          : []);
      return adicionarColunasDeTotalSeNecessario(baseCols, rows);
    }
    return adicionarColunasDeTotalSeNecessario(modeloSelecionado?.colunas || [], rows);
  };

  // Resetar página ao alterar dados ou modo de edição
  useEffect(() => { setPage(0); }, [dadosExtraidos.length, previewEditMode]);

  // atualizar marca/modelo automaticamente em preview exibido
  useEffect(() => {
    // determine which rows are currently displayed (dadosExtraidos / previewRows / finalized)
    const base = previewEditMode && previewRows ? previewRows
                  : (selectedPlanilhaFinalizada && Array.isArray(selectedPlanilhaFinalizada.dados) ? selectedPlanilhaFinalizada.dados : gerarDadosFinais());
    const colunas = modeloSelecionado?.colunas || [];
    const placaIdx = colunas.findIndex(c => {
      const n = normalizar(String(c || ''));
      return n.includes('placa') && !n.includes('mercosul');
    });
    const marcaIdx = colunas.findIndex(c => /\bmarca\b/i.test(String(c || '')));
    const modeloIdx = colunas.findIndex(c => /\bmodelo\b/i.test(String(c || '')));
    if (placaIdx < 0 || (marcaIdx < 0 && modeloIdx < 0)) {
      setFilledRows(null);
      return;
    }

    // find placas and lookup
    (async () => {
      try {
        const placasSet = new Set<string>();
        base.forEach(r => {
          const placaVal = String(r[colunas[placaIdx]] || '').trim();
          if (placaVal) placasSet.add(placaVal);
        });
        const placas = Array.from(placasSet);
        const lookup: Record<string, { marca?: string; modelo?: string }> = {};
        await Promise.all(
          placas.map(async pl => {
            try {
              const resp = await fetch(`/api/veiculo?placa=${encodeURIComponent(pl)}`);
              if (resp.ok) {
                const json = await resp.json();
                lookup[pl] = { marca: json.marca || '', modelo: json.modelo || '' };
              }
            } catch {
              /* ignore */
            }
          })
        );
        const updated = base.map(r => {
          const placaVal = String(r[colunas[placaIdx]] || '').trim();
          const copy: any = { ...r };

          // apply mapping file if available first
          if (placaVal && marcaModeloMap && marcaModeloMap[placaVal]) {
            const mapEntry = marcaModeloMap[placaVal];
            if (marcaIdx >= 0 && mapEntry.marca) copy[colunas[marcaIdx]] = mapEntry.marca;
            if (modeloIdx >= 0 && mapEntry.modelo) copy[colunas[modeloIdx]] = mapEntry.modelo;
          }

          if (placaVal && lookup[placaVal]) {
            if (marcaIdx >= 0 && !copy[colunas[marcaIdx]]) copy[colunas[marcaIdx]] = lookup[placaVal].marca || '';
            if (modeloIdx >= 0 && !copy[colunas[modeloIdx]]) copy[colunas[modeloIdx]] = lookup[placaVal].modelo || '';
          }
          return copy;
        });
        setFilledRows(updated);
      } catch (err) {
        console.warn('Erro preenchendo preview marca/modelo', err);
      }
    })();
  }, [dadosExtraidos, previewEditMode, previewRows, modeloSelecionado?.colunas, selectedPlanilhaFinalizada, marcaModeloMap]);

  // quando o usuário carregar um mapa de marca/modelo reaplicar nos dados originais
  useEffect(() => {
    if (!marcaModeloMap) return;
    setDadosExtraidos(prev => prev.map(row => {
      const placaKey = Object.keys(row).find(k => /placa/i.test(k));
      if (!placaKey) return row;
      const placaVal = String(row[placaKey] || '').trim();
      if (!placaVal) return row;
      const entry = marcaModeloMap[placaVal];
      if (!entry) return row;
      const newRow = { ...row } as any;
      const marcaKey = Object.keys(row).find(k => /marca/i.test(k));
      const modeloKey = Object.keys(row).find(k => /modelo/i.test(k));
      if (marcaKey && entry.marca && !newRow[marcaKey]) newRow[marcaKey] = entry.marca;
      if (modeloKey && entry.modelo && !newRow[modeloKey]) newRow[modeloKey] = entry.modelo;
      return newRow;
    }));
  }, [marcaModeloMap]);

  const handleCellDoubleClick = (displayIndex: number, col: string, rowObj?: any) => {
    const baseRows = previewEditMode && previewRows ? previewRows : gerarDadosFinais();
    const sourceRows = filledRows || baseRows;
    const row = rowObj ?? sourceRows[displayIndex];
    const matchKey = Object.keys(row || {}).find(k => normalizar(String(k || '')) === normalizar(String(col || '')));
    const value = row ? ((row[col] !== undefined) ? row[col] : (matchKey ? row[matchKey] : '')) : '';
    setEditingCell({ row: displayIndex, col });
    setEditingValue(String(value));
  };

  const cancelarInlineEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const salvarInlineEdit = async () => {
    if (!editingCell) return;
    const { row: displayIndex, col } = editingCell;

    if (previewEditMode && previewRows) {
      // Atualiza previewRows
      atualizarCelulaPreview(displayIndex, col, editingValue);
      setEditingCell(null);
      setEditingValue('');
      setMensagem({ texto: 'Alteração aplicada no preview (modo edição)', tipo: 'success' });
      return;
    }

    // Aplica diretamente em dadosExtraidos (persistência imediata)
    const origIndex = displayIndex; // quando não está em previewEditMode, indices correspondem
    const mapping = mapeamentos.find(m => m.colunaModelo === col);
    const novos = dadosExtraidos.map((r, i) => ({ ...r }));

    if (mapping && mapping.campoExtraido) {
      (novos[origIndex] as any)[mapping.campoExtraido] = editingValue;
    } else {
      // Sem mapeamento: usar override para manter a edição visível no preview
      (novos[origIndex] as any)[`__override__${col}`] = editingValue;
    }

    setDadosExtraidos(preencherTotaisAusentesNasLinhas(novos));
    setEditingCell(null);
    setEditingValue('');
    setMensagem({ texto: 'Alteração aplicada', tipo: 'success' });

    // Persistir automaticamente no Firebase, quando aplicável
    try {
      if (modeloSelecionado?.firestoreId) {
        await salvarDadosExtraidosNoFirebase(modeloSelecionado.firestoreId, preencherTotaisAusentesNasLinhas(novos), camposExtraidos);
        setMensagem({ texto: 'Alteração salva', tipo: 'success' });
      }
    } catch (err) {
      console.warn('Erro ao salvar alteração inline', err);
      setMensagem({ texto: 'Erro ao salvar alteração', tipo: 'error' });
    }
  };

  const entrarEdicaoPreview = () => {
    const dados = gerarDadosFinais();
    // Deep clone e anotar índice original
    const copia: PreviewRow[] = dados.map((r, idx) => ({ ...r, __originalIndex: idx }));
    setPreviewRows(copia);
    setPreviewEditMode(true);
  };

  const cancelarEdicaoPreview = () => {
    setPreviewRows(null);
    setPreviewEditMode(false);
  };

  const atualizarCelulaPreview = (rowIdx: number, coluna: string, valor: string) => {
    if (!previewRows) return;
    const nova = previewRows.map((r, i) => i === rowIdx ? { ...r, [coluna]: valor } : r);
    setPreviewRows(nova);
  };

  const apagarLinhaPreview = (rowIdx: number) => {
    if (!previewRows) return;
    const nova = previewRows.filter((_, i) => i !== rowIdx);
    setPreviewRows(nova);
  };

  const salvarEdicoesPreview = () => {
    if (!previewRows) return;
    // Construir novo array de dadosExtraidos aplicando alterações e removendo linhas excluídas
    const indicesMantidos = new Set<number>(previewRows.map(r => r.__originalIndex));
    const novosDados = dadosExtraidos
      .map((orig, idx) => ({ ...orig }))
      .filter((_, idx) => indicesMantidos.has(idx));

    // Aplicar alterações nas linhas mantidas
    previewRows.forEach((r, i) => {
      const origIdx = r.__originalIndex;
      const destinoIdx = novosDados.findIndex((_, j) => {
        // Encontrar posição correspondente a origIdx dentro dos índices mantidos
        const allIndices = Array.from(indicesMantidos).sort((a,b)=>a-b);
        return allIndices[j] === origIdx;
      });
      if (destinoIdx >= 0) {
        // Para cada mapeamento, atualizar o campoExtraido correspondente
        mapeamentos.forEach(m => {
          const col = m.colunaModelo;
          const campo = m.campoExtraido;
          if (campo) {
            // Garantir que a célula editada esteja refletida
            // Se a propriedade com nome da coluna não existir em `r`, buscar por uma chave equivalente (normalizada)
            const matchedKey = Object.keys(r || {}).find(k => normalizar(String(k || '')) === normalizar(String(col || '')));
            const previewValue = (r[col] !== undefined) ? r[col] : (matchedKey ? r[matchedKey] : '');
            (novosDados[destinoIdx] as any)[campo] = previewValue || '';
          }
        });
      }
    });

    setDadosExtraidos(preencherTotaisAusentesNasLinhas(novosDados));
    setPreviewRows(null);
    setPreviewEditMode(false);
    setMensagem({ texto: 'Alterações salvas no Preview', tipo: 'success' });

    // Persistir as alterações do preview no Firebase (quando disponível)
    (async () => {
      try {
        if (modeloSelecionado?.firestoreId) {
          await salvarDadosExtraidosNoFirebase(modeloSelecionado.firestoreId, preencherTotaisAusentesNasLinhas(novosDados), camposExtraidos);
        }
      } catch (err) {
        console.warn('Erro ao salvar edições do preview', err);
        setMensagem({ texto: 'Erro ao salvar alterações no servidor', tipo: 'error' });
      }
    })();
  };
  
  // Estados para notificação de vencimento por linha
  const [notificacoes, setNotificacoes] = useState<NotificacaoLinha[]>([]);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [linhaNotificacao, setLinhaNotificacao] = useState<number | null>(null);
  const [dataVencimento, setDataVencimento] = useState<string>('');
  const [horaNotificacao, setHoraNotificacao] = useState<string>('09:00');
  
  // Estado para upload de PDF de MARCA/MODELO no preview
  const [processandoMarcaModeloPdf, setProcessandoMarcaModeloPdf] = useState(false);

  // Refs
  const inputModeloRef = useRef<HTMLInputElement>(null);
  const inputMarcaModeloRef = useRef<HTMLInputElement>(null);
  const inputArquivosRef = useRef<HTMLInputElement>(null);
  const inputMarcaModeloPdfRef = useRef<HTMLInputElement>(null);

  // Upload popover (Enviar Documentos no card do modelo)
  const [uploadPopoverAnchor, setUploadPopoverAnchor] = useState<HTMLElement | null>(null);
  const [uploadPopoverModel, setUploadPopoverModel] = useState<ModeloSaida | null>(null);
  const [uploadPopoverFiles, setUploadPopoverFiles] = useState<File[]>([]);
  const uploadPopoverInputRef = useRef<HTMLInputElement | null>(null);

  // Carregar modelos: Firebase primeiro (sequencial), localStorage como fallback
  useEffect(() => {
    const parseFbDoc = (d: Record<string, unknown>, docId: string): ModeloSaida => ({
      id: `modelo_${docId}`,
      nome: String(d.nome || ''),
      codigoAcesso: String(d.codigoAcesso || ''),
      colunas: Array.isArray(d.colunas) ? d.colunas as string[] : [],
      criadoEm: Number(d.criadoEm) || Date.now(),
      mapeamentosSalvos: Array.isArray(d.mapeamentosSalvos) ? d.mapeamentosSalvos as MapeamentoSalvo[] : [],
      dadosSalvos: [],
      camposSalvos: [],
      notificacoes: Array.isArray(d.notificacoes) ? d.notificacoes as NotificacaoLinha[] : [],
      firestoreId: docId,
      empresaVinculada: (d.empresaVinculada as { clinumer: number; nome: string } | null) ?? null,
    });
    const parseLsDoc = (lsId: string, d: Record<string, unknown>): ModeloSaida => ({
      id: `modelo_${lsId}`,
      nome: String(d.nome || ''),
      codigoAcesso: String(d.codigoAcesso || ''),
      colunas: Array.isArray(d.colunas) ? d.colunas as string[] : [],
      criadoEm: Number(d.criadoEm) || Date.now(),
      mapeamentosSalvos: Array.isArray(d.mapeamentosSalvos) ? d.mapeamentosSalvos as MapeamentoSalvo[] : [],
      dadosSalvos: Array.isArray(d.dadosSalvos) ? d.dadosSalvos as DadosExtraidos[] : [],
      camposSalvos: Array.isArray(d.camposSalvos) ? d.camposSalvos as string[] : [],
      notificacoes: Array.isArray(d.notificacoes) ? d.notificacoes as NotificacaoLinha[] : [],
      empresaVinculada: (d.empresaVinculada as { clinumer: number; nome: string } | null) ?? null,
      firestoreId: lsId,
    });
    const aplicarEmpresas = (docs: ModeloSaida[]) => {
      const emp: Record<string, { clinumer: number; nome: string }> = {};
      docs.forEach(m => { if (m.empresaVinculada) emp[m.id] = m.empresaVinculada; });
      if (Object.keys(emp).length > 0) setEmpresaSelecionadaPorModelo(prev => ({ ...prev, ...emp }));
    };
    const lsCarregar = () => {
      const lsData = lsGetAll();
      const lsEmpresas = lsGetEmpresas();
      const lsDocs = Object.entries(lsData).map(([id, d]) => {
        const m = parseLsDoc(id, d as Record<string, unknown>);
        if (!m.empresaVinculada) {
          m.empresaVinculada = lsEmpresas[`modelo_${id}`] ?? lsEmpresas[m.id] ?? null;
        }
        return m;
      });
      lsDocs.sort((a, b) => b.criadoEm - a.criadoEm);
      setModelosSalvos(lsDocs);
      aplicarEmpresas(lsDocs);
    };

    const carregarModelos = async () => {
      if (db) {
        try {
          const snap = await rtdbGet(rtdbRef(rtdb, 'modelos-nota'));
          if (snap.exists()) {
            // RTDB tem dados: usar como fonte de verdade (sem background replacement)
            const val = snap.val() as Record<string, Record<string, unknown>>;
            const fbDocs: ModeloSaida[] = Object.entries(val).map(([id, d]) =>
              parseFbDoc(d, id)
            );
            fbDocs.sort((a, b) => b.criadoEm - a.criadoEm);
            setModelosSalvos(fbDocs);
            aplicarEmpresas(fbDocs);
            return;
          }
          // Firebase vazio: migrar localStorage para Firebase
          const lsData = lsGetAll();
          const lsEmpresas = lsGetEmpresas();
          const lsDocs = Object.entries(lsData).map(([id, d]) => {
            const m = parseLsDoc(id, d as Record<string, unknown>);
            if (!m.empresaVinculada) {
              m.empresaVinculada = lsEmpresas[`modelo_${id}`] ?? lsEmpresas[m.id] ?? null;
            }
            return m;
          });
          if (lsDocs.length > 0) {
            const migrados: ModeloSaida[] = [];
            for (const lsDoc of lsDocs) {
              const lsId = lsDoc.firestoreId!;
              const d = (lsData[lsId] ?? {}) as Record<string, unknown>;
              const payload: Record<string, unknown> = {
                nome: lsDoc.nome,
                codigoAcesso: lsDoc.codigoAcesso || '',
                colunas: lsDoc.colunas,
                criadoEm: lsDoc.criadoEm,
                mapeamentosSalvos: lsDoc.mapeamentosSalvos || [],
                notificacoes: lsDoc.notificacoes || [],
                empresaVinculada: lsDoc.empresaVinculada ?? null,
                userId: String(d.userId || 'publico'),
              };
              try {
                const ref = await rtdbPush(rtdbRef(rtdb, 'modelos-nota'), payload);
                migrados.push({ ...lsDoc, id: `modelo_${ref.key}`, firestoreId: ref.key! });
              } catch { migrados.push(lsDoc); }
            }
            migrados.sort((a, b) => b.criadoEm - a.criadoEm);
            setModelosSalvos(migrados);
            aplicarEmpresas(migrados);
          }
          return;
        } catch (err) {
          console.warn('Firebase load falhou (usando localStorage):', err);
        }
      }
      lsCarregar();
    };

    carregarModelos();
  }, []);

  // Auto-recarregar OS do SGDW para modelos com empresa vinculada ao recarregar a página
  useEffect(() => {
    if (_autoCarregouEmpresa || modelosSalvos.length === 0) return;
    const pares = modelosSalvos.filter(m => m.empresaVinculada);
    if (pares.length === 0) return;
    _autoCarregouEmpresa = true;
    pares.forEach(modelo => {
      const empresa = modelo.empresaVinculada!;
      setEmpresaCarregandoModeloId(modelo.id);
      buscarOsEmpresaMesNota(empresa.clinumer, sgdwAno, sgdwMes)
        .then(linhas => {
          if (linhas.length === 0) return;
          const dadosMapeados: DadosExtraidos[] = linhas.map(
            linha => mapearLinhaSgdwParaModelo(linha, modelo.colunas)
          );
          // Fase 1: selecionar modelo — deixa useEffect([modeloSelecionado]) disparar e
          // configurar os mapeamentos iniciais (vazios). Fase 2 vem logo depois.
          setModeloSelecionado(modelo);
          setShowPreview(true);
          // Fase 2: após React processar o efeito de seleção do modelo, sobrescrever com
          // os dados reais e mapeamentos de identidade (igual ao fluxo manual).
          setTimeout(() => {
            setDadosExtraidos(dadosMapeados);
            setCamposExtraidos(modelo.colunas);
            setMapeamentos(modelo.colunas.map(col => ({ colunaModelo: col, campoExtraido: col, confianca: 100 })));
          }, 80);
        })
        .catch(err => console.warn('Auto-reload empresa SGDW falhou:', err))
        .finally(() => setEmpresaCarregandoModeloId(null));
    });
  }, [modelosSalvos]);

  // Carregar serviços SGDW para autocomplete de colunas
  useEffect(() => {
    buscarServicosSgdw().then(nomes => {
      if (nomes.length > 0) setServicosSgdw(nomes);
    });
  }, []);

  // ----- Carregar PlanilhasFinalizadas (quando aba ativa) -----
  const carregarPlanilhasFinalizadas = async () => {
    setPlanilhasLoading(true);
    try {
      if (!db) { setPlanilhasFinalizadas([]); return; }
      // Preferir carregar apenas planilhas do usuário autenticado
      const col = collection(db, 'PlanilhasFinalizadas');
      let snap;
      if (usuario?.email) {
        try {
          const q = query(col, where('userId', '==', usuario.email), orderBy('criadoEm', 'desc'));
          snap = await getDocs(q);
        } catch (err) {
          // fallback sem orderBy
          const q2 = query(col, where('userId', '==', usuario.email));
          snap = await getDocs(q2);
        }
      } else {
        // Sem usuário, trazer nada
        setPlanilhasFinalizadas([]);
        setPlanilhasLoading(false);
        return;
      }

      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setPlanilhasFinalizadas(docs);
      setPlanilhasPage(0);
    } catch (err) {
      console.warn('Erro ao carregar PlanilhasFinalizadas', err);
      mostrarMensagem('Erro ao carregar planilhas finalizadas', 'error');
    } finally {
      setPlanilhasLoading(false);
    }
  };

  useEffect(() => {
    if (tabAtiva === 1) carregarPlanilhasFinalizadas();
  }, [tabAtiva, usuario]);

  // Fechar preview ao clicar fora (background) — respeita cliques dentro dos containers de modelos/planilhas
  useEffect(() => {
    if (!showPreview) return;
    const handleClickOutside = (ev: MouseEvent) => {
      const tgt = ev.target as Node;
      if (!previewWrapperRef.current) return;

      const el = ev.target as HTMLElement | null;
      // permitir elementos marcados explicitamente para NÃO fechar o preview
      if (el && el.closest && el.closest('[data-ignore-preview-close]')) return;

      // clique dentro do preview: ignorar
      if (previewWrapperRef.current.contains(tgt)) return;
      // alguns componentes (tooltips/menus) podem ser renderizados fora do wrapper via portal — checar pelo id do preview
      const previewEl = document.getElementById('preview-dados-organizados');
      if (previewEl && previewEl.contains(tgt)) return;

      // clique em lista de modelos ou na aba de planilhas: não fechar (esses cliques normalmente abrem o preview)
      if (modelsGridRef.current && modelsGridRef.current.contains(tgt)) return;
      if (planilhasTabRef.current && planilhasTabRef.current.contains(tgt)) return;

      // caso contrário, limpar/fechar preview
      setShowPreview(false);
      setSelectedPlanilhaFinalizada(null);
      setPreviewRows(null);
      setPreviewEditMode(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPreview]);

  // Quando um modelo é selecionado, inicializar mapeamentos e carregar dados salvos
  useEffect(() => {
    if (!modeloSelecionado) {
      setMapeamentos([]);
      setDadosExtraidos([]);
      setCamposExtraidos([]);
      setNotificacoes([]);
      return;
    }
    // Carregar mapeamentos salvos
    const mapeamentosReconciliados = reconciliarMapeamentosSalvosComColunas(
      modeloSelecionado.colunas,
      modeloSelecionado.mapeamentosSalvos || []
    );
    const inicial = modeloSelecionado.colunas.map(col => {
      const salvo = mapeamentosReconciliados.find(ms => ms.colunaModelo === col);
      return {
        colunaModelo: col,
        campoExtraido: salvo?.campoExtraido || '',
        confianca: salvo ? 100 : 0,
      } as MapeamentoCampo;
    });
    setMapeamentos(inicial);
    
    // Carregar dados extraídos salvos (se houver) — mas não se há empresa SGDW vinculada,
    // pois o auto-fetch em selecionarModelo vai carregar dados frescos do banco.
    const temEmpresaVinculada = !!lsGetEmpresas()[modeloSelecionado.id];
    if (!temEmpresaVinculada && modeloSelecionado.dadosSalvos && modeloSelecionado.dadosSalvos.length > 0) {
      setDadosExtraidos(preencherTotaisAusentesNasLinhas(modeloSelecionado.dadosSalvos));
      setCamposExtraidos(modeloSelecionado.camposSalvos || []);
    }
    
    // Carregar notificações salvas
    if (modeloSelecionado.notificacoes && modeloSelecionado.notificacoes.length > 0) {
      setNotificacoes(modeloSelecionado.notificacoes);
    } else {
      setNotificacoes([]);
    }
  }, [modeloSelecionado]);

  // ============ FUNÇÕES DO MODELO ============
  
  // Detectar se uma linha parece ser um cabeçalho válido (não título repetido)
  const isLinhaHeaderValida = (valores: string[]): boolean => {
    if (valores.length < 2) return false;
    
    // Filtrar valores vazios
    const valoresLimpos = valores.filter(v => v && v.trim());
    if (valoresLimpos.length < 2) return false;
    
    // Verificar se há muitos valores duplicados (indica título mesclado)
    const unicos = new Set(valoresLimpos);
    const taxaDuplicacao = 1 - (unicos.size / valoresLimpos.length);
    if (taxaDuplicacao > 0.5) return false; // Mais de 50% duplicado = provavelmente título
    
    // Verificar se os valores são muito longos (títulos geralmente são longos)
    const mediaComprimento = valoresLimpos.reduce((acc, v) => acc + v.length, 0) / valoresLimpos.length;
    if (mediaComprimento > 50) return false;
    
    return true;
  };

  const normalizarNomeColunaCompat = (valor: string): string =>
    String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const compactarNomeColunaCompat = (valor: string): string =>
    normalizarNomeColunaCompat(valor).replace(/\s+/g, '');

  const calcularScoreCompatibilidadeColuna = (atual: string, salvo: string): number => {
    const atualNormalizado = normalizarNomeColunaCompat(atual);
    const salvoNormalizado = normalizarNomeColunaCompat(salvo);
    const atualCompacto = compactarNomeColunaCompat(atual);
    const salvoCompacto = compactarNomeColunaCompat(salvo);

    if (!atualCompacto || !salvoCompacto) return 0;
    if (atualCompacto === salvoCompacto) return 100;

    let score = 0;

    if (atualCompacto.includes(salvoCompacto) || salvoCompacto.includes(atualCompacto)) {
      score = Math.max(score, 78);
    }

    const tokensAtual = atualNormalizado.split(' ').filter(Boolean);
    const tokensSalvos = salvoNormalizado.split(' ').filter(Boolean);
    const tokensComuns = tokensAtual.filter(token => tokensSalvos.includes(token));

    if (tokensComuns.length > 0) {
      const cobertura = tokensComuns.length / Math.max(tokensAtual.length, tokensSalvos.length, 1);
      score = Math.max(score, Math.round(60 + (cobertura * 50)));
    }

    return Math.min(100, score);
  };

  const reconciliarMapeamentosSalvosComColunas = (
    colunasAtuais: string[],
    mapeamentosSalvos: MapeamentoSalvo[] = []
  ): MapeamentoSalvo[] => {
    if (!Array.isArray(colunasAtuais) || colunasAtuais.length === 0 || !Array.isArray(mapeamentosSalvos) || mapeamentosSalvos.length === 0) {
      return [];
    }

    const usados = new Set<number>();
    const reconciliados: MapeamentoSalvo[] = [];

    colunasAtuais.forEach(colunaAtual => {
      const idxExato = mapeamentosSalvos.findIndex((mapeamento, index) =>
        !usados.has(index) &&
        compactarNomeColunaCompat(mapeamento.colunaModelo) === compactarNomeColunaCompat(colunaAtual)
      );

      if (idxExato >= 0) {
        usados.add(idxExato);
        reconciliados.push({
          ...mapeamentosSalvos[idxExato],
          colunaModelo: colunaAtual,
        });
      }
    });

    colunasAtuais.forEach(colunaAtual => {
      if (reconciliados.some(mapeamento => mapeamento.colunaModelo === colunaAtual)) return;

      let melhorIdx = -1;
      let melhorScore = 0;

      mapeamentosSalvos.forEach((mapeamento, index) => {
        if (usados.has(index)) return;
        const score = calcularScoreCompatibilidadeColuna(colunaAtual, mapeamento.colunaModelo);
        if (score > melhorScore) {
          melhorScore = score;
          melhorIdx = index;
        }
      });

      if (melhorIdx >= 0 && melhorScore >= 78) {
        usados.add(melhorIdx);
        reconciliados.push({
          ...mapeamentosSalvos[melhorIdx],
          colunaModelo: colunaAtual,
        });
      }
    });

    return reconciliados;
  };

  // Processar arquivo de modelo (Excel/CSV)
  const processarArquivoModelo = async (file: File) => {
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let colunas: string[] = [];

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const sheet = workbook.worksheets[0];
        if (sheet) {
          // Tentar encontrar a linha de cabeçalho real (até linha 10)
          let headerRow: string[] = [];
          let headerRowNum = 1;
          
          for (let rowNum = 1; rowNum <= Math.min(10, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            const valores: string[] = [];
            
            row.eachCell({ includeEmpty: false }, (cell) => {
              const valor = String(cell.value || '').trim();
              if (valor) valores.push(valor);
            });
            
            if (isLinhaHeaderValida(valores)) {
              headerRow = valores;
              headerRowNum = rowNum;
              break;
            }
          }
          
          // Remover duplicados e manter ordem
          const seen = new Set<string>();
          colunas = headerRow.filter(col => {
            const normalizado = col.toLowerCase();
            if (seen.has(normalizado)) return false;
            seen.add(normalizado);
            return true;
          });
          
          // Guardar preview das primeiras linhas para seleção manual
          const previewLinhas: string[][] = [];
          for (let rowNum = 1; rowNum <= Math.min(15, sheet.rowCount); rowNum++) {
            const row = sheet.getRow(rowNum);
            const valores: string[] = [];
            row.eachCell({ includeEmpty: true }, (cell, colNum) => {
              valores[colNum - 1] = String(cell.value || '').trim();
            });
            if (valores.some(v => v)) {
              previewLinhas.push(valores.filter(v => v));
            }
          }
          setLinhasPreview(previewLinhas);
          setLinhaHeaderSelecionada(headerRowNum - 1);
          
          console.log(`Cabeçalho encontrado na linha ${headerRowNum}:`, colunas);
        }
      } else if (ext === 'csv') {
        const texto = await file.text();
        const resultado = Papa.parse(texto, { header: false });
        if (resultado.data && resultado.data.length > 0) {
          // Guardar preview
          const previewLinhas = (resultado.data as string[][])
            .slice(0, 15)
            .map(row => row.map(c => String(c || '').trim()).filter(Boolean))
            .filter(row => row.length > 0);
          setLinhasPreview(previewLinhas);
          
          // Tentar encontrar linha de cabeçalho válida
          let headerIdx = 0;
          for (let i = 0; i < Math.min(10, resultado.data.length); i++) {
            const linha = (resultado.data[i] as string[]).map(c => String(c || '').trim()).filter(Boolean);
            if (isLinhaHeaderValida(linha)) {
              headerIdx = i;
              const seen = new Set<string>();
              colunas = linha.filter(col => {
                const normalizado = col.toLowerCase();
                if (seen.has(normalizado)) return false;
                seen.add(normalizado);
                return true;
              });
              break;
            }
          }
          setLinhaHeaderSelecionada(headerIdx);
        }
      }

      // Se não encontrou colunas automaticamente mas tem preview, deixar o usuário selecionar
      if (colunas.length === 0) {
        mostrarMensagem('Selecione a linha que contém os cabeçalhos das colunas', 'info');
        return;
      }

      setColunasNovoModelo(colunas);
      setArquivoModelo(file);
      // Não sobrescrever o nome do modelo existente: usar nome do modelo selecionado quando disponível,
      // ou preservar o que o usuário já digitou. Só preencher com o nome do arquivo se não houver nome definido.
      if (!modeloSelecionado && !nomeNovoModelo.trim()) {
        setNomeNovoModelo(file.name.replace(/\.[^.]+$/, ''));
      }
      mostrarMensagem(`${colunas.length} colunas extraídas do modelo com sucesso!`, 'success');
    } catch (err: any) {
      mostrarMensagem('Erro ao processar arquivo: ' + (err?.message || String(err)), 'error');
    }
  };

  // processar arquivo de marca/modelo e criar mapa placa->marca/modelo
  const processarArquivoMarcaModelo = async (file: File) => {
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let rows: string[][] = [];

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const sheet = workbook.worksheets[0];
        if (sheet) {
          sheet.eachRow({ includeEmpty: false }, (row) => {
            const vals: string[] = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
              vals.push(String(cell.value || '').trim());
            });
            if (vals.some(v => v)) rows.push(vals);
          });
        }
      } else if (ext === 'csv') {
        const texto = await file.text();
        const resultado = Papa.parse<string[]>(texto, { header: false });
        if (resultado.data) {
          rows = resultado.data as string[][];
        }
      }

      if (rows.length === 0) {
        mostrarMensagem('Arquivo de marca/modelo está vazio ou não pôde ser lido.', 'error');
        return;
      }

      // localizar cabeçalho (primeiras 10 linhas)
      let header: string[] = [];
      let headerIdx = 0;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const linha = rows[i].map(c => String(c || '').trim()).filter(Boolean);
        if (isLinhaHeaderValida(linha)) {
          header = linha;
          headerIdx = i;
          break;
        }
      }
      if (header.length === 0) {
        header = rows[0].map(c => String(c || '').trim());
        headerIdx = 0;
      }
      const placaIdx = header.findIndex(c => /placa/i.test(c));
      const marcaIdx = header.findIndex(c => /marca/i.test(c));
      const modeloIdx = header.findIndex(c => /modelo/i.test(c));
      if (placaIdx < 0 || (marcaIdx < 0 && modeloIdx < 0)) {
        mostrarMensagem('Não encontrei colunas de placa/marca/modelo no arquivo.', 'error');
        return;
      }

      const map: Record<string, { marca?: string; modelo?: string }> = {};
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const placaVal = String(row[placaIdx] || '').trim();
        if (!placaVal) continue;
        map[placaVal] = {
          marca: marcaIdx >= 0 ? String(row[marcaIdx] || '').trim() : undefined,
          modelo: modeloIdx >= 0 ? String(row[modeloIdx] || '').trim() : undefined,
        };
      }
      setMarcaModeloMap(map);
      setArquivoMarcaModelo(file);
      mostrarMensagem('Mapa de marca/modelo carregado (' + Object.keys(map).length + ' entradas)', 'success');
    } catch (err: any) {
      mostrarMensagem('Erro ao processar arquivo de marca/modelo: ' + (err?.message || String(err)), 'error');
    }
  };

  // Selecionar linha de cabeçalho manualmente
  const selecionarLinhaHeader = (index: number) => {
    if (index < 0 || index >= linhasPreview.length) return;
    
    const linha = linhasPreview[index];
    const seen = new Set<string>();
    const colunas = linha.filter(col => {
      if (!col || col.trim() === '') return false;
      const normalizado = col.toLowerCase();
      if (seen.has(normalizado)) return false;
      seen.add(normalizado);
      return true;
    });
    
    setLinhaHeaderSelecionada(index);
    setColunasNovoModelo(colunas);
    mostrarMensagem(`${colunas.length} colunas selecionadas da linha ${index + 1}`, 'success');
  };

  // Adicionar coluna manual
  const adicionarColuna = () => {
    const coluna = novaColuna.trim();
    if (!coluna) return;
    if (colunasNovoModelo.includes(coluna)) {
      mostrarMensagem('Esta coluna já existe', 'error');
      return;
    }
    setColunasNovoModelo([...colunasNovoModelo, coluna]);
    setNovaColuna('');
  };

  // Remover coluna
  const removerColuna = (index: number) => {
    setColunasNovoModelo(colunasNovoModelo.filter((_, i) => i !== index));
  };

  // Salvar edição de coluna dentro do editor de modelo salvo
  const salvarEdicaoColuna = (idx: number) => {
    if (editingModelData === null) return;
    const novoNome = (editingColValue || '').trim();
    if (!novoNome) {
      mostrarMensagem('Nome da coluna não pode ficar vazio', 'error');
      return;
    }
    // Verificar duplicatas
    const duplicado = editingModelData.colunas.some((col, i) => col.toLowerCase() === novoNome.toLowerCase() && i !== idx);
    if (duplicado) {
      mostrarMensagem('Já existe uma coluna com esse nome', 'error');
      return;
    }
    const nomeAnterior = editingModelData.colunas[idx];
    const cols = [...editingModelData.colunas];
    cols[idx] = novoNome;
    const baseMapeamentos = (editingModelData.mapeamentosSalvos || []).map(mapeamento =>
      mapeamento.colunaModelo === nomeAnterior
        ? { ...mapeamento, colunaModelo: novoNome }
        : mapeamento
    );
    setEditingModelData({
      ...editingModelData,
      colunas: cols,
      mapeamentosSalvos: reconciliarMapeamentosSalvosComColunas(cols, baseMapeamentos),
    });
    setEditingColIndex(null);
    setEditingColValue('');
  };

  // Salvar modelo (Firestore-only)
  const salvarModelo = async () => {
    if (!nomeNovoModelo.trim()) {
      mostrarMensagem('Digite um nome para o modelo', 'error');
      return;
    }
    if (colunasNovoModelo.length === 0) {
      mostrarMensagem('Adicione pelo menos uma coluna', 'error');
      return;
    }

    try {
      const baseModelo: ModeloSaida = {
        id: `modelo_tmp_${Date.now()}`,
        nome: nomeNovoModelo.trim(),
        codigoAcesso: codigoNovoModelo.trim() || undefined,
        colunas: colunasNovoModelo,
        criadoEm: Date.now(),
      };
      const firestoreId = await salvarModeloNoFirebase(baseModelo, usuario?.email ?? undefined);
      if (!firestoreId) {
        mostrarMensagem('Erro ao salvar modelo', 'error');
        return;
      }
      const modeloComId: ModeloSaida = { ...baseModelo, id: `modelo_${firestoreId}`, firestoreId };
      const novosModelos = [modeloComId, ...modelosSalvos];
      setModelosSalvos(novosModelos);
      await selecionarModelo(modeloComId);
      if (novoModeloEmpresa) {
        const empVinc = { clinumer: novoModeloEmpresa.CLINUMER, nome: novoModeloEmpresa.NOME };
        setEmpresaSelecionadaPorModelo(prev => {
          const next = { ...prev, [modeloComId.id]: empVinc };
          lsSaveEmpresas(next);
          return next;
        });
        setModelosSalvos(prev => prev.map(m => m.id === modeloComId.id ? { ...m, empresaVinculada: empVinc } : m));
        if (modeloComId.firestoreId) {
          rtdbUpdate(rtdbRef(rtdb, `modelos-nota/${modeloComId.firestoreId}`), { empresaVinculada: empVinc })
            .catch(err => console.warn('Firebase RTDB empresaVinculada save falhou', err));
        }
      }
      setNomeNovoModelo('');
      setCodigoNovoModelo('');
      setColunasNovoModelo(COLUNAS_PADRAO);
      setArquivoModelo(null);
      setNovoModeloEmpresa(null);
      setEmpresaBusca('');
      setEmpresasResultados([]);
      setTabAtiva(0);
      mostrarMensagem('Modelo salvo com sucesso ✅', 'success');
    } catch (err) {
      console.warn('Erro ao salvar modelo no Firebase', err);
      mostrarMensagem('Erro ao salvar modelo no Firebase', 'error');
    }
  };

  const excluirModelo = async () => {
    if (!modeloParaExcluir) return;
    try {
      const modelo = modelosSalvos.find(m => m.id === modeloParaExcluir);
      if (modelo?.firestoreId) {
        try { await rtdbRemove(rtdbRef(rtdb, `modelos-nota/${modelo.firestoreId}`)); }
        catch { lsDelete(modelo.firestoreId); }
      }
      const novosModelos = modelosSalvos.filter(m => m.id !== modeloParaExcluir);
      setModelosSalvos(novosModelos);
      if (modeloSelecionado?.id === modeloParaExcluir) {
        selecionarModelo(null);
      }
      setModeloParaExcluir(null);
      setDialogConfirmacao(false);
      mostrarMensagem('Modelo removido com sucesso', 'success');
    } catch (err) {
      console.warn('Erro ao excluir modelo', err);
      mostrarMensagem('Erro ao excluir modelo', 'error');
    }
  };

  // Duplicar modelo (clona configuração inteira e tenta persistir no Firebase quando possível)
  const confirmarDuplicarModelo = async () => {
    if (!duplicatingModel) return;
    if (!duplicateName.trim()) { mostrarMensagem('Digite um nome para o modelo', 'error'); return; }
    setDuplicatingLoading(true);
    try {
      const novoModelo: ModeloSaida = {
        id: `modelo_${Date.now()}`,
        nome: duplicateName.trim(),
        codigoAcesso: duplicatingModel.codigoAcesso,
        colunas: JSON.parse(JSON.stringify(duplicatingModel.colunas || [])),
        criadoEm: Date.now(),
        mapeamentosSalvos: duplicatingModel.mapeamentosSalvos ? JSON.parse(JSON.stringify(duplicatingModel.mapeamentosSalvos)) : [],
        dadosSalvos: duplicatingModel.dadosSalvos ? JSON.parse(JSON.stringify(duplicatingModel.dadosSalvos)) : [],
        camposSalvos: duplicatingModel.camposSalvos ? JSON.parse(JSON.stringify(duplicatingModel.camposSalvos)) : [],
        notificacoes: duplicatingModel.notificacoes ? JSON.parse(JSON.stringify(duplicatingModel.notificacoes)) : [],
        previewSalvo: duplicatingModel.previewSalvo ? JSON.parse(JSON.stringify(duplicatingModel.previewSalvo)) : undefined,
      } as ModeloSaida;

      const firestoreId = await salvarModeloNoFirebase(novoModelo, usuario?.email ?? undefined);
      if (firestoreId) novoModelo.firestoreId = firestoreId;

      const novos = [novoModelo, ...modelosSalvos];
      setModelosSalvos(novos);
      await selecionarModelo(novoModelo);
      setDuplicateDialogOpen(false);
      setDuplicatingModel(null);
      setDuplicateName('');
      mostrarMensagem('Modelo duplicado com sucesso', 'success');
      if (!novoModelo.firestoreId) mostrarMensagem('Duplicação criada localmente (não sincronizada)', 'info');
    } catch (err) {
      console.warn('Erro ao duplicar modelo', err);
      mostrarMensagem('Erro ao duplicar modelo', 'error');
    } finally {
      setDuplicatingLoading(false);
    }
  };

  // Finalizar planilha: grava uma cópia em 'PlanilhasFinalizadas' sem alterar o modelo atual
  const finalizarPlanilha = async (modelo: ModeloSaida) => {
    if (!modelo) return;
    if (!usuario?.email) { mostrarMensagem('Faça login para finalizar a planilha', 'error'); return; }
    if (!window.confirm(`Finalizar planilha do modelo "${modelo.nome}"?`)) return;

    setFinalizandoModeloId(modelo.id);
    try {
      const isSelected = modeloSelecionado?.id === modelo.id;
      const dadosToSave = isSelected ? dadosExtraidos : (modelo.dadosSalvos || []);
      const camposToSave = isSelected ? camposExtraidos : (modelo.camposSalvos || []);

      const payload: any = {
        nome: modelo.nome,
        modeloId: modelo.id,
        modeloNome: modelo.nome,
        modeloCodigo: modelo.codigoAcesso || '',
        dados: dadosToSave || [],
        campos: camposToSave || [],
        salvoPor: usuario.email,
        salvoEm: Date.now(),
        criadoEm: Date.now(),
        userId: usuario.email,
      };

      if (!db) throw new Error('Firebase não inicializado');
      const col = collection(db, 'PlanilhasFinalizadas');
      const docRef = await addDoc(col, payload);

      // Inserir imediatamente na lista local e abrir preview
      const newPlanilha = { id: docRef.id, ...payload };
      setPlanilhasFinalizadas(prev => [newPlanilha, ...prev]);
      setPlanilhasPage(0);
      setTabAtiva(1); // ir para a aba de Planilhas Finalizadas
      setExpandedPlanilhaId(docRef.id);
      setSelectedPlanilhaFinalizada(newPlanilha);
      setShowPreview(true);

      mostrarMensagem('Planilha finalizada e salva em PlanilhasFinalizadas', 'success');

      // --- Limpar dados salvos do modelo (permitir início de nova planilha) ---
      const modeloAtualizado: ModeloSaida = { ...modelo, dadosSalvos: [], camposSalvos: [] } as ModeloSaida;
      // Atualizar estado local e UI
      setModelosSalvos(prev => prev.map(m => m.id === modelo.id ? modeloAtualizado : m));
      if (modeloSelecionado?.id === modelo.id) {
        // limpar UI e re-selecionar modelo atualizado para refletir mudanças
        setDadosExtraidos([]);
        setCamposExtraidos([]);
        setNotificacoes([]);
        await selecionarModelo(modeloAtualizado);
      }

      // Persistir limpeza no Firestore quando aplicável
      if (modelo.firestoreId && db) {
        try {
          await updateDoc(doc(db, 'notas', modelo.firestoreId), { dadosSalvos: [], camposSalvos: [], atualizadoEm: serverTimestamp() } as any);
        } catch (err) {
          console.warn('Falha ao limpar dados do modelo no Firestore', err);
        }
      }

      // Recarregar lista caso a aba já estivesse aberta (efetua refresh leve)
      if (tabAtiva === 1) carregarPlanilhasFinalizadas();

      // Se estiver exibindo a lista, garantir que nova página mostre o topo (UX)
      setPlanilhasPage(0);
    } catch (err) {
      console.warn('Erro ao finalizar planilha', err);
      mostrarMensagem('Erro ao finalizar planilha', 'error');
    } finally {
      setFinalizandoModeloId(null);
    }
  };

  // Abrir diálogo de edição para uma planilha finalizada
  const abrirEditarPlanilha = (p: any) => {
    setPlanilhaEditing(p);
    setEditPlanilhaName(p.nome || p.modeloNome || '');
    setEditPlanilhaOpen(true);
  };

  // Salvar edição (nome) da planilha finalizada
  const salvarEdicaoPlanilha = async () => {
    if (!planilhaEditing) return;
    if (!editPlanilhaName.trim()) { mostrarMensagem('Nome não pode ficar vazio', 'error'); return; }
    setEditPlanilhaLoading(true);
    try {
      const id = planilhaEditing.id;
      if (!id) throw new Error('ID da planilha ausente');
      const docRef = doc(db, 'PlanilhasFinalizadas', id);
      await updateDoc(docRef, { nome: editPlanilhaName.trim(), atualizadoEm: serverTimestamp() } as any);
      setPlanilhasFinalizadas(prev => prev.map(p => p.id === id ? { ...p, nome: editPlanilhaName.trim() } : p));
      setEditPlanilhaOpen(false);
      setPlanilhaEditing(null);
      mostrarMensagem('Planilha atualizada', 'success');
    } catch (err) {
      console.warn('Erro ao salvar edição da planilha', err);
      mostrarMensagem('Erro ao atualizar planilha', 'error');
    } finally {
      setEditPlanilhaLoading(false);
    }
  };

  // Remover planilha finalizada (função reutilizável)
  const excluirPlanilhaFinalizada = async (id: string) => {
    if (!id) return;
    if (!window.confirm('Remover esta planilha finalizada? Esta ação é irreversível.')) return;
    try {
      await deleteDoc(doc(db, 'PlanilhasFinalizadas', id));
      setPlanilhasFinalizadas(prev => prev.filter(p => p.id !== id));
      mostrarMensagem('Planilha removida', 'success');
    } catch (err) {
      console.warn('Erro ao remover planilha finalizada', err);
      mostrarMensagem('Erro ao remover planilha', 'error');
    }
  };

  // Salvar mapeamento no modelo atual
  const salvarMapeamentoNoModelo = async () => {
    if (!modeloSelecionado) {
      mostrarMensagem('Nenhum modelo selecionado', 'error');
      return;
    }
    
    const mapeamentoParaSalvar: MapeamentoSalvo[] = mapeamentos
      .filter(m => m.campoExtraido) // Só salva mapeamentos que têm campo definido
      .map(m => ({
        colunaModelo: m.colunaModelo,
        campoExtraido: m.campoExtraido,
      }));
    
    const modeloAtualizado: ModeloSaida = {
      ...modeloSelecionado,
      mapeamentosSalvos: mapeamentoParaSalvar,
    };
    
    const novosModelos = modelosSalvos.map(m => 
      m.id === modeloSelecionado.id ? modeloAtualizado : m
    );
    
    setModelosSalvos(novosModelos);
    await selecionarModelo(modeloAtualizado);

    // Atualizar mapeamento no Firestore
    try {
      await atualizarMapeamentoNoFirebase(modeloAtualizado);
      mostrarMensagem(`Mapeamento salvo no modelo "${modeloSelecionado.nome}" e sincronizado com Firebase ✅`, 'success');
    } catch (err) {
      console.warn('Erro ao sincronizar mapeamento:', err);
      mostrarMensagem(`Mapeamento salvo, mas falha ao sincronizar com Firebase ⚠️`, 'info');
    }
  };

  // Aplicar mapeamentos salvos do modelo
  const aplicarMapeamentosSalvos = (modelo: ModeloSaida, camposDisponiveis: string[]) => {
    const mapeamentosReconciliados = reconciliarMapeamentosSalvosComColunas(
      modelo.colunas,
      modelo.mapeamentosSalvos || []
    );
    if (mapeamentosReconciliados.length === 0) return;
    
    setMapeamentos(prevMapeamentos => 
      prevMapeamentos.map(m => {
        const mapeamentoSalvo = mapeamentosReconciliados.find(
          ms => ms.colunaModelo === m.colunaModelo
        );
        
      if (mapeamentoSalvo) {
        const alvo = mapeamentoSalvo.campoExtraido;
        // Tentar match exato primeiro
        if (camposDisponiveis.includes(alvo)) {
          return {
            ...m,
            campoExtraido: alvo,
            confianca: 100,
          };
        }
        // Tentar encontrar melhor match aproximado
        let melhor = '';
        let melhorScore = 0;
        camposDisponiveis.forEach(campo => {
          const campoNorm = normalizar(campo);
          const alvoNorm = normalizar(alvo);
          let score = 0;
          if (campoNorm === alvoNorm) score = 100;
          else if (campoNorm.includes(alvoNorm) || alvoNorm.includes(campoNorm)) score = 80;
          else {
            const palavrasCampo = campoNorm.split(/[^a-z0-9]+/).filter(Boolean);
            const palavrasAlvo = alvoNorm.split(/[^a-z0-9]+/).filter(Boolean);
            const comuns = palavrasCampo.filter(p => palavrasAlvo.includes(p));
            score = (comuns.length / Math.max(palavrasCampo.length, palavrasAlvo.length)) * 60;
          }
          if (score > melhorScore) {
            melhorScore = score;
            melhor = campo;
          }
        });
        if (melhorScore >= 60) {
          return {
            ...m,
            campoExtraido: melhor,
            confianca: Math.round(melhorScore),
          };
        }
        // Não encontrou correspondência; manter o campo salvo para preservar o mapeamento
        return {
          ...m,
          campoExtraido: alvo,
          confianca: 70, // Preservado mas sem correspondência direta
        };
      }
      return m;
    })
  );
};

  // Aplicar apenas mapeamentos salvos: se não houver mapeamento salvo, marcar como não mapeado
  const aplicarApenasMapeamentosSalvos = (modelo: ModeloSaida | null, camposDisponiveis: string[]) => {
    if (!modelo) return;
    const mapeamentosReconciliados = reconciliarMapeamentosSalvosComColunas(
      modelo.colunas,
      modelo.mapeamentosSalvos || []
    );
    const novos = modelo.colunas.map(col => {
      const salvo = mapeamentosReconciliados.find(ms => ms.colunaModelo === col);
      if (salvo && salvo.campoExtraido) {
        const existe = camposDisponiveis.includes(salvo.campoExtraido);
        return {
          colunaModelo: col,
          campoExtraido: salvo.campoExtraido,
          confianca: existe ? 100 : 70,
        } as MapeamentoCampo;
      }
      return {
        colunaModelo: col,
        campoExtraido: '',
        confianca: 0,
      } as MapeamentoCampo;
    });
    setMapeamentos(novos);
  };

  // Persistir estado por modelo (dados, campos, mapeamentos, notificações e preview)
  const salvarEstadoModeloLocal = async (modelId?: string, persistToFirebase = false) => {
    if (!modelId) return;
    const idx = modelosSalvos.findIndex(m => m.id === modelId);
    if (idx < 0) return;
    const modelo = modelosSalvos[idx];

    const atualizado: ModeloSaida = {
      ...modelo,
      dadosSalvos: preencherTotaisAusentesNasLinhas(dadosExtraidos),
      camposSalvos: camposExtraidos,
      mapeamentosSalvos: mapeamentos
        .filter(mm => mm.campoExtraido)
        .map(mm => ({ colunaModelo: mm.colunaModelo, campoExtraido: mm.campoExtraido })),
      notificacoes: notificacoes,
      // UI-only preview state (guardado por modelo)
      previewSalvo: previewRows || undefined,
      previewEditMode: previewEditMode || undefined,
    } as any;

    const novos = modelosSalvos.map(m => m.id === modelId ? atualizado : m);
    setModelosSalvos(novos);
    if (modeloSelecionado?.id === modelId) setModeloSelecionado(atualizado);

    if (persistToFirebase && modelo.firestoreId) {
      try {
        await salvarDadosExtraidosNoFirebase(modelo.firestoreId, preencherTotaisAusentesNasLinhas(atualizado.dadosSalvos || []), atualizado.camposSalvos || []);
        await atualizarMapeamentoNoFirebase(atualizado);
        await salvarNotificacoesNoFirebase(modelo.firestoreId, atualizado.notificacoes || []);
      } catch (err) {
        console.warn('Erro ao persistir estado do modelo', err);
      }
    }
  };

  // Trocar de modelo salvando o estado do modelo atual e carregando o estado do novo modelo (preview individual)
  const selecionarModelo = async (modelo: ModeloSaida | null) => {
    if (modeloSelecionado?.id && modeloSelecionado.id !== modelo?.id) {
      // tentar persistir alterações do modelo atual antes de trocar
      await salvarEstadoModeloLocal(modeloSelecionado.id, true);
    }

    setModeloSelecionado(modelo);

    if (!modelo) {
      // Limpar estado quando não há modelo selecionado
      setMapeamentos([]);
      setDadosExtraidos([]);
      setCamposExtraidos([]);
      setNotificacoes([]);
      setPreviewRows(null);
      setPreviewEditMode(false);
      setPage(0);
      setShowPreview(false);
      return;
    }

    // Ao selecionar explicitamente um modelo, mostrar o preview conforme solicitado pelo usuário
    setShowPreview(true);

    // Informar ao usuário que o modelo foi selecionado e está pronto para receber colagens (Ctrl+V)
    mostrarMensagem(`Modelo '${modelo.nome}' selecionado. Pressione Ctrl+V para colar comprovantes — serão processados automaticamente.`, 'info');

    // Configurar mapeamentos iniciais a partir das colunas do modelo (usando mapeamentos salvos quando disponíveis)
    const mapeamentosReconciliados = reconciliarMapeamentosSalvosComColunas(
      modelo.colunas,
      modelo.mapeamentosSalvos || []
    );
    const inicial = modelo.colunas.map(col => {
      const salvo = mapeamentosReconciliados.find(ms => ms.colunaModelo === col);
      return {
        colunaModelo: col,
        campoExtraido: salvo?.campoExtraido || '',
        confianca: salvo ? 100 : 0,
      } as MapeamentoCampo;
    });
    setMapeamentos(inicial);

    // Carregar dados e campos salvos (isolamento por modelo)
    setDadosExtraidos(modelo.dadosSalvos || []);
    setCamposExtraidos(modelo.camposSalvos || []);

    // Carregar notificações salvas
    setNotificacoes(modelo.notificacoes || []);

    // Carregar preview salvo (se houver)
    const preview = (modelo as any).previewSalvo as any[] | undefined;
    setPreviewRows(preview ? preview.map((r, idx) => ({ ...r, __originalIndex: r.__originalIndex ?? idx })) : null);
    setPreviewEditMode(Boolean((modelo as any).previewEditMode));

    // Resetar paginação
    setPage(0);

    // Auto-fetch SGDW data if a company is linked to this model.
    // Clear any stale saved data immediately so old values never flash on screen.
    const empresaVinculada = empresaSelecionadaPorModelo[modelo.id] ?? modelo.empresaVinculada ?? null;
    if (empresaVinculada) {
      setDadosExtraidos([]);
      setCamposExtraidos([]);
      // Limpar todo estado de exibição antigo — pode ter dados mapeados incorretamente
      setPreviewRows(null);
      setPreviewEditMode(false);
      setFilledRows(null);
      setEmpresaCarregandoModeloId(modelo.id);
      buscarOsEmpresaMesNota(empresaVinculada.clinumer, sgdwAno, sgdwMes)
        .then(linhas => {
          if (linhas.length === 0) return;
          const dadosMapeados: DadosExtraidos[] = linhas.map(
            (linha) => mapearLinhaSgdwParaModelo(linha, modelo.colunas)
          );
          setDadosExtraidos(dadosMapeados);
          setCamposExtraidos(modelo.colunas);
          setMapeamentos(modelo.colunas.map(col => ({ colunaModelo: col, campoExtraido: col, confianca: 100 })));
        })
        .catch(err => console.warn('Erro ao auto-carregar OS:', err))
        .finally(() => setEmpresaCarregandoModeloId(null));
    }
  };

  // Garantir persistência do modelo atual ao desmontar o componente
  useEffect(() => {
    return () => {
      if (modeloSelecionado?.id) {
        // salvamento silencioso no unload
        salvarEstadoModeloLocal(modeloSelecionado.id, true).catch(() => {});
      }
    };
  }, []);

  // Se houver query params para foco de notificação (modelId,line) navegar automaticamente para o modelo e página
  const searchParams = useSearchParams();
  useEffect(() => {
    const modelId = searchParams?.get('modelId');
    const line = searchParams?.get('line');
    if (!modelId) return;
    if (!modelosSalvos || modelosSalvos.length === 0) return;
    const model = modelosSalvos.find(m => m.id === String(modelId));
    if (model) {
      // selecionar modelo e ir para página contendo a linha
      selecionarModelo(model).then(() => {
        if (line !== undefined) {
          const ln = Number(line);
          if (!isNaN(ln)) setPage(Math.floor(ln / rowsPerPage));
        }
        setMensagem({ texto: `Foco na notificação (linha ${line})`, tipo: 'info' });
      }).catch(() => {});
    }
  }, [searchParams, modelosSalvos]);

  // Processar PDF para extrair apenas MARCA/MODELO e preencher na planilha existente
  const processarPdfMarcaModelo = async (file: File) => {
    if (!modeloSelecionado) {
      mostrarMensagem('Selecione um modelo primeiro', 'error');
      return;
    }

    const colunas = modeloSelecionado.colunas || [];
    // Encontrar a coluna MARCA/MODELO
    const marcaModeloColIdx = colunas.findIndex(c => /marca\s*\/\s*modelo/i.test(String(c || '')) || /marcamodelo/i.test(String(c || '')));
    const marcaColIdx = colunas.findIndex(c => /\bmarca\b/i.test(String(c || '')) && !/modelo/i.test(String(c || '')));
    const modeloColIdx = colunas.findIndex(c => /\bmodelo\b/i.test(String(c || '')) && !/marca/i.test(String(c || '')));

    if (marcaModeloColIdx < 0 && marcaColIdx < 0 && modeloColIdx < 0) {
      mostrarMensagem('Nenhuma coluna MARCA/MODELO encontrada no modelo', 'error');
      return;
    }

    setProcessandoMarcaModeloPdf(true);
    try {
      // 1. Fazer OCR do PDF
      mostrarMensagem('Enviando PDF para OCR...', 'info');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/gemini-ocr', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || 'Erro no OCR');
      }
      const data = await response.json();
      const textoOCR = data.text || '';

      if (!textoOCR.trim()) {
        mostrarMensagem('Nenhum texto extraído do PDF', 'error');
        return;
      }

      // 2. Pedir ao Gemini para extrair apenas MARCA/MODELO associado a identificadores
      const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const colunasAlvo = marcaModeloColIdx >= 0 
        ? [colunas[marcaModeloColIdx]] 
        : [marcaColIdx >= 0 ? colunas[marcaColIdx] : '', modeloColIdx >= 0 ? colunas[modeloColIdx] : ''].filter(Boolean);
      
      // Determinar identificador (O.S., Placa, etc.) para fazer match
      const osColIdx = colunas.findIndex(c => /o\.?s/i.test(String(c || '')) || /\bos\b/i.test(String(c || '')));
      const placaColIdx = colunas.findIndex(c => /placa/i.test(String(c || '')));
      const idCol = osColIdx >= 0 ? colunas[osColIdx] : (placaColIdx >= 0 ? colunas[placaColIdx] : colunas[0]);

      // Dividir texto por páginas se multi-página
      const temPaginas = textoOCR.includes('--- PÁGINA ');
      const blocos = temPaginas 
        ? textoOCR.split(/--- PÁGINA \d+ DE \d+ ---/).filter((p: string) => p.trim())
        : [textoOCR];

      mostrarMensagem(`Extraindo MARCA/MODELO de ${blocos.length} bloco(s)...`, 'info');

      const todosRegistros: Array<Record<string, string>> = [];

      for (let b = 0; b < blocos.length; b++) {
        const blocoTexto = blocos[b].trim();
        if (!blocoTexto) continue;

        const prompt = `
Analise o texto abaixo extraído de um documento PDF.
Extraia TODOS os registros encontrados com os seguintes campos:
- "${idCol}" (identificador do registro)
${colunasAlvo.map(c => `- "${c}"`).join('\n')}

REGRAS:
- Retorne APENAS um array JSON válido
- Cada registro = 1 objeto no array
- Extraia ABSOLUTAMENTE TODOS os registros, não pule nenhum
- Se não encontrar o valor de MARCA/MODELO para um registro, use string vazia ""
- Mantenha o identificador (${idCol}) exatamente como aparece no documento

Texto:
${blocoTexto}

Retorne APENAS o array JSON:
`;

        if (GEMINI_API_KEY) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            const geminiResp = await fetch(
              geminiUrl,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
                }),
              }
            );

            if (geminiResp.ok) {
              const geminiData = await geminiResp.json();
              const textoResp = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const jsonMatch = textoResp.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                todosRegistros.push(...arr);
              }
            }
          } catch (err) {
            console.warn(`[MARCA/MODELO PDF] Erro no bloco ${b + 1}:`, err);
          }
        }
      }

      if (todosRegistros.length === 0) {
        mostrarMensagem('Nenhum registro de MARCA/MODELO encontrado no PDF', 'error');
        return;
      }

      console.log(`[MARCA/MODELO PDF] ${todosRegistros.length} registros extraídos do PDF`);

      // 3. Preencher nos dados existentes fazendo match pelo identificador
      const normalizar = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // força exibição da coluna de serviço despachante mesmo se estiver vazia
      const isServiceDespachante = (c: string) => normalizar(String(c || '')) === normalizar('SERVIÇO DESPACHANTE (HONORÁRIO)');
      
      let preenchidos = 0;
      setDadosExtraidos(prev => prev.map(row => {
        // Encontrar o valor do identificador nesta linha
        const idValue = String(row[idCol] || '').trim();
        if (!idValue) return row;
        const idNorm = normalizar(idValue);

        // Procurar match nos registros extraídos do PDF
        const match = todosRegistros.find(r => {
          const rId = String(r[idCol] || '').trim();
          return rId && normalizar(rId) === idNorm;
        });

        if (!match) return row;

        const newRow = { ...row } as any;
        let changed = false;

        if (marcaModeloColIdx >= 0) {
          const val = String(match[colunas[marcaModeloColIdx]] || '').trim();
          if (val) {
            newRow[colunas[marcaModeloColIdx]] = val;
            changed = true;
          }
        }
        if (marcaColIdx >= 0) {
          const colName = colunas[marcaColIdx];
          const val = String(match[colName] || '').trim();
          if (val) {
            newRow[colName] = val;
            changed = true;
          }
        }
        if (modeloColIdx >= 0) {
          const colName = colunas[modeloColIdx];
          const val = String(match[colName] || '').trim();
          if (val) {
            newRow[colName] = val;
            changed = true;
          }
        }

        if (changed) preenchidos++;
        return newRow;
      }));

      mostrarMensagem(`MARCA/MODELO preenchido em ${preenchidos} de ${dadosExtraidos.length} registros a partir do PDF`, 'success');

    } catch (err: any) {
      console.error('[MARCA/MODELO PDF] Erro:', err);
      mostrarMensagem('Erro ao processar PDF de MARCA/MODELO: ' + (err?.message || String(err)), 'error');
    } finally {
      setProcessandoMarcaModeloPdf(false);
    }
  };

  // Detectar se PDF tem 1 OS por folha ou múltiplos OSs por folha
  // Retorna array de textos (uma entrada por página se 1 OS/folha, ou texto completo se múltiplos/folha)
  const detectarTipoPdf = (textoOCR: string): { paginas: string[]; tipoDetectado: 'multi-por-folha' | '1-por-folha' } => {
    // Procurar separadores de página "--- PÁGINA X DE Y ---"
    const temPaginas = textoOCR.includes('--- PÁGINA ');
    
    if (!temPaginas) {
      // Sem marcadores de página: sempre retornar como um único documento
      return { paginas: [textoOCR], tipoDetectado: 'multi-por-folha' };
    }

    // Dividir por páginas
    const blocos = textoOCR.split(/--- PÁGINA \d+ DE \d+ ---/).filter((p: string) => p.trim());
    
    if (blocos.length <= 1) {
      return { paginas: [textoOCR], tipoDetectado: 'multi-por-folha' };
    }

    // Analisar padrão: contar OSs em cada página
    const contarOSPorPagina = (texto: string): number => {
      const linhas = texto.split('\n').map(l => l.trim());
      // Detectar linhas que parecem ser OSs (números isolados ou códigos alfanuméricos)
      // reconhecer linhas que contenham código de O.S. (com ou sem prefixo "O.S.")
      // exemplo: "O.S. Nº 99983 START" ou apenas "99983"
      const osRegex = /\bO\.?S\.?\s*(?:n[ºo°.]?\s*)?[:\-]?\s*\d{1,7}\b/i;
      // também contabilizar linhas que são somente dígitos de 3-7 caracteres, para captar casos sem "O.S."
      const osRegexFallback = /^\s*\d{3,7}\s*$/;
      let count = 0;
      linhas.forEach(l => {
        if ((osRegex.test(l) || osRegexFallback.test(l)) && l.length > 2) count++;
      });
      return count;
    };

    const paginaResumoSemOS = (texto: string): boolean => {
      const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
      if (linhas.length === 0) return true;
      const joined = linhas.join(' ');
      return /quantidade\s+de\s+o\.?s/i.test(joined) || /total\s+geral/i.test(joined);
    };

    const analisePaginas = blocos.map((texto, index) => {
      const osCount = contarOSPorPagina(texto);
      return {
        index,
        texto,
        osCount,
        ignorarComoResumo: osCount === 0 && paginaResumoSemOS(texto),
      };
    });
    
    // Aceitar PDFs que têm 1 O.S. por folha e uma última página de resumo sem O.S.
    const paginasValidas1OS = analisePaginas.filter(pagina => pagina.osCount === 1);
    const somentePaginas1OSOuResumo = analisePaginas.length > 0 && analisePaginas.every(
      pagina => pagina.osCount === 1 || pagina.ignorarComoResumo
    );
    
    if (somentePaginas1OSOuResumo && paginasValidas1OS.length > 0) {
      const paginasIgnoradas = analisePaginas.filter(pagina => pagina.ignorarComoResumo).length;
      console.log(
        `[detectarTipoPdf] Detectado PDF com 1 OS por folha (${paginasValidas1OS.length} páginas com O.S.` +
        `${paginasIgnoradas ? `, ${paginasIgnoradas} página(s) de resumo ignorada(s)` : ''})`
      );
      return { paginas: paginasValidas1OS.map(pagina => pagina.texto), tipoDetectado: '1-por-folha' };
    }

    // Senão: múltiplos OSs por folha — retornar texto completo
    console.log(`[detectarTipoPdf] Detectado PDF com múltiplos OSs por folha (${analisePaginas.map(pagina => pagina.osCount).join(', ')} OSs nas ${blocos.length} páginas)`);
    return { paginas: [textoOCR], tipoDetectado: 'multi-por-folha' };
  };

  // Extrair dados com suporte automático para 1 OS por folha
  const extrairDadosComSuporteFolhas = async (textoOCR: string, colunasModelo: string[]): Promise<DadosExtraidos[]> => {
    const { paginas, tipoDetectado } = detectarTipoPdf(textoOCR);
    console.log('[extrairDadosComSuporteFolhas] tipoDetectado=', tipoDetectado, 'paginas=', paginas.length);
    let todosRegistros: DadosExtraidos[] = [];

    if (tipoDetectado === '1-por-folha') {
      // Processar cada página separadamente
      for (let i = 0; i < paginas.length; i++) {
        console.log(`[extrairDados-1OS] Processando página ${i + 1}/${paginas.length}...`);
        try {
          let registrosPagina = await extrairDadosEstruturados(paginas[i], colunasModelo);
          registrosPagina = deduplicarRegistrosExtraidosPorIdentificador(
            sanitizarRegistrosExtraidos(preencherTotaisAusentesNasLinhas(registrosPagina)),
            colunasModelo
          );
          if (registrosPagina.length !== 1) {
            console.warn(
              `[extrairDados-1OS] página ${i + 1} retornou ${registrosPagina.length} registro(s); tentando fallback local por página`
            );
            const fallbackPagina = deduplicarRegistrosExtraidosPorIdentificador(
              sanitizarRegistrosExtraidos(
                preencherTotaisAusentesNasLinhas(extrairDadosLocal(paginas[i], colunasModelo))
              ),
              colunasModelo
            );
            if (fallbackPagina.length > 0) {
              registrosPagina = fallbackPagina;
            }
          }
          console.log(`[extrairDados-1OS] página ${i + 1} gerou ${registrosPagina.length} registros`);
          todosRegistros.push(...registrosPagina);
        } catch (err) {
          console.warn(`[extrairDados-1OS] Erro ao processar página ${i + 1}:`, err);
        }
      }
    } else {
      // Processar normalmente (múltiplos OSs por folha)
      try {
        todosRegistros = await extrairDadosEstruturados(textoOCR, colunasModelo);
        console.log('[extrairDados-multi] retornou', todosRegistros.length, 'registros');
      } catch (err) {
        console.warn('[extrairDados-multi] Erro ao processar:', err);
        throw err;
      }
    }

    todosRegistros = sanitizarRegistrosExtraidos(preencherTotaisAusentesNasLinhas(todosRegistros));
    if (tipoDetectado === '1-por-folha') {
      todosRegistros = deduplicarRegistrosExtraidosPorIdentificador(todosRegistros, colunasModelo);
    }
    console.log('[extrairDadosComSuporteFolhas] total registros obtidos:', todosRegistros.length);

    // validação de consistência: comparar número de registros com páginas
    // Inferir número de páginas mesmo se a detecção retornou apenas um bloco.
    let pageCount = paginas.length;
    if (pageCount === 1 && textoOCR.includes('--- PÁGINA ')) {
      const candidatePages = textoOCR.split(/--- PÁGINA \d+ DE \d+ ---/).filter((p: string) => p.trim());
      if (candidatePages.length) pageCount = candidatePages.length;
    }

    const recCount = todosRegistros.length;
    const precisaFallback =
      tipoDetectado === '1-por-folha'
        ? recCount !== pageCount
        : Math.abs(recCount - pageCount) > 1;
    if (precisaFallback) {
      console.warn(
        `[extrairDadosComSuporteFolhas] inconsistência: ${pageCount} páginas vs ${recCount} registros`);

      if (tipoDetectado === '1-por-folha') {
        mostrarMensagem(
          `Inconsistência detectada: PDF com ${pageCount} página(s) mas extraído(s) ${recCount} registro(s). ` +
          'Reprocessando como multi-por-folha para garantir que nenhuma entrada seja omitida...',
          'info'
        );

        try {
          const fallbackBase = sanitizarRegistrosExtraidos(
            preencherTotaisAusentesNasLinhas(await extrairDadosEstruturados(textoOCR, colunasModelo))
          );
          const fallback = deduplicarRegistrosExtraidosPorIdentificador(fallbackBase, colunasModelo);
          console.log(
            '[extrairDadosComSuporteFolhas] fallback multi-por-folha obteve',
            fallback.length,
            'registros'
          );
          if (fallback.length > recCount) {
            todosRegistros = fallback;
            mostrarMensagem(
              `Reprocessamento bem‑sucedido: agora ${todosRegistros.length} registros (antes eram ${recCount}).`,
              'success'
            );
          }
        } catch (err) {
          console.warn('[extrairDadosComSuporteFolhas] erro no fallback:', err);
        }
      } else {
        // tentativa extra: se o algoritmo classificou como multi, pode ainda haver
        // páginas distintas que valem a pena processar individualmente.
        mostrarMensagem(
          `Discrepância detectada: ${recCount} registros para ${pageCount} página(s). Tentando processar cada página separadamente...`,
          'info'
        );
        try {
          const candidatePages = textoOCR.split(/--- PÁGINA \d+ DE \d+ ---/).filter(p => p.trim());
          if (candidatePages.length > 1) {
            const perPage: DadosExtraidos[] = [];
            for (const p of candidatePages) {
              try {
                const pageRows = deduplicarRegistrosExtraidosPorIdentificador(
                  sanitizarRegistrosExtraidos(
                    preencherTotaisAusentesNasLinhas(await extrairDadosEstruturados(p, colunasModelo))
                  ),
                  colunasModelo
                );
                perPage.push(...pageRows);
              } catch (e) {
                console.warn('[extrairDadosComSuporteFolhas] erro no processamento por página fallback', e);
              }
            }
            if (perPage.length > recCount) {
              todosRegistros = perPage;
              mostrarMensagem(
                `Processamento página-a-página retornou ${perPage.length} registros (antes ${recCount}).`,
                'success'
              );
            }
          }
        } catch (e) {
          console.warn('[extrairDadosComSuporteFolhas] erro no fallback per-page:', e);
        }
      }

      // após possível fallback, nova validação
      if (Math.abs(todosRegistros.length - pageCount) > 1) {
        mostrarMensagem(
          `Ainda existe discrepância: ${todosRegistros.length} registros em ${pageCount} página(s). ` +
          'verifique o documento manualmente.',
          'error'
        );
      }
    }

    const registrosFinais = sanitizarRegistrosExtraidos(preencherTotaisAusentesNasLinhas(todosRegistros));
    return tipoDetectado === '1-por-folha'
      ? deduplicarRegistrosExtraidosPorIdentificador(registrosFinais, colunasModelo)
      : registrosFinais;
  };

  // Chamar API de OCR
  const chamarOCR = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/gemini-ocr', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || 'Erro no OCR');
    }
    const data = await response.json();
    return data.text || '';
  };

  // Extrair dados estruturados do texto OCR usando Gemini
  const extrairDadosEstruturados = async (textoOCR: string, colunasModelo: string[]): Promise<DadosExtraidos[]> => {
    console.log('[extrairDadosEstruturados] chamado com textoOCR length', textoOCR.length, 'colunasModelo', colunasModelo.length);
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      // Fallback: tentar extrair localmente
      return extrairDadosLocal(textoOCR, colunasModelo);
    }

    // ====== HELPER: normalizar chaves do Gemini para as colunas exatas do modelo ======
    const normalizarChavesParaModelo = (recs: DadosExtraidos[]): DadosExtraidos[] => {
      return recs.map(r => {
        const novo: DadosExtraidos = {};
        const usedCols = new Set<string>();
        // 1) match exato por normalizar
        Object.keys(r).forEach(k => {
          const kNorm = normalizar(k);
          const match = colunasModelo.find(c => normalizar(c) === kNorm && !usedCols.has(c));
          if (match) { novo[match] = r[k]; usedCols.add(match); }
        });
        // 2) fuzzy match para chaves restantes
        Object.keys(r).forEach(k => {
          if (colunasModelo.some(c => normalizar(c) === normalizar(k))) return; // já tratado
          let best = ''; let bestScore = 0;
          colunasModelo.forEach(col => {
            if (usedCols.has(col)) return;
            const colNorm = normalizar(col); const kNorm = normalizar(k);
            let score = 0;
            if (kNorm.includes(colNorm) || colNorm.includes(kNorm)) score = 80;
            else {
              const wK = kNorm.split(/[^a-z0-9]+/).filter(Boolean);
              const wC = colNorm.split(/[^a-z0-9]+/).filter(Boolean);
              const common = wK.filter(w => wC.includes(w));
              score = (common.length / Math.max(wK.length, wC.length, 1)) * 60;
            }
            if (score > bestScore) { bestScore = score; best = col; }
          });
          if (bestScore >= 50 && best) { novo[best] = r[k]; usedCols.add(best); }
          else { novo[k] = r[k]; } // preservar chaves especiais (O.S., MULTA, etc.)
        });
        // garantir que todas as colunas do modelo existam
        colunasModelo.forEach(col => { if (novo[col] === undefined) novo[col] = ''; });
        // especial: se alguma chave/valor contiver RETORNO VISTORIA SINALIZA, assinalar honorários
        const joined = Object.values(r).map(v => String(v || '').toUpperCase()).join(' ');
        if (joined.includes('RETORNO VISTORIA SINALIZA')) {
          const honCol = colunasModelo.find(c => /HONOR/i.test(c)) || 'SERVIÇO DESPACHANTE (HONORÁRIO)';
          novo[honCol] = 'RETORNO VISTORIA SINALIZA';
        }
        return novo;
      });
    };

    // ====== HELPER: reparar JSON truncado ======
    const repairJSON = (text: string): string => {
      let t = text.trim();
      if (t.startsWith('[') && !t.endsWith(']')) {
        // tentar fechar no último objeto completo
        const lastBrace = t.lastIndexOf('}');
        if (lastBrace > 0) t = t.substring(0, lastBrace + 1) + ']';
      }
      // remover trailing commas antes de ] ou }
      t = t.replace(/,\s*([\]\}])/g, '$1');
      return t;
    };

    // ====== HELPER: chamar Gemini para um bloco de texto ======
    const chamarGeminiExtracao = async (textoBloco: string): Promise<DadosExtraidos[]> => {
      const prompt = `
Analise o seguinte texto extraído de um documento e organize os dados em formato JSON.

COLUNAS OBRIGATÓRIAS (use EXATAMENTE estes nomes como chaves JSON, sem alterar):
${colunasModelo.map((c, i) => `  ${i + 1}. "${c}"`).join('\n')}

REGRAS:
- Retorne APENAS um array JSON válido, sem texto explicativo
- Cada objeto do array DEVE usar EXATAMENTE os nomes de coluna listados acima como chaves
- NÃO invente, NÃO renomeie, NÃO traduza os nomes das colunas
- Se um campo não for encontrado para algum registro, use string vazia ""
- Identifique TODOS os registros/linhas presentes no documento — NÃO omita nenhum
- Mantenha a formatação original dos dados (datas, valores monetários, placas, etc.)
- Se houver valores de multa, some todos relacionados à mesma O.S. e preencha a coluna MULTA

Texto do documento:
${textoBloco}

Retorne APENAS o array JSON:
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
          }),
        }
      );

      if (!response.ok) throw new Error('Erro na API Gemini');

      const data = await response.json();
      const textoResposta = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.debug('[extrairDados] Gemini response length:', textoResposta.length);

      // Extrair e reparar JSON
      let jsonText = '';
      const jsonMatch = textoResposta.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      } else {
        // tentar reparar se começa com [ mas sem fechar
        const startIdx = textoResposta.indexOf('[');
        if (startIdx >= 0) {
          jsonText = repairJSON(textoResposta.substring(startIdx));
          console.warn('[extrairDados] JSON truncado, tentando reparar');
        }
      }

      if (!jsonText) return [];

      try {
        const parsed = JSON.parse(jsonText);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (parseErr) {
        // tentar reparar e parsear novamente
        try {
          const repaired = repairJSON(jsonText);
          const parsed = JSON.parse(repaired);
          console.warn('[extrairDados] JSON reparado com sucesso');
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          console.error('[extrairDados] Falha ao parsear JSON mesmo após reparo');
          return [];
        }
      }
    };

    // ====== CHUNKING para textos grandes ======
    const MAX_CHUNK_CHARS = 12000;
    const linhasOCR = textoOCR.split('\n');
    // regex para identificar início de bloco de OS no texto de chunking
    const osChunkRegex = /\bO\.?S\.?\s*(?:n[ºo°.]?\s*)?[:\-]?\s*\d{1,7}\b/i; // considera prefixo O.S. e variantes como "O.S. Nº 12345"
    const osBlockIndices: number[] = [];
    linhasOCR.forEach((l, idx) => { if (osChunkRegex.test(l.trim())) osBlockIndices.push(idx); });
    console.log('[extrairDados] osBlockIndices length=', osBlockIndices.length, 'sample indices', osBlockIndices.slice(0,10));
    osBlockIndices.slice(0,10).forEach(i => console.log('[extrairDados] sample line', i, '=>', linhasOCR[i]));

    // Se texto grande E muitos blocos OS, dividir em chunks
    if (textoOCR.length > MAX_CHUNK_CHARS && osBlockIndices.length > 10) {
      console.log(`[extrairDados] Texto grande (${textoOCR.length} chars, ${osBlockIndices.length} OSes) — dividindo em chunks`);
      const CHUNK_OS = 8; // processar 8 OSes por vez
      let allRecords: DadosExtraidos[] = [];
      for (let c = 0; c < osBlockIndices.length; c += CHUNK_OS) {
        const startLine = osBlockIndices[c];
        const endLine = (c + CHUNK_OS < osBlockIndices.length) ? osBlockIndices[c + CHUNK_OS] : linhasOCR.length;
        const chunkText = linhasOCR.slice(startLine, endLine).join('\n');
        try {
          const chunkRecs = await chamarGeminiExtracao(chunkText);
          console.log(`[extrairDados] Chunk ${Math.floor(c / CHUNK_OS) + 1}: ${chunkRecs.length} registros`);
          allRecords.push(...chunkRecs);
        } catch (err) {
          console.warn(`[extrairDados] Chunk ${Math.floor(c / CHUNK_OS) + 1} falhou, usando fallback local`, err);
          allRecords.push(...extrairDadosLocal(chunkText, colunasModelo));
        }
      }
      // after chunking check if we likely missed some OSes
      const expected = osBlockIndices.length;
      if (expected > 0 && allRecords.length < expected) {
        console.warn('[extrairDados] número de registros menor que blocos OS esperados', allRecords.length, '<', expected);
        // tentar nova extração com todo o texto de uma vez como tentativa adicional
        try {
          const full = await chamarGeminiExtracao(textoOCR);
          console.log('[extrairDados] tentativa full-text retornou', full.length, 'registros');
          const seen = new Set<string>();
          allRecords.forEach(r => seen.add(JSON.stringify(r)));
          full.forEach(r => {
            const sig = JSON.stringify(r);
            if (!seen.has(sig)) { allRecords.push(r); seen.add(sig); }
          });
        } catch (err) {
          console.warn('[extrairDados] falha na tentativa full-text adicional', err);
        }
        // ainda insuficiente? tentar fallback local completo
        if (allRecords.length < expected) {
          console.warn('[extrairDados] ainda insuficiente após full-text, executando extrairDadosLocal completo');
          const local = extrairDadosLocal(textoOCR, colunasModelo);
          console.log('[extrairDados] extrairDadosLocal retornou', local.length, 'registros');
          const seen2 = new Set<string>(allRecords.map(r => JSON.stringify(r)));
          local.forEach(r => {
            const sig = JSON.stringify(r);
            if (!seen2.has(sig)) { allRecords.push(r); seen2.add(sig); }
          });
        }
      }
      // Normalizar colunas e retornar (multa detection no texto completo abaixo)
      allRecords = normalizarChavesParaModelo(allRecords);
      allRecords = allRecords.map(preencherTotalPreferencial);
      // O.S. e multa detection seguem abaixo — reusar lógica existente com allRecords
      return _aplicarOSEMultas(allRecords, textoOCR, colunasModelo);
    }

    try {
      const rawRecords = await chamarGeminiExtracao(textoOCR);
      if (rawRecords.length > 0) {
        // Normalizar chaves para colunas do modelo
        const records: DadosExtraidos[] = normalizarChavesParaModelo(rawRecords).map(preencherTotalPreferencial);

        // Se Gemini não retornou a chave 'O.S.' (ou equivalente), tentar extrair valores de O.S. do texto OCR
        // antigamente só buscávamos linhas compostas por dígitos, mas muitos recibos usam códigos alfanuméricos
        // (UE:RD-000100-..., DETRAN-/, etc). Vamos coletar qualquer linha isolada que pareça um código de OS.
        const osLineRegex = /^\s*([A-Za-z]{1,3}:[A-Za-z0-9\-\.]+|\d{3,7})\s*$/m;
        const lines = textoOCR.split('\n').map(l => l.trim());
        const osCandidates: string[] = [];
        lines.forEach(l => {
          const m = l.match(osLineRegex);
          if (m) osCandidates.push(m[1]);
        });

        const hasOSKey = (obj: any) => Object.keys(obj || {}).some(k => /(^|\b)(o\.?s|os|n\.?º|numero|n[oº]mero)\b/i.test(String(k)) && String(obj[k]).trim());
        const modelOsCol = (colunasModelo || []).find(c => /(^|\b)(o\.?s|os|n\.?º|numero|n[oº]mero)\b/i.test(c));

        if (osCandidates.length > 0) {
          // Mapear candidatos para registros: se número de candidatos == número de registros, atribuir por índice;
          // senão, atribuir o primeiro candidato ao primeiro registro (fallback) e distribuir os demais sequencialmente quando possível.
          if (records.length === osCandidates.length) {
            records.forEach((r, idx) => {
              if (!hasOSKey(r) || !String(r['O.S.'] || r['OS'] || r['os'] || (modelOsCol ? r[modelOsCol] : '')).trim()) {
                r['O.S.'] = osCandidates[idx];
                if (modelOsCol) r[modelOsCol] = osCandidates[idx];
              }
            });
          } else if (records.length === 1) {
            const r = records[0];
            if (!hasOSKey(r)) {
              r['O.S.'] = osCandidates[0];
              if (modelOsCol) r[modelOsCol] = osCandidates[0];
            }
          } else {
            // distribuir sequencialmente até onde houver candidatos
            for (let i = 0; i < Math.min(records.length, osCandidates.length); i++) {
              const r = records[i];
              if (!hasOSKey(r)) {
                r['O.S.'] = osCandidates[i];
                if (modelOsCol) r[modelOsCol] = osCandidates[i];
              }
            }
          }
        }

        // depois de mapear O.S., calcular mapas de multas por O.S. a partir do texto OCR e preencher os registros
        const multasMap: Record<string, { sum: number; tokens: string[] }> = {};
        const multasMapRaw: Record<string, string> = {}; // store raw key for logging
        {
          const linesFull = textoOCR.split('\n').map(l => l.trim());
          const ufMultaToken = /UF:[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/i; // formato estadual: UF:SP-126200-1AA4649283-5002
          const osLineRegex2 = /^\s*([A-Za-z]{1,10}[:\-]?[A-Za-z0-9\-\.]{3,}|\d{3,7})\s*$/;
          const osHeaderPat2 = /o\.?\s*s\.?\s*n[ºo°]?\.?\s*(\d{3,7})/i; // O.S.Nº107804, O S Nº 107804, etc.
          const numeroPat2 = /\bnumero[^0-9]{0,6}(\d{3,7})\b/i;          // Numero...: 107804
          const osIdxs: number[] = [];
          const osVals2: Record<number, string> = {};
          linesFull.forEach((l, idx) => {
            if (ufMultaToken.test(l)) return;
            const hm = l.match(osHeaderPat2);
            if (hm) { osIdxs.push(idx); osVals2[idx] = hm[1]; return; }
            const nm = l.match(numeroPat2);
            if (nm) { osIdxs.push(idx); osVals2[idx] = nm[1]; return; }
            if (osLineRegex2.test(l)) { osIdxs.push(idx); osVals2[idx] = l.trim(); }
          });
          const getOsVal2 = (idx: number) => osVals2[idx] !== undefined ? osVals2[idx] : linesFull[idx].trim();

          const detranLikeToken = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+){2,}\b/; // tokens com pelo menos 2 hífens
          const currencyValue = /[0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2}/; // valor monetário com 2 casas decimais
          const multaExplicit = /multa\s*[:\.\-]*\s*([0-9\.\,]+)/i;

          const findNearestOs = (idx: number) => {
            // preferir O.S. anterior; se não houver, próxima
            const before = osIdxs.filter(x => x <= idx);
            if (before.length) return before[before.length - 1];
            const after = osIdxs.find(x => x > idx);
            return after !== undefined ? after : null;
          };

          for (let i = 0; i < linesFull.length; i++) {
            const line = linesFull[i];
            if (!line) continue;

            // 1) ocorrência explícita 'multa: 123,45'
            const m = line.match(multaExplicit);
            if (m) {
              const val = parseBrazilianNumberFlexible(m[1]);
              const osIdx = findNearestOs(i);
              if (osIdx !== null) {
                const osVal = getOsVal2(osIdx);
                const osKey = normalizar(osVal);
                multasMap[osKey] = multasMap[osKey] || { sum: 0, tokens: [] };
                if (val !== null) {
                  multasMap[osKey].sum += val;
                  console.debug(`[Multas-ByOS] associado 'multa' linha ${i} a OS ${osVal} => ${val}`);
                }
                multasMapRaw[osKey] = osVal;
              } else {
                console.debug(`[Multas-ByOS] encontrou 'multa' sem O.S. próxima na linha ${i}:`, m[0]);
              }
              continue;
            }

            // 2a) token estadual UF:XX-... — extrair valor apenas de após o token para evitar confundir com partes do código
            if (ufMultaToken.test(line)) {
              const tokenMatch = line.match(ufMultaToken);
              const token = tokenMatch ? tokenMatch[0] : '';
              const afterToken = token ? line.slice(line.indexOf(token) + token.length) : '';
              let val: number | null = null;
              const afterMatch = afterToken.match(currencyValue);
              if (afterMatch) val = parseBrazilianNumberFlexible(afterMatch[0]);
              if (val === null) {
                for (let k = 1; k <= 2; k++) {
                  const next = linesFull[i + k];
                  if (!next || ufMultaToken.test(next)) continue;
                  const nextMatch = next.match(currencyValue);
                  if (nextMatch) { val = parseBrazilianNumberFlexible(nextMatch[0]); if (val !== null) break; }
                }
              }
              const osIdx = findNearestOs(i);
              if (osIdx !== null) {
                const osVal = getOsVal2(osIdx);
                const osKey = normalizar(osVal);
                multasMap[osKey] = multasMap[osKey] || { sum: 0, tokens: [] };
                if (val !== null) {
                  multasMap[osKey].sum += val;
                  console.debug(`[Multas-ByOS] UF token '${token}' => OS ${osVal}, valor ${val}`);
                } else {
                  multasMap[osKey].tokens.push(token);
                  console.debug(`[Multas-ByOS] UF token '${token}' => OS ${osVal}, sem valor`);
                }
                multasMapRaw[osKey] = osVal;
              }
              continue;
            }

            // 2b) token DETRAN/UF:... — tentar extrair número na própria linha ou nas próximas 2 linhas
            if (detranLikeToken.test(line)) {
              const tokenMatch = line.match(detranLikeToken);
              const token = tokenMatch ? tokenMatch[0] : null;
              // procurar números na mesma linha
              let nums = (line.match(/[0-9\.\,]+/g) || []).map(s => s.trim()).filter(Boolean);
              let val: number | null = null;
              if (nums.length > 0) {
                val = parseBrazilianNumberFlexible(nums[nums.length - 1]);
              }

              // se não encontrou número na própria linha, olhar nas 2 próximas linhas
              if (val === null) {
                for (let k = 1; k <= 2; k++) {
                  const next = linesFull[i + k];
                  if (!next) continue;
                  const found = (next.match(/[0-9\.\,]+/g) || []).map(s => s.trim()).filter(Boolean);
                  if (found.length > 0) {
                    const candidate = found[found.length - 1];
                    const parsed = parseBrazilianNumberFlexible(candidate);
                    if (parsed !== null) {
                      val = parsed;
                      console.debug(`[Multas-ByOS] token '${token}' linha ${i} pegou valor na linha ${i + k}: ${candidate} => ${parsed}`);
                      break;
                    }
                  }
                }
              }

              // associar ao O.S. mais próximo
              const osIdx = findNearestOs(i);
              if (osIdx !== null) {
                const osVal = getOsVal2(osIdx);
                const osKey = normalizar(osVal);
                multasMap[osKey] = multasMap[osKey] || { sum: 0, tokens: [] };
                if (val !== null) {
                  multasMap[osKey].sum += val;
                  console.debug(`[Multas-ByOS] OS ${osVal} - token '${token}' associado com valor ${val}`);
                } else if (token) {
                  multasMap[osKey].tokens.push(token);
                  console.debug(`[Multas-ByOS] OS ${osVal} - token '${token}' associado sem valor`);
                }
                multasMapRaw[osKey] = osVal;
              } else {
                console.debug(`[Multas-ByOS] token DETRAN sem O.S. próxima na linha ${i}: '${token}'`);
              }
            }
          }
        }
        console.debug('[Multas-ByOS] mapa final de multas por OS (normalized keys):', multasMap, 'raw keys:', multasMapRaw);
        // aplicar ao retorno — usar correspondência tolerante quando necessário
        records.forEach(r => {
          const osVal = String(r['O.S.'] || r['OS'] || r['os'] || (modelOsCol ? r[modelOsCol] : '') || '');
          const osKey = normalizar(osVal);
          let applied = false;
          let appliedEntry: { sum: number; tokens: string[] } | null = null;

          // 1) match exato
          if (osKey && multasMap[osKey] !== undefined) {
            applied = true;
            appliedEntry = multasMap[osKey] as any;
          }

          // 2) tentar casar por sequência de dígitos (útil quando OCR troca formatação)
          if (!applied && osVal) {
            const osDigits = (String(osVal).match(/\d{3,}/g) || []).join('');
            if (osDigits) {
              for (const k of Object.keys(multasMap)) {
                const raw = String(multasMapRaw[k] || '');
                const rawDigits = (raw.match(/\d{3,}/g) || []).join('');
                if (rawDigits && (rawDigits.includes(osDigits) || osDigits.includes(rawDigits))) {
                  applied = true;
                  appliedEntry = multasMap[k] as any;
                  console.debug(`[Multas-ByOS] correspondência por dígitos: OS ${osVal} casou com raw '${raw}'`);
                  break;
                }
              }
            }
          }

          // 3) tentar substring / contains na chave normalizada
          if (!applied && osKey) {
            for (const k of Object.keys(multasMap)) {
              if (k && (k.includes(osKey) || osKey.includes(k))) {
                applied = true;
                appliedEntry = multasMap[k] as any;
                console.debug(`[Multas-ByOS] correspondência por substring: OS ${osVal} casou com key '${k}'`);
                break;
              }
            }
          }

          // aplicar resultado sem sobrescrever MULTA já existente (preservar extrações locais)
          if (applied && appliedEntry) {
            if (!r['MULTA']) {
              if (appliedEntry.sum && appliedEntry.sum > 0) {
                const val = appliedEntry.sum;
                r['MULTA'] = `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                console.debug(`[Multas-ByOS] aplicado MULTA (sum) para OS ${osVal} => R$ ${val.toFixed(2)}`);
              } else if (appliedEntry.tokens && appliedEntry.tokens.length > 0) {
                r['MULTA'] = appliedEntry.tokens.join('; ');
                console.debug(`[Multas-ByOS] aplicado MULTA (tokens) para OS ${osVal} =>`, appliedEntry.tokens);
              }
            }
            r['MULTA_PRESENT'] = 'SIM';
          } else {
            // marcar explicitamente ausência de multa para controle
            r['MULTA_PRESENT'] = r['MULTA_PRESENT'] || 'NÃO';
            if (osVal) console.debug(`[Multas-ByOS] nenhuma multa encontrada para OS ${osVal} (key ${osKey})`);
          }
        });

        return records;
      }
      
      return extrairDadosLocal(textoOCR, colunasModelo);
    } catch (err) {
      console.warn('Erro na extração com Gemini, usando fallback local:', err);
      return extrairDadosLocal(textoOCR, colunasModelo);
    }
  };

  // Helper: aplicar detecção de O.S. e multas nos registros (usado por chunking e fluxo normal)
  const _aplicarOSEMultas = (records: DadosExtraidos[], textoOCR: string, colunasModelo: string[]): DadosExtraidos[] => {
    const modelOsCol = (colunasModelo || []).find(c => /(^|\b)(o\.?s|os|n\.?º|numero|n[oº]mero)\b/i.test(c));
    const hasOSKey = (obj: any) => Object.keys(obj || {}).some(k => /(^|\b)(o\.?s|os|n\.?º|numero|n[oº]mero)\b/i.test(String(k)) && String(obj[k]).trim());
    const hasMeaningfulRowContent = (obj: any) => Object.entries(obj || {}).some(([key, value]) => {
      const text = String(value || '').trim();
      if (!text) return false;
      const normalizedKey = normalizar(String(key || ''));
      if (normalizedKey === 'total' || normalizedKey === 'multapresent') return false;
      if (totalDoItensRegex.test(String(key || ''))) return false;
      if (normalizedKey.startsWith('override')) return false;
      return true;
    });

    // --- detecção de O.S. ---
    const osLineRegex = /^\s*([A-Za-z]{1,3}:[A-Za-z0-9\-\.]+|\d{3,7})\s*$/m;
    const linesAll = textoOCR.split('\n').map(l => l.trim());
    const osCandidates: string[] = [];
    linesAll.forEach(l => { const m = l.match(osLineRegex); if (m) osCandidates.push(m[1]); });

    if (osCandidates.length > 0 && records.length > 0) {
      if (records.length === osCandidates.length) {
        records.forEach((r, idx) => {
          if (!hasOSKey(r)) { r['O.S.'] = osCandidates[idx]; if (modelOsCol) r[modelOsCol] = osCandidates[idx]; }
        });
      } else {
        for (let i = 0; i < Math.min(records.length, osCandidates.length); i++) {
          if (!hasOSKey(records[i])) { records[i]['O.S.'] = osCandidates[i]; if (modelOsCol) records[i][modelOsCol] = osCandidates[i]; }
        }
      }
    }

    const totaisPorOS: Record<string, string> = {};
    const totaisEmOrdem: string[] = [];
    {
      const linesFull = textoOCR.split('\n').map(l => String(l || '').trim());
      const osHeaderRegex = /o\.?\s*s\.?\s*n[ºo]\s*(\d{3,7})/i;
      const numeroRegex = /^numero[^\d]*(\d{3,7})\s*$/i;
      const blockStarts: number[] = [];

      linesFull.forEach((line, idx) => {
        if (osHeaderRegex.test(line)) blockStarts.push(idx);
      });

      for (let i = 0; i < blockStarts.length; i++) {
        const start = blockStarts[i];
        const end = i + 1 < blockStarts.length ? blockStarts[i + 1] : linesFull.length;
        const block = linesFull.slice(start, end);
        const osHeaderMatch = String(block[0] || '').match(osHeaderRegex);
        const numeroLine = block.find(line => numeroRegex.test(line));
        const numeroMatch = numeroLine ? numeroLine.match(numeroRegex) : null;
        const osValue = osHeaderMatch?.[1] || numeroMatch?.[1] || '';
        const totalDoItens = extrairTotalDoItensDoBloco(block);

        if (osValue && totalDoItens) {
          totaisPorOS[normalizar(osValue)] = totalDoItens;
        }
        if (totalDoItens) {
          totaisEmOrdem.push(totalDoItens);
        }
      }
    }

    // --- detecção de multas ---
    const multasMap: Record<string, { sum: number; tokens: string[] }> = {};
    const multasMapRaw: Record<string, string> = {};
    {
      const linesFull = textoOCR.split('\n').map(l => l.trim());
      const ufMultaToken = /UF:[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/i;
      const currencyValue = /[0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2}/;
      const osLineRegex2 = /^\s*([A-Za-z]{1,10}[:\-]?[A-Za-z0-9\-\.]{3,}|\d{3,7})\s*$/;
      // detecta "O.S.Nº107804", "O S Nº 107804", etc. e captura só o número
      const osHeaderPat = /o\.?\s*s\.?\s*n[ºo°]?\.?\s*(\d{3,7})/i;
      // detecta "Numero...: 107804" e captura o número
      const numeroPat = /\bnumero[^0-9]{0,6}(\d{3,7})\b/i;
      const osIdxs: number[] = [];
      const osValues: Record<number, string> = {}; // idx → valor de OS extraído
      linesFull.forEach((l, idx) => {
        if (ufMultaToken.test(l)) return;
        const hm = l.match(osHeaderPat);
        if (hm) { osIdxs.push(idx); osValues[idx] = hm[1]; return; }
        const nm = l.match(numeroPat);
        if (nm) { osIdxs.push(idx); osValues[idx] = nm[1]; return; }
        if (osLineRegex2.test(l)) { osIdxs.push(idx); osValues[idx] = l.trim(); }
      });
      const getOsVal = (idx: number) => osValues[idx] !== undefined ? osValues[idx] : linesFull[idx].trim();
      const detranLikeToken = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+){2,}\b/;
      const multaExplicit = /multa\s*[:\.\-]*\s*([0-9\.\,]+)/i;
      const findNearestOs = (idx: number) => {
        const before = osIdxs.filter(x => x <= idx);
        if (before.length) return before[before.length - 1];
        return osIdxs.find(x => x > idx) ?? null;
      };
      for (let i = 0; i < linesFull.length; i++) {
        const line = linesFull[i]; if (!line) continue;
        const m = line.match(multaExplicit);
        if (m) {
          const val = parseBrazilianNumberFlexible(m[1]);
          const osIdx = findNearestOs(i);
          if (osIdx !== null) {
            const osVal = getOsVal(osIdx); const osKey = normalizar(osVal);
            multasMap[osKey] = multasMap[osKey] || { sum: 0, tokens: [] };
            if (val !== null) multasMap[osKey].sum += val;
            multasMapRaw[osKey] = osVal;
          }
          continue;
        }
        if (ufMultaToken.test(line)) {
          const tokenMatch = line.match(ufMultaToken); const token = tokenMatch ? tokenMatch[0] : '';
          const afterToken = token ? line.slice(line.indexOf(token) + token.length) : '';
          let val: number | null = null;
          const afterMatch = afterToken.match(currencyValue);
          if (afterMatch) val = parseBrazilianNumberFlexible(afterMatch[0]);
          if (val === null) for (let k = 1; k <= 2; k++) {
            const next = linesFull[i + k]; if (!next || ufMultaToken.test(next)) continue;
            const nextMatch = next.match(currencyValue);
            if (nextMatch) { val = parseBrazilianNumberFlexible(nextMatch[0]); if (val !== null) break; }
          }
          const osIdx2 = findNearestOs(i);
          if (osIdx2 !== null) {
            const osVal2 = getOsVal(osIdx2); const osKey2 = normalizar(osVal2);
            multasMap[osKey2] = multasMap[osKey2] || { sum: 0, tokens: [] };
            if (val !== null) multasMap[osKey2].sum += val;
            else if (token) multasMap[osKey2].tokens.push(token);
            multasMapRaw[osKey2] = osVal2;
          }
          continue;
        }
        if (detranLikeToken.test(line)) {
          const tokenMatch = line.match(detranLikeToken); const token = tokenMatch ? tokenMatch[0] : null;
          let nums = (line.match(/[0-9\.\,]+/g) || []).map(s => s.trim()).filter(Boolean);
          let val: number | null = nums.length > 0 ? parseBrazilianNumberFlexible(nums[nums.length - 1]) : null;
          if (val === null) for (let k = 1; k <= 2; k++) {
            const next = linesFull[i + k]; if (!next) continue;
            const found = (next.match(/[0-9\.\,]+/g) || []).map(s => s.trim()).filter(Boolean);
            if (found.length > 0) { val = parseBrazilianNumberFlexible(found[found.length - 1]); if (val !== null) break; }
          }
          const osIdx = findNearestOs(i);
          if (osIdx !== null) {
            const osVal = getOsVal(osIdx); const osKey = normalizar(osVal);
            multasMap[osKey] = multasMap[osKey] || { sum: 0, tokens: [] };
            if (val !== null) multasMap[osKey].sum += val;
            else if (token) multasMap[osKey].tokens.push(token);
            multasMapRaw[osKey] = osVal;
          }
        }
      }
    }
    // aplicar multas
    let meaningfulIndex = -1;
    records.forEach((r) => {
      const meaningfulRow = hasMeaningfulRowContent(r);
      if (meaningfulRow) meaningfulIndex += 1;

      let osVal = String(r['O.S.'] || r['OS'] || r['os'] || r[modelOsCol!] || '');
      if (!osVal && meaningfulRow && osCandidates[meaningfulIndex] && !hasOSKey(r)) {
        osVal = osCandidates[meaningfulIndex];
        r['O.S.'] = osVal;
        if (modelOsCol) r[modelOsCol] = osVal;
      }

      const osKey = normalizar(osVal);
      const totalAtual = getPreferredTotalValueFromSource(r);
      if (!totalAtual && osVal) {
        let totalPorOS = totaisPorOS[osKey];
        if (!totalPorOS) {
          const dig = (String(osVal).match(/\d{3,}/g) || []).join('');
          if (dig) {
            for (const key of Object.keys(totaisPorOS)) {
              const keyDigits = (key.match(/\d{3,}/g) || []).join('');
              if (keyDigits && (keyDigits.includes(dig) || dig.includes(keyDigits))) {
                totalPorOS = totaisPorOS[key];
                break;
              }
            }
          }
        }
        if (totalPorOS) {
          r['TOTAL DO ITENS'] = r['TOTAL DO ITENS'] || totalPorOS;
          r['TOTAL'] = totalPorOS;
        }
      }

      if (!getPreferredTotalValueFromSource(r) && meaningfulRow && meaningfulIndex >= 0 && totaisEmOrdem[meaningfulIndex]) {
        r['TOTAL DO ITENS'] = r['TOTAL DO ITENS'] || totaisEmOrdem[meaningfulIndex];
        r['TOTAL'] = totaisEmOrdem[meaningfulIndex];
      }

      let applied = false; let appliedEntry: { sum: number; tokens: string[] } | null = null;
      if (osKey && multasMap[osKey]) { applied = true; appliedEntry = multasMap[osKey]; }
      if (!applied && osVal) {
        const dig = (String(osVal).match(/\d{3,}/g) || []).join('');
        if (dig) for (const k of Object.keys(multasMap)) {
          const raw = String(multasMapRaw[k] || ''); const rd = (raw.match(/\d{3,}/g) || []).join('');
          if (rd && (rd.includes(dig) || dig.includes(rd))) { applied = true; appliedEntry = multasMap[k]; break; }
        }
      }
      if (!applied && osKey) for (const k of Object.keys(multasMap)) {
        if (k && (k.includes(osKey) || osKey.includes(k))) { applied = true; appliedEntry = multasMap[k]; break; }
      }
      if (applied && appliedEntry) {
        if (!r['MULTA']) {
          if (appliedEntry.sum > 0) r['MULTA'] = `R$ ${appliedEntry.sum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          else if (appliedEntry.tokens.length > 0) r['MULTA'] = appliedEntry.tokens.join('; ');
        }
        r['MULTA_PRESENT'] = 'SIM';
      } else {
        r['MULTA_PRESENT'] = r['MULTA_PRESENT'] || 'NÃO';
      }
    });
    return records;
  };

  // Extração local (fallback)
  const extrairDadosLocal = (texto: string, colunas: string[]): DadosExtraidos[] => {
    const linhas = texto.split('\n').map(l => l.replace(/\t/g, '    ')).filter(l => l.trim());
    const dados: DadosExtraidos[] = [];
    const firstColName = (colunas && colunas.length) ? colunas[0] : null; // nome da primeira coluna do modelo (ex.: 'O.S.') — vamos preencher com o número do topo

    // PRIMEIRO: tentar detectar blocos no estilo do documento (cabeçalho O.S. seguido de campos)
    // Ex.: uma linha com apenas dígitos OU códigos alfanuméricos como "UE:RD-000100-..." seguida por linhas com 'Data', 'Placa', 'Proprietário',
    // 'Serviço', 'Descrição', 'Vlr. Bruto', etc.
    const ufMultaTokenLocal = /UF:[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/i;
    const currencyValueLocal = /[0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2}/;
    const osLineRegex = /^\s*([A-Za-z]{1,3}:[A-Za-z0-9\-\.]+|\d{3,7})\s*$/;
    const osHeaderPatLocal = /o\.?\s*s\.?\s*n[ºo°]?\.?\s*(\d{3,7})/i;
    const numeroPatLocal = /\bnumero[^0-9]{0,6}(\d{3,7})\b/i;
    const isOsLine = (l: string) => (osLineRegex.test(l) || osHeaderPatLocal.test(l) || numeroPatLocal.test(l)) && !ufMultaTokenLocal.test(l);
    const extractOsNum = (l: string): string => {
      const hm = l.match(osHeaderPatLocal); if (hm) return hm[1];
      const nm = l.match(numeroPatLocal); if (nm) return nm[1];
      return l.trim();
    };
    const hasOsLike = linhas.some(isOsLine);
    const hasKeyFields = linhas.some(l => /placa|proprietari|servi[cç]o|descri\w+|vlr\.?\s*(bruto|liquido|a receber)/i.test(l));

    if (hasOsLike && hasKeyFields) {
      // localizar índices de linhas que parecem ser O.S. (excluir multas UF)
      const indices: number[] = [];
      linhas.forEach((l, idx) => { if (isOsLine(l)) indices.push(idx); });
      if (indices.length > 0) {
        for (let b = 0; b < indices.length; b++) {
          const start = indices[b];
          const end = (b + 1 < indices.length) ? indices[b + 1] : linhas.length;
          const block = linhas.slice(start, end);
          const obj: DadosExtraidos = {} as any;

          // O.S. — extrair número mesmo de linhas como "O S.Nº107804 CAMILA BARBOSA"
          const osNum = extractOsNum(block[0]);
          obj['O.S.'] = osNum;
          if (firstColName) obj[firstColName] = osNum;

          // percorrer o bloco em busca de chaves/valores
          let descricaoLines: string[] = [];
          let multaTotal = 0;
          const multaTokens: string[] = [];
          for (let i = 1; i < block.length; i++) {
            const line = block[i].trim();

            // 1) procurar valor de multa e acumular
            const mMulta = line.match(/multa\s*[:\.\-]*\s*([0-9\.\,]+)/i);
            if (mMulta) {
              const num = parseBrazilianNumberFlexible(mMulta[1]);
              console.debug(`[extrairDadosLocal] encontrou 'multa' no bloco OS ${osNum} linha ${i}: '${mMulta[0]}', parse =>`, num);
              if (num !== null) multaTotal += num;
              continue;
            }

            // 2a) token estadual UF:XX-... — extrair valor só de após o token
            if (ufMultaTokenLocal.test(line)) {
              const ufMatch = line.match(ufMultaTokenLocal);
              const ufToken = ufMatch ? ufMatch[0] : '';
              const afterUf = ufToken ? line.slice(line.indexOf(ufToken) + ufToken.length) : '';
              let ufVal: number | null = null;
              const afterCurr = afterUf.match(currencyValueLocal);
              if (afterCurr) ufVal = parseBrazilianNumberFlexible(afterCurr[0]);
              // se não tem valor na mesma linha, olhar próxima linha não-UF
              if (ufVal === null && i + 1 < block.length) {
                const nextLine = block[i + 1].trim();
                if (!ufMultaTokenLocal.test(nextLine)) {
                  const nextCurr = nextLine.match(currencyValueLocal);
                  if (nextCurr) ufVal = parseBrazilianNumberFlexible(nextCurr[0]);
                }
              }
              if (ufVal !== null) {
                multaTotal += ufVal;
                console.debug(`[extrairDadosLocal] UF token no bloco OS ${osNum}: '${ufToken}', valor =>`, ufVal);
              } else {
                multaTokens.push(ufToken);
              }
              continue;
            }

            // 2b) detectar tokens estilo DETRAN/UF:... e coletar como token de controle quando não há valor explícito
            const detranLikeToken = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+){2,}\b/;
            if (detranLikeToken.test(line)) {
              const t = (line.match(detranLikeToken) || [])[0];
              if (t) {
                const nums = (line.match(/[0-9\.\,]+/g) || []).map(s => s.trim()).filter(Boolean);
                if (nums.length > 0) {
                  const candidate = nums[nums.length - 1];
                  const n = parseBrazilianNumberFlexible(candidate);
                  console.debug(`[extrairDadosLocal] token DETRAN no bloco OS ${osNum} linha ${i}: '${line}', candidato =>`, candidate, 'parse =>', n);
                  if (n !== null) {
                    multaTotal += n;
                  } else {
                    multaTokens.push(t);
                  }
                } else {
                  multaTokens.push(t);
                }
              }
              continue;
            }

            // Placa
            const mPlaca = line.match(/placa\s*[:\.\-]*\s*(.+)$/i);
            if (mPlaca) {
              const candidates = mPlaca[1].split(/\s+/).map(s => s.trim()).filter(Boolean);
              const found = candidates.find(c => isLikelyPlate(c));
              obj['Placa'] = (found || candidates[0] || '').replace(/[^A-Za-z0-9-]/g, '');
              continue;
            }

            // Proprietário / Proprietario / Proprietário.:
            const mProp = line.match(/proprietari(?:o|a)\s*[:\.\-]*\s*(.+)$/i);
            if (mProp) { obj['Proprietário'] = mProp[1].trim(); continue; }

            // Data
            const mData = line.match(/(^|\b)data\b\s*[:\.\-]*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{2}\/\d{2}\/\d{4})/i);
            if (mData) { obj['Data'] = mData[2].trim(); continue; }

            // Serviço / Serviço......:
            const mServico = line.match(/servi[cç]o\s*[:\.\-]*\s*(.+)$/i);
            if (mServico) { obj['Serviço'] = mServico[1].trim(); continue; }

            // RETORNO VISTORIA SINALIZA deve ir para coluna de honorários
            if (line.toUpperCase().includes('RETORNO VISTORIA SINALIZA')) {
              obj['SERVIÇO DESPACHANTE (HONORÁRIO)'] = 'RETORNO VISTORIA SINALIZA';
              continue;
            }

            // Descrição (comes after a 'Descrição' header or inlined)
            if (/descri\w+/i.test(line) && !/descri\w+\s*dos\s+itens/i.test(line)) {
              const parts = line.split(/[:\.\-]{1,}/);
              if (parts.length > 1) descricaoLines.push(parts.slice(1).join(':').trim());
              continue;
            }
            if (/descri\w+\s+dos\s+itens/i.test(line)) {
              continue;
            }

            // Valores: Vlr. Bruto, Vlr. Recebido, Vlr. A Receber, Vlr. Liquido
            const mVlr = line.match(/(vlr\.?\s*(bruto|recebido|a\s*receber|liquido))\s*[:\.\-]*\s*([0-9\.\,\s]+)/i);
            if (mVlr) {
              const key = (`Vlr. ${mVlr[2]}`).replace(/\s+/g, ' ').trim();
              obj[key] = (mVlr[3] || '').trim();
              continue;
            }

            // Linhas que parecem ser descrição de item (maiúsculas, palavras longas) — coletar
            if (/^[A-Z0-9\s\-\/]{3,}$/.test(line) && !/^(PLACA|DATA|PROPRIETARI|PROPRIETÁRIO|SERVIÇO|DESCRIÇÃO|VLR\.|Vlr\.)/i.test(line)) {
              descricaoLines.push(line);
              continue;
            }

            // fallback: procurar pares 'Chave.....: Valor' genéricos
            const kv = line.match(/^([A-Za-z\s\.\-]{3,30})\s*[:\.\-]+\s*(.+)$/);
            if (kv) {
              const k = kv[1].trim();
              const v = kv[2].trim();
              obj[k] = v;
              continue;
            }
          }

          if (descricaoLines.length > 0) obj['Descrição'] = descricaoLines.join(' | ');

          const totalDoItens = extrairTotalDoItensDoBloco(block);
          if (totalDoItens) {
            obj['TOTAL DO ITENS'] = totalDoItens;
            obj['TOTAL'] = totalDoItens;
          }

          // se coletamos multas no bloco, gravar na propriedade MULTA (formato numérico com duas casas) ou tokens quando não houver valor
          if (multaTotal && multaTotal > 0) {
            console.debug(`[extrairDadosLocal] bloco OS ${osNum} multaTotal =`, multaTotal);
            obj['MULTA'] = `R$ ${multaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            console.debug(`[extrairDadosLocal] atribuiu obj['MULTA'] =`, obj['MULTA']);
          } else if (multaTokens.length > 0) {
            obj['MULTA'] = multaTokens.join('; ');
            console.debug(`[extrairDadosLocal] atribuiu obj['MULTA'] (tokens) =`, obj['MULTA']);
          }

          // Se encontramos ao menos uma chave relevante, considerar o bloco como registro válido
          const hasUseful = Object.keys(obj).some(k => /O\.S\.|Placa|Proprietári|Servi|Descrição|Vlr\.|MULTA/i.test(k));
          if (hasUseful) dados.push(obj);
        }
      }
    }

    // Se não foi possível detectar blocos do tipo O.S., tentar detectar tabela markdown
    const linhasComPipe = linhas.filter(l => l.includes('|'));
    if (dados.length === 0 && linhasComPipe.length > 1) {
      const headers = linhasComPipe[0].split('|').map(h => h.trim()).filter(Boolean);
      for (let i = 1; i < linhasComPipe.length; i++) {
        if (linhasComPipe[i].includes('---')) continue;
        const valores = linhasComPipe[i].split('|').map(v => v.trim()).filter(() => true);
        const obj: DadosExtraidos = {};
        colunas.forEach((col, idx) => {
          // só preenche quando o nome da coluna bater exatamente com o header
          const headerIdx = headers.findIndex(h => normalizar(h) === normalizar(col));
          obj[col] = headerIdx >= 0 ? (valores[headerIdx] || '') : '';
        });
        dados.push(obj);
      }
    }

    // Se não encontrou tabela nem blocos O.S., criar um registro com o texto completo na primeira coluna
    if (dados.length === 0 && colunas.length > 0) {
      const obj: DadosExtraidos = {};
      // tentar extrair um número de O.S. do texto geral (fallback)
      const osFallback = (texto.match(/\b(\d{3,7})\b/ ) || [null, null])[1];
      colunas.forEach((col, idx) => {
        if (idx === 0) {
          // se encontramos número plausível, coloque apenas o número na primeira coluna;
          // caso contrário, manter o comportamento antigo (texto bruto truncado)
          obj[col] = osFallback ? osFallback : texto.slice(0, 500);
        } else {
          obj[col] = '';
        }
      });
      // também assegurar que a chave legível 'O.S.' exista para facilitar mapeamentos/depuração
      if (osFallback) obj['O.S.'] = osFallback;
      dados.push(obj);
    }

    return dados;
  };

  // Normalizar string para comparação
  const normalizar = (s: string) => 
    String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isMoneyOnlyLine = (line: string) => /^\s*(?:R\$\s*)?-?\d[\d\.\,]*\s*$/.test(String(line || '').trim());
  const totalDoItensRegex = /total\s+do(?:s)?\s+itens?/i;
  const totalLikeAliases = new Set([
    'total',
    'totaldoitem',
    'totaldoitens',
    'valorareceber',
    'vlrareceber',
    'vlareceber',
    'vlrreceber',
    'areceber',
    'vlrliquido',
    'vlliquido',
    'liquido',
    'valorliquido',
    'totalliquido',
    'vlrbruto',
    'vlbruto',
    'bruto',
    'valorbruto',
    'totalbruto',
  ]);

  const extrairTotalDoItensDoBloco = (lines: string[]): string => {
    const startIdx = lines.findIndex(line => totalDoItensRegex.test(String(line || '')));
    if (startIdx < 0) return '';

    const endMarkers = [/declaramos/i, /quantidade\s+de\s+o\.?s/i, /despachante/i, /usuario:/i];
    let section = lines.slice(startIdx + 1).map(line => String(line || '').trim());
    const endIdx = section.findIndex(line => endMarkers.some(regex => regex.test(line)));
    if (endIdx >= 0) section = section.slice(0, endIdx);

    const clusters: string[][] = [];
    let currentCluster: string[] = [];

    section.forEach(line => {
      if (isMoneyOnlyLine(line)) {
        currentCluster.push(line);
      } else if (currentCluster.length > 0) {
        clusters.push(currentCluster);
        currentCluster = [];
      }
    });

    if (currentCluster.length > 0) clusters.push(currentCluster);

    const summaryCluster =
      [...clusters].reverse().find(cluster => cluster.length >= 4) ||
      [...clusters].reverse().find(cluster => cluster.length > 0);

    return summaryCluster?.[0] || '';
  };

  const getPreferredTotalValueFromSource = (source: any): string => {
    if (!source || typeof source !== 'object') return '';

    const keys = Object.keys(source || {});
    const priorityMatchers = [
      (key: string) => totalDoItensRegex.test(String(key || '')),
      (key: string) => normalizar(String(key || '')) === 'TOTAL',
      (key: string) => ['valorareceber', 'vlrareceber', 'vlareceber', 'vlrreceber', 'areceber'].includes(normalizar(String(key || ''))),
      (key: string) => ['vlrliquido', 'vlliquido', 'liquido', 'valorliquido', 'totalliquido'].includes(normalizar(String(key || ''))),
      (key: string) => ['vlrbruto', 'vlbruto', 'bruto', 'valorbruto', 'totalbruto'].includes(normalizar(String(key || ''))),
    ];

    for (const matcher of priorityMatchers) {
      const key = keys.find(matcher);
      if (!key) continue;
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }

    return '';
  };

  const hasMeaningfulRecordData = (source: any): boolean => {
    if (!source || typeof source !== 'object') return false;

    return Object.entries(source).some(([key, value]) => {
      const rawKey = String(key || '');
      const normalizedKey = normalizar(rawKey);
      if (!normalizedKey) return false;
      if (rawKey.startsWith('__')) return false;
      if (normalizedKey === 'multapresent' || normalizedKey === 'raw' || normalizedKey === 'orig' || normalizedKey === 'originalindex') return false;
      if (normalizedKey.startsWith('override')) return false;
      if (isTotalLikeColumnName(rawKey)) return false;
      if (value === undefined || value === null) return false;
      if (typeof value === 'object') return false;
      return String(value).trim().length > 0;
    });
  };

  function deduplicarRegistrosExtraidosPorIdentificador(rows: DadosExtraidos[], colunasModelo: string[] = []): DadosExtraidos[] {
    if (!Array.isArray(rows) || rows.length <= 1) return Array.isArray(rows) ? rows : [];

    const inferirIdentificador = (row: DadosExtraidos) => {
      const preferredKeys = [
        ...colunasModelo,
        ...Object.keys(row || {}),
      ];

      for (const key of preferredKeys) {
        const keyMatch = Object.keys(row || {}).find(k => normalizar(String(k || '')) === normalizar(String(key || '')));
        const valor = keyMatch ? String(row[keyMatch] || '').trim() : '';
        if (!valor) continue;

        if (/\b(o\.?s|os|n[oº]mero|numero|id)\b/i.test(String(key || ''))) {
          return normalizar(valor);
        }
        if (/placa/i.test(String(key || '')) && isLikelyPlate(valor)) {
          return normalizar(valor);
        }
      }

      const osDireto = Object.values(row || {}).find(valor => /^\d{3,7}$/.test(String(valor || '').trim()));
      if (osDireto) return normalizar(String(osDireto));

      const placaDireta = Object.values(row || {}).find(valor => isLikelyPlate(valor));
      if (placaDireta) return normalizar(String(placaDireta));

      return '';
    };

    const assinaturaConteudo = (row: DadosExtraidos) =>
      Object.keys(row || {})
        .sort()
        .map(key => `${normalizar(String(key || ''))}:${String(row[key] || '').trim()}`)
        .join('|');

    const mergedById = new Map<string, DadosExtraidos>();
    const seenSignatures = new Set<string>();
    const result: DadosExtraidos[] = [];

    rows.forEach(row => {
      const id = inferirIdentificador(row);
      if (!id) {
        const signature = assinaturaConteudo(row);
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          result.push(row);
        }
        return;
      }

      if (!mergedById.has(id)) {
        mergedById.set(id, { ...row });
        return;
      }

      const existente = mergedById.get(id)!;
      Object.keys(row || {}).forEach(key => {
        const atual = String(existente[key] || '').trim();
        const novo = String(row[key] || '').trim();
        if (!atual && novo) {
          existente[key] = row[key];
        }
      });
    });

    return [...result, ...Array.from(mergedById.values())];
  }

  const sanitizarRegistrosExtraidos = (rows: DadosExtraidos[]): DadosExtraidos[] => {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows.filter(row => hasMeaningfulRecordData(row));
  };

  const preencherTotalPreferencial = (record: DadosExtraidos): DadosExtraidos => {
    const totalPreferencial = getPreferredTotalValueFromRow(record);
    if (!totalPreferencial) return record;

    const atualizado: DadosExtraidos = { ...record };
    let encontrouColunaDeTotal = false;

    Object.keys(atualizado || {}).forEach(key => {
      if (!isTotalLikeColumnName(String(key || ''))) return;
      encontrouColunaDeTotal = true;
      const valorAtual = atualizado[key];
      if (valorAtual === undefined || valorAtual === null || String(valorAtual).trim() === '') {
        atualizado[key] = totalPreferencial;
      }
    });

    if (!encontrouColunaDeTotal || atualizado['TOTAL'] === undefined || atualizado['TOTAL'] === null || String(atualizado['TOTAL']).trim() === '') {
      atualizado['TOTAL'] = totalPreferencial;
    }

    return atualizado;
  };
  // manter coluna serviço sempre visível independentemente de filtros
  const isServiceDespachante = (c: string) => normalizar(String(c || '')) === normalizar('SERVIÇO DESPACHANTE (HONORÁRIO)');

  // Processar arquivos de entrada
  const processarArquivos = async (targetModelId?: string, arquivosParam?: File[]) => {
    // Determinar modelo alvo: se fornecido, preferir; senão usar modeloSelecionado atual
    const modelIdToUse = targetModelId || modeloSelecionado?.id;
    if (!modelIdToUse) {
      mostrarMensagem('Selecione um modelo de saída primeiro', 'error');
      return;
    }
    // Se arquivosParam não for fornecido, usar arquivosEntrada
    const arquivos = arquivosParam && arquivosParam.length > 0 ? arquivosParam : arquivosEntrada;
    if (!arquivos || arquivos.length === 0) {
      mostrarMensagem('Adicione arquivos para processar', 'error');
      return;
    }

    // Instrumentação/feedback
    console.log('processarArquivos start', { modelIdToUse, arquivosCount: arquivos.length, arquivosNames: arquivos.map(f => f.name) });
    mostrarMensagem(`Iniciando processamento de ${arquivos.length} arquivo(s) para o modelo selecionado...`, 'info');
    setPendingFilesByModel(p => ({ ...p, [modelIdToUse]: arquivos.slice() }));
    setProgressByModel(p => ({ ...p, [modelIdToUse]: 1 }));

    setProcessando(true);
    setProgresso(0);
    setProgressByModel(p => ({ ...p, [modelIdToUse]: 0 }));
    const todosDados: DadosExtraidos[] = [];
    const todosCampos = new Set<string>();
    const colunasModeloProcessamento = modelosSalvos.find(m => m.id === modelIdToUse)?.colunas || [];

    try {
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const newProgress1 = Math.round(((i + 0.3) / arquivos.length) * 100);
        setProgresso(newProgress1);
        if (modelIdToUse) setProgressByModel(p => ({ ...p, [modelIdToUse]: newProgress1 }));
        try {
          // Verificar se é CSV/Excel (processar diretamente)
          const ext = arquivo.name.toLowerCase().split('.').pop();
          let dadosArquivo: DadosExtraidos[] = [];
          if (ext === 'csv') {
            const texto = await arquivo.text();
            const linhas = texto.split(/\r?\n/).filter(l => l.trim());
            let header: string[] = [];
            let dadosTemp: DadosExtraidos[] = [];
            linhas.forEach((linha, idx) => {
              const partes = linha.split(',');
              // Detecta cabeçalho principal
              if (
                idx === 0 ||
                partes.some(p => p.toLowerCase().includes('nr')) ||
                partes.some(p => p.toLowerCase().includes('nº'))
              ) {
                header = partes.map(h => h.trim());
                return;
              }
              // Ignora linhas de cabeçalho repetido ou subtotal
              if (
                partes.some(p => p.toLowerCase().includes('nr')) ||
                partes.some(p => p.toLowerCase().includes('nº')) ||
                partes.some(p => p.toLowerCase().includes('subtotal'))
              ) return;

              // Só processa linhas com o mesmo número de colunas do cabeçalho
              if (partes.length !== header.length) return;

              // Só processa se tiver pelo menos um campo O.S. válido
              const osIdx = header.findIndex(h => h.toLowerCase().includes('o.s') || h.toLowerCase().includes('os'));
              const os = osIdx >= 0 ? partes[osIdx] : '';
              if (!os || os.trim() === '' || os.trim().toLowerCase().includes('nr')) return;

              // Cria objeto de dados alinhando exatamente com o header
              const obj: DadosExtraidos = {};
              header.forEach((col, i) => {
                obj[col] = partes[i] ? partes[i].trim() : '';
              });
              dadosTemp.push(obj);
            });
            dadosArquivo = dadosTemp;
          } else if (ext === 'xlsx' || ext === 'xls') {
            const buffer = await arquivo.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as any);
            const sheet = workbook.worksheets[0];
            if (sheet) {
              const headers: string[] = [];
              sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNum) => {
                headers[colNum - 1] = String(cell.value || `col_${colNum}`).trim();
              });
              sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
                if (rowNum === 1) return;
                const obj: DadosExtraidos = {};
                row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                  const key = headers[colNum - 1] || `col_${colNum}`;
                  obj[key] = String(cell.value || '').trim();
                });
                dadosArquivo.push(obj);
              });
            }
          } else {
            // PDF ou imagem - usar OCR
            console.log('Chamando OCR para arquivo:', arquivo.name);
            const textoOCR = await chamarOCR(arquivo);
            console.log('OCR retornou (primeiros 120 chars):', textoOCR.slice(0, 120));
            const newProgress2 = Math.round(((i + 0.7) / arquivos.length) * 100);
            setProgresso(newProgress2);
            if (modelIdToUse) setProgressByModel(p => ({ ...p, [modelIdToUse]: newProgress2 }));
            dadosArquivo = await extrairDadosComSuporteFolhas(textoOCR, colunasModeloProcessamento);
            console.log('Extração retornou', dadosArquivo.length, 'registros para', arquivo.name);
          }
          dadosArquivo = deduplicarRegistrosExtraidosPorIdentificador(
            sanitizarRegistrosExtraidos(preencherTotaisAusentesNasLinhas(dadosArquivo)),
            colunasModeloProcessamento
          );
          // Coletar todos os campos encontrados
          dadosArquivo.forEach(d => {
            Object.keys(d).forEach(k => todosCampos.add(k));
          });
          todosDados.push(...dadosArquivo);
        } catch (err) {
          console.warn('Erro ao processar arquivo', arquivo.name, err);
        }
        const newProgress3 = Math.round(((i + 1) / arquivos.length) * 100);
        setProgresso(newProgress3);
        if (modelIdToUse) setProgressByModel(p => ({ ...p, [modelIdToUse]: newProgress3 }));
      }

      // Acumular novos dados com dados já salvos (usar modelo pelo id para evitar race conditions)
      const modeloAtualLocal = modelosSalvos.find(m => m.id === modelIdToUse) as ModeloSaida | undefined;
      if (!modeloAtualLocal) {
        mostrarMensagem('Modelo selecionado não encontrado durante o processamento', 'error');
        return;
      }
      const dadosAnteriores = modeloAtualLocal.dadosSalvos || [];
      const camposAnteriores = modeloAtualLocal.camposSalvos || [];
      
      // Combinar campos antigos com novos
      camposAnteriores.forEach(c => todosCampos.add(c));
      const todosCamposArray = Array.from(todosCampos);

      const dadosPreview = deduplicarRegistrosExtraidosPorIdentificador(
        sanitizarRegistrosExtraidos(preencherTotaisAusentesNasLinhas(todosDados)),
        colunasModeloProcessamento
      );
      const dadosCombinados = deduplicarRegistrosExtraidosPorIdentificador(
        preencherTotaisAusentesNasLinhas([...dadosAnteriores, ...dadosPreview]),
        colunasModeloProcessamento
      );

      // Se terminamos com sucesso, garantir progresso 100% para o modelo e remover pendentes
      if (modelIdToUse) {
        setProgressByModel(p => ({ ...p, [modelIdToUse]: 100 }));
        // limpar arquivos pendentes no modelo após breve delay para que o usuário veja 100%
        setTimeout(() => setPendingFilesByModel(p => ({ ...p, [modelIdToUse]: [] })), 900);
      }
      
      setCamposExtraidos(todosCamposArray);
      setDadosExtraidos(preencherTotaisAusentesNasLinhas(dadosPreview));
      console.log('[processarArquivos] todosDados length', todosDados.length, 'dadosPreview length', dadosPreview.length, 'dadosCombinados length', dadosCombinados.length);
      // garantir que qualquer planilha finalizada previamente aberta seja descartada,
      // caso contrário o preview continuará mostrando antigos 12 registros
      setSelectedPlanilhaFinalizada(null);
      setPreviewRows(null);
      setPreviewEditMode(false);
      
      // Salvar dados extraídos no Firebase (após a pré‑visualização)
      if (modeloAtualLocal.firestoreId) {
        await salvarDadosExtraidosNoFirebase(modeloAtualLocal.firestoreId, dadosCombinados, todosCamposArray);
        // Atualizar o modelo local também
        const modeloAtualizado = {
          ...modeloAtualLocal,
          dadosSalvos: preencherTotaisAusentesNasLinhas(dadosCombinados),
          camposSalvos: todosCamposArray,
        };
        await selecionarModelo(modeloAtualizado);
        setModelosSalvos(prev => prev.map(m => m.id === modeloAtualLocal.id ? modeloAtualizado : m));
        setDadosExtraidos(preencherTotaisAusentesNasLinhas(dadosPreview));
      }
      
      // Aplicar apenas os mapeamentos salvos (resto ficará como "Não mapeado")
      aplicarApenasMapeamentosSalvos(modeloAtualLocal, todosCamposArray);
      
      setEtapaAtual(2);
      mostrarMensagem(`${dadosPreview.length} registros no preview após deduplicação. Total após merge com anteriores: ${dadosCombinados.length}.`, 'success');
      // Informar ao usuário que apenas mapeamentos salvos foram aplicados nesta importação
      mostrarMensagem('Aplicados apenas mapeamentos salvos; campos não mapeados ficarão em branco na planilha final', 'info');
    } catch (err: any) {
      mostrarMensagem('Erro ao processar: ' + (err?.message || String(err)), 'error');
    } finally {
      setProcessando(false);
    }
  };

  // Auto-mapear campos por similaridade
  const autoMapearCampos = (colunasModelo: string[], camposEncontrados: string[]) => {
    const novosMapeamentos: MapeamentoCampo[] = [];
    const mapeamentosReconciliados = reconciliarMapeamentosSalvosComColunas(
      colunasModelo,
      modeloSelecionado?.mapeamentosSalvos || []
    );
    
    colunasModelo.forEach(coluna => {
    // Se já existe um mapeamento definido manualmente, preservá-lo
    const existente = mapeamentos.find(m => m.colunaModelo === coluna && m.campoExtraido);
    if (existente && existente.campoExtraido) {
      novosMapeamentos.push(existente);
      return;
    }

    // Primeiro, verificar se existe mapeamento salvo no modelo
    const mapeamentoSalvo = mapeamentosReconciliados.find(
      ms => ms.colunaModelo === coluna
    );
    
    if (mapeamentoSalvo) {
      const alvo = mapeamentoSalvo.campoExtraido;
      // Se o campo salvo está disponível exatamente, usar
      if (camposEncontrados.includes(alvo)) {
        novosMapeamentos.push({ colunaModelo: coluna, campoExtraido: alvo, confianca: 100 });
        return;
      }

      // Tentar encontrar melhor match aproximado para o campo salvo
      let melhor = '';
      let melhorScore = 0;
      camposEncontrados.forEach(campo => {
        const campoNorm = normalizar(campo);
        const alvoNorm = normalizar(alvo);
        let score = 0;
        if (campoNorm === alvoNorm) score = 100;
        else if (campoNorm.includes(alvoNorm) || alvoNorm.includes(campoNorm)) score = 80;
        else {
          const palavrasCampo = campoNorm.split(/[^a-z0-9]+/).filter(Boolean);
          const palavrasAlvo = alvoNorm.split(/[^a-z0-9]+/).filter(Boolean);
          const comuns = palavrasCampo.filter(p => palavrasAlvo.includes(p));
          score = (comuns.length / Math.max(palavrasCampo.length, palavrasAlvo.length)) * 60;
        }
        if (score > melhorScore) { melhorScore = score; melhor = campo; }
      });

      if (melhorScore >= 60) {
        novosMapeamentos.push({ colunaModelo: coluna, campoExtraido: melhor, confianca: Math.round(melhorScore) });
        return;
      }

      // Não encontrou correspondência direta — preservar o campo salvo para manter o mapeamento
      novosMapeamentos.push({ colunaModelo: coluna, campoExtraido: alvo, confianca: 70 });
      return;
    }

    // Caso contrário, fazer mapeamento automático por similaridade
    const colunaNorm = normalizar(coluna);
    let melhorMatch = '';
    let melhorScore = 0;

    camposEncontrados.forEach(campo => {
      const campoNorm = normalizar(campo);
      let score = 0;
      if (colunaNorm === campoNorm) score = 100;
      else if (colunaNorm.includes(campoNorm) || campoNorm.includes(colunaNorm)) score = 80;
      else {
        const palavrasColuna = colunaNorm.split(/[^a-z0-9]+/).filter(Boolean);
        const palavrasCampo = campoNorm.split(/[^a-z0-9]+/).filter(Boolean);
        const comuns = palavrasColuna.filter(p => palavrasCampo.includes(p));
        score = (comuns.length / Math.max(palavrasColuna.length, palavrasCampo.length)) * 60;
      }

      if (score > melhorScore) {
        melhorScore = score;
        melhorMatch = campo;
      }
    });

      novosMapeamentos.push({
        colunaModelo: coluna,
        campoExtraido: melhorMatch,
        confianca: melhorScore,
      });
    });

    setMapeamentos(novosMapeamentos);
  };

  // Atualizar mapeamento manual
  const atualizarMapeamento = (colunaModelo: string, novoCampo: string) => {
    setMapeamentos(mapeamentos.map(m => 
      m.colunaModelo === colunaModelo 
        ? { ...m, campoExtraido: novoCampo, confianca: novoCampo ? 100 : 0 }
        : m
    ));
  };

  // Auto-configurar mapeamentos: mapeia cada coluna do modelo para o próprio nome e salva
  const autoConfigurarPorNomeModelo = async () => {
    if (!modeloSelecionado) return;

    // Para cada coluna do modelo, definir campoExtraido = nome da coluna e confianca = 100
    const novos = (mapeamentos.length ? mapeamentos : (modeloSelecionado.colunas.map(col => ({ colunaModelo: col, campoExtraido: '', confianca: 0 } as MapeamentoCampo))))
      .map(m => ({ ...m, campoExtraido: m.colunaModelo, confianca: 100 } as MapeamentoCampo));

    setMapeamentos(novos);

    // Construir mapeamentos a serem salvos no modelo
    const mapeamentoParaSalvar: MapeamentoSalvo[] = novos.map(m => ({ colunaModelo: m.colunaModelo, campoExtraido: m.campoExtraido }));

    const modeloAtualizado: ModeloSaida = {
      ...(modeloSelecionado as ModeloSaida),
      mapeamentosSalvos: mapeamentoParaSalvar,
    };

    // Atualizar localmente e carregar o modelo atualizado (mantendo isolamento por modelo)
    const novosModelos = modelosSalvos.map(m => m.id === modeloSelecionado?.id ? modeloAtualizado : m);
    setModelosSalvos(novosModelos);
    await selecionarModelo(modeloAtualizado);

    try {
      if (modeloAtualizado.firestoreId) {
        await atualizarMapeamentoNoFirebase(modeloAtualizado);
        mostrarMensagem(`Auto-configurados e salvos ${novos.length} mapeamento(s) (coluna → mesmo nome)`, 'success');
      } else {
        mostrarMensagem(`Auto-configurados ${novos.length} mapeamento(s). Salve o modelo para persistir.`, 'info');
      }
    } catch (err) {
      console.warn('Erro ao salvar mapeamentos automáticos:', err);
      mostrarMensagem('Mapeamentos aplicados, porém falha ao sincronizar com Firebase', 'info');
    }
  };

  // Gerar dados finais com base nos mapeamentos (memoizado para performance)
  const dadosFinaisMemo = React.useMemo((): DadosExtraidos[] => {
    if (!modeloSelecionado) return [];

    return dadosExtraidos.map(registro => {
      const novoRegistro: DadosExtraidos = {};
      mapeamentos.forEach(map => {
        let valor = '';
        if (map.campoExtraido && Object.prototype.hasOwnProperty.call(registro, map.campoExtraido)) {
          // Chave existe exatamente no registro — usar diretamente, sem fuzzy match
          valor = registro[map.campoExtraido];
        } else if (map.campoExtraido) {
          // Chave não existe — tentar encontrar melhor chave no registro por similaridade
          let melhor = '';
          let melhorScore = 0;
          Object.keys(registro).forEach(k => {
            const kNorm = normalizar(k);
            const alvoNorm = normalizar(map.campoExtraido);
            let score = 0;
            if (kNorm === alvoNorm) score = 100;
            else if (kNorm.includes(alvoNorm) || alvoNorm.includes(kNorm)) score = 80;
            else {
              const palavrasK = kNorm.split(/[^a-z0-9]+/).filter(Boolean);
              const palavrasAlvo = alvoNorm.split(/[^a-z0-9]+/).filter(Boolean);
              const comuns = palavrasK.filter(p => palavrasAlvo.includes(p));
              score = (comuns.length / Math.max(palavrasK.length, palavrasAlvo.length)) * 60;
            }
            if (score > melhorScore) { melhorScore = score; melhor = k; }
          });
          if (melhorScore >= 50 && melhor) valor = registro[melhor];
      } else {
          // Sem mapeamento: marcar explicitamente como 'Não mapeado'
          valor = 'Não mapeado';
        }

        if ((!valor || valor === 'Não mapeado') && isTotalLikeColumnName(String(map.colunaModelo || ''))) {
          const totalPreferencialDoRegistro = getPreferredTotalValueFromSource(registro);
          if (totalPreferencialDoRegistro) {
            valor = totalPreferencialDoRegistro;
          }
        }

        // Verificar se existe override manual para essa coluna (aplicado via edição inline)
        const overrideKey = `__override__${map.colunaModelo}`;
        if ((registro as any)[overrideKey]) {
          valor = (registro as any)[overrideKey] as any;
        }

        // Regra especial: se a coluna do modelo for O.S. (ou equivalente), preferir valores numéricos
        const isOsColumn = /\b(o\.?s|os|n[oº]mero|numero|n\.?º)\b/i.test(String(map.colunaModelo || ''));
        if (isOsColumn) {
          // Se o valor já mapeado é um número de 3-7 dígitos (O.S. válido), NÃO substituir
          const valorAtual = String(valor || '').trim();
          const jaTemOS = /^\d{3,7}$/.test(valorAtual);
          
          if (!jaTemOS) {
            // Helper: determinar se uma chave corresponde a uma coluna de DATA/VALOR/PLACA (para ignorá-la)
            const isChaveDeOutraColuna = (chave: string): boolean => {
              const chaveNorm = normalizar(chave);
              // Ignorar chaves que parecem ser de data, valor, placa, marca, modelo, multa, etc.
              return /data|date|venciment|prazo|placa|plate|marca|modelo|valor|total|multa|preco|price|descont|liquido|bruto|doda/i.test(chave)
                || /data|date|venciment|prazo|placa|plate|marca|modelo|valor|total|multa|preco|price|descont|liquido|bruto|doda/.test(chaveNorm);
            };

            // Helper: verificar se um valor numérico parece ser uma data (ddmmyy, ddmmyyyy, etc.)
            const pareceData = (v: string): boolean => {
              const nums = v.replace(/\D/g, '');
              if (nums.length === 6 || nums.length === 8) {
                const dd = parseInt(nums.substring(0, 2), 10);
                const mm = parseInt(nums.substring(2, 4), 10);
                if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) return true;
              }
              return false;
            };

            // 1. Primeiro tentar chaves que explicitamente têm "os" ou "o.s" no nome
            const osKeyExplicita = Object.keys(registro || {}).find(k => {
              if (isChaveDeOutraColuna(k)) return false;
              const kNorm = normalizar(k);
              if (!/os/.test(kNorm)) return false;
              const v = String(registro[k] || '').trim();
              return /^\d{3,7}$/.test(v) && !pareceData(v);
            });

            if (osKeyExplicita) {
              valor = registro[osKeyExplicita];
            } else {
              // 2. Procurar valor puramente numérico plausível, mas EXCLUIR chaves de data/valor/placa
              const osKey = Object.keys(registro || {}).find(k => {
                if (isChaveDeOutraColuna(k)) return false;
                const v = String(registro[k] || '').trim();
                return /^\d{3,7}$/.test(v) && !pareceData(v);
              });
              if (osKey) {
                valor = registro[osKey];
              } else {
                // 3. Último recurso: tentar extrair número dentro do valor (ex.: 'OS: 101143')
                // Mas apenas de chaves que NÃO são de data/valor
                const osKey2 = Object.keys(registro || {}).find(k => {
                  if (isChaveDeOutraColuna(k)) return false;
                  const v = String(registro[k] || '');
                  const m = v.match(/(\d{3,7})/);
                  return m && !pareceData(m[1]);
                });
                if (osKey2) {
                  const m = String(registro[osKey2] || '').match(/(\d{3,7})/);
                  if (m) valor = m[1];
                }
              }
            }
          }
        }

        // Ajustes para colunas identificadoras (ex.: Placa)
        // Regra especial para 'placa': só aceitar um valor se ele parecer realmente com uma placa
        const colNorm = normalizar(String(map.colunaModelo || ''));
        const isPlacaIdentificacao = colNorm.includes('placa') && !colNorm.includes('mercosul');
        if (isPlacaIdentificacao) {
          if (valor && !isLikelyPlate(valor)) {
            // Tentar encontrar uma chave explicitamente rotulada como 'placa' com valor plausível
            const candidateKey = Object.keys(registro || {}).find(k => normalizar(String(k || '')).includes('placa') && isLikelyPlate(registro[k]));
            if (candidateKey) {
              valor = registro[candidateKey];
            } else {
              // Procurar qualquer campo cujo valor pareça com placa
              const plateKey = Object.keys(registro || {}).find(k => isLikelyPlate(registro[k]));
              if (plateKey) valor = registro[plateKey];
              else {
                // Não encontramos placa plausível — limpar para evitar mostrar valores como 'MERCOSUL'
                valor = '';
              }
            }
          }
        } else if (!isOsColumn && isIdentifierColumn(map.colunaModelo) && valor) {
          // Comportamento antigo para outras colunas identificadoras: evitar mapear valores puramente numéricos
          const rawStr = String(valor).trim();
          const looksNumeric = /^[\d\.,\sR$-]+$/.test(rawStr);
          if (looksNumeric) {
            const candidateKey = Object.keys(registro || {}).find(k => normalizar(String(k || '')).includes('placa'));
            if (candidateKey && registro[candidateKey] && !/^[\d\.,\sR$-]+$/.test(String(registro[candidateKey]))) {
              valor = registro[candidateKey];
            } else {
              const nonNumericKey = Object.keys(registro || {}).find(k => {
                const v = String(registro[k] || '').trim();
                return v && !/^[\d\.,\sR$-]+$/.test(v) && v.length >= 2;
              });
              if (nonNumericKey) valor = registro[nonNumericKey];
            }
          }
        }

        // Para colunas de total, também preservamos o valor inferido do registro bruto
        // mesmo quando o mapeamento salvo não estiver preenchido.
        const devePersistirValor =
          !!map.campoExtraido ||
          (isTotalLikeColumnName(String(map.colunaModelo || '')) && !!valor && valor !== 'Não mapeado');
        novoRegistro[map.colunaModelo] = devePersistirValor ? (valor || '') : '';
      });
      // Anexar o registro original para permitir decisões de apresentação no Preview
      (novoRegistro as any).__raw = registro;
      return preencherTotalPreferencial(novoRegistro);
    });
  }, [dadosExtraidos, mapeamentos, modeloSelecionado]);

  // Compatibilidade: função que retorna dados memoizados
  const gerarDadosFinais = (): DadosExtraidos[] => dadosFinaisMemo;

  // Helper: parseia números brasileiros com heurísticas para pontos/virgulas mal OCRadas
  const parseBrazilianNumberFlexible = (input: string | number | null | undefined): number | null => {
    if (input === undefined || input === null) return null;
    let str = String(input).trim();
    if (!str) return null;
    // Remover símbolos de moeda e espaços
    str = str.replace(/[R$\s\u00A0]/g, '');
    // Remover caracteres inesperados, manter apenas dígitos, . , -
    str = str.replace(/[^0-9\.,-]/g, '');

    // Caso contenha '.' e ',' -> '.' milhares, ',' decimal
    if (str.includes('.') && str.includes(',')) {
      str = str.replace(/\./g, '').replace(/,/g, '.');
      const n = parseFloat(str);
      return isNaN(n) ? null : n;
    }

    // Somente ',' -> decimal
    if (str.includes(',') && !str.includes('.')) {
      str = str.replace(/,/g, '.');
      const n = parseFloat(str);
      return isNaN(n) ? null : n;
    }

    // Somente '.' -> pode ser caso OCR trocando ',' por '.' ou múltiplos pontos
    if (str.includes('.') && !str.includes(',')) {
      const parts = str.split('.');
      if (parts.length > 2) {
        // Tratar último '.' como separador decimal, os anteriores como milhares
        const decimal = parts.pop();
        const integer = parts.join('');
        const combined = integer + '.' + decimal;
        const n = parseFloat(combined);
        return isNaN(n) ? null : n;
      } else {
        const [intPart, decPart] = parts;
        // Se tiver exatamente 2 dígitos após o ponto, presumir decimal
        if (decPart && decPart.length === 2) {
          const n = parseFloat(intPart + '.' + decPart);
          return isNaN(n) ? null : n;
        }
        // Caso contrário, remover pontos (ex.: '1.234' -> 1234)
        const n = parseFloat(str.replace(/\./g, ''));
        return isNaN(n) ? null : n;
      }
    }

    // Sem separadores: parse direto
    const n = parseFloat(str);
    return isNaN(n) ? null : n;
  };

  function isIdentifierColumn(colName: string) {
    const lower = String(colName || '').toLowerCase();
    if (lower.includes('mercosul')) return false;
    // Excluir colunas que são identificadores e não devem ser somadas
    // Adicionado: 'placa', 'marca', 'modelo', 'chassi' para prevenir soma em colunas como 'placa', 'marca/modelo' ou 'chassi'
    return /\b(o\.?s|os|id|cpf|cnpj|n[oº]mero|numero|placa|marca|modelo|chassi|chassis)\b/.test(lower);
  }

  // Heurística para reconhecer uma PLACA: exige letras e dígitos e tamanho plausível.
  // Isso evita que números de O.S. (apenas dígitos) sejam confundidos com placas.
  function isLikelyPlate(value: any): boolean {
    if (value === undefined || value === null) return false;
    const s = String(value).trim().toUpperCase();
    if (!s) return false;
    // Remover espaços e hífens
    const cleaned = s.replace(/[\s-]/g, '');
    // Comprimento plausível para placa: entre 4 e 8 caracteres
    if (cleaned.length < 4 || cleaned.length > 8) return false;
    // Somente alfanuméricos
    if (!/^[A-Z0-9]+$/.test(cleaned)) return false;
    // Deve conter ao menos UMA letra e ao menos UM dígito (evita aceitar apenas números como O.S.)
    if (!/[A-Z]/.test(cleaned) || !/\d/.test(cleaned)) return false;
    return true;
  } 

  function getPreferredTotalValueFromRow(row: any): string {
    const sources = [row, row?.__raw, row?.__orig].filter(Boolean);

    for (const source of sources) {
      const preferred = getPreferredTotalValueFromSource(source);
      if (preferred) return preferred;
    }

    return '';
  }

  function getRowValueForColumn(row: any, col: string) {
    const keyMatch = Object.keys(row || {}).find(k => normalizar(String(k || '')) === normalizar(String(col || '')));
    let rawVal = (row && row[col] !== undefined) ? row[col] : (keyMatch ? row[keyMatch] : '');

    if ((rawVal === undefined || rawVal === null || String(rawVal).trim() === '') && isTotalLikeColumnName(String(col || ''))) {
      rawVal = getPreferredTotalValueFromRow(row);
    }

    return rawVal;
  }

  function isTotalLikeColumnName(col: string) {
    const normalizedCol = normalizar(String(col || ''));
    return (
      totalLikeAliases.has(normalizedCol) ||
      totalDoItensRegex.test(String(col || '')) ||
      ['valorareceber', 'vlrareceber', 'vlareceber', 'vlrreceber', 'areceber', 'vlrliquido', 'vlliquido', 'liquido', 'valorliquido', 'totalliquido', 'vlrbruto', 'vlbruto', 'bruto', 'valorbruto', 'totalbruto'].includes(normalizedCol)
    );
  }

  function adicionarColunasDeTotalSeNecessario(baseColumns: string[], rows: any[]) {
    const merged = Array.isArray(baseColumns) ? [...baseColumns] : [];
    const existing = new Set(merged.map(col => normalizar(String(col || ''))));

    (rows || []).forEach(row => {
      const sources = [row, row?.__raw, row?.__orig].filter(Boolean);
      let foundPreferredTotal = false;

      sources.forEach(source => {
        if (getPreferredTotalValueFromSource(source)) foundPreferredTotal = true;

        Object.keys(source || {}).forEach(key => {
          if (!isTotalLikeColumnName(String(key || ''))) return;
          const normalizedKey = normalizar(String(key || ''));
          if (existing.has(normalizedKey)) return;
          merged.push(String(key));
          existing.add(normalizedKey);
        });
      });

      if (foundPreferredTotal && !existing.has('total')) {
        merged.push('TOTAL');
        existing.add('total');
      }
    });

    return merged;
  }

  // Função para calcular totais das colunas numéricas (ignora datas, detecta moeda e suporta expressões '12x200')
  const calcularTotaisColunas = React.useMemo((): { [coluna: string]: { total: number | null; isCurrency: boolean } } => {
    const sourceRows = previewEditMode && previewRows ? previewRows : dadosFinaisMemo;
    const colunas = modeloSelecionado?.colunas || [];
    const totais: { [coluna: string]: { total: number | null; isCurrency: boolean } } = {};

    const isDateLike = (s: string) => {
      // Padrões comuns dd/mm/yyyy, yyyy-mm-dd, etc.
      if (!s) return false;
      const trimmed = s.trim();
      const regex1 = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/; // 01/02/2026
      const regex2 = /^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/; // 2026-02-01
      return regex1.test(trimmed) || regex2.test(trimmed);
    };

    const parseBrazilianNumber = (s: string): number | null => {
      return parseBrazilianNumberFlexible(s);
    }; 

    // `isIdentifierColumn` moved to outer scope so other helpers can reuse it.

    colunas.forEach(col => {
      // Se há total manual definido para essa coluna, usar ele e não calcular a partir das linhas
      const manual = manualTotals[col];
      if (manual && typeof manual.total === 'number') {
        totais[col] = { total: manual.total, isCurrency: manual.isCurrency };
        return;
      }

      // Ignorar colunas identificadoras como 'O.S.' ou 'ID' (não somar)
      if (isIdentifierColumn(col)) {
        totais[col] = { total: null, isCurrency: false };
        return;
      }

      let soma = 0;
      let temNumero = false;
      let temMoeda = false;

      const colunaPareceMoeda = /valor|pre[cç]o|total|venda|subto/i.test(String(col || ''));

      sourceRows.forEach(row => {
        const valor = getRowValueForColumn(row, col);
        if (valor === undefined || valor === null || valor === '') return;

        const raw = String(valor).trim();
        if (isDateLike(raw)) return; // Ignorar campos que parecem datas

        // Detectar se tem símbolo de moeda
        if (/R\$/.test(raw)) temMoeda = true;
        if (colunaPareceMoeda) temMoeda = true;

        // Detectar expressão de multiplicação tipo '12x200' ou '12 x 200' ou '12×200' ou '12*200'
        const mult = raw.match(/^\s*([0-9.,R$\s]+)\s*[x×*]\s*([0-9.,R$\s]+)\s*$/i);
        if (mult) {
          const a = parseBrazilianNumber(mult[1]);
          const b = parseBrazilianNumber(mult[2]);
          if (a !== null && b !== null) {
            soma += a * b;
            temNumero = true;
            return;
          }
        }

        // Caso normal: tentar parsear número direto
        const parsed = parseBrazilianNumber(raw);
        if (parsed !== null) {
          soma += parsed;
          temNumero = true;
        }
      });

      totais[col] = { total: temNumero ? soma : null, isCurrency: temMoeda };
    });

    return totais;
  }, [dadosFinaisMemo, previewRows, previewEditMode, modeloSelecionado, recalcTick]);

  // Formatar valor para exibição (estilo contábil: negativos entre parênteses)
  const formatarTotalColuna = (valor: number | null, isCurrency = false): string => {
    if (valor === null) return '-';
    const abs = Math.abs(valor);
    const num = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (isCurrency) {
      const formatted = `R$ ${num}`;
      return valor < 0 ? `(${formatted})` : formatted;
    }
    return valor < 0 ? `(${num})` : num;
  };

  // Helper: parseia uma string de valor (suporta '12x200', 'R$ 1.234,56', '200', etc.) e retorna número e string formatada
  const parseAndFormatValue = (raw: any, colunaNome: string): { value: number | null; formatted: string | null; isCurrency: boolean } => {
    if (raw === undefined || raw === null) return { value: null, formatted: null, isCurrency: false };
    const s = String(raw).trim();
    if (s.length === 0) return { value: null, formatted: null, isCurrency: false };

    const isDateLike = (str: string) => {
      const trimmed = String(str).trim();
      const regex1 = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/; // 01/02/2026
      const regex2 = /^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/; // 2026-02-01
      return regex1.test(trimmed) || regex2.test(trimmed);
    };

    if (isDateLike(s)) return { value: null, formatted: null, isCurrency: false };

    const colunaPareceMoeda = /valor|pre[cç]o|total|venda|subto/i.test(String(colunaNome || ''));
    const temMoeda = /R\$/.test(s) || colunaPareceMoeda;

    const parseBrazilianNumber = (str: string): number | null => {
      return parseBrazilianNumberFlexible(str);
    };

    // Multiplicação '12x200' ou '12 x 200' ou '12×200' ou '12*200'
    const mult = s.match(/^\s*([0-9.,R$\s]+)\s*[x×*]\s*([0-9.,R$\s]+)\s*$/i);
    if (mult) {
      const a = parseBrazilianNumber(mult[1]);
      const b = parseBrazilianNumber(mult[2]);
      if (a !== null && b !== null) {
        const val = a * b;
        const formatted = temMoeda ? formatarTotalColuna(val, true) : formatarTotalColuna(val, false);
        return { value: val, formatted, isCurrency: temMoeda };
      }
    }

    const parsed = parseBrazilianNumber(s);
    if (parsed !== null) {
      const formatted = temMoeda ? formatarTotalColuna(parsed, true) : formatarTotalColuna(parsed, false);
      return { value: parsed, formatted, isCurrency: temMoeda };
    }

    return { value: null, formatted: null, isCurrency: temMoeda };
  };

  // helper que soma todos os valores numéricos de uma linha (ignora a própria coluna "total" e campos que parecem O.S.)
  const computeRowTotal = (row: any): number | null => {
    if (!row || typeof row !== 'object') return null;
    let soma = 0;
    let temNumero = false;
    const colNorm = 'TOTAL';
    Object.keys(row).forEach(k => {
      if (normalizar(String(k || '')) === colNorm) return;
      if (/\b(o\.?s|os|n\.?º|numero|n[oº]mero)\b/i.test(String(k))) return;
      const raw = String(row[k] || '').trim();
      const p = parseAndFormatValue(raw, k);
      if (p.value !== null && p.value !== undefined) {
        soma += p.value;
        temNumero = true;
      }
    });
    return temNumero ? soma : null;
  };

  const preencherTotaisAusentesNasLinhas = (rows: any[]) => {
    return (rows || []).map((r: any) => {
      const totalKey = Object.keys(r || {}).find(k => normalizar(String(k || '')) === 'TOTAL');
      const totalAtual = totalKey ? r[totalKey] : undefined;
      const totalVazio = totalAtual === undefined || totalAtual === null || String(totalAtual).trim() === '';

      if (!totalVazio) return r;

      const totalOriginal = getPreferredTotalValueFromRow(r);
      if (!totalOriginal) return r;

      return {
        ...r,
        [totalKey || 'TOTAL']: totalOriginal,
      };
    });
  };

  // Abrir diálogo de depuração para uma coluna específica (mostra valores brutos e parseados)
  const showDebugTotals = (col: string) => {
    const sourceRows = previewEditMode && previewRows ? previewRows : dadosFinaisMemo;
    const mapping = mapeamentos.find(m => m.colunaModelo === col);
    const field = mapping?.campoExtraido || col; // usar mapeamento se existir
    const rows = sourceRows.map((r: any, idx: number) => {
      const raw = String((r as any)[field] ?? '').trim();
      const parsed = parseAndFormatValue(raw, col).value;
      return { idx, raw, parsed };
    });
    const total = rows.reduce((s, x) => s + (x.parsed || 0), 0);
    console.log('Debug totals for', col, { rows, total });
    setDebugTotalsColumn(col);
    setDebugTotalsRows(rows);
    setDebugTotalsOpen(true);
  };

  // Recalcula a coluna solicitada (calc total sem alterar valores das linhas)
  const recalcularColuna = async (col: string) => {
    setRecalculatingCol(col);
    try {      // Encontra mapeamento para localizar o campo original nos dados extraídos
      const mapping = mapeamentos.find(m => m.colunaModelo === col);
      if (!mapping || !mapping.campoExtraido) {
        setMensagem({ texto: `Coluna '${col}' não possui mapeamento para recalcular`, tipo: 'info' });
        return;
      }
      const campo = mapping.campoExtraido;

      const sourceRows = previewEditMode && previewRows ? previewRows : dadosExtraidos;

      let soma = 0;
      let temNumero = false;
      let temMoeda = false;

      sourceRows.forEach(r => {
        const raw = (r as any)[campo] ?? '';
        const parsed = parseAndFormatValue(raw, col);
        if (parsed.value !== null) {
          soma += parsed.value;
          temNumero = true;
        }
        if (parsed.isCurrency) temMoeda = true;
      });

      const total = temNumero ? soma : null;

      if (total !== null) {
        setManualTotals(prev => ({ ...prev, [col]: { total, isCurrency: temMoeda } }));
        setRecalcTick(t => t + 1);
        setMensagem({ texto: `Total da coluna '${col}' recalculado (somente total)`, tipo: 'success' });
      } else {
        setMensagem({ texto: `Nenhum valor numérico encontrado na coluna '${col}'`, tipo: 'info' });
      }

    } catch (err) {
      console.warn('Erro ao recalcular coluna', err);
      setMensagem({ texto: 'Erro ao recalcular coluna', tipo: 'error' });
    } finally {
      setRecalculatingCol(null);
    }
  };

  // Limpar total manual da coluna
  const limparTotalManual = (col: string) => {
    setManualTotals(prev => {
      const copia = { ...prev };
      delete copia[col];
      return copia;
    });
    setRecalcTick(t => t + 1);
    setMensagem({ texto: `Total manual da coluna '${col}' removido`, tipo: 'info' });
  };

  const deduplicarDados = (dados: DadosExtraidos[], colunIdentificadora?: string): DadosExtraidos[] => {
    if (dados.length === 0) return [];
    
    // Tentar encontrar coluna identificadora automaticamente
    let idColuna = colunIdentificadora;
    if (!idColuna) {
      const colunas = modeloSelecionado?.colunas || [];
      // Procura por colunas como "Nº O.S.", "O.S.", "CPF", "CNPJ", "ID", etc.
      idColuna = colunas.find(col => {
        const col_lower = col.toLowerCase();
        return col_lower.includes('o.s') || col_lower.includes('os') || 
               col_lower.includes('cpf') || col_lower.includes('cnpj') || 
               col_lower.includes('id') || col_lower.includes('número');
      });
    }

    if (!idColuna) {
      console.log('[Deduplicação] Nenhuma coluna identificadora encontrada, retornando todos os dados');
      return dados;
    }

    console.log('[Deduplicação] Usando coluna:', idColuna);

    // Mapa para rastrear IDs únicos
    const vistos = new Map<string, DadosExtraidos>();
    const dadosDeduplic: DadosExtraidos[] = [];
    const linhasSemID: DadosExtraidos[] = [];
    let contadoresIgnorados = 0;

    dados.forEach((registro, idx) => {
      // Ignorar registros nulos/indefinidos que podem vir do OCR / preview
      if (!registro || typeof registro !== 'object') {
        console.log(`[Deduplicação] Linha ${idx + 1} inválida/omissa, ignorando`);
        contadoresIgnorados++;
        return;
      }

      const id = String(registro[idColuna] || '').trim();
      
      // Se não tem ID, verificar se o registro tem algum dado válido
      if (!id || id.length === 0) {
        // Verificar se há algum campo preenchido no registro
        const temDado = Object.values(registro).some(valor => String(valor || '').trim().length > 0);
        
        if (!temDado) {
          // Completamente vazio, ignorar
          console.log(`[Deduplicação] Linha ${idx + 1} ignorada: completamente vazia`);
          contadoresIgnorados++;
          return;
        }
        
        // Tem dados mas sem ID, manter com ID temporário
        console.log(`[Deduplicação] Linha ${idx + 1}: sem ID mas com dados, mantendo`);
        linhasSemID.push(registro);
        return;
      }

      // Se já vimos este ID, mesclar dados (preferir valores preenchidos)
      if (vistos.has(id)) {
        const registroExistente = vistos.get(id)!;
        console.log(`[Deduplicação] ID ${id} duplicado (linha ${idx + 1}), mesclando dados`);
        
        // Mesclar: usar valores não-vazios da nova linha
        Object.keys(registro).forEach(chave => {
          const novoValor = String(registro[chave] || '').trim();
          const valorExistente = String(registroExistente[chave] || '').trim();
          
          // Preferir valor novo se existente estiver vazio
          if (novoValor && !valorExistente) {
            registroExistente[chave] = registro[chave];
          }
        });
      } else {
        // Novo registro
        vistos.set(id, registro);
        dadosDeduplic.push(registro);
      }
    });

    // Adicionar linhas sem ID no final
    dadosDeduplic.push(...linhasSemID);

    console.log(`[Deduplicação] Original: ${dados.length} linhas, Deduplic: ${dadosDeduplic.length} linhas, Ignoradas: ${contadoresIgnorados}`);
    return dadosDeduplic;
  };

  // ============ EXPORTAÇÃO ============

  // helper to build download file name using selected model name and current date
  const buildFileName = (ext: string) => {
    // only use 'nome' property since modeloNome is not defined in the type
    const modeloRaw = modeloSelecionado?.nome || 'dados';
    const modeloSafe = String(modeloRaw)
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${modeloSafe}_${yyyy}-${mm}-${dd}.${ext}`;
  };

  const exportarExcel = async (dadosFinaisOverride?: any[], colunasOverride?: string[], tituloOverride?: string) => {
    try {
      let dadosFinais = dadosFinaisOverride ?? gerarDadosFinais();
      // Coerce para array quando o caller passar um objeto (ex.: planilha inteira) ou mapa do Firestore
      if (!Array.isArray(dadosFinais)) {
        if (dadosFinais && typeof dadosFinais === 'object' && Array.isArray((dadosFinais as any).dados)) {
          dadosFinais = (dadosFinais as any).dados;
        } else if (dadosFinais && typeof dadosFinais === 'object') {
          dadosFinais = Object.values(dadosFinais);
        } else {
          dadosFinais = [];
        }
        console.warn('[Exportar Excel] coerced dadosFinais to array — length:', (dadosFinais || []).length);
      }
      
      // Quando recebemos linhas explícitas do preview/override, preservar exatamente a ordem e quantidade exibidas.
      if (!dadosFinaisOverride) {
        dadosFinais = deduplicarDados(dadosFinais);
      }
      dadosFinais = preencherTotaisAusentesNasLinhas(dadosFinais);
      
      console.log('[Exportar Excel] Dados finais:', dadosFinais.length, 'linhas');
      
      if (dadosFinais.length === 0) {
        mostrarMensagem('Nenhum dado para exportar', 'error');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Dados Organizados');
      
      // Cabeçalho
      // Base de colunas: preferir override fornecido, senão colunas do modelo
      let colunas = colunasOverride ?? (modeloSelecionado?.colunas || []);
      // manter nomes de colunas organizados e em MAIÚSCULAS para export
      try {
        colunas = (colunas || []).map(c => String(c || '').toUpperCase());
      } catch (err) {
        console.warn('[Exportar Excel] falha ao uppercase colunas:', err);
      }
      colunas = adicionarColunasDeTotalSeNecessario(colunas, dadosFinais);

      // Por vezes os registros já trazem uma propriedade "Total" calculada na UI, mas
      // o modelo não inclui essa coluna. Inserimos a coluna se pelo menos uma linha
      // contém esse campo e garantir que o valor esteja presente em todos os registros.
      const hasRowTotal = dadosFinais.some(r => Object.keys(r || {}).some(k => normalizar(k) === 'total'));
      if (hasRowTotal) {
        if (!colunas.includes('TOTAL')) colunas.push('TOTAL');
        dadosFinais = preencherTotaisAusentesNasLinhas(dadosFinais);
      }


      // Colunas que devem ficar sempre ocultas na exportação
      const colunasOcultasExport = ['MULTA_PRESENT'];
      const isColOcultaExport = (c: string) => colunasOcultasExport.some(h => normalizar(h) === normalizar(String(c || '')));
      colunas = colunas.filter(c => !isColOcultaExport(c));

      // Se o toggle estiver ativo, filtrar colunas que não possuem nenhum valor nos dados finais
      if (hideEmptyColumns && Array.isArray(colunas) && colunas.length > 0) {
        try {
          const isMarcaModelo = (c: string) => /marca\s*\/\s*modelo/i.test(c) || /marcamodelo/i.test(c);
          const vis = colunas.filter(col => {
            if (isMarcaModelo(col)) return true; // always keep
            if (isServiceDespachante(col)) return true; // always show service column
            return dadosFinais.some(r => {
              const val = getRowValueForColumn(r, col);
              return val !== null && val !== undefined && String(val).trim() !== '';
            });
          });
          // if all columns got filtered out, keep original to avoid empty export
          if (vis.length > 0) colunas = vis;
        } catch (err) {
          console.warn('[Exportar Excel] falha ao filtrar colunas vazias:', err);
        }
      }
      console.log('[Exportar Excel] Colunas:', colunas);

      // preencher marca/modelo usando a placa (API gratuita criada abaixo)
      // Essa etapa não altera o estado global, só modifica os dados que serão
      // exportados. Mantemos o comportamento original caso não exista coluna
      // de "placa" ou nenhuma das colunas de marca/modelo.
      try {
        const placaIdx = colunas.findIndex(c => {
          const n = normalizar(String(c || ''));
          return n.includes('placa') && !n.includes('mercosul');
        });
        const marcaIdx = colunas.findIndex(c => /\bmarca\b/i.test(String(c || '')));
        const modeloIdx = colunas.findIndex(c => /\bmodelo\b/i.test(String(c || '')));
        if (placaIdx >= 0 && (marcaIdx >= 0 || modeloIdx >= 0)) {
          const placasSet = new Set<string>();
          dadosFinais.forEach(r => {
            const placaVal = String(r[colunas[placaIdx]] || '').trim();
            if (placaVal) placasSet.add(placaVal);
          });
          const placas = Array.from(placasSet);
          const lookupResults: Record<string, { marca?: string; modelo?: string }> = {};
          await Promise.all(
            placas.map(async placa => {
              try {
                const resp = await fetch(`/api/veiculo?placa=${encodeURIComponent(placa)}`);
                if (resp.ok) {
                  const json = await resp.json();
                  lookupResults[placa] = {
                    marca: json.marca || '',
                    modelo: json.modelo || '',
                  };
                }
              } catch (e) {
                console.warn('[Exportar Excel] erro lookup veiculo', placa, e);
              }
            })
          );
          // aplicar resultados nos dados
          dadosFinais = dadosFinais.map(r => {
            const placaVal = String(r[colunas[placaIdx]] || '').trim();
            if (placaVal && lookupResults[placaVal]) {
              if (marcaIdx >= 0 && !r[colunas[marcaIdx]]) {
                r[colunas[marcaIdx]] = lookupResults[placaVal].marca || '';
              }
              if (modeloIdx >= 0 && !r[colunas[modeloIdx]]) {
                r[colunas[modeloIdx]] = lookupResults[placaVal].modelo || '';
              }
            }
            return r;
          });
        }
      } catch (err) {
        console.warn('[Exportar Excel] falha ao preencher marca/modelo:', err);
      }

      // Linha de título no topo
      const titleText = tituloOverride ?? 'PLANILHA - REF. SERVIÇOS PRESTADOS';
      sheet.addRow([titleText]);
      if ((colunas || []).length > 1) {
        sheet.mergeCells(1, 1, 1, colunas.length);
      }
      // Tornar título mais destacado
      const titleRow = sheet.getRow(1);
      titleRow.font = { bold: true, size: 14 } as any; // aumentei para 36pt (visível como 36px aprox.)
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' } as any;
      titleRow.height = 22;
      // Borda externa grossa ao redor da célula título (aplica em todas as colunas mescladas)
      const titleCols = Math.max(1, (colunas || []).length);
      for (let c = 1; c <= titleCols; c++) {
        const tcell = sheet.getCell(1, c);
        tcell.border = {
          top: { style: 'thick', color: { argb: 'FF000000' } },
          left: { style: 'thick', color: { argb: 'FF000000' } },
          bottom: { style: 'thick', color: { argb: 'FF000000' } },
          right: { style: 'thick', color: { argb: 'FF000000' } },
        } as any;
      }

      // Cabeçalho real na linha 2 (texto formatado e com borda mais grossa)
      const headerDisplay = colunas.map(col => {
        const lower = String(col || '').toLowerCase();
        if (lower.includes('o.s') || lower === 'os' || /\bos\b/.test(lower)) return 'OS.';
        if (lower.includes('data')) return 'DATA.';
        return String(col || '').toUpperCase();
      });
      sheet.addRow(headerDisplay);
      const headerRow = sheet.getRow(2);
      headerRow.height = 30; // aumentar altura da linha de cabeçalho (visível como "grossa")
      headerRow.eachCell((cell, idx) => {
        // garantir que seja tratado como texto
        cell.numFmt = '@';
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } } as any;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
        // Fundo vermelho para todos os cabeçalhos
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF44336' },
        } as any;
        // Borda inferior mais grossa para destacar a linha de títulos
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'FF000000' } }
        } as any;
      });

      // Determinar cutoff ("Cliente") — tudo até essa coluna é identificador/texto
      const clientePosExport = colunas.findIndex(c => /cliente/i.test(String(c || '')));
      const isIdentifierIndex = (idx: number) => clientePosExport >= 0 ? idx <= clientePosExport : idx <= 2; // fallback: primeiros 3

      // Totais a usar durante a exportação: quando estamos exportando um override (dadosFinaisOverride)
      // os totais devem ser calculados a partir dos `dadosFinais` passados — não do estado global `calcularTotaisColunas`.
      const totaisMetaExport = (dadosFinais && dadosFinais.length) ? computeTotalsForRows(dadosFinais, colunas) : calcularTotaisColunas;

      // Dados - cada O.S. em uma linha única (preservar texto nas colunas de identificação; exportar números como números)
      dadosFinais.forEach((registro, idx) => {
        const linha = colunas.map((col, colIdx) => {
          let registroVal: any = getRowValueForColumn(registro, col);
          // Normalizar strings: remover quebras de linha e múltiplos espaços para manter tudo em UMA linha
          if (registroVal !== null && registroVal !== undefined && typeof registroVal !== 'number') {
            registroVal = String(registroVal).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
          }
          if (isIdentifierIndex(colIdx)) return registroVal || '';
          const parsed = parseAndFormatValue(registroVal, col);
          return parsed.value !== null ? parsed.value : (registroVal || '');
        });
        sheet.addRow(linha);
      });

      // Helper: converter índice (1-based) para letra de coluna Excel (A, B, ..., Z, AA...)
      const indexToColumnLetter = (n: number) => {
        let col = '';
        while (n > 0) {
          const rem = (n - 1) % 26;
          col = String.fromCharCode(65 + rem) + col;
          n = Math.floor((n - 1) / 26);
        }
        return col;
      };

      // Adicionar linha de TOTAL no final (última linha da planilha)
      try {
        // Calcular totais com base exatamente nos dados que estamos exportando (suporta overrides)
        const totaisMeta = (dadosFinais && dadosFinais.length) ? computeTotalsForRows(dadosFinais, colunas) : calcularTotaisColunas;

        // Montar valores da linha de total (primeira célula 'TOTAL')
        const valoresTotal = colunas.map((col, idx) => {
          const meta = (totaisMeta || {})[col];
          if (idx === 0) return 'TOTAL';
          if (!meta || meta.total === null) return '';
          return meta.total;
        });

        // Antes de adicionar a linha TOTAL visível, criar uma planilha oculta com os totais numéricos (útil para uso posterior e compatibilidade)
        try {
          const totalsSheet = workbook.addWorksheet('__totals__');
          totalsSheet.state = 'hidden';
          const numericTotalsRow = colunas.map((col, idx) => {
            const meta = (totaisMeta || {})[col];
            return (meta && meta.total !== null) ? Number(Math.round((meta.total + Number.EPSILON) * 100) / 100) : null;
          });
          totalsSheet.addRow(numericTotalsRow as any);
        } catch (err) {
          console.warn('Erro ao criar sheet de totais ocultos:', err);
        }

        const totalRow = sheet.addRow(valoresTotal as any);
        // Linha TOTAL: preenchimento verde completo + fonte branca; altura/espessura ajustadas conforme pedido
        totalRow.height = 20; // tornar a linha um pouco mais fina
        totalRow.eachCell((cell, idx) => {
          const colName = colunas[idx - 1];
          const meta = (totaisMeta || {})[colName];

          // Primeiro campo legenda (não é moeda)
          if (idx === 1) {
            cell.value = 'TOTAL';
            cell.alignment = { horizontal: 'center', vertical: 'middle' } as any;
          } else {
            // se a coluna for identificadora (OS/Placa/Cliente) ou não tem total, mostrar em branco
            if (isIdentifierIndex(idx - 1) || !meta || meta.total === null) {
              cell.value = '';
              // limpar numFmt para evitar R$0,00
              cell.numFmt = '@';
              cell.alignment = { horizontal: 'center', vertical: 'middle' } as any;
            } else {
              const dataStartRow = 3; // título + header ocupam as duas primeiras linhas
              const dataEndRow = 2 + dadosFinais.length; // última linha de dados
              if (dadosFinais.length > 0) {
                const colLetter = indexToColumnLetter(idx);
                // Usar fórmula SUM numérica — a formatação contábil será aplicada via numFmt abaixo
                cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` } as any;
              } else {
                cell.value = null;
              }
              // aplicar formatação monetária e centralizar
              cell.numFmt = '"R$"#,##0.00;("R$"#,##0.00)';
              cell.alignment = { horizontal: 'center', vertical: 'middle' } as any;
            }
          }

          // Garantir fonte branca e negrito para toda a linha TOTAL
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } } as any;
          // Fundo verde visível em todas as células
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } } as any;
          // Bordas mais finas ao redor da célula TOTAL (ajuste solicitado)
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF2E7D32' } },
            left: { style: 'thin', color: { argb: 'FF2E7D32' } },
            bottom: { style: 'thin', color: { argb: 'FF2E7D32' } },
            right: { style: 'thin', color: { argb: 'FF2E7D32' } },
          } as any;
        });
      } catch (err) {
        console.warn('Erro ao adicionar linha de total no Excel:', err);
      }

      // Ajustar largura baseado nos DADOS (não no header).
      // Headers têm wrapText:true e podem quebrar em 2 linhas, então não devem ditar a largura.
      // Mínimo = metade do header (para garantir quebra limpa em 2 linhas).
      sheet.columns.forEach((column, colIdx) => {
        try {
          const headerText = headerDisplay[colIdx] || '';
          let maxDataLen = 0;

          // column.values é 1-based: índice 1=título, 2=header, 3..N=dados, N+1=total (fórmula)
          // Iterar a partir do índice 3 para medir apenas células de dados
          const allVals = column.values as any[] || [];
          for (let vi = 3; vi < allVals.length; vi++) {
            const v = allVals[vi];
            if (v === null || v === undefined) continue;
            if (typeof v === 'object') continue; // fórmulas do TOTAL row
            const s = typeof v === 'number'
              ? 'R$' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : String(v);
            if (s.length > maxDataLen) maxDataLen = s.length;
          }

          // largura mínima = metade do header (quebra em ~2 linhas com wrapText)
          const headerMinWidth = Math.ceil(headerText.length / 2.5);
          // +4 de padding + margem para o total ser ligeiramente maior que o maior dado
          const dataWidth = maxDataLen + 4;
          column.width = Math.min(Math.max(dataWidth, headerMinWidth, 8), 55);
        } catch (e) {
          column.width = 12;
        }
      });

      // Configurar impressão: paisagem, ajustar largura na página, margens e repetir título/headers
      sheet.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        verticalCentered: false,
        margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        printTitlesRow: '1:2',
      } as any;

      // Garantir bordas finas em todas as células e formatar colunas (texto vs número/contábil)
      const thin = { style: 'thin', color: { argb: 'FF000000' } } as any;
      // não forçar R$ globalmente; deixe que o detector de moeda (meta.isCurrency) decida
      const forceCurrencyForNumeric = false;
      // Aplicar formatação por célula — mas alterar alinhamento APENAS para linhas de dados (manter título/cabeçalho/total intactos)
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const isDataRow = rowNumber >= 3 && rowNumber <= (2 + (dadosFinais ? dadosFinais.length : 0));
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const idx = colNumber - 1;
          const colName = colunas[idx];
          const meta = (totaisMetaExport || {})[colName] || { total: null, isCurrency: false };

          // Sempre manter numFmt apropriado; só mudamos o alinhamento para as linhas de dados
          if (isDataRow) {
            // Dados: tornar tudo em UMA linha — remover wrapText e alinhar identificadores à esquerda
            if (isIdentifierIndex(idx)) {
              cell.numFmt = '@';
              cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false } as any;
            } else if (typeof cell.value === 'number') {
              const applyCurrency = meta.isCurrency || (typeof clientePosExport === 'number' && clientePosExport >= 0 ? idx > clientePosExport : forceCurrencyForNumeric);
              cell.numFmt = applyCurrency ? '"R$"#,##0.00;(\"R$\"#,##0.00)' : '#,##0.00;(#,##0.00)';
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false } as any;
            } else if (meta && (meta.total !== null || meta.isCurrency)) {
              const applyCurrency = meta.isCurrency || (typeof clientePosExport === 'number' && clientePosExport >= 0 ? idx > clientePosExport : forceCurrencyForNumeric);
              cell.numFmt = applyCurrency ? '"R$"#,##0.00;(\"R$\"#,##0.00)' : '#,##0.00;(#,##0.00)';
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false } as any;
            } else {
              cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false } as any;
            }
          } else {
            // Não modificar título/cabeçalho/total — apenas garantir borda e manter formatação existente
            // (não alteramos cell.alignment aqui)
          }

          cell.border = {
            top: thin,
            left: thin,
            bottom: thin,
            right: thin,
          } as any;
        });
      });

      // Engrossar borda externa ao redor do intervalo usado da planilha
      try {
        const lastRowNum = sheet.lastRow ? sheet.lastRow.number : sheet.rowCount;
        const lastColNum = sheet.columnCount || sheet.columns.length;
        // topo/rodapé
        for (let c = 1; c <= lastColNum; c++) {
          const topCell = sheet.getCell(1, c);
          topCell.border = { ...(topCell.border || {}), top: { style: 'thick', color: { argb: 'FF000000' } } } as any;
          const bottomCell = sheet.getCell(lastRowNum, c);
          bottomCell.border = { ...(bottomCell.border || {}), bottom: { style: 'thick', color: { argb: 'FF000000' } } } as any;
        }
        // laterais
        for (let r = 1; r <= lastRowNum; r++) {
          const leftCell = sheet.getCell(r, 1);
          leftCell.border = { ...(leftCell.border || {}), left: { style: 'thick', color: { argb: 'FF000000' } } } as any;
          const rightCell = sheet.getCell(r, lastColNum);
          rightCell.border = { ...(rightCell.border || {}), right: { style: 'thick', color: { argb: 'FF000000' } } } as any;
        }
      } catch (err) {
        console.warn('Erro ao aplicar borda externa grossa:', err);
      }

      // Forçar gridlines (se suportado) como fallback
      (sheet.properties as any) = sheet.properties || {};
      (sheet.properties as any).showGridLines = true;

      console.log('[Exportar Excel] Gerando buffer...');
      const buffer = await workbook.xlsx.writeBuffer();
      console.log('[Exportar Excel] Buffer gerado:', buffer.byteLength, 'bytes');
      
      if (!buffer || buffer.byteLength === 0) {
        mostrarMensagem('Erro: arquivo vazio gerado', 'error');
        return;
      }
      
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      console.log('[Exportar Excel] Blob criado:', blob.size, 'bytes');
      
      const nomeArquivo = buildFileName('xlsx');
      console.log('[Exportar Excel] Iniciando download:', nomeArquivo);
      
      const sucesso = baixarArquivo(blob, nomeArquivo);
      
      if (sucesso) {
        mostrarMensagem(`✅ Arquivo Excel baixado com sucesso! (${dadosFinais.length} linhas)`, 'success');
      } else {
        mostrarMensagem('⚠️ Erro ao baixar arquivo. Tente novamente ou use outro navegador.', 'error');
      }
    } catch (err) {
      console.error('[Exportar Excel] Erro:', err);
      mostrarMensagem(`❌ Erro ao exportar: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Calcular totais para um conjunto arbitrário de linhas/colunas (usado para preview de planilha finalizada)
  const computeTotalsForRows = (rows: any[], columns: string[]) => {
    const result: { [col: string]: { total: number | null; isCurrency: boolean } } = {};
    if (!columns || columns.length === 0) return result;
    columns.forEach(col => {
      if (isIdentifierColumn(col)) {
        result[col] = { total: null, isCurrency: false };
        return;
      }
      let soma = 0;
      let encontrouNumero = false;
      let temMoeda = /valor|pre[cç]o|total|venda|subto/i.test(String(col || ''));
      rows.forEach(r => {
        const raw = String(getRowValueForColumn(r, col) || '');
        if (!raw) return;
        if (/R\$/.test(raw)) temMoeda = true;
        const parsed = parseAndFormatValue(String(raw || ''), col);
        if (parsed && parsed.value !== null && !Number.isNaN(parsed.value)) {
          soma += parsed.value;
          encontrouNumero = true;
        }
      });
      result[col] = { total: encontrouNumero ? Number(Math.round((soma + Number.EPSILON) * 100) / 100) : null, isCurrency: temMoeda };
    });
    return result;
  };

  // Exportar planilha finalizada (usa exportarExcel com overrides)
  const exportarPlanilhaFinalizada = async (p: any) => {
    if (!p) return;
    const rows = Array.isArray(p.dados) ? p.dados : [];
    const cols = Array.isArray(p.campos) && p.campos.length ? p.campos : (rows.length ? Object.keys(rows[0]) : []);
    await exportarExcel(rows, cols, `PLANILHA - ${p.modeloNome || p.nome || ''}`);
  };

  const exportarCSV = (dadosFinaisOverride?: any[], colunasOverride?: string[]) => {
    try {
      let dadosFinais = dadosFinaisOverride ?? gerarDadosFinais();

      // Coerce/normalize quando for passado um objeto com `.dados` (compatibilidade)
      if (!Array.isArray(dadosFinais) && dadosFinais && typeof dadosFinais === 'object' && Array.isArray((dadosFinais as any).dados)) {
        dadosFinais = (dadosFinais as any).dados;
      }

      // Preservar exatamente as linhas recebidas do preview/override.
      if (!dadosFinaisOverride) {
        dadosFinais = deduplicarDados(dadosFinais as any[]);
      }
      dadosFinais = preencherTotaisAusentesNasLinhas(dadosFinais as any[]);

      console.log('[Exportar CSV] Dados finais:', (dadosFinais || []).length, 'linhas');

      if (!dadosFinais || (dadosFinais as any[]).length === 0) {
        mostrarMensagem('Nenhum dado para exportar', 'error');
        return;
      }

      let colunas = colunasOverride ?? modeloSelecionado?.colunas ?? ((dadosFinais && (dadosFinais as any[]).length) ? Object.keys((dadosFinais as any[])[0]) : []);
      colunas = adicionarColunasDeTotalSeNecessario(colunas, dadosFinais as any[]);
      console.log('[Exportar CSV] Colunas antes ajuste:', colunas);

      // Mesma lógica do Excel: se alguma linha já traz o campo de total, assegurar a
      // coluna e preencher todas as linhas.
      const hasRowTotalCSV = (dadosFinais as any[]).some(r => Object.keys(r || {}).some(k => normalizar(k) === 'total'));
      if (hasRowTotalCSV) {
        if (!colunas.some(c => normalizar(String(c || '')) === 'total')) colunas.push('Total');
        dadosFinais = preencherTotaisAusentesNasLinhas(dadosFinais as any[]);
      }

      console.log('[Exportar CSV] Colunas após ajuste:', colunas);
      
      const linhas = [
        colunas.join(','),
        ...dadosFinais.map(r => colunas.map(c => {
          const valor = String(getRowValueForColumn(r, c) || '').trim();
          // Escape de aspas duplas para CSV
          const escapado = valor.replace(/"/g, '""');
          return valor.includes(',') || valor.includes('"') || valor.includes('\n') 
            ? `"${escapado}"` 
            : valor;
        }).join(',')),
      ];

      // Adicionar linha de TOTAL ao CSV
      try {
        const totaisMeta = calcularTotaisColunas;
        const totalRow = colunas.map((col, idx) => {
          if (idx === 0) return 'TOTAL';
          const meta = totaisMeta[col];
          return (meta && meta.total !== null) ? formatarTotalColuna(meta.total, meta.isCurrency) : '';
        }).map(cell => {
          const escapado = String(cell || '').replace(/"/g, '""');
          // Se o valor contém vírgula (milhares/decimais em BR), colocar entre aspas
          return (String(cell || '').includes(',') || String(cell || '').includes('"')) ? `"${escapado}"` : escapado;
        }).join(',');
        linhas.push(totalRow);
      } catch (err) {
        console.warn('Erro ao adicionar linha TOTAL no CSV:', err);
      }
      
      const conteudo = linhas.join('\n');
      console.log('[Exportar CSV] Conteúdo gerado:', conteudo.length, 'caracteres');
      
      const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
      console.log('[Exportar CSV] Blob criado:', blob.size, 'bytes');
      
      const nomeArquivo = buildFileName('csv');
      console.log('[Exportar CSV] Iniciando download:', nomeArquivo);
      
      const sucesso = baixarArquivo(blob, nomeArquivo);
      
      if (sucesso) {
        mostrarMensagem(`✅ Arquivo CSV baixado com sucesso! (${dadosFinais.length} linhas)`, 'success');
      } else {
        mostrarMensagem('⚠️ Erro ao baixar arquivo. Tente novamente ou use outro navegador.', 'error');
      }
    } catch (err) {
      console.error('[Exportar CSV] Erro:', err);
      mostrarMensagem(`❌ Erro ao exportar CSV: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Imprimir Planilha — gera uma janela HTML pronta para impressão em paisagem
  const imprimirPlanilha = (dadosFinaisOverride?: any[], colunasOverride?: string[]) => {
    let dadosFinais = dadosFinaisOverride ?? gerarDadosFinais();
    let colunas = colunasOverride ?? modeloSelecionado?.colunas ?? ((dadosFinais && dadosFinais.length) ? Object.keys(dadosFinais[0]) : []);
    colunas = adicionarColunasDeTotalSeNecessario(colunas, dadosFinais || []);
    const title = 'PLANILHA - REF. SERVIÇOS PRESTADOS';

    // total column handling similar a exportExcel/exportCSV
    const hasRowTotalPrint = (dadosFinais || []).some((r: any) => Object.keys(r || {}).some(k => normalizar(k) === 'total'));
    if (hasRowTotalPrint) {
      if (!colunas.some(c => normalizar(String(c || '')) === 'total')) colunas.push('Total');
      dadosFinais = preencherTotaisAusentesNasLinhas(dadosFinais || []);
    }

    // Escapa HTML para evitar problemas com caracteres especiais
    const esc = (v: any) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Preparar linha de cabeçalho do preview (se disponível) para incluir como primeira linha
    const previewRow = (linhasPreview && linhaHeaderSelecionada != null && linhasPreview[linhaHeaderSelecionada])
      ? linhasPreview[linhaHeaderSelecionada]
      : null;

    const matchPreviewToCol = (col: string) => {
      if (!previewRow) return '';
      const norm = normalizar(col);
      let best = '';
      let bestScore = 0;
      previewRow.forEach(cell => {
        const cNorm = normalizar(cell || '');
        if (!cNorm) return;
        let score = 0;
        if (cNorm === norm) score = 100;
        else if (cNorm.includes(norm) || norm.includes(cNorm)) score = 80;
        else {
          const a = cNorm.split(/[^a-z0-9]+/).filter(Boolean);
          const b = norm.split(/[^a-z0-9]+/).filter(Boolean);
          const comuns = a.filter(x => b.includes(x));
          score = (comuns.length / Math.max(1, Math.max(a.length, b.length))) * 60;
        }
        if (score > bestScore) { bestScore = score; best = cell; }
      });
      return bestScore > 20 ? best : '';
    };

    // Calcular comprimento máximo por coluna (considerando título, preview e conteúdo)
    const maxLens = colunas.map((col) => {
      let m = String(col || '').length;
      // considerar preview se existir
      const pv = matchPreviewToCol(col);
      if (pv && pv.length > m) m = pv.length;
      dadosFinais.forEach(r => { const l = String(getRowValueForColumn(r, col) || '').length; if (l > m) m = l; });
      return Math.max(m, 1);
    });

    const total = maxLens.reduce((a,b) => a + b, 0) || 1;

    // Percentual por coluna, garantindo ao menos 4% e total 100%
    let widths = maxLens.map(m => Math.max(4, Math.round((m / total) * 100)));
    const sumW = widths.reduce((a,b) => a + b, 0);
    if (sumW !== 100 && widths.length > 0) widths[widths.length - 1] += (100 - sumW);

    // Ajustar tamanho de fonte e padding para ficar parecido com Excel
    // calcular o tamanho da fonte de acordo com a quantidade de colunas,
    // garantindo pelo menos 4pt e ajustando o padding proporcionalmente.
    const baseSize = Math.floor(100 / Math.max(1, colunas.length));
    let fontSizePt = Math.max(4, Math.min(12, baseSize));
    let cellPadding = fontSizePt > 10 ? 6 : fontSizePt > 8 ? 5 : fontSizePt > 6 ? 4 : 2;

    // Calcular comprimento máximo por coluna (já usado acima em `maxLens`) e gerar colgroup
    // Em vez de usar pixels (que faz o navegador escalar a tabela quando ela ultrapassa a largura da página),
    // calcular uma largura percentual baseada na distribuição das colunas. Isso garante o conteúdo preencha
    // a página horizontalmente sem reduzir demais.
    // remove explicit widths so browser auto-sizes columns based on content
    const colgroup = ``;

    // Identificar coluna "Cliente" (se existir) — tudo até essa coluna será tratado como identificador/texto
    const clientePos = colunas.findIndex(c => /cliente/i.test(String(c || '')));
    const isIdentifierCol = (colName: string) => {
      const idx = colunas.indexOf(colName);
      if (idx === -1) return false;
      return clientePos >= 0 ? idx <= clientePos : idx <= 2; // fallback: primeiros 3 campos (OS, placa, cliente)
    };

    const totaisMeta = calcularTotaisColunas;
    const isNumericCol = (colName: string) => {
      if (isIdentifierCol(colName)) return false; // não tratar identificadores como números
      const meta = totaisMeta[colName];
      return !!(meta && (meta.total !== null || meta.isCurrency));
    };

    // Forçar exibição como moeda (R$) para todas as colunas numéricas após Cliente
    const forceCurrencyForNumeric = true;

    const previewHtml = previewRow ? `<tr class=\"preview-row\">${colunas.map(col => {
      const pv = esc(matchPreviewToCol(col));
      if (isNumericCol(col)) {
        const parsed = parseAndFormatValue(pv || '', col);
        const display = parsed.formatted ?? pv;
        const withCurrency = forceCurrencyForNumeric && !parsed.isCurrency && display ? (`R$ ${display}`) : display;
        return `<td style=\"text-align:center;vertical-align:middle\">${esc(withCurrency)}</td>`;
      }
      return `<td style=\"text-align:left\">${pv}</td>`;
    }).join('')}</tr>` : '';

    const headerRow = `<tr>${colunas.map(c => `<th style=\"text-align:center;vertical-align:middle\">${esc(c)}</th>`).join('')}</tr>`;

    let bodyRows = dadosFinais.length > 0
      ? dadosFinais.map(r => `<tr>${colunas.map(c => {
          const raw = getRowValueForColumn(r, c) || '';
          if (isNumericCol(c)) {
            const parsed = parseAndFormatValue(raw, c);
            const display = parsed.formatted ?? raw;
            const withCurrency = forceCurrencyForNumeric && !parsed.isCurrency && display ? (`R$ ${display}`) : display;
            return `<td style=\"text-align:center;vertical-align:middle\">${esc(withCurrency)}</td>`;
          }
          return `<td style=\"text-align:left\">${esc(raw)}</td>`;
        }).join('')}</tr>`).join('\n')
      : `<tr>${colunas.map(() => `<td></td>`).join('')}</tr>`;

    // Adicionar linha de TOTAL ao HTML (aparece como última linha na impressão)
    try {
      const totaisMeta = calcularTotaisColunas;
      const totalRowHtml = `<tr style="background:#4caf50;color:#fff;font-weight:700;"><td style=\"padding:6px;text-align:center;vertical-align:middle\">TOTAL</td>${colunas.slice(1).map(c => {
        const meta = totaisMeta[c] || { total: null, isCurrency: false };
        const useCurrency = meta.isCurrency || forceCurrencyForNumeric;
        return `<td style=\"padding:6px;text-align:center;vertical-align:middle\">${esc(meta && meta.total !== null ? formatarTotalColuna(meta.total, useCurrency) : '')}</td>`;
      }).join('')}</tr>`;
      // concatenar
      bodyRows += '\n' + totalRowHtml;
    } catch (err) {
      console.warn('Erro ao adicionar linha TOTAL na impressão:', err);
    }

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: landscape; margin: 0.5cm; }
          @media print { html { zoom: 1; } }
          html,body { width: 100%; height: 100%; margin:0; padding:0; }
          body { font-family: Calibri, Arial, Helvetica, sans-serif; padding: 0; color: #111; }
          h1 { text-align: center; font-size: 36px; margin: 4px 0 8px; border: 3px solid #000; padding: 6px; display: inline-block; box-sizing: border-box; }
          table { width: auto; max-width: 100%; border-collapse: collapse; table-layout: auto; font-size: ${fontSizePt}pt; }
          thead { display: table-header-group; }
          th, td { border: 1px solid #bdbdbd; padding: ${cellPadding}px; text-align: left; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 0.6; }
          th { background: #f44336; color: #fff; font-weight: 700; text-align: center; padding-top: ${cellPadding+2}px; padding-bottom: ${cellPadding+2}px; }
          thead th { height: 60px; line-height: 60px; }
          tr { height: 1.4em; }
          .preview-row td { background: #f3f4f6; color: #374151; font-style: italic; font-size: ${Math.max(8, fontSizePt - 1)}pt; }
          /* Garantir que colunas sem conteúdo mantenham largura do título */
          td:empty::after { content: ""; }
          @media print {
            body { -webkit-print-color-adjust: exact; margin:0; padding:0; }
            h1 { page-break-after: 8px; }
            table { page-break-inside: avoid; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead th { height: 50px; line-height: 50px; vertical-align: middle; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          ${colgroup}
          <thead>
            ${previewHtml}
            ${headerRow}
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
        <script>window.onload = function(){ setTimeout(()=>window.print(), 200); };</script>
      </body>
    </html>`;

    const win = window.open('', '_blank');
    if (!win) {
      mostrarMensagem('Bloqueador de popups impediu a impressão. Permita popups e tente novamente.', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  // ============ FUNÇÕES DE NOTIFICAÇÃO ============

  // Abrir popover para definir notificação de vencimento
  const abrirPopoverNotificacao = (event: React.MouseEvent<Element>, linhaIndex: number) => {
    setPopoverAnchor(event.currentTarget as HTMLElement);
    setLinhaNotificacao(linhaIndex);
    
    // Verificar se já existe notificação para esta linha
    const notificacaoExistente = notificacoes.find(n => n.linhaIndex === linhaIndex);
    if (notificacaoExistente) {
      setDataVencimento(notificacaoExistente.dataVencimento);
      setHoraNotificacao(notificacaoExistente.horaNotificacao);
    } else {
      // Data padrão: amanhã
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      setDataVencimento(amanha.toISOString().split('T')[0]);
      setHoraNotificacao('09:00');
    }
  };

  // Fechar popover
  const fecharPopoverNotificacao = () => {
    setPopoverAnchor(null);
    setLinhaNotificacao(null);
    setDataVencimento('');
    setHoraNotificacao('09:00');
  };

  // Salvar notificação de vencimento para uma linha
  const salvarNotificacaoLinha = async () => {
    if (linhaNotificacao === null || !dataVencimento) {
      mostrarMensagem('Selecione uma data de vencimento', 'error');
      return;
    }

    // Obter informação da linha (OS, etc.) para descrição
    const dadosFinais = gerarDadosFinais();
    const linhaDados = dadosFinais[linhaNotificacao];
    let descricao = `Linha ${linhaNotificacao + 1}`;
    
    // Tentar encontrar campo OS ou identificador
    if (linhaDados) {
      const chaves = Object.keys(linhaDados);
      const chaveOS = chaves.find(k => {
        const kLower = k.toLowerCase();
        return kLower.includes('o.s') || kLower === 'os' || /\bos\b/.test(kLower);
      });
      if (chaveOS && linhaDados[chaveOS]) {
        descricao = `OS ${linhaDados[chaveOS]}`;
      }
    }

    const novaNotificacao: NotificacaoLinha = {
      linhaIndex: linhaNotificacao,
      dataVencimento: dataVencimento,
      horaNotificacao: horaNotificacao,
      descricao: descricao,
      notificado: false,
      criadoEm: Date.now(),
      criadoPor: usuario?.uid || 'anonymous',
      dismissed: false,
    };

    // Atualizar lista de notificações (substituir se já existir para esta linha)
    const novasNotificacoes = notificacoes.filter(n => n.linhaIndex !== linhaNotificacao);
    novasNotificacoes.push(novaNotificacao);
    setNotificacoes(novasNotificacoes);

    // Salvar no Firebase
    if (modeloSelecionado?.firestoreId) {
      await salvarNotificacoesNoFirebase(modeloSelecionado.firestoreId, novasNotificacoes);
      mostrarMensagem(`🔔 Notificação definida para ${descricao} em ${formatarDataBR(dataVencimento)} às ${horaNotificacao}`, 'success');
    }

    // Garantir que agendamentos locais sejam atualizados imediatamente
    scheduleNotificationTimers();

    fecharPopoverNotificacao();
  };

  // Remover notificação de uma linha
  const removerNotificacaoLinha = async (linhaIndex: number) => {
    const novasNotificacoes = notificacoes.filter(n => n.linhaIndex !== linhaIndex);
    setNotificacoes(novasNotificacoes);

    // Salvar no Firebase
    if (modeloSelecionado?.firestoreId) {
      await salvarNotificacoesNoFirebase(modeloSelecionado.firestoreId, novasNotificacoes);
      mostrarMensagem('Notificação removida', 'info');
    }
  };

  // Obter notificação de uma linha específica
  const getNotificacaoLinha = (linhaIndex: number): NotificacaoLinha | undefined => {
    return notificacoes.find(n => n.linhaIndex === linhaIndex);
  };

  // Formatar data para exibição em português
  const formatarDataBR = (dataISO: string): string => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Dismiss (marcar como visto) uma notificação criada pelo usuário e persistir
  const dismissNotificacao = async (n: NotificacaoLinha) => {
    const novas = notificacoes.map(x => x.linhaIndex === n.linhaIndex && x.criadoPor === n.criadoPor ? { ...x, dismissed: true } : x);
    setNotificacoes(novas);
    if (modeloSelecionado?.firestoreId) {
      await salvarNotificacoesNoFirebase(modeloSelecionado.firestoreId, novas);
      mostrarMensagem('Notificação descartada', 'info');
    }
    // Reagendar timers
    scheduleNotificationTimers();
  };

  // Agendar timers locais para notificações: evita polling; agenda quando entrar em 5 dias e quando vencer
  const scheduleNotificationTimers = () => {
    // cancelar timers anteriores
    Object.keys(notificationTimersRef.current || {}).forEach(k => {
      const t = notificationTimersRef.current[k];
      if (t) window.clearTimeout(t as any);
      delete notificationTimersRef.current[k];
    });

    if (!usuario || !usuario.uid) return;

    (notificacoes || []).forEach(n => {
      if (n.criadoPor !== usuario.uid || n.dismissed) return;
      // calcular ms até eventos usando parsing local
      const [y, m, d] = (n.dataVencimento || '').split('-').map(Number);
      const [hh = 0, mm = 0] = (n.horaNotificacao || '00:00').split(':').map(Number);
      const dataVenc = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
      const msUntilDue = dataVenc.getTime() - Date.now();
      const msUntilShow = msUntilDue - (5 * 24 * 60 * 60 * 1000);

      console.log('[Notificação] schedule for', n.descricao, { dataVenc: dataVenc.toString(), msUntilShow, msUntilDue });

      // Se precisa aparecer quando dentro de 5 dias
      if (msUntilShow > 0) {
        const keyShow = `show_${n.linhaIndex}_${n.criadoEm}`;
        const t1 = window.setTimeout(() => {
          console.log('[Notificação] show tick for', n.descricao);
          setAlertsTick(t => t + 1);
        }, msUntilShow);
        notificationTimersRef.current[keyShow] = t1;
      } else {
        // Já está dentro de 5 dias — forçar re-render para aparecer
        setTimeout(() => setAlertsTick(t => t + 1), 0);
      }

      // Agendar mudança para vencida (mudar cor para vermelho)
      if (msUntilDue > 0) {
        const keyDue = `due_${n.linhaIndex}_${n.criadoEm}`;
        const t2 = window.setTimeout(() => {
          console.log('[Notificação] due tick for', n.descricao);
          setAlertsTick(t => t + 1);
        }, msUntilDue + 50);
        notificationTimersRef.current[keyDue] = t2;
      } else {
        // Já vencida — forçar re-render
        setTimeout(() => setAlertsTick(t => t + 1), 0);
      }
    });
  };

  // Agendar timers sempre que notificacoes ou usuário mudarem
  useEffect(() => {
    scheduleNotificationTimers();
    return () => {
      // cleanup
      Object.keys(notificationTimersRef.current || {}).forEach(k => {
        const t = notificationTimersRef.current[k];
        if (t) window.clearTimeout(t as any);
      });
      notificationTimersRef.current = {};
    };
  }, [notificacoes, usuario]);

  // Verificar se uma notificação está vencida
  const isNotificacaoVencida = (notificacao: NotificacaoLinha): boolean => {
    const hoje = new Date();
    const dataVenc = new Date(notificacao.dataVencimento + 'T' + notificacao.horaNotificacao);
    return dataVenc < hoje;
  };

  // Dias restantes até o vencimento (inteiro) — positivo se futuro, 0 se hoje, negativo se já passou
  const diasAteVencimento = (notificacao: NotificacaoLinha): number => {
    const hoje = new Date();
    const [y, m, d] = (notificacao.dataVencimento || '').split('-').map(Number);
    const [hh = 0, mm = 0] = (notificacao.horaNotificacao || '00:00').split(':').map(Number);
    // Criar data explicitamente no timezone local para evitar dissonância entre browsers
    const dataVenc = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
    const msPorDia = 24 * 60 * 60 * 1000;
    // Usar Math.ceil para contar dias restantes inclusivamente
    return Math.ceil((dataVenc.getTime() - hoje.getTime()) / msPorDia);
  };

  // Alerts ativos para o usuário logado: notificações criadas por ele, não dispensadas, que faltam 5 dias ou menos (inclui vencidas)
  const getActiveAlertsForUser = (): NotificacaoLinha[] => {
    if (!usuario || !usuario.uid) return [];
    return (notificacoes || []).filter(n => {
      if (n.criadoPor !== usuario.uid) return false;
      if (n.dismissed) return false;
      const dias = diasAteVencimento(n);
      return dias <= 5; // inclui dias negativos (vencidas)
    });
  };

  // Verificar se uma notificação vence hoje
  const isNotificacaoHoje = (notificacao: NotificacaoLinha): boolean => {
    const hoje = new Date().toISOString().split('T')[0];
    return notificacao.dataVencimento === hoje;
  };

  // Calcular dias restantes para vencimento
  const calcularDiasRestantes = (dataVencimento: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = new Date(dataVencimento + 'T00:00:00');
    const diffTime = dataVenc.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Obter status de vencimento de um modelo (baseado na notificação mais próxima)
  const getStatusVencimentoModelo = (modelo: ModeloSaida): { status: 'verde' | 'amarelo' | 'vermelho' | 'vencido' | 'sem', diasRestantes: number, proximaNotificacao?: NotificacaoLinha } => {
    if (!modelo.notificacoes || modelo.notificacoes.length === 0) {
      return { status: 'sem', diasRestantes: -1 };
    }

    // Encontrar a notificação mais próxima (não vencida)
    let maisProxima: NotificacaoLinha | undefined;
    let menorDias = Infinity;

    modelo.notificacoes.forEach(notif => {
      const dias = calcularDiasRestantes(notif.dataVencimento);
      if (dias < menorDias) {
        menorDias = dias;
        maisProxima = notif;
      }
    });

    if (!maisProxima) {
      return { status: 'sem', diasRestantes: -1 };
    }

    if (menorDias < 0) {
      return { status: 'vencido', diasRestantes: menorDias, proximaNotificacao: maisProxima };
    } else if (menorDias <= 5) {
      return { status: 'vermelho', diasRestantes: menorDias, proximaNotificacao: maisProxima };
    } else if (menorDias <= 10) {
      return { status: 'amarelo', diasRestantes: menorDias, proximaNotificacao: maisProxima };
    } else {
      return { status: 'verde', diasRestantes: menorDias, proximaNotificacao: maisProxima };
    }
  };

  // Cor do ícone baseado no status
  const getCorStatus = (status: 'verde' | 'amarelo' | 'vermelho' | 'vencido' | 'sem'): string => {
    switch (status) {
      case 'verde': return '#4caf50';
      case 'amarelo': return '#ff9800';
      case 'vermelho': return '#f44336';
      case 'vencido': return '#d32f2f';
      default: return '#9e9e9e';
    }
  };

  // Efeito para verificar notificações urgentes (2 dias ou menos) e mostrar alerta
  useEffect(() => {
    if (!modelosSalvos || modelosSalvos.length === 0) return;

    const verificarNotificacoesUrgentes = () => {
      modelosSalvos.forEach(modelo => {
        if (!modelo.notificacoes) return;
        
        modelo.notificacoes.forEach(notif => {
          const dias = calcularDiasRestantes(notif.dataVencimento);
          if (dias >= 0 && dias <= 2 && !notif.notificado) {
            // Mostrar notificação do navegador se permitido
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`⚠️ Vencimento Próximo!`, {
                body: `${notif.descricao || 'Item'} vence em ${dias} dia(s) - ${formatarDataBR(notif.dataVencimento)}`,
                icon: '/favicon.ico',
                tag: `notif-${modelo.id}-${notif.linhaIndex}`
              });
            }
          }
        });
      });
    };

    // Verificar imediatamente
    verificarNotificacoesUrgentes();

    // Verificar a cada 2 horas (7200000 ms)
    const intervalo = setInterval(verificarNotificacoesUrgentes, 2 * 60 * 60 * 1000);

    // Solicitar permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => clearInterval(intervalo);
  }, [modelosSalvos]);

  // ============ UTILITÁRIOS ============

  // Função auxiliar para baixar arquivo (funciona melhor em alguns casos)
  const baixarArquivo = (blob: Blob, nomeArquivo: string) => {
    try {
      console.log('[Download] Tentando com URL.createObjectURL...');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      console.log('[Download] Clicando no link...');
      link.click();
      
      // Aguardar um pouco antes de remover
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('[Download] Link removido');
      }, 100);
      
      return true;
    } catch (err) {
      console.error('[Download] Erro com URL.createObjectURL:', err);
      
      // Fallback para saveAs
      try {
        console.log('[Download] Tentando fallback com saveAs...');
        saveAs(blob, nomeArquivo);
        return true;
      } catch (err2) {
        console.error('[Download] Erro com saveAs:', err2);
        return false;
      }
    }
  };

  const mostrarMensagem = (texto: string, tipo: 'success' | 'error' | 'info') => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem(null), 5000);
  };

  // ─── Recarregar OS do SGDW com mês/ano selecionado ──────────────────────────
  const recarregarSgdw = async (modelo: ModeloSaida, anoOverride?: number, mesOverride?: number) => {
    const emp = empresaSelecionadaPorModelo[modelo.id];
    if (!emp) return;
    const ano = anoOverride ?? sgdwAno;
    const mes = mesOverride ?? sgdwMes;
    setEmpresaCarregandoModeloId(modelo.id);
    try {
      const linhas = await buscarOsEmpresaMesNota(emp.clinumer, ano, mes);
      if (linhas.length === 0) {
        mostrarMensagem(`Nenhuma OS em ${MESES_NOTA[mes - 1]}/${ano}`, 'info');
        return;
      }
      const dadosMapeados: DadosExtraidos[] = linhas.map(l => mapearLinhaSgdwParaModelo(l, modelo.colunas));
      setDadosExtraidos(dadosMapeados);
      setCamposExtraidos(modelo.colunas);
      setMapeamentos(modelo.colunas.map(col => ({ colunaModelo: col, campoExtraido: col, confianca: 100 })));
      setShowPreview(true);
      mostrarMensagem(`${linhas.length} OS de ${emp.nome} — ${MESES_NOTA[mes - 1]}/${ano}`, 'success');
    } catch (err) {
      mostrarMensagem('Erro ao recarregar SGDW', 'error');
    } finally {
      setEmpresaCarregandoModeloId(null);
    }
  };

  // ─── Vincular empresa SGDW ao modelo ─────────────────────────────────────────

  const empresaBuscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEmpresaBuscaChange = (valor: string) => {
    setEmpresaBusca(valor);
    if (empresaBuscaTimerRef.current) clearTimeout(empresaBuscaTimerRef.current);
    empresaBuscaTimerRef.current = setTimeout(async () => {
      if (!valor.trim()) { setEmpresasResultados([]); return; }
      setCarregandoEmpresas(true);
      const res = await buscarEmpresasNota(valor.trim());
      setEmpresasResultados(res);
      setCarregandoEmpresas(false);
    }, 400);
  };

  const abrirEmpresaDialog = async (modeloId: string) => {
    setEmpresaDialogModeloId(modeloId);
    setEmpresaBusca('');
    setCarregandoEmpresas(true);
    const res = await buscarEmpresasNota('');
    setEmpresasResultados(res);
    setCarregandoEmpresas(false);
  };

  const selecionarEmpresaParaModelo = async (empresa: { CLINUMER: number; NOME: string }) => {
    const modeloId = empresaDialogModeloId;
    setEmpresaDialogModeloId(null);
    if (!modeloId) return;
    const modelo = modelosSalvos.find(m => m.id === modeloId);
    if (!modelo) return;
    setEmpresaCarregandoModeloId(modeloId);
    try {
      const linhas = await buscarOsEmpresaMesNota(empresa.CLINUMER, sgdwAno, sgdwMes);
      if (linhas.length === 0) {
        mostrarMensagem(`Nenhuma OS encontrada para ${empresa.NOME} no mês atual`, 'info');
        return;
      }
      // Map to column names used as both key and value (identity mapping via dadosExtraidos)
      const dadosMapeados: DadosExtraidos[] = linhas.map(
        (linha) => mapearLinhaSgdwParaModelo(linha, modelo.colunas)
      );
      await selecionarModelo(modelo);
      // Use dadosExtraidos flow so gerarDadosFinais() picks it up without previewEditMode
      setDadosExtraidos(dadosMapeados);
      setCamposExtraidos(modelo.colunas);
      // Identity mapeamentos: each model column maps to its own name (keys match)
      setMapeamentos(modelo.colunas.map(col => ({ colunaModelo: col, campoExtraido: col, confianca: 100 })));
      setShowPreview(true);
      const empVinc = { clinumer: empresa.CLINUMER, nome: empresa.NOME };
      setEmpresaSelecionadaPorModelo(prev => {
        const next = { ...prev, [modeloId]: empVinc };
        lsSaveEmpresas(next);
        return next;
      });
      setModelosSalvos(prev => prev.map(m => m.id === modeloId ? { ...m, empresaVinculada: empVinc } : m));
      if (modelo.firestoreId) {
        rtdbUpdate(rtdbRef(rtdb, `modelos-nota/${modelo.firestoreId}`), { empresaVinculada: empVinc })
          .catch(err => console.warn('Firebase RTDB empresaVinculada save falhou', err));
      }
      mostrarMensagem(`${linhas.length} OS de ${empresa.NOME} carregadas no preview`, 'success');
    } catch (err) {
      console.error('Erro ao carregar OS da empresa', err);
      mostrarMensagem('Erro ao carregar OS da empresa', 'error');
    } finally {
      setEmpresaCarregandoModeloId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const reiniciar = () => {
    setEtapaAtual(0);
    setArquivosEntrada([]);
    setDadosExtraidos([]);
    setCamposExtraidos([]);
    setMapeamentos([]);
    setProgresso(0);
  };

  // ============ HANDLERS DE ARQUIVO ============

  const handleDropModelo = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files.find(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    if (file) processarArquivoModelo(file);
  }, []);

  const handleDropMarcaModelo = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files.find(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    if (file) processarArquivoMarcaModelo(file);
  }, []);

  const handleDropArquivos = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || 
      f.type.startsWith('image/') || 
      f.name.endsWith('.csv') ||
      f.name.endsWith('.xlsx') ||
      f.name.endsWith('.xls')
    );
    setArquivosEntrada(prev => [...prev, ...files]);
  }, []);

  // Drop handler específico para o popover de upload (Enviar Documentos no card)
  const handleDropInPopover = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || 
      f.type.startsWith('image/') || 
      f.name.endsWith('.csv') ||
      f.name.endsWith('.xlsx') ||
      f.name.endsWith('.xls')
    );
    setUploadPopoverFiles(prev => [...prev, ...files]);
  }, []);

  // Handler para colar imagens da área de transferência (Ctrl+V / Print Screen)
  const handlePasteArquivos = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const arquivosColados: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Renomear arquivo colado com timestamp
          const novoNome = `captura_${Date.now()}_${i}.png`;
          const arquivoRenomeado = new File([file], novoNome, { type: file.type });
          arquivosColados.push(arquivoRenomeado);
        }
      }
    }
    
    if (arquivosColados.length > 0) {
      // Evitar duplicar arquivos já existentes por name+size
      setArquivosEntrada(prev => {
        const existing = new Set(prev.map(f => `${f.name}:${f.size}`));
        const adicionados = arquivosColados.filter(f => !existing.has(`${f.name}:${f.size}`));
        if (adicionados.length === 0) {
          mostrarMensagem('Arquivos já presentes — nada foi adicionado', 'info');
          // Mesmo sem novos arquivos, se houver um modelo selecionado, iniciar processamento usando arquivos já no queue
          if (modeloSelecionado) setTimeout(() => processarArquivos(modeloSelecionado.id, prev), 50);
          return prev;
        }
        mostrarMensagem(`${adicionados.length} imagem(ns) colada(s) da área de transferência!`, 'success');
        const next = [...prev, ...adicionados];
        // Se há um modelo selecionado, registrar arquivos pendentes para o modelo e iniciar processamento automático após curto delay
        if (modeloSelecionado) {
          setPendingFilesByModel(p => ({ ...p, [modeloSelecionado.id]: adicionados }));
          setProgressByModel(p => ({ ...p, [modeloSelecionado.id]: 5 }));
          setTimeout(() => processarArquivos(modeloSelecionado.id, adicionados), 50);
        }
        return next;
      });
    }
  }, []);

  // Adicionar listener de paste para capturar Ctrl+V (direciona para popover quando aberto)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (uploadPopoverAnchor) {
        // popover aberto — colar nas files do popover
        const items = e.clipboardData?.items;
        if (!items) return;
        const arquivosColados: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const novoNome = `captura_${Date.now()}_${i}.png`;
              const arquivoRenomeado = new File([file], novoNome, { type: file.type });
              arquivosColados.push(arquivoRenomeado);
            }
          }
        }
        if (arquivosColados.length > 0) {
          // Evitar duplicados dentro do popover
          const existing = new Set(uploadPopoverFiles.map(f => `${f.name}:${f.size}`));
          const adicionados = arquivosColados.filter(f => !existing.has(`${f.name}:${f.size}`));
          if (adicionados.length > 0) {
            setUploadPopoverFiles(prev => [...prev, ...adicionados]);
            mostrarMensagem(`${adicionados.length} imagem(ns) colada(s) na janela 'Enviar Documentos'!`, 'success');
          } else {
            mostrarMensagem('Arquivos já presentes na janela "Enviar Documentos"', 'info');
          }

          // Se houver um modelo associado ao popover, iniciar processamento automático (mesmo que não haja novos arquivos)
          if (uploadPopoverModel) {
            // Registrar pendentes no modelo do popover para visualização imediata
            const toUse = adicionados.length > 0 ? adicionados : arquivosColados;
            setPendingFilesByModel(p => ({ ...p, [uploadPopoverModel.id]: toUse }));
            setProgressByModel(p => ({ ...p, [uploadPopoverModel.id]: 5 }));

            // Adicionar arquivos ao queue principal (evitando duplicados)
            setArquivosEntrada(prev => {
              const existingMain = new Set(prev.map(f => `${f.name}:${f.size}`));
              const toAdd = toUse.filter(f => !existingMain.has(`${f.name}:${f.size}`));
              const next = toAdd.length > 0 ? [...prev, ...toAdd] : prev;
              // Aguarda um tick para garantir que arquivos foram aplicados
              setTimeout(() => {
                selecionarModelo(uploadPopoverModel);
                // Passar os arquivos adicionados (ou o conjunto toUse quando não há new additions)
                const arquivosParaProcessar = toAdd.length > 0 ? toAdd : toUse;
                processarArquivos(uploadPopoverModel.id, arquivosParaProcessar);
              }, 60);
              return next;
            });
          }
        }
        return;
      }
      // popover fechado — colar nos arquivos de entrada padrão
      handlePasteArquivos(e);
    };
    
    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [handlePasteArquivos, uploadPopoverAnchor]);

  // ============ RENDERIZAÇÃO ============

  return (
    <>
      <Head>
        <title>OCR Inteligente - Organizador de Documentos</title>
        <style>{`
          :root {
            --ocr-primary: #1565c0;
            --ocr-primary-light: #1976d2;
            --ocr-success: #2e7d32;
            --ocr-success-light: #4caf50;
            --ocr-bg: #f8fafc;
            --ocr-card-bg: #ffffff;
            --ocr-border: #e2e8f0;
            --ocr-text: #1e293b;
            --ocr-text-secondary: #64748b;
            --ocr-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
            --ocr-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
          }
          
          /* Animação de pulse para alertas urgentes */
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          .ocr-page {
            min-height: 100vh;
            background: var(--ocr-bg);
          }
          
          .ocr-main-scroll {
            height: calc(100vh - 64px);
            overflow-y: auto;
            overflow-x: hidden;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
          
          .ocr-main-scroll::-webkit-scrollbar {
            width: 8px;
          }
          
          .ocr-main-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          
          .ocr-main-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          
          .ocr-main-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          
          .ocr-card {
            background: var(--ocr-card-bg);
            border-radius: 16px;
            box-shadow: var(--ocr-shadow);
            border: 1px solid var(--ocr-border);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .ocr-card:hover {
            box-shadow: var(--ocr-shadow-lg);
          }
          
          .ocr-upload-zone {
            border: 2px dashed #cbd5e1;
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          }
          
          .ocr-upload-zone:hover {
            border-color: var(--ocr-primary);
            background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
          }
          
          .ocr-upload-zone.active {
            border-color: var(--ocr-success);
            background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
          }
          
          .ocr-btn-primary {
            background: linear-gradient(135deg, var(--ocr-primary) 0%, var(--ocr-primary-light) 100%);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 12px 24px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 14px rgba(21, 101, 192, 0.3);
          }
          
          .ocr-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(21, 101, 192, 0.4);
          }
          
          .ocr-btn-success {
            background: linear-gradient(135deg, var(--ocr-success) 0%, var(--ocr-success-light) 100%);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 12px 24px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 14px rgba(46, 125, 50, 0.3);
          }
          
          .ocr-btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(46, 125, 50, 0.4);
          }
          
          .ocr-stepper {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 16px;
            flex-wrap: wrap;
          }
          
          .ocr-step {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            border-radius: 40px;
            transition: all 0.24s ease;
            cursor: default;
            min-width: fit-content;
          }

          .ocr-step.active {
            background: linear-gradient(135deg, var(--ocr-primary) 0%, var(--ocr-primary-light) 100%);
            color: white;
            box-shadow: 0 3px 12px rgba(21, 101, 192, 0.22);
          }

          .ocr-step.completed {
            background: linear-gradient(135deg, var(--ocr-success) 0%, var(--ocr-success-light) 100%);
            color: white;
          }

          .ocr-step.pending {
            background: #e2e8f0;
            color: #64748b;
          }

          .ocr-step-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 12px;
          }
          .ocr-step.pending .ocr-step-number {
            background: #cbd5e1;
            color: #64748b;
          }
          
          .ocr-table-container {
            border-radius: 4px;
            overflow: hidden;
            border: none;
            width: 100%;
          }

          .ocr-table-container::-webkit-scrollbar {
            height: 8px;
          }

          .ocr-table-container::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.08);
          }
          
          @media (max-width: 768px) {
            .ocr-step-label { display: none; }
            .ocr-step { padding: 8px 12px; }
            .ocr-upload-zone { padding: 20px; }
          }
          
          @media (max-width: 480px) {
            .ocr-stepper { gap: 4px; }
            .ocr-step { padding: 6px 10px; }
            .ocr-step-number { width: 24px; height: 24px; font-size: 12px; }
          }
        `}</style>
      </Head>
       
      <div className={classes.ocrPage}>
        <div className={classes.ocrMainScroll}>
          <div style={{ width: '100%', margin: 0 }}>
            <div style={{ paddingLeft: isMobile ? 12 : 24, paddingRight: isMobile ? 12 : 24, paddingTop: 12, paddingBottom: 12 }}>

              {/* ─── Cabeçalho compacto ──────────────────────────────── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                    <Description size={14} />
                  </div>
                  <Typography style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem', lineHeight: 1 }}>
                    OCR Inteligente
                  </Typography>
                  <Typography style={{ color: '#94a3b8', fontSize: '0.78rem', display: isMobile ? 'none' : 'block' }}>
                    — extraia e organize dados de documentos
                  </Typography>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Chip label={`${modelosSalvos.length} modelos`} size="small" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
                  {dadosExtraidos.length > 0 && (
                    <Chip label={`${dadosExtraidos.length} registros`} size="small" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
                  )}
                </div>
              </div>

              {/* Mensagem de feedback */}
              {mensagem && (
                <Paper 
                  className={
                    mensagem?.tipo === 'success' ? classes.alertSuccess :
                    mensagem?.tipo === 'error' ? classes.alertError :
                    classes.alertInfo
                  } 
                >
                  <Typography>{mensagem?.texto}</Typography>
                </Paper>
              )}



              {/* Layout principal: painel de modelos full-width */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <Tabs
                      value={tabAtiva}
                      onChange={(_: React.SyntheticEvent, v: number) => setTabAtiva(v)}
                      style={{ minHeight: 36 }}
                    >
                      <Tab label="Modelos" style={{ minHeight: 36, padding: '4px 14px', fontSize: '0.8rem', minWidth: 0 }} />
                      <Tab label="Finalizadas" style={{ minHeight: 36, padding: '4px 14px', fontSize: '0.8rem', minWidth: 0 }} />
                      <Tab label="Criar Novo" style={{ minHeight: 36, padding: '4px 14px', fontSize: '0.8rem', minWidth: 0 }} />
                    </Tabs>
                    {modeloSelecionado && (
                      <Chip
                        label={modeloSelecionado.nome}
                        size="small"
                        icon={<CheckCircle size={11} />}
                        style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.68rem', height: 22, maxWidth: 200 }}
                      />
                    )}
                  </div>

                {/* Tab: Modelos Salvos */}
                {tabAtiva === 0 && (
                  <div>
                    {modelosSalvos.length === 0 ? (
                      <div className={classes.emptyState}>
                        <FolderOpen size={28} style={{ color: '#94a3b8', marginBottom: 8 }} />
                        <Typography variant="subtitle2" style={{ color: '#64748b', marginBottom: 4 }}>
                          Nenhum modelo salvo
                        </Typography>
                        <Typography variant="body2" style={{ color: '#94a3b8', marginBottom: 12, fontSize: '0.8rem' }}>
                          Crie um novo modelo ou importe de um arquivo Excel/CSV
                        </Typography>
                        <Button 
                          variant="outlined" 
                          onClick={() => setTabAtiva(1)}
                          startIcon={<Add />}
                        >
                          Criar Novo Modelo
                        </Button>
                      </div>
                    ) : (
                      <div ref={modelsGridRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: gridGap }}>
                        {modelosSalvos.map(modelo => (
                          <div key={modelo.id} style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>
                            <Paper
                              elevation={0}
                              className={classes.modelCardFixed}
                              style={{
                              padding: isMobile ? 7 : 9,
                              marginBottom: 0,
                              border: modeloSelecionado?.id === modelo.id
                                ? '2px solid #1976d2'
                                : '1px solid #e6eef8',
                              borderRadius: 10,
                              cursor: 'pointer',
                              transition: 'all 0.18s ease',
                              background: modeloSelecionado?.id === modelo.id 
                                ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                                : '#fff',
                              ...(modeloSelecionado?.id === modelo.id ? { boxShadow: '0 6px 18px rgba(16,24,40,0.04)' } : { boxShadow: 'none' }),
                              width: '100%',
                              height: '100%'
                            }}
                            onClick={() => selecionarModelo(modelo)}
                          >
                            <div className={classes.cardTop}>
                              <div className={classes.cardTitleWrap}>
                                <div style={{ padding: 5, borderRadius: 8, background: modeloSelecionado?.id === modelo.id ? '#1976d2' : '#e2e8f0', color: modeloSelecionado?.id === modelo.id ? '#fff' : '#64748b', flexShrink: 0 }}>
                                  <InsertDriveFile size={14} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Typography variant="subtitle1" className={classes.modelName} title={modelo.nome}>
                                      {modelo.nome}{modelo.codigoAcesso ? ` (${modelo.codigoAcesso})` : ''}
                                    </Typography>
                                    {modeloSelecionado?.id === modelo.id && (
                                      <CheckCircle size={isMobile ? 16 : 18} style={{ color: '#1976d2' }} />
                                    )}
                                    {modelo.mapeamentosSalvos && modelo.mapeamentosSalvos.length > 0 && (
                                      <Tooltip title={`${modelo.mapeamentosSalvos.length} mapeamentos salvos`}>
                                        <Settings size={isMobile ? 14 : 16} className={classes.hideOnSm} style={{ color: '#4caf50' }} />
                                      </Tooltip>
                                    )}
                                    {/* Ícone de Relógio com Status de Vencimento */}
                                    {(() => {
                                      const statusVenc = getStatusVencimentoModelo(modelo);
                                      if (statusVenc.status === 'sem') return null;
                                      
                                      const tooltipText = statusVenc.status === 'vencido'
                                        ? `⚠️ VENCIDO! ${statusVenc.proximaNotificacao?.descricao || 'Item'} - ${formatarDataBR(statusVenc.proximaNotificacao?.dataVencimento || '')}`
                                        : `🔔 ${statusVenc.diasRestantes} dia(s) para vencer - ${statusVenc.proximaNotificacao?.descricao || 'Item'}`;
                                      
                                      return (
                                        <Tooltip title={tooltipText}>
                                          <div className={classes.hideOnSm} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '2px 7px',
                                            borderRadius: 10,
                                            backgroundColor: statusVenc.status === 'vencido' ? '#ffebee' :
                                                           statusVenc.status === 'vermelho' ? '#ffebee' :
                                                           statusVenc.status === 'amarelo' ? '#fff8e1' : '#e8f5e9',
                                            animation: statusVenc.diasRestantes <= 2 ? 'pulse 1.5s infinite' : 'none'
                                          }}>
                                            <Schedule style={{
                                              fontSize: 14,
                                              color: getCorStatus(statusVenc.status)
                                            }} />
                                            <Typography variant="caption" style={{ 
                                              fontSize: 12, 
                                              fontWeight: 700,
                                              color: getCorStatus(statusVenc.status)
                                            }}>
                                              {statusVenc.status === 'vencido' ? 'VENCIDO' : `${statusVenc.diasRestantes}d`}
                                            </Typography>
                                          </div>
                                        </Tooltip>
                                      );
                                    })()}
                                  </div>
                                  <Typography className={classes.modelCaption}>
                                    {modelo.colunas.length} colunas
                                    {modelo.mapeamentosSalvos && modelo.mapeamentosSalvos.length > 0 && (
                                      <span style={{ color: '#4caf50', marginLeft: 8 }}>
                                        • {modelo.mapeamentosSalvos.length} mapeamentos
                                      </span>
                                    )}
                                    {modelo.notificacoes && modelo.notificacoes.length > 0 && (
                                      <span style={{ color: '#ff9800', marginLeft: 8 }}>
                                        • {modelo.notificacoes.length} alerta(s)
                                      </span>
                                    )}
                                  </Typography>
                                </div>
                              </div>

                              <div className={classes.cardActions}>
                                <Tooltip title="Editar modelo">
                                  <IconButton
                                    size="small"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setEditingModelId(modelo.id);
                                      setEditingModelData({
                                        nome: modelo.nome,
                                        codigoAcesso: modelo.codigoAcesso,
                                        colunas: [...modelo.colunas],
                                        mapeamentosSalvos: [...(modelo.mapeamentosSalvos || [])],
                                      });
                                    }}
                                    style={{ color: '#1976d2' }}
                                    className={classes.hideOnMd}
                                  >
                                    <Edit size={14} />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Duplicar modelo">
                                  <IconButton
                                    size="small"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setDuplicatingModel(modelo);
                                      setDuplicateName(`Cópia de ${modelo.nome}`);
                                      setDuplicateDialogOpen(true);
                                    }}
                                    style={{ color: '#64748b' }}
                                    className={classes.hideOnMd}
                                  >
                                    <FileCopy size={14} />
                                  </IconButton>
                                </Tooltip>

                                {/* Enviar Documentos */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <IconButton size="small" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setUploadPopoverAnchor(e.currentTarget as HTMLElement); setUploadPopoverModel(modelo); setUploadPopoverFiles([]); }} className={classes.compactIconButton}>
                                    <CloudUpload size={14} />
                                  </IconButton>
                                </div>

                                {/* Finalizar planilha */}
                                <Tooltip title="Finalizar planilha">
                                  <IconButton
                                    size="small"
                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); finalizarPlanilha(modelo); }}
                                    style={{ color: '#16a34a' }}
                                    className={classes.hideOnMd}
                                  >
                                    {finalizandoModeloId === modelo.id ? <CircularProgress size={14} /> : <Description size={14} />}
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title={empresaSelecionadaPorModelo[modelo.id] ? `Empresa: ${empresaSelecionadaPorModelo[modelo.id].nome} — clique para trocar` : 'Vincular empresa SGDW'}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); abrirEmpresaDialog(modelo.id); }}
                                      style={{ color: empresaSelecionadaPorModelo[modelo.id] ? '#1976d2' : '#64748b' }}
                                    >
                                      {empresaCarregandoModeloId === modelo.id
                                        ? <CircularProgress size={14} />
                                        : <Business size={14} />}
                                    </IconButton>
                                  </span>
                                </Tooltip>

                                {empresaSelecionadaPorModelo[modelo.id] && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                                    <select
                                      value={sgdwMes}
                                      onChange={e => {
                                        const m = Number(e.target.value);
                                        setSgdwMes(m);
                                        recarregarSgdw(modelo, sgdwAno, m);
                                      }}
                                      style={{ fontSize: '0.72rem', padding: '2px 4px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e40af', fontWeight: 600, cursor: 'pointer', maxWidth: 60 }}
                                    >
                                      {MESES_NOTA.map((m, i) => (
                                        <option key={i} value={i + 1}>{m.slice(0, 3)}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={sgdwAno}
                                      onChange={e => {
                                        const a = Number(e.target.value);
                                        setSgdwAno(a);
                                        recarregarSgdw(modelo, a, sgdwMes);
                                      }}
                                      style={{ fontSize: '0.72rem', padding: '2px 4px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e40af', fontWeight: 600, cursor: 'pointer', maxWidth: 56 }}
                                    >
                                      {[0, 1, 2].map(offset => {
                                        const y = new Date().getFullYear() - offset;
                                        return <option key={y} value={y}>{y}</option>;
                                      })}
                                    </select>
                                    <Tooltip title={`Recarregar ${MESES_NOTA[sgdwMes - 1]}/${sgdwAno} do SGDW`}>
                                      <span>
                                        <IconButton
                                          size="small"
                                          onClick={() => recarregarSgdw(modelo)}
                                          style={{ color: '#059669' }}
                                        >
                                          {empresaCarregandoModeloId === modelo.id
                                            ? <CircularProgress size={16} />
                                            : <Refresh size={14} />}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </div>
                                )}

                                <Tooltip title="Excluir modelo">
                                  <IconButton
                                    size="small"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setModeloParaExcluir(modelo.id);
                                      setDialogConfirmacao(true);
                                    }}
                                    style={{ color: '#94a3b8' }}
                                    className={classes.hideOnMd}
                                  >
                                    <Delete size={14} />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            </div>
                            {modeloSelecionado?.id === modelo.id && (
                              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {modelo.colunas.slice(0, 6).map((col, i) => (
                                  <Chip
                                    key={i}
                                    label={col}
                                    size="small"
                                    style={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                ))}
                                {modelo.colunas.length > 6 && (
                                  <Chip
                                    label={`+${modelo.colunas.length - 6}`}
                                    size="small"
                                    style={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                )}
                              </div>
                            )}
                            {empresaSelecionadaPorModelo[modelo.id] && (
                              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Chip
                                  icon={<Business size={14} />}
                                  label={empresaSelecionadaPorModelo[modelo.id].nome}
                                  size="small"
                                  style={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600, fontSize: 11 }}
                                />
                                <Tooltip title="Desvincular empresa">
                                  <IconButton
                                    size="small"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setEmpresaSelecionadaPorModelo(prev => {
                                        const next = { ...prev };
                                        delete next[modelo.id];
                                        lsSaveEmpresas(next);
                                        return next;
                                      });
                                      setModelosSalvos(prev => prev.map(m => m.id === modelo.id ? { ...m, empresaVinculada: null } : m));
                                      if (modelo.firestoreId) {
                                        rtdbUpdate(rtdbRef(rtdb, `modelos-nota/${modelo.firestoreId}`), { empresaVinculada: null })
                                          .catch(err => console.warn('Firebase RTDB empresaVinculada remove falhou', err));
                                      }
                                    }}
                                    style={{ color: '#94a3b8', padding: 2 }}
                                  >
                                    <Close size={14} />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            )}

                            {/* Pending files and progress (appear when user pastes files for this model) */}
                            {pendingFilesByModel[modelo.id] && pendingFilesByModel[modelo.id].length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                  {pendingFilesByModel[modelo.id].map((f, idx) => (
                                    <Chip key={idx} label={f.name} size="small" style={{ maxWidth: 220 }} />
                                  ))}
                                  <div style={{ flex: 1 }} />
                                  <Typography variant="caption" color="textSecondary">{(progressByModel[modelo.id] || (modeloSelecionado?.id === modelo.id ? progresso : 0)) + '%'} </Typography>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                  <LinearProgress variant="determinate" value={progressByModel[modelo.id] || (modeloSelecionado?.id === modelo.id ? progresso : 0)} />
                                </div>
                              </div>
                            )}

                            {/* Editor inline para o modelo (nome e colunas) */}
                            {editingModelId === modelo.id && editingModelData && (
                              <Paper elevation={0} style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#f8fafc' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                                  <TextField
                                    label="Nome do modelo"
                                    size="small"
                                    value={editingModelData.nome}
                                    onChange={(e) => setEditingModelData({ ...editingModelData, nome: e.target.value })}
                                    style={{ flex: 1 }}
                                  />
                                  <TextField
                                    label="Código de acesso"
                                    size="small"
                                    value={editingModelData.codigoAcesso || ''}
                                    onChange={(e) => setEditingModelData({ ...editingModelData, codigoAcesso: e.target.value })}
                                    style={{ flex: 1 }}
                                  />
                                  <Button size="small" variant="outlined" onClick={() => { setEditingModelId(null); setEditingModelData(null); }}>
                                    Cancelar
                                  </Button>
                                  <Button size="small" color="primary" variant="contained" onClick={async () => {
                                    if (!editingModelData) return;
                                    try {
                                      const mapeamentosSalvosAtualizados = reconciliarMapeamentosSalvosComColunas(
                                        editingModelData.colunas,
                                        editingModelData.mapeamentosSalvos || modelo.mapeamentosSalvos || []
                                      );
                                      const updated = modelosSalvos.map(m => m.id === modelo.id ? {
                                        ...m,
                                        nome: editingModelData.nome,
                                        codigoAcesso: editingModelData.codigoAcesso,
                                        colunas: editingModelData.colunas,
                                        mapeamentosSalvos: mapeamentosSalvosAtualizados,
                                      } : m);
                                      setModelosSalvos(updated);
                                      if (modeloSelecionado?.id === modelo.id) {
                                        await selecionarModelo({
                                          ...modeloSelecionado,
                                          nome: editingModelData.nome,
                                          codigoAcesso: editingModelData.codigoAcesso,
                                          colunas: editingModelData.colunas,
                                          mapeamentosSalvos: mapeamentosSalvosAtualizados,
                                        });
                                      }
                                      // Persistir no localStorage (fonte de verdade após refresh)
                                      if (modelo.firestoreId) {
                                        lsPatch(modelo.firestoreId, {
                                          nome: editingModelData.nome,
                                          codigoAcesso: editingModelData.codigoAcesso,
                                          colunas: editingModelData.colunas,
                                          mapeamentosSalvos: mapeamentosSalvosAtualizados,
                                        });
                                      }
                                      // Atualizar no Firestore se tiver firestoreId
                                      if (modelo.firestoreId) {
                                        await updateDoc(doc(db, 'notas', modelo.firestoreId), {
                                          nome: editingModelData.nome,
                                          codigoAcesso: editingModelData.codigoAcesso,
                                          colunas: editingModelData.colunas,
                                          mapeamentosSalvos: mapeamentosSalvosAtualizados,
                                          atualizadoEm: serverTimestamp(),
                                        } as any);
                                      }
                                      setEditingModelId(null);
                                      setEditingModelData(null);
                                      mostrarMensagem('Modelo atualizado com sucesso', 'success');
                                    } catch (err) {
                                      console.warn('Erro ao atualizar modelo:', err);
                                      mostrarMensagem('Erro ao atualizar modelo', 'error');
                                    }
                                  }}>
                                    Salvar
                                  </Button>
                                </div>

                                <div style={{ marginBottom: 8 }}>
                                  <Typography variant="caption">Colunas (arraste para reordenar):</Typography>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }} onDragOver={(e) => e.preventDefault()}>
                                    {editingModelData.colunas.map((c, idx) => (
                                      <div
                                        key={c + idx}
                                        draggable={editingColIndex === null}
                                        onDragStart={(e) => { if (editingColIndex === null) e.dataTransfer?.setData('text/plain', String(idx)); }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          const from = Number(e.dataTransfer.getData('text/plain'));
                                          const to = idx;
                                          if (isNaN(from)) return;
                                          const cols = [...editingModelData.colunas];
                                          const [moved] = cols.splice(from, 1);
                                          cols.splice(to, 0, moved);
                                          setEditingModelData({ ...editingModelData, colunas: cols });
                                        }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                      >
                                        {editingColIndex === idx ? (
                                          <TextField
                                            size="small"
                                            value={editingColValue}
                                            autoFocus
                                            onChange={(e) => setEditingColValue(e.target.value)}
                                            onBlur={() => salvarEdicaoColuna(idx)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') salvarEdicaoColuna(idx);
                                              if (e.key === 'Escape') { setEditingColIndex(null); setEditingColValue(''); }
                                            }}
                                            style={{ minWidth: 160 }}
                                          />
                                        ) : (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onDoubleClick={() => { setEditingColIndex(idx); setEditingColValue(c); }}>
                                            <Chip label={c} onDelete={() => setEditingModelData({ ...editingModelData, colunas: editingModelData.colunas.filter((_, i) => i !== idx) })} />
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingColIndex(idx); setEditingColValue(c); }}>
                                              <Edit size={18} />
                                            </IconButton>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                  <TextField size="small" placeholder="Adicionar coluna" value={novaColuna} onChange={(e) => setNovaColuna(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { if (novaColuna.trim()) { setEditingModelData({ ...editingModelData, colunas: [...editingModelData.colunas, novaColuna.trim()] }); setNovaColuna(''); } } }} style={{ flex: 1 }} />
                                  <Button size="small" onClick={() => { if (novaColuna.trim() && editingModelData) { setEditingModelData({ ...editingModelData, colunas: [...editingModelData.colunas, novaColuna.trim()] }); setNovaColuna(''); } }} startIcon={<Add />}>Adicionar</Button>
                                </div>

                              </Paper>
                            )}
                          </Paper>
                          </div>
                        ))}

                        {/* Popover de upload para Enviar Documentos no card do modelo */}
                        <Popover
                          open={Boolean(uploadPopoverAnchor)}
                          anchorEl={uploadPopoverAnchor}
                          onClose={() => { setUploadPopoverAnchor(null); setUploadPopoverModel(null); setUploadPopoverFiles([]); }}
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >

                          <div style={{ width: 360, padding: 16 }} onDrop={handleDropInPopover} onDragOver={(e) => e.preventDefault()}>
                            <input
                              ref={uploadPopoverInputRef}
                              type="file"
                              accept=".pdf,image/*,.csv,.xlsx,.xls"
                              multiple
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setUploadPopoverFiles(files);
                                if (e.target) (e.target as HTMLInputElement).value = '';
                              }}
                            />

                            {/* Zona de arrastar/e colar dentro do popover */}
                            <div className={arquivosEntrada.length > 0 ? classes.uploadZoneActive : classes.uploadZoneInactive} style={{ padding: 12, width: '100%', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <CloudUpload size={40} style={{ color: '#1976d2' }} />
                                <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
                                  Enviar Documentos
                                </Typography>
                                <Typography variant="body2" color="textSecondary" style={{ textAlign: 'center' }}>
                                  Faça upload dos arquivos para processamento OCR
                                </Typography>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                  <Button size="small" variant="outlined" onClick={() => uploadPopoverInputRef.current?.click()} startIcon={<Add />}>
                                    Selecionar
                                  </Button>
                                  <Button size="small" variant="contained" color="primary" onClick={async () => {
                                    if (!uploadPopoverModel) return;
                                    // Mostrar arquivos pendentes no card do modelo imediatamente
                                    setPendingFilesByModel(p => ({ ...p, [uploadPopoverModel.id]: uploadPopoverFiles }));
                                    setProgressByModel(p => ({ ...p, [uploadPopoverModel.id]: 5 }));
                                    setArquivosEntrada(uploadPopoverFiles);
                                    selecionarModelo(uploadPopoverModel);
                                    setUploadPopoverAnchor(null);
                                    // aguardar um tick para garantir que o modelo foi selecionado
                                    setTimeout(() => processarArquivos(uploadPopoverModel.id, uploadPopoverFiles), 50);
                                  }} disabled={uploadPopoverFiles.length === 0} startIcon={<CloudUpload />}>
                                    Enviar e Processar
                                  </Button>
                                  <Button size="small" variant="outlined" onClick={() => { setUploadPopoverAnchor(null); setUploadPopoverModel(null); setUploadPopoverFiles([]); }}>
                                    Cancelar
                                  </Button>
                                </div>
                                {uploadPopoverFiles.length > 0 && (
                                  <div style={{ marginTop: 12, width: '100%' }}>
                                    {uploadPopoverFiles.map((f, idx) => (
                                      <Chip key={idx} label={f.name} size="small" style={{ marginRight: 6, marginBottom: 6, maxWidth: '100%' }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Popover>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Planilhas Finalizadas */}
                {tabAtiva === 1 && (
                  <div ref={planilhasTabRef}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TableChart style={{ color: '#1976d2' }} />
                        <div>
                          <Typography variant="subtitle1" style={{ fontWeight: 600 }}>Planilhas Finalizadas</Typography>
                          <Typography variant="caption" style={{ color: '#64748b' }}>{planilhasFinalizadas.length} registro(s)</Typography>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Button size="small" variant="outlined" onClick={carregarPlanilhasFinalizadas} startIcon={<Refresh />}>Atualizar</Button>
                      </div>
                    </div>

                    <Paper style={{ borderRadius: 8, padding: 12 }}>
                      {planilhasLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}><CircularProgress size={24} /></div>
                      ) : (
                        planilhasFinalizadas.length === 0 ? (
                          <Typography color="textSecondary">Nenhuma planilha finalizada encontrada.</Typography>
                        ) : (
                          <>
                            <TableContainer style={{ maxHeight: 320 }}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell style={{ width: 50, fontWeight: 700 }}>#</TableCell>
                                    <TableCell style={{ fontWeight: 700 }}>Nome</TableCell>
                                    <TableCell style={{ fontWeight: 700, width: 140, textAlign: 'center' }}>Data</TableCell>
                                    <TableCell style={{ fontWeight: 700, width: 140, textAlign: 'center' }}>Ações</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {planilhasFinalizadas.slice(planilhasPage * PLANILHAS_PER_PAGE, (planilhasPage + 1) * PLANILHAS_PER_PAGE).map((p, idx) => {
                                    const createdIso = p.criadoEm && typeof p.criadoEm === 'number' ? new Date(p.criadoEm).toISOString().slice(0,10) : (p.criadoEm || '');
                                    const fileUrl = p.url || p.fileUrl || p.downloadUrl || p.link;

                                    // Tentar extrair "empresa/cliente" do primeiro registro salvo (fallback para modeloNome/nome)
                                    const firstRow = Array.isArray(p.dados) && p.dados.length ? p.dados[0] : null;
                                    const foundCompanyKey = firstRow && typeof firstRow === 'object' ? Object.keys(firstRow).find(k => /empresa|cliente|fornecedor|razao|nome|empresa_nome/i.test(k)) : null;
                                    const companyName = (foundCompanyKey && firstRow) ? (firstRow[foundCompanyKey] || '') : (p.modeloNome || p.nome || '');

                                    return (
                                      <React.Fragment key={p.id || idx}>
                                        <TableRow hover>
                                          <TableCell>{planilhasPage * PLANILHAS_PER_PAGE + idx + 1}</TableCell>
                                          <TableCell style={{ maxWidth: 420 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.modeloNome || p.nome || p.id}</span>
                                              <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</span>
                                            </div>
                                          </TableCell>
                                          <TableCell style={{ textAlign: 'center' }}>{createdIso ? formatarDataBR(createdIso) : ''}</TableCell>
                                          <TableCell style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 6 }}>
                                            {fileUrl ? (
                                              <Button size="small" variant="outlined" color="primary" href={fileUrl} target="_blank" rel="noopener noreferrer">Abrir</Button>
                                            ) : (
                                              <Button size="small" variant="outlined" disabled>Sem arquivo</Button>
                                            )}

                                            {/* Visualizar no Preview principal */}
                                            <Tooltip title="Visualizar no Preview">
                                              <IconButton size="small" onClick={() => { setSelectedPlanilhaFinalizada(p); setShowPreview(true); setTabAtiva(1); setExpandedPlanilhaId(p.id || String(idx)); setTimeout(() => { document.getElementById('preview-dados-organizados')?.scrollIntoView({ behavior: 'smooth' }); }, 120); }}>
                                                <Visibility size={18} />
                                              </IconButton>
                                            </Tooltip>

                                            {/* Baixar como Excel */}
                                            <Tooltip title="Baixar Excel">
                                              <IconButton data-ignore-preview-close size="small" onClick={() => exportarPlanilhaFinalizada(p)}>
                                                <GetApp size={18} />
                                              </IconButton>
                                            </Tooltip>

                                            {/* Editar planilha */}
                                            <Tooltip title="Editar planilha">
                                              <IconButton size="small" onClick={() => { setPlanilhaEditing(p); setEditPlanilhaName(p.nome || p.modeloNome || ''); setEditPlanilhaOpen(true); }}>
                                                <Edit size={18} />
                                              </IconButton>
                                            </Tooltip>

                                            {/* Remover planilha */}
                                            <Tooltip title="Remover planilha">
                                              <IconButton size="small" onClick={async () => {
                                                if (!p.id) return;
                                                if (!window.confirm('Remover esta planilha finalizada? Esta ação é irreversível.')) return;
                                                try {
                                                  await deleteDoc(doc(db, 'PlanilhasFinalizadas', p.id));
                                                  setPlanilhasFinalizadas(prev => prev.filter(x => x.id !== p.id));
                                                  mostrarMensagem('Planilha removida', 'success');
                                                } catch (err) {
                                                  console.warn('Erro ao remover planilha finalizada', err);
                                                  mostrarMensagem('Erro ao remover planilha', 'error');
                                                }
                                              }}>
                                                <Delete size={18} />
                                              </IconButton>
                                            </Tooltip>

                                            <IconButton size="small" onClick={() => setExpandedPlanilhaId(expandedPlanilhaId === (p.id || String(idx)) ? null : (p.id || String(idx)))}>
                                              {expandedPlanilhaId === (p.id || String(idx)) ? <ExpandLess /> : <ExpandMore />}
                                            </IconButton>
                                          </TableCell>
                                        </TableRow>

                                        {/* Linha expansível com preview individual */}
                                        <TableRow>
                                          <TableCell style={{ padding: 0, borderBottom: 'none' }} colSpan={4}>
                                            <Collapse in={expandedPlanilhaId === (p.id || String(idx))} timeout="auto" unmountOnExit>
                                              <div style={{ padding: 12 }}>
                                                {/* Renderizar mini-preview da planilha (até 8 linhas) */}
                                                {Array.isArray(p.dados) && p.dados.length > 0 ? (
                                                  <Table size="small">
                                                    <TableHead>
                                                      <TableRow>
                                                        {(Array.isArray(p.campos) && p.campos.length ? p.campos : Object.keys(p.dados[0] || {})).slice(0, 10).map((h: string, hi: number) => (
                                                          <TableCell key={hi} style={{ fontWeight: 700, padding: '6px 8px' }}>{h}</TableCell>
                                                        ))}
                                                      </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                      {p.dados.slice(0, 8).map((row: any, rIdx: number) => (
                                                        <TableRow key={rIdx}>
                                                          {(Array.isArray(p.campos) && p.campos.length ? p.campos : Object.keys(p.dados[0] || {})).slice(0, 10).map((col: string, cidx: number) => {
                                                            const raw = row[col] !== undefined ? row[col] : row[Object.keys(row)[cidx]] || '';
                                                            const meta = {} as any;
                                                            // reutilizar parse/format quando possível
                                                            let display = raw;
                                                            try {
                                                              const parsed = parseAndFormatValue(String(raw || ''), col);
                                                              display = parsed.formatted ?? (parsed.value !== null ? formatarTotalColuna(parsed.value, true) : raw);
                                                            } catch (err) {
                                                              display = raw;
                                                            }
                                                            return <TableCell key={cidx} style={{ padding: '6px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</TableCell>;
                                                          })}
                                                        </TableRow>
                                                      ))}
                                                    </TableBody>
                                                  </Table>
                                                ) : (
                                                  <Typography variant="caption" color="textSecondary">Sem dados para preview</Typography>
                                                )}
                                              </div>
                                            </Collapse>
                                          </TableCell>
                                        </TableRow>
                                      </React.Fragment>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                              <div style={{ color: '#64748b' }}>
                                Página {planilhasFinalizadas.length ? (planilhasPage + 1) : 0} de {Math.max(1, Math.ceil(planilhasFinalizadas.length / PLANILHAS_PER_PAGE))}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="small" onClick={() => setPlanilhasPage(p => Math.max(0, p - 1))} disabled={planilhasPage === 0}>Anterior</Button>
                                <Button size="small" onClick={() => setPlanilhasPage(p => Math.min(Math.ceil(planilhasFinalizadas.length / PLANILHAS_PER_PAGE) - 1, p + 1))} disabled={(planilhasPage + 1) * PLANILHAS_PER_PAGE >= planilhasFinalizadas.length}>Próximo</Button>
                              </div>
                            </div>
                          </>
                        )
                      )}
                    </Paper>
                  </div>
                )}

                {/* Tab: Criar Novo Modelo */}
                {tabAtiva === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* Seção 1: Arquivo */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: '#1565c0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                        <Typography style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>Arquivo Modelo</Typography>
                        <Typography style={{ color: '#94a3b8', fontSize: '0.72rem' }}>— Excel/CSV como referência de colunas (opcional)</Typography>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                        <div
                          className={`ocr-upload-zone ${arquivoModelo ? 'active' : ''}`}
                          onDrop={handleDropModelo}
                          onDragOver={(e: React.DragEvent) => e.preventDefault()}
                          onClick={() => inputModeloRef.current?.click()}
                          style={{ padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
                        >
                          <input ref={inputModeloRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) processarArquivoModelo(f); }} />
                          <CloudUpload size={14} style={{ color: arquivoModelo ? '#4caf50' : '#94a3b8', flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Typography style={{ fontSize: '0.78rem', fontWeight: 600, color: arquivoModelo ? '#16a34a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {arquivoModelo ? arquivoModelo.name : 'Arquivo modelo (.xlsx / .csv)'}
                            </Typography>
                            {!arquivoModelo && <Typography style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Colunas detectadas automaticamente</Typography>}
                          </div>
                          {arquivoModelo && (
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setArquivoModelo(null); setLinhasPreview([]); setColunasNovoModelo([]); }} style={{ padding: 2, flexShrink: 0 }}>
                              <Delete style={{ fontSize: 13, color: '#f44336' }} />
                            </IconButton>
                          )}
                        </div>
                        <div
                          className={`ocr-upload-zone ${arquivoMarcaModelo ? 'active' : ''}`}
                          onDrop={handleDropMarcaModelo}
                          onDragOver={(e: React.DragEvent) => e.preventDefault()}
                          onClick={() => inputMarcaModeloRef.current?.click()}
                          style={{ padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
                        >
                          <input ref={inputMarcaModeloRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) processarArquivoMarcaModelo(f); }} />
                          <CloudUpload size={14} style={{ color: arquivoMarcaModelo ? '#4caf50' : '#94a3b8', flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Typography style={{ fontSize: '0.78rem', fontWeight: 600, color: arquivoMarcaModelo ? '#16a34a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {arquivoMarcaModelo ? arquivoMarcaModelo.name : 'Mapa marca/modelo (opcional)'}
                            </Typography>
                            {!arquivoMarcaModelo && <Typography style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Placa → marca/modelo (.xlsx / .csv)</Typography>}
                          </div>
                          {arquivoMarcaModelo && (
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setArquivoMarcaModelo(null); setMarcaModeloMap(null); }} style={{ padding: 2, flexShrink: 0 }}>
                              <Delete style={{ fontSize: 13, color: '#f44336' }} />
                            </IconButton>
                          )}
                        </div>
                      </div>

                      {linhasPreview.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <Typography style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.78rem', marginBottom: 6 }}>Selecione a linha de cabeçalho:</Typography>
                          <TableContainer className="ocr-table-container" style={{ maxHeight: 190 }}>
                            <Table size="small" stickyHeader>
                              <TableBody>
                                {linhasPreview.map((linha, idx) => (
                                  <TableRow key={idx} onClick={() => selecionarLinhaHeader(idx)} style={{ cursor: 'pointer', backgroundColor: linhaHeaderSelecionada === idx ? '#dbeafe' : 'inherit' }}>
                                    <TableCell style={{ width: 38, fontWeight: 700, color: linhaHeaderSelecionada === idx ? '#1565c0' : '#64748b', background: linhaHeaderSelecionada === idx ? '#eff6ff' : '#f8fafc', fontSize: '0.72rem' }}>#{idx + 1}</TableCell>
                                    {linha.slice(0, isMobile ? 3 : 6).map((cell, ci) => (
                                      <TableCell key={ci} style={{ fontSize: '0.73rem', maxWidth: isMobile ? 70 : 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: linhaHeaderSelecionada === idx ? 600 : 400 }}>{cell || '-'}</TableCell>
                                    ))}
                                    {linha.length > (isMobile ? 3 : 6) && <TableCell style={{ fontSize: '0.68rem', color: '#94a3b8' }}>+{linha.length - (isMobile ? 3 : 6)}</TableCell>}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          {linhaHeaderSelecionada >= 0 && colunasNovoModelo.length > 0 && (
                            <Paper className={classes.alertSuccess} style={{ marginTop: 6, borderRadius: 6, padding: '4px 10px' }}>
                              <Typography style={{ fontSize: '0.73rem' }}><strong>Linha {linhaHeaderSelecionada + 1}</strong> — <strong>{colunasNovoModelo.length}</strong> colunas detectadas</Typography>
                            </Paper>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ height: 1, background: '#e2e8f0', margin: '0 0 14px' }} />

                    {/* Seção 2: Colunas */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: '#1565c0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>2</div>
                        <Typography style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>Colunas</Typography>
                        {colunasNovoModelo.length > 0 && <Chip label={`${colunasNovoModelo.length} configuradas`} size="small" style={{ height: 18, fontSize: '0.62rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }} />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <Button variant="outlined" size="small" style={{ borderColor: '#1565c0', color: '#1565c0', textTransform: 'none', fontWeight: 600, borderRadius: 6, fontSize: '0.76rem', padding: '2px 10px' }} onClick={() => setColunasNovoModelo(COLUNAS_PADRAO)}>
                          Usar {COLUNAS_PADRAO.length} colunas padrão
                        </Button>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0', minWidth: 16 }} />
                        <Typography style={{ color: '#94a3b8', fontSize: '0.7rem' }}>ou adicione manualmente</Typography>
                      </div>
                      <div style={{ position: 'relative', marginBottom: colunasNovoModelo.length > 0 ? 8 : 0 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <TextField
                            size="small"
                            placeholder="Nome da coluna (ou serviço SGDW)"
                            value={novaColuna}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const val = e.target.value;
                              setNovaColuna(val);
                              if (val.trim().length >= 1 && servicosSgdw.length > 0) {
                                const termo = val.toLowerCase();
                                const filtradas = servicosSgdw.filter(s => s.toLowerCase().includes(termo)).slice(0, 8);
                                setSugestoesFiltradas(filtradas);
                                setShowSugestoes(filtradas.length > 0);
                              } else { setShowSugestoes(false); }
                            }}
                            onKeyPress={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { adicionarColuna(); setShowSugestoes(false); } }}
                            onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
                            style={{ flex: 1 }}
                            autoComplete="off"
                          />
                          <Button variant="contained" size="small" onClick={() => { adicionarColuna(); setShowSugestoes(false); }} startIcon={<Add style={{ fontSize: 13 }} />} style={{ background: '#1565c0', borderRadius: 6, textTransform: 'none', minWidth: 0, padding: '4px 12px', flexShrink: 0 }}>
                            Add
                          </Button>
                        </div>
                        {showSugestoes && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 60, background: '#fff', border: '1px solid #1976d2', borderTop: 'none', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 1000, maxHeight: 200, overflowY: 'auto' }}>
                            <div style={{ padding: '3px 10px', fontSize: '0.68rem', color: '#1976d2', fontWeight: 600, borderBottom: '1px solid #e3f2fd', background: '#e3f2fd' }}>Serviços SGDW</div>
                            {sugestoesFiltradas.map((s, i) => (
                              <div key={i} onMouseDown={() => { setNovaColuna(s); setShowSugestoes(false); }} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: i < sugestoesFiltradas.length - 1 ? '1px solid #f0f0f0' : 'none' }} onMouseEnter={e => (e.currentTarget.style.background = '#e3f2fd')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {colunasNovoModelo.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          {colunasNovoModelo.map((col, i) => (
                            <Chip key={i} label={col} onDelete={() => removerColuna(i)} size="small" color="primary" variant="outlined" style={{ height: 22, fontSize: '0.7rem' }} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ height: 1, background: '#e2e8f0', margin: '0 0 14px' }} />

                    {/* Seção 3: Identificação */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: '#1565c0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>3</div>
                        <Typography style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>Identificação</Typography>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 8 }}>
                        <TextField size="small" fullWidth label="Nome do modelo" value={nomeNovoModelo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNomeNovoModelo(e.target.value)} />
                        <TextField size="small" fullWidth label="Código de acesso" value={codigoNovoModelo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCodigoNovoModelo(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ height: 1, background: '#e2e8f0', margin: '0 0 14px' }} />

                    {/* Seção 4: Empresa SGDW */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: '#0d9488', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>4</div>
                        <Typography style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>Empresa SGDW</Typography>
                        <Typography style={{ color: '#94a3b8', fontSize: '0.72rem' }}>(opcional)</Typography>
                        {novoModeloEmpresa && (
                          <Chip label={novoModeloEmpresa.NOME} onDelete={() => { setNovoModeloEmpresa(null); }} size="small" icon={<Business style={{ fontSize: 12 }} />} style={{ height: 22, fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, maxWidth: 220 }} />
                        )}
                      </div>
                      {!novoModeloEmpresa ? (
                        <div>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Buscar empresa para vincular..."
                            value={empresaBusca}
                            onChange={e => onEmpresaBuscaChange(e.target.value)}
                            style={{ marginBottom: 6 }}
                            InputProps={{ endAdornment: carregandoEmpresas ? <CircularProgress size={14} /> : null }}
                          />
                          {empresasResultados.length > 0 && (
                            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                              {empresasResultados.map(emp => (
                                <div
                                  key={emp.CLINUMER}
                                  onClick={() => { setNovoModeloEmpresa(emp); setEmpresaBusca(''); setEmpresasResultados([]); }}
                                  style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem', fontWeight: 500 }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                                >
                                  <Business style={{ fontSize: 14, color: '#1976d2', flexShrink: 0 }} />
                                  {emp.NOME}
                                </div>
                              ))}
                            </div>
                          )}
                          {!carregandoEmpresas && empresaBusca.trim() && empresasResultados.length === 0 && (
                            <Typography style={{ fontSize: '0.73rem', color: '#94a3b8', padding: '4px 0' }}>Nenhuma empresa encontrada</Typography>
                          )}
                        </div>
                      ) : (
                        <Typography style={{ fontSize: '0.75rem', color: '#64748b' }}>Empresa vinculada ao modelo após salvar</Typography>
                      )}
                    </div>

                    {/* Botão salvar */}
                    <div style={{ paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        style={{ background: colunasNovoModelo.length === 0 || !nomeNovoModelo.trim() ? undefined : 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)', borderRadius: 8, paddingLeft: 24, paddingRight: 24, fontWeight: 700, textTransform: 'none', fontSize: '0.85rem' }}
                        onClick={salvarModelo}
                        startIcon={<Save style={{ fontSize: 15 }} />}
                        disabled={colunasNovoModelo.length === 0 || !nomeNovoModelo.trim()}
                      >
                        Salvar Modelo
                      </Button>
                      {(colunasNovoModelo.length === 0 || !nomeNovoModelo.trim()) && (
                        <Typography style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {!nomeNovoModelo.trim() ? 'Digite um nome para o modelo' : 'Adicione pelo menos uma coluna'}
                        </Typography>
                      )}
                    </div>
                  </div>
                )}

              
                </div>

               
              </div>

          {/* Mapear Campos - Full-width - Aparece apenas quando um modelo está selecionado */}
          {(modeloSelecionado || selectedPlanilhaFinalizada) && (
          <div id="preview-dados-organizados" style={{ marginTop: 24 }}>
            <Card className="ocr-card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #309b472f 0%, #309b472f 100%)', 
                padding: 11, 
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
              
                
              </div>

              <CardContent style={{ padding: '16px' }}>
               

              

{/* Tabela de mapeamento aprimorada (colapsável) */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TableChart style={{ color: '#1976d2' }} />
                      <Typography variant="subtitle1" style={{ margin: 0, fontWeight: 600 }}>
                        Configuração de Mapeamento
                      </Typography>
                    </div>
                    
                    <div>
                      <Button size="small" variant="text" onClick={() => setMapOpen(prev => !prev)} startIcon={mapOpen ? <ExpandLess /> : <ExpandMore />}>
                        {mapOpen ? 'Ocultar Mapeamento' : 'Mostrar Mapeamento'}
                      </Button>
                    </div>
                  </div>

                  <Collapse in={mapOpen}>
                   <Paper
                  className={classes.alertSuccess}
                  style={{ marginBottom: 24, borderRadius: 8 }}
                >
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <strong>{dadosExtraidos.length}</strong> registros salvos
                    {modeloSelecionado?.dadosSalvos && modeloSelecionado.dadosSalvos.length > 0 && (
                      <span style={{ color: '#4caf50', marginLeft: 8 }}>
                        (persistidos no banco)
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Chip 
                      label={`Modelo: ${modeloSelecionado?.nome}`} 
                      size="small" 
                      color="primary"
                      style={{ fontWeight: 600 }}
                    />
                    {dadosExtraidos.length > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={async () => {
                          if (modeloSelecionado?.firestoreId && window.confirm('Tem certeza que deseja limpar todos os dados extraídos? Esta ação não pode ser desfeita.')) {
                            await salvarDadosExtraidosNoFirebase(modeloSelecionado.firestoreId, [], []);
                            setDadosExtraidos([]);
                            setCamposExtraidos([]);
                            const modeloAtualizado = { ...modeloSelecionado, dadosSalvos: [], camposSalvos: [] };
                            await selecionarModelo(modeloAtualizado);
                            setModelosSalvos(prev => prev.map(m => m.id === modeloSelecionado.id ? modeloAtualizado : m));
                            mostrarMensagem('Dados limpos com sucesso!', 'success');
                          }
                        }}
                        startIcon={<Delete />}
                        style={{ borderColor: '#f44336', color: '#f44336' }}
                      >
                        Limpar Dados
                      </Button>
                    )}
                  </div>
                </span>
                </Paper>
                    <div className="ocr-table-container" style={{ 
                      borderRadius: 8, 
                      border: '1px solid #e0e0e0',
                      overflow: 'hidden'
                    }}>
                      <TableContainer style={{ maxHeight: 350 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell style={{ 
                                fontWeight: 700, 
                                backgroundColor: '#1976d2', 
                                color: '#fff',
                                borderBottom: 'none',
                                width: '30%'
                              }}>
                                Coluna do Modelo
                              </TableCell>
                              <TableCell style={{ 
                                fontWeight: 700, 
                                backgroundColor: '#1976d2', 
                                color: '#fff',
                                borderBottom: 'none',
                                width: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                              }}>
                                <span style={{ flex: 1 }}>Campo Extraído</span>
                                <Tooltip title="Auto-configurar com nome da coluna do modelo">
                                  <IconButton size="small" onClick={() => autoConfigurarPorNomeModelo()} style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.14)' }}>
                                    <Autorenew size={16} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                              <TableCell style={{
                                fontWeight: 700,
                                backgroundColor: '#1976d2',
                                color: '#fff',
                                borderBottom: 'none',
                                width: '22%'
                              }}>
                                Campo SGDW
                              </TableCell>
                              <TableCell style={{
                                fontWeight: 700,
                                backgroundColor: '#1976d2',
                                color: '#fff',
                                borderBottom: 'none',
                                width: '12%',
                                textAlign: 'center'
                              }}>
                                Confiança
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {mapeamentos.map((map, i) => (
                              <TableRow 
                                key={i}
                                style={{ 
                                  backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff'
                                }}
                              >
                                <TableCell>
                                  <Chip 
                                    label={map.colunaModelo} 
                                    color="primary" 
                                    size="small"
                                    style={{ fontWeight: 500 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    select
                                    size="small"
                                    fullWidth
                                    value={map.campoExtraido}
                                    onChange={(e: React.ChangeEvent<{ value: unknown }>) => atualizarMapeamento(map.colunaModelo, e.target.value as string)}
                                    style={{
                                      borderRadius: 8
                                    }}
                                  >
                                    <MenuItem value="">
                                      <em style={{ color: '#999' }}>-- Não mapear --</em>
                                    </MenuItem>

                                    {/* Se o valor atual do mapeamento não estiver na lista de camposExtraidos, adicionamos como opção para exibição */}
                                    {map.campoExtraido && !camposExtraidos.includes(map.campoExtraido) && (
                                      <MenuItem value={map.campoExtraido} key={`current-${map.colunaModelo}`}>
                                        {map.campoExtraido} <em style={{ color: '#777' }}> (coluna do modelo) </em>
                                      </MenuItem>
                                    )}

                                    {camposExtraidos.map(campo => (
                                      <MenuItem key={campo} value={campo}>{campo}</MenuItem>
                                    ))}
                                  </TextField>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const info = sgdwCampoParaColuna(map.colunaModelo);
                                    if (!info) return <span style={{ color: '#bbb', fontSize: 11 }}>—</span>;
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1565c0' }}>{info.campo}</span>
                                        <span style={{ fontSize: 10, color: '#78909c', fontFamily: 'monospace' }}>{info.tabela}</span>
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell style={{ textAlign: 'center' }}>
                                  <Chip
                                    label={`${Math.round(map.confianca)}%`}
                                    size="small"
                                    color={map.confianca >= 80 ? 'secondary' : 'default'}
                                    style={{ fontWeight: 600, minWidth: 60 }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </div>
                    
                    {/* Botão para salvar mapeamento */}
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {modeloSelecionado?.mapeamentosSalvos && modeloSelecionado.mapeamentosSalvos.length > 0 && (
                          <Chip 
                            icon={<CheckCircle size={16} />}
                            label={`${modeloSelecionado.mapeamentosSalvos.length} mapeamentos salvos`}
                            size="small"
                            style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                          />
                        )}
                      </div>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={salvarMapeamentoNoModelo}
                        startIcon={<Save />}
                        size="small"
                        style={{ borderRadius: 8 }}
                      >
                        Salvar Mapeamento no Modelo
                      </Button>
                    </div>
                  </Collapse>
                </div>

                {/* Preview dos dados aprimorado - renderiza somente quando explicitamente solicitado (showPreview) ou ao visualizar uma Planilha Finalizada */}
                {(showPreview || selectedPlanilhaFinalizada) && (
                  <div ref={previewWrapperRef} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Typography variant="subtitle1" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Visibility style={{ color: '#1976d2' }} />
                        Preview dos Dados Organizados
                      </Typography>

                    {notificacoes.length > 0 && (
                      <Chip 
                        icon={<NotificationsActive size={16} />}
                        label={`${notificacoes.length} notificações`}
                        size="small"
                        style={{ backgroundColor: '#fff3e0', color: '#e65100', marginLeft: 8 }}
                      />
                    )}

                    {/* Toggle to hide columns without any data (preview only) */}
                    <Button
                      size="small"
                      variant={hideEmptyColumns ? 'contained' : 'outlined'}
                      onClick={() => setHideEmptyColumns(p => !p)}
                      startIcon={<FilterList />}
                      style={{ marginLeft: 8 }}
                    >
                      {hideEmptyColumns ? 'Mostrar colunas vazias' : 'Ocultar colunas vazias'}
                    </Button>

                    {/* Botão para upload de PDF e extração de MARCA/MODELO */}
                    <input
                      ref={inputMarcaModeloPdfRef}
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processarPdfMarcaModelo(file);
                        e.target.value = '';
                      }}
                    />
                    <Tooltip title="Enviar PDF para extrair e preencher a coluna MARCA/MODELO automaticamente">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => inputMarcaModeloPdfRef.current?.click()}
                          disabled={processandoMarcaModeloPdf || dadosExtraidos.length === 0}
                          startIcon={processandoMarcaModeloPdf ? <CircularProgress size={16} /> : <CloudUpload />}
                          style={{ marginLeft: 8, borderColor: '#9c27b0', color: '#9c27b0' }}
                        >
                          {processandoMarcaModeloPdf ? 'Extraindo...' : 'PDF Marca/Modelo'}
                        </Button>
                      </span>
                    </Tooltip>

                    {/* Ações de edição do preview */}
                    {!selectedPlanilhaFinalizada ? (
                      !previewEditMode ? (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <IconButton size="small" onClick={entrarEdicaoPreview} title="Editar Preview"><Edit size={18} /></IconButton>
                          {/* Fechar preview quando aberto manualmente */}
                          {showPreview && (
                            <IconButton size="small" onClick={() => { setShowPreview(false); setPreviewRows(null); setPreviewEditMode(false); setSelectedPlanilhaFinalizada(null); mostrarMensagem('Preview fechado', 'info'); }} title="Fechar Preview">
                              <Close size={18} />
                            </IconButton>
                          )}
                        </div>
                      ) : (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <Button variant="outlined" size="small" color="default" onClick={cancelarEdicaoPreview} startIcon={<Close />}>Cancelar</Button>
                          <Button variant="contained" size="small" color="primary" onClick={salvarEdicoesPreview} startIcon={<Save />}>Salvar</Button>
                        </div>
                      )
                    ) : (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <Button data-ignore-preview-close size="small" variant="outlined" onClick={() => exportarPlanilhaFinalizada(selectedPlanilhaFinalizada)} startIcon={<GetApp />}>Baixar Excel</Button>
                        <Button size="small" variant="outlined" onClick={() => { setSelectedPlanilhaFinalizada(null); setShowPreview(false); mostrarMensagem('Preview encerrado', 'info'); }} startIcon={<Close />}>Fechar</Button>
                      </div>
                    )}
                  </div>
                  <div className="ocr-table-container" style={{ 
                    borderRadius: 8, 
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden'
                  }}>

                    {/* Preparar colunas/linhas para render (suporta preview de planilha finalizada) */}
                    {(() => {
                      const isViewingFinalized = !!selectedPlanilhaFinalizada;
                      const displayRows = filledRows
                        ? filledRows
                        : (previewEditMode && previewRows)
                          ? previewRows
                          : (isViewingFinalized ? (selectedPlanilhaFinalizada.dados || []) : gerarDadosFinais());
                      const baseDisplayColumns: string[] = isViewingFinalized
                        ? (Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length ? selectedPlanilhaFinalizada.campos : (Array.isArray(selectedPlanilhaFinalizada.dados) && selectedPlanilhaFinalizada.dados.length ? Object.keys(selectedPlanilhaFinalizada.dados[0]) : (modeloSelecionado?.colunas || [])))
                        : (modeloSelecionado?.colunas || []);
                      const displayColumns: string[] = adicionarColunasDeTotalSeNecessario(baseDisplayColumns, displayRows);
                      // Totais para o contexto atual (modelo ou planilha finalizada)
                      const totalsForDisplay = isViewingFinalized ? computeTotalsForRows(displayRows, displayColumns) : calcularTotaisColunas;

                      // Colunas que devem ficar sempre invisíveis no preview (sem alterar lógica)
                      const colunasOcultas = ['MULTA_PRESENT'];
                      const isColOculta = (col: string) => colunasOcultas.some(c => normalizar(c) === normalizar(String(col || '')));

                      // Calcular colunas visíveis quando o toggle estiver ativo: removemos colunas que não possuem nenhum valor
                      // Usa dadosFinaisMemo (síncrono) para verificar dados — evita usar filledRows que pode estar obsoleto
                      // enquanto o fetch async de marca/modelo ainda está em andamento.
                      const emptyCheckRows = isViewingFinalized ? displayRows : dadosFinaisMemo;
                      const visibleColumns = (hideEmptyColumns
                        ? displayColumns.filter(col => {
                            if (isColOculta(col)) return false;
                            if (isServiceDespachante(col)) return true; // ensure service column is always visible
                            const isMarcaModelo = /marca\s*\/\s*modelo/i.test(col) || /marcamodelo/i.test(col);
                            if (isMarcaModelo) return true;
                            return emptyCheckRows.some(r => {
                              const val = getRowValueForColumn(r, col);
                              return val !== null && val !== undefined && String(val).trim() !== '';
                            });
                          })
                        : displayColumns
                      ).filter(col => !isColOculta(col));

                      // store for use later in head/body rendering
                      visibleColumnsRef.current = visibleColumns;

                      // injetar temporariamente em variáveis de escopo do JSX abaixo via retorno
                      return (
                        <TableContainer style={{ maxHeight: 400 }} data-display-columns={JSON.stringify(visibleColumns)} data-display-rows-count={displayRows.length}>
                          {/* Values are read again inside the JSX below */}
                        </TableContainer>
                      );
                    })()}

                    <TableContainer style={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell 
                              colSpan={((visibleColumnsRef.current ? visibleColumnsRef.current.length : (selectedPlanilhaFinalizada ? (Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length ? selectedPlanilhaFinalizada.campos.length : (Array.isArray(selectedPlanilhaFinalizada.dados) && selectedPlanilhaFinalizada.dados.length ? Object.keys(selectedPlanilhaFinalizada.dados[0] || {}).length : 0)) : (modeloSelecionado?.colunas.length || 0)))) + (previewEditMode ? 2 : 1)} 
                              style={{ textAlign: 'center', fontWeight: 700, border: '3px solid #000' }}
                            >
                              PLANILHA - REF. SERVIÇOS PRESTADOS
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            {/* Coluna de Notificação */}
                            <TableCell 
                              style={{ 
                                fontWeight: 700, 
                                backgroundColor: '#ff9800', 
                                color: '#fff', 
                                border: '1px solid #e0e0e0', 
                                borderBottom: '1px solid #bdbdbd', 
                                whiteSpace: 'nowrap',
                                width: 50,
                                textAlign: 'center',
                                padding: '8px 4px'
                              }}
                            >
                              <Tooltip title="Notificações de Vencimento">
                                <Alarm size={18} />
                              </Tooltip>
                            </TableCell>
                            {(visibleColumnsRef.current || (selectedPlanilhaFinalizada ? (Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length ? selectedPlanilhaFinalizada.campos : (Array.isArray(selectedPlanilhaFinalizada.dados) && selectedPlanilhaFinalizada.dados.length ? Object.keys(selectedPlanilhaFinalizada.dados[0]) : (modeloSelecionado?.colunas || []))) : (modeloSelecionado?.colunas || []))).map((col: string, i: number) => {
                              const lower = String(col || '').toLowerCase();
                              const isOS = lower.includes('o.s') || lower === 'os' || /\bos\b/.test(lower);
                              const isData = lower.includes('data');
                              const display = isOS ? 'OS.' : isData ? 'DATA.' : String(col || '').toUpperCase();
                              // Fundo vermelho para todos os cabeçalhos conforme solicitado
                              const bg = '#f44336';
                              return (
                                <TableCell key={i} style={{ fontWeight: 700, backgroundColor: bg, color: '#fff', border: '1px solid #e0e0e0', borderBottom: '1px solid #bdbdbd', whiteSpace: 'nowrap' }}>
                                  {display}
                                </TableCell>
                              );
                            })}

                            {previewEditMode && (
                              <TableCell style={{ fontWeight: 700, backgroundColor: '#1976d2', color: '#fff', border: '1px solid #e0e0e0', borderBottom: '1px solid #bdbdbd', whiteSpace: 'nowrap' }}>
                                Ações
                              </TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const sourceRowsBase = previewEditMode && previewRows ? previewRows : (selectedPlanilhaFinalizada ? (selectedPlanilhaFinalizada.dados || []) : gerarDadosFinais());
                            const sourceRows = preencherTotaisAusentesNasLinhas(sourceRowsBase);
                            const totalsForDisplay = selectedPlanilhaFinalizada ? computeTotalsForRows(sourceRows, (Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length ? selectedPlanilhaFinalizada.campos : (sourceRows.length ? Object.keys(sourceRows[0]) : []))) : calcularTotaisColunas;
                            const totalRows = sourceRows.length;
                            const start = page * rowsPerPage;
                            const end = Math.min(start + rowsPerPage, totalRows);
                            const paginated = sourceRows.slice(start, end);

                            return paginated.map((row: any, idx: number) => {
                              const displayIndex = start + idx;
                              const originalIndex = previewEditMode && previewRows ? (row.__originalIndex ?? displayIndex) : displayIndex;
                              const notificacao = getNotificacaoLinha(originalIndex);
                              const vencida = notificacao && isNotificacaoVencida(notificacao);
                              const venceHoje = notificacao && isNotificacaoHoje(notificacao);

                              return (
                                <TableRow 
                                  key={displayIndex}
                                  style={{ 
                                    backgroundColor: vencida 
                                      ? '#ffebee' 
                                      : venceHoje 
                                        ? '#fff8e1' 
                                        : displayIndex % 2 === 1 ? '#fafafa' : '#fff'
                                  }}
                                >
                                  {/* Botão de Notificação à esquerda */}
                                  <TableCell 
                                    style={{ 
                                      padding: '4px',
                                      textAlign: 'center',
                                      borderLeft: '1px solid #e0e0e0',
                                      borderRight: '1px solid #e0e0e0',
                                      backgroundColor: notificacao 
                                        ? (vencida ? '#f44336' : venceHoje ? '#ff9800' : '#4caf50')
                                        : 'transparent'
                                    }}
                                  >
                                    <Tooltip 
                                      title={
                                        notificacao 
                                          ? `${notificacao.descricao || 'Linha ' + (originalIndex+1)} - Vence: ${formatarDataBR(notificacao.dataVencimento)} às ${notificacao.horaNotificacao}${vencida ? ' (VENCIDO!)' : venceHoje ? ' (HOJE!)' : ''}`
                                          : 'Definir vencimento/notificação'
                                      }
                                    >
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => abrirPopoverNotificacao(e, originalIndex)}
                                        style={{ 
                                          padding: 4,
                                          color: notificacao ? '#fff' : '#757575'
                                        }}
                                      >
                                        {notificacao ? (
                                          vencida ? <NotificationsActive size={18} /> :
                                          venceHoje ? <Schedule size={18} /> :
                                          <Alarm size={18} />
                                        ) : (
                                          <Alarm size={18} />
                                        )}
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>

                                  {(visibleColumnsRef.current || (selectedPlanilhaFinalizada ? (Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length ? selectedPlanilhaFinalizada.campos : (Array.isArray(selectedPlanilhaFinalizada.dados) && selectedPlanilhaFinalizada.dados.length ? Object.keys(selectedPlanilhaFinalizada.dados[0]) : (modeloSelecionado?.colunas || []))) : (modeloSelecionado?.colunas || []))).map((col: string, j: number) => {
                                    const isEditingThisCell = editingCell && editingCell.row === displayIndex && editingCell.col === col;
                                    return (
                                    <TableCell
                                      key={j}
                                      onDoubleClick={() => handleCellDoubleClick(displayIndex, col, row)}
                                      style={{
                                        whiteSpace: 'nowrap',
                                        borderLeft: '1px solid #e0e0e0',
                                        borderRight: '1px solid #e0e0e0',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {isEditingThisCell ? (
                                        <TextField
                                          fullWidth
                                          autoFocus
                                          variant="standard"
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') salvarInlineEdit();
                                            if (e.key === 'Escape') cancelarInlineEdit();
                                          }}
                                          onBlur={() => salvarInlineEdit()}
                                        />
                                      ) : previewEditMode && previewRows ? (
                                        <TextField
                                          fullWidth
                                          variant="standard"
                                          value={getRowValueForColumn(row, col) ?? ''}
                                          onChange={(e) => atualizarCelulaPreview(displayIndex, col, e.target.value)}
                                        />
                                      ) : (
                                        // Mostrar valor formatado para colunas numéricas (com R$) e centralizado
                                        (() => {
                                          let rawVal = getRowValueForColumn(row, col);

                                          // Se a coluna for O.S., preferir número de O.S. presente no registro original (se houver)
                                          const isOsCol = /\b(o\.?s|os|n\.?º|numero|n[oº]mero)\b/i.test(String(col || ''));
                                          if (isOsCol) {
                                            const looksLikePlate = isLikelyPlate(rawVal);
                                            const lacksDigits = !/\d/.test(String(rawVal || ''));
                                            if (!rawVal || looksLikePlate || lacksDigits) {
                                              const rawSource = (row && ((row as any).__raw || (row as any).__orig)) || {};
                                              // procurar valor puramente numérico plausível
                                              const osKey = Object.keys(rawSource).find(k => {
                                                const v = String(rawSource[k] || '').trim();
                                                return /^\d{3,7}$/.test(v) || /\b(o\.?s|os|n\.?º|numero|n[oº]mero)\b/i.test(k);
                                              });
                                              if (osKey) {
                                                const m = String(rawSource[osKey] || '').match(/(\d{3,7})/);
                                                if (m) rawVal = m[1];
                                              }
                                            }
                                          }

                                          const meta = (totalsForDisplay || {})[col] || { total: null, isCurrency: false };
                                          const isNumericUI = !!(meta && (meta.total !== null || meta.isCurrency));
                                          if (isNumericUI) {
                                            const parsed = parseAndFormatValue(rawVal, col);
                                            const display = parsed.formatted ?? (parsed.value !== null ? formatarTotalColuna(parsed.value, true) : rawVal || '');
                                            return <div style={{ minHeight: 20, textAlign: 'center' }}>{display || <span style={{ color: '#bdbdbd' }}>-</span>}</div>;
                                          }
                                          return <div style={{ minHeight: 20 }}>{rawVal || <span style={{ color: '#bdbdbd' }}>-</span>}</div>;
                                        })()
                                      )}
                                    </TableCell>
                                    );
                                  })}

                                  {previewEditMode && (
                                    <TableCell style={{ padding: '6px 8px', textAlign: 'center' }}>
                                      <IconButton size="small" onClick={() => apagarLinhaPreview(displayIndex)}>
                                        <Delete size={18} style={{ color: '#d32f2f' }} />
                                      </IconButton>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            });
                          })()}
                          
                          {/* Linha de Totais - Fixa no final */}
                          <TableRow className={classes.totalsRow}>
                            <TableCell className={classes.totalFirstCell}>
                              <Typography variant="caption" className={classes.totalValue} style={{ color: '#fff', fontWeight: 700 }}>
                                TOTAL
                              </Typography>
                            </TableCell>
                            {(() => {
                              const totalsForRow = selectedPlanilhaFinalizada
                                ? computeTotalsForRows(
                                    (selectedPlanilhaFinalizada.dados || []),
                                    (Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length
                                      ? selectedPlanilhaFinalizada.campos
                                      : (selectedPlanilhaFinalizada.dados && selectedPlanilhaFinalizada.dados.length ? Object.keys(selectedPlanilhaFinalizada.dados[0]) : []))
                                  )
                                : calcularTotaisColunas;
                              const baseCols = selectedPlanilhaFinalizada
                                ? (Array.isArray(selectedPlanilhaFinalizada.campos) && selectedPlanilhaFinalizada.campos.length ? selectedPlanilhaFinalizada.campos : (Array.isArray(selectedPlanilhaFinalizada.dados) && selectedPlanilhaFinalizada.dados.length ? Object.keys(selectedPlanilhaFinalizada.dados[0]) : (modeloSelecionado?.colunas || [])))
                                : (modeloSelecionado?.colunas || []);
                              const cols = (visibleColumnsRef.current && visibleColumnsRef.current.length > 0) ? visibleColumnsRef.current : baseCols;
                              return cols.map((col: string, i: number) => {
                                const meta = (totalsForRow || {})[col] || { total: null, isCurrency: false };
                                return (
                                  <TableCell 
                                    key={`total-${i}`}
                                    className={classes.totalCell}
                                    style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                      {meta.total !== null ? (
                                        <span className={classes.totalValue}>
                                          {formatarTotalColuna(meta.total, true)}
                                        </span>
                                      ) : null}

                                      <div className={classes.totalButtonWrap}>
                                        {recalculatingCol === col ? (
                                          <CircularProgress size={18} />
                                        ) : (
                                          <>
                                            <IconButton className={classes.totalButton} size="small" onClick={() => recalcularColuna(col)} title="Recalcular coluna">
                                              <Autorenew size={16} style={{ color: '#fff' }} />
                                            </IconButton>
                                            <IconButton className={classes.totalButton} size="small" onClick={() => showDebugTotals(col)} title="Depurar totais (mostrar linhas e parse)">
                                              <ListAlt size={16} style={{ color: '#fff' }} />
                                            </IconButton>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                );
                              });
                            })() }
                            {previewEditMode && (
                              <TableCell className={classes.previewTotalCell} />
                            )}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <Typography variant="body2" color="textSecondary">
                      {selectedPlanilhaFinalizada ? (selectedPlanilhaFinalizada.dados ? selectedPlanilhaFinalizada.dados.length : 0) : dadosExtraidos.length} registro(s) | {notificacoes.length} notificação(ões) definida(s)
                    </Typography>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Typography variant="caption" color="textSecondary">
                        {((selectedPlanilhaFinalizada ? (selectedPlanilhaFinalizada.dados ? selectedPlanilhaFinalizada.dados.length : 0) : dadosFinaisMemo.length) === 0) ? 'Nenhum registro' : `Mostrando ${Math.min((selectedPlanilhaFinalizada ? (selectedPlanilhaFinalizada.dados ? selectedPlanilhaFinalizada.dados.length : 0) : dadosFinaisMemo.length), page * rowsPerPage + 1)}–${Math.min((selectedPlanilhaFinalizada ? (selectedPlanilhaFinalizada.dados ? selectedPlanilhaFinalizada.dados.length : 0) : dadosFinaisMemo.length), (page + 1) * rowsPerPage)} de ${(selectedPlanilhaFinalizada ? (selectedPlanilhaFinalizada.dados ? selectedPlanilhaFinalizada.dados.length : 0) : dadosFinaisMemo.length)}`}
                      </Typography>

                      <Button size="small" variant="outlined" onClick={handlePrevPage} disabled={page === 0}>Anterior</Button>
                      <Button size="small" variant="outlined" onClick={handleNextPage} disabled={(page + 1) * rowsPerPage >= (selectedPlanilhaFinalizada ? (selectedPlanilhaFinalizada.dados ? selectedPlanilhaFinalizada.dados.length : 0) : dadosFinaisMemo.length)}>Próximo</Button>

                      <select value={rowsPerPage} onChange={(e) => handleSetRowsPerPage(Number(e.target.value))} style={{ height: 32, borderRadius: 6 }}>
                        {[10, 25, 50, 100].map(n => (
                          <option key={n} value={n}>{n} / pág</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                )}

                {/* Navegação aprimorada com botões de exportação */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: '1px solid #e0e0e0',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setEtapaAtual(1)}
                    startIcon={<ArrowBack />}
                    style={{ borderRadius: 8, paddingLeft: 24, paddingRight: 24 }}
                  >
                    Voltar
                  </Button>
                  
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Button
                      data-ignore-preview-close
                      variant="contained"
                      onClick={() => {
                        // Priorizar exportar a Planilha Finalizada quando estiver selecionada
                        if (selectedPlanilhaFinalizada) return exportarPlanilhaFinalizada(selectedPlanilhaFinalizada);
                        // Quando o preview está aberto, exportar exatamente as linhas atualmente exibidas
                        if (showPreview || previewEditMode || (filledRows && filledRows.length)) {
                          const rows = getCurrentPreviewRowsForExport();
                          const cols = getCurrentPreviewColumnsForExport();
                          return exportarExcel(rows, cols);
                        }
                        // Se houver dados salvos no modelo, exportá-los (usuário costuma confundir essas ações)
                        if (modeloSelecionado?.dadosSalvos && modeloSelecionado.dadosSalvos.length) return exportarExcel(modeloSelecionado.dadosSalvos, modeloSelecionado.camposSalvos || modeloSelecionado.colunas, `PLANILHA - ${modeloSelecionado.nome}`);
                        // Caso contrário, comportamento padrão (dados gerados atualmente)
                        return exportarExcel();
                      }}
                      startIcon={<GetApp />}
                      style={{
                        borderRadius: 8,
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                      }}
                    >
                      Baixar Excel
                    </Button>
                    <Button
                      data-ignore-preview-close
                      variant="outlined"
                      onClick={() => {
                        if (selectedPlanilhaFinalizada) return exportarCSV(selectedPlanilhaFinalizada.dados, selectedPlanilhaFinalizada.campos);
                        if (showPreview || previewEditMode || (filledRows && filledRows.length)) {
                          const rows = getCurrentPreviewRowsForExport();
                          const cols = getCurrentPreviewColumnsForExport();
                          return exportarCSV(rows, cols);
                        }
                        if (modeloSelecionado?.dadosSalvos && modeloSelecionado.dadosSalvos.length) return exportarCSV(modeloSelecionado.dadosSalvos, modeloSelecionado.camposSalvos || modeloSelecionado.colunas);
                        return exportarCSV();
                      }}
                      startIcon={<GetApp />}
                      style={{
                        borderRadius: 8,
                        fontWeight: 600,
                        borderWidth: 2,
                      }}
                    >
                      Baixar CSV
                    </Button>
                    <Button
                      data-ignore-preview-close
                      variant="outlined"
                      onClick={() => {
                        if (selectedPlanilhaFinalizada) return imprimirPlanilha(selectedPlanilhaFinalizada.dados, selectedPlanilhaFinalizada.campos);
                        if (showPreview || previewEditMode || (filledRows && filledRows.length)) {
                          const rows = getCurrentPreviewRowsForExport();
                          const cols = getCurrentPreviewColumnsForExport();
                          return imprimirPlanilha(rows, cols);
                        }
                        if (modeloSelecionado?.dadosSalvos && modeloSelecionado.dadosSalvos.length) return imprimirPlanilha(modeloSelecionado.dadosSalvos, modeloSelecionado.camposSalvos || modeloSelecionado.colunas);
                        return imprimirPlanilha();
                      }}
                      startIcon={<Print />}
                      style={{
                        borderRadius: 8,
                        fontWeight: 600,
                        borderWidth: 2,
                      }}
                    >
                      Imprimir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Popover para definir notificação de vencimento */}
          <Popover
            open={Boolean(popoverAnchor)}
            anchorEl={popoverAnchor}
            onClose={fecharPopoverNotificacao}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <div style={{ padding: 20, minWidth: 280 }}>
              <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Alarm style={{ color: '#1976d2' }} />
                Definir Vencimento
              </Typography>
              
              <div style={{ marginBottom: 16 }}>
                <Typography variant="body2" color="textSecondary" style={{ marginBottom: 6 }}>
                  Data de Vencimento
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  InputProps={{
                    style: { borderRadius: 8 }
                  }}
                />
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <Typography variant="body2" color="textSecondary" style={{ marginBottom: 6 }}>
                  Hora da Notificação
                </Typography>
                <TextField
                  type="time"
                  fullWidth
                  size="small"
                  value={horaNotificacao}
                  onChange={(e) => setHoraNotificacao(e.target.value)}
                  InputProps={{
                    style: { borderRadius: 8 }
                  }}
                />
              </div>
              
              {linhaNotificacao !== null && getNotificacaoLinha(linhaNotificacao) && (
                <div style={{ 
                  padding: 12, 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: 8, 
                  marginBottom: 16 
                }}>
                  <Typography variant="body2" style={{ color: '#1565c0' }}>
                    ⏰ Notificação existente: {formatarDataBR(getNotificacaoLinha(linhaNotificacao)!.dataVencimento)} às {getNotificacaoLinha(linhaNotificacao)!.horaNotificacao}
                  </Typography>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={salvarNotificacaoLinha}
                  fullWidth
                  startIcon={<Save />}
                  style={{ borderRadius: 8 }}
                >
                  Salvar
                </Button>
                {linhaNotificacao !== null && getNotificacaoLinha(linhaNotificacao) && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      removerNotificacaoLinha(linhaNotificacao);
                      fecharPopoverNotificacao();
                    }}
                    startIcon={<Delete />}
                    style={{ borderRadius: 8 }}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </Popover>

          {/* Dialog de confirmação de exclusão */}
          <Dialog open={dialogConfirmacao} onClose={() => setDialogConfirmacao(false)}>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent>
              <Typography>
                Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogConfirmacao(false)}>Cancelar</Button>
              <Button onClick={excluirModelo} style={{ backgroundColor: '#f44336', color: 'white' }} variant="contained">
                Excluir
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog: vincular empresa SGDW ao modelo */}
          <Dialog
            open={Boolean(empresaDialogModeloId)}
            onClose={() => setEmpresaDialogModeloId(null)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle style={{ paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Business style={{ color: '#1976d2' }} />
                Vincular Empresa SGDW
              </div>
            </DialogTitle>
            <DialogContent style={{ paddingTop: 8 }}>
              {/* Seletor de mês/ano */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select
                  value={sgdwMes}
                  onChange={e => setSgdwMes(Number(e.target.value))}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.875rem' }}
                >
                  {MESES_NOTA.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select
                  value={sgdwAno}
                  onChange={e => setSgdwAno(Number(e.target.value))}
                  style={{ width: 84, padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.875rem' }}
                >
                  {[0, 1, 2].map(offset => {
                    const y = new Date().getFullYear() - offset;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
              <TextField
                fullWidth
                autoFocus
                placeholder="Buscar empresa..."
                value={empresaBusca}
                onChange={e => onEmpresaBuscaChange(e.target.value)}
                variant="outlined"
                size="small"
                style={{ marginBottom: 12 }}
                InputProps={{
                  endAdornment: carregandoEmpresas ? <CircularProgress size={16} /> : null,
                }}
              />
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {empresasResultados.length === 0 && !carregandoEmpresas && (
                  <Typography variant="body2" color="textSecondary" style={{ textAlign: 'center', padding: '16px 0' }}>
                    {empresaBusca ? 'Nenhuma empresa encontrada' : 'Digite para buscar ou aguarde...'}
                  </Typography>
                )}
                {empresasResultados.map(emp => (
                  <div
                    key={emp.CLINUMER}
                    onClick={() => selecionarEmpresaParaModelo(emp)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderRadius: 8,
                      marginBottom: 4,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e3f2fd')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}
                  >
                    <Business size={18} style={{ color: '#1976d2', flexShrink: 0 }} />
                    <Typography variant="body2" style={{ fontWeight: 500 }}>{emp.NOME}</Typography>
                  </div>
                ))}
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEmpresaDialogModeloId(null)}>Cancelar</Button>
            </DialogActions>
          </Dialog>

          {/* Dialog: editar planilha finalizada */}
          <Dialog open={editPlanilhaOpen} onClose={() => { if (!editPlanilhaLoading) { setEditPlanilhaOpen(false); setPlanilhaEditing(null); } }} maxWidth="sm" fullWidth>
            <DialogTitle>Editar Planilha</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Nome da planilha"
                value={editPlanilhaName}
                onChange={(e) => setEditPlanilhaName(e.target.value)}
                disabled={editPlanilhaLoading}
                style={{ marginTop: 8 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setEditPlanilhaOpen(false); setPlanilhaEditing(null); }} disabled={editPlanilhaLoading}>Cancelar</Button>
              <Button color="primary" variant="contained" onClick={salvarEdicaoPlanilha} disabled={editPlanilhaLoading || !editPlanilhaName.trim()}>
                {editPlanilhaLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog: duplicar modelo (nome) */}
          <Dialog open={duplicateDialogOpen} onClose={() => { if (!duplicatingLoading) { setDuplicateDialogOpen(false); setDuplicatingModel(null); } }}>
            <DialogTitle>Duplicar modelo</DialogTitle>
            <DialogContent style={{ minWidth: 360 }}>
              <Typography style={{ marginBottom: 8 }}>Escolha um nome para a cópia do modelo:</Typography>
              <TextField
                fullWidth
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!duplicatingLoading) confirmarDuplicarModelo(); } }}
                autoFocus
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setDuplicateDialogOpen(false); setDuplicatingModel(null); }} disabled={duplicatingLoading}>Cancelar</Button>
              <Button color="primary" variant="contained" onClick={() => confirmarDuplicarModelo()} disabled={duplicatingLoading || !duplicateName.trim()}>
                {duplicatingLoading ? 'Duplicando...' : 'Duplicar'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Diálogo de debug para totais (lista linhas parseadas) - renderizado no topo para sempre funcionar */}
          <Dialog open={debugTotalsOpen} onClose={() => setDebugTotalsOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Depurar totais — coluna: {debugTotalsColumn}</DialogTitle>
            <DialogContent>
              <Typography variant="caption">Linhas (index, valor bruto, valor parseado):</Typography>
              <div style={{ maxHeight: 340, overflowY: 'auto', marginTop: 8 }}>
                {debugTotalsRows.map(r => (
                  <Paper key={r.idx} style={{ padding: 8, marginBottom: 6 }}>
                    <Typography variant="body2"><strong>#{r.idx + 1}</strong> — bruto: <code>{r.raw}</code></Typography>
                    <Typography variant="body2">parseado: {r.parsed !== null ? r.parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : <em>nulo</em>}</Typography>
                  </Paper>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Typography variant="subtitle2">Total: {debugTotalsRows.reduce((s, x) => s + (x.parsed || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Typography>
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDebugTotalsOpen(false)}>Fechar</Button>
            </DialogActions>
          </Dialog>

          </div>
          </div>
          </div>
          </div>
    
    </>
  );
}
