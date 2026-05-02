"use client";

import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher, dashboardSWRConfig } from "@/lib/realtime";
import { MessageSquare, User, Calendar } from "lucide-react";
import ChatWindow from "./ChatWindow";

interface Conversation {
  id: string;
  type: string;
  updatedAt: string;
  participants: { user: { id: string; name: string; image: string | null; role: string } }[];
  messages: { content: string; createdAt: string }[];
  booking?: { service: { title: string } };
}

export default function ChatSidebarSection({ currentUserId }: { currentUserId: string }) {
  const { data: convData, mutate } = useSWR("/api/chat/list", jsonFetcher, {
    ...dashboardSWRConfig,
    refreshInterval: 5000,
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const conversations: Conversation[] = convData?.data ?? [];

  return (
    <div className="flex flex-col gap-2 mt-6">
      <div className="px-4 mb-2">
        <h3 className="text-[10px] font-bold text-[#8A8AAA] uppercase tracking-wider flex items-center gap-2">
          <MessageSquare size={12} />
          Messages
        </h3>
      </div>

      <div className="space-y-1 px-2">
        {conversations.length === 0 ? (
          <p className="text-[10px] text-[#8A8AAA] px-3 py-2 italic">No active chats</p>
        ) : (
          conversations.map((c) => {
            const otherParticipant = c.participants.find(p => p.user.id !== currentUserId)?.user;
            const lastMsg = c.messages[0];
            const isBooking = c.type === "BOOKING";

            return (
              <button
                key={c.id}
                onClick={() => setActiveChatId(c.id)}
                className={`w-full flex flex-col gap-1 p-2.5 rounded-xl transition-all text-left ${
                  activeChatId === c.id 
                    ? "bg-[#724A6A] text-white shadow-md" 
                    : "hover:bg-[#F5EDF4] text-[#4A4A6A] hover:text-[#724A6A]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      activeChatId === c.id ? "bg-white/20" : "bg-[#724A6A]/10 text-[#724A6A]"
                    }`}>
                      {otherParticipant?.name?.charAt(0) || "?"}
                    </div>
                    <span className="text-xs font-semibold truncate max-w-[100px]">
                      {otherParticipant?.name || "Support"}
                    </span>
                  </div>
                  {isBooking && <Calendar size={10} className="opacity-60" />}
                </div>
                
                <div className="flex flex-col">
                  {isBooking && c.booking && (
                    <span className={`text-[9px] font-medium opacity-70 truncate`}>
                      {c.booking.service.title}
                    </span>
                  )}
                  {lastMsg && (
                    <p className={`text-[10px] truncate ${activeChatId === c.id ? "text-white/80" : "text-[#8A8AAA]"}`}>
                      {lastMsg.content}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Chat Overlay */}
      {activeChatId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <ChatWindow 
              chatId={activeChatId}
              currentUserId={currentUserId}
              onClose={() => setActiveChatId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
