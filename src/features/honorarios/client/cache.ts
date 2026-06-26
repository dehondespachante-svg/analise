import "client-only";

import type { RelatorioHonorariosGerado } from "@/src/lib/honorariosParser";

const RELATORIO_CACHE_KEY = "honorarios:relatorio:v5";
const TEXTO_ARQUIVO_CACHE_PREFIX = "honorarios:file-text:v5:";

type ArquivoCacheavel = Pick<File, "lastModified" | "name" | "size">;

function cacheKeyArquivo(file: ArquivoCacheavel) {
  return `${TEXTO_ARQUIVO_CACHE_PREFIX}${file.name}:${file.size}:${file.lastModified}`;
}

export function carregarTextoArquivoCache(file: ArquivoCacheavel) {
  try {
    return window.localStorage.getItem(cacheKeyArquivo(file));
  } catch {
    return null;
  }
}

export function salvarTextoArquivoCache(file: ArquivoCacheavel, texto: string) {
  try {
    window.localStorage.setItem(cacheKeyArquivo(file), texto);
  } catch {
    // Cache local e opcional; a analise continua se o navegador negar espaco.
  }
}

export function salvarRelatorioCache(relatorio: RelatorioHonorariosGerado) {
  try {
    window.localStorage.setItem(
      RELATORIO_CACHE_KEY,
      JSON.stringify({
        relatorio,
        atualizadoEm: new Date().toISOString(),
      })
    );
  } catch {
    // Cache local e opcional; a analise continua se o navegador negar espaco.
  }
}

export function carregarRelatorioCache() {
  try {
    const raw = window.localStorage.getItem(RELATORIO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { relatorio?: RelatorioHonorariosGerado };
    return parsed.relatorio || null;
  } catch {
    return null;
  }
}

export function limparRelatorioCache() {
  try {
    window.localStorage.removeItem(RELATORIO_CACHE_KEY);
  } catch {
    // A interface fica limpa mesmo se o navegador bloquear storage.
  }
}
