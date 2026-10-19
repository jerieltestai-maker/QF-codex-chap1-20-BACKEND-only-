CREATE TABLE financial_confirmations (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), version integer NOT NULL CHECK(version>0),
 organisation_id uuid NOT NULL REFERENCES organisations(id), amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 0 AND 9007199254740991),
 source text NOT NULL CHECK(source IN ('invoice','settlement','adjustment')), source_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL, recorded_at timestamptz NOT NULL,
 UNIQUE(job_id,version), UNIQUE(source,source_id)
);
CREATE TABLE fee_accounts (organisation_id uuid PRIMARY KEY REFERENCES organisations(id), version integer NOT NULL DEFAULT 1);
CREATE TABLE fee_entries (
 id uuid PRIMARY KEY, confirmation_id uuid NOT NULL REFERENCES financial_confirmations(id),
 organisation_id uuid NOT NULL REFERENCES organisations(id), job_id uuid NOT NULL REFERENCES job_records(id),
 component text NOT NULL CHECK(component IN ('platform','lead')), amount_cents bigint NOT NULL,
 basis_cents bigint NOT NULL, rate_bps integer NOT NULL CHECK(rate_bps=400), calculation_version text NOT NULL,
 due_at timestamptz NOT NULL, calendar_version text NOT NULL, recorded_at timestamptz NOT NULL,
 UNIQUE(confirmation_id,component)
);
CREATE TABLE fee_reports (
 id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id), amount_cents bigint NOT NULL CHECK(amount_cents>0),
 paid_date text NOT NULL, proof_id uuid REFERENCES file_objects(id), context text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
 CHECK(proof_id IS NOT NULL OR length(trim(context))>0)
);
CREATE TABLE fee_verifications (
 id uuid PRIMARY KEY, report_id uuid NOT NULL UNIQUE REFERENCES fee_reports(id), amount_cents bigint NOT NULL CHECK(amount_cents>=0),
 received_date text NOT NULL, reference text NOT NULL, evidence text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX fee_collection_reference ON fee_verifications(reference) WHERE amount_cents>0;
CREATE TABLE fee_allocations (
 id uuid PRIMARY KEY, debit_id uuid NOT NULL REFERENCES fee_entries(id), credit_id uuid REFERENCES fee_entries(id),
 collection_id uuid REFERENCES fee_verifications(id), amount_cents bigint NOT NULL CHECK(amount_cents>0),
 recorded_at timestamptz NOT NULL, CHECK((credit_id IS NULL)<>(collection_id IS NULL))
);
CREATE TABLE fee_refunds (
 id uuid PRIMARY KEY, credit_id uuid NOT NULL REFERENCES fee_entries(id), amount_cents bigint NOT NULL CHECK(amount_cents>0),
 refunded_date text NOT NULL, reference text NOT NULL UNIQUE, evidence text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TABLE cancellations (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), reason text NOT NULL,
 organisation_id uuid REFERENCES organisations(id), actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
 prior_stage text NOT NULL, task_id uuid UNIQUE REFERENCES tasks(id), first_issued_at timestamptz, claim_due_at timestamptz,
 response text CHECK(response IN ('okay','claim','expired')), support_id uuid REFERENCES support_requests(id), restored_at timestamptz
);
CREATE UNIQUE INDEX current_cancellation ON cancellations(job_id) WHERE restored_at IS NULL;
CREATE TABLE cancellation_events (id uuid PRIMARY KEY,cancellation_id uuid NOT NULL REFERENCES cancellations(id),kind text NOT NULL,details jsonb NOT NULL,actor_id uuid REFERENCES users(id),recorded_at timestamptz NOT NULL);
CREATE TABLE cancellation_checkpoints (cancellation_id uuid NOT NULL REFERENCES cancellations(id),kind text NOT NULL,due_at timestamptz NOT NULL,PRIMARY KEY(cancellation_id,kind));
CREATE TABLE support_cases (
 support_id uuid PRIMARY KEY REFERENCES support_requests(id), version integer NOT NULL DEFAULT 1,
 category text NOT NULL, state text NOT NULL CHECK(state IN ('review','evidence','execution','resolved')),
 resolution_version integer NOT NULL DEFAULT 0, blocking boolean NOT NULL DEFAULT true,
 responding_role text, responding_user_id uuid REFERENCES users(id), evidence_task_id uuid REFERENCES tasks(id), organisation_id uuid REFERENCES organisations(id)
);
ALTER TABLE support_requests ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE support_requests ADD COLUMN estate_id uuid REFERENCES estates(id);
ALTER TABLE support_requests ADD COLUMN organisation_id uuid REFERENCES organisations(id);
ALTER TABLE support_requests ADD CONSTRAINT support_context CHECK(job_id IS NOT NULL OR ((estate_id IS NULL)<>(organisation_id IS NULL)));
ALTER TABLE tasks ADD COLUMN responding_user_id uuid REFERENCES users(id);
CREATE TABLE support_access (support_id uuid NOT NULL REFERENCES support_requests(id), user_id uuid NOT NULL REFERENCES users(id), actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL, PRIMARY KEY(support_id,user_id));
CREATE TABLE support_events (
 id uuid PRIMARY KEY, support_id uuid NOT NULL REFERENCES support_requests(id), kind text NOT NULL, details jsonb NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TABLE support_evidence_links (support_id uuid NOT NULL REFERENCES support_requests(id),file_id uuid NOT NULL REFERENCES file_objects(id),actor_id uuid NOT NULL REFERENCES users(id),recorded_at timestamptz NOT NULL,PRIMARY KEY(support_id,file_id));
CREATE TABLE support_resolutions (
 support_id uuid NOT NULL REFERENCES support_requests(id), version integer NOT NULL, outcome text NOT NULL, reason text NOT NULL,
 obligations jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
 PRIMARY KEY(support_id,version)
);
CREATE TABLE support_acknowledgments (
 support_id uuid NOT NULL, resolution_version integer NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
 PRIMARY KEY(support_id,resolution_version,actor_id), FOREIGN KEY(support_id,resolution_version) REFERENCES support_resolutions(support_id,version)
);
CREATE TABLE support_obligations (
 id uuid PRIMARY KEY, support_id uuid NOT NULL, resolution_version integer NOT NULL,
 kind text NOT NULL CHECK(kind IN ('repair','payment','refund','action')), owner_role text NOT NULL CHECK(owner_role IN ('cm','mcst','contractor','admin')),
 description text NOT NULL, required_round integer, verified_at timestamptz, task_id uuid REFERENCES tasks(id),
 FOREIGN KEY(support_id,resolution_version) REFERENCES support_resolutions(support_id,version)
);
ALTER TABLE support_obligations ADD COLUMN financial_confirmation_id uuid REFERENCES financial_confirmations(id);
ALTER TABLE support_obligations ADD COLUMN required_refund_cents bigint NOT NULL DEFAULT 0 CHECK(required_refund_cents>=0);
ALTER TABLE support_obligations ADD COLUMN superseded_at timestamptz;
CREATE TABLE settlement_proposals (
 id uuid PRIMARY KEY, support_id uuid NOT NULL REFERENCES support_requests(id), version integer NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 0 AND 9007199254740991), reason text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL, UNIQUE(support_id,version)
);
CREATE TABLE correction_previews (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), job_version integer NOT NULL,
 target text NOT NULL, impact jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TABLE estate_refunds (id uuid PRIMARY KEY,job_id uuid NOT NULL REFERENCES job_records(id),amount_cents bigint NOT NULL CHECK(amount_cents>0),refunded_date text NOT NULL,reference text NOT NULL UNIQUE,evidence text NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),recorded_at timestamptz NOT NULL);
