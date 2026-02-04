export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing required env var: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (!value) return fallback;
  return value;
}
