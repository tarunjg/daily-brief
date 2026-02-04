'use client';

import { useState } from 'react';
import { ExternalLink, MessageSquare, Check, Mic } from 'lucide-react';
import { ReflectModal } from '@/components/reflection/reflect-modal';
import { VoiceNoteModal } from '@/components/voice/voice-note-modal';

interface BriefItem {
  id: string;
  position: number;
  title: string;
  summary: string;
  whyItMatters: string;
  relevanceScore: number | null;
  topics: string[];
  sourceLinks: { url: string; label: string }[];
  hasReflection: boolean;
  reflectionText: string | null;
}

interface Props {
  items: BriefItem[];
  digestId: string;
}

export function BriefView({ items, digestId }: Props) {
  const [reflectingItemId, setReflectingItemId] = useState<string | null>(null);
  const [reflectedItems, setReflectedItems] = useState<Set<string>>(
    new Set(items.filter(i => i.hasReflection).map(i => i.id))
  );
  const [showVoiceNote, setShowVoiceNote] = useState(false);

  const reflectingItem = items.find(i => i.id === reflectingItemId);

  return (
    <div className="space-y-4">
      {/* Quick Voice Note Button */}
      <button
        onClick={() => setShowVoiceNote(true)}
        className="w-full flex items-center justify-center gap-2 py-4 px-4 mb-4
                  bg-gradient-to-r from-brand-50 to-accent-purple/10
                  border border-brand-200 rounded-xl
                  text-brand-700 font-medium text-sm
                  hover:from-brand-100 hover:to-accent-purple/20
                  transition-all duration-200 group"
      >
        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center
                      group-hover:bg-brand-700 transition-colors shadow-sm">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <span>Record a quick voice note</span>
      </button>

      {items.map((item, i) => (
        <article
          key={item.id}
          className="brief-card animate-slide-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Topics */}
          {item.topics.length > 0 && (
            <div className="flex gap-1.5 mb-3">
              {item.topics.slice(0, 2).map(topic => (
                <span key={topic} className="text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="font-display text-lg font-semibold text-surface-900 mb-2 leading-snug">
            {item.title}
          </h3>

          {/* Summary */}
          <p className="text-sm text-surface-600 leading-relaxed mb-3">
            {item.summary}
          </p>

          {/* Why it matters */}
          <div className="why-it-matters mb-4">
            <p className="text-[13px] leading-relaxed">
              <span className="font-semibold">Why it matters for you: </span>
              {item.whyItMatters}
            </p>
          </div>

          {/* Footer: links + reflect */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {item.sourceLinks.map((link, j) => (
                <a
                  key={j}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium
                           text-brand-600 hover:text-brand-800 transition-colors"
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>

            <button
              onClick={() => setReflectingItemId(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                transition-all duration-150 ${
                reflectedItems.has(item.id)
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {reflectedItems.has(item.id) ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Reflected
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5" />
                  Reflect
                </>
              )}
            </button>
          </div>

          {/* Inline reflection preview */}
          {item.reflectionText && (
            <div className="mt-3 pt-3 border-t border-surface-100">
              <p className="text-xs text-surface-500 italic leading-relaxed">
                "{item.reflectionText.slice(0, 150)}{item.reflectionText.length > 150 ? '...' : ''}"
              </p>
            </div>
          )}
        </article>
      ))}

      {/* Reflect Modal */}
      {reflectingItem && (
        <ReflectModal
          item={reflectingItem}
          onClose={() => setReflectingItemId(null)}
          onSaved={(itemId) => {
            setReflectedItems(prev => new Set([...prev, itemId]));
            setReflectingItemId(null);
          }}
        />
      )}

      {/* Voice Note Modal */}
      {showVoiceNote && (
        <VoiceNoteModal
          onClose={() => setShowVoiceNote(false)}
          digestId={digestId}
        />
      )}
    </div>
  );
}
