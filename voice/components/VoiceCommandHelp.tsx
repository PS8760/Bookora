'use client';
import { useState } from 'react';
import { ORGANISER_EXAMPLES, USER_EXAMPLES } from '../prompts/systemPrompts';

export default function VoiceCommandHelp({ role }: { role: 'organiser' | 'customer' }) {
  const [open, setOpen] = useState(false);
  const examples = role === 'organiser' ? ORGANISER_EXAMPLES : USER_EXAMPLES;
  return (
    <div style={{ borderTop: '1px solid #E8E0D0', paddingTop: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#724A6A', fontWeight: 600, padding: '4px 0' }}>
        {open ? '▲' : '▼'} Example commands
      </button>
      {open && (
        <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {examples.map((ex, i) => (
            <li key={i} style={{ fontSize: 11, color: '#4A4A6A', background: '#F5EDF4', borderRadius: 6, padding: '4px 8px' }}>
              <span style={{ color: '#8A8AAA' }}>Try saying: </span>"{ex}"
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
