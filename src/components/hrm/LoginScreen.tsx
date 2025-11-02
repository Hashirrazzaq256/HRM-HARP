import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Employee } from '../../types/hrm';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import logo from 'figma:asset/1e8772b931f7aebcf2d319df4988bdd728a2b920.png';

interface LoginScreenProps {
  employees: Employee[];
  onLogin: (employeeId: string) => void;
}

export function LoginScreen({ employees, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    const employee = employees.find(
      (emp) => emp.email.toLowerCase() === email.toLowerCase() && emp.password === password
    );

    if (employee) {
      onLogin(employee.id);
      toast.success(`Welcome back, ${employee.name}!`);
    } else {
      toast.error('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800">
      <Card className="w-full max-w-md border-purple-500/30 bg-slate-900/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Harp HRM Logo" className="h-20 w-20 rounded-xl" />
          </div>
          <CardTitle className="text-2xl text-white">Harp HRM</CardTitle>
          <CardDescription className="text-gray-300">
            Human Resource Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@harphrm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800 border-purple-500/30 text-white placeholder:text-gray-500"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-purple-500/30 text-white placeholder:text-gray-500 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Login
            </Button>
          </form>
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
            <p className="text-xs text-gray-400 mb-2">Demo Credentials:</p>
            <div className="text-xs text-gray-300 space-y-1">
              <p><span className="text-purple-400">Admin:</span> admin@harphrm.com / admin123</p>
              <p><span className="text-blue-400">Manager:</span> manager@harphrm.com / manager123</p>
              <p><span className="text-green-400">Employee:</span> ali.hassan@harphrm.com / employee123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
