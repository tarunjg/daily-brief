import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { users, userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLearningLogDoc } from '@/lib/services/google-docs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Update preferences
    await db.update(userPreferences).set({
      interests: body.interests || [],
      goals: body.goals || [],
      roleTitle: body.roleTitle || '',
      seniority: body.seniority || 'IC',
      industries: body.industries || [],
      geography: body.geography || '',
      linkedinText: body.linkedinText || null,
      resumeText: body.resumeText || null,
      updatedAt: new Date(),
    }).where(eq(userPreferences.userId, session.user.id));

    // Update user timezone and mark onboarding complete
    await db.update(users).set({
      timezone: body.timezone || 'America/New_York',
      onboardingCompleted: true,
      updatedAt: new Date(),
    }).where(eq(users.id, session.user.id));

    // Create the Google Doc (if we have tokens)
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (user?.googleAccessToken && user?.googleRefreshToken) {
      try {
        await createLearningLogDoc(
          session.user.id,
          session.user.name || 'User',
          user.googleAccessToken,
          user.googleRefreshToken,
        );
      } catch (docError) {
        console.error('Failed to create Google Doc:', docError);
        // Non-blocking: we can retry later
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
