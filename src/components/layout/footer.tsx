import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-surface-400">
            © {new Date().getFullYear()} My Daily Briefing
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
