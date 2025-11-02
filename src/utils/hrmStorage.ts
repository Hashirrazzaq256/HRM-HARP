import { HRMState, Employee, TimeLog, Task, LeaveRequest, PayrollEntry, OvertimeSettings, AuditLog } from '../types/hrm';
import { projectId, publicAnonKey } from './supabase/info';

const STORAGE_KEY = 'harp_hrm_data';
const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-be2c25c4`;

// Initialize with sample data for 10 employees
export const getInitialData = (): HRMState => {
  const employees: Employee[] = [
    {
      id: 'emp1',
      name: 'Admin User',
      email: 'admin@harphrm.com',
      password: 'admin123',
      phone: '+92-300-1234567',
      position: 'System Administrator',
      department: 'Administration',
      employmentStartDate: '2023-01-15',
      managerId: null,
      monthlyHourTarget: 100,
      hourlyRate: 7500, // PKR
      role: 'admin',
      compLeavesEarned: 5,
      compLeavesUsed: 1,
      address: 'Lahore, Pakistan',
      dateOfBirth: '1990-01-15',
      emergencyContact: '+92-300-9876543',
    },
    {
      id: 'emp2',
      name: 'Manager User',
      email: 'manager@harphrm.com',
      password: 'manager123',
      phone: '+92-321-1234567',
      position: 'Engineering Manager',
      department: 'Engineering',
      employmentStartDate: '2022-06-01',
      managerId: 'emp1',
      monthlyHourTarget: 80,
      hourlyRate: 8500, // PKR
      role: 'manager',
      compLeavesEarned: 4,
      compLeavesUsed: 0,
      address: 'Karachi, Pakistan',
      dateOfBirth: '1988-03-20',
      emergencyContact: '+92-321-9876543',
    },
    {
      id: 'emp3',
      name: 'Ali Hassan',
      email: 'ali.hassan@harphrm.com',
      password: 'employee123',
      phone: '+92-333-1234567',
      position: 'Software Engineer',
      department: 'Engineering',
      employmentStartDate: '2023-03-20',
      managerId: 'emp2',
      monthlyHourTarget: 80,
      hourlyRate: 6000, // PKR
      role: 'employee',
      compLeavesEarned: 3,
      compLeavesUsed: 1,
      address: 'Islamabad, Pakistan',
      dateOfBirth: '1995-05-10',
      emergencyContact: '+92-333-9876543',
    },
    {
      id: 'emp4',
      name: 'Fatima Khan',
      email: 'fatima.khan@harphrm.com',
      password: 'employee123',
      phone: '+92-345-1234567',
      position: 'Software Engineer',
      department: 'Engineering',
      employmentStartDate: '2023-05-10',
      managerId: 'emp2',
      monthlyHourTarget: 60,
      hourlyRate: 5500, // PKR
      role: 'employee',
      compLeavesEarned: 2,
      compLeavesUsed: 0,
      address: 'Lahore, Pakistan',
      dateOfBirth: '1996-08-15',
      emergencyContact: '+92-345-9876543',
    },
    {
      id: 'emp5',
      name: 'Sarah Ahmed',
      email: 'sarah.ahmed@harphrm.com',
      password: 'manager123',
      phone: '+92-311-1234567',
      position: 'Marketing Manager',
      department: 'Marketing',
      employmentStartDate: '2022-09-15',
      managerId: 'emp1',
      monthlyHourTarget: 80,
      hourlyRate: 7000, // PKR
      role: 'manager',
      compLeavesEarned: 6,
      compLeavesUsed: 2,
      address: 'Karachi, Pakistan',
      dateOfBirth: '1989-11-25',
      emergencyContact: '+92-311-9876543',
    },
    {
      id: 'emp6',
      name: 'Ahmed Raza',
      email: 'ahmed.raza@harphrm.com',
      password: 'employee123',
      phone: '+92-322-1234567',
      position: 'Marketing Specialist',
      department: 'Marketing',
      employmentStartDate: '2023-07-01',
      managerId: 'emp5',
      monthlyHourTarget: 60,
      hourlyRate: 5000, // PKR
      role: 'employee',
      compLeavesEarned: 2,
      compLeavesUsed: 0,
      address: 'Faisalabad, Pakistan',
      dateOfBirth: '1997-02-14',
      emergencyContact: '+92-322-9876543',
    },
    {
      id: 'emp7',
      name: 'Ayesha Malik',
      email: 'ayesha.malik@harphrm.com',
      password: 'employee123',
      phone: '+92-334-1234567',
      position: 'Content Writer',
      department: 'Marketing',
      employmentStartDate: '2023-08-15',
      managerId: 'emp5',
      monthlyHourTarget: 40,
      hourlyRate: 4500, // PKR
      role: 'employee',
      compLeavesEarned: 1,
      compLeavesUsed: 0,
      address: 'Multan, Pakistan',
      dateOfBirth: '1998-06-20',
      emergencyContact: '+92-334-9876543',
    },
    {
      id: 'emp8',
      name: 'Hassan Ali',
      email: 'hassan.ali@harphrm.com',
      password: 'employee123',
      phone: '+92-312-1234567',
      position: 'Junior Developer',
      department: 'Engineering',
      employmentStartDate: '2024-01-10',
      managerId: 'emp2',
      monthlyHourTarget: 80,
      hourlyRate: 5000, // PKR
      role: 'employee',
      compLeavesEarned: 1,
      compLeavesUsed: 0,
      address: 'Rawalpindi, Pakistan',
      dateOfBirth: '1999-09-05',
      emergencyContact: '+92-312-9876543',
    },
    {
      id: 'emp9',
      name: 'Zainab Tariq',
      email: 'zainab.tariq@harphrm.com',
      password: 'employee123',
      phone: '+92-335-1234567',
      position: 'UI/UX Designer',
      department: 'Design',
      employmentStartDate: '2023-04-01',
      managerId: 'emp2',
      monthlyHourTarget: 60,
      hourlyRate: 6500, // PKR
      role: 'employee',
      compLeavesEarned: 3,
      compLeavesUsed: 1,
      address: 'Lahore, Pakistan',
      dateOfBirth: '1996-12-10',
      emergencyContact: '+92-335-9876543',
    },
    {
      id: 'emp10',
      name: 'Usman Farooq',
      email: 'usman.farooq@harphrm.com',
      password: 'employee123',
      phone: '+92-346-1234567',
      position: 'QA Engineer',
      department: 'Engineering',
      employmentStartDate: '2023-11-01',
      managerId: 'emp2',
      monthlyHourTarget: 80,
      hourlyRate: 5800, // PKR
      role: 'employee',
      compLeavesEarned: 2,
      compLeavesUsed: 0,
      address: 'Islamabad, Pakistan',
      dateOfBirth: '1997-04-18',
      emergencyContact: '+92-346-9876543',
    },
  ];

  const overtimeSettings: OvertimeSettings[] = employees.map(emp => ({
    employeeId: emp.id,
    overtimeMultiplier: emp.monthlyHourTarget === 100 ? 1.25 : 1.0,
  }));

  return {
    employees,
    timeLogs: [],
    tasks: [],
    leaveRequests: [],
    payrollEntries: [],
    overtimeSettings,
    auditLogs: [],
    currentUser: null,
  };
};

export const loadData = async (): Promise<HRMState> => {
  try {
    // Try to load from backend first
    const response = await fetch(`${API_URL}/hrm/data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.data) {
      // Store in localStorage as cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      return result.data;
    }
    
    // If no data exists in backend, initialize it
    const initialData = getInitialData();
    await initializeBackendData(initialData);
    return initialData;
  } catch (error) {
    console.error('Error loading data from backend:', error);
    
    // Fallback to localStorage if backend fails
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        console.log('Using cached data from localStorage');
        return JSON.parse(stored);
      }
    } catch (localError) {
      console.error('Error loading from localStorage:', localError);
    }
    
    return getInitialData();
  }
};