CREATE TABLE financial_followups (confirmation_id uuid NOT NULL REFERENCES financial_confirmations(id),checkpoint integer NOT NULL CHECK(checkpoint IN (1,3)),due_at timestamptz NOT NULL,PRIMARY KEY(confirmation_id,checkpoint));
ALTER TABLE upload_intents ADD COLUMN support_id uuid REFERENCES support_requests(id);
ALTER TABLE upload_intents DROP CONSTRAINT upload_purpose;
ALTER TABLE upload_intents ADD CONSTRAINT upload_intents_purpose_check CHECK(purpose IN ('evidence','invoice','payment_proof','credential','quote_pdf','fee_proof','support_evidence'));
ALTER TABLE upload_intents DROP CONSTRAINT upload_scope;
ALTER TABLE upload_intents ADD CONSTRAINT upload_scope CHECK((job_id IS NOT NULL AND organisation_id IS NULL AND purpose NOT IN ('credential','quote_pdf','fee_proof')) OR (job_id IS NULL AND organisation_id IS NOT NULL AND purpose IN ('credential','quote_pdf','fee_proof')) OR (support_id IS NOT NULL AND purpose='support_evidence'));
ALTER TABLE payment_transfers DROP CONSTRAINT payment_transfers_job_id_fkey;
ALTER TABLE payment_transfers ADD FOREIGN KEY(job_id) REFERENCES job_records(id);
ALTER TABLE payment_transfers ALTER COLUMN invoice_version DROP NOT NULL;
ALTER TABLE payment_events DROP CONSTRAINT payment_events_job_id_fkey;
ALTER TABLE payment_events ADD FOREIGN KEY(job_id) REFERENCES job_records(id);
CREATE UNIQUE INDEX one_automatic_fee_hold ON contractor_restrictions(organisation_id) WHERE source='fee' AND active=true;
CREATE TRIGGER preserve_financial_confirmations BEFORE UPDATE OR DELETE ON financial_confirmations FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_cancellation_events BEFORE UPDATE OR DELETE ON cancellation_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_cancellation_checkpoints BEFORE UPDATE OR DELETE ON cancellation_checkpoints FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_fee_entries BEFORE UPDATE OR DELETE ON fee_entries FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_fee_reports BEFORE UPDATE OR DELETE ON fee_reports FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_fee_verifications BEFORE UPDATE OR DELETE ON fee_verifications FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_fee_allocations BEFORE UPDATE OR DELETE ON fee_allocations FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_fee_refunds BEFORE UPDATE OR DELETE ON fee_refunds FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_support_events BEFORE UPDATE OR DELETE ON support_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_support_evidence_links BEFORE UPDATE OR DELETE ON support_evidence_links FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_support_resolutions BEFORE UPDATE OR DELETE ON support_resolutions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_support_acknowledgments BEFORE UPDATE OR DELETE ON support_acknowledgments FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_settlement_proposals BEFORE UPDATE OR DELETE ON settlement_proposals FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_correction_previews BEFORE UPDATE OR DELETE ON correction_previews FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_estate_refunds BEFORE UPDATE OR DELETE ON estate_refunds FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_financial_followups BEFORE UPDATE OR DELETE ON financial_followups FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TRIGGER preserve_support_requests BEFORE UPDATE OR DELETE ON support_requests FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE FUNCTION validate_fee_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d fee_entries; c fee_entries; v fee_verifications; org uuid; used bigint;
BEGIN
 SELECT * INTO d FROM fee_entries WHERE id=NEW.debit_id FOR UPDATE;
 SELECT COALESCE(sum(amount_cents),0) INTO used FROM fee_allocations WHERE debit_id=d.id;
 IF d.amount_cents<=0 OR used+NEW.amount_cents>d.amount_cents THEN RAISE EXCEPTION 'Allocation exceeds debit'; END IF;
 IF NEW.credit_id IS NOT NULL THEN
  SELECT * INTO c FROM fee_entries WHERE id=NEW.credit_id FOR UPDATE;
  SELECT COALESCE(sum(amount_cents),0) INTO used FROM fee_allocations WHERE credit_id=c.id;
  used:=used+(SELECT COALESCE(sum(amount_cents),0) FROM fee_refunds WHERE credit_id=c.id);
  IF c.amount_cents>=0 OR c.organisation_id<>d.organisation_id OR c.job_id<>d.job_id OR c.component<>d.component OR used+NEW.amount_cents> -c.amount_cents THEN RAISE EXCEPTION 'Invalid fee credit allocation'; END IF;
 ELSE
  SELECT * INTO v FROM fee_verifications WHERE id=NEW.collection_id FOR UPDATE;
  SELECT organisation_id INTO org FROM fee_reports WHERE id=v.report_id;
  SELECT COALESCE(sum(amount_cents),0) INTO used FROM fee_allocations WHERE collection_id=v.id;
  IF org<>d.organisation_id OR used+NEW.amount_cents>v.amount_cents THEN RAISE EXCEPTION 'Invalid collection allocation'; END IF;
 END IF; RETURN NEW;
