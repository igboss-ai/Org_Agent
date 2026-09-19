import { describe, it, expect } from 'vitest';
import { generateSql } from '../src/generateSql';
import type { OrgAgentConfig } from '../src/types';

describe('generateSql', () => {
  it('generates an ENABLE ROW LEVEL SECURITY statement per table', () => {
    const config: OrgAgentConfig = {
      tables: { expenses: { owner_column: 'user_id', rules: { select: 'owner' } } },
    };
    const sql = generateSql(config);
    expect(sql).toContain('ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;');
  });

  it('generates a USING clause with auth.uid() for the owner role', () => {
    const config: OrgAgentConfig = {
      tables: { expenses: { owner_column: 'user_id', rules: { select: 'owner' } } },
    };
    const sql = generateSql(config);
    expect(sql).toContain('user_id = auth.uid()');
    expect(sql).toContain('FOR SELECT USING');
  });

  it('generates a WITH CHECK clause for insert', () => {
    const config: OrgAgentConfig = {
      tables: { expenses: { owner_column: 'user_id', rules: { insert: 'owner' } } },
    };
    const sql = generateSql(config);
    expect(sql).toContain('FOR INSERT WITH CHECK');
  });

  it('generates both USING and WITH CHECK for update', () => {
    const config: OrgAgentConfig = {
      tables: { expenses: { owner_column: 'user_id', rules: { update: 'owner' } } },
    };
    const sql = generateSql(config);
    expect(sql).toContain('FOR UPDATE USING');
    expect(sql).toContain('WITH CHECK');
  });

  it('generates a "true" condition for the public role', () => {
    const config: OrgAgentConfig = {
      tables: { announcements: { rules: { select: 'public' } } },
    };
    const sql = generateSql(config);
    expect(sql).toContain('USING (true)');
  });
});
