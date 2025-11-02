import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TimeLog, BreakLog, Employee } from '../../types/hrm';
import { Clock, LogIn, LogOut, Coffee, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TimeTrackingProps {
  employee: Employee;
  timeLog: TimeLog | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onBreakIn: () => void;
  onBreakOut: () => void;
}

export function TimeTracking({
  employee,
  timeLog,
  onCheckIn,
  onCheckOut,
  onBreakIn,
  onBreakOut,
}: TimeTrackingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCheckedIn = timeLog?.checkIn && !timeLog?.checkOut;
  const onBreak = timeLog?.breaks.some(b => b.breakIn && !b.breakOut);

  const calculateHoursWorked = () => {
    if (!timeLog?.checkIn) return 0;

    const checkInTime = new Date(timeLog.checkIn);
    const checkOutTime = timeLog.checkOut ? new Date(timeLog.checkOut) : currentTime;
    
    let totalMs = checkOutTime.getTime() - checkInTime.getTime();

    // Subtract break time
    timeLog.breaks.forEach(breakLog => {
      const breakInTime = new Date(breakLog.breakIn);
      const breakOutTime = breakLog.breakOut ? new Date(breakLog.breakOut) : null;
      
      if (breakOutTime) {
        totalMs -= (breakOutTime.getTime() - breakInTime.getTime());
      } else if (onBreak) {
        // Current break
        totalMs -= (currentTime.getTime() - breakInTime.getTime());
      }
    });

    return Math.max(0, totalMs / (1000 * 60 * 60)); // Convert to hours
  };

  const hoursWorked = calculateHoursWorked();

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'hh:mm:ss a');
  };

  return (
    <Card className="border-purple-500/30 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Clock className="h-5 w-5 text-purple-400" />
          Time Tracking
        </CardTitle>
        <CardDescription className="text-gray-400">
          {format(currentTime, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Status:</span>
          {isCheckedIn ? (
            onBreak ? (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                On Break
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                Working
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/50">
              Not Checked In
            </Badge>
          )}
        </div>

        {/* Hours Worked */}
        {timeLog?.checkIn && (
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="text-center">
              <div className="text-3xl text-white">
                {hoursWorked.toFixed(2)} hrs
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Hours Worked Today
              </div>
            </div>
          </div>
        )}

        {/* Check In/Out Times */}
        {timeLog?.checkIn && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Check In:</span>
              <span className="text-green-400">{formatTime(timeLog.checkIn)}</span>
            </div>
            {timeLog.checkOut && (
              <div className="flex justify-between text-gray-300">
                <span>Check Out:</span>
                <span className="text-red-400">{formatTime(timeLog.checkOut)}</span>
              </div>
            )}
          </div>
        )}

        {/* Breaks */}
        {timeLog?.breaks && timeLog.breaks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Breaks:</div>
            {timeLog.breaks.map((breakLog, index) => (
              <div key={index} className="text-sm flex justify-between text-gray-300 pl-4">
                <span>Break {index + 1}:</span>
                <span>
                  {formatTime(breakLog.breakIn)}
                  {breakLog.breakOut && ` - ${formatTime(breakLog.breakOut)}`}
                  {!breakLog.breakOut && ' - In Progress'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          {!isCheckedIn ? (
            <Button
              onClick={onCheckIn}
              className="col-span-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Check In
            </Button>
          ) : (
            <>
              {!onBreak ? (
                <>
                  <Button
                    onClick={onBreakIn}
                    variant="outline"
                    className="bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                  >
                    <Coffee className="h-4 w-4 mr-2" />
                    Start Break
                  </Button>
                  <Button
                    onClick={onCheckOut}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Check Out
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onBreakOut}
                  className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  End Break
                </Button>
              )}
            </>
          )}
        </div>

        {/* Working Hours Info */}
        <div className="pt-4 border-t border-purple-500/20">
          <div className="text-sm text-gray-400">
            Work Schedule: 9:00 AM - 5:00 PM EST
          </div>
          <div className="text-sm text-gray-400">
            Monthly Target: {employee.monthlyHourTarget} hours
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
