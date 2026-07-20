export interface AdvanceRecord { 
  id: string; 
  employeeId: string; 
  amount: number; 
  date: string; 
  reason: string; 
  status: 'pending' | 'approved' | 'paid'; 
}

export interface Employee {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier' | 'delivery' | 'picker' | 'camera_agent';
  phone?: string;
  email?: string;
  hireDate?: string;
  status: 'active' | 'inactive';
  isClockedIn?: boolean;
  baseSalary?: number;
  salaryType?: 'monthly' | 'hourly' | 'daily';
  hourlyRate?: number;
  dailyRate?: number;
  idCardRectoUrl?: string;
  idCardVersoUrl?: string;
  contractUrl?: string;
  digitalSignatureUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  employeeId: string;
  employeeName: string;
  clockIn: string;
  clockOut?: string;
  date: string;
  totalHours?: number;
  status?: 'present' | 'absent' | 'late';
}
