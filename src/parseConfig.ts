import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { OrgAgentConfig } from './types';

const VALID_ROLES = new Set(['owner', 'authenticated', 'admin_only', 'public']);
const VALID_ACTIONS = new Set(['select', 'insert', 'update', 'delete']);

export function loadConfig(filePath: string): OrgAgentConfig {
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = parse(raw) as OrgAgentConfig;

  if (!parsed || typeof parsed !== 'object' || !parsed.tables) {
    throw new Error(`Invalid config: expected a top-level "tables" key in ${filePath}`);
  }

  for (const [tableName, table] of Object.entries(parsed.tables)) {
    if (!table.rules || typeof table.rules !== 'object') {
      throw new Error(`Table "${tableName}" is missing a "rules" block`);
    }
    for (const [action, role] of Object.entries(table.rules)) {
      if (!VALID_ACTIONS.has(action)) {
        throw new Error(`Table "${tableName}": unknown action "${action}"`);
      }
      if (!VALID_ROLES.has(role as string)) {
        throw new Error(
          `Table "${tableName}", action "${action}": unknown role "${role}". Expected one of: owner, authenticated, admin_only, public`
        );
      }
    }
    if (
      Object.values(table.rules).includes('owner') &&
      !table.owner_column
    ) {
      throw new Error(
        `Table "${tableName}" uses the "owner" role but has no "owner_column" defined`
      );
    }
  }

  return parsed;
}
