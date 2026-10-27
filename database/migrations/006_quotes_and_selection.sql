ALTER TABLE estates ADD COLUMN approval_threshold_cents bigint CHECK(approval_threshold_cents>=0 AND approval_threshold_cents<=9007199254740991);
ALTER TABLE estates ADD COLUMN private_address text;
ALTER TABLE job_records ADD COLUMN replaces_job_id uuid REFERENCES job_records(id);
ALTER TABLE job_records DROP CONSTRAINT job_records_stage_check;
ALTER TABLE job_records ADD CONSTRAINT job_records_stage_check CHECK(stage IN ('Report an issue','AI is refining your draft','Approving AI input','Requesting for quotes','MCST Reviewing selected Contractor','Rejected Contractor','Starting work'));
ALTER TABLE rfq_intakes ADD COLUMN access_equipment_required boolean NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN response_rule text CHECK(response_rule IN ('T07','T22'));
ALTER TABLE tasks ADD COLUMN escalated_at timestamptz;
ALTER TABLE timer_jobs DROP CONSTRAINT timer_jobs_rule_check;
ALTER TABLE timer_jobs ADD CONSTRAINT timer_jobs_rule_check CHECK(rule IN ('T11','T18','urgent','response.actor','response.admin'));
CREATE TABLE quotes (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), organisation_id uuid NOT NULL REFERENCES organisations(id),
  round_id uuid NOT NULL REFERENCES quotation_rounds(id), current_version integer NOT NULL CHECK(current_version>0),
  status text NOT NULL CHECK(status IN ('active','withdrawn')), version integer NOT NULL CHECK(version>0),
  expiry_notified_version integer, UNIQUE(round_id,organisation_id)
);
CREATE TABLE quote_versions (
  quote_id uuid NOT NULL REFERENCES quotes(id), version integer NOT NULL CHECK(version>0),
  rfq_revision integer NOT NULL, scope_version integer NOT NULL CHECK(scope_version>0), terms jsonb NOT NULL,
  amount_cents bigint NOT NULL CHECK(amount_cents>=0 AND amount_cents<=9007199254740991),
  expiry_value text NOT NULL, expires_at timestamptz NOT NULL, pdf_id uuid REFERENCES file_objects(id),
  revision_reason text NOT NULL DEFAULT '', actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(quote_id,version)
);
CREATE TRIGGER preserve_quote_versions BEFORE UPDATE OR DELETE ON quote_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE job_questions (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), round_id uuid NOT NULL REFERENCES quotation_rounds(id),
  organisation_id uuid NOT NULL REFERENCES organisations(id), question text NOT NULL CHECK(length(trim(question))>0),
  state text NOT NULL CHECK(state IN ('pending','answered','declined','superseded')), version integer NOT NULL DEFAULT 1,
  task_id uuid NOT NULL REFERENCES tasks(id), actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL, rfq_revision integer NOT NULL CHECK(rfq_revision>0)
);
CREATE TABLE question_responses (
  id uuid PRIMARY KEY, question_id uuid NOT NULL REFERENCES job_questions(id), outcome text NOT NULL CHECK(outcome IN ('answered','declined')),
  public_question text, public_answer text, classification text CHECK(classification IN ('minor','material')),
  reason text NOT NULL, rfq_revision integer, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  CHECK(outcome='declined' OR (length(trim(public_question))>0 AND length(trim(public_answer))>0))
);
CREATE TRIGGER preserve_question_responses BEFORE UPDATE OR DELETE ON question_responses FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE visit_requests (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), round_id uuid NOT NULL REFERENCES quotation_rounds(id),
  organisation_id uuid NOT NULL REFERENCES organisations(id), reason text NOT NULL,
  state text NOT NULL CHECK(state IN ('pending','approved','declined','superseded')), version integer NOT NULL DEFAULT 1,
  task_id uuid NOT NULL REFERENCES tasks(id), actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TABLE visit_decisions (
  id uuid PRIMARY KEY, visit_id uuid NOT NULL REFERENCES visit_requests(id), outcome text NOT NULL CHECK(outcome IN ('approved','declined')),
  visit_at timestamptz, reason text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_visit_decisions BEFORE UPDATE OR DELETE ON visit_decisions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE contractor_selections (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), round_id uuid NOT NULL REFERENCES quotation_rounds(id),
  quote_id uuid NOT NULL, quote_version integer NOT NULL, organisation_id uuid NOT NULL REFERENCES organisations(id),
  threshold_cents bigint NOT NULL, threshold_version integer NOT NULL, amount_cents bigint NOT NULL,
  rationale text NOT NULL CHECK(length(trim(rationale))>0), snapshot jsonb NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id), actor_role text NOT NULL, recorded_at timestamptz NOT NULL,
  FOREIGN KEY(quote_id,quote_version) REFERENCES quote_versions(quote_id,version)
);
CREATE TRIGGER preserve_selections BEFORE UPDATE OR DELETE ON contractor_selections FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE selection_state (
  job_id uuid PRIMARY KEY REFERENCES job_records(id), selection_id uuid NOT NULL REFERENCES contractor_selections(id),
  status text NOT NULL CHECK(status IN ('pending','rejected','authorised')), version integer NOT NULL CHECK(version>0),
  task_id uuid REFERENCES tasks(id)
);
CREATE TABLE selection_decisions (
  id uuid PRIMARY KEY, selection_id uuid NOT NULL REFERENCES contractor_selections(id),
  outcome text NOT NULL CHECK(outcome IN ('approved','rejected','combined_authorisation','threshold_authorisation')),
  reason text NOT NULL DEFAULT '', acknowledgments jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_selection_decisions BEFORE UPDATE OR DELETE ON selection_decisions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE work_authorisations (
  id uuid PRIMARY KEY, job_id uuid NOT NULL UNIQUE REFERENCES job_records(id), selection_id uuid NOT NULL UNIQUE REFERENCES contractor_selections(id),
  organisation_id uuid NOT NULL REFERENCES organisations(id), quote_id uuid NOT NULL, quote_version integer NOT NULL,
  amount_cents bigint NOT NULL, terms jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  FOREIGN KEY(quote_id,quote_version) REFERENCES quote_versions(quote_id,version)
);
CREATE TRIGGER preserve_work_authorisations BEFORE UPDATE OR DELETE ON work_authorisations FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE location_reveals (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), organisation_id uuid NOT NULL REFERENCES organisations(id),
  cause text NOT NULL CHECK(cause IN ('visit','work_authorisation')), source_id uuid NOT NULL, snapshot jsonb NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL, UNIQUE(cause,source_id)
);
CREATE TRIGGER preserve_location_reveals BEFORE UPDATE OR DELETE ON location_reveals FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE selection_clocks (
  round_id uuid PRIMARY KEY REFERENCES quotation_rounds(id), job_id uuid NOT NULL REFERENCES job_records(id),
  owner_role text NOT NULL CHECK(owner_role IN ('cm','mcst')), task_id uuid NOT NULL REFERENCES tasks(id),
  anchor_at timestamptz NOT NULL, start_at timestamptz NOT NULL, calendar_version text NOT NULL,
  actor_due_at timestamptz NOT NULL, admin_due_at timestamptz NOT NULL,
  paused_at timestamptz, actor_remaining_ms bigint, admin_remaining_ms bigint,
  actor_issued_at timestamptz, admin_issued_at timestamptz, scheduled_review_at timestamptz,
  admin_task_id uuid REFERENCES tasks(id), last_reconciled_at timestamptz NOT NULL,
  status text NOT NULL CHECK(status IN ('active','paused','stopped'))
);
CREATE INDEX quote_round ON quotes(round_id,status);
ALTER TABLE selection_clocks ADD COLUMN iteration integer NOT NULL DEFAULT 1;
CREATE TABLE selection_clock_history (id uuid PRIMARY KEY,round_id uuid NOT NULL REFERENCES quotation_rounds(id),snapshot jsonb NOT NULL,recorded_at timestamptz NOT NULL);
CREATE TRIGGER preserve_selection_clock_history BEFORE UPDATE OR DELETE ON selection_clock_history FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE INDEX quote_expiry ON quote_versions(expires_at);
CREATE INDEX questions_job ON job_questions(job_id,state);
CREATE INDEX visits_job ON visit_requests(job_id,state);
ALTER TABLE upload_intents DROP CONSTRAINT upload_purpose;
ALTER TABLE upload_intents ADD CONSTRAINT upload_purpose CHECK(purpose IN ('evidence','invoice','payment_proof','credential','quote_pdf'));
ALTER TABLE upload_intents DROP CONSTRAINT upload_scope;
ALTER TABLE upload_intents ADD CONSTRAINT upload_scope CHECK((job_id IS NOT NULL AND organisation_id IS NULL AND purpose IN ('evidence','invoice','payment_proof')) OR (job_id IS NULL AND organisation_id IS NOT NULL AND purpose IN ('credential','quote_pdf')));
