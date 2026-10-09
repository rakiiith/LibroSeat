import { useEffect, useState } from 'react';
import * as client from '../supabase/supabaseClient';
import { getSupabaseProfile } from '../supabase/authService';

const supabase = client.supabase ?? client.default;
const listeners = new Set();

// Call after editing the profile so every screen updates.
export function refreshProfile() {
  listeners.forEach((fn) => fn());
}

export function useCurrentProfile() {
  const [state, setState] = useState({ user: null, profile: null, loading: true });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          if (active) setState({ user: null, profile: null, loading: false });
          return;
        }
        let profile = null;
        try {
          profile = await getSupabaseProfile(user.id);
        } catch (e) {
          profile = null;
        }
        if (active) setState({ user, profile, loading: false });
      } catch (e) {
        if (active) setState((s) => ({ ...s, loading: false }));
      }
    };

    load();
    listeners.add(load);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') return;
      setTimeout(load, 0);
    });

    return () => {
      active = false;
      listeners.delete(load);
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return state;
}

export default useCurrentProfile;