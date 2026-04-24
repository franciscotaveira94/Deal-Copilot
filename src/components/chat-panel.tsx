"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Eraser } from "lucide-react";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

export function ChatPanel({
  accountId,
  accountName,
  initial,
  aiEnabled,
  backend,
  model,
  local,
}: {
  accountId: string;
  accountName: string;
  initial: Msg[];
  aiEnabled: boolean;
  backend?: string;
  model?: string;
  local?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/accounts/${accountId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `⚠️ ${e instanceof Error ? e.message : "Failed"}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    if (!confirm("Clear chat history for this account?")) return;
    await fetch(`/api/accounts/${accountId}/chat`, { method: "DELETE" });
    setMessages([]);
  }

  const SUGGESTIONS = [
    "Where is this deal really at?",
    "What should I do before the next meeting?",
    "Draft a follow-up based on the last entry.",
    "What's the biggest risk right now?",
  ];

  return (
    <>
      <div className="px-4 py-3 border-b border-[var(--line-2)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] flex items-center justify-center shadow-[0_2px_6px_rgba(243,128,32,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.6} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[13px] font-semibold">Copilot</span>
              {aiEnabled && backend && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-[4px] text-[9.5px] font-medium bg-[var(--bg-subtle)] border border-[var(--line-2)] text-[var(--muted)]"
                  title={local ? "Running locally" : "Cloud"}
                >
                  {local && <span className="w-1 h-1 rounded-full bg-[var(--pos)]" />}
                  {local ? "Local" : "Cloud"}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1 leading-none truncate">
              {accountName}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[var(--muted-2)] hover:text-[var(--ink)] p-1 rounded hover:bg-[var(--bg-hover)] transition shrink-0"
            title="Clear chat"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!aiEnabled && (
          <div className="rounded-[8px] bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11.5px] text-amber-900">
            <div className="font-semibold mb-0.5">AI not running</div>
            Start Ollama: <code className="font-mono text-[10.5px] bg-amber-100 px-1 py-0.5 rounded">brew services start ollama</code>
          </div>
        )}

        {messages.length === 0 && aiEnabled && (
          <>
            <div className="text-[12px] text-[var(--muted)] leading-relaxed px-1">
              I have full context: summary, timeline, actions, contacts. Ask anything.
            </div>
            <div className="space-y-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    textareaRef.current?.focus();
                  }}
                  className="block w-full text-left text-[12px] text-[var(--ink-3)] hover:text-[var(--accent-ink)] hover:bg-[var(--accent-bg)] rounded-[6px] px-3 py-2 border border-[var(--line-2)] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((m, i) => (
          <div key={m.id ?? i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "bg-[var(--ink)] text-white rounded-[14px] rounded-br-[4px] px-3.5 py-2 text-[13px] max-w-[88%] leading-relaxed"
                  : "bg-[var(--bg-subtle)] border border-[var(--line-2)] text-[var(--ink)] rounded-[14px] rounded-bl-[4px] px-3.5 py-2.5 text-[13px] max-w-[92%] leading-relaxed whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--muted)] px-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-[var(--line-2)] shrink-0">
        <div className="flex items-end gap-2 bg-white border border-[var(--line)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)] rounded-[8px] px-2 py-1.5 transition">
          <textarea
            ref={textareaRef}
            placeholder={aiEnabled ? "Ask anything…" : "AI disabled"}
            disabled={!aiEnabled}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            className="flex-1 bg-transparent text-[13px] resize-none focus:outline-none max-h-[140px] py-[5px] disabled:opacity-50 placeholder:text-[var(--muted-2)]"
          />
          <button
            onClick={send}
            disabled={!aiEnabled || !input.trim() || sending}
            className="w-7 h-7 rounded-[6px] bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[var(--accent-ink)] transition"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2.4} />
          </button>
        </div>
        <div className="text-[10.5px] text-[var(--muted-2)] mt-1.5 px-1">
          <kbd>↵</kbd> to send · <kbd>⇧↵</kbd> newline
        </div>
      </div>
    </>
  );
}
