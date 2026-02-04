import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import CryptoJS from 'crypto-js';
import { createHash } from 'crypto';

/** Tailwind class merger */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getEncryptionKey(): string {
  // NOTE: Fallback exists for local/dev convenience. It is not safe for production.
  return process.env.NEXTAUTH_SECRET || 'fallback-key';
}

/** Encrypt sensitive data at rest */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/** SHA-256 content hash for deduplication */
export function contentHash(title: string, body: string): string {
  const input = `${title.toLowerCase().trim()}|${body.slice(0, 500).toLowerCase().trim()}`;
  return createHash('sha256').update(input).digest('hex');
}

/** Normalize a URL for deduplication */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Strip query params, hash, trailing slash
    let normalized = `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '');
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

/** Count words in text */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Truncate text to approximate token count (rough: 1 token ≈ 4 chars) */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}

/** Format date for display */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format short date */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Sleep utility */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Retry with exponential backoff */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }
  throw lastError;
}
