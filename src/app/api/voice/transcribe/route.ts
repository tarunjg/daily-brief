import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { transcribeAudio } from '@/lib/services/transcription';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Validate file size (max 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/webm';

    const result = await transcribeAudio(buffer, mimeType);

    return NextResponse.json({
      transcript: result.transcript,
      confidence: result.confidence,
      durationSeconds: result.durationSeconds,
      status: result.status,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
