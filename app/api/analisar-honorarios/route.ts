import { NextResponse } from "next/server";

import {
  montarRelatorioHonorariosDeTextos,
  parseTextosExtraidos,
  SemLinhasHonorariosError,
  type FalhaArquivoHonorarios,
  type TextoHonorariosExtraido,
} from "@/src/features/honorarios/processing/relatorio";
import { extrairTextoArquivoNoServidor } from "@/src/features/honorarios/server/extratores";

export const runtime = "nodejs";
export const maxDuration = 60;

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && "name" in value && "arrayBuffer" in value;
}

function nomeArquivo(file: File) {
  return file.name || "arquivo";
}

function detalheErro(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Falha ao extrair texto deste anexo.";
}

async function extrairTextosArquivos(files: File[]) {
  const textos: TextoHonorariosExtraido[] = [];
  const falhas: FalhaArquivoHonorarios[] = [];

  for (const file of files) {
    try {
      textos.push({
        nome: nomeArquivo(file),
        texto: await extrairTextoArquivoNoServidor(file),
      });
    } catch (error) {
      console.error(`[analisar-honorarios:${nomeArquivo(file)}]`, error);
      falhas.push({
        nome: nomeArquivo(file),
        detalhe: detalheErro(error),
      });
    }
  }

  return { textos, falhas };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const arquivos = formData.getAll("arquivos").filter(isFile);
    const textosExtraidos = parseTextosExtraidos(formData.get("textos"));

    if (!arquivos.length && !textosExtraidos.length) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const processamento = await extrairTextosArquivos(arquivos);
    const relatorio = montarRelatorioHonorariosDeTextos(
      [...textosExtraidos, ...processamento.textos],
      [...textosExtraidos.map((texto) => texto.nome), ...arquivos.map(nomeArquivo)],
      processamento.falhas
    );

    return NextResponse.json(relatorio);
  } catch (error) {
    if (error instanceof SemLinhasHonorariosError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error("[analisar-honorarios]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao analisar arquivos." },
      { status: 500 }
    );
  }
}
