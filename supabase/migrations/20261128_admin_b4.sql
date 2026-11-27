-- Admin 2.1, fáze B4: limity tarifů v Systém → Zdraví (SY-05).
-- Spustit v Supabase SQL Editoru PŘED nasazením kódu. Idempotentní. Nic stávajícího nemění.
--
--   admin_velikost_db() = velikost databáze v bajtech (Supabase Free: 500 MB na projekt, ověřeno na supabase.com/pricing 27. 11. 2026)
-- Volá jen server (service role).

CREATE OR REPLACE FUNCTION admin_velikost_db() RETURNS BIGINT
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pg_database_size(current_database());
$$;
REVOKE ALL ON FUNCTION admin_velikost_db() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_velikost_db() TO service_role;

-- Kontrola po spuštění: velikost databáze v MB
SELECT round(admin_velikost_db() / 1024.0 / 1024.0, 1) AS velikost_mb;
