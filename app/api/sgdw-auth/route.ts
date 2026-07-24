import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fixed 16-byte XOR key used by SGDW to encode passwords (max 8 chars → 16 stored chars).
// Derived from: for each pwd char at position i, stored[2i] = charCode ^ KEY[2i], stored[2i+1] = charCode ^ KEY[2i+1].
const SGDW_XOR_KEY = [42, 46, 68, 69, 42, 40, 74, 49, 30, 127, 99, 6, 27, 97, 11, 11];

function sgdwEncode(pwd: string): string {
  let result = "";
  const len = Math.min(pwd.length, 8);
  for (let i = 0; i < len; i++) {
    const c = pwd.charCodeAt(i);
    result += String.fromCharCode(c ^ SGDW_XOR_KEY[2 * i]);
    result += String.fromCharCode(c ^ SGDW_XOR_KEY[2 * i + 1]);
  }
  return result;
}

async function queryViaRelay(
  request: Request,
  sql: string,
  params: unknown[]
): Promise<{ result: { rows: Record<string, unknown>[] } | null; relayError: string | null }> {
  const host  = request.headers.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const relay = `${proto}://${host}/api/sgdw-relay`;

  try {
    const r = await fetch(relay, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sql, params }),
      signal:  AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({})) as { error?: string };
      return { result: null, relayError: body.error ?? null };
    }
    const data = await r.json() as { rows: Record<string, unknown>[] };
    return { result: data, relayError: null };
  } catch {
    return { result: null, relayError: null };
  }
}

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json() as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  const { username, password } = body;
  if (!username?.trim() || !password) {
    return NextResponse.json({ ok: false, error: "Informe usuario e senha." }, { status: 400 });
  }

  const { result, relayError } = await queryViaRelay(
    request,
    `SELECT FIRST 1 USUNUMER, TRIM(USUNOMES) AS USUNOMES, TRIM(USUSENHA) AS USUSENHA
     FROM tbusuar
     WHERE TRIM(UPPER(USUNOMES)) = UPPER(TRIM(?))
       AND USUATIVO = 1`,
    [username.trim()]
  );

  if (!result) {
    const msg = relayError ?? "SGDW indisponivel. Verifique se o iniciar.bat esta rodando no servidor.";
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }

  const row = result.rows?.[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "Usuario ou senha invalidos." });
  }

  const stored   = String(row.USUSENHA ?? "");
  const nomeReal = String(row.USUNOMES ?? username);
  const encoded  = sgdwEncode(password);

  if (stored !== encoded && stored !== password) {
    return NextResponse.json({ ok: false, error: "Usuario ou senha invalidos." });
  }

  return NextResponse.json({
    ok:   true,
    user: { id: Number(row.USUNUMER), nome: nomeReal },
  });
}
