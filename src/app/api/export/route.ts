import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { appendReflectionsToDoc } from '@/lib/services/google-docs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  try {
    const result = await appendReflectionsToDoc(session.user.id);

    if (result.exported === 0) {
      return NextResponse.redirect(new URL('/brief?toast=no_reflections', req.url));
    }

    return NextResponse.redirect(new URL('/brief?toast=exported', req.url));
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.redirect(new URL('/brief?error=export_failed', req.url));
  }
}
