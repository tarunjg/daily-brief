import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/auth/signin');
  }
  return session;
}

export async function requireOnboarding() {
  const session = await requireAuth();
  if (!session.user.onboardingCompleted) {
    redirect('/onboarding');
  }
  return session;
}
