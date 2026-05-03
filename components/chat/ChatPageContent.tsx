"use client";

import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher, dashboardSWRConfig } from "@/lib/realtime";
import { MessageSquare, User, Calendar, Search } from "lucide-react";
import ChatWindow from "./ChatWindow";

interface Conversation {
  id: string;
  type: string;
  updatedAt: string;
  participants: { user: { id: string; name: string; image: string | null; role: string } }[];
  messages: { content: string; createdAt: string }[];
  booking?: { service: { title: string } };
}

export default function ChatPageContent({ currentUserId }: { currentUserId: string }) {
  const { data: convData, mutate } = useSWR<{ data: any }>("/api/chat/list", jsonFetcher, {
    ...dashboardSWRConfig,
    refreshInterval: 5000,
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const conversations: Conversation[] = convData?.data ?? [];
  
  const filteredConversations = conversations.filter(c => {
    const otherParticipant = c.participants.find(p => p.user.id !== currentUserId)?.user;
    return otherParticipant?.name?.toLowerCase().includes(search.toLowerCase()) || 
           c.booking?.service.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-3xl border border-[#E8E0D0] shadow-sm overflow-hidden">
      {/* Left List */}
      <div className="w-full md:w-80 border-r border-[#E8E0D0] flex flex-col bg-[#FDFCF9]">
        <div className="p-4 border-b border-[#E8E0D0]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A2E]">Messages</h2>
            <button 
              onClick={async () => {
                // Find an admin to chat with
                const res = await fetch("/api/chat/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    receiverId: "admin", // Special keyword or find first admin
                    content: "Hello, I need support.",
                    type: "DIRECT"
                  }),
                });
                if (res.ok) {
                  const j = await res.json();
                  setActiveChatId(j.data.conversationId);
                  mutate();
                }
              }}
              className="text-[10px] font-bold bg-[#724A6A] text-white px-3 py-1.5 rounded-lg hover:bg-[#5D3C56] transition-colors"
            >
              Contact Admin
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8AAA]" size={16} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E8E0D0] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#724A6A]/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EAD8]">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#8A8AAA]">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const otherParticipant = c.participants.find(p => p.user.id !== currentUserId)?.user;
              const lastMsg = c.messages[0];
              const isActive = activeChatId === c.id;

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveChatId(c.id)}
                  className={`w-full flex items-center gap-3 p-4 transition-colors text-left ${
                    isActive ? "bg-[#F5EDF4]" : "hover:bg-[#FFFBE9]"
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#724A6A] flex items-center justify-center text-white font-bold">
                      {otherParticipant?.name?.charAt(0) || "?"}
                    </div>
                    {isActive && <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-[#2E7D32] border-2 border-white rounded-full" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-sm text-[#1A1A2E] truncate">
                        {otherParticipant?.name || "Support"}
                      </span>
                      <span className="text-[10px] text-[#8A8AAA]">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    {c.booking && (
                      <p className="text-[10px] font-medium text-[#724A6A] truncate mb-0.5">
                        {c.booking.service.title}
                      </p>
                    )}
                    <p className="text-xs text-[#8A8AAA] truncate">
                      {lastMsg ? lastMsg.content : "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat */}
      <div className="hidden md:flex flex-1 bg-white items-center justify-center relative">
        {activeChatId ? (
          <div className="w-full h-full">
             <ChatWindow 
                key={activeChatId}
                chatId={activeChatId}
                currentUserId={currentUserId}
                // No onClose needed here as it's a full panel
              />
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-[#F5EDF4] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#724A6A]">
              <MessageSquare size={32} />
            </div>
            <h3 className="font-bold text-[#1A1A2E] mb-2">Select a conversation</h3>
            <p className="text-sm text-[#8A8AAA] max-w-xs">
              Choose a contact from the list to start messaging or view your history.
            </p>
          </div>
        )}
      </div>

      {/* Mobile Chat View (Overlay) */}
      {activeChatId && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-white animate-in slide-in-from-right duration-300">
           <ChatWindow 
              key={activeChatId}
              chatId={activeChatId}
              currentUserId={currentUserId}
              onClose={() => setActiveChatId(null)}
            />
        </div>
      )}
    </div>
  );
}
