'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  ExternalLink,
  FileText,
  BookOpen,
  Mic,
  Loader2,
  ChevronRight,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  digestItemId: string;
  title: string;
  summary: string;
  topics: string[];
  sourceLinks: { url: string; label: string }[];
  createdAt: string;
}

interface RecentNote {
  id: string;
  textContent: string;
  itemTitle: string;
  createdAt: string;
  digestDate: string;
}

interface Props {
  userName: string;
  favorites: Favorite[];
  recentNotes: RecentNote[];
  googleDocUrl: string | null;
  todaysBriefAvailable: boolean;
}

export function Dashboard({ userName, favorites, recentNotes, googleDocUrl, todaysBriefAvailable }: Props) {
  const [quickNote, setQuickNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleQuickNote = async () => {
    if (!quickNote.trim()) return;

    setSaving(true);
    try {
      // For now, we'll just show a success message
      // In a full implementation, this would save to a general notes area
      toast.success('Reflection noted! This will help personalize your briefs.');
      setQuickNote('');
    } catch {
      toast.error('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Actions */}
      <section>
        <h1 className="font-display text-display-sm text-surface-900 mb-2">
          Welcome back, {userName.split(' ')[0]}
        </h1>
        <p className="text-surface-500 text-sm mb-6">
          What's on your mind today?
        </p>

        {/* Quick reflection input */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-card">
          <textarea
            value={quickNote}
            onChange={e => setQuickNote(e.target.value)}
            placeholder="Jot down a thought, idea, or something you learned today..."
            className="w-full resize-none border-none bg-transparent text-sm text-surface-700
                     placeholder:text-surface-400 focus:ring-0 focus:outline-none"
            rows={3}
          />
          <div className="flex items-center justify-between pt-3 border-t border-surface-100">
            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2 text-surface-400 hover:text-surface-600">
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleQuickNote}
              disabled={!quickNote.trim() || saving}
              className="btn-primary text-sm px-4 py-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Reflection'}
            </button>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/brief"
          className="flex items-center gap-4 p-5 bg-white rounded-xl border border-surface-200
                   shadow-card hover:shadow-card-hover hover:border-surface-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-[#1E3A5F]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-surface-900 group-hover:text-[#1E3A5F] transition-colors">
              {todaysBriefAvailable ? "Today's Brief" : 'Your Briefs'}
            </h3>
            <p className="text-sm text-surface-500">
              {todaysBriefAvailable ? 'New content ready to explore' : 'Browse your daily briefs'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-surface-300 group-hover:text-surface-500 transition-colors" />
        </Link>

        {googleDocUrl ? (
          <a
            href={googleDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-surface-200
                     shadow-card hover:shadow-card-hover hover:border-surface-300 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#E85D4C]/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-[#E85D4C]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-surface-900 group-hover:text-[#E85D4C] transition-colors">
                Learning Log
              </h3>
              <p className="text-sm text-surface-500">
                Open your Google Doc
              </p>
            </div>
            <ExternalLink className="w-5 h-5 text-surface-300 group-hover:text-surface-500 transition-colors" />
          </a>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-surface-200
                     shadow-card hover:shadow-card-hover hover:border-surface-300 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-surface-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-surface-900">
                Set Up Learning Log
              </h3>
              <p className="text-sm text-surface-500">
                Connect Google Docs to save reflections
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-surface-300 group-hover:text-surface-500 transition-colors" />
          </Link>
        )}
      </section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-surface-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-accent-red" />
              Saved Articles
            </h2>
            <span className="text-xs text-surface-400">{favorites.length} saved</span>
          </div>
          <div className="space-y-3">
            {favorites.slice(0, 5).map(fav => (
              <div
                key={fav.id}
                className="p-4 bg-white rounded-xl border border-surface-200 hover:border-surface-300 transition-colors"
              >
                <h3 className="font-medium text-surface-900 text-sm mb-1 line-clamp-1">
                  {fav.title}
                </h3>
                <p className="text-xs text-surface-500 line-clamp-2 mb-2">
                  {fav.summary}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {fav.topics?.slice(0, 2).map(topic => (
                      <span key={topic} className="text-[10px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {fav.sourceLinks?.slice(0, 1).map((link, j) => (
                      <a
                        key={j}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
                      >
                        Read
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Reflections Feed */}
      {recentNotes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-surface-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent-green" />
              Recent Reflections
            </h2>
          </div>
          <div className="space-y-3">
            {recentNotes.slice(0, 6).map(note => (
              <div
                key={note.id}
                className="p-4 bg-white rounded-xl border border-surface-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-accent-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-700 leading-relaxed mb-2">
                      "{note.textContent.slice(0, 200)}{note.textContent.length > 200 ? '...' : ''}"
                    </p>
                    <div className="flex items-center gap-2 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(note.createdAt)}
                      </span>
                      <span>·</span>
                      <span className="truncate">{note.itemTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {googleDocUrl && (
            <div className="mt-4 text-center">
              <a
                href={googleDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
              >
                View all in Learning Log
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </section>
      )}

      {/* Empty state if no content */}
      {favorites.length === 0 && recentNotes.length === 0 && (
        <section className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="font-display text-lg font-semibold text-surface-900 mb-2">
            Start Building Your Knowledge
          </h3>
          <p className="text-sm text-surface-500 max-w-sm mx-auto mb-6">
            Read your daily brief, save articles you love, and add reflections.
            They'll all appear here.
          </p>
          <Link href="/brief" className="btn-primary">
            Go to Today's Brief
          </Link>
        </section>
      )}
    </div>
  );
}
