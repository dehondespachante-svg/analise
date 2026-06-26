"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  Database,
  Flame,
  Gauge,
  Layers,
  MapPin,
  Megaphone,
  MessageCircle,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  LineChart as LineChartIcon,
  Target,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { carregarRelatorioCache, limparRelatorioCache, salvarRelatorioCache } from "@/src/features/honorarios/client/cache";
import { analisarArquivosNoNavegador } from "@/src/features/honorarios/client/processar-arquivos";
import { relatorioVazio, type RelatorioHonorarios, type ServicoDestaque } from "@/src/features/honorarios/modelo";
import type { AnaliseDadosLocais, FiltroListaLocal } from "@/src/features/dados-locais/types";
import styles from "@/src/styles/AnaliseHonorarios.module.css";

type Aba = "resumo" | "comparacao" | "estrategia" | "anuncios" | "ganhos" | "servicos" | "metas" | "metaFuncionarios" | "auditoria";
type ModoAnalise = "honorarios" | "dados-locais";
type CenarioId = "base" | "bull" | "bear" | "stress";
type AbaLocal = "visao" | "cidades" | "estrategia" | "listas" | "qualidade";

type MetaDinamica = {
  prioridade: string;
  acao: string;
  detalhe: string;
  indicador: string;
  progresso: number;
};

type TendenciaDinamica = {
  tema: string;
  padrao: string;
  impacto: string;
  recomendacao: string;
};

type RadarStatus = "bom" | "alerta" | "critico";

type ChecagemLeitura = {
  titulo: string;
  valor: string;
  detalhe: string;
  status: RadarStatus;
};

type RadarSinal = {
  titulo: string;
  valor: string;
  detalhe: string;
  status: RadarStatus;
};

type AcaoDecisiva = {
  prioridade: string;
  titulo: string;
  detalhe: string;
  motivo: string;
};

type FatorCausal = {
  fator: string;
  leitura: string;
  impacto: string;
  status: RadarStatus;
};

type MatrizDecisao = {
  eixo: string;
  agora: string;
  proximo: string;
  status: RadarStatus;
};

type TickerEstrategico = {
  label: string;
  valor: string;
  status: RadarStatus;
};

type MapaEstrategico = {
  termo: string;
  leitura: string;
  detalhe: string;
  status: RadarStatus;
};

type CenarioEstrategico = {
  id: CenarioId;
  nome: string;
  valor: number;
  variacao: number;
  gapMeta: number;
  narrativa: string;
  acao: string;
  status: RadarStatus;
};

type AlocacaoFoco = {
  area: string;
  peso: number;
  tese: string;
  acao: string;
  status: RadarStatus;
};

type MovimentoTatico = {
  janela: string;
  movimento: string;
  gatilho: string;
  resultado: string;
};

type PerfilComercial = {
  nomeCurto: string;
  gancho: string;
  dor: string;
  promessa: string;
  prova: string;
  urgencia: string;
  cta: string;
  canal: string;
};

type RoteiroAnuncio = {
  formato: string;
  duracao: string;
  abertura: string;
  meio: string;
  fechamento: string;
  legenda: string;
};

type PlanoAnuncioServico = {
  id: string;
  codigo: number;
  servico: string;
  servicoCurto: string;
  prioridade: string;
  status: RadarStatus;
  score: number;
  anuncios: number;
  melhorCanal: string;
  horarios: string;
  motivacao: string;
  roteiro: RoteiroAnuncio;
  whatsapp: string[];
  cor: string;
};

type CalendarioMarketing = {
  id: string;
  data: string;
  horario: string;
  canal: string;
  tipo: string;
  servico: string;
  motivo: string;
  status: RadarStatus;
};

type MarketingInteligente = {
  planos: PlanoAnuncioServico[];
  calendario: CalendarioMarketing[];
  frasesWhatsapp: Array<{ id: string; servico: string; texto: string; status: RadarStatus }>;
  graficoServicos: Array<{ id: string; servico: string; anuncios: number; score: number; recuperacao: number; cor: string }>;
  graficoCanais: Array<{ canal: string; anuncios: number }>;
  metricas: {
    totalAnuncios: number;
    scoreMedio: number;
    servicosAtivos: number;
    datasPlanejadas: number;
    frases: number;
  };
};

type ValidacaoConta = {
  titulo: string;
  anterior: string;
  atual: string;
  diferenca: string;
  percentual: string;
  indisponivel?: boolean;
};

type PeriodoComparado = {
  label: string;
  quantidade: number;
  valorOs: number;
  honorarios: number;
  honorarioMedio: number;
};

type PassoComparacao = {
  anterior: PeriodoComparado;
  atual: PeriodoComparado;
  diferencaQuantidade: number;
  variacaoQuantidade: number | null;
  diferencaHonorarios: number;
  variacaoHonorarios: number | null;
  diferencaValorOs: number;
  variacaoValorOs: number | null;
  diferencaHonorarioMedio: number;
  variacaoHonorarioMedio: number | null;
};

type ServicoComparado = ServicoDestaque & {
  diferencaQuantidade: number;
  diferencaHonorarios: number;
};

type ServicoHistoricoComparacao = NonNullable<RelatorioHonorarios["servicosPorPeriodo"]>[number] & {
  diferencaQuantidade: number;
  diferencaHonorarios: number;
  variacaoHonorarios: number | null;
};

type PeriodoImportado = NonNullable<RelatorioHonorarios["periodosImportados"]>[number];
type PeriodoServico = NonNullable<RelatorioHonorarios["servicosPorPeriodo"]>[number]["periodos"][number];

type TipoRecorteTemporal = "todos" | "mes" | "semestre" | "trimestre";

type RecorteTemporal = {
  key: string;
  tipo: TipoRecorteTemporal;
  label: string;
  detalhe: string;
  periodoKeys: string[];
};

type GrupoTrimestral = PeriodoComparado & {
  key: string;
  trimestre: number;
  ano: number;
  periodos: PeriodoImportado[];
};

type ServicoTrimestral = {
  codigo: number;
  servico: string;
  honorariosAnterior: number;
  honorariosAtual: number;
  diferencaHonorarios: number;
  variacaoHonorarios: number | null;
  quantidadeAnterior: number;
  quantidadeAtual: number;
  diferencaQuantidade: number;
};

type PlanoCompetencia = {
  ano: number;
  mesNumero: number;
  label: string;
  emAndamento: boolean;
  diasCobertos: number;
  diasNoMes: number;
  cobertura: number;
  metaCrescimento: number;
  baseRecente: number;
  baseSazonal: number;
  baseMeta: number;
  origemMeta: string;
  periodosBase: string[];
  meta: number;
  realizado: number;
  projecao: number;
  gap: number;
  gapProjetado: number;
  progresso: number;
  progressoProjetado: number;
  crescimentoProjetado: number | null;
  atingiuMeta: boolean;
  status: RadarStatus;
  statusLabel: string;
  servicosFoco: Array<{ servico: string; honorarios: number }>;
};

type ComparacaoTrimestral = {
  grupos: GrupoTrimestral[];
  anterior: GrupoTrimestral;
  atual: GrupoTrimestral;
  passo: PassoComparacao;
  servicos: ServicoTrimestral[];
};

const abas: Array<{ id: Aba; label: string; icon: React.ReactNode }> = [
  { id: "comparacao", label: "Comparacao", icon: <ArrowLeftRight size={18} /> },
  { id: "resumo", label: "Resumo", icon: <BarChart3 size={18} /> },
  { id: "estrategia", label: "Estrategia", icon: <Activity size={18} /> },
  { id: "anuncios", label: "Anuncios", icon: <Megaphone size={18} /> },
  { id: "ganhos", label: "Ganhos", icon: <LineChartIcon size={18} /> },
  { id: "servicos", label: "Servicos", icon: <ClipboardList size={18} /> },
  { id: "metas", label: "Metas", icon: <Target size={18} /> },
  { id: "metaFuncionarios", label: "Meta funcionarios", icon: <Users size={18} /> },
  { id: "auditoria", label: "Auditoria", icon: <AlertTriangle size={18} /> },
];

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const numero = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const percentual = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const coresGrafico = ["#1f9d72", "#4666c9", "#d17a22", "#7c5cc4", "#2f8f9d", "#b85c38", "#6b8f3e"];
const MIN_PERIODOS_COMPARACAO = 2;

function formatarValor(valor: number, tipo = "numero") {
  return tipo === "moeda" ? moeda.format(valor) : numero.format(valor);
}

function formatarPercentual(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "Novo";
  return `${valor >= 0 ? "+" : ""}${(valor * 100).toFixed(1).replace(".", ",")}%`;
}

function pct(novo: number, antigo: number) {
  if (!antigo) return novo ? null : 0;
  return (novo - antigo) / antigo;
}

function pegarIndicador(resumo: RelatorioHonorarios["resumo"], indicador: string) {
  return resumo.find((item) => item.indicador === indicador);
}

function limitarPercentual(valor: number) {
  return Math.max(8, Math.min(95, Math.round(valor)));
}

function limitarScore(valor: number) {
  return Math.max(0, Math.min(100, Math.round(valor)));
}

function media(valores: number[]) {
  if (!valores.length) return 0;
  return valores.reduce((acc, valor) => acc + valor, 0) / valores.length;
}

function desvioPadrao(valores: number[]) {
  if (valores.length < 2) return 0;
  const avg = media(valores);
  const variancia = media(valores.map((valor) => (valor - avg) ** 2));
  return Math.sqrt(variancia);
}

function calcularMaxDrawdown(valores: number[]) {
  let topo = valores[0] || 0;
  let piorQueda = 0;

  valores.forEach((valor) => {
    topo = Math.max(topo, valor);
    if (topo > 0) {
      piorQueda = Math.min(piorQueda, (valor - topo) / topo);
    }
  });

  return piorQueda;
}

function juntarLista(itens: string[]) {
  if (itens.length <= 1) return itens[0] || "-";
  if (itens.length === 2) return itens.join(" e ");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function statusClasse(status: RadarStatus) {
  if (status === "critico") return styles.statusCritico;
  if (status === "alerta") return styles.statusAlerta;
  return styles.statusBom;
}

function limitarTexto(texto: string, limite = 22) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1).trim()}...` : limpo;
}

function normalizarTextoFiltro(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function nomeServicoNatural(servico: string) {
  const limpo = servico.replace(/\s+/g, " ").trim();
  const lower = limpo.toLowerCase();

  if (lower.includes("ipva")) return "IPVA";
  if (lower.includes("boleto")) return "boleto";
  if (lower.includes("licenciamento")) return "licenciamento";
  if (lower.includes("transfer")) return "transferencia";
  if (lower.includes("multa")) return "multas";
  if (lower.includes("cnh")) return "CNH";
  if (!limpo) return "servico";

  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
}

function perfilComercialServico(servico: string): PerfilComercial {
  const nomeCurto = nomeServicoNatural(servico);
  const lower = servico.toLowerCase();

  if (lower.includes("ipva")) {
    return {
      nomeCurto,
      gancho: "Nao deixe seu IPVA passar do prazo.",
      dor: "Atraso vira multa, juros e correria quando o cliente mais precisa do documento.",
      promessa: "Conferimos o caminho e ajudamos a deixar tudo em dia com menos stress.",
      prova: "Mostre prazo, valor e proximo passo em uma tela limpa.",
      urgencia: "Melhor resolver antes do vencimento.",
      cta: "Me chama no WhatsApp que eu confiro isso para voce.",
      canal: "WhatsApp + Stories",
    };
  }

  if (lower.includes("boleto")) {
    return {
      nomeCurto,
      gancho: "Seu boleto esta perto do vencimento.",
      dor: "Depois do prazo, o cliente paga mais e ainda perde tempo buscando segunda via.",
      promessa: "A gente lembra, confere e facilita a regularizacao antes de virar problema.",
      prova: "Use imagem simples com vencimento, valor e botao de conversa.",
      urgencia: "Fale hoje, antes que o boleto vença.",
      cta: "Quer que eu te ajude a resolver agora?",
      canal: "WhatsApp direto",
    };
  }

  if (lower.includes("licenciamento")) {
    return {
      nomeCurto,
      gancho: "Licenciamento atrasado trava a rotina.",
      dor: "O cliente so lembra quando precisa circular, vender ou viajar.",
      promessa: "Organizamos a pendencia e deixamos claro o que falta para regularizar.",
      prova: "Mostre antes/depois: pendencia localizada, documento encaminhado.",
      urgencia: "Nao espere precisar do documento para correr atras.",
      cta: "Manda uma mensagem que eu vejo seu caso.",
      canal: "Stories + WhatsApp",
    };
  }

  if (lower.includes("transfer")) {
    return {
      nomeCurto,
      gancho: "Comprou ou vendeu? Transferencia precisa andar.",
      dor: "Quando a transferencia fica para depois, aparecem multa, prazo estourado e dor de cabeca.",
      promessa: "Ajudamos a organizar o processo e evitar atraso.",
      prova: "Mostre os passos: dados, conferencia, envio e acompanhamento.",
      urgencia: "Quanto antes iniciar, menor a chance de travar.",
      cta: "Chama aqui e eu te digo o proximo passo.",
      canal: "Reels + WhatsApp",
    };
  }

  if (lower.includes("multa")) {
    return {
      nomeCurto,
      gancho: "Multa esquecida costuma sair mais cara.",
      dor: "O cliente perde prazo de defesa, desconto ou regularizacao.",
      promessa: "A gente confere a pendencia e orienta o melhor caminho.",
      prova: "Mostre a diferenca entre resolver cedo e deixar acumular.",
      urgencia: "Prazo e o detalhe que muda tudo.",
      cta: "Me chama e vamos conferir antes de passar.",
      canal: "WhatsApp + Feed",
    };
  }

  if (lower.includes("cnh")) {
    return {
      nomeCurto,
      gancho: "CNH em dia evita surpresa ruim.",
      dor: "Pendencia aparece quando o cliente ja precisa dirigir ou renovar.",
      promessa: "Conferimos o status e mostramos o caminho mais simples.",
      prova: "Mostre a rotina: consulta, orientacao e acompanhamento.",
      urgencia: "Nao deixe para a ultima hora.",
      cta: "Quer que eu veja para voce?",
      canal: "Stories + WhatsApp",
    };
  }

  return {
    nomeCurto,
    gancho: `${nomeCurto} sem correria e com acompanhamento.`,
    dor: "O cliente adia porque acha que vai ser complicado, ate virar prazo, custo ou bloqueio.",
    promessa: "Transformamos o problema em uma conversa simples, com proximo passo claro.",
    prova: "Mostre o que sera conferido e o que o cliente recebe no final.",
    urgencia: "Quem resolve antes evita gasto e pressa.",
    cta: "Me chama que eu te digo o caminho.",
    canal: "WhatsApp + Stories",
  };
}

function montarRoteiroAnuncio(perfil: PerfilComercial): RoteiroAnuncio {
  return {
    formato: "Reels, Stories ou status de 20s",
    duracao: "20 segundos",
    abertura: `Cena 1: "${perfil.gancho}" com imagem limpa e direta.`,
    meio: `Cena 2: mostre a dor real. ${perfil.dor}`,
    fechamento: `Cena 3: ${perfil.promessa} Feche com: "${perfil.cta}"`,
    legenda: `${perfil.gancho} ${perfil.urgencia} Atendimento simples pelo WhatsApp.`,
  };
}

function montarFrasesWhatsapp(perfil: PerfilComercial) {
  return [
    `Oi, tudo bem? Passando para lembrar de ${perfil.nomeCurto}. ${perfil.urgencia}`,
    `${perfil.gancho} Se quiser, eu confiro para voce e ja te digo o proximo passo.`,
    `Nao deixa isso virar correria. ${perfil.cta}`,
  ];
}

function datasPadraoMarketing(quantidade: number) {
  const datas: Date[] = [];
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  for (let dias = 1; datas.length < quantidade && dias < 70; dias += 1) {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + dias);
    const diaSemana = data.getDay();
    if ([1, 3, 5, 6].includes(diaSemana)) datas.push(data);
  }

  return datas;
}

function formatarDataMarketing(data: Date) {
  return data
    .toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
    .replace(".", "");
}

function montarMarketingInteligente(relatorio: RelatorioHonorarios, planoCompetencia: PlanoCompetencia | null): MarketingInteligente {
  const servicosBase = relatorio.servicos.filter((servico) => servico.honorarios2026 || servico.qtd2026);
  const totalHonorarios = servicosBase.reduce((total, servico) => total + servico.honorarios2026, 0) || 1;
  const totalQuantidade = servicosBase.reduce((total, servico) => total + servico.qtd2026, 0) || 1;
  const mediaHonorario = totalHonorarios / totalQuantidade;
  const competenciaVenda = planoCompetencia?.label || relatorio.comparacao?.atualLabel || "proximo ciclo";

  const planos = servicosBase
    .map((servico, index) => {
      const perfil = perfilComercialServico(servico.servico);
      const participacaoHonorarios = servico.honorarios2026 / totalHonorarios;
      const participacaoQuantidade = servico.qtd2026 / totalQuantidade;
      const crescimento = servico.crescimento;
      const crescimentoScore =
        crescimento === null ? 10 : crescimento >= 0 ? Math.min(22, crescimento * 55) : Math.min(24, Math.abs(crescimento) * 60);
      const quedaScore = crescimento !== null && crescimento < -0.08 ? 16 : 0;
      const mediaScore = servico.honorarioMedio2026 >= mediaHonorario ? 10 : 4;
      const score = limitarScore(32 + participacaoHonorarios * 35 + participacaoQuantidade * 18 + crescimentoScore + quedaScore + mediaScore);
      const anuncios = Math.max(4, Math.min(14, Math.round(4 + score / 12 + participacaoHonorarios * 9 + quedaScore / 8)));
      const status: RadarStatus =
        crescimento !== null && crescimento < -0.15 ? "critico" : score >= 76 ? "bom" : score >= 58 ? "alerta" : "critico";
      const prioridade =
        crescimento !== null && crescimento < -0.12
          ? "Recuperar rapido"
          : participacaoHonorarios >= 0.24
            ? "Servico lider"
            : crescimento !== null && crescimento > 0.22
              ? "Acelerar agora"
              : "Manter vivo";
      const motivacao =
        crescimento !== null && crescimento < -0.12
          ? `Caiu ${formatarPercentual(crescimento)}. Use lembrete, prazo e atendimento rapido para puxar conversa.`
          : crescimento !== null && crescimento > 0.18
            ? `Subiu ${formatarPercentual(crescimento)}. Agora e hora de repetir a mensagem que ja vendeu.`
            : `Tem peso em ${competenciaVenda}. Anuncie com constancia para virar lembranca antes do cliente ter urgencia.`;

      return {
        id: `${servico.codigo}-${index}`,
        codigo: servico.codigo,
        servico: servico.servico,
        servicoCurto: limitarTexto(perfil.nomeCurto, 24),
        prioridade,
        status,
        score,
        anuncios,
        melhorCanal: perfil.canal,
        horarios: "09:10, 15:40 e 17:20",
        motivacao,
        roteiro: montarRoteiroAnuncio(perfil),
        whatsapp: montarFrasesWhatsapp(perfil),
        cor: coresGrafico[index % coresGrafico.length],
      };
    })
    .sort((a, b) => b.score - a.score || b.anuncios - a.anuncios)
    .slice(0, 6);

  const totalAnuncios = planos.reduce((total, plano) => total + plano.anuncios, 0);
  const datas = datasPadraoMarketing(Math.min(Math.max(totalAnuncios, planos.length * 2), 32));
  const canais = [
    { canal: "WhatsApp", horario: "09:10", tipo: "Lembrete de prazo" },
    { canal: "Stories", horario: "11:30", tipo: "Dor rapida" },
    { canal: "Reels", horario: "15:40", tipo: "Roteiro curto" },
    { canal: "WhatsApp", horario: "17:20", tipo: "Fechamento leve" },
    { canal: "Feed", horario: "19:10", tipo: "Prova simples" },
  ];
  const motivos = [
    "Abrir conversa sem pressionar.",
    "Mostrar prazo, risco e facilidade.",
    "Dar exemplo claro do problema.",
    "Chamar para o WhatsApp no melhor horario.",
    "Reforcar antes do fim da semana.",
  ];
  const calendario = datas.map<CalendarioMarketing>((data, index) => {
    const plano = planos[index % Math.max(planos.length, 1)];
    const canal = canais[index % canais.length];
    return {
      id: `${data.toISOString()}-${index}`,
      data: formatarDataMarketing(data),
      horario: canal.horario,
      canal: canal.canal,
      tipo: canal.tipo,
      servico: plano?.servicoCurto || "Servico",
      motivo: motivos[index % motivos.length],
      status: plano?.status || "alerta",
    };
  });
  const graficoCanais = canais.map((canal) => ({
    canal: canal.canal,
    anuncios: calendario.filter((item) => item.canal === canal.canal).length,
  }));
  const frasesWhatsapp = planos
    .flatMap((plano) =>
      plano.whatsapp.map((texto, index) => ({
        id: `${plano.id}-${index}`,
        servico: plano.servicoCurto,
        texto,
        status: plano.status,
      }))
    )
    .slice(0, 12);
  const scoreMedio = planos.length ? Math.round(media(planos.map((plano) => plano.score))) : 0;

  return {
    planos,
    calendario,
    frasesWhatsapp,
    graficoServicos: planos.map((plano) => ({
      id: plano.id,
      servico: plano.servicoCurto,
      anuncios: plano.anuncios,
      score: plano.score,
      recuperacao: plano.status === "critico" ? plano.anuncios : 0,
      cor: plano.cor,
    })),
    graficoCanais,
    metricas: {
      totalAnuncios,
      scoreMedio,
      servicosAtivos: planos.length,
      datasPlanejadas: calendario.length,
      frases: frasesWhatsapp.length,
    },
  };
}

function chaveServico(servico: { codigo: number; servico: string }) {
  return `${servico.codigo}::${servico.servico}`;
}

function chavePeriodo(periodo: { ano: number; mesNumero: number }) {
  return `${periodo.ano}-${periodo.mesNumero}`;
}

function rotuloPeriodoCurto(periodo: { ano: number; mesNumero: number }) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[periodo.mesNumero - 1] || periodo.mesNumero} ${String(periodo.ano).slice(-2)}`;
}

function nomeMes(mesNumero: number) {
  return ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][mesNumero - 1] || String(mesNumero);
}

function numeroTrimestre(mesNumero: number) {
  return Math.ceil(mesNumero / 3);
}

function numeroSemestre(mesNumero: number) {
  return Math.ceil(mesNumero / 6);
}

function ordinalPeriodo(valor: number | string) {
  return `${valor}\u00ba`;
}

function ordenarPeriodos<T extends { ano: number; mesNumero: number }>(periodos: T[]) {
  return [...periodos].sort((a, b) => a.ano - b.ano || a.mesNumero - b.mesNumero);
}

function periodoTemCoberturaComparavel(periodo: PeriodoImportado) {
  if (!periodo.intervalos?.length) return true;

  return periodo.intervalos.some(
    (intervalo) =>
      intervalo.ano === periodo.ano &&
      intervalo.anoFinal === periodo.ano &&
      intervalo.mesNumero === periodo.mesNumero &&
      intervalo.mesFinal === periodo.mesNumero &&
      intervalo.diaInicial <= 3 &&
      intervalo.diaFinal >= 25
  );
}

function diasNoMes(ano: number, mesNumero: number) {
  return new Date(ano, mesNumero, 0).getDate();
}

function proximaCompetencia(ano: number, mesNumero: number) {
  return mesNumero === 12 ? { ano: ano + 1, mesNumero: 1 } : { ano, mesNumero: mesNumero + 1 };
}

function coberturaDoPeriodo(periodo: PeriodoImportado) {
  if (periodoTemCoberturaComparavel(periodo)) {
    return { diasCobertos: diasNoMes(periodo.ano, periodo.mesNumero), cobertura: 1 };
  }

  const intervalosValidos = (periodo.intervalos || []).filter(
    (intervalo) =>
      intervalo.ano === periodo.ano &&
      intervalo.anoFinal === periodo.ano &&
      intervalo.mesNumero === periodo.mesNumero &&
      intervalo.mesFinal === periodo.mesNumero
  );
  const diaFinal = Math.max(0, ...intervalosValidos.map((intervalo) => intervalo.diaFinal));
  const totalDias = diasNoMes(periodo.ano, periodo.mesNumero);
  return {
    diasCobertos: diaFinal,
    cobertura: diaFinal ? Math.min(1, diaFinal / totalDias) : 0,
  };
}

function mediaPonderadaRecente(periodos: PeriodoImportado[]) {
  const recentes = ordenarPeriodos(periodos).slice(-3);
  const pesos = recentes.length === 3 ? [0.2, 0.3, 0.5] : recentes.length === 2 ? [0.4, 0.6] : [1];
  return recentes.reduce((total, periodo, index) => total + periodo.honorarios * pesos[index], 0);
}

function somarPeriodos(periodos: Array<{ quantidade: number; valorOs: number; honorarios: number }>) {
  return periodos.reduce(
    (acc, periodo) => ({
      quantidade: acc.quantidade + periodo.quantidade,
      valorOs: acc.valorOs + periodo.valorOs,
      honorarios: acc.honorarios + periodo.honorarios,
    }),
    { quantidade: 0, valorOs: 0, honorarios: 0 }
  );
}

function montarPlanoCompetencia(relatorio: RelatorioHonorarios | null): PlanoCompetencia | null {
  if (!relatorio) return null;
  const periodos = periodosImportadosDoRelatorio(relatorio);
  const ultimo = periodos.at(-1);
  if (!ultimo) return null;

  const ultimoCompleto = periodoTemCoberturaComparavel(ultimo);
  const competencia = ultimoCompleto ? proximaCompetencia(ultimo.ano, ultimo.mesNumero) : ultimo;
  const chaveCompetencia = `${competencia.ano}-${competencia.mesNumero}`;
  const periodoCompetencia = periodos.find((periodo) => chavePeriodo(periodo) === chaveCompetencia);
  const fechadosAntes = periodos.filter(
    (periodo) =>
      periodoTemCoberturaComparavel(periodo) &&
      (periodo.ano < competencia.ano || (periodo.ano === competencia.ano && periodo.mesNumero < competencia.mesNumero))
  );
  const fechadosDoAno = fechadosAntes.filter((periodo) => periodo.ano === competencia.ano);
  const recentes = (fechadosDoAno.length ? fechadosDoAno : fechadosAntes).slice(-3);
  if (!recentes.length) return null;

  const sazonal = periodos.find(
    (periodo) =>
      periodo.ano === competencia.ano - 1 &&
      periodo.mesNumero === competencia.mesNumero &&
      periodoTemCoberturaComparavel(periodo)
  );
  const baseRecente = mediaPonderadaRecente(recentes);
  const baseSazonal = sazonal?.honorarios || 0;
  const baseMeta = baseSazonal ? baseSazonal * 0.6 + baseRecente * 0.4 : baseRecente;
  const metaCrescimento = relatorio.comparacao?.metaCrescimento || 0.3;
  const meta = baseMeta * (1 + metaCrescimento);
  const realizado = periodoCompetencia?.honorarios || 0;
  const cobertura = periodoCompetencia
    ? coberturaDoPeriodo(periodoCompetencia)
    : { diasCobertos: 0, cobertura: 0 };
  const emAndamento = Boolean(periodoCompetencia && cobertura.cobertura < 1);
  const projecaoBruta = emAndamento && cobertura.cobertura > 0 ? realizado / cobertura.cobertura : realizado || baseRecente;
  const projecao = emAndamento ? Math.min(projecaoBruta, Math.max(baseMeta * 2.5, realizado)) : projecaoBruta;
  const progresso = meta ? Math.min(100, (realizado / meta) * 100) : 0;
  const progressoProjetado = meta ? Math.min(100, (projecao / meta) * 100) : 0;
  const atingiuMeta = realizado >= meta;
  const status: RadarStatus = atingiuMeta
    ? "bom"
    : emAndamento && projecao >= meta
      ? "bom"
      : emAndamento && projecao >= meta * 0.85
        ? "alerta"
        : emAndamento
          ? "critico"
          : "alerta";
  const statusLabel = atingiuMeta
    ? "Meta atingida"
    : emAndamento && projecao >= meta
      ? "No ritmo da meta"
      : emAndamento && projecao >= meta * 0.85
        ? "Ritmo exige atencao"
        : emAndamento
          ? "Abaixo do ritmo"
          : "Meta preparada";
  const chavesRecentes = new Set(recentes.map(chavePeriodo));
  const servicosFoco = (relatorio.servicosPorPeriodo || [])
    .map((servico) => ({
      servico: servico.servico,
      honorarios: servico.periodos
        .filter((periodo) => chavesRecentes.has(chavePeriodo(periodo)))
        .reduce((total, periodo) => total + periodo.honorarios, 0),
    }))
    .filter((servico) => servico.honorarios > 0)
    .sort((a, b) => b.honorarios - a.honorarios)
    .slice(0, 3);

  return {
    ano: competencia.ano,
    mesNumero: competencia.mesNumero,
    label: periodoCompetencia?.label || `${nomeMes(competencia.mesNumero)} ${competencia.ano}`,
    emAndamento,
    diasCobertos: cobertura.diasCobertos,
    diasNoMes: diasNoMes(competencia.ano, competencia.mesNumero),
    cobertura: cobertura.cobertura,
    metaCrescimento,
    baseRecente,
    baseSazonal,
    baseMeta,
    origemMeta: sazonal
      ? `60% ${sazonal.label} + 40% media ponderada recente`
      : `Media ponderada dos ${recentes.length} ultimos meses fechados`,
    periodosBase: recentes.map((periodo) => periodo.label),
    meta,
    realizado,
    projecao,
    gap: Math.max(0, meta - realizado),
    gapProjetado: Math.max(0, meta - projecao),
    progresso,
    progressoProjetado,
    crescimentoProjetado: pct(projecao, baseMeta),
    atingiuMeta,
    status,
    statusLabel,
    servicosFoco,
  };
}

