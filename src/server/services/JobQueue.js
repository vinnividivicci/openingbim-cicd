class JobQueue {
    constructor() {
        Object.defineProperty(this, "jobs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    createJob(jobId) {
        this.jobs.set(jobId, { status: 'in-progress', progress: 0 });
    }
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    updateJob(jobId, data) {
        const job = this.getJob(jobId);
        if (job) {
            this.jobs.set(jobId, { ...job, ...data });
        }
    }
}
export default new JobQueue();
