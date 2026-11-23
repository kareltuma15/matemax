-- NESPOUŠTĚT bez Karlova schválení (návrh v MS Dashboardu „MateMax: co se starými propojeními rodičů“).
-- Dosavadní řádky parent_child_link s verified = true vznikly bez souhlasu dítěte (stačil e-mail).
-- Nic se nemaže. Varianty:

-- 0) Nejdřív se podívat, co tam je (jen čtení):
SELECT l.parent_email, u.email AS child_email, l.verified, l.verified_at
FROM public.parent_child_link l
LEFT JOIN auth.users u ON u.id = l.child_user_id
ORDER BY l.verified_at NULLS LAST;

-- A) Doporučeno: všechna stará propojení vrátit na „čeká na potvrzení dítětem“.
--    Rodič hned přestane vidět data a dostávat report; dítě uvidí na Domově žádost a jedním klikem ji povolí.
--    Záloha původního stavu zůstane v tabulce parent_child_link_zaloha_20261123.
-- CREATE TABLE IF NOT EXISTS public.parent_child_link_zaloha_20261123 AS
--   SELECT * FROM public.parent_child_link WHERE verified = true;
-- ALTER TABLE public.parent_child_link_zaloha_20261123 ENABLE ROW LEVEL SECURITY;
-- UPDATE public.parent_child_link SET verified = false, verified_at = NULL WHERE verified = true;

-- B) Ponechat jen řádky, které Karel ověřil sám (zná rodinu), ostatní jako v A):
-- UPDATE public.parent_child_link SET verified = false, verified_at = NULL
--   WHERE verified = true AND parent_email NOT IN ('…e-mail rodiče, kterého Karel zná…');

-- C) Nechat vše, jak je (nedoporučeno: kdo se propojil cizím e-mailem, vidí data dál).
