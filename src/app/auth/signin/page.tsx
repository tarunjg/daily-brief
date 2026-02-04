'use client';

import { signIn } from 'next-auth/react';
import { Logo } from '@/components/ui/logo';
import { Footer } from '@/components/layout/footer';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Logo />
            </div>
            <h1 className="font-display text-display-sm text-surface-900 mb-2">
              Welcome to My Daily Brief
            </h1>
            <p className="text-surface-500 text-sm">
              Sign in to get your personalized daily intelligence.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
            <button
              onClick={() => signIn('google', { callbackUrl: '/onboarding' })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3
                       bg-white border border-surface-300 rounded-xl text-sm font-semibold
                       text-surface-700 hover:bg-surface-50 hover:border-surface-400
                       transition-all duration-150 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="mt-4 text-center text-xs text-surface-400 leading-relaxed">
              We'll request access to create and edit a Google Doc for your learning log.
              You can revoke access at any time.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
