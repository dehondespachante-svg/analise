import type { IntervaloFonte } from "@/src/lib/honorariosParser";

export type ComparativoMes = {
  mes: string;
  qtd2025: number;
  qtd2026: number;
  os2025: number;
  os2026: number;
  honorarios2025: number;
  honorarios2026: number;
  ticket2025: number;
  ticket2026: number;
  crescimentoHonorarios: number | null;
};

export type ServicoDestaque = {
  codigo: number;
  servico: string;
  qtd2025: number;
  qtd2026: number;
  honorarios2025: number;
  honorarios2026: number;
  valorOs2026: number;
  honorarioMedio2026: number;
  crescimento: number | null;
};

export type RelatorioHonorarios = {
  resumo: Array<{
    indicador: string;
    valor2025: number;
    valor2026: number;
    variacao: number;
    tipo: string;
  }>;
  comparativo: ComparativoMes[];
  periodos?: Array<{
    mes: string;
    label: string;
    quantidade: number;
    valorOs: number;
    honorarios: number;
    ticket: number;
    honorarioMedio: number;
    crescimentoHonorarios: number | null;
    meta30: number;
    atingiuMeta: boolean;
  }>;
  periodosImportados?: Array<{
    ano: number;
    mesNumero: number;
    mes: string;
    label: string;
    arquivos?: string[];
    intervalos?: IntervaloFonte[];
    linhas?: number;
    quantidade: number;
    valorOs: number;
    honorarios: number;
    ticket: number;
    honorarioMedio: number;
  }>;
  servicos: ServicoDestaque[];
  servicosPorPeriodo?: Array<{
    codigo: number;
    servico: string;
    totalHonorarios: number;
    periodos: Array<{
      ano: number;
      mesNumero: number;
      label: string;
      quantidade: number;
      valorOs: number;
      honorarios: number;
      honorarioMedio: number;
    }>;
  }>;
  auditoria: Array<{
    arquivo: string;
    tipo: string;
    detalhe: string;
    valor: number;
    acao: string;
  }>;
  anos: { anterior: number; atual: number };
  comparacao?: {
    tipo: "ano" | "mes";
    anteriorLabel: string;
    atualLabel: string;
    metaCrescimento: number;
  };
  camposDisponiveis?: {
    valorOs: boolean;
  };
  arquivos: string[];
  totalLinhas?: number;
};

export const relatorioVazio: RelatorioHonorarios = {
  resumo: [],
  comparativo: [],
  periodos: [],
  periodosImportados: [],
  servicos: [],
  servicosPorPeriodo: [],
  auditoria: [],
  anos: { anterior: 0, atual: 0 },
  comparacao: { tipo: "mes", anteriorLabel: "-", atualLabel: "-", metaCrescimento: 0.3 },
  camposDisponiveis: { valorOs: true },
  arquivos: [],
  totalLinhas: 0,
};
