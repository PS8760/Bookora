import * as chrono from 'chrono-node';
import type { ParsedVoiceCommand, VoiceIntent, DayCode, RecurringType } from '../types/voice.types';

const DAY_MAP: Record<string, DayCode> = {
  monday: 'MON', tuesday: 'TUE', wednesday: 'WED',
  thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN',
};

function detectIntent(text: string): VoiceIntent {
  const lower = text.toLowerCase();
  if (/reschedule my/.test(lower)) return 'RESCHEDULE_BOOKING';
  if (/next available|earliest available/.test(lower)) return 'BOOK_NEXT';
  if (/cancel|delete|remove/.test(lower)) return 'CANCEL_APPOINTMENT';
  if (/update|change time|modify|start.*from.*to|set.*time/.test(lower)) return 'UPDATE_APPOINTMENT';
  if (/weekly|every (monday|tuesday|wednesday|thursday|friday)/.test(lower)) return 'CREATE_WEEKLY';
  if (/create \d+ slots|slots.*starting/.test(lower)) return 'CREATE_SLOTS';
  if (/^(create|schedule|add|set up|start)\b/.test(lower)) return 'CREATE_SINGLE';
  if (/with (dr|mr|ms|doctor|prof)\.?\s+\w+/.test(lower)) return 'BOOK_BY_ORGANISER';
  if (/book|reserve/.test(lower)) {
    if (/for \w+/.test(lower) && !/for \d+ minute/.test(lower)) return 'BOOK_WITH_DETAILS';
    return 'BOOK_BY_DATETIME';
  }
  return 'UNKNOWN';
}

function extractDays(text: string): DayCode[] {
  const lower = text.toLowerCase();
  return (Object.keys(DAY_MAP) as string[])
    .filter(day => lower.includes(day))
    .map(day => DAY_MAP[day]);
}

/** Parse a single time string like "1 pm", "2:30 PM", "14:00" → "HH:MM" (24h) */
function parseTimeStr(raw: string): string | undefined {
  // 24h format already: e.g. "14:00"
  const h24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return raw;

  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return undefined;
  let hour = parseInt(match[1]);
  const min = parseInt(match[2] ?? '0');
  const period = match[3].toLowerCase();
  if (period === 'pm' && hour < 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Extract start and (optional) end times from phrases like:
 *   "1 pm to 2 pm"
 *   "from 1 pm to 2 pm"
 *   "10 AM"
 *   "start at 10:00"
 */
function extractTimes(text: string): { time?: string; endTime?: string } {
  // Match "from X to Y" or "X to Y" with am/pm
  const rangeMatch = text.match(
    /(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  );
  if (rangeMatch) {
    const time = parseTimeStr(rangeMatch[1].trim());
    const endTime = parseTimeStr(rangeMatch[2].trim());
    return { time, endTime };
  }

  // Match "start at X" or just "at X am/pm"
  const single = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
  if (single) {
    return { time: parseTimeStr(single[1].trim()) };
  }

  return {};
}

/** Compute duration in minutes from HH:MM start and end strings */
function durationFromRange(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function extractDuration(text: string): number | undefined {
  const minMatch = text.match(/(\d+)\s*minute/i);
  if (minMatch) return parseInt(minMatch[1]);
  const hourMatch = text.match(/(\d+)\s*hour/i);
  if (hourMatch) return parseInt(hourMatch[1]) * 60;
  return undefined;
}

function extractTitle(text: string, intent: VoiceIntent): string | undefined {
  if (intent === 'CREATE_SINGLE') {
    const m = text.match(/(?:create|schedule|add|set up|start) an? appointment (.+?) on\b/i);
    return m?.[1]?.trim();
  }
  if (intent === 'CREATE_WEEKLY') {
    const m = text.match(/create a weekly appointment (.+?) every\b/i);
    return m?.[1]?.trim();
  }
  if (intent === 'CANCEL_APPOINTMENT') {
    const m = text.match(/cancel (?:all )?(.+?) appointment/i);
    return m?.[1]?.trim();
  }
  if (intent === 'UPDATE_APPOINTMENT') {
    const m = text.match(/update appointment (.+?) (?:change|start|set)/i);
    return m?.[1]?.trim();
  }
  if (intent === 'RESCHEDULE_BOOKING') {
    const m = text.match(/reschedule my (.+?) appointment/i);
    return m?.[1]?.trim();
  }
  return undefined;
}

function getMissingFields(cmd: Partial<ParsedVoiceCommand>, intent: VoiceIntent): string[] {
  const missing: string[] = [];
  const required: Record<VoiceIntent, string[]> = {
    CREATE_SINGLE:        ['title', 'date', 'time'],
    CREATE_WEEKLY:        ['title', 'recurringDays', 'time'],
    CREATE_SLOTS:         ['slotCount', 'date', 'time', 'slotGap'],
    UPDATE_APPOINTMENT:   ['title', 'time'],
    CANCEL_APPOINTMENT:   ['title'],
    BOOK_BY_DATETIME:     ['date', 'time'],
    BOOK_BY_ORGANISER:    ['organiserName', 'date'],
    BOOK_NEXT:            [],
    BOOK_WITH_DETAILS:    ['date', 'time'],
    RESCHEDULE_BOOKING:   ['title', 'date', 'time'],
    UNKNOWN:              [],
  };
  for (const field of (required[intent] ?? [])) {
    const val = (cmd as any)[field];
    if (!val || (Array.isArray(val) && val.length === 0)) missing.push(field);
  }
  return missing;
}

export function parseVoiceCommand(transcript: string): ParsedVoiceCommand {
  const intent = detectIntent(transcript);
  const parsedDate = chrono.parseDate(transcript, new Date(), { forwardDate: true }) ?? undefined;

  // Extract time range (handles "from 1 pm to 2 pm" correctly)
  const { time, endTime } = extractTimes(transcript);

  // Derive duration: prefer explicit mention, fallback to range, fallback undefined
  let duration = extractDuration(transcript);
  if (!duration && time && endTime) {
    const computed = durationFromRange(time, endTime);
    if (computed > 0) duration = computed;
  }

  const recurringDays = extractDays(transcript);
  const title = extractTitle(transcript, intent);

  const slotCountMatch = transcript.match(/create (\d+) slots/i);
  const slotGapMatch = transcript.match(/every (\d+) minutes/i);
  const organiserMatch = transcript.match(/with (?:dr|mr|ms|doctor|prof)\.?\s+(\w+)/i);
  const notesMatch = transcript.match(/for (.+?)$/i);

  const cmd: Partial<ParsedVoiceCommand> = {
    intent,
    title,
    date: parsedDate,
    time,
    endTime,
    duration,
    recurringDays: recurringDays.length > 0 ? recurringDays : undefined,
    recurringType: recurringDays.length > 0 ? 'WEEKLY' : undefined,
    slotCount: slotCountMatch ? parseInt(slotCountMatch[1]) : undefined,
    slotGap: slotGapMatch ? parseInt(slotGapMatch[1]) : undefined,
    organiserName: organiserMatch?.[1],
    notes: intent === 'BOOK_WITH_DETAILS' ? notesMatch?.[1] : undefined,
    scope: /cancel all/.test(transcript.toLowerCase()) ? 'ALL' : 'SINGLE',
    rawTranscript: transcript,
  };

  const missingFields = getMissingFields(cmd, intent);

  return { ...cmd, missingFields } as ParsedVoiceCommand;
}
