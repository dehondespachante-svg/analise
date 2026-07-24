"use client";

import type { Conversation } from "./types";
import { STATUS_COLOR, STATUS_LABEL } from "./types";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface Props {
  conv: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationItem({ conv, isSelected, onClick }: Props) {
  const initial = conv.nome.charAt(0).toUpperCase();
  const color = STATUS_COLOR[conv.status];

  return (
    <button
      className="ch-item"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: isSelected ? "rgba(16,185,129,.1)" : "transparent",
        borderLeft: `3px solid ${isSelected ? "#25d366" : "transparent"}`,
        border: "none",
        borderTop: "1px solid rgba(15,23,42,.05)",
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
        transition: "background .12s",
        fontFamily: "inherit",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "linear-gradient(135deg,#25d366,#128c7e)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 700, fontSize: "1.1rem",
        flexShrink: 0, position: "relative",
        boxShadow: "0 2px 8px rgba(37,211,102,.25)",
      }}>
        {initial}
        {conv.naoLidas > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 18, height: 18, borderRadius: "50%",
            background: "#059669", color: "white",
            fontSize: "0.62rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid white",
          }}>
            {conv.naoLidas > 9 ? "9+" : conv.naoLidas}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.84rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conv.nome}
          </span>
          <span style={{ color: "#94a3b8", fontSize: "0.68rem", flexShrink: 0, marginLeft: 4 }}>
            {timeAgo(conv.atualizadoEm)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#64748b", fontSize: "0.74rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {conv.ultimaMensagem}
          </span>
          <span style={{
            padding: "2px 7px", borderRadius: 10,
            fontSize: "0.6rem", fontWeight: 600,
            background: color + "18", color,
            border: `1px solid ${color}33`, flexShrink: 0,
          }}>
            {STATUS_LABEL[conv.status]}
          </span>
        </div>
      </div>
    </button>
  );
}
