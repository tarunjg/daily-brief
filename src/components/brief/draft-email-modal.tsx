'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { X, Loader2, Copy, Check, RefreshCw, ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion, Linkedin } from 'lucide-react';
import { toast } from 'sonner';

interface CandidateEmail {
  email: string;
  confidence: 'verified' | 'likely' | 'fallback';
  source?: string;
}

export interface PersonContact {
  id: string;
  companyName: string;
  ceoCpoName: string;
  ceoCpoRole: string;
  domainMailable: boolean;
  mailProvider: string | null;
  candidateEmails: CandidateEmail[];
  linkedinUrl: string | null;
}

interface Props {
  person: PersonContact;
  onClose: () => void;
}

const CONFIDENCE: Record<CandidateEmail['confidence'], { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  verified: { label: 'Verified', cls: 'text-accent-green bg-accent-green/10', Icon: ShieldCheck },
  likely: { label: 'Likely (unverified)', cls: 'text-amber-700 bg-amber-50', Icon: ShieldQuestion },
  fallback: { label: 'Fallback inbox', cls: 'text-surface-500 bg-surface-100', Icon: ShieldAlert },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function linkifyBare(escaped: string): string {
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}">${u}</a>`);
}

// Markdown links [label](url) + bare URLs -> HTML anchors (for rich paste).
function toHtml(text: string): string {
  let html = '';
  let last = 0;
  let m: RegExpExecArray | null;
  MD_LINK.lastIndex = 0;
  while ((m = MD_LINK.exec(text)) !== null) {
    html += linkifyBare(esc(text.slice(last, m.index)));
    html += `<a href="${esc(m[2])}">${esc(m[1])}</a>`;
    last = m.index + m[0].length;
  }
  html += linkifyBare(esc(text.slice(last)));
  return html.replace(/\n/g, '<br>');
}

// Markdown links -> "label (url)" so plain-text paste still carries the URL.
function toPlain(text: string): string {
  return text.replace(MD_LINK, '$1 ($2)');
}

// Render markdown links as clickable anchors for the on-screen preview.
function renderBody(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  MD_LINK.lastIndex = 0;
  while ((m = MD_LINK.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Copy both rich (text/html) and plain text, so links paste as embedded hyperlinks.
async function copyRich(text: string) {
  const AnyClipboardItem = (window as any).ClipboardItem;
  try {
    if (navigator.clipboard && AnyClipboardItem) {
      const item = new AnyClipboardItem({
        'text/html': new Blob([toHtml(text)], { type: 'text/html' }),
        'text/plain': new Blob([toPlain(text)], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
      return;
    }
  } catch {
    /* fall through to plain */
  }
  await navigator.clipboard.writeText(toPlain(text));
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await copyRich(value);
      setCopied(true);
      toast.success(`${label || 'Copied'} to clipboard`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function DraftEmailModal({ person, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<{ toEmail: string | null; subject: string; body: string } | null>(null);

  const load = useCallback(async (regenerate = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/people/${person.id}/draft-email${regenerate ? '?regenerate=1' : ''}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setDraft(json.data);
    } catch (e) {
      toast.error('Could not draft the email. Try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [person.id]);

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fullEmail = draft ? `Subject: ${draft.subject}\n\n${draft.body}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-modal animate-slide-up max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-surface-100">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-display text-base font-semibold text-surface-900 truncate">
              Intro to {person.ceoCpoName || person.companyName}
            </h3>
            <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">
              {person.ceoCpoRole}{person.ceoCpoRole && person.companyName ? ' · ' : ''}{person.companyName}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5 -mt-0.5 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-auto space-y-5">
          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Where to reach them</span>
              {person.mailProvider ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3" /> Domain accepts mail · {person.mailProvider}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  <ShieldAlert className="w-3 h-3" /> Domain not mailable — verify manually
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {person.candidateEmails.length === 0 && (
                <p className="text-xs text-surface-400">No email found — use LinkedIn below.</p>
              )}
              {person.candidateEmails.map((c, i) => {
                const meta = CONFIDENCE[c.confidence];
                return (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-surface-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-surface-800 font-mono truncate">{c.email}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.cls}`}>
                        <meta.Icon className="w-3 h-3" /> {meta.label}
                        {c.source && (
                          <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline ml-1 inline-flex items-center gap-0.5">
                            source <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </span>
                    </div>
                    <CopyButton value={c.email} label="Email" />
                  </div>
                );
              })}
              {person.linkedinUrl && (
                <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 pt-1">
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-surface-400 mt-2">
              Likely / fallback addresses are educated guesses — confirm before sending.
            </p>
          </div>

          {/* Draft */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Draft email</span>
              {draft && <CopyButton value={fullEmail} label="Email draft" />}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-surface-500">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span className="text-sm">Drafting a personalized intro…</span>
              </div>
            ) : draft ? (
              <div className="rounded-lg border border-surface-100 bg-surface-50 p-4 space-y-3">
                <div>
                  <p className="text-[11px] text-surface-400 mb-0.5">Subject</p>
                  <p className="text-sm font-medium text-surface-900">{draft.subject}</p>
                </div>
                <div className="border-t border-surface-100 pt-3">
                  <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{renderBody(draft.body)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-surface-400 py-6 text-center">No draft yet.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-3 border-t border-surface-100 flex justify-between gap-2">
          <button onClick={() => load(true)} disabled={loading} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    </div>
  );
}
