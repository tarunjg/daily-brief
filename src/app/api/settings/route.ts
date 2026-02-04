import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { users, userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest) {
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
      updatedAt: new Date(),
    }).where(eq(userPreferences.userId, session.user.id));

    // Update user settings
    await db.update(users).set({
      timezone: body.timezone,
      emailBriefEnabled: body.emailBriefEnabled,
      updatedAt: new Date(),
    }).where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
