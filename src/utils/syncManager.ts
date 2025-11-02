import { HRMState } from '../types/hrm';
import { projectId, publicAnonKey } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-be2c25c4`;

/**
 * Sync manager to periodically fetch data from backend
 * This ensures all devices stay in sync
 */
export class SyncManager {
  private syncInterval: number | null = null;
  private isEnabled = false;
  private lastDataHash = '';
  
  /**
   * Start syncing data every specified interval
   * @param callback Function to call with updated data
   * @param intervalMs Sync interval in milliseconds (default: 10 seconds)
   */
  start(callback: (data: HRMState) => void, intervalMs: number = 10000) {
    if (this.isEnabled) {
      console.log('Sync manager already running');
      return;
    }

    this.isEnabled = true;
    console.log(`Starting sync manager with ${intervalMs}ms interval`);

    this.syncInterval = window.setInterval(async () => {
      try {
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
          // Create a simple hash to detect changes
          const dataHash = JSON.stringify(result.data);
          
          // Only update if data has actually changed
          if (dataHash !== this.lastDataHash) {
            this.lastDataHash = dataHash;
            callback(result.data);
            console.log('Data synced from backend');
          }
        }
      } catch (error) {
        console.error('Error syncing data:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop syncing data
   */
  stop() {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isEnabled = false;
      console.log('Sync manager stopped');
    }
  }

  /**
   * Check if sync is currently running
   */
  isRunning(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
