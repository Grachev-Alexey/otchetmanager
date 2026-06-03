import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { LeadReport, CommissionRules, StaffMember } from '../types';

const INITIAL_RULES: CommissionRules = {
  perShowUpHigh: 350,
  perShowUpLow:  200,
  perPoHigh:     150,
  perPoLow:      100,
  hourlyRate:    85,
  poThreshold:   140,
};

export function useData() {
  const [leads, setLeads] = useState<LeadReport[]>([]);
  const [rules, setRules] = useState<CommissionRules>(INITIAL_RULES);
  const [allUsers, setAllUsers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLeads = useCallback(async () => {
    try { setLeads(await api.leads.list()); } catch (e) { console.error('[Data] Failed to fetch leads:', e); }
  }, []);

  const refreshRules = useCallback(async () => {
    try { setRules(await api.rules.get()); } catch (e) { console.error('[Data] Failed to fetch rules:', e); }
  }, []);

  const refreshUsers = useCallback(async () => {
    try { setAllUsers(await api.users.list()); } catch (e) { console.error('[Data] Failed to fetch users:', e); }
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshLeads(), refreshRules(), refreshUsers()]);
    setLoading(false);
  }, [refreshLeads, refreshRules, refreshUsers]);

  return { leads, rules, allUsers, loading, refreshLeads, refreshRules, refreshUsers, initialize };
}