function periodosImportadosDoRelatorio(relatorio: RelatorioHonorarios): PeriodoImportado[] {
  if (relatorio.periodosImportados?.length) return ordenarPeriodos(relatorio.periodosImportados);

  return ordenarPeriodos(
    (relatorio.periodos || []).map((periodo, index) => ({
      ano: relatorio.anos.atual,
      mesNumero: index + 1,
      arquivos: [],
      intervalos: [],
      linhas: 0,
      ...periodo,
    }))
  );
}

function periodoServicoZerado(periodo: PeriodoImportado): PeriodoServico {
  return {
    ano: periodo.ano,
    mesNumero: periodo.mesNumero,
    label: periodo.label,
    quantidade: 0,
    valorOs: 0,
    honorarios: 0,
    honorarioMedio: 0,
  };
}

function periodoAnaliseDeImportado(
  periodo: PeriodoImportado,
  anterior: PeriodoImportado | null,
  metaCrescimento: number
): NonNullable<RelatorioHonorarios["periodos"]>[number] {
  const crescimentoHonorarios = anterior ? pct(periodo.honorarios, anterior.honorarios) : null;

  return {
    mes: periodo.mes,
    label: periodo.label,
    quantidade: periodo.quantidade,
    valorOs: periodo.valorOs,
    honorarios: periodo.honorarios,
    ticket: periodo.quantidade ? periodo.valorOs / periodo.quantidade : 0,
    honorarioMedio: periodo.quantidade ? periodo.honorarios / periodo.quantidade : 0,
    crescimentoHonorarios,
    meta30: anterior ? anterior.honorarios * (1 + metaCrescimento) : 0,
    atingiuMeta: crescimentoHonorarios !== null && crescimentoHonorarios >= metaCrescimento,
  };
}

function montarRecortesTemporais(periodos: PeriodoImportado[]): RecorteTemporal[] {
  const ordenados = ordenarPeriodos(periodos);
  if (!ordenados.length) {
    return [{ key: "todos", tipo: "todos", label: "Todos os periodos", detalhe: "Sem periodos reconhecidos.", periodoKeys: [] }];
  }

  const recortes: RecorteTemporal[] = [
    {
      key: "todos",
      tipo: "todos",
      label: "Todos os periodos",
      detalhe: `${ordenados.length} periodo(s) na leitura completa.`,
      periodoKeys: ordenados.map(chavePeriodo),
    },
  ];

  ordenarPeriodos(ordenados)
    .reverse()
    .forEach((periodo) => {
      const completo = periodoTemCoberturaComparavel(periodo);
      const cobertura = coberturaDoPeriodo(periodo);
      recortes.push({
        key: `mes-${chavePeriodo(periodo)}`,
        tipo: "mes",
        label: `${periodo.label}${completo ? "" : " (em andamento)"}`,
        detalhe: completo
          ? "Competencia fechada e comparavel."
          : `Competencia parcial: ${cobertura.diasCobertos || "?"}/${diasNoMes(periodo.ano, periodo.mesNumero)} dias reconhecidos.`,
        periodoKeys: [chavePeriodo(periodo)],
      });
    });

  const porSemestre = new Map<string, PeriodoImportado[]>();
  const porTrimestre = new Map<string, PeriodoImportado[]>();

  ordenados.filter(periodoTemCoberturaComparavel).forEach((periodo) => {
    const semestreKey = `${periodo.ano}-${numeroSemestre(periodo.mesNumero)}`;
    const trimestreKey = `${periodo.ano}-${numeroTrimestre(periodo.mesNumero)}`;
    porSemestre.set(semestreKey, [...(porSemestre.get(semestreKey) || []), periodo]);
    porTrimestre.set(trimestreKey, [...(porTrimestre.get(trimestreKey) || []), periodo]);
  });

  Array.from(porSemestre.entries())
    .map(([key, grupo]) => ({ key, grupo: ordenarPeriodos(grupo) }))
    .filter(({ grupo }) => grupo.length >= 6)
    .forEach(({ key, grupo }) => {
      const [anoTexto, semestreTexto] = key.split("-");
      recortes.push({
        key: `semestre-${key}`,
        tipo: "semestre",
        label: `${ordinalPeriodo(semestreTexto)} semestre ${anoTexto}`,
        detalhe: `${grupo.length} periodo(s): ${grupo[0].label} a ${grupo[grupo.length - 1].label}.`,
        periodoKeys: grupo.map(chavePeriodo),
      });
    });

  Array.from(porTrimestre.entries())
    .map(([key, grupo]) => ({ key, grupo: ordenarPeriodos(grupo) }))
    .filter(({ grupo }) => grupo.length >= MIN_PERIODOS_COMPARACAO)
    .forEach(({ key, grupo }) => {
      const [anoTexto, trimestreTexto] = key.split("-");
      recortes.push({
        key: `trimestre-${key}`,
        tipo: "trimestre",
        label: `${ordinalPeriodo(trimestreTexto)} trimestre ${anoTexto}`,
        detalhe: `${grupo[0].label} a ${grupo[grupo.length - 1].label}.`,
        periodoKeys: grupo.map(chavePeriodo),
      });
    });

  return recortes;
}

function montarComparativoSequencial(periodos: PeriodoImportado[]): RelatorioHonorarios["comparativo"] {
  return periodos.map((periodo, index) => {
    const anterior = index > 0 ? periodos[index - 1] : null;
    const oldBucket = anterior || { quantidade: 0, valorOs: 0, honorarios: 0 };

    return {
      mes: periodo.mes,
      qtd2025: oldBucket.quantidade,
      qtd2026: periodo.quantidade,
      os2025: oldBucket.valorOs,
      os2026: periodo.valorOs,
      honorarios2025: oldBucket.honorarios,
      honorarios2026: periodo.honorarios,
      ticket2025: oldBucket.quantidade ? oldBucket.valorOs / oldBucket.quantidade : 0,
      ticket2026: periodo.quantidade ? periodo.valorOs / periodo.quantidade : 0,
      crescimentoHonorarios: pct(periodo.honorarios, oldBucket.honorarios),
    };
  });
}

function montarResumoPeriodos(periodos: PeriodoImportado[]): RelatorioHonorarios["resumo"] {
  const total = somarPeriodos(periodos);
  const honorarioMedio = total.quantidade ? total.honorarios / total.quantidade : 0;
  const ticketMedio = total.quantidade ? total.valorOs / total.quantidade : 0;

  return [
    { indicador: "Quantidade total", valor2025: 0, valor2026: total.quantidade, variacao: 0, tipo: "numero" },
    { indicador: "Valor O.S. total", valor2025: 0, valor2026: total.valorOs, variacao: 0, tipo: "moeda" },
    { indicador: "Honorarios totais", valor2025: 0, valor2026: total.honorarios, variacao: 0, tipo: "moeda" },
    { indicador: "Ticket medio O.S.", valor2025: 0, valor2026: ticketMedio, variacao: 0, tipo: "moeda" },
    { indicador: "Honorario medio", valor2025: 0, valor2026: honorarioMedio, variacao: 0, tipo: "moeda" },
  ];
}

function montarServicosDoRecorte(relatorio: RelatorioHonorarios, periodosSelecionados: PeriodoImportado[]) {
  const periodosOrdenados = ordenarPeriodos(periodosSelecionados);
  const servicosPorPeriodo = (relatorio.servicosPorPeriodo || [])
    .map((servico) => {
      const periodos = periodosOrdenados.map((periodo) => {
        const encontrado = servico.periodos.find((item) => chavePeriodo(item) === chavePeriodo(periodo));
        return encontrado || periodoServicoZerado(periodo);
      });

      return {
        ...servico,
        totalHonorarios: periodos.reduce((acc, periodo) => acc + periodo.honorarios, 0),
        periodos,
      };
    })
    .filter((servico) =>
      servico.periodos.some((periodo) => periodo.quantidade > 0 || periodo.valorOs > 0 || periodo.honorarios > 0)
    )
    .sort((a, b) => b.totalHonorarios - a.totalHonorarios || a.servico.localeCompare(b.servico, "pt-BR"));

  const primeiroKey = chavePeriodo(periodosOrdenados[0]);
  const ultimoKey = chavePeriodo(periodosOrdenados[periodosOrdenados.length - 1]);
  const servicos = servicosPorPeriodo
    .map<ServicoDestaque>((servico) => {
      const primeiro = servico.periodos.find((periodo) => chavePeriodo(periodo) === primeiroKey) || periodoServicoZerado(periodosOrdenados[0]);
      const ultimo = servico.periodos.find((periodo) => chavePeriodo(periodo) === ultimoKey) || periodoServicoZerado(periodosOrdenados[periodosOrdenados.length - 1]);

      return {
        codigo: servico.codigo,
        servico: servico.servico,
        qtd2025: primeiro.quantidade,
        qtd2026: ultimo.quantidade,
        honorarios2025: primeiro.honorarios,
        honorarios2026: ultimo.honorarios,
        valorOs2026: ultimo.valorOs,
        honorarioMedio2026: ultimo.quantidade ? ultimo.honorarios / ultimo.quantidade : 0,
        crescimento: pct(ultimo.honorarios, primeiro.honorarios),
      };
    })
    .sort((a, b) => b.honorarios2026 - a.honorarios2026)
    .slice(0, 12);

  return { servicos, servicosPorPeriodo };
}

function montarRelatorioRecorte(relatorio: RelatorioHonorarios, recorte: RecorteTemporal): RelatorioHonorarios {
  if (recorte.key === "todos") return relatorio;

  const chaves = new Set(recorte.periodoKeys);
  const periodosImportados = periodosImportadosDoRelatorio(relatorio).filter((periodo) => chaves.has(chavePeriodo(periodo)));
  if (!periodosImportados.length) return relatorio;

  const metaCrescimento = relatorio.comparacao?.metaCrescimento || 0.3;
  const periodos = periodosImportados.map((periodo, index) =>
    periodoAnaliseDeImportado(periodo, index > 0 ? periodosImportados[index - 1] : null, metaCrescimento)
  );
  const { servicos, servicosPorPeriodo } = montarServicosDoRecorte(relatorio, periodosImportados);
  const arquivosSelecionados = Array.from(new Set(periodosImportados.flatMap((periodo) => periodo.arquivos || []))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const primeiro = periodosImportados[0];
  const ultimo = periodosImportados[periodosImportados.length - 1];

  return {
    ...relatorio,
    resumo: montarResumoPeriodos(periodosImportados),
    comparativo: montarComparativoSequencial(periodosImportados),
    periodos,
    periodosImportados,
    servicos,
    servicosPorPeriodo,
    auditoria: relatorio.auditoria.filter((item) => !item.arquivo || !arquivosSelecionados.length || arquivosSelecionados.includes(item.arquivo)),
    anos: { anterior: primeiro.ano, atual: ultimo.ano },
    comparacao: {
      tipo: "mes",
      anteriorLabel: primeiro.label,
      atualLabel: ultimo.label,
      metaCrescimento,
    },
    arquivos: arquivosSelecionados.length ? arquivosSelecionados : relatorio.arquivos,
    totalLinhas: periodosImportados.reduce((acc, periodo) => acc + (periodo.linhas || 0), 0),
  };
}

function grupoTrimestralDePeriodos(periodos: PeriodoImportado[]): GrupoTrimestral {
  const ordenados = ordenarPeriodos(periodos);
  const primeiro = ordenados[0];
  const trimestre = numeroTrimestre(primeiro.mesNumero);
  const total = somarPeriodos(ordenados);

  return {
    key: `${primeiro.ano}-${trimestre}`,
    trimestre,
    ano: primeiro.ano,
    label: `${ordinalPeriodo(trimestre)} trimestre ${primeiro.ano}`,
    quantidade: total.quantidade,
    valorOs: total.valorOs,
    honorarios: total.honorarios,
    honorarioMedio: total.quantidade ? total.honorarios / total.quantidade : 0,
    periodos: ordenados,
  };
}

function montarComparacaoTrimestral(relatorio: RelatorioHonorarios): ComparacaoTrimestral | null {
  const gruposMap = new Map<string, PeriodoImportado[]>();

  periodosImportadosDoRelatorio(relatorio).filter(periodoTemCoberturaComparavel).forEach((periodo) => {
    const key = `${periodo.ano}-${numeroTrimestre(periodo.mesNumero)}`;
    gruposMap.set(key, [...(gruposMap.get(key) || []), periodo]);
  });

  const grupos = Array.from(gruposMap.values())
    .map((grupo) => ordenarPeriodos(grupo))
    .filter((grupo) => grupo.length >= MIN_PERIODOS_COMPARACAO)
    .map(grupoTrimestralDePeriodos)
    .sort((a, b) => a.ano - b.ano || a.trimestre - b.trimestre);

  if (grupos.length < 2) return null;

  const mesmaCobertura = (a: GrupoTrimestral, b: GrupoTrimestral) =>
    a.periodos.length === b.periodos.length &&
    a.periodos.every((periodo, index) => periodo.mesNumero === b.periodos[index]?.mesNumero);
  const paresMesmoTrimestre = grupos.flatMap((atual, index) =>
    grupos
      .slice(0, index)
      .filter((anterior) => anterior.trimestre === atual.trimestre && mesmaCobertura(anterior, atual))
      .map((anterior) => ({ anterior, atual }))
  );
  const paresSequenciaisCompletos = grupos.slice(1).flatMap((atual, index) => {
    const anterior = grupos[index];
    return anterior.periodos.length === 3 && atual.periodos.length === 3 ? [{ anterior, atual }] : [];
  });
  const parComparavel = paresMesmoTrimestre.at(-1) || paresSequenciaisCompletos.at(-1);
  if (!parComparavel) return null;

  const { anterior, atual } = parComparavel;
  const criarPasso = (base: GrupoTrimestral, comparado: GrupoTrimestral): PassoComparacao => ({
    anterior: base,
    atual: comparado,
    diferencaQuantidade: comparado.quantidade - base.quantidade,
    variacaoQuantidade: pct(comparado.quantidade, base.quantidade),
    diferencaHonorarios: comparado.honorarios - base.honorarios,
    variacaoHonorarios: pct(comparado.honorarios, base.honorarios),
    diferencaValorOs: comparado.valorOs - base.valorOs,
    variacaoValorOs: pct(comparado.valorOs, base.valorOs),
    diferencaHonorarioMedio: comparado.honorarioMedio - base.honorarioMedio,
    variacaoHonorarioMedio: pct(comparado.honorarioMedio, base.honorarioMedio),
  });
  const somarServicoNoGrupo = (servico: NonNullable<RelatorioHonorarios["servicosPorPeriodo"]>[number], grupo: GrupoTrimestral) => {
    const chaves = new Set(grupo.periodos.map(chavePeriodo));
    return somarPeriodos(servico.periodos.filter((periodo) => chaves.has(chavePeriodo(periodo))));
  };
  const servicos = (relatorio.servicosPorPeriodo || [])
    .map<ServicoTrimestral>((servico) => {
      const base = somarServicoNoGrupo(servico, anterior);
      const comparado = somarServicoNoGrupo(servico, atual);

      return {
        codigo: servico.codigo,
        servico: servico.servico,
        honorariosAnterior: base.honorarios,
        honorariosAtual: comparado.honorarios,
        diferencaHonorarios: comparado.honorarios - base.honorarios,
        variacaoHonorarios: pct(comparado.honorarios, base.honorarios),
        quantidadeAnterior: base.quantidade,
        quantidadeAtual: comparado.quantidade,
        diferencaQuantidade: comparado.quantidade - base.quantidade,
      };
    })
    .filter((servico) => servico.honorariosAnterior || servico.honorariosAtual || servico.quantidadeAnterior || servico.quantidadeAtual)
    .sort((a, b) => Math.abs(b.diferencaHonorarios) - Math.abs(a.diferencaHonorarios))
    .slice(0, 14);

  return {
    grupos,
    anterior,
    atual,
    passo: criarPasso(anterior, atual),
    servicos,
  };
}

function montarRelatorioServicos(relatorio: RelatorioHonorarios, servicoChaves: string[]): RelatorioHonorarios {
  const chaves = new Set(servicoChaves.filter(Boolean));
  if (!chaves.size) return relatorio;

  const historicos = (relatorio.servicosPorPeriodo || []).filter((servico) => chaves.has(chaveServico(servico)));
  if (!historicos.length) return relatorio;

  const periodosServico = new Map<string, NonNullable<RelatorioHonorarios["servicosPorPeriodo"]>[number]["periodos"][number]>();
  historicos.forEach((servico) => {
    servico.periodos.forEach((periodo) => {
      const key = `${periodo.ano}-${periodo.mesNumero}`;
      const atual = periodosServico.get(key);
      const quantidade = (atual?.quantidade || 0) + periodo.quantidade;
      const valorOs = (atual?.valorOs || 0) + periodo.valorOs;
      const honorarios = (atual?.honorarios || 0) + periodo.honorarios;
      periodosServico.set(key, {
        ...periodo,
        quantidade,
        valorOs,
        honorarios,
        honorarioMedio: quantidade ? honorarios / quantidade : 0,
      });
    });
  });
  const periodoZerado = {
    quantidade: 0,
    valorOs: 0,
    honorarios: 0,
    ticket: 0,
    honorarioMedio: 0,
  };
  const periodosBase = relatorio.periodos || [];
  const periodosImportadosBase = relatorio.periodosImportados?.length
    ? relatorio.periodosImportados
    : periodosBase.map((periodo, index) => ({
        ano: relatorio.anos.atual,
        mesNumero: index + 1,
        arquivos: [],
        intervalos: [],
        linhas: 0,
        ...periodo,
      }));
  const periodosImportados = periodosImportadosBase.map((periodo) => {
    const dados = periodosServico.get(`${periodo.ano}-${periodo.mesNumero}`);
    const quantidade = dados?.quantidade || 0;
    const valorOs = dados?.valorOs || 0;
    const honorarios = dados?.honorarios || 0;

    return {
      ...periodo,
      linhas: dados ? 1 : 0,
      quantidade,
      valorOs,
      honorarios,
      ticket: quantidade ? valorOs / quantidade : 0,
      honorarioMedio: quantidade ? honorarios / quantidade : 0,
    };
  });
  const periodos = periodosBase.map((periodo, index) => {
    const importado = periodosImportados[index] || {
      ...periodo,
      ano: relatorio.anos.atual,
      mesNumero: index + 1,
      arquivos: [],
      intervalos: [],
      linhas: 0,
      ...periodoZerado,
    };
    const anterior = index > 0 ? periodosImportados[index - 1] : null;
    const crescimentoHonorarios = anterior ? pct(importado.honorarios, anterior.honorarios) : null;

    return {
      ...periodo,
      quantidade: importado.quantidade,
      valorOs: importado.valorOs,
      honorarios: importado.honorarios,
      ticket: importado.ticket,
      honorarioMedio: importado.honorarioMedio,
      crescimentoHonorarios,
      meta30: anterior ? anterior.honorarios * 1.3 : 0,
      atingiuMeta: crescimentoHonorarios !== null && crescimentoHonorarios >= (relatorio.comparacao?.metaCrescimento || 0.3),
    };
  });
  const compararMesesMesmoAno = relatorio.comparacao?.tipo === "mes";
  const comparativo = relatorio.comparativo.map((item) => {
    const periodoIndex = periodosImportados.findIndex((periodo) => periodo.mes === item.mes);
    const mesBase = periodosImportados[periodoIndex];
    const anteriorMensal = periodoIndex > 0 ? periodosImportados[periodoIndex - 1] : null;
    const anterior = compararMesesMesmoAno
      ? anteriorMensal
      : periodosServico.get(`${relatorio.anos.anterior}-${mesBase?.mesNumero || 0}`);
    const atual = compararMesesMesmoAno
      ? mesBase
      : periodosServico.get(`${relatorio.anos.atual}-${mesBase?.mesNumero || 0}`);

    return {
      ...item,
      qtd2025: anterior?.quantidade || 0,
      qtd2026: atual?.quantidade || 0,
      os2025: anterior?.valorOs || 0,
      os2026: atual?.valorOs || 0,
      honorarios2025: anterior?.honorarios || 0,
      honorarios2026: atual?.honorarios || 0,
      ticket2025: anterior?.quantidade ? anterior.valorOs / anterior.quantidade : 0,
      ticket2026: atual?.quantidade ? atual.valorOs / atual.quantidade : 0,
      crescimentoHonorarios: pct(atual?.honorarios || 0, anterior?.honorarios || 0),
    };
  });
  const totaisAnterior = compararMesesMesmoAno
    ? { qtd: 0, os: 0, hon: 0 }
    : historicos
        .flatMap((servico) => servico.periodos)
        .filter((periodo) => periodo.ano === relatorio.anos.anterior)
        .reduce((acc, periodo) => ({
          qtd: acc.qtd + periodo.quantidade,
          os: acc.os + periodo.valorOs,
          hon: acc.hon + periodo.honorarios,
        }), { qtd: 0, os: 0, hon: 0 });
  const totaisAtual = compararMesesMesmoAno
    ? periodosImportados.reduce((acc, periodo) => ({
        qtd: acc.qtd + periodo.quantidade,
        os: acc.os + periodo.valorOs,
        hon: acc.hon + periodo.honorarios,
      }), { qtd: 0, os: 0, hon: 0 })
    : historicos
        .flatMap((servico) => servico.periodos)
        .filter((periodo) => periodo.ano === relatorio.anos.atual)
        .reduce((acc, periodo) => ({
          qtd: acc.qtd + periodo.quantidade,
          os: acc.os + periodo.valorOs,
          hon: acc.hon + periodo.honorarios,
        }), { qtd: 0, os: 0, hon: 0 });
  const servicoResumo = historicos.map((servico) => {
    const periodosAnterior = servico.periodos.filter((periodo) => periodo.ano === relatorio.anos.anterior);
    const periodosAtual = servico.periodos.filter((periodo) => periodo.ano === relatorio.anos.atual);
    const totalAnterior = periodosAnterior.reduce((acc, periodo) => ({
      qtd: acc.qtd + periodo.quantidade,
      hon: acc.hon + periodo.honorarios,
    }), { qtd: 0, hon: 0 });
    const totalAtual = periodosAtual.reduce((acc, periodo) => ({
      qtd: acc.qtd + periodo.quantidade,
      os: acc.os + periodo.valorOs,
      hon: acc.hon + periodo.honorarios,
    }), { qtd: 0, os: 0, hon: 0 });
    const primeiroServico = compararMesesMesmoAno ? servico.periodos[0] : null;
    const ultimoServico = compararMesesMesmoAno ? servico.periodos.at(-1) : null;

    return {
      codigo: servico.codigo,
      servico: servico.servico,
      qtd2025: compararMesesMesmoAno ? primeiroServico?.quantidade || 0 : totalAnterior.qtd,
      qtd2026: compararMesesMesmoAno ? ultimoServico?.quantidade || 0 : totalAtual.qtd,
      honorarios2025: compararMesesMesmoAno ? primeiroServico?.honorarios || 0 : totalAnterior.hon,
      honorarios2026: compararMesesMesmoAno ? ultimoServico?.honorarios || 0 : totalAtual.hon,
      valorOs2026: compararMesesMesmoAno ? ultimoServico?.valorOs || 0 : totalAtual.os,
      honorarioMedio2026: (compararMesesMesmoAno ? ultimoServico?.quantidade || 0 : totalAtual.qtd)
        ? (compararMesesMesmoAno ? ultimoServico?.honorarios || 0 : totalAtual.hon) /
          (compararMesesMesmoAno ? ultimoServico?.quantidade || 0 : totalAtual.qtd)
        : 0,
      crescimento: pct(
        compararMesesMesmoAno ? ultimoServico?.honorarios || 0 : totalAtual.hon,
        compararMesesMesmoAno ? primeiroServico?.honorarios || 0 : totalAnterior.hon
      ),
    };
  }).sort((a, b) => b.honorarios2026 - a.honorarios2026 || a.servico.localeCompare(b.servico, "pt-BR"));

  return {
    ...relatorio,
    resumo: [
      { indicador: "Quantidade total", valor2025: totaisAnterior.qtd, valor2026: totaisAtual.qtd, variacao: pct(totaisAtual.qtd, totaisAnterior.qtd) || 0, tipo: "numero" },
      { indicador: "Valor O.S. total", valor2025: totaisAnterior.os, valor2026: totaisAtual.os, variacao: pct(totaisAtual.os, totaisAnterior.os) || 0, tipo: "moeda" },
      { indicador: "Honorarios totais", valor2025: totaisAnterior.hon, valor2026: totaisAtual.hon, variacao: pct(totaisAtual.hon, totaisAnterior.hon) || 0, tipo: "moeda" },
      { indicador: "Ticket medio O.S.", valor2025: totaisAnterior.qtd ? totaisAnterior.os / totaisAnterior.qtd : 0, valor2026: totaisAtual.qtd ? totaisAtual.os / totaisAtual.qtd : 0, variacao: pct(totaisAtual.qtd ? totaisAtual.os / totaisAtual.qtd : 0, totaisAnterior.qtd ? totaisAnterior.os / totaisAnterior.qtd : 0) || 0, tipo: "moeda" },
      { indicador: "Honorario medio", valor2025: totaisAnterior.qtd ? totaisAnterior.hon / totaisAnterior.qtd : 0, valor2026: totaisAtual.qtd ? totaisAtual.hon / totaisAtual.qtd : 0, variacao: pct(totaisAtual.qtd ? totaisAtual.hon / totaisAtual.qtd : 0, totaisAnterior.qtd ? totaisAnterior.hon / totaisAnterior.qtd : 0) || 0, tipo: "moeda" },
    ],
    comparativo,
    periodos,
    periodosImportados,
    servicos: servicoResumo,
    servicosPorPeriodo: historicos,
    auditoria: relatorio.auditoria.filter((item) =>
      item.tipo.includes("Arquivo") || historicos.some((servico) => item.detalhe.startsWith(`${servico.codigo} - ${servico.servico}`))
    ),
    totalLinhas: historicos.reduce(
      (total, servico) => total + servico.periodos.filter((periodo) => periodo.quantidade || periodo.valorOs || periodo.honorarios).length,
      0
    ),
  };
}

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: React.ReactNode;
  value?: string | number | null;
};

function tooltipNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: React.ReactNode;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}>
          {item.name}:{" "}
          {String(item.dataKey).toLowerCase().includes("qtd")
            ? numero.format(tooltipNumber(item.value))
            : moeda.format(tooltipNumber(item.value))}
        </span>
      ))}
    </div>
  );
}

