"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  disabled?: boolean;
  onSend: (text: string) => void;
}

export function MessageInput({ disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  }, [text, disabled, onSend]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, []);

  const canSend = !disabled && text.trim().length > 0;

  return (
    <div style={{
      padding: "10px 16px 12px",
      borderTop: "1px solid rgba(15,23,42,.07)",
      background: "rgba(255,255,255,.6)",
      display: "flex", alignItems: "flex-end", gap: 8,
      borderRadius: "0 0 16px 16px",
    }}>
      <IconBtn title="Anexar" disabled={disabled}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </IconBtn>

      <IconBtn title="Emoji" disabled={disabled}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </IconBtn>

      <IconBtn title="Respostas rápidas" disabled={disabled}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </IconBtn>

      <textarea
        ref={ref}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={disabled ? "Selecione uma conversa..." : "Digite uma mensagem... (Enter para enviar)"}
        rows={1}
        style={{
          flex: 1,
          background: "rgba(15,23,42,.05)",
          border: "1px solid rgba(15,23,42,.1)",
          borderRadius: 20,
          padding: "10px 16px",
          color: "#0f172a",
          fontSize: "0.875rem",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          lineHeight: 1.5,
          maxHeight: 120,
          overflow: "auto",
          opacity: disabled ? 0.5 : 1,
        }}
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        title="Enviar mensagem"
        style={{
          width: 40, height: 40, borderRadius: "50%",
          background: canSend
            ? "linear-gradient(135deg,#25d366,#128c7e)"
            : "rgba(15,23,42,.08)",
          border: "none",
          cursor: canSend ? "pointer" : "not-allowed",
          color: canSend ? "white" : "#94a3b8",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          transition: "background .15s",
          boxShadow: canSend ? "0 2px 8px rgba(37,211,102,.35)" : "none",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  );
}

function IconBtn({ children, disabled, title }: { children: React.ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      style={{
        background: "none", border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        color: "#94a3b8",
        padding: 6, flexShrink: 0,
        opacity: disabled ? 0.3 : 1,
        display: "flex", alignItems: "center",
        borderRadius: 8, transition: "color .12s",
      }}
    >
      {children}
    </button>
  );
}
