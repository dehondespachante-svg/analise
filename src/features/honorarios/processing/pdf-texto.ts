import {
  extrairTextoModeloDiferencaMes,
  extrairTextoModeloResumoServico,
  preservarPeriodoFonte,
  type PdfLinhaPosicionada,
} from "@/src/lib/honorariosParser";

type PdfItemPosicionado = {
  str: string;
  x: number;
  y: number;
};

export type PdfPageLike = {
  getTextContent(): Promise<{ items: unknown[] }>;
};

export type PdfDocumentLike = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
};

function lerItemPosicionado(item: unknown): PdfItemPosicionado | null {
  if (!item || typeof item !== "object") return null;

  const record = item as Record<string, unknown>;
  const str = typeof record.str === "string" ? record.str.trim() : "";
  const transform = Array.isArray(record.transform) ? record.transform : [];
  if (!str) return null;

  return {
    str,
    x: Math.round(typeof transform[4] === "number" ? transform[4] : 0),
    y: Math.round(typeof transform[5] === "number" ? transform[5] : 0),
  };
}

function agruparLinhas(items: unknown[]): PdfLinhaPosicionada[] {
  const linhasPorY = new Map<number, PdfLinhaPosicionada["items"]>();

  items.forEach((item) => {
    const posicionado = lerItemPosicionado(item);
    if (!posicionado) return;

    const bucket = linhasPorY.get(posicionado.y) || [];
    bucket.push({ str: posicionado.str, x: posicionado.x });
    linhasPorY.set(posicionado.y, bucket);
  });

  return Array.from(linhasPorY.entries())
    .map(([y, linhaItems]) => ({
      y,
      items: [...linhaItems].sort((a, b) => a.x - b.x),
    }))
    .sort((a, b) => b.y - a.y);
}

export async function extrairTextoHonorariosDoDocumentoPdf(documento: PdfDocumentLike) {
  const linhasFonte: string[] = [];
  const linhasPdf: PdfLinhaPosicionada[] = [];

  for (let pageNumber = 1; pageNumber <= documento.numPages; pageNumber += 1) {
    const page = await documento.getPage(pageNumber);
    const content = await page.getTextContent();
    const linhasPagina = agruparLinhas(content.items);

    linhasPdf.push(...linhasPagina);
    linhasPagina.forEach((linha) => {
      linhasFonte.push(linha.items.map((item) => item.str).join(" "));
    });
  }

  const textoFonte = linhasFonte.join("\n");
  const textoExtraido =
    extrairTextoModeloResumoServico(linhasPdf) || extrairTextoModeloDiferencaMes(linhasPdf) || textoFonte;

  return preservarPeriodoFonte(textoFonte, textoExtraido);
}
