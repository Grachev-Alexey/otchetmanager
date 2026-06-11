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
  perShowUpHigh: number;
  perShowUpLow:  number;
  perPoHigh:     number;
  perPoLow:      number;
  hourlyRate:    number;
  poThreshold:   number;
}

export interface StaffMember {
  id?: number;
  name: string;
  role: 'admin' | 'manager';
  pin: string;
  department: string;
}

export interface ShiftSession {
  id: number;
  managerName: string;
  startedAt: string;
  endedAt: string | null;
  breakStartedAt: string | null;
  totalBreakSecs: number;
}

export interface YclientsService {
  name: string;
  price: number;
  paid: number | null;
}

export interface CheckinLead extends LeadReport {
  yclientsAttendance: number | null;
  yclientsStaff: string | null;
  yclientsDeleted: boolean | null;
  yclientsDate: string | null;
  yclientsServices: YclientsService[] | null;
  yclientsOtherDate: string | null;
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
