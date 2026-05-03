import type { ParsedVoiceCommand } from '../types/voice.types';

export async function handleCreateSingle(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/organiser/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: parsed.title,
      date: parsed.date?.toISOString(),
      time: parsed.time,
      endTime: parsed.endTime,
      duration: parsed.duration ?? 30,
      bufferTime: parsed.bufferTime,
      recurringType: 'NONE',
    }),
  }).then(r => r.json());
}

export async function handleCreateWeekly(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/organiser/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: parsed.title,
      time: parsed.time,
      duration: parsed.duration ?? 30,
      recurringType: 'WEEKLY',
      recurringDays: parsed.recurringDays,
      recurringEndDate: parsed.recurringEndDate?.toISOString(),
    }),
  }).then(r => r.json());
}

export async function handleCreateSlots(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/organiser/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: parsed.date?.toISOString(),
      time: parsed.time,
      endTime: parsed.endTime,
      slotCount: parsed.slotCount,
      slotGap: parsed.slotGap ?? 30,
      duration: parsed.duration ?? 30,
      bufferTime: parsed.bufferTime,
      recurringType: 'NONE',
    }),
  }).then(r => r.json());
}

export async function handleUpdateAppointment(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/organiser/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titleSearch: parsed.title, time: parsed.time }),
  }).then(r => r.json());
}

export async function handleCancelAppointment(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/organiser/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titleSearch: parsed.title, scope: parsed.scope, date: parsed.date?.toISOString() }),
  }).then(r => r.json());
}
