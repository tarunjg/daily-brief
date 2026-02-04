import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateBriefForUser } from '@/lib/pipeline/orchestrate';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  try {
    const digestId = await generateBriefForUser(session.user.id);
    return NextResponse.redirect(new URL('/brief', req.url));
  } catch (error) {
    console.error('Brief generation error:', error);
    return NextResponse.redirect(new URL('/brief?error=generation_failed', req.url));
  }
}
