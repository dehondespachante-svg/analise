"use client";

import { useState } from "react";
import type { Conversation, QueueStatus } from "./types";
import { STATUS_COLOR, STATUS_LABEL } from "./types";

const FILA_OPTIONS: QueueStatus[] = ["novo", "em_atendimento", "respondido", "arquivado"];

const AI_SUGGESTIONS = [
  "Gostaria de verificar o status do seu processo. Poderia me informar o número do protocolo?",
  "Entendo sua situação. Vou verificar as informações para você agora mesmo.",
  "Agradeço o contato. Nossa equipe vai analisar e retornar em breve.",
];

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,.82)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(15,23,42,.08)",
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04)",
};

interface Props {
  conv: Conversation;
  onChangeStatus: (id: string, status: QueueStatus) => void;
  onAddTag: (id: string, tag: string) => void;
}

export function ContactPanel({ conv, onChangeStatus, onAddTag }: Props) {
  const [note, setNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [activeSection, setActiveSection] = useState<"contato" | "ia" | "historico">("contato");

  const handleAddTag = () => {
    const t = newTag.trim();
    if (t && !conv.tags.includes(t)) {
      onAddTag(conv.id, t);
      setNewTag("");
    }
  };

  return (
    <aside className="ch-panel" style={{
      ...GLASS,
      width: 300,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Section tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid rgba(15,23,42,.07)",
        background: "rgba(255,255,255,.6)",
        borderRadius: "16px 16px 0 0",
        flexShrink: 0,
      }}>
        {(["contato", "ia", "historico"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            style={{
              flex: 1, padding: "10px 4px",
              background: "none", border: "none",
              borderBottom: activeSection === s ? "2px solid #25d366" : "2px solid transparent",
              color: activeSection === s ? "#059669" : "#64748b",
              fontSize: "0.7rem", fontWeight: activeSection === s ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit",
              textTransform: "capitalize", transition: "color .12s",
            }}
          >
            {s === "ia" ? "IA" : s === "historico" ? "Histórico" : "Contato"}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px" }}>
        {activeSection === "contato" && (
          <>
            {/* Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16, paddingTop: 4 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg,#25d366,#128c7e)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: "1.4rem", marginBottom: 8,
                boxShadow: "0 4px 16px rgba(37,211,102,.3)",
              }}>
                {conv.nome.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "0.95rem" }}>{conv.nome}</span>
              <span style={{ color: "#64748b", fontSize: "0.75rem", marginTop: 2 }}>{conv.telefone}</span>
            </div>

            {/* Status */}
            <Section title="Status da conversa">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {FILA_OPTIONS.map((s) => {
                  const active = conv.status === s;
                  const c = STATUS_COLOR[s];
                  return (
                    <button
                      key={s}
                      onClick={() => onChangeStatus(conv.id, s)}
                      style={{
                        padding: "4px 10px", borderRadius: 10,
                        fontSize: "0.65rem", fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                        background: active ? c + "18" : "rgba(15,23,42,.04)",
                        border: `1px solid ${active ? c : "rgba(15,23,42,.08)"}`,
                        color: active ? c : "#64748b",
                        transition: "all .12s",
                      }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Info */}
            <Section title="Informações">
              <InfoRow icon="📱" label="Telefone" value={conv.telefone} />
              <InfoRow icon="📧" label="E-mail" value={conv.email ?? "—"} />
              <InfoRow icon="🏢" label="Empresa" value={conv.empresa ?? "—"} />
              <InfoRow icon="📂" label="Fila" value={conv.fila} />
              <InfoRow icon="👤" label="Atendente" value={conv.atendente ?? "Sem atendente"} />
              <InfoRow icon="🌐" label="Canal" value="WhatsApp" />
              <InfoRow icon="📥" label="Origem" value={conv.origem === "webhook" ? "Webhook Gupshup" : "Teste local"} />
            </Section>

            {/* Tags */}
            <Section title="Tags">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {conv.tags.length === 0 && (
                  <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Nenhuma tag</span>
                )}
                {conv.tags.map((tag) => (
                  <span key={tag} style={{
                    padding: "3px 10px", borderRadius: 10, fontSize: "0.68rem",
                    background: "rgba(16,185,129,.1)", color: "#059669",
                    border: "1px solid rgba(16,185,129,.2)",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Nova tag..."
                  style={{
                    flex: 1,
                    background: "rgba(15,23,42,.05)",
                    border: "1px solid rgba(15,23,42,.09)",
                    borderRadius: 8, padding: "5px 10px",
                    color: "#0f172a", fontSize: "0.75rem",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <button onClick={handleAddTag} style={{
                  padding: "5px 10px",
                  background: "rgba(16,185,129,.1)",
                  border: "1px solid rgba(16,185,129,.2)",
                  borderRadius: 8, color: "#059669",
                  fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit",
                }}>
                  +
                </button>
              </div>
            </Section>

            {/* Notes */}
            <Section title="Notas internas">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Adicione uma nota sobre esta conversa..."
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(15,23,42,.04)",
                  border: "1px solid rgba(15,23,42,.09)",
                  borderRadius: 8, padding: "8px 10px",
                  color: "#0f172a", fontSize: "0.78rem",
                  resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.5,
                }}
              />
              {note && (
                <button style={{
                  marginTop: 6, width: "100%", padding: "6px",
                  background: "rgba(16,185,129,.1)",
                  border: "1px solid rgba(16,185,129,.2)",
                  borderRadius: 8, color: "#059669",
                  fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit",
                }}>
                  Salvar nota
                </button>
              )}
            </Section>
          </>
        )}

        {activeSection === "ia" && (
          <Section title="Sugestões de resposta">
            <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: 10, lineHeight: 1.5 }}>
              Sugestões baseadas no contexto da conversa:
            </p>
            {AI_SUGGESTIONS.map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,.8)",
                border: "1px solid rgba(15,23,42,.08)",
                borderRadius: 10, padding: "10px 12px", marginBottom: 8,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                transition: "box-shadow .12s",
              }}>
                <p style={{ margin: 0, color: "#334155", fontSize: "0.78rem", lineHeight: 1.5 }}>{s}</p>
                <span style={{ color: "#059669", fontSize: "0.65rem", marginTop: 6, display: "block" }}>
                  Clique para usar →
                </span>
              </div>
            ))}
            <div style={{
              marginTop: 12, padding: "10px 12px",
              background: "rgba(124,58,237,.06)",
              border: "1px solid rgba(124,58,237,.15)",
              borderRadius: 10,
            }}>
              <p style={{ margin: 0, color: "#7c3aed", fontSize: "0.72rem", fontWeight: 600 }}>
                ✦ AI Hub — Agente: Suporte
              </p>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.7rem" }}>
                Handoff automático disponível. 3 agentes ativos.
              </p>
            </div>
          </Section>
        )}

        {activeSection === "historico" && (
          <Section title="Timeline">
            {[
              { time: conv.criadoEm, event: "Conversa iniciada", icon: "🟢" },
              { time: conv.atualizadoEm, event: `Status: ${STATUS_LABEL[conv.status]}`, icon: "🔄" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                <div>
                  <p style={{ margin: 0, color: "#334155", fontSize: "0.78rem" }}>{item.event}</p>
                  <span style={{ color: "#94a3b8", fontSize: "0.67rem" }}>
                    {new Date(item.time).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: "0 0 8px", color: "#94a3b8", fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <span style={{ color: "#94a3b8", fontSize: "0.67rem", display: "block" }}>{label}</span>
        <span style={{ color: "#334155", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
          {value}
        </span>
      </div>
    </div>
  );
}
