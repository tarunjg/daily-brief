import { NextRequest, NextResponse } from 'next/server';
import { generateBriefsForAllUsers } from '@/lib/pipeline/orchestrate';

/**
 * Cron endpoint for daily brief generation.
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/generate", "schedule": "30 * * * *" }]
 * }
 * 
 * This runs every hour at :30. The orchestrator checks each user's timezone
 * and only generates briefs for users whose local time is ~5:30 AM.
 * 
 * For Trigger.dev, import this function into your trigger job instead.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (set by Vercel or your scheduler)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting daily brief generation...');
    await generateBriefsForAllUsers();
    console.log('[Cron] Complete');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cron] Failed:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}

export const maxDuration = 300; // 5 minutes (Vercel Pro)
