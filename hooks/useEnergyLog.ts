import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Fetches the most recent energy log entry for the given user.
 * Used on the welcome screen to personalise the returning-user greeting.
 */
export function useEnergyLog(userId: string | null) {
  const [yesterdayEnergy, setYesterdayEnergy] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchLastEnergy = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('energy_log')
        .select('energy, date')
        .eq('user_id', userId)
        .lt('date', today)           // exclude today — only show yesterday or earlier
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setYesterdayEnergy(data.energy);
      }
    };

    fetchLastEnergy();
  }, [userId]);

  return { yesterdayEnergy };
}
