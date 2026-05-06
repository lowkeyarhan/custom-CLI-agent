export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ConversationHistory {
  messages: Message[];
  timestamp: string;
}

export interface UsageStats {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens?: number | null;
  ttftMs: number | null;
  totalMs: number;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface AgentConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  autoApprove: boolean;
  maxIterations: number;
  conversationFile: string;
}

export interface SessionStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  iterations: number;
  totalMs: number;
}
