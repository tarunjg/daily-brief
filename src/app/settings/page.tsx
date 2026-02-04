import { requireOnboarding } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AppHeader } from '@/components/layout/app-header';
import { SettingsForm } from '@/components/settings/settings-form';
import type { GoalEntry } from '@/types';

export default async function SettingsPage() {
  const session = await requireOnboarding();

  const [prefs] = await db.select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1);

  const [user] = await db.select({
    timezone: users.timezone,
    emailBriefEnabled: users.emailBriefEnabled,
    googleDocId: users.googleDocId,
  })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <div className="min-h-screen bg-surface-50">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-display-sm text-surface-900 mb-1">Settings</h1>
        <p className="text-surface-500 text-sm mb-8">
          Update your preferences to refine your daily brief.
        </p>

        <SettingsForm
          initialData={{
            interests: prefs?.interests || [],
            goals: (prefs?.goals as GoalEntry[]) || [],
            roleTitle: prefs?.roleTitle || '',
            seniority: prefs?.seniority || 'IC',
            industries: prefs?.industries || [],
            geography: prefs?.geography || '',
            timezone: user?.timezone || 'America/New_York',
            emailBriefEnabled: user?.emailBriefEnabled ?? true,
            googleDocId: user?.googleDocId || null,
          }}
        />
      </main>
    </div>
  );
}
