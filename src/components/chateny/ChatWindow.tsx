"use client";

import { useEffect, useRef } from "react";
import type { Conversation, Message, QueueStatus } from "./types";
import { STATUS_COLOR, STATUS_LABEL } from "./types";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,.78)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(15,23,42,.08)",
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04)",
};

interface Props {
  conv: Conversation | null;
  messages: Message[];
  sending: boolean;
  onSend: (text: string) => void;
  onChangeStatus: (id: string, status: QueueStatus) => void;
  onClose: () => void;
}

export function ChatWindow({ conv, messages, sending, onSend, onChangeStatus, onClose }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!conv) {
    return (
      <div className="ch-panel" style={{
        ...GLASS,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        gap: 16,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(16,185,129,.08)",
          border: "2px solid rgba(16,185,129,.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="rgba(16,185,129,.4)">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.999 0C5.373 0 0 5.373 0 12c0 2.125.556 4.119 1.526 5.845L.057 23.999l6.306-1.654A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.626 0 11.999 0zm.001 21.818a9.814 9.814 0 0 1-5.006-1.367l-.359-.214-3.722.976.993-3.624-.234-.373A9.817 9.817 0 0 1 2.182 12c0-5.42 4.399-9.818 9.818-9.818S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, color: "#334155", fontSize: "0.9rem", fontWeight: 500 }}>Selecione uma conversa</p>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>Escolha um contato na lista à esquerda</p>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLOR[conv.status];

  return (
    <div className="ch-panel" style={{
      ...GLASS,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(15,23,42,.07)",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        background: "rgba(255,255,255,.6)",
        borderRadius: "16px 16px 0 0",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg,#25d366,#128c7e)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: "1rem", flexShrink: 0,
          boxShadow: "0 2px 8px rgba(37,211,102,.3)",
        }}>
          {conv.nome.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.9rem" }}>{conv.nome}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 10,
              fontSize: "0.6rem", fontWeight: 600,
              background: statusColor + "18", color: statusColor,
              border: `1px solid ${statusColor}33`,
            }}>
              {STATUS_LABEL[conv.status]}
            </span>
          </div>
          <span style={{ color: "#64748b", fontSize: "0.74rem" }}>
            {conv.telefone} · WhatsApp · {conv.fila}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {conv.status !== "em_atendimento" && (
            <ActionBtn label="Atender" color="#059669" onClick={() => onChangeStatus(conv.id, "em_atendimento")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </ActionBtn>
          )}
          {conv.status !== "respondido" && (
            <ActionBtn label="Encerrar" color="#f59e0b" onClick={() => onChangeStatus(conv.id, "respondido")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </ActionBtn>
          )}
          <ActionBtn label="Fechar painel" color="#94a3b8" onClick={onClose}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </ActionBtn>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: "rgba(248,250,252,.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <span style={{
            background: "rgba(15,23,42,.06)",
            color: "#64748b", fontSize: "0.67rem",
            padding: "3px 12px", borderRadius: 10,
            border: "1px solid rgba(15,23,42,.07)",
          }}>
            {new Date(conv.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>

        {messages.length === 0 && !sending && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem", marginTop: 40 }}>
            Nenhuma mensagem nesta conversa ainda.
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "4px 0" }}>
            <div style={{
              padding: "8px 14px",
              borderRadius: "16px 4px 16px 16px",
              background: "rgba(16,185,129,.08)",
              border: "1px solid rgba(16,185,129,.15)",
              color: "#94a3b8", fontSize: "0.78rem",
            }}>
              Enviando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput disabled={false} onSend={onSend} />
    </div>
  );
}

function ActionBtn({ label, color, onClick, children }: {
  label: string; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        padding: "6px 10px",
        background: color + "12",
        border: `1px solid ${color}28`,
        borderRadius: 8,
        color,
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 4,
        fontSize: "0.72rem", fontWeight: 600, fontFamily: "inherit",
        transition: "background .12s",
      }}
    >
      {children}
    </button>
  );
}
