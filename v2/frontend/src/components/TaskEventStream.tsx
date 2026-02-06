'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TaskUpdate {
  type: 'task_update' | 'job_update' | 'connected';
  taskId?: string;
  status?: string;
  title?: string;
  note?: string;
  jobStatus?: string;
  timestamp: string;
}

interface TaskEventStreamProps {
  jobId: string;
  jobStatus: string;
  onTaskUpdate?: (update: TaskUpdate) => void;
  onJobUpdate?: (status: string) => void;
}

/**
 * TaskEventStream - Real-time SSE client for task updates
 * 
 * Connects to the backend SSE endpoint when job is in active status
 * (in_progress, revisions, hardening) and streams task status changes
 * 
 * Usage:
 * <TaskEventStream 
 *   jobId={job.id} 
 *   jobStatus={job.status}
 *   onTaskUpdate={(update) => refreshTasks()}
 * />
 */
export default function TaskEventStream({ 
  jobId, 
  jobStatus, 
  onTaskUpdate,
  onJobUpdate 
}: TaskEventStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active statuses that should stream events
  const activeStatuses = ['in_progress', 'revisions', 'hardening'];
  const shouldConnect = activeStatuses.includes(jobStatus);

  const connect = useCallback(() => {
    // Don't connect if not in active status or already connected
    if (!shouldConnect || eventSourceRef.current) {
      return;
    }

    console.log(`[TaskEventStream] Connecting to SSE for job ${jobId}`);

    const eventSource = new EventSource(`${API_BASE}/api/jobs/${jobId}/task-events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[TaskEventStream] Connected');
      setIsConnected(true);
      setReconnectCount(0);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: TaskUpdate = JSON.parse(event.data);
        console.log('[TaskEventStream] Event received:', data);

        // Handle different event types
        if (data.type === 'task_update') {
          onTaskUpdate?.(data);
        } else if (data.type === 'job_update' && data.jobStatus) {
          onJobUpdate?.(data.jobStatus);
        }
      } catch (err) {
        console.error('[TaskEventStream] Failed to parse event:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[TaskEventStream] Connection error:', error);
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Auto-reconnect with exponential backoff (max 30s)
      if (shouldConnect) {
        const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
        console.log(`[TaskEventStream] Reconnecting in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectCount(prev => prev + 1);
          connect();
        }, delay);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, shouldConnect, reconnectCount, onTaskUpdate, onJobUpdate]);

  const disconnect = useCallback(() => {
    console.log('[TaskEventStream] Disconnecting');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setReconnectCount(0);
  }, []);

  // Connect/disconnect based on job status
  useEffect(() => {
    if (shouldConnect) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [shouldConnect, connect, disconnect]);

  // Render live indicator when connected
  if (!shouldConnect) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-600 dark:text-green-400">Live</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="text-gray-500">Connecting...</span>
        </>
      )}
    </div>
  );
}
