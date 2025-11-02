// Harp HRM System Types

export type MonthlyHourTarget = 40 | 60 | 80 | 100;

export type UserRole = 'employee' | 'manager' | 'admin';

export interface Employee {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  position: string;
  department: string;
  employmentStartDate: string;
  managerId: string | null;
  monthlyHourTarget: MonthlyHourTarget;
  hourlyRate: number;
  role: UserRole;
  compLeavesEarned: number;
  compLeavesUsed: number;
  profilePicture?: string; // URL or base64 image
  address?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
}

export interface TimeLog {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // ISO timestamp
  checkOut: string | null; // ISO timestamp
  breaks: BreakLog[];
  totalHours: number;
  status: 'checked-in' | 'checked-out' | 'incomplete';
}

export interface BreakLog {
  breakIn: string; // ISO timestamp
  breakOut: string | null; // ISO timestamp
}

export interface Task {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  description: string;
  hoursSpent: number;
  status: 'pending' | 'approved' | 'commented';
  managerComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  status: 'pending' | 'approved' | 'paid';
  processedBy?: string;
  processedAt?: string;
  notes?: string;
}

export interface OvertimeSettings {
  employeeId: string;
  overtimeMultiplier: number; // 1.0 or 1.25
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: string;
  previousValue?: string;
  newValue?: string;
}

export interface HRMState {
  employees: Employee[];
  timeLogs: TimeLog[];
  tasks: Task[];
  leaveRequests: LeaveRequest[];
  payrollEntries: PayrollEntry[];
  overtimeSettings: OvertimeSettings[];
  auditLogs: AuditLog[];
  currentUser: string | null;
}
