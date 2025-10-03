import { Router, Request, Response } from 'express';
import { jobQueue } from '../../services/JobQueue';

const router = Router();

// GET /api/v1/jobs/:jobId - Get job status
router.get('/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Get job from queue
    const job = jobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Return job status based on current state
    const response: any = {
      status: job.status,
    };

    // Add progress if in progress
    if (job.status === 'in-progress' && job.progress !== undefined) {
      response.progress = job.progress;
    }

    // Add result if completed
    if (job.status === 'completed' && job.result) {
      response.result = job.result;
    }

    // Add error if failed
    if (job.status === 'failed' && job.error) {
      response.error = job.error;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
