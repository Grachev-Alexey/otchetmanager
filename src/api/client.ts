import type { LeadReport, CommissionRules, StaffMember } from '../types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    let message = res.statusText;
    try { message = (await res.json()).error || message; } catch { /* ignore */ }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  leads: {
    list: () =>
      request<LeadReport[]>('/api/leads'),
    save: (lead: LeadReport) =>
      request<{ id: string; success: boolean }>('/api/leads', { method: 'POST', body: JSON.stringify(lead) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/leads/${id}`, { method: 'DELETE' }),
  },

  rules: {
    get: () =>
      request<CommissionRules>('/api/rules'),
    save: (rules: CommissionRules) =>
      request<{ success: boolean }>('/api/rules', { method: 'POST', body: JSON.stringify(rules) }),
  },

  users: {
    list: () =>
      request<StaffMember[]>('/api/users'),
    save: (user: Partial<StaffMember> & { name: string }) =>
      request<{ success: boolean }>('/api/users', { method: 'POST', body: JSON.stringify(user) }),
    delete: (name: string) =>
      request<{ success: boolean }>(`/api/users/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },

  auth: {
    login: (pin: string, name?: string) =>
      request<{ success: boolean; user: StaffMember }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ pin, ...(name ? { name } : {}) }),
      }),
    logout: (name: string) =>
      request<{ success: boolean }>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ name }) }),
  },
};
