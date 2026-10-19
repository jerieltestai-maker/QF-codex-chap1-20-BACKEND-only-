ALTER TABLE job_records DROP CONSTRAINT job_records_stage_check;
ALTER TABLE job_records ADD CONSTRAINT job_records_stage_check CHECK(stage IN ('Report an issue','AI is refining your draft','Approving AI input','Requesting for quotes','MCST Reviewing selected Contractor','Rejected Contractor','Starting work','Carrying out work','Unable to continue work','Modifying job scope','Explaining price change','CM''s Inspecting of work','Addressing issues','Confirming invoice','Arranging payment','Confirming payment','Unresolved payment','Admin Intervention','Closed','Cancelled'));
ALTER TABLE upload_intents DROP CONSTRAINT work_upload_scope;
ALTER TABLE upload_intents ADD CONSTRAINT work_upload_scope CHECK(work_organisation_id IS NULL OR (job_id IS NOT NULL AND purpose IN ('evidence','invoice') AND organisation_id IS NULL));
ALTER TABLE tasks DROP CONSTRAINT tasks_response_rule_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_response_rule_check CHECK(response_rule IN ('T07','T08','T09','T22'));
CREATE TABLE completion_rounds (
  job_id uuid NOT NULL REFERENCES work_state(job_id), round integer NOT NULL CHECK(round>0),
  terms_version integer NOT NULL, scope text NOT NULL, completed_at timestamptz NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  evidence_ids uuid[] NOT NULL, originating_round integer,
  PRIMARY KEY(job_id,round), FOREIGN KEY(job_id,terms_version) REFERENCES work_terms(job_id,version),
  FOREIGN KEY(job_id,originating_round) REFERENCES completion_rounds(job_id,round)
);
CREATE TABLE invoice_versions (
  job_id uuid NOT NULL REFERENCES work_state(job_id), version integer NOT NULL CHECK(version>0),
  round integer NOT NULL, file_id uuid NOT NULL REFERENCES file_objects(id),
  amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 0 AND 9007199254740991),
  explanation text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(job_id,version), FOREIGN KEY(job_id,round) REFERENCES completion_rounds(job_id,round)
);
CREATE TABLE inspections (
  job_id uuid NOT NULL, round integer NOT NULL, outcome text NOT NULL CHECK(outcome IN ('accepted','unsatisfactory')),
  checklist jsonb NOT NULL, findings text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(job_id,round), FOREIGN KEY(job_id,round) REFERENCES completion_rounds(job_id,round)
);
CREATE TABLE completion_state (
  job_id uuid PRIMARY KEY REFERENCES work_state(job_id), round integer NOT NULL, invoice_version integer NOT NULL,
  accepted_round integer, confirmed_version integer,
  FOREIGN KEY(job_id,round) REFERENCES completion_rounds(job_id,round),
  FOREIGN KEY(job_id,invoice_version) REFERENCES invoice_versions(job_id,version),
  FOREIGN KEY(job_id,accepted_round) REFERENCES inspections(job_id,round)
);
CREATE TABLE invoice_confirmations (
  job_id uuid PRIMARY KEY, invoice_version integer NOT NULL, amount_cents bigint NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  FOREIGN KEY(job_id,invoice_version) REFERENCES invoice_versions(job_id,version)
);
-- Chapter 13 consumes one durable source. No rounding policy is inferred here.
CREATE TABLE billing_sources (
  job_id uuid PRIMARY KEY REFERENCES invoice_confirmations(job_id), invoice_version integer NOT NULL,
  basis_cents bigint NOT NULL, recorded_at timestamptz NOT NULL
);
CREATE TABLE payment_transfers (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES invoice_confirmations(job_id), invoice_version integer NOT NULL,
  amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 9007199254740991),
  proof_id uuid NOT NULL UNIQUE REFERENCES file_objects(id), transfer_date text NOT NULL,
  rationale text NOT NULL, reference text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), reported_at timestamptz NOT NULL,
  receipt_task_id uuid NOT NULL UNIQUE REFERENCES tasks(id),
  first_issued_at timestamptz, receipt_due_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','actual','assumed','disputed','void')),
  receipt_date text, receipt_precision text CHECK(receipt_precision IN ('date','instant')),
  popup_acknowledged_at timestamptz, issue_id uuid REFERENCES support_requests(id),
  FOREIGN KEY(job_id,invoice_version) REFERENCES invoice_versions(job_id,version)
);
CREATE INDEX payment_transfers_job ON payment_transfers(job_id);
CREATE FUNCTION preserve_transfer_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Transfer history cannot be deleted'; END IF;
  IF ROW(OLD.id,OLD.job_id,OLD.invoice_version,OLD.amount_cents,OLD.proof_id,OLD.transfer_date,OLD.rationale,OLD.reference,OLD.actor_id,OLD.reported_at)
    IS DISTINCT FROM ROW(NEW.id,NEW.job_id,NEW.invoice_version,NEW.amount_cents,NEW.proof_id,NEW.transfer_date,NEW.rationale,NEW.reference,NEW.actor_id,NEW.reported_at)
    THEN RAISE EXCEPTION 'Transfer source is immutable'; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER preserve_payment_transfer BEFORE UPDATE OR DELETE ON payment_transfers FOR EACH ROW EXECUTE FUNCTION preserve_transfer_source();
CREATE TABLE payment_events (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES work_state(job_id), transfer_id uuid REFERENCES payment_transfers(id),
  kind text NOT NULL, details jsonb NOT NULL, actor_id uuid REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TABLE payment_checkpoints (
  job_id uuid NOT NULL REFERENCES invoice_confirmations(job_id), checkpoint integer NOT NULL CHECK(checkpoint IN (1,3)),
  due_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, PRIMARY KEY(job_id,checkpoint)
);
CREATE TABLE settlement_anchors (
  job_id uuid PRIMARY KEY REFERENCES work_state(job_id), settled_at text NOT NULL,
  precision text NOT NULL CHECK(precision IN ('date','instant')), source text NOT NULL,
  recorded_at timestamptz NOT NULL
);
CREATE TABLE closure_events (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES work_state(job_id), kind text NOT NULL,
  details jsonb NOT NULL, recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_completion_rounds BEFORE UPDATE OR DELETE ON completion_rounds FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_invoice_versions BEFORE UPDATE OR DELETE ON invoice_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_inspections BEFORE UPDATE OR DELETE ON inspections FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_invoice_confirmations BEFORE UPDATE OR DELETE ON invoice_confirmations FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_billing_sources BEFORE UPDATE OR DELETE ON billing_sources FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_payment_events BEFORE UPDATE OR DELETE ON payment_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_payment_checkpoints BEFORE UPDATE OR DELETE ON payment_checkpoints FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_closure_events BEFORE UPDATE OR DELETE ON closure_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
