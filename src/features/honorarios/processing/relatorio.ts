import {
  montarRelatorio,
  parseLinhasHonorarios,
  type LinhaHonorario,
  type RelatorioHonorariosGerado,
} from "@/src/lib/honorariosParser";

export type TextoHonorariosExtraido = {
  nome: string;
  texto: string;
};

export type FalhaArquivoHonorarios = {
  nome: string;
  detalhe: string;
};

export class SemLinhasHonorariosError extends Error {
  constructor() {
    super("Nao encontrei linhas de honorarios nos arquivos enviados.");
    this.name = "SemLinhasHonorariosError";
  }
}

function nomesUnicos(nomes: string[]) {
  return Array.from(new Set(nomes.filter(Boolean)));
}

function criarAvisosSemLinhas(nomes: string[]): RelatorioHonorariosGerado["auditoria"] {
  return nomesUnicos(nomes)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({
      arquivo: nome,
      tipo: "Arquivo sem linhas reconhecidas",
      detalhe: "Nenhuma linha de honorarios foi encontrada neste anexo.",
      valor: 0,
      acao: "Verifique se o arquivo enviado e um relatorio fonte de honorarios, e nao um PDF de analise/exportacao.",
    }));
}

function criarAvisosFalha(falhas: FalhaArquivoHonorarios[]): RelatorioHonorariosGerado["auditoria"] {
  const chaves = new Set<string>();

  return falhas
    .filter((falha) => falha.nome)
    .filter((falha) => {
      const chave = `${falha.nome}:${falha.detalhe}`;
      if (chaves.has(chave)) return false;
      chaves.add(chave);
      return true;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((falha) => ({
      arquivo: falha.nome,
      tipo: "Arquivo nao processado",
      detalhe: falha.detalhe || "Falha ao extrair texto deste anexo.",
      valor: 0,
      acao: "Reenvie o anexo ou converta-o para PDF/imagem legivel antes de analisar novamente.",
    }));
}

export function parseTextosExtraidos(value: FormDataEntryValue | null): TextoHonorariosExtraido[] {
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const nome = typeof record.nome === "string" ? record.nome : "";
        const texto = typeof record.texto === "string" ? record.texto : "";
        return nome ? { nome, texto } : null;
      })
      .filter((item): item is TextoHonorariosExtraido => Boolean(item));
  } catch {
    return [];
  }
}

export function montarRelatorioHonorariosDeTextos(
  textos: TextoHonorariosExtraido[],
  nomesArquivos: string[],
  falhas: FalhaArquivoHonorarios[] = []
) {
  const linhas: LinhaHonorario[] = [];
  const arquivosSemLinhas: string[] = [];

  textos.forEach((texto) => {
    const linhasTexto = parseLinhasHonorarios(texto.texto, texto.nome);
    if (!linhasTexto.length) {
      arquivosSemLinhas.push(texto.nome);
    }
    linhas.push(...linhasTexto);
  });

  if (!linhas.length) {
    throw new SemLinhasHonorariosError();
  }

  const relatorio = montarRelatorio(
    linhas,
    nomesUnicos([...nomesArquivos, ...textos.map((texto) => texto.nome), ...falhas.map((falha) => falha.nome)])
  );

  return {
    ...relatorio,
    auditoria: [...criarAvisosFalha(falhas), ...criarAvisosSemLinhas(arquivosSemLinhas), ...relatorio.auditoria],
  };
}
