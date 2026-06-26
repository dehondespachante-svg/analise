export type LinhaHonorario = {
  arquivo: string;
  ano: number;
  mes: number;
  codigo: number;
  servico: string;
  quantidade: number;
  valorOs: number;
  honorario: number;
  desconto: number;
  intervalo?: IntervaloFonte;
};

export type IntervaloFonte = {
  ano: number;
  anoFinal: number;
  mesNumero: number;
  mesFinal: number;
  diaInicial: number;
  diaFinal: number;
  inicio: string;
  fim: string;
  label: string;
  corte: string;
};

export type PdfLinhaPosicionada = {
  y: number;
  items: Array<{
    str: string;
    x: number;
  }>;
};

export type RelatorioHonorariosGerado = {
  resumo: Array<{
    indicador: string;
    valor2025: number;
    valor2026: number;
    variacao: number;
    tipo: string;
  }>;
  comparativo: Array<{
    mes: string;
    qtd2025: number;
    qtd2026: number;
    os2025: number;
    os2026: number;
    honorarios2025: number;
    honorarios2026: number;
    ticket2025: number;
    ticket2026: number;
    crescimentoHonorarios: number | null;
  }>;
  periodos: Array<{
    mes: string;
    label: string;
    quantidade: number;
    valorOs: number;
    honorarios: number;
    ticket: number;
    honorarioMedio: number;
    crescimentoHonorarios: number | null;
    meta30: number;
    atingiuMeta: boolean;
  }>;
  periodosImportados: Array<{
    ano: number;
    mesNumero: number;
    mes: string;
    label: string;
    arquivos: string[];
    intervalos: IntervaloFonte[];
    linhas: number;
    quantidade: number;
    valorOs: number;
    honorarios: number;
    ticket: number;
    honorarioMedio: number;
  }>;
  servicos: Array<{
    codigo: number;
    servico: string;
    qtd2025: number;
    qtd2026: number;
    honorarios2025: number;
    honorarios2026: number;
    valorOs2026: number;
    honorarioMedio2026: number;
    crescimento: number | null;
  }>;
  servicosPorPeriodo: Array<{
    codigo: number;
    servico: string;
    totalHonorarios: number;
    periodos: Array<{
      ano: number;
      mesNumero: number;
      label: string;
      quantidade: number;
      valorOs: number;
      honorarios: number;
      honorarioMedio: number;
    }>;
  }>;
  auditoria: Array<{
    arquivo: string;
    tipo: string;
    detalhe: string;
    valor: number;
    acao: string;
  }>;
  anos: { anterior: number; atual: number };
  comparacao: {
    tipo: "ano" | "mes";
    anteriorLabel: string;
    atualLabel: string;
    metaCrescimento: number;
  };
  camposDisponiveis: {
    valorOs: boolean;
  };
  arquivos: string[];
  totalLinhas: number;
};

const nomesMeses: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Mar\u00e7o",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

const mesesPorNome: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

