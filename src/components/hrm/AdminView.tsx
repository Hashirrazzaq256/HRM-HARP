import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Employee, HRMState, PayrollEntry, OvertimeSettings, MonthlyHourTarget } from '../../types/hrm';
import { Shield, Users, DollarSign, Settings, LogOut, Download, Plus, RotateCcw, Edit, Trash2, UserPlus } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { exportToCSV, resetData } from '../../utils/hrmStorage';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import logo from 'figma:asset/1e8772b931f7aebcf2d319df4988bdd728a2b920.png';

interface AdminViewProps {
  employee: Employee;
  state: HRMState;
  onUpdateState: (updater: (state: HRMState) => HRMState) => void;
  onLogout: () => void;
}

export function AdminView({ employee, state, onUpdateState, onLogout }: AdminViewProps) {
  const handleCreateEmployee = (newEmployee: Omit<Employee, 'id'>) => {
    const id = `emp_${Date.now()}`;
    const employeeWithId: Employee = {
      ...newEmployee,
      id,
    };

    onUpdateState((state) => ({
      ...state,
      employees: [...state.employees, employeeWithId],
      overtimeSettings: [
        ...state.overtimeSettings,
        {
          employeeId: id,
          overtimeMultiplier: newEmployee.monthlyHourTarget === 100 ? 1.25 : 1.0,
        },
      ],
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Employee Created',
          entityType: 'Employee',
          entityId: id,
          changes: `Created employee: ${newEmployee.name}`,
        },
      ],
    }));

    toast.success('Employee created successfully');
  };

  const handleUpdateEmployee = (employeeId: string, updates: Partial<Employee>) => {
    onUpdateState((state) => ({
      ...state,
      employees: state.employees.map((emp) =>
        emp.id === employeeId ? { ...emp, ...updates } : emp
      ),
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Employee Updated',
          entityType: 'Employee',
          entityId: employeeId,
          changes: `Updated fields: ${Object.keys(updates).join(', ')}`,
        },
      ],
    }));

    toast.success('Employee updated successfully');
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const emp = state.employees.find((e) => e.id === employeeId);
    if (!emp) return;

    onUpdateState((state) => ({
      ...state,
      employees: state.employees.filter((e) => e.id !== employeeId),
      timeLogs: state.timeLogs.filter((t) => t.employeeId !== employeeId),
      tasks: state.tasks.filter((t) => t.employeeId !== employeeId),
      leaveRequests: state.leaveRequests.filter((l) => l.employeeId !== employeeId),
      payrollEntries: state.payrollEntries.filter((p) => p.employeeId !== employeeId),
      overtimeSettings: state.overtimeSettings.filter((o) => o.employeeId !== employeeId),
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Employee Deleted',
          entityType: 'Employee',
          entityId: employeeId,
          changes: `Deleted employee: ${emp.name}`,
        },
      ],
    }));

    toast.success('Employee deleted');
  };

  const handleGrantCompLeave = (employeeId: string, days: number) => {
    onUpdateState((state) => ({
      ...state,
      employees: state.employees.map((emp) =>
        emp.id === employeeId
          ? { ...emp, compLeavesEarned: emp.compLeavesEarned + days }
          : emp
      ),
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Comp Leave Granted',
          entityType: 'Employee',
          entityId: employeeId,
          changes: `Granted ${days} comp leave(s)`,
        },
      ],
    }));

    toast.success(`Granted ${days} comp leave(s)`);
  };

  const handleUpdateOvertimeSettings = (employeeId: string, multiplier: number) => {
    onUpdateState((state) => {
      const existingSettings = state.overtimeSettings.find((s) => s.employeeId === employeeId);

      const updatedSettings = existingSettings
        ? state.overtimeSettings.map((s) =>
            s.employeeId === employeeId ? { ...s, overtimeMultiplier: multiplier } : s
          )
        : [...state.overtimeSettings, { employeeId, overtimeMultiplier: multiplier }];

      return {
        ...state,
        overtimeSettings: updatedSettings,
        auditLogs: [
          ...state.auditLogs,
          {
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: employee.id,
            userName: employee.name,
            action: 'Overtime Settings Updated',
            entityType: 'OvertimeSettings',
            entityId: employeeId,
            changes: `Overtime multiplier set to ${multiplier}x`,
          },
        ],
      };
    });

    toast.success('Overtime settings updated');
  };

  const handleProcessPayroll = (month: string) => {
    const monthStart = startOfMonth(new Date(month + '-01'));
    const monthEnd = endOfMonth(monthStart);

    const newPayrollEntries: PayrollEntry[] = [];

    state.employees.forEach((emp) => {
      const monthLogs = state.timeLogs.filter(
        (log) =>
          log.employeeId === emp.id &&
          new Date(log.date) >= monthStart &&
          new Date(log.date) <= monthEnd &&
          log.checkOut
      );

      const totalHours = monthLogs.reduce((sum, log) => sum + log.totalHours, 0);
      const target = emp.monthlyHourTarget;
      
      // Check comp leaves available
      const compLeavesAvailable = emp.compLeavesEarned - emp.compLeavesUsed;
      
      // Overtime only starts after using comp leaves
      let regularHours = Math.min(totalHours, target);
      let overtimeHours = 0;
      
      if (totalHours > target && compLeavesAvailable <= 0) {
        // Only count overtime if no comp leaves available
        overtimeHours = totalHours - target;
      }

      const overtimeSettings = state.overtimeSettings.find((s) => s.employeeId === emp.id);
      const overtimeMultiplier = overtimeSettings?.overtimeMultiplier || 1.0;

      const regularPay = regularHours * emp.hourlyRate;
      const overtimePay = overtimeHours * emp.hourlyRate * overtimeMultiplier;
      const totalPay = regularPay + overtimePay;

      const existing = state.payrollEntries.find(
        (p) => p.employeeId === emp.id && p.month === month
      );

      if (!existing) {
        newPayrollEntries.push({
          id: `payroll_${Date.now()}_${emp.id}`,
          employeeId: emp.id,
          month,
          regularHours,
          overtimeHours,
          regularPay,
          overtimePay,
          totalPay,
          status: 'pending',
          processedBy: employee.id,
          processedAt: new Date().toISOString(),
        });
      }
    });

    if (newPayrollEntries.length === 0) {
      toast.error('Payroll already processed for this month');
      return;
    }

    onUpdateState((state) => ({
      ...state,
      payrollEntries: [...state.payrollEntries, ...newPayrollEntries],
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Payroll Processed',
          entityType: 'Payroll',
          entityId: month,
          changes: `Processed payroll for ${newPayrollEntries.length} employees`,
        },
      ],
    }));

    toast.success(`Payroll processed for ${newPayrollEntries.length} employees`);
  };

  const handleUpdatePayroll = (payrollId: string, updates: Partial<PayrollEntry>) => {
    onUpdateState((state) => ({
      ...state,
      payrollEntries: state.payrollEntries.map((entry) =>
        entry.id === payrollId ? { ...entry, ...updates } : entry
      ),
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Payroll Updated',
          entityType: 'Payroll',
          entityId: payrollId,
          changes: `Updated: ${Object.keys(updates).join(', ')}`,
        },
      ],
    }));

    toast.success('Payroll updated');
  };

  const handleResetData = async () => {
    try {
      const newData = await resetData();
      onUpdateState(() => newData);
      toast.success('System data reset to defaults');
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Failed to reset system data');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="border-purple-500/30 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={logo} alt="Harp HRM" className="h-12 w-12 rounded-lg" />
                <div>
                  <CardTitle className="text-white">Harp HRM - Admin Dashboard</CardTitle>
                  <CardDescription className="text-gray-300">
                    {employee.name} • Full System Access
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-900 border-purple-500/30 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset System Data?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This will delete all data and restore default employees. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-800 border-purple-500/30 text-white hover:bg-slate-700">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetData}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Reset All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  variant="outline"
                  onClick={onLogout}
                  className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-purple-500/30 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Total Employees</CardDescription>
              <CardTitle className="text-3xl text-white">{state.employees.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-purple-500/30 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Pending Tasks</CardDescription>
              <CardTitle className="text-3xl text-white">
                {state.tasks.filter((t) => t.status === 'pending').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-purple-500/30 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Leave Requests</CardDescription>
              <CardTitle className="text-3xl text-white">
                {state.leaveRequests.filter((r) => r.status === 'pending').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-purple-500/30 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Payroll Entries</CardDescription>
              <CardTitle className="text-3xl text-white">{state.payrollEntries.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-purple-500/30">
            <TabsTrigger value="employees" className="data-[state=active]:bg-purple-600">
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="payroll" className="data-[state=active]:bg-purple-600">
              <DollarSign className="h-4 w-4 mr-2" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-purple-600">
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeeManagementView
              employees={state.employees}
              onCreateEmployee={handleCreateEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onGrantCompLeave={handleGrantCompLeave}
            />
          </TabsContent>

          <TabsContent value="payroll">
            <PayrollManagementView
              employees={state.employees}
              payrollEntries={state.payrollEntries}
              timeLogs={state.timeLogs}
              overtimeSettings={state.overtimeSettings}
              onProcessPayroll={handleProcessPayroll}
              onUpdatePayroll={handleUpdatePayroll}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsView
              employees={state.employees}
              overtimeSettings={state.overtimeSettings}
              onUpdateOvertimeSettings={handleUpdateOvertimeSettings}
              onUpdateEmployee={handleUpdateEmployee}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrailView auditLogs={state.auditLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Employee Management with Create/Edit/Delete
function EmployeeManagementView({
  employees,
  onCreateEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onGrantCompLeave,
}: {
  employees: Employee[];
  onCreateEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (employeeId: string, updates: Partial<Employee>) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onGrantCompLeave: (employeeId: string, days: number) => void;
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null);

  const handleExport = () => {
    const exportData = employees.map((emp) => ({
      Name: emp.name,
      Email: emp.email,
      Phone: emp.phone,
      Position: emp.position,
      Department: emp.department,
      'Start Date': emp.employmentStartDate,
      'Monthly Target': emp.monthlyHourTarget,
      'Hourly Rate (PKR)': emp.hourlyRate,
      Role: emp.role,
      'Comp Leaves Earned': emp.compLeavesEarned,
      'Comp Leaves Used': emp.compLeavesUsed,
    }));
    exportToCSV(exportData, `employees_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Employee data exported');
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-white">Employee Management</CardTitle>
            <CardDescription className="text-gray-400">
              Create, edit, and manage all employees
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id} className="border-purple-500/20 bg-slate-800/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={emp.profilePicture} alt={emp.name} />
                    <AvatarFallback className="bg-purple-600 text-white">
                      {emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white truncate">{emp.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{emp.position}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={
                          emp.role === 'admin'
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : emp.role === 'manager'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            : 'bg-green-500/20 text-green-400 border-green-500/50'
                        }
                      >
                        {emp.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Department:</span>
                    <span>{emp.department}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Target Hours:</span>
                    <span>{emp.monthlyHourTarget} hrs</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Rate:</span>
                    <span>PKR {emp.hourlyRate.toLocaleString()}/hr</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Comp Leaves:</span>
                    <span>{emp.compLeavesEarned - emp.compLeavesUsed} / {emp.compLeavesEarned}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsEditDialogOpen(true);
                    }}
                    className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirm(emp)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      {/* Create Employee Dialog */}
      <EmployeeFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={(employee) => {
          onCreateEmployee(employee);
          setIsCreateDialogOpen(false);
        }}
        title="Create New Employee"
        employees={employees}
      />

      {/* Edit Employee Dialog */}
      {selectedEmployee && (
        <EmployeeFormDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedEmployee(null);
          }}
          onSave={(updates) => {
            onUpdateEmployee(selectedEmployee.id, updates);
            setIsEditDialogOpen(false);
            setSelectedEmployee(null);
          }}
          title="Edit Employee"
          employee={selectedEmployee}
          employees={employees}
          onGrantCompLeave={(days) => onGrantCompLeave(selectedEmployee.id, days)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-slate-900 border-purple-500/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete {deleteConfirm?.name}? This will also delete all their time logs, tasks, leave requests, and payroll data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-purple-500/30 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  onDeleteEmployee(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Employee Form Dialog (Create/Edit)
function EmployeeFormDialog({
  isOpen,
  onClose,
  onSave,
  title,
  employee,
  employees,
  onGrantCompLeave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: any) => void;
  title: string;
  employee?: Employee;
  employees: Employee[];
  onGrantCompLeave?: (days: number) => void;
}) {
  const [formData, setFormData] = useState<Partial<Employee>>(
    employee || {
      name: '',
      email: '',
      password: 'employee123',
      phone: '',
      position: '',
      department: '',
      employmentStartDate: format(new Date(), 'yyyy-MM-dd'),
      managerId: null,
      monthlyHourTarget: 80,
      hourlyRate: 5000,
      role: 'employee',
      compLeavesEarned: 0,
      compLeavesUsed: 0,
      profilePicture: '',
      address: '',
      dateOfBirth: '',
      emergencyContact: '',
    }
  );

  const [leaveDays, setLeaveDays] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    onSave(formData);
  };

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const managers = employees.filter((e) => e.role === 'admin' || e.role === 'manager');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-purple-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {employee ? 'Update employee information' : 'Add a new employee to the system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Profile Picture */}
          <div className="space-y-2">
            <Label>Profile Picture URL (Optional)</Label>
            <Input
              type="text"
              placeholder="https://example.com/photo.jpg"
              value={formData.profilePicture || ''}
              onChange={(e) => handleChange('profilePicture', e.target.value)}
              className="bg-slate-800 border-purple-500/30 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                type="text"
                placeholder="John Doe"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john@harphrm.com"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Password */}
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="text"
                placeholder="Enter password"
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="+92-300-1234567"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Position */}
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                type="text"
                placeholder="Software Engineer"
                value={formData.position || ''}
                onChange={(e) => handleChange('position', e.target.value)}
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                type="text"
                placeholder="Engineering"
                value={formData.department || ''}
                onChange={(e) => handleChange('department', e.target.value)}
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Employment Start Date */}
            <div className="space-y-2">
              <Label>Employment Start Date</Label>
              <Input
                type="date"
                value={formData.employmentStartDate || ''}
                onChange={(e) => handleChange('employmentStartDate', e.target.value)}
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              type="text"
              placeholder="City, Pakistan"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="bg-slate-800 border-purple-500/30 text-white"
            />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-2">
            <Label>Emergency Contact</Label>
            <Input
              type="tel"
              placeholder="+92-300-9876543"
              value={formData.emergencyContact || ''}
              onChange={(e) => handleChange('emergencyContact', e.target.value)}
              className="bg-slate-800 border-purple-500/30 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role || 'employee'}
                onValueChange={(value) => handleChange('role', value)}
              >
                <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-500/30">
                  <SelectItem value="employee" className="text-white">Employee</SelectItem>
                  <SelectItem value="manager" className="text-white">Manager</SelectItem>
                  <SelectItem value="admin" className="text-white">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Manager */}
            <div className="space-y-2">
              <Label>Reports To</Label>
              <Select
                value={formData.managerId || 'none'}
                onValueChange={(value) => handleChange('managerId', value === 'none' ? null : value)}
              >
                <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-500/30">
                  <SelectItem value="none" className="text-white">No Manager</SelectItem>
                  {managers.map((mgr) => (
                    <SelectItem key={mgr.id} value={mgr.id} className="text-white">
                      {mgr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Monthly Hour Target */}
            <div className="space-y-2">
              <Label>Monthly Hour Target</Label>
              <Select
                value={formData.monthlyHourTarget?.toString() || '80'}
                onValueChange={(value) => handleChange('monthlyHourTarget', parseInt(value) as MonthlyHourTarget)}
              >
                <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-purple-500/30">
                  <SelectItem value="40" className="text-white">40 hours</SelectItem>
                  <SelectItem value="60" className="text-white">60 hours</SelectItem>
                  <SelectItem value="80" className="text-white">80 hours</SelectItem>
                  <SelectItem value="100" className="text-white">100 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hourly Rate */}
            <div className="space-y-2">
              <Label>Hourly Rate (PKR)</Label>
              <Input
                type="number"
                placeholder="5000"
                value={formData.hourlyRate || ''}
                onChange={(e) => handleChange('hourlyRate', parseFloat(e.target.value) || 0)}
                className="bg-slate-800 border-purple-500/30 text-white"
              />
            </div>
          </div>

          {/* Grant Comp Leave (Edit Only) */}
          {employee && onGrantCompLeave && (
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Label className="mb-2 block">Grant Complementary Leave</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(e.target.value)}
                  className="bg-slate-800 border-purple-500/30 text-white"
                  placeholder="Days"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (leaveDays && parseInt(leaveDays) > 0) {
                      onGrantCompLeave(parseInt(leaveDays));
                      setLeaveDays('1');
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Grant
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Current: {formData.compLeavesEarned || 0} earned, {formData.compLeavesUsed || 0} used
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {employee ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Payroll Management View
function PayrollManagementView({
  employees,
  payrollEntries,
  timeLogs,
  overtimeSettings,
  onProcessPayroll,
  onUpdatePayroll,
}: {
  employees: Employee[];
  payrollEntries: PayrollEntry[];
  timeLogs: any[];
  overtimeSettings: OvertimeSettings[];
  onProcessPayroll: (month: string) => void;
  onUpdatePayroll: (payrollId: string, updates: Partial<PayrollEntry>) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollEntry | null>(null);
  const [editValues, setEditValues] = useState<Partial<PayrollEntry>>({});

  const monthPayroll = payrollEntries.filter((p) => p.month === selectedMonth);

  const handleExport = () => {
    const exportData = monthPayroll.map((entry) => {
      const emp = employees.find((e) => e.id === entry.employeeId);
      return {
        Employee: emp?.name || 'Unknown',
        Month: entry.month,
        'Regular Hours': entry.regularHours,
        'Overtime Hours': entry.overtimeHours,
        'Hourly Rate (PKR)': emp?.hourlyRate || 0,
        'Regular Pay (PKR)': entry.regularPay,
        'Overtime Pay (PKR)': entry.overtimePay,
        'Total Pay (PKR)': entry.totalPay,
        Status: entry.status,
      };
    });
    exportToCSV(exportData, `payroll_${selectedMonth}.csv`);
    toast.success('Payroll exported');
  };

  const handleUpdatePayroll = () => {
    if (!selectedPayroll) return;

    const emp = employees.find((e) => e.id === selectedPayroll.employeeId);
    if (!emp) return;

    const regularHours = editValues.regularHours ?? selectedPayroll.regularHours;
    const overtimeHours = editValues.overtimeHours ?? selectedPayroll.overtimeHours;
    
    const settings = overtimeSettings.find((s) => s.employeeId === emp.id);
    const multiplier = settings?.overtimeMultiplier || 1.0;

    const regularPay = regularHours * emp.hourlyRate;
    const overtimePay = overtimeHours * emp.hourlyRate * multiplier;
    const totalPay = regularPay + overtimePay;

    onUpdatePayroll(selectedPayroll.id, {
      ...editValues,
      regularPay,
      overtimePay,
      totalPay,
    });

    setSelectedPayroll(null);
    setEditValues({});
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-white">Payroll Management</CardTitle>
            <CardDescription className="text-gray-400">
              Process and manage employee payroll (PKR)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-800 border-purple-500/30 text-white w-40"
            />
            <Button
              onClick={() => onProcessPayroll(selectedMonth)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Process
            </Button>
            {monthPayroll.length > 0 && (
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {monthPayroll.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payroll for this month</p>
            <p className="text-sm mt-1">Click "Process" to generate payroll</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/20 hover:bg-purple-500/5">
                  <TableHead className="text-gray-300">Employee</TableHead>
                  <TableHead className="text-gray-300">Regular Hrs</TableHead>
                  <TableHead className="text-gray-300">Overtime Hrs</TableHead>
                  <TableHead className="text-gray-300">Regular Pay</TableHead>
                  <TableHead className="text-gray-300">Overtime Pay</TableHead>
                  <TableHead className="text-gray-300">Total Pay</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthPayroll.map((entry) => {
                  const emp = employees.find((e) => e.id === entry.employeeId);
                  return (
                    <TableRow key={entry.id} className="border-purple-500/20 hover:bg-purple-500/5">
                      <TableCell className="text-white">{emp?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-gray-300">{entry.regularHours.toFixed(2)}</TableCell>
                      <TableCell className="text-gray-300">{entry.overtimeHours.toFixed(2)}</TableCell>
                      <TableCell className="text-gray-300">PKR {entry.regularPay.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-300">PKR {entry.overtimePay.toLocaleString()}</TableCell>
                      <TableCell className="text-green-400">PKR {entry.totalPay.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            entry.status === 'paid'
                              ? 'bg-green-500/20 text-green-400 border-green-500/50'
                              : entry.status === 'approved'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayroll(entry);
                            setEditValues({});
                          }}
                          className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={selectedPayroll !== null} onOpenChange={() => setSelectedPayroll(null)}>
          <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
            <DialogHeader>
              <DialogTitle>Edit Payroll</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedPayroll &&
                  employees.find((e) => e.id === selectedPayroll.employeeId)?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedPayroll && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Regular Hours</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.regularHours ?? selectedPayroll.regularHours}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          regularHours: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overtime Hours</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.overtimeHours ?? selectedPayroll.overtimeHours}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          overtimeHours: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editValues.status ?? selectedPayroll.status}
                    onValueChange={(value) =>
                      setEditValues({
                        ...editValues,
                        status: value as PayrollEntry['status'],
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-purple-500/30">
                      <SelectItem value="pending" className="text-white">
                        Pending
                      </SelectItem>
                      <SelectItem value="approved" className="text-white">
                        Approved
                      </SelectItem>
                      <SelectItem value="paid" className="text-white">
                        Paid
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editValues.notes ?? selectedPayroll.notes ?? ''}
                    onChange={(e) =>
                      setEditValues({ ...editValues, notes: e.target.value })
                    }
                    className="bg-slate-800 border-purple-500/30 text-white"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleUpdatePayroll}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Update Payroll
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Settings View
function SettingsView({
  employees,
  overtimeSettings,
  onUpdateOvertimeSettings,
  onUpdateEmployee,
}: {
  employees: Employee[];
  overtimeSettings: OvertimeSettings[];
  onUpdateOvertimeSettings: (employeeId: string, multiplier: number) => void;
  onUpdateEmployee: (employeeId: string, updates: Partial<Employee>) => void;
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editValues, setEditValues] = useState<Partial<Employee>>({});

  const getOvertimeMultiplier = (employeeId: string) => {
    return overtimeSettings.find((s) => s.employeeId === employeeId)?.overtimeMultiplier || 1.0;
  };

  const handleUpdate = () => {
    if (!selectedEmployee) return;

    if (editValues.hourlyRate || editValues.monthlyHourTarget) {
      onUpdateEmployee(selectedEmployee.id, editValues);
    }

    setSelectedEmployee(null);
    setEditValues({});
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">System Settings</CardTitle>
        <CardDescription className="text-gray-400">
          Manage employee rates and overtime settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-purple-500/20 hover:bg-purple-500/5">
                <TableHead className="text-gray-300">Employee</TableHead>
                <TableHead className="text-gray-300">Hourly Rate</TableHead>
                <TableHead className="text-gray-300">Monthly Target</TableHead>
                <TableHead className="text-gray-300">Overtime Multiplier</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id} className="border-purple-500/20 hover:bg-purple-500/5">
                  <TableCell className="text-white">{emp.name}</TableCell>
                  <TableCell className="text-gray-300">PKR {emp.hourlyRate.toLocaleString()}/hr</TableCell>
                  <TableCell className="text-gray-300">{emp.monthlyHourTarget} hrs</TableCell>
                  <TableCell className="text-gray-300">
                    {getOvertimeMultiplier(emp.id)}x
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setEditValues({
                          hourlyRate: emp.hourlyRate,
                          monthlyHourTarget: emp.monthlyHourTarget,
                        });
                      }}
                      className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={selectedEmployee !== null} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
            <DialogHeader>
              <DialogTitle>Edit Employee Settings</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedEmployee?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Hourly Rate (PKR)</Label>
                  <Input
                    type="number"
                    step="100"
                    value={editValues.hourlyRate ?? selectedEmployee.hourlyRate}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        hourlyRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-slate-800 border-purple-500/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Hour Target</Label>
                  <Select
                    value={(editValues.monthlyHourTarget ?? selectedEmployee.monthlyHourTarget).toString()}
                    onValueChange={(value) =>
                      setEditValues({
                        ...editValues,
                        monthlyHourTarget: parseInt(value) as MonthlyHourTarget,
                      })
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-purple-500/30">
                      <SelectItem value="40" className="text-white">
                        40 hours
                      </SelectItem>
                      <SelectItem value="60" className="text-white">
                        60 hours
                      </SelectItem>
                      <SelectItem value="80" className="text-white">
                        80 hours
                      </SelectItem>
                      <SelectItem value="100" className="text-white">
                        100 hours
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Overtime Multiplier</Label>
                  <Select
                    value={getOvertimeMultiplier(selectedEmployee.id).toString()}
                    onValueChange={(value) =>
                      onUpdateOvertimeSettings(selectedEmployee.id, parseFloat(value))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-purple-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-purple-500/30">
                      <SelectItem value="1.0" className="text-white">
                        1.0x (Standard)
                      </SelectItem>
                      <SelectItem value="1.25" className="text-white">
                        1.25x (Premium)
                      </SelectItem>
                      <SelectItem value="1.5" className="text-white">
                        1.5x (Higher)
                      </SelectItem>
                      <SelectItem value="2.0" className="text-white">
                        2.0x (Double)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-2">
                    Note: Overtime only applies after comp leaves are exhausted
                  </p>
                </div>
                <Button
                  onClick={handleUpdate}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Update Settings
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Audit Trail View
function AuditTrailView({ auditLogs }: { auditLogs: any[] }) {
  const handleExport = () => {
    const exportData = auditLogs.map((log) => ({
      Timestamp: format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      User: log.userName,
      Action: log.action,
      Entity: log.entityType,
      Changes: log.changes,
    }));
    exportToCSV(exportData, `audit_trail_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Audit trail exported');
  };

  const sortedLogs = [...auditLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Audit Trail</CardTitle>
            <CardDescription className="text-gray-400">
              Complete system activity log
            </CardDescription>
          </div>
          {auditLogs.length > 0 && (
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No audit logs yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {sortedLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-800/50 rounded border border-purple-500/20 text-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white">{log.userName}</span>
                      <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {log.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/50">
                        {log.entityType}
                      </Badge>
                    </div>
                    <p className="text-gray-400">{log.changes}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
