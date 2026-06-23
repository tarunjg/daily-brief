import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Users, Mail } from 'lucide-react';

export default async function HomePage() {
  const session = await getSession();

  // If authenticated, redirect to brief or onboarding
  if (session?.user) {
    if (session.user.onboardingCompleted) {
      redirect('/brief');
    } else {
      redirect('/onboarding');
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800" />
        <div className="absolute inset-0 opacity-10"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
               backgroundSize: '32px 32px',
             }} />

        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        bg-white/10 backdrop-blur-sm border border-white/10
                        text-brand-200 text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI for good, every morning
          </div>

          <h1 className="font-display text-display-lg text-white mb-5">
            Daily Company Brief.
            <br />
            <span className="text-brand-300">Good people, good AI.</span>
          </h1>

          <p className="text-lg text-brand-200 max-w-lg mx-auto mb-10 leading-relaxed">
            Each morning: what you need to know in AI, and three founders doing inspiring,
            good work worth meeting — with a personalized intro email drafted on request.
          </p>

          <Link href="/auth/signin" className="btn-primary text-base px-8 py-3.5 !rounded-xl">
            Get Started with Google
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-brand-700" />
            </div>
            <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
              Know AI
            </h3>
            <p className="text-sm text-surface-500 leading-relaxed">
              Three sharp bullets on what matters in AI today. No noise, all signal.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-accent-purple" />
            </div>
            <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
              Meet good people
            </h3>
            <p className="text-sm text-surface-500 leading-relaxed">
              Three founders doing inspiring, mission-driven AI work — your next Forbes profiles.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-accent-green" />
            </div>
            <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
              Reach out
            </h3>
            <p className="text-sm text-surface-500 leading-relaxed">
              One click drafts a personalized intro to their CEO/CPO, with their best contact found for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
