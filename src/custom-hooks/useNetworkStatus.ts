import { useEffect, useState } from 'react';
import { toast } from '@ui/index';

interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
  });

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: true }));
      console.log('Network: User is back online');
      toast.success('You are back online!', {
        description: 'Connection restored successfully.',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({ ...prev, isOnline: false }));
      console.log('Network: User is offline');
      toast.error('You are offline', {
        description: 'Please check your internet connection.',
        duration: 5000,
      });
    };

    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkStatus(prev => ({
          ...prev,
          connectionType: connection.effectiveType || connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        }));
        console.log('Network: Connection changed', {
          type: connection.effectiveType || connection.type,
          downlink: connection.downlink,
          rtt: connection.rtt,
        });
      }
    };

    // Set initial network status
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkStatus({
        isOnline: navigator.onLine,
        connectionType: connection.effectiveType || connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
} 