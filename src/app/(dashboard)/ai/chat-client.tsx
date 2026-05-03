"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Bot, User } from "lucide-react";

type Message = { role: "user" | "model"; text: string };

const SUBJECTS = [
  "Mathematics", "Additional Mathematics", "Physics", "Chemistry", "Biology",
  "English", "Bahasa Malaysia", "History", "Economics", "Accounting", "Science",
];
const LEVELS = ["UPSR", "PT3", "SPM", "IGCSE", "A-Level"];
const STARTERS = [
  "Explain this concept step by step",
  "Give me a practice question with solution",
  "What are common mistakes students make?",
];

export function AiChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [level, setLevel] = useState("SPM");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;

    const updated: Message[] = [...messages, { role: "user", text: q }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, level, history: messages, question: q }),
      });
      const data = await res.json();
      setMessages([...updated, { role: "model", text: data.response ?? data.error ?? "No response." }]);
    } catch {
      setMessages([...updated, { role: "model", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)]">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={subject} onChange={e => setSubject(e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={level} onChange={e => setLevel(e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Clear chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
            <Bot className="h-14 w-14 opacity-20" />
            <p className="text-sm font-medium">Ask me anything about {subject} ({level})</p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {STARTERS.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "user" ? "bg-blue-700" : "bg-gray-100 border border-gray-200"
            }`}>
              {msg.role === "user"
                ? <User className="h-4 w-4 text-white" />
                : <Bot className="h-4 w-4 text-gray-600" />}
            </div>
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-blue-700 text-white rounded-tr-sm"
                : "bg-gray-100 text-gray-900 rounded-tl-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Bot className="h-4 w-4 text-gray-600" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100 text-gray-500 text-sm flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask a ${subject} question… (Enter to send, Shift+Enter for new line)`}
          rows={2}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
        />
        <Button onClick={send} disabled={loading || !input.trim()}
          className="self-end h-12 w-12 p-0 flex-shrink-0 rounded-xl">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
