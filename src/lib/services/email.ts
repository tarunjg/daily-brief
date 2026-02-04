import { Resend } from 'resend';
import type { BriefEmailData, DigestItem } from '@/types';
import { getOptionalEnv, getRequiredEnv } from '@/lib/env';

const resend = new Resend(getRequiredEnv('RESEND_API_KEY'));

/**
 * Generate the HTML email for the daily brief.
 */
function buildBriefEmailHtml(data: BriefEmailData): string {
  const itemsHtml = data.items.map((item, i) => `
    <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e4e7eb;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.4;">
        ${item.title}
      </h3>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; line-height: 1.6;">
        ${item.summary}
      </p>
      <div style="margin: 0 0 10px 0; padding: 10px 14px; background: #f0f7ff; border-left: 3px solid #0c8de9; border-radius: 0 4px 4px 0;">
        <p style="margin: 0; font-size: 13px; color: #054b85; line-height: 1.5;">
          <strong>Why it matters:</strong> ${item.whyItMatters}
        </p>
      </div>
      <div style="margin: 0;">
        ${item.sourceLinks.map(link =>
          `<a href="${link.url}" style="font-size: 12px; color: #0c8de9; text-decoration: none; margin-right: 12px;">${link.label} →</a>`
        ).join('')}
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f8f9fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
    <!-- Header -->
    <div style="margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #0c8de9;">
      <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 700; color: #0a3f6e;">
        Your Daily Brief
      </h1>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        ${data.briefDate} · Curated for ${data.userName}
      </p>
    </div>

    <!-- Items -->
    ${itemsHtml}

    <!-- CTA -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/brief" style="display: inline-block; padding: 12px 28px; background: #0c8de9; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
        Open in App to Reflect
      </a>
    </div>

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e4e7eb; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        You're receiving this because you signed up for Daily Brief.
        <a href="${data.appUrl}/settings" style="color: #6b7280;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain text fallback for the email.
 */
function buildBriefEmailText(data: BriefEmailData): string {
  const items = data.items.map((item, i) =>
    `${i + 1}. ${item.title}\n${item.summary}\nWhy it matters: ${item.whyItMatters}\n${item.sourceLinks.map(l => l.url).join('\n')}\n`
  ).join('\n---\n\n');

  return `Your Daily Brief – ${data.briefDate}\nCurated for ${data.userName}\n\n${items}\n\nOpen in app: ${data.appUrl}/brief`;
}

/**
 * Send the daily brief email to a user.
 */
export async function sendBriefEmail(
  to: string,
  data: BriefEmailData,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await resend.emails.send({
      from: getOptionalEnv('EMAIL_FROM', 'Daily Brief <brief@yourdomain.com>')!,
      to,
      subject: `Your Daily Brief – ${data.briefDate}`,
      html: buildBriefEmailHtml(data),
      text: buildBriefEmailText(data),
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
