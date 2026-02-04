import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getRequiredEnv } from '@/lib/env';

const connectionString = getRequiredEnv('DATABASE_URL');

// Connection for queries (pooled)
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

// For migrations only
export const migrationClient = postgres(connectionString, { max: 1 });
