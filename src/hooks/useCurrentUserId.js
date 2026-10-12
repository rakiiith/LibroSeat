import { useEffect, useState } from 'react';
import * as client from '../supabase/supabaseClient';

const supabase = client.supabase ?? client.default;

export function useCurrentUserId() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let active = true;
    const set = (id) => active && setUserId(typeof id === 'string' ? id : null);

    supabase.auth.getSession().then(({ data }) => set(data?.session?.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      set(session?.user?.id);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return userId;
}

export default useCurrentUserId;