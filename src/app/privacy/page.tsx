import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Footer } from '@/components/layout/footer';

export const metadata = {
  title: 'Privacy Policy | My Daily Briefing',
  description: 'How we handle your data at My Daily Briefing',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="font-display text-display text-surface-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-surface-500 text-sm mb-10">
          Last updated: February 2025
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              The Short Version
            </h2>
            <p className="text-surface-700 leading-relaxed">
              We collect only what we need to make My Daily Briefing work for you. We don&apos;t sell your data,
              we don&apos;t show you ads, and we don&apos;t share your information with third parties
              except as needed to provide the service. Your reflections and notes are yours.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Information We Collect
            </h2>
            <div className="space-y-4 text-surface-700 leading-relaxed">
              <div>
                <h3 className="font-medium text-surface-900 mb-1">Account Information</h3>
                <p>
                  When you sign in with Google, we receive your name, email address, and profile picture.
                  We use this to create and manage your account.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-surface-900 mb-1">Your Preferences</h3>
                <p>
                  During onboarding and in settings, you tell us about your interests, goals, and
                  preferred topics. We use this to curate your daily brief.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-surface-900 mb-1">Your Reflections</h3>
                <p>
                  When you add notes or voice recordings to brief items, we store these to display
                  them back to you and export them to your Google Doc if you&apos;ve enabled that feature.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-surface-900 mb-1">Usage Data</h3>
                <p>
                  We collect basic analytics about how you use the service (pages visited, features used)
                  to improve My Daily Briefing. This data is aggregated and not tied to your personal identity.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2 text-surface-700 leading-relaxed">
              <li>To personalize your daily brief based on your interests</li>
              <li>To store and display your reflections and notes</li>
              <li>To export your learning log to Google Docs (when enabled)</li>
              <li>To send you your daily brief via email (when enabled)</li>
              <li>To improve and develop new features</li>
              <li>To communicate important updates about the service</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Third-Party Services
            </h2>
            <p className="text-surface-700 leading-relaxed mb-4">
              We use trusted third-party services to provide My Daily Briefing:
            </p>
            <ul className="list-disc list-inside space-y-2 text-surface-700 leading-relaxed">
              <li><strong>Google</strong> — Authentication and Google Docs integration</li>
              <li><strong>AI Services</strong> — To curate and summarize content for your brief</li>
              <li><strong>Deepgram</strong> — To transcribe voice recordings</li>
              <li><strong>Email Provider</strong> — To deliver your daily brief emails</li>
            </ul>
            <p className="text-surface-700 leading-relaxed mt-4">
              These services process data only as needed to provide their functionality
              and are bound by their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Data Security
            </h2>
            <p className="text-surface-700 leading-relaxed">
              We use industry-standard security measures to protect your data, including
              encryption in transit and at rest. Your authentication is handled securely
              through Google OAuth. While no system is perfectly secure, we take reasonable
              precautions to protect your information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Your Rights
            </h2>
            <div className="space-y-2 text-surface-700 leading-relaxed">
              <p>You can:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Access your data through the app at any time</li>
                <li>Update your preferences and interests in settings</li>
                <li>Delete your reflections and notes</li>
                <li>Request deletion of your account and all associated data</li>
              </ul>
              <p className="mt-4">
                To request account deletion or export of your data, contact us at the email below.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Changes to This Policy
            </h2>
            <p className="text-surface-700 leading-relaxed">
              We may update this policy from time to time. If we make significant changes,
              we&apos;ll notify you through the app or via email. Continued use of My Daily Briefing
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Contact
            </h2>
            <p className="text-surface-700 leading-relaxed">
              Questions about this policy? Email us at{' '}
              <a href="mailto:tarunjg@gmail.com" className="text-brand-600 hover:text-brand-700 underline">
                tarunjg@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-surface-200">
          <p className="text-sm text-surface-500">
            See also: <Link href="/terms" className="text-[#1E3A5F] hover:text-[#2D4A6F] underline">Terms of Service</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
