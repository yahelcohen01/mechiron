// PROTOTYPE — throwaway. See src/components/prototype/agent-chat/README.md

export type ToolPart = {
  type: 'tool';
  id: string;
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'running' | 'done';
};

export type ApprovalPart = {
  type: 'approval';
  id: string;
  toolName: string;
  summary: string;
  /** Human-readable rows shown to the person deciding. */
  lines: string[];
  status: 'pending' | 'approved' | 'denied';
};

export type TextPart = { type: 'text'; id: string; text: string };

export type Part = TextPart | ToolPart | ApprovalPart;

export type Message = {
  id: string;
  role: 'user' | 'agent';
  parts: Part[];
};

export type ChatController = {
  messages: Message[];
  isStreaming: boolean;
  /** True while the run is parked waiting on a human. */
  isWaiting: boolean;
  send: (text: string) => void;
  answerApproval: (partId: string, approved: boolean) => void;
  reset: () => void;
};

/** Every variant renders the same controller — that's the point of the comparison. */
export type VariantProps = {
  chat: ChatController;
  onClose: () => void;
};
