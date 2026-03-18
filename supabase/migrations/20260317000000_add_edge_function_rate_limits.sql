-- Rate limiting table for Edge Functions
-- Tracks per-user request counts within sliding time windows
-- Protects maya-intelligence (LLM cost), send-voucher-email, send-demo-payroll-email

CREATE TABLE IF NOT EXISTS edge_function_rate_limits (
  user_id text NOT NULL,
  function_name text NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, function_name)
);

-- Index for periodic cleanup of expired windows
CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON edge_function_rate_limits(window_start);

-- Only accessible from service_role (Edge Functions use service key)
-- RLS not needed here since no user JWT has direct table access
ALTER TABLE edge_function_rate_limits DISABLE ROW LEVEL SECURITY;
