"use client";

import type { Conversation, QueueStatus } from "./types";
import { STATUS_COLOR, STATUS_LABEL } from "./types";
import { ConversationItem } from "./ConversationItem";

type FilterTab = "todas" | "minhas" | "sem_atendente";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "minhas", label: "Minhas" },
  { id: "sem_atendente", label: "Sem atend." },
];

const STATUS_FILTERS: (QueueStatus | "todas")[] = ["todas", "novo", "em_atendimento", "respondido", "arquivado"];

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  filter: FilterTab;
  statusFilter: QueueStatus | "todas";
  search: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onFilterChange: (f: FilterTab) => void;
  onStatusFilterChange: (s: QueueStatus | "todas") => void;
  onSearchChange: (s: string) => void;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,.82)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(15,23,42,.08)",
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04)",
};

export function Sidebar({
  conversations, selectedId, filter, statusFilter, search, loading,
  onSelect, onFilterChange, onStatusFilterChange, onSearchChange,
}: Props) {
  const filtered = conversations
    .filter((c) => {
      if (filter === "minhas" && !c.atendente) return false;
      if (filter === "sem_atendente" && c.atendente) return false;
      if (statusFilter !== "todas" && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.nome.toLowerCase().includes(q) || c.telefone.includes(q);
      }
      return true;
    })
    .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());

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
      {/* Header */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid rgba(15,23,42,.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg,#25d366,#128c7e)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.999 0C5.373 0 0 5.373 0 12c0 2.125.556 4.119 1.526 5.845L.057 23.999l6.306-1.654A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.626 0 11.999 0zm.001 21.818a9.814 9.814 0 0 1-5.006-1.367l-.359-.214-3.722.976.993-3.624-.234-.373A9.817 9.817 0 0 1 2.182 12c0-5.42 4.399-9.818 9.818-9.818S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
              </svg>
            </div>
            <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.05em" }}>
              CHATENY
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#25d366" }} />
            <span style={{ color: "#64748b", fontSize: "0.7rem" }}>Online</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar contato ou telefone..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(15,23,42,.05)",
              border: "1px solid rgba(15,23,42,.09)",
              borderRadius: 20,
              padding: "7px 12px 7px 32px",
              color: "#0f172a", fontSize: "0.8rem",
              outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(15,23,42,.07)" }}>
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onFilterChange(t.id)}
            style={{
              flex: 1, padding: "8px 4px",
              background: "none", border: "none",
              borderBottom: filter === t.id ? "2px solid #25d366" : "2px solid transparent",
              color: filter === t.id ? "#059669" : "#64748b",
              fontSize: "0.72rem", fontWeight: filter === t.id ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "color .12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status chips */}
      <div style={{
        display: "flex", gap: 5, padding: "8px 12px",
        overflowX: "auto", borderBottom: "1px solid rgba(15,23,42,.05)", flexShrink: 0,
      }}>
        {STATUS_FILTERS.map((s) => {
          const isActive = statusFilter === s;
          const color = s === "todas" ? "#64748b" : STATUS_COLOR[s];
          return (
            <button
              key={s}
              onClick={() => onStatusFilterChange(s)}
              style={{
                padding: "3px 10px", borderRadius: 12,
                fontSize: "0.64rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                background: isActive ? color + "18" : "transparent",
                border: `1px solid ${isActive ? color : "rgba(15,23,42,.1)"}`,
                color: isActive ? color : "#94a3b8",
                transition: "all .12s",
              }}
            >
              {s === "todas" ? "Todas" : STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
            Carregando...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
            Nenhuma conversa encontrada.
          </div>
        )}
        {filtered.map((c) => (
          <ConversationItem
            key={c.id}
            conv={c}
            isSelected={selectedId === c.id}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 14px",
        borderTop: "1px solid rgba(15,23,42,.07)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>
          {filtered.length} conversa{filtered.length !== 1 ? "s" : ""}
        </span>
        <span style={{ color: "#cbd5e1", fontSize: "0.66rem" }}>Digisac Sync ●</span>
      </div>
    </aside>
  );
}
