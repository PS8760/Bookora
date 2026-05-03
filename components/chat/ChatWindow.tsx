"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { jsonFetcher, slotSWRConfig } from "@/lib/realtime";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { name: string; image: string | null; role: string };
}

interface ChatWindowProps {
  chatId?: string;
  bookingId?: string;
  receiverId?: string;
  currentUserId: string;
  onClose?: () => void;
  partner?: { name: string; role: string };
}

export default function ChatWindow({ chatId: initialChatId, bookingId, receiverId, currentUserId, onClose, partner: initialPartner }: ChatWindowProps) {
  const [chatId, setChatId] = useState(initialChatId);

  useEffect(() => {
    setChatId(initialChatId);
  }, [initialChatId]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messagesData, mutate } = useSWR(
    chatId ? `/api/chat/${chatId}` : null,
    jsonFetcher,
    { ...slotSWRConfig, refreshInterval: 3000 } // Poll every 3s for "real-time"
  );

  const messages: Message[] = messagesData?.data ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (contentOverride?: string) => {
    const text = contentOverride || input;
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: chatId,
          bookingId,
          receiverId,
          content: text,
        }),
      });

      if (res.ok) {
        const j = await res.json();
        if (!chatId) setChatId(j.data.conversationId);
        setInput("");
        setSuggestion(null);
        mutate();
      }
    } finally {
      setSending(false);
    }
  };

  const fetchAiSuggestion = async () => {
    if (!chatId || loadingSuggestion) return;
    setLoadingSuggestion(true);
    try {
      const res = await fetch("/api/chat/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });
      if (res.ok) {
        const j = await res.json();
        setSuggestion(j.data);
      }
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const partner = messages.find(m => m.senderId !== currentUserId)?.sender || initialPartner;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#E8E0D0] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#724A6A] p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
            {partner?.name?.charAt(0) || "C"}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{partner?.name || "Admin"}</h3>
            <p className="text-[10px] opacity-80 uppercase tracking-tighter">{partner?.role || "Support"}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            ✕
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FDFCF9]"
        style={{ backgroundImage: "radial-gradient(#E8E0D0 0.5px, transparent 0.5px)", backgroundSize: "20px 20px" }}
      >
        {messages.length === 0 && !chatId && (
          <div className="text-center py-10">
            <p className="text-xs text-[#8A8AAA]">Start a conversation...</p>
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${isMe
                ? "bg-[#724A6A] text-white rounded-tr-none"
                : "bg-white text-[#1A1A2E] border border-[#E8E0D0] rounded-tl-none"
                }`}>
                {!isMe && (
                  <div className="flex items-center gap-2 mb-1.5 opacity-80">
                    <span className="text-[11px] font-bold">{m.sender.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F5EDF4] text-[#724A6A] font-medium border border-[#E8D5E4] uppercase tracking-wider">
                      {m.sender.role}
                    </span>
                  </div>
                )}
                <p className="leading-relaxed">{m.content}</p>
                <p className={`text-[9px] mt-1 text-right ${isMe ? "text-white/60" : "text-[#8A8AAA]"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Suggestion */}
      {suggestion && (
        <div className="px-4 py-2 bg-[#F5EDF4] border-t border-[#E8D5E4] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
          <div className="flex-1">
            <p className="text-[10px] text-[#724A6A] font-bold mb-1">AI Suggestion ✨</p>
            <p className="text-xs text-[#4A4A6A] italic">"{suggestion}"</p>
          </div>
          <button
            onClick={() => handleSendMessage(suggestion)}
            className="bg-[#724A6A] text-white text-[10px] py-1 px-3 rounded-full hover:bg-[#5D3C56] transition-colors"
          >
            Use
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-[#E8E0D0] flex items-center gap-2">
        <button
          onClick={fetchAiSuggestion}
          disabled={!chatId || loadingSuggestion}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5EDF4] text-[#724A6A] hover:bg-[#E8D5E4] transition-colors disabled:opacity-50"
          title="AI Suggestion"
        >
          {loadingSuggestion ? "..." : "✨"}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-1 bg-[#F5F5F5] rounded-full py-2 px-4 text-sm outline-none focus:ring-1 focus:ring-[#724A6A]"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full bg-[#724A6A] text-white flex items-center justify-center hover:bg-[#5D3C56] transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current rotate-90">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
