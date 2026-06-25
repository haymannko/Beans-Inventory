# postgresql-dba

Expert guidance for PostgreSQL database administration, schema design, query optimization, and operations.

## When to Use

Use this skill when designing schemas, writing complex queries, optimizing performance, configuring replication, managing migrations, handling backups, or troubleshooting PostgreSQL issues.

## Core Principles

- **Normalization first, denormalize for performance.** Start with 3NF. Only denormalize when profiling proves a bottleneck.
- **Constraints are your safety net.** Use `NOT NULL`, `CHECK`, `UNIQUE`, `FOREIGN KEY`, and exclusion constraints. Enforce at the DB level, not just application code.
- **Index intentionally.** Every index has a write cost. Index columns used in `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY`.
- **EXPLAIN ANALYZE everything.** Never guess about performance. Read the query plan.

## Schema Design

### Table Patterns

```sql
-- UUID primary keys for distributed systems
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### Enum Types

```sql
-- Prefer CHECK constraints over ENUM types (easier to alter)
CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0)
);
```

### Soft Delete Pattern

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial index for active users (small, fast)
CREATE INDEX idx_users_active ON (id) WHERE deleted_at IS NULL;

-- View for active records
CREATE VIEW active_users AS
    SELECT * FROM users WHERE deleted_at IS NULL;
```

## Indexing

```sql
-- B-tree (default): equality, range, sort
CREATE INDEX idx_users_email ON users (email);

-- Partial index: smaller, targeted
CREATE INDEX idx_orders_pending ON orders (created_at)
    WHERE status = 'pending';

-- Covering index: index-only scans
CREATE INDEX idx_orders_covering ON orders (user_id, created_at)
    INCLUDE (total, status);

-- GIN for full-text search and JSONB
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_metadata ON events USING GIN (metadata jsonb_path_ops);

-- Composite index: column order matters (equality first, then range)
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);
```

### Index Maintenance

```sql
-- Find unused indexes
SELECT schemaname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (queries doing seq scans)
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND idx_scan < seq_scan
ORDER BY seq_tup_read DESC;

-- Rebuild bloated indexes (non-blocking with CONCURRENTLY)
REINDEX INDEX CONCURRENTLY idx_users_email;
```

## Query Optimization

### Reading EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 'some-uuid' ORDER BY created_at DESC;

-- Key things to look for:
-- Seq Scan → missing index
-- Nested Loop with high rows → consider Hash/Merge Join
-- Sort → add index to avoid in-memory sort
-- Buffers: shared hit vs read → cache effectiveness
```

### Common Optimizations

```sql
-- Use EXISTS instead of IN for subqueries
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- Avoid SELECT * in production queries
SELECT id, email, name FROM users WHERE active = true;

-- Use CTEs for readability, but know they materialize in PG < 12
WITH recent_orders AS (
    SELECT user_id, count(*) as order_count
    FROM orders
    WHERE created_at > now() - interval '30 days'
    GROUP BY user_id
)
SELECT u.name, ro.order_count
FROM users u
JOIN recent_orders ro ON ro.user_id = u.id;

-- Window functions over self-joins
SELECT user_id, total,
    rank() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rnk
FROM orders;
```

## JSONB

```sql
-- Store flexible data alongside structured columns
CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query JSONB
SELECT * FROM events WHERE payload @> '{"action": "login"}';
SELECT * FROM events WHERE payload->>'ip' = '192.168.1.1';
SELECT payload->'user'->>'name' as username FROM events;

-- Index JSONB
CREATE INDEX idx_events_payload ON events USING GIN (payload);
-- For specific key queries:
CREATE INDEX idx_events_action ON events ((payload->>'action'));
```

## Migrations

```sql
-- Safe migration pattern (zero-downtime)
-- Step 1: Add column as nullable
ALTER TABLE users ADD COLUMN phone TEXT;

-- Step 2: Backfill in batches
UPDATE users SET phone = 'unknown'
WHERE phone IS NULL AND id IN (
    SELECT id FROM users WHERE phone IS NULL LIMIT 10000
);

-- Step 3: Add NOT NULL constraint (after backfill)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

-- Concurrently add index (does not lock table)
CREATE INDEX CONCURRENTLY idx_users_phone ON users (phone);
```

## Connection Pooling

```sql
-- Check current connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < now() - interval '10 minutes';

-- Recommended: use PgBouncer in transaction mode for web apps
-- pgbouncer.ini: pool_mode = transaction, default_pool_size = 20
```

## Backup & Recovery

```bash
# Logical backup (pg_dump) — single database
pg_dump -Fc -Z6 -f backup.dump mydb

# Restore
pg_restore -d mydb -j4 backup.dump

# Point-in-time recovery (requires WAL archiving)
# postgresql.conf:
#   archive_mode = on
#   archive_command = 'cp %p /archive/%f'
#   wal_level = replica
```

## Monitoring Queries

```sql
-- Active queries
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Table bloat
SELECT schemaname, relname, n_dead_tup, n_live_tup,
    round(n_dead_tup::numeric / greatest(n_live_tup, 1) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Cache hit ratio (should be > 99%)
SELECT
    sum(heap_blks_hit) / greatest(sum(heap_blks_hit) + sum(heap_blks_read), 1) AS ratio
FROM pg_statio_user_tables;

-- Lock contention
SELECT blocked.pid, blocked.query, blocking.pid AS blocker, blocking.query AS blocker_query
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid
JOIN pg_locks kl ON kl.locktype = bl.locktype
    AND kl.database IS NOT DISTINCT FROM bl.database
    AND kl.relation IS NOT DISTINCT FROM bl.relation
    AND kl.pid != bl.pid
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid
WHERE NOT bl.granted;
```

## Anti-Patterns to Avoid

- **SELECT \* in production** — fetch only needed columns.
- **Missing WHERE on UPDATE/DELETE** — always wrap in a transaction first, verify row count.
- **Over-normalizing** — 10+ table joins for simple queries means you went too far.
- **Ignoring NULL behavior** — `NULL != NULL`, use `IS NULL` / `IS NOT NULL`.
- **N+1 queries from app code** — use `JOIN` or `IN` to batch.
- **Large IN lists** — use a temporary table or `ANY(ARRAY[...])` instead.
- **Text columns for structured data** — use appropriate types (INET, JSONB, NUMERIC, etc.).
