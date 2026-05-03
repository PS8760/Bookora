'use client';

import { useState, useCallback } from 'react';
import type { VoiceFlowState, ParsedVoiceCommand, ConversationMessage } from '../types/voice.types';
import { MISSING_FIELD_PROMPTS } from '../prompts/systemPrompts';
import {
  handleCreateSingle, handleCreateWeekly, handleCreateSlots,
  handleUpdateAppointment, handleCancelAppointment,
} from '../services/organizerCommands';
import {
  handleBookByDateTime, handleBookByOrganiser, handleBookNext,
  handleBookWithDetails, handleRescheduleBooking,
} from '../services/userCommands';

const initialState: VoiceFlowState = {
  phase: 'idle', transcript: '', parsed: null,
  conversation: [], pendingField: null, error: null,
};

export function useVoiceAppointment(role: 'organiser' | 'customer') {
  const [state, setState] = useState<VoiceFlowState>(initialState);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setState(s => ({
      ...s,
      conversation: [...s.conversation, { role, content, timestamp: new Date() }],
    }));
  }, []);

  const onTranscriptReady = useCallback(async (text: string) => {
    setState(s => ({ ...s, phase: 'processing', transcript: text }));
    addMessage('user', text);

    try {
      const res = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, userRole: role }),
      });
      const data = await res.json();
      const parsed: ParsedVoiceCommand = data.parsed;

      if (parsed.missingFields.length > 0) {
        const field = parsed.missingFields[0];
        const question = MISSING_FIELD_PROMPTS[field] ?? `Please provide your ${field}.`;
        addMessage('assistant', question);
        setState(s => ({ ...s, phase: 'followup', parsed, pendingField: field }));
      } else {
        addMessage('assistant', 'Here are the details I extracted. Please confirm:');
        setState(s => ({ ...s, phase: 'confirming', parsed }));
      }
    } catch {
      setState(s => ({ ...s, phase: 'error', error: 'Failed to parse command. Please try again.' }));
    }
  }, [role, addMessage]);

  const onFollowupAnswer = useCallback(async (answer: string) => {
    if (!state.parsed || !state.pendingField) return;
    addMessage('user', answer);

    const field = state.pendingField;
    const updated = { ...state.parsed } as any;

    /** Parse a single "1 pm" / "2:30 PM" → "HH:MM" */
    const parseTime = (raw: string): string | undefined => {
      const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      if (!m) return undefined;
      let h = parseInt(m[1]); const min = parseInt(m[2] ?? '0');
      if (m[3].toLowerCase() === 'pm' && h < 12) h += 12;
      if (m[3].toLowerCase() === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    if (field === 'date') {
      const { parseDate } = await import('chrono-node');
      updated.date = parseDate(answer, new Date(), { forwardDate: true }) ?? undefined;
    } else if (field === 'time') {
      // Handle range: "from 1 pm to 2 pm" or "1 pm to 2 pm"
      const rangeMatch = answer.match(
        /(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
      );
      if (rangeMatch) {
        const t = parseTime(rangeMatch[1]);
        const e = parseTime(rangeMatch[2]);
        if (t) updated.time = t;
        if (e) updated.endTime = e;
        if (t && e) {
          const [sh, sm] = t.split(':').map(Number);
          const [eh, em] = e.split(':').map(Number);
          const dur = (eh * 60 + em) - (sh * 60 + sm);
          if (dur > 0) updated.duration = dur;
        }
      } else {
        const t = parseTime(answer);
        if (t) updated.time = t;
      }
    } else if (field === 'duration') {
      const n = answer.match(/(\d+)/);
      if (n) updated.duration = parseInt(n[1]);
    } else if (field === 'slotCount') {
      const n = answer.match(/(\d+)/);
      if (n) updated.slotCount = parseInt(n[1]);
    } else if (field === 'slotGap') {
      const n = answer.match(/(\d+)/);
      if (n) updated.slotGap = parseInt(n[1]);
    } else if (field === 'title') {
      updated.title = answer.trim();
    } else if (field === 'organiserName') {
      updated.organiserName = answer.trim();
    }

    updated.missingFields = updated.missingFields.filter((f: string) => f !== field);

    if (updated.missingFields.length > 0) {
      const next = updated.missingFields[0];
      const question = MISSING_FIELD_PROMPTS[next] ?? `Please provide your ${next}.`;
      addMessage('assistant', question);
      setState(s => ({ ...s, parsed: updated, pendingField: next }));
    } else {
      addMessage('assistant', 'Great! Please confirm the details below:');
      setState(s => ({ ...s, parsed: updated, phase: 'confirming', pendingField: null }));
    }
  }, [state.parsed, state.pendingField, addMessage]);

  const onConfirm = useCallback(async () => {
    if (!state.parsed) return;
    setState(s => ({ ...s, phase: 'processing' }));
    const { intent } = state.parsed;
    let result: any;
    try {
      if (role === 'organiser') {
        if (intent === 'CREATE_SINGLE') result = await handleCreateSingle(state.parsed);
        else if (intent === 'CREATE_WEEKLY') result = await handleCreateWeekly(state.parsed);
        else if (intent === 'CREATE_SLOTS') result = await handleCreateSlots(state.parsed);
        else if (intent === 'UPDATE_APPOINTMENT') result = await handleUpdateAppointment(state.parsed);
        else if (intent === 'CANCEL_APPOINTMENT') result = await handleCancelAppointment(state.parsed);
      } else {
        if (intent === 'BOOK_BY_DATETIME') result = await handleBookByDateTime(state.parsed);
        else if (intent === 'BOOK_BY_ORGANISER') result = await handleBookByOrganiser(state.parsed);
        else if (intent === 'BOOK_NEXT') result = await handleBookNext();
        else if (intent === 'BOOK_WITH_DETAILS') result = await handleBookWithDetails(state.parsed);
        else if (intent === 'RESCHEDULE_BOOKING') result = await handleRescheduleBooking(state.parsed);
      }
      if (result?.error) throw new Error(result.error.message ?? 'Failed');
      addMessage('assistant', '✅ Done! Your request was completed successfully.');
      setState(s => ({ ...s, phase: 'success' }));
    } catch (err: any) {
      setState(s => ({ ...s, phase: 'error', error: err.message ?? 'Something went wrong.' }));
    }
  }, [state.parsed, role, addMessage]);

  const onEdit = useCallback((field: keyof ParsedVoiceCommand, value: any) => {
    setState(s => {
      if (!s.parsed) return s;
      const next = { ...s.parsed, [field]: value };
      // Auto-compute duration when start/end time are both set
      if ((field === 'time' || field === 'endTime') && next.time && next.endTime) {
        const [sh, sm] = next.time.split(':').map(Number);
        const [eh, em] = next.endTime.split(':').map(Number);
        const dur = (eh * 60 + em) - (sh * 60 + sm);
        if (dur > 0) next.duration = dur;
      }
      return { ...s, parsed: next };
    });
  }, []);

  const onReset = useCallback(() => setState(initialState), []);

  return { state, onTranscriptReady, onFollowupAnswer, onConfirm, onEdit, onReset };
}
