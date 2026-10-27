CREATE TABLE users (
  id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK(email = lower(email)),
  name text NOT NULL CHECK(length(trim(name)) > 0), password_hash text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
  access_version integer NOT NULL DEFAULT 1 CHECK(access_version > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE estates (
  id uuid PRIMARY KEY, name text NOT NULL CHECK(length(trim(name)) > 0),
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organisations (
  id uuid PRIMARY KEY, name text NOT NULL CHECK(length(trim(name)) > 0),
  verified boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK(role IN ('cm','mcst','contractor','admin')),
  estate_id uuid REFERENCES estates(id) ON DELETE RESTRICT,
  organisation_id uuid REFERENCES organisations(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true, label text,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK((role IN ('cm','mcst') AND estate_id IS NOT NULL AND organisation_id IS NULL)
     OR (role='contractor' AND organisation_id IS NOT NULL AND estate_id IS NULL)
     OR (role='admin' AND estate_id IS NULL AND organisation_id IS NULL))
);
CREATE UNIQUE INDEX membership_estate_unique ON memberships(user_id, estate_id, role) WHERE estate_id IS NOT NULL;
CREATE UNIQUE INDEX membership_org_unique ON memberships(user_id, organisation_id) WHERE organisation_id IS NOT NULL;
CREATE UNIQUE INDEX membership_admin_unique ON memberships(user_id) WHERE role='admin';
CREATE TABLE sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  csrf_token text NOT NULL, context_id uuid REFERENCES memberships(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity_tokens (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK(purpose IN ('verify','recover')),
  expires_at timestamptz NOT NULL, consumed_at timestamptz
);
CREATE TABLE invitations (
  id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE, email text NOT NULL CHECK(email=lower(email)),
  role text NOT NULL CHECK(role IN ('cm','mcst')), estate_id uuid NOT NULL REFERENCES estates(id) ON DELETE RESTRICT,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL, accepted_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  accepted_at timestamptz, CHECK((accepted_by IS NULL) = (accepted_at IS NULL))
);
CREATE TABLE contractor_applications (
  id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  contact text NOT NULL CHECK(length(trim(contact)) > 0), trades text[] NOT NULL CHECK(cardinality(trades)>0),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  actor_role text, action text NOT NULL, resource_id uuid, before_value jsonb, after_value jsonb,
  reason text, request_id text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION preserve_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit events are append-only'; END;
$$;
CREATE TRIGGER preserve_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION preserve_audit();
CREATE TABLE command_receipts (
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, operation_id uuid NOT NULL,
  intent text NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id, operation_id)
);
CREATE TABLE outbox (
  id uuid PRIMARY KEY, kind text NOT NULL, resource_id uuid, payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_pending ON outbox(available_at) WHERE processed_at IS NULL;
CREATE TABLE files (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  object_key text NOT NULL UNIQUE, state text NOT NULL CHECK(state IN ('staging','ready','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tasks (
  id uuid PRIMARY KEY, kind text NOT NULL, resource_id uuid, owner_role text NOT NULL,
  status text NOT NULL CHECK(status IN ('open','resolved','superseded')), rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
