import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { UI, UIMessage } from "../ui.js";
import { Agent } from "../agent.js";
import { AgentConfig } from "../types.js";

export function App({
  agent,
  config,
  initialTask,
}: {
  agent: Agent;
  config: AgentConfig;
  initialTask?: string;
}) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [currentStream, setCurrentStream] = useState("");
  const [currentReasoning, setCurrentReasoning] = useState("");
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [confirmationPrompt, setConfirmationPrompt] = useState("");

  useEffect(() => {
    const handleUpdate = () => {
      setMessages([...UI.messages]);
      setCurrentStream(UI.currentStream);
      setCurrentReasoning(UI.currentReasoning);
      setIsThinking(UI.isThinking);
      setIsAwaitingConfirmation(UI.isAwaitingConfirmation);
      setConfirmationPrompt(UI.confirmationPrompt);
    };

    UI.on("update", handleUpdate);

    if (initialTask) {
      executeTask(initialTask);
    } else {
      UI.messages.push({
        role: "assistant",
        content: "Hello! How can I assist you today?",
      });
      UI.emit("update");
    }

    return () => {
      UI.off("update", handleUpdate);
    };
  }, []);

  const executeTask = async (task: string) => {
    try {
      UI.taskStart(task);
      await agent.run(task);
    } catch (e: any) {
      UI.error(e.message);
    }
  };

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;
    const lower = query.trim().toLowerCase();

    if (lower === "/exit" || lower === "exit" || lower === "/quit") {
      process.exit(0);
    }
    if (lower === "/clear") {
      await agent.clearHistory();
      UI.clear();
      setInput("");
      return;
    }
    if (lower === "/help") {
      UI.messages.push({
        role: "assistant",
        content:
          "Commands:\n  /help    Show help\n  /clear   Clear history\n  /exit    Exit",
      });
      UI.emit("update");
      setInput("");
      return;
    }

    setInput("");
    await executeTask(query);
  };

  const handleConfirmSubmit = (val: string) => {
    const isYes = val.toLowerCase() === "y" || val.toLowerCase() === "yes";
    setInput("");
    UI.submitConfirmation(isYes);
  };

  const commands = ["/help", "/setup", "/clear", "/exit", "/quit"];
  const showSuggestions = input.startsWith("/");
  const suggestions = commands.filter((c) => c.startsWith(input.toLowerCase()));

  // Extract the hostname for a cleaner header display
  const providerDisplay = config.baseURL
    .replace("https://", "")
    .replace(/\/v1|\/api/g, "");

  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      {/* 1. Header Box (Claude Code Style) */}
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
        flexDirection="column"
      >
        <Text bold>
          🤖 lowkeyarhan <Text color="#888888">v1.1.0</Text>
        </Text>
        <Box flexDirection="row" gap={2}>
          <Text>
            <Text color="#888888">🔌 </Text>
            {providerDisplay}
          </Text>
          <Text>
            <Text color="#888888">🧠 </Text>
            {config.model}
          </Text>
        </Box>
      </Box>

      {/* 2. Messages List */}
      <Box flexDirection="column" paddingBottom={1}>
        {messages.map((msg, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            {msg.role === "user" && (
              <Box flexDirection="column">
                <Text color="#888888">
                  ╭─{" "}
                  <Text bold color="#FFFFFF">
                    Task
                  </Text>
                </Text>
                <Text color="#888888">
                  │ <Text color="#FFFFFF">{msg.content}</Text>
                </Text>
                <Text color="#888888">╰─</Text>
              </Box>
            )}
            {msg.role === "assistant" && (
              <Box flexDirection="column">
                {msg.reasoning && (
                  <Box
                    borderStyle="single"
                    borderColor="#444"
                    paddingX={1}
                    marginBottom={1}
                  >
                    <Text italic color="#888">
                      {msg.reasoning}
                    </Text>
                  </Box>
                )}
                {msg.content && <Text color="#FFFFFF">{msg.content}</Text>}
              </Box>
            )}
            {msg.role === "error" && (
              <Text color="#DD8888">Error: {msg.content}</Text>
            )}
            {msg.role === "tools" &&
              msg.items.map((tool, j) => (
                <Box key={j} flexDirection="row">
                  <Text color="#555555">
                    {tool.status === "running"
                      ? "  ⚙  "
                      : tool.status === "success"
                        ? "  ↳  "
                        : "  →  "}
                  </Text>
                  <Text color="#CCCCCC">{tool.name.replace(/_/g, " ")} </Text>
                  {tool.status === "running" && (
                    <Text color="#888888">
                      <Spinner type="dots" />
                    </Text>
                  )}
                  {tool.status === "success" && (
                    <Text color="#888888">
                      {tool.result
                        ? tool.result.substring(0, 50) +
                          (tool.result.length > 50 ? "..." : "")
                        : "Success"}
                    </Text>
                  )}
                  {tool.status === "error" && (
                    <Text color="#DD8888">Failed</Text>
                  )}
                </Box>
              ))}
            {msg.role === "stats" && (
              <Box flexDirection="column" marginTop={0}>
                <Text bold color="#FFFFFF">
                  {" "}
                  ✓ Task completed
                </Text>
                <Text color="#555555">
                  {`  ${msg.stats.iterations} steps │ ${msg.stats.totalInputTokens} in │ ${msg.stats.totalOutputTokens} out │ ${(msg.stats.totalMs / 1000).toFixed(1)}s`}
                </Text>
              </Box>
            )}
          </Box>
        ))}

        {/* 3. Live Streaming Status */}
        {currentReasoning && (
          <Box
            borderStyle="single"
            borderColor="#444"
            paddingX={1}
            marginBottom={1}
          >
            <Text italic color="#888">
              {currentReasoning}
            </Text>
          </Box>
        )}
        {currentStream && <Text color="#FFFFFF">{currentStream}</Text>}
        {isThinking && !currentStream && !currentReasoning && (
          <Box>
            <Text color="#888888">
              <Spinner type="dots" /> thinking...
            </Text>
          </Box>
        )}
      </Box>

      {/* 4. Input Box (Claude Code Boxy Textarea) */}
      {isAwaitingConfirmation ? (
        <Box borderStyle="round" borderColor="yellow" paddingX={1} width="100%">
          <Text bold color="#FFFFFF">
            {confirmationPrompt}{" "}
          </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleConfirmSubmit}
          />
        </Box>
      ) : (
        !isThinking && (
          <Box flexDirection="column">
            {showSuggestions && suggestions.length > 0 && (
              <Box paddingLeft={1} marginBottom={1}>
                <Text color="#888888">{suggestions.join("   ")}</Text>
              </Box>
            )}
            <Box
              borderStyle="round"
              borderColor="#555"
              paddingX={1}
              width="100%"
            >
              <Text bold color="#888888">
                ❯{" "}
              </Text>
              <Box paddingLeft={1}>
                <TextInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmit}
                />
              </Box>
            </Box>
          </Box>
        )
      )}
    </Box>
  );
}
