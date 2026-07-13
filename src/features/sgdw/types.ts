export type SgdwConfig = {
  url: string;
  token: string;
};

export type SgdwLinhaBruta = {
  ANO: number;
  MES: number;
  CODIGO_SERVICO: number;
  SERVICO: string;
  QUANTIDADE: number;
  HONORARIOS: number;
  RECEBIDO: number;
};

export type SgdwPeriodo = {
  ano: number;
  mes: number;
  label: string;
  honorarios: number;
  recebido: number;
  quantidade: number;
  taxaRecebimento: number;
};

export type SgdwServico = {
  codigo: number;
  servico: string;
  honorarios: number;
  recebido: number;
  quantidade: number;
  participacao: number;
};

export type SgdwDados = {
  periodos: SgdwPeriodo[];
  servicos: SgdwServico[];
  rawLinhas: SgdwLinhaBruta[];
  totalHonorarios: number;
  totalRecebido: number;
  totalQuantidade: number;
  taxaGlobal: number;
  geradoEm: string;
};

export type SgdwExplorerAba =
  | "os" | "clientes" | "veiculos" | "servicos"
  | "caixa" | "funcionarios" | "schema";

export type SgdwPaginaDados = {
  linhas: Record<string, unknown>[];
  total: number;
};
