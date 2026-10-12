CREATE TABLE IF NOT EXISTS admin_state (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_state_expires ON admin_state(expires);
