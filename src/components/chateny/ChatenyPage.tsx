"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, Message, QueueStatus } from "./types";
import { Sidebar } from "./Sidebar";
import { ChatWindow } from "./ChatWindow";
import { ContactPanel } from "./ContactPanel";

type FilterTab = "todas" | "minhas" | "sem_atendente";

interface QueueItem {
  id: string;
  nome: string;
  telefone: string;
  mensagem: string;
  status: QueueStatus;
  recebidoEm: string;
  atualizadoEm: string;
  origem: "webhook" | "teste";
}

interface QueueResponse {
  itens: QueueItem[];
}

function toConversation(item: QueueItem): Conversation {
  return {
    id: item.id,
    nome: item.nome,
    telefone: item.telefone,
    status: item.status,
    naoLidas: item.status === "novo" ? 1 : 0,
    ultimaMensagem: item.mensagem,
    atualizadoEm: item.atualizadoEm,
    criadoEm: item.recebidoEm,
    origem: item.origem,
    fila: "Suporte",
    tags: [],
  };
}

const CSS = `
@keyframes orb-a{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-80px)}}
@keyframes orb-b{0%,100%{transform:translate(0,0)}50%{transform:translate(-50px,60px)}}
@keyframes orb-c{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,40px)}}
@keyframes fade-chat{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.ch-panel{animation:fade-chat .3s ease both}
.ch-item:hover{background:rgba(16,185,129,.06)!important}
`;

function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", background: "#f0f4f8" }}>
      <div style={{
        position: "absolute", width: 700, height: 700, left: "-12%", top: "-18%",
        background: "radial-gradient(circle,rgba(16,185,129,.13) 0%,transparent 60%)",
        animation: "orb-a 13s ease-in-out infinite", borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", width: 560, height: 560, right: "-8%", bottom: "5%",
        background: "radial-gradient(circle,rgba(100,116,139,.10) 0%,transparent 60%)",
        animation: "orb-b 16s ease-in-out infinite", borderRadius: "50%",
      }} />
      <div style={{
        position: "absolute", width: 420, height: 420, left: "38%", bottom: "-14%",
        background: "radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 60%)",
        animation: "orb-c 19s ease-in-out infinite", borderRadius: "50%",
      }} />
      {/* Grid de quadrados */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(15,23,42,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,.06) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }} />
    </div>
  );
}

export default function ChatenyPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [filter, setFilter] = useState<FilterTab>("todas");
  const [statusFilter, setStatusFilter] = useState<QueueStatus | "todas">("todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const localTagsRef = useRef<Record<string, string[]>>({});

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/gupshup-fila", { cache: "no-store" });
      const data = (await res.json()) as QueueResponse;
      setConversations(
        data.itens.map((item) => {
          const conv = toConversation(item);
          conv.tags = localTagsRef.current[item.id] ?? [];
          return conv;
        })
      );
    } catch {
      // silently ignore poll errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
    const id = window.setInterval(fetchConversations, 3000);
    return () => window.clearInterval(id);
  }, [fetchConversations]);

  const loadMessages = useCallback(async (conversaId: string) => {
    if (messages[conversaId]) return;
    const res = await fetch(`/api/chateny-messages?conversaId=${conversaId}`, { cache: "no-store" });
    const data = (await res.json()) as Message[];

    const conv = conversations.find((c) => c.id === conversaId);
    const syntheticFirst: Message | null = conv
      ? {
          id: `init-${conversaId}`,
          conversaId,
          texto: conv.ultimaMensagem,
          origem: "cliente",
          timestamp: conv.criadoEm,
          lida: true,
        }
      : null;

    const combined = syntheticFirst ? [syntheticFirst, ...data] : data;
    setMessages((prev) => ({ ...prev, [conversaId]: combined }));
  }, [messages, conversations]);

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id);
    await loadMessages(id);
  }, [loadMessages]);

  const handleSend = useCallback(async (text: string) => {
    if (!selectedId) return;
    setSending(true);

    const newMsg: Message = {
      id: `tmp-${Date.now()}`,
      conversaId: selectedId,
      texto: text,
      origem: "atendente",
      timestamp: new Date().toISOString(),
      lida: true,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), newMsg],
    }));

    try {
      const res = await fetch("/api/chateny-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: selectedId, texto: text, origem: "atendente" }),
      });
      if (res.ok) {
        const { message } = (await res.json()) as { message: Message };
        setMessages((prev) => ({
          ...prev,
          [selectedId]: prev[selectedId].map((m) => (m.id === newMsg.id ? message : m)),
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedId ? { ...c, ultimaMensagem: text, atualizadoEm: message.timestamp } : c
          )
        );
      }
    } finally {
      setSending(false);
    }
  }, [selectedId]);

  const handleChangeStatus = useCallback(async (id: string, status: QueueStatus) => {
    await fetch("/api/gupshup-fila", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    const sysMsg: Message = {
      id: `sys-${Date.now()}`,
      conversaId: id,
      texto: `Status alterado para: ${status.replace("_", " ")}`,
      origem: "sistema",
      timestamp: new Date().toISOString(),
      lida: true,
    };
    setMessages((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), sysMsg] }));
  }, []);

  const handleAddTag = useCallback((id: string, tag: string) => {
    localTagsRef.current[id] = [...(localTagsRef.current[id] ?? []), tag];
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, tags: [...c.tags, tag] } : c))
    );
  }, []);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;
  const selectedMessages = selectedId ? (messages[selectedId] ?? []) : [];

  return (
    <>
      <style>{CSS}</style>
      <Background />

      <div style={{
        height: "100vh",
        display: "flex",
        position: "relative",
        zIndex: 1,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
        padding: 16,
        gap: 12,
        boxSizing: "border-box",
      }}>
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          filter={filter}
          statusFilter={statusFilter}
          search={search}
          loading={loading}
          onSelect={handleSelect}
          onFilterChange={setFilter}
          onStatusFilterChange={setStatusFilter}
          onSearchChange={setSearch}
        />

        <ChatWindow
          conv={selectedConv}
          messages={selectedMessages}
          sending={sending}
          onSend={handleSend}
          onChangeStatus={handleChangeStatus}
          onClose={() => setSelectedId(null)}
        />

        {selectedConv && (
          <ContactPanel
            conv={selectedConv}
            onChangeStatus={handleChangeStatus}
            onAddTag={handleAddTag}
          />
        )}
      </div>
    </>
  );
}