function MarketingNeuralCanvas({ ativo, intensidade }: { ativo: boolean; intensidade: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ativo) return;

    let cancelado = false;
    let frameId = 0;
    let limparCena: (() => void) | undefined;

    Promise.resolve().then(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const THREE = await import("three");
      if (cancelado) return;

      const parent = canvas.parentElement;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0, 7.2);

      const group = new THREE.Group();
      scene.add(group);

      const ambient = new THREE.AmbientLight(0xffffff, 1.1);
      const keyLight = new THREE.DirectionalLight(0xfff0c2, 2.1);
      keyLight.position.set(2.8, 3.4, 4.8);
      const blueLight = new THREE.PointLight(0x4a7dff, 2.2, 12);
      blueLight.position.set(-3.4, -1.8, 3.2);
      scene.add(ambient, keyLight, blueLight);

      const palette = [0x35c58b, 0xc7a45d, 0x4f7bd8, 0xe26f4f, 0x44a5a8];
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.76, 3),
        new THREE.MeshStandardMaterial({
          color: 0xd9fff0,
          emissive: 0x123b2c,
          emissiveIntensity: 0.42,
          metalness: 0.35,
          roughness: 0.28,
        })
      );
      group.add(core);

      const nodes: Array<{ mesh: InstanceType<typeof THREE.Mesh>; phase: number }> = [];
      const nodeGeometry = new THREE.SphereGeometry(0.105, 18, 18);
      const linePositions: number[] = [];

      for (let index = 0; index < 22; index += 1) {
        const ring = index % 3;
        const angle = (index / 22) * Math.PI * 2;
        const radius = 1.45 + ring * 0.52 + (index % 2) * 0.15;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle * 1.18) * (0.92 + ring * 0.18);
        const z = Math.sin(angle) * radius * 0.56 + (ring - 1) * 0.38;
        const material = new THREE.MeshStandardMaterial({
          color: palette[index % palette.length],
          emissive: palette[index % palette.length],
          emissiveIntensity: 0.18,
          metalness: 0.18,
          roughness: 0.36,
        });
        const mesh = new THREE.Mesh(nodeGeometry, material);
        mesh.position.set(x, y, z);
        group.add(mesh);
        nodes.push({ mesh, phase: index * 0.41 });
        linePositions.push(0, 0, 0, x, y, z);
      }

      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xc7a45d, transparent: true, opacity: 0.46 });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      group.add(lines);

      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x8edfc1, wireframe: true, transparent: true, opacity: 0.18 });
      const ringOne = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.012, 8, 96), ringMaterial);
      const ringTwo = ringOne.clone();
      ringTwo.rotation.set(Math.PI / 2.7, 0.15, Math.PI / 4);
      group.add(ringOne, ringTwo);

      const resize = () => {
        const rect = parent?.getBoundingClientRect();
        const width = Math.max(280, Math.floor(rect?.width || canvas.clientWidth || 720));
        const height = Math.max(260, Math.floor(rect?.height || canvas.clientHeight || 360));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      const observer = parent ? new ResizeObserver(resize) : null;
      if (parent) observer?.observe(parent);
      resize();

      const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const velocidade = 0.18 + Math.min(0.36, intensidade / 260);
      const animate = (time = 0) => {
        const t = time * 0.001;
        group.rotation.y = t * velocidade;
        group.rotation.x = Math.sin(t * 0.32) * 0.16;
        core.rotation.x = t * 0.45;
        core.rotation.y = t * 0.62;
        nodes.forEach((node) => {
          const scale = 1 + Math.sin(t * 2.1 + node.phase) * 0.18;
          node.mesh.scale.setScalar(scale);
        });
        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };

      if (reduzirMovimento) {
        group.rotation.y = 0.38;
        group.rotation.x = -0.12;
        renderer.render(scene, camera);
      } else {
        frameId = window.requestAnimationFrame(animate);
      }

      limparCena = () => {
        window.cancelAnimationFrame(frameId);
        observer?.disconnect();
        scene.traverse((object) => {
          const disposable = object as {
            geometry?: { dispose: () => void };
            material?: { dispose?: () => void } | Array<{ dispose?: () => void }>;
          };
          disposable.geometry?.dispose();
          if (Array.isArray(disposable.material)) {
            disposable.material.forEach((material) => material.dispose?.());
          } else {
            disposable.material?.dispose?.();
          }
        });
        renderer.dispose();
      };
    });

    return () => {
      cancelado = true;
      window.cancelAnimationFrame(frameId);
      limparCena?.();
    };
  }, [ativo, intensidade]);

  return <canvas ref={canvasRef} className={styles.marketingCanvas} aria-label="Cena 3D do genio de anuncios" />;
}

