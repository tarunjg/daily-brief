'use client';

import { useState } from 'react';
import { ExternalLink, MessageSquare, Check } from 'lucide-react';
import { ReflectModal } from '@/components/reflection/reflect-modal';

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

  const reflectingItem = items.find(i => i.id === reflectingItemId);

  return (
    <div className="space-y-4">
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
            setReflectedItems(prev => new Set(Array.from(prev).concat(itemId)));
            setReflectingItemId(null);
          }}
        />
      )}
    </div>
  );
}
