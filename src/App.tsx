import { useState, useEffect } from 'react';
import { HRMState } from './types/hrm';
import { loadData, saveData, getInitialData } from './utils/hrmStorage';
import { syncManager } from './utils/syncManager';
import { LoginScreen } from './components/hrm/LoginScreen';
import { EmployeeView } from './components/hrm/EmployeeView';
import { ManagerView } from './components/hrm/ManagerView';
import { AdminView } from './components/hrm/AdminView';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [state, setState] = useState<HRMState>(getInitialData());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from backend on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        const data = await loadData();
        setState(data);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

  // Save state to backend whenever it changes (but skip initial load)
  useEffect(() => {
    if (!isLoading) {
      saveData(state).catch(error => {
        console.error('Error auto-saving data:', error);
      });
    }
  }, [state, isLoading]);

  // Start sync manager when user logs in
  useEffect(() => {
    if (currentUserId && !isLoading) {
      // Start syncing data every 10 seconds
      syncManager.start((updatedData) => {
        setState(updatedData);
      }, 10000);
    } else {
      // Stop syncing when logged out
      syncManager.stop();
    }

    // Cleanup on unmount
    return () => {
      syncManager.stop();
    };
  }, [currentUserId, isLoading]);

  const handleLogin = (employeeId: string) => {
    setCurrentUserId(employeeId);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
  };

  const handleUpdateState = (updater: (state: HRMState) => HRMState) => {
    setState((prevState) => updater(prevState));
  };

  const currentUser = state.employees.find((emp) => emp.id === currentUserId);

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Harp HRM...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen employees={state.employees} onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  // Render appropriate view based on user role
  if (currentUser.role === 'admin') {
    return (
      <>
        <AdminView
          employee={currentUser}
          state={state}
          onUpdateState={handleUpdateState}
          onLogout={handleLogout}
        />
        <Toaster />
      </>
    );
  }

  if (currentUser.role === 'manager') {
    return (
      <>
        <ManagerView
          employee={currentUser}
          state={state}
          onUpdateState={handleUpdateState}
          onLogout={handleLogout}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <EmployeeView
        employee={currentUser}
        state={state}
        onUpdateState={handleUpdateState}
        onLogout={handleLogout}
      />
      <Toaster />
    </>
  );
}
