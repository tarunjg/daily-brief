'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, ChevronLeft, Check, Loader2, Upload } from 'lucide-react';
import { SUGGESTED_INTERESTS, INDUSTRIES, SENIORITY_LEVELS } from '@/lib/pipeline/sources';
import { toast } from 'sonner';
import type { Seniority, GoalEntry } from '@/types';

interface Props {
  userName: string;
}

const TOTAL_STEPS = 7;

const SUGGESTED_FUN_ACTIVITIES = [
  'Sports', 'Fitness', 'Music', 'Gaming', 'Cooking',
  'Travel', 'Reading', 'Photography', 'Hiking', 'Art',
  'Movies & TV', 'Podcasts', 'Gardening', 'Writing', 'Volunteering'
];

export function OnboardingWizard({ userName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [goals, setGoals] = useState<string[]>(['']);
  const [roleTitle, setRoleTitle] = useState('');
  const [seniority, setSeniority] = useState<Seniority>('IC');
  const [industries, setIndustries] = useState<string[]>([]);
  const [geography, setGeography] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [funActivities, setFunActivities] = useState<string[]>([]);
  const [customActivity, setCustomActivity] = useState('');
  const [linkedinText, setLinkedinText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const toggleFunActivity = (activity: string) => {
    setFunActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : prev.length < 5 ? [...prev, activity] : prev
    );
  };

  const addCustomActivity = () => {
    if (customActivity.trim() && funActivities.length < 5) {
      setFunActivities(prev => [...prev, customActivity.trim()]);
      setCustomActivity('');
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 7 ? [...prev, interest] : prev
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && interests.length < 7) {
      setInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const toggleIndustry = (industry: string) => {
    setIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return interests.length >= 3;
      case 2: return goals.filter(g => g.trim()).length >= 1;
      case 3: return roleTitle.trim() && seniority && industries.length >= 1;
      case 4: return true; // geography is optional (auto-detected)
      case 5: return true; // fun activities is optional but encouraged
      case 6: return true; // linkedin/resume is optional
      case 7: return true; // confirmation
      default: return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload resume if provided
      let resumeText = '';
      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        const uploadRes = await fetch('/api/onboarding/parse-resume', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          resumeText = data.text || '';
        }
      }

      // Save preferences
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests,
          goals: goals.filter(g => g.trim()).map((text, i) => ({ text, priority: i + 1 })),
          roleTitle,
          seniority,
          industries,
          geography: geography || 'Not specified',
          timezone,
          funActivities,
          linkedinText,
          resumeText,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('You are all set! Generating your first brief...');
      router.push('/brief');
      router.refresh();
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-20">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <h1 className="font-display text-display-sm text-surface-900 mb-1">
          Welcome, {userName.split(' ')[0]}
        </h1>
        <p className="text-surface-500 text-sm">
          Let's personalize your daily brief. This takes about 2 minutes.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-10">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < step ? 'bg-brand-600' : i === step - 1 ? 'bg-brand-400' : 'bg-surface-200'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6 sm:p-8 animate-fade-in">
        {/* Step 1: Interests */}
        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-1">
              What topics interest you?
            </h2>
            <p className="text-surface-500 text-sm mb-6">
              Pick 3–7 topics. These shape what appears in your brief.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTED_INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={interests.includes(interest) ? 'pill-active' : 'pill-inactive'}
                >
                  {interest}
                  {interests.includes(interest) && <Check className="w-3.5 h-3.5 ml-1" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInterest}
                onChange={e => setCustomInterest(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomInterest()}
                placeholder="Add your own..."
                className="input-field flex-1"
              />
              <button onClick={addCustomInterest} className="btn-secondary">
                Add
              </button>
            </div>
            <p className="text-xs text-surface-400 mt-3">
              {interests.length}/7 selected {interests.length < 3 && '(minimum 3)'}
            </p>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-1">
              What are your professional goals?
            </h2>
            <p className="text-surface-500 text-sm mb-6">
              We'll connect each news item to what you're working toward.
            </p>
            <div className="space-y-3">
              {goals.map((goal, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex-shrink-0 w-6 h-10 flex items-center justify-center text-sm text-surface-400 font-medium">
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    value={goal}
                    onChange={e => {
                      const next = [...goals];
                      next[i] = e.target.value;
                      setGoals(next);
                    }}
                    placeholder={
                      i === 0 ? 'e.g., "Stay current on AI regulation"'
                      : i === 1 ? 'e.g., "Prepare for board presentations"'
                      : 'e.g., "Build thought leadership in my field"'
                    }
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            {goals.length < 3 && (
              <button
                onClick={() => setGoals([...goals, ''])}
                className="btn-ghost text-brand-600 mt-3"
              >
                + Add another goal
              </button>
            )}
          </div>
        )}

        {/* Step 3: Role & Industry */}
        {step === 3 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-1">
              Tell us about your role
            </h2>
            <p className="text-surface-500 text-sm mb-6">
              This helps us calibrate the depth and focus of your brief.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Job title
                </label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                  placeholder="e.g., VP of Product"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Seniority level
                </label>
                <div className="flex flex-wrap gap-2">
                  {SENIORITY_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => setSeniority(level.value as Seniority)}
                      className={seniority === level.value ? 'pill-active' : 'pill-inactive'}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Industries
                </label>
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
          </div>
        )}

        {/* Step 4: Geography */}
        {step === 4 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-1">
              Where are you based?
            </h2>
            <p className="text-surface-500 text-sm mb-6">
              We'll prioritize regional news and deliver your brief at the right time.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={geography}
                  onChange={e => setGeography(e.target.value)}
                  placeholder="e.g., San Francisco Bay Area"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="input-field"
                >
                  {Intl.supportedValuesOf('timeZone').map(tz => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <p className="text-xs text-surface-400 mt-1.5">
                  Auto-detected: {timezone.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Fun Activities */}
        {step === 5 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-1">
              What do you enjoy outside work?
            </h2>
            <p className="text-surface-500 text-sm mb-6">
              We'll use these to make explanations more relatable and include some fun content too.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTED_FUN_ACTIVITIES.map(activity => (
                <button
                  key={activity}
                  onClick={() => toggleFunActivity(activity)}
                  className={funActivities.includes(activity) ? 'pill-active' : 'pill-inactive'}
                >
                  {activity}
                  {funActivities.includes(activity) && <Check className="w-3.5 h-3.5 ml-1" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customActivity}
                onChange={e => setCustomActivity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomActivity()}
                placeholder="Add your own..."
                className="input-field flex-1"
              />
              <button onClick={addCustomActivity} className="btn-secondary">
                Add
              </button>
            </div>
            <p className="text-xs text-surface-400 mt-3">
              {funActivities.length}/5 selected (optional but helps personalization!)
            </p>
          </div>
        )}

        {/* Step 6: Professional Background */}
        {step === 6 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-1">
              Professional background
              <span className="text-surface-400 text-base font-normal ml-2">(optional)</span>
            </h2>
            <p className="text-surface-500 text-sm mb-6">
              Paste your LinkedIn About + Experience, or upload a resume. This helps us personalize the "Why it matters" for each item.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  LinkedIn About + Experience
                </label>
                <textarea
                  value={linkedinText}
                  onChange={e => setLinkedinText(e.target.value)}
                  placeholder="Paste your LinkedIn summary and key experience here..."
                  rows={6}
                  className="input-field resize-none"
                />
              </div>
              <div className="text-center text-sm text-surface-400">or</div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Upload a resume (PDF)
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-8
                                border-2 border-dashed border-surface-300 rounded-xl
                                cursor-pointer hover:border-brand-400 hover:bg-brand-50/30
                                transition-all duration-150">
                  <Upload className="w-5 h-5 text-surface-400" />
                  <span className="text-sm text-surface-500">
                    {resumeFile ? resumeFile.name : 'Click to upload PDF'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => setResumeFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Confirmation */}
        {step === 7 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-surface-900 mb-1">
              Looking good!
            </h2>
            <p className="text-surface-500 text-sm mb-6">
              Here's a summary. We'll generate your first brief right after you confirm.
            </p>
            <div className="space-y-4 text-sm">
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="font-medium text-surface-700 mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map(i => (
                    <span key={i} className="px-2.5 py-1 bg-brand-100 text-brand-800 rounded-full text-xs font-medium">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="font-medium text-surface-700 mb-2">Goals</p>
                <ol className="list-decimal list-inside text-surface-600 space-y-1">
                  {goals.filter(g => g.trim()).map((g, i) => <li key={i}>{g}</li>)}
                </ol>
              </div>
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="font-medium text-surface-700 mb-1">Role</p>
                <p className="text-surface-600">{roleTitle} ({seniority}) · {industries.join(', ')}</p>
              </div>
              {(geography || timezone) && (
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="font-medium text-surface-700 mb-1">Location</p>
                  <p className="text-surface-600">{geography || 'Not specified'} · {timezone}</p>
                </div>
              )}
              {funActivities.length > 0 && (
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="font-medium text-surface-700 mb-2">Fun & Hobbies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {funActivities.map(a => (
                      <span key={a} className="px-2.5 py-1 bg-accent-purple/10 text-accent-purple rounded-full text-xs font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(linkedinText || resumeFile) && (
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="font-medium text-surface-700 mb-1">Background</p>
                  <p className="text-surface-600">
                    {linkedinText ? '✓ LinkedIn text provided' : ''}
                    {resumeFile ? '✓ Resume uploaded' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          className={`btn-ghost ${step === 1 ? 'invisible' : ''}`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="btn-primary"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Generate my first brief
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
