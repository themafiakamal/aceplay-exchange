import { useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  currency: string;
  referral_code: string | null;
  balance: number;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer DB calls
        setTimeout(() => loadUserData(s.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadUserData(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadUserData(uid: string) {
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    const profileData = p as Profile | null;
    setProfile(profileData);
    // Double-layer security: hardcoded email + username lock for admin access.
    // Even with the 'admin' role, access is denied unless BOTH the verified
    // email and username match the authorized owner.
    const ADMIN_EMAIL = "themafiakamal@gmail.com";
    const ADMIN_USERNAME = "mdkamalhossen";
    const hasAdminRole = !!roles?.some((r) => r.role === "admin");
    const emailMatches = profileData?.email?.toLowerCase() === ADMIN_EMAIL;
    const usernameMatches = profileData?.username === ADMIN_USERNAME;
    setIsAdmin(hasAdminRole && emailMatches && usernameMatches);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return { session, user, profile, isAdmin, loading, signOut, refresh: () => user && loadUserData(user.id) };
}
