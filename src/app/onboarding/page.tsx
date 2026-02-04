import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/wizard';

export default async function OnboardingPage() {
  const session = await requireAuth();

  // If already onboarded, redirect to brief
  if (session.user.onboardingCompleted) {
    redirect('/brief');
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <OnboardingWizard userName={session.user.name} />
    </div>
  );
}
