export const runtime = "nodejs";

type QueueStatus = "novo" | "em_atendimento" | "respondido" | "arquivado";

type QueueItem = {
  id: string;
  nome: string;
  telefone: string;
  mensagem: string;
  status: QueueStatus;
  recebidoEm: string;
  atualizadoEm: string;
  origem: "webhook" | "teste";
};

const fila: QueueItem[] = [];

function agora() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function somenteNumeros(valor: unknown) {
  return texto(valor).replace(/\D/g, "");
}

function extrairMensagem(body: Record<string, unknown>) {
  const payload = body.payload && typeof body.payload === "object" ? body.payload as Record<string, unknown> : {};
  const sender = payload.sender && typeof payload.sender === "object" ? payload.sender as Record<string, unknown> : {};
  const message = payload.message && typeof payload.message === "object" ? payload.message as Record<string, unknown> : {};

  return {
    nome: texto(body.nome) || texto(body.cliente) || texto(sender.name) || texto(sender.phone) || "Contato WhatsApp",
    telefone: somenteNumeros(body.telefone) || somenteNumeros(body.phone) || somenteNumeros(sender.phone) || somenteNumeros(sender.dial_code),
    mensagem:
      texto(body.mensagem) ||
      texto(body.message) ||
      texto(message.text) ||
      texto(payload.text) ||
      "Mensagem recebida sem texto.",
  };
}

function resumo() {
  return {
    total: fila.length,
    novo: fila.filter((item) => item.status === "novo").length,
    emAtendimento: fila.filter((item) => item.status === "em_atendimento").length,
    respondido: fila.filter((item) => item.status === "respondido").length,
    arquivado: fila.filter((item) => item.status === "arquivado").length,
  };
}

export async function GET() {
  return Response.json(
    {
      resumo: resumo(),
      itens: [...fila].reverse(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const dados = extrairMensagem(body || {});

  if (!dados.telefone) {
    return Response.json({ ok: false, error: "Informe o telefone recebido." }, { status: 400 });
  }

  const item: QueueItem = {
    id: `recv-${Date.now()}`,
    nome: dados.nome,
    telefone: dados.telefone,
    mensagem: dados.mensagem,
    status: "novo",
    recebidoEm: agora(),
    atualizadoEm: agora(),
    origem: texto(body?.origem) === "teste" ? "teste" : "webhook",
  };

  fila.push(item);
  return Response.json({ ok: true, item, resumo: resumo() }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { id?: string; status?: QueueStatus } | null;
  const statusPermitidos: QueueStatus[] = ["novo", "em_atendimento", "respondido", "arquivado"];
  const item = fila.find((entrada) => entrada.id === body?.id);

  if (!item || !body?.status || !statusPermitidos.includes(body.status)) {
    return Response.json({ ok: false, error: "Item ou status invalido." }, { status: 400 });
  }

  item.status = body.status;
  item.atualizadoEm = agora();

  return Response.json({ ok: true, item, resumo: resumo() });
}

export async function DELETE() {
  fila.length = 0;
  return Response.json({ ok: true, resumo: resumo() });
}
