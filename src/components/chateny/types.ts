export type QueueStatus = "novo" | "em_atendimento" | "respondido" | "arquivado";
export type MessageOrigin = "cliente" | "atendente" | "sistema";

export interface Conversation {
  id: string;
  nome: string;
  telefone: string;
  status: QueueStatus;
  naoLidas: number;
  ultimaMensagem: string;
  atualizadoEm: string;
  criadoEm: string;
  origem: "webhook" | "teste";
  fila: string;
  atendente?: string;
  tags: string[];
  email?: string;
  empresa?: string;
}

export interface Message {
  id: string;
  conversaId: string;
  texto: string;
  origem: MessageOrigin;
  timestamp: string;
  lida: boolean;
}

export const STATUS_LABEL: Record<QueueStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  respondido: "Respondido",
  arquivado: "Arquivado",
};

export const STATUS_COLOR: Record<QueueStatus, string> = {
  novo: "#10b981",
  em_atendimento: "#f59e0b",
  respondido: "#3b82f6",
  arquivado: "#6b7280",
};
