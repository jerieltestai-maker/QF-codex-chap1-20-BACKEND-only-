CREATE TABLE trade_rules (
  category text PRIMARY KEY CHECK(category IN ('handyman','plumbing','electrical')),
  configured boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0),
  updated_by uuid REFERENCES users(id), updated_at timestamptz
);
INSERT INTO trade_rules(category) VALUES ('handyman'),('plumbing'),('electrical');
ALTER TABLE estates ADD COLUMN contractor_identities_visible boolean NOT NULL DEFAULT true;
CREATE TABLE credential_types (
  id uuid PRIMARY KEY, name text NOT NULL CHECK(length(trim(name))>0),
  holder_kind text NOT NULL CHECK(holder_kind IN ('company','person')),
  categories text[] NOT NULL CHECK(cardinality(categories)>0), created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_credential_types BEFORE UPDATE OR DELETE ON credential_types FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE trade_requirements (
  category text NOT NULL REFERENCES trade_rules(category), type_id uuid NOT NULL REFERENCES credential_types(id),
  PRIMARY KEY(category,type_id)
);
CREATE TABLE contractor_profiles (
  organisation_id uuid PRIMARY KEY REFERENCES organisations(id), contact text NOT NULL,
  categories text[] NOT NULL CHECK(cardinality(categories)>0), description text NOT NULL DEFAULT '',
  version integer NOT NULL CHECK(version>0), state text NOT NULL CHECK(state IN ('draft','pending','needs_evidence','approved','rejected')),
  approved_categories text[] NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL
);
CREATE TABLE contractor_profile_versions (
  organisation_id uuid NOT NULL REFERENCES organisations(id), version integer NOT NULL,
  snapshot jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(organisation_id,version)
);
CREATE TRIGGER preserve_profile_versions BEFORE UPDATE OR DELETE ON contractor_profile_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE credentials (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), type_id uuid NOT NULL REFERENCES credential_types(id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0), current_submission integer NOT NULL DEFAULT 1 CHECK(current_submission>0),
  state text NOT NULL CHECK(state IN ('pending','approved','rejected','needs_evidence')), expiry_notified_version integer,
  renewal_notified_version integer, approved_submission integer CHECK(approved_submission>0)
);
CREATE TABLE credential_versions (
  credential_id uuid NOT NULL REFERENCES credentials(id), submission integer NOT NULL CHECK(submission>0),
  holder_name text NOT NULL CHECK(length(trim(holder_name))>0), reference text NOT NULL CHECK(length(trim(reference))>0),
  file_id uuid REFERENCES file_objects(id), expiry_value text, expires_at timestamptz, remind_at timestamptz,
  actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(credential_id,submission), CHECK((expiry_value IS NULL)=(expires_at IS NULL))
);
CREATE TRIGGER preserve_credential_versions BEFORE UPDATE OR DELETE ON credential_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE verification_decisions (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), credential_id uuid REFERENCES credentials(id),
  target_version integer NOT NULL, outcome text NOT NULL CHECK(outcome IN ('approved','rejected','needs_evidence')),
  categories text[] NOT NULL DEFAULT '{}', reason text NOT NULL CHECK(length(trim(reason))>0),
  internal_notes text NOT NULL DEFAULT '', actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_verification_decisions BEFORE UPDATE OR DELETE ON verification_decisions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE contractor_restrictions (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), source text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}', reason text NOT NULL, active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL
);
ALTER TABLE upload_intents ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE upload_intents ADD COLUMN organisation_id uuid REFERENCES organisations(id);
ALTER TABLE upload_intents DROP CONSTRAINT upload_intents_purpose_check;
ALTER TABLE upload_intents ADD CONSTRAINT upload_purpose CHECK(purpose IN ('evidence','invoice','payment_proof','credential'));
ALTER TABLE upload_intents ADD CONSTRAINT upload_scope CHECK((job_id IS NOT NULL AND organisation_id IS NULL AND purpose<>'credential') OR (job_id IS NULL AND organisation_id IS NOT NULL AND purpose='credential'));
ALTER TABLE job_records DROP CONSTRAINT job_records_stage_check;
ALTER TABLE job_records ADD CONSTRAINT job_records_stage_check CHECK(stage IN ('Report an issue','AI is refining your draft','Approving AI input','Requesting for quotes'));
ALTER TABLE job_records ADD COLUMN group_id uuid;
ALTER TABLE job_records ADD COLUMN is_group_source boolean NOT NULL DEFAULT false;
CREATE TABLE rfq_intakes (
  job_id uuid PRIMARY KEY REFERENCES job_records(id), categories text[] NOT NULL CHECK(cardinality(categories)>0),
  urgency text NOT NULL CHECK(urgency IN ('ordinary','urgent')), no_photo_reason text NOT NULL DEFAULT '',
  grouping text NOT NULL CHECK(grouping IN ('combined','separate')), primary_priority text NOT NULL, secondary_priority text,
  public_description text NOT NULL, public_location text NOT NULL, evidence_ids uuid[] NOT NULL DEFAULT '{}',
  version integer NOT NULL CHECK(version>0), updated_at timestamptz NOT NULL
);
CREATE TABLE rfq_versions (
  job_id uuid NOT NULL REFERENCES job_records(id), revision integer NOT NULL CHECK(revision>0),
  scope_version integer NOT NULL CHECK(scope_version>0), snapshot jsonb NOT NULL,
  classification text NOT NULL CHECK(classification IN ('initial','minor','material')), reason text NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(job_id,revision)
);
CREATE TRIGGER preserve_rfq_versions BEFORE UPDATE OR DELETE ON rfq_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE quotation_rounds (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), number integer NOT NULL CHECK(number>0),
  status text NOT NULL CHECK(status IN ('open','paused','closed','cancelled')), published_at timestamptz NOT NULL,
  sourcing_due_at timestamptz NOT NULL, sourcing_checked_at timestamptz, UNIQUE(job_id,number)
);
ALTER TABLE quotation_rounds ADD COLUMN rule_snapshot jsonb NOT NULL DEFAULT '[]';
CREATE FUNCTION preserve_round_anchor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.number IS DISTINCT FROM OLD.number
    OR NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.sourcing_due_at IS DISTINCT FROM OLD.sourcing_due_at
    OR NEW.rule_snapshot IS DISTINCT FROM OLD.rule_snapshot THEN RAISE EXCEPTION 'Quotation round anchors and rule snapshot are immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_round_anchor BEFORE UPDATE ON quotation_rounds FOR EACH ROW EXECUTE FUNCTION preserve_round_anchor();
