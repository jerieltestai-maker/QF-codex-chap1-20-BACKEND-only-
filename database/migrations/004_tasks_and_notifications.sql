ALTER TABLE tasks ADD COLUMN estate_id uuid REFERENCES estates(id);
ALTER TABLE tasks ADD COLUMN organisation_id uuid REFERENCES organisations(id);
ALTER TABLE tasks ADD COLUMN support_id uuid REFERENCES support_requests(id);
ALTER TABLE tasks ADD COLUMN action text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN required_version integer NOT NULL DEFAULT 1 CHECK(required_version>0);
ALTER TABLE tasks ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE tasks ADD COLUMN actionable_at timestamptz;
ALTER TABLE tasks ADD COLUMN first_issued_at timestamptz;
ALTER TABLE tasks ADD COLUMN acknowledged_at timestamptz;
ALTER TABLE tasks ADD COLUMN acknowledged_by uuid REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN next_action text;
ALTER TABLE tasks ADD COLUMN follow_up_at timestamptz;
ALTER TABLE tasks ADD COLUMN resolution_evidence text;
ALTER TABLE tasks ADD CONSTRAINT task_role CHECK(owner_role IN ('cm','mcst','contractor','admin'));
CREATE TABLE notifications (
  id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES tasks(id), dedupe_key text NOT NULL UNIQUE,
  message text NOT NULL, copy_version text NOT NULL, issued_at timestamptz NOT NULL
);
CREATE TABLE notification_reads (
  notification_id uuid NOT NULL REFERENCES notifications(id), user_id uuid NOT NULL REFERENCES users(id),
  read_at timestamptz NOT NULL, PRIMARY KEY(notification_id,user_id)
);
CREATE TABLE timer_jobs (
  id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES tasks(id), task_version integer NOT NULL,
  rule text NOT NULL CHECK(rule IN ('T11','T18','urgent')),
  rule_version text NOT NULL, calendar_version text, anchor_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL, effective_at timestamptz,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','superseded')),
  executed_at timestamptz
);
CREATE INDEX timers_pending ON timer_jobs(due_at) WHERE status='pending';
ALTER TABLE outbox ADD COLUMN lease_token uuid;
ALTER TABLE outbox ADD COLUMN lease_until timestamptz;
ALTER TABLE outbox ADD COLUMN last_error_code text;
ALTER TABLE outbox ADD COLUMN failed_at timestamptz;
CREATE INDEX tasks_resource ON tasks(resource_id,status);
CREATE INDEX notifications_task ON notifications(task_id,issued_at);
CREATE TABLE holiday_calendars (
  version text PRIMARY KEY, first_year integer NOT NULL, last_year integer NOT NULL,
  holidays jsonb NOT NULL, source_url text NOT NULL, verified_at date NOT NULL,
  CHECK(last_year>=first_year)
);
INSERT INTO holiday_calendars VALUES ('SG-MOM-2026-2027-v1',2026,2027,
  '["2026-01-01","2026-02-17","2026-02-18","2026-03-21","2026-04-03","2026-05-01","2026-05-27","2026-05-31","2026-06-01","2026-08-09","2026-08-10","2026-11-08","2026-11-09","2026-12-25","2027-01-01","2027-02-06","2027-02-07","2027-02-08","2027-03-10","2027-03-26","2027-05-01","2027-05-17","2027-05-20","2027-08-09","2027-10-28","2027-12-25"]',
  'https://www.mom.gov.sg/employment-practices/public-holidays','2026-10-13');
