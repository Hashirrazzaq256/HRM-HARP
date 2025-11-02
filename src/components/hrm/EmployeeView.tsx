import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { TimeTracking } from './TimeTracking';
import { TaskLogger } from './TaskLogger';
import { Employee, HRMState, TimeLog, Task, LeaveRequest, PayrollEntry } from '../../types/hrm';
import { User, Calendar, DollarSign, LogOut, AlertCircle, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import { exportToCSV } from '../../utils/hrmStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface EmployeeViewProps {
  employee: Employee;
  state: HRMState;
  onUpdateState: (updater: (state: HRMState) => HRMState) => void;
  onLogout: () => void;
}

export function EmployeeView({ employee, state, onUpdateState, onLogout }: EmployeeViewProps) {
  const [currentDate] = useState(new Date());
  const today = format(currentDate, 'yyyy-MM-dd');
  const currentMonth = format(currentDate, 'yyyy-MM');

  const todayTimeLog = state.timeLogs.find(
    (log) => log.employeeId === employee.id && log.date === today
  );

  const myTasks = state.tasks.filter(
    (task) => task.employeeId === employee.id && task.date === today
  );

  const myLeaveRequests = state.leaveRequests.filter(
    (req) => req.employeeId === employee.id
  ).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  const myPayrollEntries = state.payrollEntries.filter(
    (entry) => entry.employeeId === employee.id
  ).sort((a, b) => b.month.localeCompare(a.month));

  const myTimeLogs = state.timeLogs.filter(
    (log) => log.employeeId === employee.id
  ).sort((a, b) => b.date.localeCompare(a.date));

  const handleCheckIn = () => {
    if (todayTimeLog) {
      toast.error('Already checked in today');
      return;
    }

    onUpdateState((state) => {
      const newLog: TimeLog = {
        id: `log_${Date.now()}`,
        employeeId: employee.id,
        date: today,
        checkIn: new Date().toISOString(),
        checkOut: null,
        breaks: [],
        totalHours: 0,
        status: 'checked-in',
      };

      return {
        ...state,
        timeLogs: [...state.timeLogs, newLog],
        auditLogs: [
          ...state.auditLogs,
          {
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: employee.id,
            userName: employee.name,
            action: 'Check In',
            entityType: 'TimeLog',
            entityId: newLog.id,
            changes: 'Employee checked in',
          },
        ],
      };
    });

    toast.success('Checked in successfully');
  };

  const handleCheckOut = () => {
    if (!todayTimeLog || todayTimeLog.checkOut) {
      toast.error('Invalid check-out attempt');
      return;
    }

    // Check if tasks are logged for today
    if (myTasks.length === 0) {
      toast.error('Please add your tasks before checking out');
      return;
    }

    onUpdateState((state) => {
      const checkOutTime = new Date().toISOString();
      const checkInTime = new Date(todayTimeLog.checkIn!);
      const checkOutTimeObj = new Date(checkOutTime);

      let totalMs = checkOutTimeObj.getTime() - checkInTime.getTime();

      // Subtract break time
      todayTimeLog.breaks.forEach((breakLog) => {
        const breakInTime = new Date(breakLog.breakIn);
        const breakOutTime = breakLog.breakOut ? new Date(breakLog.breakOut) : checkOutTimeObj;
        totalMs -= breakOutTime.getTime() - breakInTime.getTime();
      });

      const totalHours = Math.max(0, totalMs / (1000 * 60 * 60));

      const updatedTimeLogs = state.timeLogs.map((log) =>
        log.id === todayTimeLog.id
          ? { ...log, checkOut: checkOutTime, totalHours, status: 'checked-out' as const }
          : log
      );

      return {
        ...state,
        timeLogs: updatedTimeLogs,
        auditLogs: [
          ...state.auditLogs,
          {
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: employee.id,
            userName: employee.name,
            action: 'Check Out',
            entityType: 'TimeLog',
            entityId: todayTimeLog.id,
            changes: `Employee checked out. Total hours: ${totalHours.toFixed(2)}`,
          },
        ],
      };
    });

    toast.success('Checked out successfully');
  };

  const handleBreakIn = () => {
    if (!todayTimeLog || todayTimeLog.checkOut) {
      toast.error('Invalid break attempt');
      return;
    }

    const onBreak = todayTimeLog.breaks.some((b) => b.breakIn && !b.breakOut);
    if (onBreak) {
      toast.error('Already on break');
      return;
    }

    onUpdateState((state) => {
      const updatedTimeLogs = state.timeLogs.map((log) =>
        log.id === todayTimeLog.id
          ? {
              ...log,
              breaks: [...log.breaks, { breakIn: new Date().toISOString(), breakOut: null }],
            }
          : log
      );

      return {
        ...state,
        timeLogs: updatedTimeLogs,
        auditLogs: [
          ...state.auditLogs,
          {
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: employee.id,
            userName: employee.name,
            action: 'Break Start',
            entityType: 'TimeLog',
            entityId: todayTimeLog.id,
            changes: 'Employee started break',
          },
        ],
      };
    });

    toast.success('Break started');
  };

  const handleBreakOut = () => {
    if (!todayTimeLog) return;

    const currentBreak = todayTimeLog.breaks.find((b) => !b.breakOut);
    if (!currentBreak) {
      toast.error('No active break');
      return;
    }

    onUpdateState((state) => {
      const updatedTimeLogs = state.timeLogs.map((log) =>
        log.id === todayTimeLog.id
          ? {
              ...log,
              breaks: log.breaks.map((b) =>
                b === currentBreak ? { ...b, breakOut: new Date().toISOString() } : b
              ),
            }
          : log
      );

      return {
        ...state,
        timeLogs: updatedTimeLogs,
        auditLogs: [
          ...state.auditLogs,
          {
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: employee.id,
            userName: employee.name,
            action: 'Break End',
            entityType: 'TimeLog',
            entityId: todayTimeLog.id,
            changes: 'Employee ended break',
          },
        ],
      };
    });

    toast.success('Break ended');
  };

  const handleAddTask = (description: string, hours: number) => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      employeeId: employee.id,
      date: today,
      description,
      hoursSpent: hours,
      status: 'pending',
    };

    onUpdateState((state) => ({
      ...state,
      tasks: [...state.tasks, newTask],
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Task Created',
          entityType: 'Task',
          entityId: newTask.id,
          changes: `Task added: ${description} (${hours} hrs)`,
        },
      ],
    }));

    toast.success('Task added successfully');
  };

  const handleDeleteTask = (taskId: string) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    onUpdateState((state) => ({
      ...state,
      tasks: state.tasks.filter((t) => t.id !== taskId),
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Task Deleted',
          entityType: 'Task',
          entityId: taskId,
          changes: `Task deleted: ${task.description}`,
        },
      ],
    }));

    toast.success('Task deleted');
  };

  const handleRequestLeave = (startDate: string, endDate: string, reason: string) => {
    const newRequest: LeaveRequest = {
      id: `leave_${Date.now()}`,
      employeeId: employee.id,
      startDate,
      endDate,
      reason,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    onUpdateState((state) => ({
      ...state,
      leaveRequests: [...state.leaveRequests, newRequest],
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Leave Request Created',
          entityType: 'LeaveRequest',
          entityId: newRequest.id,
          changes: `Leave requested: ${startDate} to ${endDate}`,
        },
      ],
    }));

    toast.success('Leave request submitted');
  };

  const canCheckOut = todayTimeLog?.checkIn && !todayTimeLog?.checkOut;
  const isCheckedIn = todayTimeLog?.checkIn && !todayTimeLog?.checkOut;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="border-purple-500/30 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-full">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">{employee.name}</CardTitle>
                  <CardDescription className="text-gray-300">
                    {employee.position} • {employee.department}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={onLogout}
                className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Alert for task logging */}
        {isCheckedIn && myTasks.length === 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-400">
                <AlertCircle className="h-5 w-5" />
                <p>Don't forget to log your tasks before checking out!</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="today" className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-purple-500/30">
            <TabsTrigger value="today" className="data-[state=active]:bg-purple-600">
              Today
            </TabsTrigger>
            <TabsTrigger value="leave" className="data-[state=active]:bg-purple-600">
              Leave
            </TabsTrigger>
            <TabsTrigger value="payroll" className="data-[state=active]:bg-purple-600">
              Payroll
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              History
            </TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <TimeTracking
                employee={employee}
                timeLog={todayTimeLog || null}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onBreakIn={handleBreakIn}
                onBreakOut={handleBreakOut}
              />
              <TaskLogger
                tasks={myTasks}
                date={today}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                canEdit={true}
              />
            </div>
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave" className="space-y-4">
            <LeaveManagementEmployee
              employee={employee}
              leaveRequests={myLeaveRequests}
              onRequestLeave={handleRequestLeave}
            />
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <PayrollEmployeeView employee={employee} payrollEntries={myPayrollEntries} />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <TimeLogsHistory timeLogs={myTimeLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Sub-components

function LeaveManagementEmployee({
  employee,
  leaveRequests,
  onRequestLeave,
}: {
  employee: Employee;
  leaveRequests: LeaveRequest[];
  onRequestLeave: (startDate: string, endDate: string, reason: string) => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (startDate && endDate && reason.trim()) {
      onRequestLeave(startDate, endDate, reason.trim());
      setStartDate('');
      setEndDate('');
      setReason('');
      setIsDialogOpen(false);
    }
  };

  const availableLeaves = employee.compLeavesEarned - employee.compLeavesUsed;

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-purple-400" />
              Leave Management
            </CardTitle>
            <CardDescription className="text-gray-400">
              Comp Leaves Available: {availableLeaves} days
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={availableLeaves <= 0}
              >
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
              <DialogHeader>
                <DialogTitle>Request Comp Leave</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Available leaves: {availableLeaves} days
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Reason for leave..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-slate-800 border-purple-500/30 text-white"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No leave requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaveRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white">
                        {format(new Date(request.startDate), 'MMM dd, yyyy')} -{' '}
                        {format(new Date(request.endDate), 'MMM dd, yyyy')}
                      </span>
                      <Badge
                        variant={
                          request.status === 'approved'
                            ? 'default'
                            : request.status === 'rejected'
                            ? 'destructive'
                            : 'outline'
                        }
                        className={
                          request.status === 'approved'
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : request.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{request.reason}</p>
                    {request.reviewComment && (
                      <p className="text-sm text-blue-400 mt-2">
                        Manager: {request.reviewComment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollEmployeeView({
  employee,
  payrollEntries,
}: {
  employee: Employee;
  payrollEntries: PayrollEntry[];
}) {
  const handleExport = () => {
    const exportData = payrollEntries.map((entry) => ({
      Month: entry.month,
      'Regular Hours': entry.regularHours,
      'Overtime Hours': entry.overtimeHours,
      'Regular Pay (PKR)': entry.regularPay.toLocaleString(),
      'Overtime Pay (PKR)': entry.overtimePay.toLocaleString(),
      'Total Pay (PKR)': entry.totalPay.toLocaleString(),
      Status: entry.status,
    }));
    exportToCSV(exportData, `payroll_${employee.name.replace(/\s+/g, '_')}.csv`);
    toast.success('Payroll data exported');
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-purple-400" />
              Payroll History
            </CardTitle>
            <CardDescription className="text-gray-400">
              Hourly Rate: PKR {employee.hourlyRate.toLocaleString()}/hr
            </CardDescription>
          </div>
          {payrollEntries.length > 0 && (
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
        {payrollEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payroll records yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-purple-500/20 hover:bg-purple-500/5">
                <TableHead className="text-gray-300">Month</TableHead>
                <TableHead className="text-gray-300">Regular Hrs</TableHead>
                <TableHead className="text-gray-300">Overtime Hrs</TableHead>
                <TableHead className="text-gray-300">Total Pay</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollEntries.map((entry) => (
                <TableRow key={entry.id} className="border-purple-500/20 hover:bg-purple-500/5">
                  <TableCell className="text-white">{entry.month}</TableCell>
                  <TableCell className="text-gray-300">{entry.regularHours.toFixed(2)}</TableCell>
                  <TableCell className="text-gray-300">{entry.overtimeHours.toFixed(2)}</TableCell>
                  <TableCell className="text-green-400">PKR {entry.totalPay.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        entry.status === 'paid'
                          ? 'bg-green-500/20 text-green-400 border-green-500/50'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                      }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TimeLogsHistory({ timeLogs }: { timeLogs: TimeLog[] }) {
  const handleExport = () => {
    const exportData = timeLogs.map((log) => ({
      Date: log.date,
      'Check In': log.checkIn ? format(new Date(log.checkIn), 'hh:mm a') : '',
      'Check Out': log.checkOut ? format(new Date(log.checkOut), 'hh:mm a') : '',
      'Total Hours': log.totalHours.toFixed(2),
      Breaks: log.breaks.length,
      Status: log.status,
    }));
    exportToCSV(exportData, `time_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Time logs exported');
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Time Logs History</CardTitle>
          {timeLogs.length > 0 && (
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
        {timeLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No time logs yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-purple-500/20 hover:bg-purple-500/5">
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300">Check In</TableHead>
                <TableHead className="text-gray-300">Check Out</TableHead>
                <TableHead className="text-gray-300">Total Hours</TableHead>
                <TableHead className="text-gray-300">Breaks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeLogs.map((log) => (
                <TableRow key={log.id} className="border-purple-500/20 hover:bg-purple-500/5">
                  <TableCell className="text-white">
                    {format(new Date(log.date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {log.checkIn ? format(new Date(log.checkIn), 'hh:mm a') : '-'}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {log.checkOut ? format(new Date(log.checkOut), 'hh:mm a') : '-'}
                  </TableCell>
                  <TableCell className="text-gray-300">{log.totalHours.toFixed(2)}</TableCell>
                  <TableCell className="text-gray-300">{log.breaks.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
