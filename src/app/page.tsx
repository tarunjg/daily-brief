import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Mic, FileText, Sparkles, BookOpen } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Footer } from '@/components/layout/footer';

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
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] via-[#2D4A6F] to-[#1E3A5F]" />
        <div className="absolute inset-0 opacity-10"
             style={{
               backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
               backgroundSize: '32px 32px',
             }} />

        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-20 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg">
              <Logo />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        bg-white/10 backdrop-blur-sm border border-white/10
                        text-white/80 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Personalized intelligence, every morning
          </div>

          <h1 className="font-display text-display-lg text-white mb-5">
            Your Daily Brief.
            <br />
            <span className="text-[#E85D4C]">Your Learning Log.</span>
          </h1>

          <p className="text-lg text-white/80 max-w-lg mx-auto mb-10 leading-relaxed">
            A curated newsletter tailored to your goals, with built-in
            reflection — typed or spoken — that builds into your personal knowledge base.
          </p>

          <Link href="/auth/signin" className="inline-flex items-center gap-2 bg-[#E85D4C] hover:bg-[#D64D3C] text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-lg">
            Get Started with Google
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-[#1E3A5F]" />
              </div>
              <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
                Curated for You
              </h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                6–10 items daily, matched to your interests and goals. No noise, all signal.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[#E85D4C]/10 flex items-center justify-center mx-auto mb-4">
                <Mic className="w-6 h-6 text-[#E85D4C]" />
              </div>
              <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
                Reflect & Record
              </h3>
              <p className="text-sm text-surface-500 leading-relaxed">
                Type or record voice notes on any item. Auto-transcribed and editable.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-[#1E3A5F]" />
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
