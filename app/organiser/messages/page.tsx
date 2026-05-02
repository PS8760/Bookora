"use client";

import OrganiserLayout from "@/components/organiser/OrganiserLayout";
import { useSession } from "@/lib/auth-client";
import ChatPageContent from "@/components/chat/ChatPageContent";

export default function OrganiserMessagesPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <OrganiserLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Client Communications</h1>
          <p className="text-sm text-[#4A4A6A] mt-1">Manage chats with your customers</p>
        </div>
        
        {user?.id ? (
          <ChatPageContent currentUserId={user.id} />
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E8E0D0]">
            <p className="text-sm text-[#8A8AAA]">Loading your conversations...</p>
          </div>
        )}
      </div>
    </OrganiserLayout>
  );
}
