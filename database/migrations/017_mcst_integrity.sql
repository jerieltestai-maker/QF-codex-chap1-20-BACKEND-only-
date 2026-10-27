-- Preserve historical zero quotations; all newly inserted versions must be positive.
ALTER TABLE quote_versions ADD CONSTRAINT positive_new_quote CHECK(amount_cents>0) NOT VALID;
CREATE TABLE integrity_settings (
 id uuid PRIMARY KEY, estate_id uuid NOT NULL REFERENCES estates(id), job_id uuid REFERENCES job_records(id),
 version integer NOT NULL CHECK(version>0), values jsonb NOT NULL, acknowledged boolean NOT NULL CHECK(acknowledged),
 acknowledgment_text text NOT NULL, reason text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), actor_role text NOT NULL,
 recorded_at timestamptz NOT NULL, effective_point text NOT NULL CHECK(effective_point IN ('next_round','future_ticket_events'))
);
CREATE UNIQUE INDEX integrity_estate_version ON integrity_settings(estate_id,version) WHERE job_id IS NULL;
CREATE UNIQUE INDEX integrity_ticket_version ON integrity_settings(job_id,version) WHERE job_id IS NOT NULL;
CREATE TRIGGER preserve_integrity_settings BEFORE UPDATE OR DELETE ON integrity_settings FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE integrity_round_policies (
 round_id uuid PRIMARY KEY REFERENCES quotation_rounds(id), setting_id uuid REFERENCES integrity_settings(id),
 values jsonb NOT NULL, recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_integrity_round_policies BEFORE UPDATE OR DELETE ON integrity_round_policies FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE integrity_cards (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), round_id uuid NOT NULL REFERENCES quotation_rounds(id),
 event_key text NOT NULL UNIQUE, event_type text NOT NULL, source_id uuid NOT NULL, source_version integer NOT NULL,
 policy jsonb NOT NULL, triggers jsonb NOT NULL, evidence jsonb NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_integrity_cards BEFORE UPDATE OR DELETE ON integrity_cards FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE INDEX integrity_cards_job ON integrity_cards(job_id,recorded_at,id);
CREATE TABLE integrity_reviews (
 id uuid PRIMARY KEY, card_id uuid NOT NULL REFERENCES integrity_cards(id), version integer NOT NULL,
 disposition text NOT NULL CHECK(disposition IN ('explained','needs_clarification','escalated','unresolved')),
 note text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), actor_role text NOT NULL, recorded_at timestamptz NOT NULL,
 UNIQUE(card_id,version)
);
CREATE TRIGGER preserve_integrity_reviews BEFORE UPDATE OR DELETE ON integrity_reviews FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE integrity_clearances (
 card_id uuid PRIMARY KEY REFERENCES integrity_cards(id), explanation text NOT NULL CHECK(length(trim(explanation))>0),
 actor_id uuid NOT NULL REFERENCES users(id), actor_role text NOT NULL CHECK(actor_role IN ('mcst','admin')),
 source_version integer NOT NULL, recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_integrity_clearances BEFORE UPDATE OR DELETE ON integrity_clearances FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE protected_access_events (
 id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id), actor_role text, job_id uuid REFERENCES job_records(id),
 resource_id uuid NOT NULL, resource_type text NOT NULL CHECK(resource_type IN ('sealed_quotes','masked_identity','original_file','confidential_case')),
 outcome text NOT NULL CHECK(outcome IN ('allowed','denied')), recorded_at timestamptz NOT NULL,
 support_id uuid REFERENCES support_requests(id), projection text NOT NULL
);
CREATE TRIGGER preserve_protected_access_events BEFORE UPDATE OR DELETE ON protected_access_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE protected_access_summaries (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), summary text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_protected_access_summaries BEFORE UPDATE OR DELETE ON protected_access_summaries FOR EACH ROW EXECUTE FUNCTION preserve_audit();
