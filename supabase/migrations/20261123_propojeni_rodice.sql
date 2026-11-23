-- Propojení rodič ↔ dítě (23. 11. 2026)
-- 1) Hledání účtu dítěte podle e-mailu přímo v auth.users. Dřív /api/parent-link četl jen první stránku
--    auth.admin.listUsers() (50 účtů), takže s přibývajícími účty dítě přestalo jít najít.
--    Funkci smí volat jen service role (server), ne prohlížeč – jinak by šlo zjišťovat, kdo má účet.
-- 2) Nic se tu nemaže ani nemění na existujících řádcích parent_child_link. Co s dosavadními
--    verified = true rozhoduje Karel zvlášť (supabase/navrhy/2026-11-23_propojeni_stare_radky.sql).
-- Bez téhle migrace appka funguje dál (projde listUsers po stránkách), jen pomaleji.

CREATE OR REPLACE FUNCTION public.najdi_ucet_podle_emailu(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
    AND u.deleted_at IS NULL
  ORDER BY u.created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.najdi_ucet_podle_emailu(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.najdi_ucet_podle_emailu(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.najdi_ucet_podle_emailu(text) TO service_role;

-- Žádosti dítěte (child_user_id) a odpověď podle tokenu
CREATE INDEX IF NOT EXISTS idx_parent_child_link_token ON public.parent_child_link (token);

-- Zápisy do parent_child_link dál jen přes server (service role). Dítě ani rodič nesmí měnit
-- verified z prohlížeče – proto žádná UPDATE/INSERT politika pro authenticated.
