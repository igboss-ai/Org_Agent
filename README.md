# org-agent

A CLI that generates [Supabase](https://supabase.com) Row Level Security (RLS) policies from a simple, readable config file, and audits your live database to catch tables with missing or drifted policies.

## Why

Writing RLS policies by hand is repetitive and easy to get wrong; a single mistake can expose every user's data. Most tooling stops at "generate the SQL once." org-agent also looks at your actual database and tells you what's really protected right now, which is the part that matters after the initial setup, when policies get changed, removed, or simply forgotten.

## Install

```bash
npm install -g org-agent
```

## Usage

### 1. Describe your rules

Create a YAML file describing who can do what on each table:

```yaml
tables:
  expenses:
    owner_column: user_id
    rules:
      select: owner
      insert: owner
      update: owner
      delete: owner

  categories:
    rules:
      select: authenticated
      insert: admin_only

  public_announcements:
    rules:
      select: public
```

Available roles: `owner` (row belongs to the authenticated user), `authenticated` (any logged-in user), `admin_only`, `public`.

### 2. Generate the SQL

```bash
org-agent generate --config rls.yaml
```

Prints ready-to-run `CREATE POLICY` statements. Add `--out policies.sql` to write them to a file instead.

### 3. Audit your live database

```bash
org-agent audit --database-url "postgres://..."
```

Connects read-only to your Postgres database and reports, table by table, whether RLS is enabled and how many policies exist.

Each line is marked with one of three icons:

- `✓` — RLS is on and at least one policy exists. Looks fine.
- `✗` — RLS is completely off. Any client can read or write every row in that table.
- `⚠` — RLS is on but has **zero** policies. This is easy to miss by eye (it looks "protected" because RLS is enabled) but it silently blocks all access to the table, which is very likely not what you intended.

The command exits with a non-zero status if either `✗` or `⚠` appears anywhere, so it can be dropped into a CI pipeline to fail a build automatically when a table's security posture changes unexpectedly.

### 4. Diff config against reality

```bash
org-agent diff --config rls.yaml --database-url "postgres://..."
```

Compares what your config says should exist against what's actually in the database, and flags mismatches: tables missing RLS, tables with RLS on but zero policies (which silently blocks all access), and tables that exist in the database but aren't tracked in your config at all.

## Security note

`audit` and `diff` only run read-only queries against Postgres system catalogs (`pg_tables`, `pg_policies`). They never modify your database. Use a read-only connection string where possible.

## Development

```bash
npm install
npm run test    # unit tests
npm run build   # builds dist/ with tsup
npm run lint    # type-checks with tsc
```

See [`examples/rls.example.yaml`](./examples/rls.example.yaml) for a complete example config.

## License

MIT — see [LICENSE](./LICENSE).
