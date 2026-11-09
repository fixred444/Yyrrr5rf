"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "user" | "admin";
  balance: number;
  ewallet_method: "DANA" | "OVO" | "GoPay" | null;
  ewallet_number: string | null;
  created_at: string;
};

export function useProfile(requireAdmin = false) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (!data) { await supabase.auth.signOut(); router.replace("/auth"); return; }
    if (requireAdmin && data.role !== "admin") { router.replace("/dashboard"); return; }
    setProfile(data as Profile);
    setLoading(false);
  }, [router, requireAdmin]);

  useEffect(() => { reload(); }, [reload]);

  return { profile, loading, reload };
}