CREATE UNIQUE INDEX open_round_per_job ON quotation_rounds(job_id) WHERE status='open';
CREATE TABLE rfq_publications (
  job_id uuid PRIMARY KEY REFERENCES job_records(id), revision integer NOT NULL, scope_version integer NOT NULL,
  round_id uuid NOT NULL REFERENCES quotation_rounds(id), FOREIGN KEY(job_id,revision) REFERENCES rfq_versions(job_id,revision)
);
CREATE TABLE ai_refinements (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), input_version integer NOT NULL,
  input_snapshot jsonb NOT NULL, output jsonb NOT NULL, model text NOT NULL, state text NOT NULL CHECK(state IN ('pending_review','accepted','superseded')),
  created_by uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TABLE urgency_updates (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), task_id uuid NOT NULL REFERENCES tasks(id),
  outcome text NOT NULL CHECK(outcome IN ('attempted','attendance_arranged','unresolved')), summary text NOT NULL,
  eta timestamptz, next_action text NOT NULL, follow_up_at timestamptz NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_urgency_updates BEFORE UPDATE OR DELETE ON urgency_updates FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE INDEX credential_current ON credentials(organisation_id,state);
CREATE INDEX sourcing_due ON quotation_rounds(sourcing_due_at) WHERE status='open' AND sourcing_checked_at IS NULL;
