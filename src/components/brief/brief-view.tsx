'use client';

import { useState } from 'react';
import { ExternalLink, MessageSquare, Check, Mail, Sparkles, Users, Building2, Linkedin } from 'lucide-react';
import { ReflectModal } from '@/components/reflection/reflect-modal';
import { DraftEmailModal, type PersonContact } from '@/components/brief/draft-email-modal';

interface CandidateEmail {
  email: string;
  confidence: 'verified' | 'likely' | 'fallback';
  source?: string;
}

interface BriefItem {
  id: string;
  itemType: 'ai_news' | 'person';
  position: number;
  title: string;
  summary: string;
  whyItMatters: string;
  topics: string[];
  sourceLinks: { url: string; label: string }[];
  hasReflection: boolean;
  reflectionText: string | null;
  // person-only
  personName?: string | null;
  personRole?: string | null;
  companyName?: string | null;
  companyOneLiner?: string | null;
  ceoCpoName?: string | null;
  ceoCpoRole?: string | null;
  companyDomain?: string | null;
  domainMailable?: boolean | null;
  mailProvider?: string | null;
  candidateEmails?: CandidateEmail[] | null;
  linkedinUrl?: string | null;
}

interface Props {
  items: BriefItem[];
}

export function BriefView({ items }: Props) {
  const [reflectingItemId, setReflectingItemId] = useState<string | null>(null);
  const [emailingPerson, setEmailingPerson] = useState<PersonContact | null>(null);
  const [reflectedItems, setReflectedItems] = useState<Set<string>>(
    new Set(items.filter(i => i.hasReflection).map(i => i.id))
  );

  const reflectingItem = items.find(i => i.id === reflectingItemId);
  const aiNews = items.filter(i => i.itemType === 'ai_news').sort((a, b) => a.position - b.position);
  const people = items.filter(i => i.itemType === 'person').sort((a, b) => a.position - b.position);

  const SourceLinks = ({ links }: { links: { url: string; label: string }[] }) => (
    <div className="flex flex-wrap gap-3">
      {links.map((link, j) => (
        <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors">
          {link.label}
          <ExternalLink className="w-3 h-3" />
        </a>
      ))}
    </div>
  );

  const ReflectButton = ({ item }: { item: BriefItem }) => (
    <button
      onClick={() => setReflectingItemId(item.id)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
        reflectedItems.has(item.id)
          ? 'bg-accent-green/10 text-accent-green'
          : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
      }`}
    >
      {reflectedItems.has(item.id) ? (
        <><Check className="w-3.5 h-3.5" /> Reflected</>
      ) : (
        <><MessageSquare className="w-3.5 h-3.5" /> Reflect</>
      )}
    </button>
  );

  const ReflectionPreview = ({ item }: { item: BriefItem }) =>
    item.reflectionText ? (
      <div className="mt-3 pt-3 border-t border-surface-100">
        <p className="text-xs text-surface-500 italic leading-relaxed">
          &ldquo;{item.reflectionText.slice(0, 150)}{item.reflectionText.length > 150 ? '…' : ''}&rdquo;
        </p>
      </div>
    ) : null;

  return (
    <div className="space-y-10">
      {/* ── Section 1: What you need to know in AI ── */}
      {aiNews.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-surface-500">
              What you need to know in AI
            </h2>
          </div>
          <div className="space-y-4">
            {aiNews.map((item, i) => (
              <article key={item.id} className="brief-card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                {item.topics.length > 0 && (
                  <div className="flex gap-1.5 mb-3">
                    {item.topics.slice(0, 2).map(topic => (
                      <span key={topic} className="text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                <h3 className="font-display text-lg font-semibold text-surface-900 mb-2 leading-snug">{item.title}</h3>
                <p className="text-sm text-surface-600 leading-relaxed mb-3">{item.summary}</p>
                <div className="why-it-matters mb-4">
                  <p className="text-[13px] leading-relaxed">
                    <span className="font-semibold">Why it matters for you: </span>{item.whyItMatters}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <SourceLinks links={item.sourceLinks} />
                  <ReflectButton item={item} />
                </div>
                <ReflectionPreview item={item} />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: People to meet ── */}
      {people.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-accent-purple" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-surface-500">
              People to meet
            </h2>
          </div>
          <div className="space-y-4">
            {people.map((item, i) => (
              <article key={item.id} className="brief-card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                {/* Company + person */}
                <div className="flex items-start gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-surface-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-surface-900 leading-snug">{item.companyName}</h3>
                    <p className="text-xs text-surface-500">{item.companyOneLiner}</p>
                  </div>
                </div>

                {item.personName && (
                  <p className="text-sm text-surface-700 mt-3">
                    <span className="font-semibold">{item.personName}</span>
                    {item.personRole ? ` · ${item.personRole}` : ''}
                  </p>
                )}

                {/* Why meet */}
                <div className="why-it-matters my-3">
                  <p className="text-[13px] leading-relaxed">
                    <span className="font-semibold">Why you should meet them: </span>{item.whyItMatters}
                  </p>
                </div>

                {/* Contact line */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500 mb-4">
                  {item.ceoCpoName && (
                    <span>Contact: <span className="font-medium text-surface-700">{item.ceoCpoName}</span>{item.ceoCpoRole ? ` (${item.ceoCpoRole})` : ''}</span>
                  )}
                  {item.mailProvider ? (
                    <span className="inline-flex items-center gap-1 text-accent-green">· domain mailable</span>
                  ) : item.companyDomain ? (
                    <span className="inline-flex items-center gap-1 text-amber-600">· domain unverified</span>
                  ) : null}
                  {item.linkedinUrl && (
                    <a href={item.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800">
                      <Linkedin className="w-3 h-3" /> LinkedIn
                    </a>
                  )}
                </div>

                {/* Footer: sources + actions */}
                <div className="flex items-center justify-between">
                  <SourceLinks links={item.sourceLinks} />
                  <div className="flex items-center gap-2">
                    <ReflectButton item={item} />
                    <button
                      onClick={() => setEmailingPerson({
                        id: item.id,
                        companyName: item.companyName || '',
                        ceoCpoName: item.ceoCpoName || '',
                        ceoCpoRole: item.ceoCpoRole || '',
                        domainMailable: !!item.domainMailable,
                        mailProvider: item.mailProvider || null,
                        candidateEmails: item.candidateEmails || [],
                        linkedinUrl: item.linkedinUrl || null,
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" /> Draft intro email
                    </button>
                  </div>
                </div>
                <ReflectionPreview item={item} />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Reflect modal */}
      {reflectingItem && (
        <ReflectModal
          item={{ id: reflectingItem.id, title: reflectingItem.title, summary: reflectingItem.summary }}
          onClose={() => setReflectingItemId(null)}
          onSaved={(itemId) => {
            setReflectedItems(prev => {
              const next = new Set(prev);
              next.add(itemId);
              return next;
            });
            setReflectingItemId(null);
          }}
        />
      )}

      {/* Draft email modal */}
      {emailingPerson && (
        <DraftEmailModal person={emailingPerson} onClose={() => setEmailingPerson(null)} />
      )}
    </div>
  );
}
