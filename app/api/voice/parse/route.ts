import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { parseVoiceCommand } from '@/voice/services/voiceParser';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transcript } = await request.json();
  if (!transcript) return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });

  const parsed = parseVoiceCommand(transcript);
  return NextResponse.json({ parsed });
}
