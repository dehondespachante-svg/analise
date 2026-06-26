import "client-only";

import type { RelatorioHonorariosGerado } from "@/src/lib/honorariosParser";

import { carregarTextoArquivoCache, salvarTextoArquivoCache } from "./cache";
import { extrairTextoHonorariosDoDocumentoPdf, type PdfDocumentLike } from "../processing/pdf-texto";
import {
  montarRelatorioHonorariosDeTextos,
  type FalhaArquivoHonorarios,
  type TextoHonorariosExtraido,
} from "../processing/relatorio";

type PdfJsBrowser = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument(options: { data: Uint8Array }): { promise: Promise<PdfDocumentLike> };
};

type ArquivoFalho = {
  arquivo: File;
  erro: unknown;
};

const PDF_CONCURRENCY = 2;
let pdfJsPromise: Promise<PdfJsBrowser> | null = null;

function arquivoEhPdf(file: File) {
  return file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
}

function arquivoEhImagem(file: File) {
  return file.type.startsWith("image/") || /\.(?:bmp|gif|jpe?g|png|tiff?|webp)$/i.test(file.name);
}

function detalheErro(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function carregarPdfJs() {
  pdfJsPromise ||= import("pdfjs-dist/legacy/build/pdf.mjs").then((modulo) => {
    const pdfjs = modulo as unknown as PdfJsBrowser;
    pdfjs.GlobalWorkerOptions.workerSrc ||= new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url
    ).toString();
    return pdfjs;
  });

  return pdfJsPromise;
}

async function processarComLimite<T, R>(
  itens: T[],
  limite: number,
  processar: (item: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const resultados = new Array<PromiseSettledResult<R>>(itens.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(limite, itens.length) }, async () => {
      while (cursor < itens.length) {
        const index = cursor;
        cursor += 1;

        try {
          resultados[index] = { status: "fulfilled", value: await processar(itens[index]) };
        } catch (reason) {
          resultados[index] = { status: "rejected", reason };
        }
      }
    })
  );

  return resultados;
}

async function extrairTextoPdfNoNavegador(file: File) {
  const textoCache = carregarTextoArquivoCache(file);
  if (textoCache) return textoCache;

  const pdfjs = await carregarPdfJs();
  const buffer = await file.arrayBuffer();
  const documento = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const texto = await extrairTextoHonorariosDoDocumentoPdf(documento);

  salvarTextoArquivoCache(file, texto);
  return texto;
}

async function extrairTextosPdf(files: File[]) {
  const textos: TextoHonorariosExtraido[] = [];
  const falhas: ArquivoFalho[] = [];
  const resultados = await processarComLimite(files, PDF_CONCURRENCY, extrairTextoPdfNoNavegador);

  resultados.forEach((resultado, index) => {
    if (resultado.status === "fulfilled") {
      textos.push({ nome: files[index].name, texto: resultado.value });
      return;
    }

    falhas.push({ arquivo: files[index], erro: resultado.reason });
  });

  return { textos, falhas };
}

async function extrairTextosImagem(files: File[]) {
  const textos: TextoHonorariosExtraido[] = [];
  const pendentes: File[] = [];
  const falhas: ArquivoFalho[] = [];

  files.forEach((file) => {
    const textoCache = carregarTextoArquivoCache(file);
    if (textoCache) {
      textos.push({ nome: file.name, texto: textoCache });
      return;
    }
    pendentes.push(file);
  });

  if (!pendentes.length) {
    return { textos, falhas };
  }

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("por");

    try {
      for (const file of pendentes) {
        try {
          const result = await worker.recognize(file);
          const texto = result.data.text || "";
          textos.push({ nome: file.name, texto });
          salvarTextoArquivoCache(file, texto);
        } catch (erro) {
          falhas.push({ arquivo: file, erro });
        }
      }
    } finally {
      await worker.terminate();
    }
  } catch (erro) {
    falhas.push(...pendentes.map((arquivo) => ({ arquivo, erro })));
  }

  return { textos, falhas };
}

async function analisarNoServidor(files: File[], textos: TextoHonorariosExtraido[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("arquivos", file));
  if (textos.length) {
    formData.append("textos", JSON.stringify(textos));
  }

  const response = await fetch("/api/analisar-honorarios", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | RelatorioHonorariosGerado | null;

  if (!response.ok) {
    throw new Error(data && "error" in data && data.error ? data.error : "Nao foi possivel analisar os arquivos.");
  }

  if (!data) {
    throw new Error("A analise remota retornou uma resposta vazia.");
  }

  return data as RelatorioHonorariosGerado;
}

function relatorioLocalAposFalhaRemota(
  textos: TextoHonorariosExtraido[],
  nomes: string[],
  fallback: File[],
  error: unknown
) {
  const falhas: FalhaArquivoHonorarios[] = fallback.map((file) => ({
    nome: file.name,
    detalhe: detalheErro(error, "Fallback remoto indisponivel para este anexo."),
  }));

  return montarRelatorioHonorariosDeTextos(textos, nomes, falhas);
}

export async function analisarArquivosNoNavegador(files: File[]) {
  const pdfs = files.filter(arquivoEhPdf);
  const imagens = files.filter((file) => !arquivoEhPdf(file) && arquivoEhImagem(file));
  const fallback = files.filter((file) => !arquivoEhPdf(file) && !arquivoEhImagem(file));
  const nomes = files.map((file) => file.name);
  const textos: TextoHonorariosExtraido[] = [];

  const pdfsProcessados = await extrairTextosPdf(pdfs);
  textos.push(...pdfsProcessados.textos);
  fallback.push(...pdfsProcessados.falhas.map((falha) => falha.arquivo));

  const imagensProcessadas = await extrairTextosImagem(imagens);
  textos.push(...imagensProcessadas.textos);
  fallback.push(...imagensProcessadas.falhas.map((falha) => falha.arquivo));

  if (fallback.length) {
    try {
      return await analisarNoServidor(fallback, textos);
    } catch (error) {
      try {
        return relatorioLocalAposFalhaRemota(textos, nomes, fallback, error);
      } catch {
        throw error;
      }
    }
  }

  return montarRelatorioHonorariosDeTextos(textos, nomes);
}
