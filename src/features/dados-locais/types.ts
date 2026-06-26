export type CidadeLocal = {
  cidade: string;
  quantidade: number;
  percentual: number;
  concluidos: number;
  cepsUnicos: number;
};

export type ColecaoLocal = {
  nome: string;
  quantidade: number;
  primeiroDocumentoEm: string | null;
  ultimoDocumentoEm: string | null;
};

export type FiltroListaLocal = "todas" | "oficial" | "digital";

export type EtapaPNVALocal = {
  etapa: "Olhar" | "Arrumar" | "Conferir" | "Fazer";
  titulo: string;
  leitura: string;
  indicador: string;
  status: "bom" | "alerta" | "critico";
};

export type EstrategiaPNVALocal = {
  versao: "pnva-core-dados-locais-v1";
  responsavel: "Gustavo Martins";
  confianca: number;
  diagnostico: string;
  proximaAcao: string;
  sinais: string[];
  travasPreservadas: string[];
  etapas: EtapaPNVALocal[];
  marcos: Array<{
    titulo: string;
    valor: string;
    detalhe: string;
    status: "atingido" | "em-progresso" | "proximo";
  }>;
  ganhos: Array<{
    titulo: string;
    valor: string;
    detalhe: string;
    acao: string;
  }>;
  campos: Array<{
    campo: string;
    uso: string;
    cobertura: string;
  }>;
};

export type AnaliseDadosLocais = {
  disponivel: boolean;
  filtroAtivo: FiltroListaLocal;
  nomeFiltro: string;
  sincronizadoEm: string | null;
  primeiroDocumentoEm: string | null;
  ultimoDocumentoEm: string | null;
  totalRegistros: number;
  comCep: number;
  semCep: number;
  cepFormatoInvalido: number;
  semCepInformado: number;
  cidadeSemCep: number;
  cepSemCidade: number;
  semLocalizacao: number;
  cidadesIdentificadas: number;
  leiturasExecutadas: number;
  limiteLeituras: number;
  truncado: boolean;
  colecoes: ColecaoLocal[];
  topCidades: CidadeLocal[];
  estrategiaPNVA: EstrategiaPNVALocal | null;
};
