CREATE INDEX memberships_current_user ON memberships(user_id) WHERE active;
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX identity_tokens_user_purpose ON identity_tokens(user_id,purpose) WHERE consumed_at IS NULL;
CREATE INDEX invitations_pending ON invitations(email) WHERE accepted_at IS NULL;
