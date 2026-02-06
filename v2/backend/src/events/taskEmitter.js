const { EventEmitter } = require('events');

/**
 * Central event emitter for task updates
 * Enables broadcasting task status changes to SSE clients
 */
class TaskEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many SSE connections
  }

  /**
   * Emit a task update event
   * @param {string} jobId - Job ID
   * @param {object} data - Task update data { taskId, status, title, note }
   */
  emitTaskUpdate(jobId, data) {
    const event = {
      type: 'task_update',
      jobId,
      taskId: data.taskId,
      status: data.status,
      title: data.title,
      note: data.note || null,
      timestamp: new Date().toISOString()
    };
    
    this.emit(`job:${jobId}`, event);
    console.log(`[TaskEmitter] Task update emitted for job ${jobId}, task ${data.taskId}: ${data.status}`);
  }

  /**
   * Emit a job status update event
   * @param {string} jobId - Job ID
   * @param {string} status - New job status
   */
  emitJobUpdate(jobId, status) {
    const event = {
      type: 'job_update',
      jobId,
      status,
      timestamp: new Date().toISOString()
    };
    
    this.emit(`job:${jobId}`, event);
    console.log(`[TaskEmitter] Job status update emitted for job ${jobId}: ${status}`);
  }
}

// Singleton instance
const taskEmitter = new TaskEventEmitter();

module.exports = taskEmitter;
