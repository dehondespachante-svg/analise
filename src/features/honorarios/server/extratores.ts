import "server-only";

import { randomUUID } from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";

import { extrairTextoHonorariosDoDocumentoPdf, type PdfDocumentLike } from "../processing/pdf-texto";

type PdfJsServer = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument(options: { data: Uint8Array; standardFontDataUrl: string }): { promise: Promise<PdfDocumentLike> };
};

const nativeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
let pdfJsPromise: Promise<PdfJsServer> | null = null;

function arquivoEhPdf(file: Pick<File, "name" | "type">) {
  return file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
}

function caminhoPdfJs(...segmentos: string[]) {
  return path.join(process.cwd(), "node_modules", "pdfjs-dist", ...segmentos);
}

async function carregarPdfJs() {
  pdfJsPromise ||= nativeImport(pathToFileURL(caminhoPdfJs("legacy", "build", "pdf.mjs")).href).then((modulo) => {
    const pdfjs = modulo as PdfJsServer;
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(caminhoPdfJs("legacy", "build", "pdf.worker.mjs")).href;
    return pdfjs;
  });

  return pdfJsPromise;
}

async function extrairTextoPdf(buffer: Buffer) {
  const pdfjs = await carregarPdfJs();
  const standardFontDataUrl = `${caminhoPdfJs("standard_fonts").replace(/\\/g, "/")}/`;
  const documento = await pdfjs
    .getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl,
    })
    .promise;

  return extrairTextoHonorariosDoDocumentoPdf(documento);
}

async function extrairTextoImagem(buffer: Buffer, nome: string) {
  const { createWorker } = await import("tesseract.js");
  const nomeSeguro = nome.replace(/[^\w.-]/g, "_") || "arquivo";
  const tempPath = path.join(os.tmpdir(), `honorarios-${randomUUID()}-${nomeSeguro}`);

  await fs.writeFile(tempPath, buffer);

  try {
    const worker = await createWorker("por");

    try {
      const result = await worker.recognize(tempPath);
      return result.data.text || "";
    } finally {
      await worker.terminate();
    }
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}

export async function extrairTextoArquivoNoServidor(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return arquivoEhPdf(file) ? extrairTextoPdf(buffer) : extrairTextoImagem(buffer, file.name || "arquivo");
}
