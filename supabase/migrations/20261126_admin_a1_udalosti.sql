-- Admin 2.1, fáze A1: přejmenování událostí měření podle plánu měření (docs/tracking-plan.md)
-- Spustit v Supabase SQL Editoru HNED PO nasazení kódu (stará verze appky do té doby píše staré názvy).
-- Idempotentní: jde pustit znovu (třeba druhý den, kdyby ještě dobíhaly staré verze z mezipaměti).

UPDATE analytics_events AS a SET event_name = m.nove
FROM (VALUES
  ('navsteva', 'page_viewed'), ('odchod', 'page_left'), ('klik', 'element_clicked'), ('zive', 'app_heartbeat'),
  ('session_completed', 'training_completed'), ('diagnostika_dokoncena', 'diagnostic_completed'),
  ('diagnostika_prvni_trenink', 'diagnostic_training_started'), ('registrace_odeslana', 'signup_submitted'),
  ('registrace_google', 'signup_google_started'), ('premium_zobrazeno', 'premium_viewed'), ('platba_start', 'checkout_started'),
  ('platba_zrusena', 'checkout_canceled'), ('formular_start', 'form_started'), ('formular_chyba', 'form_error_shown'),
  ('funkce', 'feature_used'), ('email_odeslan', 'email_sent'), ('email_dorucitelnost', 'email_status_received'),
  ('email_odhlaseni', 'email_unsubscribed'), ('cermat_test_dokoncen', 'mock_test_completed'),
  ('videolekce_klik', 'video_lesson_opened'), ('doporuceni_otevreno', 'recommendation_opened'),
  ('tydenni_report', 'weekly_report_created'), ('admin_utrata', 'ad_spend_saved'), ('admin_poznamka', 'chart_note_added'),
  ('error_client', 'client_error_reported')
) AS m(stare, nove)
WHERE a.event_name = m.stare;

-- Staré kliky bez lidského názvu („tlačítko“, text tlačítka) a zakódované adresy s parametry (state, code, next…)
-- se uklidí: cíl se zkrátí na šablonu cesty bez parametrů, text tlačítka se smaže.
UPDATE analytics_events
SET properties = (properties - 'text') || jsonb_build_object('cil', split_part(properties->>'cil', '?', 1))
WHERE event_name = 'element_clicked' AND (properties ? 'text' OR properties->>'cil' LIKE '%?%');

-- Kontrola: žádný starý název nezůstal
SELECT event_name, COUNT(*) FROM analytics_events GROUP BY 1 ORDER BY 2 DESC;
