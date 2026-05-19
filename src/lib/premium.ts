"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) { setLoading(false); return; }
      supabase!
        .from("user_premium")
        .select("is_premium, trial_expires_at")
        .eq("user_id", uid)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row?.is_premium) {
            const trialExpiry = row.trial_expires_at ? new Date(row.trial_expires_at) : null;
            const now = new Date();
            if (trialExpiry && trialExpiry > now) {
              const msLeft = trialExpiry.getTime() - now.getTime();
              setTrialDaysLeft(Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
              setIsPremium(true);
            } else if (!trialExpiry) {
              // Paid premium (no expiry)
              setIsPremium(true);
            } else {
              // Trial expired — revoke
              setIsPremium(false);
              supabase!.from("user_premium").upsert(
                { user_id: uid, is_premium: false },
                { onConflict: "user_id" }
              ).then(() => {});
            }
          } else {
            setIsPremium(false);
          }
          setLoading(false);
        });
    });
  }, []);

  return { isPremium, trialDaysLeft, loading };
}
