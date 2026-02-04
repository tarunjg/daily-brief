'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { BookOpen, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function AppHeader() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/brief" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center
                          group-hover:bg-brand-700 transition-colors">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-surface-900">
              Daily Brief
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <Link href="/brief" className="btn-ghost text-surface-600">
              Brief
            </Link>
            <Link href="/settings" className="btn-ghost text-surface-600">
              <Settings className="w-4 h-4" />
            </Link>
            {session?.user && (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="btn-ghost text-surface-400 hover:text-surface-600"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="sm:hidden btn-ghost"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden pb-4 border-t border-surface-100 pt-3 animate-fade-in">
            <Link
              href="/brief"
              className="block px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-lg"
              onClick={() => setMenuOpen(false)}
            >
              Today's Brief
            </Link>
            <Link
              href="/settings"
              className="block px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-lg"
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
            {session?.user && (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="block w-full text-left px-3 py-2 text-sm text-surface-400 hover:bg-surface-50 rounded-lg"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
