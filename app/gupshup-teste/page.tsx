"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

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

type QueueResponse = {
  resumo: {
    total: number;
    novo: number;
    emAtendimento: number;
    respondido: number;
    arquivado: number;
  };
  itens: QueueItem[];
};

const estadoInicial: QueueResponse = {
  resumo: {
    total: 0,
    novo: 0,
    emAtendimento: 0,
    respondido: 0,
    arquivado: 0,
  },
  itens: [],
};

const statusLabel: Record<QueueStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  respondido: "Respondido",
  arquivado: "Arquivado",
};

export default function GupshupTestePage() {
  const [fila, setFila] = useState<QueueResponse>(estadoInicial);
  const [nome, setNome] = useState("Cliente teste");
  const [telefone, setTelefone] = useState("554896579463");
  const [mensagem, setMensagem] = useState("Ola, preciso de atendimento.");
  const [statusTela, setStatusTela] = useState("Carregando fila de recebimento...");
  const [salvando, setSalvando] = useState(false);

  const metricas = useMemo(
    () => [
      { label: "Recebidas", valor: fila.resumo.total },
      { label: "Novas", valor: fila.resumo.novo },
      { label: "Atendimento", valor: fila.resumo.emAtendimento },
      { label: "Respondidas", valor: fila.resumo.respondido },
      { label: "Arquivadas", valor: fila.resumo.arquivado },
    ],
    [fila]
  );

  async function carregarFila() {
    const response = await fetch("/api/gupshup-fila", { cache: "no-store" });
    const data = await response.json() as QueueResponse;
    setFila(data);
    setStatusTela("Fila de recebimento ativa. Nenhuma mensagem e enviada por esta tela.");
  }

  useEffect(() => {
    let ativo = true;

    const tick = async () => {
      try {
        const response = await fetch("/api/gupshup-fila", { cache: "no-store" });
        const data = await response.json() as QueueResponse;
        if (ativo) {
          setFila(data);
          setStatusTela("Fila de recebimento ativa. Nenhuma mensagem e enviada por esta tela.");
        }
      } catch {
        if (ativo) setStatusTela("Nao foi possivel carregar a fila.");
      }
    };

    void tick();
    const interval = window.setInterval(tick, 3000);

    return () => {
      ativo = false;
      window.clearInterval(interval);
    };
  }, []);

  async function simularRecebida(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setStatusTela("Registrando mensagem recebida...");

    const response = await fetch("/api/gupshup-fila", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone, mensagem, origem: "teste" }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || data?.ok === false) {
      setStatusTela(data?.error || "Nao foi possivel registrar a mensagem recebida.");
      setSalvando(false);
      return;
    }

    setMensagem("Ola, preciso de atendimento.");
    setStatusTela("Mensagem recebida entrou na fila do atendente.");
    setSalvando(false);
    await carregarFila();
  }

  async function mudarStatus(id: string, status: QueueStatus) {
    await fetch("/api/gupshup-fila", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await carregarFila();
  }

  async function limparFila() {
    setStatusTela("Limpando fila...");
    await fetch("/api/gupshup-fila", { method: "DELETE" });
    await carregarFila();
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.header}>
          <span>Fila de recebimento</span>
          <h1>Atendimento WhatsApp</h1>
          <p>
            Visor isolado para mensagens recebidas. Ele mostra nome, telefone e texto para o atendente acompanhar a
            fila; nao existe envio de mensagem nesta tela.
          </p>
        </div>

        <div className={styles.readyBox}>
          <strong>Somente recebimento</strong>
          <small>{statusTela}</small>
        </div>

        <div className={styles.metrics}>
          {metricas.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.valor}</strong>
            </article>
          ))}
        </div>

        <form className={styles.form} onSubmit={simularRecebida}>
          <label>
            <span>Nome</span>
            <input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome do contato" />
          </label>
          <label>
            <span>Telefone WhatsApp</span>
            <input value={telefone} onChange={(event) => setTelefone(event.target.value)} inputMode="numeric" />
          </label>
          <label className={styles.fullField}>
            <span>Mensagem recebida</span>
            <textarea value={mensagem} onChange={(event) => setMensagem(event.target.value)} rows={4} />
          </label>
          <div className={styles.actions}>
            <button type="submit" disabled={salvando}>
              {salvando ? "Registrando..." : "Simular recebida"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={limparFila}>
              Limpar fila
            </button>
          </div>
        </form>

        <div className={styles.queue}>
          <div className={styles.queueHeader}>
            <strong>Fila do atendente</strong>
            <small>Atualiza a cada 3 segundos</small>
          </div>

          {fila.itens.length === 0 && <div className={styles.emptyQueue}>Nenhuma mensagem recebida.</div>}

          {fila.itens.map((item) => (
            <article className={`${styles.whatsItem} ${styles[item.status]}`} key={item.id}>
              <div className={styles.avatar}>{item.nome.slice(0, 1).toUpperCase()}</div>
              <div className={styles.chatBody}>
                <div className={styles.chatTop}>
                  <div>
                    <strong>{item.nome}</strong>
                    <small>{item.telefone}</small>
                  </div>
                  <span>{statusLabel[item.status]}</span>
                </div>
                <p>{item.mensagem}</p>
                <div className={styles.chatMeta}>
                  <small>{item.origem === "webhook" ? "Recebida via Gupshup" : "Teste local"}</small>
                  <small>{item.recebidoEm}</small>
                </div>
                <div className={styles.itemActions}>
                  <button type="button" onClick={() => mudarStatus(item.id, "em_atendimento")}>Atender</button>
                  <button type="button" onClick={() => mudarStatus(item.id, "respondido")}>Marcar respondida</button>
                  <button type="button" onClick={() => mudarStatus(item.id, "arquivado")}>Arquivar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
