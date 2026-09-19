import type { DiffEntry, OrgAgentConfig, TableRlsStatus } from './types';

/**
 * Compares the desired config against the live database state and
 * flags anything that doesn't match: tables that should be protected
 * but aren't, tables with RLS on but zero policies (locks everyone out
 * silently), and tables present in the database but never configured.
 */
export function diffConfigAgainstDatabase(
  config: OrgAgentConfig,
  liveStatus: TableRlsStatus[]
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const liveByTable = new Map(liveStatus.map((s) => [s.table, s]));
  const configuredTables = new Set(Object.keys(config.tables));

  for (const tableName of configuredTables) {
    const live = liveByTable.get(tableName);

    if (!live) {
      entries.push({
        table: tableName,
        status: 'missing-rls',
        detail: `Table is configured in org-agent but does not exist in the database.`,
      });
      continue;
    }

    if (!live.rlsEnabled) {
      entries.push({
        table: tableName,
        status: 'missing-rls',
        detail: `Row Level Security is OFF. Any authenticated client can read/write every row.`,
      });
      continue;
    }

    if (live.policies.length === 0) {
      entries.push({
        table: tableName,
        status: 'no-policies',
        detail: `RLS is enabled but no policies exist. This currently blocks ALL access.`,
      });
      continue;
    }

    entries.push({
      table: tableName,
      status: 'matches-config',
      detail: `RLS enabled with ${live.policies.length} polic${live.policies.length === 1 ? 'y' : 'ies'} in place.`,
    });
  }

  for (const live of liveStatus) {
    if (!configuredTables.has(live.table)) {
      entries.push({
        table: live.table,
        status: 'not-in-config',
        detail: live.rlsEnabled
          ? `Table exists in the database with RLS on, but isn't tracked in your org-agent config.`
          : `Table exists in the database with RLS OFF, and isn't tracked in your org-agent config either.`,
      });
    }
  }

  return entries;
}
