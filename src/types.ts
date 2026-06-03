export type LeadStatus = 'booked' | 'rescheduled' | 'cancelled' | 'showed_up' | 'no_show';

export interface LeadReport {
  id?: string;
  managerName: string;
  clientName: string;
  clientPhone?: string;
  amocrmLeadId?: string;
  bookingDate: string; // ISO date string YYYY-MM-DD
  status: LeadStatus;
  city?: string;
  depositRequired: boolean;
  depositAmount: number;
  depositPaid: boolean;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommissionRules {
  baseSalary: number;
  perBooking: number;
  perDepositCollected: number;
  perShowUp: number;
  targetBookings: number;
  bonusAmount: number;
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
  name: string;
  role: 'admin' | 'manager';
  pin: string;
  department: string;
  avatarColor: string;
  status: 'online' | 'offline';
  lastActive: string;
  bio: string;
}

export interface ManagerPerformance {
  managerName: string;
  totalBookings: number;
  totalDeposits: number;
  totalShowUps: number;
  totalNoShows: number;
  earnedCommissions: number;
  isBonusAchieved: boolean;
  bonusEarned: number;
  totalSalary: number;
  leads: LeadReport[];
}

