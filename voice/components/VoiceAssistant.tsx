'use client';
import { useState, useCallback } from 'react';
import VoiceButton from './VoiceButton';
import ConversationDisplay from './ConversationDisplay';
import ConfirmationCard from './ConfirmationCard';
import VoiceCommandHelp from './VoiceCommandHelp';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useVoiceAppointment } from '../hooks/useVoiceAppointment';

interface Props {
  role: 'organiser' | 'customer';
  onSuccess?: () => void;
}

export default function VoiceAssistant({ role, onSuccess }: Props) {
  const { state, onTranscriptReady, onFollowupAnswer, onConfirm, onEdit, onReset } = useVoiceAppointment(role);
  const [fallbackText, setFallbackText] = useState('');

  const handleFinal = useCallback((text: string) => {
    if (state.phase === 'followup') onFollowupAnswer(text);
    else onTranscriptReady(text);
  }, [state.phase, onFollowupAnswer, onTranscriptReady]);

  const { isListening, isSupported, error: micError, startListening, stopListening } = useVoiceRecognition(handleFinal);

  const handleConfirm = async () => {
    await onConfirm();
    onSuccess?.();
  };

  const isConfirming = state.phase === 'confirming';

  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      border: '1px solid #E8E0D0',
      boxShadow: '0 8px 32px rgba(114,74,106,0.20)',
      width: '100%',
      // When confirming, expand to show all fields like the manual form
      maxWidth: isConfirming ? 560 : 420,
      transition: 'max-width 0.3s ease',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>🎙️ Voice Assistant</p>
          <p style={{ margin: 0, fontSize: 11, color: '#8A8AAA' }}>
            {role === 'organiser' ? 'Manage appointments by voice' : 'Book appointments by voice'}
          </p>
        </div>
        {state.phase !== 'idle' && (
          <button
            onClick={onReset}
            style={{ fontSize: 11, color: '#C62828', background: '#FFEBEE', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Conversation */}
      {state.conversation.length > 0 && (
        <ConversationDisplay messages={state.conversation} />
      )}

      {/* Status messages */}
      {state.phase === 'processing' && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#724A6A', margin: 0 }}>⏳ Parsing your command...</p>
      )}
      {state.phase === 'success' && (
        <p style={{ textAlign: 'center', fontSize: 14, color: '#2E7D32', fontWeight: 700, margin: 0 }}>✅ Appointment created successfully!</p>
      )}
      {state.phase === 'error' && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#C62828', margin: 0 }}>{state.error}</p>
      )}
      {micError && (
        <p style={{ fontSize: 12, color: '#C62828', margin: 0, background: '#FFEBEE', padding: '6px 10px', borderRadius: 8 }}>{micError}</p>
      )}

      {/* Full confirmation card — shown instead of mic when ready */}
      {state.phase === 'confirming' && state.parsed && (
        <ConfirmationCard
          parsed={state.parsed}
          role={role}
          onConfirm={handleConfirm}
          onCancel={onReset}
          onEdit={onEdit}
        />
      )}

      {/* Followup hint */}
      {state.phase === 'followup' && (
        <p style={{ fontSize: 12, color: '#8A8AAA', margin: 0, background: '#F5EDF4', padding: '8px 10px', borderRadius: 8 }}>
          🎤 Tap the mic and answer the question above, or type your answer below.
        </p>
      )}

      {/* Mic / text input — only when not confirming */}
      {['idle', 'listening', 'followup'].includes(state.phase) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {isSupported ? (
            <VoiceButton
              isListening={isListening}
              onClick={isListening ? stopListening : startListening}
              disabled={state.phase === 'processing'}
            />
          ) : (
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: 12, color: '#8A8AAA', marginBottom: 6 }}>
                Voice not supported in this browser. Type your command:
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={fallbackText}
                  onChange={e => setFallbackText(e.target.value)}
                  placeholder={role === 'organiser'
                    ? 'e.g. Create appointment Dental on Monday from 1 PM to 2 PM'
                    : 'e.g. Book appointment on Tuesday at 3 PM'}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E0D0', fontSize: 13 }}
                  onKeyDown={e => { if (e.key === 'Enter' && fallbackText.trim()) { handleFinal(fallbackText); setFallbackText(''); } }}
                />
                <button
                  onClick={() => { if (fallbackText.trim()) { handleFinal(fallbackText); setFallbackText(''); } }}
                  style={{ padding: '8px 12px', background: '#724A6A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help — only on idle */}
      {state.phase === 'idle' && <VoiceCommandHelp role={role} />}
    </div>
  );
}
