import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Mic, FileText, Sparkles } from 'lucide-react';

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
            Personalized intelligence, every morning
          </div>

          <h1 className="font-display text-display-lg text-white mb-5">
            Your Daily Brief.
            <br />
            <span className="text-brand-300">Your Learning Log.</span>
          </h1>

          <p className="text-lg text-brand-200 max-w-lg mx-auto mb-10 leading-relaxed">
            A curated newsletter tailored to your goals, with built-in 
            reflection — typed or spoken — that builds into your personal knowledge base.
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
              <BookOpen className="w-6 h-6 text-brand-700" />
            </div>
            <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
              Curated for You
            </h3>
            <p className="text-sm text-surface-500 leading-relaxed">
              6–10 items daily, matched to your interests and goals. No noise, all signal.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-6 h-6 text-accent-green" />
            </div>
            <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
              Reflect & Record
            </h3>
            <p className="text-sm text-surface-500 leading-relaxed">
              Type or record voice notes on any item. Auto-transcribed and editable.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-accent-purple" />
            </div>
            <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
              Learning Log
            </h3>
            <p className="text-sm text-surface-500 leading-relaxed">
              Reflections auto-export to a Google Doc — your growing knowledge base.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