export function brToFloat(valor: string) {
  return Number(valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
}

export function isBrNumber(valor: string) {
  return /^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$/.test(valor);
}

function splitMoneyTail(tail: string) {
  const limpo = tail.replace(/\s+/g, "");
  for (let i = 4; i < limpo.length - 3; i += 1) {
    const left = limpo.slice(0, i);
    const right = limpo.slice(i);
    if (isBrNumber(left) && isBrNumber(right)) {
      return { honorario: brToFloat(left), desconto: brToFloat(right) };
    }
  }
  return { honorario: 0, desconto: 0 };
}

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizarAno(ano: number) {
  return ano < 100 ? 2000 + ano : ano;
}

function doisDigitos(valor: number) {
  return String(valor).padStart(2, "0");
}

export function extrairIntervaloFonte(texto: string): IntervaloFonte | null {
  const periodo = texto.match(
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+a\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i
  );
  if (!periodo) return null;

  const diaInicial = Number(periodo[1]);
  const mesNumero = Number(periodo[2]);
  const ano = normalizarAno(Number(periodo[3]));
  const diaFinal = Number(periodo[4]);
  const mesFinal = Number(periodo[5]);
  const anoFinal = normalizarAno(Number(periodo[6]));

  if (
    !diaInicial ||
    !diaFinal ||
    mesNumero < 1 ||
    mesNumero > 12 ||
    mesFinal < 1 ||
    mesFinal > 12 ||
    diaInicial > 31 ||
    diaFinal > 31
  ) {
    return null;
  }

  const inicio = `${doisDigitos(diaInicial)}/${doisDigitos(mesNumero)}/${ano}`;
  const fim = `${doisDigitos(diaFinal)}/${doisDigitos(mesFinal)}/${anoFinal}`;

  return {
    ano,
    anoFinal,
    mesNumero,
    mesFinal,
    diaInicial,
    diaFinal,
    inicio,
    fim,
    label: `${inicio} a ${fim}`,
    corte: `${doisDigitos(diaInicial)}-${doisDigitos(diaFinal)}`,
  };
}

function parseMesAnoTexto(valor: string) {
  const normalizado = normalizarBusca(valor);
  const matchNome = normalizado.match(
    /\b(jan(?:eiro)?|fev(?:ereiro)?|mar(?:co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)\s*[\/_-]\s*(\d{2,4})\b/
  );

  if (matchNome) {
    return {
      mes: mesesPorNome[matchNome[1]] || 0,
      ano: normalizarAno(Number(matchNome[2])),
    };
  }

  const matchNumero = normalizado.match(/\b(\d{1,2})\s*[\/_-]\s*(\d{2,4})\b/);
  if (matchNumero) {
    return {
      mes: Number(matchNumero[1]),
      ano: normalizarAno(Number(matchNumero[2])),
    };
  }

  return null;
}

function formatarBrMoedaNumero(valor: number) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function extrairMesAno(nomeArquivo: string, texto: string) {
  const doNome = nomeArquivo.match(/(\d{1,2})[_-](\d{4})/);
  if (doNome) {
    return { mes: Number(doNome[1]), ano: Number(doNome[2]) };
  }

  const mesNomeArquivo = parseMesAnoTexto(nomeArquivo);
  if (mesNomeArquivo?.mes && mesNomeArquivo.ano) {
    return mesNomeArquivo;
  }

  const periodo = texto.match(/(\d{2})\/(\d{2})\/(\d{4})\s+a\s+\d{2}\/\d{2}\/\d{4}/i);
  if (periodo) {
    return { mes: Number(periodo[2]), ano: Number(periodo[3]) };
  }

  return { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() };
}

export function preservarPeriodoFonte(textoFonte: string, textoExtraido: string) {
  if (textoFonte === textoExtraido) return textoExtraido;

  const periodo = extrairIntervaloFonte(textoFonte);
  return periodo ? `${periodo.label}\n${textoExtraido}` : textoExtraido;
}

function compararPeriodo(a: { mes: number; ano: number }, b: { mes: number; ano: number }) {
  return a.ano - b.ano || a.mes - b.mes;
}

function itemEhMoeda(valor: string) {
  return /R\$\s*\d|\d{1,3}(?:\.\d{3})*,\d{2}/.test(valor);
}

function extrairPeriodoLinhaPdf(linha: PdfLinhaPosicionada) {
  for (const item of linha.items) {
    const periodo = parseMesAnoTexto(item.str);
    if (periodo?.mes && periodo.ano) return periodo;
  }
  return null;
}

function valorPorColuna(linha: PdfLinhaPosicionada, coluna: { min: number; max: number }, tipo: "quantidade" | "honorario") {
  const itens = linha.items.filter((item) => item.x >= coluna.min && item.x <= coluna.max);
  const valor = itens.find((item) => {
    const texto = item.str.trim();
    if (parseMesAnoTexto(texto)) return false;
    return tipo === "quantidade" ? /^\d+$/.test(texto) : itemEhMoeda(texto);
  })?.str;

  if (!valor) return 0;
  return tipo === "quantidade" ? Number(valor) : brToFloat(valor);
}

function itemPorFaixa(items: PdfLinhaPosicionada["items"], min: number, max: number, predicate?: (valor: string) => boolean) {
  return items.find((item) => item.x >= min && item.x <= max && (!predicate || predicate(item.str)))?.str;
}

function montarLinhaResumoServico(items: PdfLinhaPosicionada["items"]) {
  const ordenados = [...items].sort((a, b) => a.x - b.x);
  const codigo = itemPorFaixa(ordenados, 45, 70, (valor) => /^\d+$/.test(valor));
  const quantidade = itemPorFaixa(ordenados, 320, 370, (valor) => /^\d+$/.test(valor));
  const desconto = itemPorFaixa(ordenados, 385, 445, isBrNumber);
  const valorOs = itemPorFaixa(ordenados, 450, 505, isBrNumber);
  const honorario = itemPorFaixa(ordenados, 510, 570, isBrNumber);
  const servico = ordenados
    .filter((item) => item.x >= 85 && item.x <= 320)
    .map((item) => item.str)
    .join(" ")
    .trim();

  if (!codigo || !servico || !quantidade || !valorOs || !honorario || !desconto) return null;
  return `${codigo} ${servico} ${quantidade} ${valorOs} ${honorario}${desconto}`;
}

export function extrairTextoModeloResumoServico(linhasPdf: PdfLinhaPosicionada[]) {
  const linhasOrdenadas = [...linhasPdf].sort((a, b) => b.y - a.y);
  const linhas: string[] = [];
  const consumidas = new Set<number>();

  linhasOrdenadas.forEach((linha, index) => {
    if (consumidas.has(index)) return;

    const linhaDireta = montarLinhaResumoServico(linha.items);
    if (linhaDireta) {
      linhas.push(linhaDireta);
      return;
    }

    const proxima = linhasOrdenadas[index + 1];
    const temCodigo = linha.items.some((item) => item.x >= 45 && item.x <= 70 && /^\d+$/.test(item.str));
    const temQuantidade = linha.items.some((item) => item.x >= 320 && item.x <= 370 && /^\d+$/.test(item.str));
    if (!proxima || !temCodigo || !temQuantidade || Math.abs(linha.y - proxima.y) > 3) return;

    const combinada = montarLinhaResumoServico([...linha.items, ...proxima.items]);
    if (combinada) {
      linhas.push(combinada);
      consumidas.add(index + 1);
    }
  });

  return linhas.length ? linhas.join("\n") : null;
}

function montarParesDePeriodo(linhas: PdfLinhaPosicionada[], tipo: "quantidade" | "honorario") {
  const linhasComMes = linhas
    .filter((linha) => linha.items.some((item) => parseMesAnoTexto(item.str)))
    .filter((linha) => (tipo === "honorario" ? linha.items.some((item) => itemEhMoeda(item.str)) : !linha.items.some((item) => item.str.includes("R$"))))
    .sort((a, b) => b.y - a.y);

  const colunas = [
    { min: 40, max: 190 },
    { min: 195, max: 340 },
    { min: 350, max: 485 },
    { min: 500, max: 625 },
    { min: 640, max: 785 },
  ];

  const pares: Array<{
    anterior: { mes: number; ano: number; valores: number[] };
    atual: { mes: number; ano: number; valores: number[] };
  }> = [];

  for (let index = 0; index + 1 < linhasComMes.length; index += 2) {
    const primeira = linhasComMes[index];
    const segunda = linhasComMes[index + 1];
    const periodoPrimeira = extrairPeriodoLinhaPdf(primeira);
    const periodoSegunda = extrairPeriodoLinhaPdf(segunda);
    if (!periodoPrimeira || !periodoSegunda) continue;

    const linhaPrimeira = {
      ...periodoPrimeira,
      valores: colunas.map((coluna) => valorPorColuna(primeira, coluna, tipo)),
    };
    const linhaSegunda = {
      ...periodoSegunda,
      valores: colunas.map((coluna) => valorPorColuna(segunda, coluna, tipo)),
    };

    pares.push(
      compararPeriodo(linhaPrimeira, linhaSegunda) <= 0
        ? { anterior: linhaPrimeira, atual: linhaSegunda }
        : { anterior: linhaSegunda, atual: linhaPrimeira }
    );
  }

  return pares;
}

export function extrairTextoModeloDiferencaMes(linhasPdf: PdfLinhaPosicionada[]) {
  const paresQuantidade = montarParesDePeriodo(linhasPdf, "quantidade");
  const paresHonorario = montarParesDePeriodo(linhasPdf, "honorario");

  if (paresQuantidade.length < 2 || paresHonorario.length < 2) return null;

  const servicos = [
    { codigo: 9101, nome: "Transferencia", grupo: 0, coluna: 1 },
    { codigo: 9102, nome: "Primeiro emplacamento", grupo: 0, coluna: 2 },
    { codigo: 9103, nome: "ATPV", grupo: 0, coluna: 3 },
    { codigo: 9104, nome: "ATPV + ASS + COM", grupo: 0, coluna: 4 },
    { codigo: 9105, nome: "Licenciamento", grupo: 1, coluna: 0 },
    { codigo: 9106, nome: "Licenciamento Boleto", grupo: 1, coluna: 1 },
    { codigo: 9107, nome: "Processos Renave", grupo: 1, coluna: 2 },
    { codigo: 9108, nome: "Pagamento de Debitos", grupo: 1, coluna: 3 },
    { codigo: 9109, nome: "Alteracao Dados", grupo: 1, coluna: 4 },
  ];

  const montarLinha = (
    periodo: { mes: number; ano: number },
    codigo: number,
    servico: string,
    quantidade: number,
    honorario: number
  ) =>
    `${String(periodo.mes).padStart(2, "0")}/${periodo.ano} ${codigo} ${servico} ${Math.max(
      0,
      Math.round(quantidade)
    )} 0,00 ${formatarBrMoedaNumero(Math.max(0, honorario))} 0,00`;

  const linhas: string[] = [];
  let somaQuantidadeAnterior = 0;
  let somaQuantidadeAtual = 0;
  let somaHonorarioAnterior = 0;
  let somaHonorarioAtual = 0;

  servicos.forEach((servico) => {
    const quantidade = paresQuantidade[servico.grupo];
    const honorario = paresHonorario[servico.grupo];
    const qtdAnterior = quantidade.anterior.valores[servico.coluna] || 0;
    const qtdAtual = quantidade.atual.valores[servico.coluna] || 0;
    const honAnterior = honorario.anterior.valores[servico.coluna] || 0;
    const honAtual = honorario.atual.valores[servico.coluna] || 0;

    somaQuantidadeAnterior += qtdAnterior;
    somaQuantidadeAtual += qtdAtual;
    somaHonorarioAnterior += honAnterior;
    somaHonorarioAtual += honAtual;

    linhas.push(montarLinha(quantidade.anterior, servico.codigo, servico.nome, qtdAnterior, honAnterior));
    linhas.push(montarLinha(quantidade.atual, servico.codigo, servico.nome, qtdAtual, honAtual));
  });

  const totalQuantidadeAnterior = paresQuantidade[0].anterior.valores[0] || 0;
  const totalQuantidadeAtual = paresQuantidade[0].atual.valores[0] || 0;
  const totalHonorarioAnterior = paresHonorario[0].anterior.valores[0] || 0;
  const totalHonorarioAtual = paresHonorario[0].atual.valores[0] || 0;
  const outrosQuantidadeAnterior = Math.max(0, totalQuantidadeAnterior - somaQuantidadeAnterior);
  const outrosQuantidadeAtual = Math.max(0, totalQuantidadeAtual - somaQuantidadeAtual);
  const outrosHonorarioAnterior = Math.max(0, totalHonorarioAnterior - somaHonorarioAnterior);
  const outrosHonorarioAtual = Math.max(0, totalHonorarioAtual - somaHonorarioAtual);

  if (outrosQuantidadeAnterior || outrosQuantidadeAtual || outrosHonorarioAnterior || outrosHonorarioAtual) {
    linhas.push(montarLinha(paresQuantidade[0].anterior, 9199, "Outros servicos", outrosQuantidadeAnterior, outrosHonorarioAnterior));
    linhas.push(montarLinha(paresQuantidade[0].atual, 9199, "Outros servicos", outrosQuantidadeAtual, outrosHonorarioAtual));
  }

  return linhas.length ? linhas.join("\n") : null;
}

function pct(novo: number, antigo: number) {
  if (!antigo) return novo ? null : 0;
  return (novo - antigo) / antigo;
}

function compararLinhas(a: LinhaHonorario, b: LinhaHonorario) {
  return (
    a.ano - b.ano ||
    a.mes - b.mes ||
    a.codigo - b.codigo ||
    a.servico.localeCompare(b.servico, "pt-BR") ||
    a.arquivo.localeCompare(b.arquivo, "pt-BR")
  );
}

export function parseLinhasHonorarios(texto: string, arquivo: string): LinhaHonorario[] {
  const { mes, ano } = extrairMesAno(arquivo, texto);
  const intervaloFonte = extrairIntervaloFonte(texto);

  return texto
    .split(/\r?\n/)
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .map((linha) => {
      const match = linha.match(
        /^(?:(\d{1,2})[\/_-](\d{2,4})\s+)?(\d+)\s+(.+?)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s+([\d.,\s]+)$/
      );
      if (!match) return null;

      const { honorario, desconto } = splitMoneyTail(match[7]);
      const quantidade = Number(match[5]);
      const valorOs = brToFloat(match[6]);
      const mesLinha = match[1] ? Number(match[1]) : mes;
      const anoLinha = match[2] ? normalizarAno(Number(match[2])) : ano;
      const intervalo =
        intervaloFonte && intervaloFonte.mesNumero === mesLinha && intervaloFonte.ano === anoLinha
          ? intervaloFonte
          : undefined;

      if (!quantidade || Number.isNaN(valorOs) || valorOs < 0) return null;

      return {
        arquivo,
        ano: anoLinha,
        mes: mesLinha,
        codigo: Number(match[3]),
        servico: match[4].trim(),
        quantidade,
        valorOs,
        honorario,
        desconto,
        ...(intervalo ? { intervalo } : {}),
      };
    })
    .filter(Boolean) as LinhaHonorario[];
}

export function montarRelatorio(linhas: LinhaHonorario[], arquivos: string[]): RelatorioHonorariosGerado {
  const linhasOrdenadas = [...linhas].sort(compararLinhas);
  const valorOsDisponivel = linhasOrdenadas.some((linha) => linha.valorOs > 0);
  const anosEncontrados = Array.from(new Set(linhas.map((linha) => linha.ano))).sort((a, b) => a - b);
  const atual = anosEncontrados[anosEncontrados.length - 1] || new Date().getFullYear();
  const anterior = anosEncontrados.length > 1 ? anosEncontrados[0] : atual - 1;
  const compararMesesMesmoAno = anosEncontrados.length === 1;
  const porMes = new Map<string, { qtd: number; os: number; hon: number }>();
  const fontesPorMes = new Map<
    string,
    { arquivos: Set<string>; intervalos: Map<string, IntervaloFonte>; linhas: number }
  >();
  const porServico = new Map<string, { codigo: number; servico: string; ano: number; qtd: number; os: number; hon: number }>();
  const porServicoPeriodo = new Map<
    string,
    { codigo: number; servico: string; ano: number; mes: number; qtd: number; os: number; hon: number }
  >();

  linhasOrdenadas.forEach((linha) => {
    const mesKey = `${linha.ano}-${linha.mes}`;
    const mesBucket = porMes.get(mesKey) || { qtd: 0, os: 0, hon: 0 };
    mesBucket.qtd += linha.quantidade;
    mesBucket.os += linha.valorOs;
    mesBucket.hon += linha.honorario;
    porMes.set(mesKey, mesBucket);

    const fontesMes = fontesPorMes.get(mesKey) || {
      arquivos: new Set<string>(),
      intervalos: new Map<string, IntervaloFonte>(),
      linhas: 0,
    };
    fontesMes.arquivos.add(linha.arquivo);
    if (linha.intervalo) {
      fontesMes.intervalos.set(linha.intervalo.label, linha.intervalo);
    }
    fontesMes.linhas += 1;
    fontesPorMes.set(mesKey, fontesMes);

    const servicoKey = `${linha.ano}-${linha.codigo}-${linha.servico}`;
    const servicoBucket =
      porServico.get(servicoKey) || {
        codigo: linha.codigo,
        servico: linha.servico,
        ano: linha.ano,
        qtd: 0,
        os: 0,
        hon: 0,
      };
    servicoBucket.qtd += linha.quantidade;
    servicoBucket.os += linha.valorOs;
    servicoBucket.hon += linha.honorario;
    porServico.set(servicoKey, servicoBucket);

    const servicoPeriodoKey = `${linha.ano}-${linha.mes}-${linha.codigo}-${linha.servico}`;
    const servicoPeriodoBucket =
      porServicoPeriodo.get(servicoPeriodoKey) || {
        codigo: linha.codigo,
        servico: linha.servico,
        ano: linha.ano,
        mes: linha.mes,
        qtd: 0,
        os: 0,
        hon: 0,
      };
    servicoPeriodoBucket.qtd += linha.quantidade;
    servicoPeriodoBucket.os += linha.valorOs;
    servicoPeriodoBucket.hon += linha.honorario;
    porServicoPeriodo.set(servicoPeriodoKey, servicoPeriodoBucket);
  });

  const periodoKeys = Array.from(porMes.keys()).sort((a, b) => {
    const [anoA, mesA] = a.split("-").map(Number);
    const [anoB, mesB] = b.split("-").map(Number);
    return anoA - anoB || mesA - mesB;
  });
  const periodosImportados = periodoKeys.map((key) => {
    const [ano, mesNumero] = key.split("-").map(Number);
    const bucket = porMes.get(key) || { qtd: 0, os: 0, hon: 0 };
    const fontes = fontesPorMes.get(key);

    return {
      ano,
      mesNumero,
      mes: nomesMeses[mesNumero] || String(mesNumero),
      label: `${nomesMeses[mesNumero] || String(mesNumero)} ${ano}`,
      arquivos: Array.from(fontes?.arquivos || []).sort((a, b) => a.localeCompare(b, "pt-BR")),
      intervalos: Array.from(fontes?.intervalos.values() || []).sort(
        (a, b) => a.ano - b.ano || a.mesNumero - b.mesNumero || a.diaInicial - b.diaInicial || a.diaFinal - b.diaFinal
      ),
      linhas: fontes?.linhas || 0,
      quantidade: bucket.qtd,
      valorOs: bucket.os,
      honorarios: bucket.hon,
      ticket: bucket.qtd ? bucket.os / bucket.qtd : 0,
      honorarioMedio: bucket.qtd ? bucket.hon / bucket.qtd : 0,
    };
  });

  const mesesPorAno = new Map<number, Set<number>>();
  periodosImportados.forEach((periodo) => {
    const mesesDoAno = mesesPorAno.get(periodo.ano) || new Set<number>();
    mesesDoAno.add(periodo.mesNumero);
    mesesPorAno.set(periodo.ano, mesesDoAno);
  });

  const mesesPareadosAno = Array.from(mesesPorAno.get(anterior) || [])
    .filter((mes) => mesesPorAno.get(atual)?.has(mes))
    .sort((a, b) => a - b);
  const comparacaoAnualPareada =
    anosEncontrados.length === 2 &&
    mesesPareadosAno.length > 0;
  const compararPeriodosSequenciais = compararMesesMesmoAno || !comparacaoAnualPareada;
  const labelPeriodoAnual = (ano: number) => {
    const primeiroMes = mesesPareadosAno[0];
    const ultimoMes = mesesPareadosAno[mesesPareadosAno.length - 1];
    const primeiroLabel = nomesMeses[primeiroMes] || String(primeiroMes);
    const ultimoLabel = nomesMeses[ultimoMes] || String(ultimoMes);
    return primeiroMes === ultimoMes ? `${primeiroLabel} ${ano}` : `${primeiroLabel} a ${ultimoLabel} ${ano}`;
  };

  const periodos = compararPeriodosSequenciais
    ? periodosImportados.map((periodo, index) => {
        const anteriorPeriodo = index > 0 ? periodosImportados[index - 1] : null;
        const crescimentoHonorarios = anteriorPeriodo ? pct(periodo.honorarios, anteriorPeriodo.honorarios) : null;

        return {
          mes: periodo.mes,
          label: periodo.label,
          quantidade: periodo.quantidade,
          valorOs: periodo.valorOs,
          honorarios: periodo.honorarios,
          ticket: periodo.ticket,
          honorarioMedio: periodo.honorarioMedio,
          crescimentoHonorarios,
          meta30: anteriorPeriodo ? anteriorPeriodo.honorarios * 1.3 : 0,
          atingiuMeta: crescimentoHonorarios !== null && crescimentoHonorarios >= 0.3,
        };
      })
    : mesesPareadosAno.map((mes, index) => {
        const bucket = porMes.get(`${atual}-${mes}`) || { qtd: 0, os: 0, hon: 0 };
        const mesAnterior = mesesPareadosAno[index - 1];
        const anteriorBucket = mesAnterior
          ? porMes.get(`${atual}-${mesAnterior}`) || { qtd: 0, os: 0, hon: 0 }
          : { qtd: 0, os: 0, hon: 0 };
        const crescimentoHonorarios = mesAnterior ? pct(bucket.hon, anteriorBucket.hon) : null;

        return {
          mes: nomesMeses[mes] || String(mes),
          label: `${nomesMeses[mes] || String(mes)} ${atual}`,
          quantidade: bucket.qtd,
          valorOs: bucket.os,
          honorarios: bucket.hon,
          ticket: bucket.qtd ? bucket.os / bucket.qtd : 0,
          honorarioMedio: bucket.qtd ? bucket.hon / bucket.qtd : 0,
          crescimentoHonorarios,
          meta30: anteriorBucket.hon ? anteriorBucket.hon * 1.3 : 0,
          atingiuMeta: crescimentoHonorarios !== null && crescimentoHonorarios >= 0.3,
        };
      });

  const comparativo = compararPeriodosSequenciais
    ? periodosImportados.map((periodo, index) => {
        const oldBucket = index > 0 ? periodosImportados[index - 1] : null;

        return {
          mes: periodo.label,
          qtd2025: oldBucket?.quantidade || 0,
          qtd2026: periodo.quantidade,
          os2025: oldBucket?.valorOs || 0,
          os2026: periodo.valorOs,
          honorarios2025: oldBucket?.honorarios || 0,
          honorarios2026: periodo.honorarios,
          ticket2025: oldBucket?.quantidade ? oldBucket.valorOs / oldBucket.quantidade : 0,
          ticket2026: periodo.quantidade ? periodo.valorOs / periodo.quantidade : 0,
          crescimentoHonorarios: pct(periodo.honorarios, oldBucket?.honorarios || 0),
        };
      })
    : mesesPareadosAno.map((mes) => {
        const oldBucket = porMes.get(`${anterior}-${mes}`) || { qtd: 0, os: 0, hon: 0 };
        const newBucket = porMes.get(`${atual}-${mes}`) || { qtd: 0, os: 0, hon: 0 };

        return {
          mes: nomesMeses[mes] || String(mes),
          qtd2025: oldBucket.qtd,
          qtd2026: newBucket.qtd,
          os2025: oldBucket.os,
          os2026: newBucket.os,
          honorarios2025: oldBucket.hon,
          honorarios2026: newBucket.hon,
          ticket2025: oldBucket.qtd ? oldBucket.os / oldBucket.qtd : 0,
          ticket2026: newBucket.qtd ? newBucket.os / newBucket.qtd : 0,
          crescimentoHonorarios: pct(newBucket.hon, oldBucket.hon),
        };
      });

  const primeiroPeriodo = periodosImportados[0];
  const ultimoPeriodo = periodosImportados[periodosImportados.length - 1];
  const totaisAtual = comparativo.reduce(
    (acc, item) => ({ qtd: acc.qtd + item.qtd2026, os: acc.os + item.os2026, hon: acc.hon + item.honorarios2026 }),
    { qtd: 0, os: 0, hon: 0 }
  );
  const totaisAnterior = compararPeriodosSequenciais
    ? { qtd: 0, os: 0, hon: 0 }
    : comparativo.reduce(
        (acc, item) => ({ qtd: acc.qtd + item.qtd2025, os: acc.os + item.os2025, hon: acc.hon + item.honorarios2025 }),
        { qtd: 0, os: 0, hon: 0 }
      );

  const resumo = [
    { indicador: "Quantidade total", valor2025: totaisAnterior.qtd, valor2026: totaisAtual.qtd, variacao: pct(totaisAtual.qtd, totaisAnterior.qtd) || 0, tipo: "numero" },
    { indicador: "Valor O.S. total", valor2025: totaisAnterior.os, valor2026: totaisAtual.os, variacao: pct(totaisAtual.os, totaisAnterior.os) || 0, tipo: "moeda" },
    { indicador: "Honorarios totais", valor2025: totaisAnterior.hon, valor2026: totaisAtual.hon, variacao: pct(totaisAtual.hon, totaisAnterior.hon) || 0, tipo: "moeda" },
    {
      indicador: "Ticket medio O.S.",
      valor2025: totaisAnterior.qtd ? totaisAnterior.os / totaisAnterior.qtd : 0,
      valor2026: totaisAtual.qtd ? totaisAtual.os / totaisAtual.qtd : 0,
      variacao: pct(totaisAtual.qtd ? totaisAtual.os / totaisAtual.qtd : 0, totaisAnterior.qtd ? totaisAnterior.os / totaisAnterior.qtd : 0) || 0,
      tipo: "moeda",
    },
    {
      indicador: "Honorario medio",
      valor2025: totaisAnterior.qtd ? totaisAnterior.hon / totaisAnterior.qtd : 0,
      valor2026: totaisAtual.qtd ? totaisAtual.hon / totaisAtual.qtd : 0,
      variacao: pct(totaisAtual.qtd ? totaisAtual.hon / totaisAtual.qtd : 0, totaisAnterior.qtd ? totaisAnterior.hon / totaisAnterior.qtd : 0) || 0,
      tipo: "moeda",
    },
  ];

  const servicosKeys = Array.from(new Set(Array.from(porServico.values()).map((item) => `${item.codigo}-${item.servico}`))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const servicos = servicosKeys
    .map((key) => {
      const [codigoTexto, ...servicoParts] = key.split("-");
      const codigo = Number(codigoTexto);
      const servico = servicoParts.join("-");
      const buscarServicoPeriodo = (periodo: typeof primeiroPeriodo) =>
        periodo
          ? porServicoPeriodo.get(`${periodo.ano}-${periodo.mesNumero}-${codigo}-${servico}`) || { qtd: 0, os: 0, hon: 0 }
          : { qtd: 0, os: 0, hon: 0 };
      const somarServicoPareado = (ano: number) =>
        mesesPareadosAno.reduce(
          (acc, mes) => {
            const bucket = porServicoPeriodo.get(`${ano}-${mes}-${codigo}-${servico}`);
            return {
              qtd: acc.qtd + (bucket?.qtd || 0),
              os: acc.os + (bucket?.os || 0),
              hon: acc.hon + (bucket?.hon || 0),
            };
          },
          { qtd: 0, os: 0, hon: 0 }
        );
      const oldBucket = compararPeriodosSequenciais
        ? buscarServicoPeriodo(primeiroPeriodo)
        : somarServicoPareado(anterior);
      const newBucket = compararPeriodosSequenciais
        ? buscarServicoPeriodo(ultimoPeriodo)
        : somarServicoPareado(atual);
      return {
        codigo,
        servico,
        qtd2025: oldBucket.qtd,
        qtd2026: newBucket.qtd,
        honorarios2025: oldBucket.hon,
        honorarios2026: newBucket.hon,
        valorOs2026: newBucket.os,
        honorarioMedio2026: newBucket.qtd ? newBucket.hon / newBucket.qtd : 0,
        crescimento: pct(newBucket.hon, oldBucket.hon),
      };
    })
    .sort((a, b) => b.honorarios2026 - a.honorarios2026)
    .slice(0, 12);
  const servicosPorPeriodo = servicosKeys
    .map((key) => {
      const [codigoTexto, ...servicoParts] = key.split("-");
      const codigo = Number(codigoTexto);
      const servico = servicoParts.join("-");
      const serie = periodosImportados.map((periodo) => {
        const bucket = porServicoPeriodo.get(`${periodo.ano}-${periodo.mesNumero}-${codigo}-${servico}`) || {
          qtd: 0,
          os: 0,
          hon: 0,
        };

        return {
          ano: periodo.ano,
          mesNumero: periodo.mesNumero,
          label: periodo.label,
          quantidade: bucket.qtd,
          valorOs: bucket.os,
          honorarios: bucket.hon,
          honorarioMedio: bucket.qtd ? bucket.hon / bucket.qtd : 0,
        };
      });

      return {
        codigo,
        servico,
        totalHonorarios: serie.reduce((acc, periodo) => acc + periodo.honorarios, 0),
        periodos: serie,
      };
    })
    .filter((servico) =>
      servico.periodos.some((periodo) => periodo.quantidade > 0 || periodo.valorOs > 0 || periodo.honorarios > 0)
    )
    .sort((a, b) => b.totalHonorarios - a.totalHonorarios);

  const auditoria = linhasOrdenadas
    .filter((linha) => {
      const participacao = linha.valorOs ? linha.honorario / linha.valorOs : 0;
      const honorarioMedio = linha.quantidade ? linha.honorario / linha.quantidade : 0;
      return participacao > 0.75 || (linha.quantidade >= 5 && honorarioMedio < 10);
    })
    .map((linha) => {
      const participacao = linha.valorOs ? linha.honorario / linha.valorOs : 0;
      const honorarioMedio = linha.quantidade ? linha.honorario / linha.quantidade : 0;
      const baixo = linha.quantidade >= 5 && honorarioMedio < 10;
      return {
        arquivo: linha.arquivo,
        tipo: baixo ? "Honorario medio baixo" : "Honorario muito alto sobre O.S.",
        detalhe: `${linha.codigo} - ${linha.servico}`,
        valor: baixo ? honorarioMedio : participacao,
        acao: baixo
          ? "Revisar se o servico esta sendo usado como repasse/baixo valor ou se ha perda de margem."
          : "Validar precificacao: honorario acima de 75% do valor da O.S.",
      };
    })
    .sort((a, b) => {
      const severidadeA = a.tipo === "Honorario muito alto sobre O.S." ? a.valor : 1 / Math.max(a.valor, 0.01);
      const severidadeB = b.tipo === "Honorario muito alto sobre O.S." ? b.valor : 1 / Math.max(b.valor, 0.01);
      return (
        severidadeB - severidadeA ||
        a.arquivo.localeCompare(b.arquivo, "pt-BR") ||
        a.detalhe.localeCompare(b.detalhe, "pt-BR")
      );
    })
    .slice(0, 10);

  const arquivosOrdenados = Array.from(new Set(arquivos)).sort((a, b) => {
    const periodoA = linhasOrdenadas.find((linha) => linha.arquivo === a);
    const periodoB = linhasOrdenadas.find((linha) => linha.arquivo === b);
    return (
      (periodoA?.ano || 0) - (periodoB?.ano || 0) ||
      (periodoA?.mes || 0) - (periodoB?.mes || 0) ||
      a.localeCompare(b, "pt-BR")
    );
  });

  return {
    resumo,
    comparativo,
    periodos,
    periodosImportados,
    servicos,
    servicosPorPeriodo,
    auditoria,
    anos: { anterior, atual },
    comparacao: {
      tipo: compararPeriodosSequenciais ? "mes" : "ano",
      anteriorLabel: compararPeriodosSequenciais ? primeiroPeriodo?.label || "-" : labelPeriodoAnual(anterior),
      atualLabel: compararPeriodosSequenciais ? ultimoPeriodo?.label || "-" : labelPeriodoAnual(atual),
      metaCrescimento: 0.3,
    },
    camposDisponiveis: {
      valorOs: valorOsDisponivel,
    },
    arquivos: arquivosOrdenados,
    totalLinhas: linhasOrdenadas.length,
  };
}
