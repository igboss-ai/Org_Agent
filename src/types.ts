export type Role = 'owner' | 'authenticated' | 'admin_only' | 'public';
export type Action = 'select' | 'insert' | 'update' | 'delete';

export interface TableRule {
  select?: Role;
  insert?: Role;
  update?: Role;
  delete?: Role;
}

export interface TableConfig {
  owner_column?: string;
  admin_column?: string;
  rules: TableRule;
}

export interface OrgAgentConfig {
  tables: Record<string, TableConfig>;
}

export interface ExistingPolicy {
  table: string;
  policyName: string;
  command: string; // SELECT, INSERT, UPDATE, DELETE, ALL
}

export interface TableRlsStatus {
  table: string;
  rlsEnabled: boolean;
  policies: ExistingPolicy[];
}

export interface DiffEntry {
  table: string;
  status: 'missing-rls' | 'no-policies' | 'matches-config' | 'not-in-config';
  detail: string;
}
