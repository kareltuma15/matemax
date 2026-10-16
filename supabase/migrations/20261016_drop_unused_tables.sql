-- Úklid nepoužívaných tabulek (schváleno Karlem 16. 10. 2026).
-- Všechny tři tabulky měly při kontrole 0 řádků a nikde v kódu se nepoužívají:
--   public.users               zbytek po původním cizím klíči (sessions/sm2_cards už míří na auth.users)
--   public.xp_transactions     historie XP, kód ji nikdy nezapisoval
--   public.weekly_report_queue fronta týdenních reportů, cron weekly-parent-report ji nečte
-- DROP bez CASCADE: kdyby na tabulku něco záviselo, příkaz selže a nic se nesmaže.

-- Pojistka: přeruší se, pokud by některá tabulka najednou nebyla prázdná.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.users;               IF n > 0 THEN RAISE EXCEPTION 'public.users není prázdná (% řádků)', n; END IF;
  SELECT count(*) INTO n FROM public.xp_transactions;     IF n > 0 THEN RAISE EXCEPTION 'xp_transactions není prázdná (% řádků)', n; END IF;
  SELECT count(*) INTO n FROM public.weekly_report_queue; IF n > 0 THEN RAISE EXCEPTION 'weekly_report_queue není prázdná (% řádků)', n; END IF;
END $$;

DROP TABLE IF EXISTS public.xp_transactions;
DROP TABLE IF EXISTS public.weekly_report_queue;
DROP TABLE IF EXISTS public.users;
