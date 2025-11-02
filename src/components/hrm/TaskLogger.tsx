import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Task } from '../../types/hrm';
import { ListTodo, Plus, Trash2, CheckCircle, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';

interface TaskLoggerProps {
  tasks: Task[];
  date: string;
  onAddTask: (description: string, hours: number) => void;
  onDeleteTask: (taskId: string) => void;
  canEdit: boolean;
}

export function TaskLogger({ tasks, date, onAddTask, onDeleteTask, canEdit }: TaskLoggerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');

  const handleSubmit = () => {
    if (description.trim() && hours && parseFloat(hours) > 0) {
      onAddTask(description.trim(), parseFloat(hours));
      setDescription('');
      setHours('');
      setIsDialogOpen(false);
    }
  };

  const totalHours = tasks.reduce((sum, task) => sum + task.hoursSpent, 0);

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'commented':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
            <MessageSquare className="h-3 w-3 mr-1" />
            Reviewed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <ListTodo className="h-5 w-5 text-purple-400" />
              Daily Tasks
            </CardTitle>
            <CardDescription className="text-gray-400">
              Total Hours Logged: {totalHours.toFixed(2)} hrs
            </CardDescription>
          </div>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Log your daily task and hours spent
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Task Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what you worked on..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-slate-800 border-purple-500/30 text-white"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours">Hours Spent</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="e.g., 2.5"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="bg-slate-800 border-purple-500/30 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Add Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tasks logged for today</p>
            {canEdit && <p className="text-sm mt-1">Add your first task to get started</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-purple-500/20 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-white">{task.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                      <span>{task.hoursSpent} hours</span>
                      {getStatusBadge(task.status)}
                    </div>
                  </div>
                  {canEdit && task.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteTask(task.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {task.managerComment && (
                  <div className="mt-2 p-3 bg-blue-500/10 rounded border border-blue-500/20">
                    <div className="text-xs text-blue-400 mb-1">Manager Comment:</div>
                    <p className="text-sm text-gray-300">{task.managerComment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
