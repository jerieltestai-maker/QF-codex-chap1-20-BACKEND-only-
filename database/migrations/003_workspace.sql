CREATE TABLE job_records (
  id uuid PRIMARY KEY, estate_id uuid NOT NULL REFERENCES estates(id),
  created_by uuid NOT NULL REFERENCES users(id), title text NOT NULL CHECK(length(trim(title))>0),
  observations text NOT NULL, affected_location text NOT NULL,
  stage text NOT NULL DEFAULT 'Report an issue' CHECK(stage='Report an issue'),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX jobs_estate ON job_records(estate_id,created_at,id);
CREATE TABLE workspace_drafts (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id),
  estate_id uuid NOT NULL REFERENCES estates(id), job_id uuid REFERENCES job_records(id),
  base_version integer NOT NULL CHECK(base_version>=0), revision integer NOT NULL CHECK(revision>0),
  fields jsonb NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE job_versions (
  job_id uuid NOT NULL REFERENCES job_records(id), version integer NOT NULL,
  fields jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL,
  PRIMARY KEY(job_id,version)
);
CREATE TRIGGER preserve_job_versions BEFORE UPDATE OR DELETE ON job_versions FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE support_requests (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id),
  reporter_id uuid NOT NULL REFERENCES users(id), description text NOT NULL CHECK(length(trim(description))>0),
  privacy text NOT NULL CHECK(privacy IN ('ordinary','confidential')),
  subject_user_ids uuid[] NOT NULL DEFAULT '{}', subject_organisation_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  CHECK(privacy='confidential' OR (cardinality(subject_user_ids)=0 AND cardinality(subject_organisation_ids)=0))
);
CREATE TABLE upload_intents (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES job_records(id), owner_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK(purpose IN ('evidence','invoice','payment_proof')),
  media_type text NOT NULL CHECK(media_type IN ('image/jpeg','image/png','application/pdf')),
  byte_size integer NOT NULL CHECK(byte_size>0 AND byte_size<=10485760),
  checksum text NOT NULL CHECK(checksum ~ '^[a-f0-9]{64}$'),
  state text NOT NULL CHECK(state IN ('transferring','verifying','ready','rejected')),
  expires_at timestamptz NOT NULL, rejection_code text, created_at timestamptz NOT NULL
);
CREATE TABLE upload_chunks (
  upload_id uuid NOT NULL REFERENCES upload_intents(id), byte_offset integer NOT NULL CHECK(byte_offset>=0),
  bytes bytea NOT NULL CHECK(octet_length(bytes)>0 AND octet_length(bytes)<=262144),
  PRIMARY KEY(upload_id,byte_offset)
);
CREATE TABLE file_objects (
  id uuid PRIMARY KEY, upload_id uuid NOT NULL REFERENCES upload_intents(id),
  variant text NOT NULL CHECK(variant IN ('original','sanitized')), media_type text NOT NULL,
  checksum text NOT NULL, bytes bytea NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE(upload_id,variant)
);
CREATE TRIGGER preserve_file_objects BEFORE UPDATE OR DELETE ON file_objects FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE job_attachments (
  job_id uuid NOT NULL REFERENCES job_records(id), file_id uuid NOT NULL REFERENCES file_objects(id),
  attached_by uuid NOT NULL REFERENCES users(id), attached_at timestamptz NOT NULL,
  PRIMARY KEY(job_id,file_id)
);
CREATE INDEX support_job ON support_requests(job_id);
CREATE INDEX uploads_job ON upload_intents(job_id);
