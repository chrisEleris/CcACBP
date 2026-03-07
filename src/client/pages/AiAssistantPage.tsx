import { Bot, ChevronDown, MessageSquare, Plus, Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { fetchApi, mutateApi } from "../lib/api";
import { useFetch } from "../lib/use-fetch";

type AgentType =
  | "general"
  | "log-analysis"
  | "cost-optimization"
  | "infrastructure"
  | "security"
  | "report-builder";

type Conversation = {
  id: string;
  title: string;
  pageContext: string;
  agentType: AgentType;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const agentOptions: { type: AgentType; label: string; description: string }[] = [
  { type: "general", label: "General Analytics", description: "Cross-source data analysis" },
  {
    type: "log-analysis",
    label: "Log Analysis",
    description: "CloudWatch log pattern detection",
  },
  {
    type: "cost-optimization",
    label: "Cost Optimization",
    description: "AWS cost analysis and savings",
  },
  {
    type: "infrastructure",
    label: "Infrastructure",
    description: "EC2/ECS sizing and health",
  },
  { type: "security", label: "Security", description: "IAM policy review and audit" },
  {
    type: "report-builder",
    label: "Report Builder",
    description: "Natural language to SQL queries",
  },
];

export function AiAssistantPage() {
  const {
    data: conversations,
    loading: convsLoading,
    error: convsError,
    refetch: refetchConvs,
  } = useFetch<Conversation[]>("/api/ai/conversations");

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("general");
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on Escape or click outside
  useEffect(() => {
    if (!isAgentDropdownOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsAgentDropdownOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAgentDropdownOpen]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages(convId: string) {
    setMessagesLoading(true);
    setSendError(null);
    try {
      const body = await fetchApi<{ conversation: Conversation; messages: Message[] }>(
        `/api/ai/conversations/${convId}`,
      );
      setMessages(body.data.messages);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }

  function handleSelectConversation(conv: Conversation) {
    setSelectedConvId(conv.id);
    setMessages([]);
    setSendError(null);
    setNewMessage("");
    loadMessages(conv.id);
  }

  async function handleNewConversation() {
    setIsCreating(true);
    try {
      const body = await mutateApi<Conversation>("/api/ai/conversations", "POST", {
        title: "New Conversation",
        pageContext: "ai",
        agentType: selectedAgent,
      });
      refetchConvs();
      setSelectedConvId(body.data.id);
      setMessages([]);
      setSendError(null);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to create conversation");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConvId) return;
    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    setSendError(null);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const body = await mutateApi<Message>(
        `/api/ai/conversations/${selectedConvId}/messages`,
        "POST",
        { role: "user", content: messageText },
      );
      // Replace optimistic message with the saved message from server
      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticMsg.id), body.data]);
      refetchConvs();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const convList = conversations ?? [];
  const selectedAgentOpt = agentOptions.find((a) => a.type === selectedAgent) ?? agentOptions[0];

  return (
    <div
      className="flex h-full min-h-0 gap-4 overflow-hidden"
      style={{ height: "calc(100vh - 10rem)" }}
    >
      {/* Left sidebar: conversations */}
      <div className="flex w-64 shrink-0 flex-col rounded-xl border border-gray-700/50 bg-gray-800/50">
        {/* New conversation button */}
        <div className="border-b border-gray-700/50 p-3">
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={isCreating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={15} />
            {isCreating ? "Creating..." : "New Conversation"}
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          {convsLoading && <LoadingState />}
          {convsError && <p className="p-2 text-xs text-red-400">{convsError}</p>}
          {!convsLoading && !convsError && convList.length === 0 && (
            <p className="p-3 text-center text-xs text-gray-500">
              No conversations yet. Start one!
            </p>
          )}
          {convList.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => handleSelectConversation(conv)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                selectedConvId === conv.id
                  ? "bg-blue-600/20 text-white"
                  : "text-gray-300 hover:bg-gray-700/50"
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare size={14} className="mt-0.5 shrink-0 text-gray-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{conv.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-700/50 bg-gray-800/50">
        {/* Top bar: agent selector */}
        <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-white">AI Assistant</span>
          </div>

          {/* Agent type selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsAgentDropdownOpen((prev) => !prev)}
              aria-expanded={isAgentDropdownOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-2 rounded-lg bg-gray-700/50 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
            >
              <Bot size={14} />
              {selectedAgentOpt.label}
              <ChevronDown size={13} />
            </button>

            {isAgentDropdownOpen && (
              <div
                aria-label="Select AI agent"
                className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-xl"
              >
                {agentOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setSelectedAgent(opt.type);
                      setIsAgentDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left transition-colors hover:bg-gray-800 ${
                      selectedAgent === opt.type ? "text-blue-400" : "text-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!selectedConvId && (
            <div className="flex h-full items-center justify-center">
              <EmptyState message="Select a conversation or start a new one to begin chatting." />
            </div>
          )}

          {selectedConvId && messagesLoading && <LoadingState />}

          {selectedConvId && !messagesLoading && messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Sparkles className="mx-auto h-10 w-10 text-blue-400/50" />
                <p className="mt-3 text-sm text-gray-400">
                  Start a conversation with the {selectedAgentOpt.label}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 rounded-full p-2 ${
                    msg.role === "user"
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-gray-700/50 text-gray-400"
                  }`}
                >
                  {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-blue-600 text-white"
                      : "rounded-tl-sm bg-gray-700/60 text-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      msg.role === "user" ? "text-blue-200/60" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-full bg-gray-700/50 p-2 text-gray-400">
                  <Bot size={14} />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-gray-700/60 px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Send error */}
        {sendError && (
          <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-2">
            <p className="text-xs text-red-400">{sendError}</p>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-700/50 p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedConvId
                  ? "Type your message... (Enter to send, Shift+Enter for new line)"
                  : "Select a conversation to start chatting"
              }
              disabled={!selectedConvId || isSending}
              rows={2}
              className="flex-1 resize-none rounded-xl bg-gray-900/60 px-4 py-3 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!newMessage.trim() || !selectedConvId || isSending}
              className="flex shrink-0 items-center justify-center rounded-xl bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
