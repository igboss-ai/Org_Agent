import type { Action, OrgAgentConfig, Role, TableConfig } from './types';

const ACTION_TO_SQL: Record<Action, string> = {
  select: 'SELECT',
  insert: 'INSERT',
  update: 'UPDATE',
  delete: 'DELETE',
};

function conditionFor(role: Role, table: TableConfig): string {
  switch (role) {
    case 'owner':
      return `${table.owner_column} = auth.uid()`;
    case 'authenticated':
      return 'auth.role() = \'authenticated\'';
    case 'admin_only':
      return table.admin_column
        ? `${table.admin_column} = true`
        : 'auth.jwt() ->> \'role\' = \'admin\'';
    case 'public':
      return 'true';
  }
}

function policyName(tableName: string, action: Action): string {
  return `org_agent_${tableName}_${action}`;
}

/**
 * Generates one `CREATE POLICY` statement per configured action, plus
 * the `ENABLE ROW LEVEL SECURITY` statement for each table.
 */
export function generateSql(config: OrgAgentConfig): string {
  const statements: string[] = [];

  for (const [tableName, table] of Object.entries(config.tables)) {
    statements.push(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);

    for (const [actionKey, role] of Object.entries(table.rules)) {
      const action = actionKey as Action;
      const sqlAction = ACTION_TO_SQL[action];
      const condition = conditionFor(role as Role, table);
      const name = policyName(tableName, action);

      // SELECT/DELETE use USING; INSERT uses WITH CHECK; UPDATE uses both.
      if (action === 'insert') {
        statements.push(
          `CREATE POLICY "${name}" ON "${tableName}" FOR ${sqlAction} WITH CHECK (${condition});`
        );
      } else if (action === 'update') {
        statements.push(
          `CREATE POLICY "${name}" ON "${tableName}" FOR ${sqlAction} USING (${condition}) WITH CHECK (${condition});`
        );
      } else {
        statements.push(
          `CREATE POLICY "${name}" ON "${tableName}" FOR ${sqlAction} USING (${condition});`
        );
      }
    }
    statements.push('');
  }

  return statements.join('\n');
}
