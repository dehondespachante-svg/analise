import { carregarAnaliseDadosLocais } from "@/src/features/dados-locais/server";
import type { FiltroListaLocal } from "@/src/features/dados-locais/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("lista");
  const filtro: FiltroListaLocal = value === "oficial" || value === "digital" ? value : "todas";

  return Response.json(await carregarAnaliseDadosLocais(filtro), {
    headers: { "Cache-Control": "no-store" },
  });
}
