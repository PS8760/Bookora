'use client';
import { useEffect, useRef } from 'react';
import type { ConversationMessage } from '../types/voice.types';

export default function ConversationDisplay({ messages }: { messages: ConversationMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
      {messages.map((msg, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
            background: msg.role === 'user' ? '#724A6A' : '#F3F4F6',
            color: msg.role === 'user' ? 'white' : '#1A1A2E',
            fontSize: 13, lineHeight: 1.5,
            borderBottomRightRadius: msg.role === 'user' ? 2 : 12,
            borderBottomLeftRadius: msg.role === 'assistant' ? 2 : 12,
          }}>
            {msg.content}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
