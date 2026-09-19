import pg from 'pg';
import type { TableRlsStatus } from './types';

const { Client } = pg;

export type RlsSeverity = 'ok' | 'rls-off' | 'no-policies';

export interface RlsClassification {
  severity: RlsSeverity;
  icon: '✓' | '✗' | '⚠';
  note: string;
}

/**
 * Classifies a single table's RLS status into one of three cases.
 * Pure function, kept separate from the CLI's console output so it's
 * independently testable: RLS off is a hard "anyone can access this",
 * RLS on with zero policies is the easy-to-miss "this blocks everyone"
 * case, and anything else is fine.
 */
export function classifyRlsStatus(status: TableRlsStatus): RlsClassification {
  if (!status.rlsEnabled) {
    return {
      severity: 'rls-off',
      icon: '✗',
      note: 'RLS is OFF: any client can read/write every row',
    };
  }
  if (status.policies.length === 0) {
    return {
      severity: 'no-policies',
      icon: '⚠',
      note: 'RLS is ON but has no policies: this blocks ALL access, likely unintentional',
    };
  }
  return { severity: 'ok', icon: '✓', note: '' };
}

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
