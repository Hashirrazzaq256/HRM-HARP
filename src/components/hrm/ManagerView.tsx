import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Employee, HRMState, Task, LeaveRequest } from '../../types/hrm';
import { Users, ListTodo, Calendar, LogOut, Shield, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner@2.0.3';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { exportToCSV } from '../../utils/hrmStorage';

interface ManagerViewProps {
  employee: Employee;
  state: HRMState;
  onUpdateState: (updater: (state: HRMState) => HRMState) => void;
  onLogout: () => void;
}

export function ManagerView({ employee, state, onUpdateState, onLogout }: ManagerViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [leaveComment, setLeaveComment] = useState('');

  // Get team members
  const teamMembers = state.employees.filter((emp) => emp.managerId === employee.id);

  // Get pending tasks for team (last 7 days for review)
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const teamTasks = state.tasks.filter(
    (task) =>
      teamMembers.some((tm) => tm.id === task.employeeId) &&
      new Date(task.date) >= threeDaysAgo
  );

  const pendingTasks = teamTasks.filter((t) => t.status === 'pending');

  // Get pending leave requests
  const teamLeaveRequests = state.leaveRequests.filter(
    (req) => teamMembers.some((tm) => tm.id === req.employeeId)
  );
  const pendingLeaveRequests = teamLeaveRequests.filter((req) => req.status === 'pending');

  // Get audit logs for team
  const teamAuditLogs = state.auditLogs
    .filter((log) => teamMembers.some((tm) => tm.id === log.userId))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  const handleApproveTask = (taskId: string, withComment?: string) => {
    onUpdateState((state) => ({
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'approved' as const,
              managerComment: withComment,
              reviewedBy: employee.id,
              reviewedAt: new Date().toISOString(),
            }
          : task
      ),
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Task Approved',
          entityType: 'Task',
          entityId: taskId,
          changes: withComment ? `Approved with comment: ${withComment}` : 'Task approved',
        },
      ],
    }));

    setSelectedTask(null);
    setComment('');
    toast.success('Task approved');
  };

  const handleCommentTask = (taskId: string, commentText: string) => {
    if (!commentText.trim()) return;

    onUpdateState((state) => ({
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'commented' as const,
              managerComment: commentText,
              reviewedBy: employee.id,
              reviewedAt: new Date().toISOString(),
            }
          : task
      ),
      auditLogs: [
        ...state.auditLogs,
        {
          id: `audit_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: employee.id,
          userName: employee.name,
          action: 'Task Reviewed',
          entityType: 'Task',
          entityId: taskId,
          changes: `Comment added: ${commentText}`,
        },
      ],
    }));

    setSelectedTask(null);
    setComment('');
    toast.success('Comment added');
  };

  const handleApproveLeave = (leaveId: string, approved: boolean, comment?: string) => {
    const leave = state.leaveRequests.find((l) => l.id === leaveId);
    if (!leave) return;

    const emp = state.employees.find((e) => e.id === leave.employeeId);
    if (!emp) return;

    onUpdateState((state) => {
      const updatedLeaveRequests = state.leaveRequests.map((req) =>
        req.id === leaveId
          ? {
              ...req,
              status: (approved ? 'approved' : 'rejected') as const,
              reviewedBy: employee.id,
              reviewedAt: new Date().toISOString(),
              reviewComment: comment,
            }
          : req
      );

      // If approved, increment used comp leaves
      const updatedEmployees = approved
        ? state.employees.map((e) =>
            e.id === leave.employeeId
              ? { ...e, compLeavesUsed: e.compLeavesUsed + 1 }
              : e
          )
        : state.employees;

      return {
        ...state,
        leaveRequests: updatedLeaveRequests,
        employees: updatedEmployees,
        auditLogs: [
          ...state.auditLogs,
          {
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: employee.id,
            userName: employee.name,
            action: approved ? 'Leave Approved' : 'Leave Rejected',
            entityType: 'LeaveRequest',
            entityId: leaveId,
            changes: `Leave ${approved ? 'approved' : 'rejected'}${comment ? `: ${comment}` : ''}`,
          },
        ],
      };
    });

    setSelectedLeave(null);
    setLeaveComment('');
    toast.success(`Leave ${approved ? 'approved' : 'rejected'}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="border-purple-500/30 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-full">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">Manager Dashboard</CardTitle>
                  <CardDescription className="text-gray-300">
                    {employee.name} • {employee.position}
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

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-purple-500/30 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Team Members</CardDescription>
              <CardTitle className="text-3xl text-white">{teamMembers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-purple-500/30 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Pending Tasks</CardDescription>
              <CardTitle className="text-3xl text-white">{pendingTasks.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-purple-500/30 bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Leave Requests</CardDescription>
              <CardTitle className="text-3xl text-white">{pendingLeaveRequests.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="team" className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-purple-500/30">
            <TabsTrigger value="team" className="data-[state=active]:bg-purple-600">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-purple-600">
              <ListTodo className="h-4 w-4 mr-2" />
              Tasks ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="leave" className="data-[state=active]:bg-purple-600">
              <Calendar className="h-4 w-4 mr-2" />
              Leave ({pendingLeaveRequests.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-purple-600">
              Audit Trail
            </TabsTrigger>
          </TabsList>

          {/* Team Tab */}
          <TabsContent value="team">
            <TeamMembersView
              teamMembers={teamMembers}
              state={state}
              onGrantCompLeave={handleGrantCompLeave}
            />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <TaskReviewView
              tasks={teamTasks}
              employees={state.employees}
              onApprove={handleApproveTask}
              onComment={handleCommentTask}
            />
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave">
            <LeaveReviewView
              leaveRequests={teamLeaveRequests}
              employees={state.employees}
              onApprove={handleApproveLeave}
            />
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <AuditTrailView auditLogs={teamAuditLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Sub-components

function TeamMembersView({
  teamMembers,
  state,
  onGrantCompLeave,
}: {
  teamMembers: Employee[];
  state: HRMState;
  onGrantCompLeave: (employeeId: string, days: number) => void;
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [leaveDays, setLeaveDays] = useState('1');

  const handleGrant = () => {
    if (selectedEmployee && leaveDays && parseInt(leaveDays) > 0) {
      onGrantCompLeave(selectedEmployee, parseInt(leaveDays));
      setSelectedEmployee(null);
      setLeaveDays('1');
    }
  };

  const getMonthlyHours = (employeeId: string) => {
    const thisMonth = format(new Date(), 'yyyy-MM');
    const logs = state.timeLogs.filter(
      (log) => log.employeeId === employeeId && log.date.startsWith(thisMonth)
    );
    return logs.reduce((sum, log) => sum + log.totalHours, 0);
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">Team Members</CardTitle>
        <CardDescription className="text-gray-400">
          Manage your team and grant comp leaves
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-purple-500/20 hover:bg-purple-500/5">
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Position</TableHead>
              <TableHead className="text-gray-300">Month Hours</TableHead>
              <TableHead className="text-gray-300">Target</TableHead>
              <TableHead className="text-gray-300">Comp Leaves</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => {
              const monthlyHours = getMonthlyHours(member.id);
              const available = member.compLeavesEarned - member.compLeavesUsed;
              return (
                <TableRow key={member.id} className="border-purple-500/20 hover:bg-purple-500/5">
                  <TableCell className="text-white">{member.name}</TableCell>
                  <TableCell className="text-gray-300">{member.position}</TableCell>
                  <TableCell className="text-gray-300">{monthlyHours.toFixed(1)}</TableCell>
                  <TableCell className="text-gray-300">{member.monthlyHourTarget}</TableCell>
                  <TableCell className="text-gray-300">
                    {available} / {member.compLeavesEarned}
                  </TableCell>
                  <TableCell>
                    <Dialog
                      open={selectedEmployee === member.id}
                      onOpenChange={(open) => {
                        if (!open) setSelectedEmployee(null);
                      }}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEmployee(member.id)}
                        className="border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
                      >
                        Grant Leave
                      </Button>
                      <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
                        <DialogHeader>
                          <DialogTitle>Grant Comp Leave</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Grant comp leave to {member.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="days">Number of Days</Label>
                            <Input
                              id="days"
                              type="number"
                              min="1"
                              value={leaveDays}
                              onChange={(e) => setLeaveDays(e.target.value)}
                              className="bg-slate-800 border-purple-500/30 text-white"
                            />
                          </div>
                          <Button
                            onClick={handleGrant}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                          >
                            Grant Comp Leave
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TaskReviewView({
  tasks,
  employees,
  onApprove,
  onComment,
}: {
  tasks: Task[];
  employees: Employee[];
  onApprove: (taskId: string, comment?: string) => void;
  onComment: (taskId: string, comment: string) => void;
}) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState('');

  const getEmployeeName = (id: string) => {
    return employees.find((e) => e.id === id)?.name || 'Unknown';
  };

  const handleSubmitComment = () => {
    if (selectedTask && comment.trim()) {
      onComment(selectedTask.id, comment.trim());
      setSelectedTask(null);
      setComment('');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'pending') return -1;
      if (b.status === 'pending') return 1;
    }
    return b.date.localeCompare(a.date);
  });

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">Task Review</CardTitle>
        <CardDescription className="text-gray-400">
          Review and approve team tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tasks to review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white">{getEmployeeName(task.employeeId)}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-400">
                        {format(new Date(task.date), 'MMM dd, yyyy')}
                      </span>
                      <Badge
                        className={
                          task.status === 'approved'
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : task.status === 'commented'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-gray-300">{task.description}</p>
                    <p className="text-sm text-gray-400 mt-1">{task.hoursSpent} hours</p>
                    {task.managerComment && (
                      <div className="mt-2 p-2 bg-blue-500/10 rounded text-sm text-blue-400">
                        Comment: {task.managerComment}
                      </div>
                    )}
                  </div>
                </div>
                {task.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApprove(task.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTask(task)}
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      Add Comment
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={selectedTask !== null} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
            <DialogHeader>
              <DialogTitle>Add Comment</DialogTitle>
              <DialogDescription className="text-gray-400">
                Provide feedback on this task
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  placeholder="Add your feedback..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-slate-800 border-purple-500/30 text-white"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitComment}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Submit Comment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedTask) {
                      onApprove(selectedTask.id, comment.trim() || undefined);
                      setSelectedTask(null);
                      setComment('');
                    }
                  }}
                  className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10"
                >
                  Approve with Comment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function LeaveReviewView({
  leaveRequests,
  employees,
  onApprove,
}: {
  leaveRequests: LeaveRequest[];
  employees: Employee[];
  onApprove: (leaveId: string, approved: boolean, comment?: string) => void;
}) {
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState('');

  const getEmployeeName = (id: string) => {
    return employees.find((e) => e.id === id)?.name || 'Unknown';
  };

  const handleApprove = (approved: boolean) => {
    if (selectedLeave) {
      onApprove(selectedLeave.id, approved, comment.trim() || undefined);
      setSelectedLeave(null);
      setComment('');
    }
  };

  const sortedRequests = [...leaveRequests].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'pending') return -1;
      if (b.status === 'pending') return 1;
    }
    return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
  });

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">Leave Requests</CardTitle>
        <CardDescription className="text-gray-400">
          Review and approve leave requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No leave requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white">{getEmployeeName(request.employeeId)}</span>
                      <Badge
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
                    <p className="text-gray-300">
                      {format(new Date(request.startDate), 'MMM dd')} -{' '}
                      {format(new Date(request.endDate), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{request.reason}</p>
                    {request.reviewComment && (
                      <p className="text-sm text-blue-400 mt-2">
                        Manager: {request.reviewComment}
                      </p>
                    )}
                  </div>
                </div>
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSelectedLeave(request)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Review
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={selectedLeave !== null} onOpenChange={() => setSelectedLeave(null)}>
          <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
            <DialogHeader>
              <DialogTitle>Review Leave Request</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedLeave &&
                  `${getEmployeeName(selectedLeave.employeeId)} - ${format(
                    new Date(selectedLeave.startDate),
                    'MMM dd'
                  )} to ${format(new Date(selectedLeave.endDate), 'MMM dd, yyyy')}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {selectedLeave && (
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-gray-400 mb-1">Reason:</p>
                  <p className="text-white">{selectedLeave.reason}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reviewComment">Comment (Optional)</Label>
                <Textarea
                  id="reviewComment"
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-slate-800 border-purple-500/30 text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => handleApprove(false)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

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

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Audit Trail</CardTitle>
            <CardDescription className="text-gray-400">
              Recent activity from your team
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
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No audit logs yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
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
                    </div>
                    <p className="text-gray-400">{log.changes}</p>
                  </div>
                  <span className="text-xs text-gray-500">
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
