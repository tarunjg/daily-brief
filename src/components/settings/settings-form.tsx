'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ExternalLink, Check, Trash2 } from 'lucide-react';
import { SUGGESTED_INTERESTS, INDUSTRIES, SENIORITY_LEVELS } from '@/lib/pipeline/sources';
import { toast } from 'sonner';
import type { GoalEntry, Seniority } from '@/types';

interface Props {
  initialData: {
    interests: string[];
    goals: GoalEntry[];
    roleTitle: string;
    seniority: string;
    industries: string[];
    geography: string;
    timezone: string;
    emailBriefEnabled: boolean;
    googleDocId: string | null;
  };
}

export function SettingsForm({ initialData }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [interests, setInterests] = useState(initialData.interests);
  const [goals, setGoals] = useState(
    initialData.goals.length > 0
      ? initialData.goals.map(g => g.text)
      : ['']
  );
  const [roleTitle, setRoleTitle] = useState(initialData.roleTitle);
  const [seniority, setSeniority] = useState(initialData.seniority);
  const [industries, setIndustries] = useState(initialData.industries);
  const [geography, setGeography] = useState(initialData.geography);
  const [timezone, setTimezone] = useState(initialData.timezone);
  const [emailEnabled, setEmailEnabled] = useState(initialData.emailBriefEnabled);

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 7 ? [...prev, interest] : prev
    );
  };

  const toggleIndustry = (industry: string) => {
    setIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests,
          goals: goals.filter(g => g.trim()).map((text, i) => ({ text, priority: i + 1 })),
          roleTitle,
          seniority,
          industries,
          geography,
          timezone,
          emailBriefEnabled: emailEnabled,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success('Settings saved');
      router.refresh();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Interests */}
      <section className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
        <h2 className="font-display text-lg font-semibold text-surface-900 mb-1">Interests</h2>
        <p className="text-xs text-surface-400 mb-4">3–7 topics that shape your brief.</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_INTERESTS.map(interest => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={interests.includes(interest) ? 'pill-active' : 'pill-inactive'}
            >
              {interest}
              {interests.includes(interest) && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          ))}
        </div>
      </section>

      {/* Goals */}
      <section className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
        <h2 className="font-display text-lg font-semibold text-surface-900 mb-1">Goals</h2>
        <p className="text-xs text-surface-400 mb-4">What you're working toward — each item is tied to these.</p>
        <div className="space-y-2">
          {goals.map((goal, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={goal}
                onChange={e => {
                  const next = [...goals];
                  next[i] = e.target.value;
                  setGoals(next);
                }}
                className="input-field flex-1"
                placeholder="e.g., Stay current on AI regulation"
              />
              {goals.length > 1 && (
                <button
                  onClick={() => setGoals(goals.filter((_, j) => j !== i))}
                  className="btn-ghost text-surface-400 hover:text-accent-red"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {goals.length < 3 && (
            <button onClick={() => setGoals([...goals, ''])} className="btn-ghost text-brand-600 text-sm">
              + Add goal
            </button>
          )}
        </div>
      </section>

      {/* Role */}
      <section className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
        <h2 className="font-display text-lg font-semibold text-surface-900 mb-4">Role & Industry</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Job title</label>
            <input type="text" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Seniority</label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => setSeniority(level.value)}
                  className={seniority === level.value ? 'pill-active' : 'pill-inactive'}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Industries</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={industries.includes(industry) ? 'pill-active' : 'pill-inactive'}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
        <h2 className="font-display text-lg font-semibold text-surface-900 mb-4">Delivery</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-700">Email delivery</p>
              <p className="text-xs text-surface-400">Receive your brief by email each morning</p>
            </div>
            <button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                emailEnabled ? 'bg-brand-600' : 'bg-surface-300'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                emailEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} className="input-field">
              {Intl.supportedValuesOf('timeZone').map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Google Doc link */}
      {initialData.googleDocId && (
        <section className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
          <h2 className="font-display text-lg font-semibold text-surface-900 mb-2">Learning Log</h2>
          <a
            href={`https://docs.google.com/document/d/${initialData.googleDocId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 font-medium"
          >
            Open your Learning Log in Google Docs
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>
      )}

      {/* Save */}
      <div className="flex justify-end pb-8">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
