import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Daily Brief',
  description: 'Terms of service for using Daily Brief',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="font-display text-display text-surface-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-surface-500 text-sm mb-10">
          Last updated: February 2025
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              The Basics
            </h2>
            <p className="text-surface-700 leading-relaxed">
              Daily Brief is a service that curates personalized content and helps you build
              a learning log through reflections. By using Daily Brief, you agree to these terms.
              They&apos;re straightforward — we want you to understand what you&apos;re agreeing to.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Your Account
            </h2>
            <div className="space-y-4 text-surface-700 leading-relaxed">
              <p>
                You need a Google account to use Daily Brief. You&apos;re responsible for
                keeping your account secure and for all activity that happens under it.
              </p>
              <p>
                You must be at least 13 years old to use Daily Brief. If you&apos;re under 18,
                please make sure a parent or guardian is okay with you using the service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Your Content
            </h2>
            <div className="space-y-4 text-surface-700 leading-relaxed">
              <p>
                Your reflections, notes, and voice recordings belong to you. We don&apos;t claim
                ownership of anything you create in Daily Brief.
              </p>
              <p>
                By using the service, you give us permission to store, display, and process
                your content as needed to provide the features you use — like syncing your
                learning log to Google Docs or transcribing your voice notes.
              </p>
              <p>
                Please don&apos;t use Daily Brief to store or share content that&apos;s illegal,
                harmful, or violates others&apos; rights.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              The Service
            </h2>
            <div className="space-y-4 text-surface-700 leading-relaxed">
              <p>
                We work hard to make Daily Brief useful and reliable, but we can&apos;t promise
                it will always be available or error-free. Sometimes things break, and we
                appreciate your patience while we fix them.
              </p>
              <p>
                The content we curate for your daily brief comes from various sources across
                the web. We try to select quality sources, but we&apos;re not responsible for
                the accuracy or opinions expressed in third-party content.
              </p>
              <p>
                We use AI to help curate and summarize content. While we strive for accuracy,
                AI-generated summaries may occasionally contain errors or omissions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Acceptable Use
            </h2>
            <p className="text-surface-700 leading-relaxed mb-4">
              We trust you to use Daily Brief responsibly. Please don&apos;t:
            </p>
            <ul className="list-disc list-inside space-y-2 text-surface-700 leading-relaxed">
              <li>Attempt to access other users&apos; accounts or data</li>
              <li>Use automated tools to scrape or overload the service</li>
              <li>Reverse engineer or attempt to extract our source code</li>
              <li>Use the service for any illegal purpose</li>
              <li>Resell or redistribute the service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Changes and Termination
            </h2>
            <div className="space-y-4 text-surface-700 leading-relaxed">
              <p>
                We may update Daily Brief and these terms from time to time. We&apos;ll let
                you know about significant changes. Continued use after changes means
                you accept the new terms.
              </p>
              <p>
                You can stop using Daily Brief anytime. We can also suspend or terminate
                accounts that violate these terms, though we&apos;ll try to give you notice
                when possible.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Limitation of Liability
            </h2>
            <p className="text-surface-700 leading-relaxed">
              Daily Brief is provided &quot;as is.&quot; We do our best, but we can&apos;t guarantee
              the service will meet all your needs or be uninterrupted. To the extent
              permitted by law, we&apos;re not liable for any indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-3">
              Contact
            </h2>
            <p className="text-surface-700 leading-relaxed">
              Questions about these terms? We&apos;re happy to clarify anything — just reach out.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-surface-200">
          <p className="text-sm text-surface-500">
            See also: <Link href="/privacy" className="text-brand-600 hover:text-brand-700 underline">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
