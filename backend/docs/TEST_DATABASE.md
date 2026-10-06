# PostgreSQL Test Database Lifecycle

Run backend tests with `pnpm test` or a PostgreSQL-backed suite with
`pnpm exec node scripts/run-tests.mjs <test-file.test.js>`. The runner builds
on `pnpm run test:compile` and uses the dedicated
`giftedpro_phase1_test` database.

Before each suite that connects to real PostgreSQL, the runner verifies that
the configured URL points to `giftedpro_phase1_test` on loopback, replaces its
`public` schema, and applies the application migrations. It removes the schema
again after the suite, including when the test process reports failures. Each
PostgreSQL-backed suite therefore starts with its own migrated, empty state;
the next invocation also resets state left by a process that was forcibly
terminated.

To select a non-default local PostgreSQL port or credentials, set
`PHASE1_TEST_DATABASE_URL` to a loopback URL for `giftedpro_phase1_test`.
`DATABASE_URL` is not used to select the reset target. The runner deliberately
refuses other database names and non-loopback hosts because it replaces the
test database's `public` schema.

The database cluster itself may remain persistent. Do not commit its runtime
data. Database constraints are not modified by test setup or cleanup.
