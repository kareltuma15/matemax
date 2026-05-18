"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) { setLoading(false); return; }
      supabase!
        .from("user_premium")
        .select("is_premium")
        .eq("user_id", uid)
        .maybeSingle()
        .then(({ data: row }) => {
          setIsPremium(row?.is_premium ?? false);
          setLoading(false);
        });
    });
  }, []);

  return { isPremium, loading };
}
