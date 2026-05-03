'use client';
import { useState } from 'react';
import type { ParsedVoiceCommand } from '../types/voice.types';

// All fields an organiser or user might want to review/edit
const FIELD_CONFIG: {
  key: keyof ParsedVoiceCommand;
  label: string;
  type: 'text' | 'date' | 'time' | 'number' | 'select';
  options?: string[];
  roles: ('organiser' | 'customer')[];
  formatValue?: (v: any) => string;
}[] = [
  { key: 'title',           label: 'Title',                    type: 'text',   roles: ['organiser'] },
  { key: 'date',            label: 'Date',                     type: 'date',   roles: ['organiser', 'customer'],
    formatValue: (v) => v instanceof Date ? v.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : String(v) },
  { key: 'time',            label: 'Start Time',               type: 'time',   roles: ['organiser', 'customer'],
    formatValue: (v) => { if (!v) return ''; const [h, m] = String(v).split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; } },
  { key: 'endTime',         label: 'End Time',                 type: 'time',   roles: ['organiser'],
    formatValue: (v) => { if (!v) return ''; const [h, m] = String(v).split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; } },
  { key: 'duration',        label: 'Duration (mins)',          type: 'number', roles: ['organiser'] },
  { key: 'bufferTime',      label: 'Buffer Time (mins)',       type: 'number', roles: ['organiser'] },
  { key: 'recurringType',   label: 'Recurring',                type: 'select', options: ['NONE', 'WEEKLY', 'DAILY', 'MONTHLY'], roles: ['organiser'] },
  { key: 'recurringDays',   label: 'Repeat on Days',          type: 'text',   roles: ['organiser'],
    formatValue: (v) => Array.isArray(v) ? v.join(', ') : String(v ?? '') },
  { key: 'recurringEndDate',label: 'Recurring End Date',       type: 'date',   roles: ['organiser'],
    formatValue: (v) => v instanceof Date ? v.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : String(v ?? 'No end date') },
  { key: 'slotCount',       label: 'Number of Slots',         type: 'number', roles: ['organiser'] },
  { key: 'slotGap',         label: 'Gap Between Slots (mins)',type: 'number', roles: ['organiser'] },
  { key: 'organiserName',   label: 'Organiser',               type: 'text',   roles: ['customer'] },
  { key: 'notes',           label: 'Notes / Reason',          type: 'text',   roles: ['organiser', 'customer'] },
  { key: 'scope',           label: 'Scope',                   type: 'select', options: ['SINGLE', 'ALL'], roles: ['organiser'] },
];

/** Convert a stored HH:MM value to the value used by <input type="time"> */
function toTimeInputValue(raw: any): string {
  if (!raw) return '';
  const s = String(raw);
  // Already HH:MM
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  return '';
}

/** Convert a stored Date to the value used by <input type="date"> (YYYY-MM-DD) */
function toDateInputValue(raw: any): string {
  if (!raw) return '';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

interface Props {
  parsed: ParsedVoiceCommand;
  role: 'organiser' | 'customer';
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: (field: keyof ParsedVoiceCommand, value: any) => void;
}

export default function ConfirmationCard({ parsed, role, onConfirm, onCancel, onEdit }: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Show all fields relevant to the role — even if empty (so organiser can fill them in)
  const visibleFields = FIELD_CONFIG.filter(f => f.roles.includes(role));

  const getRawValue = (key: keyof ParsedVoiceCommand): any => parsed[key];
  const getDisplayValue = (f: typeof FIELD_CONFIG[0]): string => {
    const v = getRawValue(f.key);
    if (v === undefined || v === null || v === '') return '—';
    if (f.formatValue) return f.formatValue(v);
    return String(v);
  };

  const startEditing = (f: typeof FIELD_CONFIG[0]) => {
    const raw = getRawValue(f.key);
    let initial = '';
    if (f.type === 'date') {
      initial = toDateInputValue(raw);
    } else if (f.type === 'time') {
      initial = toTimeInputValue(raw);
    } else if (f.type === 'number') {
      initial = raw !== undefined && raw !== null ? String(raw) : '';
    } else {
      initial = raw !== undefined && raw !== null ? String(raw) : '';
    }
    setEditingField(String(f.key));
    setEditValue(initial);
  };

  const saveEdit = (key: keyof ParsedVoiceCommand) => {
    const cfg = FIELD_CONFIG.find(f => f.key === key);
    let val: any = editValue;
    if (cfg?.type === 'number') {
      val = editValue ? parseInt(editValue) : undefined;
    } else if (cfg?.type === 'date') {
      val = editValue ? new Date(editValue) : undefined;
    }
    // For 'time' type, editValue is already in HH:MM format from <input type="time">
    onEdit(key, val);
    setEditingField(null);
  };

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E0D0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #724A6A 0%, #9B5E93 100%)', padding: '12px 16px' }}>
        <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: 14 }}>
          📅 {role === 'organiser' ? 'Appointment Details — Review & Edit' : 'Booking Details — Review & Confirm'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
          Click ✏️ Edit on any field to change it before confirming
        </p>
      </div>

      {/* Fields */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
        {visibleFields.map(f => {
          const displayVal = getDisplayValue(f);
          const isMissing = displayVal === '—';
          const isEditing = editingField === String(f.key);

          return (
            <div key={String(f.key)} style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              padding: '6px 8px', borderRadius: 8,
              background: isMissing ? '#FFF8E1' : 'transparent',
              border: isMissing ? '1px solid #FFE082' : '1px solid transparent',
            }}>
              <span style={{ color: '#8A8AAA', minWidth: 150, fontSize: 12 }}>
                {f.label}
                {isMissing && <span style={{ color: '#E65100', marginLeft: 4 }}>*</span>}
              </span>

              {isEditing ? (
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {f.type === 'select' ? (
                    <select
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #724A6A', fontSize: 13 }}
                    >
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      value={editValue}
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #724A6A', fontSize: 13 }}
                    />
                  )}
                  <button
                    onClick={() => saveEdit(f.key)}
                    style={{ padding: '4px 8px', background: '#724A6A', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                  >Save</button>
                  <button
                    onClick={() => setEditingField(null)}
                    style={{ padding: '4px 8px', background: '#F3F4F6', color: '#4A4A6A', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                  >✕</button>
                </div>
              ) : (
                <>
                  <span style={{ fontWeight: isMissing ? 400 : 600, color: isMissing ? '#E65100' : '#1A1A2E', flex: 1, fontStyle: isMissing ? 'italic' : 'normal' }}>
                    {isMissing ? 'Not set — tap Edit to add' : displayVal}
                  </span>
                  <button
                    onClick={() => startEditing(f)}
                    style={{ fontSize: 11, padding: '3px 7px', borderRadius: 4, border: '1px solid #E8E0D0', cursor: 'pointer', background: 'white', color: '#724A6A', whiteSpace: 'nowrap' }}
                  >✏️ Edit</button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #E8E0D0' }}>
        <button
          onClick={onConfirm}
          style={{ flex: 1, padding: '11px 0', background: '#2E7D32', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
        >
          ✅ Confirm & Create
        </button>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '11px 0', background: '#F3F4F6', color: '#4A4A6A', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
