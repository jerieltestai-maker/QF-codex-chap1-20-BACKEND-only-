-- Operational liveness is independent of customer task/notification clocks.
CREATE TABLE worker_health (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 last_attempt_at timestamptz NOT NULL, last_success_at timestamptz,
 last_failure_at timestamptz, consecutive_failures integer NOT NULL DEFAULT 0 CHECK(consecutive_failures>=0)
);
CREATE INDEX outbox_operational_failures ON outbox(failed_at) WHERE failed_at IS NOT NULL AND processed_at IS NULL;
