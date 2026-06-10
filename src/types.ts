export type LeadStatus = 'booked' | 'rescheduled' | 'cancelled' | 'showed_up' | 'no_show';

export interface LeadReport {
  id?: string;
  managerName: string;
  clientName: string;
  clientPhone?: string;
  amocrmLeadId?: string;
  bookingDate: string;
  status: LeadStatus;
  city?: string;
  depositRequired: boolean;
  depositAmount: number;
  depositPaid: boolean;
  visitCost?: number;
  comments?: string;
  isReferral?: boolean;
  yookassaPaid?: boolean;
  yookassaAmount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommissionRules {
  perShowUpHigh: number;  // ставка за визит при ПО > порога
  perShowUpLow:  number;  // ставка за визит при ПО ≤ порога
  perPoHigh:     number;  // ставка за запись при ПО > порога
  perPoLow:      number;  // ставка за запись при ПО ≤ порога
  hourlyRate:    number;  // ставка за час работы
  poThreshold:   number;  // порог ПО для смены ставок
}

export interface DbStatus {
  provider: 'local' | 'postgres';
  configured: boolean;
  error?: string;
  connectionInfo?: string;
  tableName: string;
  geminiActive: boolean;
}

export interface StaffMember {
  id?: number;
  name: string;
  role: 'admin' | 'manager';
  pin: string;
  department: string;
  status: 'online' | 'offline';
  lastActive: string;
}

export interface ShiftSession {
  id: number;
  managerName: string;
  startedAt: string;
  endedAt: string | null;
  breakStartedAt: string | null;
  totalBreakSecs: number;
}

export interface CheckinLead extends LeadReport {
  yclientsAttendance: number | null; // 1=пришёл, -1=не пришёл, 0=ожидание, 2=отменено
  yclientsStaff: string | null;
  yookassaPaid: boolean;
  yookassaAmount: number | null;
}

export interface ManagerPerformance {
  managerName: string;
  totalBookings: number;
  totalDeposits: number;
  totalShowUps: number;
  totalNoShows: number;
  workedSeconds: number;
  earnedSalary: number;
  leads: LeadReport[];
  referralDeposits?: number;
}
