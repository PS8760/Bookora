'use client';
import { Mic, MicOff } from 'lucide-react';

interface Props {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function VoiceButton({ isListening, onClick, disabled }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Start voice command'}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: isListening ? '#EF4444' : '#724A6A',
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', boxShadow: isListening
            ? '0 0 0 8px rgba(239,68,68,0.2), 0 0 0 16px rgba(239,68,68,0.1)'
            : '0 4px 14px rgba(114,74,106,0.4)',
          animation: isListening ? 'voice-pulse 1.5s ease-in-out infinite' : 'none',
          transition: 'background 0.2s, box-shadow 0.2s',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isListening ? <MicOff size={28} /> : <Mic size={28} />}
      </button>
      <span style={{ fontSize: 12, color: isListening ? '#EF4444' : '#8A8AAA', fontWeight: 500 }}>
        {isListening ? 'Listening...' : 'Tap to speak'}
      </span>
      <style>{`
        @keyframes voice-pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.2), 0 0 0 16px rgba(239,68,68,0.1); }
          50% { box-shadow: 0 0 0 14px rgba(239,68,68,0.15), 0 0 0 28px rgba(239,68,68,0.05); }
        }
      `}</style>
    </div>
  );
}
