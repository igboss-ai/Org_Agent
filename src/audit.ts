import pg from 'pg';
import type { TableRlsStatus } from './types';

const { Client } = pg;

/**
 * Connects to the Postgres database behind a Supabase project and reports,
 * for every table in the "public" schema, whether Row Level Security is
 * enabled and which policies exist. Read-only: runs SELECT queries against
 * Postgres system catalogs only, never modifies anything.
 */
export async function auditDatabase(connectionString: string): Promise<TableRlsStatus[]> {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const tablesResult = await client.query<{ tablename: string; rowsecurity: boolean }>(
      `SELECT tablename, rowsecurity
       FROM pg_tables
       WHERE schemaname = 'public'
       ORDER BY tablename;`
    );

    const policiesResult = await client.query<{
      tablename: string;
      policyname: string;
      cmd: string;
    }>(
      `SELECT tablename, policyname, cmd
       FROM pg_policies
       WHERE schemaname = 'public';`
    );

    return tablesResult.rows.map((row) => ({
      table: row.tablename,
      rlsEnabled: row.rowsecurity,
      policies: policiesResult.rows
        .filter((p) => p.tablename === row.tablename)
        .map((p) => ({ table: p.tablename, policyName: p.policyname, command: p.cmd })),
    }));
  } finally {
    await client.end();
  }
}
