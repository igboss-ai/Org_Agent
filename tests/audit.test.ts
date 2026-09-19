import { describe, it, expect } from 'vitest';
import { classifyRlsStatus } from '../src/audit';

describe('classifyRlsStatus', () => {
  it('flags RLS off as the "rls-off" severity', () => {
    const result = classifyRlsStatus({ table: 'expenses', rlsEnabled: false, policies: [] });
    expect(result.severity).toBe('rls-off');
    expect(result.icon).toBe('✗');
  });

  it('flags RLS on with zero policies as "no-policies", not "ok"', () => {
    const result = classifyRlsStatus({ table: 'finex_wallets', rlsEnabled: true, policies: [] });
    expect(result.severity).toBe('no-policies');
    expect(result.icon).toBe('⚠');
  });

  it('treats RLS on with at least one policy as "ok"', () => {
    const result = classifyRlsStatus({
      table: 'expenses',
      rlsEnabled: true,
      policies: [{ table: 'expenses', policyName: 'owner_select', command: 'SELECT' }],
    });
    expect(result.severity).toBe('ok');
    expect(result.icon).toBe('✓');
  });
});
