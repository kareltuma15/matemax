// Basic analytics tracking — fires and forgets into Supabase analytics_events table.
// SQL migration to run in Supabase:
//
// CREATE TABLE IF NOT EXISTS analytics_events (
//   id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
//   event_name TEXT NOT NULL,
//   properties JSONB DEFAULT '{}',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX ON analytics_events (user_id, event_name);
// CREATE INDEX ON analytics_events (created_at);
// ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "service role only" ON analytics_events USING (false) WITH CHECK (false);

import { supabase } from "./supabase";

export async function trackEvent(
  userId: string | null,
  eventName: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("analytics_events").insert({
      user_id: userId ?? null,
      event_name: eventName,
      properties,
    });
  } catch {
    // Graceful fail — table may not exist yet or RLS blocks it
  }
}
