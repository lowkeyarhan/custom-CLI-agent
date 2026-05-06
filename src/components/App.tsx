import React, { useState, useEffect } from "react";
import { Box, Text, Static } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { UI, UIMessage } from "../ui.js";
import { Agent } from "../agent.js";
import { AgentConfig } from "../types.js";

const BANNER = `
   __    _____ _ _ _ _  _______   __ _  _  _  _   _ 
  |  |  |     | | | | ||    ___| |  | || || || \\ | |
  |  |__|  |  | | | | ||    ___| |     || || |  \\| |
  |_____|_____|_______||_______| |__|__||_||_|_|\\__|
`;

const COMMANDS = ["/help", "/setup", "/clear", "/exit", "/models"];

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
  const [isChangingModel, setIsChangingModel] = useState(false);
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
    if (initialTask) executeTask(initialTask);

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
    const trimmed = query.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    setInput("");

    // --- LOCAL COMMAND INTERCEPTION ---
    if (lower === "/exit") process.exit(0);
    if (lower === "/clear") {
      await agent.clearHistory();
      UI.clear();
      return;
    }
    if (lower === "/setup") {
      UI.info(
        "Restart with 'lowkeyarhan --setup' to reconfigure provider/keys.",
      );
      return;
    }
    if (lower === "/models") {
      setIsChangingModel(true);
      return;
    }
    if (lower === "/help") {
      UI.info(`Available: ${COMMANDS.join(", ")}`);
      return;
    }

    await executeTask(trimmed);
  };

  const handleModelChange = (newModel: string) => {
    if (newModel.trim()) {
      config.model = newModel.trim();
      agent.updateConfig(config);
      UI.info(`Model set to: ${config.model}`);
    }
    setIsChangingModel(false);
    setInput("");
  };

  const handleConfirm = (val: string) => {
    const allow = val.toLowerCase() === "y" || val.toLowerCase() === "yes";
    setInput("");
    UI.submitConfirmation(allow);
  };

  // Live Suggestions logic
  const showSuggestions = input.startsWith("/");
  const suggestions = COMMANDS.filter((c) => c.startsWith(input.toLowerCase()));

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* Persistent Banner */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="#AAAAAA" bold>
          {BANNER}
        </Text>
        <Box
          borderStyle="round"
          borderColor="#333333"
          paddingX={1}
          flexDirection="row"
          gap={3}
        >
          <Text color="#666666">v1.1.0</Text>
          <Text color="#FFFFFF" bold>
            {config.model}
          </Text>
          <Text color="#666666">{config.baseURL.replace("https://", "")}</Text>
        </Box>
      </Box>

      {/* Message History */}
      <Box flexDirection="column" marginTop={1}>
        {messages.map((msg, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            {msg.role === "user" && (
              <Box flexDirection="column">
                <Text color="#444">
                  ╭─{" "}
                  <Text bold color="#FFF">
                    Task
                  </Text>
                </Text>
                <Text color="#444">
                  │ <Text color="#FFF">{msg.content}</Text>
                </Text>
                <Text color="#444">╰─</Text>
              </Box>
            )}
            {msg.role === "assistant" && (
              <Box flexDirection="column">
                {msg.reasoning && (
                  <Box paddingX={1} borderStyle="single" borderColor="#222">
                    <Text italic color="#555">
                      {msg.reasoning}
                    </Text>
                  </Box>
                )}
                {msg.content && <Text color="#DDD">{msg.content}</Text>}
              </Box>
            )}
            {msg.role === "tools" &&
              msg.items.map((tool, j) => (
                <Text key={j} color="#888">
                  {" "}
                  {tool.status === "running" ? "⚙" : "✓"}{" "}
                  {tool.name.replace("_", " ")}
                </Text>
              ))}
            {msg.role === "info" && <Text color="#888"> ℹ {msg.content}</Text>}
          </Box>
        ))}

        {/* Live Thought Stream */}
        {currentReasoning && (
          <Box
            paddingX={1}
            borderStyle="single"
            borderColor="#222"
            marginBottom={1}
          >
            <Text italic color="#555">
              thinking: {currentReasoning}
            </Text>
          </Box>
        )}

        {/* Live Content Stream */}
        {currentStream && <Text color="#EEE">{currentStream}</Text>}

        {isThinking && !currentStream && !currentReasoning && (
          <Box>
            <Text color="#666">
              <Spinner type="dots" /> thinking...
            </Text>
          </Box>
        )}
      </Box>

      {/* Claude Code Style Interactive Input Area */}
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {showSuggestions && suggestions.length > 0 && (
          <Box paddingLeft={1} marginBottom={0}>
            <Text color="#666666">{suggestions.join("   ")}</Text>
          </Box>
        )}

        <Box
          borderStyle="round"
          borderColor={isAwaitingConfirmation ? "white" : "#444"}
          paddingX={1}
          width="100%"
        >
          {isAwaitingConfirmation ? (
            <Box>
              <Text color="#FFF" bold>
                {confirmationPrompt}{" "}
              </Text>
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={handleConfirm}
              />
            </Box>
          ) : isChangingModel ? (
            <Box>
              <Text color="#FFF" bold>
                New Model ID:{" "}
              </Text>
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={handleModelChange}
              />
            </Box>
          ) : (
            <Box width="100%">
              <Text color="#888" bold>
                ❯{" "}
              </Text>
              <Box paddingLeft={1} flexGrow={1}>
                <TextInput
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmit}
                  placeholder={
                    isThinking ? "" : "Ask a question or type / for commands..."
                  }
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
