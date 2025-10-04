export type JobStatus = 'in-progress' | 'completed' | 'failed';

export interface JobError {
  type: string;
  reason: string;
  timestamp: string;
}

export interface Job {
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string | JobError;
}

class JobQueue {
  private jobs: Map<string, Job> = new Map();

  createJob(): string {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.jobs.set(jobId, { status: 'in-progress', progress: 0 });
    return jobId;
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, data: Partial<Job>): void {
    const job = this.getJob(jobId);
    if (job) {
      this.jobs.set(jobId, { ...job, ...data });
    }
  }
}

export const jobQueue = new JobQueue();
export default jobQueue;
