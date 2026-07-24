import { promises as fs } from "fs";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";

const DATA_FILE = path.join(process.cwd(), "data", "chateny-messages.json");

interface ChatMessage {
  id: string;
  conversaId: string;
  texto: string;
  origem: "cliente" | "atendente" | "sistema";
  timestamp: string;
  lida: boolean;
}

async function readAll(): Promise<ChatMessage[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

async function saveAll(data: ChatMessage[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  const conversaId = new URL(req.url).searchParams.get("conversaId");
  const all = await readAll();
  const result = conversaId ? all.filter((m) => m.conversaId === conversaId) : all;
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { conversaId: string; texto: string; origem?: string };
  if (!body.conversaId || !body.texto) {
    return NextResponse.json({ ok: false, error: "Campos obrigatórios: conversaId, texto" }, { status: 400 });
  }
  const all = await readAll();
  const msg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversaId: body.conversaId,
    texto: body.texto,
    origem: (body.origem as ChatMessage["origem"]) ?? "atendente",
    timestamp: new Date().toISOString(),
    lida: false,
  };
  all.push(msg);
  await saveAll(all);
  return NextResponse.json({ ok: true, message: msg });
}

export async function DELETE(req: NextRequest) {
  const conversaId = new URL(req.url).searchParams.get("conversaId");
  if (!conversaId) return NextResponse.json({ ok: false, error: "conversaId obrigatório" }, { status: 400 });
  const all = await readAll();
  await saveAll(all.filter((m) => m.conversaId !== conversaId));
  return NextResponse.json({ ok: true });
}
