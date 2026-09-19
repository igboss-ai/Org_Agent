#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { loadConfig } from './parseConfig';
import { generateSql } from './generateSql';
import { auditDatabase, classifyRlsStatus } from './audit';
import { diffConfigAgainstDatabase } from './diff';

const program = new Command();

program
  .name('org-agent')
  .description('Generate and audit Supabase Row Level Security policies from a simple config file');

program
  .command('generate')
  .description('Generate SQL policy statements from a config file')
  .requiredOption('-c, --config <path>', 'path to the YAML config file')
  .option('-o, --out <path>', 'write the SQL to a file instead of printing it')
  .action((opts) => {
    const config = loadConfig(opts.config);
    const sql = generateSql(config);
    if (opts.out) {
      writeFileSync(opts.out, sql, 'utf-8');
      console.log(`SQL written to ${opts.out}`);
    } else {
      console.log(sql);
    }
  });

program
  .command('audit')
  .description('Check the live database for tables with missing or empty RLS policies')
  .requiredOption('-d, --database-url <url>', 'Postgres connection string (read-only recommended)')
  .action(async (opts) => {
    const status = await auditDatabase(opts.databaseUrl);
    let hasProblem = false;

    for (const table of status) {
      const { icon, note, severity } = classifyRlsStatus(table);
      if (severity !== 'ok') hasProblem = true;
      const suffix = note ? `  ← ${note}` : '';
      console.log(
        `${icon} ${table.table} — RLS ${table.rlsEnabled ? 'ON' : 'OFF'}, ${table.policies.length} polic${table.policies.length === 1 ? 'y' : 'ies'}${suffix}`
      );
    }

    if (hasProblem) {
      console.error(`\nSome tables need attention — see ⚠ and ✗ above.`);
      process.exitCode = 1;
    }
  });

program
  .command('diff')
  .description('Compare your config file against the live database and report mismatches')
  .requiredOption('-c, --config <path>', 'path to the YAML config file')
  .requiredOption('-d, --database-url <url>', 'Postgres connection string')
  .action(async (opts) => {
    const config = loadConfig(opts.config);
    const status = await auditDatabase(opts.databaseUrl);
    const diff = diffConfigAgainstDatabase(config, status);

    let hasProblem = false;
    for (const entry of diff) {
      const icon = entry.status === 'matches-config' ? '✓' : '⚠';
      if (entry.status !== 'matches-config') hasProblem = true;
      console.log(`${icon} [${entry.status}] ${entry.table}: ${entry.detail}`);
    }

    if (hasProblem) process.exitCode = 1;
  });

program.parseAsync(process.argv);
