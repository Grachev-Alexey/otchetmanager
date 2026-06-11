import { useState, useCallback, useRef } from 'react';
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

  const leadsInflight = useRef<Promise<void> | null>(null);
  const rulesInflight = useRef<Promise<void> | null>(null);
  const usersInflight = useRef<Promise<void> | null>(null);

  const refreshLeads = useCallback(async () => {
    if (leadsInflight.current) return leadsInflight.current;
    const p: Promise<void> = (async () => {
      try {
        const data = await api.leads.list();
        setLeads(data);
      } catch (e) {
        console.error('[Data] Failed to fetch leads:', e);
      } finally {
        leadsInflight.current = null;
      }
    })();
    leadsInflight.current = p;
    return p;
  }, []);

  const refreshRules = useCallback(async () => {
    if (rulesInflight.current) return rulesInflight.current;
    const p: Promise<void> = (async () => {
      try {
        const data = await api.rules.get();
        setRules(data);
      } catch (e) {
        console.error('[Data] Failed to fetch rules:', e);
      } finally {
        rulesInflight.current = null;
      }
    })();
    rulesInflight.current = p;
    return p;
  }, []);

  const refreshUsers = useCallback(async () => {
    if (usersInflight.current) return usersInflight.current;
    const p: Promise<void> = (async () => {
      try {
        const data = await api.users.list();
        setAllUsers(data);
      } catch (e) {
        console.error('[Data] Failed to fetch users:', e);
      } finally {
        usersInflight.current = null;
      }
    })();
    usersInflight.current = p;
    return p;
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshLeads(), refreshRules(), refreshUsers()]);
    setLoading(false);
  }, [refreshLeads, refreshRules, refreshUsers]);

  const applyLeadOptimistic = useCallback((lead: LeadReport) => {
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === lead.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = lead;
        return next;
      }
      return [lead, ...prev];
    });
  }, []);

  const removeLeadOptimistic = useCallback((id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  return { leads, rules, allUsers, loading, refreshLeads, refreshRules, refreshUsers, initialize, applyLeadOptimistic, removeLeadOptimistic };
}
