import React, { useState, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Button, Typography, Paper, TextField, IconButton, CircularProgress, Tooltip, Tabs, Tab, Divider, Chip, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, makeStyles } from '@material-ui/core';
import { Table, TableRow, TableCell, TableBody, TableHead, TableContainer, Card, MenuItem } from '@material-ui/core';
import { useTheme, useMediaQuery } from '@material-ui/core';
import { InsertDriveFile, Add, FolderOpen, Delete, CloudUpload, TableChart, Build, CheckCircle, ListAlt, Download, Settings, Save, ArrowForward, ArrowBack, Description, Folder, Visibility, GetApp, Refresh } from '@material-ui/icons';
import * as ExcelJS from 'exceljs';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/logic/firebase/config/app';

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
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    },
    padding: 24,
    marginBottom: 24,
  },
  uploadZone: {
    border: '2px dashed #cbd5e1',
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
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
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#f8fafc',
    borderRadius: 24,
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
    padding: 16,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  contentBox: {
    padding: 24,
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
  colunas: string[];
  criadoEm: number;
  mapeamentosSalvos?: MapeamentoSalvo[];
  firestoreId?: string;
}

interface DadosExtraidos {
  [key: string]: string;
}

interface MapeamentoCampo {
  colunaModelo: string;
  campoExtraido: string;
  confianca: number;
}

// Models are stored only in Firestore — localStorage removed
// Use Firestore helpers to load, save and delete models.

// ============ FIREBASE HELPERS ============
const salvarModeloNoFirebase = async (modelo: ModeloSaida): Promise<string | null> => {
  try {
    if (!db) throw new Error('Firebase não inicializado');
    const modelosCol = collection(db, 'Ocr-Inteligente-Model');
    const payload = {
      nome: modelo.nome,
      colunas: modelo.colunas,
      criadoEm: modelo.criadoEm || Date.now(),
      mapeamentosSalvos: modelo.mapeamentosSalvos || [],
      localCreatedAt: modelo.criadoEm || Date.now(),
    } as any;
    const docRef = await addDoc(modelosCol, payload);
    return docRef.id;
  } catch (err) {
    console.warn('Erro ao salvar modelo no Firebase', err);
    return null;
  }
};

const atualizarMapeamentoNoFirebase = async (modelo: ModeloSaida) => {
  try {
    if (!db || !modelo.firestoreId) return;
    const docRef = doc(db, 'Ocr-Inteligente-Model', modelo.firestoreId);
    await updateDoc(docRef, {
      mapeamentosSalvos: modelo.mapeamentosSalvos || [],
      atualizadoEm: serverTimestamp(),
    } as any);
  } catch (err) {
    console.warn('Erro ao atualizar mapeamento no Firebase', err);
  }
};

// ============ COMPONENTE PRINCIPAL ============
export default function OCRInteligente() {
  const classes = useAlertStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  // Estados do fluxo
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [tabAtiva, setTabAtiva] = useState(0);
  
  // Estados do modelo de saída
  const [modelosSalvos, setModelosSalvos] = useState<ModeloSaida[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloSaida | null>(null);
  const [nomeNovoModelo, setNomeNovoModelo] = useState('');
  const [colunasNovoModelo, setColunasNovoModelo] = useState<string[]>([]);
  const [novaColuna, setNovaColuna] = useState('');
  const [arquivoModelo, setArquivoModelo] = useState<File | null>(null);
  const [linhasPreview, setLinhasPreview] = useState<string[][]>([]);
  const [linhaHeaderSelecionada, setLinhaHeaderSelecionada] = useState<number>(0);
  
  // Estados de processamento
  const [arquivosEntrada, setArquivosEntrada] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos[]>([]);
  const [camposExtraidos, setCamposExtraidos] = useState<string[]>([]);
  const [mapeamentos, setMapeamentos] = useState<MapeamentoCampo[]>([]);
  
  // Estados de UI
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'success' | 'error' | 'info' } | null>(null);
  const [dialogConfirmacao, setDialogConfirmacao] = useState(false);
  const [modeloParaExcluir, setModeloParaExcluir] = useState<string | null>(null);
  
  // Refs
  const inputModeloRef = useRef<HTMLInputElement>(null);
  const inputArquivosRef = useRef<HTMLInputElement>(null);

  // Carregar modelos salvos do Firestore
  useEffect(() => {
    const load = async () => {
      try {
        if (!db) return;
        const q = collection(db, 'Ocr-Inteligente-Model');
        const snap = await getDocs(q);
        const docs: ModeloSaida[] = snap.docs.map(d => ({
          id: d.data().id || `modelo_${d.id}`,
          nome: d.data().nome || '',
          colunas: d.data().colunas || [],
          criadoEm: d.data().criadoEm || Date.now(),
          mapeamentosSalvos: d.data().mapeamentosSalvos || [],
          firestoreId: d.id,
        } as ModeloSaida));
        setModelosSalvos(docs);
      } catch (err) {
        console.warn('Erro ao carregar modelos do Firebase', err);
        mostrarMensagem('Erro ao carregar modelos do Firebase', 'error');
      }
    };
    load();
  }, []);

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
      setNomeNovoModelo(file.name.replace(/\.[^.]+$/, ''));
      mostrarMensagem(`${colunas.length} colunas extraídas do modelo com sucesso!`, 'success');
    } catch (err: any) {
      mostrarMensagem('Erro ao processar arquivo: ' + (err?.message || String(err)), 'error');
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

  // Salvar modelo
  const salvarModelo = async () => {
    if (!nomeNovoModelo.trim()) {
      mostrarMensagem('Digite um nome para o modelo', 'error');
      return;
    }
    if (colunasNovoModelo.length === 0) {
      mostrarMensagem('Adicione pelo menos uma coluna', 'error');
      return;
    }

    const novoModelo: ModeloSaida = {
      id: `modelo_${Date.now()}`,
      nome: nomeNovoModelo.trim(),
      colunas: colunasNovoModelo,
      criadoEm: Date.now(),
    };

    try {
      const firestoreId = await salvarModeloNoFirebase(novoModelo);
      if (!firestoreId) {
        mostrarMensagem('Erro ao salvar modelo no Firebase', 'error');
        return;
      }
      const modeloComId: ModeloSaida = { ...novoModelo, firestoreId };
      const novosModelos = [modeloComId, ...modelosSalvos];
      setModelosSalvos(novosModelos);
      setModeloSelecionado(modeloComId);
      setNomeNovoModelo('');
      setColunasNovoModelo([]);
      setArquivoModelo(null);
      setTabAtiva(0);
      mostrarMensagem('Modelo salvo com sucesso e sincronizado com Firebase ✅', 'success');
    } catch (err) {
      console.warn('Erro ao salvar modelo no Firebase', err);
      mostrarMensagem('Erro ao salvar modelo no Firebase', 'error');
    }
  }; 

  // Excluir modelo (Firestore-only)
  const excluirModelo = async () => {
    if (!modeloParaExcluir) return;
    try {
      const modelo = modelosSalvos.find(m => m.id === modeloParaExcluir);
      if (modelo?.firestoreId) {
        await deleteDoc(doc(db, 'Ocr-Inteligente-Model', modelo.firestoreId));
      }
      const novosModelos = modelosSalvos.filter(m => m.id !== modeloParaExcluir);
      setModelosSalvos(novosModelos);
      if (modeloSelecionado?.id === modeloParaExcluir) {
        setModeloSelecionado(null);
      }
      setModeloParaExcluir(null);
      setDialogConfirmacao(false);
      mostrarMensagem('Modelo removido do Firebase com sucesso', 'success');
    } catch (err) {
      console.warn('Erro ao excluir modelo do Firebase', err);
      mostrarMensagem('Erro ao excluir modelo no Firebase', 'error');
    }
  };

  // ============ FUNÇÕES DE OCR ============

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

  // Chamar Gemini para extrair JSON de um bloco de texto
  const chamarGeminiExtracao = async (textoBloco: string, colunasModelo: string[], GEMINI_API_KEY: string): Promise<DadosExtraidos[]> => {
    const prompt = `
Analise o seguinte texto extraído de um documento e organize os dados em formato JSON.
As colunas esperadas são: ${colunasModelo.join(', ')}

REGRAS OBRIGATÓRIAS:
- Retorne APENAS um array JSON válido, sem explicações ou texto extra
- O Vlr Receber sera preenchido na coluna TOTAL se salvo em todas as extrações 1 ou mais arquivos.
- Cada objeto no array deve ter as chaves EXATAMENTE correspondentes às colunas listadas acima
- Se um campo não for encontrado para um registro, use string vazia ""
- O RETORNO VISTORIA SINALIZA sera preenchido na coluna Honorarios.
- Identifique ABSOLUTAMENTE TODOS os registros/linhas/O.S. presentes no texto
- NÃO pule, NÃO omita, NÃO resuma NENHUM registro. Cada linha da tabela = 1 objeto no array
- Mantenha a formatação original dos dados (datas, valores monetários, números de O.S., etc.)
- Se o texto contém marcadores de página (ex: "--- PÁGINA X ---"), processe TODAS as páginas
- Conte quantos registros existem e garanta que o array tenha exatamente esse número de objetos

Texto do documento:
${textoBloco}

Retorne APENAS o array JSON completo com TODOS os registros:
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 95536 },
        }),
      }
    );

    if (!response.ok) throw new Error('Erro na API Gemini');

    const data = await response.json();
    const textoResposta = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extrair JSON da resposta
    const jsonMatch = textoResposta.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    
    return [];
  };

  // Extrair dados estruturados do texto OCR usando Gemini (com suporte a multi-página/chunks)
  const extrairDadosEstruturados = async (textoOCR: string, colunasModelo: string[]): Promise<DadosExtraidos[]> => {
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      // Fallback: tentar extrair localmente
      return extrairDadosLocal(textoOCR, colunasModelo);
    }

    try {
      // Verificar se o texto tem marcadores de página (vindo do processamento multi-página)
      const temPaginas = textoOCR.includes('--- PÁGINA ');
      
      if (temPaginas) {
        // Dividir por páginas e processar cada página separadamente
        const paginas = textoOCR.split(/--- PÁGINA \d+ DE \d+ ---/).filter(p => p.trim());
        console.log(`[Extração] Texto com ${paginas.length} páginas detectadas, processando cada uma...`);
        
        const todosDados: DadosExtraidos[] = [];
        
        for (let i = 0; i < paginas.length; i++) {
          const paginaTexto = paginas[i].trim();
          if (!paginaTexto) continue;
          
          console.log(`[Extração] Processando página ${i + 1}/${paginas.length} (${paginaTexto.length} chars)...`);
          
          try {
            const dadosPagina = await chamarGeminiExtracao(paginaTexto, colunasModelo, GEMINI_API_KEY);
            console.log(`[Extração] Página ${i + 1}: ${dadosPagina.length} registros encontrados`);
            todosDados.push(...dadosPagina);
          } catch (err) {
            console.warn(`[Extração] Erro na página ${i + 1}, tentando fallback local:`, err);
            const dadosLocal = extrairDadosLocal(paginaTexto, colunasModelo);
            todosDados.push(...dadosLocal);
          }
        }
        
        console.log(`[Extração] Total: ${todosDados.length} registros de ${paginas.length} páginas`);
        
        if (todosDados.length > 0) return todosDados;
        // Se não encontrou nada por página, tentar texto completo
      }
      
      // Texto sem marcadores de página ou fallback: processar como bloco único
      // Se o texto for muito grande (>15000 chars), dividir em chunks
      const CHUNK_SIZE = 15000;
      
      if (textoOCR.length > CHUNK_SIZE) {
        console.log(`[Extração] Texto grande (${textoOCR.length} chars), dividindo em chunks...`);
        const chunks: string[] = [];
        const linhas = textoOCR.split('\n');
        let currentChunk = '';
        
        for (const linha of linhas) {
          if (currentChunk.length + linha.length > CHUNK_SIZE && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = linha;
          } else {
            currentChunk += (currentChunk ? '\n' : '') + linha;
          }
        }
        if (currentChunk) chunks.push(currentChunk);
        
        console.log(`[Extração] Dividido em ${chunks.length} chunks`);
        
        const todosDados: DadosExtraidos[] = [];
        for (let i = 0; i < chunks.length; i++) {
          try {
            const dadosChunk = await chamarGeminiExtracao(chunks[i], colunasModelo, GEMINI_API_KEY);
            console.log(`[Extração] Chunk ${i + 1}: ${dadosChunk.length} registros`);
            todosDados.push(...dadosChunk);
          } catch (err) {
            console.warn(`[Extração] Erro no chunk ${i + 1}:`, err);
            const dadosLocal = extrairDadosLocal(chunks[i], colunasModelo);
            todosDados.push(...dadosLocal);
          }
        }
        
        return todosDados.length > 0 ? todosDados : extrairDadosLocal(textoOCR, colunasModelo);
      }
      
      // Texto pequeno: processar de uma vez
      const dados = await chamarGeminiExtracao(textoOCR, colunasModelo, GEMINI_API_KEY);
      return dados.length > 0 ? dados : extrairDadosLocal(textoOCR, colunasModelo);
      
    } catch (err) {
      console.warn('Erro na extração com Gemini, usando fallback local:', err);
      return extrairDadosLocal(textoOCR, colunasModelo);
    }
  };

  // Extração local (fallback)
  const extrairDadosLocal = (texto: string, colunas: string[]): DadosExtraidos[] => {
    const linhas = texto.split('\n').filter(l => l.trim());
    const dados: DadosExtraidos[] = [];
    
    // Tentar detectar tabela markdown
    const linhasComPipe = linhas.filter(l => l.includes('|'));
    if (linhasComPipe.length > 1) {
      const headers = linhasComPipe[0].split('|').map(h => h.trim()).filter(Boolean);
      for (let i = 1; i < linhasComPipe.length; i++) {
        if (linhasComPipe[i].includes('---')) continue;
        const valores = linhasComPipe[i].split('|').map(v => v.trim()).filter(() => true);
        const obj: DadosExtraidos = {};
        colunas.forEach((col, idx) => {
          // Tentar mapear por similaridade de nome
          const headerIdx = headers.findIndex(h => 
            normalizar(h).includes(normalizar(col)) || normalizar(col).includes(normalizar(h))
          );
          obj[col] = headerIdx >= 0 ? (valores[headerIdx] || '') : (valores[idx] || '');
        });
        dados.push(obj);
      }
    }
    
    // Se não encontrou tabela, criar um registro com o texto completo na primeira coluna
    if (dados.length === 0 && colunas.length > 0) {
      const obj: DadosExtraidos = {};
      colunas.forEach((col, idx) => {
        obj[col] = idx === 0 ? texto.slice(0, 500) : '';
      });
      dados.push(obj);
    }
    
    return dados;
  };

  // Normalizar string para comparação
  const normalizar = (s: string) => 
    String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Processar arquivos de entrada
  const processarArquivos = async () => {
    if (!modeloSelecionado) {
      mostrarMensagem('Selecione um modelo de saída primeiro', 'error');
      return;
    }
    if (arquivosEntrada.length === 0) {
      mostrarMensagem('Adicione arquivos para processar', 'error');
      return;
    }

    setProcessando(true);
    setProgresso(0);
    const todosDados: DadosExtraidos[] = [];
    const todosCampos = new Set<string>();

    try {
      for (let i = 0; i < arquivosEntrada.length; i++) {
        const arquivo = arquivosEntrada[i];
        setProgresso(Math.round(((i + 0.3) / arquivosEntrada.length) * 100));
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
          const textoOCR = await chamarOCR(arquivo);
          setProgresso(Math.round(((i + 0.7) / arquivosEntrada.length) * 100));
          dadosArquivo = await extrairDadosEstruturados(textoOCR, modeloSelecionado.colunas);
        }
        // Coletar todos os campos encontrados
        dadosArquivo.forEach(d => {
          Object.keys(d).forEach(k => todosCampos.add(k));
        });
        todosDados.push(...dadosArquivo);
        setProgresso(Math.round(((i + 1) / arquivosEntrada.length) * 100));
      }

      setCamposExtraidos(Array.from(todosCampos));
      setDadosExtraidos(todosDados);
      console.log('[OCR] dadosExtraidos set:', todosDados.length, 'records', todosDados);
      
      // Auto-mapear campos
      autoMapearCampos(modeloSelecionado.colunas, Array.from(todosCampos));
      
      setEtapaAtual(2);
      mostrarMensagem(`${todosDados.length} registros extraídos com sucesso!`, 'success');
    } catch (err: any) {
      mostrarMensagem('Erro ao processar: ' + (err?.message || String(err)), 'error');
    } finally {
      setProcessando(false);
    }
  };

  // Auto-mapear campos por similaridade
  const autoMapearCampos = (colunasModelo: string[], camposEncontrados: string[]) => {
    const novosMapeamentos: MapeamentoCampo[] = [];
    
    colunasModelo.forEach(coluna => {
      const colunaNorm = normalizar(coluna);
      let melhorMatch = '';
      let melhorScore = 0;

      camposEncontrados.forEach(campo => {
        const campoNorm = normalizar(campo);
        let score = 0;
        
        // Match exato
        if (colunaNorm === campoNorm) score = 100;
        // Contém
        else if (colunaNorm.includes(campoNorm) || campoNorm.includes(colunaNorm)) score = 80;
        // Palavras em comum
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

  // Gerar dados finais com base nos mapeamentos
  const gerarDadosFinais = (): DadosExtraidos[] => {
    if (!modeloSelecionado) return [];
    
    return dadosExtraidos.map(registro => {
      const novoRegistro: DadosExtraidos = {};
      mapeamentos.forEach(map => {
        novoRegistro[map.colunaModelo] = map.campoExtraido ? (registro[map.campoExtraido] || '') : '';
      });
      return novoRegistro;
    });
  };

  // Deduplica registros para garantir linha única por identificador (ex: O.S., CPF)
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

  const exportarExcel = async () => {
    try {
      let dadosFinais = gerarDadosFinais();
      
      // Deduplica para garantir linha única por O.S./ID
      dadosFinais = deduplicarDados(dadosFinais);
      
      console.log('[Exportar Excel] Dados finais:', dadosFinais.length, 'linhas');
      
      if (dadosFinais.length === 0) {
        mostrarMensagem('Nenhum dado para exportar', 'error');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Dados Organizados');
      
      // Cabeçalho
      const colunas = modeloSelecionado?.colunas || [];
      console.log('[Exportar Excel] Colunas:', colunas);
      
      sheet.addRow(colunas);
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1976D2' },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Dados - cada O.S. em uma linha única
      dadosFinais.forEach((registro, idx) => {
        const linha = colunas.map(col => registro[col] || '');
        sheet.addRow(linha);
      });

      // Ajustar largura
      sheet.columns.forEach(col => { col.width = 25; });

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
      
      const nomeArquivo = `dados_organizados_${Date.now()}.xlsx`;
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

  const exportarCSV = () => {
    try {
      let dadosFinais = gerarDadosFinais();
      
      // Deduplica para garantir linha única por O.S./ID
      dadosFinais = deduplicarDados(dadosFinais);
      
      console.log('[Exportar CSV] Dados finais:', dadosFinais.length, 'linhas');
      
      if (dadosFinais.length === 0) {
        mostrarMensagem('Nenhum dado para exportar', 'error');
        return;
      }

      const colunas = modeloSelecionado?.colunas || [];
      console.log('[Exportar CSV] Colunas:', colunas);
      
      const linhas = [
        colunas.join(','),
        ...dadosFinais.map(r => colunas.map(c => {
          const valor = String(r[c] || '').trim();
          // Escape de aspas duplas para CSV
          const escapado = valor.replace(/"/g, '""');
          return valor.includes(',') || valor.includes('"') || valor.includes('\n') 
            ? `"${escapado}"` 
            : valor;
        }).join(','))
      ];
      
      const conteudo = linhas.join('\n');
      console.log('[Exportar CSV] Conteúdo gerado:', conteudo.length, 'caracteres');
      
      const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
      console.log('[Exportar CSV] Blob criado:', blob.size, 'bytes');
      
      const nomeArquivo = `dados_organizados_${Date.now()}.csv`;
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

  // ============ RENDERIZAÇÃO ============

  const etapas = [
    { label: 'Modelo', desc: 'Configurar saída' },
    { label: 'Upload', desc: 'Enviar documentos' },
    { label: 'Mapear', desc: 'Vincular campos' },
    { label: 'Exportar', desc: 'Baixar resultado' },
  ];

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
            gap: 8px;
            padding: 10px 16px;
            border-radius: 50px;
            transition: all 0.3s ease;
            cursor: default;
            min-width: fit-content;
          }
          
          .ocr-step.active {
            background: linear-gradient(135deg, var(--ocr-primary) 0%, var(--ocr-primary-light) 100%);
            color: white;
            box-shadow: 0 4px 14px rgba(21, 101, 192, 0.3);
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
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            background: rgba(255,255,255,0.2);
          }
          
          .ocr-step.pending .ocr-step-number {
            background: #cbd5e1;
            color: #64748b;
          }
          
          .ocr-table-container {
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--ocr-border);
          }
          
          .ocr-table-container::-webkit-scrollbar {
            height: 8px;
          }
          
          .ocr-table-container::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
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
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header Profissional */}
            <div className={classes.header}>
              <div className={classes.headerIcon}>
                <Build style={{ fontSize: 32 }} />
                <Typography variant={isMobile ? 'h5' as any : 'h4'} style={{ fontWeight: 700 }}>
                  OCR Inteligente
                </Typography>
              </div>
              <Typography variant="body1" style={{ color: 'var(--ocr-text-secondary)', maxWidth: 500, margin: '0 auto' }}>
                Transforme documentos desorganizados em planilhas estruturadas automaticamente
              </Typography>
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

              {/* Stepper Profissional */}
              <div className={classes.stepper}>
                {etapas.map((etapa, index) => (
                  <div
                    key={index}
                    className={`ocr-step ${etapaAtual === index ? 'active' : etapaAtual > index ? 'completed' : 'pending'}`}
                  >
                    <div className="ocr-step-number">
                      {etapaAtual > index ? '✓' : index + 1}
                    </div>
                    <div className="ocr-step-label">
                      <Typography variant="body2" style={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {etapa.label}
                      </Typography>
                      {!isMobile && (
                        <Typography variant="caption" style={{ opacity: 0.8, display: 'block' }}>
                          {etapa.desc}
                        </Typography>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ETAPA 0: Configurar Modelo */}
              {etapaAtual === 0 && (
                <>
                  <Paper className={classes.ocrCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                      <div className={classes.statCardSuccess} style={{ padding: 12, borderRadius: 16, color: '#1565c0' }}>
                        <TableChart />
                      </div>
                    </div>
                    <Typography variant="body2" style={{ color: 'var(--ocr-text-secondary)' }}>
                      Defina as colunas que deseja na planilha final
                    </Typography>
                  </Paper>
                </>
              )}
                  <Tabs 
                    value={tabAtiva} 
                    onChange={(_: React.SyntheticEvent, v: number) => setTabAtiva(v)} 
                  >
                    <Tab icon={<FolderOpen style={{ fontSize: 18 }} />} label="Modelos Salvos" />
                    <Tab icon={<Add style={{ fontSize: 18 }} />} label="Criar Novo" />
                </Tabs>

                {/* Tab: Modelos Salvos */}
                {tabAtiva === 0 && (
                  <div>
                    {modelosSalvos.length === 0 ? (
                      <div className={classes.emptyState}>
                        <FolderOpen style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16 }} />
                        <Typography variant="h6" style={{ color: '#64748b', marginBottom: 8 }}>
                          Nenhum modelo salvo
                        </Typography>
                        <Typography variant="body2" style={{ color: '#94a3b8', marginBottom: 16 }}>
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
                      <div className={classes.scrollableList}>
                        {modelosSalvos.map(modelo => (
                          <Paper
                            key={modelo.id}
                            elevation={0}
                            style={{
                              padding: 16,
                              marginBottom: 12,
                              border: modeloSelecionado?.id === modelo.id 
                                ? '2px solid #1976d2' 
                                : '1px solid #e2e8f0',
                              borderRadius: 16,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              background: modeloSelecionado?.id === modelo.id 
                                ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                                : '#fff',
                              ...(modeloSelecionado?.id === modelo.id ? {} : { boxShadow: 'none' }),
                            }}
                            onClick={() => setModeloSelecionado(modelo)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ padding: 8, borderRadius: 12, background: modeloSelecionado?.id === modelo.id ? '#1976d2' : '#e2e8f0', color: modeloSelecionado?.id === modelo.id ? '#fff' : '#64748b' }}>
                                  <InsertDriveFile fontSize="small" />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                                      {modelo.nome}
                                    </Typography>
                                    {modeloSelecionado?.id === modelo.id && (
                                      <CheckCircle style={{ fontSize: 18, color: '#1976d2' }} />
                                    )}
                                  </div>
                                  <Typography variant="caption" style={{ color: '#64748b' }}>
                                    {modelo.colunas.length} colunas
                                  </Typography>
                                </div>
                              </div>
                              <Tooltip title="Excluir modelo">
                                <IconButton
                                  size="small"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setModeloParaExcluir(modelo.id);
                                    setDialogConfirmacao(true);
                                  }}
                                  style={{ color: '#94a3b8' }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </div>
                            {modeloSelecionado?.id === modelo.id && (
                              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {modelo.colunas.slice(0, 8).map((col, i) => (
                                  <Chip 
                                    key={i} 
                                    label={col} 
                                    size="small" 
                                    style={{
                                      fontSize: '0.7rem',
                                      height: 24,
                                      background: '#e2e8f0',
                                      color: '#475569',
                                      marginRight: 4,
                                      marginBottom: 4
                                    }}
                                  />
                                ))}
                                {modelo.colunas.length > 8 && (
                                  <Chip 
                                    label={`+${modelo.colunas.length - 8}`} 
                                    size="small"
                                    style={{
                                      fontSize: '0.7rem',
                                      height: 24,
                                      background: '#e2e8f0',
                                      color: '#475569',
                                      marginRight: 4,
                                      marginBottom: 4
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </Paper>
                        ))}
                      </div>
                    )}
                {Number(tabAtiva) === 1 && (
                  <div>
                    {/* Upload de arquivo modelo */}
                    <div
                      className={`ocr-upload-zone ${arquivoModelo ? 'active' : ''}`}
                      onDrop={handleDropModelo}
                      onDragOver={(e: React.DragEvent) => e.preventDefault()}
                      onClick={() => inputModeloRef.current?.click()}
                      style={{ marginBottom: 24 }}
                    >
                      <input
                        ref={inputModeloRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processarArquivoModelo(file);
                        }}
                      />
                      <CloudUpload style={{ fontSize: 48, color: arquivoModelo ? '#4caf50' : '#94a3b8', marginBottom: 16 }} />
                      <Typography variant="h6" style={{ color: '#475569', marginBottom: 8 }}>
                        {arquivoModelo ? arquivoModelo.name : 'Arraste seu arquivo modelo aqui'}
                      </Typography>
                      <Typography variant="body2" style={{ color: '#94a3b8' }}>
                        Excel (.xlsx, .xls) ou CSV - As colunas serão detectadas automaticamente
                      </Typography>
                    </div>

                    {/* Seletor manual de linha de cabeçalho */}
                    {linhasPreview.length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <Typography variant="subtitle1" style={{ fontWeight: 600, color: '#1e293b' }}>
                            Selecione a linha de cabeçalho:
                          </Typography>
                          <Button 
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => { setLinhasPreview([]); setColunasNovoModelo([]); setArquivoModelo(null); }}
                            startIcon={<Delete />}
                          >
                            Limpar
                          </Button>
                        </div>
                        <TableContainer 
                          className="ocr-table-container"
                          style={{ maxHeight: 280 }}
                        >
                          <Table size="small" stickyHeader>
                            <TableBody>
                              {linhasPreview.map((linha, idx) => (
                                <TableRow 
                                  key={idx}
                                  onClick={() => selecionarLinhaHeader(idx)}
                                  style={{ 
                                    cursor: 'pointer',
                                    backgroundColor: linhaHeaderSelecionada === idx ? '#dbeafe' : 'inherit',
                                    transition: 'all 0.2s ease',
                                    ...(linhaHeaderSelecionada === idx
                                      ? { backgroundColor: '#dbeafe' }
                                      : {}),
                                  }}
                                >
                                  <TableCell style={{ 
                                    width: 50, 
                                    fontWeight: 700, 
                                    color: linhaHeaderSelecionada === idx ? '#1565c0' : '#64748b',
                                    background: linhaHeaderSelecionada === idx ? '#eff6ff' : '#f8fafc',
                                  }}>
                                    #{idx + 1}
                                  </TableCell>
                                  {linha.slice(0, isMobile ? 4 : 8).map((cell, cellIdx) => (
                                    <TableCell 
                                      key={cellIdx} 
                                      style={{ 
                                        fontSize: '0.8rem', 
                                        maxWidth: isMobile ? 80 : 140, 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        fontWeight: linhaHeaderSelecionada === idx ? 600 : 400,
                                      }}
                                    >
                                      {cell || '-'}
                                    </TableCell>
                                  ))}
                                  {linha.length > (isMobile ? 4 : 8) && (
                                    <TableCell style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                      +{linha.length - (isMobile ? 4 : 8)}
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {linhaHeaderSelecionada >= 0 && colunasNovoModelo.length > 0 && (
                          <Paper
                            className={classes.alertSuccess}
                            style={{ marginTop: 16, borderRadius: 8 }}
                          >
                            <span><strong>Linha {linhaHeaderSelecionada + 1}</strong> selecionada com <strong>{colunasNovoModelo.length}</strong> colunas</span>
                          </Paper>
                        )}
                      </div>
                    )}

                    <Divider className={classes.divider}>OU</Divider>

                    {/* Adicionar colunas manualmente */}
                    <div style={{ marginBottom: 24 }}>
                      <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
                        Adicionar colunas manualmente:
                      </Typography>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <TextField
                          size="small"
                          placeholder="Nome da coluna"
                          value={novaColuna}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovaColuna(e.target.value)}
                          onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && adicionarColuna()}
                          style={{ flex: 1 }}
                        />
                        <Button
                          variant="outlined"
                          onClick={adicionarColuna}
                          startIcon={<Add />}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>

                    {/* Lista de colunas */}
                    {colunasNovoModelo.length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
                          Colunas configuradas ({colunasNovoModelo.length}):
                        </Typography>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {colunasNovoModelo.map((col, i) => (
                            <Chip
                              key={i}
                              label={col}
                              onDelete={() => removerColuna(i)}
                              color="primary"
                              variant="outlined"
                              style={{ marginRight: 8, marginBottom: 8 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nome do modelo */}
                    <TextField
                      fullWidth
                      label="Nome do modelo"
                      value={nomeNovoModelo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNomeNovoModelo(e.target.value)}
                      style={{ marginBottom: 16 }}
                    />

                    <Button
                      variant="contained"
                      style={{ 
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        borderRadius: 8,
                        paddingLeft: 32,
                        paddingRight: 32,
                        fontWeight: 600
                      }}
                      onClick={salvarModelo}
                      startIcon={<Save />}
                      disabled={colunasNovoModelo.length === 0 || !nomeNovoModelo.trim()}
                    >
                      Salvar Modelo
                    </Button>
                  </div>
                )}

                {/* Botão avançar */}
                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      style={{ 
                        background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
                        borderRadius: 8,
                        paddingLeft: 32,
                        paddingRight: 32,
                        fontWeight: 600
                      }}
                      onClick={() => setEtapaAtual(1)}
                      disabled={!modeloSelecionado}
                      size="large"
                      endIcon={<ArrowForward />}
                    >
                      Continuar para Upload
                    </Button>
                  </div>
                </div>
              )}

              {/* ETAPA 1: Upload de Documentos */}
          {etapaAtual === 1 && (
            <Card className={classes.ocrCard} style={{ overflow: 'hidden' }}>
              <div className={classes.contentHeader}>
                <Description style={{ fontSize: 32 }} />
                <div>
                  <Typography variant="h6" style={{ fontWeight: 700 }}>
                    Enviar Documentos
                  </Typography>
                  <Typography variant="body2" style={{ opacity: 0.9 }}>
                    Faça upload dos arquivos para processamento OCR
                  </Typography>
                </div>
              </div>
              
              <CardContent className={classes.contentBox}>
                {modeloSelecionado &&
                  <Paper
                    className={classes.alertInfo}
                    style={{ marginBottom: 24, borderRadius: 8, display: 'flex', alignItems: 'center' }}
                  >
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span>Modelo:</span>
                    <Chip 
                      label={modeloSelecionado.nome} 
                      color="primary" 
                      size="small" 
                      style={{ fontWeight: 600 }}
                    />
                    <span>•</span>
                    <span>{modeloSelecionado.colunas.length} colunas</span>
                  </span>
                  </Paper>
                }

                {/* Área de upload aprimorada */}
                <div
                  className={arquivosEntrada.length > 0 ? classes.uploadZoneActive : classes.uploadZoneInactive}
                  onDrop={handleDropArquivos}
                  onDragOver={(e: React.DragEvent) => e.preventDefault()}
                  onClick={() => inputArquivosRef.current?.click()}
                >
                  <input
                    ref={inputArquivosRef}
                    type="file"
                    accept=".pdf,image/*,.csv,.xlsx,.xls"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setArquivosEntrada(prev => ([...prev, ...files] as File[]));
                    }}
                  />
                  <CloudUpload style={{ 
                    fontSize: 64,
                    color: arquivosEntrada.length > 0 ? '#4caf50' : '#90caf9',
                    marginBottom: 16
                  }} />
                  <Typography variant="h5" style={{ marginBottom: 8, fontWeight: 600 }}>
                    {arquivosEntrada.length > 0 
                      ? `${arquivosEntrada.length} arquivo(s) selecionado(s)`
                      : 'Arraste documentos aqui'}
                  </Typography>
                  <Typography variant="body1" color="textSecondary" style={{ marginBottom: 16 }}>
                    ou clique para selecionar
                  </Typography>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {['PDF', 'JPG', 'PNG', 'XLSX', 'CSV'].map(fmt => (
                      <Chip key={fmt} label={fmt} size="small" variant="outlined" style={{ opacity: 0.7 }} />
                    ))}
                  </div>

                {/* Lista de arquivos aprimorada */}
                {arquivosEntrada.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <Typography variant="subtitle1" style={{ marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Folder color="primary" />
                      Arquivos para processar ({arquivosEntrada.length})
                    </Typography>
                    <div style={{
                      maxHeight: 250,
                      overflow: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: 8
                    }}>
                      {arquivosEntrada.map((file, i) => (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: i < arquivosEntrada.length - 1 ? '1px solid #f0f0f0' : 'none',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                            <Chip
                              label={file.name.split('.').pop()?.toUpperCase()}
                              size="small"
                              color={file.type.includes('pdf') ? 'error' : file.type.includes('image') ? 'warning' : 'primary'}
                              style={{ fontWeight: 600, minWidth: 50 }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="body2"
                                style={{
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {file.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {formatBytes(file.size)}
                              </Typography>
                            </div>
                          </div>
                          <IconButton
                            size="small"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setArquivosEntrada(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            style={{ color: '#f44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progresso aprimorado */}
                {processando && (
                  <div className={classes.progressBox}>
                    <CircularProgress 
                      size={60} 
                      thickness={4}
                      style={{ marginBottom: 16 }}
                    />
                    <Typography variant="h6" style={{ marginBottom: 8 }}>
                      Processando documentos...
                    </Typography>
                    <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                      {progresso}% concluído
                    </Typography>
                    <div className={classes.progressBar}>
                      <div className={classes.progressFill} style={{ width: `${progresso}%` }} />
                    </div>
                  </div>
                )}

                {/* Navegação aprimorada */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: '1px solid #e0e0e0',
                  flexDirection: 'row',
                  gap: 16
                }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => setEtapaAtual(0)}
                    startIcon={<ArrowBack />}
                    style={{ borderRadius: 8, paddingLeft: 24, paddingRight: 24 }}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="contained"
                    style={{ 
                      background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
                      borderRadius: 8, 
                      paddingLeft: 32,
                      paddingRight: 32,
                      paddingTop: 8,
                      paddingBottom: 8,
                      fontWeight: 600
                    }}
                    onClick={processarArquivos}
                    disabled={arquivosEntrada.length === 0 || processando}
                    startIcon={processando ? <CircularProgress size={20} color="inherit" /> : <Build />}
                    size="large"
                  >
                    {processando ? 'Processando...' : 'Processar com OCR'}
                  </Button>
                </div>
                {/* Close upload zone wrapper */}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ETAPA 2: Mapeamento de Campos */}
          {etapaAtual === 2 && (
            <Card className="ocr-card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)', 
                padding: 16, 
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 16
              }}>
                <Settings style={{ fontSize: 32 }} />
                <div>
                  <Typography variant="h6" style={{ fontWeight: 700 }}>
                    Mapear Campos
                  </Typography>
                  <Typography variant="body2" style={{ opacity: 0.9 }}>
                    Associe os dados extraídos às colunas do modelo
                  </Typography>
                </div>
              </div>

              <CardContent style={{ padding: '16px' }}>
                <Paper
                  className={classes.alertSuccess}
                  style={{ marginBottom: 24, borderRadius: 8 }}
                >
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <strong>{dadosExtraidos.length}</strong> registros extraídos de{' '}
                    <strong>{arquivosEntrada.length}</strong> arquivo(s)
                  </span>
                  <Chip 
                    label={`Modelo: ${modeloSelecionado?.nome}`} 
                    size="small" 
                    color="primary"
                    style={{ fontWeight: 600 }}
                  />
                </span>
                </Paper>

                {/* Tabela de mapeamento aprimorada */}
                <div style={{ marginBottom: 32 }}>
                  <Typography variant="subtitle1" style={{ marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TableChart style={{ color: '#1976d2' }} />
                    Configuração de Mapeamento
                  </Typography>
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
                              width: '50%'
                            }}>
                              Campo Extraído
                            </TableCell>
                            <TableCell style={{ 
                              fontWeight: 700, 
                              backgroundColor: '#1976d2', 
                              color: '#fff',
                              borderBottom: 'none',
                              width: '20%',
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
                                  {camposExtraidos.map(campo => (
                                    <MenuItem key={campo} value={campo}>{campo}</MenuItem>
                                  ))}
                                </TextField>
                              </TableCell>
                              <TableCell style={{ textAlign: 'center' }}>
                                <Chip
                                  label={`${Math.round(map.confianca)}%`}
                                  size="small"
                                  color={map.confianca >= 80 ? 'secondary' : 'default'}
                                  style={{ 
                                    fontWeight: 600,
                                    minWidth: 60
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                </div>

                {/* Preview dos dados aprimorado */}
                <div style={{ marginBottom: 24 }}>
                  <Typography variant="subtitle1" style={{ marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Visibility color="primary" />
                    Preview dos Dados Organizados
                  </Typography>
                  <div className="ocr-table-container" style={{ 
                    borderRadius: 8, 
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden'
                  }}>
                    <TableContainer style={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {modeloSelecionado?.colunas.map((col, i) => (
                              <TableCell 
                                key={i} 
                                style={{ 
                                  fontWeight: 700, 
                                  backgroundColor: '#4caf50', 
                                  color: '#fff',
                                  borderBottom: 'none',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {col}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const previewRows = gerarDadosFinais();
                            return previewRows.map((row, i) => (
                              <TableRow 
                                key={i}
                                style={{ 
                                  backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff'
                                }}
                              >
                                {modeloSelecionado?.colunas.map((col, j) => (
                                  <TableCell 
                                    key={j}
                                    style={{ 
                                      whiteSpace: 'nowrap',
                                      maxWidth: 200,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {row[col] || <span style={{ color: '#bdbdbd' }}>-</span>}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                  <Typography variant="body2" color="textSecondary" style={{ marginTop: 8, textAlign: 'right' }}>
                    Mostrando {dadosExtraidos.length} registro{dadosExtraidos.length === 1 ? '' : 's'}
                  </Typography>
                </div>

                {/* Navegação aprimorada */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: '1px solid #e0e0e0',
                  flexDirection: 'row',
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
                  <Button
                    variant="contained"
                    style={{ 
                      background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
                      borderRadius: 8, 
                      paddingLeft: 32,
                      paddingRight: 32,
                      paddingTop: 8,
                      paddingBottom: 8,
                      fontWeight: 600
                    }}
                    onClick={() => setEtapaAtual(3)}
                    size="large"
                    endIcon={<ArrowForward />}
                  >
                    Confirmar e Exportar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ETAPA 3: Exportação */}
          {etapaAtual === 3 && (
            <Card className="ocr-card" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)', 
                padding: 24, 
                color: '#fff',
                textAlign: 'center'
              }}>
                <CheckCircle style={{ fontSize: 64, marginBottom: 8, animation: 'pulse 2s infinite' }} />
                <Typography variant="h5" style={{ fontWeight: 700, marginBottom: 8 }}>
                  Processamento Concluído!
                </Typography>
                <Typography variant="body1" style={{ opacity: 0.9 }}>
                  {dadosExtraidos.length} registros organizados com sucesso
                </Typography>
              </div>
              
              <CardContent style={{ padding: '32px' }}>
                {/* Resumo */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 32, 
                  marginBottom: 32,
                  flexWrap: 'wrap'
                }}>
                  <Paper style={{ 
                    padding: 16, 
                    textAlign: 'center', 
                    minWidth: 120,
                    backgroundColor: '#e3f2fd',
                    borderRadius: 8
                  }}>
                    <Typography variant="h4" color="primary" style={{ fontWeight: 700 }}>
                      {dadosExtraidos.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Registros
                    </Typography>
                  </Paper>
                  <Paper style={{ 
                    padding: 16, 
                    textAlign: 'center', 
                    minWidth: 120,
                    backgroundColor: '#f3e5f5',
                    borderRadius: 8
                  }}>
                    <Typography variant="h4" color="secondary" style={{ fontWeight: 700 }}>
                      {modeloSelecionado?.colunas.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Colunas
                    </Typography>
                  </Paper>
                  <Paper style={{ 
                    padding: 16, 
                    textAlign: 'center', 
                    minWidth: 120,
                    backgroundColor: '#e8f5e9',
                    borderRadius: 8
                  }}>
                    <Typography variant="h4" style={{ color: '#2e7d32', fontWeight: 700 }}>
                      {arquivosEntrada.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Arquivos
                    </Typography>
                  </Paper>
                </div>

                {/* Info do modelo */}
                <Paper
                  className={classes.alertInfo}
                  style={{ marginBottom: 24, borderRadius: 8 }}
                >
                  <span>Dados organizados no formato do modelo: <strong>"{modeloSelecionado?.nome}"</strong></span>
                </Paper>

                {/* Preview final aprimorado */}
                <div style={{ marginBottom: 32 }}>
                  <Typography variant="subtitle1" style={{ marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Visibility color="primary" />
                    Preview do Resultado Final
                  </Typography>
                  <div className="ocr-table-container" style={{ 
                    borderRadius: 8, 
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden'
                  }}>
                    <TableContainer style={{ maxHeight: 280 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            {modeloSelecionado?.colunas.map((col, i) => (
                              <TableCell 
                                key={i} 
                                style={{ 
                                  fontWeight: 700, 
                                  backgroundColor: '#4caf50', 
                                  color: '#fff',
                                  borderBottom: 'none',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {col}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const previewFinal = gerarDadosFinais();
                            return previewFinal.map((row, i) => (
                              <TableRow 
                                key={i}
                                style={{ 
                                  backgroundColor: i % 2 === 1 ? '#fafafa' : '#fff'
                                }}
                              >
                                {modeloSelecionado?.colunas.map((col, j) => (
                                  <TableCell 
                                    key={j}
                                    style={{ 
                                      whiteSpace: 'nowrap',
                                      maxWidth: 200,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {row[col] || <span style={{ color: '#bdbdbd' }}>-</span>}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                  <Typography variant="body2" color="textSecondary" style={{ marginTop: 8, textAlign: 'right' }}>
                    Mostrando {dadosExtraidos.length} registro{dadosExtraidos.length === 1 ? '' : 's'}
                  </Typography>
                </div>

                {/* Botões de exportação aprimorados */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 24, 
                  marginBottom: 32,
                  flexWrap: 'wrap'
                }}>
                  <Button
                    variant="contained"
                    onClick={exportarExcel}
                    startIcon={<GetApp />}
                    size="large"
                    style={{
                      paddingLeft: 32,
                      paddingRight: 32,
                      paddingTop: 8,
                      paddingBottom: 8,
                      borderRadius: 8,
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                      boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Baixar Excel (.xlsx)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={exportarCSV}
                    startIcon={<GetApp />}
                    size="large"
                    style={{
                      paddingLeft: 32,
                      paddingRight: 32,
                      paddingTop: 8,
                      paddingBottom: 8,
                      borderRadius: 8,
                      fontWeight: 600,
                      borderWidth: 2,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Baixar CSV
                  </Button>
                </div>

                <Divider style={{ margin: '32px 0' }}>
                  <Chip label="Outras Ações" size="small" />
                </Divider>

                {/* Ações secundárias */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 16,
                  flexWrap: 'wrap'
                }}>
                  <Button
                    variant="outlined"
                    onClick={() => setEtapaAtual(2)}
                    startIcon={<Settings />}
                    style={{ borderRadius: 8 }}
                  >
                    Ajustar Mapeamento
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={reiniciar}
                    startIcon={<Refresh />}
                    style={{ borderRadius: 8 }}
                  >
                    Processar Novos Documentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
              <Button onClick={excluirModelo} color="error" variant="contained">
                Excluir
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      </div>
    </div>
    </>
  );
}
