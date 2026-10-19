ALTER TABLE sessions ADD COLUMN client_type text NOT NULL DEFAULT 'browser' CHECK(client_type IN ('browser','native'));
CREATE TABLE native_authorization_codes (
 code_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
 membership_id uuid REFERENCES memberships(id), access_version integer NOT NULL,
 challenge text NOT NULL CHECK(challenge ~ '^[A-Za-z0-9_-]{43}$'),
 redirect_uri text NOT NULL CHECK(redirect_uri='quotefix://auth'),
 expires_at timestamptz NOT NULL, consumed_at timestamptz
);
