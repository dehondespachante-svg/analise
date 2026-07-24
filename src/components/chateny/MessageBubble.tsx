"use client";

import type { Message } from "./types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  msg: Message;
}

export function MessageBubble({ msg }: Props) {
  const isOutgoing = msg.origem === "atendente";
  const isSystem = msg.origem === "sistema";

  if (isSystem) {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
        <span style={{
          background: "rgba(15,23,42,.06)",
          color: "#64748b", fontSize: "0.7rem",
          padding: "4px 14px", borderRadius: 12,
          border: "1px solid rgba(15,23,42,.07)",
        }}>
          {msg.texto}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: isOutgoing ? "flex-end" : "flex-start", margin: "3px 0" }}>
      {!isOutgoing && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg,#25d366,#128c7e)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: "0.7rem", fontWeight: 700,
          flexShrink: 0, marginRight: 8, alignSelf: "flex-end",
          boxShadow: "0 2px 6px rgba(37,211,102,.25)",
        }}>
          C
        </div>
      )}
      <div style={{
        maxWidth: "65%",
        padding: "9px 13px 7px",
        borderRadius: isOutgoing ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        background: isOutgoing
          ? "linear-gradient(135deg,rgba(16,185,129,.15),rgba(5,150,105,.1))"
          : "rgba(255,255,255,.9)",
        border: isOutgoing
          ? "1px solid rgba(16,185,129,.2)"
          : "1px solid rgba(15,23,42,.08)",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      }}>
        <p style={{
          margin: 0,
          color: isOutgoing ? "#065f46" : "#1e293b",
          fontSize: "0.875rem",
          lineHeight: 1.55,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}>
          {msg.texto}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4, gap: 4, alignItems: "center" }}>
          <span style={{ color: isOutgoing ? "#6ee7b7" : "#94a3b8", fontSize: "0.63rem" }}>
            {formatTime(msg.timestamp)}
          </span>
          {isOutgoing && (
            <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
              <path d="M1 5.5l3.5 4L14.5 1" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 5.5l3.5 4" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
