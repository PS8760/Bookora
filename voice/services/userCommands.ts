import type { ParsedVoiceCommand } from '../types/voice.types';

export async function handleBookByDateTime(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/user/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: parsed.date?.toISOString(), time: parsed.time, notes: parsed.notes }),
  }).then(r => r.json());
}

export async function handleBookByOrganiser(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/user/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organiserName: parsed.organiserName, date: parsed.date?.toISOString(), notes: parsed.notes }),
  }).then(r => r.json());
}

export async function handleBookNext() {
  return fetch('/api/voice/user/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookNext: true }),
  }).then(r => r.json());
}

export async function handleBookWithDetails(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/user/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: parsed.date?.toISOString(), time: parsed.time, notes: parsed.notes }),
  }).then(r => r.json());
}

export async function handleRescheduleBooking(parsed: ParsedVoiceCommand) {
  return fetch('/api/voice/user/reschedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titleSearch: parsed.title, newDate: parsed.date?.toISOString(), newTime: parsed.time }),
  }).then(r => r.json());
}