END; $$;
CREATE TRIGGER validate_fee_allocation BEFORE INSERT ON fee_allocations FOR EACH ROW EXECUTE FUNCTION validate_fee_allocation();
CREATE FUNCTION validate_fee_refund() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c fee_entries; used bigint;
BEGIN
 SELECT * INTO c FROM fee_entries WHERE id=NEW.credit_id FOR UPDATE;
 SELECT COALESCE(sum(amount_cents),0) INTO used FROM fee_allocations WHERE credit_id=c.id;
 used:=used+(SELECT COALESCE(sum(amount_cents),0) FROM fee_refunds WHERE credit_id=c.id);
 IF c.amount_cents>=0 OR used+NEW.amount_cents> -c.amount_cents THEN RAISE EXCEPTION 'Refund exceeds fee credit'; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER validate_fee_refund BEFORE INSERT ON fee_refunds FOR EACH ROW EXECUTE FUNCTION validate_fee_refund();
CREATE FUNCTION preserve_cancellation_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Cancellation history cannot be deleted'; END IF;
 IF ROW(OLD.id,OLD.job_id,OLD.reason,OLD.organisation_id,OLD.actor_id,OLD.recorded_at,OLD.prior_stage,OLD.task_id)
 IS DISTINCT FROM ROW(NEW.id,NEW.job_id,NEW.reason,NEW.organisation_id,NEW.actor_id,NEW.recorded_at,NEW.prior_stage,NEW.task_id)
 THEN RAISE EXCEPTION 'Cancellation source is immutable'; END IF;
 IF OLD.first_issued_at IS NOT NULL AND ROW(OLD.first_issued_at,OLD.claim_due_at) IS DISTINCT FROM ROW(NEW.first_issued_at,NEW.claim_due_at) THEN RAISE EXCEPTION 'Cancellation notice anchor is immutable'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER preserve_cancellation_source BEFORE UPDATE OR DELETE ON cancellations FOR EACH ROW EXECUTE FUNCTION preserve_cancellation_source();
