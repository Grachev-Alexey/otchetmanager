import type { LeadReport, CommissionRules, StaffMember, ShiftSession, CheckinLead } from '../types';

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
    save: (user: Partial<StaffMember> & { name: string; originalName?: string }) =>
      request<{ success: boolean }>('/api/users', { method: 'POST', body: JSON.stringify(user) }),
    delete: (name: string) =>
      request<{ success: boolean }>(`/api/users/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },

  auth: {
    login: (pin: string, name?: string) =>
      request<{ success: boolean; user: StaffMember }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ pin, ...(name ? { name } : {}) }),
      }),
  },

  checkin: {
    list: (managerName: string, role: string) =>
      request<CheckinLead[]>(`/api/leads/checkin?managerName=${encodeURIComponent(managerName)}&role=${role}`),
    quickUpdate: (id: string, update: { status?: string; depositPaid?: boolean }) =>
      request<{ success: boolean }>(`/api/leads/${encodeURIComponent(id)}/quick`, {
        method: 'PATCH',
        body: JSON.stringify(update),
      }),
  },

  shifts: {
    active: (name: string) =>
      request<{ active: boolean; session: ShiftSession | null; todayPriorSeconds: number; sessionElapsedSeconds: number; breakElapsedSeconds: number }>(`/api/shifts/active?name=${encodeURIComponent(name)}`),
    start: (name: string) =>
      request<{ success: boolean; session: ShiftSession | null; todayPriorSeconds?: number; sessionElapsedSeconds?: number }>('/api/shifts/start', { method: 'POST', body: JSON.stringify({ name }) }),
    end: (name: string) =>
      request<{ success: boolean; workedSeconds: number }>('/api/shifts/end', { method: 'POST', body: JSON.stringify({ name }) }),
    breakStart: (name: string) =>
      request<{ success: boolean }>('/api/shifts/break/start', { method: 'POST', body: JSON.stringify({ name }) }),
    breakEnd: (name: string) =>
      request<{ success: boolean }>('/api/shifts/break/end', { method: 'POST', body: JSON.stringify({ name }) }),
    monthly: (name: string, year: number, month: number) =>
      request<{ totalSeconds: number }>(`/api/shifts/monthly?name=${encodeURIComponent(name)}&year=${year}&month=${month}`),
    monthlyAll: (year: number, month: number) =>
      request<Record<string, number>>(`/api/shifts/monthly-all?year=${year}&month=${month}`),
    adminSessions: (date: string) =>
      request<ShiftSession[]>(`/api/shifts/admin/sessions?date=${encodeURIComponent(date)}`),
    adminCreate: (data: { managerName: string; startedAt: string; endedAt?: string; totalBreakSecs?: number }) =>
      request<ShiftSession>('/api/shifts/admin/sessions', { method: 'POST', body: JSON.stringify(data) }),
    adminUpdate: (id: number, data: { startedAt?: string; endedAt?: string; totalBreakSecs?: number }) =>
      request<ShiftSession>(`/api/shifts/admin/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    adminDelete: (id: number) =>
      request<{ success: boolean }>(`/api/shifts/admin/sessions/${id}`, { method: 'DELETE' }),
    adminClose: (id: number) =>
      request<ShiftSession>(`/api/shifts/admin/close/${id}`, { method: 'POST' }),
  },
};
