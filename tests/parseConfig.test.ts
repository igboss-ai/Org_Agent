import { describe, it, expect } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import { loadConfig } from '../src/parseConfig';

const TMP_PATH = './tests/__tmp-config.yaml';

function writeTmpConfig(content: string) {
  writeFileSync(TMP_PATH, content, 'utf-8');
}

describe('loadConfig', () => {
  it('parses a valid config with owner rules', () => {
    writeTmpConfig(`
tables:
  expenses:
    owner_column: user_id
    rules:
      select: owner
      insert: owner
`);
    const config = loadConfig(TMP_PATH);
    expect(config.tables.expenses.owner_column).toBe('user_id');
    expect(config.tables.expenses.rules.select).toBe('owner');
    unlinkSync(TMP_PATH);
  });

  it('throws when a table uses "owner" without an owner_column', () => {
    writeTmpConfig(`
tables:
  expenses:
    rules:
      select: owner
`);
    expect(() => loadConfig(TMP_PATH)).toThrow(/owner_column/);
    unlinkSync(TMP_PATH);
  });

  it('throws on an unknown role', () => {
    writeTmpConfig(`
tables:
  expenses:
    rules:
      select: superadmin
`);
    expect(() => loadConfig(TMP_PATH)).toThrow(/unknown role/);
    unlinkSync(TMP_PATH);
  });

  it('throws on an unknown action', () => {
    writeTmpConfig(`
tables:
  expenses:
    rules:
      execute: owner
`);
    expect(() => loadConfig(TMP_PATH)).toThrow(/unknown action/);
    unlinkSync(TMP_PATH);
  });
});
