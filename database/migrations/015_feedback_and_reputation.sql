ALTER TABLE tasks DROP CONSTRAINT tasks_response_rule_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_response_rule_check CHECK(response_rule IN ('T04','T07','T08','T09','T22'));

CREATE TABLE feedback_obligations (
  job_id uuid PRIMARY KEY REFERENCES work_state(job_id), version integer NOT NULL DEFAULT 1,
  anchor jsonb NOT NULL, due_at timestamptz NOT NULL,
  task_id uuid REFERENCES tasks(id), status text NOT NULL CHECK(status IN ('scheduled','due','submitted','suspended')),
  submitted_at timestamptz, created_at timestamptz NOT NULL,
  CHECK((status='submitted')=(submitted_at IS NOT NULL))
);
CREATE TABLE reputation_entries (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id),
  job_id uuid REFERENCES work_state(job_id), kind text NOT NULL CHECK(kind IN ('inspection','durability','external')),
  current_version integer NOT NULL DEFAULT 1, review_version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL,
  CHECK((kind='external')=(job_id IS NULL)), UNIQUE(job_id,kind)
);
CREATE TABLE reputation_entry_versions (
  entry_id uuid NOT NULL REFERENCES reputation_entries(id), version integer NOT NULL,
  facts jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), actor_role text NOT NULL,
  observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL,
  PRIMARY KEY(entry_id,version)
);
CREATE TABLE feedback_events (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES work_state(job_id),
  kind text NOT NULL, details jsonb NOT NULL, actor_id uuid REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TABLE aftercare_cases (
  id uuid PRIMARY KEY REFERENCES support_requests(id), job_id uuid NOT NULL REFERENCES work_state(job_id),
  requested_help text NOT NULL, evidence_ids uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'review' CHECK(status IN ('review','remedy','inspection','resolved')),
  current_round integer, originating_round integer NOT NULL,
  FOREIGN KEY(job_id,current_round) REFERENCES completion_rounds(job_id,round),
  FOREIGN KEY(job_id,originating_round) REFERENCES completion_rounds(job_id,round)
);
CREATE UNIQUE INDEX aftercare_one_open ON aftercare_cases(job_id) WHERE status<>'resolved';
CREATE TRIGGER preserve_reputation_entry_versions BEFORE UPDATE OR DELETE ON reputation_entry_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_feedback_events BEFORE UPDATE OR DELETE ON feedback_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();

CREATE TABLE reputation_moderation (
  id uuid PRIMARY KEY, entry_id uuid NOT NULL, entry_version integer NOT NULL,
  decision text NOT NULL CHECK(decision IN ('publish','reject','void','redact')),
  public_text jsonb NOT NULL, private_reason text NOT NULL CHECK(length(trim(private_reason))>0),
  durability_contested boolean NOT NULL DEFAULT false,
  actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  FOREIGN KEY(entry_id,entry_version) REFERENCES reputation_entry_versions(entry_id,version)
);
CREATE TABLE reputation_replies (
  entry_id uuid NOT NULL, entry_version integer NOT NULL, version integer NOT NULL,
  body text NOT NULL CHECK(length(trim(body))>0), actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(entry_id,version), FOREIGN KEY(entry_id,entry_version) REFERENCES reputation_entry_versions(entry_id,version)
);
CREATE TABLE reputation_reply_moderation (
  entry_id uuid NOT NULL, reply_version integer NOT NULL,
  approved boolean NOT NULL, private_reason text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(entry_id,reply_version), FOREIGN KEY(entry_id,reply_version) REFERENCES reputation_replies(entry_id,version)
);
CREATE TABLE reputation_snapshots (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), formula_version text NOT NULL,
  fingerprint text NOT NULL, inputs jsonb NOT NULL, result jsonb NOT NULL, recorded_at timestamptz NOT NULL,
  UNIQUE(organisation_id,formula_version,fingerprint)
);
CREATE TABLE comparison_advice (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), actor_id uuid NOT NULL REFERENCES users(id),
  fingerprint text NOT NULL, context jsonb NOT NULL, result jsonb NOT NULL, recorded_at timestamptz NOT NULL,
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
CREATE TRIGGER preserve_reputation_moderation BEFORE UPDATE OR DELETE ON reputation_moderation FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_reputation_replies BEFORE UPDATE OR DELETE ON reputation_replies FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_reputation_reply_moderation BEFORE UPDATE OR DELETE ON reputation_reply_moderation FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_reputation_snapshots BEFORE UPDATE OR DELETE ON reputation_snapshots FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_comparison_advice BEFORE UPDATE OR DELETE ON comparison_advice FOR EACH ROW EXECUTE FUNCTION preserve_audit();
