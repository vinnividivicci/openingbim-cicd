export type JobStatus = 'in-progress' | 'completed' | 'failed';

export interface Job {
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
}

class JobQueue {
  private jobs: Map<string, Job> = new Map();

  createJob(jobId: string): void {
    this.jobs.set(jobId, { status: 'in-progress', progress: 0 });
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

export default new JobQueue();
