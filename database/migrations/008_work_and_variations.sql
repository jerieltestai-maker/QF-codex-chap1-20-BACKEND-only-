ALTER TABLE job_records DROP CONSTRAINT job_records_stage_check;
ALTER TABLE job_records ADD CONSTRAINT job_records_stage_check CHECK(stage IN ('Report an issue','AI is refining your draft','Approving AI input','Requesting for quotes','MCST Reviewing selected Contractor','Rejected Contractor','Starting work','Carrying out work','Unable to continue work','Modifying job scope','Explaining price change','CM''s Inspecting of work','Cancelled'));

CREATE TABLE work_state (
  job_id uuid PRIMARY KEY REFERENCES job_records(id),
  authorisation_id uuid NOT NULL UNIQUE REFERENCES work_authorisations(id),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  terms_version integer NOT NULL DEFAULT 1 CHECK(terms_version>0),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','interrupted','cancelled')),
  resume_context text NOT NULL DEFAULT 'work' CHECK(resume_context IN ('work','invoice','inspection')),
  started_at timestamptz, completed_at timestamptz,
  scheduled_start_at timestamptz, start_schedule_version integer NOT NULL DEFAULT 0,
  completion_target_at timestamptz, completion_target_version integer NOT NULL DEFAULT 0,
  unknown_reason text, estimate_due_at timestamptz, estimate_deadline_version integer NOT NULL DEFAULT 0,
  interruption_id uuid REFERENCES support_requests(id),
  CHECK(completed_at IS NULL OR started_at IS NOT NULL),
  CHECK(started_at IS NULL OR completion_target_at IS NOT NULL OR (unknown_reason IS NOT NULL AND length(trim(unknown_reason))>0 AND estimate_due_at IS NOT NULL))
);
CREATE TABLE work_terms (
  job_id uuid NOT NULL REFERENCES work_state(job_id), version integer NOT NULL CHECK(version>0),
  amount_cents bigint NOT NULL CHECK(amount_cents>=0 AND amount_cents<=9007199254740991),
  mcst_authorised_cents bigint CHECK(mcst_authorised_cents>=0 AND mcst_authorised_cents<=9007199254740991),
  scope text NOT NULL CHECK(length(trim(scope))>0),
  source_type text NOT NULL CHECK(source_type IN ('selection','variation')),
  source_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(job_id,version)
);
CREATE TRIGGER preserve_work_terms BEFORE UPDATE OR DELETE ON work_terms FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE work_events (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES work_state(job_id), kind text NOT NULL,
  details jsonb NOT NULL, actor_id uuid REFERENCES users(id), actor_role text,
  occurred_at timestamptz, recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_work_events BEFORE UPDATE OR DELETE ON work_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE INDEX work_events_job ON work_events(job_id,recorded_at,id);
CREATE TABLE variations (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES work_state(job_id),
  kind text NOT NULL CHECK(kind IN ('scope_price','completion_schedule','start_schedule')),
  proposer_id uuid NOT NULL REFERENCES users(id), proposer_role text NOT NULL,
  current_version integer NOT NULL DEFAULT 1 CHECK(current_version>0),
  state text NOT NULL CHECK(state IN ('terms','decision','approved','rejected','withdrawn','superseded')),
  approver_role text CHECK(approver_role IN ('cm','mcst')), task_id uuid REFERENCES tasks(id)
);
CREATE UNIQUE INDEX one_pending_variation ON variations(job_id) WHERE state IN ('terms','decision');
CREATE TABLE variation_versions (
  variation_id uuid NOT NULL REFERENCES variations(id), version integer NOT NULL CHECK(version>0),
  base_terms_version integer NOT NULL CHECK(base_terms_version>0), proposal jsonb NOT NULL,
  contractor_confirmed boolean NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), actor_role text NOT NULL,
  recorded_at timestamptz NOT NULL, PRIMARY KEY(variation_id,version)
);
CREATE TRIGGER preserve_variation_versions BEFORE UPDATE OR DELETE ON variation_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE variation_decisions (
  id uuid PRIMARY KEY, variation_id uuid NOT NULL, variation_version integer NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('approved','rejected','withdrawn','superseded','intervention')),
  reason text NOT NULL, before_value jsonb NOT NULL, after_value jsonb NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id), actor_role text NOT NULL, recorded_at timestamptz NOT NULL,
  FOREIGN KEY(variation_id,variation_version) REFERENCES variation_versions(variation_id,version)
);
CREATE TRIGGER preserve_variation_decisions BEFORE UPDATE OR DELETE ON variation_decisions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
ALTER TABLE variation_decisions ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE variation_decisions ALTER COLUMN actor_role DROP NOT NULL;
CREATE TABLE work_clock_events (
  job_id uuid NOT NULL REFERENCES work_state(job_id), rule text NOT NULL CHECK(rule IN ('T20','T21','T23')),
  target_version integer NOT NULL, checkpoint text NOT NULL CHECK(checkpoint IN ('admin','estate')),
  due_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, task_ids uuid[] NOT NULL,
  PRIMARY KEY(job_id,rule,target_version,checkpoint)
);
CREATE TRIGGER preserve_work_clock_events BEFORE UPDATE OR DELETE ON work_clock_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE INDEX work_clock_tasks ON work_clock_events USING gin(task_ids);
CREATE INDEX work_variations_job ON variations(job_id,current_version);
ALTER TABLE upload_intents ADD COLUMN work_organisation_id uuid REFERENCES organisations(id);
ALTER TABLE upload_intents ADD CONSTRAINT work_upload_scope CHECK(work_organisation_id IS NULL OR (job_id IS NOT NULL AND purpose='evidence' AND organisation_id IS NULL));
