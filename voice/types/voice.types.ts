export type VoiceIntent =
  | 'CREATE_SINGLE'
  | 'CREATE_WEEKLY'
  | 'CREATE_SLOTS'
  | 'UPDATE_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'BOOK_BY_DATETIME'
  | 'BOOK_BY_ORGANISER'
  | 'BOOK_NEXT'
  | 'BOOK_WITH_DETAILS'
  | 'RESCHEDULE_BOOKING'
  | 'UNKNOWN';

export type RecurringType = 'WEEKLY' | 'DAILY' | 'MONTHLY' | 'NONE';
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface ParsedVoiceCommand {
  intent: VoiceIntent;
  title?: string;
  date?: Date;
  time?: string;         // start time HH:MM (24h)
  endTime?: string;      // end time HH:MM (24h) — from "X to Y" ranges
  duration?: number;     // minutes (computed from endTime-time if range given)
  bufferTime?: number;   // buffer between slots in minutes
  recurringType?: RecurringType;
  recurringDays?: DayCode[];
  recurringEndDate?: Date;
  slotCount?: number;
  slotGap?: number;
  organiserName?: string;
  notes?: string;
  bookingId?: string;
  serviceId?: string;
  slotId?: string;
  scope?: 'SINGLE' | 'ALL';
  missingFields: string[];
  rawTranscript: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface VoiceFlowState {
  phase: 'idle' | 'listening' | 'processing' | 'confirming' | 'followup' | 'success' | 'error';
  transcript: string;
  parsed: ParsedVoiceCommand | null;
  conversation: ConversationMessage[];
  pendingField: string | null;
  error: string | null;
}
