-- Snapshots are private immutable records, not publicly addressable files.
ALTER TABLE tasks ADD COLUMN informational boolean NOT NULL DEFAULT false;
UPDATE tasks t SET informational=true WHERE t.response_rule IS NULL AND EXISTS (
 SELECT 1 FROM outbox o WHERE o.kind='notification.issue' AND o.resource_id=t.id AND o.payload->>'informational'='true'
);
CREATE TABLE decision_exports (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id),
 requested_by uuid NOT NULL REFERENCES users(id), membership_id uuid NOT NULL REFERENCES memberships(id),
 access_version integer NOT NULL, audience jsonb NOT NULL, source_version integer NOT NULL,
 format text NOT NULL CHECK(format IN ('html','json')), snapshot jsonb NOT NULL,
 requested_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_decision_exports BEFORE UPDATE OR DELETE ON decision_exports FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE export_results (
 export_id uuid PRIMARY KEY REFERENCES decision_exports(id), bytes bytea NOT NULL,
 checksum text NOT NULL, media_type text NOT NULL, generated_at timestamptz NOT NULL
);
CREATE TRIGGER preserve_export_results BEFORE UPDATE OR DELETE ON export_results FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE export_grants (
 token_hash text PRIMARY KEY, export_id uuid NOT NULL REFERENCES decision_exports(id),
 user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE INDEX decision_exports_owner ON decision_exports(requested_by,job_id,requested_at);
-- Explicit provenance: existing isolated development/test databases contain fictional data.
ALTER TABLE job_records ADD COLUMN data_origin text NOT NULL DEFAULT 'live' CHECK(data_origin IN ('live','fictional'));
UPDATE job_records SET data_origin='fictional' WHERE (SELECT environment FROM deployment_identity) IN ('development','test');
CREATE FUNCTION job_data_origin() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (SELECT environment FROM deployment_identity) IN ('development','test') THEN NEW.data_origin='fictional'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER job_data_origin BEFORE INSERT ON job_records FOR EACH ROW EXECUTE FUNCTION job_data_origin();