// Helper function to initialize backend data
const initializeBackendData = async (data: HRMState): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/hrm/init`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Backend initialization result:', result);
  } catch (error) {
    console.error('Error initializing backend data:', error);
  }
};

export const saveData = async (data: HRMState): Promise<void> => {
  try {
    // Save to backend
    const response = await fetch(`${API_URL}/hrm/data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      // Also save to localStorage as cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      throw new Error('Backend save failed');
    }
  } catch (error) {
    console.error('Error saving data to backend:', error);
    
    // Fallback to localStorage if backend fails
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('Data saved to localStorage as fallback');
    } catch (localError) {
      console.error('Error saving to localStorage:', localError);
    }
  }
};

export const resetData = async (): Promise<HRMState> => {
  const data = getInitialData();
  
  try {
    // Reset data in backend
    const response = await fetch(`${API_URL}/hrm/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      // Also reset localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error('Error resetting data in backend:', error);
    
    // Fallback to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  
  return data;
};

export const addAuditLog = (
  state: HRMState,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes: string,
  previousValue?: string,
  newValue?: string
): AuditLog => {
  const user = state.employees.find(e => e.id === userId);
  const log: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName: user?.name || 'Unknown',
    action,
    entityType,
    entityId,
    changes,
    previousValue,
    newValue,
  };
  return log;
};

// Export to CSV
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