function DadosLocaisConteudo({
  dados,
  carregando,
  erro,
  filtro,
  onFiltroChange,
}: {
  dados: AnaliseDadosLocais | null;
  carregando: boolean;
  erro: string;
  filtro: FiltroListaLocal;
  onFiltroChange: (filtro: FiltroListaLocal) => void;
}) {
  const [abaLocalAtiva, setAbaLocalAtiva] = useState<AbaLocal>("visao");

  if (carregando) {
    return <section className={styles.panel}><p>Carregando a copia salva...</p></section>;
  }

  if (erro || !dados?.disponivel) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <Database size={20} />
          <h2>Os dados salvos ainda nao estao prontos</h2>
        </div>
        <p>{erro || "Atualize os dados locais para criar a primeira copia salva."}</p>
      </section>
    );
  }

  const sincronizado = dados.sincronizadoEm
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(dados.sincronizadoEm))
    : "Data desconhecida";
  const formatarDataDocumento = (value: string | null) => value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value))
    : "Sem data";
  const periodoDocumentos = `${formatarDataDocumento(dados.primeiroDocumentoEm)} ate ${formatarDataDocumento(dados.ultimoDocumentoEm)}`;
  const coberturaCepLocal = dados.totalRegistros ? dados.comCep / dados.totalRegistros : 0;
  const cidadeLiderLocal = dados.topCidades[0];
  const segundaCidadeLocal = dados.topCidades[1];
  const cidadesPlanoLocal = dados.topCidades.slice(0, 4).map((cidade, index) => ({
    cidade,
    prioridade: index + 1,
    titulo: index === 0 ? "Base principal" : index === 1 ? "Replicar campanha" : "Teste controlado",
    acao: index === 0
      ? `Comecar por ${cidade.cidade}: validar mensagem, oferta e retorno com a maior base local.`
      : index === 1
        ? `Levar a mesma campanha para ${cidade.cidade} e comparar resposta com a cidade lider.`
        : `Rodar uma acao pequena em ${cidade.cidade} antes de escalar para mais bairros.`,
  }));
  const abasLocais = [
    { id: "visao" as AbaLocal, label: "Visao", detalhe: "Resumo local", icon: <BarChart3 size={17} /> },
    { id: "cidades" as AbaLocal, label: "Cidades", detalhe: `${numero.format(dados.cidadesIdentificadas)} no ranking`, icon: <MapPin size={17} /> },
    { id: "estrategia" as AbaLocal, label: "Estrategia", detalhe: cidadeLiderLocal?.cidade || "Plano local", icon: <Target size={17} /> },
    { id: "listas" as AbaLocal, label: "Listas", detalhe: `${dados.colecoes.length} fonte(s)`, icon: <Database size={17} /> },
    { id: "qualidade" as AbaLocal, label: "Qualidade", detalhe: `${percentual.format(coberturaCepLocal)} com CEP`, icon: <ShieldCheck size={17} /> },
  ];

  return (
    <section className={styles.localStack} data-print-local="true">
      <header className={styles.localPrintHeader}>
        <strong>Relatorio de dados locais</strong>
        <span>{dados.nomeFiltro}</span>
        <span>{periodoDocumentos}</span>
      </header>

      <section className={styles.localFilter}>
        <div>
          <span>Escolha quais vendas usar</span>
          <strong>{dados.nomeFiltro}</strong>
          <small>Todos os numeros abaixo mudam conforme a lista escolhida.</small>
        </div>
        <div className={styles.localFilterActions}>
          <div className={styles.localFilterButtons} role="group" aria-label="Escolher lista de vendas">
            {([
              ["todas", "As duas listas"],
              ["oficial", "Lista oficial"],
              ["digital", "Lista digital"],
            ] as Array<[FiltroListaLocal, string]>).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={filtro === value ? styles.localFilterActive : ""}
                aria-pressed={filtro === value}
                onClick={() => onFiltroChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className={styles.localPrintButton} onClick={() => window.print()}>
            <Printer size={17} />
            <span>Imprimir {dados.nomeFiltro.toLocaleLowerCase("pt-BR")}</span>
          </button>
        </div>
      </section>

      <nav className={styles.localTabs} aria-label="Abas dos dados locais">
        {abasLocais.map((aba) => (
          <button
            type="button"
            key={aba.id}
            className={abaLocalAtiva === aba.id ? styles.localTabActive : ""}
            aria-pressed={abaLocalAtiva === aba.id}
            onClick={() => setAbaLocalAtiva(aba.id)}
          >
            {aba.icon}
            <strong>{aba.label}</strong>
            <small>{aba.detalhe}</small>
          </button>
        ))}
      </nav>

      <div className={styles.localTabPanel} hidden={abaLocalAtiva !== "visao"}>
      <section className={styles.localHero}>
        <div>
          <span className={styles.eyebrow}>Onde estao os compradores</span>
          <h1>Dados locais de vendas</h1>
          <p>
            Veja as cidades com mais compradores usando {dados.nomeFiltro.toLocaleLowerCase("pt-BR")}. Abrir esta tela nao gasta novas leituras do banco.
          </p>
        </div>
        <div className={styles.headerPanel}>
          <span>Periodo dos documentos</span>
          <strong>{periodoDocumentos}</strong>
          <small>Copia atualizada em {sincronizado}.</small>
        </div>
      </section>

      {dados.truncado && (
        <div className={styles.localWarning}>
          O limite foi atingido. Esta tela mostra somente os dados que conseguiram ser salvos.
        </div>
      )}

      <div className={styles.localMetrics}>
        <article><span>Total de vendas</span><strong>{numero.format(dados.totalRegistros)}</strong><small>{dados.nomeFiltro}</small></article>
        <article><span>CEP com 8 números</span><strong>{numero.format(dados.comCep)}</strong><small>{percentual.format(dados.totalRegistros ? dados.comCep / dados.totalRegistros : 0)} da lista</small></article>
        <article><span>Cidades no ranking</span><strong>{numero.format(dados.cidadesIdentificadas)}</strong><small>Somente nomes de cidade com CEP</small></article>
        <article><span>CEP para revisar</span><strong>{numero.format(dados.semCep)}</strong><small>{numero.format(dados.cepFormatoInvalido)} fora do formato e {numero.format(dados.semCepInformado)} vazios</small></article>
      </div>

      <div className={styles.localDataNote}>
        <strong>Como ler esses números:</strong>
        <span>{numero.format(dados.cidadeSemCep)} vendas ainda têm cidade, mesmo com CEP para revisar.</span>
        <span>{numero.format(dados.semLocalizacao)} estão sem CEP de 8 números e sem cidade.</span>
        <span>{numero.format(dados.cepSemCidade)} têm CEP correto, mas não informam a cidade.</span>
      </div>

      </div>

      <div className={styles.localTabPanel} hidden={abaLocalAtiva !== "estrategia"}>
      {dados.estrategiaPNVA && (
        <article className={styles.pnvaPanel}>
          <div className={styles.pnvaHeader}>
            <div>
              <h2>Resumo simples: onde vender mais</h2>
              <p>{dados.estrategiaPNVA.diagnostico}</p>
            </div>
            <div className={styles.pnvaScore}>
              <span>Qualidade dos dados</span>
              <strong>{dados.estrategiaPNVA.confianca}</strong>
              <small>de 100 pontos</small>
            </div>
          </div>

          <div className={styles.pnvaFlow}>
            {dados.estrategiaPNVA.etapas.map((etapa, index) => (
              <section className={styles[`pnvaStatus${etapa.status}`]} key={etapa.etapa}>
                <div className={styles.pnvaStep}>
                  <span>{index + 1}</span>
                  <strong>{etapa.etapa}</strong>
                </div>
                <h3>{etapa.titulo}</h3>
                <p>{etapa.leitura}</p>
                <small>{etapa.indicador}</small>
              </section>
            ))}
          </div>

          <div className={styles.pnvaSectionTitle}>
            <div>
              <span>Resultado e proximo passo</span>
              <h3>O que ja temos e o que fazer</h3>
            </div>
            <small>Somente numeros que existem nas vendas baixadas.</small>
          </div>

          <div className={styles.pnvaExecutiveGrid}>
            <section className={styles.pnvaMilestones}>
              <div className={styles.panelHeader}>
                <Gauge size={20} />
                <h2>O que ja temos</h2>
              </div>
              <div className={styles.pnvaMilestoneList}>
                {dados.estrategiaPNVA.marcos.map((marco, index) => (
                  <div className={styles[`pnvaMarco${marco.status.replace("-", "")}`]} key={marco.titulo}>
                    <span>{index + 1}</span>
                    <div>
                      <small>{marco.titulo}</small>
                      <strong>{marco.valor}</strong>
                      <p>{marco.detalhe}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.pnvaGains}>
              <div className={styles.panelHeader}>
                <TrendingUp size={20} />
                <h2>Vendas reais encontradas</h2>
              </div>
              <div className={styles.pnvaGainGrid}>
                {dados.estrategiaPNVA.ganhos.map((ganho) => (
                  <article key={ganho.titulo}>
                    <span>{ganho.titulo}</span>
                    <strong>{ganho.valor}</strong>
                    <p>{ganho.detalhe}</p>
                    <small>{ganho.acao}</small>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.pnvaFields}>
            <div className={styles.panelHeader}>
              <Layers size={20} />
              <h2>Quais dados foram usados?</h2>
            </div>
            <div className={styles.pnvaFieldGrid}>
              {dados.estrategiaPNVA.campos.map((campo) => (
                <div key={campo.campo}>
                  <code>{campo.campo}</code>
                  <p>{campo.uso}</p>
                  <strong>{campo.cobertura}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.pnvaDecision}>
            <div>
              <div className={styles.panelHeader}>
                <Target size={20} />
                <h2>O que fazer agora</h2>
              </div>
              <p>{dados.estrategiaPNVA.proximaAcao}</p>
            </div>
            <div>
              <div className={styles.panelHeader}>
                <Activity size={20} />
                <h2>O que os numeros mostram</h2>
              </div>
              <ul>{dados.estrategiaPNVA.sinais.map((sinal) => <li key={sinal}>{sinal}</li>)}</ul>
            </div>
            <div>
              <div className={styles.panelHeader}>
                <ShieldCheck size={20} />
                <h2>Regras de seguranca</h2>
              </div>
              <ul>{dados.estrategiaPNVA.travasPreservadas.map((trava) => <li key={trava}>{trava}</li>)}</ul>
            </div>
          </div>
      </article>
      )}

      <section className={styles.localCityStrategy}>
        <div className={styles.panelHeader}>
          <Target size={20} />
          <h2>Estrategia por cidade</h2>
        </div>
        <div className={styles.localCityStrategyHero}>
          <div>
            <span>Prioridade operacional</span>
            <strong>{cidadeLiderLocal?.cidade || "Cidade lider"}</strong>
            <p>
              {cidadeLiderLocal
                ? `${cidadeLiderLocal.cidade} concentra ${percentual.format(cidadeLiderLocal.percentual)} dos compradores com local. Comece por onde ja existe volume.`
                : "Quando houver cidade reconhecida, o plano mostra onde agir primeiro."}
            </p>
          </div>
          <div>
            <span>Proxima expansao</span>
            <strong>{segundaCidadeLocal?.cidade || "Segunda cidade"}</strong>
            <p>
              {segundaCidadeLocal
                ? `Repita a campanha em ${segundaCidadeLocal.cidade} e compare retorno com a cidade lider.`
                : "Com mais cidades reconhecidas, a segunda frente aparece automaticamente."}
            </p>
          </div>
        </div>
        <div className={styles.localCityPlanGrid}>
          {cidadesPlanoLocal.map(({ cidade, prioridade, titulo, acao }) => (
            <article key={cidade.cidade}>
              <span>{String(prioridade).padStart(2, "0")}</span>
              <div>
                <small>{titulo}</small>
                <strong>{cidade.cidade}</strong>
                <p>{acao}</p>
                <em>
                  {numero.format(cidade.quantidade)} compradores, {numero.format(cidade.concluidos)} vendas concluidas.
                </em>
              </div>
            </article>
          ))}
        </div>
      </section>
      </div>

      <div className={styles.localTabPanel} hidden={abaLocalAtiva !== "cidades"}>
      <div className={styles.localGrid}>
        <header className={styles.localPrintHeader}>
          <strong>Relatorio de dados locais</strong>
          <span>{dados.nomeFiltro}</span>
          <span>{periodoDocumentos}</span>
        </header>

        <article className={styles.chartPanel}>
          <div className={styles.panelHeader}>
            <MapPin size={20} />
            <h2>Cidades com mais compradores</h2>
          </div>
          <p>Quantidade de compradores com CEP de 8 números em cada cidade.</p>
          <div className={styles.localChartCanvas}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.topCidades.slice(0, 10)} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="cidade" width={125} interval={0} />
                <Tooltip />
                <Bar
                  dataKey="quantidade"
                  name="Compradores"
                  fill="#1f8f68"
                  isAnimationActive={false}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <Database size={20} />
            <h2>Vendas em cada lista</h2>
          </div>
          <div className={styles.localCollectionList}>
            {dados.colecoes.map((colecao) => (
              <div key={colecao.nome}>
                <span>{colecao.nome}</span>
                <strong>{numero.format(colecao.quantidade)}</strong>
                <small>
                  {formatarDataDocumento(colecao.primeiroDocumentoEm)} ate {formatarDataDocumento(colecao.ultimoDocumentoEm)}
                </small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>#</th><th>Cidade</th><th>Compradores</th><th>Parte do total</th><th>CEPs diferentes</th><th>Vendas concluidas</th></tr></thead>
          <tbody>
            {dados.topCidades.map((cidade, index) => (
              <tr key={cidade.cidade}>
                <td>{index + 1}</td>
                <td><strong>{cidade.cidade}</strong></td>
                <td>{numero.format(cidade.quantidade)}</td>
                <td>{percentual.format(cidade.percentual)}</td>
                <td>{numero.format(cidade.cepsUnicos)}</td>
                <td>{numero.format(cidade.concluidos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      <div className={styles.localTabPanel} hidden={abaLocalAtiva !== "listas"}>
        <section className={styles.localListPanel}>
          <div className={styles.panelHeader}>
            <Database size={20} />
            <h2>Listas usadas na leitura</h2>
          </div>
          <div className={styles.localCollectionList}>
            {dados.colecoes.map((colecao) => (
              <div key={`aba-lista-${colecao.nome}`}>
                <span>{colecao.nome}</span>
                <strong>{numero.format(colecao.quantidade)}</strong>
                <small>
                  {formatarDataDocumento(colecao.primeiroDocumentoEm)} ate {formatarDataDocumento(colecao.ultimoDocumentoEm)}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.localTabPanel} hidden={abaLocalAtiva !== "qualidade"}>
        <section className={styles.localQualityPanel}>
          <div className={styles.panelHeader}>
            <ShieldCheck size={20} />
            <h2>Qualidade dos dados locais</h2>
          </div>
          <div className={styles.localQualityGrid}>
            <article>
              <span>Cobertura de CEP</span>
              <strong>{percentual.format(coberturaCepLocal)}</strong>
              <small>{numero.format(dados.comCep)} de {numero.format(dados.totalRegistros)} vendas com CEP de 8 numeros.</small>
            </article>
            <article>
              <span>Para revisar</span>
              <strong>{numero.format(dados.semCep)}</strong>
              <small>{numero.format(dados.cepFormatoInvalido)} fora do formato e {numero.format(dados.semCepInformado)} vazios.</small>
            </article>
            <article>
              <span>Sem localizacao</span>
              <strong>{numero.format(dados.semLocalizacao)}</strong>
              <small>Sem CEP de 8 numeros e sem cidade reconhecida.</small>
            </article>
            <article>
              <span>Leituras usadas</span>
              <strong>{numero.format(dados.leiturasExecutadas)}</strong>
              <small>Limite salvo: {numero.format(dados.limiteLeituras)} leituras.</small>
            </article>
          </div>
          {dados.estrategiaPNVA && (
            <div className={styles.pnvaFieldGrid}>
              {dados.estrategiaPNVA.campos.map((campo) => (
                <div key={`qualidade-${campo.campo}`}>
                  <code>{campo.campo}</code>
                  <p>{campo.uso}</p>
                  <strong>{campo.cobertura}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default function AnaliseHonorariosPage() {
  const [modoAnalise, setModoAnalise] = useState<ModoAnalise>("honorarios");
  const [abaAtiva, setAbaAtiva] = useState<Aba>("comparacao");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loteInputRef = useRef<HTMLInputElement | null>(null);
  const [relatorioUpload, setRelatorioUpload] = useState<RelatorioHonorarios | null>(null);
  const [processando, setProcessando] = useState(false);
  const [statusUpload, setStatusUpload] = useState("");
  const [erroUpload, setErroUpload] = useState("");
  const [mapaAberto, setMapaAberto] = useState(false);
  const [, setCenarioAtivo] = useState<CenarioId>("base");
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [buscaServicoFiltro, setBuscaServicoFiltro] = useState("");
  const [recorteSelecionado, setRecorteSelecionado] = useState("todos");
  const [escopoImpressao, setEscopoImpressao] = useState<Aba | "">("");
  const [dadosLocais, setDadosLocais] = useState<AnaliseDadosLocais | null>(null);
  const [carregandoDadosLocais, setCarregandoDadosLocais] = useState(false);
  const [erroDadosLocais, setErroDadosLocais] = useState("");
  const [filtroDadosLocais, setFiltroDadosLocais] = useState<FiltroListaLocal>("todas");
  const [fraseCopiada, setFraseCopiada] = useState("");
  const [quantidadeFuncionarios, setQuantidadeFuncionarios] = useState(1);

  const servicosFiltro = useMemo(
    () =>
      (relatorioUpload?.servicosPorPeriodo || [])
        .filter((servico) =>
          servico.periodos.some((periodo) => periodo.quantidade > 0 || periodo.valorOs > 0 || periodo.honorarios > 0)
        )
        .sort((a, b) => a.servico.localeCompare(b.servico, "pt-BR") || a.codigo - b.codigo),
    [relatorioUpload]
  );
  const servicosSelecionadosAtivos = useMemo(
    () => {
      const disponiveis = new Set(servicosFiltro.map(chaveServico));
      return servicosSelecionados.filter((servico) => disponiveis.has(servico));
    },
    [servicosSelecionados, servicosFiltro]
  );
  const servicosFiltrados = useMemo(
    () => servicosFiltro.filter((servico) => servicosSelecionadosAtivos.includes(chaveServico(servico))),
    [servicosSelecionadosAtivos, servicosFiltro]
  );
  const termoBuscaServico = buscaServicoFiltro.trim();
  const servicosFiltroEncontrados = useMemo(() => {
    const termoNormalizado = normalizarTextoFiltro(termoBuscaServico);
    if (!termoNormalizado) return servicosFiltro;

    return servicosFiltro.filter((servico) =>
      normalizarTextoFiltro(`${servico.codigo} ${servico.servico}`).includes(termoNormalizado)
    );
  }, [servicosFiltro, termoBuscaServico]);
  const servicosFiltroVisiveis = useMemo(() => {
    const candidatos = termoBuscaServico ? servicosFiltroEncontrados : servicosFiltro.slice(0, 12);
    const unicos = new Map<string, (typeof servicosFiltro)[number]>();

    servicosFiltrados.forEach((servico) => unicos.set(chaveServico(servico), servico));
    candidatos.forEach((servico) => unicos.set(chaveServico(servico), servico));

    return Array.from(unicos.values()).slice(0, termoBuscaServico ? 40 : 18);
  }, [servicosFiltrados, servicosFiltro, servicosFiltroEncontrados, termoBuscaServico]);
  const dadosServico = useMemo(
    () => (relatorioUpload ? montarRelatorioServicos(relatorioUpload, servicosSelecionadosAtivos) : relatorioVazio),
    [relatorioUpload, servicosSelecionadosAtivos]
  );
  function reiniciarVisualizacaoFiltrada() {
    setAbaAtiva("comparacao");
    setMapaAberto(false);
    setCenarioAtivo("base");
  }

  function alternarFiltroServico(chave: string) {
    if (!chave) return;

    setServicosSelecionados((atuais) =>
      atuais.includes(chave) ? atuais.filter((item) => item !== chave) : [...atuais, chave]
    );
    reiniciarVisualizacaoFiltrada();
  }

  function limparFiltroServicos() {
    setServicosSelecionados([]);
    setBuscaServicoFiltro("");
    reiniciarVisualizacaoFiltrada();
  }
  const recortesTemporais = useMemo(
    () => montarRecortesTemporais(periodosImportadosDoRelatorio(dadosServico)),
    [dadosServico]
  );
  const recorteSelecionadoAtivo = recortesTemporais.some((recorte) => recorte.key === recorteSelecionado)
    ? recorteSelecionado
    : "todos";
  const recorteTemporalAtivo = recortesTemporais.find((recorte) => recorte.key === recorteSelecionadoAtivo) || recortesTemporais[0];
  const dadosAtuais = useMemo(
    () => montarRelatorioRecorte(dadosServico, recorteTemporalAtivo),
    [dadosServico, recorteTemporalAtivo]
  );
  const comparacaoTrimestral = useMemo(() => montarComparacaoTrimestral(dadosAtuais), [dadosAtuais]);
  const planoCompetencia = useMemo(() => (relatorioUpload ? montarPlanoCompetencia(dadosServico) : null), [dadosServico, relatorioUpload]);
  const valorOsDisponivel = dadosAtuais.camposDisponiveis?.valorOs !== false;
  const marketingInteligente = useMemo(
    () => montarMarketingInteligente(dadosAtuais, planoCompetencia),
    [dadosAtuais, planoCompetencia]
  );

  useEffect(() => {
    const relatorioCache = carregarRelatorioCache();
    if (!relatorioCache) return;

    const restoreTimer = window.setTimeout(() => {
      setRelatorioUpload(relatorioCache);
      setStatusUpload(`Analise restaurada do cache local: ${relatorioCache.totalLinhas || 0} linhas.`);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (modoAnalise !== "dados-locais" || dadosLocais) return;

    let ativo = true;
    Promise.resolve().then(async () => {
      if (!ativo) return;
      setCarregandoDadosLocais(true);
      try {
        const response = await fetch(`/api/dados-locais?lista=${filtroDadosLocais}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Nao foi possivel abrir os dados salvos.");
        const data = await response.json() as AnaliseDadosLocais;
        if (ativo) setDadosLocais(data);
      } catch (error: unknown) {
        if (ativo) setErroDadosLocais(error instanceof Error ? error.message : "Falha ao carregar dados locais.");
      } finally {
        if (ativo) setCarregandoDadosLocais(false);
      }
    });

    return () => {
      ativo = false;
    };
  }, [dadosLocais, filtroDadosLocais, modoAnalise]);

  useEffect(() => {
    if (!escopoImpressao) return;

    let limpou = false;
    const limparEscopo = () => {
      if (limpou) return;
      limpou = true;
      setEscopoImpressao("");
    };
    const printTimer = window.setTimeout(() => {
      window.print();
    }, 0);
    const fallbackTimer = window.setTimeout(limparEscopo, 1500);

    window.addEventListener("afterprint", limparEscopo, { once: true });

    return () => {
      window.clearTimeout(printTimer);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("afterprint", limparEscopo);
    };
  }, [escopoImpressao]);

  const periodosAnalisados = useMemo(() => dadosAtuais.periodos || [], [dadosAtuais.periodos]);
  const periodosImportados = useMemo<NonNullable<RelatorioHonorarios["periodosImportados"]>>(
    () =>
      dadosAtuais.periodosImportados?.length
        ? dadosAtuais.periodosImportados
        : periodosAnalisados.map((periodo, index) => ({
            ano: dadosAtuais.anos.atual,
            mesNumero: index + 1,
            arquivos: [],
            linhas: 0,
            ...periodo,
          })),
    [dadosAtuais.anos.atual, dadosAtuais.periodosImportados, periodosAnalisados]
  );
  const analiseMensal = dadosAtuais.comparacao?.tipo === "mes";
  const periodosReconhecidos = periodosImportados.length || periodosAnalisados.length;
  const paresAnuaisComparaveis = dadosAtuais.comparativo.filter(
    (item) => item.honorarios2025 > 0 && item.honorarios2026 > 0
  ).length;
  const periodoUnico = analiseMensal && periodosReconhecidos === 1;
  const mesesBaseComparacao = analiseMensal ? periodosReconhecidos : paresAnuaisComparaveis;
  const comparacaoSuficiente = analiseMensal
    ? periodosReconhecidos >= MIN_PERIODOS_COMPARACAO
    : paresAnuaisComparaveis > 0;
  const comparacaoMensal = analiseMensal && periodosAnalisados.length > 1;
  const comparacaoBloqueadaPorBase = Boolean(relatorioUpload) && !periodoUnico && periodosReconhecidos > 0 && !comparacaoSuficiente;
  const faltamPeriodosComparacao = analiseMensal
    ? Math.max(0, MIN_PERIODOS_COMPARACAO - periodosReconhecidos)
    : paresAnuaisComparaveis
    ? 0
    : 1;
  const labelsPeriodos = periodosAnalisados.map((periodo) => periodo.label);
  const periodoDocumentoTexto = periodoUnico
    ? periodosAnalisados[0]?.label || "-"
    : analiseMensal && periodosReconhecidos > 1
    ? `${periodosReconhecidos} periodo(s): ${juntarLista(labelsPeriodos)}`
    : `${dadosAtuais.comparacao?.anteriorLabel} x ${dadosAtuais.comparacao?.atualLabel}`;
  const trilhaComparacaoTexto = periodoUnico
    ? `Base inicial: ${periodoDocumentoTexto}`
    : comparacaoBloqueadaPorBase
    ? `Base curta: ${periodoDocumentoTexto}. A comparacao libera com ${MIN_PERIODOS_COMPARACAO} periodos.`
    : comparacaoMensal && labelsPeriodos.length > 2
    ? `Mes a mes: ${labelsPeriodos.join(" -> ")}`
    : `${dadosAtuais.comparacao?.anteriorLabel} x ${dadosAtuais.comparacao?.atualLabel}`;
  const fechamentoComparacaoTexto = periodoUnico
    ? `Base ${periodoDocumentoTexto}`
    : comparacaoBloqueadaPorBase
    ? `aguardando ${MIN_PERIODOS_COMPARACAO} periodos`
    : `${dadosAtuais.comparacao?.anteriorLabel} x ${dadosAtuais.comparacao?.atualLabel}`;
  const resumoVisivel = useMemo(
    () =>
      valorOsDisponivel
        ? dadosAtuais.resumo
        : dadosAtuais.resumo.filter((item) => item.indicador !== "Valor O.S. total" && item.indicador !== "Ticket medio O.S."),
    [dadosAtuais.resumo, valorOsDisponivel]
  );
  const qualidadeLeitura = useMemo(() => {
    const arquivosFalhos = dadosAtuais.auditoria.filter((item) => item.tipo === "Arquivo sem linhas reconhecidas");
    const auditoriasReais = dadosAtuais.auditoria.filter((item) => item.tipo !== "Arquivo sem linhas reconhecidas");
    const arquivosComLinhas = new Set(periodosImportados.flatMap((periodo) => periodo.arquivos || [])).size;
    const periodosSobrepostos = periodosImportados.filter((periodo) => (periodo.arquivos?.length || 0) > 1);
    const intervalosLidos = periodosImportados.flatMap((periodo) => periodo.intervalos || []);
    const periodosSemIntervalo = periodosImportados.filter((periodo) => !(periodo.intervalos?.length || 0));
    const intervalosForaCompetencia = periodosImportados.flatMap((periodo) =>
      (periodo.intervalos || [])
        .filter((intervalo) => intervalo.mesFinal !== periodo.mesNumero || intervalo.anoFinal !== periodo.ano)
        .map((intervalo) => ({ periodo, intervalo }))
    );
    const cortesReconhecidos = Array.from(new Set(intervalosLidos.map((intervalo) => intervalo.corte))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
    const cortesDivergentes = cortesReconhecidos.length > 1;
    const transicoesCalculadas = comparacaoMensal ? Math.max(0, periodosAnalisados.length - 1) : paresAnuaisComparaveis;
    const transicoesComparaveis = comparacaoSuficiente ? transicoesCalculadas : 0;
    const baseHistorica: RadarStatus = transicoesComparaveis >= 2 ? "bom" : transicoesComparaveis ? "alerta" : "alerta";
    const statusAnexos: RadarStatus = arquivosFalhos.length ? (arquivosComLinhas ? "alerta" : "critico") : "bom";
    const statusSobreposicao: RadarStatus = periodosSobrepostos.length ? "alerta" : "bom";
    const statusCorte: RadarStatus = cortesDivergentes || intervalosForaCompetencia.length
      ? "critico"
      : periodosImportados.length && !periodosSemIntervalo.length
        ? "bom"
        : "alerta";

    const checagens: ChecagemLeitura[] = [
      {
        titulo: "Cobertura",
        valor: `${periodosImportados.length} periodo(s)`,
        detalhe: comparacaoBloqueadaPorBase
          ? `Comparacao pendente: faltam ${faltamPeriodosComparacao} periodo(s) para chegar a ${MIN_PERIODOS_COMPARACAO}.`
          : transicoesComparaveis
          ? `${transicoesComparaveis} ${transicoesComparaveis === 1 ? "comparacao sustenta" : "comparacoes sustentam"} tendencia e cenario.`
          : "Base inicial: leitura sem tendencia comparavel ainda.",
        status: baseHistorica,
      },
      {
        titulo: "Anexos lidos",
        valor: `${arquivosComLinhas}/${dadosAtuais.arquivos.length || arquivosComLinhas}`,
        detalhe: arquivosFalhos.length
          ? `${arquivosFalhos.length} anexo(s) ficaram sem linhas reconhecidas.`
          : "Todos os anexos usados trouxeram linhas aproveitaveis.",
        status: statusAnexos,
      },
      {
        titulo: "Campos",
        valor: valorOsDisponivel ? "O.S. completo" : "Modelo agregado",
        detalhe: valorOsDisponivel
          ? "Quantidade, Valor O.S. e honorarios foram usados."
          : "Valor financeiro da O.S. ausente; a leitura usa volume e honorarios.",
        status: valorOsDisponivel ? "bom" : "alerta",
      },
      {
        titulo: "Corte",
        valor: cortesReconhecidos.length ? cortesReconhecidos.join(" / ") : "Nao informado",
        detalhe: intervalosForaCompetencia.length
          ? "Ha intervalo que termina fora da competencia do periodo importado."
          : cortesDivergentes
          ? "Periodos com dias de corte diferentes precisam de comparacao cuidadosa."
          : !periodosSemIntervalo.length && periodosImportados.length
            ? "Datas de inicio e fim reconhecidas em todos os periodos."
            : intervalosLidos.length
              ? `${periodosSemIntervalo.length} periodo(s) sem datas de inicio e fim no cabecalho.`
              : "Este modelo nao informou datas de inicio e fim no cabecalho.",
        status: statusCorte,
      },
      {
        titulo: "Consolidacao",
        valor: periodosSobrepostos.length ? "Revisar" : "Sem sobreposicao",
        detalhe: periodosSobrepostos.length
          ? `${periodosSobrepostos.length} periodo(s) receberam mais de um anexo e foram somados.`
          : "Cada periodo veio de uma fonte reconhecida.",
        status: statusSobreposicao,
      },
    ];

    return {
      arquivosFalhos,
      auditoriasReais,
      arquivosComLinhas,
      periodosSobrepostos,
      cortesDivergentes,
      cortesReconhecidos,
      intervalosForaCompetencia,
      periodosSemIntervalo,
      transicoesComparaveis,
      checagens,
    };
  }, [
    comparacaoBloqueadaPorBase,
    comparacaoMensal,
    comparacaoSuficiente,
    dadosAtuais,
    faltamPeriodosComparacao,
    paresAnuaisComparaveis,
    periodosAnalisados.length,
    periodosImportados,
    valorOsDisponivel,
  ]);

  const processarArquivosSelecionados = async (arquivos: File[], origem: "arquivos" | "lote") => {
    const arquivosUnicos = Array.from(
      new Map(arquivos.map((arquivo) => [`${arquivo.size}:${arquivo.lastModified}`, arquivo])).values()
    );
    const duplicadosIgnorados = arquivos.length - arquivosUnicos.length;
    const files = arquivosUnicos;
    if (!files.length) return;

    setProcessando(true);
    setErroUpload("");
    setStatusUpload(
      `Processando ${files.length} arquivo(s) do ${origem === "lote" ? "lote" : "envio"}${duplicadosIgnorados ? `; ${duplicadosIgnorados} duplicado(s) ignorado(s)` : ""}...`
    );

    try {
      const relatorio = await analisarArquivosNoNavegador(files);
      const periodosLidos = relatorio.periodosImportados?.length || relatorio.periodos.length;
      const anexosFalhos = relatorio.auditoria.filter((item) => item.tipo === "Arquivo sem linhas reconhecidas").length;
      setRelatorioUpload(relatorio);
      salvarRelatorioCache(relatorio);
      setStatusUpload(
        `Analise atualizada: ${relatorio.totalLinhas || 0} linhas, ${periodosLidos} periodo(s), ${anexosFalhos} anexo(s) sem linhas${duplicadosIgnorados ? ` e ${duplicadosIgnorados} duplicado(s) ignorado(s)` : ""}.`
      );
      setAbaAtiva("comparacao");
      setMapaAberto(false);
      setCenarioAtivo("base");
      setServicosSelecionados([]);
      setRecorteSelecionado("todos");
    } catch (error: unknown) {
      setErroUpload(error instanceof Error ? error.message : "Nao foi possivel processar os arquivos.");
      setStatusUpload("");
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = "";
      if (loteInputRef.current) loteInputRef.current.value = "";
    }
  };

  const handleArquivos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processarArquivosSelecionados(Array.from(event.target.files || []), "arquivos");
  };

  const handleLoteArquivos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processarArquivosSelecionados(Array.from(event.target.files || []), "lote");
  };

  const handleLimparAnalise = () => {
    setRelatorioUpload(null);
    setStatusUpload("");
    setErroUpload("");
    setMapaAberto(false);
    setCenarioAtivo("base");
    setServicosSelecionados([]);
    setBuscaServicoFiltro("");
    setRecorteSelecionado("todos");
    limparRelatorioCache();
  };

  const totais = useMemo(() => {
    const honorariosResumo = pegarIndicador(dadosAtuais.resumo, "Honorarios totais");
    const osResumo = pegarIndicador(dadosAtuais.resumo, "Valor O.S. total");
    const qtdResumo = pegarIndicador(dadosAtuais.resumo, "Quantidade total");
    const primeiroPeriodo = periodosAnalisados[0];
    const ultimoPeriodo = periodosAnalisados[periodosAnalisados.length - 1];
    const honorariosAnteriorComparacao = comparacaoMensal ? primeiroPeriodo?.honorarios || 0 : honorariosResumo?.valor2025 || 0;
    const honorariosAtualComparacao = comparacaoMensal ? ultimoPeriodo?.honorarios || 0 : honorariosResumo?.valor2026 || 0;
    const valorOsAnteriorComparacao = comparacaoMensal ? primeiroPeriodo?.valorOs || 0 : osResumo?.valor2025 || 0;
    const valorOsAtualComparacao = comparacaoMensal ? ultimoPeriodo?.valorOs || 0 : osResumo?.valor2026 || 0;
    const quantidadeAnteriorComparacao = comparacaoMensal ? primeiroPeriodo?.quantidade || 0 : qtdResumo?.valor2025 || 0;
    const quantidadeAtualComparacao = comparacaoMensal ? ultimoPeriodo?.quantidade || 0 : qtdResumo?.valor2026 || 0;
    const melhorMes = [...dadosAtuais.comparativo].sort((a, b) => b.honorarios2026 - a.honorarios2026)[0];
    const servicoLider = [...dadosAtuais.servicos].sort((a, b) => b.honorarios2026 - a.honorarios2026)[0];

    return {
      honorariosAtualComparacao,
      honorariosAnteriorComparacao,
      ganhoIncremental: honorariosAtualComparacao - honorariosAnteriorComparacao,
      valorOsAtualComparacao,
      valorOsAnteriorComparacao,
      quantidadeAtualComparacao,
      quantidadeAnteriorComparacao,
      valorOsDisponivel,
      melhorMes: melhorMes || { mes: "-", honorarios2026: 0 },
      servicoLider: servicoLider || { servico: "-", honorarios2026: 0 },
      crescimentoHonorarios: pct(honorariosAtualComparacao, honorariosAnteriorComparacao),
      metaProximoPeriodo: planoCompetencia?.meta || honorariosAtualComparacao * (1 + (dadosAtuais.comparacao?.metaCrescimento || 0.3)),
    };
  }, [comparacaoMensal, dadosAtuais, periodosAnalisados, planoCompetencia, valorOsDisponivel]);

  const metaFuncionarios = useMemo(() => {
    const funcionarios = Math.max(1, Math.floor(quantidadeFuncionarios || 1));
    const baseMes = planoCompetencia?.baseMeta || totais.honorariosAtualComparacao || 0;
    const alvoMes = planoCompetencia?.meta || totais.metaProximoPeriodo || 0;
    const adicionalMes = Math.max(0, alvoMes - baseMes);
    const realizadoMes = planoCompetencia?.realizado || totais.honorariosAtualComparacao || 0;
    const faltaMes = Math.max(0, alvoMes - realizadoMes);

    return {
      funcionarios,
      baseMes,
      alvoMes,
      adicionalMes,
      realizadoMes,
      faltaMes,
      basePorFuncionario: baseMes / funcionarios,
      alvoPorFuncionario: alvoMes / funcionarios,
      adicionalPorFuncionario: adicionalMes / funcionarios,
      faltaPorFuncionario: faltaMes / funcionarios,
    };
  }, [planoCompetencia, quantidadeFuncionarios, totais]);

  const analisePreditiva = useMemo(() => {
    const crescimentos = periodosAnalisados
      .map((periodo) => periodo.crescimentoHonorarios)
      .filter((valor): valor is number => valor !== null && valor !== undefined && !Number.isNaN(valor));
    const ultimoCrescimento = crescimentos[crescimentos.length - 1] ?? totais.crescimentoHonorarios ?? 0;
    const mediaCrescimento = crescimentos.length
      ? crescimentos.reduce((acc, valor) => acc + valor, 0) / crescimentos.length
      : totais.crescimentoHonorarios ?? 0;
    const quedasSeguidas = crescimentos.slice(-2).filter((valor) => valor < 0).length;
    const historicoComparavel = qualidadeLeitura.transicoesComparaveis > 0;
    const previsaoProximo = planoCompetencia?.projecao || (historicoComparavel
      ? Math.max(0, totais.honorariosAtualComparacao * (1 + mediaCrescimento))
      : totais.honorariosAtualComparacao);
    const servicosEmQueda = dadosAtuais.servicos
      .filter((servico) => servico.crescimento !== null && servico.crescimento < -0.1 && servico.honorarios2025 > 0)
      .sort((a, b) => Math.abs(b.honorarios2025 - b.honorarios2026) - Math.abs(a.honorarios2025 - a.honorarios2026));
    const servicosForaFaixa = qualidadeLeitura.auditoriasReais.length;
    const riscoAlto = historicoComparavel && (ultimoCrescimento <= -0.25 || quedasSeguidas >= 2);
    const riscoMedio = !riscoAlto && ((historicoComparavel && ultimoCrescimento < -0.1) || servicosForaFaixa >= 5);
    const risco = riscoAlto ? "Alto" : riscoMedio ? "Medio" : "Controlado";
    const evidencia = qualidadeLeitura.transicoesComparaveis >= 2 ? "Robusta" : historicoComparavel ? "Curta" : "Base";
    const servicoCritico = servicosEmQueda[0];
    const servicoOportunidade = dadosAtuais.servicos
      .filter((servico) => servico.crescimento === null || servico.crescimento >= 0)
      .sort((a, b) => b.honorarios2026 - a.honorarios2026)[0];

    return {
      risco,
      previsaoProximo,
      evidencia,
      historicoComparavel,
      comparacoesDisponiveis: qualidadeLeitura.transicoesComparaveis,
      mediaCrescimento,
      ultimoCrescimento,
      quedasSeguidas,
      servicoCritico,
      servicoOportunidade,
      servicosForaFaixa,
      servicosEmQueda,
    };
  }, [dadosAtuais.servicos, periodosAnalisados, planoCompetencia, qualidadeLeitura, totais]);

  const leituraDinamica = useMemo(() => {
    const meta = dadosAtuais.comparacao?.metaCrescimento || 0.3;
    const crescimento = totais.crescimentoHonorarios;
    const bateuMeta = crescimento !== null && crescimento >= meta;
    const queda = crescimento !== null && crescimento < 0;
    const comparacaoTexto = trilhaComparacaoTexto;
    const fechamentoTexto = fechamentoComparacaoTexto;

    return {
      comparacaoTexto,
      fechamentoTexto,
      periodoDocumentoTexto,
      resultadoLabel: periodoUnico
        ? "Base inicial para comparacao"
        : comparacaoBloqueadaPorBase
          ? "Base curta para comparacao"
        : totais.ganhoIncremental >= 0
          ? "Ganho no periodo comparado"
          : "Perda no periodo comparado",
      acerto: periodoUnico
        ? `Base carregada: ${totais.servicoLider.servico} liderou os honorarios do periodo importado.`
        : comparacaoBloqueadaPorBase
        ? `Base carregada com ${mesesBaseComparacao} periodo(s); a comparacao exige pelo menos ${MIN_PERIODOS_COMPARACAO}.`
        : bateuMeta
        ? `Meta batida no fechamento ${fechamentoTexto}: crescimento acima de ${formatarPercentual(meta)}.`
        : `Principal ganho: ${totais.servicoLider.servico} liderou os honorarios em ${dadosAtuais.comparacao?.atualLabel}.`,
      alerta: periodoUnico
        ? "Historico curto: envie outra competencia para comparar queda, ganho e cenario com mais evidencia."
        : comparacaoBloqueadaPorBase
        ? `Historico curto: envie mais ${faltamPeriodosComparacao} competencia(s) para liberar comparacao, tendencia e estrategia.`
        : queda
        ? `Alerta: risco ${analisePreditiva.risco.toLowerCase()} de queda no fechamento ${fechamentoTexto}. Revisar ${analisePreditiva.servicoCritico?.servico || "os servicos que mais cairam"} e origem da reducao.`
        : bateuMeta
          ? "Acerto: manter rotina comercial e proteger os servicos que puxaram o resultado."
          : `Faltou para a meta de +30%; alvo de ${planoCompetencia?.label || "proxima competencia"}: ${moeda.format(totais.metaProximoPeriodo)} em honorarios.`,
      meta: `Meta de ${planoCompetencia?.label || "proxima competencia"}: crescer 30% e chegar a ${moeda.format(totais.metaProximoPeriodo)} em honorarios.`,
      previsao: analisePreditiva.historicoComparavel
        ? `Projecao para ${planoCompetencia?.label || "a proxima competencia"}: ${moeda.format(analisePreditiva.previsaoProximo)} pelo ritmo reconhecido.`
        : `Referencia inicial: ${moeda.format(analisePreditiva.previsaoProximo)} ate chegar outra competencia comparavel.`,
    };
  }, [
    analisePreditiva,
    comparacaoBloqueadaPorBase,
    dadosAtuais,
    faltamPeriodosComparacao,
    fechamentoComparacaoTexto,
    mesesBaseComparacao,
    periodoDocumentoTexto,
    periodoUnico,
    planoCompetencia,
    totais,
    trilhaComparacaoTexto,
  ]);

  const validacoes = useMemo<ValidacaoConta[]>(() => {
    const meta = dadosAtuais.comparacao?.metaCrescimento || 0.3;
    const honorarioMedioAnterior = totais.quantidadeAnteriorComparacao
      ? totais.honorariosAnteriorComparacao / totais.quantidadeAnteriorComparacao
      : 0;
    const honorarioMedioAtual = totais.quantidadeAtualComparacao
      ? totais.honorariosAtualComparacao / totais.quantidadeAtualComparacao
      : 0;

    return [
      {
        titulo: "Honorarios",
        anterior: moeda.format(totais.honorariosAnteriorComparacao),
        atual: moeda.format(totais.honorariosAtualComparacao),
        diferenca: moeda.format(totais.ganhoIncremental),
        percentual: formatarPercentual(totais.crescimentoHonorarios),
      },
      ...(valorOsDisponivel
        ? [
            {
              titulo: "Valor O.S.",
              anterior: moeda.format(totais.valorOsAnteriorComparacao),
              atual: moeda.format(totais.valorOsAtualComparacao),
              diferenca: moeda.format(totais.valorOsAtualComparacao - totais.valorOsAnteriorComparacao),
              percentual: formatarPercentual(pct(totais.valorOsAtualComparacao, totais.valorOsAnteriorComparacao)),
            },
          ]
        : []),
      {
        titulo: valorOsDisponivel ? "Quantidade" : "Total de O.S.",
        anterior: numero.format(totais.quantidadeAnteriorComparacao),
        atual: numero.format(totais.quantidadeAtualComparacao),
        diferenca: numero.format(totais.quantidadeAtualComparacao - totais.quantidadeAnteriorComparacao),
        percentual: formatarPercentual(pct(totais.quantidadeAtualComparacao, totais.quantidadeAnteriorComparacao)),
      },
      ...(!valorOsDisponivel
        ? [
            {
              titulo: "Honorario medio por O.S.",
              anterior: moeda.format(honorarioMedioAnterior),
              atual: moeda.format(honorarioMedioAtual),
              diferenca: moeda.format(honorarioMedioAtual - honorarioMedioAnterior),
              percentual: formatarPercentual(pct(honorarioMedioAtual, honorarioMedioAnterior)),
            },
          ]
        : []),
      {
        titulo: "Meta +30%",
        anterior: moeda.format(planoCompetencia?.baseMeta || totais.honorariosAtualComparacao),
        atual: moeda.format(totais.metaProximoPeriodo),
        diferenca: moeda.format(totais.metaProximoPeriodo - (planoCompetencia?.baseMeta || totais.honorariosAtualComparacao)),
        percentual: formatarPercentual(meta),
      },
    ];
  }, [dadosAtuais, planoCompetencia, totais, valorOsDisponivel]);

  const radarDecisor = useMemo(() => {
    if (!relatorioUpload) return null;

    const meta = dadosAtuais.comparacao?.metaCrescimento || 0.3;
    const crescimentoHonorarios = totais.crescimentoHonorarios ?? 0;
    const crescimentoQuantidade = pct(totais.quantidadeAtualComparacao, totais.quantidadeAnteriorComparacao) ?? 0;
    const honorarioMedioAnterior = totais.quantidadeAnteriorComparacao
      ? totais.honorariosAnteriorComparacao / totais.quantidadeAnteriorComparacao
      : 0;
    const honorarioMedioAtual = totais.quantidadeAtualComparacao
      ? totais.honorariosAtualComparacao / totais.quantidadeAtualComparacao
      : 0;
    const crescimentoHonorarioMedio = pct(honorarioMedioAtual, honorarioMedioAnterior) ?? 0;
    const ticketAnterior = valorOsDisponivel && totais.quantidadeAnteriorComparacao ? totais.valorOsAnteriorComparacao / totais.quantidadeAnteriorComparacao : 0;
    const ticketAtual = valorOsDisponivel && totais.quantidadeAtualComparacao ? totais.valorOsAtualComparacao / totais.quantidadeAtualComparacao : 0;
    const crescimentoTicket = valorOsDisponivel ? pct(ticketAtual, ticketAnterior) ?? 0 : 0;
    const margemAtual = valorOsDisponivel && totais.valorOsAtualComparacao ? totais.honorariosAtualComparacao / totais.valorOsAtualComparacao : 0;
    const margemAnterior = valorOsDisponivel && totais.valorOsAnteriorComparacao ? totais.honorariosAnteriorComparacao / totais.valorOsAnteriorComparacao : 0;
    const variacaoMargem = valorOsDisponivel ? pct(margemAtual, margemAnterior) ?? 0 : 0;
    const auditoriasReais = qualidadeLeitura.auditoriasReais;
    const arquivosFalhos = qualidadeLeitura.arquivosFalhos.length;
    const periodosSobrepostos = qualidadeLeitura.periodosSobrepostos.length;
    const periodosSemIntervalo = qualidadeLeitura.periodosSemIntervalo.length;
    const penalidadeRisco = analisePreditiva.risco === "Alto" ? 22 : analisePreditiva.risco === "Medio" ? 11 : 0;
    const penalidadeIntervalo =
      qualidadeLeitura.cortesDivergentes || qualidadeLeitura.intervalosForaCompetencia.length
        ? 12
        : Math.min(periodosSemIntervalo * 2, 6);
    const penalidadeAuditoria = Math.min(auditoriasReais.length * 1.2, 10);
    const confiancaDados = limitarScore(
      52 +
        Math.min(dadosAtuais.totalLinhas || 0, 120) * 0.22 +
        Math.min(periodosImportados.length, 6) * 4 +
        Math.min(qualidadeLeitura.transicoesComparaveis, 4) * 3 -
        arquivosFalhos * 9 -
        Math.min(periodosSobrepostos * 8, 16) -
        (valorOsDisponivel ? 0 : 5) -
        penalidadeIntervalo
    );
    const scoreCalculado = limitarScore(
      68 +
        crescimentoHonorarios * 36 +
        crescimentoQuantidade * 8 +
        (valorOsDisponivel ? crescimentoTicket * 5 + variacaoMargem * 4 : crescimentoHonorarioMedio * 7) -
        penalidadeRisco * 0.7 -
        penalidadeAuditoria
    );
    const baseCurta = periodoUnico || comparacaoBloqueadaPorBase;
    const scoreSaude = baseCurta ? Math.max(55, scoreCalculado) : scoreCalculado;
    const nivel = baseCurta ? "Base" : scoreSaude >= 76 ? "Acelerar" : scoreSaude >= 55 ? "Ajustar" : "Intervir";
    const statusGeral: RadarStatus = baseCurta ? "alerta" : scoreSaude >= 76 ? "bom" : scoreSaude >= 55 ? "alerta" : "critico";
    const metaBatida = crescimentoHonorarios >= meta;
    const volumeCaiu = crescimentoQuantidade < -0.08;
    const honorarioMedioCaiu = crescimentoHonorarioMedio < -0.08;
    const ticketCaiu = valorOsDisponivel && crescimentoTicket < -0.08;
    const margemCaiu = valorOsDisponivel && variacaoMargem < -0.08;

    const causaPrincipal = (() => {
      if (periodosSobrepostos) return "periodos com mais de um anexo foram somados; validar duplicidade antes da decisao";
      if (qualidadeLeitura.intervalosForaCompetencia.length) return "um intervalo do cabecalho termina fora da competencia; validar o recorte do PDF";
      if (qualidadeLeitura.cortesDivergentes) return "os anexos usam dias de corte diferentes; alinhar o recorte antes de comparar tendencia";
      if (periodoUnico) return "este PDF virou a base inicial; envie outro mes para medir tendencia real";
      if (comparacaoBloqueadaPorBase) return `a leitura tem ${mesesBaseComparacao} periodo(s); a comparacao exige ${MIN_PERIODOS_COMPARACAO} ou mais`;
      if (analisePreditiva.risco === "Alto") return "queda em sequencia com risco alto de proximo fechamento fraco";
      if (auditoriasReais.length >= 6) return valorOsDisponivel ? "muitos pontos fora da faixa podem distorcer preco e margem" : "muitos pontos fora da faixa podem distorcer preco e honorario medio";
      if (volumeCaiu && crescimentoQuantidade <= crescimentoTicket) return "menos processos puxaram a queda principal";
      if (!valorOsDisponivel && honorarioMedioCaiu) return "honorario medio por O.S. caiu no fechamento";
      if (ticketCaiu) return "ticket medio caiu e reduziu o valor por processo";
      if (margemCaiu) return "honorario perdeu participacao dentro da O.S.";
      if (analisePreditiva.servicoCritico) return `${analisePreditiva.servicoCritico.servico} perdeu forca no mix`;
      if (!metaBatida) return "resultado positivo, mas ainda abaixo da meta de crescimento";
      return "crescimento saudavel com sinal para escalar o que ja funciona";
    })();

    const decisaoAgora =
      baseCurta
        ? periodoUnico
          ? "Importacao validada como base inicial. Envie outra competencia quando quiser comparar tendencia e cenario real."
          : `Importacao validada como base curta. Envie mais ${faltamPeriodosComparacao} competencia(s) junto para liberar comparacao, tendencia e cenario real.`
        : nivel === "Intervir"
        ? "Concentrar a semana em recuperar receita perdida, revisar precos fora da faixa e atacar o servico critico."
        : nivel === "Ajustar"
          ? "Manter o que cresceu, corrigir a principal causa de perda e acompanhar meta antes do fechamento."
          : valorOsDisponivel
            ? "Escalar o servico lider, proteger margem e transformar o melhor mes em padrao operacional."
            : "Escalar o servico lider, proteger honorario medio e transformar o melhor mes em padrao operacional.";

    const sinais: RadarSinal[] = [
      {
        titulo: "Saude da receita",
        valor: `${scoreSaude}/100`,
        detalhe: `${nivel}: ${formatarPercentual(crescimentoHonorarios)} no fechamento.`,
        status: statusGeral,
      },
      {
        titulo: "Confianca dos dados",
        valor: `${confiancaDados}/100`,
        detalhe: `${dadosAtuais.totalLinhas || 0} linhas, evidencia ${analisePreditiva.evidencia.toLowerCase()}, ${arquivosFalhos} anexo(s) sem linhas.`,
        status: confiancaDados >= 75 ? "bom" : confiancaDados >= 55 ? "alerta" : "critico",
      },
      {
        titulo: "Risco previsto",
        valor: analisePreditiva.risco,
        detalhe: `Proximo estimado: ${moeda.format(analisePreditiva.previsaoProximo)}.`,
        status: analisePreditiva.risco === "Alto" ? "critico" : analisePreditiva.risco === "Medio" ? "alerta" : "bom",
      },
      {
        titulo: "Pressao de auditoria",
        valor: `${auditoriasReais.length}`,
        detalhe: valorOsDisponivel
          ? "Itens fora da faixa de preco, repasse ou margem."
          : "Itens fora da faixa de preco ou honorario medio; este modelo usa Total de O.S. por volume.",
        status: auditoriasReais.length >= 6 ? "critico" : auditoriasReais.length >= 3 ? "alerta" : "bom",
      },
    ];

    const acoes: AcaoDecisiva[] = [
      {
        prioridade: "01",
        titulo: nivel === "Intervir" ? "Recuperar receita perdida" : "Definir foco semanal",
        detalhe: decisaoAgora,
        motivo: causaPrincipal,
      },
      {
        prioridade: "02",
        titulo: "Atacar o servico critico",
        detalhe: valorOsDisponivel
          ? `Comparar quantidade, ticket e honorario medio de ${analisePreditiva.servicoCritico?.servico || "servicos em queda"} antes do proximo envio.`
          : `Comparar quantidade e honorario medio de ${analisePreditiva.servicoCritico?.servico || "servicos em queda"} antes do proximo envio.`,
        motivo: `${analisePreditiva.servicosEmQueda.length} servico(s) em queda relevante.`,
      },
      {
        prioridade: "03",
        titulo: "Escalar o melhor sinal",
        detalhe: `Transformar ${analisePreditiva.servicoOportunidade?.servico || totais.servicoLider.servico} em oferta principal do periodo.`,
        motivo: `Servico lider atual: ${totais.servicoLider.servico}.`,
      },
      {
        prioridade: "04",
        titulo: "Fechar meta com travas",
        detalhe: `Meta sugerida: ${moeda.format(totais.metaProximoPeriodo)}. Revisar outliers antes de aceitar o plano.`,
        motivo: valorOsDisponivel
          ? `${auditoriasReais.length} ponto(s) podem mudar a leitura da margem.`
          : `${auditoriasReais.length} ponto(s) podem mudar a leitura de preco/honorario medio.`,
      },
    ];

    const fatores: FatorCausal[] = [
      {
        fator: "Volume",
        leitura: formatarPercentual(crescimentoQuantidade),
        impacto: volumeCaiu
          ? valorOsDisponivel
            ? "Menos processos reduzem receita mesmo com ticket estavel."
            : "Menos O.S. reduzem honorarios neste modelo agregado."
          : "Volume nao e o principal bloqueio agora.",
        status: crescimentoQuantidade < -0.1 ? "critico" : crescimentoQuantidade < 0.05 ? "alerta" : "bom",
      },
      ...(valorOsDisponivel
        ? ([
            {
              fator: "Ticket O.S.",
              leitura: formatarPercentual(crescimentoTicket),
              impacto: ticketCaiu ? "Cada processo esta valendo menos na O.S." : "Ticket sustenta ou nao derruba o fechamento.",
              status: crescimentoTicket < -0.1 ? "critico" : crescimentoTicket < 0.03 ? "alerta" : "bom",
            },
            {
              fator: "Margem honorario/O.S.",
              leitura: formatarPercentual(variacaoMargem),
              impacto: margemCaiu ? "Honorario perdeu peso dentro da receita operacional." : "Margem relativa esta preservada.",
              status: variacaoMargem < -0.1 ? "critico" : variacaoMargem < 0 ? "alerta" : "bom",
            },
          ] as FatorCausal[])
        : ([
            {
              fator: "Honorario medio",
              leitura: formatarPercentual(crescimentoHonorarioMedio),
              impacto: honorarioMedioCaiu
                ? "Cada O.S. gerou menos honorario medio neste fechamento."
                : "Honorario medio por O.S. sustenta o resultado deste modelo.",
              status: crescimentoHonorarioMedio < -0.1 ? "critico" : crescimentoHonorarioMedio < 0.03 ? "alerta" : "bom",
            },
          ] as FatorCausal[])),
      {
        fator: "Mix de servicos",
        leitura: `${analisePreditiva.servicosEmQueda.length} queda(s)`,
        impacto: analisePreditiva.servicoCritico
          ? `${analisePreditiva.servicoCritico.servico} deve ser revisado primeiro.`
          : "Nao ha servico comparavel com queda forte.",
        status: analisePreditiva.servicosEmQueda.length >= 3 ? "critico" : analisePreditiva.servicosEmQueda.length ? "alerta" : "bom",
      },
    ];

    const matriz: MatrizDecisao[] = [
      {
        eixo: "Receita",
        agora: moeda.format(totais.honorariosAtualComparacao),
        proximo: moeda.format(totais.metaProximoPeriodo),
        status: metaBatida ? "bom" : crescimentoHonorarios < 0 ? "critico" : "alerta",
      },
      {
        eixo: "Previsao",
        agora: moeda.format(analisePreditiva.previsaoProximo),
        proximo: analisePreditiva.risco,
        status: analisePreditiva.risco === "Alto" ? "critico" : analisePreditiva.risco === "Medio" ? "alerta" : "bom",
      },
      {
        eixo: "Dados",
        agora: `${confiancaDados}/100`,
        proximo:
          arquivosFalhos || periodosSobrepostos || qualidadeLeitura.cortesDivergentes || qualidadeLeitura.intervalosForaCompetencia.length
            ? "Revisar anexos"
            : "Base utilizavel",
        status: confiancaDados >= 75 ? "bom" : confiancaDados >= 55 ? "alerta" : "critico",
      },
    ];

    return {
      scoreSaude,
      nivel,
      statusGeral,
      causaPrincipal,
      decisaoAgora,
      confiancaDados,
      sinais,
      acoes,
      fatores,
      matriz,
    };
  }, [
    analisePreditiva,
    comparacaoBloqueadaPorBase,
    dadosAtuais,
    faltamPeriodosComparacao,
    mesesBaseComparacao,
    periodoUnico,
    periodosImportados.length,
    qualidadeLeitura,
    relatorioUpload,
    totais,
    valorOsDisponivel,
  ]);

  const mesaEstrategica = useMemo(() => {
    if (!relatorioUpload || !radarDecisor || !comparacaoSuficiente) return null;

    const periodosFechados = periodosImportadosDoRelatorio(dadosServico).filter(
      (periodo) =>
        periodoTemCoberturaComparavel(periodo) &&
        (!planoCompetencia ||
          periodo.ano < planoCompetencia.ano ||
          (periodo.ano === planoCompetencia.ano && periodo.mesNumero < planoCompetencia.mesNumero))
    );
    const periodosMesmoAno = planoCompetencia
      ? periodosFechados.filter((periodo) => periodo.ano === planoCompetencia.ano)
      : [];
    const periodosSerie = (periodosMesmoAno.length >= 2 ? periodosMesmoAno : periodosFechados).slice(-6);
    const serieBase = periodosSerie.map((periodo) => periodo.honorarios);
    const crescimentos = periodosSerie
      .slice(1)
      .map((periodo, index) => {
        const anterior = periodosSerie[index];
        const consecutivos = periodo.ano * 12 + periodo.mesNumero - (anterior.ano * 12 + anterior.mesNumero) === 1;
        return consecutivos ? pct(periodo.honorarios, anterior.honorarios) : null;
      })
      .filter((valor): valor is number => valor !== null && !Number.isNaN(valor));
    const momentumCurto = crescimentos[crescimentos.length - 1] ?? 0;
    const momentumMedio = crescimentos.length ? media(crescimentos) : momentumCurto;
    const volatilidade = desvioPadrao(crescimentos);
    const maxDrawdown = calcularMaxDrawdown(serieBase);
    const auditoriasReais = dadosAtuais.auditoria.filter((item) => item.tipo !== "Arquivo sem linhas reconhecidas").length;
    const meta = dadosAtuais.comparacao?.metaCrescimento || 0.3;
    const referencia = planoCompetencia?.baseMeta || totais.honorariosAtualComparacao;
    const atual =
      planoCompetencia?.projecao || Math.max(0, referencia * (1 + (momentumMedio * 0.62 + momentumCurto * 0.38)));
    const alvo = planoCompetencia?.meta || totais.metaProximoPeriodo;
    const servicoAlfa = analisePreditiva.servicoOportunidade || totais.servicoLider;
    const servicoHedge = analisePreditiva.servicoCritico;
    const crescimentoBase = pct(atual, referencia) || 0;
    const penalidadeAuditoria = Math.min(auditoriasReais * 0.018, 0.14);
    const shock = Math.min(0.48, Math.abs(maxDrawdown) + volatilidade * 1.25 + penalidadeAuditoria);
    const crescimentoBull = Math.max(meta, crescimentoBase + volatilidade * 0.7 + 0.08);
    const crescimentoBear = Math.max(-0.55, Math.min(-0.04, crescimentoBase - volatilidade - penalidadeAuditoria));
    const valorBull = Math.max(alvo, referencia * (1 + crescimentoBull));
    const valorBear = Math.max(0, referencia * (1 + crescimentoBear));
    const valorStress = Math.max(0, atual * (1 - shock));
    const statusOperacional = planoCompetencia?.status === "critico" ? "critico" : radarDecisor.statusGeral;

    const cenarios: CenarioEstrategico[] = [
      {
        id: "base",
        nome: "Base",
        valor: atual,
        variacao: crescimentoBase,
        gapMeta: atual - alvo,
        narrativa: planoCompetencia?.emAndamento
          ? "Projeta o fechamento pelo ritmo diario reconhecido na competencia em andamento."
          : "Usa a media ponderada dos meses fechados como previsao central da proxima competencia.",
        acao: "Acompanhar semanalmente e corrigir qualquer desvio antes do fechamento.",
        status: crescimentoBase >= meta ? "bom" : crescimentoBase >= 0 ? "alerta" : "critico",
      },
      {
        id: "bull",
        nome: "Bull",
        valor: valorBull,
        variacao: pct(valorBull, referencia) || 0,
        gapMeta: valorBull - alvo,
        narrativa: "Cenario de aceleracao: servico lider ganha prioridade e o mix vencedor recebe mais energia.",
        acao: valorOsDisponivel
          ? `Dobrar foco em ${servicoAlfa?.servico || "servico lider"} e proteger margem no fechamento.`
          : `Dobrar foco em ${servicoAlfa?.servico || "servico lider"} e proteger honorario medio no fechamento.`,
        status: "bom",
      },
      {
        id: "bear",
        nome: "Bear",
        valor: valorBear,
        variacao: pct(valorBear, referencia) || 0,
        gapMeta: valorBear - alvo,
        narrativa: "Cenario defensivo: queda de momentum, pressao de auditoria e perda de eficiencia.",
        acao: `Hedge operacional em ${servicoHedge?.servico || "servicos em queda"} com revisao de preco e origem da demanda.`,
        status: "alerta",
      },
      {
        id: "stress",
        nome: "Stress",
        valor: valorStress,
        variacao: pct(valorStress, referencia) || 0,
        gapMeta: valorStress - alvo,
        narrativa: "Teste de choque: combina pior queda observada, volatilidade e erros fora da faixa.",
        acao: "Congelar dispersao, revisar outliers e concentrar execucao nos 3 servicos de maior impacto.",
        status: "critico",
      },
    ];

    const pesosBrutos: AlocacaoFoco[] = [
      {
        area: "Escalar alfa",
        peso: radarDecisor.scoreSaude >= 76 ? 38 : 27,
        tese: `${servicoAlfa?.servico || "Servico lider"} tem melhor assimetria de ganho.`,
        acao: "Aumentar oferta ativa e usar como porta de entrada para combos.",
        status: "bom" as RadarStatus,
      },
      {
        area: "Hedge de queda",
        peso: analisePreditiva.risco === "Alto" ? 34 : analisePreditiva.risco === "Medio" ? 26 : 16,
        tese: servicoHedge ? `${servicoHedge.servico} concentra risco de perda.` : "Sem queda forte, manter protecao leve.",
        acao: valorOsDisponivel
          ? "Revisar volume, origem, ticket e preco antes de perder outro fechamento."
          : "Revisar volume, origem e honorario medio antes de perder outro fechamento.",
        status: analisePreditiva.risco === "Alto" ? "critico" : "alerta",
      },
      {
        area: valorOsDisponivel ? "Auditoria de margem" : "Auditoria de preco",
        peso: Math.min(30, 12 + auditoriasReais * 3),
        tese: `${auditoriasReais} item(ns) podem distorcer lucro e previsao.`,
        acao: valorOsDisponivel
          ? "Validar honorario/O.S. e medias muito baixas antes da meta final."
          : "Validar honorario medio e servicos de baixo valor antes da meta final.",
        status: auditoriasReais >= 6 ? "critico" : auditoriasReais >= 3 ? "alerta" : "bom",
      },
      {
        area: "Caixa previsivel",
        peso: 22,
        tese: "Manter base recorrente reduz volatilidade do proximo periodo.",
        acao: "Separar servicos repetiveis e criar rotina semanal de acompanhamento.",
        status: "bom" as RadarStatus,
      },
    ];
    const somaPesos = pesosBrutos.reduce((acc, item) => acc + item.peso, 0) || 1;
    const alocacoes: AlocacaoFoco[] = pesosBrutos.map((item) => ({
      ...item,
      peso: Math.round((item.peso / somaPesos) * 100),
    }));

    const ticker: TickerEstrategico[] = [
      {
        label: "Momentum",
        valor: formatarPercentual(momentumCurto),
        status: momentumCurto >= meta ? "bom" : momentumCurto >= 0 ? "alerta" : "critico",
      },
      {
        label: "Volatilidade",
        valor: formatarPercentual(volatilidade),
        status: volatilidade <= 0.12 ? "bom" : volatilidade <= 0.28 ? "alerta" : "critico",
      },
      {
        label: "Drawdown",
        valor: formatarPercentual(maxDrawdown),
        status: maxDrawdown > -0.08 ? "bom" : maxDrawdown > -0.22 ? "alerta" : "critico",
      },
      {
        label: "Upside bull",
        valor: moeda.format(Math.max(0, cenarios[1].valor - atual)),
        status: "bom",
      },
      {
        label: "Perda stress",
        valor: moeda.format(Math.max(0, atual - cenarios[3].valor)),
        status: cenarios[3].variacao < -0.3 ? "critico" : "alerta",
      },
    ];

    const movimentos: MovimentoTatico[] = [
      {
        janela: "Agora",
        movimento: `Comprar foco em ${servicoAlfa?.servico || "servico lider"}`,
        gatilho: `Score ${radarDecisor.scoreSaude}/100 e alvo de ${moeda.format(alvo)}.`,
        resultado: "Criar tracao sem espalhar energia comercial.",
      },
      {
        janela: "48h",
        movimento: "Fechar auditoria dos outliers",
        gatilho: `${auditoriasReais} ponto(s) fora da faixa.`,
        resultado: "Limpar distorcao antes de decidir meta e preco.",
      },
      {
        janela: "7 dias",
        movimento: "Rodar sprint antiqueda",
        gatilho: `Risco ${analisePreditiva.risco} e drawdown ${formatarPercentual(maxDrawdown)}.`,
        resultado: "Recuperar receita antes do fechamento virar tendencia.",
      },
      {
        janela: "30 dias",
        movimento: "Rebalancear mix",
        gatilho: `Cenario base em ${moeda.format(cenarios[0].valor)}.`,
        resultado: "Transformar servico vencedor em maquina previsivel.",
      },
    ];

    const comando =
      statusOperacional === "bom"
        ? valorOsDisponivel
          ? `Modo ofensivo: acelerar ${servicoAlfa?.servico || "servico lider"} e defender margem.`
          : `Modo ofensivo: acelerar ${servicoAlfa?.servico || "servico lider"} e defender honorario medio.`
        : statusOperacional === "alerta"
          ? `Modo seletivo: escalar o que cresce e cortar vazamento em ${servicoHedge?.servico || "servicos fracos"}.`
          : planoCompetencia?.emAndamento
            ? `Modo recuperacao: corrigir o ritmo de ${planoCompetencia.label} e recuperar ${servicoHedge?.servico || "receita perdida"}.`
            : `Modo crise: preservar caixa, auditar preco e recuperar ${servicoHedge?.servico || "receita perdida"}.`;

    const mapa: MapaEstrategico[] = [
      {
        termo: "Base",
        leitura: "Cenario mais provavel",
        detalhe: `Projeta ${moeda.format(cenarios[0].valor)} se o ritmo medio continuar. Use como trilho principal da meta.`,
        status: cenarios[0].status,
      },
      {
        termo: "Bull",
        leitura: "Cenario ofensivo",
        detalhe: `Mostra o upside se ${servicoAlfa?.servico || "servico lider"} ganhar tracao e o mix melhorar.`,
        status: "bom",
      },
      {
        termo: "Bear",
        leitura: "Cenario defensivo",
        detalhe: `Assume perda de ritmo, pressao de preco e risco em ${servicoHedge?.servico || "servicos em queda"}.`,
        status: "alerta",
      },
      {
        termo: "Stress",
        leitura: "Teste de choque",
        detalhe: "Forca a pior combinacao de drawdown, volatilidade e auditoria para medir a perda maxima provavel.",
        status: "critico",
      },
      {
        termo: "Momentum",
        leitura: "Velocidade do resultado",
        detalhe: `Ultimo movimento em ${formatarPercentual(momentumCurto)}. Positivo acelera; negativo pede recuperacao rapida.`,
        status: ticker[0].status,
      },
      {
        termo: "Volatilidade",
        leitura: "Quanto oscila",
        detalhe: `Oscilacao em ${formatarPercentual(volatilidade)}. Quanto maior, menor a previsibilidade do proximo caixa.`,
        status: ticker[1].status,
      },
      {
        termo: "Drawdown",
        leitura: "Pior queda desde o topo",
        detalhe: `Queda maxima em ${formatarPercentual(maxDrawdown)}. Mostra a dor que o caixa ja mostrou quando perdeu forca.`,
        status: ticker[2].status,
      },
      {
        termo: "Upside bull",
        leitura: "Ganho se acelerar",
        detalhe: `Potencial adicional de ${moeda.format(Math.max(0, cenarios[1].valor - atual))} acima do nivel atual.`,
        status: "bom",
      },
      {
        termo: "Perda stress",
        leitura: "Caixa em risco",
        detalhe: `Choque estimado em ${moeda.format(Math.max(0, atual - cenarios[3].valor))}. Serve para definir defesa antes da queda.`,
        status: ticker[4].status,
      },
      {
        termo: "Modo crise",
        leitura: "Protocolo de preservacao",
        detalhe:
          statusOperacional === "critico"
            ? `Ativo agora: preservar caixa, auditar preco e recuperar ${servicoHedge?.servico || "SERVICOS MENSAIS LOGISTAS"}.`
            : `Entra quando score, drawdown ou auditoria ficam no vermelho: caixa primeiro, preco auditado e recuperacao de ${servicoHedge?.servico || "SERVICOS MENSAIS LOGISTAS"}.`,
        status: statusOperacional === "critico" ? "critico" : "alerta",
      },
    ];

    return {
      comando,
      momentumCurto,
      momentumMedio,
      volatilidade,
      maxDrawdown,
      ticker,
      cenarios,
      alocacoes,
      movimentos,
      mapa,
    };
  }, [
    analisePreditiva,
    comparacaoSuficiente,
    dadosAtuais,
    dadosServico,
    periodosAnalisados,
    planoCompetencia,
    radarDecisor,
    relatorioUpload,
    totais,
    valorOsDisponivel,
  ]);

  const planoPnvaCore = useMemo(() => {
    if (!relatorioUpload || !radarDecisor) return null;

    const servicoForte = analisePreditiva.servicoOportunidade?.servico || totais.servicoLider.servico || "servico lider";
    const servicoCritico = analisePreditiva.servicoCritico?.servico || "servicos que cairam";
    const alvo = planoCompetencia?.meta || totais.metaProximoPeriodo || analisePreditiva.previsaoProximo;
    const referencia = planoCompetencia?.projecao || totais.honorariosAtualComparacao || 0;
    const falta = Math.max(0, alvo - referencia);
    const faltaSemana = falta / 4;
    const auditorias = qualidadeLeitura.auditoriasReais.length;
    const queda = (totais.crescimentoHonorarios ?? 0) < 0;
    const direcaoTecnica = mesaEstrategica?.comando;
    const status: RadarStatus = queda || radarDecisor.statusGeral === "critico" ? "critico" : radarDecisor.statusGeral;
    const decisao =
      comparacaoBloqueadaPorBase
        ? `Antes de decidir escala, envie mais ${faltamPeriodosComparacao} competencia(s). Com a base atual, use a rotina abaixo como plano de protecao.`
        : queda
          ? `A empresa precisa recuperar receita agora: o volume subiu, mas honorario e O.S. cairam. O foco e corrigir mix, preco e recorrencia antes de buscar volume novo.`
          : direcaoTecnica || `A empresa pode acelerar, mas com foco. O jogo agora e repetir o servico vencedor, proteger margem e bater a meta sem espalhar energia.`;

    const missoes: Array<{
      etapa: string;
      titulo: string;
      missao: string;
      como: string;
      indicador: string;
      prazo: string;
      status: RadarStatus;
    }> = [
      {
        etapa: "P",
        titulo: "Prioridade da semana",
        missao: queda ? `Estancar a queda em ${servicoCritico}.` : `Fazer ${servicoForte} virar a oferta principal.`,
        como: queda
          ? "Separar clientes que compravam esse servico, chamar no WhatsApp e entender se a perda veio de preco, prazo, atendimento ou demanda."
          : "Usar esse servico como entrada da conversa, com mensagem simples, prazo claro e oferta combinada com servicos complementares.",
        indicador: queda ? "Recuperar conversas perdidas" : `Mais vendas em ${servicoForte}`,
        prazo: "Hoje",
        status,
      },
      {
        etapa: "N",
        titulo: "Numero que manda",
        missao: falta > 0 ? `Criar ${moeda.format(falta)} adicionais ate ${planoCompetencia?.label || "a proxima competencia"}.` : "Manter a meta batida sem perder margem.",
        como: falta > 0
          ? `Transformar em meta de aproximadamente ${moeda.format(faltaSemana)} por semana. Acompanhar realizado todo fim de dia.`
          : "Registrar o que funcionou, manter preco e repetir o mix vencedor sem dar desconto desnecessario.",
        indicador: falta > 0 ? `Gap: ${moeda.format(falta)}` : "Meta protegida",
        prazo: "Diario",
        status: falta > 0 ? "alerta" : "bom",
      },
      {
        etapa: "V",
        titulo: "Venda que move",
        missao: `Rodar campanha simples para ${servicoForte}.`,
        como: "Publicar prova, chamar clientes antigos e oferecer resolucao direta. Nao tentar vender tudo ao mesmo tempo.",
        indicador: "Conversas abertas e fechamentos",
        prazo: "7 dias",
        status: "bom",
      },
      {
        etapa: "A",
        titulo: "Acao de controle",
        missao: auditorias ? `Revisar ${auditorias} ponto(s) fora da faixa antes de fechar decisao.` : "Conferir se preco, repasse e honorario medio continuam saudaveis.",
        como: "Validar servicos com honorario muito alto sobre O.S. ou media baixa. Se for repasse correto, marcar como excecao operacional.",
        indicador: auditorias ? `${auditorias} revisoes` : "Sem distorcao grave",
        prazo: "48h",
        status: auditorias >= 6 ? "critico" : auditorias >= 3 ? "alerta" : "bom",
      },
    ];

    const placar: Array<{ label: string; valor: string; detalhe: string; status: RadarStatus }> = [
      { label: "Meta", valor: moeda.format(alvo), detalhe: planoCompetencia?.label || "proxima competencia", status: falta > 0 ? "alerta" : "bom" },
      { label: "Previsao", valor: moeda.format(analisePreditiva.previsaoProximo), detalhe: `Risco ${analisePreditiva.risco}`, status: analisePreditiva.risco === "Alto" ? "critico" : analisePreditiva.risco === "Medio" ? "alerta" : "bom" },
      { label: "Foco", valor: servicoForte, detalhe: "Oferta principal", status: "bom" },
      { label: "Defesa", valor: servicoCritico, detalhe: "Nao deixar sangrar", status: analisePreditiva.servicoCritico ? "critico" : "alerta" },
    ];

    const regras = [
      "Uma prioridade por semana. Se tudo vira prioridade, nada muda.",
      "Toda missao precisa ter dono, prazo e numero acompanhado no fim do dia.",
      "Nao buscar mais volume antes de corrigir servico que derruba honorario medio.",
      "Oferta vencedora vira rotina: mensagem, lista de clientes, acompanhamento e fechamento.",
      "Auditoria nao e burocracia: e protecao de margem e previsao.",
    ];

    return {
      status,
      decisao,
      servicoForte,
      servicoCritico,
      alvo,
      falta,
      missoes,
      placar,
      regras,
      fraseFinal: queda
        ? `Missao central: recuperar ${servicoCritico}, escalar ${servicoForte} e fechar ${moeda.format(falta)} de gap com controle diario.`
        : `Missao central: repetir ${servicoForte}, proteger margem e transformar o crescimento em rotina semanal.`,
    };
  }, [
    analisePreditiva,
    comparacaoBloqueadaPorBase,
    faltamPeriodosComparacao,
    planoCompetencia,
    qualidadeLeitura.auditoriasReais.length,
    mesaEstrategica,
    radarDecisor,
    relatorioUpload,
    totais,
  ]);

  const metasDinamicas = useMemo<MetaDinamica[]>(() => {
    if (!relatorioUpload) return [];

    const quedaForte = analisePreditiva.ultimoCrescimento < -0.2;
    const servicoCritico = analisePreditiva.servicoCritico?.servico || "servicos em queda";
    const servicoOportunidade = analisePreditiva.servicoOportunidade?.servico || totais.servicoLider.servico;

    return [
      {
        prioridade: quedaForte ? "Alta" : "Media",
        acao: `Plano de crescimento de ${planoCompetencia?.label || "proxima competencia"}`,
        detalhe: quedaForte
          ? `Atacar a queda de ${formatarPercentual(analisePreditiva.ultimoCrescimento)} antes do proximo fechamento.`
          : planoCompetencia?.emAndamento
            ? `Acompanhar o ritmo diario: projecao atual de ${moeda.format(planoCompetencia.projecao)}.`
            : "Meta preparada com base apenas em competencias fechadas.",
        indicador: `Alvo: ${moeda.format(totais.metaProximoPeriodo)}`,
        progresso: limitarPercentual(planoCompetencia?.progressoProjetado || (quedaForte ? 35 : 58)),
      },
      {
        prioridade: analisePreditiva.servicoCritico ? "Alta" : "Media",
        acao: "Recuperar servicos que perderam receita",
        detalhe: valorOsDisponivel
          ? `Priorizar ${servicoCritico} e comparar quantidade, ticket e honorario medio contra o periodo anterior.`
          : `Priorizar ${servicoCritico} e comparar quantidade e honorario medio contra o periodo anterior.`,
        indicador: "Reposicao de honorarios perdidos",
        progresso: limitarPercentual(100 - Math.abs((analisePreditiva.servicoCritico?.crescimento || -0.25) * 100)),
      },
      {
        prioridade: "Media",
        acao: "Escalar servico com melhor sinal",
        detalhe: `Usar ${servicoOportunidade} como produto de entrada e puxar combos com transferencia, assinatura e comunicacao de venda.`,
        indicador: "Crescimento do mix vencedor",
        progresso: limitarPercentual((analisePreditiva.servicoOportunidade?.crescimento || 0.2) * 100 + 45),
      },
      {
        prioridade: analisePreditiva.servicosForaFaixa >= 5 ? "Alta" : "Media",
        acao: "Auditar precificacao fora da faixa",
        detalhe: `${analisePreditiva.servicosForaFaixa} ponto(s) de auditoria encontrados nos arquivos enviados.`,
        indicador: "Erros revisados",
        progresso: limitarPercentual(100 - analisePreditiva.servicosForaFaixa * 6),
      },
      {
        prioridade: analisePreditiva.risco === "Alto" ? "Alta" : "Media",
        acao: "Projetar e corrigir o ritmo mensal",
        detalhe: `A projecao deterministica para ${planoCompetencia?.label || "a competencia alvo"} e ${moeda.format(analisePreditiva.previsaoProximo)}.`,
        indicador: `Risco ${analisePreditiva.risco}`,
        progresso: limitarPercentual(analisePreditiva.risco === "Alto" ? 30 : analisePreditiva.risco === "Medio" ? 55 : 78),
      },
    ];
  }, [analisePreditiva, planoCompetencia, relatorioUpload, totais, valorOsDisponivel]);

  const tendenciasDinamicas = useMemo<TendenciaDinamica[]>(() => {
    if (!relatorioUpload) return [];

    return [
      {
        tema: "Previsao",
        padrao: planoCompetencia?.emAndamento
          ? `${planoCompetencia.diasCobertos}/${planoCompetencia.diasNoMes} dias reconhecidos em ${planoCompetencia.label}.`
          : `Base robusta formada por ${planoCompetencia?.periodosBase.join(", ") || "competencias fechadas"}.`,
        impacto: `Projecao para ${planoCompetencia?.label || "proxima competencia"}: ${moeda.format(analisePreditiva.previsaoProximo)} em honorarios.`,
        recomendacao: "Comparar semanalmente contra a meta e agir antes do fechamento se a curva ficar abaixo do alvo.",
      },
      {
        tema: "Risco",
        padrao: `Risco operacional atual: ${analisePreditiva.risco}.`,
        impacto: analisePreditiva.quedasSeguidas >= 2 ? "Existe queda em sequencia nos ultimos periodos." : leituraDinamica.resultadoLabel,
        recomendacao: analisePreditiva.risco === "Alto"
          ? "Acionar plano de recuperacao: retorno de clientes, revisao de recorrentes e oferta ativa nos servicos lideres."
          : "Manter rotina de revisao e proteger servicos com maior honorario medio.",
      },
      {
        tema: "Erros",
        padrao: `${analisePreditiva.servicosForaFaixa} item(ns) entraram na auditoria de preco/repasse.`,
        impacto: valorOsDisponivel
          ? "Esses pontos podem distorcer margem, ticket medio e previsao."
          : "Esses pontos podem distorcer honorario medio e previsao deste modelo agregado.",
        recomendacao: "Validar cada item fora da faixa antes de fechar a meta do proximo periodo.",
      },
      {
        tema: "Proximo passo",
        padrao: `${analisePreditiva.servicoOportunidade?.servico || totais.servicoLider.servico} e o melhor ponto de partida comercial.`,
        impacto: "Concentrar acao no servico mais forte reduz dispersao e melhora previsibilidade.",
        recomendacao: leituraDinamica.meta,
      },
    ];
  }, [analisePreditiva, leituraDinamica, planoCompetencia, relatorioUpload, totais, valorOsDisponivel]);

  const mixServicosPizza = useMemo(() => {
    const total = dadosAtuais.servicos.reduce((acc, servico) => acc + servico.honorarios2026, 0);
    if (!total) return [];

    return dadosAtuais.servicos.slice(0, 6).map((servico, index) => ({
      nome: servico.servico,
      codigo: servico.codigo,
      valor: servico.honorarios2026,
      percentual: servico.honorarios2026 / total,
      cor: coresGrafico[index % coresGrafico.length],
    }));
  }, [dadosAtuais.servicos]);

  const comparativoGrafico = useMemo(() => {
    return dadosAtuais.comparativo.map((item, index) => {
      const semBaseMensal = comparacaoMensal && index === 0;

      return {
        ...item,
        qtd2025: semBaseMensal ? null : item.qtd2025,
        os2025: semBaseMensal ? null : item.os2025,
        honorarios2025: semBaseMensal ? null : item.honorarios2025,
        ticket2025: semBaseMensal ? null : item.ticket2025,
        honorarioMedioAnterior: semBaseMensal || !item.qtd2025 ? null : item.honorarios2025 / item.qtd2025,
        honorarioMedioAtual: item.qtd2026 ? item.honorarios2026 / item.qtd2026 : null,
      };
    });
  }, [comparacaoMensal, dadosAtuais.comparativo]);

  const comparacaoOrganica = useMemo(() => {
    const usarPeriodosMensais = dadosAtuais.comparacao?.tipo === "mes";
    const criarPasso = (anterior: PeriodoComparado, atual: PeriodoComparado): PassoComparacao => {
      return {
        anterior,
        atual,
        diferencaQuantidade: atual.quantidade - anterior.quantidade,
        variacaoQuantidade: pct(atual.quantidade, anterior.quantidade),
        diferencaHonorarios: atual.honorarios - anterior.honorarios,
        variacaoHonorarios: pct(atual.honorarios, anterior.honorarios),
        diferencaValorOs: atual.valorOs - anterior.valorOs,
        variacaoValorOs: pct(atual.valorOs, anterior.valorOs),
        diferencaHonorarioMedio: atual.honorarioMedio - anterior.honorarioMedio,
        variacaoHonorarioMedio: pct(atual.honorarioMedio, anterior.honorarioMedio),
      };
    };
    const passosMensais = periodosAnalisados.slice(1).map((atual, index) =>
      criarPasso(periodosAnalisados[index], atual)
    );
    const passosAnuais = dadosAtuais.comparativo
      .filter((item) => item.qtd2025 || item.qtd2026 || item.honorarios2025 || item.honorarios2026)
      .map((item) =>
        criarPasso(
          {
            label: `${item.mes} ${dadosAtuais.anos.anterior}`,
            quantidade: item.qtd2025,
            valorOs: item.os2025,
            honorarios: item.honorarios2025,
            honorarioMedio: item.qtd2025 ? item.honorarios2025 / item.qtd2025 : 0,
          },
          {
            label: `${item.mes} ${dadosAtuais.anos.atual}`,
            quantidade: item.qtd2026,
            valorOs: item.os2026,
            honorarios: item.honorarios2026,
            honorarioMedio: item.qtd2026 ? item.honorarios2026 / item.qtd2026 : 0,
          }
        )
      );
    const passos = comparacaoSuficiente ? (usarPeriodosMensais ? passosMensais : passosAnuais) : [];
    const primeiroMensal = periodosAnalisados[0];
    const ultimoMensal = periodosAnalisados[periodosAnalisados.length - 1];
    const honorariosResumo = pegarIndicador(dadosAtuais.resumo, "Honorarios totais");
    const quantidadeResumo = pegarIndicador(dadosAtuais.resumo, "Quantidade total");
    const valorOsResumo = pegarIndicador(dadosAtuais.resumo, "Valor O.S. total");
    const primeiroAnual: PeriodoComparado = {
      label: dadosAtuais.comparacao?.anteriorLabel || String(dadosAtuais.anos.anterior),
      quantidade: quantidadeResumo?.valor2025 || 0,
      valorOs: valorOsResumo?.valor2025 || 0,
      honorarios: honorariosResumo?.valor2025 || 0,
      honorarioMedio: quantidadeResumo?.valor2025 ? (honorariosResumo?.valor2025 || 0) / quantidadeResumo.valor2025 : 0,
    };
    const ultimoAnual: PeriodoComparado = {
      label: dadosAtuais.comparacao?.atualLabel || String(dadosAtuais.anos.atual),
      quantidade: quantidadeResumo?.valor2026 || 0,
      valorOs: valorOsResumo?.valor2026 || 0,
      honorarios: honorariosResumo?.valor2026 || 0,
      honorarioMedio: quantidadeResumo?.valor2026 ? (honorariosResumo?.valor2026 || 0) / quantidadeResumo.valor2026 : 0,
    };
    const primeiro = usarPeriodosMensais ? primeiroMensal : primeiroAnual;
    const ultimo = usarPeriodosMensais ? ultimoMensal : ultimoAnual;
    const servicos = comparacaoSuficiente
      ? dadosAtuais.servicos
          .map<ServicoComparado>((servico) => ({
            ...servico,
            diferencaQuantidade: servico.qtd2026 - servico.qtd2025,
            diferencaHonorarios: servico.honorarios2026 - servico.honorarios2025,
          }))
          .filter((servico) => servico.qtd2025 || servico.qtd2026 || servico.honorarios2025 || servico.honorarios2026)
      : [];
    const servicosHistorico = comparacaoSuficiente
      ? (dadosAtuais.servicosPorPeriodo || [])
          .map<ServicoHistoricoComparacao>((servico) => {
            const inicial = servico.periodos[0];
            const final = servico.periodos[servico.periodos.length - 1];

            return {
              ...servico,
              diferencaQuantidade: (final?.quantidade || 0) - (inicial?.quantidade || 0),
              diferencaHonorarios: (final?.honorarios || 0) - (inicial?.honorarios || 0),
              variacaoHonorarios: pct(final?.honorarios || 0, inicial?.honorarios || 0),
            };
          })
          .sort((a, b) =>
            passos.length
              ? Math.abs(b.diferencaHonorarios) - Math.abs(a.diferencaHonorarios) || b.totalHonorarios - a.totalHonorarios
              : b.totalHonorarios - a.totalHonorarios
          )
      : [];

    return {
      primeiro,
      ultimo,
      periodosImportados,
      fechamento:
        primeiro && ultimo
          ? {
              diferencaQuantidade: ultimo.quantidade - primeiro.quantidade,
              variacaoQuantidade: pct(ultimo.quantidade, primeiro.quantidade),
              diferencaHonorarios: ultimo.honorarios - primeiro.honorarios,
              variacaoHonorarios: pct(ultimo.honorarios, primeiro.honorarios),
              diferencaValorOs: ultimo.valorOs - primeiro.valorOs,
              variacaoValorOs: pct(ultimo.valorOs, primeiro.valorOs),
              diferencaHonorarioMedio: ultimo.honorarioMedio - primeiro.honorarioMedio,
              variacaoHonorarioMedio: pct(ultimo.honorarioMedio, primeiro.honorarioMedio),
            }
          : null,
      passos,
      ganhos: [...servicos]
        .filter((servico) => servico.diferencaHonorarios > 0)
        .sort((a, b) => b.diferencaHonorarios - a.diferencaHonorarios)
        .slice(0, 6),
      perdas: [...servicos]
        .filter((servico) => servico.diferencaHonorarios < 0)
        .sort((a, b) => a.diferencaHonorarios - b.diferencaHonorarios)
        .slice(0, 6),
      servicos: [...servicos]
        .sort((a, b) => Math.abs(b.diferencaHonorarios) - Math.abs(a.diferencaHonorarios))
        .slice(0, 12),
      servicosHistorico,
    };
  }, [comparacaoSuficiente, dadosAtuais, periodosAnalisados, periodosImportados]);

  const estrategiaMeta30 = useMemo(() => {
    if (!comparacaoSuficiente || !planoCompetencia) return null;

    const alvo = planoCompetencia.meta;
    const falta = planoCompetencia.gap;
    const progresso = limitarScore(planoCompetencia.emAndamento ? planoCompetencia.progresso : planoCompetencia.progressoProjetado);
    const diferencaQuantidade = (comparacaoOrganica.ultimo?.quantidade || 0) - (comparacaoOrganica.primeiro?.quantidade || 0);
    const diferencaMedia = (comparacaoOrganica.ultimo?.honorarioMedio || 0) - (comparacaoOrganica.primeiro?.honorarioMedio || 0);
    const servicoQueda = comparacaoOrganica.perdas[0];
    const servicoGanho = comparacaoOrganica.ganhos[0];
    const status = planoCompetencia.status;
    const foco = falta <= 0
      ? "Meta batida: proteger o mix vencedor e repetir a rotina do periodo atual."
      : diferencaQuantidade < 0
        ? `Recuperar volume: faltam ${numero.format(Math.abs(diferencaQuantidade))} O.S. contra a base e ${moeda.format(falta)} para bater +30%.`
        : diferencaMedia < 0
          ? `Aumentar honorario medio: o volume nao e o gargalo principal; faltam ${moeda.format(falta)} em margem.`
          : `Escalar o que ja funcionou: faltam ${moeda.format(falta)} para transformar o ganho atual em +30%.`;
    const acao = falta <= 0
      ? `Manter preco e agenda nos servicos fortes, especialmente ${servicoGanho?.servico || totais.servicoLider.servico}.`
      : servicoQueda
        ? `Priorize recuperar ${servicoQueda.servico}, que explica ${moeda.format(Math.abs(servicoQueda.diferencaHonorarios))} de queda.`
        : `Concentre oferta no servico lider: ${servicoGanho?.servico || totais.servicoLider.servico}.`;
    const tarefas = [
      falta > 0
        ? `Fechar ${moeda.format(falta)} adicionais antes do proximo fechamento.`
        : "Registrar o padrao que bateu a meta e repetir no proximo ciclo.",
      servicoQueda
        ? `Recuperar ${servicoQueda.servico} com abordagem ativa nos clientes que cairam.`
        : `Proteger ${servicoGanho?.servico || totais.servicoLider.servico} como servico principal da meta.`,
      diferencaMedia < 0
        ? "Revisar descontos e honorario medio antes de buscar mais volume."
        : "Manter tabela e priorizar volume sem reduzir honorario medio.",
      "Acompanhar diariamente realizado x meta e corrigir rota antes do fechamento.",
    ];

    return {
      alvo,
      falta,
      progresso,
      status,
      foco,
      acao,
      tarefas,
      baseLabel: planoCompetencia.origemMeta,
      atualLabel: planoCompetencia.label,
    };
  }, [comparacaoOrganica, comparacaoSuficiente, planoCompetencia, totais.servicoLider.servico]);

  const diagnosticoGanhos = useMemo(() => {
    const piorServico = [...dadosAtuais.servicos]
      .filter((servico) => servico.crescimento !== null)
      .sort((a, b) => (a.crescimento || 0) - (b.crescimento || 0))[0];
    const melhorServico = [...dadosAtuais.servicos]
      .filter((servico) => servico.crescimento !== null)
      .sort((a, b) => (b.crescimento || 0) - (a.crescimento || 0))[0];

    return [
      {
        titulo: "Leitura do periodo",
        valor: leituraDinamica.periodoDocumentoTexto,
        detalhe: "Todos os documentos anexados entram no consolidado; o fechamento compara o primeiro contra o ultimo.",
      },
      {
        titulo: "Servico que mais subiu",
        valor: melhorServico?.servico || "-",
        detalhe: melhorServico?.crescimento !== null && melhorServico
          ? `${formatarPercentual(melhorServico.crescimento)} contra o periodo anterior.`
          : "Sem historico anterior suficiente para comparar.",
      },
      {
        titulo: "Servico que exige atencao",
        valor: piorServico?.servico || "-",
        detalhe: piorServico?.crescimento !== null && piorServico
          ? `${formatarPercentual(piorServico.crescimento)} contra o periodo anterior.`
          : "Sem queda identificada nos servicos comparaveis.",
      },
      {
        titulo: "Previsao",
        valor: moeda.format(analisePreditiva.previsaoProximo),
        detalhe: `Risco ${analisePreditiva.risco.toLowerCase()} se a media da tendencia continuar.`,
      },
    ];
  }, [analisePreditiva, dadosAtuais.servicos, leituraDinamica]);

  const mapaAreas = useMemo(() => {
    if (!relatorioUpload) return [];

    return [
      {
        area: "Resumo",
        mostra: valorOsDisponivel
          ? "Totais dos documentos enviados: quantidade, O.S., honorarios e medias."
          : "Totais do PDF: Total de O.S., honorarios e honorario medio por O.S.",
        calculo: valorOsDisponivel
          ? "Soma todas as linhas lidas nos PDFs/imagens e calcula medias por quantidade."
          : "Soma Total de O.S. e honorarios do PDF e calcula honorario medio por O.S.",
        motivo: "Serve para conferir se o volume importado bate com o esperado antes de analisar queda ou ganho.",
      },
      {
        area: "Leitura executiva",
        mostra: `Periodo analisado: ${leituraDinamica.periodoDocumentoTexto}.`,
        calculo: comparacaoMensal
          ? "Le todos os meses enviados em sequencia e tambem calcula o fechamento do primeiro para o ultimo."
          : "Compara os documentos de anos diferentes como ano contra ano.",
        motivo: leituraDinamica.alerta,
      },
      {
        area: "Validacao das contas",
        mostra: valorOsDisponivel
          ? `Abertura do fechamento ${leituraDinamica.fechamentoTexto}: honorarios, O.S., quantidade e meta de +30%.`
          : `Abertura do fechamento ${leituraDinamica.fechamentoTexto}: honorarios, quantidade e meta de +30%.`,
        calculo: "Usa a formula: (atual - anterior) / anterior, mostrando tambem a diferenca em valor.",
        motivo: valorOsDisponivel
          ? "Deixa claro se o resultado veio de menos processos, ticket menor ou queda no honorario medio."
          : "Deixa claro se o resultado veio de menos processos ou queda no honorario medio.",
      },
      {
        area: "Estrategia",
        mostra: "Momentum, volatilidade, drawdown, cenarios calculados e alocacao de foco para o proximo movimento.",
        calculo: "Combina crescimentos sequenciais, pior queda, pontos de auditoria e meta do proximo periodo.",
        motivo: "Tira o relatorio do modo passivo e mostra onde acelerar, proteger ou intervir.",
      },
      {
        area: "Ganhos",
        mostra: "Grafico comparando cada periodo com seu periodo anterior.",
        calculo: "Para meses do mesmo ano, cada mes e comparado com o mes anterior; para anos diferentes, compara o mesmo mes entre anos.",
        motivo: `O melhor mes foi ${totais.melhorMes.mes}, com ${moeda.format(totais.melhorMes.honorarios2026)}.`,
      },
      {
        area: "Servicos",
        mostra: "Quais servicos puxaram receita, volume, honorario medio e crescimento.",
        calculo: "Agrupa as linhas por codigo/servico e compara o servico no periodo atual contra o anterior.",
        motivo: `O servico lider foi ${totais.servicoLider.servico}; ele mostra onde o ganho esta concentrado.`,
      },
      {
        area: "Metas",
        mostra: "Acoes praticas para recuperar queda, proteger receita e buscar +30%.",
        calculo: "Cruza tendencia, queda por servico, auditoria e alvo calculado para o proximo periodo.",
        motivo: `Alvo atual sugerido: ${moeda.format(totais.metaProximoPeriodo)} em honorarios.`,
      },
      {
        area: "Auditoria",
        mostra: valorOsDisponivel
          ? "Pontos com honorario muito alto sobre O.S. ou media baixa demais."
          : "Pontos com honorario medio baixo; checagem honorario/valor O.S. fica bloqueada neste modelo.",
        calculo: valorOsDisponivel
          ? "Marca itens fora da faixa quando honorario/O.S. passa de 75% ou quando a media fica muito baixa com volume relevante."
          : "Marca itens fora da faixa somente pela media de honorarios, usando os campos que existem no arquivo.",
        motivo: valorOsDisponivel
          ? `${analisePreditiva.servicosForaFaixa} ponto(s) precisam de revisao para evitar distorcao de margem.`
          : `${analisePreditiva.servicosForaFaixa} ponto(s) precisam de revisao sem inventar valor de O.S.`,
      },
      {
        area: "Previsao",
        mostra: "Risco de queda/colapso e proximo valor estimado se a tendencia continuar.",
        calculo: "Usa a media dos crescimentos sequenciais dos periodos enviados.",
        motivo: `Risco ${analisePreditiva.risco}; previsao de ${moeda.format(analisePreditiva.previsaoProximo)}.`,
      },
    ];
  }, [analisePreditiva, comparacaoMensal, leituraDinamica, relatorioUpload, totais, valorOsDisponivel]);

  const imprimirAba = (aba: Aba) => {
    setEscopoImpressao(aba);
  };

  const copiarTexto = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setFraseCopiada(id);
      window.setTimeout(() => {
        setFraseCopiada((atual) => (atual === id ? "" : atual));
      }, 1300);
    } catch {
      setFraseCopiada("");
    }
  };

  const abrirSeletorArquivo = (ref: React.RefObject<HTMLInputElement | null>, id: string) => {
    const input = ref.current || (document.getElementById(id) as HTMLInputElement | null);
    input?.click();
  };

  const botaoImprimirAba = (aba: Aba) => (
    <div className={styles.tabPrintBar}>
      <button type="button" className={styles.tabPrintButton} onClick={() => imprimirAba(aba)}>
        <Printer size={17} />
        <span>Imprimir esta aba</span>
      </button>
    </div>
  );

  return (
      <main className={styles.page} data-print-scope={escopoImpressao || undefined}>
        <nav className={styles.modeTabs} aria-label="Modos da pagina de analise">
          <button type="button" className={modoAnalise === "honorarios" ? styles.modeActive : ""} onClick={() => setModoAnalise("honorarios")}>
            <BarChart3 size={19} />
            <span>Honorarios</span>
          </button>
          <button type="button" className={modoAnalise === "dados-locais" ? styles.modeActive : ""} onClick={() => setModoAnalise("dados-locais")}>
            <Database size={19} />
            <span>Dados locais</span>
          </button>
          <div className={styles.sidebarDocumentCard}>
            <strong>Documentos da analise</strong>
            {relatorioUpload && <small>Usando: {relatorioUpload.arquivos.join(", ")}</small>}
            {statusUpload && <small className={styles.uploadOk}>{statusUpload}</small>}
            {erroUpload && <small className={styles.uploadError}>{erroUpload}</small>}
            <input
              id="analise-arquivos-input"
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className={styles.fileInput}
              onChange={handleArquivos}
            />
            <input
              id="analise-lote-input"
              ref={(node) => {
                loteInputRef.current = node;
                node?.setAttribute("webkitdirectory", "");
              }}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className={styles.fileInput}
              onChange={handleLoteArquivos}
            />
            <button className={styles.printButton} type="button" onClick={() => window.print()}>
              <Printer size={17} />
              <span>Imprimir relatorio</span>
            </button>
            <button
              type="button"
              className={styles.attachButton}
              onClick={() => abrirSeletorArquivo(inputRef, "analise-arquivos-input")}
              disabled={processando}
            >
              {processando ? "Processando..." : "Anexar arquivos"}
            </button>
            <button
              type="button"
              className={styles.batchButton}
              onClick={() => abrirSeletorArquivo(loteInputRef, "analise-lote-input")}
              disabled={processando}
            >
              <Layers size={17} />
              {processando ? "Processando lote..." : "Anexar pasta/lote"}
            </button>
            {relatorioUpload && (
              <button type="button" className={styles.secondaryButton} onClick={handleLimparAnalise} disabled={processando}>
                Limpar analise
              </button>
            )}
          </div>
        </nav>

        {modoAnalise === "dados-locais" && (
          <DadosLocaisConteudo
            dados={dadosLocais}
            carregando={carregandoDadosLocais}
            erro={erroDadosLocais}
            filtro={filtroDadosLocais}
            onFiltroChange={(filtro) => {
              setErroDadosLocais("");
              setDadosLocais(null);
              setFiltroDadosLocais(filtro);
            }}
          />
        )}

        <div className={modoAnalise === "honorarios" ? "" : styles.modeHidden}>
        <section className={`${styles.topPanel} ${relatorioUpload ? "" : styles.topPanelEmpty}`}>
          <div className={styles.topIntro}>
            <h1>Analise de ganhos e metas</h1>
            <p>
              Comparativo profissional de honorarios por mes ou por ano, com leitura de crescimento,
              servicos que puxam resultado, alertas de preco e metas de acompanhamento.
            </p>
          </div>
          {relatorioUpload && (
            <div className={styles.topMetric}>
              <span>{leituraDinamica.periodoDocumentoTexto}</span>
              <strong>
                {comparacaoSuficiente
                  ? moeda.format(totais.ganhoIncremental)
                  : periodoUnico
                  ? moeda.format(totais.honorariosAtualComparacao)
                  : `${mesesBaseComparacao}/${MIN_PERIODOS_COMPARACAO}`}
              </strong>
              <small>{leituraDinamica.resultadoLabel} no fechamento {leituraDinamica.fechamentoTexto}</small>
            </div>
          )}
        </section>

        {!relatorioUpload && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <ClipboardList size={20} />
              <h2>Aguardando documentos</h2>
            </div>
            <p>
              Anexe PDFs fonte, PDFs de diferenca mes ou imagens para gerar resumo, graficos, metas, auditoria, previsao e proximos passos com base nos documentos enviados.
            </p>
          </section>
        )}

        {relatorioUpload && (
          <>
        <section className={styles.serviceFilterPanel}>
          <div className={styles.serviceSelectWrap}>
            <span>Recorte temporal</span>
            <div className={styles.periodButtonGroup} role="group" aria-label="Recorte temporal">
              {recortesTemporais.map((recorte) => (
                <button
                  type="button"
                  key={recorte.key}
                  className={recorte.key === recorteSelecionadoAtivo ? styles.periodButtonActive : ""}
                  aria-pressed={recorte.key === recorteSelecionadoAtivo}
                  disabled={recortesTemporais.length <= 1}
                  onClick={() => {
                    setRecorteSelecionado(recorte.key);
                    setAbaAtiva("comparacao");
                    setMapaAberto(false);
                    setCenarioAtivo("base");
                  }}
                >
                  <strong>{recorte.label}</strong>
                  <small>{recorte.tipo === "todos" ? "Visao completa" : recorte.detalhe}</small>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.serviceButtonWrap}>
            <div className={styles.serviceButtonHeader}>
              <span>
                {servicosSelecionadosAtivos.length
                  ? `${servicosSelecionadosAtivos.length} servico(s) selecionado(s)`
                  : "Todos os servicos ativos"}
              </span>
              <button
                type="button"
                onClick={limparFiltroServicos}
                disabled={!servicosSelecionadosAtivos.length}
              >
                {servicosSelecionadosAtivos.length ? "Limpar" : "Todos"}
              </button>
            </div>
            <label className={styles.serviceSearchWrap}>
              <span>Buscar por codigo ou nome</span>
              <div className={styles.serviceSearchBox}>
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={buscaServicoFiltro}
                  onChange={(event) => setBuscaServicoFiltro(event.target.value)}
                  placeholder="Ex.: transferencia, boleto, 94"
                  aria-label="Buscar servico"
                />
              </div>
            </label>
            {servicosFiltrados.length > 0 && (
              <div className={styles.serviceSelectedChips} aria-label="Servicos selecionados">
                {servicosFiltrados.slice(0, 5).map((servico) => {
                  const chave = chaveServico(servico);
                  return (
                    <button
                      type="button"
                      key={chave}
                      onClick={() => alternarFiltroServico(chave)}
                      title={`Remover ${servico.servico}`}
                    >
                      <span>{servico.codigo}</span>
                      {limitarTexto(servico.servico, 24)}
                      <strong>x</strong>
                    </button>
                  );
                })}
                {servicosFiltrados.length > 5 && (
                  <small>+{servicosFiltrados.length - 5} selecionado(s)</small>
                )}
              </div>
            )}
            <div className={styles.serviceButtons} role="group" aria-label="Selecionar um ou mais servicos">
              {servicosFiltroVisiveis.map((servico) => {
                const chave = chaveServico(servico);
                const ativo = servicosSelecionadosAtivos.includes(chave);
                return (
                  <button
                    type="button"
                    key={chave}
                    className={ativo ? styles.serviceButtonActive : ""}
                    aria-pressed={ativo}
                    onClick={() => alternarFiltroServico(chave)}
                  >
                    <strong>{servico.servico}</strong>
                    <span>{servico.codigo}</span>
                  </button>
                );
              })}
            </div>
            {!!termoBuscaServico && servicosFiltroEncontrados.length === 0 && (
              <small className={styles.serviceFilterHint}>Nenhum servico encontrado nessa busca.</small>
            )}
            {!termoBuscaServico && servicosFiltro.length > servicosFiltroVisiveis.length && (
              <small className={styles.serviceFilterHint}>
                Mostrando os mais acessiveis primeiro. Use a busca para achar qualquer servico.
              </small>
            )}
            {!servicosFiltro.length && <small className={styles.serviceFilterHint}>Sem servicos detalhados.</small>}
          </div>
        </section>

        {planoCompetencia && (
          <section className={`${styles.monthlyStatusPanel} ${statusClasse(planoCompetencia.status)}`}>
            <div>
              <span>Competencia inteligente</span>
              <strong>{planoCompetencia.label}</strong>
              <small>
                {planoCompetencia.emAndamento
                  ? `Em andamento: ${planoCompetencia.diasCobertos}/${planoCompetencia.diasNoMes} dias reconhecidos.`
                  : "Proxima competencia calculada somente com meses fechados."}
              </small>
            </div>
            <div>
              <span>Meta +30%</span>
              <strong>{moeda.format(planoCompetencia.meta)}</strong>
              <small>{planoCompetencia.origemMeta}</small>
            </div>
            <div>
              <span>{planoCompetencia.emAndamento ? "Realizado / projecao" : "Projecao base"}</span>
              <strong>
                {planoCompetencia.emAndamento
                  ? `${moeda.format(planoCompetencia.realizado)} / ${moeda.format(planoCompetencia.projecao)}`
                  : moeda.format(planoCompetencia.projecao)}
              </strong>
              <small>{planoCompetencia.statusLabel}</small>
            </div>
          </section>
        )}

        <nav className={styles.tabs} aria-label="Abas da analise">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              className={`${styles.tabButton} ${abaAtiva === aba.id ? styles.tabActive : ""}`}
              onClick={() => setAbaAtiva(aba.id)}
            >
              {aba.icon}
              <span>{aba.label}</span>
            </button>
          ))}
        </nav>

        <div className={`${styles.tabContent} ${abaAtiva === "resumo" ? styles.tabVisible : ""}`} data-tab="resumo">
          <section className={styles.sectionStack} data-print-section="Resumo">
            {botaoImprimirAba("resumo")}
            <div className={`${styles.metricGrid} ${valorOsDisponivel ? "" : styles.metricGridCompact}`}>
              {resumoVisivel.map((item) => (
                <article className={styles.metricCard} key={item.indicador}>
                  <span>{!valorOsDisponivel && item.indicador === "Quantidade total" ? "Total de O.S." : item.indicador}</span>
                  <strong>{formatarValor(item.valor2026, item.tipo)}</strong>
                  <div>
                    {comparacaoMensal ? (
                      <small>{!valorOsDisponivel && item.indicador === "Quantidade total" ? "Volume identificado nos meses do PDF" : `Total dos ${periodosAnalisados.length} meses enviados`}</small>
                    ) : (
                      <>
                        <small>{dadosAtuais.comparacao?.anteriorLabel}: {formatarValor(item.valor2025, item.tipo)}</small>
                        <em className={item.variacao >= 0 ? styles.positive : styles.negative}>
                          {formatarPercentual(item.variacao)}
                        </em>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {!valorOsDisponivel && (
              <article className={styles.modelNotice}>
                <div className={styles.panelHeader}>
                  <ClipboardList size={20} />
                  <h2>Modelo diferenca mes identificado</h2>
                </div>
                <p>
                  Este PDF trouxe Total de O.S., totais de honorarios e grupos de servicos para os periodos comparados.
                  A analise usa esses valores reais e troca o ticket financeiro por honorario medio por O.S.
                </p>
              </article>
            )}

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <ShieldCheck size={20} />
                <h2>Qualidade da leitura</h2>
              </div>
              <p>
                Confere cobertura, corte dos anexos e risco de consolidacao antes de confiar em previsao, meta e auditoria.
              </p>
              <div className={styles.qualityGrid}>
                {qualidadeLeitura.checagens.map((checagem) => (
                  <div className={statusClasse(checagem.status)} key={checagem.titulo}>
                    <span>{checagem.titulo}</span>
                    <strong>{checagem.valor}</strong>
                    <small>{checagem.detalhe}</small>
                  </div>
                ))}
              </div>
              {(qualidadeLeitura.arquivosFalhos.length > 0 ||
                qualidadeLeitura.periodosSobrepostos.length > 0 ||
                qualidadeLeitura.cortesDivergentes ||
                qualidadeLeitura.intervalosForaCompetencia.length > 0) && (
                <div className={styles.qualityAlerts}>
                  {qualidadeLeitura.arquivosFalhos.length > 0 && (
                    <p>
                      Anexo sem leitura: {qualidadeLeitura.arquivosFalhos.map((item) => item.arquivo).join(", ")}.
                    </p>
                  )}
                  {qualidadeLeitura.periodosSobrepostos.map((periodo) => (
                    <p key={`sobreposicao-${periodo.label}`}>
                      {periodo.label} recebeu {periodo.arquivos?.length || 0} anexos e foi somado: {(periodo.arquivos || []).join(", ")}.
                    </p>
                  ))}
                  {qualidadeLeitura.cortesDivergentes && (
                    <p>
                      Cortes diferentes foram reconhecidos ({qualidadeLeitura.cortesReconhecidos.join(" / ")}). Compare periodos com o mesmo intervalo de dias antes de fechar tendencia.
                    </p>
                  )}
                  {qualidadeLeitura.intervalosForaCompetencia.map(({ periodo, intervalo }) => (
                    <p key={`intervalo-fora-${periodo.label}-${intervalo.label}`}>
                      {periodo.label} veio com intervalo {intervalo.label}; confirme se o PDF deve atravessar outra competencia.
                    </p>
                  ))}
                </div>
              )}
            </article>

            {radarDecisor && (
              <article className={`${styles.radarPanel} ${statusClasse(radarDecisor.statusGeral)}`}>
                <div className={styles.radarHero}>
                  <div
                    className={styles.scoreRing}
                    style={{ "--score": `${radarDecisor.scoreSaude}%` } as React.CSSProperties}
                    aria-label={`Score de saude da receita ${radarDecisor.scoreSaude} de 100`}
                  >
                    <span>{radarDecisor.scoreSaude}</span>
                    <small>{radarDecisor.nivel}</small>
                  </div>
                  <div className={styles.radarCopy}>
                    <div className={styles.panelHeader}>
                      <Sparkles size={20} />
                      <h2>Radar decisor</h2>
                    </div>
                    <p>{radarDecisor.decisaoAgora}</p>
                    <strong>Causa provavel: {radarDecisor.causaPrincipal}.</strong>
                  </div>
                  <div className={styles.radarConfidence}>
                    <ShieldCheck size={20} />
                    <span>Confianca dos dados</span>
                    <strong>{radarDecisor.confiancaDados}/100</strong>
                    <small>Leitura automatica por linhas, campos, anexos e cortes reconhecidos.</small>
                  </div>
                </div>

                <div className={styles.signalGrid}>
                  {radarDecisor.sinais.map((sinal) => (
                    <div className={statusClasse(sinal.status)} key={sinal.titulo}>
                      <span>{sinal.titulo}</span>
                      <strong>{sinal.valor}</strong>
                      <small>{sinal.detalhe}</small>
                    </div>
                  ))}
                </div>

                <div className={styles.decisionLayout}>
                  <div className={styles.actionStack}>
                    <div className={styles.panelHeader}>
                      <Target size={20} />
                      <h2>Proximas acoes</h2>
                    </div>
                    {radarDecisor.acoes.map((acao) => (
                      <div className={styles.actionRow} key={acao.prioridade}>
                        <span>{acao.prioridade}</span>
                        <div>
                          <strong>{acao.titulo}</strong>
                          <p>{acao.detalhe}</p>
                          <small>{acao.motivo}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.factorStack}>
                    <div className={styles.panelHeader}>
                      <Gauge size={20} />
                      <h2>Causas provaveis</h2>
                    </div>
                    {radarDecisor.fatores.map((fator) => (
                      <div className={`${styles.factorRow} ${statusClasse(fator.status)}`} key={fator.fator}>
                        <span>{fator.fator}</span>
                        <strong>{fator.leitura}</strong>
                        <small>{fator.impacto}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.matrixHeader}>
                  <Layers size={20} />
                  <h2>Matriz de decisao</h2>
                </div>
                <div className={styles.matrixGrid}>
                  {radarDecisor.matriz.map((item) => (
                    <div className={statusClasse(item.status)} key={item.eixo}>
                      <span>{item.eixo}</span>
                      <strong>{item.agora}</strong>
                      <small>{item.proximo}</small>
                    </div>
                  ))}
                </div>
              </article>
            )}

            <article className={styles.panel}>
              <div className={styles.expandableHeader}>
                <div className={styles.panelHeader}>
                  <ClipboardList size={20} />
                  <h2>Mapa simples da analise</h2>
                </div>
                <button
                  type="button"
                  className={styles.expandButton}
                  aria-expanded={mapaAberto}
                  aria-controls="mapa-analise"
                  title={mapaAberto ? "Recolher mapa" : "Expandir mapa"}
                  onClick={() => setMapaAberto((aberto) => !aberto)}
                >
                  <ChevronDown className={mapaAberto ? styles.expandIconOpen : ""} size={20} />
                </button>
              </div>
              <p>
                Mapa resumido das areas calculadas no relatorio, com detalhes recolhidos para manter a leitura rapida.
              </p>
              {!mapaAberto && (
                <div className={styles.mapPreview}>
                  <span>Resumo</span>
                  <span>Estrategia</span>
                  <span>Ganhos</span>
                  <span>Servicos</span>
                  <span>Metas</span>
                </div>
              )}
              {mapaAberto && (
                <div className={styles.areaMapGrid} id="mapa-analise">
                  {mapaAreas.map((item) => (
                    <div className={styles.areaMapCard} key={item.area}>
                      <span>{item.area}</span>
                      <strong>O que mostra</strong>
                      <p>{item.mostra}</p>
                      <strong>Como calcula</strong>
                      <p>{item.calculo}</p>
                      <strong>Por que deu isso</strong>
                      <p>{item.motivo}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <div className={styles.twoColumns}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <TrendingUp size={20} />
                  <h2>Arquitetura da analise</h2>
                </div>
                <p>Mostra a ordem que o sistema segue para transformar documentos em diagnostico.</p>
                <div className={styles.architecture}>
                  {[
                    "Extrair PDFs",
                    "Consolidar periodos",
                    comparacaoSuficiente ? (comparacaoMensal ? "Comparar meses" : "Comparar anos") : periodoUnico ? "Ler periodo" : `Aguardar ${MIN_PERIODOS_COMPARACAO} periodos`,
                    "Ler mix",
                    "Definir metas",
                  ].map(
                    (step, index) => (
                      <div key={step}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{step}</strong>
                      </div>
                    )
                  )}
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <Target size={20} />
                  <h2>Leitura executiva</h2>
                </div>
                <p>Resume o resultado principal em linguagem de decisao: ganho, perda, alerta, meta e previsao.</p>
                <ul className={styles.insightList}>
                  <li>Documentos considerados: {leituraDinamica.periodoDocumentoTexto}.</li>
                  <li>Comparacao usada: {leituraDinamica.comparacaoTexto}.</li>
                  <li>
                    {comparacaoSuficiente
                      ? `Fechamento: ${leituraDinamica.fechamentoTexto}, com honorarios ${formatarPercentual(totais.crescimentoHonorarios)}.`
                      : periodoUnico
                      ? `Fechamento: base inicial ${leituraDinamica.fechamentoTexto}, sem inventar periodo anterior.`
                      : `Fechamento: aguardando ${MIN_PERIODOS_COMPARACAO} periodos; base atual ${mesesBaseComparacao}/${MIN_PERIODOS_COMPARACAO}.`}
                  </li>
                  <li>{leituraDinamica.acerto}</li>
                  <li>{leituraDinamica.alerta}</li>
                  <li>{leituraDinamica.meta}</li>
                  <li>{leituraDinamica.previsao}</li>
                </ul>
              </article>
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <CheckCircle2 size={20} />
                <h2>Validacao das contas do fechamento</h2>
              </div>
              <p>
                {comparacaoSuficiente
                  ? "Confere o primeiro periodo contra o ultimo. Para ver cada mes enviado, use o relatorio mes a mes logo abaixo."
                  : periodoUnico
                  ? "Com um periodo, a validacao mostra o retrato importado e aguarda outra competencia para calcular diferenca."
                  : `A validacao comparativa exige ${MIN_PERIODOS_COMPARACAO} periodos ou mais para nao forcar leitura com base curta.`}
              </p>
              {comparacaoSuficiente ? (
                <div className={styles.factGrid}>
                  {validacoes.map((item) => (
                    <div key={item.titulo}>
                      <span>{item.titulo}</span>
                      <strong className={item.indisponivel ? undefined : item.diferenca.startsWith("-") ? styles.negative : styles.positive}>
                        {item.percentual}
                      </strong>
                      <small>Anterior: {item.anterior}</small>
                      <small>Atual: {item.atual}</small>
                      <small>Diferenca: {item.diferenca}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.comparisonEmpty}>
                  <strong>{periodoUnico ? "Retrato validado." : "Contas aguardando base minima."}</strong>
                  <p>
                    {periodoUnico
                      ? "O periodo foi lido e consolidado. Com outra competencia, o app calcula diferenca, percentual e meta do fechamento."
                      : `Foram reconhecidos ${mesesBaseComparacao} periodo(s). Envie mais ${faltamPeriodosComparacao} competencia(s) para liberar diferenca, percentual e meta calculada no fechamento.`}
                  </p>
                </div>
              )}
            </article>

            {periodosAnalisados.length > 0 && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <LineChartIcon size={20} />
                  <h2>Relatorio mes a mes</h2>
                </div>
                <p>Mostra cada periodo importado, a meta de +30% e se o mes bateu ou ficou abaixo do alvo.</p>
                <div className={styles.monthGrid}>
                  {periodosAnalisados.map((periodo, index) => (
                    <div key={periodo.label} className={styles.monthCard}>
                      <span>{periodo.label}</span>
                      <strong>{moeda.format(periodo.honorarios)}</strong>
                      <small>Qtd.: {numero.format(periodo.quantidade)}</small>
                      {valorOsDisponivel ? (
                        <>
                          <small>O.S.: {moeda.format(periodo.valorOs)}</small>
                          <small>Ticket: {moeda.format(periodo.ticket)}</small>
                        </>
                      ) : (
                        <small>Honorario medio/O.S.: {moeda.format(periodo.honorarioMedio)}</small>
                      )}
                      {index === 0 ? (
                        <em>Base da comparacao</em>
                      ) : (
                        <>
                          <em className={periodo.atingiuMeta ? styles.positive : styles.negative}>
                            {formatarPercentual(periodo.crescimentoHonorarios)}
                          </em>
                          <small>Meta +30%: {moeda.format(periodo.meta30)}</small>
                          <small>{periodo.atingiuMeta ? "Meta alcancada" : "Meta nao alcancada"}</small>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            )}
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "comparacao" ? styles.tabVisible : ""}`} data-tab="comparacao">
          <section className={styles.sectionStack} data-print-section="Comparacao">
            {botaoImprimirAba("comparacao")}
            <article className={styles.comparisonHero}>
              <div>
                <span>Comparacao adaptativa</span>
                <h2>
                  {comparacaoSuficiente
                    ? "Diferenca dos periodos"
                    : comparacaoBloqueadaPorBase
                    ? "Base minima pendente"
                    : "Retrato do periodo"}
                </h2>
                <p>
                  {comparacaoSuficiente
                    ? "Fechamento, transicoes entre anexos e servicos que mudaram o resultado."
                    : comparacaoBloqueadaPorBase
                    ? `A comparacao exige ${MIN_PERIODOS_COMPARACAO} periodos ou mais; os periodos reconhecidos ficam listados abaixo.`
                    : "Com um periodo, o app mostra o retrato importado sem inventar uma base anterior."}
                </p>
              </div>

              {comparacaoOrganica.primeiro &&
              comparacaoOrganica.ultimo &&
              comparacaoOrganica.fechamento ? (
                <div className={styles.comparisonSummary}>
                  <div className={styles.comparisonRange}>
                    <strong>{comparacaoOrganica.primeiro.label}</strong>
                    {comparacaoOrganica.passos.length > 0 && (
                      <>
                        <ArrowLeftRight size={18} />
                        <strong>{comparacaoOrganica.ultimo.label}</strong>
                      </>
                    )}
                  </div>
                  <div className={styles.comparisonMetricGrid}>
                    <div>
                      <span>Honorarios</span>
                      <strong className={comparacaoOrganica.passos.length && comparacaoOrganica.fechamento.diferencaHonorarios < 0 ? styles.negative : styles.positive}>
                        {moeda.format(comparacaoOrganica.passos.length ? comparacaoOrganica.fechamento.diferencaHonorarios : comparacaoOrganica.ultimo.honorarios)}
                      </strong>
                      <small>{comparacaoOrganica.passos.length ? formatarPercentual(comparacaoOrganica.fechamento.variacaoHonorarios) : "Valor lido no anexo"}</small>
                    </div>
                    <div>
                      <span>{valorOsDisponivel ? "Quantidade" : "Total de O.S."}</span>
                      <strong className={comparacaoOrganica.passos.length && comparacaoOrganica.fechamento.diferencaQuantidade < 0 ? styles.negative : styles.positive}>
                        {numero.format(comparacaoOrganica.passos.length ? comparacaoOrganica.fechamento.diferencaQuantidade : comparacaoOrganica.ultimo.quantidade)}
                      </strong>
                      <small>{comparacaoOrganica.passos.length ? formatarPercentual(comparacaoOrganica.fechamento.variacaoQuantidade) : "Volume importado"}</small>
                    </div>
                    <div>
                      <span>{valorOsDisponivel ? "Valor O.S." : "Honorario medio/O.S."}</span>
                      <strong
                        className={
                          !comparacaoOrganica.passos.length ||
                          (valorOsDisponivel
                            ? comparacaoOrganica.fechamento.diferencaValorOs
                            : comparacaoOrganica.fechamento.diferencaHonorarioMedio) >= 0
                            ? styles.positive
                            : styles.negative
                        }
                      >
                        {moeda.format(
                          comparacaoOrganica.passos.length
                            ? valorOsDisponivel
                              ? comparacaoOrganica.fechamento.diferencaValorOs
                              : comparacaoOrganica.fechamento.diferencaHonorarioMedio
                            : valorOsDisponivel
                              ? comparacaoOrganica.ultimo.valorOs
                              : comparacaoOrganica.ultimo.honorarioMedio
                        )}
                      </strong>
                      <small>
                        {comparacaoOrganica.passos.length
                          ? formatarPercentual(
                              valorOsDisponivel
                                ? comparacaoOrganica.fechamento.variacaoValorOs
                                : comparacaoOrganica.fechamento.variacaoHonorarioMedio
                            )
                          : valorOsDisponivel
                            ? "Valor importado"
                            : "Media calculada"}
                      </small>
                    </div>
                  </div>
                </div>
              ) : comparacaoBloqueadaPorBase ? (
                <div className={styles.comparisonEmpty}>
                  <strong>Comparacao aguardando base minima.</strong>
                  <p>
                    Foram reconhecidos {mesesBaseComparacao} periodo(s). Envie mais {faltamPeriodosComparacao} competencia(s)
                    para liberar passos, fechamento, servicos que subiram/cairam e estrategia.
                  </p>
                </div>
              ) : (
                <div className={styles.comparisonEmpty}>
                  <strong>Nenhum periodo reconhecido.</strong>
                  <p>Revise o anexo para liberar o retrato e a comparacao detalhada.</p>
                </div>
              )}
            </article>

            {comparacaoOrganica.periodosImportados.length > 0 && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <LineChartIcon size={20} />
                  <h2>Periodos reconhecidos</h2>
                </div>
                <p>
                  {comparacaoBloqueadaPorBase
                    ? `${comparacaoOrganica.periodosImportados.length} periodo(s) entraram na leitura. A comparacao libera com ${MIN_PERIODOS_COMPARACAO} periodos ou mais.`
                    : `${comparacaoOrganica.periodosImportados.length} periodo(s) entraram na leitura. O fechamento resume o primeiro contra o ultimo; cada transicao disponivel aparece logo abaixo.`}
                </p>
                <div className={styles.comparisonPeriodRail}>
                  {comparacaoOrganica.periodosImportados.map((periodo, index) => (
                    <div key={`periodo-comparacao-${periodo.label}`}>
                      <span>{index === 0 ? "Inicio" : index === comparacaoOrganica.periodosImportados.length - 1 ? "Fim" : `Passagem ${index}`}</span>
                      <strong>{periodo.label}</strong>
                      <small>{moeda.format(periodo.honorarios)} honorarios</small>
                      <small>{numero.format(periodo.quantidade)} {valorOsDisponivel ? "processos" : "O.S."}</small>
                      <small>
                        Corte: {periodo.intervalos?.length ? periodo.intervalos.map((intervalo) => intervalo.label).join(" / ") : "nao informado"}
                      </small>
                      {!!periodo.arquivos?.length && <small>Fonte(s): {periodo.arquivos.join(", ")}</small>}
                    </div>
                  ))}
                </div>
              </article>
            )}

            {comparacaoTrimestral && (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <Layers size={20} />
                  <h2>Comparacao trimestral detalhada</h2>
                </div>
                <p>
                  Compara {comparacaoTrimestral.anterior.label} contra {comparacaoTrimestral.atual.label}, somando todos os meses de cada trimestre.
                  O recorte temporal acima continua funcionando para analisar um trimestre isolado.
                </p>
                <div className={styles.comparisonSummary}>
                  <div className={styles.comparisonRange}>
                    <strong>{comparacaoTrimestral.anterior.label}</strong>
                    <ArrowLeftRight size={18} />
                    <strong>{comparacaoTrimestral.atual.label}</strong>
                  </div>
                  <div className={styles.comparisonMetricGrid}>
                    <div>
                      <span>Honorarios</span>
                      <strong className={comparacaoTrimestral.passo.diferencaHonorarios >= 0 ? styles.positive : styles.negative}>
                        {moeda.format(comparacaoTrimestral.passo.diferencaHonorarios)}
                      </strong>
                      <small>{formatarPercentual(comparacaoTrimestral.passo.variacaoHonorarios)}</small>
                    </div>
                    <div>
                      <span>{valorOsDisponivel ? "Quantidade" : "Total de O.S."}</span>
                      <strong className={comparacaoTrimestral.passo.diferencaQuantidade >= 0 ? styles.positive : styles.negative}>
                        {numero.format(comparacaoTrimestral.passo.diferencaQuantidade)}
                      </strong>
                      <small>{formatarPercentual(comparacaoTrimestral.passo.variacaoQuantidade)}</small>
                    </div>
                    <div>
                      <span>{valorOsDisponivel ? "Valor O.S." : "Honorario medio/O.S."}</span>
                      <strong
                        className={
                          (valorOsDisponivel
                            ? comparacaoTrimestral.passo.diferencaValorOs
                            : comparacaoTrimestral.passo.diferencaHonorarioMedio) >= 0
                            ? styles.positive
                            : styles.negative
                        }
                      >
                        {moeda.format(
                          valorOsDisponivel
                            ? comparacaoTrimestral.passo.diferencaValorOs
                            : comparacaoTrimestral.passo.diferencaHonorarioMedio
                        )}
                      </strong>
                      <small>
                        {formatarPercentual(
                          valorOsDisponivel
                            ? comparacaoTrimestral.passo.variacaoValorOs
                            : comparacaoTrimestral.passo.variacaoHonorarioMedio
                        )}
                      </small>
                    </div>
                  </div>
                </div>

                <div className={styles.comparisonPeriodRail}>
                  {comparacaoTrimestral.grupos.map((grupo) => (
                    <div key={`grupo-trimestral-${grupo.key}`}>
                      <span>{grupo.label}</span>
                      <strong>{moeda.format(grupo.honorarios)}</strong>
                      <small>{numero.format(grupo.quantidade)} {valorOsDisponivel ? "processos" : "O.S."}</small>
                      <small>{grupo.periodos.map((periodo) => periodo.mes).join(" + ")}</small>
                    </div>
                  ))}
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Servico</th>
                        <th>{comparacaoTrimestral.anterior.label}</th>
                        <th>{comparacaoTrimestral.atual.label}</th>
                        <th>Dif. honorarios</th>
                        <th>Dif. O.S.</th>
                        <th>Variacao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparacaoTrimestral.servicos.map((servico) => (
                        <tr key={`trimestre-${servico.codigo}-${servico.servico}`}>
                          <td>
                            <strong>{servico.servico}</strong>
                            <span>Codigo {servico.codigo}</span>
                          </td>
                          <td>{moeda.format(servico.honorariosAnterior)}</td>
                          <td>{moeda.format(servico.honorariosAtual)}</td>
                          <td className={servico.diferencaHonorarios >= 0 ? styles.positive : styles.negative}>
                            {moeda.format(servico.diferencaHonorarios)}
                          </td>
                          <td className={servico.diferencaQuantidade >= 0 ? styles.positive : styles.negative}>
                            {numero.format(servico.diferencaQuantidade)}
                          </td>
                          <td className={(servico.variacaoHonorarios || 0) >= 0 ? styles.positive : styles.negative}>
                            {formatarPercentual(servico.variacaoHonorarios)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {estrategiaMeta30 && (
              <article className={`${styles.metaStrategyCard} ${statusClasse(estrategiaMeta30.status)}`}>
                <div>
                  <span>Meta heuristica +30%</span>
                  <h2 className={styles.metaMoneyValue}>{moeda.format(estrategiaMeta30.alvo)}</h2>
                  <p>
                    Alvo calculado sobre {estrategiaMeta30.baseLabel}; leitura atual em {estrategiaMeta30.atualLabel}.
                  </p>
                </div>
                <div className={styles.metaStrategyProgress}>
                  <div className={styles.progressLabel}>
                    <span>Progresso ate a meta</span>
                    <strong>{estrategiaMeta30.progresso}%</strong>
                  </div>
                  <div className={styles.progressBar}>
                    <span style={{ width: `${limitarPercentual(estrategiaMeta30.progresso)}%` }} />
                  </div>
                  <small>
                    {estrategiaMeta30.falta > 0
                      ? `Faltam ${moeda.format(estrategiaMeta30.falta)} para bater +30%.`
                      : "Meta de +30% ja superada neste fechamento."}
                  </small>
                </div>
                <div>
                  <strong>{estrategiaMeta30.foco}</strong>
                  <small>{estrategiaMeta30.acao}</small>
                  <div className={styles.metaTaskList}>
                    {estrategiaMeta30.tarefas.map((tarefa, index) => (
                      <div key={tarefa}>
                        <span>{index + 1}</span>
                        <p>{tarefa}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            )}

            {comparacaoOrganica.passos.length > 0 && (
              <>
                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <ArrowLeftRight size={20} />
                    <h2>{comparacaoMensal ? "Mes contra mes" : "Periodo contra periodo"} ({comparacaoOrganica.passos.length})</h2>
                  </div>
                  <div className={styles.comparisonFlow}>
                    {comparacaoOrganica.passos.map((passo, index) => (
                      <div className={styles.comparisonStep} key={`${passo.anterior.label}-${passo.atual.label}`}>
                        <div className={styles.comparisonMonth}>
                          <span>Passo {index + 1} - anterior</span>
                          <strong>{passo.anterior.label}</strong>
                          <small>Honorarios: {moeda.format(passo.anterior.honorarios)}</small>
                          <small>{valorOsDisponivel ? "Qtd." : "Total O.S."}: {numero.format(passo.anterior.quantidade)}</small>
                        </div>
                        <ArrowLeftRight className={styles.comparisonArrow} size={20} />
                        <div className={styles.comparisonMonth}>
                          <span>Atual</span>
                          <strong>{passo.atual.label}</strong>
                          <small>Honorarios: {moeda.format(passo.atual.honorarios)}</small>
                          <small>{valorOsDisponivel ? "Qtd." : "Total O.S."}: {numero.format(passo.atual.quantidade)}</small>
                        </div>
                        <div className={styles.comparisonDelta}>
                          <div>
                            <span>Dif. honorarios</span>
                            <strong className={passo.diferencaHonorarios >= 0 ? styles.positive : styles.negative}>
                              {moeda.format(passo.diferencaHonorarios)}
                            </strong>
                            <small>{formatarPercentual(passo.variacaoHonorarios)}</small>
                          </div>
                          <div>
                            <span>Dif. {valorOsDisponivel ? "qtd." : "O.S."}</span>
                            <strong className={passo.diferencaQuantidade >= 0 ? styles.positive : styles.negative}>
                              {numero.format(passo.diferencaQuantidade)}
                            </strong>
                            <small>{formatarPercentual(passo.variacaoQuantidade)}</small>
                          </div>
                          <div>
                            <span>{valorOsDisponivel ? "Dif. Valor O.S." : "Dif. media/O.S."}</span>
                            <strong
                              className={
                                (valorOsDisponivel ? passo.diferencaValorOs : passo.diferencaHonorarioMedio) >= 0
                                  ? styles.positive
                                  : styles.negative
                              }
                            >
                              {moeda.format(valorOsDisponivel ? passo.diferencaValorOs : passo.diferencaHonorarioMedio)}
                            </strong>
                            <small>
                              {formatarPercentual(valorOsDisponivel ? passo.variacaoValorOs : passo.variacaoHonorarioMedio)}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <div className={styles.comparisonGrid}>
                  <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <TrendingUp size={20} />
                      <h2>Servicos que puxaram ganho</h2>
                    </div>
                    <div className={styles.comparisonServiceList}>
                      {comparacaoOrganica.ganhos.length ? (
                        comparacaoOrganica.ganhos.map((servico) => (
                          <div key={`ganho-${servico.codigo}-${servico.servico}`}>
                            <strong>{servico.servico}</strong>
                            <span>Codigo {servico.codigo}</span>
                            <em className={styles.positive}>{moeda.format(servico.diferencaHonorarios)}</em>
                          </div>
                        ))
                      ) : (
                        <small>Nenhum ganho de servico entre os periodos comparados.</small>
                      )}
                    </div>
                  </article>

                  <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <AlertTriangle size={20} />
                      <h2>Servicos que explicam queda</h2>
                    </div>
                    <div className={styles.comparisonServiceList}>
                      {comparacaoOrganica.perdas.length ? (
                        comparacaoOrganica.perdas.map((servico) => (
                          <div key={`perda-${servico.codigo}-${servico.servico}`}>
                            <strong>{servico.servico}</strong>
                            <span>Codigo {servico.codigo}</span>
                            <em className={styles.negative}>{moeda.format(servico.diferencaHonorarios)}</em>
                          </div>
                        ))
                      ) : (
                        <small>Nenhuma perda de servico entre os periodos comparados.</small>
                      )}
                    </div>
                  </article>
                </div>

                <article className={`${styles.panel} ${styles.comparisonClosingTable}`}>
                  <div className={styles.panelHeader}>
                    <ArrowLeftRight size={20} />
                    <h2>Fechamento: {comparacaoOrganica.primeiro?.label || "Anterior"} x {comparacaoOrganica.ultimo?.label || "Atual"}</h2>
                  </div>
                  <p>
                    Resume a virada do primeiro para o ultimo periodo. Quando existem meses intermediarios, o historico completo preserva cada coluna.
                  </p>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Servico</th>
                        <th>{comparacaoOrganica.primeiro?.label || "Anterior"}</th>
                        <th>{comparacaoOrganica.ultimo?.label || "Atual"}</th>
                        <th>Dif. honorarios</th>
                        <th>Dif. O.S.</th>
                        <th>Variacao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparacaoOrganica.servicos.map((servico) => (
                        <tr key={`comparacao-${servico.codigo}-${servico.servico}`}>
                          <td>
                            <strong>{servico.servico}</strong>
                            <span>Codigo {servico.codigo}</span>
                          </td>
                          <td>{moeda.format(servico.honorarios2025)}</td>
                          <td>{moeda.format(servico.honorarios2026)}</td>
                          <td className={servico.diferencaHonorarios >= 0 ? styles.positive : styles.negative}>
                            {moeda.format(servico.diferencaHonorarios)}
                          </td>
                          <td className={servico.diferencaQuantidade >= 0 ? styles.positive : styles.negative}>
                            {numero.format(servico.diferencaQuantidade)}
                          </td>
                          <td className={(servico.crescimento || 0) >= 0 ? styles.positive : styles.negative}>
                            {formatarPercentual(servico.crescimento)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </article>
              </>
            )}

            {comparacaoOrganica.servicosHistorico.length > 0 && (
              <article className={`${styles.panel} ${styles.comparisonHistoryPanel}`}>
                <div className={styles.panelHeader}>
                  <ClipboardList size={20} />
                  <h2>Historico completo por servico</h2>
                </div>
                <p>
                  Mostra cada periodo reconhecido. Assim, envios com meses soltos exibem cada coluna e a diferenca do primeiro para o ultimo.
                </p>
                <div className={styles.tableWrap}>
                  <table className={`${styles.table} ${styles.comparisonHistoryTable}`}>
                    <thead>
                      <tr>
                        <th>Servico</th>
                        {comparacaoOrganica.periodosImportados.map((periodo) => (
                          <th key={`cabecalho-servico-${periodo.label}`} title={periodo.label}>
                            {rotuloPeriodoCurto(periodo)}
                          </th>
                        ))}
                        <th>Dif. fechamento</th>
                        <th>Dif. O.S.</th>
                        <th>Variacao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparacaoOrganica.servicosHistorico.map((servico) => (
                        <tr key={`historico-servico-${servico.codigo}-${servico.servico}`}>
                          <td data-label="Servico">
                            <strong>{servico.servico}</strong>
                            <span>Codigo {servico.codigo}</span>
                          </td>
                          {servico.periodos.map((periodo) => (
                            <td
                              key={`historico-servico-${servico.codigo}-${periodo.label}`}
                              data-label={rotuloPeriodoCurto(periodo)}
                            >
                              <strong>{moeda.format(periodo.honorarios)}</strong>
                              <span>{numero.format(periodo.quantidade)} O.S.</span>
                            </td>
                          ))}
                          <td
                            data-label="Dif. fechamento"
                            data-summary="true"
                            className={servico.diferencaHonorarios >= 0 ? styles.positive : styles.negative}
                          >
                            {moeda.format(servico.diferencaHonorarios)}
                          </td>
                          <td
                            data-label="Dif. O.S."
                            data-summary="true"
                            className={servico.diferencaQuantidade >= 0 ? styles.positive : styles.negative}
                          >
                            {numero.format(servico.diferencaQuantidade)}
                          </td>
                          <td
                            data-label="Variacao"
                            data-summary="true"
                            className={(servico.variacaoHonorarios || 0) >= 0 ? styles.positive : styles.negative}
                          >
                            {formatarPercentual(servico.variacaoHonorarios)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "estrategia" ? styles.tabVisible : ""}`} data-tab="estrategia">
          <section className={styles.sectionStack} data-print-section="Estrategia">
            {botaoImprimirAba("estrategia")}
            {comparacaoBloqueadaPorBase && (
              <article className={styles.panel}>
                <div className={styles.comparisonEmpty}>
                  <strong>Estrategia aguardando base minima.</strong>
                  <p>
                    A mesa estrategica usa tendencia, volatilidade e drawdown. Com {mesesBaseComparacao} periodo(s),
                    faltam {faltamPeriodosComparacao} para liberar esse calculo sem forcar conclusao.
                  </p>
                </div>
              </article>
            )}
            {planoPnvaCore && (
              <>
                <article className={`${styles.pnvaCoreHero} ${statusClasse(planoPnvaCore.status)}`}>
                  <div>
                    <span>Metodo Gustavo Martins</span>
                    <h2>Plano de acao da semana</h2>
                    <p>{planoPnvaCore.decisao}</p>
                  </div>
                  <div className={styles.pnvaCoreCommand}>
                    <span>Direcao do plano</span>
                    <strong>{planoPnvaCore.fraseFinal.replace(/^Missao central:\s*/i, "")}</strong>
                  </div>
                </article>

                <div className={styles.pnvaCoreScoreboard}>
                  {planoPnvaCore.placar.map((item) => (
                    <div className={statusClasse(item.status)} key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.valor}</strong>
                      <small>{item.detalhe}</small>
                    </div>
                  ))}
                </div>

                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <Target size={20} />
                    <h2>Missoes simples da semana</h2>
                  </div>
                  <div className={styles.pnvaMissionGrid}>
                    {planoPnvaCore.missoes.map((missao, index) => (
                      <div className={`${styles.pnvaMissionCard} ${statusClasse(missao.status)}`} key={missao.titulo}>
                        <div className={styles.pnvaMissionIndex}>
                          <span>{missao.etapa}</span>
                          <small>{String(index + 1).padStart(2, "0")}</small>
                        </div>
                        <div className={styles.pnvaMissionBody}>
                          <span>{missao.titulo}</span>
                          <strong>{missao.missao}</strong>
                          <p>{missao.como}</p>
                          <div className={styles.pnvaMissionMeta}>
                            <small>{missao.indicador}</small>
                            <small>{missao.prazo}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <div className={styles.pnvaCoreGrid}>
                  <article className={styles.pnvaCoreTextCard}>
                    <div className={styles.panelHeader}>
                      <ClipboardList size={20} />
                      <h2>Como executar sem complicar</h2>
                    </div>
                    <p>
                      Pegue uma missao por vez, defina um responsavel e acompanhe o numero no fim do dia.
                      A estrategia so muda quando vira rotina simples.
                    </p>
                    <strong>Foco ofensivo: {planoPnvaCore.servicoForte}</strong>
                    <strong>Foco defensivo: {planoPnvaCore.servicoCritico}</strong>
                    <small>Alvo do ciclo: {moeda.format(planoPnvaCore.alvo)}. Gap previsto: {moeda.format(planoPnvaCore.falta)}.</small>
                  </article>

                  <article className={styles.pnvaCoreRules}>
                    <div className={styles.panelHeader}>
                      <ShieldCheck size={20} />
                      <h2>Regras para realmente mudar</h2>
                    </div>
                    <ul>
                      {planoPnvaCore.regras.map((regra) => (
                        <li key={regra}>{regra}</li>
                      ))}
                    </ul>
                  </article>
                </div>
              </>
            )}
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "anuncios" ? styles.tabVisible : ""}`} data-tab="anuncios">
          <section className={styles.sectionStack} data-print-section="Anuncios">
            {botaoImprimirAba("anuncios")}
            <section className={styles.marketingHero}>
              <MarketingNeuralCanvas ativo={abaAtiva === "anuncios"} intensidade={marketingInteligente.metricas.scoreMedio} />
              <div className={styles.marketingHeroContent}>
                <span>
                  <BrainCircuit size={18} />
                  Genio de anuncios
                </span>
                <h2>Roteiros, datas e frases para vender os servicos certos</h2>
                <p>
                  Esta aba pega os servicos do relatorio, escolhe onde vale anunciar, sugere quantos anuncios fazer,
                  distribui as datas e entrega textos prontos para chamar o cliente no WhatsApp.
                </p>
              </div>
              <div className={styles.marketingHeroStats}>
                <div>
                  <strong>{marketingInteligente.metricas.totalAnuncios}</strong>
                  <span>anuncios no ciclo</span>
                </div>
                <div>
                  <strong>{marketingInteligente.metricas.datasPlanejadas}</strong>
                  <span>datas padrao</span>
                </div>
                <div>
                  <strong>{marketingInteligente.metricas.frases}</strong>
                  <span>frases WhatsApp</span>
                </div>
                <div>
                  <strong>{marketingInteligente.metricas.scoreMedio || "-"}</strong>
                  <span>forca media</span>
                </div>
              </div>
            </section>

            {!marketingInteligente.planos.length ? (
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <Megaphone size={20} />
                  <h2>Sem servicos para anunciar ainda</h2>
                </div>
                <p>Anexe um relatorio com servicos e honorarios para o gerador montar a campanha.</p>
              </article>
            ) : (
              <>
                <div className={styles.marketingInsightGrid}>
                  <article className={styles.marketingSignal}>
                    <Flame size={20} />
                    <span>Servico para comecar</span>
                    <strong>{marketingInteligente.planos[0]?.servicoCurto}</strong>
                    <p>{marketingInteligente.planos[0]?.motivacao}</p>
                  </article>
                  <article className={styles.marketingSignal}>
                    <CalendarDays size={20} />
                    <span>Distribuicao</span>
                    <strong>Seg, qua, sex e sab</strong>
                    <p>Usa dias alternados para lembrar, provar valor e fechar conversa sem cansar o cliente.</p>
                  </article>
                  <article className={styles.marketingSignal}>
                    <MessageCircle size={20} />
                    <span>Atendimento</span>
                    <strong>WhatsApp com prazo</strong>
                    <p>Frases curtas, humanas e prontas para copiar, com chamada clara para resolver agora.</p>
                  </article>
                </div>

                <div className={styles.chartGrid}>
                  <article className={styles.chartPanel}>
                    <h2>Quanto anunciar por servico</h2>
                    <p>Quantidade sugerida para um ciclo comercial de ate 30 dias, usando peso, queda, crescimento e volume.</p>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={marketingInteligente.graficoServicos}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="servico" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value) => numero.format(Number(value))} />
                        <Bar dataKey="anuncios" name="Anuncios sugeridos" radius={[6, 6, 0, 0]}>
                          {marketingInteligente.graficoServicos.map((item) => (
                            <Cell key={item.id} fill={item.cor} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </article>

                  <article className={styles.chartPanel}>
                    <h2>Canais da campanha</h2>
                    <p>Distribuicao simples para alternar conversa direta, prova visual e chamada de fechamento.</p>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={marketingInteligente.graficoCanais}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="canal" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value) => numero.format(Number(value))} />
                        <Bar dataKey="anuncios" name="Publicacoes" fill="#4666c9" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </article>
                </div>

                <div className={styles.marketingPlanGrid}>
                  {marketingInteligente.planos.map((plano) => (
                    <article className={`${styles.marketingPlanCard} ${statusClasse(plano.status)}`} key={plano.id}>
                      <div className={styles.marketingPlanHeader}>
                        <div>
                          <span>{plano.prioridade}</span>
                          <h2>{plano.servicoCurto}</h2>
                        </div>
                        <strong>{plano.anuncios} anuncios</strong>
                      </div>
                      <p>{plano.motivacao}</p>
                      <div className={styles.marketingPlanMeta}>
                        <div>
                          <Megaphone size={17} />
                          <span>{plano.melhorCanal}</span>
                        </div>
                        <div>
                          <Clock3 size={17} />
                          <span>{plano.horarios}</span>
                        </div>
                      </div>
                      <div className={styles.marketingScript}>
                        <div>
                          <Video size={17} />
                          <strong>{plano.roteiro.formato}</strong>
                          <span>{plano.roteiro.duracao}</span>
                        </div>
                        <p>{plano.roteiro.abertura}</p>
                        <p>{plano.roteiro.meio}</p>
                        <p>{plano.roteiro.fechamento}</p>
                        <small>{plano.roteiro.legenda}</small>
                      </div>
                    </article>
                  ))}
                </div>

                <article className={styles.chartPanel}>
                  <div className={styles.panelHeader}>
                    <CalendarDays size={20} />
                    <h2>Datas padrao para distribuir melhor</h2>
                  </div>
                  <p>
                    O calendario alterna lembranca, prova e fechamento. As primeiras datas aparecem abaixo; o total fica no topo da aba.
                  </p>
                  <div className={styles.marketingCalendarGrid}>
                    {marketingInteligente.calendario.slice(0, 16).map((item) => (
                      <div className={`${styles.marketingCalendarItem} ${statusClasse(item.status)}`} key={item.id}>
                        <span>{item.data}</span>
                        <strong>{item.servico}</strong>
                        <small>
                          {item.horario} | {item.canal} | {item.tipo}
                        </small>
                        <p>{item.motivo}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <MessageCircle size={20} />
                    <h2>Frases prontas para WhatsApp</h2>
                  </div>
                  <p>Textos curtos para atendimento, cobranca leve e recuperacao de prazo, sem ficar duro nem formal.</p>
                  <div className={styles.whatsappPhraseGrid}>
                    {marketingInteligente.frasesWhatsapp.map((frase) => (
                      <div className={`${styles.whatsappPhrase} ${statusClasse(frase.status)}`} key={frase.id}>
                        <span>{frase.servico}</span>
                        <p>{frase.texto}</p>
                        <button type="button" className={styles.copyButton} onClick={() => copiarTexto(frase.id, frase.texto)}>
                          {fraseCopiada === frase.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                          <span>{fraseCopiada === frase.id ? "Copiado" : "Copiar"}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.whatsappCloseLine}>
                    <Send size={17} />
                    <strong>Fechamento bom:</strong>
                    <span>Me chama agora que eu vejo para voce e ja te digo o proximo passo.</span>
                  </div>
                </article>
              </>
            )}
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "ganhos" ? styles.tabVisible : ""}`} data-tab="ganhos">
          <section className={styles.sectionStack} data-print-section="Ganhos">
            {botaoImprimirAba("ganhos")}
            <div className={styles.chartGrid}>
              <article className={styles.chartPanel}>
                <h2>Honorarios por mes</h2>
                <p>Compara cada documento com o periodo anterior. A barra verde e o periodo analisado; a azul e a base de comparacao.</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={comparativoGrafico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="honorarios2025" name="Periodo anterior" fill="#4666c9" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="honorarios2026" name="Periodo atual" fill="#1f9d72" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>

              <article className={styles.chartPanel}>
                <h2>{valorOsDisponivel ? "Ticket medio O.S." : "Honorario medio por O.S."}</h2>
                {valorOsDisponivel ? (
                  <>
                    <p>Mostra se o valor medio por processo subiu ou caiu. Queda no ticket pode explicar perda mesmo com volume parecido.</p>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={comparativoGrafico}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="mes" />
                        <YAxis tickFormatter={(value) => `R$ ${value}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line dataKey="ticket2025" name="Periodo anterior" stroke="#4666c9" strokeWidth={3} />
                        <Line dataKey="ticket2026" name="Periodo atual" stroke="#d17a22" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <>
                    <p>Usa Total de O.S. e honorarios que existem neste PDF para medir quanto cada O.S. gerou em media.</p>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={comparativoGrafico}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="mes" />
                        <YAxis tickFormatter={(value) => `R$ ${value}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line dataKey="honorarioMedioAnterior" name="Periodo anterior" stroke="#4666c9" strokeWidth={3} />
                        <Line dataKey="honorarioMedioAtual" name="Periodo atual" stroke="#d17a22" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                )}
              </article>
            </div>

            <div className={styles.chartGrid}>
              <article className={styles.chartPanel}>
                <h2>Mix de honorarios por servico</h2>
                <p>Pizza dos servicos que mais pesaram no periodo atual. Quanto maior a fatia, maior a dependencia desse servico no resultado.</p>
                <div className={styles.pieLayout}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={mixServicosPizza}
                        dataKey="valor"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={108}
                        paddingAngle={2}
                      >
                        {mixServicosPizza.map((item) => (
                          <Cell key={`${item.codigo}-${item.nome}`} fill={item.cor} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.pieLegend}>
                    {mixServicosPizza.map((item) => (
                      <div key={`${item.codigo}-${item.nome}`}>
                        <span style={{ backgroundColor: item.cor }} />
                        <strong>{item.nome}</strong>
                        <small>{moeda.format(item.valor)} | {formatarPercentual(item.percentual)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <TrendingUp size={20} />
                  <h2>Diagnostico profissional</h2>
                </div>
                <p>Leitura direta do que explica ganho, perda, risco e proximo movimento comercial.</p>
                <div className={styles.diagnosisGrid}>
                  {diagnosticoGanhos.map((item) => (
                    <div key={item.titulo}>
                      <span>{item.titulo}</span>
                      <strong>{item.valor}</strong>
                      <small>{item.detalhe}</small>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <CheckCircle2 size={20} />
                <h2>Melhores sinais</h2>
              </div>
              <p>Separa os pontos positivos ou criticos mais importantes para orientar o proximo passo.</p>
              <div className={styles.factGrid}>
                <div>
                  <span>Melhor mes</span>
                  <strong>{totais.melhorMes.mes}</strong>
                  <small>{moeda.format(totais.melhorMes.honorarios2026)} em honorarios</small>
                </div>
                <div>
                  <span>Servico lider</span>
                  <strong>{totais.servicoLider.servico}</strong>
                  <small>{moeda.format(totais.servicoLider.honorarios2026)} em {dadosAtuais.comparacao?.atualLabel}</small>
                </div>
                <div>
                  <span>Crescimento acumulado</span>
                  <strong className={totais.ganhoIncremental >= 0 ? styles.positive : styles.negative}>
                    {formatarPercentual(totais.crescimentoHonorarios)}
                  </strong>
                  <small>Fechamento {leituraDinamica.fechamentoTexto}</small>
                </div>
              </div>
            </article>
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "servicos" ? styles.tabVisible : ""}`} data-tab="servicos">
          <section className={styles.sectionStack} data-print-section="Servicos">
            {botaoImprimirAba("servicos")}
            <article className={styles.chartPanel}>
              <h2>Servicos que mais geraram honorarios em {dadosAtuais.comparacao?.atualLabel}</h2>
              <p>Ranking dos servicos que mais pesaram no resultado atual, com volume, media e crescimento.</p>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={dadosAtuais.servicos.slice(0, 7)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="codigo" />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area dataKey="honorarios2026" name={`Honorarios ${dadosAtuais.comparacao?.atualLabel}`} stroke="#1f9d72" fill="#bfe8da" />
                </AreaChart>
              </ResponsiveContainer>
            </article>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Servico</th>
                    <th>Qtd. {dadosAtuais.comparacao?.atualLabel}</th>
                    <th>Honorarios {dadosAtuais.comparacao?.atualLabel}</th>
                    <th>Honorario medio</th>
                    <th>Crescimento</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosAtuais.servicos.map((servico) => (
                    <tr key={`${servico.codigo}-${servico.servico}`}>
                      <td>
                        <strong>{servico.servico}</strong>
                        <span>Codigo {servico.codigo}</span>
                      </td>
                      <td>{numero.format(servico.qtd2026)}</td>
                      <td>{moeda.format(servico.honorarios2026)}</td>
                      <td>{moeda.format(servico.honorarioMedio2026)}</td>
                      <td className={styles.positive}>{formatarPercentual(servico.crescimento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "metas" ? styles.tabVisible : ""}`} data-tab="metas">
          <section className={styles.sectionStack} data-print-section="Metas">
            {botaoImprimirAba("metas")}
            {planoCompetencia && (
              <article className={`${styles.junePlan} ${statusClasse(planoCompetencia.status)}`}>
                <div className={styles.junePlanHeader}>
                  <div>
                    <span>Motor mensal local</span>
                    <h2>Meta de {planoCompetencia.label}: crescer 30%</h2>
                    <p>
                      {planoCompetencia.emAndamento
                        ? `A competencia esta em andamento. O realizado usa os ${planoCompetencia.diasCobertos} dias reconhecidos e a projecao acompanha o ritmo ate o fechamento.`
                        : "A competencia alvo ainda nao foi enviada. A meta usa somente meses fechados e comparaveis."}
                    </p>
                  </div>
                  <div className={styles.junePlanTarget}>
                    <span>Meta mensal de honorarios</span>
                    <strong>{moeda.format(planoCompetencia.meta)}</strong>
                    <small>Base: {planoCompetencia.origemMeta}; depois +30%</small>
                  </div>
                </div>

                <div className={styles.junePlanMetrics}>
                  <div>
                    <span>Base robusta</span>
                    <strong>{moeda.format(planoCompetencia.baseMeta)}</strong>
                    <small>{planoCompetencia.periodosBase.join(", ")}</small>
                  </div>
                  <div>
                    <span>Realizado</span>
                    <strong>{planoCompetencia.realizado ? moeda.format(planoCompetencia.realizado) : "Aguardando arquivo"}</strong>
                    <small>{planoCompetencia.emAndamento ? `${planoCompetencia.diasCobertos}/${planoCompetencia.diasNoMes} dias` : "Competencia futura"}</small>
                  </div>
                  <div>
                    <span>Projecao de fechamento</span>
                    <strong>{moeda.format(planoCompetencia.projecao)}</strong>
                    <small>{formatarPercentual(planoCompetencia.crescimentoProjetado)} sobre a base robusta</small>
                  </div>
                  <div>
                    <span>{planoCompetencia.atingiuMeta ? "Meta superada" : "Gap projetado"}</span>
                    <strong>{planoCompetencia.atingiuMeta ? moeda.format(planoCompetencia.realizado - planoCompetencia.meta) : moeda.format(planoCompetencia.gapProjetado)}</strong>
                    <small>{planoCompetencia.statusLabel}</small>
                  </div>
                </div>

                <div className={styles.junePlanExecution}>
                  <div>
                    <span>{planoCompetencia.emAndamento ? "Progresso realizado / projetado" : "Progresso projetado"}</span>
                    <strong>
                      {planoCompetencia.emAndamento
                        ? `${planoCompetencia.progresso.toFixed(1).replace(".", ",")}% / ${planoCompetencia.progressoProjetado.toFixed(1).replace(".", ",")}%`
                        : `${planoCompetencia.progressoProjetado.toFixed(1).replace(".", ",")}%`}
                    </strong>
                    <div className={styles.progressBar}>
                      <span style={{ width: `${planoCompetencia.progressoProjetado}%` }} />
                    </div>
                    <small>
                      Equacao local: {planoCompetencia.origemMeta}. A meta aplica {formatarPercentual(planoCompetencia.metaCrescimento)} sobre essa base.
                    </small>
                  </div>
                  <div>
                    <span>Servicos para concentrar a execucao</span>
                    <div className={styles.juneFocusList}>
                      {planoCompetencia.servicosFoco.map((servico, index) => (
                        <p key={servico.servico}>
                          <strong>{index + 1}. {servico.servico}</strong>
                          <small>{moeda.format(servico.honorarios)} nos meses fechados usados pela equacao</small>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            )}
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <Target size={20} />
                <h2>Como ler as metas</h2>
              </div>
              <p>
                As metas sao criadas pelos dados enviados. Quando ha queda forte, o foco vira recuperacao; quando ha crescimento, o foco vira protecao do servico lider e escala do mix vencedor.
              </p>
            </article>
            <div className={styles.goalGrid}>
              {metasDinamicas.map((meta) => (
                <article className={styles.goalCard} key={meta.acao}>
                  <div>
                    <span className={meta.prioridade === "Alta" ? styles.badgeHigh : styles.badgeMedium}>
                      {meta.prioridade}
                    </span>
                    <h2>{meta.acao}</h2>
                    <p>{meta.detalhe}</p>
                  </div>
                  <div>
                    <div className={styles.progressLabel}>
                      <span>{meta.indicador}</span>
                      <strong>{meta.progresso}%</strong>
                    </div>
                    <div className={styles.progressBar}>
                      <span style={{ width: `${meta.progresso}%` }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "metaFuncionarios" ? styles.tabVisible : ""}`} data-tab="metaFuncionarios">
          <section className={styles.sectionStack} data-print-section="Meta funcionarios">
            {botaoImprimirAba("metaFuncionarios")}
            <article className={`${styles.junePlan} ${styles.employeeGoalPanel}`}>
              <div className={styles.junePlanHeader}>
                <div>
                  <span>Divisao operacional</span>
                  <h2>Meta por funcionario</h2>
                  <p>
                    Informe a quantidade de vendedores ou funcionarios. A aba divide a meta do mes, a base atual e o acrescimo de 30% usando os mesmos dados ja calculados em Metas.
                  </p>
                </div>
                <label className={styles.employeeGoalInput}>
                  <span>Quantidade de funcionarios</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantidadeFuncionarios}
                    onChange={(event) => setQuantidadeFuncionarios(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
              </div>

              <div className={styles.employeeGoalHero}>
                <div>
                  <span>Cada funcionario precisa fazer</span>
                  <strong>{moeda.format(metaFuncionarios.alvoPorFuncionario)}</strong>
                  <small>
                    Para bater a meta de {moeda.format(metaFuncionarios.alvoMes)} em {planoCompetencia?.label || "meta do mes"}.
                  </small>
                </div>
                <div>
                  <span>Valor +30% por funcionario</span>
                  <strong>{moeda.format(metaFuncionarios.adicionalPorFuncionario)}</strong>
                  <small>
                    Acrescimo individual acima da base de {moeda.format(metaFuncionarios.basePorFuncionario)}.
                  </small>
                </div>
              </div>

              <div className={styles.junePlanMetrics}>
                <div>
                  <span>Funcionarios</span>
                  <strong>{numero.format(metaFuncionarios.funcionarios)}</strong>
                  <small>Quantidade usada na divisao da meta</small>
                </div>
                <div>
                  <span>Base do mes</span>
                  <strong>{moeda.format(metaFuncionarios.baseMes)}</strong>
                  <small>{planoCompetencia?.origemMeta || "Base atual reconhecida"}</small>
                </div>
                <div>
                  <span>Meta do mes +30%</span>
                  <strong>{moeda.format(metaFuncionarios.alvoMes)}</strong>
                  <small>Total que a equipe precisa bater</small>
                </div>
                <div>
                  <span>Falta por funcionario</span>
                  <strong>{moeda.format(metaFuncionarios.faltaPorFuncionario)}</strong>
                  <small>Considerando o realizado atual de {moeda.format(metaFuncionarios.realizadoMes)}</small>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Total do mes</th>
                      <th>Por funcionario</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Base antes do crescimento</td>
                      <td>{moeda.format(metaFuncionarios.baseMes)}</td>
                      <td>{moeda.format(metaFuncionarios.basePorFuncionario)}</td>
                    </tr>
                    <tr>
                      <td>Acrescimo de 30%</td>
                      <td>{moeda.format(metaFuncionarios.adicionalMes)}</td>
                      <td>{moeda.format(metaFuncionarios.adicionalPorFuncionario)}</td>
                    </tr>
                    <tr>
                      <td>Meta final para bater</td>
                      <td>{moeda.format(metaFuncionarios.alvoMes)}</td>
                      <td>{moeda.format(metaFuncionarios.alvoPorFuncionario)}</td>
                    </tr>
                    <tr>
                      <td>Falta para fechar a meta</td>
                      <td>{moeda.format(metaFuncionarios.faltaMes)}</td>
                      <td>{moeda.format(metaFuncionarios.faltaPorFuncionario)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </div>

        <div className={`${styles.tabContent} ${abaAtiva === "auditoria" ? styles.tabVisible : ""}`} data-tab="auditoria">
          <section className={styles.sectionStack} data-print-section="Auditoria">
            {botaoImprimirAba("auditoria")}
            <div className={styles.warningHeader}>
              <AlertTriangle size={22} />
              <div>
                <h2>Pontos de revisao operacional</h2>
                <p>
                  {valorOsDisponivel
                    ? "A auditoria separa servicos com honorario medio muito baixo ou honorario alto demais sobre a O.S. Esses pontos explicam possiveis erros de preco, repasse ou margem."
                    : "A auditoria usa os campos deste PDF: Total de O.S., honorarios e grupos de servico. Sem valor financeiro da O.S., a checagem honorario/valor O.S. fica bloqueada."}
                </p>
              </div>
            </div>

            <div className={styles.auditGrid}>
              {dadosAtuais.auditoria.map((item) => (
                <article className={styles.auditCard} key={`${item.arquivo}-${item.detalhe}`}>
                  <span>{item.arquivo}</span>
                  <h3>{item.tipo}</h3>
                  <strong>{item.detalhe}</strong>
                  <p>{item.acao}</p>
                  <small>Valor calculado: {item.valor <= 1 ? formatarPercentual(item.valor) : moeda.format(item.valor)}</small>
                </article>
              ))}
            </div>

            <div className={styles.trendGrid}>
              {tendenciasDinamicas.map((item) => (
                  <article className={styles.panel} key={item.tema}>
                    <div className={styles.panelHeader}>
                      <h2>{item.tema}</h2>
                    </div>
                    <p>{item.padrao}</p>
                    <strong>{item.impacto}</strong>
                    <small>{item.recomendacao}</small>
                  </article>
                ))}
            </div>
          </section>
        </div>
          </>
        )}
        </div>
      </main>
  );
}
