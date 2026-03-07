import { Bot, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AiDrawerProps = {
  pageContext: string;
  isOpen: boolean;
  onToggle: () => void;
};

type DrawerMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type QuickAction = {
  label: string;
  prompt: string;
};

const QUICK_ACTIONS_BY_CONTEXT: Record<string, QuickAction[]> = {
  ec2: [
    {
      label: "Analyze instance utilization",
      prompt:
        "Analyze the current EC2 instance utilization and identify any underperforming instances.",
    },
    {
      label: "Recommend right-sizing",
      prompt: "Based on current usage, recommend right-sizing opportunities for cost optimization.",
    },
    {
      label: "Security audit",
      prompt: "Run a security audit on the EC2 instances and flag any potential issues.",
    },
    {
      label: "Cost savings",
      prompt: "What are the top cost-saving opportunities for this EC2 fleet?",
    },
  ],
  ecs: [
    {
      label: "Cluster health check",
      prompt: "Perform a health check on all ECS clusters and services.",
    },
    {
      label: "Scaling recommendations",
      prompt: "Analyze task distribution and recommend auto-scaling configurations.",
    },
    {
      label: "Resource optimization",
      prompt: "Identify resource over-provisioning in ECS tasks and services.",
    },
  ],
  s3: [
    {
      label: "Storage cost analysis",
      prompt: "Analyze S3 storage costs and recommend lifecycle policies for cost savings.",
    },
    {
      label: "Access audit",
      prompt: "Review S3 bucket access policies and flag public buckets or misconfigurations.",
    },
    { label: "Unused buckets", prompt: "Identify S3 buckets that haven't been accessed recently." },
  ],
  lambda: [
    {
      label: "Cold start analysis",
      prompt: "Analyze Lambda cold start times and recommend optimizations.",
    },
    {
      label: "Memory right-sizing",
      prompt: "Review Lambda memory configurations and suggest optimizations.",
    },
    { label: "Error rate summary", prompt: "Summarize error rates across all Lambda functions." },
  ],
  costs: [
    {
      label: "Cost anomalies",
      prompt: "Identify any unusual cost spikes or anomalies in the current period.",
    },
    {
      label: "Savings opportunities",
      prompt: "What are the top 5 cost saving opportunities across all services?",
    },
    {
      label: "Budget forecast",
      prompt: "Based on current trends, forecast costs for the next 30 days.",
    },
  ],
  iam: [
    { label: "Permission audit", prompt: "Audit IAM permissions for overly permissive policies." },
    { label: "Unused accounts", prompt: "Identify IAM users that have not logged in recently." },
    { label: "MFA compliance", prompt: "Check MFA compliance across all IAM users." },
  ],
  logs: [
    { label: "Error patterns", prompt: "Analyze logs for recurring error patterns and anomalies." },
    {
      label: "Summarize recent errors",
      prompt: "Summarize the most critical errors from the last hour.",
    },
    {
      label: "Performance issues",
      prompt: "Identify any performance degradation indicators in the logs.",
    },
  ],
  default: [
    {
      label: "Generate summary",
      prompt: "Generate a summary of the current page data and key insights.",
    },
    { label: "Identify issues", prompt: "Identify any issues or anomalies in the current view." },
    {
      label: "Recommend actions",
      prompt: "What actions do you recommend based on the current state?",
    },
  ],
};

function getQuickActions(pageContext: string): QuickAction[] {
  return QUICK_ACTIONS_BY_CONTEXT[pageContext] ?? QUICK_ACTIONS_BY_CONTEXT.default;
}

export function AiDrawer({ pageContext, isOpen, onToggle }: AiDrawerProps) {
  const [messages, setMessages] = useState<DrawerMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages change or drawer opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function sendMessage(content: string) {
    if (!content.trim() || isSending) return;

    const userMsg: DrawerMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setNewMessage("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content.trim(), pageContext: pageContext }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const body = (await response.json()) as { data: { response: string } };
      const assistantMsg: DrawerMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: body.data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: DrawerMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(newMessage);
    }
  }

  const quickActions = getQuickActions(pageContext);

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          isOpen
            ? "bg-gray-700 text-white hover:bg-gray-600"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        {isOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onToggle}
          onKeyDown={() => undefined}
          role="presentation"
        />
      )}

      {/* Drawer panel */}
      <dialog
        open={isOpen}
        aria-label="AI Assistant"
        className={`fixed bottom-0 right-0 top-0 z-40 m-0 flex h-full w-96 flex-col border-l border-gray-700/50 bg-gray-900 p-0 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/10 p-1.5">
              <Sparkles size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Assistant</p>
              <p className="text-xs capitalize text-gray-500">{pageContext} context</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close AI drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick actions */}
        {messages.length === 0 && (
          <div className="border-b border-gray-700/50 p-4">
            <p className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quick Actions
            </p>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => sendMessage(action.prompt)}
                  disabled={isSending}
                  className="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-left text-sm text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Bot className="mx-auto h-10 w-10 text-gray-600" />
                <p className="mt-2 text-sm text-gray-500">
                  Ask me anything or choose a quick action above.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`shrink-0 rounded-full p-1.5 ${
                      msg.role === "user"
                        ? "bg-blue-600/20 text-blue-400"
                        : "bg-gray-700/50 text-gray-400"
                    }`}
                  >
                    {msg.role === "user" ? <Sparkles size={12} /> : <Bot size={12} />}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "rounded-tr-sm bg-blue-600 text-white"
                        : "rounded-tl-sm bg-gray-800 text-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p
                      className={`mt-1 text-xs ${
                        msg.role === "user" ? "text-blue-200/60" : "text-gray-600"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 rounded-full bg-gray-700/50 p-1.5 text-gray-400">
                    <Bot size={12} />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-gray-800 px-3.5 py-3">
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
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-700/50 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send)"
              disabled={isSending}
              rows={2}
              className="flex-1 resize-none rounded-xl bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendMessage(newMessage)}
              disabled={!newMessage.trim() || isSending}
              className="flex shrink-0 items-center justify-center rounded-xl bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
