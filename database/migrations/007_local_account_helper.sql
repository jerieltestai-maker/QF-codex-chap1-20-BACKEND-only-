-- Optional local development convenience; application guards prohibit use outside development.
CREATE TABLE local_account_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  password_hash text NOT NULL,
  encrypted_password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
