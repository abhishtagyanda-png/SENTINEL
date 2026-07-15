"use client";

import { useState, useRef, useEffect } from "react";
import { queryReports, type QueryResponse } from "@/lib/api";
import { MessageSquare, Send, Loader2, Bot, User, Sparkles } from "lucide-react";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function NLPAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const result: QueryResponse = await queryReports(question);
      setMessages((prev) => [...prev, { role: "ai", content: result.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Unable to reach the SENTINEL query engine. Please ensure the backend is running on localhost:8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const SUGGESTIONS = [
    "Show me all intrusions in B3",
    "Which events were escalated?",
    "Any suspicious activity last night?",
  ];

  return (
    <div className="glass-card p-4 flex flex-col" style={{ minHeight: "280px" }}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          NLP Assistant
        </h2>
        <Sparkles className="w-3 h-3 text-indigo-500/50" />
      </div>

      {/* Chat messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 -mr-1 min-h-0"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Bot className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-xs text-slate-500 mb-3">
              Ask natural language questions about verified incident reports.
            </p>
            {/* Quick suggestions */}
            <div className="space-y-1.5 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                  }}
                  className="w-full text-left px-3 py-2 bg-slate-900/40 border border-slate-800 rounded-lg text-[11px] text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors"
                >
                  &quot;{s}&quot;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 animate-fade-in ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "ai" && (
              <div className="w-6 h-6 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user" ? "chat-user text-indigo-200" : "chat-ai text-slate-300"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="chat-ai px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
              <span className="text-xs text-slate-500">Gemma is reasoning...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about incidents..."
          className="flex-1 px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
